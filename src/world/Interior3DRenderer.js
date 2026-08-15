// Interior3DRenderer — a full-3D version of the walkable building interiors.
//
// It REUSES the 2D BuildingInterior's game logic (movement, collision, counters,
// interaction, sleep) — only the DRAWING is swapped to Three.js. So entering a
// building in `?3d=1` mode now shows a real 3D room instead of the 2D overlay.
//
// It shares the World3DRenderer's WebGL canvas + HUD overlay (passed in).
import * as THREE from '../../vendor/three.module.js';

const RW = 1200;   // logical room width (matches BuildingInterior)
const RH = 800;    // logical room height
const WALL = 40;   // wall thickness
const WALL_H = 150; // wall height in 3D units
const ROOM_THEME = 0x5a4c38;

export class Interior3DRenderer {
  constructor(game) {
    this.game = game;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x241c14);

    // lights
    this.scene.add(new THREE.HemisphereLight(0xfff0d8, 0x3a2e20, 1.1));
    this.lamp = new THREE.PointLight(0xffe0a0, 1.4, 4000);
    this.lamp.position.set(0, WALL_H * 2.6, 0);
    this.scene.add(this.lamp);
    const fill = new THREE.PointLight(0x8fb0ff, 0.4, 4000);
    fill.position.set(0, 300, 300);
    this.scene.add(fill);

    // fixed camera looking down into the room from the door side
    this.camera = new THREE.PerspectiveCamera(55, 1, 4, 12000);
    this.camera.position.set(0, 760, 640);
    this.camera.lookAt(0, 30, -80);
    this.camera.updateMatrixWorld(true);

    // shared materials
    this._floor = new THREE.MeshStandardMaterial({ color: 0x6a5438, roughness: 1 });
    this._wall = new THREE.MeshStandardMaterial({ color: 0x4a3a28, roughness: 1 });
    this._wood = new THREE.MeshStandardMaterial({ color: 0x7a5a34, roughness: 1 });
    this._skin = new THREE.MeshStandardMaterial({ color: 0xe8c39a, roughness: 1 });
    this._glow = new THREE.MeshBasicMaterial({ color: 0xffd76a });

    this.entityRoot = new THREE.Group();
    this.scene.add(this.entityRoot);
    this._meshCache = new Map(); // key -> { group, kind, color }
    this._lastBuilding = null;

