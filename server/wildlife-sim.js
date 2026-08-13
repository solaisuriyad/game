// Authoritative wildlife & resources (Phase 9 scope → co-op hunt/gather).
//
// The server owns animals (positions, simple wander/flee AI, health, deaths, loot)
// and resource nodes (depletion + respawn + loot). Clients send hunt/gather
// intents; the server validates and resolves, then emits loot + shared-quest
// progress events. Replicated via a single wildlife-state channel (interest-managed).
import { ANIMALS } from '../src/data/animals.js';

const ZONE_RINGS = { 1: [30, 75], 2: [85, 155], 3: [165, 255], 4: [265, 395], 5: [405, 650] };

const ANIMAL_PLAN = [
  { id: 'rabbit', count: 14 }, { id: 'deer', count: 10 }, { id: 'fox', count: 6 },
  { id: 'boar', count: 8 }, { id: 'goat', count: 6 }, { id: 'bear', count: 4 },
  { id: 'bird', count: 8 }
];

const RESOURCE_KINDS = ['herb', 'mushroom', 'berry', 'flower', 'ore'];
const RESOURCE_LOOT = {
  herb: () => (Math.random() < 0.1 ? { item: 'rare_herb', qty: 1 } : { item: 'herb', qty: 1 }),
  mushroom: () => ({ item: 'mushroom', qty: 1 }),
  berry: () => ({ item: 'berries', qty: 1 + Math.floor(Math.random() * 3) }),
  flower: () => ({ item: 'flower', qty: 1 }),
  ore: () => ({ item: pickWeighted([['stone', 5], ['copper_ore', 3], ['iron_ore', 2], ['silver_ore', 0.5], ['gold_ore', 0.2]]), qty: 1 })
};

function pickWeighted(entries) {
  const total = entries.reduce((s, e) => s + e[1], 0);
  let r = Math.random() * total;
  for (const [id, w] of entries) { r -= w; if (r <= 0) return id; }
  return entries[0][0];
}

export class WildlifeSim {
  constructor(world) {
    this.world = world;
    this.animals = [];
    this.resources = [];
    this.nextId = 1;
    this.emit = () => {}; // (type, data) -> GameServer routes
    this._spawnAnimals();
    this._spawnResources();
  }

  // ---- spawning ----
  zoneRange(def) {
    const z = def.zones[Math.floor(Math.random() * def.zones.length)];
    return ZONE_RINGS[z] || [30, 50];
  }
  _spawnAnimals() {
    for (const s of ANIMAL_PLAN) {
      const def = ANIMALS.find((a) => a.id === s.id);
      if (!def) continue;
      for (let i = 0; i < s.count; i++) {
        const [minD, maxD] = this.zoneRange(def);
        const pos = this.world.randomPosition(minD, maxD);
        this.animals.push(this._makeAnimal(def, pos.x, pos.y));
      }
    }
  }
  _makeAnimal(def, x, y) {
    return {
      id: this.nextId++, defId: def.id, name: def.name,
      x, y, radius: def.size, facing: Math.random() * Math.PI * 2,
      hp: def.hp, maxHp: def.hp, speed: def.speed, xp: def.xp,
      color: def.color, aggression: def.aggression,
      home: { x, y }, wanderTarget: null, wanderTimer: 0, dead: false
    };
  }
  _spawnResources() {
    const w = this.world;
    const counts = { herb: 50, mushroom: 30, berry: 26, flower: 24, ore: 30 };
    for (const kind of RESOURCE_KINDS) {
      for (let i = 0; i < counts[kind]; i++) {
        const pos = w.randomPosition(28, 105);
        if (w.circleBlocked(pos.x, pos.y, 8)) continue;
        this.resources.push({ id: this.nextId++, kind, x: pos.x, y: pos.y, depleted: false, respawn: 0 });
      }
    }
  }

