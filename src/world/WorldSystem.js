import { RNG } from '../core/RNG.js';
import { BUILDINGS } from '../data/buildings.js';

export const TILE = 32;
export const WORLD_W = 4000; // tiles — a colossal explorable world
export const WORLD_H = 4000;
export const PX_W = WORLD_W * TILE;
export const PX_H = WORLD_H * TILE;
export const VILLAGE_CX = 2000; // tile center (the "town circle" — NPCs + player residence)
export const VILLAGE_CY = 2000;
// The Yggdrasil — the heart of the monster territory. Monsters radiate outward
// from here by rank (A+ innermost → F outermost), forming the "wild circle"
// that is ~10× the town circle. These are the TILE CENTER of the tree.
export const YGGDRASIL_CX = 2700;
export const YGGDRASIL_CY = 2000;

// ground tile types
export const T = {
  GRASS: 0, PATH: 1, DIRT: 2, FARM: 3, WATER: 4, SAND: 5, FLOWER: 6, FLOOR: 7, SNOW: 8
};

// The permanent SNOW REGION — the north-west quarter of the monster forest. Here
// the ground and trees are always snow-covered, no matter the season.
export const SNOW_X0 = 2150, SNOW_X1 = 2700;
export const SNOW_Y0 = 1450, SNOW_Y1 = 2000;
export function isSnowRegion(tx, ty) {
  return tx >= SNOW_X0 && tx < SNOW_X1 && ty >= SNOW_Y0 && ty < SNOW_Y1;
}

