// World3DRenderer — an experimental full-3D view of Verdant Hollow, built on
// Three.js. It reuses the EXACT game state (world coords, entities, buildings,
// trees) and renders it in perspective 3D with low-poly procedural models.
//
// This is opt-in (`?3d=1`): the normal 2D renderer stays the default. The 3D
// view reads the same entities the 2D game simulates, so logic is untouched.
import * as THREE from '../../vendor/three.module.js';
import { TILE, PX_W, PX_H, VILLAGE_CX, VILLAGE_CY } from './WorldSystem.js';
// only render entities within this world-pixel radius of the player (perf)
const CULL = 2600;

// shared low-poly materials / geometries (built once, reused)
let _shared = null;
function shared() {
  if (_shared) return _shared;
  _shared = {
    ground: new THREE.MeshStandardMaterial({ color: 0x3f7033, roughness: 1 }),
    groundDark: new THREE.MeshStandardMaterial({ color: 0x2a5a28, roughness: 1 }),
    path: new THREE.MeshStandardMaterial({ color: 0xb8a06a, roughness: 1 }),
    water: new THREE.MeshStandardMaterial({ color: 0x3a6a8a, roughness: 0.3 }),
    trunk: new THREE.MeshStandardMaterial({ color: 0x4a3a26, roughness: 1 }),
    canopy: new THREE.MeshStandardMaterial({ color: 0x3f7a35, roughness: 1 }),
    canopyDark: new THREE.MeshStandardMaterial({ color: 0x2a5a33, roughness: 1 }),
    wall: new THREE.MeshStandardMaterial({ color: 0x9a8a6a, roughness: 1 }),
    roof: new THREE.MeshStandardMaterial({ color: 0x8a5a3a, roughness: 1 }),
    body: new THREE.MeshStandardMaterial({ color: 0x7a6a4a, roughness: 1 }),
    skin: new THREE.MeshStandardMaterial({ color: 0xe8c39a, roughness: 1 }),
    hair: new THREE.MeshStandardMaterial({ color: 0x4a3624, roughness: 1 }),
    monster: new THREE.MeshStandardMaterial({ color: 0xc05050, roughness: 1 }),
    boss: new THREE.MeshStandardMaterial({ color: 0xffd76a, roughness: 0.4, emissive: 0x443300 }),
    dragon: new THREE.MeshStandardMaterial({ color: 0xff5a30, roughness: 0.5 }),
    playerGlow: new THREE.MeshBasicMaterial({ color: 0xffd76a })
  };
  return _shared;
}

export class World3DRenderer {
  constructor(game) {
    this.game = game;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87b5d8); // sky blue
    this.scene.fog = new THREE.Fog(0x87b5d8, 4000, 20000);

    // orbit camera state (third-person, mouse-controlled)
    this.yaw = 0;        // horizontal angle around the player
    this.pitch = 0.95;   // downward tilt (radians)
    this.distance = 440; // zoom distance
    this._dragging = false;
    this._last = { x: 0, y: 0 };

    this.camera = new THREE.PerspectiveCamera(60, 1, 4, 120000);

