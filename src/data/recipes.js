// Crafting recipes. station: null (anywhere/campfire) | 'blacksmith' | 'tailor'
// | 'carpenter' | 'herbalist' | 'crafting'.
export const RECIPES = [
  // Campfire / cooking
  { id: 'cook_meat', name: 'Cook Meat', station: 'crafting', inputs: [{ id: 'meat_raw', qty: 1 }], outputs: [{ id: 'meat_cooked', qty: 1 }], desc: 'Roast raw meat over a fire.' },
  { id: 'cook_fish', name: 'Cook Fish', station: 'crafting', inputs: [{ id: 'fish', qty: 1 }], outputs: [{ id: 'cooked_fish', qty: 1 }], desc: 'Roast a fish.' },
  { id: 'stew', name: 'Mushroom Stew', station: 'crafting', inputs: [{ id: 'mushroom', qty: 2 }, { id: 'herb', qty: 1 }], outputs: [{ id: 'meat_cooked', qty: 1 }], desc: 'A hearty stew.' },
  // Ammo / tools
  { id: 'arrows', name: 'Fletch Arrows (x5)', station: 'crafting', inputs: [{ id: 'wood', qty: 1 }, { id: 'feather', qty: 1 }], outputs: [{ id: 'arrow', qty: 5 }], desc: 'Craft five arrows.' },
  { id: 'trap', name: 'Snare Trap', station: 'crafting', inputs: [{ id: 'wood', qty: 2 }, { id: 'hide_rabbit', qty: 1 }], outputs: [{ id: 'trap', qty: 1 }], desc: 'A small game trap.' },
  { id: 'bear_trap', name: 'Bear Trap', station: 'blacksmith', inputs: [{ id: 'iron_ore', qty: 2 }, { id: 'wood', qty: 1 }], outputs: [{ id: 'bear_trap', qty: 1 }], desc: 'A heavy spring trap.' },
  { id: 'bandage', name: 'Bandage', station: 'crafting', inputs: [{ id: 'herb', qty: 1 }, { id: 'cloth_shirt', qty: 1 }], outputs: [{ id: 'bandage', qty: 2 }], desc: 'Cloth bandages.' },
  // Potions
  { id: 'potion_small', name: 'Healing Potion', station: 'herbalist', inputs: [{ id: 'herb', qty: 2 }], outputs: [{ id: 'potion_small', qty: 1 }], desc: 'A basic healing draught.' },
  { id: 'potion_big', name: 'Greater Potion', station: 'herbalist', inputs: [{ id: 'rare_herb', qty: 1 }, { id: 'herb', qty: 2 }], outputs: [{ id: 'potion_big', qty: 1 }], desc: 'A potent healing draught.' },
  // Weapons (blacksmith)
  { id: 'sword_stone', name: 'Stone Sword', station: 'blacksmith', inputs: [{ id: 'stone', qty: 3 }, { id: 'wood', qty: 1 }], outputs: [{ id: 'sword_stone', qty: 1 }], desc: 'A chipped stone blade.' },
  { id: 'sword_iron', name: 'Iron Sword', station: 'blacksmith', inputs: [{ id: 'iron_ore', qty: 3 }, { id: 'wood', qty: 1 }], outputs: [{ id: 'sword_iron', qty: 1 }], desc: 'A sturdy iron blade.' },
  { id: 'spear_iron', name: 'Iron Spear', station: 'blacksmith', inputs: [{ id: 'iron_ore', qty: 2 }, { id: 'wood', qty: 2 }], outputs: [{ id: 'spear_iron', qty: 1 }], desc: 'A long iron-tipped spear.' },
  { id: 'bow_iron', name: 'Reinforced Bow', station: 'carpenter', inputs: [{ id: 'rare_wood', qty: 1 }, { id: 'spider_silk', qty: 2 }], outputs: [{ id: 'bow_iron', qty: 1 }], desc: 'A bow reinforced with silk.' },
  // Armor (tailor)
  { id: 'leather_vest', name: 'Leather Vest', station: 'tailor', inputs: [{ id: 'hide_deer', qty: 2 }], outputs: [{ id: 'leather_vest', qty: 1 }], desc: 'A tough leather vest.' },
  { id: 'leather_legs', name: 'Leather Leggings', station: 'tailor', inputs: [{ id: 'hide_boar', qty: 2 }], outputs: [{ id: 'leather_legs', qty: 1 }], desc: 'Sturdy leather leggings.' },
  { id: 'reinforced_vest', name: 'Reinforced Vest', station: 'tailor', inputs: [{ id: 'hide_bear', qty: 2 }, { id: 'bone', qty: 2 }], outputs: [{ id: 'reinforced_vest', qty: 1 }], desc: 'A reinforced hide vest.' },
  // Backpack
  { id: 'backpack', name: 'Backpack Upgrade', station: 'tailor', inputs: [{ id: 'hide_deer', qty: 3 }, { id: 'hide_boar', qty: 1 }], outputs: [{ id: 'backpack', qty: 1 }], desc: 'Expands carry capacity.' },
  // Monster/dragon-forged weapons (from monster drops)
  { id: 'fang_blade', name: 'Fang Blade', station: 'blacksmith', inputs: [{ id: 'monster_fang', qty: 4 }, { id: 'iron_ore', qty: 2 }], outputs: [{ id: 'fang_blade', qty: 1 }], desc: 'A blade forged from monster fangs.' },
  { id: 'dragon_sword', name: 'Dragon Sword', station: 'blacksmith', inputs: [{ id: 'dragon_scale', qty: 2 }, { id: 'dragon_bone', qty: 2 }], outputs: [{ id: 'dragon_sword', qty: 1 }], desc: 'A sword of dragon scale and bone.' },
  { id: 'draconic_sword', name: 'Draconic Sword', station: 'blacksmith', inputs: [{ id: 'dragon_core', qty: 1 }, { id: 'dragon_bone', qty: 2 }], outputs: [{ id: 'draconic_sword', qty: 1 }], desc: 'Forged around a dragon core.' },
  { id: 'dragonoid_blade', name: 'Dragonoid Blade', station: 'blacksmith', inputs: [{ id: 'dragonoid_core', qty: 1 }, { id: 'dragon_core', qty: 2 }], outputs: [{ id: 'dragonoid_blade', qty: 1 }], desc: 'The ultimate weapon, born of a dragonoid\'s heart.' }
];
