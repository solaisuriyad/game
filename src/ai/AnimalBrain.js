// Animal behavior: wander / eat / drink / flee / attack (predators).
import { VILLAGE_CX, VILLAGE_CY, TILE } from '../world/WorldSystem.js';

function nearestBait(game, animal, radius) {
  let best = null, bd = radius;
  for (const b of game.baitPiles) {
    const d = Math.hypot(b.x - animal.x, b.y - animal.y);
    if (d < bd) { bd = d; best = b; }
  }
  return best;
}

export function animalBrain(animal, dt, game) {
  const p = game.player;
  const rng = game.world.rng;
  const dPlayer = animal.distTo(p);

  // leave trail for tracking (footprints; blood when wounded)
  animal.trailTimer = (animal.trailTimer || 0) - dt;
  if (animal.trailTimer <= 0 && animal.state !== 'dead') {
    animal.trailTimer = 0.28;
    if (!animal.trail) animal.trail = [];
    animal.trail.push({ x: animal.x, y: animal.y, blood: animal.hp < animal.maxHp * 0.5, t: 0 });
    if (animal.trail.length > 90) animal.trail.shift();
  }
  for (const tr of animal.trail) tr.t += dt;
  if (animal.trail) animal.trail = animal.trail.filter((tr) => tr.t < 22);

  // determine threat (stealth-aware detection)
  const wasWounded = animal.hp < animal.maxHp;
  const detected = game.stealth.canDetect(animal, 150);
  if (wasWounded) animal.threat = p;
  else if (detected) animal.threat = p;
  else if (animal.threat && dPlayer > 260) animal.threat = null;

  // aggression check (boar/bear fight back)
  const aggressive = animal.aggression > 0.45;
  if (animal.threat && aggressive && dPlayer < 90) {
    animal.state = 'attack';
  } else if (animal.threat) {
    animal.state = 'flee';
  }

  switch (animal.state) {
    case 'flee': {
      const a = Math.atan2(animal.y - animal.threat.y, animal.x - animal.threat.x);
      const spd = animal.speed * 1.3;
      game.world.moveEntity(animal, Math.cos(a) * spd * dt, Math.sin(a) * spd * dt);
      animal.facing = a;
      // calm down when far
      if (animal.distTo(animal.threat) > 320) { animal.state = 'wander'; animal.threat = null; }
      break;
    }
    case 'attack': {
      const a = animal.angleTo(p);
      animal.facing = a;
      game.world.moveEntity(animal, Math.cos(a) * animal.speed * dt, Math.sin(a) * animal.speed * dt);
      animal.attackTimer = (animal.attackTimer || 0) - dt;
      if (animal.attackTimer <= 0 && dPlayer < animal.radius + p.radius + 6) {
        animal.attackTimer = 1.4;
        game.combat.damagePlayer(animal.damage, animal, null);
      }
      if (dPlayer > 200) { animal.state = 'wander'; animal.threat = null; }
      break;
    }
    default: {
      // bait attraction: hungry herbivores/omnivores move toward nearby bait
      const bait = nearestBait(game, animal, 160);
      if (bait) {
        animal.facing = animal.angleTo(bait);
        game.world.moveEntity(animal, Math.cos(animal.facing) * animal.speed * 0.7 * dt, Math.sin(animal.facing) * animal.speed * 0.7 * dt);
        animal.state = 'eat';
        break;
      }
      // wander / eat / idle
      animal.eatTimer = (animal.eatTimer || 0) - dt;
      animal.wanderTimer = (animal.wanderTimer || 0) - dt;
      if (animal.eatTimer > 0) { animal.state = 'eat'; break; }
      if (!animal.wanderTarget || animal.wanderTimer <= 0 || animal.distTo(animal.wanderTarget) < 10) {
        // pick a new wander point near home (stay in own zone)
        const ang = rng.range(0, Math.PI * 2);
        const dist = rng.range(40, 160);
        animal.wanderTarget = { x: animal.x + Math.cos(ang) * dist, y: animal.y + Math.sin(ang) * dist };
        animal.wanderTimer = rng.range(3, 8);
        if (rng.chance(0.4)) { animal.eatTimer = rng.range(1.5, 4); animal.state = 'eat'; }
        // keep within spawn region (don't wander into village)
        const dx = animal.wanderTarget.x - VILLAGE_CX * TILE;
        const dy = animal.wanderTarget.y - VILLAGE_CY * TILE;
        if (Math.hypot(dx, dy) < 28 * 32) {
          animal.wanderTarget = { x: animal.x + 200, y: animal.y };
        }
      }
      animal.state = 'wander';
      const a = Math.atan2(animal.wanderTarget.y - animal.y, animal.wanderTarget.x - animal.x);
      animal.facing = a;
      game.world.moveEntity(animal, Math.cos(a) * animal.speed * 0.6 * dt, Math.sin(a) * animal.speed * 0.6 * dt);
      break;
    }
  }
}
