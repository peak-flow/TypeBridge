# Architecture — RDP Quick Type

## Topology
```
[Mac Chrome]                         (air-gapped)
  ├─ extension (here)                 [Windows box]
  └─ RDP tab <canvas> ──WebSocket──▶  RDP host ──▶ Chrome on remote ──▶ testlab site
        ▲
        │ Input.dispatchKeyEvent (trusted key events)
   background.js
```
The extension never reaches the remote box. It injects keystrokes into the RDP web
client running in the **Mac's Chrome**; the client forwards them over the wire
exactly as if typed.

## Why not other approaches
- **DOM value injection** — impossible: the remote screen is a `<canvas>`; there are no form fields on the Mac side.
- **Synthetic `KeyboardEvent` from a content script** — may be ignored (`isTrusted=false`) by the RDP client; unproven for this client (spike skipped). Kept as a possible future lightweight mode.
- **Windows-side script (AutoHotkey / PowerShell / SendKeys)** — ruled out: remote box is locked down, no installs, Chrome-only.

## Components
| File | Role |
|------|------|
| `manifest.json` | MV3 manifest. Permissions: `debugger`, `storage`, `sidePanel`, `tabs`. |
| `background.js` | Service worker = keystroke engine. Attaches the debugger to the active tab and sends `Input.dispatchKeyEvent` per character (with Shift handling). Manages attach/detach + errors. |
| `sidepanel.html` / `.css` / `.js` | Snippet list UI. Persists snippets + settings in `chrome.storage.local`; sends `type` messages to the background; exports/imports the list as YAML. |
| `js-yaml.min.js` | Vendored YAML parser (v4.1.0) for human-friendly export/import files. CSP-safe (no `eval`/`Function`); also reads legacy JSON since JSON is valid YAML. |
| `spike/synthetic-keys-test.js` | Standalone DevTools-console test of the synthetic-event path (optional). |

## Typing data flow
1. User clicks into the RDP `<canvas>` (gives it focus; `document.activeElement` stays the canvas even when the side panel holds window focus).
2. User clicks a snippet in the side panel.
3. `sidepanel.js` → background: `{ cmd: "type", text, pressEnter }`.
4. Background resolves the active tab (`lastFocusedWindow`), attaches `chrome.debugger` once (kept attached for the session).
5. Per char: optional Shift down → `keyDown` → `keyUp` → Shift up, via `Input.dispatchKeyEvent`, with a configurable inter-key delay.
6. RDP client receives trusted key events and forwards them to Windows.

## Key handling
US-layout map covers letters (Shift for uppercase), digits, shifted number-row
symbols, common punctuation, Space, Enter, Tab. Each event sets
`windowsVirtualKeyCode` + `code` + `key` + `text` for maximum client compatibility.

## Known constraints
- `chrome.debugger` shows a yellow "started debugging this browser" banner while attached → **Release debugger** button detaches.
- Only one debugger per tab: if DevTools is open on the RDP tab, attach fails (surfaced as an error with a hint).
- Requires Chrome 114+ (`sidePanel`).
- **Open verification:** that CDP key events reach the canvas while the side panel has focus — the main thing to confirm on first run.
