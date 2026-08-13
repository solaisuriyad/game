import { Entity } from './Entity.js';

export class NPC extends Entity {
  constructor(game, data, x, y) {
    super(x, y, 11);
    this.name = data.name;
    this.firstName = data.firstName || data.name;
    this.lastName = data.lastName || '';
    this.age = data.age;
    this.gender = data.gender;
    this.occupation = data.occupation;   // occupation id
    this.occupationLabel = data.occupationLabel;
    this.personality = data.personality;
    this.skinTone = data.skinTone;
    this.hairColor = data.hairColor;
    this.clothColor = data.clothColor;
    this.money = data.wealth;
    this.skills = data.skills || {};
    this.homePos = data.homePos;
    this.workPos = data.workPos;
    this.scheduleType = data.scheduleType;

    // social simulation state
    this.familyId = null;
    this.spouseId = null;
    this.parentIds = [];
    this.childIds = [];
    this.npcRelations = {};   // { npcId: 'spouse'|'child'|'parent'|'friend'|'rival' }
    this.chatting = 0;
    this.chatBuddy = null;
    this._socialSearch = 0;

    this.phase = 'idle';
    this.targetPos = null;
    this.wanderTimer = 0;
    this.socialTimer = 0;
    this.speed = 70 + game.world.rng.range(0, 20);
    this.idleFlip = game.world.rng.chance(0.5);
    this.id = data.id || 'n' + (Math.random() * 1e6 | 0);

    // relationship with player (-100..100)
    this.relationship = 0;
    this.metPlayer = false;
    this.memory = []; // { text, day }
  }

  update(dt, game) {
    game.ai.npc(this, dt, game);
  }

  draw(ctx, cam, game) {
    const x = cam.sx(this.x), y = cam.sy(this.y);
    if (x < -40 || y < -40 || x > cam.vw + 40 || y > cam.vh + 40) return;
    const s = this.radius;
    const walking = this.targetPos != null;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath(); ctx.ellipse(0, s * 0.7, s * 0.6, s * 0.25, 0, 0, Math.PI * 2); ctx.fill();

    const bob = walking ? Math.sin(game.time.timeOfDay * 1000 + this.x) * 1.5 : 0;
    // body
    ctx.fillStyle = this.clothColor;
    ctx.beginPath(); ctx.ellipse(0, s * 0.15 + bob * 0.2, s * 0.62, s * 0.72, 0, 0, Math.PI * 2); ctx.fill();
    // head
    ctx.fillStyle = this.skinTone;
    ctx.beginPath(); ctx.arc(0, -s * 0.55 + bob * 0.2, s * 0.5, 0, Math.PI * 2); ctx.fill();
    // hair
    ctx.fillStyle = this.hairColor;
    ctx.beginPath(); ctx.arc(0, -s * 0.72 + bob * 0.2, s * 0.48, Math.PI, Math.PI * 2); ctx.fill();
    if (this.age < 14) {
      ctx.fillStyle = this.hairColor;
      ctx.beginPath(); ctx.arc(0, -s * 0.75 + bob * 0.2, s * 0.5, Math.PI, Math.PI * 2); ctx.fill();
    }
    // eyes
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath(); ctx.arc(-s * 0.18, -s * 0.55 + bob * 0.2, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.18, -s * 0.55 + bob * 0.2, 1.5, 0, Math.PI * 2); ctx.fill();
    // chat bubble when socializing
    if (this.chatting > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.strokeStyle = '#6a4a2a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, -s * 1.5, 8, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-4, -s * 1.5 + 6); ctx.lineTo(0, -s * 0.9); ctx.lineTo(4, -s * 1.5 + 6); ctx.closePath();
      ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.fill();
    }
    ctx.restore();
  }
}
