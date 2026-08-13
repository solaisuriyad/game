import { RNG } from '../core/RNG.js';
import { TILE, VILLAGE_CX, VILLAGE_CY } from '../world/WorldSystem.js';
import { ANIMALS } from '../data/animals.js';
import { MONSTERS } from '../data/monsters.js';
import { OCCUPATIONS, PERSONALITIES, HAIR_COLORS, SKIN_TONES, CLOTH_COLORS } from '../data/npcData.js';
import { FIRST_NAMES, SURNAMES, CHILD_NAMES } from '../data/names.js';
import { NPC } from '../entities/NPC.js';

const OCC_WEIGHTS = [
  ['farmer', 11], ['hunter', 8], ['homemaker', 9], ['laborer', 6], ['merchant', 4],
  ['shopkeeper', 3], ['guard', 4], ['carpenter', 2], ['tailor', 2], ['fisherman', 3],
  ['cook', 2], ['healer', 2], ['herbalist', 2], ['miner', 3], ['woodcutter', 3],
  ['stablehand', 2], ['teacher', 1], ['child', 8], ['elder', 5], ['tavernkeep', 1],
  ['guildclerk', 2], ['adventurer', 3], ['traveler', 2], ['craftsman', 2], ['innkeep', 1],
  ['blacksmith', 2]
];

// distance rings (in tiles) for each forest zone number used in data/zone defs
const ZONE_RINGS = { 1: [30, 50], 2: [52, 76], 3: [78, 99], 4: [101, 122], 5: [124, 138] };

export class PopulationSystem {
  constructor(game) {
    this.game = game;
    this.rng = new RNG(777);
    this.publicSpots = {};
    this.targets = {};
    this.respawnTimer = 0;
  }

  generate(count) {
    const w = this.game.world;
    const npcCount = count || this.game.npcCount || 65;
    this.publicSpots = {
      tavern: w.buildingCenterByFunc('tavern'),
      market: w.buildingCenterByFunc('market'),
      well: w.buildingCenterByFunc('well'),
      community: w.buildingCenterByFunc('community'),
      shrine: w.buildingCenterByFunc('shrine')
    };
    this._farmCenter = { x: 79 * TILE + 16, y: 109 * TILE + 16 };
    this._pondCenter = { x: 124 * TILE, y: 125 * TILE };
    this._minePoint = { x: VILLAGE_CX * TILE, y: 55 * TILE };

    // bulk-generate positions first (fast), then assign to NPCs
    this._generateNPCs(npcCount);
    this._linkFamilies();
    this._spawnPopulation();
  }

  findMonsterDef(id) { return MONSTERS.find((m) => m.id === id) || null; }

  _forestEdge() {
    const a = this.rng.range(0, Math.PI * 2);
    const d = 30;
    return { x: (VILLAGE_CX + Math.cos(a) * d) * TILE, y: (VILLAGE_CY + Math.sin(a) * d) * TILE };
  }

  _generateNPCs(count) {
    const w = this.game.world;
    // precompute a pool of valid village positions once (fast bulk sampling)
    const pool = this._villagePool();
    let poolIdx = 0;
    for (let i = 0; i < count; i++) {
      const occId = this._weightedPick(OCC_WEIGHTS);
      const occ = OCCUPATIONS.find((o) => o.id === occId);
      const isChild = occId === 'child';
      const isElder = occId === 'elder';
      const gender = this.rng.chance(0.5) ? 'male' : 'female';
      let name;
      if (isChild) name = this.rng.pick(CHILD_NAMES);
      else name = this.rng.pick(FIRST_NAMES[gender]) + ' ' + this.rng.pick(SURNAMES);

      // sample a home from the pool (with slight jitter to avoid perfect overlap)
      const p = pool[poolIdx++ % pool.length];
      const homePos = { x: p.x + this.rng.range(-14, 14), y: p.y + this.rng.range(-14, 14) };
      const workPos = this._workPosFor(occ, homePos);
      let firstName = name, lastName = '';
      if (!isChild) { const sp = name.split(' '); firstName = sp[0]; lastName = sp[1] || ''; }

      const npc = new NPC(this.game, {
        id: 'npc_' + i, name, firstName, lastName, gender,
        age: isChild ? this.rng.int(6, 13) : isElder ? this.rng.int(60, 82) : this.rng.int(17, 59),
        occupation: occId, occupationLabel: occ.label,
        personality: this.rng.pick(PERSONALITIES),
        skinTone: this.rng.pick(SKIN_TONES),
        hairColor: this.rng.pick(HAIR_COLORS),
        clothColor: this.rng.pick(CLOTH_COLORS),
        wealth: this.rng.int(occ.wealth[0], occ.wealth[1]),
        skills: occ.skills,
        homePos, workPos,
        scheduleType: occ.schedule
      }, homePos.x, homePos.y);

      this.game.npcs.push(npc);
    }
  }

