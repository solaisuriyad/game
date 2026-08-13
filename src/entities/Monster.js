import { Entity } from './Entity.js';

export class Monster extends Entity {
  constructor(game, def, x, y) {
    super(x, y, def.size);
    this.def = def;
    this.name = def.name;
    this.family = def.family;
    this.level = def.level;
    this.maxHp = def.hp; this.hp = def.hp;
    this.damage = def.damage;
    this.defense = def.defense;
    this.speed = def.speed;
    this.xp = def.xp;
    this.color = def.color;
    this.boss = !!def.boss;
    this.aiProfile = def.aiProfile;
    this.abilities = def.abilities;
    this.loot = def.loot;

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
    this.aggroTimer = 0;
    this.buffs = {};         // { rage: 0 }
    this.anim = 0;
    this.flash = 0;
    this.id = 'm' + (Math.random() * 1e6 | 0);
    this.stagger = 0;
    this.corpse = null;
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
    ctx.restore();
  }
}
