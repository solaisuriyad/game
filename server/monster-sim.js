// Authoritative monster simulation (Phase 7).
//
// The server owns monster state: positions, AI (target nearest player, chase,
// use abilities), health, boss phases, deaths and loot. Clients receive
// snapshots and send attack intents; the server validates and resolves damage.
//
// Boss scaling (§61): bosses scale by party size — health and damage increase,
// and ability cooldowns tighten (more mechanics pressure) as more players join.
import { MONSTERS } from '../src/data/monsters.js';

const ZONE_RINGS = { 1: [30, 50], 2: [52, 76], 3: [78, 99], 4: [101, 122], 5: [124, 138] };

// spawn plan: how many of each monster the shared world keeps alive
const SPAWN_PLAN = [
  { id: 'slime', count: 6 }, { id: 'goblin', count: 5 }, { id: 'wolf', count: 6 },
  { id: 'spider', count: 4 }, { id: 'treant', count: 3 }, { id: 'skeleton', count: 3 },
  { id: 'swamp_beast', count: 2 }, { id: 'demon_beast', count: 2 }, { id: 'ancient_beast', count: 1 },
  { id: 'dire_wolf', count: 4 }, { id: 'goblin_shaman', count: 3 }, { id: 'goblin_brute', count: 3 },
  { id: 'thorn_beast', count: 3 }, { id: 'shadow_stalker', count: 3 }, { id: 'cave_troll', count: 2 },
  { id: 'venom_wyrm', count: 3 }, { id: 'hell_hound', count: 3 }, { id: 'yggdrasil_spriggan', count: 2 },
  { id: 'alpha_wolf', count: 1 }, { id: 'ancient_bear', count: 1 },
  { id: 'forest_guardian', count: 1 }, { id: 'ancient_dragon', count: 1 }
];

const SELF_ABILITIES = new Set(['regenerate', 'rage', 'howl', 'summon', 'roar']);
const MELEE_ABILITIES = new Set(['melee_basic', 'bleeding_bite']);
const DASH_ABILITIES = new Set(['lunge', 'pounce', 'charge']);
const RANGED_ABILITIES = new Set(['throw_rock', 'web_shot', 'fire_breath', 'ice_breath']);
const AOE_ABILITIES = new Set(['root_slam', 'ground_slam', 'tail_swipe']);

export class MonsterSim {
  constructor(world) {
    this.world = world;
    this.monsters = [];
    this.nextId = 1;
    this.emit = () => {}; // (type, data) — wired by GameServer
    this._spawn();
  }

  get partySize() { return this._partySize || 1; }

  // ---- spawning & scaling ----
  _spawn() {
    for (const s of SPAWN_PLAN) {
      const def = MONSTERS.find((m) => m.id === s.id);
      if (!def) continue;
      for (let i = 0; i < s.count; i++) this.spawn(def);
    }
  }

  zoneRange(def) {
    const z = def.zones[Math.floor(Math.random() * def.zones.length)];
    return ZONE_RINGS[z] || [30, 50];
  }

  spawn(def, x, y) {
    let pos;
    if (x == null) { const [minD, maxD] = this.zoneRange(def); pos = this.world.randomPosition(minD, maxD); }
    else pos = { x, y };
    const m = this._makeMonster(def, pos.x, pos.y);
    this.monsters.push(m);
    this._applyScaling(m);
    return m;
  }

  _makeMonster(def, x, y) {
    return {
      id: this.nextId++,
      defId: def.id, name: def.name, family: def.family,
      x, y, radius: def.size, facing: Math.random() * Math.PI * 2,
      baseHp: def.hp, maxHp: def.hp, hp: def.hp,
      damage: def.damage, defense: def.defense, speed: def.speed,
      color: def.color, boss: !!def.boss, xp: def.xp,
      aiProfile: def.aiProfile, abilities: def.abilities, phases: def.phases || null,
      phaseIndex: 0, loot: def.loot,
      home: { x, y }, territoryR: 240,
      wanderTarget: null, wanderTimer: 0,
      targetId: null, aggroTimer: 0,
      attackCd: 0, abilityCd: {}, buffs: { rage: 0 },
      dead: false
    };
  }

