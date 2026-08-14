import { ITEMS } from './items.js';
import { WEAPONS } from './weapons.js';
import { ARMOR } from './armor.js';

export const ITEM_DB = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
export const WEAPON_DB = Object.fromEntries(WEAPONS.map((w) => [w.id, w]));
export const ARMOR_DB = Object.fromEntries(ARMOR.map((a) => [a.id, a]));

export function getItem(id) {
  return ITEM_DB[id] || WEAPON_DB[id] || ARMOR_DB[id] || null;
}
export function itemWeight(id) { const i = getItem(id); return i ? i.weight : 0; }
export function itemName(id) { const i = getItem(id); return i ? i.name : id; }
export function itemRarity(id) { const i = getItem(id); return i ? i.rarity : 'common'; }

// color per rarity (used for loot drops, nameplates, etc.)
export const RARITY_COLORS = {
  common: '#b8b8b8', uncommon: '#4ac84a', rare: '#4a8ac8', epic: '#c84ac8', legendary: '#ffd76a'
};
export function rarityColor(id) { return RARITY_COLORS[itemRarity(id)] || RARITY_COLORS.common; }
