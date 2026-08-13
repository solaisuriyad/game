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
