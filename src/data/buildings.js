// Village buildings. x/y = tile coords of top-left, w/h = tile size.
// `func` maps to an interaction in the game (shop/guild/etc). `color` = roof tint.
export const BUILDINGS = [
  // ---- North-west quadrant ----
  { id: 'community', name: 'Community Hall', func: 'community', x: 118, y: 116, w: 5, h: 4, color: '#8a8a6a' },
  { id: 'storage', name: 'Storage', func: 'storage', x: 126, y: 116, w: 4, h: 4, color: '#5a5a4a' },
  { id: 'crafting', name: 'Crafting Area', func: 'crafting', x: 118, y: 122, w: 4, h: 3, color: '#8a5a3a' },
  { id: 'carpenter', name: 'Carpenter', func: 'carpenter', x: 130, y: 118, w: 4, h: 4, color: '#8a6a3a' },
  { id: 'tailor', name: 'Tailor', func: 'tailor', x: 118, y: 128, w: 4, h: 4, color: '#7a4a6a' },
  { id: 'stable', name: 'Stable', func: 'stable', x: 126, y: 128, w: 5, h: 4, color: '#6a5a3a' },
  { id: 'guardpost', name: 'Guard Post', func: 'guard', x: 118, y: 134, w: 3, h: 3, color: '#5a5a6a' },
  { id: 'house1', name: 'House', func: 'house', x: 126, y: 123, w: 3, h: 3, color: '#8a7a5a' },
  // ---- North-east quadrant ----
  { id: 'blacksmith', name: 'Blacksmith', func: 'blacksmith', x: 144, y: 116, w: 5, h: 4, color: '#5a5a5a' },
  { id: 'weaponshop', name: 'Weapon Shop', func: 'weaponshop', x: 152, y: 116, w: 4, h: 4, color: '#6a4a3a' },
  { id: 'training', name: 'Training Ground', func: 'training', x: 158, y: 116, w: 5, h: 4, color: '#5a6a4a' },
  { id: 'armorshop', name: 'Armor Shop', func: 'armorshop', x: 144, y: 122, w: 4, h: 4, color: '#4a5a6a' },
  { id: 'house2', name: 'House', func: 'house', x: 152, y: 123, w: 3, h: 3, color: '#7a8a6a' },
  { id: 'house3', name: 'House', func: 'house', x: 158, y: 122, w: 3, h: 3, color: '#8a6a6a' },
  { id: 'shrine', name: 'Shrine', func: 'shrine', x: 162, y: 128, w: 3, h: 3, color: '#7a7a8a' },
  // ---- South-west quadrant ----
  { id: 'market', name: "Farmer's Market", func: 'market', x: 118, y: 142, w: 5, h: 4, color: '#8a7a4a' },
  { id: 'healer', name: 'Healer', func: 'healer', x: 126, y: 142, w: 4, h: 4, color: '#4a7a5a' },
  { id: 'general', name: 'General Store', func: 'general', x: 132, y: 142, w: 5, h: 4, color: '#a06a3a' },
  { id: 'house4', name: 'House', func: 'house', x: 118, y: 148, w: 3, h: 3, color: '#6a8a7a' },
  { id: 'house5', name: 'House', func: 'house', x: 126, y: 148, w: 3, h: 3, color: '#8a7a7a' },
  { id: 'house6', name: 'House', func: 'house', x: 132, y: 148, w: 3, h: 3, color: '#7a6a5a' },
  // ---- South-east quadrant ----
  { id: 'guild', name: 'Adventure Guild', func: 'guild', x: 144, y: 142, w: 6, h: 4, color: '#8a5a3a' },
  { id: 'lodge', name: "Hunter's Lodge", func: 'lodge', x: 152, y: 142, w: 4, h: 4, color: '#6a7a4a' },
  { id: 'inn', name: 'Inn', func: 'inn', x: 144, y: 148, w: 5, h: 4, color: '#7a5a4a' },
  { id: 'tavern', name: 'Tavern', func: 'tavern', x: 152, y: 148, w: 4, h: 4, color: '#6a4a4a' },
  { id: 'chief', name: "Chief's House", func: 'chief', x: 158, y: 148, w: 5, h: 4, color: '#4a4a5a' },
  { id: 'house7', name: 'House', func: 'house', x: 164, y: 148, w: 3, h: 3, color: '#6a6a8a' },
  // ---- Bottom band ----
  { id: 'house8', name: 'House', func: 'house', x: 118, y: 158, w: 3, h: 3, color: '#7a8a5a' },
  { id: 'foodshop', name: 'Food Shop', func: 'foodshop', x: 126, y: 158, w: 4, h: 4, color: '#c08a4a' },
  { id: 'playerhouse', name: 'Player Residence', func: 'home', x: 146, y: 158, w: 4, h: 3, color: '#7a6a4a' },
  // ---- Center well (off the roads) ----
  { id: 'well', name: 'Village Well', func: 'well', x: 134, y: 138, w: 2, h: 2, color: '#6a6a5a' }
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
