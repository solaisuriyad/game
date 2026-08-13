import { GREETINGS, RELATION_LINES, SMALL_TALK, EVENT_COMMENTS } from '../data/dialogue.js';

export class DialogueSystem {
  constructor(game) { this.game = game; }

  greeting(npc) {
    const g = GREETINGS[npc.personality] || GREETINGS.cheerful;
    let line = this.game.world.rng.pick(g).replace('{player}', this.game.player.name);
    const rel = this.game.relationship.tier(npc.relationship);
    if (rel === 'friend' || rel === 'trusted') {
      line += ' ' + this.game.world.rng.pick(RELATION_LINES.friendly);
    } else if (rel === 'hostile') {
      line += ' ' + this.game.world.rng.pick(RELATION_LINES.hostile);
    }
    return line;
  }

  smallTalk(npc) {
    // NPCs reference recent world events
    if (npc.recentEventComment && EVENT_COMMENTS[npc.recentEventComment]) {
      const lines = EVENT_COMMENTS[npc.recentEventComment];
      npc.recentEventComment = null;
      return this.game.world.rng.pick(lines);
    }
    if (this.game.events.recent.length && Math.random() < 0.4) {
      const ev = this.game.events.recent[0];
      if (EVENT_COMMENTS[ev.type]) return this.game.world.rng.pick(EVENT_COMMENTS[ev.type]);
    }
    return this.game.world.rng.pick(SMALL_TALK);
  }

  memoryLine(npc) {
    if (npc.memory.length) {
      const m = npc.memory[0];
      return `(${npc.name} remembers: "${m.text}" — day ${m.day})`;
    }
    return null;
  }
}
