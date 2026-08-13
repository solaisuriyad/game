import { RNG } from '../core/RNG.js';

// Weather state machine. Affects visibility, tracking, and rare spawns.
export class WeatherSystem {
  constructor() {
    this.rng = new RNG();
    this.state = 'sunny'; // sunny | cloudy | rain | heavyrain | fog | storm
    this.intensity = 0;
    this._timer = 30;
  }
  update(dt) {
    this._timer -= dt;
    // ease intensity toward target (1 = full, 0 = none)
    const target = this.state === 'sunny' ? 0 : this.state === 'cloudy' ? 0.3 : 1;
    this.intensity += (target - this.intensity) * Math.min(1, dt * 1.5);
    if (this._timer <= 0) {
      this._timer = 40 + this.rng.range(0, 40);
      this._transition();
    }
  }
  _transition() {
    const next = this.rng.pickWeighted([
      { s: 'sunny', w: 3 }, { s: 'cloudy', w: 3 }, { s: 'rain', w: 2 },
      { s: 'heavyrain', w: 1 }, { s: 'fog', w: 1.5 }, { s: 'storm', w: 0.6 }
    ], (e) => e.w).s;
    if (next !== this.state) this.state = next;
  }
  get visibility() {
    switch (this.state) {
      case 'fog': return 0.55;
      case 'rain': return 0.85;
      case 'heavyrain': return 0.7;
      case 'storm': return 0.6;
      default: return 1;
    }
  }
  get raining() { return ['rain', 'heavyrain', 'storm'].includes(this.state); }
  get isStorm() { return this.state === 'storm'; }
  serialize() { return { state: this.state }; }
  deserialize(d) { this.state = d.state; }
}
