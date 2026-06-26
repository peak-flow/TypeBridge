// RDP Quick Type — side panel UI
// Manages the snippet list (stored in chrome.storage.local) and asks the
// background service worker to type a snippet into the active RDP tab.

const $ = (sel) => document.querySelector(sel);
const listEl = $("#list");
const statusEl = $("#status");

let items = [];
let settings = { keyDelayMs: 30 };

function showStatus(text, kind) {
  statusEl.textContent = text;
  statusEl.className = "status " + (kind || "");
  statusEl.hidden = false;
}

async function load() {
  const data = await chrome.storage.local.get(["items", "settings"]);
  items = data.items || [];
  settings = data.settings || { keyDelayMs: 30 };
  $("#keyDelay").value = settings.keyDelayMs;
  render();
}

const saveItems = () => chrome.storage.local.set({ items });
const saveSettings = () => chrome.storage.local.set({ settings });

function render() {
  listEl.innerHTML = "";
  if (items.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "No snippets yet. Add one below.";
    listEl.appendChild(empty);
    return;
  }
  items.forEach((it, i) => {
    const row = document.createElement("div");
    row.className = "item";

    const typeBtn = document.createElement("button");
    typeBtn.className = "type";
    typeBtn.textContent = it.label || it.text;
    typeBtn.title = "Type: " + it.text;
    typeBtn.addEventListener("click", () => typeItem(it, false));

    const enterBtn = document.createElement("button");
    enterBtn.className = "enter";
    enterBtn.textContent = "⏎";
    enterBtn.title = "Type then press Enter";
    enterBtn.addEventListener("click", () => typeItem(it, true));

    const up = document.createElement("button");
    up.className = "icon";
    up.textContent = "↑";
    up.title = "Move up";
    up.disabled = i === 0;
    up.addEventListener("click", async () => {
      [items[i - 1], items[i]] = [items[i], items[i - 1]];
      await saveItems();
      render();
    });

    const del = document.createElement("button");
    del.className = "icon danger";
    del.textContent = "✕";
    del.title = "Delete";
    del.addEventListener("click", async () => {
      items.splice(i, 1);
      await saveItems();
      render();
    });

    row.append(typeBtn, enterBtn, up, del);
    listEl.appendChild(row);
  });
}

async function typeItem(it, pressEnter) {
  showStatus("Typing…", "");
  try {
    const res = await chrome.runtime.sendMessage({ cmd: "type", text: it.text, pressEnter });
    if (res && res.ok) showStatus("Typed into: " + (res.tabTitle || "active tab"), "ok");
    else showStatus("Error: " + (res ? res.error : "no response from worker"), "err");
  } catch (e) {
    showStatus("Error: " + e.message, "err");
  }
}

$("#addBtn").addEventListener("click", async () => {
  const label = $("#newLabel").value.trim();
  const text = $("#newText").value;
  if (!text) { showStatus("Enter the text to type.", "err"); return; }
  items.push({ label: label || text.slice(0, 24), text });
  await saveItems();
  $("#newLabel").value = "";
  $("#newText").value = "";
  render();
});

$("#keyDelay").addEventListener("change", async (e) => {
  const v = parseInt(e.target.value, 10);
  settings.keyDelayMs = isNaN(v) ? 30 : Math.max(0, Math.min(500, v));
  await saveSettings();
});

$("#releaseBtn").addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ cmd: "detach" });
  showStatus("Debugger released.", "ok");
});

load();
