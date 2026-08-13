export class SurvivalSystem {
  constructor(game) { this.game = game; }

  update(dt) {
    const p = this.game.player;
    const t = this.game.time;
    const w = this.game.weather;

    // hunger drains over time
    const hungerRate = 0.35 * (1 + (this.game.skills.getEffect('hungerRate') || 0)); // per second
    p.hunger = Math.max(0, p.hunger - hungerRate * dt);

    // stamina regen (not while attacking/blocking/dodging)
    const active = p.attackWindup > 0 || p.blocking || p.dodgeTimer > 0 || p.charging;
    if (!active) {
      const regen = 16 * (1 + (this.game.skills.getEffect('staminaRegen') || 0));
      const hungerPenalty = p.hunger < 20 ? 0.4 : 1;
      p.stamina = Math.min(p.maxStamina, p.stamina + regen * hungerPenalty * dt);
    }

    // health regen when well-fed and calm
    if (p.hunger > 60 && p.health < p.maxHealth && !this.game.combat._recentDamage) {
      p.health = Math.min(p.maxHealth, p.health + 0.6 * dt);
    }

    // starvation
    if (p.hunger <= 0 && p.health > 1) {
      p.health = Math.max(1, p.health - 1.2 * dt);
    }

    // temperature
    let target = 20;
    if (t.isNight) target -= 8;
    if (w.raining) target -= 3;
    if (w.isStorm) target -= 4;
    p.temperature += (target - p.temperature) * Math.min(1, dt * 0.3);
    if (p.temperature < 5 && p.health > 1) p.health = Math.max(1, p.health - 0.8 * dt);

    // energy (rest)
    p.energy = Math.max(0, p.energy - 0.3 * dt);
  }

  // mark recent damage so regen pauses briefly
  noteDamage() { this._recentDamage = 3; }

  rest() {
    const g = this.game;
    const p = g.player;
    // sleep until morning
    g.time.timeOfDay = 0.3;
    p.health = p.maxHealth;
    p.stamina = p.maxStamina;
    p.energy = 100;
    p.temperature = 21;
    g.toast('You rest and wake refreshed at dawn.');
    g.audio.sfx('levelup');
  }
}
