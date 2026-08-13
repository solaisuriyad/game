export class GatheringSystem {
  constructor(game) { this.game = game; }

  gatherNode(node) {
    const g = this.game;
    const p = g.player;
    // co-op: server-authoritative resources carry an `id`; send a gather intent
    // (loot + shared-quest progress arrive via the server `loot` event)
    if (node.id != null) {
      g.multiplayer.sendGather(node.id);
      g.audio.sfx('gather');
      return { ok: true, message: `Gathering ${node.kind}...` };
    }
    const yieldBonus = g.skills.getEffect('gatherYield') || 0;
    let itemId, qty;
    switch (node.kind) {
      case 'herb': itemId = Math.random() < 0.1 ? 'rare_herb' : 'herb'; qty = 1; break;
      case 'mushroom': itemId = 'mushroom'; qty = 1; break;
      case 'berry': itemId = 'berries'; qty = 1 + Math.floor(Math.random() * 3); break;
      case 'flower': itemId = 'flower'; qty = 1; break;
      case 'ore':
        itemId = this._pickWeighted([['stone', 5], ['copper_ore', 3], ['iron_ore', 2], ['silver_ore', 0.5], ['gold_ore', 0.2]]); qty = 1; break;
      default: itemId = 'herb'; qty = 1;
    }
    if (Math.random() < yieldBonus) qty++;
    p.working = 3; // gathering is work — drains stamina/hunger
    const res = g.inventory.addItem(itemId, qty);
    if (!res.ok) return res;
    p.gatheredCount++;
    g.quests.onGather(itemId, qty);
    node.depleted = true;
    node.respawn = 60 + Math.random() * 60;
    g.audio.sfx('gather');
    g.addFloatText(node.x, node.y - 12, '+' + qty + ' ' + this.itemName(itemId), '#9fe08a');
    return { ok: true, message: `Gathered ${qty}x ${this.itemName(itemId)}.` };
  }

  chopTree(tree) {
    const g = this.game;
    const yieldBonus = g.skills.getEffect('gatherYield') || 0;
    let itemId = 'wood';
    if (tree.dark && Math.random() < 0.3) itemId = 'rare_wood';
    let qty = 1 + (Math.random() < 0.4 ? 1 : 0);
    if (Math.random() < yieldBonus) qty++;
    g.player.working = 3; // chopping wood is work
    const res = g.inventory.addItem(itemId, qty);
    if (!res.ok) return res;
    g.quests.onGather(itemId, qty);
    g.player.gatheredCount++;
    tree.depleted = true;
    tree.respawn = 300; // chopped tree stays passable for 5 minutes, then regrows
    // chopping trees sometimes reveals a restorative orb
    if (Math.random() < 0.15) {
      const orb = Math.random() < 0.5 ? 'stamina_orb' : (Math.random() < 0.5 ? 'health_orb' : 'mana_orb');
      g.drops.push(new g.DDrop(tree.x + 13, tree.y + 13, orb, 1));
      g.addFloatText(tree.x + 13, tree.y - 24, '✨ orb!', '#c8a0ff');
    }
    g.audio.sfx('gather');
    g.addFloatText(tree.x + 13, tree.y - 12, '+' + qty + ' ' + this.itemName(itemId), '#d8b06a');
    return { ok: true, message: `Chopped ${qty}x ${this.itemName(itemId)}.` };
  }

  _pickWeighted(entries) {
    const total = entries.reduce((s, e) => s + e[1], 0);
    let r = Math.random() * total;
    for (const [id, w] of entries) { r -= w; if (r <= 0) return id; }
    return entries[0][0];
  }

  itemName(id) { const it = this.game.items.get(id); return it ? it.name : id; }

  update(dt) {
    for (const n of this.game.world.nodes) {
      if (n.depleted) { n.respawn -= dt; if (n.respawn <= 0) n.depleted = false; }
    }
    for (const cell of this.game.world.staticGrid.values()) {
      for (const c of cell) {
        if (c.type === 'tree' && c.depleted) { c.respawn -= dt; if (c.respawn <= 0) c.depleted = false; }
      }
    }
  }
}
