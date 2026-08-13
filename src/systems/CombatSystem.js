import { TILE, VILLAGE_CX, VILLAGE_CY } from '../world/WorldSystem.js';

export class CombatSystem {
  constructor(game) { this.game = game; }

  update(dt) {
    const p = this.game.player;
    const input = this.game.input;
    const mouse = input.mouse;

    // ---- blocking (right mouse hold, melee weapons) ----
    const isMelee = !p.weapon || p.weapon.type !== 'bow';
    p.blocking = isMelee && ((mouse.buttons & 4) !== 0); // right button = bit 2

    // ---- dodge (space) ----
    if (input.pressed(' ') && p.dodgeCd <= 0 && p.stamina >= this.dodgeCost()) {
      p.dodgeTimer = 0.25;
      p.dodgeCd = 0.5;
      p.stamina -= this.dodgeCost();
      this.game.audio.sfx('swing');
    }

    // ---- attack (left mouse: charge -> release) ----
    const leftDown = (mouse.buttons & 1) !== 0;
    if (leftDown && !p.charging && p.attackCd <= 0 && !p.blocking) {
      p.charging = true; p.chargeTime = 0;
    }
    if (p.charging) {
      p.chargeTime += dt;
      if (!leftDown) {
        p.charging = false;
        this.attack(p.chargeTime > 0.3);
      }
    }
    this._recentDamage = Math.max(0, (this._recentDamage || 0) - dt);
  }

  dodgeCost() { return Math.round(20 * (1 + (this.game.skills.getEffect('dodgeCost') || 0))); }

  attack(heavy) {
    const p = this.game.player;
    const w = p.weapon;
    if (p.attackCd > 0) return;

    if (w && w.type === 'bow') {
      // fire arrow
      if (this.game.inventory.countItem('arrow') <= 0) {
        this.game.toast('No arrows!');
        return;
      }
      this.game.inventory.removeItem('arrow', 1);
      const dmg = this.weaponDamage(heavy);
      // co-op: server resolves monster hits from this intent
      if (this.game.multiplayer.connected) {
        this.game.multiplayer.sendAttack({ damage: dmg, facing: p.facing, weaponType: 'bow' });
      }
      const spd = w.range * 3.4;
      const a = p.facing;
      this.game.projectiles.push(new this.game.PProjectile(p.x, p.y, Math.cos(a) * spd, Math.sin(a) * spd, {
        damage: dmg, fromPlayer: true, kind: 'arrow', color: '#c8a06a', owner: p
      }));
      p.attackCd = w.speed;
      p.attackWindup = w.speed * 0.4;
      this.game.audio.sfx('bow');
      return;
    }

    // melee swing
    const dmg = this.weaponDamage(heavy);
    const range = w ? w.range : 40;
    // co-op: server resolves monster hits from this intent (local animals still hit client-side)
    if (this.game.multiplayer.connected) {
      this.game.multiplayer.sendAttack({ damage: dmg, facing: p.facing, weaponType: 'melee' });
    }
    p.attackCd = (w ? w.speed : 0.6) * (heavy ? 1.5 : 1);
    p.attackWindup = (w ? w.speed : 0.6) * 0.7;
    p.stamina = Math.max(0, p.stamina - (heavy ? 25 : 10));
    this.game.audio.sfx('swing');

    const targets = this.game.monsters.concat(this.game.animals);
    let hitAny = false;
    for (const t of targets) {
      if (t.dead || t.hp <= 0) continue;
      const d = p.distTo(t);
      if (d > range + t.radius) continue;
      const ang = Math.atan2(t.y - p.y, t.x - p.x);
      let diff = Math.abs(ang - p.facing);
      if (diff > Math.PI) diff = Math.PI * 2 - diff;
      if (diff < 1.15) {
        this.hitEntity(t, dmg, { crit: this.rollCrit(), heavy });
        if (heavy) this.knockbackEntity(t, p, 180);
        hitAny = true;
      }
    }
    if (hitAny && w) this.damageWeapon(1);
  }

  rollCrit() {
    const p = this.game.player;
    const chance = (p.baseStats.crit || 0) + (this.game.skills.getEffect('critChance') || 0);
    return Math.random() < chance;
  }

  weaponDamage(heavy) {
    const p = this.game.player;
    const w = p.weapon;
    let base = w ? w.damage : 4;
    base *= 1 + p.baseStats.strength * 0.03;
    base *= 1 + (this.game.skills.getEffect('meleeDamage') || 0);
    if (heavy) base *= 1.6;
    // adaptive: bonus damage vs animals
    return Math.round(base);
  }

