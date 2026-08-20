// World3DRenderer — an experimental full-3D view of Verdant Hollow, built on
// Three.js. It reuses the EXACT game state (world coords, entities, buildings,
// trees) and renders it in perspective 3D with low-poly procedural models.
//
// This is opt-in (`?3d=1`): the normal 2D renderer stays the default. The 3D
// view reads the same entities the 2D game simulates, so logic is untouched.
import * as THREE from '../../vendor/three.module.js';
import { TILE, PX_W, PX_H, VILLAGE_CX, VILLAGE_CY, SNOW_X0, SNOW_X1, SNOW_Y0, SNOW_Y1, isSnowRegion } from './WorldSystem.js';
import { makeFigure } from './Figure3D.js';
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
    snowCanopy: new THREE.MeshStandardMaterial({ color: 0xe8eef0, roughness: 1 }),
    rock: new THREE.MeshStandardMaterial({ color: 0x6a6258, roughness: 1 }),
    snowCap: new THREE.MeshStandardMaterial({ color: 0xf2f5f7, roughness: 0.6 }),
    snowGround: new THREE.MeshStandardMaterial({ color: 0xeef2f4, roughness: 1 }),
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

    // third-person look camera (Minecraft-style): mouse-look rotates the view,
    // the camera sits at the player's level and follows behind their back.
    this.lookYaw = 0;        // horizontal look direction (also the facing target)
    this.lookPitch = 0.15;   // vertical look: + = up (sky), - = down (ground)
    this.distance = 440;     // follow distance behind the player
    this._dragging = false;
    this._last = { x: 0, y: 0 };
    this._lastMx = null;  // last mouse position (for Minecraft-style delta look)
    this._lastMy = null;
    this._clouds = null;
    // smoothed camera yaw/pitch: the CAMERA lags slightly behind lookYaw so the
    // player's turn is VISIBLE (the body rotates a little before the camera
    // swings behind). lookYaw/lookPitch stay the player's true facing.
    this._camYaw = 0;
    this._camPitch = 0.15;
    // input targets: the mouse/A-D keys write here, and lookYaw/lookPitch ease
    // toward them each frame. This low-passes the mouse so the view is STABLE
    // (jitter is damped) while staying responsive (fast time constant).
    this._targetYaw = 0;
    this._targetPitch = 0.15;
    // look settings (loaded from the saved settings)
    this.lookSens = 1.0;   // mouse sensitivity multiplier (0.3 .. 2.5)
    this.invertX = false;  // flip horizontal look
    this._loadLookSettings();

    // aiming: raycast the mouse cursor onto the ground plane
    this._mouseNdc = { x: 0, y: 0 };
    this._ray = new THREE.Raycaster();
    this._ndcVec = new THREE.Vector2();
    this._hitVec = new THREE.Vector3();
    this._groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    this.camera = new THREE.PerspectiveCamera(60, 1, 4, 120000);

    // lights
    this.hemi = new THREE.HemisphereLight(0xbfd8ff, 0x3f7033, 1.0);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff2d8, 1.4);
    this.sun.position.set(1, 2, 0.6).normalize();
    this.scene.add(this.sun);

    // day/night + weather state (mutated each frame from the game's time/weather)
    this._skyDay = new THREE.Color(0x87b5d8);
    this._skyNight = new THREE.Color(0x0a0e18);
    this._fogDay = new THREE.Color(0x87b5d8);
    this._fogNight = new THREE.Color(0x0a0e18);
    this._sunDay = new THREE.Color(0xfff2d8);
    this._sunNight = new THREE.Color(0x8899cc);
    this._tmp = new THREE.Color();
    this._rain = null;       // Points object (created lazily when it rains)
    this._rainBase = null;   // base x/y/z per raindrop
    this._rainPos = null;    // live position attribute
    this._snow = null;       // Points object (winter snow, lazy)
    this._snowBase = null;
    this._snowPos = null;
    this._skySun = null;     // sun mesh (orbits the sky by day)
    this._skyMoon = null;    // moon mesh (orbits the sky by night)
    this._groundMat = null;  // ground material (tinted per season)
    this._season = -1;       // last applied season index (for canopy tint)

    // entity group (rebuilt each frame from game state)
    this.entityRoot = new THREE.Group();
    this.scene.add(this.entityRoot);
    // fx group (projectiles, corpses, traps, drops) — cleared each frame
    this.fxRoot = new THREE.Group();
    this.scene.add(this.fxRoot);
    // resource nodes are static-ish: build once, toggle visibility (no per-frame
    // mesh churn, which caused GC stutter)
    this.nodeRoot = new THREE.Group();
    this.scene.add(this.nodeRoot);
    this._nodeMeshes = [];
    this._fx = this._makeFxShared();
    this._projVec = new THREE.Vector3(); // reused for float-text projection

    this._terrain = null;
    this._terrainKey = '';
    this._meshCache = new Map(); // key -> { group, meshes, kind, color, facing }
    this._yggGlow = null;        // the world tree's glow (pulsed each frame)

    // build the static world (ground + trees + buildings + Yggdrasil) once
    this._buildTerrain();
  }

  // load + save the look settings (sensitivity, invert X) in the shared settings
  _loadLookSettings() {
    try {
      const raw = localStorage.getItem('verdant-hollow:settings');
      if (raw) {
        const s = JSON.parse(raw);
        if (typeof s.lookSens === 'number') this.lookSens = Math.max(0.3, Math.min(2.5, s.lookSens));
        if (typeof s.invertX === 'boolean') this.invertX = s.invertX;
      }
    } catch (e) {}
  }
  _saveLookSettings() {
    try {
      let s = {};
      try { s = JSON.parse(localStorage.getItem('verdant-hollow:settings') || '{}'); } catch (e) {}
      s.lookSens = this.lookSens;
      s.invertX = this.invertX;
      localStorage.setItem('verdant-hollow:settings', JSON.stringify(s));
    } catch (e) {}
  }
  setLookSens(v) { this.lookSens = Math.max(0.3, Math.min(2.5, v)); this._saveLookSettings(); }
  setInvertX(v) { this.invertX = !!v; this._saveLookSettings(); }

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
    this._groundMat = S.ground;

    // sun + moon (billboarded spheres that orbit the sky, far away)
    this._skySun = new THREE.Mesh(new THREE.SphereGeometry(400, 12, 10), new THREE.MeshBasicMaterial({ color: 0xfff2a0, fog: false }));
    this._skySun.frustumCulled = false;
    this.scene.add(this._skySun);
    this._skyMoon = new THREE.Mesh(new THREE.SphereGeometry(300, 12, 10), new THREE.MeshBasicMaterial({ color: 0xdfe8ff, fog: false }));
    this._skyMoon.frustumCulled = false;
    this.scene.add(this._skyMoon);

    // drifting clouds high in the sky (visible when you look up)
    this._clouds = this._makeClouds();

    // water river + pond as a single strip + one quad (cheap)
    this._addTileOverlays(root, S);

    // trees: hundreds of thousands — use InstancedMesh (one draw call) instead
    // of one mesh per tree (which would exhaust memory).
    this._addTrees(root, S);

    // buildings (only ~39 — individual meshes are fine)
    for (const b of w.buildings) {
      root.add(this._makeBuilding(b));
    }
    // the permanent snow region (north-west quarter of the monster forest)
    root.add(this._makeSnowOverlay());
    // mountains (peaks around the town + monster forest, some snowy/waterfalls)
    for (const m of w.mountains) {
      root.add(this._makeMountain(m));
    }
    // the Yggdrasil — the colossal world tree at the heart of monster territory
    root.add(this._makeYggdrasil());
    this._terrain = root;
    this.scene.add(root);
  }

  // a flat white plane covering the permanent snow region (ground is a single
  // big plane, so we lay a snow quad over that quarter of the monster forest)
  _makeSnowOverlay() {
    const S = shared();
    const w = (SNOW_X1 - SNOW_X0) * TILE;
    const h = (SNOW_Y1 - SNOW_Y0) * TILE;
    const cx = ((SNOW_X0 + SNOW_X1) / 2) * TILE - PX_W / 2;
    const cz = ((SNOW_Y0 + SNOW_Y1) / 2) * TILE - PX_H / 2;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), S.snowGround);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(cx, 0.6, cz);
    return mesh;
  }

  // a low-poly mountain peak: rocky cone, white snow cap, optional waterfall
  _makeMountain(m) {
    const S = shared();
    const g = new THREE.Group();
    // rocky body
    const body = new THREE.Mesh(new THREE.ConeGeometry(m.r, m.h, 8), S.rock);
    body.position.y = m.h / 2;
    g.add(body);
    // snow cap (smaller white cone near the top)
    if (m.snowy) {
      const cap = new THREE.Mesh(new THREE.ConeGeometry(m.r * 0.5, m.h * 0.42, 8), S.snowCap);
      cap.position.y = m.h * 0.78;
      g.add(cap);
    }
    // waterfall: a blue stream flowing down the south side into a pool
    if (m.waterfall) {
      const stream = new THREE.Mesh(new THREE.BoxGeometry(m.r * 0.16, m.h * 0.7, 2), S.water);
      stream.position.set(m.r * 0.28, m.h * 0.42, m.r * 0.3);
      g.add(stream);
      const pool = new THREE.Mesh(new THREE.CylinderGeometry(m.r * 0.3, m.r * 0.34, 4, 10), S.water);
      pool.position.set(m.r * 0.28, 2, m.r * 0.3);
      g.add(pool);
    }
    g.position.set(m.x - PX_W / 2, 0, m.y - PX_H / 2);
    return g;
  }

  _makeYggdrasil() {
    const w = this.game.world;
    if (!w.yggdrasil) return new THREE.Group();
    const S = shared();
    const g = new THREE.Group();
    const cx = w.yggdrasil.x - PX_W / 2;
    const cz = w.yggdrasil.y - PX_H / 2;

    // colossal trunk
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(90, 120, 720, 10), new THREE.MeshStandardMaterial({ color: 0x4a3220, roughness: 1 }));
    trunk.position.y = 360;
    g.add(trunk);
    // giant roots
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const root = new THREE.Mesh(new THREE.CylinderGeometry(26, 40, 320, 6), S.trunk);
      root.position.set(Math.cos(a) * 130, 80, Math.sin(a) * 130);
      root.rotation.z = Math.cos(a) * 0.6;
      root.rotation.x = Math.sin(a) * 0.6;
      g.add(root);
    }
    // 9-color layered canopy (spheres of distinct colors, arranged in a big dome)
    const COLORS = [0xff5040, 0xffa030, 0xffe040, 0x7ae040, 0x40e0a0, 0x40c0e0, 0x5070ff, 0xa050ff, 0xff50c0];
    for (let i = 0; i < COLORS.length; i++) {
      const mat = new THREE.MeshStandardMaterial({ color: COLORS[i], roughness: 0.6, emissive: COLORS[i], emissiveIntensity: 0.15 });
      const r = 520 - i * 45;
      const y = 760 + i * 30;
      const blob = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), mat);
      blob.position.set(0, y, 0);
      g.add(blob);
    }
    // big soft glow
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(760, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xfff0c0, transparent: true, opacity: 0.12, depthWrite: false })
    );
    glow.position.y = 800;
    g.add(glow);
    this._yggGlow = glow;

    g.position.set(cx, 0, cz);
    return g;
  }

  _addTrees(root, S) {
    const w = this.game.world;
    // Trees BLOCK the player (collision), so the 3D view must render every one —
    // thinning them left 5/6 of blocking trees invisible ("invisible walls").
    // Instead: render ALL trees, split into spatial chunks of InstancedMeshes,
    // distance-cull chunks each frame, and rebuild a chunk when a tree is chopped.
    const CHUNK = 2000;    // chunk size in world px

    this._treeRoot = root;
    this._treeChunkSize = CHUNK;
    this._treeGeo = {
      trunk: new THREE.CylinderGeometry(2.4, 2.9, 26, 6),
      canopy: new THREE.ConeGeometry(11, 24, 7)
    };
    this._treeDummy = new THREE.Object3D();
    this._treeChunks = [];          // cull list: { trunks, canopies, wx, wy, key }
    this._treeChunkMap = new Map(); // key -> { trunks, canopies, trees }
    this._depletedSnapshot = new Set(w.depletedTrees);

    const chunks = new Map(); // key -> array of tree objects (all, incl. depleted)
    for (const cell of w.staticGrid.values()) {
      for (const o of cell) {
        if (o.type !== 'tree') continue;
        const cx = Math.floor(o.x / CHUNK), cy = Math.floor(o.y / CHUNK);
        const key = cx + ',' + cy;
        if (!chunks.has(key)) chunks.set(key, []);
        chunks.get(key).push(o);
      }
    }
    for (const [key, trees] of chunks) this._buildTreeChunk(key, trees);
  }

  // build (or rebuild) the instanced meshes for one spatial chunk, skipping any
  // chopped (depleted) trees so they disappear from view. Snowy trees use a
  // white canopy (separate instanced mesh so they stay snowy all year round).
  _buildTreeChunk(key, trees) {
    const S = shared();
    const CHUNK = this._treeChunkSize;
    const root = this._treeRoot;
    const G = this._treeGeo;
    const dummy = this._treeDummy;

    const old = this._treeChunkMap.get(key);
    if (old) { for (const m of old.meshes) root.remove(m); }

    const keep = trees.filter((t) => !t.depleted);
    const normal = keep.filter((t) => !t.snowy);
    const snowy = keep.filter((t) => t.snowy);
    const meshes = [];

    const build = (list, canopyMat) => {
      const n = list.length;
      if (!n) return;
      const trunks = new THREE.InstancedMesh(G.trunk, S.trunk, n);
      const canopies = new THREE.InstancedMesh(G.canopy, canopyMat, n);
      for (let j = 0; j < n; j++) {
        const c = list[j];
        const size = c.size || 1;
        const x = c.x + c.w / 2 - PX_W / 2;
        const z = c.y + c.h / 2 - PX_H / 2;
        dummy.position.set(x, 13 * size, z);
        dummy.scale.setScalar(size);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        trunks.setMatrixAt(j, dummy.matrix);
        dummy.position.y = 26 * size + 6 * size;
        dummy.updateMatrix();
        canopies.setMatrixAt(j, dummy.matrix);
      }
      trunks.instanceMatrix.needsUpdate = true;
      canopies.instanceMatrix.needsUpdate = true;
      root.add(trunks); root.add(canopies);
      meshes.push(trunks, canopies);
    };
    build(normal, S.canopy);
    build(snowy, S.snowCanopy);

    const [cx, cy] = key.split(',').map(Number);
    const entry = { meshes, trees, key, wx: (cx + 0.5) * CHUNK, wy: (cy + 0.5) * CHUNK, normal: normal.length, snowy: snowy.length };
    this._treeChunkMap.set(key, entry);
    const idx = this._treeChunks.findIndex((c) => c.key === key);
    if (idx >= 0) this._treeChunks[idx] = entry; else this._treeChunks.push(entry);
  }

  // detect trees that were chopped or regrown since last frame and rebuild just
  // their chunks (cheap: the depleted list is tiny and changes rarely)
  _rebuildTreeChunks() {
    const w = this.game.world;
    const snap = this._depletedSnapshot;
    if (!snap) return;
    const current = new Set(w.depletedTrees);
    const changed = [];
    for (const t of current) if (!snap.has(t)) changed.push(t);
    for (const t of snap) if (!current.has(t)) changed.push(t);
    if (!changed.length) return;
    this._depletedSnapshot = current;

    const keys = new Set();
    for (const t of changed) {
      const cx = Math.floor(t.x / this._treeChunkSize), cy = Math.floor(t.y / this._treeChunkSize);
      keys.add(cx + ',' + cy);
    }
    for (const key of keys) {
      const entry = this._treeChunkMap.get(key);
      if (entry) this._buildTreeChunk(key, entry.trees);
    }
  }

  _makeClouds() {
    const g = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.72, fog: false, depthWrite: false });
    const puff = new THREE.SphereGeometry(70, 8, 6);
    for (let i = 0; i < 24; i++) {
      const cloud = new THREE.Group();
      const n = 3 + (i % 4);
      for (let j = 0; j < n; j++) {
        const p = new THREE.Mesh(puff, mat);
        p.position.set(j * 80 - 70, (j % 2) * 22, ((i + j) % 4) * 14 - 20);
        p.scale.set(1.7, 0.45, 1.2);
        cloud.add(p);
      }
      cloud.position.set((i % 6) * 3000 - 7500, 2300 + (i % 5) * 260, (Math.floor(i / 6)) * 3400 - 6800);
      cloud.userData.bx = cloud.position.x;
      g.add(cloud);
    }
    g.frustumCulled = false;
    this.scene.add(g);
    return g;
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

  // stable cache key: the PLAYER has no `id`, so using x/y would rebuild its
  // mesh every single frame (a major slowdown). Use a fixed key for the player.
  _key(e) { return e.isPlayer ? 'player' : (e.id || 'e' + e.x + '_' + e.y); }

  // material cache by color (avoid rebuilding materials every frame)
  _mat(hex) {
    if (!this._matCache) this._matCache = new Map();
    if (!this._matCache.has(hex)) {
      this._matCache.set(hex, new THREE.MeshStandardMaterial({ color: parseInt(hex.slice(1), 16), roughness: 1 }));
    }
    return this._matCache.get(hex);
  }

  // small geometries/materials for FX markers (arrows, orbs, traps, nodes, …)
  _makeFxShared() {
    return {
      arrow: new THREE.BoxGeometry(26, 3, 3),
      orb: new THREE.SphereGeometry(7, 8, 6),
      ring: new THREE.TorusGeometry(9, 1.5, 4, 12),
      disc: new THREE.CylinderGeometry(8, 8, 2, 10),
      nodeGeo: new THREE.ConeGeometry(6, 14, 6),
      arrowMat: new THREE.MeshStandardMaterial({ color: 0xc8a06a }),
      rockMat: new THREE.MeshStandardMaterial({ color: 0x8a8a7a }),
      webMat: new THREE.MeshStandardMaterial({ color: 0xe8e8e8 }),
      corpseMat: new THREE.MeshStandardMaterial({ color: 0x6a4a3a }),
      dropMat: new THREE.MeshBasicMaterial({ color: 0xffd76a }),
      trapMat: new THREE.MeshStandardMaterial({ color: 0x8a8a90 }),
      herbMat: new THREE.MeshStandardMaterial({ color: 0x5fbf5f }),
      mushMat: new THREE.MeshStandardMaterial({ color: 0xc8c8c8 }),
      berryMat: new THREE.MeshStandardMaterial({ color: 0xd04040 }),
      flowerMat: new THREE.MeshStandardMaterial({ color: 0xe8a0d0 }),
      oreMat: new THREE.MeshStandardMaterial({ color: 0x9a9a98 })
    };
  }

  _addWings(g, mat, scale = 1) {
    // two triangular wing membranes
    const wingGeo = new THREE.BufferGeometry();
    const s = 22 * scale;
    const verts = new Float32Array([
      0, 0, 0,   -s, s * 0.7, -s * 0.5,   -s * 1.1, s * 0.2, s * 0.2
    ]);
    wingGeo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    wingGeo.setIndex([0, 1, 2]);
    wingGeo.computeVertexNormals();
    const lw = new THREE.Mesh(wingGeo, mat);
    lw.position.set(-6, 16 * scale, 0);
    g.add(lw);
    const rw = new THREE.Mesh(wingGeo, mat);
    rw.position.set(6, 16 * scale, 0);
    rw.rotation.y = Math.PI;
    g.add(rw);
  }

  _makeEntityMesh(e, kind, color, facing) {
    const S = shared();
    const g = new THREE.Group();
    const mat = this._mat(color || '#7a6a4a');
    const skin = S.skin;
    const boss = e.boss === true;

    if (kind === 'player' || kind === 'npc') {
      // human figure — full body with gender-distinct build, face, clothing
      const fig = makeFigure({
        gender: e.gender || 'neutral',
        skinTone: e.skinTone,
        hairColor: e.hairColor,
        clothColor: e.clothColor || color,
        age: e.age,
        occupation: e.occupation
      });
      if (kind !== 'player') return fig;
      // Player only: wrap the figure in a group with a "pose" pivot (so the body
      // can lie HORIZONTAL while flying) plus a soft ground shadow. The outer
      // group holds the yaw (rotation.y), the pose pivot holds the prone tilt
      // (rotation.z), so the two don't fight each other.
      const g = new THREE.Group();
      const pose = new THREE.Group();
      pose.add(fig);
      g.add(pose);
      // soft shadow on the ground under the player (stays on the floor even while
      // flying — its local Y is pushed down by the flight altitude each frame)
      const shadow = new THREE.Mesh(
        new THREE.CircleGeometry(15, 20),
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false })
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = -0.1;
      g.add(shadow);
      g.userData.pose = pose;
      g.userData.shadow = shadow;
      g.userData.walk = fig.userData.walk;
      g.userData.idle = fig.userData.idle;
      return g;
    } else if (kind === 'slime') {
      const b = new THREE.Mesh(new THREE.SphereGeometry(9, 12, 9), mat);
      b.scale.y = 0.6; b.position.y = 6; g.add(b);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(2.2, 6, 6), S.playerGlow);
      eye.position.set(3, 8, 6); g.add(eye);
    } else if (kind === 'spider') {
      // bulbous abdomen + small head + 8 jointed legs
      const b = new THREE.Mesh(new THREE.SphereGeometry(9, 10, 8), mat);
      b.position.y = 9; b.scale.set(1, 0.9, 1.2); g.add(b);
      const h = new THREE.Mesh(new THREE.SphereGeometry(5.5, 8, 6), mat);
      h.position.set(0, 11, 9); g.add(h);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.4, 26, 5), mat);
        leg.position.set(Math.cos(a) * 7, 6, Math.sin(a) * 7);
        leg.rotation.z = Math.cos(a) * 0.7;
        leg.rotation.x = Math.sin(a) * 0.7;
        g.add(leg);
      }
    } else if (kind === 'treant') {
      // walking tree: trunk body, branch arms, leafy head
      const body = new THREE.Mesh(new THREE.CylinderGeometry(6, 8, 26, 7), S.trunk);
      body.position.y = 14; g.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(9, 8, 7), S.canopy);
      head.position.y = 32; g.add(head);
      const arm = (sgn) => {
        const a = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 3, 20, 5), S.trunk);
        a.position.set(sgn * 9, 16, 0); a.rotation.z = sgn * 0.9; g.add(a);
      };
      arm(-1); arm(1);
    } else if (kind === 'wolf') {
      // quadruped: elongated body, head, tail, legs
      const b = new THREE.Mesh(new THREE.CapsuleGeometry(6, 16, 4, 8), mat);
      b.rotation.z = Math.PI / 2; b.position.y = 8; g.add(b);
      const h = new THREE.Mesh(new THREE.SphereGeometry(5, 8, 6), mat);
      h.position.set(14, 9, 0); g.add(h);
      const tail = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 3, 16, 5), mat);
      tail.position.set(-16, 10, 0); tail.rotation.z = Math.PI / 3; g.add(tail);
      for (const [lx, lz] of [[-6, -4], [-6, 4], [6, -4], [6, 4]]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2, 10, 5), mat);
        leg.position.set(lx, 3, lz); g.add(leg);
      }
    } else if (kind === 'dragon') {
      // winged serpent: long body, tail, horned head, big wings
      const b = new THREE.Mesh(new THREE.CapsuleGeometry(13, 20, 4, 8), mat);
      b.rotation.z = Math.PI / 2; b.position.y = 14; g.add(b);
      const tail = new THREE.Mesh(new THREE.ConeGeometry(7, 30, 6), mat);
      tail.rotation.z = Math.PI / 2; tail.position.set(-28, 16, 0); g.add(tail);
      const head = new THREE.Mesh(new THREE.SphereGeometry(9, 8, 6), mat);
      head.position.set(26, 18, 0); g.add(head);
      for (const sgn of [-1, 1]) {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(3, 12, 6), S.skin);
        horn.position.set(26 + sgn * 5, 26, 0); horn.rotation.z = sgn * 0.4; g.add(horn);
      }
      this._addWings(g, mat, 1.6);
    } else if (kind === 'dragonoid') {
      // upright dragon-human hybrid: humanoid body + wings + horns
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(9, 16, 4, 8), mat);
      body.position.y = 18; g.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(8, 8, 6), mat);
      head.position.y = 34; g.add(head);
      for (const sgn of [-1, 1]) {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(3, 14, 6), S.skin);
        horn.position.set(sgn * 6, 40, 0); horn.rotation.z = sgn * 0.5; g.add(horn);
      }
      this._addWings(g, mat, 1.3);
    } else if (kind === 'bird') {
      const b = new THREE.Mesh(new THREE.SphereGeometry(4, 8, 6), mat);
      b.position.y = 10; g.add(b);
      this._addWings(g, mat, 0.6);
    } else if (kind === 'goblin') {
      // humanoid monster (goblins, skeletons): small upright body + head
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(5, 10, 4, 8), mat);
      body.position.y = 10; g.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(5, 8, 6), mat);
      head.position.y = 20; g.add(head);
    } else {
      // generic beast / animals (rabbit, deer, boar, goat, bear…) — quadruped
      const b = new THREE.Mesh(new THREE.CapsuleGeometry(5, 10, 4, 8), mat);
      b.rotation.z = Math.PI / 2; b.position.y = 6; g.add(b);
      const h = new THREE.Mesh(new THREE.SphereGeometry(4, 8, 6), mat);
      h.position.set(11, 7, 0); g.add(h);
      for (const [lx, lz] of [[-4, -3], [-4, 3], [4, -3], [4, 3]]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.6, 8, 5), mat);
        leg.position.set(lx, 2, lz); g.add(leg);
      }
    }

    // boss marker (gold ring + slight scale-up)
    if (boss) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(16, 1.8, 6, 20), S.boss);
      ring.rotation.x = Math.PI / 2; ring.position.y = 2;
      g.add(ring);
      g.scale.setScalar(1.35);
    }
    return g;
  }

  _kindForMonster(m) {
    if (m.family === 'slime') return 'slime';
    if (m.family === 'spider') return 'spider';
    if (m.family === 'treant') return 'treant';
    if (m.family === 'wolf') return 'wolf';
    if (m.family === 'dragon') return 'dragon';
    if (m.family === 'dragonoid') return 'dragonoid';
    if (m.family === 'goblin' || m.family === 'undead') return 'goblin';
    return 'beast';
  }
  _kindForAnimal(a) { return a.def && a.def.id === 'bird' ? 'bird' : 'beast'; }

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
      // lift flying entities (dragons/dragonoids/player flight) off the ground
      let elev = 0;
      if (e.altitude) elev = e.altitude * 3;          // player flight (feet → px)
      else if (e.flying || e.flyingNow) elev = 80;      // dragons / dragonoids
      else if (kind === 'bird') elev = 30;
      entry.group.position.set(p.x, elev, p.z);
      entry.group.rotation.y = -(e.facing || 0);
      // Player flight: lie the body HORIZONTAL (prone glide) and tilt with the
      // look direction so climbing/diving looks natural. Smooth each frame so
      // takeoff/landing eases in. The ground shadow stays on the floor.
      if (e.isPlayer) {
        const flying = !!e.flying;
        const pose = entry.group.userData.pose;
        if (pose) {
          // -Z tips the head forward (prone); add a little pitch so looking up
          // noses the flyer up (climb) and looking down noses it down (dive).
          const target = flying ? (-Math.PI / 2 + this.lookPitch * 0.5) : 0;
          pose.rotation.z += (target - pose.rotation.z) * 0.3;
        }
        const shadow = entry.group.userData.shadow;
        if (shadow) shadow.position.y = -elev - 0.1; // pinned to the ground below
      }
      // walking animation (swing arms/legs) for humans that are moving
      if (entry.group.userData && entry.group.userData.walk) {
        const moving = e.isPlayer ? e.moving : (e.targetPos != null);
        if (moving) entry.group.userData.walk(performance.now() * 0.008);
        else entry.group.userData.idle();
      }
      entry.group.visible = Math.hypot(e.x - px, e.y - py) <= CULL;
    };

    // player
    place(g.player, 'player', g.player.clothColor);

    // NPCs, monsters, animals (all within cull radius for perf)
    for (const n of g.npcs) if (Math.hypot(n.x - px, n.y - py) <= CULL) place(n, 'npc', n.clothColor);
    const mons = g.multiplayer.connected ? g.remoteMonsters : g.monsters;
    for (const m of mons) {
      if (m.dead) continue;
      if (Math.hypot(m.x - px, m.y - py) <= CULL) place(m, this._kindForMonster(m), m.color);
    }
    const animals = g.multiplayer.connected ? g.remoteAnimals : g.animals;
    for (const a of animals) {
      if (a.dead) continue;
      if (Math.hypot(a.x - px, a.y - py) <= CULL) place(a, this._kindForAnimal(a), a.color);
    }

    // remove meshes for entities that no longer exist
    for (const [key, entry] of this._meshCache) {
      if (!seen.has(key)) { this.entityRoot.remove(entry.group); this._meshCache.delete(key); }
    }

    // ---- FX pass: projectiles, corpses, traps, drops, bait, resource nodes ----
    this._syncFx(px, py);

    // pulse the Yggdrasil's glow
    if (this._yggGlow) {
      const t = g.time ? g.time.timeOfDay * 60 : 0;
      this._yggGlow.material.opacity = 0.10 + Math.sin(t) * 0.04;
    }

    // rebuild any tree chunks whose trees were chopped or regrown (so chopped
    // trees disappear from view, and regrown trees come back)
    this._rebuildTreeChunks();

    // distance-cull tree chunks: only render trees near the player (the single
    // biggest 3D perf win — without this all ~100k trees draw every frame)
    if (this._treeChunks) {
      const CULL_TREES = 4500;
      for (const c of this._treeChunks) {
        const dx = c.wx - px, dy = c.wy - py;
        const vis = (dx * dx + dy * dy) <= CULL_TREES * CULL_TREES;
        for (const m of c.meshes) m.visible = vis;
      }
    }

    // ---- third-person camera (smoothly trails the player) ----
    // The camera uses the SMOOTHED _camYaw/_camPitch (updated each frame by
    // updateCameraFollow), which lag slightly behind lookYaw. That makes the
    // player's turn VISIBLE: the body rotates a little before the camera swings
    // behind it, instead of the two turning in lockstep (which looks like only
    // the world/screen is turning and the player never moves).
    const pp = this._worldToLocal(px, py);
    const elev = g.player.altitude ? g.player.altitude * 3 : 0;
    const fwdX = Math.cos(this._camYaw), fwdZ = Math.sin(this._camYaw);
    const lookP = this._camPitch;
    const dist = this.distance;
    const shoulder = 46;
    const camX = pp.x - fwdX * dist;
    const camZ = pp.z - fwdZ * dist;
    // Camera stays BEHIND the player at their level and — critically — is always
    // clamped ABOVE the ground, so looking down can never put it underground.
    const camY = Math.max(elev + 16, elev + shoulder + lookP * dist * 0.55);
    const lookX = pp.x + fwdX * 320;
    const lookZ = pp.z + fwdZ * 320;
    const lookY = Math.max(elev + 6, elev + 12 + lookP * 260);
    this.camera.position.set(camX, camY, camZ);
    this.camera.lookAt(lookX, lookY, lookZ);
    // keep the camera's world matrix current
    this.camera.updateMatrixWorld(true);

    // drift the clouds slowly overhead (anchored to the player)
    if (this._clouds) {
      const drift = (performance.now() * 0.006) % 3000;
      this._clouds.position.set(pp.x, 0, pp.z);
      for (const c of this._clouds.children) c.position.x = c.userData.bx + drift;
    }

    // day/night lighting + weather + seasons (sky, fog, lights, rain/snow)
    this._applyEnvironment(pp);
  }

  // ---- day/night + weather + seasons ----
  _applyEnvironment(pp) {
    const g = this.game;
    const dark = g.time ? g.time.darkness : 0;
    const w = g.weather;
    const t = g.time ? g.time.timeOfDay : 0.3;

    // sun + moon orbit the sky (sun by day, moon by night)
    const ang = t * Math.PI * 2;
    const R = 60000;
    this._skySun.position.set(pp.x + Math.cos(ang) * R, Math.sin(ang) * R, pp.z + 40000);
    this._skyMoon.position.set(pp.x + Math.cos(ang + Math.PI) * R, Math.sin(ang + Math.PI) * R, pp.z + 40000);
    this._skySun.visible = !g.time || g.time.isDay;
    this._skyMoon.visible = !this._skySun.visible;

    // season tint (trees + ground change with the season)
    if (g.time && g.time.seasonIndex !== this._season) {
      this._season = g.time.seasonIndex;
      this._applySeason(g.time.seasonIndex);
    }

    // sky + fog interpolate from day → night
    this.scene.background.lerpColors(this._skyDay, this._skyNight, dark);
    this.scene.fog.color.lerpColors(this._fogDay, this._fogNight, dark);

    // lights dim at night (sun becomes a soft moon)
    this.hemi.intensity = 1.0 - dark * 0.75;
    this.sun.intensity = 1.4 - dark * 1.3;
    this.sun.color.lerpColors(this._sunDay, this._sunNight, dark);

    // weather: darken + densify fog for rain/fog/storm
    if (w) {
      const fogDense = w.state === 'fog' ? 0.85 : w.raining ? 0.3 * w.intensity : 0;
      const stormDark = w.isStorm ? 0.25 : 0;
      const extra = Math.max(fogDense * 0.35, stormDark);
      if (extra > 0) {
        this._tmp.setRGB(0, 0, 0);
        this.scene.background.lerp(this._tmp, extra);
        this.scene.fog.color.lerp(this._tmp, extra * 0.5);
        this.scene.fog.near = 2000 - fogDense * 1500;
        this.scene.fog.far = 12000 - fogDense * 6000;
        this.hemi.intensity *= (1 - extra * 0.5);
        this.sun.intensity *= (1 - extra);
      } else {
        this.scene.fog.near = 4000;
        this.scene.fog.far = 20000;
      }

      // snow falls: (a) in winter, (b) inside the permanent snow region, or
      // (c) near a snowy mountain — any season. Otherwise rain.
      const inSnowRegion = g.player && isSnowRegion(Math.floor(g.player.x / TILE), Math.floor(g.player.y / TILE));
      let snowOn = (g.time && g.time.isWinter && (w.raining || w.state === 'cloudy')) || !!inSnowRegion;
      if (!snowOn && g.world.mountains) {
        for (const m of g.world.mountains) {
          if (m.snowy && Math.hypot(m.x - g.player.x, m.y - g.player.y) < 900) { snowOn = true; break; }
        }
      }
      if (snowOn) {
        this._ensureSnow();
        this._snow.visible = true;
        this._snow.material.opacity = inSnowRegion ? 0.45 : (0.5 + w.intensity * 0.4);
        this._animateSnow();
        this._snow.position.set(pp.x, 0, pp.z);
        if (this._rain) this._rain.visible = false;
      } else {
        if (this._snow) this._snow.visible = false;
        // rain / heavy rain / storm → falling rain particles
        if (w.raining && w.intensity > 0.05) {
          this._ensureRain();
          this._rain.visible = true;
          this._rain.material.opacity = 0.25 + w.intensity * 0.45;
          this._rain.material.size = w.isStorm ? 9 : 6;
          this._animateRain();
          this._rain.position.set(pp.x, 0, pp.z);
        } else if (this._rain) {
          this._rain.visible = false;
        }
      }
    }
  }

  _ensureRain() {
    if (this._rain) return;
    const N = 1400, SPAN = 4200, H = 700;
    const base = new Float32Array(N * 3);
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      base[i * 3] = (Math.random() - 0.5) * SPAN;      // x offset
      base[i * 3 + 1] = Math.random() * H;             // y
      base[i * 3 + 2] = (Math.random() - 0.5) * SPAN;  // z offset
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: 0xaac8e8, size: 6, transparent: true, opacity: 0.4, depthWrite: false });
    this._rain = new THREE.Points(geo, mat);
    this._rain.frustumCulled = false;
    this._rainBase = base;
    this._rainPos = pos;
    this.scene.add(this._rain);
  }

  _animateRain() {
    // fall speed (px/sec), driven by wall-clock time so it loops smoothly
    const t = performance.now() * 0.001;
    const fall = 650;
    const H = 700;
    const base = this._rainBase, pos = this._rainPos;
    for (let i = 0; i < base.length / 3; i++) {
      pos[i * 3] = base[i * 3];
      let y = base[i * 3 + 1] - fall * t;
      pos[i * 3 + 1] = ((y % H) + H) % H;
      pos[i * 3 + 2] = base[i * 3 + 2];
    }
    this._rain.geometry.attributes.position.needsUpdate = true;
  }

  _ensureSnow() {
    if (this._snow) return;
    const N = 900, SPAN = 4200, H = 700;
    const base = new Float32Array(N * 3);
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      base[i * 3] = (Math.random() - 0.5) * SPAN;
      base[i * 3 + 1] = Math.random() * H;
      base[i * 3 + 2] = (Math.random() - 0.5) * SPAN;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 9, transparent: true, opacity: 0.7, depthWrite: false });
    this._snow = new THREE.Points(geo, mat);
    this._snow.frustumCulled = false;
    this._snowBase = base;
    this._snowPos = pos;
    this.scene.add(this._snow);
  }

  _animateSnow() {
    // snow drifts down slowly and sways side to side
    const t = performance.now() * 0.001;
    const fall = 260;
    const H = 700;
    const base = this._snowBase, pos = this._snowPos;
    for (let i = 0; i < base.length / 3; i++) {
      const sway = Math.sin(t * 0.6 + i) * 90;
      pos[i * 3] = base[i * 3] + sway;
      let y = base[i * 3 + 1] - fall * t;
      pos[i * 3 + 1] = ((y % H) + H) % H;
      pos[i * 3 + 2] = base[i * 3 + 2];
    }
    this._snow.geometry.attributes.position.needsUpdate = true;
  }

  // change tree canopy + ground color per season (snowy trees stay white)
  _applySeason(index) {
    const S = shared();
    const GROUND = [0x4a8a3a, 0x4f8a3a, 0x9a7a3a, 0xe8ecee]; // spring, summer, autumn, winter
    const CANOPY = [0x4a9a3a, 0x3f7a35, 0xc0682a, 0xd8d8d0]; // spring green, summer, autumn, winter (bare)
    if (S.canopy) S.canopy.color.setHex(CANOPY[index] ?? 0x3f7a35);
    if (S.canopyDark) S.canopyDark.color.setHex(CANOPY[index] ?? 0x2a5a33);
    if (this._groundMat) this._groundMat.color.setHex(GROUND[index] ?? 0x3f7033);
  }

  // rebuild the FX group each frame (these are few + transient, so clearing is
  // cheaper than per-object caching). Distance-culled to the player.
  _syncFx(px, py) {
    const g = this.game;
    const F = this._fx;
    // clear
    for (const c of [...this.fxRoot.children]) this.fxRoot.remove(c);
    const CULL_FX = 1800;

    const add = (mesh, wx, wy, elev = 0) => {
      const p = this._worldToLocal(wx, wy);
      mesh.position.set(p.x, elev, p.z);
      if (Math.hypot(wx - px, wy - py) <= CULL_FX) this.fxRoot.add(mesh);
    };

    // arrows / rocks / webs (flying projectiles)
    for (const pr of g.projectiles) {
      if (pr.dead) continue;
      const elev = 20;
      if (pr.kind === 'arrow') {
        const m = new THREE.Mesh(F.arrow, F.arrowMat);
        const p = this._worldToLocal(pr.x, pr.y);
        m.position.set(p.x, elev, p.z);
        // point the arrow along its velocity (vx east, vy south→+z)
        m.rotation.y = -Math.atan2(pr.vy, pr.vx);
        if (Math.hypot(pr.x - px, pr.y - py) <= CULL_FX) this.fxRoot.add(m);
      } else {
        const m = new THREE.Mesh(F.orb, pr.kind === 'web' ? F.webMat : F.rockMat);
        add(m, pr.x, pr.y, elev);
      }
    }

    // corpses (harvestable dead animals) — a flat disc lying on the ground
    for (const c of g.corpses) {
      const m = new THREE.Mesh(F.disc, F.corpseMat);
      add(m, c.x, c.y, 1);
    }
    // traps + bait
    for (const t of g.traps) {
      const m = new THREE.Mesh(F.ring, F.trapMat);
      m.rotation.x = Math.PI / 2;
      add(m, t.x, t.y, 2);
    }
    for (const b of g.baitPiles) {
      const m = new THREE.Mesh(F.orb, F.berryMat);
      m.scale.setScalar(0.6);
      add(m, b.x, b.y, 3);
    }
    // loot drops (glowing orbs)
    for (const d of g.drops) {
      if (d.dead) continue;
      const m = new THREE.Mesh(F.orb, F.dropMat);
      add(m, d.x, d.y, 16);
    }
    // resource nodes — toggle visibility of pre-built meshes (no churn)
    const nodes = g.multiplayer.connected ? g.remoteResources : g.world.nodes;
    this._syncNodes(nodes, px, py);
  }

  // build node meshes once, then each frame just toggle visibility by distance
  // and depleted state (avoids recreating hundreds of meshes every frame)
  _syncNodes(nodes, px, py) {
    if (this._nodeMeshes.length !== nodes.length) {
      // rebuild the cache (cheap, only on load / count change)
      for (const m of this._nodeMeshes) this.nodeRoot.remove(m.mesh);
      this._nodeMeshes = nodes.map((n) => {
        const mat = { herb: this._fx.herbMat, mushroom: this._fx.mushMat, berry: this._fx.berryMat, flower: this._fx.flowerMat, ore: this._fx.oreMat }[n.kind] || this._fx.herbMat;
        const mesh = new THREE.Mesh(this._fx.nodeGeo, mat);
        const p = this._worldToLocal(n.x, n.y);
        mesh.position.set(p.x, 7, p.z);
        this.nodeRoot.add(mesh);
        return { node: n, mesh };
      });
    }
    const CULL_NODES = 1800;
    for (const e of this._nodeMeshes) {
      const n = e.node;
      const d = Math.hypot(n.x - px, n.y - py);
      e.mesh.visible = !n.depleted && d <= CULL_NODES;
    }
  }

  // ---- 3D controls: mouse-look + camera-relative movement ----
  // unit vector in the look direction (world x/y) — used to rotate WASD into
  // "camera space". W = forward (where you look).
  cameraForward() {
    const f = this.lookYaw;
    return { x: Math.cos(f), y: Math.sin(f) };
  }

  // WASD in 3D: W = forward, S = backward. (A/D TURN the player left/right —
  // handled in main.js, not here — so "left becomes the front screen".)
  cameraDirVector() {
    const raw = this.game.input.dirVector(); // { x: ±1, y: ±1 }
    const F = this.cameraForward();
    // -raw.y: W (up) = +1 forward, S (down) = -1 backward
    return { x: F.x * -raw.y, y: F.y * -raw.y };
  }

  // Smooth the facing toward the input target (mouse/A-D), then swing the camera
  // toward the facing. Two fast, frame-rate-independent eases: the first damps
  // mouse jitter for a STABLE view, the second makes the player's turn VISIBLE.
  updateCameraFollow(dt) {
    const kFace = 1 - Math.exp(-dt * 22);
    this.lookYaw += (this._targetYaw - this.lookYaw) * kFace;
    this.lookPitch += (this._targetPitch - this.lookPitch) * kFace;
    const k = 1 - Math.exp(-dt * 10);
    this._camYaw += (this.lookYaw - this._camYaw) * k;
    this._camPitch += (this.lookPitch - this._camPitch) * k;
  }

  // zoom the third-person camera in/out (clamped)
  zoomIn() { this.distance = Math.max(160, this.distance - 70); }
  zoomOut() { this.distance = Math.min(1000, this.distance + 70); }

  // the direction the player should face when idle (the look yaw)
  facingAngle() { return this.lookYaw; }

  // cast the mouse cursor onto the ground plane; returns the world point {x,y}
  // the player is aiming at, or null if the cursor points above the horizon.
  aimWorldPoint() {
    const ndc = this._mouseNdc || { x: 0, y: 0 };
    this._ray.setFromCamera(this._ndcVec.set(ndc.x, ndc.y), this.camera);
    if (this._ray.ray.intersectPlane(this._groundPlane, this._hitVec)) {
      return { x: this._hitVec.x + PX_W / 2, y: this._hitVec.z + PX_H / 2 };
    }
    return null;
  }

  // browser-only controls — third-person navigation.
  // Mouse MOVEMENT (delta, not position) rotates the view: move the mouse right
  // and the view turns right, stop moving and it stops. Scroll also looks
  // up/down. Left-click attacks. When a menu/popup is open these are all ignored
  // so the mouse/scroll only affect the popup, not the game.
  attachControls() {
    if (this._controlsAttached) return;
    this._controlsAttached = true;
    const el = this.renderer ? this.renderer.domElement : null;
    if (!el || typeof window === 'undefined') return;

    const clampPitch = (v) => Math.max(-0.75, Math.min(0.95, v));
    const uiBlocked = () => this.game.ui.open || this.game.buildingInterior.active;

    const onDown = (e) => {
      if (uiBlocked()) return; // clicking inside a popup must not attack
      if (e.button === 2 || e.button === 1) { e.preventDefault(); return; }
      if (e.button === 0) {
        // left-click = attack (mirror into the shared input, since the 2D canvas is behind)
        this.game.input.mouse.buttons |= 1;
      }
    };
    const onMove = (e) => {
      // update the shared mouse position (for 2D logic / aim raycast)
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const m = this.game.input.mouse; m.x = mx; m.y = my;
      this._mouseNdc = { x: (mx / rect.width) * 2 - 1, y: -(my / rect.height) * 2 + 1 };
      if (uiBlocked()) return; // don't rotate the view while a popup is open

      // Drag mouse-look: rotate by how far the mouse MOVED (not where it is).
      // STANDARD direction: mouse RIGHT → view turns RIGHT, mouse LEFT → left.
      // The mouse turns SIDEWAYS ONLY (yaw) — up/down (pitch) is handled by the
      // scroll wheel. Mouse STOPS → view stops. This can never spin on its own
      // (no feedback loop). Deltas write to the smoothed target so the view stays
      // stable (see updateCameraFollow).
      const dx = e.movementX ?? 0;
      if (dx !== 0) {
        const s = this.lookSens;
        this._targetYaw -= dx * 0.0032 * s; // right = turn right (sideways only)
      }
    };
    const onWheel = (e) => {
      if (uiBlocked()) return; // let the popup scroll its own content
      this._targetPitch = clampPitch(this._targetPitch + (e.deltaY < 0 ? 0.09 : -0.09));
      e.preventDefault();
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    this._detachControls = () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('wheel', onWheel);
    };
  }

  // browser-only: create the WebGL renderer + canvas (and a HUD canvas above it)
  ensureRenderer() {
    if (this.renderer) return;
    const canvas = document.createElement('canvas');
    canvas.id = 'game3d';
    canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:1;';
    document.body.appendChild(canvas);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    // cap the pixel ratio — rendering at 2x on a large screen is a big perf cost
    this.renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));

    // a transparent 2D canvas ABOVE the 3D scene for the HUD (health bars, gold,
    // minimap, prompts…). pointer-events:none so it never blocks mouse aiming.
    this.hudCanvas = document.createElement('canvas');
    this.hudCanvas.id = 'hud3d';
    this.hudCanvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:2;pointer-events:none;';
    document.body.appendChild(this.hudCanvas);
    this.hudCtx = this.hudCanvas.getContext('2d');

    this._resize = () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.hudCanvas.width = window.innerWidth;
      this.hudCanvas.height = window.innerHeight;
    };
    this._resize();
    window.addEventListener('resize', this._resize);
    this.attachControls();
    // small on-screen hint
    try {
      const hint = document.createElement('div');
      hint.style.cssText = 'position:fixed;bottom:12px;left:50%;transform:translateX(-50%);z-index:40;background:rgba(10,8,6,0.7);color:#e8e0c8;font:12px sans-serif;padding:4px 12px;border-radius:6px;pointer-events:none;';
      hint.textContent = '3D · W/S move · A/D turn · mouse-drag look · scroll look · R×2 run';
      document.body.appendChild(hint);
    } catch (e) {}
    // zoom in/out buttons (bottom-right)
    try {
      const mkBtn = (label, fn) => {
        const b = document.createElement('button');
        b.textContent = label;
        b.style.cssText = 'position:fixed;z-index:40;width:40px;height:40px;font-size:20px;line-height:1;cursor:pointer;background:rgba(30,25,20,0.75);border:1px solid #6a4a2a;border-radius:8px;color:#f0e6d0;';
        b.addEventListener('click', (e) => { e.stopPropagation(); fn(); });
        return b;
      };
      const zin = mkBtn('+', () => this.zoomIn());
      zin.style.right = '14px'; zin.style.bottom = '64px';
      zin.title = 'Zoom in';
      const zout = mkBtn('−', () => this.zoomOut());
      zout.style.right = '14px'; zout.style.bottom = '14px';
      zout.title = 'Zoom out';
      document.body.appendChild(zin);
      document.body.appendChild(zout);
      this._zoomButtons = [zin, zout];
    } catch (e) {}
  }

  render() {
    this.sync();
    if (!this.renderer) this.ensureRenderer();
    this.renderer.render(this.scene, this.camera);
    this.renderHUD();
  }

  // draw the normal 2D HUD onto the transparent overlay (shared by the 3D world
  // AND the 3D building interiors, so the HUD looks identical everywhere)
  renderHUD() {
    if (this.hudCtx) {
      try {
        this.hudCtx.clearRect(0, 0, this.hudCanvas.width, this.hudCanvas.height);
        this.game.hud.render(this.hudCtx);
        this._drawFloatTexts(this.hudCtx);
        this._drawNameLabels(this.hudCtx);
        if (this.game.deathInfo) this.game.hud.renderDeathScreen(this.hudCtx);
      } catch (e) {}
    }
  }

  // name + rank labels floating above monsters and NPCs (projected from 3D)
  _drawNameLabels(ctx) {
    const g = this.game;
    const W = this.hudCanvas.width, H = this.hudCanvas.height;
    const px = g.player.x, py = g.player.y;

    // gather nearby labelable entities
    const list = [];
    const mons = g.multiplayer.connected ? g.remoteMonsters : g.monsters;
    for (const m of mons) {
      if (m.dead) continue;
      if (Math.hypot(m.x - px, m.y - py) <= 1200) list.push({ name: m.name, rank: m.rank, boss: m.boss, x: m.x, y: m.y, yOff: 46 });
    }
    for (const n of g.npcs) {
      if (Math.hypot(n.x - px, n.y - py) <= 1200) list.push({ name: n.name, rank: null, boss: false, x: n.x, y: n.y, yOff: 40 });
    }
    if (!list.length) return;

    const RANK_COLORS = { 'F': '#c8c8c8', 'E': '#7ac87a', 'D': '#7ac8e0', 'C': '#5a9ae0', 'B': '#a05ae0', 'A': '#e07a5a', 'S': '#ffd76a', 'A+': '#ff5ae0' };

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const e of list) {
      const local = this._worldToLocal(e.x, e.y);
      this._projVec.set(local.x, e.yOff, local.z).project(this.camera);
      if (this._projVec.z > 1) continue; // behind the camera
      const sx = (this._projVec.x * 0.5 + 0.5) * W;
      const sy = (-this._projVec.y * 0.5 + 0.5) * H;
      if (sx < -120 || sx > W + 120 || sy < -120 || sy > H + 120) continue;

      const nm = e.name.length > 16 ? e.name.slice(0, 15) + '…' : e.name;
      ctx.font = 'bold 11px sans-serif';
      const w = ctx.measureText(nm).width + 8;
      // pill background
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(sx - w / 2, sy - 9, w, 16, 4); else ctx.rect(sx - w / 2, sy - 9, w, 16);
      ctx.fill();
      ctx.fillStyle = e.boss ? '#ffd76a' : '#fff';
      ctx.fillText(nm, sx, sy - 1);

      // rank badge below the name
      if (e.rank) {
        ctx.font = 'bold 10px sans-serif';
        const rw = 14;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(sx - rw / 2, sy + 8, rw, 13);
        ctx.fillStyle = RANK_COLORS[e.rank] || '#fff';
        ctx.fillText(e.rank, sx, sy + 15);
      }
    }
    ctx.restore();
  }

  // project floating combat text (damage numbers, +XP) onto the HUD overlay so
  // combat feedback is visible in 3D (these were only drawn on the 2D canvas)
  _drawFloatTexts(ctx) {
    const g = this.game;
    if (!g.floatTexts || !g.floatTexts.length) return;
    const W = this.hudCanvas.width, H = this.hudCanvas.height;
    const p = this._worldToLocal(g.player.x, g.player.y);
    ctx.save();
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    for (const ft of g.floatTexts) {
      const local = this._worldToLocal(ft.x, ft.y);
      this._projVec.set(local.x, 26, local.z).project(this.camera);
      // only draw if in front of the camera and on screen
      if (this._projVec.z > 1) continue;
      const sx = (this._projVec.x * 0.5 + 0.5) * W;
      const sy = (-this._projVec.y * 0.5 + 0.5) * H;
      if (sx < -40 || sx > W + 40 || sy < -40 || sy > H + 40) continue;
      ctx.globalAlpha = Math.max(0, Math.min(1, ft.t));
      ctx.fillStyle = ft.color || '#fff';
      ctx.fillText(ft.text, sx, sy);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}
