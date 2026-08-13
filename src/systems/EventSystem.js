import { RNG } from '../core/RNG.js';
import { MONSTERS } from '../data/monsters.js';
import { ANIMALS } from '../data/animals.js';

// Random world events. Each event runs, notifies the player, and is remembered
// so NPCs can gossip about it (DialogueSystem).
export class EventSystem {
  constructor(game) {
    this.game = game;
    this.rng = new RNG(4242);
    this.timer = 60;
    this.recent = []; // { type, day }
  }

  update(dt) {
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = 90 + this.rng.range(0, 120);
      this._roll();
    }
  }

  remember(type) {
    this.recent.unshift({ type, day: this.game.time.day });
    if (this.recent.length > 8) this.recent.length = 8;
  }

  _roll() {
    const g = this.game;
    const choice = this.rng.pickWeighted([
      { t: 'caravan', w: 2 }, { t: 'rareSighting', w: 2 }, { t: 'monsterAttack', w: 1.5 },
      { t: 'injuredHunter', w: 1.5 }, { t: 'none', w: 4 }
    ], (e) => e.w).t;
    if (choice === 'none') return;
    if (choice === 'caravan') {
      this.remember('caravan');
      g.toast('A merchant caravan has arrived — prices are favorable for a while.');
      g.economy.caravanTimer = 120;
      this._makeNPCsComment('caravan');
    } else if (choice === 'rareSighting') {
      this.remember('rareSighting');
      g.toast('Someone spotted a rare creature in the forest!');
      this._spawnRare();
    } else if (choice === 'monsterAttack') {
      this.remember('monsterAttack');
      g.toast('A monster is attacking the village outskirts — the guards need help!');
      const def = MONSTERS.find((m) => m.id === 'goblin') || MONSTERS[0];
      for (let i = 0; i < 4; i++) {
        const pos = g.world.randomPosition(26, 34);
        g.monsters.push(new g.AMonster(g, def, pos.x, pos.y));
      }
      g.audio.sfx('roar');
    } else if (choice === 'injuredHunter') {
      this.remember('injuredHunter');
      g.toast('An injured hunter was carried back from the deep woods.');
    }
  }

  _spawnRare() {
    const g = this.game;
    const def = ANIMALS.find((a) => a.id === 'deer');
    const pos = g.world.randomPosition(40, 60);
    const rare = new g.AAnimal(g, def, pos.x, pos.y);
    rare.color = '#f0f0e8'; // white deer
    rare.maxHp = 120; rare.hp = 120; rare.xp = 200;
    rare.rare = true;
    rare.def = { ...def, drops: [{ item: 'rare_herb', chance: 1, min: 1, max: 2 }, { item: 'hide_deer', chance: 1, min: 2, max: 3 }] };
    g.animals.push(rare);
  }

  _makeNPCsComment(type) {
    for (const n of this.game.npcs) {
      if (Math.random() < 0.2) n.recentEventComment = type;
    }
  }
}
