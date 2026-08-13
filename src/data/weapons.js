// Weapon tiers: wood -> stone -> iron -> steel -> silver -> gold -> mythril -> legendary
export const WEAPONS = [
  { id: 'sword_wood', name: 'Training Sword', type: 'sword', tier: 'wood', damage: 6, speed: 0.55, range: 46, crit: 0.05, durability: 60, weight: 1.5, value: 20, color: '#b98a5a' },
  { id: 'sword_stone', name: 'Stone Sword', type: 'sword', tier: 'stone', damage: 11, speed: 0.6, range: 48, crit: 0.07, durability: 80, weight: 2.0, value: 90, color: '#8a9aa0' },
  { id: 'sword_iron', name: 'Iron Sword', type: 'sword', tier: 'iron', damage: 18, speed: 0.62, range: 50, crit: 0.08, durability: 120, weight: 2.4, value: 260, color: '#b8c4cc' },
  { id: 'sword_steel', name: 'Steel Sword', type: 'sword', tier: 'steel', damage: 27, speed: 0.65, range: 52, crit: 0.1, durability: 180, weight: 2.5, value: 700, color: '#d5e0e6' },
  { id: 'bow_wood', name: 'Short Bow', type: 'bow', tier: 'wood', damage: 9, speed: 0.8, range: 260, crit: 0.1, durability: 60, weight: 1.2, value: 45, color: '#9a7a4a' },
  { id: 'bow_iron', name: 'Reinforced Bow', type: 'bow', tier: 'iron', damage: 16, speed: 0.85, range: 300, crit: 0.12, durability: 100, weight: 1.6, value: 300, color: '#6b7780' },
  { id: 'spear_wood', name: 'Wooden Spear', type: 'spear', tier: 'wood', damage: 8, speed: 0.7, range: 66, crit: 0.06, durability: 70, weight: 2.0, value: 35, color: '#a97f4f' },
  { id: 'spear_iron', name: 'Iron Spear', type: 'spear', tier: 'iron', damage: 20, speed: 0.72, range: 70, crit: 0.09, durability: 140, weight: 2.6, value: 280, color: '#b8c4cc' },
  { id: 'axe_iron', name: 'Hunter Axe', type: 'axe', tier: 'iron', damage: 22, speed: 0.8, range: 48, crit: 0.12, durability: 130, weight: 3.0, value: 300, color: '#c2cdd4' },
  { id: 'hammer_steel', name: 'Steel Hammer', type: 'hammer', tier: 'steel', damage: 34, speed: 0.95, range: 50, crit: 0.12, durability: 200, weight: 5.0, value: 800, color: '#dbe4ea' },
  { id: 'dagger_iron', name: 'Iron Dagger', type: 'dagger', tier: 'iron', damage: 12, speed: 0.32, range: 34, crit: 0.2, durability: 90, weight: 0.8, value: 150, color: '#c7d2d9' },
  // monster/dragon-forged weapons (crafted from monster drops)
  { id: 'fang_blade', name: 'Fang Blade', type: 'sword', tier: 'steel', damage: 34, speed: 0.6, range: 54, crit: 0.14, durability: 220, weight: 2.6, value: 900, color: '#e8d8c0' },
  { id: 'dragon_sword', name: 'Dragon Sword', type: 'sword', tier: 'mythril', damage: 46, speed: 0.6, range: 58, crit: 0.16, durability: 280, weight: 2.8, value: 2200, color: '#8ae8ff' },
  { id: 'draconic_sword', name: 'Draconic Sword', type: 'sword', tier: 'mythril', damage: 60, speed: 0.62, range: 62, crit: 0.18, durability: 340, weight: 3.0, value: 4200, color: '#ff9a5a' },
  { id: 'dragonoid_blade', name: 'Dragonoid Blade', type: 'sword', tier: 'legendary', damage: 85, speed: 0.65, range: 66, crit: 0.22, durability: 420, weight: 3.2, value: 9000, color: '#ff5ae0' }
];
