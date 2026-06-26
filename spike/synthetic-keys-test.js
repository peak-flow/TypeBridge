/* =============================================================================
 * RDP KEYSTROKE FEASIBILITY SPIKE  (synthetic-event path)
 * =============================================================================
 *
 * GOAL: Prove whether we can inject keystrokes into your web-based Remote
 *       Desktop session straight from the page, using synthetic KeyboardEvents.
 *
 *   PASS  -> the real Chrome extension can be a lightweight content script
 *            (no `debugger` permission, no "is being debugged" banner).
 *   FAIL  -> we fall back to the chrome.debugger + Input.dispatchKeyEvent
 *            path (also fine, just a bit heavier). We'll spike that next.
 *
 * -----------------------------------------------------------------------------
 * HOW TO RUN
 * -----------------------------------------------------------------------------
 *  1. In the remote Windows session, open NOTEPAD (a harmless scratch field).
 *     Do NOT aim this at anything that could trigger an action.
 *  2. In your Mac Chrome, on the RDP tab, open DevTools (Cmd+Opt+I).
 *     Undock DevTools to its own window so the RDP screen stays visible.
 *  3. IF the remote desktop is inside an <iframe>: in the Console, use the
 *     context dropdown (top-left of the Console, usually says "top") and
 *     switch it to the RDP frame. Otherwise this runs in the wrong document.
 *  4. Paste this whole file into the Console and press Enter.
 *  5. You get a countdown. During it, CLICK INTO THE NOTEPAD WINDOW in the
 *     remote session so the RDP canvas has keyboard focus.
 *  6. Watch Notepad. Did "hello world 123" type itself out?
 *
 * -----------------------------------------------------------------------------
 * TROUBLESHOOTING LEVERS (tweak the CONFIG block below, re-paste)
 * -----------------------------------------------------------------------------
 *  - Nothing appears        -> increase START_DELAY_MS; make sure you clicked
 *                              into the remote field; check the iframe context.
 *  - Each letter is doubled  -> set SEND_KEYPRESS = false.
 *  - Letters dropped/garbled -> increase KEY_DELAY_MS (e.g. 150).
 * ========================================================================== */

(async () => {
  // ---- CONFIG ---------------------------------------------------------------
  const TEST_TEXT     = 'hello world 123'; // lowercase + space + digits (no shift, keeps test simple)
  const START_DELAY_MS = 4000;             // time for you to click into the remote field
  const KEY_DELAY_MS   = 80;               // gap between keystrokes (raise if chars drop)
  const SEND_KEYPRESS  = true;             // some clients need it; set false if you get doubles
  // ---------------------------------------------------------------------------

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // Map a character to the event properties an RDP keyboard handler reads.
  function charToKeyInfo(ch) {
    const ascii = ch.charCodeAt(0);
    let keyCode, code;
    if (ch >= 'a' && ch <= 'z')      { keyCode = ch.toUpperCase().charCodeAt(0); code = 'Key' + ch.toUpperCase(); }
    else if (ch >= 'A' && ch <= 'Z') { keyCode = ascii;                          code = 'Key' + ch; }
    else if (ch >= '0' && ch <= '9') { keyCode = ascii;                          code = 'Digit' + ch; }
    else if (ch === ' ')             { keyCode = 32;                             code = 'Space'; }
    else                             { keyCode = ascii;                          code = ''; }
    return { key: ch, code, keyCode, charCode: ascii };
  }

  // Build a KeyboardEvent. NOTE: Chrome zeroes out keyCode/which/charCode when
  // passed via the constructor, so we force them with defineProperty.
  function makeKeyEvent(type, info) {
    const ev = new KeyboardEvent(type, {
      key: info.key,
      code: info.code,
      bubbles: true,
      cancelable: true,
      composed: true, // cross shadow-DOM boundaries (some clients use web components)
      view: window,
    });
    const isPress = type === 'keypress';
    Object.defineProperty(ev, 'keyCode',  { get: () => info.keyCode });
    Object.defineProperty(ev, 'which',    { get: () => (isPress ? info.charCode : info.keyCode) });
    Object.defineProperty(ev, 'charCode', { get: () => (isPress ? info.charCode : 0) });
    return ev;
  }

  console.log(
    '%c[RDP spike] Click into NOTEPAD on the remote session NOW. Typing in...',
    'color:#0a0;font-weight:bold;font-size:14px'
  );
  for (let s = Math.round(START_DELAY_MS / 1000); s > 0; s--) {
    console.log('[RDP spike] ' + s + '...');
    await sleep(1000);
  }

  // Pick the best dispatch target: the focused element, else a canvas, else body.
  let target = document.activeElement;
  if (!target || target === document.body || target === document.documentElement) {
    target = document.querySelector('canvas') || document.body;
  }
  console.log('[RDP spike] Dispatching keystrokes to:', target);

  for (const ch of TEST_TEXT) {
    const info = charToKeyInfo(ch);
    target.dispatchEvent(makeKeyEvent('keydown', info));
    if (SEND_KEYPRESS) target.dispatchEvent(makeKeyEvent('keypress', info));
    target.dispatchEvent(makeKeyEvent('keyup', info));
    await sleep(KEY_DELAY_MS);
  }

  console.log(
    '%c[RDP spike] DONE. Did "' + TEST_TEXT + '" appear in the remote field?',
    'color:#0a0;font-weight:bold;font-size:14px'
  );
})();
