# Verdant Hollow — Mobile Version (v9.1)

The game now auto-detects phones/tablets and shows touch joysticks.

## How to open on mobile
1. Open your server: `http://YOUR_IP:3000/?3d=1&mobile=1`
   - `?3d=1` = 3D mode (recommended for mobile)
   - `?mobile=1` = force mobile controls (auto-detects anyway on phones)
2. For 2D mode on mobile: `http://YOUR_IP:3000/?mobile=1`
3. Add to home screen:
   - Android Chrome: menu → Add to Home Screen (uses manifest.json, opens in standalone landscape)
   - iPhone Safari: Share → Add to Home Screen

## Controls (mobile)
- **Left joystick** (bottom-left):
  - Up/down = move forward/backward (W/S)
  - Left/right = turn left/right (A/D). Current game has A=turn right, D=turn left (inverted per your request).
- **Right joystick** (bottom-right):
  - Left/right = camera yaw (look left/right) — inverted: drag right = view turns left (same as desktop mouse)
  - Up/down = camera pitch (look up/down) — same as scroll wheel on desktop
- **Buttons**:
  - ⚔️ (big red, bottom-right) = Attack (hold for heavy attack)
  - E (green) = Interact / talk / gather / enter building
  - ✈️ = Fly (X key) — cycles 50ft → 75ft → 50ft → land
  - 🏃 = Sprint (R hold) — hold to run, double-tap R on desktop locks auto-run
  - ↗ = Dodge / jump (Space)
  - Top-left: 🎒 Inventory, 🗺️ Map
  - Top-right: 👤 Character, ☰ Menu
- **When a menu is open**, joysticks auto-hide so they don't block UI.

## Performance (mobile 3D)
- Mobile uses lower pixel ratio (0.8–1.0 vs 1.5 on desktop) and no antialias
- Culling distances reduced:
  - Entities: 1800 (vs 2600 desktop)
  - Trees: 3000 (vs 4500)
  - FX: 1200 (vs 1800)
- Name labels still capped at 30, NPC 300px, monsters 700px

## Desktop still works
- On desktop, mobile controls are hidden unless you add `?mobile=1` for testing
- All desktop controls unchanged:
  - W/S forward/back, A=right turn, D=left turn
  - Mouse sideways only, inverted, scroll = pitch
  - R double-tap = auto-run lock

## Files changed for mobile
- `src/ui/MobileControls.js` (new) — joystick UI + touch handling
- `src/core/Input.js` — virtual joystick + sprint + _injectPressed
- `src/main.js` — creates MobileControls, updates each frame
- `src/world/World3DRenderer.js` — mobile perf culling + pixel ratio
- `src/entities/Player.js` — 2D facing uses joystick dir on mobile
- `src/ui/style.css` — responsive panels for small screens
- `index.html` — viewport user-scalable=no, theme-color, manifest
- `manifest.json` (new) — PWA install, start_url `/?3d=1&mobile=1`

## Testing
- Desktop test: open `http://localhost:3000/?3d=1&mobile=1` — you should see joysticks even on PC
- Phone test: open `http://YOUR_LOCAL_IP:3000/?3d=1` on same WiFi — joysticks auto-show
- `node test/mobile.mjs` — headless virtual joystick logic test
