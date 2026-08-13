// Day/night clock. timeOfDay 0..1 (0 = midnight, 0.25 = dawn, 0.5 = noon,
// 0.75 = dusk). 1 in-game day = `dayLength` seconds (default 300).
export class TimeSystem {
  constructor(dayLength = 300) {
    this.dayLength = dayLength;
    this.timeOfDay = 0.3; // start mid-morning
    this.day = 1;
  }
  update(dt) {
    this.timeOfDay += dt / this.dayLength;
    if (this.timeOfDay >= 1) { this.timeOfDay -= 1; this.day++; }
  }
  get phase() {
    const t = this.timeOfDay;
    if (t < 0.15 || t >= 0.92) return 'night';
    if (t < 0.30) return 'morning';
    if (t < 0.42) return 'late-morning';
    if (t < 0.70) return 'afternoon';
    if (t < 0.80) return 'evening';
    return 'night';
  }
  get isDay() {
    const t = this.timeOfDay;
    return t >= 0.25 && t < 0.75;
  }
  get isNight() { return !this.isDay; }
  // 0..1 darkness for rendering (0 = noon, 1 = full night)
  get darkness() {
    const t = this.timeOfDay;
    // brightness curve peaking at noon
    const b = Math.sin((t - 0.25) / 0.5 * Math.PI);
    return 1 - Math.max(0, Math.min(1, b));
  }
  get clock() {
    const total = Math.floor(this.timeOfDay * 24 * 60);
    const h = Math.floor(total / 60);
    const m = total % 60;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hh = ((h + 11) % 12) + 1;
    return `${hh}:${String(m).padStart(2, '0')} ${ampm}`;
  }
  serialize() { return { timeOfDay: this.timeOfDay, day: this.day }; }
  deserialize(d) { this.timeOfDay = d.timeOfDay; this.day = d.day; }
}