  // party-size scaling: more health, more damage, tighter ability cooldowns
  rescale(partySize) {
    this._partySize = Math.max(1, partySize);
    for (const m of this.monsters) this._applyScaling(m);
  }
  _applyScaling(m) {
    if (!m.boss) return;
    const def = MONSTERS.find((d) => d.id === m.defId);
    const n = this.partySize;
    const hpMult = 1 + 0.5 * (n - 1);
    const dmgMult = 1 + 0.25 * (n - 1);
    const oldMax = m.maxHp;
    m.maxHp = Math.round(def.hp * hpMult);
    m.damage = Math.round(def.damage * dmgMult);
    if (m.hp >= oldMax) m.hp = m.maxHp; // heal to new cap when scaling up at full hp
  }
  cooldownMult() {
    const n = this.partySize;
    return 1 / (1 + 0.15 * (n - 1)); // abilities come faster with more players
  }

  // ---- simulation ----
  tick(dt, players) {
    const list = Array.from(players.values());
    for (const m of this.monsters) {
      if (m.dead) continue;
      m.attackCd = Math.max(0, m.attackCd - dt);
      for (const k in m.abilityCd) m.abilityCd[k] -= dt;
      if (m.buffs.rage) m.buffs.rage = Math.max(0, m.buffs.rage - dt);

      // acquire target: nearest player within detection range
      let nearest = null, bestD = 260;
      for (const p of list) {
        const d = Math.hypot(p.x - m.x, p.y - m.y);
        if (d < bestD) { bestD = d; nearest = p; }
      }
      if (nearest && (m.targetId == null || m.aggroTimer <= 0)) { m.targetId = nearest.id; m.aggroTimer = 6; }
      if (m.aggroTimer > 0) m.aggroTimer -= dt;

      let target = m.targetId != null ? players.get(m.targetId) : null;
      if (target && Math.hypot(target.x - m.x, target.y - m.y) > 800) { m.targetId = null; target = null; } // leash

      this._checkPhase(m);

      if (!target) { this._wander(m, dt); continue; }

      const d = Math.hypot(target.x - m.x, target.y - m.y);
      m.facing = Math.atan2(target.y - m.y, target.x - m.x);

      const ability = this._chooseAbility(m, d);
      if (ability) {
        m.abilityCd[ability.id] = (ability.params.cooldown || 2) * this.cooldownMult();
        this._executeAbility(m, ability, target, players, dt);
      } else {
        const melee = m.abilities[0];
        const meleeRange = (melee ? melee.params.range : 40) * 0.9;
        if (d > meleeRange) {
          this._move(m, target, m.speed * (m.buffs.rage ? 1.3 : 1), dt);
        } else if (m.attackCd <= 0) {
          m.attackCd = melee ? melee.params.cooldown : 1.2;
          this._meleeDamage(m, target, melee ? melee.params : { damage: 1 }, melee && melee.id === 'bleeding_bite');
        }
      }
    }
    this.monsters = this.monsters.filter((m) => !m.dead || m._deathSent);
    // keep dead monsters for one extra frame so death events can reference them
    for (const m of this.monsters) if (m.dead) m._deathSent = true;
  }

  _wander(m, dt) {
    m.wanderTimer = (m.wanderTimer || 0) - dt;
    if (Math.hypot(m.x - m.home.x, m.y - m.home.y) > m.territoryR) {
      this._moveTo(m, m.home, m.speed * 0.8, dt);
      return;
    }
    if (!m.wanderTarget || m.wanderTimer <= 0 || Math.hypot(m.wanderTarget.x - m.x, m.wanderTarget.y - m.y) < 12) {
      const a = Math.random() * Math.PI * 2;
      m.wanderTarget = { x: m.home.x + Math.cos(a) * Math.random() * m.territoryR * 0.8, y: m.home.y + Math.sin(a) * Math.random() * m.territoryR * 0.8 };
      m.wanderTimer = Math.random() * 4 + 3;
    }
    this._moveTo(m, m.wanderTarget, m.speed * 0.5, dt);
  }

