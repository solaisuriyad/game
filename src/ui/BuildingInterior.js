// BuildingInterior — a full-screen "step inside" view for every building in the
// village. Instead of a flat text menu, pressing E on a building draws its
// furnished interior on the main canvas: the room, its furniture, the NPCs who
// work there, a greeter who points you to the right counter, and clickable
// hotspots that run the normal actions (shop / craft / quests / rest / etc.).

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
  well: []
};

// The greeter's guide line, per building.
const GREETINGS = {
  guild: 'Welcome to the Guild! Take materials to the counter on the left, find jobs on the quest board, and rest by the fire.',
  lodge: "Hunter's Lodge — arrows, traps and knives at the counter. Seasoned hunters trade tips here.",
  blacksmith: 'The forge is hot! Bring me ore and I will craft or repair your weapons.',
  weaponshop: 'The finest blades in the valley hang on the rack — see me at the counter.',
  armorshop: 'Good armor keeps you alive out there. Browse the stands and buy at the counter.',
  general: 'Supplies for every journey — buy and sell whatever you carry.',
  foodshop: 'Fresh bread and hot meals. Stock up before you hunt!',
  inn: 'Traveler, rest your feet. Sleep at the inn and wake refreshed at dawn.',
  tavern: 'Pull up a stool! Order a drink at the bar and hear the latest rumors.',
  market: 'The freshest produce in the valley — sell your harvest here.',
  healer: 'Wounds, fevers and herbs — I can help. Medicine is at the counter.',
  carpenter: 'Fine woodwork! I craft bows, tools and wooden gear.',
  tailor: 'Cloth, leather and bags — tailored to fit any hunter.',
  stable: 'The stable hands tend the horses. Nothing for you today, hunter.',
  community: 'The hall where the village gathers for feasts and meetings.',
  chief: "The village chief's home. Mind your manners.",
  training: 'Practice dummies for sharpening your blade before the hunt.',
  guard: 'The guards keep the village safe. They watch the roads.',
  crafting: 'A campfire and workbench for field crafting.',
  shrine: 'A quiet place to reflect. Offerings lie at the altar.',
  storage: 'Crates and barrels holding the village stores.',
  house: "A villager's cozy home.",
  home: 'Your residence. Rest here to recover fully.',
  well: 'Fresh, cool water from the village well.'
};

// Warm color themes so every building feels distinct.
const THEMES = {
  guild: { wall: '#4a3a28', wall2: '#3a2e20', floor: '#6a5232', wood: '#7a5a34', accent: '#d8a84a' },
  lodge: { wall: '#3a4a30', wall2: '#2e3a26', floor: '#5a4a30', wood: '#6a5230', accent: '#8ac86a' },
  blacksmith: { wall: '#403840', wall2: '#322c32', floor: '#4a4044', wood: '#5a4a44', accent: '#ff8a40' },
  weaponshop: { wall: '#40444a', wall2: '#32363c', floor: '#4a4e54', wood: '#5a5248', accent: '#9ab8d8' },
  armorshop: { wall: '#3a4050', wall2: '#2e3340', floor: '#464c58', wood: '#524c44', accent: '#8aa8d8' },
  general: { wall: '#4a4034', wall2: '#3a332a', floor: '#5a4c38', wood: '#6a5638', accent: '#d8b86a' },
  foodshop: { wall: '#4a4434', wall2: '#3a362a', floor: '#5a4c36', wood: '#6a5636', accent: '#e0a85a' },
  inn: { wall: '#4a3830', wall2: '#3a2c26', floor: '#5c4634', wood: '#6a5038', accent: '#e09050' },
  tavern: { wall: '#402e28', wall2: '#332420', floor: '#4c382e', wood: '#5c4434', accent: '#d06840' },
  market: { wall: '#3e4a34', wall2: '#323c2a', floor: '#5a4e34', wood: '#6a5c3a', accent: '#8ad06a' },
  healer: { wall: '#3a4a40', wall2: '#2e3c34', floor: '#4a5a48', wood: '#5a6448', accent: '#6ad090' },
  carpenter: { wall: '#4a4030', wall2: '#3a3226', floor: '#5c4c34', wood: '#7a5c38', accent: '#d0a05a' },
  tailor: { wall: '#443848', wall2: '#362c3a', floor: '#523e52', wood: '#5c4a54', accent: '#c88ad0' },
  stable: { wall: '#464034', wall2: '#383226', floor: '#5c4e36', wood: '#6a583c', accent: '#d0b05a' },
  community: { wall: '#464234', wall2: '#383528', floor: '#5c5036', wood: '#6a5c3c', accent: '#d0c06a' },
  chief: { wall: '#343848', wall2: '#2a2c3a', floor: '#444858', wood: '#524c58', accent: '#8aa0e0' },
  training: { wall: '#4a4438', wall2: '#3a362c', floor: '#5c523a', wood: '#6a5a40', accent: '#d0a06a' },
  guard: { wall: '#404448', wall2: '#32363a', floor: '#4c5054', wood: '#5a544a', accent: '#8ab0d0' },
  crafting: { wall: '#443c34', wall2: '#36302a', floor: '#584a34', wood: '#6a5636', accent: '#e09a50' },
  shrine: { wall: '#3e4450', wall2: '#32363e', floor: '#4a4e58', wood: '#5a5650', accent: '#c0d0f0' },
  storage: { wall: '#403c38', wall2: '#322e2a', floor: '#4c4438', wood: '#5a4e3a', accent: '#c0a86a' },
  house: { wall: '#4a4234', wall2: '#3a342a', floor: '#5a4c36', wood: '#6a5638', accent: '#d0a85a' },
  home: { wall: '#4a3e30', wall2: '#3a3026', floor: '#5a4a34', wood: '#6a5438', accent: '#d0a05a' },
  well: { wall: '#4a6a8a', wall2: '#3a5a78', floor: '#4a7a3a', wood: '#6a5638', accent: '#8ac8e0' }
};

