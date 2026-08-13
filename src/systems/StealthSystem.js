// Stealth & detection. Governs whether animals/monsters can perceive the player,
// factoring noise (movement), crouch, weather, time of day, vision cones, and
// line-of-sight through trees/buildings.
export class StealthSystem {
  constructor(game) { this.game = game; }

  // ---- player perception inputs ----
  playerNoise() {
    const p = this.game.player;
    if (p.hasStatus('stun') || p.hasStatus('root')) return 0.9;
    if (!p.moving) return 0.05;
    if (p.crouching) return 0.15;
    if (p.dodgeTimer > 0) return 0.7;
    return 0.6; // running
  }
  playerVisibility() {
    const p = this.game.player;
    let v = 0.85;
    if (p.crouching) v = 0.4;
    // near a tree -> cover bonus
    const nearCover = this.game.world.collidersNear(p.x, p.y, 46).some((c) => c.type === 'tree');
    if (nearCover) v *= 0.7;
    return v;
  }
  _nocturnal(entity) {
    return entity.aiProfile ? !!entity.aiProfile.nocturnal : !!entity.def?.nocturnal;
  }

  // base radius scaled by all perception factors
  detectionRadius(entity, base) {
    const g = this.game;
    let r = base;
    r *= 0.5 + this.playerNoise() * 0.7;   // 0.5 (silent) .. 1.2 (loud)
    r *= 0.4 + this.playerVisibility() * 0.7;
    r *= g.weather.visibility;             // fog/rain cut vision
    if (g.time.isNight) r *= this._nocturnal(entity) ? 1.3 : 0.6;
    return r;
  }

  // full perception check: distance + vision cone + line of sight
  canDetect(entity, base) {
    const g = this.game;
    const p = g.player;
    const d = entity.distTo(p);
    const r = this.detectionRadius(entity, base);
    if (d > r) return false;
    // vision cone: seeing behind is much harder
    const angTo = entity.angleTo(p);
    let diff = Math.abs(angTo - (entity.facing || 0));
    if (diff > Math.PI) diff = Math.PI * 2 - diff;
    if (diff > 1.3 && d > r * 0.35) return false;
    return g.world.hasLineOfSight(entity.x, entity.y, p.x, p.y);
  }

  // true if the player is audible (running/crouching noise carries)
  audible(entity, baseNoiseRadius = 240) {
    const g = this.game;
    const p = g.player;
    const noise = this.playerNoise();
    if (noise < 0.3) return false;
    const d = entity.distTo(p);
    return d < baseNoiseRadius * noise * g.weather.visibility;
  }
}
