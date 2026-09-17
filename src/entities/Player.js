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

    this.level = 1; this.xp = 0; this.xpNext = 100;
    this.skillPoints = 0;
    this.baseStats = {
      strength: 5, agility: 5, defense: 2, accuracy: 8,
      crit: 0.05, hunting: 1, tracking: 1, gathering: 1, crafting: 1
    };
    this.learnedSkills = [];

    this.maxHealth = 200; this.health = 200;
    this.maxStamina = 200; this.stamina = 200;
    this.maxMp = 200; this.mp = 200;
    this.hunger = 100;
    this.temperature = 21;
    this.energy = 100;
    this.buffs = { healthHold: 0, staminaHold: 0, manaHold: 0, armor: 0, speed: 0 };
    this.castingSkill = 0;

    this.gold = 50;
    this.guildPoints = 0;
    this.rankIndex = 0;
    this.reputation = 0;

    this.weapon = null;
    this.armor = { head: null, body: null, legs: null, feet: null };
    this.inventory = [];
    this.backpackLevel = 0;

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
    this.recentAttacker = null;

    this.kills = 0;
    this.animalsHunted = 0;
    this.gatheredCount = 0;
    this.recentBossKill = null;

    this.crouching = false;
    this.sprinting = false;
    this.runLocked = false;
    this._rTapTime = 0;
    this.tracking = false;
    this.moving = false;
    this.working = 0;
    this.idleTime = 0;
    this.recovering = false;
    // FIXED: X now cycles 50ft -> 75ft -> land (no extra 50ft that confused users)
    this.flying = false;
    this.flyLevel = 0; // 0=ground, 1=50ft, 2=75ft, 3=land
    this.targetAlt = 0;
    this.altitude = 0;
    this.flyTimer = 0;
    this.flyCd = 0;
    this.yggBlessing = 0;
    this.spawnGrace = 0;
    this.onFloatingIsland = null;
  }

  get weaponDamage() { return this.weapon ? this.weapon.damage : 4; }
  get speed() {
    let s = 140;
    if (this.buffs.speed > 0) s *= 1.6;
    if (this.hasStatus('slow')) s *= this.statusSlow;
    return s;
  }
  get totalDefense() {
    let d = this.baseStats.defense + (this.buffs.armor || 0);
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

  _land(game, toast) {
    const isl = game.world.floatingIslandAt ? game.world.floatingIslandAt(this.x, this.y) : null;
    if (isl) {
      this.flyLevel = 0;
      this.flying = false;
      this.targetAlt = 0;
      this.altitude = isl.elev / 3;
      this.flyTimer = 0;
      this.onFloatingIsland = isl;
      this.flyCd = 5;
      game.toast(`🛬 Landed on ${isl.kind === 'city' ? 'Floating City' : 'Floating Island'}!`);
      try { game.audio.sfx('levelup'); } catch (e) {}
      return;
    }
    this.flyLevel = 0;
    this.flying = false;
    this.targetAlt = 0;
    this.altitude = 0;
    this.onFloatingIsland = null;
    this.flyTimer = 0;
    this.land(game);
    this.flyCd = 10;
    game.toast(toast);
  }

  land(game) {
    const isl = game.world.floatingIslandAt ? game.world.floatingIslandAt(this.x, this.y) : null;
    if (isl) {
      this.flying = false;
      this.flyCd = 5;
      this.altitude = isl.elev / 3;
      this.onFloatingIsland = isl;
      return;
    }
    this.flying = false;
    this.flyCd = 5;
    this.altitude = 0;
    this.onFloatingIsland = null;
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
    const cam = game.camera;
    const ms = game.input.mouse;
    const v = game.input._virtual;
    const hasVirtual = v && (Math.abs(v.x) > 0.1 || Math.abs(v.y) > 0.1);
    if (!game.mode3d && hasVirtual) {
      this.facing = Math.atan2(v.y, v.x);
    } else {
      const wx = cam.x + ms.x, wy = cam.y + ms.y;
      this.facing = Math.atan2(wy - this.y, wx - this.x);
    }

    const dir = game._dirFn ? game._dirFn() : game.input.dirVector();
    const moving = dir.x !== 0 || dir.y !== 0;
    this.moving = moving;
    this.crouching = game.input.held('shift');
    if (game.input.pressed('r')) {
      if (this._rTapTime > 0) {
        this.runLocked = !this.runLocked;
        game.toast(this.runLocked ? '🏃 Auto-run LOCKED — press R twice to unlock' : '🚶 Auto-run unlocked');
        this._rTapTime = 0;
      } else {
        this._rTapTime = 0.3;
      }
    }
    if (this._rTapTime > 0) this._rTapTime -= dt;
    this.sprinting = (game.input.held('r') || this.runLocked) && moving && !this.crouching && !this.blocking;
    if (game.input.pressed('tab')) this.tracking = !this.tracking;

    if (this.flyCd > 0) this.flyCd = Math.max(0, this.flyCd - dt);

    // FIXED: X now = 50ft -> 75ft -> land (3 presses, not 4)
    if (game.input.pressed('x') && this.flyCd <= 0) {
      this.flyLevel++;
      if (this.flyLevel === 1) {
        this.flying = true;
        this.targetAlt = 50;
        this.flyTimer = 30;
        this.onFloatingIsland = null;
        game.toast('✈️ You take flight at 50 feet. Press X again for 75 feet');
      } else if (this.flyLevel === 2) {
        this.flying = true;
        this.targetAlt = 75;
        this.flyTimer = 30;
        this.onFloatingIsland = null;
        game.toast('✈️ You fly higher at 75 feet! Press X again to land');
      } else {
        this._land(game, '🛬 You land. Flying cools down for 10s.');
      }
      try { game.audio.sfx('levelup'); } catch (e) {}
    }

    if (this.flying) {
      this.flyTimer -= dt;
      if (this.flyTimer <= 0 && this.targetAlt === 75) {
        this.targetAlt = 50;
        this.flyTimer = 5;
        game.toast('↘️ Flight time up — descending to 50 feet.');
      } else if (this.flyTimer <= 0) {
        this._land(game, '🛬 Flight time up — you land. Flying cools down for 10s.');
      }
    }

    if (this.flying) {
      const diff = this.targetAlt - this.altitude;
      const step = 90 * dt;
      if (Math.abs(diff) <= step) this.altitude = this.targetAlt;
      else this.altitude += Math.sign(diff) * step;
    }

    if (!this.flying && this.onFloatingIsland) {
      const isl = game.world.floatingIslandAt ? game.world.floatingIslandAt(this.x, this.y) : null;
      if (!isl || isl.id !== this.onFloatingIsland.id) {
        this.onFloatingIsland = null;
        this.flyCd = 2;
        game.toast('💨 You stepped off the floating island!');
      } else {
        this.altitude = isl.elev / 3;
      }
    }

    let spd = this.sprinting ? 230 : this.speed;
    if (this.flying) spd = 260;
    if (this.hasStatus('root') || this.hasStatus('stun')) spd = 0;
    if (this.attackWindup > 0 && this.weapon && this.weapon.type !== 'bow') spd *= 0.2;
    if (this.blocking) spd *= 0.4;
    if (this.charging) spd *= 0.55;
    if (this.dodgeTimer > 0) spd *= 2.3;
    if (this.crouching) spd *= 0.55;

    if (moving) {
      if (this.flying || this.onFloatingIsland) {
        this.x = Math.max(24, Math.min(PX_W - 24, this.x + dir.x * spd * dt));
        this.y = Math.max(24, Math.min(PX_H - 24, this.y + dir.y * spd * dt));
        if (this.onFloatingIsland && !this.flying) {
          const isl = this.onFloatingIsland;
          const dx = this.x - isl.x, dy = this.y - isl.y;
          const dist = Math.hypot(dx, dy);
          if (dist > isl.r - 16) {
            const s = (isl.r - 16) / dist;
            this.x = isl.x + dx * s;
            this.y = isl.y + dy * s;
          }
        }
      } else {
        game.world.moveEntity(this, dir.x * spd * dt, dir.y * spd * dt);
      }
    }

    this.attackCd = Math.max(0, this.attackCd - dt);
    this.attackAnim = Math.max(0, this.attackAnim - dt);
    this.attackWindup = Math.max(0, this.attackWindup - dt);
    this.dodgeCd = Math.max(0, this.dodgeCd - dt);
    if (this.dodgeTimer > 0) this.dodgeTimer -= dt;
    if (this.recentAttacker) this.recentAttacker.t -= dt;
  }

  draw(ctx, cam, game) {
    const x = cam.sx(this.x), y = cam.sy(this.y);
    const s = this.radius;
    const bob = this.attackAnim > 0 ? Math.sin(this.attackAnim * 40) * 1.5 : 0;
    ctx.save();
    ctx.translate(x, y);
    if (this.flying || this.onFloatingIsland) {
      const alt = this.flying ? this.altitude : (this.onFloatingIsland ? this.onFloatingIsland.elev / 3 : 0);
      const lift = -alt * 3.0;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.ellipse(0, s * 0.7, s * (0.7 - alt * 0.008), s * 0.28, 0, 0, Math.PI * 2); ctx.fill();
      ctx.translate(0, lift);
      const hbob = Math.sin(game.time.timeOfDay * 400 + this.x * 0.1) * 4;
      ctx.translate(0, hbob);
      const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, s * 2.2);
      glow.addColorStop(0, 'rgba(255,255,255,0.35)');
      glow.addColorStop(1, 'rgba(200,230,255,0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(0, 0, s * 2.2, 0, Math.PI * 2); ctx.fill();
      const flap = Math.sin(game.time.timeOfDay * 500) * 0.4;
      ctx.fillStyle = 'rgba(200,230,255,0.4)';
      ctx.beginPath(); ctx.ellipse(-s * 1.2, -s * 0.2, s * 0.55, s * 0.3, -0.5 - flap, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(s * 1.2, -s * 0.2, s * 0.55, s * 0.3, 0.5 + flap, 0, Math.PI * 2); ctx.fill();
    }
    if (this.crouching) ctx.scale(1, 0.8);
    if (!this.flying && !this.onFloatingIsland) {
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

    const scale = 1.35;
    ctx.save();
    ctx.scale(scale, scale);
    if (this.gender === 'male') {
      ctx.fillStyle = this.clothColor;
      ctx.beginPath(); ctx.ellipse(0, s * 0.18 + bob, s * 0.72, s * 0.62, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = this._darken(this.clothColor);
      ctx.fillRect(-s * 0.28, s * 0.55, s * 0.24, s * 0.42);
      ctx.fillRect(s * 0.04, s * 0.55, s * 0.24, s * 0.42);
    } else if (this.gender === 'female') {
      ctx.fillStyle = this.clothColor;
      ctx.beginPath(); ctx.ellipse(0, s * 0.12 + bob, s * 0.52, s * 0.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-s * 0.4, s * 0.3);
      ctx.lineTo(-s * 0.7, s * 0.95);
      ctx.lineTo(s * 0.7, s * 0.95);
      ctx.lineTo(s * 0.4, s * 0.3);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = this.skinTone;
      ctx.fillRect(-s * 0.18, s * 0.85, s * 0.12, s * 0.25);
      ctx.fillRect(s * 0.06, s * 0.85, s * 0.12, s * 0.25);
    } else {
      ctx.fillStyle = this.clothColor;
      ctx.beginPath(); ctx.ellipse(0, s * 0.18 + bob, s * 0.62, s * 0.6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = this._darken(this.clothColor);
      ctx.fillRect(-s * 0.22, s * 0.55, s * 0.2, s * 0.4);
      ctx.fillRect(s * 0.02, s * 0.55, s * 0.2, s * 0.4);
    }
    ctx.fillStyle = this.skinTone;
    ctx.beginPath(); ctx.ellipse(-s * 0.72, s * 0.28 + bob, s * 0.11, s * 0.28, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(s * 0.72, s * 0.28 + bob, s * 0.11, s * 0.28, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = this.skinTone;
    ctx.beginPath(); ctx.arc(0, -s * 0.52 + bob, s * 0.48, 0, Math.PI * 2); ctx.fill();
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
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath(); ctx.arc(-s * 0.16, -s * 0.52 + bob, 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.16, -s * 0.52 + bob, 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

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