  _move(m, target, speed, dt) {
    this._moveTo(m, { x: target.x, y: target.y }, speed, dt);
  }
  _moveTo(m, pt, speed, dt) {
    const a = Math.atan2(pt.y - m.y, pt.x - m.x);
    m.facing = a;
    this.world.moveEntity(m, Math.cos(a) * speed * dt, Math.sin(a) * speed * dt);
  }

  _chooseAbility(m, d) {
    const candidates = [];
    for (const ab of m.abilities) {
      if ((m.abilityCd[ab.id] || 0) > 0) continue;
      const p = ab.params;
      if (MELEE_ABILITIES.has(ab.id)) { if (d > (p.range || 40)) continue; }
      else if (!SELF_ABILITIES.has(ab.id)) { if ((p.range || 0) > 0 && d > p.range * 1.15) continue; }
      if (ab.id === 'howl' && m.hp > m.maxHp * 0.5) continue;
      if (ab.id === 'regenerate' && m.hp > m.maxHp * 0.6) continue;
      if (ab.id === 'rage' && m.hp > m.maxHp * 0.5) continue;
      let w = 1;
      if (ab.id === 'melee_basic') w = 4;
      if (DASH_ABILITIES.has(ab.id) && d > 120) w += 2;
      if (RANGED_ABILITIES.has(ab.id) && d > 120) w += 1.5;
      if (AOE_ABILITIES.has(ab.id) && d < 110) w += 1.5;
      if (ab.id === 'summon' && m.boss) w += 1;
      candidates.push({ ...ab, w });
    }
    if (!candidates.length) return null;
    const total = candidates.reduce((s, c) => s + c.w, 0);
    let r = Math.random() * total;
    for (const c of candidates) { r -= c.w; if (r <= 0) return c; }
    return candidates[candidates.length - 1];
  }

  _meleeDamage(m, target, params, bleed) {
    const dmg = Math.round(m.damage * (params.damage || 1));
    this.emit('playerDamage', { to: target.id, amount: dmg, status: bleed ? { type: 'bleed', duration: 5, magnitude: 1 } : null, from: m.id });
  }

  _executeAbility(m, ability, target, players, dt) {
    const p = ability.params;
    const d = Math.hypot(target.x - m.x, target.y - m.y);
    switch (ability.id) {
      case 'melee_basic':
      case 'bleeding_bite':
        if (d <= (p.range || 40)) this._meleeDamage(m, target, p, ability.id === 'bleeding_bite');
        break;
      case 'lunge': case 'pounce': case 'charge': {
        // dash toward the target and strike on contact
        const spd = p.speed || 320;
        const dist = Math.min(d, p.range || 200);
        this._moveTo(m, { x: target.x, y: target.y }, spd * 4, dt); // fast approach
        if (Math.hypot(target.x - m.x, target.y - m.y) < m.radius + 14) {
          this.emit('playerDamage', {
            to: target.id, amount: Math.round(m.damage * (p.damage || 1.3)),
            status: ability.id === 'charge' ? { type: 'stun', duration: 0.4, magnitude: 1 } : null, from: m.id
          });
        }
        break;
      }
      case 'throw_rock':
      case 'web_shot':
      case 'fire_breath':
      case 'ice_breath': {
        if (d > (p.range || 220)) break;
        const status = {
          web_shot: { type: 'slow', duration: 2.5, magnitude: 1.2 },
          fire_breath: { type: 'burn', duration: 3, magnitude: 1 },
          ice_breath: { type: 'slow', duration: 3, magnitude: 1.2 }
        }[ability.id] || null;
        const mult = ability.id === 'fire_breath' || ability.id === 'ice_breath' ? 0.6 : (p.damage || 1);
        this.emit('playerDamage', { to: target.id, amount: Math.round(m.damage * mult), status, from: m.id });
        break;
      }
      case 'root_slam': case 'ground_slam': case 'tail_swipe':
        if (d <= (p.radius || 100)) {
          this.emit('playerDamage', { to: target.id, amount: Math.round(m.damage * (p.damage || 1.3)), status: null, from: m.id });
        }
        break;
      case 'howl':
        for (const o of this.monsters) {
          if (o.dead || o === m || o.family !== m.family) continue;
          if (Math.hypot(o.x - m.x, o.y - m.y) < (p.range || 320)) { o.targetId = target.id; o.aggroTimer = 8; }
        }
        break;
      case 'regenerate':
        m.hp = Math.min(m.maxHp, m.hp + (p.heal || 30));
        break;
      case 'rage':
        m.buffs.rage = 8;
        this.emit('monsterPhase', { id: m.id, label: 'Enraged!' });
        break;
      case 'roar':
        if (d <= (p.range || 160)) {
          this.emit('playerDamage', { to: target.id, amount: Math.round(m.damage * (p.damage || 0.3)), status: { type: 'stun', duration: 0.7, magnitude: 1 }, from: m.id });
        }
        break;
      case 'summon': {
        const def = MONSTERS.find((x) => x.id === p.summonId);
        if (!def) break;
        const count = p.count || 2;
        for (let i = 0; i < count; i++) {
          const a = Math.random() * Math.PI * 2;
          const d2 = 44 + Math.random() * 44;
          const x = m.x + Math.cos(a) * d2, y = m.y + Math.sin(a) * d2;
          if (this.world.circleBlocked(x, y, 14)) continue;
          const minion = this.spawn(def, x, y);
          minion.targetId = target.id; minion.aggroTimer = 10;
        }
        break;
      }
    }
  }

