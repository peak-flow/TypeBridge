// RDP Quick Type — background service worker
//
// Types snippets into the active tab's web Remote Desktop client by sending
// real key events through the Chrome DevTools Protocol (Input.dispatchKeyEvent).
// These arrive as trusted keystrokes, so the RDP client forwards them to Windows
// exactly as if you had typed them — no clipboard, no Cmd/Ctrl confusion.

const DEBUGGER_VERSION = "1.3";
const DEFAULT_SETTINGS = { keyDelayMs: 30 };

// The tab we currently hold a debugger session on (one per browser).
let attachedTabId = null;

chrome.runtime.onInstalled.addListener(async () => {
  try {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  } catch (_) { /* older Chrome — user can still open via right-click */ }
  const { items, settings } = await chrome.storage.local.get(["items", "settings"]);
  if (!items) await chrome.storage.local.set({ items: [] });
  if (!settings) await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
});

// Reset state if the user cancels the debug banner or the tab goes away.
chrome.debugger.onDetach.addListener((src) => {
  if (src.tabId === attachedTabId) attachedTabId = null;
});
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === attachedTabId) attachedTabId = null;
});

// ---- Promisified chrome.debugger helpers ---------------------------------
function dbgAttach(tabId) {
  return new Promise((resolve, reject) => {
    chrome.debugger.attach({ tabId }, DEBUGGER_VERSION, () => {
      const err = chrome.runtime.lastError;
      err ? reject(new Error(err.message)) : resolve();
    });
  });
}
function dbgDetach(tabId) {
  return new Promise((resolve) => {
    chrome.debugger.detach({ tabId }, () => { void chrome.runtime.lastError; resolve(); });
  });
}
function dbgSend(tabId, method, params) {
  return new Promise((resolve, reject) => {
    chrome.debugger.sendCommand({ tabId }, method, params, (res) => {
      const err = chrome.runtime.lastError;
      err ? reject(new Error(err.message)) : resolve(res);
    });
  });
}

async function ensureAttached(tabId) {
  if (attachedTabId === tabId) return;
  if (attachedTabId !== null) { await dbgDetach(attachedTabId); attachedTabId = null; }
  await dbgAttach(tabId);
  attachedTabId = tabId;
}

// ---- Key mapping (US layout) ---------------------------------------------
// Characters that require Shift, mapped to the physical (unshifted) key.
const SHIFT_BASE = {
  "~":"`","!":"1","@":"2","#":"3","$":"4","%":"5","^":"6","&":"7","*":"8","(":"9",")":"0",
  "_":"-","+":"=","{":"[","}":"]","|":"\\",":":";","\"":"'","<":",",">":".","?":"/"
};
const PUNCT_CODE = {
  "`":"Backquote","-":"Minus","=":"Equal","[":"BracketLeft","]":"BracketRight","\\":"Backslash",
  ";":"Semicolon","'":"Quote",",":"Comma",".":"Period","/":"Slash"," ":"Space"
};
const PUNCT_VK = {
  "`":192,"-":189,"=":187,"[":219,"]":221,"\\":220,";":186,"'":222,",":188,".":190,"/":191," ":32
};

function keyDataFor(ch) {
  if (ch === "\n" || ch === "\r") return { key: "Enter", code: "Enter", vk: 13, text: "\r", shift: false };
  if (ch === "\t") return { key: "Tab", code: "Tab", vk: 9, text: "\t", shift: false };
  if (ch >= "a" && ch <= "z") { const u = ch.toUpperCase(); return { key: ch, code: "Key" + u, vk: u.charCodeAt(0), text: ch, shift: false }; }
  if (ch >= "A" && ch <= "Z") return { key: ch, code: "Key" + ch, vk: ch.charCodeAt(0), text: ch, shift: true };
  if (ch >= "0" && ch <= "9") return { key: ch, code: "Digit" + ch, vk: ch.charCodeAt(0), text: ch, shift: false };
  if (SHIFT_BASE[ch]) {
    const base = SHIFT_BASE[ch];
    const isDigit = base >= "0" && base <= "9";
    return { key: ch, code: isDigit ? "Digit" + base : PUNCT_CODE[base], vk: isDigit ? base.charCodeAt(0) : PUNCT_VK[base], text: ch, shift: true };
  }
  if (PUNCT_CODE[ch]) return { key: ch, code: PUNCT_CODE[ch], vk: PUNCT_VK[ch], text: ch, shift: false };
  // Best-effort fallback for anything not mapped (accented chars, etc.)
  return { key: ch, code: "", vk: ch.toUpperCase().charCodeAt(0), text: ch, shift: false };
}

const MOD_SHIFT = 8; // CDP modifier bitmask: Alt=1, Ctrl=2, Meta=4, Shift=8
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function sendChar(tabId, ch) {
  const k = keyDataFor(ch);
  const mods = k.shift ? MOD_SHIFT : 0;
  if (k.shift) {
    await dbgSend(tabId, "Input.dispatchKeyEvent", { type: "keyDown", key: "Shift", code: "ShiftLeft", windowsVirtualKeyCode: 16, modifiers: MOD_SHIFT });
  }
  await dbgSend(tabId, "Input.dispatchKeyEvent", {
    type: "keyDown", key: k.key, code: k.code, windowsVirtualKeyCode: k.vk,
    text: k.text, unmodifiedText: k.text, modifiers: mods
  });
  await dbgSend(tabId, "Input.dispatchKeyEvent", {
    type: "keyUp", key: k.key, code: k.code, windowsVirtualKeyCode: k.vk, modifiers: mods
  });
  if (k.shift) {
    await dbgSend(tabId, "Input.dispatchKeyEvent", { type: "keyUp", key: "Shift", code: "ShiftLeft", windowsVirtualKeyCode: 16, modifiers: 0 });
  }
}

async function typeInto(tabId, text, keyDelayMs) {
  for (const ch of text) {
    await sendChar(tabId, ch);
    if (keyDelayMs > 0) await sleep(keyDelayMs);
  }
}

async function getTargetTab() {
  let tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (tabs && tabs[0]) return tabs[0];
  tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs && tabs[0];
}

// ---- Messages from the side panel ----------------------------------------
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    try {
      if (msg.cmd === "type") {
        const tab = await getTargetTab();
        if (!tab) throw new Error("No active tab found.");
        if (/^(chrome|edge|about|chrome-extension|devtools):/.test(tab.url || "")) {
          throw new Error("Active tab is a browser page — switch to the RDP tab, click into it, then click the snippet.");
        }
        const { settings } = await chrome.storage.local.get("settings");
        const keyDelayMs = (settings && settings.keyDelayMs) ?? DEFAULT_SETTINGS.keyDelayMs;
        await ensureAttached(tab.id);
        await typeInto(tab.id, msg.text, keyDelayMs);
        if (msg.pressEnter) await typeInto(tab.id, "\n", keyDelayMs);
        sendResponse({ ok: true, tabTitle: tab.title });
      } else if (msg.cmd === "detach") {
        if (attachedTabId !== null) { await dbgDetach(attachedTabId); attachedTabId = null; }
        sendResponse({ ok: true });
      } else if (msg.cmd === "status") {
        sendResponse({ ok: true, attachedTabId });
      } else {
        sendResponse({ ok: false, error: "Unknown command." });
      }
    } catch (e) {
      let hint = (e && e.message) || String(e);
      if (/already attached|another|cannot access|devtools/i.test(hint)) {
        hint += " (Tip: close DevTools on the RDP tab — only one debugger can attach at a time.)";
      }
      sendResponse({ ok: false, error: hint });
    }
  })();
  return true; // keep the message channel open for the async response
});
