// Village buildings. x/y = tile coords of top-left, w/h = tile size.
// `func` maps to an interaction in the game (shop/guild/etc). `color` = roof tint.
export const BUILDINGS = [
  // ---- North-west quadrant ----
  { id: 'community', name: 'Community Hall', func: 'community', x: 1978, y: 1976, w: 5, h: 4, color: '#8a8a6a' },
  { id: 'storage', name: 'Storage', func: 'storage', x: 1986, y: 1976, w: 4, h: 4, color: '#5a5a4a' },
  { id: 'crafting', name: 'Crafting Area', func: 'crafting', x: 1978, y: 1982, w: 4, h: 3, color: '#8a5a3a' },
  { id: 'carpenter', name: 'Carpenter', func: 'carpenter', x: 1990, y: 1978, w: 4, h: 4, color: '#8a6a3a' },
  { id: 'tailor', name: 'Tailor', func: 'tailor', x: 1978, y: 1988, w: 4, h: 4, color: '#7a4a6a' },
  { id: 'stable', name: 'Stable', func: 'stable', x: 1986, y: 1988, w: 5, h: 4, color: '#6a5a3a' },
  { id: 'guardpost', name: 'Guard Post', func: 'guard', x: 1978, y: 1994, w: 3, h: 3, color: '#5a5a6a' },
  { id: 'house1', name: 'House', func: 'house', x: 1986, y: 1983, w: 3, h: 3, color: '#8a7a5a' },
  // ---- North-east quadrant ----
  { id: 'blacksmith', name: 'Blacksmith', func: 'blacksmith', x: 2004, y: 1976, w: 5, h: 4, color: '#5a5a5a' },
  { id: 'weaponshop', name: 'Weapon Shop', func: 'weaponshop', x: 2012, y: 1976, w: 4, h: 4, color: '#6a4a3a' },
  { id: 'training', name: 'Training Ground', func: 'training', x: 2018, y: 1976, w: 5, h: 4, color: '#5a6a4a' },
  { id: 'armorshop', name: 'Armor Shop', func: 'armorshop', x: 2004, y: 1982, w: 4, h: 4, color: '#4a5a6a' },
  { id: 'house2', name: 'House', func: 'house', x: 2012, y: 1983, w: 3, h: 3, color: '#7a8a6a' },
  { id: 'house3', name: 'House', func: 'house', x: 2018, y: 1982, w: 3, h: 3, color: '#8a6a6a' },
  { id: 'shrine', name: 'Shrine', func: 'shrine', x: 2022, y: 1988, w: 3, h: 3, color: '#7a7a8a' },
  // ---- South-west quadrant ----
  { id: 'market', name: "Farmer's Market", func: 'market', x: 1978, y: 2002, w: 5, h: 4, color: '#8a7a4a' },
  { id: 'healer', name: 'Healer', func: 'healer', x: 1986, y: 2002, w: 4, h: 4, color: '#4a7a5a' },
  { id: 'general', name: 'General Store', func: 'general', x: 1992, y: 2002, w: 5, h: 4, color: '#a06a3a' },
  { id: 'house4', name: 'House', func: 'house', x: 1978, y: 2008, w: 3, h: 3, color: '#6a8a7a' },
  { id: 'house5', name: 'House', func: 'house', x: 1986, y: 2008, w: 3, h: 3, color: '#8a7a7a' },
  { id: 'house6', name: 'House', func: 'house', x: 1992, y: 2008, w: 3, h: 3, color: '#7a6a5a' },
  // ---- South-east quadrant ----
  { id: 'guild', name: 'Adventure Guild', func: 'guild', x: 2004, y: 2002, w: 6, h: 4, color: '#8a5a3a' },
  { id: 'lodge', name: "Hunter's Lodge", func: 'lodge', x: 2012, y: 2002, w: 4, h: 4, color: '#6a7a4a' },
  { id: 'inn', name: 'Inn', func: 'inn', x: 2004, y: 2008, w: 5, h: 4, color: '#7a5a4a' },
  { id: 'tavern', name: 'Tavern', func: 'tavern', x: 2012, y: 2008, w: 4, h: 4, color: '#6a4a4a' },
  { id: 'chief', name: "Chief's House", func: 'chief', x: 2018, y: 2008, w: 5, h: 4, color: '#4a4a5a' },
  { id: 'house7', name: 'House', func: 'house', x: 2024, y: 2008, w: 3, h: 3, color: '#6a6a8a' },
  // ---- Bottom band ----
  { id: 'house8', name: 'House', func: 'house', x: 1978, y: 2018, w: 3, h: 3, color: '#7a8a5a' },
  { id: 'foodshop', name: 'Food Shop', func: 'foodshop', x: 1986, y: 2018, w: 4, h: 4, color: '#c08a4a' },
  { id: 'playerhouse', name: 'Player Residence', func: 'home', x: 2006, y: 2018, w: 4, h: 3, color: '#7a6a4a' },
  // ---- Center well (off the roads) ----
  { id: 'well', name: 'Village Well', func: 'well', x: 1994, y: 1998, w: 2, h: 2, color: '#6a6a5a' },

  // ---- New civic buildings (v5.5) ----
  // three watchtowers guarding the town's approaches
  { id: 'watchtower_n', name: 'North Watchtower', func: 'watchtower', x: 2000, y: 1968, w: 3, h: 3, color: '#7a6a50' },
  { id: 'watchtower_w', name: 'West Watchtower', func: 'watchtower', x: 1968, y: 1996, w: 3, h: 3, color: '#7a6a50' },
  { id: 'watchtower_e', name: 'East Watchtower', func: 'watchtower', x: 2032, y: 1996, w: 3, h: 3, color: '#7a6a50' },
  // school + playground for the village children
  { id: 'school', name: 'Village School', func: 'school', x: 2026, y: 1976, w: 5, h: 4, color: '#5a7a8a' },
  { id: 'playground', name: 'Playground', func: 'playground', x: 1968, y: 2006, w: 6, h: 4, color: '#7a8a4a' },
  // healing center (a larger infirmary than the corner healer)
  { id: 'healing', name: 'Healing Center', func: 'healing', x: 2028, y: 2004, w: 5, h: 4, color: '#4a8a6a' },
  // the temple of the forest god, with a Shiva Lingam inside
  { id: 'temple', name: 'Temple of the Forest God', func: 'temple', x: 2028, y: 2012, w: 5, h: 5, color: '#d0903a' },
  // adventure gear shop (armor, potions, safety gear)
  { id: 'gearshop', name: 'Adventure Gear Shop', func: 'gearshop', x: 1998, y: 2022, w: 4, h: 4, color: '#8a5a3a' }
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
  house: 'Residential House',
  watchtower: 'Watchtower — keep watch over the roads',
  school: 'School — where the children learn',
  playground: 'Playground — the village children play here',
  healing: 'Healing Center — treat wounds & buy medicine',
  temple: 'Temple — pray to the forest god',
  gearshop: 'Adventure Gear Shop — armor, potions & safety gear'
};
