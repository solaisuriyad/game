import { Entity } from './Entity.js';
import { rankForLevel } from '../data/ranks.js';

export class Monster extends Entity {
  constructor(game, def, x, y) {
    super(x, y, def.size);
    this.def = def;
    this.name = def.name;
    this.family = def.family;
    this.level = def.level;
    this.rank = def.rank || rankForLevel(def.level);
    this.maxHp = def.hp; this.hp = def.hp;
    this.damage = def.damage;
    this.defense = def.defense;
    this.speed = def.speed;
    this.xp = def.xp;
    this.color = def.color;
    this.boss = !!def.boss;
    this.flying = !!def.flying;      // aerial monsters (dragons/dragonoids)
    this.aiProfile = def.aiProfile;
    this.abilities = def.abilities;
    this.loot = def.loot;
    // MP: dragonoids have massive reserves (500), others scale with rank
    this.maxMp = def.mp != null ? def.mp : (this.rank === 'A+' ? 500 : this.level * 10);
    this.mp = this.maxMp;
    this.power = def.damage;          // attack power (for the status panel)

    this.state = 'idle';
    this.target = null;
    this.home = { x, y };
    this.territoryR = 220;
    this.wanderTarget = null;
    this.wanderTimer = 0;
    this.attackCd = 0;
    this.castTimer = 0;      // windup remaining for current ability
    this.casting = null;     // { ability, params }
    this.abilityCd = {};     // per ability cooldown
    this.lastSeenPlayer = null;
    this.investigate = null;
    this.aggroTimer = 0;
    this.buffs = {};         // { rage: 0 }
    this.anim = 0;
    this.flash = 0;
    this.id = 'm' + (Math.random() * 1e6 | 0);
    this.stagger = 0;
    this.corpse = null;
    this.phaseIndex = 0;
  }

  get speedMult() {
    let m = 1;
    if (this.buffs.rage) m *= 1.3;
    if (this.hasStatus('slow')) m *= this.statusSlow;
    return m;
  }

  update(dt, game) {
    if (this.dead) return;
    this.tickStatuses(dt, game);
    this.flash = Math.max(0, this.flash - dt);
    this.stagger = Math.max(0, this.stagger - dt);
    if (this.buffs.rage) this.buffs.rage = Math.max(0, this.buffs.rage - dt);
    // MP regenerates slowly; skills consume it (handled in the brain)
    this.mp = Math.min(this.maxMp, this.mp + 3 * dt);
    if (this.flyingNow) this.flyingNow = Math.max(0, this.flyingNow - dt);

    // boss phase transitions (swap ability set + appearance + announcement)
    if (this.def.phases && this.phaseIndex < this.def.phases.length) {
      const ph = this.def.phases[this.phaseIndex];
      if (this.hp <= this.maxHp * ph.hpPct) {
        this.phaseIndex++;
        this.abilities = ph.abilities;
        if (ph.color) this.color = ph.color;
        this.buffs.rage = 5;
        this.abilityCd = {}; // reset cooldowns so the new kit is felt immediately
        game.toast(`${this.name} — ${ph.label}!`);
        game.addFloatText(this.x, this.y - this.radius - 10, ph.label, '#ff7a30');
        game.audio.sfx('roar');
        game.camera.addShake(9);
      }
    }

    game.ai.monster(this, dt, game);
  }

