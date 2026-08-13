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

  placeTrap(x, y) {
    const g = this.game;
    if (!g.inventory.removeItem('trap', 1)) return { ok: false, message: 'No trap.' };
    g.traps.push({ x, y, timer: 12, caught: null });
    return { ok: true, message: 'Trap placed.' };
  }

  update(dt) {
    const g = this.game;
    for (const t of g.traps) {
      if (t.caught) continue;
      t.timer -= dt;
      if (t.timer <= 0) {
        // check for nearby small game
        const prey = g.animals.find((a) => !a.dead && (a.def.id === 'rabbit' || a.def.id === 'fox') && a.distTo(t) < 50);
        if (prey) {
          prey.dead = true;
          g.corpses.push({ x: prey.x, y: prey.y, def: prey.def, xp: prey.xp });
          t.caught = prey;
        } else {
          t.timer = 30; // keep waiting
        }
      }
    }
    // remove empty traps after a long time
    g.traps = g.traps.filter((t) => !(t.caught && t.timer <= -20) && !(t.timer < -120));
  }
}
