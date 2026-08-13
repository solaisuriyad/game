import { GIFT_PREFS } from '../data/npcData.js';
import { getItem } from '../data/index.js';

export class RelationshipSystem {
  constructor(game) { this.game = game; }

  tier(rel) {
    if (rel <= -50) return 'hostile';
    if (rel < 0) return 'disliked';
    if (rel < 25) return 'stranger';
    if (rel < 50) return 'acquaintance';
    if (rel < 75) return 'friend';
    return 'trusted';
  }
  tierLabel(rel) {
    return { hostile: 'Hostile', disliked: 'Dislikes you', stranger: 'Stranger', acquaintance: 'Acquaintance', friend: 'Friend', trusted: 'Trusted' }[this.tier(rel)];
  }

  change(npc, delta, reason) {
    const before = npc.relationship;
    npc.relationship = Math.max(-100, Math.min(100, npc.relationship + delta));
    npc.metPlayer = true;
    if (reason) npc.memory.unshift({ text: reason, day: this.game.time.day });
    if (npc.memory.length > 20) npc.memory.length = 20;
    const beforeTier = this.tier(before), afterTier = this.tier(npc.relationship);
    if (beforeTier !== afterTier) {
      this.game.toast(`${npc.name} now sees you as ${this.tierLabel(npc.relationship)}.`);
    }
  }

  // gift an item to an NPC (returns message)
  giveGift(npc, itemId) {
    const item = getItem(itemId);
    if (!item) return { ok: false, message: 'Unknown item.' };
    if (this.game.inventory.countItem(itemId) < 1) return { ok: false, message: 'Not in inventory.' };
    const likes = GIFT_PREFS[npc.occupation] || [];
    const loved = likes.includes(itemId);
    this.game.inventory.removeItem(itemId, 1);
    let delta, reaction;
    if (loved) { delta = 8; reaction = `${npc.name}'s face lights up. "You remembered! I love these!"`; }
    else if (item.category === 'food') { delta = 4; reaction = `${npc.name} accepts with a smile.`; }
    else { delta = 1; reaction = `${npc.name} thanks you politely.`; }
    this.change(npc, delta, `received a gift`);
    this.game.player.reputation = Math.min(100, this.game.player.reputation + (loved ? 2 : 1));
    return { ok: true, message: reaction };
  }

  // player attacked an NPC -> big negative + guards hostile
  onAttackNPC(npc) {
    this.change(npc, -40, 'was attacked by you');
    this.game.player.reputation = Math.max(0, this.game.player.reputation - 15);
  }
}
