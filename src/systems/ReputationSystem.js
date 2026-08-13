// Village reputation: 0..100 -> titles. Affects shop prices (EconomySystem),
// and unlocks flavor in dialogue.
const TITLES = [
  [0, 'Unknown'], [10, 'Newcomer'], [25, 'Helpful'], [45, 'Respected'],
  [65, 'Trusted'], [85, 'Hero'], [100, 'Village Legend']
];

export class ReputationSystem {
  constructor(game) { this.game = game; }

  title() {
    const rep = this.game.player.reputation;
    let t = TITLES[0][1];
    for (const [min, name] of TITLES) if (rep >= min) t = name;
    return t;
  }

  add(n) {
    this.game.player.reputation = Math.max(0, Math.min(100, this.game.player.reputation + n));
  }
}
