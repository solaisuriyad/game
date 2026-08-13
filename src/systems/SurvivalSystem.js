export class SurvivalSystem {
  constructor(game) { this.game = game; }

  update(dt) {
    const p = this.game.player;
    const t = this.game.time;
    const w = this.game.weather;
    const combat = this.game.combat;

    // decrement the "working" timer (set by gathering/chopping/harvesting)
    p.working = Math.max(0, (p.working || 0) - dt);

    // activity flags (what the player is doing right now)
    const active = p.attackWindup > 0 || p.blocking || p.dodgeTimer > 0 || p.charging;
    const inCombat = (combat._recentCombat || 0) > 0;
    const working = p.working > 0;
    const idle = !p.moving && !p.sprinting && !active && !working && !inCombat;

    // ---- HUNGER: drains very slowly; a bit faster when active ----
    let hungerRate = 0.04; // base — very slow
    if (p.moving) hungerRate += 0.04;
    if (p.sprinting) hungerRate += 0.12;
    if (working) hungerRate += 0.08;
    if (inCombat) hungerRate += 0.08;
    hungerRate *= (1 + (this.game.skills.getEffect('hungerRate') || 0));
    p.hunger = Math.max(0, p.hunger - hungerRate * dt);

    // ---- STAMINA: drains while sprinting/working/fighting; refills when calm ----
    let drain = 0;
    if (p.sprinting) drain += 12;
    if (working) drain += 8;
    if (active) drain += 4;
    if (drain > 0) {
      p.stamina = Math.max(0, p.stamina - drain * dt);
    } else if (!p.sprinting) {
      const regen = 20 * (1 + (this.game.skills.getEffect('staminaRegen') || 0));
      const hungerPenalty = p.hunger < 20 ? 0.4 : 1;
      p.stamina = Math.min(p.maxStamina, p.stamina + regen * hungerPenalty * dt);
    }

    // ---- HEALTH: regen when rested & fed; drop slowly from starvation/cold ----
    if (idle && p.hunger > 40 && p.health < p.maxHealth) {
      p.health = Math.min(p.maxHealth, p.health + 1.5 * dt);
    }
    if (p.hunger <= 0 && p.health > 1) {
      p.health = Math.max(1, p.health - 0.5 * dt); // starvation (slow)
    }

    // temperature
    let target = 20;
    if (t.isNight) target -= 8;
    if (w.raining) target -= 3;
    if (w.isStorm) target -= 4;
    p.temperature += (target - p.temperature) * Math.min(1, dt * 0.3);
    if (p.temperature < 5 && p.health > 1) p.health = Math.max(1, p.health - 0.6 * dt);

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
