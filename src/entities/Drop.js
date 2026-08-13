import { Entity } from './Entity.js';

export class Drop extends Entity {
  constructor(x, y, itemId, qty) {
    super(x, y, 8);
    this.itemId = itemId;
    this.qty = qty;
    this.lifetime = 180; // seconds before despawning
    this.attract = 0;
    this.id = 'd' + (Math.random() * 1e6 | 0);
  }
  update(dt, game) {
    this.lifetime -= dt;
    if (this.lifetime <= 0) { this.dead = true; return; }
    // magnet toward player if close and they can carry
    const p = game.player;
    const d = this.distTo(p);
    if (d < 90 && this.lifetime < 170) {
      const spd = 240 * (1 - d / 90);
      const a = this.angleTo(p);
      game.world.moveEntity(this, Math.cos(a) * spd * dt, Math.sin(a) * spd * dt);
      if (d < 18) {
        game.inventory.addItem(this.itemId, this.qty);
        game.audio.sfx('pickup');
        this.dead = true;
      }
    }
  }
  draw(ctx, cam) {
    const x = cam.sx(this.x), y = cam.sy(this.y);
    if (x < -20 || y < -20 || x > cam.vw + 20 || y > cam.vh + 20) return;
    ctx.fillStyle = 'rgba(255,255,200,0.9)';
    ctx.strokeStyle = '#8a7a3a';
    ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#000';
  }
}