  // Build families (couples + children sharing a home/surname) and friendship/rivalry
  // links between NPCs — the foundation of NPC↔NPC social simulation.
  _linkFamilies() {
    const rng = this.rng;
    const npcs = this.game.npcs;
    const adults = npcs.filter((n) => n.age >= 18 && n.age < 60);
    const children = npcs.filter((n) => n.age < 14);
    const taken = new Set();
    let familyId = 0;
    for (let i = 0; i < adults.length - 1; i += 2) {
      const a = adults[i], b = adults[i + 1];
      if (taken.has(a.id) || taken.has(b.id)) continue;
      if (rng.chance(0.45)) continue; // not everyone is coupled
      const fam = 'fam_' + (familyId++);
      taken.add(a.id); taken.add(b.id);
      a.familyId = fam; b.familyId = fam;
      a.spouseId = b.id; b.spouseId = a.id;
      a.npcRelations[b.id] = 'spouse'; b.npcRelations[a.id] = 'spouse';
      b.homePos = a.homePos; b.lastName = a.lastName;
      b.name = b.firstName + (a.lastName ? ' ' + a.lastName : '');
      const kids = children.filter((c) => !c.familyId).slice(0, rng.int(0, 2));
      for (const k of kids) {
        k.familyId = fam; k.homePos = a.homePos; k.lastName = a.lastName;
        k.name = k.firstName + (a.lastName ? ' ' + a.lastName : '');
        k.parentIds = [a.id, b.id];
        a.npcRelations[k.id] = 'child'; b.npcRelations[k.id] = 'child';
        k.npcRelations[a.id] = 'parent'; k.npcRelations[b.id] = 'parent';
        (a.childIds = a.childIds || []).push(k.id);
        (b.childIds = b.childIds || []).push(k.id);
      }
    }
    // friendship / rivalry among same-occupation peers
    const byOcc = {};
    for (const n of npcs) (byOcc[n.occupation] ||= []).push(n);
    for (const list of Object.values(byOcc)) {
      if (list.length < 2) continue;
      const a = rng.pick(list);
      const others = list.filter((x) => x !== a);
      if (!others.length) continue;
      const b = rng.pick(others);
      const rel = rng.chance(0.7) ? 'friend' : 'rival';
      a.npcRelations[b.id] = rel;
    }
  }

  _workPosFor(occ, homePos) {
    const w = this.game.world;
    switch (occ.work) {
      case 'farm': return this._farmCenter;
      case 'river': return this._pondCenter;
      case 'mine': return this._minePoint;
      case 'forest': return this._forestEdge();
      case 'house': return homePos;
      default: return w.buildingCenterByFunc(occ.work) || this.publicSpots.community;
    }
  }

