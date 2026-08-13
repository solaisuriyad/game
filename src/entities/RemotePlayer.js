// A networked copy of another player. Positions are interpolated toward the
// latest authoritative server snapshot for smoothness.
export class RemotePlayer {
  constructor(id, name, x, y, colors) {
    this.id = id;
    this.name = name;
    this.x = x; this.y = y;
    this.targetX = x; this.targetY = y;
    this.facing = 0;
    this.radius = 12;
    this.colors = colors || {};
  }
  update(dt) {
    const k = Math.min(1, dt * 12); // interpolation smoothing
    this.x += (this.targetX - this.x) * k;
    this.y += (this.targetY - this.y) * k;
  }
  draw(ctx, cam, game) {
    const x = cam.sx(this.x), y = cam.sy(this.y);
    if (x < -40 || y < -40 || x > cam.vw + 40 || y > cam.vh + 40) return;
    const s = this.radius;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.26)';
    ctx.beginPath(); ctx.ellipse(0, s * 0.7, s * 0.6, s * 0.25, 0, 0, Math.PI * 2); ctx.fill();
    // body
    ctx.fillStyle = this.colors.clothColor || '#7a6a4a';
    ctx.beginPath(); ctx.ellipse(0, s * 0.15, s * 0.62, s * 0.72, 0, 0, Math.PI * 2); ctx.fill();
    // head
    ctx.fillStyle = this.colors.skinTone || '#e8c39a';
    ctx.beginPath(); ctx.arc(0, -s * 0.55, s * 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = this.colors.hairColor || '#4a3624';
    ctx.beginPath(); ctx.arc(0, -s * 0.72, s * 0.5, Math.PI, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath(); ctx.arc(-s * 0.16, -s * 0.55, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.16, -s * 0.55, 1.5, 0, Math.PI * 2); ctx.fill();
    // name tag
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    const w = ctx.measureText(this.name).width;
    ctx.fillRect(-w / 2 - 4, -s * 1.6, w + 8, 12);
    ctx.fillStyle = '#c8f0c8';
    ctx.textAlign = 'center';
    ctx.fillText(this.name, 0, -s * 1.55);
    ctx.textAlign = 'left';
    ctx.restore();
  }
}
