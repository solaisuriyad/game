import { ACTIVE_SKILLS, ACTIVE_SKILL_BY_ID } from '../data/activeSkills.js';

// Active skill system: the player picks up to 3 skills and casts them with
// hotkeys 1/2/3, spending MP. MP drains very slowly while casting and recovers
// quickly at high MP (see SurvivalSystem).
export class ActiveSkillSystem {
  constructor(game) {
    this.game = game;
    this.selected = [];
    this.cooldowns = {};
  }

  get maxSkills() { return 3; }
  skillAt(slot) { return ACTIVE_SKILL_BY_ID[this.selected[slot]] || null; }

  select(id) {
    if (this.selected.includes(id)) return false;
    if (this.selected.length >= this.maxSkills) return false;
    this.selected.push(id);
    return true;
  }
  deselect(id) {
    const i = this.selected.indexOf(id);
    if (i >= 0) { this.selected.splice(i, 1); delete this.cooldowns[id]; }
  }

  update(dt) {
    for (const k in this.cooldowns) {
      this.cooldowns[k] = Math.max(0, this.cooldowns[k] - dt);
    }
  }

  canUse(slot) {
    const skill = this.skillAt(slot);
    if (!skill) return false;
    if ((this.cooldowns[skill.id] || 0) > 0) return false;
    if (this.game.player.mp < skill.mpCost) return false;
    return true;
  }

  use(slot) {
    const g = this.game;
    const p = g.player;
    const skill = this.skillAt(slot);
    if (!skill) return { ok: false, message: 'No skill in this slot.' };
    if ((this.cooldowns[skill.id] || 0) > 0) return { ok: false, message: `${skill.name} is cooling down.` };
    if (p.mp < skill.mpCost) return { ok: false, message: 'Not enough MP.' };

    p.mp -= skill.mpCost;
    this.cooldowns[skill.id] = skill.cooldown;
    p.castingSkill = 1.2; // a moment of "using skill" (MP drains 95x slow here)
    this['cast_' + skill.id](p, skill, g);
    g.audio.sfx('craft');
    g.addFloatText(p.x, p.y - 26, skill.name, skill.color);
    return { ok: true, message: `Used ${skill.name}!` };
  }

  // ---- damage helpers ----
  _targets(g) { return g.monsters.concat(g.animals); }

  // damage every enemy within range + facing arc (SP); in co-op send a boosted hit
  _meleeAoE(g, p, range, damage) {
    if (g.multiplayer.connected) {
      g.multiplayer.sendAttack({ damage, facing: p.facing, weaponType: 'melee' });
      g.multiplayer.sendHuntHit({ damage, facing: p.facing, weaponType: 'melee' });
      return;
    }
    for (const t of this._targets(g)) {
      if (t.dead || t.hp <= 0) continue;
      if (p.distTo(t) > range + t.radius) continue;
      const ang = Math.atan2(t.y - p.y, t.x - p.x);
      let diff = Math.abs(ang - p.facing);
      if (diff > Math.PI) diff = Math.PI * 2 - diff;
      if (diff < 1.4) g.combat.hitEntity(t, damage, { crit: false, heavy: true });
    }
  }

  // ---- casts ----
  cast_power_strike(p, skill, g) {
    this._meleeAoE(g, p, 80, Math.round(g.combat.weaponDamage(true) * 3));
    g.camera.addShake(6);
  }
  cast_arrow_storm(p, skill, g) {
    const dmg = Math.round(g.combat.weaponDamage(false) * 1.2);
    const spd = 320;
    for (const off of [-0.3, 0, 0.3]) {
      const a = p.facing + off;
      g.projectiles.push(new g.PProjectile(p.x, p.y, Math.cos(a) * spd, Math.sin(a) * spd, {
        damage: dmg, fromPlayer: true, kind: 'arrow', color: '#c8a06a', owner: p
      }));
    }
  }
  cast_fire_blast(p, skill, g) {
    const spd = 300;
    const a = p.facing;
    g.projectiles.push(new g.PProjectile(p.x, p.y, Math.cos(a) * spd, Math.sin(a) * spd, {
      damage: Math.round(g.combat.weaponDamage(false) * 2.5), fromPlayer: true,
      kind: 'rock', color: '#ff5030', status: { type: 'burn', duration: 3, magnitude: 1 }, owner: p
    }));
  }
  cast_frost_nova(p, skill, g) {
    if (g.multiplayer.connected) {
      g.multiplayer.sendAttack({ damage: 40, facing: p.facing, weaponType: 'melee' });
      return;
    }
    for (const t of this._targets(g)) {
      if (t.dead || t.hp <= 0) continue;
      if (p.distTo(t) > 130) continue;
      g.combat.hitEntity(t, 40, {});
      t.addStatus('slow', 4, 1.2);
      t.addStatus('root', 0.8, 1);
    }
    g.camera.addShake(5);
  }
  cast_healing_light(p, skill, g) {
    p.health = Math.min(p.maxHealth, p.health + 80);
    g.addFloatText(p.x, p.y - 26, '+80 HP', '#6fe06f');
  }
  cast_second_wind(p, skill, g) {
    p.stamina = Math.min(p.maxStamina, p.stamina + 120);
  }
  cast_stone_guard(p, skill, g) {
    p.buffs.armor = 8;
  }
  cast_swift_step(p, skill, g) {
    p.buffs.speed = 6;
  }

  serialize() { return this.selected.slice(); }
  deserialize(list) { this.selected = (list || []).slice(0, this.maxSkills); }
}
