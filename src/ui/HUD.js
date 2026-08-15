import { T, TILE, WORLD_W, WORLD_H, VILLAGE_CX, VILLAGE_CY, ZONES } from '../world/WorldSystem.js';
import { RANKS } from '../data/quests.js';
import { ABILITIES } from '../data/abilities.js';

export class HUD {
  constructor(game) {
    this.game = game;
    this._buildMinimap();
  }

  _buildMinimap() {
    // cap the minimap/terrain canvas at a fixed resolution so a huge world
    // doesn't create a multi-megapixel canvas that stalls rendering
    const MM = 700;
    this.mm = MM;
    this.terrain = document.createElement('canvas');
    this.terrain.width = MM; this.terrain.height = MM;
    const tc = this.terrain.getContext('2d');
    const img = tc.createImageData(MM, MM);
    const d = img.data;
    for (let my = 0; my < MM; my++) {
      const ty = (my * WORLD_H / MM) | 0;
      for (let mx = 0; mx < MM; mx++) {
        const tx = (mx * WORLD_W / MM) | 0;
        const t = this.game.world.tileAt(tx, ty);
        const dist = Math.hypot(tx - VILLAGE_CX, ty - VILLAGE_CY);
        let r, g, b;
        if (t === T.WATER) { r = 58; g = 106; b = 138; }
        else if (t === T.PATH || t === T.FLOOR) { r = 184; g = 160; b = 106; }
        else if (t === T.FARM) { r = 107; g = 74; b = 42; }
        else if (t === T.SAND) { r = 203; g = 184; b = 138; }
        else {
          const shade = 70 - dist * 0.02;
          r = 40; g = Math.max(40, shade + 30); b = 30;
        }
        const i = (my * MM + mx) * 4;
        d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
      }
    }
    tc.putImageData(img, 0, 0);
    // fog (small, at minimap resolution). Alpha is kept LOW (~140) so unexplored
    // terrain stays clearly visible — otherwise the map looks like a black screen.
    this.fog = tc.createImageData(MM, MM);
    for (let i = 3; i < this.fog.data.length; i += 4) this.fog.data[i] = 140;
    this._fogDirty = true;
  }

  updateDiscovery() {
    const p = this.game.player;
    // reveal a radius around the player in minimap space (cheap, capped size)
    const mx = Math.floor((p.x / TILE) * (this.mm / WORLD_W));
    const my = Math.floor((p.y / TILE) * (this.mm / WORLD_H));
    const R = 16; // reveal a wider area so the map isn't mostly black
    for (let dy = -R; dy <= R; dy++) {
      for (let dx = -R; dx <= R; dx++) {
        if (dx * dx + dy * dy > R * R) continue;
        const px = mx + dx, py = my + dy;
        if (px < 0 || py < 0 || px >= this.mm || py >= this.mm) continue;
        const idx = (py * this.mm + px) * 4 + 3;
        if (this.fog.data[idx] !== 0) { this.fog.data[idx] = 0; this._fogDirty = true; }
      }
    }
  }

