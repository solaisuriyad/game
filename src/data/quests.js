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
  },
  {
    id: 'q_ancient_bear', title: 'The Ancient Bear', type: 'boss', rank: 3,
    text: 'An Ancient Bear has claimed the dark woods. Defeat it and bring back its claws.',
    objectives: [{ kind: 'kill', id: 'ancient_bear', count: 1 }, { kind: 'submit', id: 'claw_bear', count: 3 }],
    rewards: { gp: 900, gold: 500, xp: 700 }, giver: 'guild'
  },
  {
    id: 'q_guardian', title: 'Guardian of the Grove', type: 'boss', rank: 5,
    text: 'The Forest Guardian stirs in the Ancient Forest. Defeat it and bring back its ancient bark.',
    objectives: [{ kind: 'kill', id: 'forest_guardian', count: 1 }, { kind: 'submit', id: 'treant_bark', count: 4 }],
    rewards: { gp: 2500, gold: 1400, xp: 1600 }, giver: 'guild'
  },
  {
    id: 'q_dragon', title: 'The Final Guardian', type: 'boss', rank: 8,
    text: 'An Ancient Dragon slumbers in the Forbidden Forest — the forest\'s ultimate guardian. Face it.',
    objectives: [{ kind: 'kill', id: 'ancient_dragon', count: 1 }],
    rewards: { gp: 6000, gold: 3000, xp: 4000 }, giver: 'guild'
  }
];

export const RANKS = ['F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];
// Guild points required to reach each rank (index = rank).
export const RANK_POINTS = [0, 100, 300, 700, 1400, 2500, 4000, 6000, 8500];
