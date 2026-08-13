import { Animal } from './Animal.js';

// A server-authoritative animal on the client. Reuses Animal's rendering but
// does NOT run local AI — position/health come from server snapshots and are
// interpolated for smoothness.
export class RemoteAnimal extends Animal {
  constructor(game, def, id, data) {
    super(game, def, data.x, data.y);
    this.remoteId = id;
    this.targetX = data.x; this.targetY = data.y;
    this.hp = data.hp; this.maxHp = data.maxHp;
  }
  apply(data) {
    this.targetX = data.x; this.targetY = data.y;
    this.hp = data.hp; this.facing = data.facing;
  }
  update(dt) {
    const k = Math.min(1, dt * 12);
    this.x += (this.targetX - this.x) * k;
    this.y += (this.targetY - this.y) * k;
  }
}
