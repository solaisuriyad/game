# 3D Third-Person Controls — Reusable Reference

This is the **exact** control scheme used in Verdant Hollow (3D mode, `?3d=1`),
as of **version 8.5**. You can copy these pieces into any other JavaScript +
Three.js game.

Built with: **vanilla JS (ES modules) + Three.js**, no build step.

---

## 1. What the controls do (v8.5)

| Input | Action |
|-------|--------|
| **W** | Move FORWARD (the direction you are looking) |
| **S** | Move BACKWARD |
| **A** | TURN RIGHT (this is *inverted* — A is "right") |
| **D** | TURN LEFT (this is *inverted* — D is "left") |
| **Mouse move RIGHT** | TURN LEFT (inverted) |
| **Mouse move LEFT** | TURN RIGHT (inverted) |
| **Mouse move UP** | Look UP |
| **Mouse move DOWN** | Look DOWN |
| **Mouse stop** | Stop turning (drag-look: turns only while the mouse MOVES) |
| **Scroll wheel up/down** | Look up / down |
| **Double-tap R** | Toggle auto-run (hold = sprint) |

The mouse is **drag-look**: you turn by how far you *move* the mouse, not by
where the pointer sits. When the mouse stops, the view stops. There is no
pointer lock and no feedback loop, so it can never spin on its own.

> **Important note about "inverted":** the A/D and mouse directions were flipped
> on purpose at v8.5. Section 7 shows exactly how to flip them back if you want
> the standard (non-inverted) feel. The signs are the #1 thing people get wrong,
> so read section 6 before changing anything.

---

## 2. The core idea (two angles + a trailing camera)

There are **two horizontal angles** and **two vertical angles**:

| Variable | Meaning |
|----------|---------|
| `lookYaw` | The **player's facing** (horizontal). A/D keys and the mouse change this. |
| `lookPitch` | The **player's vertical tilt**. Mouse Y and the scroll wheel change this. |
| `_camYaw` | The **camera's** horizontal angle. It *trails* `lookYaw`. |
| `_camPitch` | The **camera's** vertical angle. It *trails* `lookPitch`. |

Why two sets? If the camera used `lookYaw` directly, the camera would be glued
behind the player and you would **never see the player turn** (you'd only see
its back while the world spins). By making the camera *smoothly trail* behind,
the player's body visibly rotates a little before the camera swings around —
this is the standard GTA / Zelda / WoW third-person feel.

```
  lookYaw  →  (player faces here instantly)
  _camYaw  →  (camera eases toward lookYaw every frame — small lag)
```

---

## 3. Coordinate system (read this once)

- The world is 2D: `x` = east/right, `y` = south/down (like a canvas).
- The 3D scene maps world `y` to 3D `z`. In this game:
  `local = { x: worldX - CENTER_X, z: worldY - CENTER_Y }`.
- The **forward direction** (where the player faces) is a unit vector:
  `fwd = (cos(lookYaw), sin(lookYaw))` in `(x, z)`.
- `lookPitch` is positive when looking UP toward the sky, negative looking DOWN.

The camera sits **behind** the player at `player - fwd * distance` and looks at
`player + fwd * 320`.

---

## 4. The exact code

### 4a. Keyboard + mouse input (`Input.js`)

```js
// Keyboard + mouse input. `held` is a Set of active keys.
const KEYS = new Set();
const PRESSED = new Set();
let mouse = { x: 0, y: 0, buttons: 0, wheel: 0 };

export const Input = {
  attach(canvas) {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      // ignore keys while typing in a text field (chat / name input)
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      const k = e.key.toLowerCase();
      KEYS.add(k);
      PRESSED.add(k);
    });
    window.addEventListener('keyup', (e) => { KEYS.delete(e.key.toLowerCase()); });
    window.addEventListener('blur', () => KEYS.clear());
    canvas.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    });
    canvas.addEventListener('mousedown', (e) => { mouse.buttons |= (1 << e.button); });
    window.addEventListener('mouseup', (e) => { mouse.buttons &= ~(1 << e.button); });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  },
  held(k)    { return KEYS.has(k.toLowerCase()); },
  pressed(k) { return PRESSED.has(k.toLowerCase()); },
  get mouse() { return mouse; },
  endFrame() { PRESSED.clear(); mouse.wheel = 0; },
  // WASD as a direction vector. W = up = -y, S = down = +y,
  // A = -x, D = +x. Diagonal is normalized to length 0.7071.
  dirVector() {
    let x = 0, y = 0;
    if (this.held('a') || this.held('arrowleft'))  x -= 1;
    if (this.held('d') || this.held('arrowright')) x += 1;
    if (this.held('w') || this.held('arrowup'))    y -= 1;
    if (this.held('s') || this.held('arrowdown'))  y += 1;
    if (x !== 0 && y !== 0) { x *= 0.7071; y *= 0.7071; }
    return { x, y };
  }
};
```

