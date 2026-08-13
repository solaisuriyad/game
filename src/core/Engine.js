import { Input } from './Input.js';

// Fixed-timestep game loop with an uncapped render.
export class Engine {
  constructor(canvas, game) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.game = game;
    this.running = false;
    this._last = 0;
    this._acc = 0;
    this.dt = 1 / 60;
    this._step = this._step.bind(this);
  }
  start() {
    if (this.running) return;
    this.running = true;
    this._last = performance.now();
    requestAnimationFrame(this._step);
  }
  stop() { this.running = false; }
  _step(now) {
    if (!this.running) return;
    let frame = (now - this._last) / 1000;
    this._last = now;
    if (frame > 0.25) frame = 0.25; // clamp after tab switch
    this._acc += frame;
    while (this._acc >= this.dt) {
      // guard the game loop: a single bad frame must never freeze the game.
      // If something throws, surface it once and keep going.
      try {
        this.game.update(this.dt);
      } catch (e) {
        if (this.game.crash) this.game.crash(e);
        else if (typeof this.game.onCrash === 'function') this.game.onCrash(e);
      }
      this._acc -= this.dt;
    }
    try {
      this.game.render(this.ctx);
    } catch (e) {
      if (typeof this.game.onCrash === 'function') this.game.onCrash(e);
    }
    Input.endFrame();
    requestAnimationFrame(this._step);
  }
}
