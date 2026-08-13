import { Entity } from './Entity.js';

export class Player extends Entity {
  constructor(x, y, customization) {
    super(x, y, 12);
    this.isPlayer = true;
    this.name = customization.name || 'Hunter';
    this.gender = customization.gender || 'neutral';
    this.hairStyle = customization.hairStyle || 0;
    this.hairColor = customization.hairColor || '#4a3624';
    this.skinTone = customization.skinTone || '#e8c39a';
    this.clothColor = customization.clothColor || '#7a6a4a';

    // core stats
    this.level = 1; this.xp = 0; this.xpNext = 100;
    this.skillPoints = 0;
    this.baseStats = {
      strength: 5, agility: 5, defense: 2, accuracy: 8,
      crit: 0.05, hunting: 1, tracking: 1, gathering: 1, crafting: 1
    };
    this.learnedSkills = [];

    // vitals (200% capacity for the 3 core resources)
    this.maxHealth = 200; this.health = 200;
    this.maxStamina = 200; this.stamina = 200;
    this.maxMp = 200; this.mp = 200;
    this.hunger = 100;
    this.temperature = 21;
    this.energy = 100;
    // timed buffs (hold-full charms + active-skill buffs)
    this.buffs = { healthHold: 0, staminaHold: 0, manaHold: 0, armor: 0, speed: 0 };
    this.castingSkill = 0;

    // progression
    this.gold = 50;
    this.guildPoints = 0;
    this.rankIndex = 0;
    this.reputation = 0;

    // equipment
    this.weapon = null;
    this.armor = { head: null, body: null, legs: null, feet: null };
    this.inventory = [];
    this.backpackLevel = 0;

    // combat state
    this.attackCd = 0;
    this.attackWindup = 0;
    this.attackHitDone = false;
    this.attackAnim = 0;
    this.blocking = false;
    this.dodgeTimer = 0;
    this.dodgeCd = 0;
    this.bowAiming = false;
    this.bowCharge = 0;
    this.charging = false;
    this.chargeTime = 0;
    this.lastDamageDir = 0;

    this.kills = 0;
    this.animalsHunted = 0;
    this.gatheredCount = 0;
    this.recentBossKill = null;

    // stealth / movement state
    this.crouching = false;
    this.sprinting = false;
    this.tracking = false;
    this.moving = false;
    this.working = 0;
    this.idleTime = 0;
    this.recovering = false;
  }

  get weaponDamage() { return this.weapon ? this.weapon.damage : 4; }
  get speed() {
    let s = 140;
    if (this.buffs.speed > 0) s *= 1.6; // Swift Step
    if (this.hasStatus('slow')) s *= this.statusSlow;
    return s;
  }
  get totalDefense() {
    let d = this.baseStats.defense + (this.buffs.armor || 0); // Stone Guard
    for (const slot of ['head', 'body', 'legs', 'feet']) {
      if (this.armor[slot]) d += this.armor[slot].defense;
    }
    return d;
  }

  equipWeapon(w) { this.weapon = w; }
  equipArmor(a) { if (a) this.armor[a.slot] = a; }

  update(dt, game) {
    this.tickStatuses(dt, game);
    // face the mouse
    const cam = game.camera;
    const ms = game.input.mouse;
    const wx = cam.x + ms.x, wy = cam.y + ms.y;
    this.facing = Math.atan2(wy - this.y, wx - this.x);

    const dir = game.input.dirVector();
    const moving = dir.x !== 0 || dir.y !== 0;
    this.moving = moving;
    this.crouching = game.input.held('shift');
    // Sprint: hold R while moving (never blocked by low stamina — movement is
    // independent of stamina so the player never gets slowed down by it)
    this.sprinting = game.input.held('r') && moving && !this.crouching && !this.blocking;
    if (game.input.pressed('tab')) this.tracking = !this.tracking;

    let spd = this.sprinting ? 230 : this.speed;
    if (this.hasStatus('root') || this.hasStatus('stun')) spd = 0;
    if (this.attackWindup > 0 && this.weapon && this.weapon.type !== 'bow') spd *= 0.2;
    if (this.blocking) spd *= 0.4;
    if (this.charging) spd *= 0.55;
    if (this.dodgeTimer > 0) spd *= 2.3;
    if (this.crouching) spd *= 0.55;

    if (moving) game.world.moveEntity(this, dir.x * spd * dt, dir.y * spd * dt);

    this.attackCd = Math.max(0, this.attackCd - dt);
    this.attackAnim = Math.max(0, this.attackAnim - dt);
    // CRITICAL FIX: attackWindup must decay or the player is stuck "attacking"
    // forever, permanently blocking stamina/MP/health recovery.
    this.attackWindup = Math.max(0, this.attackWindup - dt);
    this.dodgeCd = Math.max(0, this.dodgeCd - dt);
    if (this.dodgeTimer > 0) this.dodgeTimer -= dt;
  }

