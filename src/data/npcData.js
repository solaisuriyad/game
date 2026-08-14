// NPC generation tables (data-driven — no individual NPC hardcoded).
// Occupations define where an NPC works and roughly when.
export const OCCUPATIONS = [
  { id: 'hunter', label: 'Hunter', work: 'lodge', outdoor: true, skills: { hunting: 3 }, wealth: [20, 80], schedule: 'hunter' },
  { id: 'farmer', label: 'Farmer', work: 'farm', outdoor: true, skills: { gathering: 2 }, wealth: [10, 50], schedule: 'farmer' },
  { id: 'blacksmith', label: 'Blacksmith', work: 'blacksmith', skills: { crafting: 3 }, wealth: [40, 120], schedule: 'worker' },
  { id: 'merchant', label: 'Merchant', work: 'market', skills: { crafting: 1 }, wealth: [50, 200], schedule: 'worker' },
  { id: 'shopkeeper', label: 'Shopkeeper', work: 'general', skills: {}, wealth: [40, 150], schedule: 'worker' },
  { id: 'guard', label: 'Guard', work: 'guardpost', skills: { combat: 3 }, wealth: [20, 60], schedule: 'worker' },
  { id: 'carpenter', label: 'Carpenter', work: 'carpenter', skills: { crafting: 2 }, wealth: [30, 100], schedule: 'worker' },
  { id: 'tailor', label: 'Tailor', work: 'tailor', skills: { crafting: 2 }, wealth: [30, 100], schedule: 'worker' },
  { id: 'fisherman', label: 'Fisherman', work: 'river', outdoor: true, skills: { hunting: 1 }, wealth: [10, 50], schedule: 'hunter' },
  { id: 'cook', label: 'Cook', work: 'foodshop', skills: { crafting: 2 }, wealth: [20, 70], schedule: 'worker' },
  { id: 'healer', label: 'Healer', work: 'healer', skills: { crafting: 2 }, wealth: [30, 90], schedule: 'worker' },
  { id: 'herbalist', label: 'Herbalist', work: 'healer', outdoor: true, skills: { gathering: 3 }, wealth: [20, 80], schedule: 'forager' },
  { id: 'miner', label: 'Miner', work: 'mine', outdoor: true, skills: { gathering: 2 }, wealth: [15, 70], schedule: 'forager' },
  { id: 'woodcutter', label: 'Woodcutter', work: 'forest', outdoor: true, skills: { gathering: 2 }, wealth: [15, 60], schedule: 'forager' },
  { id: 'stablehand', label: 'Stable Hand', work: 'stable', skills: {}, wealth: [10, 40], schedule: 'worker' },
  { id: 'teacher', label: 'Teacher', work: 'community', skills: { crafting: 1 }, wealth: [25, 70], schedule: 'worker' },
  { id: 'child', label: 'Child', work: 'community', outdoor: true, skills: {}, wealth: [0, 5], schedule: 'child' },
  { id: 'elder', label: 'Elder', work: 'community', skills: {}, wealth: [10, 60], schedule: 'elder' },
  { id: 'tavernkeep', label: 'Tavern Keeper', work: 'tavern', skills: {}, wealth: [40, 130], schedule: 'worker' },
  { id: 'guildclerk', label: 'Guild Clerk', work: 'guild', skills: {}, wealth: [30, 80], schedule: 'worker' },
  { id: 'adventurer', label: 'Adventurer', work: 'guild', outdoor: true, skills: { combat: 2, hunting: 2 }, wealth: [30, 150], schedule: 'hunter' },
  { id: 'traveler', label: 'Traveler', work: 'inn', outdoor: true, skills: {}, wealth: [10, 100], schedule: 'elder' },
  { id: 'craftsman', label: 'Craftsman', work: 'crafting', skills: { crafting: 2 }, wealth: [25, 90], schedule: 'worker' },
  { id: 'homemaker', label: 'Villager', work: 'house', skills: {}, wealth: [10, 60], schedule: 'homemaker' },
  { id: 'laborer', label: 'Laborer', work: 'community', outdoor: true, skills: {}, wealth: [5, 40], schedule: 'worker' },
  { id: 'innkeep', label: 'Inn Keeper', work: 'inn', skills: {}, wealth: [40, 120], schedule: 'worker' },
  { id: 'nurse', label: 'Nurse', work: 'healing', skills: { crafting: 2 }, wealth: [30, 90], schedule: 'worker' },
  { id: 'gearmerchant', label: 'Gear Merchant', work: 'gearshop', skills: {}, wealth: [50, 160], schedule: 'worker' }
];

export const PERSONALITIES = [
  'cheerful', 'gruff', 'shy', 'proud', 'kind', 'curious', 'stoic', 'gossipy',
  'ambitious', 'laid-back', 'suspicious', 'generous'
];

export const HAIR_COLORS = ['#000000', '#2a2018', '#4a3624', '#7a5a30', '#a0722f', '#b8863c', '#c8a06a', '#d8c8b0', '#5a5a5a', '#7a3030', '#a04040'];
export const SKIN_TONES = ['#f0d5b0', '#e8c39a', '#d9ab7f', '#c68e63', '#a9704a', '#8a5636', '#6b4028'];
export const CLOTH_COLORS = ['#7a6a4a', '#5a6a5a', '#6a5a6a', '#8a5a3a', '#4a5a6a', '#8a7a5a', '#6a7a7a', '#7a4a4a', '#5a6a7a', '#9a8a5a'];

export const GIFT_PREFS = {
  // occupation-based likes
  hunter: ['meat_raw', 'arrow', 'fang_wolf'],
  farmer: ['seed', 'apple', 'bread'],
  blacksmith: ['iron_ore', 'copper_ore', 'stone'],
  healer: ['herb', 'rare_herb', 'flower'],
  herbalist: ['herb', 'mushroom', 'flower'],
  child: ['apple', 'berries', 'flower'],
  elder: ['bread', 'flower', 'fish'],
  merchant: ['gold_ore', 'silver_ore', 'crystal'],
  guard: ['meat_cooked', 'sword_iron', 'iron_ore'],
  tavernkeep: ['fish', 'meat_raw', 'berries']
};
