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

export class PopulationSystem {
  constructor(game) {
    this.game = game;
    this.rng = new RNG(777);
    this.publicSpots = {};
    this.targets = {};
    this.respawnTimer = 0;
  }

  generate() {
    const w = this.game.world;
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

    this._generateNPCs(65);
    this._spawnPopulation();
  }

  _forestEdge() {
    const a = this.rng.range(0, Math.PI * 2);
    const d = 30;
    return { x: (VILLAGE_CX + Math.cos(a) * d) * TILE, y: (VILLAGE_CY + Math.sin(a) * d) * TILE };
  }

  _generateNPCs(count) {
    const w = this.game.world;
    for (let i = 0; i < count; i++) {
      const occId = this._weightedPick(OCC_WEIGHTS);
      const occ = OCCUPATIONS.find((o) => o.id === occId);
      const isChild = occId === 'child';
      const isElder = occId === 'elder';
      const gender = this.rng.chance(0.5) ? 'male' : 'female';
      let name;
      if (isChild) name = this.rng.pick(CHILD_NAMES);
      else name = this.rng.pick(FIRST_NAMES[gender]) + ' ' + this.rng.pick(SURNAMES);

      const homePos = w.randomVillagePosition();
      const workPos = this._workPosFor(occ, homePos);

      const npc = new NPC(this.game, {
        id: 'npc_' + i, name, gender,
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
      { def: 'spider', count: 6 }, { def: 'treant', count: 3 }, { def: 'alpha_wolf', count: 1 }
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
    const z = def.zones;
    if (z.includes(1) && z.includes(2) && z.includes(3)) return [30, 95];
    if (z.includes(2) && z.includes(3)) return [52, 95];
    if (z.includes(3)) return [78, 95];
    if (z.includes(2)) return [52, 76];
    return [30, 50];
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

  update(dt) {
    this.respawnTimer -= dt;
    if (this.respawnTimer > 0) return;
    this.respawnTimer = 4;
    const g = this.game;
    const w = g.world;
    for (const [defId, target] of Object.entries(this.targets)) {
      const animal = ANIMALS.find((a) => a.id === defId);
      const monster = MONSTERS.find((m) => m.id === defId);
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