### 4b. Camera controller state (fields on your 3D renderer)

```js
// player-facing angles (changed by A/D keys and the mouse)
this.lookYaw   = 0;      // horizontal facing, radians
this.lookPitch = 0.15;   // vertical tilt: + = up, - = down
this.distance  = 440;    // follow distance behind the player

// camera angles (trail behind the player-facing angles)
this._camYaw   = 0;
this._camPitch = 0.15;

this.lookSens  = 1.0;    // mouse sensitivity multiplier (0.3 .. 2.5)
```

### 4c. Forward vector + camera-relative movement

```js
// unit vector in the look direction (world x/y)
cameraForward() {
  const f = this.lookYaw;
  return { x: Math.cos(f), y: Math.sin(f) };
}

// WASD in 3D: W = forward, S = backward. A/D TURN (handled elsewhere),
// they do NOT strafe — only the W/S part (raw.y) is used here.
cameraDirVector() {
  const raw = this.game.input.dirVector(); // { x: ±1, y: ±1 }
  const F = this.cameraForward();
  // W gives raw.y = -1, so -raw.y = +1 = forward. S gives -1 = backward.
  return { x: F.x * -raw.y, y: F.y * -raw.y };
}
```

### 4d. Mouse look (drag) + scroll wheel

```js
const clampPitch = (v) => Math.max(-0.75, Math.min(0.95, v));

const onMove = (e) => {
  // (also update the shared mouse position for aiming here if needed)
  const dx = e.movementX ?? 0;   // pixels the mouse moved this event
  const dy = e.movementY ?? 0;
  if (dx !== 0 || dy !== 0) {
    const s = this.lookSens;
    this.lookYaw   += dx * 0.0032 * s;                       // INVERTED: right = turn left
    this.lookPitch  = clampPitch(this.lookPitch - dy * 0.0032 * s); // up = look up
  }
};

const onWheel = (e) => {
  this.lookPitch = clampPitch(this.lookPitch + (e.deltaY < 0 ? 0.09 : -0.09));
  e.preventDefault();
};

window.addEventListener('mousemove', onMove);
window.addEventListener('wheel', onWheel, { passive: false });
```

`e.movementX` / `e.movementY` are the deltas since the last mouse event. This is
the key to "drag-look": the view only moves while the mouse is actually moving,
and stops when the mouse stops.

### 4e. Per-frame update: A/D turn + camera trail

This runs every frame in your game loop (with `dt` = seconds since last frame):

```js
const TURN = 2.8; // radians per second

// A/D keys turn the player (INVERTED: A = right, D = left)
if (input.held('a')) renderer.lookYaw -= TURN * dt;  // A = turn RIGHT
if (input.held('d')) renderer.lookYaw += TURN * dt;  // D = turn LEFT

// camera eases toward the player's facing (frame-rate independent)
renderer.updateCameraFollow(dt);
```

The camera-trail method (exponential smoothing — same speed at any frame rate):

```js
updateCameraFollow(dt) {
  const k = 1 - Math.exp(-dt * 10);
  this._camYaw   += (this.lookYaw   - this._camYaw)   * k;
  this._camPitch += (this.lookPitch - this._camPitch) * k;
}
```

### 4f. Placing the camera (every frame, in render)

Use the **smoothed** `_camYaw` / `_camPitch` (not the raw `lookYaw`) so the
camera trails:

```js
const pp = { x: player.localX, z: player.localZ }; // player position in 3D space
const elev = player.altitude;                     // 0 on the ground

const fwdX = Math.cos(this._camYaw), fwdZ = Math.sin(this._camYaw);
const lookP = this._camPitch;
const dist = this.distance;
const shoulder = 46;                              // camera height at the shoulder

const camX = pp.x - fwdX * dist;                  // behind the player
const camZ = pp.z - fwdZ * dist;
const camY = Math.max(elev + 16, elev + shoulder + lookP * dist * 0.55);

const lookX = pp.x + fwdX * 320;                  // look at a point ahead
const lookZ = pp.z + fwdZ * 320;
const lookY = Math.max(elev + 6, elev + 12 + lookP * 260);

this.camera.position.set(camX, camY, camZ);
this.camera.lookAt(lookX, lookY, lookZ);
```

