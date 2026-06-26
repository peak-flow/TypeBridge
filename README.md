# RDP Quick Type

A Chrome extension that turns a list of saved snippets into clickable buttons.
Click one and it **types the text for you** into a web-based Remote Desktop
session — as if you'd typed it on the keyboard.

## Why this exists

The day-to-day problem it solves:

- **testlab** is a Windows machine reached through a **web Remote Desktop** session
  that runs inside a Chrome tab. The machine is air-gapped (no other internet) and
  locked down — you can only open Chrome on it, nothing can be installed there.
- Working from a **Mac**, two things constantly get in the way:
  1. **`Cmd` vs `Ctrl`.** Mac copy/paste uses `Cmd`, Windows uses `Ctrl`. Muscle
     memory fights you, and the wrong key does the wrong thing.
  2. **Copy/paste is flaky.** Even with the right keys, the clipboard doesn't
     reliably make it across the Remote Desktop connection.

So getting a username, a server path, or a block of text into that session is
slow and error-prone. This extension sidesteps the whole problem: instead of
copying and pasting, it **types** your saved text straight into the session,
character by character, as real keystrokes.

## How it works (in short)

The remote screen is drawn as an image (a `<canvas>`) inside your Mac's Chrome,
so there are no text boxes to fill — you can only "type" into it. The extension
uses Chrome's built-in automation (the DevTools Protocol) to send genuine key
presses to that tab. The Remote Desktop client forwards them to Windows exactly
as if they came from your keyboard. No clipboard, no `Cmd`/`Ctrl` confusion.

Because of that, while it's typing you'll see Chrome's yellow
*"…started debugging this browser"* bar — that's normal and expected.

> The extension runs entirely in your **Mac's Chrome**. It never installs anything
> on, or connects to, the locked-down testlab machine.

## Install

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and select this folder.
4. Click the extension's toolbar icon to open the side panel.

> After pulling changes, click the ↻ refresh icon on the extension's card to reload it.

## Use

1. Add snippets in the side panel: a **Label** (what you see) and the **Text**
   (what gets typed).
2. Switch to your Remote Desktop tab and **click into a field** in the session.
3. Click a snippet to type it. Use the **⏎** button to type it *and* press Enter.

Tips:
- **Typing speed** (footer) — raise the ms/key value if characters get dropped
  over a slow connection.
- **Release debugger** (footer) — hides the yellow bar by freeing the tab; it's
  optional, and typing grabs it back automatically.

## Backups & sharing your list

- **Export…** saves your list to a `.yaml` file.
- **Import…** loads snippets from a `.yaml` (or older `.json`) file and **adds**
  them to your list (it never wipes what you already have).
- **Example file** downloads a ready-made template with comments showing the format.

The list itself is stored by Chrome on this machine (`chrome.storage.local`). It
persists across restarts but isn't synced to other computers — use Export to back
it up or move it.

## Files

| File | Purpose |
|------|---------|
| `manifest.json` | Extension manifest (Manifest V3). |
| `background.js` | The keystroke engine. |
| `sidepanel.html` / `.css` / `.js` | The snippet-list UI. |
| `js-yaml.min.js` | Bundled YAML parser for Export/Import (runs offline). |
| `spike/` | A one-off console test used while figuring out the approach. |
| `README-todo.md`, `readme-architecture.md`, `conversation.md` | Project notes. |

See **`readme-architecture.md`** for the design details and trade-offs.
