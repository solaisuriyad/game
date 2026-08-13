export class HuntingSystem {
  constructor(game) { this.game = game; }

  // harvest an animal corpse (returns {ok, message})
  harvestCorpse(corpse) {
    const g = this.game;
    const p = g.player;
    const drops = g.combat.rollLoot(corpse.def.drops);
    const msgs = [];
    for (const d of drops) {
      const res = g.inventory.addItem(d.item, d.qty);
      if (res.ok) msgs.push(`${d.qty}x ${this.itemName(d.item)}`);
    }
    if (drops.length === 0) msgs.push('nothing usable');
    g.addXP(corpse.xp);
    p.animalsHunted++;
    g.quests.onHunt(corpse.def.id);
    // remove corpse
    const i = g.corpses.indexOf(corpse);
    if (i >= 0) g.corpses.splice(i, 1);
    return { ok: true, message: `Harvested ${corpse.def.name}: ${msgs.join(', ')}` };
  }

  itemName(id) {
    const it = this.game.items.get(id);
    return it ? it.name : id;
  }
}
