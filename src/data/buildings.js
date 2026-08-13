// Village buildings. x/y = tile coords of top-left, w/h = tile size.
// `func` maps to an interaction in the game (shop/guild/etc). `color` = roof tint.
export const BUILDINGS = [
  // ---- North-west quadrant ----
  { id: 'community', name: 'Community Hall', func: 'community', x: 378, y: 376, w: 5, h: 4, color: '#8a8a6a' },
  { id: 'storage', name: 'Storage', func: 'storage', x: 386, y: 376, w: 4, h: 4, color: '#5a5a4a' },
  { id: 'crafting', name: 'Crafting Area', func: 'crafting', x: 378, y: 382, w: 4, h: 3, color: '#8a5a3a' },
  { id: 'carpenter', name: 'Carpenter', func: 'carpenter', x: 390, y: 378, w: 4, h: 4, color: '#8a6a3a' },
  { id: 'tailor', name: 'Tailor', func: 'tailor', x: 378, y: 388, w: 4, h: 4, color: '#7a4a6a' },
  { id: 'stable', name: 'Stable', func: 'stable', x: 386, y: 388, w: 5, h: 4, color: '#6a5a3a' },
  { id: 'guardpost', name: 'Guard Post', func: 'guard', x: 378, y: 394, w: 3, h: 3, color: '#5a5a6a' },
  { id: 'house1', name: 'House', func: 'house', x: 386, y: 383, w: 3, h: 3, color: '#8a7a5a' },
  // ---- North-east quadrant ----
  { id: 'blacksmith', name: 'Blacksmith', func: 'blacksmith', x: 404, y: 376, w: 5, h: 4, color: '#5a5a5a' },
  { id: 'weaponshop', name: 'Weapon Shop', func: 'weaponshop', x: 412, y: 376, w: 4, h: 4, color: '#6a4a3a' },
  { id: 'training', name: 'Training Ground', func: 'training', x: 418, y: 376, w: 5, h: 4, color: '#5a6a4a' },
  { id: 'armorshop', name: 'Armor Shop', func: 'armorshop', x: 404, y: 382, w: 4, h: 4, color: '#4a5a6a' },
  { id: 'house2', name: 'House', func: 'house', x: 412, y: 383, w: 3, h: 3, color: '#7a8a6a' },
  { id: 'house3', name: 'House', func: 'house', x: 418, y: 382, w: 3, h: 3, color: '#8a6a6a' },
  { id: 'shrine', name: 'Shrine', func: 'shrine', x: 422, y: 388, w: 3, h: 3, color: '#7a7a8a' },
  // ---- South-west quadrant ----
  { id: 'market', name: "Farmer's Market", func: 'market', x: 378, y: 402, w: 5, h: 4, color: '#8a7a4a' },
  { id: 'healer', name: 'Healer', func: 'healer', x: 386, y: 402, w: 4, h: 4, color: '#4a7a5a' },
  { id: 'general', name: 'General Store', func: 'general', x: 392, y: 402, w: 5, h: 4, color: '#a06a3a' },
  { id: 'house4', name: 'House', func: 'house', x: 378, y: 408, w: 3, h: 3, color: '#6a8a7a' },
  { id: 'house5', name: 'House', func: 'house', x: 386, y: 408, w: 3, h: 3, color: '#8a7a7a' },
  { id: 'house6', name: 'House', func: 'house', x: 392, y: 408, w: 3, h: 3, color: '#7a6a5a' },
  // ---- South-east quadrant ----
  { id: 'guild', name: 'Adventure Guild', func: 'guild', x: 404, y: 402, w: 6, h: 4, color: '#8a5a3a' },
  { id: 'lodge', name: "Hunter's Lodge", func: 'lodge', x: 412, y: 402, w: 4, h: 4, color: '#6a7a4a' },
  { id: 'inn', name: 'Inn', func: 'inn', x: 404, y: 408, w: 5, h: 4, color: '#7a5a4a' },
  { id: 'tavern', name: 'Tavern', func: 'tavern', x: 412, y: 408, w: 4, h: 4, color: '#6a4a4a' },
  { id: 'chief', name: "Chief's House", func: 'chief', x: 418, y: 408, w: 5, h: 4, color: '#4a4a5a' },
  { id: 'house7', name: 'House', func: 'house', x: 424, y: 408, w: 3, h: 3, color: '#6a6a8a' },
  // ---- Bottom band ----
  { id: 'house8', name: 'House', func: 'house', x: 378, y: 418, w: 3, h: 3, color: '#7a8a5a' },
  { id: 'foodshop', name: 'Food Shop', func: 'foodshop', x: 386, y: 418, w: 4, h: 4, color: '#c08a4a' },
  { id: 'playerhouse', name: 'Player Residence', func: 'home', x: 406, y: 418, w: 4, h: 3, color: '#7a6a4a' },
  // ---- Center well (off the roads) ----
  { id: 'well', name: 'Village Well', func: 'well', x: 394, y: 398, w: 2, h: 2, color: '#6a6a5a' }
];

export const BUILDING_FUNC_LABELS = {
  guild: 'Adventure Guild — submit materials & quests',
  lodge: "Hunter's Lodge — hunting gear & tips",
  blacksmith: 'Blacksmith — craft & repair weapons',
  weaponshop: 'Weapon Shop — buy weapons',
  armorshop: 'Armor Shop — buy armor',
  general: 'General Store — buy & sell goods',
  foodshop: 'Food Shop — buy food',
  inn: 'Inn — rest to restore health',
  tavern: 'Tavern — gossip & socialize',
  market: "Farmer's Market — sell produce",
  storage: 'Storage — stash items',
  chief: "Village Chief's House",
  healer: 'Healer — buy medicine',
  carpenter: 'Carpenter — wooden gear',
  tailor: 'Tailor — craft armor & bags',
  stable: 'Stable',
  training: 'Training Ground — practice combat',
  well: 'Village Well — drink water',
  community: 'Community Hall',
  shrine: 'Shrine — rest & reflect',
  guard: 'Guard Post',
  crafting: 'Crafting Area — campfire & workbench',
  home: 'Player Residence — sleep & store',
  house: 'Residential House'
};