  // ---- simulation ----
  tick(dt, players) {
    const list = Array.from(players.values());
    for (const a of this.animals) {
      if (a.dead) continue;
      // simple wander / flee behavior
      let nearest = null, bd = 160;
      for (const p of list) {
        const d = Math.hypot(p.x - a.x, p.y - a.y);
        if (d < bd) { bd = d; nearest = p; }
      }
      if (nearest && bd < 120) {
        // flee from the player
        const ang = Math.atan2(a.y - nearest.y, a.x - nearest.x);
        a.facing = ang;
        this._move(a, a.x + Math.cos(ang) * 10, a.y + Math.sin(ang) * 10, a.speed * 1.3, dt);
      } else {
        a.wanderTimer -= dt;
        if (!a.wanderTarget || a.wanderTimer <= 0 || Math.hypot(a.wanderTarget.x - a.x, a.wanderTarget.y - a.y) < 12) {
          const ang = Math.random() * Math.PI * 2;
          const dist = 40 + Math.random() * 120;
          a.wanderTarget = { x: a.home.x + Math.cos(ang) * dist, y: a.home.y + Math.sin(ang) * dist };
          a.wanderTimer = 3 + Math.random() * 5;
        }
        this._move(a, a.wanderTarget.x, a.wanderTarget.y, a.speed * 0.6, dt);
      }
    }
    // resource respawn
    for (const r of this.resources) {
      if (r.depleted) { r.respawn -= dt; if (r.respawn <= 0) r.depleted = false; }
    }
  }
  _move(a, tx, ty, speed, dt) {
    const ang = Math.atan2(ty - a.y, tx - a.x);
    a.facing = ang;
    this.world.moveEntity(a, Math.cos(ang) * speed * dt, Math.sin(ang) * speed * dt);
  }

  // ---- player intents ----
  attackAnimal(playerId, damage, facing, weaponType, players) {
    const p = players ? players.get(playerId) : null;
    if (!p) return { hit: false };
    const range = weaponType === 'bow' ? 300 : 70;
    let best = null, bd = range;
    for (const a of this.animals) {
      if (a.dead || a.defId === 'bird') continue; // birds are ambient
      const d = Math.hypot(a.x - p.x, a.y - p.y);
      if (d > bd + a.radius) continue;
      if (weaponType === 'melee') {
        const ang = Math.atan2(a.y - p.y, a.x - p.x);
        let diff = Math.abs(ang - (facing || 0));
        if (diff > Math.PI) diff = Math.PI * 2 - diff;
        if (diff > 1.0) continue;
      }
      bd = d; best = a;
    }
    if (!best) return { hit: false };
    best.hp -= damage;
    this.emit('animalHit', { id: best.id, hp: best.hp, damage });
    if (best.hp <= 0) {
      best.dead = true;
      this.emit('animalDeath', { id: best.id, to: playerId, defId: best.defId });
      const items = this._rollLoot(best);
      if (items.length) this.emit('loot', { to: playerId, items, name: best.name });
    }
    return { hit: true, id: best.id };
  }

  gatherResource(playerId, resourceId, players) {
    const p = players ? players.get(playerId) : null;
    if (!p) return { ok: false };
    const r = this.resources.find((x) => x.id === resourceId);
    if (!r || r.depleted) return { ok: false };
    if (Math.hypot(r.x - p.x, r.y - p.y) > 60) return { ok: false }; // reach check
    const roll = RESOURCE_LOOT[r.kind]();
    r.depleted = true;
    r.respawn = 60 + Math.random() * 60;
    this.emit('resourceGathered', { id: r.id, to: playerId });
    this.emit('loot', { to: playerId, items: [roll], name: r.kind });
    return { ok: true, itemId: roll.item, qty: roll.qty };
  }

  _rollLoot(a) {
    const def = ANIMALS.find((d) => d.id === a.defId);
    if (!def) return [];
    const out = [];
    for (const l of def.drops) {
      if (Math.random() < (l.chance || 1)) {
        out.push({ item: l.item, qty: l.min + Math.floor(Math.random() * (l.max - l.min + 1)) });
      }
    }
    return out;
  }

  serializeAnimals() {
    return this.animals.filter((a) => !a.dead).map((a) => ({
      id: a.id, defId: a.defId, x: Math.round(a.x), y: Math.round(a.y),
      radius: a.radius, hp: a.hp, maxHp: a.maxHp, color: a.color, facing: a.facing
    }));
  }
  serializeResources() {
    return this.resources.map((r) => ({ id: r.id, kind: r.kind, x: Math.round(r.x), y: Math.round(r.y), depleted: r.depleted }));
  }
}
