// Monster AI state machine: idle/wander/patrol/investigate/chase/attack/
// useAbility/flee/callAllies/returnHome/enrage. Behavior depends on health,
// distance, time of day, weather, territory, allies, and (adaptive) player style.
export function monsterBrain(m, dt, game) {
  const p = game.player;
  const prof = m.aiProfile;
  const rng = game.world.rng;
  const dPlayer = m.distTo(p);
  const night = game.time.isNight;

  // dash (lunge/pounce) movement
  if (m.dash) {
    m.dash.t -= dt;
    game.world.moveEntity(m, m.dash.dx * (m.dash.speed || 300) * dt, m.dash.dy * (m.dash.speed || 300) * dt);
    if (m.distTo(p) < m.radius + p.radius + 6) {
      game.combat.damagePlayer(m.dash.damage, m, m.dash.status);
      m.dash = null;
    } else if (m.dash.t <= 0) { m.dash = null; }
  }

  // cast (ability windup)
  if (m.casting) {
    m.castTimer -= dt;
    // telegraph: turn color during windup handled in draw via casting
    if (m.castTimer <= 0) {
      game.abilities.execute(m, m.casting.ability, m.casting.params, game);
      m.abilityCd[m.casting.ability] = m.casting.params.cooldown;
      m.casting = null;
    }
    return; // locked in place while casting
  }

  // cooldowns
  m.attackCd = Math.max(0, m.attackCd - dt);
  for (const k in m.abilityCd) m.abilityCd[k] -= dt;

  // detection (stealth-aware: crouch, cover, vision cone, line of sight, noise)
  const detectR = 230 + (night ? 60 : 0);
  const detected = game.stealth.canDetect(m, detectR);
  if (m.aggroTimer > 0) m.aggroTimer -= dt;

  if (!m.target || m.target.dead) {
    if (m.aggroTimer <= 0 && !detected) m.target = null;
  } else if (m.aggroTimer <= 0 && dPlayer > 720) {
    m.target = null; // leash broken
  }

  if (detected && m.aggroTimer <= 0 && m.target !== p) {
    m.target = p;
    m.aggroTimer = 8;
    if (prof.pack) m._wantsHowl = true;
  }

  // noise investigation: loud movement makes monsters suspicious even without sight
  if (!m.target && !m.investigate && game.stealth.audible(m, 260)) {
    m.investigate = { x: p.x, y: p.y, t: 4 };
    m.lastSeenPlayer = { x: p.x, y: p.y };
  }

  // rage threshold (bosses / aggressive monsters enrage below 50%)
  if (m.hp < m.maxHp * 0.5 && !m.buffs.rage && (m.boss || prof.aggression >= 0.8)) {
    m.buffs.rage = 8;
    game.addFloatText(m.x, m.y - 34, 'Enraged!', '#ff5050');
  }

  const hasTarget = m.target && !m.target.dead;

  // flee when courage low and badly hurt
  if (hasTarget && prof.courage < 0.6 && m.hp < m.maxHp * 0.18 && !m.boss) {
    fleeFrom(m, p, dt, game); return;
  }

  if (!hasTarget) {
    // investigate a sound before returning to normal behavior
    if (m.investigate) {
      m.investigate.t -= dt;
      const dI = Math.hypot(m.investigate.x - m.x, m.investigate.y - m.y);
      if (m.investigate.t <= 0 || dI < 16) { m.investigate = null; m.state = 'idle'; }
      else { m.state = 'investigate'; moveToward(m, m.investigate, m.speed * 0.8 * m.speedMult, dt, game); }
      return;
    }
    // no target: wander / patrol / sleep / return home
    if (!m._awake && !night && prof.nocturnal) {
      m.state = 'sleep'; return;
    }
    if (m.state === 'sleep' && night) m.state = 'idle';
    if (Math.hypot(m.x - m.home.x, m.y - m.home.y) > m.territoryR) {
      m.state = 'return';
    } else {
      m.state = 'wander';
    }
    if (m.state === 'return') {
      moveToward(m, m.home, m.speed * m.speedMult, dt, game);
      if (m.distTo(m.home) < 12) m.state = 'idle';
    } else {
      m.wanderTimer = (m.wanderTimer || 0) - dt;
      if (!m.wanderTarget || m.wanderTimer <= 0 || m.distTo(m.wanderTarget) < 12) {
        const ang = rng.range(0, Math.PI * 2);
        m.wanderTarget = { x: m.home.x + Math.cos(ang) * rng.range(30, m.territoryR * 0.8), y: m.home.y + Math.sin(ang) * rng.range(30, m.territoryR * 0.8) };
        m.wanderTimer = rng.range(3, 7);
      }
      moveToward(m, m.wanderTarget, m.speed * 0.5 * m.speedMult, dt, game);
    }
    return;
  }

  // ---- has target ----
  m.state = 'chase';
  m.lastSeenPlayer = { x: p.x, y: p.y };

  const inMelee = dPlayer < (m.abilities[0] ? m.abilities[0].params.range : 40) * 0.9;

  // choose ability
  const chosen = chooseAbility(m, dPlayer, inMelee, game);
  if (chosen) {
    m.casting = { ability: chosen.ability, params: chosen.params };
    m.castTimer = game.abilitiesData[chosen.ability].windup;
    m.state = 'attack';
    return;
  }

  // chase
  if (!inMelee) {
    moveToward(m, p, m.speed * m.speedMult, dt, game);
  } else if (m.attackCd <= 0) {
    m.attackCd = m.abilities[0].params.cooldown;
    game.abilities.execute(m, m.abilities[0].id, m.abilities[0].params, game);
  }
  m.facing = m.angleTo(p);
}

