import { T, TILE, WORLD_W, WORLD_H, VILLAGE_CX, VILLAGE_CY, ZONES } from '../world/WorldSystem.js';
import { RANKS } from '../data/quests.js';

export class HUD {
  constructor(game) {
    this.game = game;
    this._buildMinimap();
  }

  _buildMinimap() {
    const w = WORLD_W, h = WORLD_H;
    this.terrain = document.createElement('canvas');
    this.terrain.width = w; this.terrain.height = h;
    const tc = this.terrain.getContext('2d');
    const img = tc.createImageData(w, h);
    const d = img.data;
    for (let ty = 0; ty < h; ty++) {
      for (let tx = 0; tx < w; tx++) {
        const t = this.game.world.tileAt(tx, ty);
        const dist = Math.hypot(tx - VILLAGE_CX, ty - VILLAGE_CY);
        let r, g, b;
        if (t === T.WATER) { r = 58; g = 106; b = 138; }
        else if (t === T.PATH || t === T.FLOOR) { r = 184; g = 160; b = 106; }
        else if (t === T.FARM) { r = 107; g = 74; b = 42; }
        else if (t === T.SAND) { r = 203; g = 184; b = 138; }
        else {
          const shade = 70 - dist * 0.45;
          r = 40; g = Math.max(40, shade + 30); b = 30;
        }
        const i = (ty * w + tx) * 4;
        d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
      }
    }
    tc.putImageData(img, 0, 0);
    // fog
    this.fog = tc.createImageData(w, h);
    for (let i = 3; i < this.fog.data.length; i += 4) this.fog.data[i] = 235;
  }

  updateDiscovery() {
    const p = this.game.player;
    const w = this.game.world;
    const R = 12;
    const ptx = Math.floor(p.x / TILE), pty = Math.floor(p.y / TILE);
    for (let ty = pty - R; ty <= pty + R; ty++) {
      for (let tx = ptx - R; tx <= ptx + R; tx++) {
        if (tx < 0 || ty < 0 || tx >= WORLD_W || ty >= WORLD_H) continue;
        if (Math.hypot(tx - ptx, ty - pty) > R) continue;
        const idx = ty * WORLD_W + tx;
        if (w.discovered[idx]) continue;
        w.discovered[idx] = 1;
        this.fog.data[idx * 4 + 3] = 0;
      }
    }
  }

