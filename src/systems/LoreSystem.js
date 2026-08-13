import { LORE, LORE_BY_ID } from '../data/lore.js';

// Tracks discovered forest lore (the "history of the forest" endgame). Discovery
// is triggered by exploration (zone entry, hidden locations, shrine) and boss
// kills — see the unlock keys in data/lore.js.
const ZONE_UNLOCKS = {
  'Deep Forest': 'lore_deep',
  'Dark Forest': 'lore_dark',
  'Ancient Forest': 'lore_ancient',
  'Forbidden Forest': 'lore_forbidden'
};
const BOSS_UNLOCKS = {
  alpha_wolf: 'lore_alpha',
  ancient_bear: 'lore_bear',
  forest_guardian: 'lore_guardian',
  ancient_dragon: 'lore_dragon'
};

export class LoreSystem {
  constructor(game) {
    this.game = game;
    this.discovered = new Set(); // lore ids
    this.hiddenLocations = [
      { id: 'watchtower', loreId: 'lore_old_watch', x: 82 * 32, y: 102 * 32, radius: 90, label: 'The Old Watchtower' },
      { id: 'ruins', loreId: 'lore_ruins', x: 152 * 32, y: 82 * 32, radius: 110, label: 'The Ruins of the First People' }
    ];
  }

  has(id) { return this.discovered.has(id); }
  count() { return this.discovered.size; }
  total() { return LORE.length; }
  allFound() { return this.discovered.size >= LORE.length; }

  discover(id, opts = {}) {
    if (this.discovered.has(id)) return false;
    const entry = LORE_BY_ID[id];
    if (!entry) return false;
    this.discovered.add(id);
    const g = this.game;
    g.toast(`📜 Lore discovered: ${entry.title}`);
    if (opts.silent !== true) {
      g.audio.sfx('levelup');
      g.player.reputation = Math.min(100, g.player.reputation + 2);
    }
    this._checkCompletion();
    return true;
  }

  // called on entering a new zone
  onZone(zoneName) {
    const id = ZONE_UNLOCKS[zoneName];
    if (id) this.discover(id);
  }
  // called on a boss kill
  onBossKill(monsterDefId) {
    const id = BOSS_UNLOCKS[monsterDefId];
    if (id) this.discover(id);
  }
  // called each frame to detect proximity to hidden locations
  update() {
    const p = this.game.player;
    if (!p) return;
    for (const loc of this.hiddenLocations) {
      if (this.has(loc.loreId)) continue;
      if (Math.hypot(loc.x - p.x, loc.y - p.y) < loc.radius) {
        this.game.toast(`📍 You discover ${loc.label}.`);
        this.discover(loc.loreId);
      }
    }
    // the Yggdrasil: discovering the world tree reveals its lore
    const y = this.game.world.yggdrasil;
    if (y && !this.has('lore_yggdrasil') && Math.hypot(y.x - p.x, y.y - p.y) < 260) {
      this.game.toast('🌳 You stand before the Yggdrasil — the living source of the forest\'s power.');
      this.discover('lore_yggdrasil');
    }
  }

  _checkCompletion() {
    // the final history entry unlocks when every other entry has been found
    const allOthers = LORE.filter((l) => l.id !== 'lore_history').every((l) => this.discovered.has(l.id));
    if (allOthers && !this.has('lore_history')) {
      this.discover('lore_history', { silent: true });
      this.game.toast('🏆 You have uncovered the complete history of the forest.');
    }
  }

  serialize() { return [...this.discovered]; }
  deserialize(list) { this.discovered = new Set(list || []); }
}
