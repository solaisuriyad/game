// Monster rank tiers. Lower rank -> higher rank (F = weakest normal monsters,
// A+ = dragonoids, the most powerful). Each rank's monsters drop an "essence"
// that grants a damage bonus against the NEXT rank, creating a hunt-and-upgrade
// progression chain.
export const RANKS_ORDER = ['F', 'E', 'D', 'C', 'B', 'A', 'S', 'A+'];

export function rankIndex(rank) {
  const i = RANKS_ORDER.indexOf(rank);
  return i < 0 ? 0 : i;
}
export function nextRank(rank) {
  const i = rankIndex(rank);
  return i < RANKS_ORDER.length - 1 ? RANKS_ORDER[i + 1] : null;
}
export function prevRank(rank) {
  const i = rankIndex(rank);
  return i > 0 ? RANKS_ORDER[i - 1] : null;
}
// map a monster level to a rank tier (used when a def doesn't set rank explicitly)
export function rankForLevel(level) {
  if (level <= 4) return 'F';
  if (level <= 8) return 'E';
  if (level <= 12) return 'D';
  if (level <= 16) return 'C';
  if (level <= 20) return 'B';
  if (level <= 26) return 'A';
  if (level <= 34) return 'S';
  return 'A+';
}
// the essence item a monster of this rank drops (helps defeat the next rank)
export function essenceId(rank) {
  if (!rank) return null;
  return 'essence_' + String(rank).toLowerCase().replace('+', 'plus');
}

// distance rings (in tiles) from the YGGDRASIL where each rank lives.
// The world tree is the heart of monster territory: A+ dragonoids guard the
// trunk, S-rank dragons circle just outside, and each lower rank radiates
// outward until F-rank forms the outermost edge (nearest the town).
// Kept in one place so single-player (PopulationSystem) and co-op
// (server/monster-sim) always stay in sync.
export const RANK_RINGS = {
  'A+': [45, 110],
  'S': [110, 200],
  'A': [200, 250],  // (no A-rank monsters currently)
  'B': [200, 250],
  'C': [250, 330],
  'D': [330, 410],
  'E': [410, 490],
  'F': [490, 550]
};
// ring [minR, maxR] tiles from the tree for a monster's rank (falls back to C)
export function rankRing(rank) {
  return RANK_RINGS[rank] || RANK_RINGS['C'];
}
// bonus damage multiplier applied when the player holds the previous rank's essence
export const RANK_BONUS = 0.35;
