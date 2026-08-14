import { Entity } from './Entity.js';
import { PX_W, PX_H } from '../world/WorldSystem.js';

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
    // flying: X cycles 50ft -> 75ft -> 50ft -> land, with an auto-timer at 75ft
    // (30s at 75ft -> 5s at 50ft -> land + 10s cooldown)
    this.flying = false;
    this.flyLevel = 0;      // 0=ground, 1=50ft, 2=75ft, 3=50ft(2nd press)
    this.targetAlt = 0;
    this.altitude = 0;      // current altitude in feet (0..75)
    this.flyTimer = 0;      // remaining flight time (30s, then 5s descend, then land)
    this.flyCd = 0;         // landing cooldown (10s)
    this.yggBlessing = 0;   // invulnerability aura near the Yggdrasil (seconds)
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

  _darken(hex) {
    if (!hex) return '#555';
    const n = parseInt(hex.slice(1), 16);
    const r = Math.max(0, ((n >> 16) & 255) - 40);
    const g = Math.max(0, ((n >> 8) & 255) - 40);
    const b = Math.max(0, (n & 255) - 40);
    return `rgb(${r},${g},${b})`;
  }

  // land the player (with cooldown) — used by the manual X cycle and the auto-timer
  _land(game, toast) {
    this.flyLevel = 0;
    this.flying = false;
    this.targetAlt = 0;
    this.altitude = 0;
    this.flyTimer = 0;
    this.land(game);
    this.flyCd = 10;
    game.toast(toast);
  }

  // stop flying and snap to the nearest walkable ground so the player is never
  // left stuck inside a tree / building / water (which caused "frozen" movement)
  land(game) {
    this.flying = false;
    this.flyCd = 5;
    this.altitude = 0;
    for (let r = 0; r <= 80; r += 8) {
      for (let a = 0; a < 8; a++) {
        const ang = (a / 8) * Math.PI * 2;
        const x = this.x + Math.cos(ang) * r;
        const y = this.y + Math.sin(ang) * r;
        if (!game.world.circleBlocked(x, y, 14)) {
          this.x = x; this.y = y;
          return;
        }
      }
    }
  }

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

    // ---- flying: X cycles 50ft -> 75ft -> 50ft -> land; auto-timer at 75ft ----
    if (this.flyCd > 0) this.flyCd = Math.max(0, this.flyCd - dt);

    if (game.input.pressed('x') && this.flyCd <= 0) {
      this.flyLevel++;
      if (this.flyLevel === 1) {
        this.flying = true;
        this.targetAlt = 50;
        this.flyTimer = 30; // 30s total flight time, always
        game.toast('✈️ You take flight at 50 feet.');
      } else if (this.flyLevel === 2) {
        this.flying = true;
        this.targetAlt = 75;
        this.flyTimer = 30;
        game.toast('✈️ You fly higher at 75 feet!');
      } else if (this.flyLevel === 3) {
        this.flying = true;
        this.targetAlt = 50;
        this.flyTimer = 30;
        game.toast('✈️ Descending back to 50 feet.');
      } else { // flyLevel === 4 -> land
        this._land(game, '🛬 You land. Flying cools down for 10s.');
      }
      game.audio.sfx('levelup');
    }

    // auto-timer: after 30s of flight, descend to 50ft (5s), then land
    if (this.flying) {
      this.flyTimer -= dt;
      if (this.flyTimer <= 0 && this.targetAlt === 75) {
        this.targetAlt = 50;
        this.flyTimer = 5; // 5s at 50ft before landing
        game.toast('↘️ Flight time up — descending to 50 feet.');
      } else if (this.flyTimer <= 0) {
        this._land(game, '🛬 Flight time up — you land. Flying cools down for 10s.');
      }
    }

    // smoothly glide to the target altitude
    if (this.flying) {
      const diff = this.targetAlt - this.altitude;
      const step = 90 * dt; // 90 ft/s glide
      if (Math.abs(diff) <= step) this.altitude = this.targetAlt;
      else this.altitude += Math.sign(diff) * step;
    }

    let spd = this.sprinting ? 230 : this.speed;
    if (this.flying) spd = 260; // fly faster than walking
    if (this.hasStatus('root') || this.hasStatus('stun')) spd = 0;
    if (this.attackWindup > 0 && this.weapon && this.weapon.type !== 'bow') spd *= 0.2;
    if (this.blocking) spd *= 0.4;
    if (this.charging) spd *= 0.55;
    if (this.dodgeTimer > 0) spd *= 2.3;
    if (this.crouching) spd *= 0.55;

    if (moving) {
      if (this.flying) {
        // flying ignores ground collision (soars over water, trees and buildings)
        this.x = Math.max(24, Math.min(PX_W - 24, this.x + dir.x * spd * dt));
        this.y = Math.max(24, Math.min(PX_H - 24, this.y + dir.y * spd * dt));
      } else {
        game.world.moveEntity(this, dir.x * spd * dt, dir.y * spd * dt);
      }
    }

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
    if (this.flying) {
      // ---- clear, obvious flight: big lift + separated ground shadow + glow ----
      const lift = -this.altitude * 3.0; // 50 feet -> ~150px up (clearly visible)
      // ground shadow (stays low and small = height cue)
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.ellipse(0, s * 0.7, s * (0.7 - this.altitude * 0.008), s * 0.28, 0, 0, Math.PI * 2); ctx.fill();
      // lift the body up
      ctx.translate(0, lift);
      // floating bob so it never looks static
      const hbob = Math.sin(game.time.timeOfDay * 400 + this.x * 0.1) * 4;
      ctx.translate(0, hbob);
      // glow aura
      const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, s * 2.2);
      glow.addColorStop(0, 'rgba(255,255,255,0.35)');
      glow.addColorStop(1, 'rgba(200,230,255,0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(0, 0, s * 2.2, 0, Math.PI * 2); ctx.fill();
      // wing aura (flapping)
      const flap = Math.sin(game.time.timeOfDay * 500) * 0.4;
      ctx.fillStyle = 'rgba(200,230,255,0.4)';
      ctx.beginPath(); ctx.ellipse(-s * 1.2, -s * 0.2, s * 0.55, s * 0.3, -0.5 - flap, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(s * 1.2, -s * 0.2, s * 0.55, s * 0.3, 0.5 + flap, 0, Math.PI * 2); ctx.fill();
    }
    if (this.crouching) ctx.scale(1, 0.8);
    // body shadow (only when NOT flying; when flying the ground shadow above is used)
    if (!this.flying) {
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.beginPath(); ctx.ellipse(0, s * 0.7, s * 0.6, s * 0.25, 0, 0, Math.PI * 2); ctx.fill();
    }

    if (this.dodgeTimer > 0) ctx.globalAlpha = 0.6;

    if (this.weapon && this.attackAnim > 0) {
      const swing = Math.sin(this.attackAnim * 40);
      ctx.save();
      ctx.rotate(this.facing + swing * 1.2);
      ctx.fillStyle = this.weapon.color;
      ctx.fillRect(s * 0.5, -2, this.weapon.range * 0.7, 4);
      ctx.restore();
    }

    // ---- bigger, clearly gender-distinct figure ----
    const scale = 1.35; // make the character more visible
    ctx.save();
    ctx.scale(scale, scale);
    // body: male = broad torso + trousers, female = slimmer torso + flared dress
    if (this.gender === 'male') {
      // broad shoulders + torso
      ctx.fillStyle = this.clothColor;
      ctx.beginPath(); ctx.ellipse(0, s * 0.18 + bob, s * 0.72, s * 0.62, 0, 0, Math.PI * 2); ctx.fill();
      // legs (trousers)
      ctx.fillStyle = this._darken(this.clothColor);
      ctx.fillRect(-s * 0.28, s * 0.55, s * 0.24, s * 0.42);
      ctx.fillRect(s * 0.04, s * 0.55, s * 0.24, s * 0.42);
    } else if (this.gender === 'female') {
      // slimmer torso
      ctx.fillStyle = this.clothColor;
      ctx.beginPath(); ctx.ellipse(0, s * 0.12 + bob, s * 0.52, s * 0.5, 0, 0, Math.PI * 2); ctx.fill();
      // flared dress / skirt
      ctx.beginPath();
      ctx.moveTo(-s * 0.4, s * 0.3);
      ctx.lineTo(-s * 0.7, s * 0.95);
      ctx.lineTo(s * 0.7, s * 0.95);
      ctx.lineTo(s * 0.4, s * 0.3);
      ctx.closePath(); ctx.fill();
      // legs (slender)
      ctx.fillStyle = this.skinTone;
      ctx.fillRect(-s * 0.18, s * 0.85, s * 0.12, s * 0.25);
      ctx.fillRect(s * 0.06, s * 0.85, s * 0.12, s * 0.25);
    } else {
      // neutral
      ctx.fillStyle = this.clothColor;
      ctx.beginPath(); ctx.ellipse(0, s * 0.18 + bob, s * 0.62, s * 0.6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = this._darken(this.clothColor);
      ctx.fillRect(-s * 0.22, s * 0.55, s * 0.2, s * 0.4);
      ctx.fillRect(s * 0.02, s * 0.55, s * 0.2, s * 0.4);
    }
    // arms
    ctx.fillStyle = this.skinTone;
    ctx.beginPath(); ctx.ellipse(-s * 0.72, s * 0.28 + bob, s * 0.11, s * 0.28, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(s * 0.72, s * 0.28 + bob, s * 0.11, s * 0.28, 0, 0, Math.PI * 2); ctx.fill();
    // head
    ctx.fillStyle = this.skinTone;
    ctx.beginPath(); ctx.arc(0, -s * 0.52 + bob, s * 0.48, 0, Math.PI * 2); ctx.fill();
    // hair (gender-aware: female long, neutral medium, male short)
    ctx.fillStyle = this.hairColor;
    if (this.gender === 'female') {
      ctx.beginPath(); ctx.arc(0, -s * 0.68 + bob, s * 0.48, Math.PI, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-s * 0.48, -s * 0.4 + bob, s * 0.14, s * 0.44, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(s * 0.48, -s * 0.4 + bob, s * 0.14, s * 0.44, 0, 0, Math.PI * 2); ctx.fill();
    } else if (this.gender === 'neutral') {
      ctx.beginPath(); ctx.arc(0, -s * 0.68 + bob, s * 0.48, Math.PI, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-s * 0.4, -s * 0.48 + bob, s * 0.12, s * 0.26, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(s * 0.4, -s * 0.48 + bob, s * 0.12, s * 0.26, 0, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(0, -s * 0.68 + bob, s * 0.48, Math.PI, Math.PI * 2); ctx.fill();
    }
    // eyes
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath(); ctx.arc(-s * 0.16, -s * 0.52 + bob, 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.16, -s * 0.52 + bob, 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // ---- end body ----

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
