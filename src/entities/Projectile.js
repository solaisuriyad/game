import { Entity } from './Entity.js';

export class Projectile extends Entity {
  constructor(x, y, vx, vy, opts = {}) {
    super(x, y, 5);
    this.vx = vx; this.vy = vy;
    this.damage = opts.damage || 1;
    this.fromPlayer = !!opts.fromPlayer;
    this.status = opts.status || null; // { type, duration, magnitude }
    this.speed = Math.hypot(vx, vy);
    this.kind = opts.kind || 'arrow'; // arrow | rock | web
    this.lifetime = 2.5;
    this.color = opts.color || '#c8a06a';
    this.owner = opts.owner || null;
    this.id = 'p' + (Math.random() * 1e6 | 0);
  }
  update(dt, game) {
    this.lifetime -= dt;
    if (this.lifetime <= 0) { this.dead = true; return; }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (game.world.blockedAt(this.x, this.y)) { this.dead = true; return; }

    // hit detection
    if (this.fromPlayer) {
      const targets = game.monsters.concat(game.animals.filter((a) => !a.dead && a.hp > 0));
      for (const t of targets) {
        if (t.dead || t.hp <= 0) continue;
        if (this.distTo(t) < t.radius + 4) {
          game.combat.hitEntity(t, this.damage, 'projectile', this);
          if (this.status) t.addStatus(this.status.type, this.status.duration, this.status.magnitude);
          this.dead = true; return;
        }
      }
    } else {
      const p = game.player;
      if (p.dodgeTimer <= 0 && this.distTo(p) < p.radius + 4) {
        game.combat.damagePlayer(this.damage, this.owner, this.status);
        this.dead = true; return;
      }
    }
  }
  draw(ctx, cam) {
    const x = cam.sx(this.x), y = cam.sy(this.y);
    if (x < -20 || y < -20 || x > cam.vw + 20 || y > cam.vh + 20) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.atan2(this.vy, this.vx));
    ctx.fillStyle = this.color;
    ctx.fillRect(-6, -1.5, 12, 3);
    if (this.kind === 'web') {
      ctx.fillStyle = 'rgba(240,240,240,0.7)';
      ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}
