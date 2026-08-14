export class Camera {
  constructor(viewportW, viewportH, worldW, worldH) {
    this.x = 0; this.y = 0;
    this.screenW = viewportW;   // actual canvas size (screen pixels)
    this.screenH = viewportH;
    this.vw = viewportW;        // visible world size (screen / zoom)
    this.vh = viewportH;
    this.zoom = 1;
    this.worldW = worldW; this.worldH = worldH;
    this.shake = 0;
  }
  setScreen(w, h) {
    this.screenW = w; this.screenH = h;
    this.vw = w / this.zoom; this.vh = h / this.zoom;
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
  // zoom in/out, keeping the world point under the cursor fixed in place
  zoomAt(screenX, screenY, factor) {
    const nz = Math.max(0.5, Math.min(3, this.zoom * factor));
    if (nz === this.zoom) return;
    const wx = this.x + screenX / this.zoom;
    const wy = this.y + screenY / this.zoom;
    this.zoom = nz;
    this.vw = this.screenW / nz; this.vh = this.screenH / nz;
    this.x = wx - screenX / nz;
    this.y = wy - screenY / nz;
    if (this.x < 0) this.x = 0;
    if (this.y < 0) this.y = 0;
    if (this.x > this.worldW - this.vw) this.x = this.worldW - this.vw;
    if (this.y > this.worldH - this.vh) this.y = this.worldH - this.vh;
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
