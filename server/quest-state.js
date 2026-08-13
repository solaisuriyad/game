// Authoritative shared quests (Phase 8).
//
// The server owns co-op quest objective progress (kill/boss objectives only, since
// monsters are server-authoritative). All connected players contribute; when a
// quest completes, every connected player is rewarded (individual progression is
// applied client-side to each player's own character).
//
// Hunt (animal) and gather quests remain single-player/client-side in this phase —
// animals and resource nodes are not yet server-authoritative (Phase 9 scope).
const SHARED_POOL = [
  { id: 'coop_wolves', title: 'Wolf Cull', text: 'Together, defeat 5 wolves.', objectives: [{ kind: 'kill', id: 'wolf', count: 5 }], rewards: { gp: 120, gold: 80, xp: 120 } },
  { id: 'coop_rabbits', title: 'Rabbit Hunt', text: 'Together, hunt 6 rabbits.', objectives: [{ kind: 'hunt', id: 'rabbit', count: 6 }], rewards: { gp: 100, gold: 60, xp: 100 } },
  { id: 'coop_boars', title: 'Boar Hunt', text: 'Together, hunt 4 wild boars.', objectives: [{ kind: 'hunt', id: 'boar', count: 4 }], rewards: { gp: 140, gold: 90, xp: 140 } },
  { id: 'coop_herbs', title: 'Herbal Harvest', text: 'Together, gather 12 healing herbs.', objectives: [{ kind: 'gather', id: 'herb', count: 12 }], rewards: { gp: 90, gold: 50, xp: 90 } },
  { id: 'coop_ore', title: 'Iron Expedition', text: 'Together, mine 8 ore deposits.', objectives: [{ kind: 'gather', id: 'iron_ore', count: 8 }], rewards: { gp: 160, gold: 110, xp: 160 } },
  { id: 'coop_spiders', title: 'Web Infestation', text: 'Together, defeat 4 giant spiders.', objectives: [{ kind: 'kill', id: 'spider', count: 4 }], rewards: { gp: 180, gold: 120, xp: 180 } },
  { id: 'coop_goblins', title: 'Goblin Raids', text: 'Together, defeat 5 goblins.', objectives: [{ kind: 'kill', id: 'goblin', count: 5 }], rewards: { gp: 140, gold: 90, xp: 140 } },
  { id: 'coop_boss_bear', title: 'The Ancient Bear', text: 'Defeat the Ancient Bear as a team.', objectives: [{ kind: 'kill', id: 'ancient_bear', count: 1 }], rewards: { gp: 900, gold: 500, xp: 700 } },
  { id: 'coop_boss_guardian', title: 'Guardian of the Grove', text: 'Defeat the Forest Guardian as a team.', objectives: [{ kind: 'kill', id: 'forest_guardian', count: 1 }], rewards: { gp: 2500, gold: 1400, xp: 1600 } },
  { id: 'coop_boss_dragon', title: 'The Final Guardian', text: 'Face the Ancient Dragon together.', objectives: [{ kind: 'kill', id: 'ancient_dragon', count: 1 }], rewards: { gp: 6000, gold: 3000, xp: 4000 } }
];

export class SharedQuestState {
  constructor() {
    this.active = [];
    this.completed = new Set();
    this.emit = () => {}; // (type, data) -> GameServer routes
  }

  // activate the next uncompleted quest from the pool (keeps one "big" hunt going)
  maybeActivate() {
    if (this.active.length > 0) return;
    const next = SHARED_POOL.find((q) => !this.completed.has(q.id));
    if (!next) return; // pool exhausted
    this.activate(next);
  }

  activate(def) {
    const q = {
      id: def.id, title: def.title, text: def.text, rewards: def.rewards,
      objectives: def.objectives.map((o) => ({ ...o, progress: 0 }))
    };
    this.active.push(q);
    this.emit('questState', this.serialize());
  }

  onKill(monsterDefId) {
    this._advance('kill', monsterDefId, 1);
  }
  onHunt(animalDefId) {
    this._advance('hunt', animalDefId, 1);
  }
  onGather(itemId, qty) {
    this._advance('gather', itemId, qty);
  }

  _advance(kind, id, qty) {
    let changed = false;
    for (const q of this.active) {
      for (const o of q.objectives) {
        if (o.kind === kind && o.id === id && o.progress < o.count) {
          o.progress = Math.min(o.count, o.progress + qty); changed = true;
        }
      }
    }
    if (changed) this.emit('questState', this.serialize());
    this._checkComplete();
  }

  _checkComplete() {
    let removed = false;
    for (const q of this.active) {
      if (q.objectives.every((o) => o.progress >= o.count)) {
        this.completed.add(q.id);
        this.emit('questComplete', { id: q.id, title: q.title, rewards: q.rewards });
        removed = true;
      }
    }
    if (removed) {
      this.active = this.active.filter((q) => q.objectives.some((o) => o.progress < o.count));
      this.emit('questState', this.serialize());
      this.maybeActivate();
    }
  }

  serialize() {
    return this.active.map((q) => ({
      id: q.id, title: q.title, text: q.text, rewards: q.rewards,
      objectives: q.objectives.map((o) => ({ kind: o.kind, id: o.id, count: o.count, progress: o.progress }))
    }));
  }
}
