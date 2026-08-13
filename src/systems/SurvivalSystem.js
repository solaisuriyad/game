// Survival: Health / Stamina / MP (each with 200% capacity), plus hunger,
// temperature and rest. The 3 core resources drain very slowly during activity,
// recover when idle, and have a "safety net" — once a resource drops below 50%
// (then 25%) it starts recovering even while you're busy, so vitals stay high.
export class SurvivalSystem {
  constructor(game) { this.game = game; }

  update(dt) {
    const g = this.game;
    const p = g.player;
    const t = g.time;
    const w = g.weather;
    const combat = g.combat;

    p.working = Math.max(0, (p.working || 0) - dt);

    const active = p.attackWindup > 0 || p.blocking || p.dodgeTimer > 0 || p.charging;
    const inCombat = (combat._recentCombat || 0) > 0;
    const working = p.working > 0;
    const busy = active || working || inCombat || p.sprinting;
    // "resting" = not actively doing anything. Walking is treated as resting too
    // (walking never drains stamina), so a stuck movement state can never block
    // recovery. Only sprinting / working / fighting pause it.
    const resting = !busy;

    // ---- hold-full buffs (hidden drops) keep a resource pinned at max ----
    if (p.buffs.healthHold > 0) { p.buffs.healthHold -= dt; p.health = p.maxHealth; }
    if (p.buffs.staminaHold > 0) { p.buffs.staminaHold -= dt; p.stamina = p.maxStamina; }
    if (p.buffs.manaHold > 0) { p.buffs.manaHold -= dt; p.mp = p.maxMp; }
    // active-skill buffs (Stone Guard armor, Swift Step speed)
    if (p.buffs.armor > 0) p.buffs.armor = Math.max(0, p.buffs.armor - dt);
    if (p.buffs.speed > 0) p.buffs.speed = Math.max(0, p.buffs.speed - dt);
    // Yggdrasil blessing invulnerability timer
    if (p.yggBlessing > 0) p.yggBlessing = Math.max(0, p.yggBlessing - dt);
    // while standing within the Yggdrasil's aura, the tree sustains you fully
    const nearYgg = g.nearYggdrasil();
    if (nearYgg) {
      p.health = Math.min(p.maxHealth, p.health + 40 * dt);
      p.stamina = Math.min(p.maxStamina, p.stamina + 40 * dt);
      p.mp = Math.min(p.maxMp, p.mp + 40 * dt);
      p.hunger = Math.min(100, p.hunger + 10 * dt);
      p.temperature += (21 - p.temperature) * Math.min(1, dt * 2);
    }

    // ---- HUNGER: drains very slowly ----
    let hungerRate = 0.04;
    if (p.moving) hungerRate += 0.04;
    if (p.sprinting) hungerRate += 0.12;
    if (working) hungerRate += 0.08;
    if (inCombat) hungerRate += 0.08;
    hungerRate *= (1 + (g.skills.getEffect('hungerRate') || 0));
    p.hunger = Math.max(0, p.hunger - hungerRate * dt);

    // ---- idle timer (5 seconds of rest triggers full regeneration) ----
    if (resting) p.idleTime = (p.idleTime || 0) + dt; else p.idleTime = 0;
    p.recovering = (p.idleTime || 0) >= 5; // exposed to the HUD for a visible indicator

    // ---- STAMINA: drains very slowly on activity; after 5s idle it refills to
    //      FULL within 1 minute (drains slightly reduced) ----
    let sDrain = 0;
    if (p.sprinting) sDrain += 0.10;
    if (working) sDrain += 0.07;
    if (active) sDrain += 0.04;
    let sRegen = 0;
    if ((p.idleTime || 0) >= 5) {
      sRegen = p.maxStamina / 60;            // full within ~1 minute
    } else {
      const sf = p.stamina / p.maxStamina;
      if (sf <= 0.25) sRegen = 20 * 0.95;    // safety net (very low)
      else if (sf <= 0.5) sRegen = 20 * 0.25;
      else if (resting) sRegen = 8;          // gentle trickle before the 5s mark
    }
    const sNet = sRegen - sDrain;
    if (sNet > 0) p.stamina = Math.min(p.maxStamina, p.stamina + sNet * dt);
    else p.stamina = Math.max(0, p.stamina + sNet * dt);

    // ---- MP: drains very slowly; after 5s idle (and no skill use) it refills
    //      to FULL within 1.5 minutes ----
    let mDrain = busy ? 0.02 : 0;
    if (p.castingSkill > 0) mDrain = 0.03 / 95; // 95x slower while casting
    let mRegen = 0;
    if ((p.idleTime || 0) >= 5 && p.castingSkill <= 0) {
      mRegen = p.maxMp / 90;                 // full within ~1.5 minutes
    } else {
      const mf = p.mp / p.maxMp;
      if (mf <= 0.25) mRegen = 10 * 0.95;    // safety net
      else if (mf <= 0.5) mRegen = 10 * 0.25;
      else if (resting) mRegen = 4;
    }
    const mNet = mRegen - mDrain;
    if (mNet > 0) p.mp = Math.min(p.maxMp, p.mp + mNet * dt);
    else p.mp = Math.max(0, p.mp + mNet * dt);
    p.castingSkill = Math.max(0, p.castingSkill - dt);

    // ---- HEALTH (only drops from damage/starvation/cold; regen when fed) ----
    this._resource(p, 'health', 'maxHealth', 0, 2, dt, { idle: resting, busy, idleRequiresFed: true });

    // starvation (slow) & cold (slow) — but the Yggdrasil's aura prevents death
    if (p.hunger <= 0 && p.health > 1 && !nearYgg) p.health = Math.max(1, p.health - 0.5 * dt);

    // temperature
    let target = 20;
    if (t.isNight) target -= 8;
    if (w.raining) target -= 3;
    if (w.isStorm) target -= 4;
    p.temperature += (target - p.temperature) * Math.min(1, dt * 0.3);
    if (p.temperature < 5 && p.health > 1 && !nearYgg) p.health = Math.max(1, p.health - 0.6 * dt);

    // energy (rest)
    p.energy = Math.max(0, p.energy - 0.3 * dt);
  }

  // One resource's drain/recovery with the low-resource safety net.
  //   fullRegen = recovery per second when resting at normal capacity
  //   - below 50%: recover at 25% of fullRegen, even while busy
  //   - below 25%: recover at 95% of fullRegen, even while busy
  _resource(p, key, maxKey, drain, fullRegen, dt, { idle, busy, idleRequiresFed }) {
    const max = p[maxKey];
    const frac = p[key] / max;
    let regen = 0;
    if (frac <= 0.25) {
      regen = fullRegen * 0.95;
    } else if (frac <= 0.5) {
      regen = fullRegen * 0.25;
    } else if (idle && !(idleRequiresFed && p.hunger <= 40)) {
      regen = fullRegen;
    }
    const net = regen - drain;
    if (net > 0) p[key] = Math.min(max, p[key] + net * dt);
    else if (net < 0) p[key] = Math.max(0, p[key] + net * dt);
  }

  // mark recent damage so regen pauses briefly
  noteDamage() { this._recentDamage = 3; }

  rest() {
    const g = this.game;
    const p = g.player;
    g.time.timeOfDay = 0.3;
    p.health = p.maxHealth;
    p.stamina = p.maxStamina;
    p.mp = p.maxMp;
    p.energy = 100;
    p.temperature = 21;
    g.toast('You rest and wake refreshed at dawn.');
    g.audio.sfx('levelup');
  }
}