export class BuildingInterior {
  constructor(game) {
    this.game = game;
    this.active = false;
    this.building = null;
    this.hover = null;
    this._mouse = { x: 0, y: 0 };
    this._onDown = (e) => this._handleDown(e);
    this._onMove = (e) => this._handleMove(e);
  }

  open(building) {
    const g = this.game;
    this.exit();
    this.building = building;
    this.active = true;
    this.hover = null;
    g.canvas.addEventListener('mousedown', this._onDown);
    g.canvas.addEventListener('mousemove', this._onMove);
    g.audio.sfx('pickup');
  }

  exit() {
    const g = this.game;
    g.canvas.removeEventListener('mousedown', this._onDown);
    g.canvas.removeEventListener('mousemove', this._onMove);
    this.building = null;
    this.active = false;
    this.hover = null;
    g.paused = false;
  }

  update(dt) {
    const g = this.game;
    // a functional menu may be layered over the interior — let Esc close it
    if (g.ui.open) {
      if (g.input.pressed('escape')) g.ui.close();
      return;
    }
    if (g.input.pressed('escape') || g.input.pressed('e')) { this.exit(); return; }
  }

  _hotspots() {
    return hotspotsFor(this.building, this.game);
  }

  _handleMove(e) {
    const r = this.game.canvas.getBoundingClientRect();
    this._mouse = { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  _handleDown(e) {
    if (this.game.ui.open) return; // a menu is on top — ignore canvas clicks
    const r = this.game.canvas.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    const W = r.width, H = r.height;
    for (const s of this._hotspots()) {
      const x = s.fx * W, y = s.fy * H, w = s.fw * W, h = s.fh * H;
      if (mx >= x && mx <= x + w && my >= y && my <= y + h) { s.action(); return; }
    }
  }

  render(ctx) {
    const g = this.game;
    const W = g.camera.screenW, H = g.camera.screenH;
    const b = this.building;
    const theme = THEMES[b.func] || THEMES.house;

    // backdrop + soft vignette
    ctx.fillStyle = '#0d0a08';
    ctx.fillRect(0, 0, W, H);
    if (b.func === 'well') this._drawWell(ctx, W, H, theme);
    else this._drawRoom(ctx, W, H, b, theme);

    // the NPCs who work here
    this._drawWorkers(ctx, W, H, b);
    // greeter + guide line
    this._drawGreeter(ctx, W, H, b);

    // clickable hotspots (the counters / areas)
    const spots = this._hotspots();
    // resolve hover from mouse
    this.hover = null;
    for (const s of spots) {
      const x = s.fx * W, y = s.fy * H, w = s.fw * W, h = s.fh * H;
      if (this._mouse.x >= x && this._mouse.x <= x + w && this._mouse.y >= y && this._mouse.y <= y + h) this.hover = s.id;
    }
    for (const s of spots) this._drawHotspot(ctx, s, W, H, this.hover === s.id);

    // title bar + leave hint
    this._drawHeader(ctx, W, H, b, theme);
  }

  _drawHeader(ctx, W, H, b, theme) {
    ctx.save();
    ctx.fillStyle = 'rgba(10,8,6,0.72)';
    ctx.fillRect(0, 0, W, 54);
    ctx.fillStyle = '#1a140c';
    ctx.fillRect(0, 54, W, 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 22px serif';
    ctx.fillStyle = '#f0e6d0';
    ctx.fillText(b.name, W / 2, 20);
    ctx.font = '12px sans-serif';
    ctx.fillStyle = theme.accent;
    ctx.fillText('You are inside — click a counter to interact', W / 2, 40);
    // bottom hint
    ctx.fillStyle = 'rgba(10,8,6,0.72)';
    ctx.fillRect(0, H - 34, W, 34);
    ctx.fillStyle = '#c8b89a';
    ctx.font = '13px sans-serif';
    ctx.fillText('Esc / E — step back outside', W / 2, H - 17);
    ctx.restore();
  }

  _drawRoom(ctx, W, H, b, theme) {
    const floorY = H * 0.56;
    // wall
    const wall = ctx.createLinearGradient(0, 0, 0, floorY);
    wall.addColorStop(0, theme.wall);
    wall.addColorStop(1, theme.wall2);
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, W, floorY);
    // wainscoting line
    ctx.fillStyle = theme.wood;
    ctx.fillRect(0, floorY - 10, W, 10);
    // floor (planks)
    ctx.fillStyle = theme.floor;
    ctx.fillRect(0, floorY, W, H - floorY);
    ctx.strokeStyle = 'rgba(0,0,0,0.22)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 56) { ctx.beginPath(); ctx.moveTo(x, floorY); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = floorY; y < H; y += 26) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    // ceiling beam
    ctx.fillStyle = theme.wood;
    ctx.fillRect(0, 0, W, 18);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, 18, W, 3);
    // windows
    this._window(ctx, W * 0.16, H * 0.16, W * 0.1, H * 0.18, theme);
    this._window(ctx, W * 0.74, H * 0.16, W * 0.1, H * 0.18, theme);
    // rug
    this._rug(ctx, W * 0.5, floorY + (H - floorY) * 0.5, W * 0.34, (H - floorY) * 0.5, theme.accent);
    // door (exit) on the left
    this._door(ctx, W * 0.035, floorY - H * 0.3, W * 0.07, H * 0.3, theme);
    // furniture per building type
    drawFurniture(ctx, W, H, b.func, theme);
  }

  _drawWell(ctx, W, H, theme) {
    // outdoor scene
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#7ab8e0');
    sky.addColorStop(1, '#c8e0f0');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    // sun
    ctx.fillStyle = '#fff4c8';
    ctx.beginPath(); ctx.arc(W * 0.82, H * 0.16, 34, 0, Math.PI * 2); ctx.fill();
    // grass
    ctx.fillStyle = '#4a8a3a'; ctx.fillRect(0, H * 0.6, W, H * 0.4);
    ctx.fillStyle = '#3a7a30';
    ctx.fillRect(0, H * 0.6, W, 8);
    // stone well
    const wx = W * 0.5, wy = H * 0.52, ww = W * 0.16;
    ctx.fillStyle = '#7a7a78';
    ctx.fillRect(wx - ww, wy, ww * 2, H * 0.16);
    ctx.fillStyle = '#5a5a58';
    ctx.fillRect(wx - ww, wy, ww * 2, 6);
    ctx.fillStyle = '#1a3a5a';
    ctx.beginPath(); ctx.ellipse(wx, wy, ww, 10, 0, 0, Math.PI * 2); ctx.fill();
    // roof posts + cover
    ctx.fillStyle = '#6a5638';
    ctx.fillRect(wx - ww - 8, wy - H * 0.1, 8, H * 0.1);
    ctx.fillRect(wx + ww, wy - H * 0.1, 8, H * 0.1);
    ctx.fillStyle = '#8a6a40';
    ctx.beginPath();
    ctx.moveTo(wx - ww - 22, wy - H * 0.1);
    ctx.lineTo(wx, wy - H * 0.18);
    ctx.lineTo(wx + ww + 22, wy - H * 0.1);
    ctx.closePath(); ctx.fill();
    // bucket + rope
    ctx.strokeStyle = '#c8a06a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(wx, wy - H * 0.18); ctx.lineTo(wx, wy + H * 0.1); ctx.stroke();
    ctx.fillStyle = '#8a6a3a';
    ctx.fillRect(wx - 10, wy + H * 0.1, 20, 16);
  }

  _drawWorkers(ctx, W, H, b) {
    const ids = WORKERS[b.func] || [];
    const workers = ids.map((occ) => this.game.npcs.find((n) => n.occupation === occ)).filter(Boolean);
    const spots = [
      { fx: 0.3, fy: 0.52 }, { fx: 0.5, fy: 0.52 }, { fx: 0.7, fy: 0.52 }
    ];
    workers.slice(0, 3).forEach((n, i) => {
      const s = spots[i];
      this._drawFigure(ctx, s.fx * W, s.fy * H, n);
      this._drawLabel(ctx, s.fx * W, s.fy * H + 30, `${n.name} · ${n.occupationLabel}`, '#e8e0c8');
    });
  }

  _drawGreeter(ctx, W, H, b) {
    const ids = WORKERS[b.func] || [];
    const greeter = ids.map((occ) => this.game.npcs.find((n) => n.occupation === occ)).find(Boolean);
    const gx = W * 0.14, gy = H * 0.7;
    if (greeter) this._drawFigure(ctx, gx, gy, greeter, 1.15);
    else this._drawFigure(ctx, gx, gy, { gender: 'neutral', skinTone: '#e8c39a', hairColor: '#4a3624', clothColor: '#7a6a4a', age: 40 }, 1.15);
    const line = GREETINGS[b.func] || '';
    if (line) this._bubble(ctx, gx + 40, gy - 66, line, 340);
  }

  _drawHotspot(ctx, s, W, H, hover) {
    const x = s.fx * W, y = s.fy * H, w = s.fw * W, h = s.fh * H;
    ctx.save();
    ctx.fillStyle = hover ? 'rgba(216,168,74,0.28)' : 'rgba(20,16,12,0.55)';
    ctx.strokeStyle = hover ? '#ffd76a' : 'rgba(216,168,74,0.7)';
    ctx.lineWidth = hover ? 2.5 : 1.5;
    ctx.beginPath();
    const r = 8;
    ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h);
    ctx.fill(); ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = hover ? '#fff' : '#f0e6d0';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(s.label, x + w / 2, y + h / 2 - 6);
    if (s.sub) {
      ctx.fillStyle = hover ? '#ffe0b0' : '#b8a888';
      ctx.font = '10px sans-serif';
      ctx.fillText(s.sub, x + w / 2, y + h / 2 + 12);
    }
    ctx.restore();
  }

