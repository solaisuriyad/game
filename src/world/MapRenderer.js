import { T, TILE, WORLD_W, WORLD_H } from './WorldSystem.js';

const GRASS = ['#3f7033', '#437437', '#3c6b31', '#477c39'];
const PATH = '#b8a06a';
const FARM = ['#6b4a2a', '#75532f'];
const WATER = '#3a6a8a';
const SAND = '#cbb88a';
const FLOOR = '#8a7a5a';

export class MapRenderer {
  constructor(game) { this.game = game; }

  render(ctx, game) {
    const cam = game.camera;
    const off = cam.getOffset();
    ctx.save();
    ctx.translate(off.x, off.y);
    ctx.scale(cam.zoom, cam.zoom); // camera zoom (mouse wheel)
    this._drawTiles(ctx, game);
    this._drawNodes(ctx, game);
    this._drawBuildings(ctx, game);
    this._drawTrails(ctx, game);
    this._drawCorpsesAndTraps(ctx, game);
    this._drawDrops(ctx, game);
    this._drawEntities(ctx, game);
    this._drawProjectiles(ctx, game);
    // floating damage/text (world-space)
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    for (const ft of game.floatTexts) {
      ctx.fillStyle = ft.color;
      ctx.globalAlpha = Math.max(0, Math.min(1, ft.t));
      ctx.fillText(ft.text, ft.x - cam.x, ft.y - cam.y);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
    ctx.restore();
    this._drawWeatherAndLight(ctx, game, off);
  }

  _tileColor(tx, ty, t) {
    const h = (tx * 7 + ty * 13) % 4;
    switch (t) {
      case T.GRASS: return GRASS[h];
      case T.PATH: return PATH;
      case T.FARM: return FARM[(tx + ty) % 2];
      case T.WATER: return WATER;
      case T.SAND: return SAND;
      case T.FLOOR: return FLOOR;
      case T.FLOWER: return GRASS[h];
      case T.SNOW: return ['#e8ecee', '#dfe5e8', '#e4eaec', '#eef0f2'][h]; // snow field
      case T.MOUNTAIN: return ['#6a6258', '#5f5850', '#665e54', '#71685c'][h]; // rocky peak
      default: return GRASS[h];
    }
  }

  _drawTiles(ctx, game) {
    const cam = game.camera;
    const t0x = Math.max(0, Math.floor(cam.x / TILE));
    const t0y = Math.max(0, Math.floor(cam.y / TILE));
    const t1x = Math.min(WORLD_W - 1, Math.ceil((cam.x + cam.vw) / TILE));
    const t1y = Math.min(WORLD_H - 1, Math.ceil((cam.y + cam.vh) / TILE));
    const w = game.world;
    for (let ty = t0y; ty <= t1y; ty++) {
      for (let tx = t0x; tx <= t1x; tx++) {
        const t = w.tileAt(tx, ty);
        const color = this._tileColor(tx, ty, t);
        const sx = tx * TILE - cam.x, sy = ty * TILE - cam.y;
        if (t === T.WATER) {
          ctx.fillStyle = WATER;
          ctx.fillRect(sx, sy, TILE, TILE);
          ctx.fillStyle = 'rgba(120,170,200,0.25)';
          const wv = Math.sin(game.time.timeOfDay * 60 + tx * 0.8 + ty) * 4;
          ctx.fillRect(sx + 4 + wv, sy + 6, TILE - 8, 2);
        } else {
          ctx.fillStyle = color;
          ctx.fillRect(sx, sy, TILE, TILE);
          if (t === T.FARM) {
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            ctx.fillRect(sx, sy + TILE / 2 - 1, TILE, 2);
          }
          if (t === T.FLOWER) {
            ctx.fillStyle = ['#e8d06a', '#d87ab0', '#e88a5a'][(tx + ty * 3) % 3];
            ctx.beginPath(); ctx.arc(sx + 8 + ((tx * 5) % 14), sy + 8 + ((ty * 7) % 14), 2.5, 0, Math.PI * 2); ctx.fill();
          }
        }
      }
    }
    // static colliders (trees, rocks, bushes) in view
    for (const c of w.collidersNear(cam.x + cam.vw / 2, cam.y + cam.vh / 2, cam.vw / 2 + 60)) {
      const sx = c.x - cam.x, sy = c.y - cam.y;
      if (c.type === 'tree') {
        this._drawTree(ctx, sx + c.w / 2, sy + c.h / 2, c.dark, c.depleted, c.variant, c.size, c.snowy);
      } else if (c.type === 'yggdrasil') {
        this._drawYggdrasil(ctx, sx + c.w / 2, sy + c.h / 2, c);
      } else if (c.type === 'mountain') {
        this._drawMountain(ctx, sx + c.w / 2, sy + c.h / 2, c.mountain);
      } else if (c.type === 'rock') {
        ctx.fillStyle = c.depleted ? '#5a5a55' : '#7a7a78';
        ctx.beginPath();
        ctx.moveTo(sx, sy + 24); ctx.lineTo(sx + 8, sy + 6); ctx.lineTo(sx + 20, sy + 2); ctx.lineTo(sx + 24, sy + 24); ctx.closePath(); ctx.fill();
      } else if (c.type === 'bush') {
        ctx.fillStyle = c.depleted ? '#4a5a3a' : '#5a7a40';
        ctx.beginPath(); ctx.arc(sx + 10, sy + 10, 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = c.depleted ? '#3a4a2a' : '#7a4a3a';
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(sx + 4 + i * 6, sy + 6 + (i % 2) * 4, 2, 0, Math.PI * 2); ctx.fill(); }
      }
    }
  }

  _drawTree(ctx, x, y, dark, depleted, variant = 0, size = 1, snowy = false) {
    // scale up big trees (occupy multiple tiles)
    const k = size;
    if (depleted) {
      ctx.fillStyle = '#8a6a3a';
      ctx.beginPath(); ctx.ellipse(x, y + 4, 7 * k, 5 * k, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#6a4e2a';
      ctx.beginPath(); ctx.ellipse(x, y + 4, 5 * k, 3 * k, 0, 0, Math.PI * 2); ctx.fill();
      return;
    }
    // palette per variant: oak / pine / birch / autumn / willow / crimson / goldleaf
    const LEAF = [
      { canopy: '#3f7a35', highlight: '#5a9a4a', shape: 'round' },
      { canopy: '#2a5a33', highlight: '#3a7a46', shape: 'pine' },
      { canopy: '#7a9a3a', highlight: '#a8c46a', shape: 'round' },
      { canopy: '#c0682a', highlight: '#e09a4a', shape: 'round' },
      { canopy: '#4a8a4a', highlight: '#6aaa5a', shape: 'willow' },
      { canopy: '#8a3040', highlight: '#c04a5a', shape: 'round' },
      { canopy: '#c8a030', highlight: '#e8c85a', shape: 'round' }
    ][variant] || { canopy: '#3f7a35', highlight: '#5a9a4a', shape: 'round' };
    // snowy trees: white canopy (pine shape keeps the snow look)
    if (snowy) { LEAF.canopy = '#e8eef0'; LEAF.highlight = '#ffffff'; LEAF.shape = 'pine'; }
    const col = dark ? this._darken(LEAF.canopy) : LEAF.canopy;
    ctx.fillStyle = '#4a3a26';
    ctx.fillRect(x - 2 * k, y + 2 * k, 4 * k, 10 * k);
    if (LEAF.shape === 'pine') {
      ctx.fillStyle = col;
      for (let i = 0; i < 3 + k; i++) {
        const w = (14 - i * 2.5) * k, yy = y - 2 * k - i * 6 * k;
        ctx.beginPath();
        ctx.moveTo(x, yy - 8 * k); ctx.lineTo(x - w, yy + 4 * k); ctx.lineTo(x + w, yy + 4 * k); ctx.closePath();
        ctx.fill();
      }
    } else if (LEAF.shape === 'willow') {
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(x, y - 6 * k, 11 * k, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = col; ctx.lineWidth = 2 * k;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath(); ctx.moveTo(x + i * 4 * k, y - 2 * k); ctx.lineTo(x + i * 5 * k, y + 10 * k); ctx.stroke();
      }
    } else {
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(x, y - 4 * k, 12 * k, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = LEAF.highlight;
      ctx.beginPath(); ctx.arc(x - 3 * k, y - 7 * k, 5 * k, 0, Math.PI * 2); ctx.fill();
    }
  }

  _darken(hex) {
    if (!hex) return '#2a4a2a';
    const n = parseInt(hex.slice(1), 16);
    const r = Math.max(0, ((n >> 16) & 255) - 40);
    const g = Math.max(0, ((n >> 8) & 255) - 40);
    const b = Math.max(0, (n & 255) - 40);
    return `rgb(${r},${g},${b})`;
  }

  // a mountain (top-down view): a big rocky peak with a snow cap + waterfall mark
  _drawMountain(ctx, x, y, m) {
    const r = m.r;
    // rocky base (irregular blob)
    ctx.fillStyle = m.snowy ? '#8a8a92' : '#6a6258';
    ctx.beginPath();
    ctx.moveTo(x - r, y + r * 0.2);
    ctx.quadraticCurveTo(x - r * 0.6, y - r, x, y - r * 0.9);
    ctx.quadraticCurveTo(x + r * 0.6, y - r, x + r, y + r * 0.2);
    ctx.quadraticCurveTo(x + r * 0.5, y + r, x, y + r * 0.8);
    ctx.quadraticCurveTo(x - r * 0.5, y + r, x - r, y + r * 0.2);
    ctx.closePath(); ctx.fill();
    // inner shading
    ctx.fillStyle = m.snowy ? '#7a7a84' : '#5a5248';
    ctx.beginPath(); ctx.arc(x, y + r * 0.15, r * 0.55, 0, Math.PI * 2); ctx.fill();
    // snow cap
    if (m.snowy) {
      ctx.fillStyle = '#f2f5f7';
      ctx.beginPath(); ctx.arc(x - r * 0.1, y - r * 0.15, r * 0.34, 0, Math.PI * 2); ctx.fill();
    }
    // waterfall (blue streak down the south side)
    if (m.waterfall) {
      ctx.fillStyle = '#4aa8e0';
      ctx.beginPath(); ctx.ellipse(x + r * 0.3, y + r * 0.5, r * 0.16, r * 0.3, 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#7ac8f0';
      ctx.beginPath(); ctx.ellipse(x + r * 0.3, y + r * 0.5, r * 0.08, r * 0.2, 0.4, 0, Math.PI * 2); ctx.fill();
    }
  }

  // The Yggdrasil — a colossal 9-color world tree that powers the deep forest.
  _drawYggdrasil(ctx, x, y, c) {
    const t = this.game.time.timeOfDay;
    const COLORS = ['#ff5040', '#ffa030', '#ffe040', '#7ae040', '#40e0a0', '#40c0e0', '#5070ff', '#a050ff', '#ff50c0'];
    const S = c.w / 2; // half footprint (massive)
    // colossal trunk
    ctx.fillStyle = '#4a3220';
    ctx.fillRect(x - S * 0.28, y - S * 0.6, S * 0.56, S * 1.4);
    ctx.fillStyle = '#6a4a2c';
    ctx.fillRect(x - S * 0.16, y - S * 0.6, S * 0.16, S * 1.4);
    // giant roots
    ctx.strokeStyle = '#4a3220'; ctx.lineWidth = S * 0.12;
    for (let i = -1; i <= 1; i += 2) {
      ctx.beginPath(); ctx.moveTo(x, y + S * 0.3); ctx.quadraticCurveTo(x + i * S * 0.7, y + S * 0.5, x + i * S * 0.9, y + S * 0.7); ctx.stroke();
    }
    // layered canopy — each ring a different color, slowly pulsing + rotating
    const rot = t * 0.05;
    for (let i = 0; i < COLORS.length; i++) {
      const r = S * (1.05 - i * 0.08);
      const pulse = 1 + Math.sin(t * 60 + i * 0.8) * 0.05;
      ctx.fillStyle = COLORS[i];
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      // draw the canopy as a cluster of lobes so it looks organic
      for (let k = 0; k < 7; k++) {
        const a = rot + (k / 7) * Math.PI * 2;
        const lx = x + Math.cos(a) * r * 0.45;
        const ly = y - S * 0.7 + Math.sin(a) * r * 0.45;
        ctx.moveTo(lx + r * 0.4, ly);
        ctx.arc(lx, ly, r * 0.42 * pulse, 0, Math.PI * 2);
      }
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // radiant glow
    const g = ctx.createRadialGradient(x, y - S * 0.6, 10, x, y - S * 0.6, S * 1.3);
    g.addColorStop(0, 'rgba(255,255,255,0.6)');
    g.addColorStop(0.4, 'rgba(255,230,160,0.15)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y - S * 0.6, S * 1.3, 0, Math.PI * 2); ctx.fill();
    // floating light motes
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (let i = 0; i < 14; i++) {
      const a = t * 1.5 + i * 2.4;
      const mx = x + Math.cos(a) * S * 0.7;
      const my = y - S * 0.4 + Math.sin(a * 1.7) * S * 0.5;
      ctx.beginPath(); ctx.arc(mx, my, 2.5, 0, Math.PI * 2); ctx.fill();
    }
  }

  _drawNodes(ctx, game) {
    const cam = game.camera;
    // in co-op, resources are server-authoritative (remoteResources)
    const nodes = game.multiplayer.connected ? game.remoteResources : game.world.nodes;
    for (const n of nodes) {
      if (n.depleted) continue;
      const sx = n.x - cam.x, sy = n.y - cam.y;
      if (sx < -20 || sy < -20 || sx > cam.vw + 20 || sy > cam.vh + 20) continue;
      switch (n.kind) {
        case 'herb': ctx.fillStyle = '#5fbf5f'; ctx.beginPath(); ctx.arc(sx, sy, 5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#3a7a3a'; ctx.fillRect(sx - 1, sy + 2, 2, 8); break;
        case 'mushroom': ctx.fillStyle = '#c8c8c8'; ctx.beginPath(); ctx.arc(sx, sy - 2, 5, Math.PI, 0); ctx.fill();
          ctx.fillStyle = '#b0a0a0'; ctx.fillRect(sx - 2, sy - 2, 4, 5); break;
        case 'berry': ctx.fillStyle = '#d04040'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(sx - 3 + i * 3, sy, 2.5, 0, Math.PI * 2); ctx.fill(); } break;
        case 'flower': ctx.fillStyle = '#e8a0d0'; ctx.beginPath(); ctx.arc(sx, sy, 4, 0, Math.PI * 2); ctx.fill(); break;
        case 'ore': break; // rock drawn as collider
      }
    }
  }

  _drawBuildings(ctx, game) {
    const cam = game.camera;
    for (const b of game.world.buildings) {
      const sx = b.x - cam.x, sy = b.y - cam.y;
      if (sx > cam.vw + 20 || sy > cam.vh + 20 || sx + b.w < -20 || sy + b.h < -20) continue;
      const bd = b.building;
      if (bd.func === 'watchtower') { this._drawWatchtower(ctx, sx, sy, b); continue; }
      if (bd.func === 'temple') { this._drawTemple(ctx, sx, sy, b); continue; }
      if (bd.func === 'playground') { this._drawPlayground(ctx, sx, sy, b); continue; }
      // walls
      ctx.fillStyle = '#9a8a6a';
      ctx.fillRect(sx, sy, b.w, b.h);
      // roof
      ctx.fillStyle = bd.color;
      ctx.beginPath();
      ctx.moveTo(sx - 6, sy + 6); ctx.lineTo(sx + b.w / 2, sy - 12); ctx.lineTo(sx + b.w + 6, sy + 6); ctx.closePath(); ctx.fill();
      // body shading
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(sx, sy + 6, b.w, b.h - 6);
      // door
      ctx.fillStyle = '#4a3a26';
      ctx.fillRect(sx + b.w / 2 - 5, sy + b.h - 16, 10, 16);
      // label for functional buildings
      if (bd.func !== 'house') {
        ctx.fillStyle = '#f5f0e0';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(bd.name, sx + b.w / 2, sy + b.h + 14);
      }
    }
  }

  // a tall stone watchtower with battlements + a flag
  _drawWatchtower(ctx, sx, sy, b) {
    const w = b.w, h = b.h;
    // tall body
    ctx.fillStyle = '#7a7a72';
    ctx.fillRect(sx + w * 0.18, sy - 24, w * 0.64, h + 24);
    ctx.fillStyle = '#6a6a62';
    ctx.fillRect(sx + w * 0.3, sy - 24, w * 0.1, h + 24);
    // battlements (crenellations)
    ctx.fillStyle = '#7a7a72';
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(sx + w * 0.18 + i * (w * 0.24), sy - 34, w * 0.12, 10);
    }
    // doorway
    ctx.fillStyle = '#3a3a34';
    ctx.fillRect(sx + w / 2 - 6, sy + h - 20, 12, 20);
    // flag
    ctx.fillStyle = '#5a4a2a';
    ctx.fillRect(sx + w / 2 - 1, sy - 34, 2, 22);
    ctx.fillStyle = '#c04a3a';
    ctx.beginPath();
    ctx.moveTo(sx + w / 2 + 1, sy - 34); ctx.lineTo(sx + w / 2 + 16, sy - 28); ctx.lineTo(sx + w / 2 + 1, sy - 22);
    ctx.closePath(); ctx.fill();
    // label
    ctx.fillStyle = '#f5f0e0';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Watchtower', sx + w / 2, sy + h + 10);
  }

  // the temple — a black shrine with a tall gopuram-style spire
  _drawTemple(ctx, sx, sy, b) {
    const w = b.w, h = b.h;
    // black stone body
    ctx.fillStyle = '#181820';
    ctx.fillRect(sx, sy, w, h);
    ctx.fillStyle = '#10101a';
    ctx.fillRect(sx, sy + h - 8, w, 8);
    // tiered black spire with a faint golden trim
    ctx.fillStyle = '#14141c';
    for (let i = 0; i < 3; i++) {
      const tierW = w * (0.7 - i * 0.16);
      const tierY = sy - (i + 1) * 12 - i * 4;
      ctx.beginPath();
      ctx.moveTo(sx + w / 2 - tierW / 2, tierY + 12);
      ctx.lineTo(sx + w / 2, tierY);
      ctx.lineTo(sx + w / 2 + tierW / 2, tierY + 12);
      ctx.closePath(); ctx.fill();
    }
    // kalasha (gold finial)
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath(); ctx.arc(sx + w / 2, sy - 46, 5, 0, Math.PI * 2); ctx.fill();
    // a thin saffron band (trim) around the base of each tier
    ctx.fillStyle = '#c08030';
    for (let i = 0; i < 3; i++) {
      const tierW = w * (0.7 - i * 0.16);
      const tierY = sy - (i + 1) * 12 - i * 4;
      ctx.fillRect(sx + w / 2 - tierW / 2, tierY + 9, tierW, 2);
    }
    // door (deep black, arched with a gold sill)
    ctx.fillStyle = '#000000';
    ctx.fillRect(sx + w / 2 - 8, sy + h - 20, 16, 20);
    ctx.fillStyle = '#c08030';
    ctx.fillRect(sx + w / 2 - 8, sy + h - 2, 16, 2);
    // label
    ctx.fillStyle = '#ffd76a';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Temple', sx + w / 2, sy + h + 10);
  }

  // the playground — an open fenced area with a swing
  _drawPlayground(ctx, sx, sy, b) {
    const w = b.w, h = b.h;
    // sand/grass base
    ctx.fillStyle = '#6a8a4a';
    ctx.fillRect(sx, sy, w, h);
    ctx.fillStyle = '#c8b060';
    ctx.fillRect(sx + 2, sy + 2, w - 4, h - 4);
    // fence posts
    ctx.strokeStyle = '#7a5c3a';
    ctx.lineWidth = 2;
    ctx.strokeRect(sx + 2, sy + 2, w - 4, h - 4);
    // swing
    ctx.strokeStyle = '#5a4228'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(sx + w * 0.35, sy + 4); ctx.lineTo(sx + w * 0.5, sy + h * 0.4); ctx.lineTo(sx + w * 0.65, sy + 4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx + w * 0.5, sy + h * 0.4); ctx.lineTo(sx + w * 0.5, sy + h * 0.7); ctx.stroke();
    ctx.fillStyle = '#5a4228';
    ctx.fillRect(sx + w * 0.44, sy + h * 0.7, w * 0.12, 4);
    // label
    ctx.fillStyle = '#f0e6d0';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Playground', sx + w / 2, sy + h + 10);
  }

  _drawTrails(ctx, game) {
    const cam = game.camera;
    const tracking = game.player.tracking;
    const trackRange = 80 * (1 + (game.skills.getEffect('trackingRange') || 0));
    for (const a of game.animals) {
      if (!a.trail || a.dead) continue;
      if (a.distTo(game.player) > trackRange * 1.6) continue;
      const trail = a.trail;
      for (let i = 0; i < trail.length; i++) {
        const tr = trail[i];
        if (tr.t > 22) continue;
        const age = Math.max(0, 1 - tr.t / 22);
        const alpha = (tracking ? 0.9 : 0.5) * age;
        const sx = tr.x - cam.x, sy = tr.y - cam.y;
        if (tracking) {
          // draw direction ticks toward the next footprint
          const nxt = trail[i + 1];
          if (nxt && nxt.t < 22) {
            const ang = Math.atan2(nxt.y - tr.y, nxt.x - tr.x);
            ctx.strokeStyle = tr.blood ? `rgba(255,80,80,${alpha})` : `rgba(230,200,120,${alpha})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx + Math.cos(ang) * 7, sy + Math.sin(ang) * 7);
            ctx.stroke();
          }
        }
        ctx.fillStyle = tr.blood ? `rgba(190,30,30,${alpha})` : `rgba(120,90,50,${alpha})`;
        ctx.beginPath(); ctx.arc(sx, sy, tr.blood ? 2.6 : 1.9, 0, Math.PI * 2); ctx.fill();
      }
      // wounded animal: pulsing blood trail end marker
      if (tracking && a.hp < a.maxHp * 0.5) {
        const sx = a.x - cam.x, sy = a.y - cam.y;
        const pulse = 4 + Math.sin(game.time.timeOfDay * 80) * 1.5;
        ctx.strokeStyle = 'rgba(255,60,60,0.8)';
        ctx.beginPath(); ctx.arc(sx, sy, pulse, 0, Math.PI * 2); ctx.stroke();
      }
    }
  }

  _drawCorpsesAndTraps(ctx, game) {
    const cam = game.camera;
    for (const c of game.corpses) {
      const sx = c.x - cam.x, sy = c.y - cam.y;
      if (sx < -30 || sy < -30 || sx > cam.vw + 30 || sy > cam.vh + 30) continue;
      ctx.fillStyle = c.def.color || '#8a6a4a';
      ctx.beginPath(); ctx.ellipse(sx, sy, c.def.size, c.def.size * 0.6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#4a2020'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(sx - 6, sy - 6); ctx.lineTo(sx + 6, sy + 6); ctx.moveTo(sx + 6, sy - 6); ctx.lineTo(sx - 6, sy + 6); ctx.stroke();
    }
    for (const t of game.traps) {
      const sx = t.x - cam.x, sy = t.y - cam.y;
      if (t.type === 'bear_trap') {
        // open spring jaws (or closed when sprung)
        ctx.strokeStyle = '#8a8a90';
        ctx.lineWidth = 3;
        const gap = t.sprung ? 2 : 10;
        ctx.beginPath(); ctx.arc(sx, sy, 9, -Math.PI * 0.8, -Math.PI * 0.2); ctx.stroke();
        ctx.beginPath(); ctx.arc(sx, sy, 9, Math.PI * 0.2, Math.PI * 0.8); ctx.stroke();
        ctx.fillStyle = '#5a5a60';
        ctx.fillRect(sx - gap / 2, sy - 2, gap, 4);
      } else {
        // snare noose
        ctx.strokeStyle = t.armed ? '#9a8a5a' : '#6a5a3a';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(sx, sy, 7, 0, Math.PI * 2); ctx.stroke();
        if (!t.armed) { ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(sx, sy, 7, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
        if (t.bait) { ctx.fillStyle = '#c05050'; ctx.beginPath(); ctx.arc(sx + 6, sy + 4, 2.5, 0, Math.PI * 2); ctx.fill(); }
      }
      if (t.caught) { ctx.fillStyle = '#d04040'; ctx.fillRect(sx - 1, sy - 10, 2, 18); }
    }
    // bait piles (lures)
    for (const b of game.baitPiles) {
      const sx = b.x - cam.x, sy = b.y - cam.y;
      ctx.fillStyle = b.kind === 'meat_raw' ? '#a05040' : '#c04060';
      ctx.beginPath(); ctx.arc(sx, sy, 4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,220,140,0.5)';
      ctx.beginPath(); ctx.arc(sx, sy, 7 + Math.sin(b.t * 2) * 1.5, 0, Math.PI * 2); ctx.stroke();
    }
  }

  _drawEntities(ctx, game) {
    const cam = game.camera;
    const list = [];
    const M = 60; // cull margin (px) — only collect entities near the view
    const minX = cam.x - M, maxX = cam.x + cam.vw + M;
    const minY = cam.y - M, maxY = cam.y + cam.vh + M;
    const inView = (e) => e.x >= minX && e.x <= maxX && e.y >= minY && e.y <= maxY;
    if (game.multiplayer.connected) {
      for (const a of game.remoteAnimals) if (!a.dead && inView(a)) list.push(a);
    } else {
      for (const a of game.animals) if (!a.dead && inView(a)) list.push(a);
    }
    if (game.multiplayer.connected) {
      for (const m of game.remoteMonsters) if (!m.dead && inView(m)) list.push(m);
    } else {
      for (const m of game.monsters) if (!m.dead && inView(m)) list.push(m);
    }
    for (const n of game.npcs) if (inView(n)) list.push(n);
    for (const r of game.remotePlayers) if (inView(r)) list.push(r);
    list.push(game.player);
    list.sort((a, b) => a.y - b.y);
    for (const e of list) e.draw(ctx, cam, game);
  }

  _drawProjectiles(ctx, game) {
    for (const pr of game.projectiles) pr.draw(ctx, game.camera);
  }

  // visible loot pickups on the ground (overflow drops, death penalties)
  _drawDrops(ctx, game) {
    const cam = game.camera;
    const RARITY_COLORS = { common: '#b8b8b8', uncommon: '#4ac84a', rare: '#4a8ac8', epic: '#c84ac8', legendary: '#ffd76a' };
    for (const d of game.drops) {
      const x = cam.sx(d.x), y = cam.sy(d.y);
      if (x < -30 || y < -50 || x > cam.vw + 30 || y > cam.vh + 50) continue;
      const bob = Math.sin(game.time.timeOfDay * 40 + d.x * 0.3) * 3;
      const item = game.items.get(d.itemId);
      const color = RARITY_COLORS[item ? item.rarity : 'common'] || '#b8b8b8';
      const pulse = 1 + Math.sin(game.time.timeOfDay * 60 + d.x) * 0.15;
      // large pulsing glow (rarity colored) so drops are impossible to miss
      const glow = ctx.createRadialGradient(x, y + bob, 1, x, y + bob, 16 * pulse);
      glow.addColorStop(0, color + 'cc');
      glow.addColorStop(0.5, color + '44');
      glow.addColorStop(1, color + '00');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(x, y + bob, 16 * pulse, 0, Math.PI * 2); ctx.fill();
      // orb
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(x, y + bob, 7 * pulse, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(x - 2, y + bob - 2, 2, 0, Math.PI * 2); ctx.fill();
      // floating item name label above the drop
      if (item) {
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        const label = `${item.name}${d.qty > 1 ? ' ×' + d.qty : ''}`;
        const tw = ctx.measureText(label).width;
        ctx.fillRect(x - tw / 2 - 4, y + bob - 26, tw + 8, 14);
        ctx.fillStyle = color;
        ctx.fillText(label, x, y + bob - 16);
        ctx.textAlign = 'left';
      }
    }
  }

  _drawWeatherAndLight(ctx, game, off) {
    const w = game.weather;
    const darkness = game.time.darkness;
    const SW = game.camera.screenW, SH = game.camera.screenH; // full-screen overlay
    // rain
    if (w.raining && w.intensity > 0.2) {
      ctx.fillStyle = `rgba(120,150,200,${0.18 * w.intensity})`;
      ctx.fillRect(0, 0, SW, SH);
      ctx.strokeStyle = `rgba(180,200,230,${0.4 * w.intensity})`;
      ctx.lineWidth = 1;
      const n = 80 + (w.isStorm ? 60 : 0);
      const t = game.time.timeOfDay * 2000;
      for (let i = 0; i < n; i++) {
        const x = (i * 97 + t * 3) % (SW + 40) - 20;
        const y = (i * 53 + t * 7) % (SH + 40) - 20;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 2, y + 12); ctx.stroke();
      }
    }
    // fog
    if (w.state === 'fog' && w.intensity > 0.2) {
      ctx.fillStyle = `rgba(200,205,210,${0.28 * w.intensity})`;
      ctx.fillRect(0, 0, SW, SH);
    }
    // zone ambience tint (deeper forest feels distinct & foreboding)
    if (game.player) {
      const zi = game.world.getZoneIndex(game.player.x, game.player.y);
      if (zi >= 4) {
        const tint = zi === 5 ? 'rgba(70,20,30,0.22)' : 'rgba(25,55,38,0.18)';
        ctx.fillStyle = tint;
        ctx.fillRect(0, 0, SW, SH);
      }
    }
    // night lighting (a radial light around the player's SCREEN position)
    if (darkness > 0.08) {
      const p = game.player;
      const px = (p.x - game.camera.x) * game.camera.zoom;
      const py = (p.y - game.camera.y) * game.camera.zoom;
      const g = ctx.createRadialGradient(px, py, 40, px, py, 300);
      const a = Math.min(0.66, darkness * 0.66);
      g.addColorStop(0, 'rgba(8,10,24,0)');
      g.addColorStop(0.6, `rgba(8,10,24,${a * 0.4})`);
      g.addColorStop(1, `rgba(8,10,24,${a})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, SW, SH);
    }
  }
}
