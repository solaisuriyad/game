import { RNG } from '../core/RNG.js';
import { BUILDINGS } from '../data/buildings.js';

export const TILE = 32;
export const WORLD_W = 280; // tiles (bigger world)
export const WORLD_H = 280;
export const PX_W = WORLD_W * TILE;
export const PX_H = WORLD_H * TILE;
export const VILLAGE_CX = 140; // tile center
export const VILLAGE_CY = 140;

// ground tile types
export const T = {
  GRASS: 0, PATH: 1, DIRT: 2, FARM: 3, WATER: 4, SAND: 5, FLOWER: 6, FLOOR: 7
};

export const ZONES = [
  { name: 'Village', from: 0, to: 30, danger: 0, minRank: 0, color: '#5a8a4a' },
  { name: 'Safe Forest', from: 30, to: 52, danger: 1, minRank: 0, color: '#4a7a3a' },
  { name: 'Deep Forest', from: 52, to: 78, danger: 2, minRank: 1, color: '#3a6a30' },
  { name: 'Dark Forest', from: 78, to: 101, danger: 3, minRank: 3, color: '#2a5a28' },
  { name: 'Ancient Forest', from: 101, to: 124, danger: 4, minRank: 5, color: '#1f4a2a' },
  { name: 'Forbidden Forest', from: 124, to: 999, danger: 5, minRank: 8, color: '#1a3428' }
];

export function zoneIndexAt(px, py) {
  const tx = px / TILE, ty = py / TILE;
  const d = Math.hypot(tx - VILLAGE_CX, ty - VILLAGE_CY);
  for (let i = 0; i < ZONES.length; i++) {
    if (d <= ZONES[i].to) return i;
  }
  return ZONES.length - 1;
}

export class WorldSystem {
  constructor(seed = 12345) {
    this.rng = new RNG(seed);
    this.tiles = new Uint8Array(WORLD_W * WORLD_H);
    this.buildings = [];
    this.staticGrid = new Map(); // cellKey -> array of collider objects
    this.nodes = [];       // resource nodes (herb, mushroom, berry, ore, tree, rock)
    this._cell = Math.floor(256 / TILE); // grid cell = 8 tiles = 256px
    this.discovered = new Uint8Array(WORLD_W * WORLD_H); // fog of war (0/1)
    this.generate();
  }

