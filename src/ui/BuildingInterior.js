// BuildingInterior — a fully WALKABLE interior for every building in the village.
//
// Press E on a building door to step inside. The player then moves around the
// room with WASD, walks up to the counters where the NPCs work, and presses E
// to trigger that counter's interaction (buy/sell, craft, take a job, rest,
// drink…). Walk to the door and press E to step back outside. The outside world
// is frozen while you're indoors.

// Logical room size (stable coordinates independent of screen size / resize).
const RW = 1200;
const RH = 800;
const WALL = 40;   // wall thickness
const PR = 16;     // player collision radius

// Which occupations work in each building (occupation id -> list).
const WORKERS = {
  guild: ['guildclerk', 'adventurer', 'hunter'],
  lodge: ['hunter'],
  blacksmith: ['blacksmith'],
  weaponshop: ['blacksmith'],
  armorshop: ['tailor'],
  general: ['shopkeeper'],
  foodshop: ['cook'],
  inn: ['innkeep', 'traveler'],
  tavern: ['tavernkeep'],
  market: ['merchant', 'farmer'],
  healer: ['healer', 'herbalist'],
  carpenter: ['carpenter'],
  tailor: ['tailor'],
  stable: ['stablehand'],
  community: ['teacher', 'laborer', 'elder'],
  chief: ['elder', 'teacher'],
  training: ['guard', 'adventurer'],
  guard: ['guard'],
  crafting: ['craftsman'],
  shrine: ['elder', 'herbalist'],
  storage: ['shopkeeper', 'laborer'],
  house: ['homemaker'],
  home: [],
  well: [],
  watchtower: ['guard'],
  school: ['teacher', 'child'],
  playground: ['child'],
  healing: ['nurse', 'healer', 'herbalist'],
  temple: ['priest'],
  gearshop: ['gearmerchant', 'merchant']
};

// Warm color themes so every building feels distinct.
const THEMES = {
  guild: { wall: '#4a3a28', floor: '#6a5232', wood: '#7a5a34', accent: '#d8a84a' },
  lodge: { wall: '#3a4a30', floor: '#5a4a30', wood: '#6a5230', accent: '#8ac86a' },
  blacksmith: { wall: '#403840', floor: '#4a4044', wood: '#5a4a44', accent: '#ff8a40' },
  weaponshop: { wall: '#40444a', floor: '#4a4e54', wood: '#5a5248', accent: '#9ab8d8' },
  armorshop: { wall: '#3a4050', floor: '#464c58', wood: '#524c44', accent: '#8aa8d8' },
  general: { wall: '#4a4034', floor: '#5a4c38', wood: '#6a5638', accent: '#d8b86a' },
  foodshop: { wall: '#4a4434', floor: '#5a4c36', wood: '#6a5636', accent: '#e0a85a' },
  inn: { wall: '#4a3830', floor: '#5c4634', wood: '#6a5038', accent: '#e09050' },
  tavern: { wall: '#402e28', floor: '#4c382e', wood: '#5c4434', accent: '#d06840' },
  market: { wall: '#3e4a34', floor: '#5a4e34', wood: '#6a5c3a', accent: '#8ad06a' },
  healer: { wall: '#3a4a40', floor: '#4a5a48', wood: '#5a6448', accent: '#6ad090' },
  carpenter: { wall: '#4a4030', floor: '#5c4c34', wood: '#7a5c38', accent: '#d0a05a' },
  tailor: { wall: '#443848', floor: '#523e52', wood: '#5c4a54', accent: '#c88ad0' },
  stable: { wall: '#464034', floor: '#5c4e36', wood: '#6a583c', accent: '#d0b05a' },
  community: { wall: '#464234', floor: '#5c5036', wood: '#6a5c3c', accent: '#d0c06a' },
  chief: { wall: '#343848', floor: '#444858', wood: '#524c58', accent: '#8aa0e0' },
  training: { wall: '#4a4438', floor: '#5c523a', wood: '#6a5a40', accent: '#d0a06a' },
  guard: { wall: '#404448', floor: '#4c5054', wood: '#5a544a', accent: '#8ab0d0' },
  crafting: { wall: '#443c34', floor: '#584a34', wood: '#6a5636', accent: '#e09a50' },
  shrine: { wall: '#3e4450', floor: '#4a4e58', wood: '#5a5650', accent: '#c0d0f0' },
  storage: { wall: '#403c38', floor: '#4c4438', wood: '#5a4e3a', accent: '#c0a86a' },
  house: { wall: '#4a4234', floor: '#5a4c36', wood: '#6a5638', accent: '#d0a85a' },
  home: { wall: '#4a3e30', floor: '#5a4a34', wood: '#6a5438', accent: '#d0a05a' },
  well: { wall: '#4a6a8a', floor: '#4a7a3a', wood: '#6a5638', accent: '#8ac8e0' },
  watchtower: { wall: '#5a5244', floor: '#5c503c', wood: '#6a5c44', accent: '#d0c088' },
  school: { wall: '#4a5a68', floor: '#5a6a70', wood: '#6a5a4a', accent: '#8ac0d8' },
  playground: { wall: '#4a7a3a', floor: '#5a8a44', wood: '#7a5c3a', accent: '#a8d86a' },
  healing: { wall: '#3e5a4a', floor: '#4a6a52', wood: '#5a6a4a', accent: '#6ad090' },
  temple: { wall: '#5a3a20', floor: '#6a4a2a', wood: '#7a5a30', accent: '#ffb050' },
  gearshop: { wall: '#4a4032', floor: '#5a4c38', wood: '#6a5638', accent: '#d0a05a' }
};

