// Quest templates. `type`: hunt | kill | gather | explore | boss
// objectives: { kind: 'hunt'|'kill'|'gather'|'submit', id, count }
// rewards: { gp, gold, xp }
export const QUEST_TEMPLATES = [
  {
    id: 'q_first_rabbits', title: 'First Hunt', type: 'hunt', rank: 0,
    text: 'Hunt 3 rabbits and bring their meat back to the Adventure Guild.',
    objectives: [{ kind: 'hunt', id: 'rabbit', count: 3 }, { kind: 'submit', id: 'rabbit_meat', count: 3 }],
    rewards: { gp: 40, gold: 30, xp: 40 }, giver: 'guild'
  },
  {
    id: 'q_wolf_skins', title: 'Wolf Cull', type: 'kill', rank: 1,
    text: 'The wolves are threatening the farms. Defeat 5 wolves.',
    objectives: [{ kind: 'kill', id: 'wolf', count: 5 }],
    rewards: { gp: 120, gold: 80, xp: 120 }, giver: 'guild'
  },
  {
    id: 'q_herbs', title: 'Medicinal Herbs', type: 'gather', rank: 0,
    text: 'The healer needs supplies. Gather 10 healing herbs.',
    objectives: [{ kind: 'gather', id: 'herb', count: 10 }],
    rewards: { gp: 60, gold: 40, xp: 50 }, giver: 'guild'
  },
  {
    id: 'q_boar', title: 'Boar Problem', type: 'hunt', rank: 1,
    text: 'Wild boars are digging up crops. Hunt 3 boars.',
    objectives: [{ kind: 'hunt', id: 'boar', count: 3 }],
    rewards: { gp: 100, gold: 70, xp: 100 }, giver: 'guild'
  },
  {
    id: 'q_spiders', title: 'Web Infestation', type: 'kill', rank: 2,
    text: 'Giant spiders are spreading into the deep woods. Slay 4 of them.',
    objectives: [{ kind: 'kill', id: 'spider', count: 4 }],
    rewards: { gp: 200, gold: 140, xp: 180 }, giver: 'guild'
  },
  {
    id: 'q_alpha', title: 'The Alpha Wolf', type: 'boss', rank: 2,
    text: 'An Alpha Wolf leads the pack terrorizing the deep forest. Defeat it and bring back its fang.',
    objectives: [{ kind: 'kill', id: 'alpha_wolf', count: 1 }, { kind: 'submit', id: 'fang_wolf', count: 2 }],
    rewards: { gp: 500, gold: 300, xp: 400 }, giver: 'guild'
  },
  {
    id: 'q_missing_hunter', title: 'Missing Hunter', type: 'explore', rank: 1,
    text: 'A hunter named Bran has not returned from the deep forest. Find signs of him.',
    objectives: [{ kind: 'explore', id: 'deep_forest', count: 1 }],
    rewards: { gp: 150, gold: 90, xp: 120 }, giver: 'guild'
  },
  {
    id: 'q_treant', title: 'Ancient Bark', type: 'boss', rank: 3,
    text: 'Bring back ancient bark from a Forest Treant in the dark woods.',
    objectives: [{ kind: 'submit', id: 'treant_bark', count: 2 }],
    rewards: { gp: 400, gold: 260, xp: 350 }, giver: 'guild'
  },
  {
    id: 'q_wood', title: 'Firewood Duty', type: 'gather', rank: 0,
    text: 'Winter is coming. Gather 15 wood for the village.',
    objectives: [{ kind: 'gather', id: 'wood', count: 15 }],
    rewards: { gp: 50, gold: 25, xp: 40 }, giver: 'guild'
  }
];

export const RANKS = ['F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];
// Guild points required to reach each rank (index = rank).
export const RANK_POINTS = [0, 100, 300, 700, 1400, 2500, 4000, 6000, 8500];