  draw(ctx, cam, game) {
    const x = cam.sx(this.x), y = cam.sy(this.y);
    if (x < -60 || y < -60 || x > cam.vw + 60 || y > cam.vh + 60) return;
    const s = this.radius;
    const c = this.flash > 0 ? '#fff' : this.color;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(0, s * 0.6, s * 0.9, s * 0.4, 0, 0, Math.PI * 2); ctx.fill();

    if (this.family === 'slime') {
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.ellipse(0, 0, s * 1.1, s * 0.8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath(); ctx.arc(-s * 0.3, -s * 0.3, s * 0.2, 0, Math.PI * 2); ctx.fill();
    } else if (this.family === 'spider') {
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.ellipse(0, 0, s * 0.9, s * 0.7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(0, -s * 0.4, s * 0.45, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = c; ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * s * 0.6, Math.sin(a) * s * 0.6);
        ctx.lineTo(Math.cos(a) * s * 1.4, Math.sin(a) * s * 1.4); ctx.stroke();
      }
      ctx.fillStyle = '#e33';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.arc(-s * 0.2 + i * s * 0.25, -s * 0.45, 1.6, 0, Math.PI * 2); ctx.fill();
      }
    } else if (this.family === 'dragon' || this.family === 'dragonoid') {
      // dragon / dragonoid: winged serpent body + horns
      const humanoid = this.family === 'dragonoid';
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.ellipse(0, 0, s * 1.3, s * 0.8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(s * 0.8, -s * 0.4, s * 0.5, 0, Math.PI * 2); ctx.fill();
      // horns
      ctx.fillStyle = humanoid ? '#fff' : '#e8d8a0';
      ctx.beginPath(); ctx.moveTo(s * 0.6, -s * 0.8); ctx.lineTo(s * 0.5, -s * 1.3); ctx.lineTo(s * 0.85, -s * 0.85); ctx.fill();
      ctx.beginPath(); ctx.moveTo(s * 0.95, -s * 0.8); ctx.lineTo(s * 1.05, -s * 1.3); ctx.lineTo(s * 1.15, -s * 0.7); ctx.fill();
      // wings
      ctx.fillStyle = humanoid ? '#e8e0d8' : 'rgba(255,255,255,0.5)';
      ctx.beginPath(); ctx.moveTo(-s * 0.4, -s * 0.5); ctx.lineTo(-s * 1.4, -s * 1.0); ctx.lineTo(-s * 0.4, -s * 0.1); ctx.closePath(); ctx.fill();
      // eye
      ctx.fillStyle = '#ffd76a';
      ctx.beginPath(); ctx.arc(s * 0.95, -s * 0.45, 2, 0, Math.PI * 2); ctx.fill();
    } else if (this.family === 'treant') {
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.arc(0, 0, s * 1.1, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#4a3a2a';
      ctx.beginPath(); ctx.arc(0, -s * 0.6, s * 0.7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#7a5a3a';
      ctx.beginPath(); ctx.arc(0, -s * 0.6, s * 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffd76a';
      ctx.beginPath(); ctx.arc(-s * 0.25, -s * 0.7, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(s * 0.25, -s * 0.7, 2.5, 0, Math.PI * 2); ctx.fill();
    } else {
      // wolf / goblin / bear-ish quadruped or biped
      if (this.family === 'goblin') {
        ctx.fillStyle = c;
        ctx.beginPath(); ctx.arc(0, -s * 0.4, s * 0.6, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(0, s * 0.3, s * 0.6, s * 0.7, 0, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = c;
        ctx.beginPath(); ctx.ellipse(0, 0, s * 1.3, s * 0.75, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(s * 1.0, -s * 0.3, s * 0.55, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#111';
        ctx.beginPath(); ctx.arc(s * 1.15, -s * 0.4, 2, 0, Math.PI * 2); ctx.fill();
        // ears
        ctx.fillStyle = c;
        ctx.beginPath(); ctx.moveTo(s * 0.8, -s * 0.7); ctx.lineTo(s * 1.0, -s * 1.2); ctx.lineTo(s * 1.15, -s * 0.6); ctx.fill();
      }
    }
    // boss crown / rage aura
    if (this.boss) {
      ctx.strokeStyle = '#ffd76a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, -s * 0.9, s * 0.5, 0, Math.PI * 2); ctx.stroke();
    }
    if (this.buffs.rage) {
      ctx.strokeStyle = 'rgba(255,60,60,0.7)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, s * 1.3, 0, Math.PI * 2); ctx.stroke();
    }
    // rank label (F/E/D/C/B/A/S/A+) above the monster
    const rankColor = { 'F': '#c8c8c8', 'E': '#7ac87a', 'D': '#7ac8e0', 'C': '#5a9ae0', 'B': '#a05ae0', 'A': '#e07a5a', 'S': '#ffd76a', 'A+': '#ff5ae0' }[this.rank] || '#fff';
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(-8, -s * 1.6 - 12, 16, 12);
    ctx.fillStyle = rankColor;
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.rank, 0, -s * 1.55 - 4);
    ctx.textAlign = 'left';
    ctx.restore();
  }
}