function moveToward(m, target, speed, dt, game) {
  const a = Math.atan2(target.y - m.y, target.x - m.x);
  m.facing = a;
  game.world.moveEntity(m, Math.cos(a) * speed * dt, Math.sin(a) * speed * dt);
}

function fleeFrom(m, p, dt, game) {
  m.state = 'flee';
  const a = Math.atan2(m.y - p.y, m.x - p.x);
  game.world.moveEntity(m, Math.cos(a) * m.speed * 1.3 * dt, Math.sin(a) * m.speed * 1.3 * dt);
  if (m.distTo(p) > 420) { m.target = null; m.state = 'return'; }
}

function chooseAbility(m, dPlayer, inMelee, game) {
  const p = game.player;
  const prof = m.aiProfile;
  // adaptive: player spamming bow -> close distance with mobility
  const playerRanged = p.weapon && p.weapon.type === 'bow';
  const wantsClose = playerRanged && dPlayer > 140;

  const candidates = [];
  const isSelf = (id) => ['regenerate', 'rage', 'howl', 'summon', 'roar'].includes(id);
  for (const ab of m.abilities) {
    if ((m.abilityCd[ab.id] || 0) > 0) continue;
    // reach gating: melee abilities require close range; ranged/dash require within reach
    if (ab.id === 'melee_basic' || ab.id === 'bleeding_bite') {
      if (!inMelee) continue;
    } else if (!isSelf(ab.id)) {
      const r = ab.params.range || 0;
      if (r > 0 && dPlayer > r * 1.15) continue; // out of reach
    }
    // hp-gated abilities
    if (ab.id === 'howl' && m.hp > m.maxHp * 0.5) continue;
    if (ab.id === 'regenerate' && m.hp > m.maxHp * 0.6) continue;
    if (ab.id === 'rage' && m.hp > m.maxHp * 0.5) continue;

    let weight = 1;
    if (ab.id === 'melee_basic') weight = 4;
    if ((ab.id === 'lunge' || ab.id === 'pounce' || ab.id === 'charge') && wantsClose) weight += 2;
    if (ab.id === 'howl') weight = m._wantsHowl ? 3 : 0.4;
    if ((ab.id === 'web_shot' || ab.id === 'throw_rock' || ab.id === 'fire_breath' || ab.id === 'ice_breath') && dPlayer > 120) weight += 1.5;
    if ((ab.id === 'root_slam' || ab.id === 'ground_slam' || ab.id === 'tail_swipe') && dPlayer < 110) weight += 1.5;
    if (ab.id === 'summon' && m.boss) weight += 1;
    candidates.push({ ability: ab.id, params: ab.params, w: weight });
  }
  m._wantsHowl = false;
  if (!candidates.length) return null;
  const total = candidates.reduce((s, c) => s + c.w, 0);
  let r = Math.random() * total;
  for (const c of candidates) { r -= c.w; if (r <= 0) return c; }
  return candidates[candidates.length - 1];
}
