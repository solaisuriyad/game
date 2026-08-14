// Monsters. Each has an aiProfile (aggression, pack, nocturnal, territorial,
// ambush, adaptive) and an abilities[] list referencing abilities.js.
export const MONSTERS = [
  {
    id: 'slime', name: 'Slime', family: 'slime', zones: [1], level: 1, hp: 25, damage: 6, defense: 0,
    speed: 40, size: 14, xp: 12, color: '#7fc97f',
    aiProfile: { aggression: 0.7, pack: false, nocturnal: false, territorial: false, ambush: false, adaptive: false, courage: 0.4 },
    abilities: [
      { id: 'melee_basic', params: { damage: 1.0, cooldown: 1.4, range: 34, knockback: 60 } },
      { id: 'lunge', params: { damage: 1.3, cooldown: 4.0, range: 130, speed: 200 } }
    ],
    loot: [
      { item: 'slime_core', chance: 0.9, min: 1, max: 2 },
      { item: 'herb', chance: 0.3, min: 1, max: 1 }
    ]
  },
  {
    id: 'goblin', name: 'Goblin', family: 'goblin', zones: [1, 2], level: 3, hp: 45, damage: 11, defense: 1,
    speed: 85, size: 15, xp: 28, color: '#7aa04a',
    aiProfile: { aggression: 0.85, pack: true, nocturnal: false, territorial: false, ambush: true, adaptive: true, courage: 0.5 },
    abilities: [
      { id: 'melee_basic', params: { damage: 1.0, cooldown: 1.2, range: 38, knockback: 80 } },
      { id: 'throw_rock', params: { damage: 1.2, cooldown: 3.5, range: 200, speed: 260 } }
    ],
    loot: [
      { item: 'goblin_ear', chance: 0.9, min: 1, max: 1 },
      { item: 'bone', chance: 0.4, min: 1, max: 1 },
      { item: 'copper_ore', chance: 0.25, min: 1, max: 1 }
    ]
  },
  {
    id: 'wolf', name: 'Wolf', family: 'wolf', zones: [2], level: 5, hp: 70, damage: 15, defense: 1,
    speed: 135, size: 17, xp: 45, color: '#9a9a9a',
    aiProfile: { aggression: 0.8, pack: true, nocturnal: true, territorial: true, ambush: false, adaptive: true, courage: 0.7 },
    abilities: [
      { id: 'melee_basic', params: { damage: 1.0, cooldown: 1.1, range: 40, knockback: 70 } },
      { id: 'pounce', params: { damage: 1.5, cooldown: 5.0, range: 170, speed: 320 } },
      { id: 'bleeding_bite', params: { damage: 1.1, cooldown: 6.0, range: 40, bleed: true } },
      { id: 'howl', params: { cooldown: 10.0, range: 320 } }
    ],
    loot: [
      { item: 'fang_wolf', chance: 0.8, min: 1, max: 2 },
      { item: 'monster_hide', chance: 0.7, min: 1, max: 1 },
      { item: 'meat_raw', chance: 0.6, min: 1, max: 2 }
    ]
  },
  {
    id: 'spider', name: 'Giant Spider', family: 'spider', zones: [2, 3], level: 7, hp: 95, damage: 18, defense: 2,
    speed: 110, size: 20, xp: 80, color: '#5a3a5a',
    aiProfile: { aggression: 0.9, pack: false, nocturnal: true, territorial: true, ambush: true, adaptive: false, courage: 0.7 },
    abilities: [
      { id: 'melee_basic', params: { damage: 1.0, cooldown: 1.3, range: 42, knockback: 60, poison: 0.4 } },
      { id: 'web_shot', params: { damage: 0.6, cooldown: 4.0, range: 240, speed: 220 } }
    ],
    loot: [
      { item: 'spider_silk', chance: 0.8, min: 1, max: 2 },
      { item: 'poison_gland', chance: 0.5, min: 1, max: 1 },
      { item: 'monster_hide', chance: 0.4, min: 1, max: 1 }
    ]
  },
  {
    id: 'treant', name: 'Forest Treant', family: 'treant', zones: [3], level: 10, hp: 200, damage: 24, defense: 4,
    speed: 45, size: 26, xp: 160, color: '#5a7a4a',
    aiProfile: { aggression: 0.6, pack: false, nocturnal: false, territorial: true, ambush: false, adaptive: false, courage: 0.9 },
    abilities: [
      { id: 'melee_basic', params: { damage: 1.0, cooldown: 1.8, range: 60, knockback: 140 } },
      { id: 'root_slam', params: { damage: 1.4, cooldown: 6.0, range: 130, radius: 90 } },
      { id: 'regenerate', params: { heal: 40, cooldown: 12.0, range: 0 } }
    ],
    loot: [
      { item: 'treant_bark', chance: 0.9, min: 1, max: 2 },
      { item: 'rare_wood', chance: 0.8, min: 1, max: 3 },
      { item: 'magic_core', chance: 0.25, min: 1, max: 1 }
    ]
  },
  {
    id: 'skeleton', name: 'Skeleton', family: 'undead', zones: [3], level: 8, hp: 85, damage: 20, defense: 2,
    speed: 95, size: 15, xp: 90, color: '#d8d0c0',
    aiProfile: { aggression: 0.9, pack: false, nocturnal: true, territorial: false, ambush: false, adaptive: false, courage: 1.0 },
    abilities: [
      { id: 'melee_basic', params: { damage: 1.0, cooldown: 1.2, range: 40, knockback: 70 } },
      { id: 'throw_rock', params: { damage: 1.2, cooldown: 3.0, range: 220, speed: 280 } }
    ],
    loot: [
      { item: 'monster_bone', chance: 0.9, min: 1, max: 2 },
      { item: 'bone', chance: 0.8, min: 1, max: 2 }
    ]
  },
  {
    id: 'swamp_beast', name: 'Swamp Beast', family: 'swamp', zones: [3], level: 9, hp: 130, damage: 22, defense: 3,
    speed: 70, size: 22, xp: 130, color: '#4a5a3a',
    aiProfile: { aggression: 0.8, pack: false, nocturnal: false, territorial: true, ambush: true, adaptive: false, courage: 0.8 },
    abilities: [
      { id: 'melee_basic', params: { damage: 1.0, cooldown: 1.4, range: 46, knockback: 90, poison: 0.5 } },
      { id: 'lunge', params: { damage: 1.3, cooldown: 4.5, range: 150, speed: 220 } }
    ],
    loot: [
      { item: 'monster_hide', chance: 0.8, min: 1, max: 2 },
      { item: 'poison_gland', chance: 0.6, min: 1, max: 1 }
    ]
  },
  {
    id: 'demon_beast', name: 'Demon Beast', family: 'beast', zones: [3], level: 12, hp: 180, damage: 28, defense: 3,
    speed: 120, size: 24, xp: 220, color: '#7a2a2a',
    aiProfile: { aggression: 0.95, pack: false, nocturnal: true, territorial: true, ambush: false, adaptive: true, courage: 0.9 },
    abilities: [
      { id: 'melee_basic', params: { damage: 1.0, cooldown: 1.2, range: 46, knockback: 90 } },
      { id: 'charge', params: { damage: 1.5, cooldown: 5.0, range: 240, speed: 420 } },
      { id: 'fire_breath', params: { damage: 1.1, cooldown: 7.0, range: 200, speed: 260 } }
    ],
    loot: [
      { item: 'monster_hide', chance: 0.9, min: 1, max: 2 },
      { item: 'magic_core', chance: 0.35, min: 1, max: 1 },
      { item: 'monster_bone', chance: 0.7, min: 1, max: 2 }
    ]
  },
  {
    id: 'ancient_beast', name: 'Ancient Beast', family: 'ancient', zones: [4], level: 14, hp: 260, damage: 32, defense: 5,
    speed: 90, size: 28, xp: 320, color: '#3a4a6a',
    aiProfile: { aggression: 0.85, pack: false, nocturnal: false, territorial: true, ambush: false, adaptive: false, courage: 1.0 },
    abilities: [
      { id: 'melee_basic', params: { damage: 1.0, cooldown: 1.5, range: 56, knockback: 120 } },
      { id: 'tail_swipe', params: { damage: 1.2, cooldown: 5.0, range: 90, radius: 90 } },
      { id: 'ground_slam', params: { damage: 1.5, cooldown: 8.0, range: 120, radius: 110 } }
    ],
    loot: [
      { item: 'monster_hide', chance: 1.0, min: 2, max: 3 },
      { item: 'magic_core', chance: 0.5, min: 1, max: 1 },
      { item: 'crystal', chance: 0.4, min: 1, max: 1 }
    ]
  },
  {
    id: 'dire_wolf', name: 'Dire Wolf', family: 'wolf', zones: [2], level: 7, hp: 130, damage: 20, defense: 2,
    speed: 145, size: 19, xp: 95, color: '#4a4a5a',
    aiProfile: { aggression: 0.9, pack: true, nocturnal: true, territorial: true, ambush: false, adaptive: true, courage: 0.8 },
    abilities: [
      { id: 'melee_basic', params: { damage: 1.0, cooldown: 1.0, range: 44, knockback: 90 } },
      { id: 'pounce', params: { damage: 1.5, cooldown: 5.0, range: 200, speed: 340 } },
      { id: 'bleeding_bite', params: { damage: 1.1, cooldown: 6.0, range: 44, bleed: true } },
      { id: 'howl', params: { cooldown: 10.0, range: 340 } }
    ],
    loot: [
      { item: 'fang_wolf', chance: 0.85, min: 1, max: 2 },
      { item: 'monster_hide', chance: 0.8, min: 1, max: 2 }
    ]
  },
  {
    id: 'goblin_shaman', name: 'Goblin Shaman', family: 'goblin', zones: [2], level: 8, hp: 90, damage: 18, defense: 1,
    speed: 75, size: 15, xp: 120, color: '#6a5aa0',
    aiProfile: { aggression: 0.85, pack: true, nocturnal: false, territorial: false, ambush: false, adaptive: false, courage: 0.6 },
    abilities: [
      { id: 'melee_basic', params: { damage: 0.8, cooldown: 1.4, range: 38, knockback: 60 } },
      { id: 'fire_breath', params: { damage: 1.3, cooldown: 5.0, range: 220, speed: 280 } },
      { id: 'summon', params: { summonId: 'goblin', count: 1, cooldown: 14.0, range: 0 } }
    ],
    loot: [
      { item: 'goblin_ear', chance: 0.9, min: 1, max: 1 },
      { item: 'magic_core', chance: 0.3, min: 1, max: 1 },
      { item: 'herb', chance: 0.4, min: 1, max: 2 }
    ]
  },
  {
    id: 'goblin_brute', name: 'Goblin Brute', family: 'goblin', zones: [3], level: 9, hp: 180, damage: 26, defense: 3,
    speed: 60, size: 21, xp: 150, color: '#5a7a3a',
    aiProfile: { aggression: 0.95, pack: true, nocturnal: false, territorial: false, ambush: false, adaptive: false, courage: 0.85 },
    abilities: [
      { id: 'melee_basic', params: { damage: 1.0, cooldown: 1.5, range: 50, knockback: 120 } },
      { id: 'ground_slam', params: { damage: 1.4, cooldown: 7.0, range: 100, radius: 100 } },
      { id: 'roar', params: { damage: 0.3, cooldown: 9.0, range: 140 } }
    ],
    loot: [
      { item: 'goblin_ear', chance: 0.9, min: 1, max: 2 },
      { item: 'monster_bone', chance: 0.7, min: 1, max: 2 },
      { item: 'iron_ore', chance: 0.4, min: 1, max: 1 }
    ]
  },
  {
    id: 'thorn_beast', name: 'Thorn Beast', family: 'treant', zones: [2, 3], level: 10, hp: 210, damage: 22, defense: 4,
    speed: 55, size: 24, xp: 170, color: '#4a7a30',
    aiProfile: { aggression: 0.8, pack: false, nocturnal: false, territorial: true, ambush: true, adaptive: false, courage: 0.9 },
    abilities: [
      { id: 'melee_basic', params: { damage: 1.0, cooldown: 1.6, range: 58, knockback: 110 } },
      { id: 'root_slam', params: { damage: 1.3, cooldown: 6.0, range: 120, radius: 100 } },
      { id: 'regenerate', params: { heal: 45, cooldown: 12.0, range: 0 } }
    ],
    loot: [
      { item: 'treant_bark', chance: 0.8, min: 1, max: 2 },
      { item: 'rare_wood', chance: 0.7, min: 1, max: 2 },
      { item: 'spider_silk', chance: 0.4, min: 1, max: 1 }
    ]
  },
  {
    id: 'shadow_stalker', name: 'Shadow Stalker', family: 'wolf', zones: [3], level: 11, hp: 150, damage: 24, defense: 2,
    speed: 165, size: 17, xp: 190, color: '#2a2a38',
    aiProfile: { aggression: 0.95, pack: false, nocturnal: true, territorial: true, ambush: true, adaptive: true, courage: 0.9 },
    abilities: [
      { id: 'melee_basic', params: { damage: 1.0, cooldown: 0.9, range: 40, knockback: 70 } },
      { id: 'lunge', params: { damage: 1.4, cooldown: 4.0, range: 200, speed: 380 } },
      { id: 'bleeding_bite', params: { damage: 1.1, cooldown: 5.0, range: 40, bleed: true } }
    ],
    loot: [
      { item: 'monster_hide', chance: 0.8, min: 1, max: 2 },
      { item: 'fang_wolf', chance: 0.7, min: 1, max: 1 },
      { item: 'magic_core', chance: 0.25, min: 1, max: 1 }
    ]
  },
  {
    id: 'cave_troll', name: 'Cave Troll', family: 'goblin', zones: [3], level: 12, hp: 320, damage: 32, defense: 5,
    speed: 50, size: 28, xp: 260, color: '#6a5a4a',
    aiProfile: { aggression: 0.9, pack: false, nocturnal: true, territorial: true, ambush: false, adaptive: false, courage: 0.95 },
    abilities: [
      { id: 'melee_basic', params: { damage: 1.0, cooldown: 1.7, range: 64, knockback: 150 } },
      { id: 'ground_slam', params: { damage: 1.5, cooldown: 7.0, range: 110, radius: 120 } },
      { id: 'roar', params: { damage: 0.4, cooldown: 9.0, range: 160 } }
    ],
    loot: [
      { item: 'monster_hide', chance: 0.9, min: 1, max: 3 },
      { item: 'monster_bone', chance: 0.8, min: 2, max: 3 },
      { item: 'stone', chance: 0.6, min: 2, max: 4 }
    ]
  },
  {
    id: 'venom_wyrm', name: 'Venom Wyrm', family: 'beast', zones: [3], level: 11, hp: 170, damage: 26, defense: 2,
    speed: 110, size: 20, xp: 200, color: '#4a8a40',
    aiProfile: { aggression: 0.9, pack: false, nocturnal: false, territorial: true, ambush: true, adaptive: false, courage: 0.8 },
    abilities: [
      { id: 'melee_basic', params: { damage: 1.0, cooldown: 1.3, range: 44, knockback: 70, poison: 0.6 } },
      { id: 'web_shot', params: { damage: 0.7, cooldown: 4.0, range: 240, speed: 240 } },
      { id: 'lunge', params: { damage: 1.3, cooldown: 5.0, range: 160, speed: 260 } }
    ],
    loot: [
      { item: 'poison_gland', chance: 0.8, min: 1, max: 2 },
      { item: 'monster_hide', chance: 0.7, min: 1, max: 2 },
      { item: 'rare_herb', chance: 0.3, min: 1, max: 1 }
    ]
  },
  {
    id: 'hell_hound', name: 'Hell Hound', family: 'wolf', zones: [3], level: 13, hp: 240, damage: 30, defense: 3,
    speed: 150, size: 22, xp: 280, color: '#8a2a20',
    aiProfile: { aggression: 0.95, pack: true, nocturnal: true, territorial: true, ambush: false, adaptive: true, courage: 0.9 },
    abilities: [
      { id: 'melee_basic', params: { damage: 1.0, cooldown: 1.0, range: 46, knockback: 90 } },
      { id: 'charge', params: { damage: 1.4, cooldown: 5.0, range: 240, speed: 420 } },
      { id: 'fire_breath', params: { damage: 1.2, cooldown: 6.0, range: 200, speed: 300 } }
    ],
    loot: [
      { item: 'monster_hide', chance: 0.85, min: 1, max: 2 },
      { item: 'fang_wolf', chance: 0.7, min: 1, max: 2 },
      { item: 'magic_core', chance: 0.3, min: 1, max: 1 }
    ]
  },
  {
    id: 'yggdrasil_spriggan', name: 'Yggdrasil Spriggan', family: 'treant', zones: [3], level: 14, hp: 260, damage: 30, defense: 5,
    speed: 65, size: 26, xp: 340, color: '#3ac060',
    aiProfile: { aggression: 0.9, pack: false, nocturnal: false, territorial: true, ambush: false, adaptive: false, courage: 1.0 },
    abilities: [
      { id: 'melee_basic', params: { damage: 1.0, cooldown: 1.5, range: 60, knockback: 120 } },
      { id: 'root_slam', params: { damage: 1.4, cooldown: 6.0, range: 130, radius: 110 } },
      { id: 'summon', params: { summonId: 'thorn_beast', count: 1, cooldown: 13.0, range: 0 } },
      { id: 'regenerate', params: { heal: 55, cooldown: 11.0, range: 0 } }
    ],
    loot: [
      { item: 'treant_bark', chance: 0.9, min: 1, max: 2 },
      { item: 'magic_core', chance: 0.4, min: 1, max: 1 },
      { item: 'rare_wood', chance: 0.7, min: 1, max: 2 }
    ]
  },
  {
    id: 'fire_dragon', name: 'Fire Dragon', family: 'dragon', zones: [4], level: 28, hp: 1200, damage: 40, defense: 6,
    speed: 110, size: 30, xp: 1200, color: '#ff5a30', rank: 'S', flying: true, mp: 260,
    aiProfile: { aggression: 1.0, pack: false, nocturnal: false, territorial: true, ambush: false, adaptive: true, courage: 1.0 },
    abilities: [
      { id: 'melee_basic', params: { damage: 1.0, cooldown: 1.0, range: 60, knockback: 130 } },
      { id: 'fire_breath', params: { damage: 1.4, cooldown: 5.0, range: 280, speed: 320 } },
      { id: 'fire_ball', params: { damage: 1.3, cooldown: 4.5, range: 300, speed: 300 } },
      { id: 'thunder_attack', params: { damage: 1.5, cooldown: 9.0, radius: 170 } },
      { id: 'fly', params: { damage: 1.2, cooldown: 6.0, range: 260, speed: 400 } },
      { id: 'tail_swipe', params: { damage: 1.3, cooldown: 6.0, range: 110, radius: 110 } }
    ],
    loot: [
      { item: 'meat_raw', chance: 1.0, min: 3, max: 5 },
      { item: 'dragon_scale', chance: 0.9, min: 1, max: 2 },
      { item: 'dragon_bone', chance: 0.8, min: 1, max: 2 },
      { item: 'dragon_core', chance: 0.5, min: 1, max: 1 }
    ]
  },
  {
    id: 'ice_dragon', name: 'Ice Dragon', family: 'dragon', zones: [4], level: 29, hp: 1250, damage: 38, defense: 7,
    speed: 100, size: 30, xp: 1250, color: '#8ac8ff', rank: 'S', flying: true, mp: 270,
    aiProfile: { aggression: 1.0, pack: false, nocturnal: false, territorial: true, ambush: false, adaptive: true, courage: 1.0 },
    abilities: [
      { id: 'melee_basic', params: { damage: 1.0, cooldown: 1.0, range: 60, knockback: 130 } },
      { id: 'ice_breath', params: { damage: 1.3, cooldown: 5.0, range: 280, speed: 320 } },
      { id: 'air_slash', params: { damage: 1.2, cooldown: 4.5, range: 300, speed: 320 } },
      { id: 'thunder_attack', params: { damage: 1.5, cooldown: 9.0, radius: 170 } },
      { id: 'fly', params: { damage: 1.2, cooldown: 6.0, range: 260, speed: 400 } },
      { id: 'tail_swipe', params: { damage: 1.3, cooldown: 6.0, range: 110, radius: 110 } }
    ],
    loot: [
      { item: 'meat_raw', chance: 1.0, min: 3, max: 5 },
      { item: 'dragon_scale', chance: 0.9, min: 1, max: 2 },
      { item: 'dragon_bone', chance: 0.8, min: 1, max: 2 },
      { item: 'dragon_core', chance: 0.5, min: 1, max: 1 }
    ]
  },
  {
    id: 'earth_dragon', name: 'Earth Dragon', family: 'dragon', zones: [4], level: 30, hp: 1400, damage: 42, defense: 8,
    speed: 90, size: 32, xp: 1350, color: '#9a8a5a', rank: 'S', flying: false, mp: 280,
    aiProfile: { aggression: 1.0, pack: false, nocturnal: false, territorial: true, ambush: false, adaptive: false, courage: 1.0 },
    abilities: [
      { id: 'melee_basic', params: { damage: 1.0, cooldown: 1.1, range: 64, knockback: 140 } },
      { id: 'ground_slam', params: { damage: 1.5, cooldown: 6.0, range: 130, radius: 130 } },
      { id: 'water_slash', params: { damage: 1.2, cooldown: 4.5, range: 280, speed: 300 } },
      { id: 'thunder_attack', params: { damage: 1.5, cooldown: 9.0, radius: 170 } },
      { id: 'tail_swipe', params: { damage: 1.3, cooldown: 6.0, range: 120, radius: 120 } }
    ],
    loot: [
      { item: 'meat_raw', chance: 1.0, min: 3, max: 5 },
      { item: 'dragon_scale', chance: 0.9, min: 1, max: 2 },
      { item: 'dragon_bone', chance: 0.9, min: 1, max: 2 },
      { item: 'dragon_core', chance: 0.55, min: 1, max: 1 }
    ]
  },
  {
    id: 'dragonoid_fire', name: 'Fire Dragonoid', family: 'dragonoid', zones: [5], level: 36, hp: 2600, damage: 55, defense: 10,
    speed: 140, size: 34, xp: 3000, color: '#ff3020', rank: 'A+', boss: true, flying: true, mp: 500,
    aiProfile: { aggression: 1.0, pack: false, nocturnal: false, territorial: true, ambush: false, adaptive: true, courage: 1.0 },
    abilities: [
      { id: 'melee_basic', params: { damage: 1.1, cooldown: 0.9, range: 64, knockback: 150 } },
      { id: 'fire_breath', params: { damage: 1.5, cooldown: 4.0, range: 300, speed: 340 } },
      { id: 'thunder_attack', params: { damage: 1.8, cooldown: 8.0, radius: 190 } },
      { id: 'fly', params: { damage: 1.5, cooldown: 5.0, range: 320, speed: 520 } },
      { id: 'charge', params: { damage: 1.6, cooldown: 6.0, range: 340, speed: 500 } },
      { id: 'summon', params: { summonId: 'fire_dragon', count: 1, cooldown: 16.0, range: 0 } },
      { id: 'rage', params: { heal: 0, cooldown: 14.0, range: 0, buff: 'rage' } }
    ],
    loot: [
      { item: 'meat_raw', chance: 1.0, min: 4, max: 6 },
      { item: 'dragon_core', chance: 1.0, min: 1, max: 2 },
      { item: 'dragonoid_core', chance: 1.0, min: 1, max: 1 }
    ]
  },
  {
    id: 'dragonoid_ice', name: 'Ice Dragonoid', family: 'dragonoid', zones: [5], level: 38, hp: 2800, damage: 53, defense: 11,
    speed: 135, size: 34, xp: 3200, color: '#4080ff', rank: 'A+', boss: true, flying: true, mp: 500,
    aiProfile: { aggression: 1.0, pack: false, nocturnal: false, territorial: true, ambush: false, adaptive: true, courage: 1.0 },
    abilities: [
      { id: 'melee_basic', params: { damage: 1.1, cooldown: 0.9, range: 64, knockback: 150 } },
      { id: 'ice_breath', params: { damage: 1.4, cooldown: 4.0, range: 300, speed: 340 } },
      { id: 'air_slash', params: { damage: 1.4, cooldown: 4.0, range: 320, speed: 340 } },
      { id: 'thunder_attack', params: { damage: 1.8, cooldown: 8.0, radius: 190 } },
      { id: 'fly', params: { damage: 1.5, cooldown: 5.0, range: 320, speed: 520 } },
      { id: 'charge', params: { damage: 1.6, cooldown: 6.0, range: 340, speed: 500 } },
      { id: 'summon', params: { summonId: 'ice_dragon', count: 1, cooldown: 16.0, range: 0 } },
      { id: 'rage', params: { heal: 0, cooldown: 14.0, range: 0, buff: 'rage' } }
    ],
    loot: [
      { item: 'meat_raw', chance: 1.0, min: 4, max: 6 },
      { item: 'dragon_core', chance: 1.0, min: 1, max: 2 },
      { item: 'dragonoid_core', chance: 1.0, min: 1, max: 1 }
    ]
  },
  {
    id: 'dragonoid_earth', name: 'Earth Dragonoid', family: 'dragonoid', zones: [5], level: 40, hp: 3200, damage: 60, defense: 12,
    speed: 120, size: 36, xp: 3600, color: '#c8a060', rank: 'A+', boss: true, flying: true, mp: 500,
    aiProfile: { aggression: 1.0, pack: false, nocturnal: false, territorial: true, ambush: false, adaptive: false, courage: 1.0 },
    abilities: [
      { id: 'melee_basic', params: { damage: 1.1, cooldown: 0.9, range: 66, knockback: 160 } },
      { id: 'ground_slam', params: { damage: 1.7, cooldown: 5.0, range: 140, radius: 150 } },
      { id: 'water_slash', params: { damage: 1.4, cooldown: 4.0, range: 300, speed: 320 } },
      { id: 'thunder_attack', params: { damage: 1.8, cooldown: 8.0, radius: 190 } },
      { id: 'fly', params: { damage: 1.5, cooldown: 5.0, range: 320, speed: 500 } },
      { id: 'charge', params: { damage: 1.6, cooldown: 6.0, range: 340, speed: 480 } },
      { id: 'summon', params: { summonId: 'earth_dragon', count: 1, cooldown: 16.0, range: 0 } },
      { id: 'rage', params: { heal: 0, cooldown: 14.0, range: 0, buff: 'rage' } }
    ],
    loot: [
      { item: 'meat_raw', chance: 1.0, min: 4, max: 6 },
      { item: 'dragon_core', chance: 1.0, min: 1, max: 2 },
      { item: 'dragonoid_core', chance: 1.0, min: 1, max: 1 }
    ]
  },
  {
    id: 'ancient_bear', name: 'Ancient Bear', family: 'boss', zones: [3], level: 15, hp: 800, damage: 30, defense: 5,
    speed: 85, size: 30, xp: 700, color: '#4a3a2a', boss: true,
    aiProfile: { aggression: 0.9, pack: false, nocturnal: false, territorial: true, ambush: false, adaptive: true, courage: 1.0 },
    abilities: [
      { id: 'melee_basic', params: { damage: 1.0, cooldown: 1.1, range: 56, knockback: 110 } },
      { id: 'charge', params: { damage: 1.4, cooldown: 6.0, range: 260, speed: 400 } },
      { id: 'ground_slam', params: { damage: 1.3, cooldown: 7.0, range: 110, radius: 100 } },
      { id: 'roar', params: { damage: 0.3, cooldown: 10.0, range: 160 } },
      { id: 'rage', params: { heal: 0, cooldown: 16.0, range: 0, buff: 'rage' } }
    ],
    phases: [
      { hpPct: 0.7, label: 'Phase 2 — Ground Rage', color: '#5a4030', abilities: [
        { id: 'melee_basic', params: { damage: 1.0, cooldown: 1.0, range: 56, knockback: 110 } },
        { id: 'charge', params: { damage: 1.5, cooldown: 5.0, range: 280, speed: 430 } },
        { id: 'ground_slam', params: { damage: 1.4, cooldown: 6.0, range: 120, radius: 110 } },
        { id: 'roar', params: { damage: 0.4, cooldown: 8.0, range: 180 } },
        { id: 'rage', params: { heal: 0, cooldown: 16.0, range: 0, buff: 'rage' } }
      ] },
      { hpPct: 0.35, label: 'Phase 3 — Enraged', color: '#6a2a2a', abilities: [
        { id: 'melee_basic', params: { damage: 1.2, cooldown: 0.9, range: 56, knockback: 120 } },
        { id: 'charge', params: { damage: 1.6, cooldown: 4.0, range: 300, speed: 460 } },
        { id: 'ground_slam', params: { damage: 1.5, cooldown: 5.0, range: 130, radius: 120 } },
        { id: 'roar', params: { damage: 0.5, cooldown: 7.0, range: 200 } },
        { id: 'rage', params: { heal: 0, cooldown: 12.0, range: 0, buff: 'rage' } }
      ] }
    ],
    loot: [
      { item: 'hide_bear', chance: 1.0, min: 2, max: 4 },
      { item: 'claw_bear', chance: 1.0, min: 2, max: 4 },
      { item: 'magic_core', chance: 1.0, min: 1, max: 2 }
    ]
  },
  {
    id: 'forest_guardian', name: 'Forest Guardian', family: 'boss', zones: [4], level: 18, hp: 1500, damage: 34, defense: 7,
    speed: 55, size: 34, xp: 1500, color: '#3a6a3a', boss: true,
    aiProfile: { aggression: 0.9, pack: false, nocturnal: false, territorial: true, ambush: false, adaptive: false, courage: 1.0 },
    abilities: [
      { id: 'melee_basic', params: { damage: 1.0, cooldown: 1.6, range: 66, knockback: 140 } },
      { id: 'root_slam', params: { damage: 1.2, cooldown: 6.0, range: 130, radius: 100 } },
      { id: 'regenerate', params: { heal: 60, cooldown: 14.0, range: 0 } }
    ],
    phases: [
      { hpPct: 0.7, label: 'Phase 2 — The Grove Awakens', color: '#4a7a3a', abilities: [
        { id: 'melee_basic', params: { damage: 1.0, cooldown: 1.5, range: 66, knockback: 140 } },
        { id: 'root_slam', params: { damage: 1.3, cooldown: 5.5, range: 130, radius: 110 } },
        { id: 'summon', params: { summonId: 'spider', count: 2, cooldown: 12.0, range: 0 } },
        { id: 'regenerate', params: { heal: 70, cooldown: 13.0, range: 0 } }
      ] },
      { hpPct: 0.35, label: 'Phase 3 — Wrath of the Forest', color: '#2a5a2a', abilities: [
        { id: 'melee_basic', params: { damage: 1.1, cooldown: 1.4, range: 66, knockback: 150 } },
        { id: 'root_slam', params: { damage: 1.5, cooldown: 4.5, range: 140, radius: 120 } },
        { id: 'summon', params: { summonId: 'treant', count: 2, cooldown: 10.0, range: 0 } },
        { id: 'ground_slam', params: { damage: 1.2, cooldown: 7.0, range: 120, radius: 120 } },
        { id: 'regenerate', params: { heal: 80, cooldown: 12.0, range: 0 } }
      ] }
    ],
    loot: [
      { item: 'treant_bark', chance: 1.0, min: 3, max: 5 },
      { item: 'rare_wood', chance: 1.0, min: 3, max: 5 },
      { item: 'magic_core', chance: 1.0, min: 1, max: 3 }
    ]
  },
  {
    id: 'ancient_dragon', name: 'Ancient Dragon', family: 'boss', zones: [5], level: 24, hp: 3000, damage: 40, defense: 8, rank: 'S',
    speed: 120, size: 40, xp: 4000, color: '#3a3a5a', boss: true,
    aiProfile: { aggression: 1.0, pack: false, nocturnal: false, territorial: true, ambush: false, adaptive: true, courage: 1.0 },
    abilities: [
      { id: 'melee_basic', params: { damage: 1.0, cooldown: 1.0, range: 60, knockback: 120 } },
      { id: 'fire_breath', params: { damage: 1.2, cooldown: 5.0, range: 260, speed: 300 } },
      { id: 'tail_swipe', params: { damage: 1.2, cooldown: 6.0, range: 100, radius: 100 } },
      { id: 'charge', params: { damage: 1.4, cooldown: 8.0, range: 320, speed: 480 } }
    ],
    phases: [
      { hpPct: 0.7, label: 'Phase 2 — Inferno', color: '#5a3a3a', abilities: [
        { id: 'melee_basic', params: { damage: 1.1, cooldown: 0.9, range: 60, knockback: 120 } },
        { id: 'fire_breath', params: { damage: 1.3, cooldown: 4.5, range: 280, speed: 320 } },
        { id: 'ice_breath', params: { damage: 1.0, cooldown: 6.0, range: 260, speed: 300 } },
        { id: 'tail_swipe', params: { damage: 1.3, cooldown: 5.5, range: 110, radius: 110 } },
        { id: 'charge', params: { damage: 1.5, cooldown: 7.0, range: 340, speed: 500 } }
      ] },
      { hpPct: 0.35, label: 'Phase 3 — Apocalypse', color: '#6a2a2a', abilities: [
        { id: 'melee_basic', params: { damage: 1.2, cooldown: 0.8, range: 60, knockback: 130 } },
        { id: 'fire_breath', params: { damage: 1.4, cooldown: 4.0, range: 300, speed: 340 } },
        { id: 'ice_breath', params: { damage: 1.1, cooldown: 5.5, range: 280, speed: 320 } },
        { id: 'tail_swipe', params: { damage: 1.4, cooldown: 5.0, range: 120, radius: 120 } },
        { id: 'charge', params: { damage: 1.6, cooldown: 6.0, range: 360, speed: 520 } },
        { id: 'summon', params: { summonId: 'demon_beast', count: 1, cooldown: 14.0, range: 0 } }
      ] }
    ],
    loot: [
      { item: 'magic_core', chance: 1.0, min: 2, max: 4 },
      { item: 'crystal', chance: 1.0, min: 2, max: 4 },
      { item: 'monster_hide', chance: 1.0, min: 3, max: 5 }
    ]
  },
  {
    id: 'alpha_wolf', name: 'Alpha Wolf', family: 'boss', zones: [2], level: 12, hp: 500, damage: 24, defense: 3,
    speed: 150, size: 24, xp: 400, color: '#3a3a44', boss: true,
    aiProfile: { aggression: 1.0, pack: true, nocturnal: false, territorial: true, ambush: false, adaptive: true, courage: 1.0 },
    abilities: [
      { id: 'melee_basic', params: { damage: 1.0, cooldown: 1.0, range: 46, knockback: 90 } },
      { id: 'pounce', params: { damage: 1.4, cooldown: 4.0, range: 220, speed: 380 } },
      { id: 'bleeding_bite', params: { damage: 1.1, cooldown: 5.0, range: 46, bleed: true } },
      { id: 'howl', params: { cooldown: 12.0, range: 400 } },
      { id: 'rage', params: { heal: 0, cooldown: 20.0, range: 0, buff: 'rage' } }
    ],
    loot: [
      { item: 'fang_wolf', chance: 1.0, min: 2, max: 4 },
      { item: 'monster_hide', chance: 1.0, min: 2, max: 3 },
      { item: 'magic_core', chance: 1.0, min: 1, max: 1 }
    ]
  }
];