  draw(ctx, cam, game) {
    const x = cam.sx(this.x), y = cam.sy(this.y);
    const s = this.radius;
    const bob = this.attackAnim > 0 ? Math.sin(this.attackAnim * 40) * 1.5 : 0;
    ctx.save();
    ctx.translate(x, y);
    if (this.crouching) ctx.scale(1, 0.8);
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath(); ctx.ellipse(0, s * 0.7, s * 0.6, s * 0.25, 0, 0, Math.PI * 2); ctx.fill();

    if (this.dodgeTimer > 0) ctx.globalAlpha = 0.6;

    if (this.weapon && this.attackAnim > 0) {
      const swing = Math.sin(this.attackAnim * 40);
      ctx.save();
      ctx.rotate(this.facing + swing * 1.2);
      ctx.fillStyle = this.weapon.color;
      ctx.fillRect(s * 0.5, -2, this.weapon.range * 0.7, 4);
      ctx.restore();
    }

    // body (gender-aware: male broader, female narrower, neutral in-between)
    const bodyW = this.gender === 'male' ? s * 0.68 : this.gender === 'female' ? s * 0.54 : s * 0.62;
    ctx.fillStyle = this.clothColor;
    ctx.beginPath(); ctx.ellipse(0, s * 0.15 + bob, bodyW, s * 0.72, 0, 0, Math.PI * 2); ctx.fill();
    // head
    ctx.fillStyle = this.skinTone;
    ctx.beginPath(); ctx.arc(0, -s * 0.55 + bob, s * 0.5, 0, Math.PI * 2); ctx.fill();
    // hair (gender-aware: female long, neutral medium, male short)
    ctx.fillStyle = this.hairColor;
    if (this.gender === 'female') {
      ctx.beginPath(); ctx.arc(0, -s * 0.72 + bob, s * 0.5, Math.PI, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-s * 0.5, -s * 0.42 + bob, s * 0.14, s * 0.42, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(s * 0.5, -s * 0.42 + bob, s * 0.14, s * 0.42, 0, 0, Math.PI * 2); ctx.fill();
    } else if (this.gender === 'neutral') {
      ctx.beginPath(); ctx.arc(0, -s * 0.72 + bob, s * 0.5, Math.PI, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-s * 0.42, -s * 0.5 + bob, s * 0.12, s * 0.26, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(s * 0.42, -s * 0.5 + bob, s * 0.12, s * 0.26, 0, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(0, -s * 0.72 + bob, s * 0.5, Math.PI, Math.PI * 2); ctx.fill();
    }
    // eyes
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath(); ctx.arc(-s * 0.16, -s * 0.55 + bob, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.16, -s * 0.55 + bob, 1.5, 0, Math.PI * 2); ctx.fill();

    if (this.weapon && this.attackAnim <= 0) {
      ctx.save();
      ctx.rotate(this.facing);
      ctx.fillStyle = this.weapon.color;
      ctx.fillRect(s * 0.6, -2, this.weapon.range * 0.5, 3.5);
      ctx.restore();
    }
    if (this.blocking) {
      ctx.strokeStyle = 'rgba(160,200,255,0.9)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, s + 6, this.facing - 0.9, this.facing + 0.9); ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}
