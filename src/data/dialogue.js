// Dialogue fragments for procedural NPC conversation. Greetings vary by
// personality & relationship; `recentEvents` are injected by DialogueSystem.
export const GREETINGS = {
  cheerful: ['Hail, {player}! Lovely day.', 'Well met, {player}!', 'Hello hello!'],
  gruff: ['Hmph. {player}.', 'What do you want?', 'Oh. It\'s you.'],
  shy: ['O-oh, hello {player}...', 'H-hello...'],
  proud: ['Ah, {player}. You\'ve heard of my work, yes?', 'Greetings.'],
  kind: ['Hello, {player}. How are you?', 'It\'s good to see you.'],
  curious: ['Oh! {player}! What have you found today?', 'Hello — any news from the forest?'],
  stoic: ['{player}.', 'Hm. Hello.'],
  gossipy: ['{player}! You won\'t believe what I heard...', 'Psst — {player}!'],
  ambitious: ['{player}! Busy hunting, I trust?', 'Greetings. Don\'t fall behind.'],
  'laid-back': ['Hey {player}. Easy does it.', 'Sup.'],
  suspicious: ['...Yes?', 'What brings you here?'],
  generous: ['{player}! Come, come!', 'Welcome, welcome!']
};

export const RELATION_LINES = {
  // keyed by relationship tier, used when friendly enough
  friendly: [
    'Good to see a friendly face.',
    'The village is better with you around.',
    'Stay safe out there, friend.'
  ],
  hostile: [
    'I\'d rather you kept your distance.',
    'Hmph. I\'ve not forgotten what you did.',
    'Don\'t think I\'ve forgiven you.'
  ]
};

export const SMALL_TALK = [
  'The forest has been restless lately.',
  'Hunters say a great beast prowls the deep woods.',
  'Have you tried the stew at the tavern?',
  'The crops are looking good this season.',
  'Rain\'s coming — you can feel it.',
  'I heard wolves howling near the village last night.',
  'A merchant caravan passed through yesterday.',
  'The guild is always looking for fresh materials.',
  'My joints ache when a storm is near.',
  'Someone spotted a rare white deer by the river.'
];

export const EVENT_COMMENTS = {
  // world event -> NPC reactions
  monsterAttack: ['Did you see the monster?!', 'The guards drove it off, thank the gods.', 'I barely slept after that attack.'],
  rareSighting: ['A rare creature was spotted near the forest!', 'Hunters are talking about a strange sighting.'],
  caravan: ['A caravan arrived with fine goods!', 'The caravan brought salt and cloth.'],
  monsterKilled: ['I heard a great beast was slain! The village sleeps easier.', 'Word travels fast — you\'re becoming a real hunter.'],
  injuredHunter: ['An injured hunter was carried back... the forest is dangerous.', 'Poor soul was found near the deep woods.']
};

export const PLAYER_TITLES = ['Novice Hunter', 'Experienced Hunter', 'Elite Hunter', 'Master Hunter', 'Legendary Adventurer'];
