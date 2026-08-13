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
    const g = this.game;
    const p = g.player;
    // villagers gossip about the player's heroics
    if (p.recentBossKill && Math.random() < 0.35) {
      const boss = p.recentBossKill;
      p.recentBossKill = null;
      return `Word travels fast — you slew the ${boss}! The village sleeps easier because of you.`;
    }
    if (p.reputation >= 85 && Math.random() < 0.4) {
      return `It's an honor, ${p.name}. You're a hero to this village.`;
    }
    if (p.reputation >= 45 && Math.random() < 0.3) {
      return `We're lucky to have you around, ${p.name}.`;
    }
    // NPCs reference recent world events
    if (npc.recentEventComment && EVENT_COMMENTS[npc.recentEventComment]) {
      const lines = EVENT_COMMENTS[npc.recentEventComment];
      npc.recentEventComment = null;
      return this.game.world.rng.pick(lines);
    }
    if (g.events.recent.length && Math.random() < 0.4) {
      const ev = g.events.recent[0];
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
