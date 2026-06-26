# Conversation Log — TypeBridge

## 2026-06-26

### Problem
Copy/paste into a web Remote Desktop session from a local machine can be
unreliable — shortcut mismatches plus flaky remote clipboard handoff.
User wants a Chrome extension with a clickable list that "types" items into the session.

### Setup clarified (Q&A)
- **Connection:** web-based Remote Desktop shown in a local Chrome tab.
- **Remote box:** restricted environment where installing helper tools may not be possible.

### Decisions
- Extension lives in **local Chrome** and injects keystrokes into the RDP canvas. (Remote box is untouched.)
- Remote-side scripting (AHK / PowerShell / SendKeys) ruled out for restricted environments.
- Chose **`chrome.debugger` + `Input.dispatchKeyEvent`** as the injection method — robust against canvas-based RDP clients (delivers trusted key events) — accepting the yellow debug banner. A lighter synthetic-event mode is noted as a future toggle.

### Built
MV3 extension: `manifest.json`, `background.js` (keystroke engine), side panel
(`sidepanel.html/.css/.js`) with snippet add/delete/reorder, click-to-type and
type-then-Enter, typing-speed setting, and a Release-debugger button.

### Update — tested & extended
- Loaded unpacked; typing into a real web Remote Desktop session **confirmed working**.
- Explained the Release-debugger button (hands the debug "key" back / hides the yellow banner; auto-reattaches on next type).
- Confirmed list storage = `chrome.storage.local` (per Chrome profile, persists, not synced, not in git).
- Added **Export / Import** snippets + a **downloadable example file**. Import is additive (appends, never wipes); accepts `{ items: [...] }` or a bare array.

### Update — YAML format
- Switched export/import + example file from JSON to **YAML** (easier for humans: no quotes/commas, `#` comments, backslashes need no doubling for UNC paths).
- Vendored `js-yaml` 4.1.0 (CSP-safe, no eval). Import parses YAML and still reads legacy JSON.

### Next
Optional polish: synthetic-event mode (to drop the banner), icons, edit-in-place.
