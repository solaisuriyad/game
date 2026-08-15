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

    // entity group (rebuilt each frame from game state)
    this.entityRoot = new THREE.Group();
    this.scene.add(this.entityRoot);

    this._terrain = null;
    this._terrainKey = '';
    this._meshCache = new Map(); // key -> { group, meshes, kind, color, facing }
    this._yggGlow = null;        // the world tree's glow (pulsed each frame)

    // build the static world (ground + trees + buildings + Yggdrasil) once
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
    // the Yggdrasil — the colossal world tree at the heart of monster territory
    root.add(this._makeYggdrasil());
    this._terrain = root;
    this.scene.add(root);
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
    // 615k individual trees are far too many to render. Fix: (1) thin them to a
    // representative sample, (2) split into spatial chunks of InstancedMeshes,
    // (3) distance-cull chunks each frame so only trees near the player draw.
    const TREE_STEP = 6;   // keep every 6th tree (~100k total)
    const CHUNK = 2000;    // chunk size in world px

    const chunks = new Map(); // "cx,cy" -> array of trees
    let i = 0;
    for (const cell of w.staticGrid.values()) {
      for (const o of cell) {
        if (o.type !== 'tree') continue;
        i++;
        if (i % TREE_STEP !== 0) continue;
        const cx = Math.floor(o.x / CHUNK), cy = Math.floor(o.y / CHUNK);
        const key = cx + ',' + cy;
        if (!chunks.has(key)) chunks.set(key, []);
        chunks.get(key).push(o);
      }
    }

    const trunkGeo = new THREE.CylinderGeometry(2.4, 2.9, 26, 6);
    const canopyGeo = new THREE.ConeGeometry(11, 24, 7);
    const dummy = new THREE.Object3D();
    this._treeChunks = [];

    for (const [key, trees] of chunks) {
      const n = trees.length;
      const trunks = new THREE.InstancedMesh(trunkGeo, S.trunk, n);
      const canopies = new THREE.InstancedMesh(canopyGeo, S.canopy, n);
      for (let j = 0; j < n; j++) {
        const c = trees[j];
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
      root.add(trunks);
      root.add(canopies);
      // world-pixel center of this chunk (for distance culling)
      const [cx, cy] = key.split(',').map(Number);
      this._treeChunks.push({
        trunks, canopies,
        wx: (cx + 0.5) * CHUNK, wy: (cy + 0.5) * CHUNK
      });
    }
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
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(6, 12, 4, 8), mat);
      body.position.y = 12; g.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(6, 10, 8), skin);
      head.position.y = 24; g.add(head);
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

    // pulse the Yggdrasil's glow
    if (this._yggGlow) {
      const t = g.time ? g.time.timeOfDay * 60 : 0;
      this._yggGlow.material.opacity = 0.10 + Math.sin(t) * 0.04;
    }

    // distance-cull tree chunks: only render trees near the player (the single
    // biggest 3D perf win — without this all ~100k trees draw every frame)
    if (this._treeChunks) {
      const CULL_TREES = 6000;
      for (const c of this._treeChunks) {
        const dx = c.wx - px, dy = c.wy - py;
        const vis = (dx * dx + dy * dy) <= CULL_TREES * CULL_TREES;
        c.trunks.visible = vis;
        c.canopies.visible = vis;
      }
    }

    // camera follows the player at a comfortable third-person angle
    const pp = this._worldToLocal(px, py);
    const camX = pp.x + Math.sin(this.yaw) * this.distance;
    const camZ = pp.z + Math.cos(this.yaw) * this.distance;
    const camY = Math.sin(this.pitch) * this.distance;
    this.camera.position.set(camX, camY, camZ);
    this.camera.lookAt(pp.x, 14, pp.z);
    // keep the camera's world matrix current so raycasting/aiming reads the
    // fresh orientation even before the first render frame
    this.camera.updateMatrixWorld(true);
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

  // browser-only: mouse orbit + wheel zoom (right-drag to orbit, wheel to zoom),
  // and cursor tracking so attacks/aiming work on the 3D canvas.
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
      } else if (e.button === 0) {
        // left-click = attack. The 2D game reads mousedown on its own canvas,
        // which is BEHIND this one in 3D mode — mirror it into the shared input.
        const m = this.game.input.mouse;
        m.buttons |= 1;
      }
    };
    const onMove = (e) => {
      // track the cursor (in normalized device coords) for aiming
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      this._mouseNdc = { x: (mx / rect.width) * 2 - 1, y: -(my / rect.height) * 2 + 1 };
      // also mirror into the shared mouse so 2D combat logic sees a fresh position
      const m = this.game.input.mouse;
      m.x = mx; m.y = my;
      // orbit while dragging
      if (this._dragging) {
        const dx = e.clientX - this._last.x;
        const dy = e.clientY - this._last.y;
        this._last = { x: e.clientX, y: e.clientY };
        this.yaw -= dx * 0.005;
        this.pitch = Math.max(0.15, Math.min(1.35, this.pitch + dy * 0.004));
      }
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
      hint.textContent = '3D · WASD move · mouse aim · right-drag orbit · wheel zoom · Esc menu';
      document.body.appendChild(hint);
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
        if (this.game.deathInfo) this.game.hud.renderDeathScreen(this.hudCtx);
      } catch (e) {}
    }
  }
}
