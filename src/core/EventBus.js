// Tiny pub/sub event bus used to decouple systems.
export class EventBus {
  constructor() { this._m = new Map(); }
  on(type, fn) {
    if (!this._m.has(type)) this._m.set(type, []);
    this._m.get(type).push(fn);
    return () => this.off(type, fn);
  }
  off(type, fn) {
    const l = this._m.get(type);
    if (!l) return;
    const i = l.indexOf(fn);
    if (i >= 0) l.splice(i, 1);
  }
  emit(type, payload) {
    const l = this._m.get(type);
    if (!l) return;
    for (const fn of l.slice()) fn(payload);
  }
}
