export class Camera {
  constructor(viewportW, viewportH, worldW, worldH) {
    this.x = 0; this.y = 0;
    this.vw = viewportW; this.vh = viewportH;
    this.worldW = worldW; this.worldH = worldH;
    this.shake = 0;
  }
  follow(tx, ty) {
    this.x = tx - this.vw / 2;
    this.y = ty - this.vh / 2;
    if (this.x < 0) this.x = 0;
    if (this.y < 0) this.y = 0;
    if (this.x > this.worldW - this.vw) this.x = this.worldW - this.vw;
    if (this.y > this.worldH - this.vh) this.y = this.worldH - this.vh;
    if (this.x < 0) this.x = 0;
    if (this.y < 0) this.y = 0;
  }
  addShake(mag) { this.shake = Math.min(12, this.shake + mag); }
  sx(wx) { return wx - this.x; }
  sy(wy) { return wy - this.y; }
  getOffset() {
    if (this.shake <= 0) return { x: 0, y: 0 };
    this.shake *= 0.85;
    return { x: (Math.random() - 0.5) * this.shake, y: (Math.random() - 0.5) * this.shake };
  }
}