  render(ctx) {
    const g = this.game;
    const p = g.player;
    // HUD is drawn in fixed SCREEN space, independent of camera zoom (vw/vh are
    // world-visible size and shrink/grow with zoom, which pushed UI off-screen).
    const W = g.camera.screenW, H = g.camera.screenH;
    ctx.save();
    ctx.textBaseline = 'top';
    ctx.font = '11px sans-serif';

    // ---- player name (top-left, above the status bars) ----
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.font = 'bold 14px sans-serif';
    const nameW = ctx.measureText(p.name).width;
    ctx.fillRect(10, 10, nameW + 14, 22);
    ctx.fillStyle = '#ffd76a';
    ctx.fillText(p.name, 17, 16);

    // ---- status bars (top-left, below the name) ----
    this._bar(ctx, 12, 40, 180, p.health / p.maxHealth, '#d0483a', `${Math.ceil(p.health)}/${p.maxHealth}`);
    this._bar(ctx, 12, 56, 160, p.stamina / p.maxStamina, '#4a9a4a', `STAMINA ${Math.ceil(p.stamina)}`);
    this._bar(ctx, 12, 72, 160, p.mp / p.maxMp, '#7a5ac8', `MP ${Math.ceil(p.mp)}`);
    this._bar(ctx, 12, 88, 160, p.hunger / 100, '#d08a3a', 'HUNGER');
    this._bar(ctx, 12, 104, 120, (p.temperature + 10) / 40, '#4a8ac8', `${Math.round(p.temperature)}°C`);
    if (p.recovering) {
      ctx.fillStyle = '#7ae07a';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('⚡ Recovering…', 12, 122);
    }
    // hint when no skills selected yet
    if (g.activeSkills.selected.length === 0) {
      ctx.fillStyle = '#ffd76a';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('Press O to choose your skills', 12, 138);
    }

    // ---- monster status panel (nearest monster currently engaged with you) ----
    this._drawMonsterStatus(ctx, W, H);

    // ---- monster finder (compass arrow to the nearest monster) ----
    this._drawMonsterFinder(ctx, W, H);

    // ---- attacker indicator (red arrow + name pointing at what just hit you) ----
    this._drawAttackerIndicator(ctx, W, H);

    // ---- loot feed (recent drops) ----
    this._drawLootFeed(ctx, W, H);

    // ---- top-right: clock / weather / gold / rank (shifted down for the settings gear) ----
    ctx.textAlign = 'right';
    ctx.fillStyle = '#f5f0e0';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(`${g.time.clock} · Day ${g.time.day}`, W - 12, 56);
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#c8e0c8';
    const zi = g.world.getZoneIndex(p.x, p.y);
    const zmin = ZONES[zi].minRank;
    const zoneStr = g.world.getZoneName(p.x, p.y) + (zmin > 0 ? ` (Rank ${RANKS[zmin]}+)` : '');
    ctx.fillText(`${g.weather.state[0].toUpperCase() + g.weather.state.slice(1)} · ${zoneStr}`, W - 12, 74);
    ctx.fillStyle = '#ffd76a';
    ctx.fillText(`${p.gold}g`, W - 12, 90);
    ctx.fillStyle = '#a0c8ff';
    ctx.fillText(`Rank ${g.guild.rank()} · ${p.guildPoints} GP`, W - 12, 106);
    ctx.fillStyle = '#d0c0f0';
    ctx.fillText(g.reputation.title(), W - 12, 122);
    if (g.multiplayer.connected) {
      ctx.fillStyle = '#7ae07a';
      ctx.fillText(`Online · ${g.remotePlayers.length + 1} hunters`, W - 12, 138);
      ctx.fillStyle = '#9fe08a';
      ctx.fillText('Enter — chat', W - 12, 154);
    }
    ctx.fillStyle = '#888';
    ctx.font = '9px sans-serif';
    ctx.fillText(`v6.2 · ${g._fps || '--'} fps · ${g.monsters.length} monsters`, W - 12, H - 8);
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
    if (p.hasStatus('stun')) status.push('💫 Stunned');
    if (p.hasStatus('root')) status.push('🕸️ Rooted');
    if (p.flying) status.push(`✈️ Flying ${Math.round(p.altitude)}ft`);
    if (p.sprinting) status.push('🏃 Running');
    if (p.crouching) status.push('🕵️ Sneaking');
    if (p.tracking) status.push('👣 Tracking');
    if (p.yggBlessing > 0) status.push('🌳 Blessed (invincible)');
    if (p.buffs && (p.buffs.healthHold > 0 || p.buffs.staminaHold > 0 || p.buffs.manaHold > 0)) status.push('✨ Charm');
    // prompt near the Yggdrasil
    if (g.nearYggdrasil()) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(W / 2 - 150, 100, 300, 30);
      ctx.fillStyle = '#9fe08a';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🌳 Press Q to receive the Yggdrasil\'s blessing', W / 2, 120);
      ctx.textAlign = 'left';
    }
    if (status.length) {
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(W / 2 - 90, 12, 180, 22);
      ctx.fillStyle = '#c8e0c8';
      ctx.fillText(status.join('  ·  '), W / 2, 19);
      ctx.textAlign = 'left';
    }

    // ---- active skills (bottom-left, above quest tracker) ----
    this._drawSkills(ctx, W, H);

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

  // Clear, unmissable death screen — explains what killed you and that you're
  // respawning, so death never looks like a random teleport back to town.
  renderDeathScreen(ctx) {
    const g = this.game;
    const info = g.deathInfo;
    if (!info) return;
    const W = g.camera.screenW, H = g.camera.screenH;
    ctx.save();
    // dim the whole screen
    ctx.fillStyle = 'rgba(8,4,4,0.68)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // title
    ctx.font = 'bold 46px sans-serif';
    ctx.fillStyle = '#ff4a3a';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 12;
    ctx.fillText('💀 YOU DIED', W / 2, H / 2 - 84);
    ctx.shadowBlur = 0;
    // killer
    ctx.font = 'bold 19px sans-serif';
    ctx.fillStyle = '#f5e8d0';
    ctx.fillText(`Killed by ${info.killer}`, W / 2, H / 2 - 40);
    // what was lost
    ctx.font = '15px sans-serif';
    ctx.fillStyle = '#d8c48a';
    const loss = info.dropped > 0
      ? `You lost ${info.goldLost}g and ${info.dropped} materials (equipment took some wear).`
      : `You lost ${info.goldLost}g (equipment took some wear).`;
    ctx.fillText(loss, W / 2, H / 2 - 4);
    // reassurance + countdown
    ctx.font = 'bold 15px sans-serif';
    ctx.fillStyle = '#9fd8a0';
    ctx.fillText('Your level, skills and rank are safe.', W / 2, H / 2 + 30);
    ctx.fillText(`Respawning at the village in ${Math.max(0, Math.ceil(info.timer))}…`, W / 2, H / 2 + 58);
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.restore();
  }

  // Show the engaged monster's breed, rank, level, power, HP/MP and skills.
  _drawMonsterStatus(ctx, W, H) {
    const g = this.game;
    const p = g.player;
    // nearest monster within combat range
    const list = g.multiplayer.connected ? g.remoteMonsters : g.monsters;
    let best = null, bd = 520;
    for (const m of list) {
      if (m.dead) continue;
      const d = Math.hypot(m.x - p.x, m.y - p.y);
      if (d < bd) { bd = d; best = m; }
    }
    if (!best) return;

    const rankColor = { 'F': '#c8c8c8', 'E': '#7ac87a', 'D': '#7ac8e0', 'C': '#5a9ae0', 'B': '#a05ae0', 'A': '#e07a5a', 'S': '#ffd76a', 'A+': '#ff5ae0' }[best.rank] || '#fff';
    const x = W - 240, y = 12;
    const w = 228, h = 150;
    ctx.fillStyle = 'rgba(10,12,18,0.78)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.strokeRect(x, y, w, h);

    ctx.textAlign = 'left';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = '#f0e6d0';
    ctx.fillText(best.name, x + 10, y + 16);
    // rank badge (right-aligned)
    ctx.fillStyle = rankColor;
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`Rank ${best.rank}`, x + w - 10, y + 16);
    ctx.textAlign = 'left';
    // breed + level + power
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#b0a888';
    ctx.fillText(`Breed: ${best.family || '?'} · Lv ${best.level}`, x + 10, y + 32);
    ctx.fillStyle = '#e8c06a';
    ctx.fillText(`Power: ${best.power || best.damage || '?'}`, x + 10, y + 45);

    // HP bar
    this._statBar(ctx, x + 10, y + 54, w - 20, best.hp / best.maxHp, '#d0483a', `HP ${Math.ceil(best.hp)}/${best.maxHp}`);
    // MP bar
    this._statBar(ctx, x + 10, y + 68, w - 20, best.mp / best.maxMp, '#7a5ac8', `MP ${Math.ceil(best.mp)}/${best.maxMp}`);

    // skills
    ctx.font = 'bold 10px sans-serif';
    ctx.fillStyle = '#9fe08a';
    ctx.fillText('Skills:', x + 10, y + 88);
    ctx.font = '9px sans-serif';
    ctx.fillStyle = '#c8c8b8';
    let sy = y + 100;
    const names = best.abilities.map((a) => ABILITIES[a.id] ? ABILITIES[a.id].label : a.id);
    let line = '';
    for (const n of names) {
      if ((line + n).length > 30) { ctx.fillText(line, x + 10, sy); sy += 12; line = ''; }
      line = line ? line + ' · ' + n : n;
    }
    if (line) ctx.fillText(line, x + 10, sy);
    ctx.textAlign = 'left';
  }

  // direction + distance to the nearest monster (so players can actually find them)
  _drawMonsterFinder(ctx, W, H) {
    const g = this.game;
    const p = g.player;
    const list = g.multiplayer.connected ? g.remoteMonsters : g.monsters;
    let best = null, bd = Infinity;
    for (const m of list) {
      if (m.dead) continue;
      const d = Math.hypot(m.x - p.x, m.y - p.y);
      if (d < bd) { bd = d; best = m; }
    }
    if (!best) return;
    const distTiles = Math.round(bd / 32);
    // arrow pointing toward the monster, placed above the player
    const px = W / 2, py = H / 2;
    const ang = Math.atan2(best.y - p.y, best.x - p.x);
    const r = 46;
    const ax = px + Math.cos(ang) * r;
    const ay = py + Math.sin(ang) * r;
    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(ang);
    ctx.fillStyle = '#ff6a5a';
    ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-6, -7); ctx.lineTo(-6, 7); ctx.closePath(); ctx.fill();
    ctx.restore();
    // name + distance
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    const label = `${best.name} · ${distTiles}t`;
    const tw = ctx.measureText(label).width;
    ctx.fillRect(px - tw / 2 - 6, py - 20, tw + 12, 15);
    ctx.fillStyle = '#ffb0a0';
    ctx.fillText(label, px, py - 8);
    ctx.textAlign = 'left';
  }

  // red arrow + name pointing at whatever just hit you (so an attacker is never
  // invisible — especially relevant while flying, where ground monsters used to
  // be able to hit you from below)
  _drawAttackerIndicator(ctx, W, H) {
    const p = this.game.player;
    if (!p.recentAttacker || p.recentAttacker.t <= 0) return;
    const atk = p.recentAttacker;
    const px = W / 2, py = H / 2;
    const r = 60;
    const ax = px + Math.cos(atk.dir) * r;
    const ay = py + Math.sin(atk.dir) * r;
    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(atk.dir);
    ctx.fillStyle = '#ff3030';
    ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-7, -8); ctx.lineTo(-7, 8); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    const label = `⚔ ${atk.name}`;
    const tw = ctx.measureText(label).width;
    ctx.fillRect(px - tw / 2 - 6, py - 36, tw + 12, 17);
    ctx.fillStyle = '#ff8a8a';
    ctx.fillText(label, px, py - 26);
    ctx.textAlign = 'left';
  }

  // recent loot feed (top-right, under the monster panel / top-right info)
  _drawLootFeed(ctx, W, H) {
    const g = this.game;
    if (!g.recentLoot || !g.recentLoot.length) return;
    const x = W - 240, y = 172;
    let yy = y;
    ctx.textAlign = 'left';
    for (const l of g.recentLoot) {
      if (l.t <= 0) continue;
      const alpha = Math.min(1, l.t); // fade out at the end
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgba(10,12,18,0.7)';
      const label = `+ ${l.qty}× ${l.name}`;
      ctx.font = 'bold 11px sans-serif';
      const tw = ctx.measureText(label).width;
      ctx.fillRect(x, yy, tw + 16, 16);
      ctx.fillStyle = l.color;
      ctx.fillText(label, x + 8, yy + 12);
      yy += 19;
    }
    ctx.globalAlpha = 1;
  }

  _statBar(ctx, x, y, w, frac, color, label) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x, y, w, 11);
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(x + 1, y + 1, w - 2, 9);
    ctx.fillStyle = color;
    ctx.fillRect(x + 1, y + 1, (w - 2) * Math.max(0, Math.min(1, frac)), 9);
    ctx.fillStyle = '#fff';
    ctx.font = '8px sans-serif';
    ctx.fillText(label, x + 4, y + 9);
  }

  _drawSkills(ctx, W, H) {
    const g = this.game;
    const p = g.player;
    const as = g.activeSkills;
    const y = H - 152;
    const w = 82, gap = 4;
    for (let i = 0; i < 3; i++) {
      const x = 12 + i * (w + gap);
      const skill = as.skillAt(i);
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(x, y, w, 40);
      ctx.fillStyle = '#f5f0e0';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(`${i + 1}`, x + 4, y + 4);
      if (skill) {
        const cd = as.cooldowns[skill.id] || 0;
        const noMp = p.mp < skill.mpCost;
        ctx.fillStyle = (cd > 0 || noMp) ? '#888' : skill.color;
        ctx.font = '10px sans-serif';
        ctx.fillText(skill.name.slice(0, 9), x + 16, y + 5);
        ctx.font = '9px sans-serif';
        ctx.fillStyle = noMp ? '#ff8a8a' : '#c8c0a8';
        ctx.fillText(noMp ? 'no MP' : (cd > 0 ? cd.toFixed(1) + 's' : 'MP ' + skill.mpCost), x + 16, y + 20);
        if (cd > 0) {
          ctx.fillStyle = 'rgba(0,0,0,0.55)';
          ctx.fillRect(x, y + 40 - (40 * cd / skill.cooldown), w, 40 * cd / skill.cooldown);
        }
      } else {
        ctx.font = '10px sans-serif';
        ctx.fillStyle = '#777';
        ctx.fillText('empty (O)', x + 16, y + 18);
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.strokeRect(x, y, w, 40);
    }
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
    ctx.drawImage(this.terrain, x, y, size, size);
    ctx.drawImage(this._fogCanvas(), x, y, size, size);
    // player marker (world tiles -> display px)
    const p = this.game.player;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x + (p.x / TILE) * (size / WORLD_W), y + (p.y / TILE) * (size / WORLD_H), 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.strokeRect(x, y, size, size);
  }
  _fogCanvas() {
    if (!this._fogc) { this._fogc = document.createElement('canvas'); this._fogc.width = this.mm; this._fogc.height = this.mm; }
    if (this._fogDirty) {
      this._fogc.getContext('2d').putImageData(this.fog, 0, 0);
      this._fogDirty = false;
    }
    return this._fogc;
  }
}
