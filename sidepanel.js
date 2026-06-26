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

// ---- Backup: export / import / example -----------------------------------

// Trigger a file download from text content (works inside the side panel).
function downloadFile(filename, text) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Accept either { items: [...] } or a bare [...] array. Keep only valid
// entries (must have a string "text"); fill in a label if one is missing.
function normalizeItems(raw) {
  const arr = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.items) ? raw.items : null);
  if (!arr) return null;
  const cleaned = [];
  for (const entry of arr) {
    if (entry && typeof entry.text === "string") {
      const label = (typeof entry.label === "string" && entry.label.trim())
        ? entry.label.trim()
        : entry.text.slice(0, 24);
      cleaned.push({ label, text: entry.text });
    }
  }
  return cleaned;
}

$("#exportBtn").addEventListener("click", () => {
  const header =
    "# RDP Quick Type — exported snippets\n" +
    "# Edit in any text editor, then use Import. label = what you see; text = what gets typed.\n";
  const body = jsyaml.dump(
    { items: items.map((it) => ({ label: it.label, text: it.text })) },
    { lineWidth: -1 }
  );
  downloadFile("rdp-quick-type-snippets.yaml", header + body);
  showStatus(`Exported ${items.length} snippet(s).`, "ok");
});

$("#exampleBtn").addEventListener("click", () => {
  const example = `# RDP Quick Type — snippet list
# Each item below becomes a button in the panel.
#   label: what you see in the list
#   text:  exactly what gets typed into the remote session
#
# Tips:
#   - No quotes or commas needed for normal text.
#   - Backslashes are fine as-is — no doubling: \\\\fileserver\\share works.
#   - If the text has a colon-space ": " or starts with a special character,
#     wrap it in single quotes:   text: 'value: with colon'
#   - Lines starting with # are comments and are ignored.

items:
  - label: My username
    text: jsmith
  - label: Server share
    text: \\\\fileserver\\share\\reports
  - label: Long note
    text: This whole sentence types out exactly as written.
`;
  downloadFile("rdp-quick-type-example.yaml", example);
  showStatus("Downloaded example file — open it in a text editor to see the format.", "ok");
});

$("#importBtn").addEventListener("click", () => $("#importFile").click());

$("#importFile").addEventListener("change", async (e) => {
  const file = e.target.files && e.target.files[0];
  e.target.value = ""; // reset so the same file can be picked again later
  if (!file) return;
  try {
    const data = jsyaml.load(await file.text());
    const incoming = normalizeItems(data);
    if (!incoming) {
      showStatus('That file isn\'t in the expected format (needs an "items" list).', "err");
      return;
    }
    if (incoming.length === 0) {
      showStatus("No valid snippets found in that file.", "err");
      return;
    }
    items.push(...incoming);
    await saveItems();
    render();
    showStatus(`Imported ${incoming.length} snippet(s) — added to your list.`, "ok");
  } catch (err) {
    showStatus("Couldn't read that file: " + err.message, "err");
  }
});

load();
