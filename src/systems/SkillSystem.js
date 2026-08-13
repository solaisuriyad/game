import { SKILLS } from '../data/skills.js';

export class SkillSystem {
  constructor(game) {
    this.game = game;
    this.skills = SKILLS;
  }
  addXP(n) {
    const p = this.game.player;
    p.xp += n;
    let leveled = false;
    while (p.xp >= p.xpNext) {
      p.xp -= p.xpNext;
      p.level++;
      p.skillPoints++;
      p.xpNext = Math.round(p.xpNext * 1.4);
      p.maxHealth += 10; p.health = p.maxHealth;
      p.maxStamina += 5; p.stamina = p.maxStamina;
      leveled = true;
    }
    if (leveled) {
      this.game.audio.sfx('levelup');
      this.game.toast(`Level up! You are now level ${p.level}.`);
      this.game.bus.emit('levelup', { level: p.level });
    }
  }
  // collect effect value across learned skills
  getEffect(key) {
    let v = 0;
    for (const id of this.game.player.learnedSkills) {
      const s = this.skills.find((x) => x.id === id);
      if (s && typeof s.effects[key] === 'number') v += s.effects[key];
    }
    return v;
  }
  unlockedRecipes() {
    const out = [];
    for (const id of this.game.player.learnedSkills) {
      const s = this.skills.find((x) => x.id === id);
      if (s && s.effects.recipes) out.push(...s.effects.recipes);
    }
    return out;
  }
  canLearn(id) {
    const p = this.game.player;
    const s = this.skills.find((x) => x.id === id);
    if (!s || p.learnedSkills.includes(id)) return false;
    if (p.skillPoints < s.cost) return false;
    // tier gating: need >= tier skills in the same tree
    const inTree = p.learnedSkills.filter((x) => this.skills.find((y) => y.id === x && y.tree === s.tree)).length;
    return inTree >= s.tier;
  }
  learn(id) {
    const p = this.game.player;
    const s = this.skills.find((x) => x.id === id);
    if (!this.canLearn(id)) return { ok: false, message: 'Cannot learn this skill yet.' };
    p.skillPoints -= s.cost;
    p.learnedSkills.push(id);
    this.game.audio.sfx('craft');
    return { ok: true, message: `Learned: ${s.name}!` };
  }
}
