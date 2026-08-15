// Day/night clock. timeOfDay 0..1 (0 = midnight, 0.25 = dawn, 0.5 = noon,
// 0.75 = dusk). 1 in-game day = `dayLength` seconds (default 300).
// Seasons cycle every `seasonLength` seconds (default 180 = 3 minutes each):
// Spring → Summer → Autumn → Winter, each changing terrain, weather and snow.
export const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'];

export class TimeSystem {
  constructor(dayLength = 300, seasonLength = 180) {
    this.dayLength = dayLength;
    this.seasonLength = seasonLength;
    this.timeOfDay = 0.3; // start mid-morning
    this.day = 1;
    this.seasonIndex = 0; // 0..3
    this.seasonTimer = 0;
  }
  update(dt) {
    this.timeOfDay += dt / this.dayLength;
    if (this.timeOfDay >= 1) { this.timeOfDay -= 1; this.day++; }
    // season cycle
    this.seasonTimer += dt;
    if (this.seasonTimer >= this.seasonLength) {
      this.seasonTimer -= this.seasonLength;
      this.seasonIndex = (this.seasonIndex + 1) % SEASONS.length;
    }
  }
  get seasonName() { return SEASONS[this.seasonIndex]; }
  get isWinter() { return this.seasonIndex === 3; }
  get isAutumn() { return this.seasonIndex === 2; }
  get isSummer() { return this.seasonIndex === 1; }
  get isSpring() { return this.seasonIndex === 0; }
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
  serialize() { return { timeOfDay: this.timeOfDay, day: this.day, seasonIndex: this.seasonIndex, seasonTimer: this.seasonTimer }; }
  deserialize(d) { this.timeOfDay = d.timeOfDay; this.day = d.day; this.seasonIndex = d.seasonIndex || 0; this.seasonTimer = d.seasonTimer || 0; }
}