`Math.max(elev + 16, ...)` clamps the camera **above the ground**, so looking
down can never push the camera underground.

### 4g. Moving the player (in the player update)

The player reads the movement vector (from `cameraDirVector()`) and walks:

```js
const dir = game._dirFn ? game._dirFn() : game.input.dirVector();
const moving = dir.x !== 0 || dir.y !== 0;

const spd = sprinting ? 230 : speed;   // pixels per second
if (moving) {
  game.world.moveEntity(this, dir.x * spd * dt, dir.y * spd * dt);
}

// the body faces where the camera looks (when not auto-facing a monster)
this.facing = renderer.lookYaw;
```

---

## 5. Why it works / why it won't spin

- **Drag-look uses deltas** (`movementX`/`movementY`), not the cursor position.
  A stationary mouse produces zero delta, so the view can never rotate on its
  own. This avoids the classic "face the cursor" bug where turning the player
  moves the ground point under the cursor, which turns the player again → an
  infinite 360° spin.
- **A/D turn and the mouse both change `lookYaw`**, so they stay in sync and
  never fight each other.
- **The camera only *reads* `lookYaw` via the smoothed copy.** It never writes
  back to it, so there is no feedback loop between camera and facing.

---

## 6. The sign/direction cheat sheet (MOST IMPORTANT)

This is the part that gets confused the most. Everything below is for a camera
behind the player looking along `fwd = (cos(yaw), sin(yaw))`.

**Current (v8.5, inverted) behavior:**

| Action | Code | Effect |
|--------|------|--------|
| Press **A** | `lookYaw -= TURN*dt` | turns RIGHT |
| Press **D** | `lookYaw += TURN*dt` | turns LEFT |
| Mouse **right** (`dx > 0`) | `lookYaw += dx*k` | turns LEFT |
| Mouse **left** (`dx < 0`) | `lookYaw += dx*k` | turns RIGHT |
| Mouse **up** (`dy < 0`) | `lookPitch -= dy*k` | looks UP |
| Scroll **up** | `lookPitch += 0.09` | looks UP |

**How to flip any direction:**

| Want to change | Do this |
|----------------|---------|
| Flip A/D keys | Swap `+=` and `-=` on the two A/D lines (or negate `TURN`). |
| Flip mouse left/right | Change `lookYaw += dx * k` → `lookYaw -= dx * k`. |
| Flip mouse up/down | Change `lookPitch - dy * k` → `lookPitch + dy * k`. |

A good trick: keep the A/D lines and the mouse line using the **same sign rule**
(so keys and mouse feel identical). Here the mouse is `lookYaw += dx*k` and D is
`lookYaw += TURN*dt` — both use `+=` for the same screen direction, so they
always agree.

---

## 7. How to tune it

| Feel | Value | Where |
|------|-------|-------|
| Turn speed (A/D) | `TURN = 2.8` rad/s | 4e — raise = faster turn |
| Mouse speed | `0.0032` rad per pixel (× `lookSens`) | 4d — raise = faster mouse |
| Sensitivity range | `0.3 .. 2.5` | `lookSens` |
| Camera follow stiffness | `10` in `1 - exp(-dt * 10)` | 4e — higher = snappier (less lag) |
| Zoom in/out | `distance ± 70`, clamp `160..1000` | `zoomIn()` / `zoomOut()` |
| Pitch limits | `-0.75 .. 0.95` | `clampPitch` |
| Walk speed | `spd = sprinting ? 230 : speed` | 4g |

---

## 8. Minimal integration checklist (for a new game)

1. Copy the `Input` object (4a) and attach it to your canvas.
2. Add the camera fields (4b) to your renderer class.
3. Add `cameraForward()` + `cameraDirVector()` (4c) and use it for movement.
4. Add the `onMove` / `onWheel` handlers (4d).
5. In your game loop, run the A/D turn + `updateCameraFollow(dt)` (4e).
6. Place the camera every frame with the smoothed angles (4f).
7. In the player update, move with `dir * spd * dt` and set `facing = lookYaw` (4g).

If the player model "faces" a different default direction in your game, rotate
the model by `-facing` around its Y axis (in this game: `mesh.rotation.y = -facing`
because the character model's "forward" is +X).
