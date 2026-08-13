import { getItem } from '../data/index.js';
import { RANKS, RANK_POINTS } from '../data/quests.js';

export class GuildSystem {
  constructor(game) { this.game = game; }

  rankIndex() {
    const p = this.game.player;
    let idx = 0;
    for (let i = 0; i < RANK_POINTS.length; i++) if (p.guildPoints >= RANK_POINTS[i]) idx = i;
    return idx;
  }
  rank() { return RANKS[this.rankIndex()]; }
  nextRankPoints() {
    const i = this.rankIndex();
    return i + 1 < RANK_POINTS.length ? RANK_POINTS[i + 1] : null;
  }

  // submit one stack of a material to the guild
  submit(itemId) {
    const p = this.game.player;
    const item = getItem(itemId);
    if (!item || !item.guildValue) return { ok: false, message: 'The guild doesn\'t need that.' };
    const have = this.game.inventory.countItem(itemId);
    if (have <= 0) return { ok: false, message: 'None in inventory.' };
    // submit a single unit
    const gp = item.guildValue;
    const gold = Math.round(item.value * 0.4);
    this.game.inventory.removeItem(itemId, 1);
    const before = this.rankIndex();
    p.guildPoints += gp;
    p.gold += gold;
    this.game.addXP(gp * 0.6);
    this.game.quests.onSubmit(itemId, 1);
    this.game.bus.emit('guildSubmit', { itemId });
    this.game.audio.sfx('quest');
    const after = this.rankIndex();
    let msg = `Submitted ${item.name}: +${gp} GP, +${gold}g`;
    if (after > before) msg += ` — RANK UP to ${RANKS[after]}!`;
    return { ok: true, message: msg, rankUp: after > before };
  }

  // submit an entire stack
  submitAll(itemId) {
    const have = this.game.inventory.countItem(itemId);
    let res = { ok: true };
    for (let i = 0; i < have; i++) { const r = this.submit(itemId); if (!r.ok) break; res = r; }
    return res;
  }
}
