import { QUEST_TEMPLATES } from '../data/quests.js';
import { getItem } from '../data/index.js';

export class QuestSystem {
  constructor(game) {
    this.game = game;
    this.active = [];     // { templateId, objectives: [{kind,id,count,progress}] }
    this.completed = [];  // template ids completed (for repeatable guard)
  }

  availableTemplates() {
    const rank = this.game.guild.rankIndex();
    return QUEST_TEMPLATES.filter((q) => q.rank <= rank && !this.active.some((a) => a.templateId === q.id));
  }

  accept(id) {
    const tpl = QUEST_TEMPLATES.find((q) => q.id === id);
    if (!tpl) return { ok: false, message: 'Unknown quest.' };
    if (this.active.some((a) => a.templateId === id)) return { ok: false, message: 'Already accepted.' };
    this.active.push({
      templateId: id,
      objectives: tpl.objectives.map((o) => ({ ...o, progress: 0 }))
    });
    this.game.audio.sfx('quest');
    this.game.toast(`Quest accepted: ${tpl.title}`);
    return { ok: true };
  }

  questById(id) { return QUEST_TEMPLATES.find((q) => q.id === id); }

  _obj(quest, kind, id) {
    return quest.objectives.find((o) => o.kind === kind && o.id === id);
  }

  onKill(monsterId) {
    for (const q of this.active) {
      const o = this._obj(q, 'kill', monsterId);
      if (o && o.progress < o.count) o.progress++;
    }
  }
  onHunt(animalId) {
    for (const q of this.active) {
      const o = this._obj(q, 'hunt', animalId);
      if (o && o.progress < o.count) o.progress++;
    }
  }
  onGather(itemId, qty) {
    for (const q of this.active) {
      const o = this._obj(q, 'gather', itemId);
      if (o && o.progress < o.count) o.progress = Math.min(o.count, o.progress + qty);
    }
  }
  onSubmit(itemId, qty) {
    for (const q of this.active) {
      const o = this._obj(q, 'submit', itemId);
      if (o && o.progress < o.count) o.progress = Math.min(o.count, o.progress + qty);
    }
  }
  onExplore(zoneName) {
    const map = { 'Deep Forest': 'deep_forest', 'Dark Forest': 'dark_forest' };
    const id = map[zoneName];
    if (!id) return;
    for (const q of this.active) {
      const o = this._obj(q, 'explore', id);
      if (o && o.progress < o.count) o.progress++;
    }
  }

  isComplete(quest) {
    for (const o of quest.objectives) {
      if (o.kind === 'submit') {
        if (this.game.inventory.countItem(o.id) < o.count - o.progress) return false;
      } else if (o.progress < o.count) return false;
    }
    return true;
  }

  // turn in a quest at the guild
  turnIn(templateId) {
    const q = this.active.find((a) => a.templateId === templateId);
    if (!q) return { ok: false, message: 'Quest not active.' };
    if (!this.isComplete(q)) return { ok: false, message: 'Objectives not yet complete.' };
    const tpl = this.questById(templateId);
    // consume submit items
    for (const o of q.objectives) {
      if (o.kind === 'submit') {
        this.game.inventory.removeItem(o.id, o.count - o.progress);
      }
    }
    const p = this.game.player;
    p.guildPoints += tpl.rewards.gp;
    p.gold += tpl.rewards.gold;
    this.game.addXP(tpl.rewards.xp);
    p.reputation = Math.min(100, p.reputation + 3);
    this.active = this.active.filter((a) => a.templateId !== templateId);
    this.completed.push(templateId);
    this.game.audio.sfx('quest');
    this.game.toast(`Quest complete: ${tpl.title}! (+${tpl.rewards.gp} GP)`);
    this.game.bus.emit('questComplete', { tpl });
    return { ok: true, message: `Completed "${tpl.title}". Rewards: ${tpl.rewards.gp} GP, ${tpl.rewards.gold}g, ${tpl.rewards.xp} XP.` };
  }

  // first quest auto-accepted at game start
  ensureIntroQuest() {
    if (!this.active.length && !this.completed.includes('q_first_rabbits')) {
      this.accept('q_first_rabbits');
    }
  }

  serialize() { return { active: this.active, completed: this.completed }; }
  deserialize(d) { this.active = d.active || []; this.completed = d.completed || []; }
}
