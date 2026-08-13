// Material / food / consumable / tool items.
// category: material | food | consumable | tool | quest
// rarity: common | uncommon | rare | epic | legendary
export const ITEMS = [
  // ---- Food ----
  { id: 'meat_raw', name: 'Raw Meat', category: 'food', rarity: 'common', weight: 1.2, value: 8, guildValue: 2, desc: 'Fresh game meat. Cook it before eating.', hunger: 8, heal: -4, tags: ['cookable'] },
  { id: 'meat_cooked', name: 'Cooked Meat', category: 'food', rarity: 'common', weight: 1.0, value: 16, guildValue: 3, desc: 'Roasted over a fire. Restores hunger.', hunger: 30, heal: 12, tags: ['food'] },
  { id: 'rabbit_meat', name: 'Rabbit Meat', category: 'food', rarity: 'common', weight: 0.6, value: 6, guildValue: 2, desc: 'Tender rabbit meat.', hunger: 12, heal: 2, tags: ['cookable'] },
  { id: 'berries', name: 'Wild Berries', category: 'food', rarity: 'common', weight: 0.2, value: 4, guildValue: 1, desc: 'Sweet forest berries.', hunger: 8, heal: 2, tags: ['food'] },
  { id: 'mushroom', name: 'Mushroom', category: 'food', rarity: 'common', weight: 0.2, value: 5, guildValue: 2, desc: 'An edible forest mushroom.', hunger: 6, heal: 2, tags: ['food', 'cookable'] },
  { id: 'bread', name: 'Bread Loaf', category: 'food', rarity: 'common', weight: 0.5, value: 8, guildValue: 1, desc: 'Village-baked bread.', hunger: 22, heal: 4, tags: ['food'] },
  { id: 'apple', name: 'Apple', category: 'food', rarity: 'common', weight: 0.2, value: 3, guildValue: 1, desc: 'A crisp apple.', hunger: 7, heal: 2, tags: ['food'] },
  { id: 'fish', name: 'Raw Fish', category: 'food', rarity: 'common', weight: 0.8, value: 7, guildValue: 2, desc: 'Caught from the river.', hunger: 10, heal: -2, tags: ['cookable'] },
  { id: 'cooked_fish', name: 'Cooked Fish', category: 'food', rarity: 'common', weight: 0.7, value: 14, guildValue: 3, desc: 'Flaky cooked fish.', hunger: 26, heal: 10, tags: ['food'] },

  // ---- Materials: animal ----
  { id: 'hide_rabbit', name: 'Rabbit Hide', category: 'material', rarity: 'common', weight: 0.3, value: 5, guildValue: 2, desc: 'Soft rabbit fur.', tags: ['material'] },
  { id: 'hide_deer', name: 'Deer Hide', category: 'material', rarity: 'common', weight: 1.5, value: 22, guildValue: 10, desc: 'Strong deer hide.', tags: ['material'] },
  { id: 'hide_boar', name: 'Boar Hide', category: 'material', rarity: 'uncommon', weight: 2.0, value: 30, guildValue: 14, desc: 'Thick boar hide.', tags: ['material'] },
  { id: 'hide_bear', name: 'Bear Hide', category: 'material', rarity: 'rare', weight: 4.0, value: 90, guildValue: 40, desc: 'Thick bear hide.', tags: ['material'] },
  { id: 'fur_fox', name: 'Fox Fur', category: 'material', rarity: 'uncommon', weight: 0.4, value: 18, guildValue: 8, desc: 'Warm fox fur.', tags: ['material'] },
  { id: 'antler', name: 'Deer Antler', category: 'material', rarity: 'uncommon', weight: 1.0, value: 25, guildValue: 12, desc: 'A branching antler.', tags: ['material'] },
  { id: 'tusk', name: 'Boar Tusk', category: 'material', rarity: 'uncommon', weight: 0.5, value: 28, guildValue: 13, desc: 'A sharp boar tusk.', tags: ['material'] },
  { id: 'bone', name: 'Bone', category: 'material', rarity: 'common', weight: 0.5, value: 6, guildValue: 3, desc: 'A sturdy bone.', tags: ['material'] },
  { id: 'claw_bear', name: 'Bear Claw', category: 'material', rarity: 'rare', weight: 0.3, value: 85, guildValue: 40, desc: 'A massive bear claw.', tags: ['material'] },
  { id: 'fang_wolf', name: 'Wolf Fang', category: 'material', rarity: 'uncommon', weight: 0.2, value: 30, guildValue: 15, desc: 'A wolf fang.', tags: ['material'] },
  { id: 'feather', name: 'Bird Feather', category: 'material', rarity: 'common', weight: 0.05, value: 2, guildValue: 1, desc: 'A colorful feather.', tags: ['material'] },

  // ---- Materials: monster ----
  { id: 'slime_core', name: 'Slime Core', category: 'material', rarity: 'common', weight: 0.3, value: 8, guildValue: 4, desc: 'A gelatinous core.', tags: ['material'] },
  { id: 'goblin_ear', name: 'Goblin Ear', category: 'material', rarity: 'common', weight: 0.1, value: 6, guildValue: 5, desc: 'Proof of a slain goblin.', tags: ['material'] },
  { id: 'spider_silk', name: 'Spider Silk', category: 'material', rarity: 'uncommon', weight: 0.1, value: 35, guildValue: 16, desc: 'Tough, sticky silk.', tags: ['material'] },
  { id: 'poison_gland', name: 'Poison Gland', category: 'material', rarity: 'rare', weight: 0.2, value: 60, guildValue: 28, desc: 'A venom sac.', tags: ['material'] },
  { id: 'monster_hide', name: 'Monster Hide', category: 'material', rarity: 'uncommon', weight: 2.0, value: 40, guildValue: 18, desc: 'Tough monster hide.', tags: ['material'] },
  { id: 'monster_bone', name: 'Monster Bone', category: 'material', rarity: 'uncommon', weight: 1.2, value: 30, guildValue: 14, desc: 'Hardened monster bone.', tags: ['material'] },
  { id: 'magic_core', name: 'Magic Core', category: 'material', rarity: 'epic', weight: 0.5, value: 300, guildValue: 150, desc: 'A glowing magical core.', tags: ['material'] },
  { id: 'treant_bark', name: 'Ancient Bark', category: 'material', rarity: 'rare', weight: 3.0, value: 120, guildValue: 55, desc: 'Bark of a forest treant.', tags: ['material'] },

  // ---- Materials: forest ----
  { id: 'wood', name: 'Wood', category: 'material', rarity: 'common', weight: 1.5, value: 4, guildValue: 1, desc: 'Basic firewood and lumber.', tags: ['material'] },
  { id: 'rare_wood', name: 'Rare Wood', category: 'material', rarity: 'uncommon', weight: 2.0, value: 25, guildValue: 11, desc: 'Dark, dense wood.', tags: ['material'] },
  { id: 'herb', name: 'Healing Herb', category: 'material', rarity: 'common', weight: 0.1, value: 10, guildValue: 4, desc: 'A medicinal herb.', tags: ['material'] },
  { id: 'rare_herb', name: 'Rare Herb', category: 'material', rarity: 'rare', weight: 0.1, value: 60, guildValue: 30, desc: 'A potent rare herb.', tags: ['material'] },
  { id: 'flower', name: 'Wild Flower', category: 'material', rarity: 'common', weight: 0.05, value: 3, guildValue: 1, desc: 'A pretty flower.', tags: ['material'] },
  { id: 'seed', name: 'Seeds', category: 'material', rarity: 'common', weight: 0.05, value: 2, guildValue: 1, desc: 'Plantable seeds.', tags: ['material'] },

  // ---- Materials: mining ----
  { id: 'stone', name: 'Stone', category: 'material', rarity: 'common', weight: 2.0, value: 5, guildValue: 2, desc: 'A chunk of stone.', tags: ['material'] },
  { id: 'iron_ore', name: 'Iron Ore', category: 'material', rarity: 'uncommon', weight: 2.5, value: 20, guildValue: 9, desc: 'Raw iron ore.', tags: ['material'] },
  { id: 'copper_ore', name: 'Copper Ore', category: 'material', rarity: 'common', weight: 2.0, value: 12, guildValue: 6, desc: 'Raw copper ore.', tags: ['material'] },
  { id: 'silver_ore', name: 'Silver Ore', category: 'material', rarity: 'rare', weight: 2.5, value: 70, guildValue: 32, desc: 'Raw silver ore.', tags: ['material'] },
  { id: 'gold_ore', name: 'Gold Ore', category: 'material', rarity: 'epic', weight: 3.0, value: 200, guildValue: 90, desc: 'Raw gold ore.', tags: ['material'] },
  { id: 'crystal', name: 'Crystal', category: 'material', rarity: 'rare', weight: 1.0, value: 120, guildValue: 55, desc: 'A sparkling crystal.', tags: ['material'] },

  // ---- Consumables ----
  { id: 'potion_small', name: 'Healing Potion', category: 'consumable', rarity: 'common', weight: 0.4, value: 40, guildValue: 8, desc: 'Restores 40 health.', heal: 40, hunger: 0, tags: ['potion'] },
  { id: 'potion_big', name: 'Greater Potion', category: 'consumable', rarity: 'uncommon', weight: 0.5, value: 120, guildValue: 20, desc: 'Restores 100 health.', heal: 100, hunger: 0, tags: ['potion'] },
  { id: 'bandage', name: 'Bandage', category: 'consumable', rarity: 'common', weight: 0.2, value: 15, guildValue: 4, desc: 'Stops bleeding. Restores 20 health.', heal: 20, hunger: 0, tags: ['potion'] },
  // Restorative orbs (drop from monsters and trees)
  { id: 'health_orb', name: 'Health Orb', category: 'consumable', rarity: 'uncommon', weight: 0.3, value: 30, guildValue: 10, desc: 'Restores 50 health.', heal: 50, tags: ['orb'] },
  { id: 'stamina_orb', name: 'Stamina Orb', category: 'consumable', rarity: 'uncommon', weight: 0.3, value: 30, guildValue: 10, desc: 'Restores 50 stamina.', stamina: 50, tags: ['orb'] },
  { id: 'mana_orb', name: 'Mana Orb', category: 'consumable', rarity: 'uncommon', weight: 0.3, value: 30, guildValue: 10, desc: 'Restores 50 MP.', mp: 50, tags: ['orb'] },
  // Hidden "hold full" charms (rare drops — keep a resource FULL for a while)
  { id: 'holy_health', name: 'Vitality Charm', category: 'consumable', rarity: 'epic', weight: 0.2, value: 200, guildValue: 60, desc: 'Keeps your health FULL for 2 minutes.', holdHealth: 120, tags: ['charm'] },
  { id: 'holy_stamina', name: 'Endurance Charm', category: 'consumable', rarity: 'epic', weight: 0.2, value: 200, guildValue: 60, desc: 'Keeps your stamina FULL for 4 minutes.', holdStamina: 240, tags: ['charm'] },
  { id: 'holy_mana', name: 'Focus Charm', category: 'consumable', rarity: 'epic', weight: 0.2, value: 200, guildValue: 60, desc: 'Keeps your MP FULL for 3 minutes.', holdMana: 180, tags: ['charm'] },

  // ---- Tools / ammo ----
  { id: 'arrow', name: 'Arrow', category: 'tool', rarity: 'common', weight: 0.1, value: 3, guildValue: 1, desc: 'A fletched arrow.', tags: ['ammo'] },
  { id: 'trap', name: 'Snare Trap', category: 'tool', rarity: 'common', weight: 1.0, value: 25, guildValue: 6, desc: 'Place to catch small game.', tags: ['trap'] },
  { id: 'bear_trap', name: 'Bear Trap', category: 'tool', rarity: 'uncommon', weight: 3.0, value: 90, guildValue: 20, desc: 'A spring trap that wounds and holds large game.', tags: ['trap'] },
  { id: 'knife', name: 'Hunting Knife', category: 'tool', rarity: 'common', weight: 0.5, value: 30, guildValue: 6, desc: 'For skinning and harvesting.', tags: ['tool'] },
  { id: 'backpack', name: 'Backpack Upgrade', category: 'tool', rarity: 'uncommon', weight: 1.0, value: 150, guildValue: 30, desc: 'Expands carry capacity.', tags: ['tool'] }
];
