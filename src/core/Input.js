// Keyboard + mouse input. `held` is a Set of active keys; `pressed` is cleared
// at the end of each frame (call `endFrame()` from the engine).
// Added virtual joystick support for mobile (see MobileControls).
const KEYS = new Set();
const PRESSED = new Set();
let mouse = { x: 0, y: 0, buttons: 0, wheel: 0 };
let _virtual = { x: 0, y: 0 };
let _virtualSprint = false;

export const Input = {
  attach(canvas) {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      // never register game keys while typing in a text field (chat, name input…)
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      const k = e.key.toLowerCase();
      KEYS.add(k);
      PRESSED.add(k);
      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'tab'].includes(k)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => { KEYS.delete(e.key.toLowerCase()); });
    window.addEventListener('blur', () => KEYS.clear());
    canvas.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    });
    canvas.addEventListener('mousedown', (e) => { mouse.buttons |= (1 << e.button); mouse.x = e.clientX; mouse.y = e.clientY; });
    window.addEventListener('mouseup', (e) => { mouse.buttons &= ~(1 << e.button); });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  },
  held(k) {
    const lk = k.toLowerCase();
    if (lk === 'r' && _virtualSprint) return true;
    return KEYS.has(lk);
  },
  pressed(k) { return PRESSED.has(k.toLowerCase()); },
  get mouse() { return mouse; },
  get _virtual() { return _virtual; },
  get _virtualSprint() { return _virtualSprint; },
  set _virtualSprint(v) { _virtualSprint = !!v; },
  // for mobile buttons to inject a one-frame press (e.g. X fly, Space dodge)
  _injectPressed(k) { PRESSED.add(k.toLowerCase()); KEYS.add(k.toLowerCase()); setTimeout(() => KEYS.delete(k.toLowerCase()), 120); },
  _setVirtual(x, y) { _virtual.x = x; _virtual.y = y; },
  endFrame() { PRESSED.clear(); mouse.wheel = 0; },
  dirVector() {
    let x = 0, y = 0;
    if (this.held('a') || this.held('arrowleft')) x -= 1;
    if (this.held('d') || this.held('arrowright')) x += 1;
    if (this.held('w') || this.held('arrowup')) y -= 1;
    if (this.held('s') || this.held('arrowdown')) y += 1;
    // add virtual joystick (mobile)
    x += _virtual.x;
    y += _virtual.y;
    // clamp to unit circle
    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    if (x !== 0 && y !== 0 && len > 0.99) { /* keep normalized, skip 0.7071 for virtual */ }
    else if (x !== 0 && y !== 0) { x *= 0.7071; y *= 0.7071; }
    return { x, y };
  }
};
