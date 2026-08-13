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
    this._drawTiles(ctx, game);
    this._drawNodes(ctx, game);
    this._drawBuildings(ctx, game);
    this._drawTrails(ctx, game);
    this._drawCorpsesAndTraps(ctx, game);
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
        this._drawTree(ctx, sx + 13, sy + 13, c.dark, c.depleted);
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

  _drawTree(ctx, x, y, dark, depleted) {
    ctx.fillStyle = '#4a3a26';
    ctx.fillRect(x - 2, y + 2, 4, 10);
    const col = depleted ? (dark ? '#3a3a30' : '#5a6a4a') : (dark ? '#2a4a2a' : '#3f6b35');
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(x, y - 4, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = depleted ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.12)';
    ctx.beginPath(); ctx.arc(x - 3, y - 7, 5, 0, Math.PI * 2); ctx.fill();
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

  _drawWeatherAndLight(ctx, game, off) {
    const w = game.weather;
    const darkness = game.time.darkness;
    // rain
    if (w.raining && w.intensity > 0.2) {
      ctx.fillStyle = `rgba(120,150,200,${0.18 * w.intensity})`;
      ctx.fillRect(0, 0, game.camera.vw, game.camera.vh);
      ctx.strokeStyle = `rgba(180,200,230,${0.4 * w.intensity})`;
      ctx.lineWidth = 1;
      const n = 80 + (w.isStorm ? 60 : 0);
      const t = game.time.timeOfDay * 2000;
      for (let i = 0; i < n; i++) {
        const x = (i * 97 + t * 3) % (game.camera.vw + 40) - 20;
        const y = (i * 53 + t * 7) % (game.camera.vh + 40) - 20;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 2, y + 12); ctx.stroke();
      }
    }
    // fog
    if (w.state === 'fog' && w.intensity > 0.2) {
      ctx.fillStyle = `rgba(200,205,210,${0.28 * w.intensity})`;
      ctx.fillRect(0, 0, game.camera.vw, game.camera.vh);
    }
    // zone ambience tint (deeper forest feels distinct & foreboding)
    if (game.player) {
      const zi = game.world.getZoneIndex(game.player.x, game.player.y);
      if (zi >= 4) {
        const tint = zi === 5 ? 'rgba(70,20,30,0.22)' : 'rgba(25,55,38,0.18)';
        ctx.fillStyle = tint;
        ctx.fillRect(0, 0, game.camera.vw, game.camera.vh);
      }
    }
    // night lighting
    if (darkness > 0.08) {
      const p = game.player;
      const px = game.camera.sx(p.x), py = game.camera.sy(p.y);
      const g = ctx.createRadialGradient(px, py, 40, px, py, 300);
      const a = Math.min(0.66, darkness * 0.66);
      g.addColorStop(0, 'rgba(8,10,24,0)');
      g.addColorStop(0.6, `rgba(8,10,24,${a * 0.4})`);
      g.addColorStop(1, `rgba(8,10,24,${a})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, game.camera.vw, game.camera.vh);
    }
  }
}
