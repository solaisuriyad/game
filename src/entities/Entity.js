export class Entity {
  constructor(x, y, radius = 12) {
    this.x = x; this.y = y;
    this.radius = radius;
    this.dead = false;
    this.statuses = []; // { type, duration, magnitude, tick, tickTimer }
    this.facing = 0;
  }
  addStatus(type, duration, magnitude = 1) {
    // merge/refresh same type
    const existing = this.statuses.find((s) => s.type === type);
    if (existing) { existing.duration = Math.max(existing.duration, duration); existing.magnitude = magnitude; }
    else this.statuses.push({ type, duration, magnitude, tick: this.statusTick(type), tickTimer: 0 });
  }
  statusTick(type) {
    switch (type) {
      case 'poison': return 0.6;
      case 'bleed': return 0.7;
      case 'burn': return 0.5;
      default: return 0;
    }
  }
  hasStatus(type) { return this.statuses.some((s) => s.type === type); }
  get statusSlow() {
    let slow = 1;
    for (const s of this.statuses) {
      if (s.type === 'slow') slow *= (1 - 0.45 * s.magnitude);
      if (s.type === 'root') slow = 0;
      if (s.type === 'stun') slow = 0;
    }
    return slow;
  }
  tickStatuses(dt, game) {
    for (const s of this.statuses) {
      s.duration -= dt;
      if (s.tick > 0) {
        s.tickTimer += dt;
        if (s.tickTimer >= s.tick) {
          s.tickTimer -= s.tick;
          const dmg = (s.type === 'poison' ? 3 : s.type === 'bleed' ? 4 : 5) * s.magnitude;
          game.combat.damageEntity(this, dmg, 'dot', null);
        }
      }
    }
    this.statuses = this.statuses.filter((s) => s.duration > 0);
  }
  distTo(o) { return Math.hypot(o.x - this.x, o.y - this.y); }
  angleTo(o) { return Math.atan2(o.y - this.y, o.x - this.x); }
}