    // lights
    this.hemi = new THREE.HemisphereLight(0xbfd8ff, 0x3f7033, 1.0);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff2d8, 1.4);
    this.sun.position.set(1, 2, 0.6).normalize();
    this.scene.add(this.sun);

    // entity group (rebuilt each frame from game state)
    this.entityRoot = new THREE.Group();
    this.scene.add(this.entityRoot);

    this._terrain = null;
    this._terrainKey = '';
    this._meshCache = new Map(); // key -> { group, meshes, kind, color, facing }

    // build the static world (ground + trees + buildings) once
    this._buildTerrain();
  }

  // ---- static terrain (ground, trees, buildings) ----
  _buildTerrain() {
    if (this._terrain) this.scene.remove(this._terrain);
    const w = this.game.world;
    const S = shared();
    const root = new THREE.Group();

    // ground: one big plane (vertex-tinted detail would be overkill here)
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(PX_W, PX_H), S.ground);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = false;
    root.add(ground);

    // water river + pond as a single strip + one quad (cheap)
    this._addTileOverlays(root, S);

    // trees: hundreds of thousands — use InstancedMesh (one draw call) instead
    // of one mesh per tree (which would exhaust memory).
    this._addTrees(root, S);

    // buildings (only ~39 — individual meshes are fine)
    for (const b of w.buildings) {
      root.add(this._makeBuilding(b));
    }
    this._terrain = root;
    this.scene.add(root);
  }

  _addTrees(root, S) {
    const w = this.game.world;
    const trees = [];
    for (const cell of w.staticGrid.values()) {
      for (const o of cell) if (o.type === 'tree') trees.push(o);
    }
    const n = trees.length;
    if (!n) return;

    const trunkGeo = new THREE.CylinderGeometry(2.4, 2.9, 26, 6);
    const canopyGeo = new THREE.ConeGeometry(11, 24, 7);
    const trunks = new THREE.InstancedMesh(trunkGeo, S.trunk, n);
    const canopies = new THREE.InstancedMesh(canopyGeo, S.canopy, n);

    const dummy = new THREE.Object3D();
    for (let i = 0; i < n; i++) {
      const c = trees[i];
      const size = c.size || 1;
      const x = c.x + c.w / 2 - PX_W / 2;
      const z = c.y + c.h / 2 - PX_H / 2;
      dummy.position.set(x, 13 * size, z);
      dummy.scale.setScalar(size);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      trunks.setMatrixAt(i, dummy.matrix);
      dummy.position.y = 26 * size + 6 * size;
      dummy.updateMatrix();
      canopies.setMatrixAt(i, dummy.matrix);
    }
    trunks.instanceMatrix.needsUpdate = true;
    canopies.instanceMatrix.needsUpdate = true;
    root.add(trunks);
    root.add(canopies);
  }

  _addTileOverlays(root, S) {
    // river: a single vertical blue strip approximating the 2D river
    const riverX = (VILLAGE_CX - 74 + 0.5) * TILE - PX_W / 2;
    const river = new THREE.Mesh(new THREE.PlaneGeometry(TILE * 5, PX_H), S.water);
    river.rotation.x = -Math.PI / 2;
    river.position.set(riverX, 0.4, 0);
    root.add(river);
    // pond: one quad south-east of the village
    const pond = new THREE.Mesh(new THREE.PlaneGeometry(TILE * 8, TILE * 8), S.water);
    pond.rotation.x = -Math.PI / 2;
    pond.position.set(
      (VILLAGE_CX + 24 + 0.5) * TILE - PX_W / 2,
      0.4,
      (VILLAGE_CY + 26 + 0.5) * TILE - PX_H / 2
    );
    root.add(pond);
  }

  _makeBuilding(b) {
    const S = shared();
    const bd = b.building;
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(b.w, 26, b.h), S.wall);
    body.position.y = 13;
    g.add(body);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(b.w + 4, 6, b.h + 4), new THREE.MeshStandardMaterial({ color: parseInt(bd.color.slice(1), 16), roughness: 1 }));
    roof.position.y = 29;
    g.add(roof);
    g.position.set(b.x + b.w / 2 - PX_W / 2, 0, b.y + b.h / 2 - PX_H / 2);
    return g;
  }

  // ---- per-frame entity sync ----
  _worldToLocal(x, y) {
    return { x: x - PX_W / 2, z: y - PX_H / 2 };
  }

  _key(e) { return (e.id || 'e' + e.x + '_' + e.y); }

  _makeEntityMesh(e, kind, color, facing) {
    const S = shared();
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: parseInt((color || '#7a6a4a').slice(1), 16), roughness: 1 });

    if (kind === 'player' || kind === 'npc') {
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(6, 12, 4, 8), mat);
      body.position.y = 12;
      g.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(6, 10, 8), S.skin);
      head.position.y = 24;
      g.add(head);
    } else if (kind === 'slime') {
      const b = new THREE.Mesh(new THREE.SphereGeometry(8, 10, 8), mat);
      b.scale.y = 0.6; b.position.y = 6;
      g.add(b);
    } else if (kind === 'dragon' || kind === 'dragonoid') {
      const b = new THREE.Mesh(new THREE.SphereGeometry(13, 10, 8), mat);
      b.position.y = 12; b.scale.z = 1.4;
      g.add(b);
      const head = new THREE.Mesh(new THREE.SphereGeometry(8, 8, 6), mat);
      head.position.set(14, 18, 0); g.add(head);
    } else if (kind === 'spider') {
      const b = new THREE.Mesh(new THREE.SphereGeometry(8, 10, 8), mat);
      b.position.y = 8; g.add(b);
      const h = new THREE.Mesh(new THREE.SphereGeometry(5, 8, 6), mat);
      h.position.y = 12; g.add(h);
    } else {
      // generic beast: boxy body + head
      const b = new THREE.Mesh(new THREE.BoxGeometry(14, 10, 9), mat);
      b.position.y = 8; g.add(b);
      const h = new THREE.Mesh(new THREE.BoxGeometry(7, 7, 7), mat);
      h.position.set(10, 10, 0); g.add(h);
    }

    // boss marker (gold ring)
    if (kind === 'boss') {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(14, 1.6, 6, 20), S.boss);
      ring.rotation.x = Math.PI / 2; ring.position.y = 2;
      g.add(ring);
    }
    return g;
  }

  // update all entity meshes from the current game state
  sync() {
    const g = this.game;
    const px = g.player.x, py = g.player.y;
    const seen = new Set();

    const place = (e, kind, color) => {
      const key = this._key(e);
      seen.add(key);
      let entry = this._meshCache.get(key);
      if (!entry || entry.kind !== kind || entry.color !== color) {
        if (entry) this.entityRoot.remove(entry.group);
        entry = { kind, color, group: this._makeEntityMesh(e, kind, color, e.facing || 0) };
        this._meshCache.set(key, entry);
        this.entityRoot.add(entry.group);
      }
      const p = this._worldToLocal(e.x, e.y);
      entry.group.position.set(p.x, 0, p.z);
      entry.group.rotation.y = -(e.facing || 0);
      // monsters glow when enraged
      entry.group.visible = Math.hypot(e.x - px, e.y - py) <= CULL;
    };

    // player
    place(g.player, 'player', g.player.clothColor);

    // NPCs, monsters, animals (all within cull radius for perf)
    for (const n of g.npcs) if (Math.hypot(n.x - px, n.y - py) <= CULL) place(n, 'npc', n.clothColor);
    const mons = g.multiplayer.connected ? g.remoteMonsters : g.monsters;
    for (const m of mons) {
      if (m.dead) continue;
      if (Math.hypot(m.x - px, m.y - py) <= CULL) place(m, m.family || 'beast', m.color);
    }
    const animals = g.multiplayer.connected ? g.remoteAnimals : g.animals;
    for (const a of animals) {
      if (a.dead) continue;
      if (Math.hypot(a.x - px, a.y - py) <= CULL) place(a, 'beast', a.color);
    }

    // remove meshes for entities that no longer exist
    for (const [key, entry] of this._meshCache) {
      if (!seen.has(key)) { this.entityRoot.remove(entry.group); this._meshCache.delete(key); }
    }

    // camera follows the player at a comfortable third-person angle
    const pp = this._worldToLocal(px, py);
    const camX = pp.x + Math.sin(this.yaw) * this.distance;
    const camZ = pp.z + Math.cos(this.yaw) * this.distance;
    const camY = Math.sin(this.pitch) * this.distance;
    this.camera.position.set(camX, camY, camZ);
    this.camera.lookAt(pp.x, 14, pp.z);
  }

  // ---- 3D controls: camera-relative movement + facing ----
  // unit vector pointing AWAY from the camera (on the ground plane), in 2D world
  // coords { x: worldX, y: worldY }. Used to rotate WASD into camera space.
  cameraForward() {
    const pp = this._worldToLocal(this.game.player.x, this.game.player.y);
    const camX = pp.x + Math.sin(this.yaw) * this.distance;
    const camZ = pp.z + Math.cos(this.yaw) * this.distance;
    const fx = pp.x - camX, fz = pp.z - camZ;
    const len = Math.hypot(fx, fz) || 1;
    return { x: fx / len, y: fz / len };
  }

  // WASD direction, rotated into camera space: W = away from camera,
  // S = toward camera, A/D = strafe. Returns { x: worldX, y: worldY } (or 0,0).
  cameraDirVector() {
    const raw = this.game.input.dirVector(); // { x: ±1 (right), y: ±1 (down/south) }
    const F = this.cameraForward();
    const R = { x: -F.y, y: F.x }; // camera-right
    let dx = F.x * -raw.y + R.x * raw.x;
    let dy = F.y * -raw.y + R.y * raw.x;
    const mag = Math.hypot(dx, dy);
    if (mag > 1) { dx /= mag; dy /= mag; }
    return { x: dx, y: dy };
  }

  // the direction the player should FACE (movement dir when moving, else forward)
  facingAngle() {
    const d = this.cameraDirVector();
    if (d.x !== 0 || d.y !== 0) return Math.atan2(d.y, d.x);
    const f = this.cameraForward();
    return Math.atan2(f.y, f.x);
  }

  // browser-only: mouse orbit + wheel zoom (right-drag to orbit, wheel to zoom)
  attachControls() {
    if (this._controlsAttached) return;
    this._controlsAttached = true;
    const el = this.renderer ? this.renderer.domElement : null;
    if (!el || typeof window === 'undefined') return;

    const onDown = (e) => {
      if (e.button === 2 || e.button === 1) { // right / middle drag = orbit
        this._dragging = true;
        this._last = { x: e.clientX, y: e.clientY };
        e.preventDefault();
      }
    };
    const onMove = (e) => {
      if (!this._dragging) return;
      const dx = e.clientX - this._last.x;
      const dy = e.clientY - this._last.y;
      this._last = { x: e.clientX, y: e.clientY };
      this.yaw -= dx * 0.005;
      this.pitch = Math.max(0.15, Math.min(1.35, this.pitch + dy * 0.004));
    };
    const onUp = () => { this._dragging = false; };
    const onWheel = (e) => {
      this.distance = Math.max(180, Math.min(900, this.distance * (1 + e.deltaY * 0.001)));
      e.preventDefault();
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    this._detachControls = () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('wheel', onWheel);
    };
  }

  // browser-only: create the WebGL renderer + canvas
  ensureRenderer() {
    if (this.renderer) return;
    const canvas = document.createElement('canvas');
    canvas.id = 'game3d';
    canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:1;';
    document.body.appendChild(canvas);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this._resize = () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    };
    this._resize();
    window.addEventListener('resize', this._resize);
    this.attachControls();
    // small on-screen hint
    try {
      const hint = document.createElement('div');
      hint.style.cssText = 'position:fixed;bottom:12px;left:50%;transform:translateX(-50%);z-index:40;background:rgba(10,8,6,0.7);color:#e8e0c8;font:12px sans-serif;padding:4px 12px;border-radius:6px;pointer-events:none;';
      hint.textContent = '3D preview · WASD move · right-drag orbit · wheel zoom · Esc menu';
      document.body.appendChild(hint);
    } catch (e) {}
  }

  render() {
    this.sync();
    if (!this.renderer) this.ensureRenderer();
    this.renderer.render(this.scene, this.camera);
  }
}