  hitEntity(e, amount, opts = {}) {
    if (e.dead || e.hp <= 0) return;
    let dmg = amount;
    if (opts.crit) dmg = Math.round(dmg * 1.6);
    // defense reduction (monsters)
    if (e.defense) dmg = Math.max(1, Math.round(dmg * (1 - e.defense * 0.03)));
    e.hp -= dmg;
    e.flash = 0.12;
    e.aggroTimer = 10; e.target = this.game.player;
    this.game.addFloatText(e.x, e.y - e.radius - 6, (opts.crit ? 'CRIT ' : '') + dmg, opts.crit ? '#ffd76a' : '#fff');
    this.game.audio.sfx('hit');
    if (e.hp <= 0) this.onEntityDeath(e);
  }

  damageEntity(e, amount, kind, source) {
    if (e.dead || e.hp <= 0) return;
    e.hp -= amount;
    e.flash = 0.08;
    this.game.addFloatText(e.x, e.y - e.radius - 6, amount, '#c0e0ff');
    if (e.hp <= 0) this.onEntityDeath(e);
  }

  damagePlayer(amount, source, status) {
    const p = this.game.player;
    if (p.dodgeTimer > 0) return; // i-frames
    let dmg = amount;
    if (p.blocking) { dmg *= 0.25; p.stamina = Math.max(0, p.stamina - 12); }
    dmg -= p.totalDefense * 0.5;
    dmg *= 1 - (this.game.skills.getEffect('damageResist') || 0);
    dmg = Math.max(1, Math.round(dmg));
    this._recentDamage = 3;
    p.health -= dmg;
    if (source) p.lastDamageDir = Math.atan2(p.y - source.y, p.x - source.x);
    this.game.addFloatText(p.x, p.y - 24, '-' + dmg, '#ff6060');
    this.game.audio.sfx('playerHit');
    this.game.camera.addShake(4);
    if (status) p.addStatus(status.type, status.duration, status.magnitude);
    if (p.health <= 0) this.game.onPlayerDeath(source);
  }

  knockbackPlayer(source, force) {
    const p = this.game.player;
    const a = Math.atan2(p.y - source.y, p.x - source.x);
    for (let i = 0; i < 6; i++) {
      this.game.world.moveEntity(p, Math.cos(a) * force * 0.02, Math.sin(a) * force * 0.02);
    }
  }
  knockbackEntity(e, source, force) {
    const a = Math.atan2(e.y - source.y, e.x - source.x);
    for (let i = 0; i < 6; i++) {
      this.game.world.moveEntity(e, Math.cos(a) * force * 0.02, Math.sin(a) * force * 0.02);
    }
  }

  damageWeapon(n) {
    const p = this.game.player;
    if (!p.weapon) return;
    p.weapon.durability -= n;
    if (p.weapon.durability <= 0) {
      this.game.toast(`${p.weapon.name} broke!`);
      p.weapon = null;
      this.game.audio.sfx('death');
    }
  }

  onEntityDeath(e) {
    const g = this.game;
    e.dead = true;
    if (e.def && !e.family) {
      // animal -> corpse for harvesting
      g.corpses.push({ x: e.x, y: e.y, def: e.def, xp: e.xp });
      g.player.animalsHunted++;
      g.quests.onHunt(e.def.id);
    } else {
      // monster -> auto loot + xp
      const drops = this.rollLoot(e.loot);
      for (const d of drops) {
        g.drops.push(new g.DDrop(e.x + (Math.random() - 0.5) * 20, e.y + (Math.random() - 0.5) * 20, d.item, d.qty));
      }
      g.addXP(e.xp);
      g.player.kills++;
      g.quests.onKill(e.def.id);
      if (e.boss) {
        g.bus.emit('bossKilled', { def: e.def });
        g.player.recentBossKill = e.def.name;
      }
      // village defense: slaying a monster near the village earns NPC favor
      const vd = Math.hypot(e.x / TILE - VILLAGE_CX, e.y / TILE - VILLAGE_CY);
      if (vd < 34) {
        for (const n of g.npcs) {
          if (n.distTo(e) < 260) g.relationship.change(n, 1, 'saw you fight off a monster near the village');
        }
        g.player.reputation = Math.min(100, g.player.reputation + 1);
      }
    }
    g.audio.sfx('death');
  }

  rollLoot(loot) {
    const out = [];
    for (const l of loot) {
      const bonus = 1 + (this.game.skills.getEffect('lootChance') || 0);
      if (Math.random() < Math.min(1, l.chance * bonus)) {
        out.push({ item: l.item, qty: l.min + Math.floor(Math.random() * (l.max - l.min + 1)) });
      }
    }
    return out;
  }
}
