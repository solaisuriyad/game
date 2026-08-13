// NPC daily schedule + movement. Uses background simulation tiers:
//  - near (< 900px): full movement + socializing
//  - far: schedule phase changes only (position snaps at phase boundaries),
//    so a distant NPC still "appears" to work/come home without per-frame cost.
export function npcBrain(npc, dt, game) {
  const p = game.player;
  const distPlayer = npc.distTo(p);
  const phase = game.time.phase;
  const rng = game.world.rng;

  // phase change -> new schedule target
  if (npc.phase !== phase) {
    npc.phase = phase;
    npc.targetPos = scheduleTarget(npc, phase, game);
  }

  // background tier: far NPCs teleport at phase boundaries and skip movement
  if (distPlayer > 900) {
    if (npc.targetPos) { npc.x = npc.targetPos.x; npc.y = npc.targetPos.y; npc.targetPos = null; }
    return;
  }

  if (npc.targetPos) {
    const d = npc.distTo(npc.targetPos);
    if (d < 14) {
      npc.targetPos = null;
      npc.wanderTimer = rng.range(2, 6);
    } else {
      const a = Math.atan2(npc.targetPos.y - npc.y, npc.targetPos.x - npc.x);
      npc.facing = a;
      game.world.moveEntity(npc, Math.cos(a) * npc.speed * dt, Math.sin(a) * npc.speed * dt);
    }
  } else {
    // idle / socialize: small wander
    npc.wanderTimer = (npc.wanderTimer || 0) - dt;
    if (npc.wanderTimer <= 0) {
      npc.wanderTimer = rng.range(2, 6);
      npc.socialTimer = rng.range(0, 2);
      if (rng.chance(0.6)) {
        const a = rng.range(0, Math.PI * 2);
        npc.wanderTarget = { x: npc.x + Math.cos(a) * 40, y: npc.y + Math.sin(a) * 40 };
      } else { npc.wanderTarget = null; }
    }
    if (npc.wanderTarget) {
      const a = Math.atan2(npc.wanderTarget.y - npc.y, npc.wanderTarget.x - npc.x);
      npc.facing = a;
      game.world.moveEntity(npc, Math.cos(a) * npc.speed * 0.5 * dt, Math.sin(a) * npc.speed * 0.5 * dt);
      if (npc.distTo(npc.wanderTarget) < 8) npc.wanderTarget = null;
    }
  }
}

function scheduleTarget(npc, phase, game) {
  const w = game.world;
  const rng = w.rng;
  const spots = game.sim.publicSpots;
  switch (phase) {
    case 'night':
      return npc.homePos;
    case 'morning':
    case 'late-morning':
    case 'afternoon':
      if (npc.scheduleType === 'hunter' || npc.scheduleType === 'forager') {
        return npc.workPos; // leave village toward forest / river / mine
      }
      if (npc.scheduleType === 'child' || npc.scheduleType === 'elder') {
        return npc.workPos; // community area
      }
      if (npc.scheduleType === 'homemaker') {
        return rng.chance(0.5) ? spots.market : npc.homePos;
      }
      return npc.workPos; // worker -> work building
    case 'evening':
      return rng.chance(0.5) ? (rng.chance(0.5) ? spots.tavern : spots.market) : npc.homePos;
    default:
      return npc.homePos;
  }
}