export class BuildingInterior {
  constructor(game) {
    this.game = game;
    this.active = false;
    this.building = null;
    this._mouse = { x: 0, y: 0 };
    this._onMove = (e) => this._handleMove(e);
  }

  open(building) {
    const g = this.game;
    this.exit();
    this.building = building;
    this.active = true;
    // player starts just inside the door (bottom center)
    this.px = RW / 2;
    this.py = RH - WALL - 60;
    this.facing = -Math.PI / 2; // face up, into the room
    this._buildLayout();
    g.canvas.addEventListener('mousemove', this._onMove);
    g.audio.sfx('pickup');
  }

  exit() {
    const g = this.game;
    const b = this.building;
    if (b && g.player) {
      // place the player back outside, just south of the building's door
      const rect = g.world.buildingById(b.id);
      if (rect) {
        g.player.x = rect.x + rect.w / 2;
        g.player.y = rect.y + rect.h + 24;
      }
    }
    g.canvas.removeEventListener('mousemove', this._onMove);
    this.building = null;
    this.active = false;
    this.stations = [];
    g.paused = false;
  }

  _buildLayout() {
    this.stations = stationsFor(this.building, this.game);
    this.door = { x: RW / 2, y: RH - WALL };
  }

  _handleMove(e) {
    const r = this.game.canvas.getBoundingClientRect();
    this._mouse = { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  update(dt) {
    const g = this.game;
    // a menu (shop/craft/jobs…) is layered on top — Esc closes it, no walking
    if (g.ui.open) {
      if (g.input.pressed('escape')) g.ui.close();
      return;
    }
    if (g.input.pressed('escape')) { this.exit(); return; }

    // ---- WASD movement with wall + counter collision ----
    const dir = g.input.dirVector();
    const spd = 230;
    const dx = dir.x * spd * dt, dy = dir.y * spd * dt;
    if (dx !== 0 || dy !== 0) {
      if (dx !== 0 && !this._blocked(this.px + dx, this.py)) this.px += dx;
      if (dy !== 0 && !this._blocked(this.px, this.py + dy)) this.py += dy;
      this.facing = Math.atan2(dir.y, dir.x);
    }

    // ---- proximity detection (nearest counter / the door) ----
    this._near = null;
    let nearDoor = false;
    if (Math.hypot(this.px - this.door.x, this.py - this.door.y) < 66) nearDoor = true;
    let best = null, bd = 60;
    for (const s of this.stations) {
      const d = Math.hypot(this.px - s.ix, this.py - s.iy);
      if (d < bd) { bd = d; best = s; }
    }
    this._near = best;
    this._nearDoor = nearDoor;

    // ---- E to interact ----
    if (g.input.pressed('e')) {
      if (nearDoor) this.exit();
      else if (best) best.action();
    }
  }

  _blocked(x, y) {
    const r = PR;
    // solid outer walls
    if (x < WALL + r || x > RW - WALL - r || y < WALL + r || y > RH - WALL - r) return true;
    // counters / furniture obstacles
    for (const s of this.stations) {
      if (s.cw > 0 && rectCircle(s.cx, s.cy, s.cw, s.ch, x, y, r)) return true;
    }
    return false;
  }

  render(ctx) {
    const g = this.game;
    const SW = g.camera.screenW, SH = g.camera.screenH;
    const scale = Math.min(SW / RW, SH / RH);
    this._scale = scale;
    this._ox = (SW - RW * scale) / 2;
    this._oy = (SH - RH * scale) / 2;
    const sx = (lx) => this._ox + lx * scale;
    const sy = (ly) => this._oy + ly * scale;

    ctx.fillStyle = '#0b0906';
    ctx.fillRect(0, 0, SW, SH);

    const b = this.building;
    const theme = THEMES[b.func] || THEMES.house;

    // room floor
    ctx.fillStyle = theme.floor;
    ctx.fillRect(sx(WALL), sy(WALL), RW * scale, RH * scale);
    // floor planks
    ctx.strokeStyle = 'rgba(0,0,0,0.14)';
    ctx.lineWidth = 1;
    for (let lx = WALL; lx <= RW - WALL; lx += 70) { ctx.beginPath(); ctx.moveTo(sx(lx), sy(WALL)); ctx.lineTo(sx(lx), sy(RH - WALL)); ctx.stroke(); }
    for (let ly = WALL; ly <= RH - WALL; ly += 55) { ctx.beginPath(); ctx.moveTo(sx(WALL), sy(ly)); ctx.lineTo(sx(RH - WALL), sy(ly)); ctx.stroke(); }

    // walls (top / left / right / bottom) — bottom has a door gap drawn over it
    ctx.fillStyle = theme.wall;
    ctx.fillRect(sx(0), sy(0), RW * scale, WALL * scale);                                   // top
    ctx.fillRect(sx(0), sy(0), WALL * scale, RH * scale);                                   // left
    ctx.fillRect(sx(RW - WALL), sy(0), WALL * scale, RH * scale);                           // right
    ctx.fillRect(sx(0), sy(RH - WALL), RW * scale, WALL * scale);                           // bottom
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(sx(0), sy(WALL), RW * scale, 4 * scale);                                   // wall shadow

    // door (bottom center)
    const dw = 90;
    ctx.fillStyle = '#3a2c1a';
    ctx.fillRect(sx(RW / 2 - dw / 2), sy(RH - WALL), dw * scale, WALL * scale);
    ctx.strokeStyle = theme.wood; ctx.lineWidth = 3;
    ctx.strokeRect(sx(RW / 2 - dw / 2), sy(RH - WALL), dw * scale, WALL * scale);
    ctx.fillStyle = '#d8c06a';
    ctx.beginPath(); ctx.arc(sx(RW / 2 + dw / 2 - 10), sy(RH - WALL / 2), 3 * scale, 0, Math.PI * 2); ctx.fill();

    // decorative furniture per building (temple lingam, school desks, …)
    this._drawFurniture(ctx, b, theme);

    // stations (counters + their NPCs)
    for (const s of this.stations) this._drawStation(ctx, s, theme);

    // player
    this._drawPlayer(ctx);

    // proximity prompt
    this._drawPrompt(ctx);

    // header
    this._drawHeader(ctx, SW, SH, b, theme);
  }

  _drawStation(ctx, s, theme) {
    const g = this.game;
    const sx = (lx) => this._ox + lx * this._scale;
    const sy = (ly) => this._oy + ly * this._scale;
    const near = this._near === s;
    // counter (if any)
    if (s.cw > 0) {
      ctx.fillStyle = theme.wood;
      ctx.fillRect(sx(s.cx), sy(s.cy), s.cw * this._scale, s.ch * this._scale);
      ctx.fillStyle = theme.floor;
      ctx.fillRect(sx(s.cx), sy(s.cy), s.cw * this._scale, 8 * this._scale);
      ctx.strokeStyle = near ? theme.accent : 'rgba(0,0,0,0.35)';
      ctx.lineWidth = near ? 3 : 2;
      ctx.strokeRect(sx(s.cx), sy(s.cy), s.cw * this._scale, s.ch * this._scale);
      // label on the counter
      ctx.fillStyle = '#f5eede';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(s.label, sx(s.cx + s.cw / 2), sy(s.cy + s.ch / 2));
    } else {
      // point station (fire / well / bed) — a glowing marker
      const mx = sx(s.ix), my = sy(s.iy);
      const pulse = 1 + Math.sin(g.time.timeOfDay * 80) * 0.12;
      const glow = ctx.createRadialGradient(mx, my, 2, mx, my, 26 * pulse);
      glow.addColorStop(0, theme.accent + 'cc');
      glow.addColorStop(1, theme.accent + '00');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(mx, my, 26 * pulse, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = near ? '#fff' : theme.accent;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(mx, my, 14, 0, Math.PI * 2); ctx.stroke();
    }
    // the NPC working here (behind the counter / beside the point)
    const npc = s.occ ? g.npcs.find((n) => n.occupation === s.occ) : null;
    if (npc || s.occ) {
      const fx = s.cw > 0 ? s.cx + s.cw / 2 : s.ix;
      const fy = s.cw > 0 ? s.cy - 34 : s.iy - 30;
      this._drawFigure(ctx, sx(fx), sy(fy), npc || {}, 1.15);
      this._drawLabel(ctx, sx(fx), sy(fy) + 26, npc ? `${npc.name} · ${npc.occupationLabel}` : '', '#e8e0c8');
    }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
  }

  _drawPlayer(ctx) {
    const g = this.game;
    const x = this._ox + this.px * this._scale;
    const y = this._oy + this.py * this._scale;
    const p = g.player;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(0, 6, 11, 5, 0, 0, Math.PI * 2); ctx.fill();
    // flip the figure toward facing direction
    if (this.facing > Math.PI / 2 || this.facing < -Math.PI / 2) ctx.scale(-1, 1);
    ctx.restore();
    this._drawFigure(ctx, x, y, p, 1.3);
    this._drawLabel(ctx, x, y + 26, p.name, '#ffd76a');
  }

  _drawPrompt(ctx) {
    const g = this.game;
    let text = null;
    if (this._nearDoor) text = 'E — Step outside';
    else if (this._near) text = `E — ${this._near.label}`;
    if (!text) return;
    const x = this._ox + this.px * this._scale;
    const y = this._oy + this.py * this._scale;
    ctx.save();
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const w = ctx.measureText(text).width;
    const bx = x, by = y - 44;
    ctx.fillStyle = 'rgba(10,8,6,0.82)';
    ctx.strokeStyle = '#d8a84a';
    ctx.lineWidth = 1.5;
    const r = 6;
    if (ctx.roundRect) ctx.roundRect(bx - w / 2 - 10, by - 13, w + 20, 26, r); else ctx.fillRect(bx - w / 2 - 10, by - 13, w + 20, 26);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffd76a';
    ctx.fillText(text, bx, by);
    ctx.restore();
  }

  // decorative furniture for the special buildings (drawn before the counters)
  _drawFurniture(ctx, b, theme) {
    const sx = (lx) => this._ox + lx * this._scale;
    const sy = (ly) => this._oy + ly * this._scale;
    switch (b.func) {
      case 'temple':
        this._drawLingam(ctx, sx, sy, theme);
        break;
      case 'school':
        this._drawSchool(ctx, sx, sy, theme);
        break;
      case 'playground':
        this._drawPlayground(ctx, sx, sy, theme);
        break;
      case 'watchtower':
        this._drawWatchtower(ctx, sx, sy, theme);
        break;
      case 'healing':
        this._drawBeds(ctx, sx, sy, theme);
        break;
      case 'gearshop':
        this._drawGearShelves(ctx, sx, sy, theme);
        break;
    }
  }

  // The Shiva Lingam — a stone pillar on its base, lit by oil lamps and flowers.
  _drawLingam(ctx, sx, sy, theme) {
    const cx = 600, cy = 300; // logical room coords (upper center)
    // raised dais
    ctx.fillStyle = '#4a3420';
    ctx.fillRect(sx(cx - 90), sy(cy + 60), 180 * this._scale, 26 * this._scale);
    ctx.fillStyle = '#5a4230';
    ctx.fillRect(sx(cx - 70), sy(cy + 50), 140 * this._scale, 12 * this._scale);
    // yoni base (horizontal spout platform)
    ctx.fillStyle = '#3a3a3e';
    ctx.beginPath();
    ctx.ellipse(sx(cx), sy(cy + 30), 60 * this._scale, 22 * this._scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2e2e32';
    ctx.beginPath();
    ctx.ellipse(sx(cx + 58), sy(cy + 30), 26 * this._scale, 12 * this._scale, 0, 0, Math.PI * 2);
    ctx.fill();
    // the lingam (rounded stone pillar)
    ctx.fillStyle = '#2a2a30';
    ctx.beginPath();
    ctx.ellipse(sx(cx), sy(cy - 8), 34 * this._scale, 48 * this._scale, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#383842';
    ctx.beginPath();
    ctx.ellipse(sx(cx), sy(cy - 14), 26 * this._scale, 40 * this._scale, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    // soft glow around the lingam
    const glow = ctx.createRadialGradient(sx(cx), sy(cy - 4), 8, sx(cx), sy(cy - 4), 110 * this._scale);
    glow.addColorStop(0, 'rgba(255,220,150,0.35)');
    glow.addColorStop(1, 'rgba(255,220,150,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(sx(cx), sy(cy - 4), 110 * this._scale, 0, Math.PI * 2); ctx.fill();
    // oil lamps (diyas) with flames
    const diya = (lx, ly) => {
      ctx.fillStyle = '#5a3a1a';
      ctx.beginPath(); ctx.ellipse(sx(lx), sy(ly), 12 * this._scale, 6 * this._scale, 0, 0, Math.PI * 2); ctx.fill();
      const f = ctx.createRadialGradient(sx(lx), sy(ly) - 12 * this._scale, 1, sx(lx), sy(ly) - 12 * this._scale, 10 * this._scale);
      f.addColorStop(0, '#fff2a0'); f.addColorStop(0.4, '#ffb040'); f.addColorStop(1, 'rgba(255,120,20,0)');
      ctx.fillStyle = f;
      ctx.beginPath(); ctx.arc(sx(lx), sy(ly) - 12 * this._scale, 10 * this._scale, 0, Math.PI * 2); ctx.fill();
    };
    diya(cx - 70, cy + 40);
    diya(cx + 70, cy + 40);
    // flower offerings
    ctx.fillStyle = '#ff8a5a';
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ctx.beginPath(); ctx.arc(sx(cx + Math.cos(a) * 44), sy(cy + 34 + Math.sin(a) * 8), 4 * this._scale, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#ffd76a';
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.4;
      ctx.beginPath(); ctx.arc(sx(cx + Math.cos(a) * 46), sy(cy + 32 + Math.sin(a) * 8), 2.5 * this._scale, 0, Math.PI * 2); ctx.fill();
    }
    // incense smoke wisps
    ctx.strokeStyle = 'rgba(220,220,230,0.5)';
    ctx.lineWidth = 2;
    for (let i = -1; i <= 1; i += 2) {
      ctx.beginPath();
      ctx.moveTo(sx(cx + i * 40), sy(cy - 30));
      ctx.quadraticCurveTo(sx(cx + i * 46), sy(cy - 60), sx(cx + i * 34), sy(cy - 86));
      ctx.stroke();
    }
  }

  _drawSchool(ctx, sx, sy, theme) {
    // chalkboard
    ctx.fillStyle = '#2a3a2a';
    ctx.fillRect(sx(470), sy(120), 260 * this._scale, 90 * this._scale);
    ctx.strokeStyle = theme.wood; ctx.lineWidth = 6; ctx.strokeRect(sx(470), sy(120), 260 * this._scale, 90 * this._scale);
    ctx.fillStyle = '#e8e8d8';
    ctx.font = `${16 * this._scale}px sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('A B C · 1 2 3', sx(600), sy(150));
    ctx.fillText('the forest provides', sx(600), sy(182));
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    // desks
    for (let row = 0; row < 2; row++) {
      for (let i = 0; i < 3; i++) {
        const dx = 320 + i * 190, dy = 330 + row * 150;
        ctx.fillStyle = theme.wood;
        ctx.fillRect(sx(dx - 50), sy(dy), 100 * this._scale, 16 * this._scale);
        ctx.fillStyle = '#4a3a26';
        ctx.fillRect(sx(dx - 44), sy(dy + 16), 8 * this._scale, 30 * this._scale);
        ctx.fillRect(sx(dx + 36), sy(dy + 16), 8 * this._scale, 30 * this._scale);
      }
    }
  }

  _drawPlayground(ctx, sx, sy, theme) {
    // swing set
    ctx.strokeStyle = theme.wood; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(sx(240), sy(220)); ctx.lineTo(sx(300), sy(140)); ctx.lineTo(sx(360), sy(220)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx(300), sy(140)); ctx.lineTo(sx(300), sy(250)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx(300), sy(250)); ctx.lineTo(sx(270), sy(300)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx(300), sy(250)); ctx.lineTo(sx(330), sy(300)); ctx.stroke();
    ctx.fillStyle = theme.wood; ctx.fillRect(sx(258), sy(298), 84 * this._scale, 8 * this._scale);
    // slide
    ctx.strokeStyle = theme.wood; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(sx(560), sy(180)); ctx.lineTo(sx(620), sy(340)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx(560), sy(180)); ctx.lineTo(sx(560), sy(130)); ctx.stroke();
    ctx.fillStyle = '#c84a3a'; ctx.fillRect(sx(544), sy(118), 34 * this._scale, 14 * this._scale);
    ctx.strokeStyle = theme.wood;
    ctx.beginPath(); ctx.moveTo(sx(560), sy(132)); ctx.lineTo(sx(620), sy(352)); ctx.stroke();
    // seesaw
    ctx.fillStyle = '#c8c8c8';
    ctx.beginPath(); ctx.ellipse(sx(820), sy(400), 10 * this._scale, 8 * this._scale, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = theme.wood; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(sx(740), sy(380)); ctx.lineTo(sx(900), sy(400)); ctx.stroke();
    ctx.fillStyle = theme.wood;
    ctx.fillRect(sx(730), sy(376), 20 * this._scale, 8 * this._scale);
    ctx.fillRect(sx(892), sy(396), 20 * this._scale, 8 * this._scale);
  }

  _drawWatchtower(ctx, sx, sy, theme) {
    // ladder up to a lookout platform
    ctx.strokeStyle = theme.wood; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(sx(600), sy(660)); ctx.lineTo(sx(600), sy(240)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx(660), sy(660)); ctx.lineTo(sx(660), sy(240)); ctx.stroke();
    for (let ly = 260; ly < 660; ly += 50) {
      ctx.beginPath(); ctx.moveTo(sx(600), sy(ly)); ctx.lineTo(sx(660), sy(ly)); ctx.stroke();
    }
    // lookout platform + railing
    ctx.fillStyle = theme.wood; ctx.fillRect(sx(520), sy(200), 220 * this._scale, 14 * this._scale);
    ctx.strokeStyle = theme.wood; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(sx(520), sy(200)); ctx.lineTo(sx(520), sy(140)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx(740), sy(200)); ctx.lineTo(sx(740), sy(140)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx(520), sy(140)); ctx.lineTo(sx(740), sy(140)); ctx.stroke();
    // open view (blue sky through the railing)
    ctx.fillStyle = '#8ac0e8';
    ctx.fillRect(sx(526), sy(146), 208 * this._scale, 48 * this._scale);
  }

  _drawBeds(ctx, sx, sy, theme) {
    for (let i = 0; i < 3; i++) {
      const bx = 320 + i * 190, by = 260;
      ctx.fillStyle = theme.wood; ctx.fillRect(sx(bx - 55), sy(by), 110 * this._scale, 12 * this._scale);
      ctx.fillStyle = '#e8e8e8'; ctx.fillRect(sx(bx - 51), sy(by - 30), 102 * this._scale, 30 * this._scale);
      ctx.fillStyle = '#7ac0a0'; ctx.fillRect(sx(bx - 51), sy(by - 30), 102 * this._scale, 12 * this._scale);
      ctx.fillStyle = '#f0f0f0'; ctx.fillRect(sx(bx - 51), sy(by - 44), 40 * this._scale, 16 * this._scale);
      ctx.fillStyle = theme.wood;
      ctx.fillRect(sx(bx - 55), sy(by + 12), 10 * this._scale, 20 * this._scale);
      ctx.fillRect(sx(bx + 45), sy(by + 12), 10 * this._scale, 20 * this._scale);
    }
  }

  _drawGearShelves(ctx, sx, sy, theme) {
    // armor stand
    ctx.strokeStyle = theme.wood; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(sx(280), sy(300)); ctx.lineTo(sx(280), sy(420)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx(240), sy(340)); ctx.lineTo(sx(320), sy(340)); ctx.stroke();
    ctx.fillStyle = '#5a6a7a';
    ctx.beginPath(); ctx.arc(sx(280), sy(300), 16 * this._scale, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4a5a68'; ctx.fillRect(sx(262), sy(312), 36 * this._scale, 30 * this._scale);
    // potion shelves
    ctx.fillStyle = theme.wood; ctx.fillRect(sx(560), sy(200), 200 * this._scale, 160 * this._scale);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2; ctx.strokeRect(sx(560), sy(200), 200 * this._scale, 160 * this._scale);
    const potion = ['#d0483a', '#4a8ac8', '#7a5ac8', '#4ac84a'];
    for (let row = 0; row < 3; row++) {
      for (let i = 0; i < 4; i++) {
        const px = 590 + i * 44, py = 230 + row * 46;
        ctx.fillStyle = potion[(row * 4 + i) % 4];
        ctx.fillRect(sx(px), sy(py), 16 * this._scale, 24 * this._scale);
        ctx.fillStyle = '#8a6a3a';
        ctx.fillRect(sx(px), sy(py), 16 * this._scale, 5 * this._scale);
      }
    }
  }

  _drawHeader(ctx, SW, SH, b, theme) {
    ctx.save();
    ctx.fillStyle = 'rgba(10,8,6,0.72)';
    ctx.fillRect(0, 0, SW, 46);
    ctx.fillStyle = '#1a140c';
    ctx.fillRect(0, 46, SW, 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 19px serif';
    ctx.fillStyle = '#f0e6d0';
    ctx.fillText(b.name, SW / 2, 18);
    ctx.font = '12px sans-serif';
    ctx.fillStyle = theme.accent;
    ctx.fillText('WASD to walk · walk to a counter and press E · walk to the door to leave', SW / 2, 36);
    ctx.restore();
  }

  // ---- primitive drawing helpers ----
  _drawFigure(ctx, x, y, n, scale = 1.35) {
    const s = 11;
    const skin = n.skinTone || '#e8c39a';
    const hair = n.hairColor || '#4a3624';
    const cloth = n.clothColor || '#7a6a4a';
    const female = n.gender === 'female' && (n.age == null || n.age >= 14);
    const child = n.age != null && n.age < 14;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(0, s * 0.8, s * 0.6, s * 0.22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.scale(child ? 0.95 : scale, child ? 0.95 : scale);
    if (female) {
      ctx.fillStyle = cloth;
      ctx.beginPath(); ctx.ellipse(0, s * 0.12, s * 0.52, s * 0.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-s * 0.4, s * 0.3); ctx.lineTo(-s * 0.7, s * 0.95); ctx.lineTo(s * 0.7, s * 0.95); ctx.lineTo(s * 0.4, s * 0.3);
      ctx.closePath(); ctx.fill();
    } else {
      ctx.fillStyle = cloth;
      ctx.beginPath(); ctx.ellipse(0, s * 0.18, s * 0.68, s * 0.6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = this._darken(cloth);
      ctx.fillRect(-s * 0.26, s * 0.55, s * 0.22, s * 0.4);
      ctx.fillRect(s * 0.04, s * 0.55, s * 0.22, s * 0.4);
    }
    ctx.fillStyle = skin;
    ctx.beginPath(); ctx.arc(0, -s * 0.52, s * 0.48, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = hair;
    ctx.beginPath(); ctx.arc(0, -s * 0.68, s * 0.48, Math.PI, Math.PI * 2); ctx.fill();
    if (female) {
      ctx.beginPath(); ctx.ellipse(-s * 0.48, -s * 0.4, s * 0.13, s * 0.42, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(s * 0.48, -s * 0.4, s * 0.13, s * 0.42, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath(); ctx.arc(-s * 0.17, -s * 0.52, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.17, -s * 0.52, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  _drawLabel(ctx, x, y, text, color) {
    if (!text) return;
    ctx.save();
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const w = ctx.measureText(text).width;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(x - w / 2 - 5, y - 8, w + 10, 16);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y + 1);
    ctx.restore();
  }

  _darken(hex) {
    if (!hex) return '#555';
    const n = parseInt(hex.slice(1), 16);
    const r = Math.max(0, ((n >> 16) & 255) - 40);
    const g = Math.max(0, ((n >> 8) & 255) - 40);
    const b = Math.max(0, (n & 255) - 40);
    return `rgb(${r},${g},${b})`;
  }
}

function rectCircle(rx, ry, rw, rh, x, y, r) {
  const cx = Math.max(rx, Math.min(x, rx + rw));
  const cy = Math.max(ry, Math.min(y, ry + rh));
  const dx = x - cx, dy = y - cy;
  return dx * dx + dy * dy < r * r;
}

// ---- per-building stations (walk-up counters) ----
function stationsFor(b, g) {
  const shop = (f) => () => { g.ui._shopFunc = f; g.ui._renderShop(); };
  const craft = (f) => () => { g.ui._craftStation = f; g.ui.openMenu('crafting'); };
  const main = () => g.ui.openBuilding(b);
  const rest = () => { g.survival.rest(); g.buildingInterior.exit(); };
  const submit = () => g.ui.openMenu('guild');
  const jobs = () => g.ui._renderJobs();
  const quests = () => g.ui.openMenu('quests');
  const drink = () => { g.player.hunger = Math.min(100, g.player.hunger + 6); g.toast('You drink cool water from the well.'); };
  const talk = (occ) => () => { const n = g.npcs.find((x) => x.occupation === occ); if (n) g.ui.openDialogue(n); else g.toast('No one is at this counter right now.'); };

  // counter station (obstacle) — ix/iy is where the player stands to interact
  const C = (id, label, sub, cx, cy, cw, ch, occ, action) => ({ id, label, sub, cx, cy, cw, ch, ix: cx + cw / 2, iy: cy + ch + 48, occ, action });
  // point station (no obstacle — fire / well / bed)
  const P = (id, label, sub, ix, iy, occ, action) => ({ id, label, sub, cx: 0, cy: 0, cw: 0, ch: 0, ix, iy, occ, action });

  const left = (id, label, sub, occ, action) => C(id, label, sub, 270, 290, 260, 80, occ, action);
  const right = (id, label, sub, occ, action) => C(id, label, sub, 670, 290, 260, 80, occ, action);
  const center = (id, label, sub, occ, action) => C(id, label, sub, 440, 290, 320, 80, occ, action);

  switch (b.func) {
    case 'guild': return [
      left('submit', 'Submit Materials', 'Trade materials for points & gold', 'guildclerk', submit),
      right('jobs', 'Guild Jobs', 'Talk about work · take a job', 'guildclerk', jobs),
      P('rest', 'Rest by the Fire', 'Sit and recover', 600, 600, null, rest)
    ];
    case 'lodge': return [
      left('counter', 'Buy Supplies', 'Arrows · traps · knives', 'hunter', main),
      right('tips', 'Hunter Tips', 'Talk to the veterans', 'hunter', talk('hunter'))
    ];
    case 'blacksmith': return [
      center('forge', 'Forge', 'Craft & repair weapons', 'blacksmith', craft('blacksmith'))
    ];
    case 'weaponshop': return [
      center('buy', 'Buy Weapons', 'Swords · bows · axes', 'blacksmith', shop('weaponshop'))
    ];
    case 'armorshop': return [
      center('buy', 'Buy Armor', 'Head · body · legs · feet', 'tailor', shop('armorshop'))
    ];
    case 'general': return [
      center('buy', 'Buy & Sell', 'General goods', 'shopkeeper', shop('general'))
    ];
    case 'foodshop': return [
      center('buy', 'Buy Food', 'Bread · meals', 'cook', shop('foodshop'))
    ];
    case 'inn': return [
      left('sleep', 'Sleep at the Inn', 'Rest · wake at dawn', 'innkeep', () => g.ui._renderRest('inn')),
      P('hearth', 'Warm Hearth', 'Sit by the fire', 700, 600, null, rest)
    ];
    case 'tavern': return [
      left('drink', 'Order a Drink', '+6 hunger', 'tavernkeep', drink),
      right('rumors', 'Hear Rumors', 'Gossip & news', 'tavernkeep', () => g.ui._renderTavern())
    ];
    case 'market': return [
      center('buy', 'Buy & Sell Produce', 'The farmers market', 'merchant', shop('market'))
    ];
    case 'healer': return [
      center('buy', 'Buy Medicine', 'Potions & herbs', 'healer', shop('healer'))
    ];
    case 'carpenter': return [
      center('craft', 'Craft Wooden Gear', 'Bows & tools', 'carpenter', craft('carpenter'))
    ];
    case 'tailor': return [
      center('craft', 'Craft Armor & Bags', 'Cloth & leather', 'tailor', craft('tailor'))
    ];
    case 'home': return [
      P('sleep', 'Sleep in your bed', 'Recover fully', 440, 520, null, () => g.ui._renderRest('home'))
    ];
    case 'well': return [
      P('drink', 'Drink Water', '+6 hunger', 600, 430, null, drink)
    ];
    case 'shrine': return [
      P('shrine', 'Study the Shrine', 'Learn the old lore', 600, 430, 'elder', main)
    ];
    case 'crafting': return [
      P('craft', 'Craft at the Campfire', 'Cook & basic gear', 560, 520, 'craftsman', craft('crafting'))
    ];
    case 'training': return [
      right('practice', 'Practice Combat', 'Sharpen your blade', 'guard', () => g.toast('You train against the dummies. Your form improves.')),
      P('dummy', 'Training Dummies', 'Spar', 420, 560, null, () => g.toast('You spar with the training dummies.'))
    ];
    case 'guard': return [
      center('post', 'Talk to the Guard', 'Ask about the roads', 'guard', talk('guard'))
    ];
    case 'chief': return [
      center('chief', 'Meet the Elder', 'The village leader', 'elder', talk('elder'))
    ];
    case 'stable': return [
      center('stable', 'Talk to the Stable Hand', 'About the horses', 'stablehand', talk('stablehand'))
    ];
    case 'community': return [
      center('hall', 'Community Hall', 'Where the village gathers', 'teacher', talk('teacher'))
    ];
    case 'storage': return [
      center('storage', 'Village Stores', 'Crates & barrels', 'shopkeeper', () => g.toast('These are the village stores — kept locked for now.'))
    ];
    case 'house': return [
      center('house', 'Villager Home', 'A cozy home', 'homemaker', talk('homemaker'))
    ];
    case 'watchtower': return [
      P('lookout', 'Look Out', 'Watch the roads & forest', 600, 300, 'guard', () => g.toast('You climb to the lookout. The forest stretches to the horizon — the Yggdrasil glows far to the east.')),
      center('guard', 'Talk to the Guard', 'Ask about the roads', 'guard', talk('guard'))
    ];
    case 'school': return [
      center('teach', 'Talk to the Teacher', 'Learn about the village', 'teacher', talk('teacher')),
      P('study', 'Study', 'Read at a desk', 600, 560, null, () => { g.addXP(10); g.toast('You study for a while. +10 XP.'); }),
    ];
    case 'playground': return [
      P('play', 'Play', 'Join the children', 600, 430, 'child', () => g.toast('You play with the village children. They laugh and cheer.')),
      P('swing', 'Swing', 'Swing on the swing set', 300, 300, 'child', () => g.toast('You swing back and forth under the open sky.'))
    ];
    case 'healing': return [
      center('buy', 'Buy Medicine', 'Potions, orbs & charms', 'nurse', shop('healing')),
      P('rest', 'Rest & Heal', 'Recover fully', 600, 600, 'nurse', () => { g.survival.rest(); g.buildingInterior.exit(); })
    ];
    case 'temple': return [
      P('pray', 'Pray at the Shiva Lingam', 'The forest god blesses you', 600, 300, 'priest', () => {
        const p = g.player;
        p.health = p.maxHealth; p.stamina = p.maxStamina; p.mp = p.maxMp;
        g.toast('🙏 You pray at the Shiva Lingam. The forest god blesses you — all stats restored.');
      }),
      center('talk', 'Talk to the Priest', 'Hear the old blessings', 'priest', talk('priest'))
    ];
    case 'gearshop': return [
      center('buy', 'Buy Gear', 'Armor · potions · safety gear', 'gearmerchant', shop('gearshop'))
    ];
    default: return [
      center('counter', 'Interact', b.name, null, main)
    ];
  }
}