  // cache of walkable village positions for bulk NPC placement
  _villagePool() {
    if (this._pool) return this._pool;
    const w = this.game.world;
    const pool = [];
    for (let ty = 82; ty <= 112; ty++) {
      for (let tx = 76; tx <= 124; tx++) {
        if ((tx + ty) % 2) continue; // skip every other cell (denser sampling)
        const px = tx * TILE + TILE / 2, py = ty * TILE + TILE / 2;
        if (w.circleBlocked(px, py, 12)) continue;
        pool.push({ x: px, y: py });
      }
    }
    // shuffle so nearby NPCs get spread out
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng.range(0, i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    this._pool = pool;
    return pool;
  }

  _weightedPick(entries) {
    const total = entries.reduce((s, e) => s + e[1], 0);
    let r = this.rng.range(0, total);
    for (const [id, wt] of entries) { r -= wt; if (r <= 0) return id; }
    return entries[entries.length - 1][0];
  }

  _spawnPopulation() {
    const g = this.game;
    const w = g.world;
    const spawns = [
      { def: 'rabbit', count: 14 }, { def: 'deer', count: 10 }, { def: 'fox', count: 6 },
      { def: 'boar', count: 8 }, { def: 'goat', count: 6 }, { def: 'bear', count: 4 },
      { def: 'bird', count: 12 },
      { def: 'slime', count: 10 }, { def: 'goblin', count: 8 }, { def: 'wolf', count: 8 },
      { def: 'spider', count: 6 }, { def: 'treant', count: 3 }, { def: 'alpha_wolf', count: 1 },
      { def: 'skeleton', count: 6 }, { def: 'swamp_beast', count: 4 },
      { def: 'demon_beast', count: 5 }, { def: 'ancient_beast', count: 3 },
      { def: 'ancient_bear', count: 1 }, { def: 'forest_guardian', count: 1 }, { def: 'ancient_dragon', count: 1 }
    ];
    for (const s of spawns) {
      const animal = ANIMALS.find((a) => a.id === s.def);
      const monster = MONSTERS.find((m) => m.id === s.def);
      this.targets[s.def] = s.count;
      if (s.def === 'wolf') {
        // spawn in packs
        let pack = 0;
        for (let i = 0; i < s.count; i++) {
          if (i % 3 === 0) pack++;
          this._spawnMonster(monster, w, pack);
        }
      } else if (monster) {
        for (let i = 0; i < s.count; i++) this._spawnMonster(monster, w, 0);
      } else if (animal) {
        for (let i = 0; i < s.count; i++) this._spawnAnimal(animal, w);
      }
    }
  }

  zoneRange(def) {
    // spawn in a random zone the creature is allowed in
    const z = def.zones[Math.floor(Math.random() * def.zones.length)];
    return ZONE_RINGS[z] || [30, 50];
  }

  _spawnAnimal(def, w) {
    const [minD, maxD] = this.zoneRange(def);
    const pos = w.randomPosition(minD, maxD);
    this.game.animals.push(new this.game.AAnimal(this.game, def, pos.x, pos.y));
  }
  _spawnMonster(def, w, pack) {
    const [minD, maxD] = this.zoneRange(def);
    const pos = w.randomPosition(minD, maxD);
    const m = new this.game.AMonster(this.game, def, pos.x, pos.y);
    m.packId = pack || null;
    this.game.monsters.push(m);
  }

  // clear + respawn transient creatures (animals/monsters), keeping NPCs
  resetPopulation() {
    this.game.animals.length = 0;
    this.game.monsters.length = 0;
    this.game.corpses.length = 0;
    this.game.drops.length = 0;
    this.game.projectiles.length = 0;
    this.game.traps.length = 0;
    this._spawnPopulation();
  }

  // respawn only the local monsters + animals (used when leaving co-op, where
  // they are server-authoritative)
  respawnWildlife() {
    const g = this.game;
    for (const [defId, count] of Object.entries(this.targets)) {
      const monster = MONSTERS.find((m) => m.id === defId);
      const animal = ANIMALS.find((a) => a.id === defId);
      if (monster) {
        const live = g.monsters.filter((m) => !m.dead && m.def.id === defId).length;
        for (let i = live; i < count; i++) this._spawnMonster(monster, g.world, 0);
      } else if (animal) {
        const live = g.animals.filter((a) => !a.dead && a.def.id === defId).length;
        for (let i = live; i < count; i++) this._spawnAnimal(animal, g.world);
      }
    }
  }

  update(dt) {
    this.respawnTimer -= dt;
    if (this.respawnTimer > 0) return;
    this.respawnTimer = 4;
    const g = this.game;
    const w = g.world;
    for (const [defId, target] of Object.entries(this.targets)) {
      const animal = ANIMALS.find((a) => a.id === defId);
      const monster = MONSTERS.find((m) => m.id === defId);
      // monsters + animals are server-authoritative during co-op — no local respawn
      if (this.game.multiplayer.connected) continue;
      const live = animal
        ? g.animals.filter((a) => !a.dead && a.def.id === defId).length
        : g.monsters.filter((m) => !m.dead && m.def.id === defId).length;
      if (live >= target) continue;
      // don't spawn on top of the player
      if (animal) this._spawnAnimal(animal, w);
      else this._spawnMonster(monster, w, 0);
    }
  }
}
