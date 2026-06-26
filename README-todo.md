# RDP Quick Type — TODO / Progress

## Goal
A Chrome extension (runs in the **Mac's Chrome**) showing a clickable list of saved
snippets. Clicking one types it as **real keystrokes** into the web Remote Desktop
session in the active tab — bypassing the flaky RDP clipboard and the Mac `Cmd` /
Windows `Ctrl` mismatch.

## Context / Constraints
- **testlab** = air-gapped Windows box reached via a **web RDP client shown in a Chrome tab** on the Mac.
- Remote box is **locked down**: cannot install anything, can only open Chrome there.
- ⇒ Extension lives in the **Mac's Chrome** and injects into the RDP `<canvas>`. We never touch the remote box.
- RDP screen is a `<canvas>`, so we cannot set DOM field values — we must simulate key presses.
- Injection method: **`chrome.debugger` + `Input.dispatchKeyEvent`** (delivers trusted-level key events the RDP client forwards). Trade-off: Chrome shows a "being debugged" banner while active.

## Tasks
- [x] Decide topology & injection method (architecture-first)
- [x] Feasibility spike (`spike/synthetic-keys-test.js`) — optional, user chose to skip
- [x] Scaffold MV3 extension (manifest, background, side panel)
- [x] Keystroke engine (keymap + `Input.dispatchKeyEvent`, Shift handling)
- [x] Side panel UI: add / delete / reorder snippets, click-to-type, type-then-Enter
- [x] Settings: typing speed; Release-debugger button
- [ ] **Load unpacked & test against the real testlab RDP session** ← next
- [ ] Verify CDP keystrokes land while the side panel has focus (main unknown)
- [ ] (If the banner is unwanted and synthetic events work) add an optional synthetic-event mode
- [ ] (Optional) icons, edit-in-place, import/export snippet list

## How to load
1. Chrome → `chrome://extensions` → enable **Developer mode**.
2. **Load unpacked** → select this folder.
3. Click the extension icon to open the side panel.
4. Click into the RDP session, then click a snippet to type it.