    this._buildRoom();
  }

  // ---- static room shell (built once) ----
  _buildRoom() {
    const halfW = RW / 2, halfH = RH / 2;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(RW, RH), this._floor);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -WALL_H; // room interior floor is at y=0; the "ground" is the floor
    this.scene.add(floor);

    // floor at y=0 (the walkable surface)
    const floorTop = new THREE.Mesh(new THREE.PlaneGeometry(RW, RH), this._floor);
    floorTop.rotation.x = -Math.PI / 2;
    this.scene.add(floorTop);

    // four walls
    const wallGeo = (w, h) => new THREE.BoxGeometry(w, h, WALL);
    const north = new THREE.Mesh(wallGeo(RW + WALL * 2, WALL_H), this._wall);
    north.position.set(0, WALL_H / 2, -halfH - WALL / 2);
    this.scene.add(north);
    const south = new THREE.Mesh(wallGeo(RW + WALL * 2, WALL_H), this._wall);
    south.position.set(0, WALL_H / 2, halfH + WALL / 2);
    this.scene.add(south);
    const east = new THREE.Mesh(new THREE.BoxGeometry(WALL, WALL_H, RH + WALL * 2), this._wall);
    east.position.set(halfW + WALL / 2, WALL_H / 2, 0);
    this.scene.add(east);
    const west = new THREE.Mesh(new THREE.BoxGeometry(WALL, WALL_H, RH + WALL * 2), this._wall);
    west.position.set(-halfW - WALL / 2, WALL_H / 2, 0);
    this.scene.add(west);

    // door (dark opening) on the south wall, centered
    const dw = 90;
    const door = new THREE.Mesh(new THREE.BoxGeometry(dw, WALL_H, WALL + 2), new THREE.MeshStandardMaterial({ color: 0x1a1208 }));
    door.position.set(0, WALL_H / 2, halfH + WALL / 2);
    this.scene.add(door);

    // a warm rug in the middle
    const rug = new THREE.Mesh(new THREE.CylinderGeometry(150, 150, 2, 24), new THREE.MeshStandardMaterial({ color: 0x7a4a3a }));
    rug.position.set(0, 1, 0);
    this.scene.add(rug);
  }

  _worldToLocal(lx, ly) {
    return { x: lx - RW / 2, z: ly - RH / 2 };
  }

  _makeFigure(mat, skin, scale = 1) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(9 * scale, 18 * scale, 4, 8), mat);
    body.position.y = 16 * scale;
    g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(8 * scale, 10, 8), skin);
    head.position.y = 34 * scale;
    g.add(head);
    return g;
  }

  _makeCounter(s) {
    const g = new THREE.Group();
    const w = s.cw, d = s.ch;
    const h = 42;
    const base = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), this._wood);
    base.position.y = h / 2;
    g.add(base);
    // counter top (lighter)
    const top = new THREE.Mesh(new THREE.BoxGeometry(w + 4, 6, d + 4), this._wood);
    top.position.y = h + 3;
    g.add(top);
    // center the counter at its logical position
    const p = this._worldToLocal(s.cx + s.cw / 2, s.cy + s.ch / 2);
    g.position.set(p.x, 0, p.z);
    return g;
  }

  // clear + rebuild counters/NPCs when a new building is entered
  _rebuildLayout() {
    const bi = this.game.buildingInterior;
    // remove old layout (everything in entityRoot)
    for (const c of [...this.entityRoot.children]) this.entityRoot.remove(c);
    this._meshCache.clear();
    this._lastBuilding = bi.building;

    const S = { wood: this._wood, skin: this._skin, glow: this._glow };
    for (const s of bi.stations) {
      if (s.cw > 0) {
        this.entityRoot.add(this._makeCounter(s));
      } else {
        // point station (fire / bed / lingam / well) — a glowing marker
        const p = this._worldToLocal(s.ix, s.iy);
        const glow = new THREE.Mesh(new THREE.SphereGeometry(16, 12, 10), this._glow);
        glow.position.set(p.x, 20, p.z);
        this.entityRoot.add(glow);
      }
      // the NPC working here (behind the counter / beside the point)
      if (s.occ) {
        const npc = this.game.npcs.find((n) => n.occupation === s.occ);
        if (npc) {
          const mat = new THREE.MeshStandardMaterial({ color: parseInt((npc.clothColor || '#7a6a4a').slice(1), 16) });
          const fig = this._makeFigure(mat, this._skin);
          const fx = s.cw > 0 ? s.cx + s.cw / 2 : s.ix;
          const fy = s.cw > 0 ? s.cy - 44 : s.iy - 40;
          const p = this._worldToLocal(fx, fy);
          fig.position.set(p.x, 0, p.z);
          this.entityRoot.add(fig);
        }
      }
    }

    // special: the temple gets the Shiva Lingam (stone pillar + glow)
    if (bi.building && bi.building.func === 'temple') {
      this._addLingam();
    }
    // beds in the inn / home / healing center
    if (bi.building && ['inn', 'home', 'healing'].includes(bi.building.func)) {
      this._addBeds(bi);
    }
    // tables + chairs in guild / tavern
    if (bi.building && ['guild', 'tavern', 'community'].includes(bi.building.func)) {
      this._addTables(bi);
    }
  }

  _addLingam() {
    const c = this._worldToLocal(600, 300);
    const stone = new THREE.MeshStandardMaterial({ color: 0x2a2a30 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(34, 40, 10, 12), stone);
    base.position.set(c.x, 5, c.z);
    this.entityRoot.add(base);
    const lingam = new THREE.Mesh(new THREE.CylinderGeometry(22, 26, 60, 12), stone);
    lingam.position.set(c.x, 40, c.z);
    this.entityRoot.add(lingam);
    // oil lamp glow
    const glow = new THREE.Mesh(new THREE.SphereGeometry(18, 10, 8), this._glow);
    glow.position.set(c.x, 70, c.z);
    this.entityRoot.add(glow);
  }

  _addBeds(bi) {
    const positions = { inn: [[520, 260], [760, 260]], home: [[340, 300]], healing: [[360, 280], [560, 280], [760, 280]] };
    const list = positions[bi.building.func] || [];
    const wood = this._wood;
    const sheet = new THREE.MeshStandardMaterial({ color: 0xe8e8e0 });
    for (const [lx, ly] of list) {
      const p = this._worldToLocal(lx, ly);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(120, 10, 60), wood);
      frame.position.set(p.x, 6, p.z);
      this.entityRoot.add(frame);
      const mattress = new THREE.Mesh(new THREE.BoxGeometry(110, 8, 52), sheet);
      mattress.position.set(p.x, 14, p.z);
      this.entityRoot.add(mattress);
    }
  }

  _addTables(bi) {
    const wood = this._wood;
    const spots = [[760, 560], [950, 560], [600, 520]];
    for (const [lx, ly] of spots.slice(0, bi.building.func === 'guild' ? 1 : 3)) {
      const p = this._worldToLocal(lx, ly);
      const table = new THREE.Mesh(new THREE.CylinderGeometry(40, 40, 10, 12), wood);
      table.position.set(p.x, 34, p.z);
      this.entityRoot.add(table);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 34, 8), wood);
      leg.position.set(p.x, 17, p.z);
      this.entityRoot.add(leg);
    }
  }

  sync() {
    const bi = this.game.buildingInterior;
    if (!bi || !bi.active) return;
    // rebuild counters/furniture when the building changes
    if (bi.building !== this._lastBuilding) this._rebuildLayout();

    // player figure (keyed separately so it can be rebuilt on load)
    const pKey = 'player';
    let playerMesh = this._meshCache.get(pKey);
    if (!playerMesh) {
      const mat = new THREE.MeshStandardMaterial({ color: parseInt((this.game.player.clothColor || '#7a6a4a').slice(1), 16) });
      playerMesh = { group: this._makeFigure(mat, this._skin, 1.05), kind: 'player', color: this.game.player.clothColor };
      this._meshCache.set(pKey, playerMesh);
      this.entityRoot.add(playerMesh.group);
    }
    const pp = this._worldToLocal(bi.px, bi.py);
    if (bi.sleeping) {
      // lying down: rotate the figure flat + drop it onto the bed
      playerMesh.group.rotation.x = Math.PI / 2;
      playerMesh.group.position.set(pp.x, 12, pp.z);
    } else {
      playerMesh.group.rotation.x = 0;
      playerMesh.group.position.set(pp.x, 0, pp.z);
      playerMesh.group.rotation.y = -(bi.facing || 0);
    }
  }

  render(r3d) {
    this.sync();
    r3d.renderer.render(this.scene, this.camera);
    // draw the normal HUD + the interior prompt over the 3D room
    r3d.renderHUD();
    this._drawPrompt(r3d);
  }

  // the "E — <station>" / "E — Step outside" prompt, centered over the player
  _drawPrompt(r3d) {
    const bi = this.game.buildingInterior;
    if (!bi.active || bi.sleeping) return;
    let text = null;
    if (bi._nearDoor) text = 'E — Step outside';
    else if (bi._near) text = `E — ${bi._near.label}`;
    if (!text) return;
    const ctx = r3d.hudCtx;
    const W = r3d.hudCanvas.width, H = r3d.hudCanvas.height;
    ctx.save();
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const w = ctx.measureText(text).width;
    ctx.fillStyle = 'rgba(10,8,6,0.82)';
    ctx.strokeStyle = '#d8a84a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(W / 2 - w / 2 - 12, H / 2 - 70, w + 24, 30, 6); else ctx.rect(W / 2 - w / 2 - 12, H / 2 - 70, w + 24, 30);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffd76a';
    ctx.fillText(text, W / 2, H / 2 - 55);
    ctx.restore();
  }
}