  _checkPhase(m) {
    if (!m.phases || m.phaseIndex >= m.phases.length) return;
    const ph = m.phases[m.phaseIndex];
    if (m.hp <= m.maxHp * ph.hpPct) {
      m.phaseIndex++;
      m.abilities = ph.abilities;
      if (ph.color) m.color = ph.color;
      m.abilityCd = {};
      m.buffs.rage = 5;
      this.emit('monsterPhase', { id: m.id, label: ph.label, color: ph.color });
    }
  }

  // ---- player attacks (server-validated) ----
  applyPlayerAttack(playerId, damage, facing, weaponType, players) {
    const range = weaponType === 'bow' ? 300 : 70;
    const target = this._nearestMonsterToPlayer(playerId, range, facing, weaponType === 'melee', players);
    if (!target) return { hit: false };
    target.hp -= damage;
    this.emit('monsterHit', { id: target.id, hp: target.hp, damage });
    if (target.hp <= 0) {
      target.dead = true;
      this.emit('monsterDeath', { id: target.id, to: playerId, defId: target.defId });
      const items = this._rollLoot(target);
      // restorative orbs sometimes drop
      if (Math.random() < 0.4) {
        items.push({ item: ['health_orb', 'stamina_orb', 'mana_orb'][Math.floor(Math.random() * 3)], qty: 1 });
      }
      // bosses drop a hidden "hold full" charm
      if (target.boss) {
        items.push({ item: ['holy_health', 'holy_stamina', 'holy_mana'][Math.floor(Math.random() * 3)], qty: 1 });
      }
      if (items.length) this.emit('loot', { to: playerId, items, name: target.name });
    }
    return { hit: true, id: target.id };
  }

  _nearestMonsterToPlayer(playerId, range, facing, cone, players) {
    const p = players ? players.get(playerId) : null;
    if (!p) return null;
    let best = null, bd = range;
    for (const m of this.monsters) {
      if (m.dead) continue;
      const d = Math.hypot(m.x - p.x, m.y - p.y);
      if (d > bd + m.radius) continue;
      if (cone) {
        const ang = Math.atan2(m.y - p.y, m.x - p.x);
        let diff = Math.abs(ang - (facing || 0));
        if (diff > Math.PI) diff = Math.PI * 2 - diff;
        if (diff > 1.0) continue;
      }
      bd = d; best = m;
    }
    return best;
  }
  _rollLoot(m) {
    const out = [];
    for (const l of m.loot) {
      if (Math.random() < (l.chance || 1)) {
        out.push({ item: l.item, qty: l.min + Math.floor(Math.random() * (l.max - l.min + 1)) });
      }
    }
    return out;
  }

  serialize(m) {
    return {
      id: m.id, defId: m.defId, name: m.name, family: m.family,
      x: Math.round(m.x), y: Math.round(m.y), radius: m.radius,
      hp: m.hp, maxHp: m.maxHp, boss: m.boss, color: m.color,
      facing: m.facing, phaseIndex: m.phaseIndex
    };
  }
}