  render(ctx) {
    const g = this.game;
    const p = g.player;
    const W = g.camera.vw, H = g.camera.vh;
    ctx.save();
    ctx.textBaseline = 'top';
    ctx.font = '11px sans-serif';

    // ---- status bars (top-left) ----
    this._bar(ctx, 12, 12, 180, p.health / p.maxHealth, '#d0483a', `${Math.ceil(p.health)}/${p.maxHealth}`);
    this._bar(ctx, 12, 28, 160, p.stamina / p.maxStamina, '#4a9a4a', `STAMINA ${Math.ceil(p.stamina)}`);
    this._bar(ctx, 12, 44, 160, p.mp / p.maxMp, '#7a5ac8', `MP ${Math.ceil(p.mp)}`);
    this._bar(ctx, 12, 60, 160, p.hunger / 100, '#d08a3a', 'HUNGER');
    this._bar(ctx, 12, 76, 120, (p.temperature + 10) / 40, '#4a8ac8', `${Math.round(p.temperature)}°C`);

    // ---- top-right: clock / weather / gold / rank ----
    ctx.textAlign = 'right';
    ctx.fillStyle = '#f5f0e0';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(`${g.time.clock} · Day ${g.time.day}`, W - 12, 12);
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#c8e0c8';
    const zi = g.world.getZoneIndex(p.x, p.y);
    const zmin = ZONES[zi].minRank;
    const zoneStr = g.world.getZoneName(p.x, p.y) + (zmin > 0 ? ` (Rank ${RANKS[zmin]}+)` : '');
    ctx.fillText(`${g.weather.state[0].toUpperCase() + g.weather.state.slice(1)} · ${zoneStr}`, W - 12, 30);
    ctx.fillStyle = '#ffd76a';
    ctx.fillText(`${p.gold}g`, W - 12, 46);
    ctx.fillStyle = '#a0c8ff';
    ctx.fillText(`Rank ${g.guild.rank()} · ${p.guildPoints} GP`, W - 12, 62);
    ctx.fillStyle = '#d0c0f0';
    ctx.fillText(g.reputation.title(), W - 12, 78);
    if (g.multiplayer.connected) {
      ctx.fillStyle = '#7ae07a';
      ctx.fillText(`Online · ${g.remotePlayers.length + 1} hunters`, W - 12, 94);
    }
    ctx.textAlign = 'left';

    // ---- bottom-left: quest tracker (single-player + shared co-op) ----
    let qy = H - 120;
    const hasShared = g.multiplayer.connected && g.multiplayer.sharedQuests.length > 0;
    const qCount = Math.min(2, g.quests.active.length) + (hasShared ? g.multiplayer.sharedQuests.length : 0);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(12, qy, 240, 12 + qCount * 22);
    ctx.fillStyle = '#ffd76a';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('QUESTS', 20, qy + 6);
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#f5f0e0';
    let i = 0;
    for (const q of g.quests.active) {
      if (i >= 2) break;
      const tpl = g.quests.questById(q.templateId);
      const parts = q.objectives.map((o) => `${Math.min(o.progress, o.count)}/${o.count}`);
      ctx.fillText(`${tpl.title}`, 20, qy + 22 + i * 22);
      ctx.fillStyle = '#b8d8b8';
      ctx.fillText(parts.join('  '), 20, qy + 34 + i * 22);
      ctx.fillStyle = '#f5f0e0';
      i++;
    }
    for (const q of g.multiplayer.sharedQuests) {
      const parts = q.objectives.map((o) => `${Math.min(o.progress, o.count)}/${o.count}`);
      ctx.fillStyle = '#ffd76a';
      ctx.fillText(`⚔ ${q.title}`, 20, qy + 22 + i * 22);
      ctx.fillStyle = '#c8d0ff';
      ctx.fillText(parts.join('  '), 20, qy + 34 + i * 22);
      ctx.fillStyle = '#f5f0e0';
      i++;
    }

    // ---- stealth / tracking status (top-center-left) ----
    let status = [];
    if (p.sprinting) status.push('🏃 Running');
    if (p.crouching) status.push('🕵️ Sneaking');
    if (p.tracking) status.push('👣 Tracking');
    if (p.buffs && (p.buffs.healthHold > 0 || p.buffs.staminaHold > 0 || p.buffs.manaHold > 0)) status.push('✨ Charm');
    if (status.length) {
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(W / 2 - 90, 12, 180, 22);
      ctx.fillStyle = '#c8e0c8';
      ctx.fillText(status.join('  ·  '), W / 2, 19);
      ctx.textAlign = 'left';
    }

    // ---- bottom-center: weapon + weight ----
    const wpn = p.weapon ? p.weapon.name : 'Fists';
    const wt = g.inventory.weight().toFixed(1);
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(W / 2 - 90, H - 30, 180, 22);
    ctx.fillStyle = '#f5f0e0';
    ctx.fillText(`${wpn}  ·  ${wt}/${g.inventory.capacity()} kg${wt > g.inventory.capacity() ? ' (OVER)' : ''}`, W / 2, H - 24);
    ctx.textAlign = 'left';

    // ---- minimap (bottom-right) ----
    this._drawMinimap(ctx, W - 150, H - 150, 138);

    // ---- interaction prompt ----
    const prompt = g.interact.prompt();
    if (prompt) {
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      const tw = ctx.measureText(prompt).width;
      ctx.fillRect(W / 2 - tw / 2 - 8, H - 62, tw + 16, 20);
      ctx.fillStyle = '#ffd76a';
      ctx.fillText(prompt, W / 2, H - 57);
      ctx.textAlign = 'left';
    }

    // ---- toasts ----
    let ty = 96;
    for (const t of g.toasts) {
      ctx.fillStyle = `rgba(20,20,20,${Math.min(0.8, t.t)})`;
      const tw = ctx.measureText(t.text).width;
      ctx.fillRect(20, ty, tw + 16, 22);
      ctx.fillStyle = `rgba(255,240,200,${Math.min(1, t.t)})`;
      ctx.fillText(t.text, 28, ty + 5);
      ty += 26;
    }

    ctx.restore();
  }

  _bar(ctx, x, y, w, frac, color, label) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x - 2, y - 2, w + 4, 14);
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(x, y, w, 10);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), 10);
    ctx.fillStyle = '#fff';
    ctx.font = '9px sans-serif';
    ctx.fillText(label, x + 4, y + 1);
  }

  _drawMinimap(ctx, x, y, size) {
    const s = size / WORLD_W;
    ctx.drawImage(this.terrain, x, y, size, size);
    ctx.drawImage(this._fogCanvas(), x, y, size, size);
    // player marker
    const p = this.game.player;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x + (p.x / TILE) * s, y + (p.y / TILE) * s, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.strokeRect(x, y, size, size);
  }
  _fogCanvas() {
    if (!this._fogc) { this._fogc = document.createElement('canvas'); this._fogc.width = WORLD_W; this._fogc.height = WORLD_H; }
    this._fogc.getContext('2d').putImageData(this.fog, 0, 0);
    return this._fogc;
  }
}