export const ZONES = [
  { name: 'Village', from: 0, to: 50, danger: 0, minRank: 0, color: '#5a8a4a' },
  { name: 'Safe Forest', from: 50, to: 90, danger: 1, minRank: 0, color: '#4a7a3a' },
  { name: 'Deep Forest', from: 90, to: 150, danger: 2, minRank: 1, color: '#3a6a30' },
  { name: 'Dark Forest', from: 150, to: 330, danger: 3, minRank: 3, color: '#2a5a28' },
  { name: 'Ancient Forest', from: 330, to: 520, danger: 4, minRank: 5, color: '#1f4a2a' },
  { name: 'Forbidden Forest', from: 520, to: 9999, danger: 5, minRank: 8, color: '#1a3428' }
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
    this.depletedTrees = []; // chopped trees awaiting respawn (small list)
    this.nodes = [];       // resource nodes (herb, mushroom, berry, ore, tree, rock)
    this.mountains = [];   // procedural mountains (peaks with snow caps / waterfalls)
    this._cell = Math.floor(256 / TILE); // grid cell = 8 tiles = 256px
    this.discovered = new Uint8Array(0); // (fog moved to the 700px minimap; keep a stub)
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
    // 6. the Yggdrasil FIRST (so the forest doesn't grow inside its grove)
    this._placeYggdrasil();
    // 7. mountains (some around the town, some around the monster forest)
    this._placeMountains();
    // 8. forest trees + resource nodes + the permanent snow region
    this._placeForest();
  }

  // place a ring of mountains around a center (blocking peaks; some snowy, some
  // with waterfalls). Used around the town AND around the monster forest.
  _ringMountains(cx, cy, radius, jitter, count, forceSnowy, snowyNW) {
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2 + this.rng.range(-0.18, 0.18);
      const r = radius + this.rng.range(-jitter, jitter);
      const tx = Math.round(cx + Math.cos(ang) * r);
      const ty = Math.round(cy + Math.sin(ang) * r);
      if (tx < 60 || ty < 60 || tx > WORLD_W - 60 || ty > WORLD_H - 60) continue;
      // never block the village, the east road, or the Yggdrasil grove
      if (Math.hypot(tx - VILLAGE_CX, ty - VILLAGE_CY) < 58) continue;
      if (Math.hypot(tx - YGGDRASIL_CX, ty - YGGDRASIL_CY) < 55) continue;
      if (ty === VILLAGE_CY && tx > VILLAGE_CX && tx < VILLAGE_CX + 185) continue; // east road
      // snowy: forced, inside the snow region, or on the north side of the
      // monster forest (snowyNW = the forest's snowy side gets snow-capped peaks)
      const snowy = forceSnowy || isSnowRegion(tx, ty) || (snowyNW && ty < cy);
      const halfTiles = this.rng.range(7, 13);   // base radius in tiles
      const h = this.rng.range(130, 260);         // peak height in px
      const px = tx * TILE + TILE / 2, py = ty * TILE + TILE / 2;
      const rpx = halfTiles * TILE;               // base radius in px
      const m = { x: px, y: py, r: rpx, h, snowy, waterfall: this.rng.chance(0.35) };
      this.mountains.push(m);
      // block movement + stop trees growing on the peak (square bounding box)
      this._addStatic({ type: 'mountain', x: px - rpx, y: py - rpx, w: rpx * 2, h: rpx * 2, mountain: m });
    }
  }

  _placeMountains() {
    this.mountains = [];
    // mountains ringing the town (natural wall, leaving the east road open)
    this._ringMountains(VILLAGE_CX, VILLAGE_CY, 96, 14, 10, false, false);
    // mountains ringing the far edge of the monster forest (the snow side is snowy)
    this._ringMountains(YGGDRASIL_CX, YGGDRASIL_CY, 620, 20, 12, false, true);
  }

  // is a tile inside any mountain's bounding box? (keep trees off peaks)
  _inMountain(tx, ty) {
    const px = tx * TILE, py = ty * TILE;
    for (const m of this.mountains) {
      if (px >= m.x - m.r && px <= m.x + m.r && py >= m.y - m.r && py <= m.y + m.r) return true;
    }
    return false;
  }

  _placeYggdrasil() {
    // The heart of the monster territory — a colossal world tree whose rings of
    // monsters (A+ innermost → F outermost) radiate outward from here.
    const cx = YGGDRASIL_CX * TILE, cy = YGGDRASIL_CY * TILE; // center (px)
    const size = 64 * TILE; // 2048px footprint — a massive, legendary world tree
    const obj = { type: 'yggdrasil', x: cx - size / 2, y: cy - size / 2, w: size, h: size };
    this._addStatic(obj);
    // r = the blessing radius, sized so the player can trigger it while standing
    // AT the edge of the solid trunk (r = half the footprint).
    this.yggdrasil = { x: cx, y: cy, r: size / 2, w: size, h: size };
  }

  _carveRiver() {
    for (let ty = 0; ty < WORLD_H; ty++) {
      const x = (VILLAGE_CX - 74) + Math.floor(Math.sin(ty * 0.08) * 5);
      for (let dx = -1; dx <= 2; dx++) {
        const tx = x + dx;
        if (tx >= 0 && tx < WORLD_W) {
          this.tiles[this.idx(tx, ty)] = T.WATER;
          if (dx === -1 || dx === 2) this.tiles[this.idx(tx, ty)] = T.SAND;
        }
      }
    }
    // pond south-east of village
    for (let ty = VILLAGE_CY + 22; ty < VILLAGE_CY + 30; ty++) {
      for (let tx = VILLAGE_CX + 20; tx < VILLAGE_CX + 28; tx++) {
        this.tiles[this.idx(tx, ty)] = T.WATER;
      }
    }
    for (let ty = VILLAGE_CY + 21; ty < VILLAGE_CY + 31; ty++) for (let tx = VILLAGE_CX + 19; tx < VILLAGE_CX + 29; tx++) {
      if (this.tiles[this.idx(tx, ty)] === T.GRASS) this.tiles[this.idx(tx, ty)] = T.SAND;
    }
  }

  _placeFarms() {
    for (let ty = VILLAGE_CY + 6; ty < VILLAGE_CY + 16; ty++) {
      for (let tx = VILLAGE_CX - 32; tx < VILLAGE_CX - 22; tx++) {
        if (this.tiles[this.idx(tx, ty)] === T.GRASS) this.tiles[this.idx(tx, ty)] = T.FARM;
      }
    }
  }

  _placePaths() {
    const mark = (tx, ty) => { if (tx >= 0 && ty >= 0 && tx < WORLD_W && ty < WORLD_H && this.tiles[this.idx(tx, ty)] === T.GRASS) this.tiles[this.idx(tx, ty)] = T.PATH; };
    // main cross through village center
    for (let tx = VILLAGE_CX - 24; tx <= VILLAGE_CX + 26; tx++) mark(tx, VILLAGE_CY);
    for (let ty = VILLAGE_CY - 24; ty <= VILLAGE_CY + 26; ty++) mark(VILLAGE_CX, ty);
    // lower road
    for (let tx = VILLAGE_CX - 24; tx <= VILLAGE_CX + 26; tx++) mark(tx, VILLAGE_CY + 16);
    // east road through the dense forest, toward the world tree (monster territory)
    for (let tx = VILLAGE_CX + 26; tx <= VILLAGE_CX + 180; tx++) mark(tx, VILLAGE_CY);
    for (let ty = VILLAGE_CY; ty <= VILLAGE_CY + 16; ty++) mark(VILLAGE_CX + 16, ty);
    // west farm road
    for (let tx = VILLAGE_CX - 28; tx <= VILLAGE_CX - 24; tx++) mark(tx, VILLAGE_CY + 10);
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
    const yR = 40; // keep a clear grove around the world tree's trunk
    for (let ty = 0; ty < WORLD_H; ty++) {
      for (let tx = 0; tx < WORLD_W; tx++) {
        const idx = this.idx(tx, ty);
        if (this.tiles[idx] !== T.GRASS) continue;
        const snowy = isSnowRegion(tx, ty);
        if (snowy) this.tiles[idx] = T.SNOW; // permanent snow-covered ground
        if (this._inMountain(tx, ty)) continue; // no trees on peaks
        const d = Math.hypot(tx - VILLAGE_CX, ty - VILLAGE_CY);
        if (Math.hypot(tx - YGGDRASIL_CX, ty - YGGDRASIL_CY) < yR) continue; // tree grove
        if (d < 34) {
          // occasional village tree / flower (slightly bigger clearing for the village)
          if (rng.chance(0.02)) this._addTree(tx, ty, false, false);
          else if (!snowy && rng.chance(0.03)) this.tiles[idx] = T.FLOWER;
          continue;
        }
        let density;
        if (d < 60) density = 0.05;             // safe forest — light trees
        else if (d < 150) density = 0.22;       // DENSE boundary forest (the wild frontier)
        else if (d < 800) density = Math.min(0.15, 0.04 + d * 0.00012);
        else density = 0.025;                    // sparse outer wilderness
        if (rng.chance(density)) {
          this._addTree(tx, ty, d > 150, snowy);
        } else if (!snowy && rng.chance(0.02)) {
          this.tiles[idx] = T.FLOWER;
        }
      }
    }
    // resource nodes (scattered across the whole massive world)
    this._scatterNodes('herb', 220, 30, 1500);
    this._scatterNodes('mushroom', 150, 30, 1500);
    this._scatterNodes('berry', 130, 28, 1400);
    this._scatterNodes('ore', 170, 40, 1600);
    this._scatterNodes('flower', 120, 24, 1400);
  }

  _addTree(tx, ty, dark = false, snowy = false) {
    const px = tx * TILE + TILE / 2, py = ty * TILE + TILE / 2;
    // 7 tree kinds: oak, pine, birch, autumn, willow, crimson, goldleaf
    const variant = this.rng.int(0, 6);
    // most trees are 1 tile, but some are big (occupy 3-6+ tiles)
    const bigRoll = this.rng.float();
    let size = 1;
    if (bigRoll < 0.12) size = 2;      // 2x2 (4 tiles)
    else if (bigRoll < 0.15) size = 3; // 3x3 (9 tiles)
    const half = (size * TILE) / 2;
    this._addStatic({ type: 'tree', x: px - half, y: py - half, w: size * TILE, h: size * TILE, dark, variant, size, snowy });
  }
  _addStatic(obj) {
    // register in EVERY cell the object overlaps, so huge colliders (the world
    // tree) are found for collision/render even from their far side
    const cellPx = this._cell * TILE;
    const cx0 = Math.floor(obj.x / cellPx), cy0 = Math.floor(obj.y / cellPx);
    const cx1 = Math.floor((obj.x + obj.w - 1) / cellPx), cy1 = Math.floor((obj.y + obj.h - 1) / cellPx);
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const key = cx + ',' + cy;
        if (!this.staticGrid.has(key)) this.staticGrid.set(key, []);
        this.staticGrid.get(key).push(obj);
      }
    }
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
    const seen = new Set(); // large objects span many cells — dedupe them
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        for (const c of this._staticInCell(cx, cy)) {
          if (seen.has(c)) continue;
          seen.add(c);
          out.push(c);
        }
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

  // find a random walkable position in a ring around an ARBITRARY center (used
  // for monsters radiating outward from the Yggdrasil)
  randomRingPosition(cx, cy, minD, maxD, tries = 60) {
    for (let i = 0; i < tries; i++) {
      const ang = this.rng.range(0, Math.PI * 2);
      const d = this.rng.range(minD, maxD);
      const px = (cx + Math.cos(ang) * d) * TILE;
      const py = (cy + Math.sin(ang) * d) * TILE;
      if (px < 0 || py < 0 || px >= PX_W || py >= PX_H) continue;
      if (!this.circleBlocked(px, py, 14)) return { x: px, y: py };
    }
    return { x: cx * TILE, y: cy * TILE };
  }

  randomVillagePosition(tries = 60) {
    for (let i = 0; i < tries; i++) {
      const tx = this.rng.int(VILLAGE_CX - 24, VILLAGE_CX + 24), ty = this.rng.int(VILLAGE_CY - 24, VILLAGE_CY + 24);
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
