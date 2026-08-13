export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class RNG {
  constructor(seed = Date.now() & 0xffffffff) {
    this._r = mulberry32(seed);
  }
  float() { return this._r(); }
  int(min, max) { return Math.floor(this._r() * (max - min + 1)) + min; }
  range(min, max) { return this._r() * (max - min) + min; }
  pick(arr) { return arr[Math.floor(this._r() * arr.length)]; }
  chance(p) { return this._r() < p; }
  pickWeighted(entries, weightFn = (e) => e.w) {
    const total = entries.reduce((s, e) => s + weightFn(e), 0);
    let r = this._r() * total;
    for (const e of entries) { r -= weightFn(e); if (r <= 0) return e; }
    return entries[entries.length - 1];
  }
  shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this._r() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  gauss() { return (this._r() + this._r() + this._r() - 1.5) / 1.5; }
}
