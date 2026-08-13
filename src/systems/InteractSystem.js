// Routes the E/interact key to the nearest valid target.
export class InteractSystem {
  constructor(game) { this.game = game; }
  get p() { return this.game.player; }

  nearestCorpse(r = 44) {
    let best = null, bd = r;
    for (const c of this.game.corpses) {
      const d = Math.hypot(c.x - this.p.x, c.y - this.p.y);
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }
  nearestNode(r = 36) {
    let best = null, bd = r;
    for (const n of this.game.world.nodes) {
      if (n.depleted) continue;
      const d = Math.hypot(n.x - this.p.x, n.y - this.p.y);
      if (d < bd) { bd = d; best = n; }
    }
    return best;
  }
  nearestTree(r = 44) {
    let best = null, bd = r;
    for (const c of this.game.world.collidersNear(this.p.x, this.p.y, r)) {
      if (c.type !== 'tree' || c.depleted) continue;
      const d = Math.hypot((c.x + 13) - this.p.x, (c.y + 13) - this.p.y);
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }
  nearestNPC(r = 46) {
    let best = null, bd = r;
    for (const n of this.game.npcs) {
      const d = this.p.distTo(n);
      if (d < bd) { bd = d; best = n; }
    }
    return best;
  }

  prompt() {
    const g = this.game;
    const corpse = this.nearestCorpse();
    if (corpse) return `E — Harvest ${corpse.def.name}`;
    const node = this.nearestNode();
    if (node) return `E — Gather ${node.kind}`;
    const tree = this.nearestTree();
    if (tree) return 'E — Chop wood';
    const npc = this.nearestNPC();
    if (npc) return `E — Talk to ${npc.name}`;
    const b = g.world.nearestBuilding(this.p.x, this.p.y, 56);
    if (b) return `E — ${b.building.name}`;
    return null;
  }

  interact() {
    const g = this.game;
    const corpse = this.nearestCorpse();
    if (corpse) { g.toast(g.hunting.harvestCorpse(corpse).message); return; }
    const node = this.nearestNode();
    if (node) { g.toast(g.gathering.gatherNode(node).message); return; }
    const tree = this.nearestTree();
    if (tree) { g.toast(g.gathering.chopTree(tree).message); return; }
    const npc = this.nearestNPC();
    if (npc) { g.ui.openDialogue(npc); return; }
    const b = g.world.nearestBuilding(this.p.x, this.p.y, 56);
    if (b) { g.ui.openBuilding(b.building); return; }
  }
}
