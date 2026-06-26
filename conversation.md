# Conversation Log — RDP Quick Type

## 2026-06-26

### Problem
Copy/paste into a web RDP session (**testlab**, air-gapped Windows) from a Mac is
unreliable — Mac `Cmd` vs Windows `Ctrl` confusion plus a flaky RDP clipboard.
User wants a Chrome extension with a clickable list that "types" items into the session.

### Setup clarified (Q&A)
- **Connection:** web-based RDP shown in a Chrome tab on the Mac.
- **Remote box:** air-gapped, locked down, can only open Chrome there.

### Decisions
- Extension lives in the **Mac's Chrome** and injects keystrokes into the RDP canvas. (Remote box is untouchable.)
- Windows-side scripting (AHK / PowerShell / SendKeys) ruled out — locked down.
- Wrote an optional feasibility spike (synthetic events). User opted to **skip testing and build directly**.
- Chose **`chrome.debugger` + `Input.dispatchKeyEvent`** as the injection method — robust against canvas-based RDP clients (delivers trusted key events) — accepting the yellow debug banner. A lighter synthetic-event mode is noted as a future toggle.

### Built
MV3 extension: `manifest.json`, `background.js` (keystroke engine), side panel
(`sidepanel.html/.css/.js`) with snippet add/delete/reorder, click-to-type and
type-then-Enter, typing-speed setting, and a Release-debugger button.

### Next
Load unpacked in Chrome and test against the real testlab RDP session; confirm
keystrokes land while the side panel has focus.
