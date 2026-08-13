import { Monster } from './Monster.js';

// A server-authoritative monster on the client. It reuses Monster's rendering
// but does NOT run local AI — position/health/phase come from server snapshots
// and are interpolated for smoothness.
export class RemoteMonster extends Monster {
  constructor(game, def, id, data) {
    super(game, def, data.x, data.y);
    this.remoteId = id;
    this.targetX = data.x; this.targetY = data.y;
    this.hp = data.hp; this.maxHp = data.maxHp;
    this.phaseIndex = data.phaseIndex || 0;
    if (data.color) this.color = data.color;
  }
  apply(data) {
    this.targetX = data.x; this.targetY = data.y;
    this.hp = data.hp; this.maxHp = data.maxHp;
    this.facing = data.facing;
    this.phaseIndex = data.phaseIndex || 0;
    if (data.color) this.color = data.color;
  }
  update(dt) {
    const k = Math.min(1, dt * 12);
    this.x += (this.targetX - this.x) * k;
    this.y += (this.targetY - this.y) * k;
  }
  draw(ctx, cam, game) {
    super.draw(ctx, cam, game);
    if (this.hp < this.maxHp && !this.dead) {
      const x = cam.sx(this.x), y = cam.sy(this.y);
      const w = this.radius * 2;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(x - w / 2, y - this.radius - 16, w, 5);
      ctx.fillStyle = '#e04040';
      ctx.fillRect(x - w / 2, y - this.radius - 16, w * Math.max(0, this.hp / this.maxHp), 5);
    }
  }
}