  idx(tx, ty) { return ty * WORLD_W + tx; }
  tileAt(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= WORLD_W || ty >= WORLD_H) return T.WATER;
    return this.tiles[this.idx(tx, ty)];
  }

  generate() {
    // 1. base grass
    this.tiles.fill(T.GRASS);
    // 2. river (wavy vertical near left) + pond
    this._carveRiver();
    // 3. farm patches
    this._placeFarms();
    // 4. paths
    this._placePaths();
    // 5. buildings
    this._placeBuildings();
    // 6. forest trees + resource nodes
    this._placeForest();
  }

  _carveRiver() {
    for (let ty = 0; ty < WORLD_H; ty++) {
      const x = 66 + Math.floor(Math.sin(ty * 0.08) * 5);
      for (let dx = -1; dx <= 2; dx++) {
        const tx = x + dx;
        if (tx >= 0 && tx < WORLD_W) {
          this.tiles[this.idx(tx, ty)] = T.WATER;
          if (dx === -1 || dx === 2) this.tiles[this.idx(tx, ty)] = T.SAND;
        }
      }
    }
    // pond south-east of village
    for (let ty = 162; ty < 170; ty++) {
      for (let tx = 160; tx < 168; tx++) {
        this.tiles[this.idx(tx, ty)] = T.WATER;
      }
    }
    for (let ty = 161; ty < 171; ty++) for (let tx = 159; tx < 169; tx++) {
      if (this.tiles[this.idx(tx, ty)] === T.GRASS) this.tiles[this.idx(tx, ty)] = T.SAND;
    }
  }

  _placeFarms() {
    for (let ty = 146; ty < 156; ty++) {
      for (let tx = 108; tx < 118; tx++) {
        if (this.tiles[this.idx(tx, ty)] === T.GRASS) this.tiles[this.idx(tx, ty)] = T.FARM;
      }
    }
  }

  _placePaths() {
    const mark = (tx, ty) => { if (tx >= 0 && ty >= 0 && tx < WORLD_W && ty < WORLD_H && this.tiles[this.idx(tx, ty)] === T.GRASS) this.tiles[this.idx(tx, ty)] = T.PATH; };
    // main cross through village center
    for (let tx = 116; tx <= 166; tx++) mark(tx, 140);
    for (let ty = 116; ty <= 166; ty++) mark(140, ty);
    // lower road
    for (let tx = 116; tx <= 166; tx++) mark(tx, 156);
    // east roads to the forest
    for (let tx = 166; tx <= 184; tx++) mark(tx, 140);
    for (let ty = 140; ty <= 156; ty++) mark(156, ty);
    // west farm road
    for (let tx = 112; tx <= 116; tx++) mark(tx, 150);
  }

  _placeBuildings() {
    for (const b of BUILDINGS) {
      const rect = { x: b.x * TILE, y: b.y * TILE, w: b.w * TILE, h: b.h * TILE, building: b };
      this.buildings.push(rect);
      // clear tiles under building to floor
      for (let ty = b.y; ty < b.y + b.h; ty++) {
        for (let tx = b.x; tx < b.x + b.w; tx++) {
          if (this.tileAt(tx, ty) === T.GRASS || this.tileAt(tx, ty) === T.PATH) {
            this.tiles[this.idx(tx, ty)] = T.FLOOR;
          }
        }
      }
    }
  }

  _placeForest() {
    const rng = this.rng;
    for (let ty = 0; ty < WORLD_H; ty++) {
      for (let tx = 0; tx < WORLD_W; tx++) {
        if (this.tiles[this.idx(tx, ty)] !== T.GRASS) continue;
        const d = Math.hypot(tx - VILLAGE_CX, ty - VILLAGE_CY);
        if (d < 30) {
          // occasional village tree / flower
          if (rng.chance(0.02)) this._addTree(tx, ty);
          else if (rng.chance(0.03)) this.tiles[this.idx(tx, ty)] = T.FLOWER;
          continue;
        }
        const density = Math.min(0.42, 0.12 + d * 0.004);
        if (rng.chance(density)) {
          this._addTree(tx, ty, d > 70);
        } else if (rng.chance(0.02)) {
          this.tiles[this.idx(tx, ty)] = T.FLOWER;
        }
      }
    }
    // resource nodes
    this._scatterNodes('herb', 60, 30, 100);
    this._scatterNodes('mushroom', 40, 30, 100);
    this._scatterNodes('berry', 36, 28, 90);
    this._scatterNodes('ore', 40, 40, 110);
    this._scatterNodes('flower', 30, 24, 90);
  }

  _addTree(tx, ty, dark = false) {
    const px = tx * TILE + TILE / 2, py = ty * TILE + TILE / 2;
    this._addStatic({ type: 'tree', x: px - 13, y: py - 13, w: 26, h: 26, dark });
  }
  _addStatic(obj) {
    const cx = Math.floor(obj.x / (this._cell * TILE)), cy = Math.floor(obj.y / (this._cell * TILE));
    const key = cx + ',' + cy;
    if (!this.staticGrid.has(key)) this.staticGrid.set(key, []);
    this.staticGrid.get(key).push(obj);
  }

  _scatterNodes(kind, count, minD, maxD) {
    const rng = this.rng;
    for (let i = 0; i < count; i++) {
      const ang = rng.range(0, Math.PI * 2);
      const d = rng.range(minD, maxD);
      const tx = Math.floor(VILLAGE_CX + Math.cos(ang) * d);
      const ty = Math.floor(VILLAGE_CY + Math.sin(ang) * d);
      if (tx < 0 || ty < 0 || tx >= WORLD_W || ty >= WORLD_H) continue;
      if (this.tiles[this.idx(tx, ty)] !== T.GRASS) continue;
      const px = tx * TILE + TILE / 2, py = ty * TILE + TILE / 2;
      if (this.circleBlocked(px, py, 12)) continue;
      const node = { kind, x: px, y: py, depleted: false, respawn: 0 };
      this.nodes.push(node);
      if (kind === 'ore') this._addStatic({ type: 'rock', x: px - 12, y: py - 12, w: 24, h: 24, node });
      else if (kind === 'berry') this._addStatic({ type: 'bush', x: px - 10, y: py - 10, w: 20, h: 20, node });
    }
  }

  // ---- collision ----
  _staticInCell(cx, cy) { return this.staticGrid.get(cx + ',' + cy) || []; }

  collidersNear(px, py, margin = 64) {
    const minCx = Math.floor((px - margin) / (this._cell * TILE));
    const maxCx = Math.floor((px + margin) / (this._cell * TILE));
    const minCy = Math.floor((py - margin) / (this._cell * TILE));
    const maxCy = Math.floor((py + margin) / (this._cell * TILE));
    const out = [];
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        for (const c of this._staticInCell(cx, cy)) out.push(c);
      }
    }
    return out;
  }

  // is a world pixel blocked by water or a static collider (ignoring the given entity)?
  blockedAt(px, py, ignore = null) {
    const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
    if (this.tileAt(tx, ty) === T.WATER) return true;
    for (const b of this.buildings) {
      if (b !== ignore && px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) return true;
    }
    for (const c of this.collidersNear(px, py, 40)) {
      if (c === ignore) continue;
      if (c.type === 'tree' && c.depleted) continue; // chopped trees are passable
      if (px >= c.x && px <= c.x + c.w && py >= c.y && py <= c.y + c.h) return true;
    }
    return false;
  }

  // Axis-separated movement with sliding. Mutates entity.x/y. Returns collided flags.
  moveEntity(entity, dx, dy) {
    const r = entity.radius || 12;
    let collidedX = false, collidedY = false;
    if (dx !== 0) {
      entity.x += dx;
      if (this.circleBlocked(entity.x, entity.y, r, entity)) { entity.x -= dx; collidedX = true; }
    }
    if (dy !== 0) {
      entity.y += dy;
      if (this.circleBlocked(entity.x, entity.y, r, entity)) { entity.y -= dy; collidedY = true; }
    }
    return { x: collidedX, y: collidedY };
  }

  circleBlocked(x, y, r, ignore = null) {
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    if (this.tileAt(tx, ty) === T.WATER) return true;
    // check a few points around the circle
    for (const [ox, oy] of [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r]]) {
      const px = x + ox, py = y + oy;
      for (const b of this.buildings) {
        if (b !== ignore && px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) return true;
      }
    }
    for (const c of this.collidersNear(x, y, 40)) {
      if (c === ignore) continue;
      if (c.type === 'tree' && c.depleted) continue; // chopped trees are passable
      const cx = Math.max(c.x, Math.min(x, c.x + c.w));
      const cy = Math.max(c.y, Math.min(y, c.y + c.h));
      const dx = x - cx, dy = y - cy;
      if (dx * dx + dy * dy < r * r) return true;
    }
    return false;
  }

  // find a random walkable position in a zone ring
  randomPosition(minD, maxD, tries = 60) {
    for (let i = 0; i < tries; i++) {
      const ang = this.rng.range(0, Math.PI * 2);
      const d = this.rng.range(minD, maxD);
      const px = (VILLAGE_CX + Math.cos(ang) * d) * TILE;
      const py = (VILLAGE_CY + Math.sin(ang) * d) * TILE;
      if (px < 0 || py < 0 || px >= PX_W || py >= PX_H) continue;
      if (!this.circleBlocked(px, py, 14)) return { x: px, y: py };
    }
    return { x: VILLAGE_CX * TILE, y: VILLAGE_CY * TILE };
  }

  randomVillagePosition(tries = 60) {
    for (let i = 0; i < tries; i++) {
      const tx = this.rng.int(116, 164), ty = this.rng.int(116, 164);
      const px = tx * TILE + TILE / 2, py = ty * TILE + TILE / 2;
      if (!this.circleBlocked(px, py, 12)) return { x: px, y: py };
    }
    return { x: VILLAGE_CX * TILE, y: VILLAGE_CY * TILE };
  }

  // Line of sight: returns true if there is NO blocking obstacle (tree/rock/bush/
  // building) between two points. Water does not block sight.
  hasLineOfSight(x1, y1, x2, y2) {
    const dist = Math.hypot(x2 - x1, y2 - y1);
    const steps = Math.max(1, Math.ceil(dist / 14));
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const x = x1 + (x2 - x1) * t;
      const y = y1 + (y2 - y1) * t;
      if (this.staticBlockedAt(x, y)) return false;
    }
    return true;
  }

  // blocked only by opaque static colliders (trees/rocks/bushes) and buildings,
  // not water — used for vision rays.
  staticBlockedAt(x, y) {
    for (const b of this.buildings) {
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return true;
    }
    for (const c of this.collidersNear(x, y, 40)) {
      if (c.type === 'tree' && c.depleted) continue; // chopped trees are open
      if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) return true;
    }
    return false;
  }

  getZoneName(px, py) { return ZONES[zoneIndexAt(px, py)].name; }
  getZoneIndex(px, py) { return zoneIndexAt(px, py); }

  buildingCenterByFunc(func) {
    const b = this.buildings.find((b) => b.building.func === func);
    return b ? { x: b.x + b.w / 2, y: b.y + b.h / 2 } : null;
  }
  buildingById(id) {
    return this.buildings.find((b) => b.building.id === id);
  }
  // nearest building (by rect proximity) to a point, within radius
  nearestBuilding(px, py, radius = 60) {
    let best = null, bestD = radius;
    for (const b of this.buildings) {
      const dx = Math.max(b.x - px, 0, px - (b.x + b.w));
      const dy = Math.max(b.y - py, 0, py - (b.y + b.h));
      const d = Math.hypot(dx, dy);
      if (d < bestD) { bestD = d; best = b; }
    }
    return best;
  }
}
