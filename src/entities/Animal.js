import { Entity } from './Entity.js';

export class Animal extends Entity {
  constructor(game, def, x, y) {
    super(x, y, def.size);
    this.def = def;
    this.name = def.name;
    this.maxHp = def.hp;
    this.hp = def.hp;
    this.speed = def.speed;
    this.damage = def.damage;
    this.aggression = def.aggression;
    this.flee = def.flee;
    this.xp = def.xp;
    this.color = def.color;
    this.zones = def.zones;

    // behavior state
    this.state = 'wander'; // wander | eat | flee | hunt(attack) | dead
    this.wanderTarget = null;
    this.wanderTimer = 0;
    this.eatTimer = 0;
    this.threat = null;
    this.facing = game.world.rng.range(0, Math.PI * 2);
    this.corpse = null;      // set when killed (for harvesting)
    this.bleedTimer = 0;     // blood trail when wounded
    this.packId = null;
    this.id = 'a' + (Math.random() * 1e6 | 0);
  }

  update(dt, game) {
    if (this.dead) return;
    this.tickStatuses(dt, game);
    game.ai.animal(this, dt, game);
  }

  draw(ctx, cam, game) {
    const x = cam.sx(this.x), y = cam.sy(this.y);
    if (x < -40 || y < -40 || x > cam.vw + 40 || y > cam.vh + 40) return;
    const c = this.color;
    const s = this.radius;
    ctx.save();
    ctx.translate(x, y);
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(0, s * 0.55, s * 0.8, s * 0.35, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = c;
    if (this.def.id === 'bird') {
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.arc(0, 0, s * 0.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(s * 0.3, -s * 0.2, s * 0.25, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.beginPath(); ctx.ellipse(0, 0, s * 1.2, s * 0.8, 0, 0, Math.PI * 2); ctx.fill();
      // head
      ctx.beginPath(); ctx.arc(s * 0.9, -s * 0.2, s * 0.5, 0, Math.PI * 2); ctx.fill();
      // eyes
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.arc(s * 1.05, -s * 0.3, 1.5, 0, Math.PI * 2); ctx.fill();
      // antlers for deer
      if (this.def.id === 'deer') {
        ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(s * 0.9, -s * 0.6);
        ctx.lineTo(s * 0.7, -s * 1.3); ctx.lineTo(s * 1.1, -s * 1.0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(s * 0.9, -s * 0.6);
        ctx.lineTo(s * 1.2, -s * 1.2); ctx.lineTo(s * 0.9, -s * 1.5); ctx.stroke();
      }
      // tusk for boar
      if (this.def.id === 'boar') {
        ctx.fillStyle = '#eee';
        ctx.beginPath(); ctx.moveTo(s * 1.1, -s * 0.1); ctx.lineTo(s * 1.6, -s * 0.4); ctx.lineTo(s * 1.1, -s * 0.3); ctx.fill();
      }
    }
    ctx.restore();
  }
}
