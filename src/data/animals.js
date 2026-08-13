// Wildlife. `aggression` 0..1 (0 flees, 1 attacks). `flee` = runs when threatened.
// `drops` entries: { item, chance(0..1), min, max }
export const ANIMALS = [
  {
    id: 'rabbit', name: 'Rabbit', zones: [1], hp: 12, speed: 95, damage: 0, aggression: 0, size: 11,
    flee: true, nocturnal: false, xp: 6, color: '#c9b89a',
    drops: [
      { item: 'rabbit_meat', chance: 1.0, min: 1, max: 2 },
      { item: 'hide_rabbit', chance: 0.8, min: 1, max: 1 },
      { item: 'bone', chance: 0.3, min: 1, max: 1 }
    ]
  },
  {
    id: 'deer', name: 'Deer', zones: [1, 2], hp: 45, speed: 130, damage: 0, aggression: 0, size: 20,
    flee: true, nocturnal: false, xp: 20, color: '#b08a5a',
    drops: [
      { item: 'meat_raw', chance: 1.0, min: 2, max: 4 },
      { item: 'hide_deer', chance: 0.9, min: 1, max: 2 },
      { item: 'antler', chance: 0.5, min: 1, max: 1 },
      { item: 'bone', chance: 0.7, min: 1, max: 2 }
    ]
  },
  {
    id: 'fox', name: 'Fox', zones: [1, 2], hp: 20, speed: 120, damage: 0, aggression: 0.1, size: 13,
    flee: true, nocturnal: true, xp: 12, color: '#d98a4a',
    drops: [
      { item: 'fur_fox', chance: 0.7, min: 1, max: 1 },
      { item: 'meat_raw', chance: 0.6, min: 1, max: 1 },
      { item: 'bone', chance: 0.3, min: 1, max: 1 }
    ]
  },
  {
    id: 'boar', name: 'Wild Boar', zones: [2], hp: 70, speed: 85, damage: 14, aggression: 0.55, size: 17,
    flee: false, nocturnal: false, xp: 32, color: '#6a5a45',
    drops: [
      { item: 'meat_raw', chance: 1.0, min: 2, max: 4 },
      { item: 'hide_boar', chance: 0.8, min: 1, max: 1 },
      { item: 'tusk', chance: 0.6, min: 1, max: 2 },
      { item: 'bone', chance: 0.6, min: 1, max: 2 }
    ]
  },
  {
    id: 'goat', name: 'Mountain Goat', zones: [2], hp: 50, speed: 105, damage: 0, aggression: 0.1, size: 16,
    flee: true, nocturnal: false, xp: 25, color: '#cbbfa8',
    drops: [
      { item: 'meat_raw', chance: 1.0, min: 1, max: 3 },
      { item: 'hide_deer', chance: 0.6, min: 1, max: 1 },
      { item: 'bone', chance: 0.6, min: 1, max: 2 }
    ]
  },
  {
    id: 'bear', name: 'Brown Bear', zones: [2, 3], hp: 240, speed: 78, damage: 32, aggression: 0.5, size: 26,
    flee: false, nocturnal: false, xp: 90, color: '#6a4e36',
    drops: [
      { item: 'meat_raw', chance: 1.0, min: 4, max: 6 },
      { item: 'hide_bear', chance: 0.9, min: 1, max: 1 },
      { item: 'claw_bear', chance: 0.8, min: 1, max: 2 },
      { item: 'bone', chance: 0.8, min: 2, max: 3 }
    ]
  },
  {
    id: 'bird', name: 'Forest Bird', zones: [1, 2], hp: 6, speed: 60, damage: 0, aggression: 0, size: 8,
    flee: true, nocturnal: false, xp: 3, ambient: true, color: '#7aa0c0',
    drops: [ { item: 'feather', chance: 0.9, min: 1, max: 2 } ]
  }
];
