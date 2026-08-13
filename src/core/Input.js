// Keyboard + mouse input. `held` is a Set of active keys; `pressed` is cleared
// at the end of each frame (call `endFrame()` from the engine).
const KEYS = new Set();
const PRESSED = new Set();
let mouse = { x: 0, y: 0, buttons: 0, wheel: 0 };

export const Input = {
  attach(canvas) {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
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
  held(k) { return KEYS.has(k.toLowerCase()); },
  pressed(k) { return PRESSED.has(k.toLowerCase()); },
  get mouse() { return mouse; },
  endFrame() { PRESSED.clear(); mouse.wheel = 0; },
  dirVector() {
    let x = 0, y = 0;
    if (this.held('a') || this.held('arrowleft')) x -= 1;
    if (this.held('d') || this.held('arrowright')) x += 1;
    if (this.held('w') || this.held('arrowup')) y -= 1;
    if (this.held('s') || this.held('arrowdown')) y += 1;
    if (x !== 0 && y !== 0) { x *= 0.7071; y *= 0.7071; }
    return { x, y };
  }
};
