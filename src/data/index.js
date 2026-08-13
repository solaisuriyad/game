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