  // ---- primitive drawing helpers ----
  _window(ctx, x, y, w, h, theme) {
    ctx.fillStyle = '#2a3a4a';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(160,200,240,0.35)';
    ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
    ctx.strokeStyle = theme.wood; ctx.lineWidth = 4;
    ctx.strokeRect(x, y, w, h);
    ctx.beginPath(); ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y + h / 2); ctx.stroke();
  }
  _rug(ctx, x, y, w, h, accent) {
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#7a4a3a';
    ctx.beginPath(); ctx.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = accent; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(x, y, w / 2 - 10, h / 2 - 8, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  _door(ctx, x, y, w, h, theme) {
    ctx.fillStyle = theme.wood;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = '#d8c06a';
    ctx.beginPath(); ctx.arc(x + w - 8, y + h / 2, 3, 0, Math.PI * 2); ctx.fill();
  }

  _drawFigure(ctx, x, y, n, scale = 1.35) {
    const s = 11;
    const skin = n.skinTone || '#e8c39a';
    const hair = n.hairColor || '#4a3624';
    const cloth = n.clothColor || '#7a6a4a';
    const female = n.gender === 'female' && (n.age == null || n.age >= 14);
    const child = n.age != null && n.age < 14;
    ctx.save();
    ctx.translate(x, y);
    // shadow
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

  _bubble(ctx, x, y, text, maxW) {
    ctx.save();
    ctx.font = '12px sans-serif';
    const words = text.split(' ');
    const lines = [];
    let line = '';
    for (const w of words) {
      if (ctx.measureText(line + w).width > maxW) { lines.push(line); line = w; }
      else line = line ? line + ' ' + w : w;
    }
    if (line) lines.push(line);
    const lh = 16, pad = 12;
    const bw = Math.min(maxW, Math.max(...lines.map((l) => ctx.measureText(l).width))) + pad * 2;
    const bh = lines.length * lh + pad * 2;
    ctx.fillStyle = 'rgba(255,252,245,0.95)';
    ctx.strokeStyle = '#6a4a2a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const r = 8;
    if (ctx.roundRect) ctx.roundRect(x, y, bw, bh, r); else ctx.rect(x, y, bw, bh);
    ctx.fill(); ctx.stroke();
    // tail
    ctx.beginPath(); ctx.moveTo(x + 10, y + bh); ctx.lineTo(x + 2, y + bh + 14); ctx.lineTo(x + 26, y + bh); ctx.closePath();
    ctx.fillStyle = 'rgba(255,252,245,0.95)'; ctx.fill();
    ctx.fillStyle = '#3a2a18';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    lines.forEach((l, i) => ctx.fillText(l, x + pad, y + pad + i * lh));
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

// ---- furniture + hotspots per building type ----
function drawFurniture(ctx, W, H, func, t) {
  const fx = (v) => v * W, fy = (v) => v * H;
  switch (func) {
    case 'guild': {
      // reception counter + quest board + fire
      counter(ctx, fx(0.18), fy(0.42), fx(0.2), fy(0.16), t);
      board(ctx, fx(0.62), fy(0.18), fx(0.14), fy(0.24), t);
      hearth(ctx, fx(0.82), fy(0.5), fx(0.14), fy(0.2), t);
      break;
    }
    case 'lodge':
      counter(ctx, fx(0.2), fy(0.42), fx(0.2), fy(0.16), t);
      trophyWall(ctx, fx(0.6), fy(0.16), fx(0.24), fy(0.2), t);
      table(ctx, fx(0.66), fy(0.7), 40, t);
      break;
    case 'blacksmith':
      forge(ctx, fx(0.5), fy(0.5), t);
      weaponRack(ctx, fx(0.22), fy(0.34), t);
      counter(ctx, fx(0.72), fy(0.5), fx(0.14), fy(0.16), t);
      break;
    case 'weaponshop':
      weaponRack(ctx, fx(0.35), fy(0.3), t);
      weaponRack(ctx, fx(0.55), fy(0.3), t);
      counter(ctx, fx(0.3), fy(0.52), fx(0.28), fy(0.16), t);
      break;
    case 'armorshop':
      armorStand(ctx, fx(0.3), fy(0.4), t);
      armorStand(ctx, fx(0.52), fy(0.4), t);
      counter(ctx, fx(0.7), fy(0.5), fx(0.16), fy(0.16), t);
      break;
    case 'general':
      shelf(ctx, fx(0.24), fy(0.18), fx(0.2), fy(0.24), t);
      shelf(ctx, fx(0.5), fy(0.18), fx(0.2), fy(0.24), t);
      counter(ctx, fx(0.3), fy(0.52), fx(0.26), fy(0.16), t);
      break;
    case 'foodshop':
      shelf(ctx, fx(0.26), fy(0.16), fx(0.22), fy(0.26), t, '#c86a3a');
      table(ctx, fx(0.6), fy(0.62), 34, t);
      counter(ctx, fx(0.64), fy(0.4), fx(0.18), fy(0.16), t);
      break;
    case 'inn':
      counter(ctx, fx(0.18), fy(0.42), fx(0.18), fy(0.16), t);
      bed(ctx, fx(0.52), fy(0.42), 90, t);
      bed(ctx, fx(0.72), fy(0.42), 90, t);
      hearth(ctx, fx(0.4), fy(0.68), fx(0.12), fy(0.16), t);
      break;
    case 'tavern':
      counter(ctx, fx(0.2), fy(0.4), fx(0.28), fy(0.14), t);
      barrel(ctx, fx(0.16), fy(0.62), t);
      barrel(ctx, fx(0.24), fy(0.62), t);
      table(ctx, fx(0.6), fy(0.6), 40, t);
      table(ctx, fx(0.78), fy(0.6), 40, t);
      break;
    case 'market':
      stall(ctx, fx(0.24), fy(0.4), fx(0.18), t);
      stall(ctx, fx(0.46), fy(0.4), fx(0.18), t);
      stall(ctx, fx(0.68), fy(0.4), fx(0.18), t);
      break;
    case 'healer':
      shelf(ctx, fx(0.24), fy(0.18), fx(0.18), fy(0.24), t, '#5a9a5a');
      bed(ctx, fx(0.56), fy(0.44), 90, t);
      counter(ctx, fx(0.7), fy(0.5), fx(0.16), fy(0.16), t);
      break;
    case 'carpenter':
      woodPile(ctx, fx(0.24), fy(0.6), t);
      bench(ctx, fx(0.5), fy(0.5), t);
      counter(ctx, fx(0.72), fy(0.5), fx(0.14), fy(0.16), t);
      break;
    case 'tailor':
      mannequin(ctx, fx(0.3), fy(0.42), t);
      mannequin(ctx, fx(0.48), fy(0.42), t);
      counter(ctx, fx(0.68), fy(0.5), fx(0.16), fy(0.16), t);
      break;
    case 'stable':
      stall2(ctx, fx(0.3), fy(0.5), t);
      stall2(ctx, fx(0.52), fy(0.5), t);
      hay(ctx, fx(0.74), fy(0.6), t);
      break;
    case 'community':
      bench(ctx, fx(0.3), fy(0.6), t);
      bench(ctx, fx(0.5), fy(0.6), t);
      bench(ctx, fx(0.7), fy(0.6), t);
      banner(ctx, fx(0.44), fy(0.14), fx(0.12), fy(0.2), t);
      break;
    case 'chief':
      desk(ctx, fx(0.4), fy(0.5), t);
      banner(ctx, fx(0.44), fy(0.12), fx(0.12), fy(0.22), t);
      break;
    case 'training':
      dummy(ctx, fx(0.3), fy(0.5), t);
      dummy(ctx, fx(0.42), fy(0.5), t);
      dummy(ctx, fx(0.54), fy(0.5), t);
      weaponRack(ctx, fx(0.72), fy(0.4), t);
      break;
    case 'guard':
      desk(ctx, fx(0.34), fy(0.5), t);
      weaponRack(ctx, fx(0.6), fy(0.36), t);
      banner(ctx, fx(0.5), fy(0.12), fx(0.1), fy(0.18), t);
      break;
    case 'crafting':
      campfire(ctx, fx(0.4), fy(0.62), t);
      bench(ctx, fx(0.62), fy(0.5), t);
      woodPile(ctx, fx(0.76), fy(0.62), t);
      break;
    case 'shrine':
      altar(ctx, fx(0.5), fy(0.5), t);
      break;
    case 'storage':
      crate(ctx, fx(0.24), fy(0.56), t);
      crate(ctx, fx(0.36), fy(0.56), t);
      crate(ctx, fx(0.24), fy(0.42), t);
      barrel(ctx, fx(0.56), fy(0.6), t);
      barrel(ctx, fx(0.66), fy(0.6), t);
      break;
    case 'home':
    case 'house':
      bed(ctx, fx(0.34), fy(0.46), 100, t);
      hearth(ctx, fx(0.68), fy(0.58), fx(0.14), fy(0.18), t);
      table(ctx, fx(0.54), fy(0.7), 36, t);
      break;
    default:
      counter(ctx, fx(0.34), fy(0.48), fx(0.24), fy(0.16), t);
      break;
  }
}

function hotspotsFor(b, g) {
  const shop = (f) => () => { g.ui._shopFunc = f; g.ui._renderShop(); };
  const craft = (f) => () => { g.ui._craftStation = f; g.ui.openMenu('crafting'); };
  const main = () => g.ui.openBuilding(b);
  const exitAfter = (fn) => () => { fn(); g.buildingInterior.exit(); };
  const rest = () => { g.survival.rest(); g.buildingInterior.exit(); };

  switch (b.func) {
    case 'guild': return [
      { id: 'materials', label: 'Submit Materials', sub: 'Trade materials for points & gold', fx: 0.16, fy: 0.42, fw: 0.24, fh: 0.16, action: main },
      { id: 'quests', label: 'Quest Board', sub: 'Get a job · turn in quests', fx: 0.6, fy: 0.18, fw: 0.18, fh: 0.24, action: () => g.ui.openMenu('quests') },
      { id: 'rest', label: 'Rest by the Fire', sub: 'Sit and recover', fx: 0.8, fy: 0.5, fw: 0.16, fh: 0.2, action: rest }
    ];
    case 'lodge': return [
      { id: 'counter', label: 'Buy Supplies', sub: 'Arrows · traps · knives', fx: 0.18, fy: 0.42, fw: 0.24, fh: 0.16, action: main },
      { id: 'tips', label: 'Hunter Tips', sub: 'Talk to the veterans', fx: 0.6, fy: 0.14, fw: 0.26, fh: 0.2, action: () => { const h = g.npcs.find((n) => n.occupation === 'hunter'); if (h) g.ui.openDialogue(h); else g.toast('The hunters are out on the trail.'); } }
    ];
    case 'blacksmith': return [
      { id: 'craft', label: 'Forge', sub: 'Craft & repair weapons', fx: 0.44, fy: 0.42, fw: 0.2, fh: 0.22, action: craft('blacksmith') }
    ];
    case 'weaponshop': return [
      { id: 'buy', label: 'Buy Weapons', sub: 'Swords · bows · axes', fx: 0.3, fy: 0.52, fw: 0.28, fh: 0.16, action: shop('weaponshop') }
    ];
    case 'armorshop': return [
      { id: 'buy', label: 'Buy Armor', sub: 'Head · body · legs · feet', fx: 0.7, fy: 0.5, fw: 0.16, fh: 0.16, action: shop('armorshop') }
    ];
    case 'general': return [
      { id: 'buy', label: 'Buy & Sell', sub: 'General goods', fx: 0.3, fy: 0.52, fw: 0.26, fh: 0.16, action: shop('general') }
    ];
    case 'foodshop': return [
      { id: 'buy', label: 'Buy Food', sub: 'Bread · meals', fx: 0.64, fy: 0.4, fw: 0.18, fh: 0.16, action: shop('foodshop') }
    ];
    case 'inn': return [
      { id: 'sleep', label: 'Sleep at the Inn', sub: 'Rest · wake at dawn', fx: 0.18, fy: 0.42, fw: 0.18, fh: 0.16, action: () => g.ui._renderRest('inn') },
      { id: 'hearth', label: 'Warm Hearth', sub: 'Sit by the fire', fx: 0.38, fy: 0.66, fw: 0.14, fh: 0.18, action: rest }
    ];
    case 'tavern': return [
      { id: 'drink', label: 'Order a Drink', sub: '+6 hunger', fx: 0.2, fy: 0.4, fw: 0.28, fh: 0.14, action: () => { g.player.hunger = Math.min(100, g.player.hunger + 6); g.toast('You sip a warm drink.'); } },
      { id: 'rumors', label: 'Hear Rumors', sub: 'Gossip & news', fx: 0.6, fy: 0.6, fw: 0.16, fh: 0.16, action: () => g.ui._renderTavern() }
    ];
    case 'market': return [
      { id: 'buy', label: 'Buy & Sell Produce', sub: 'The farmers market', fx: 0.24, fy: 0.4, fw: 0.56, fh: 0.18, action: shop('market') }
    ];
    case 'healer': return [
      { id: 'buy', label: 'Buy Medicine', sub: 'Potions & herbs', fx: 0.7, fy: 0.5, fw: 0.16, fh: 0.16, action: shop('healer') }
    ];
    case 'carpenter': return [
      { id: 'craft', label: 'Craft Wooden Gear', sub: 'Bows & tools', fx: 0.72, fy: 0.5, fw: 0.14, fh: 0.16, action: craft('carpenter') }
    ];
    case 'tailor': return [
      { id: 'craft', label: 'Craft Armor & Bags', sub: 'Cloth & leather', fx: 0.68, fy: 0.5, fw: 0.16, fh: 0.16, action: craft('tailor') }
    ];
    case 'home': return [
      { id: 'sleep', label: 'Sleep in your bed', sub: 'Recover fully', fx: 0.32, fy: 0.46, fw: 0.2, fh: 0.16, action: () => g.ui._renderRest('home') }
    ];
    case 'well': return [
      { id: 'drink', label: 'Drink Water', sub: '+6 hunger', fx: 0.42, fy: 0.46, fw: 0.16, fh: 0.16, action: () => { g.player.hunger = Math.min(100, g.player.hunger + 6); g.toast('You drink cool water from the well.'); } }
    ];
    case 'shrine': return [
      { id: 'shrine', label: 'Study the Shrine', sub: 'Learn the old lore', fx: 0.42, fy: 0.42, fw: 0.18, fh: 0.2, action: main }
    ];
    case 'crafting': return [
      { id: 'craft', label: 'Craft at the Campfire', sub: 'Cook & basic gear', fx: 0.34, fy: 0.5, fw: 0.2, fh: 0.18, action: craft('crafting') }
    ];
    default: return [
      { id: 'counter', label: 'Interact', sub: b.name, fx: 0.34, fy: 0.48, fw: 0.24, fh: 0.16, action: main }
    ];
  }
}

// ---- furniture primitives ----
function counter(ctx, x, y, w, h, t) {
  ctx.fillStyle = t.wood;
  ctx.fillRect(x, y + h * 0.25, w, h * 0.75);
  ctx.fillStyle = t.floor;
  ctx.fillRect(x, y, w, h * 0.25);
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 2; ctx.strokeRect(x, y + h * 0.25, w, h * 0.75);
}
function shelf(ctx, x, y, w, h, t, itemColor) {
  ctx.fillStyle = t.wood;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.strokeRect(x, y, w, h);
  const c = itemColor || t.accent;
  for (let row = 0; row < 3; row++) for (let i = 0; i < 6; i++) {
    ctx.fillStyle = c;
    ctx.fillRect(x + 6 + i * (w / 6.4), y + 10 + row * (h / 3.4), w / 11, h / 9);
  }
}
function board(ctx, x, y, w, h, t) {
  ctx.fillStyle = t.wood; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 3; ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = '#f0e6c8';
  for (let i = 0; i < 3; i++) ctx.fillRect(x + 8, y + 10 + i * (h / 3.6), w - 16, 5);
}
function hearth(ctx, x, y, w, h, t) {
  ctx.fillStyle = '#4a3a30'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#2a2018'; ctx.fillRect(x + 6, y + h * 0.4, w - 12, h * 0.6);
  const g = ctx.createRadialGradient(x + w / 2, y + h * 0.6, 4, x + w / 2, y + h * 0.6, h * 0.7);
  g.addColorStop(0, '#ffb040'); g.addColorStop(0.5, '#ff7030'); g.addColorStop(1, 'rgba(255,80,20,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x + w / 2, y + h * 0.6, h * 0.5, 0, Math.PI * 2); ctx.fill();
}
function forge(ctx, x, y, t) {
  // anvil + glowing coals
  ctx.fillStyle = '#3a3a3e';
  ctx.beginPath(); ctx.ellipse(x - 20, y + 10, 26, 14, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(x - 40, y + 4, 16, 10);
  ctx.fillRect(x + 24, y + 4, 16, 10);
  const g = ctx.createRadialGradient(x + 40, y - 10, 4, x + 40, y - 10, 40);
  g.addColorStop(0, '#ffc060'); g.addColorStop(0.6, '#ff6030'); g.addColorStop(1, 'rgba(255,60,20,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x + 40, y - 10, 40, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#202020';
  ctx.beginPath(); ctx.ellipse(x + 40, y - 10, 14, 7, 0, 0, Math.PI * 2); ctx.fill();
}
function weaponRack(ctx, x, y, t) {
  ctx.strokeStyle = t.wood; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(x - 30, y + 40); ctx.lineTo(x, y); ctx.lineTo(x + 30, y + 40); ctx.stroke();
  ctx.fillStyle = '#c8d0d8';
  for (let i = 0; i < 4; i++) {
    ctx.save(); ctx.translate(x - 18 + i * 12, y + 8); ctx.rotate(0.3);
    ctx.fillRect(0, -2, 22, 4); ctx.fillStyle = '#8a6a40'; ctx.fillRect(0, -6, 5, 10); ctx.fillStyle = '#c8d0d8';
    ctx.restore();
  }
}
function armorStand(ctx, x, y, t) {
  ctx.strokeStyle = t.wood; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 44); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 16, y + 20); ctx.lineTo(x + 16, y + 20); ctx.stroke();
  ctx.fillStyle = '#5a6a7a';
  ctx.beginPath(); ctx.arc(x, y - 4, 11, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#4a5a68';
  ctx.fillRect(x - 11, y + 4, 22, 18);
}
function bed(ctx, x, y, w, t) {
  ctx.fillStyle = t.wood; ctx.fillRect(x - w / 2, y - 8, w, 10);
  ctx.fillStyle = '#e8e0d0'; ctx.fillRect(x - w / 2 + 4, y - 8, w - 8, 26);
  ctx.fillStyle = '#c84a3a'; ctx.fillRect(x - w / 2 + 4, y - 8, w - 8, 12);
  ctx.fillStyle = '#e8d8c0'; ctx.fillRect(x - w / 2, y + 18, 12, 8); ctx.fillRect(x + w / 2 - 12, y + 18, 12, 8);
}
function table(ctx, x, y, r, t) {
  ctx.fillStyle = t.wood;
  ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#5a4228'; ctx.fillRect(x - 4, y + r * 0.4, 8, 20);
}
function barrel(ctx, x, y, t) {
  ctx.fillStyle = t.wood;
  ctx.fillRect(x - 14, y - 20, 28, 44);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x - 14, y - 14 + i * 10); ctx.lineTo(x + 14, y - 14 + i * 10); ctx.stroke(); }
}
function crate(ctx, x, y, t) {
  ctx.fillStyle = t.wood;
  ctx.fillRect(x - 14, y - 14, 28, 28);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2; ctx.strokeRect(x - 14, y - 14, 28, 28);
  ctx.beginPath(); ctx.moveTo(x - 14, y - 14); ctx.lineTo(x + 14, y + 14); ctx.moveTo(x + 14, y - 14); ctx.lineTo(x - 14, y + 14); ctx.stroke();
}
function stall(ctx, x, y, w, t) {
  ctx.fillStyle = t.wood; ctx.fillRect(x - w / 2, y, w, 6);
  ctx.fillStyle = t.floor; ctx.fillRect(x - w / 2, y + 6, w, 12);
  ctx.fillStyle = '#c84a3a'; ctx.beginPath(); ctx.arc(x - w / 4, y - 6, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e0a83a'; ctx.beginPath(); ctx.arc(x, y - 8, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#5a9a3a'; ctx.beginPath(); ctx.arc(x + w / 4, y - 6, 8, 0, Math.PI * 2); ctx.fill();
}
function bench(ctx, x, y, t) {
  ctx.fillStyle = t.wood; ctx.fillRect(x - 26, y - 8, 52, 10);
  ctx.fillStyle = '#5a4228'; ctx.fillRect(x - 20, y + 2, 8, 16); ctx.fillRect(x + 12, y + 2, 8, 16);
}
function woodPile(ctx, x, y, t) {
  ctx.fillStyle = t.wood;
  for (let i = 0; i < 5; i++) ctx.beginPath(), ctx.ellipse(x - 20 + i * 10, y - 6 * (i % 2), 6, 10, 0, 0, Math.PI * 2), ctx.fill();
}
function mannequin(ctx, x, y, t) {
  ctx.strokeStyle = t.wood; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 44); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 16, y + 20); ctx.lineTo(x + 16, y + 20); ctx.stroke();
  ctx.fillStyle = '#c8b0c8';
  ctx.beginPath(); ctx.arc(x, y - 4, 11, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(x - 11, y + 4, 22, 18);
}
function hay(ctx, x, y, t) {
  ctx.fillStyle = '#d0b050';
  ctx.beginPath(); ctx.ellipse(x, y, 22, 14, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#b09030'; ctx.lineWidth = 2;
  for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(x + i * 8, y - 12); ctx.lineTo(x + i * 6, y + 10); ctx.stroke(); }
}
function stall2(ctx, x, y, t) {
  ctx.fillStyle = t.wood; ctx.fillRect(x - 26, y - 6, 52, 8);
  ctx.fillStyle = '#6a5638'; ctx.fillRect(x - 26, y + 2, 6, 30); ctx.fillRect(x + 20, y + 2, 6, 30);
}
function dummy(ctx, x, y, t) {
  ctx.fillStyle = t.wood; ctx.fillRect(x - 4, y - 10, 8, 40);
  ctx.fillStyle = '#c8a86a';
  ctx.beginPath(); ctx.ellipse(x, y - 6, 14, 18, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#5a4a30'; ctx.fillRect(x - 4, y - 40, 8, 30);
}
function banner(ctx, x, y, w, h, t) {
  ctx.fillStyle = t.accent;
  ctx.fillRect(x - w / 2, y, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath(); ctx.moveTo(x - w / 2, y + h); ctx.lineTo(x, y + h / 2); ctx.lineTo(x + w / 2, y + h); ctx.closePath(); ctx.fill();
}
function desk(ctx, x, y, t) {
  ctx.fillStyle = t.wood; ctx.fillRect(x - 30, y, 60, 8);
  ctx.fillStyle = '#5a4228'; ctx.fillRect(x - 26, y + 8, 8, 30); ctx.fillRect(x + 18, y + 8, 8, 30);
}
function campfire(ctx, x, y, t) {
  const g = ctx.createRadialGradient(x, y, 4, x, y, 36);
  g.addColorStop(0, '#ffe080'); g.addColorStop(0.6, '#ff8030'); g.addColorStop(1, 'rgba(255,90,20,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 36, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 4;
  for (let i = 0; i < 5; i++) { const a = i * 1.26; ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.lineTo(x + Math.cos(a) * 16, y - 22 - Math.sin(a) * 8); ctx.stroke(); }
}
function altar(ctx, x, y, t) {
  ctx.fillStyle = '#6a6a74'; ctx.fillRect(x - 20, y - 6, 40, 10);
  ctx.fillStyle = '#4a4a54'; ctx.fillRect(x - 16, y + 4, 8, 22); ctx.fillRect(x + 8, y + 4, 8, 22);
  const g = ctx.createRadialGradient(x, y - 8, 2, x, y - 8, 28);
  g.addColorStop(0, '#e8f0ff'); g.addColorStop(1, 'rgba(200,220,255,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y - 8, 28, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffe08a';
  ctx.beginPath(); ctx.arc(x - 8, y - 16, 3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 8, y - 16, 3, 0, Math.PI * 2); ctx.fill();
}
function trophyWall(ctx, x, y, w, h, t) {
  ctx.fillStyle = t.wood; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = '#d8b84a';
  for (let i = 0; i < 4; i++) ctx.beginPath(), ctx.arc(x + w / 5 + i * w / 5, y + h * 0.5, 8, 0, Math.PI * 2), ctx.fill();
}
