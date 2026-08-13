// The forest's history — discovered progressively through exploration, bosses,
// and hidden locations. `unlock` describes the trigger (see LoreSystem for the
// exact mapping). Entries are listed roughly in discovery order.
export const LORE = [
  {
    id: 'lore_shrine', title: 'The Forest Shrine', unlock: 'shrine',
    text: 'The villagers tend a small shrine at the forest\'s edge and leave offerings of bread and flowers. The elders say the forest was not always wild — it remembers those who respect it. The shrine is the oldest marker of the pact between the village and the woods.'
  },
  {
    id: 'lore_old_watch', title: 'The Old Watchtower', unlock: 'watchtower',
    text: 'A half-collapsed watchtower stands among the safe woods. Long ago, rangers kept vigil there, warning the village of beasts that strayed too close. Its stones are carved with the same crescent mark as the shrine — a people once lived all through this forest.'
  },
  {
    id: 'lore_deep', title: 'The Deep Forest', unlock: 'deep_forest',
    text: 'Past the safe woods the trees grow close and old. Hunters say the deep forest tests you: the game is wiser, the wolves hunt in packs, and the paths seem to shift. The deeper you go, the more the forest feels awake and watchful.'
  },
  {
    id: 'lore_dark', title: 'The Dark Forest', unlock: 'dark_forest',
    text: 'Here the canopy swallows the light. Poison crawls through the undergrowth and spiders string their webs between ancient trunks. The guild forbids travel here below B-rank — not to punish the weak, but because the dark forest does not return everyone who enters.'
  },
  {
    id: 'lore_ruins', title: 'The Ruins of the First People', unlock: 'ruins',
    text: 'Deep in the ancient woods lie the ruins of a settlement older than the village by a thousand years. Its people carved the crescent runes and raised the shrine and the watchtowers. The ruins speak of a pact with a great forest spirit — and of the day that pact was broken.'
  },
  {
    id: 'lore_ancient', title: 'The Ancient Forest', unlock: 'ancient_forest',
    text: 'The ancient forest is a place where the world forgets time. The trees here are not merely old — they are the first trees. The First People believed this was where the forest spirit dreamed, and they built their shrines to guard the dream.'
  },
  {
    id: 'lore_alpha', title: 'The Alpha Wolf', unlock: 'alpha_wolf',
    text: 'The Alpha Wolf is not born — it is made, chosen by the pack when the forest grows restless. Its defeat quiets the deep woods for a season, but hunters whisper that a new Alpha always rises, because the wolves are only ever answering a call from deeper still.'
  },
  {
    id: 'lore_bear', title: 'The Ancient Bear', unlock: 'ancient_bear',
    text: 'The Ancient Bear was once a guardian of the dark forest, a warden who kept lesser beasts at bay. When the pact broke, it was the first to turn. Its rage is not mindless — it mourns what the forest lost, and it punishes any who trespass on the old borders.'
  },
  {
    id: 'lore_guardian', title: 'The Forest Guardian', unlock: 'forest_guardian',
    text: 'The Guardian is the spirit of the ancient forest given root and bark. It slumbers at the forest\'s heart, waking only when the woods are wounded. To reach it is to be judged. The First People did not worship the Guardian — they protected it, and in return it protected them.'
  },
  {
    id: 'lore_forbidden', title: 'The Forbidden Forest', unlock: 'forbidden_forest',
    text: 'Few have crossed into the forbidden forest and returned. It is the wound at the center of the world — the place where the old pact was shattered. The guild marks it SSS-rank, but the truth is worse than a rank: the forest itself keeps everyone out except those it has chosen to test.'
  },
  {
    id: 'lore_yggdrasil', title: 'The Yggdrasil', unlock: 'yggdrasil',
    text: 'At the heart of the dense forest stands the Yggdrasil — a colossal tree whose leaves shift through nine living colors. The First People believed it was the source of all the forest\'s power: its roots fed the soil, its boughs fed the beasts, and its pulse fed the monsters that guard the deep woods. As long as it stands, the forest cannot fall — and neither will the wild things that draw strength from it.'
  },
  {
    id: 'lore_dragon', title: 'The Last Guardian', unlock: 'ancient_dragon',
    text: 'The Ancient Dragon is what remains of the pact. The First People\'s spirit did not die — it was twisted when the pact broke, and it now sleeps beneath the forbidden forest, burning with a grief it can no longer remember. To face it is to stand at the end of the forest\'s long story.'
  },
  {
    id: 'lore_history', title: 'The History of the Forest', unlock: 'completion',
    text: 'You have pieced together the whole story: a people who kept a pact with a forest spirit, a pact that was broken, and a world that has been grieving ever since. The forest does not rage — it waits. And now it knows you. Whatever comes next, your name will be written into the woods as surely as the old runes were.'
  }
];

export const LORE_BY_ID = Object.fromEntries(LORE.map((l) => [l.id, l]));
