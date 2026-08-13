// Authoritative shared world events (Phase 8).
//
// The server drives world events that every connected player experiences at the
// same time: monster raids, migrations, and rare sightings. Spawned monsters are
// replicated automatically via the existing monster-state channel.
import { MONSTERS } from '../src/data/monsters.js';

export class WorldEvents {
  constructor(world, sim) {
    this.world = world;
    this.sim = sim;
    this.emit = () => {}; // (type, data) -> GameServer routes
    this.timer = 45;
  }

  tick(dt) {
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = 60 + Math.random() * 90;
      this._roll();
    }
  }

  _roll() {
    const r = Math.random();
    if (r < 0.4) this._monsterAttack();
    else if (r < 0.7) this._migration();
    else if (r < 0.9) this._rareSighting();
    // else: quiet
  }

  _monsterAttack() {
    const def = MONSTERS.find((m) => m.id === 'goblin');
    if (!def) return;
    let spawned = 0;
    for (let i = 0; i < 5; i++) {
      const pos = this.world.randomPosition(26, 34);
      if (!this.world.circleBlocked(pos.x, pos.y, 14)) { this.sim.spawn(def, pos.x, pos.y); spawned++; }
    }
    if (spawned) this.emit('worldEvent', { type: 'monsterAttack', text: 'A goblin raid is attacking the village — defend it!' });
  }

  _migration() {
    const def = MONSTERS.find((m) => m.id === 'wolf');
    if (!def) return;
    let spawned = 0;
    for (let i = 0; i < 4; i++) {
      const pos = this.world.randomPosition(52, 76);
      if (!this.world.circleBlocked(pos.x, pos.y, 14)) { this.sim.spawn(def, pos.x, pos.y); spawned++; }
    }
    if (spawned) this.emit('worldEvent', { type: 'migration', text: 'A wolf migration is moving through the deep forest.' });
  }

  _rareSighting() {
    const def = MONSTERS.find((m) => m.id === 'demon_beast') || MONSTERS[0];
    const pos = this.world.randomPosition(40, 60);
    if (this.world.circleBlocked(pos.x, pos.y, 14)) return;
    const m = this.sim.spawn(def, pos.x, pos.y);
    this.emit('worldEvent', { type: 'rareSighting', text: 'A rare creature has been spotted in the forest!' });
  }
}
