// Procedural audio (no asset files). WebAudio ambient + short SFX + a small
// generative music engine that shifts with the current mood (village / forest /
// night / combat / boss). All methods are no-ops until the user has interacted
// (autoplay policy), and everything degrades gracefully without WebAudio.
const MUSIC_MOODS = {
  village: { root: 196.0, scale: [0, 2, 4, 7, 9], tempo: 84, timbre: 'sine', bass: true, perc: false, vol: 0.10 },
  forest: { root: 174.61, scale: [0, 3, 5, 7, 10], tempo: 68, timbre: 'triangle', bass: true, perc: false, vol: 0.11 },
  night: { root: 146.83, scale: [0, 3, 5, 7, 10], tempo: 52, timbre: 'sine', bass: true, perc: false, vol: 0.08 },
  combat: { root: 110.0, scale: [0, 2, 3, 5, 7, 8, 10], tempo: 142, timbre: 'sawtooth', bass: true, perc: true, vol: 0.11 },
  boss: { root: 98.0, scale: [0, 1, 3, 5, 6, 8, 10], tempo: 112, timbre: 'square', bass: true, perc: true, vol: 0.13 }
};

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.ambient = null;
    this._t = 0;
    this.master = 0.5;
    this.ambientGain = null;
    this.musicGain = null;
    this.birdTimer = 0;
    // music scheduler state
    this._musicMood = 'forest';
    this._musicNextTime = 0;
    this._musicStep = 0;
  }
  resume() {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.ambientGain = this.ctx.createGain();
        this.ambientGain.gain.value = 0.25;
        this.ambientGain.connect(this.ctx.destination);
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = 0.0;
        this.musicGain.connect(this.ctx.destination);
        this._startWind();
        this._startBirds();
        this._musicNextTime = this.ctx.currentTime + 0.1;
      } catch (e) { this.ctx = null; }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }
  setContext(mood) {
    // mood: 'village' | 'forest' | 'combat' | 'night' — adjusts ambient tone
    if (!this.ambientGain) return;
    const g = { village: 0.18, forest: 0.3, night: 0.2, combat: 0.35 }[mood] ?? 0.25;
    this.ambientGain.gain.setTargetAtTime(g, this.ctx.currentTime, 1.5);
  }
  _noiseBuffer() {
    const c = this.ctx;
    const buf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }
  _startWind() {
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = this._noiseBuffer();
    src.loop = true;
    const filt = c.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = 300;
    const g = c.createGain();
    g.gain.value = 0.5;
    src.connect(filt).connect(g).connect(this.ambientGain);
    src.start();
    this.windFilt = filt;
    this.windSrc = src;
  }
  _startBirds() {
    // random bird chirps scheduled on a timer
    this.birdTimer = 1;
  }
  tick(dt, timeOfDay, mood) {
    if (!this.ctx) return;
    this._t += dt;
    this.setContext(mood);
    if (this.windFilt) {
      const w = 200 + Math.sin(this._t * 0.1) * 100 + (mood === 'combat' ? 200 : 0);
      this.windFilt.frequency.setTargetAtTime(w, this.ctx.currentTime, 0.5);
    }
    this.birdTimer -= dt;
    if (this.birdTimer <= 0 && timeOfDay > 0.25 && timeOfDay < 0.85) {
      this._chirp();
      this.birdTimer = 1.5 + Math.random() * 6;
    }
    this._scheduleMusic(mood);
  }

  // ---- generative music ----
  _scheduleMusic(mood) {
    if (!this.ctx || !this.musicGain) return;
    const cfg = MUSIC_MOODS[mood] || MUSIC_MOODS.forest;
    // fade the music channel toward the mood's target volume
    const target = mood === 'boss' || mood === 'combat' ? cfg.vol : cfg.vol;
    this.musicGain.gain.setTargetAtTime(target, this.ctx.currentTime, 1.2);
    // schedule notes ahead (lookahead scheduler)
    const lookahead = this.ctx.currentTime + 0.18;
    const beat = 60 / cfg.tempo;
    while (this._musicNextTime < lookahead) {
      this._playMusicNote(cfg, this._musicStep, this._musicNextTime, beat);
      this._musicStep++;
      this._musicNextTime += beat / 2; // eighth notes
    }
    if (mood !== this._musicMood) { this._musicMood = mood; this._musicStep = 0; }
  }
  _freq(root, semi) { return root * Math.pow(2, semi / 12); }
  _playMusicNote(cfg, step, time, beat) {
    const c = this.ctx;
    const rng = Math.random;
    // melody note (mostly on beats)
    if (step % 2 === 0 && rng() < 0.8) {
      const semi = cfg.scale[Math.floor(rng() * cfg.scale.length)];
      const f = this._freq(cfg.root * 2, semi); // one octave up for melody
      this._pluck(cfg.timbre, f, time, 0.16, 0.10);
    }
    // bass every 4 beats
    if (cfg.bass && step % 8 === 0) {
      const semi = cfg.scale[0];
      this._pluck('triangle', this._freq(cfg.root, semi), time, 0.5, 0.16);
    }
    // percussion for combat/boss
    if (cfg.perc && step % 4 === 2) {
      this._perc(time);
    }
  }
  _pluck(type, freq, time, dur, vol) {
    const c = this.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    const f = c.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = freq * 4;
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(vol, time + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    o.connect(f).connect(g).connect(this.musicGain);
    o.start(time); o.stop(time + dur + 0.05);
  }
  _perc(time) {
    const c = this.ctx;
    const buf = this._noiseBuffer();
    const src = c.createBufferSource();
    src.buffer = buf;
    const g = c.createGain();
    const f = c.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = 2000;
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(0.06, time + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.08);
    src.connect(f).connect(g).connect(this.musicGain);
    src.start(time); src.stop(time + 0.1);
  }
  _chirp() {
    const c = this.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    const f = 2200 + Math.random() * 1800;
    o.type = 'sine';
    o.frequency.setValueAtTime(f, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(f * 0.7, c.currentTime + 0.08);
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.06, c.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.12);
    o.connect(g).connect(c.destination);
    o.start(); o.stop(c.currentTime + 0.15);
  }
  sfx(name) {
    if (!this.ctx) return;
    try { this['_sfx_' + name] && this['_sfx_' + name](); } catch (e) {}
  }
  _tone(type, f0, f1, dur, vol, delay = 0) {
    const c = this.ctx;
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t); o.stop(t + dur + 0.05);
  }
  _sfx_swing() { this._tone('sawtooth', 500, 120, 0.08, 0.06); }
  _sfx_hit() { this._tone('square', 200, 60, 0.12, 0.09); }
  _sfx_playerHit() { this._tone('sawtooth', 180, 50, 0.2, 0.12); }
  _sfx_pickup() { this._tone('sine', 700, 1100, 0.08, 0.06); }
  _sfx_gather() { this._tone('triangle', 300, 500, 0.08, 0.05); }
  _sfx_bow() { this._tone('sawtooth', 900, 200, 0.12, 0.06); }
  _sfx_levelup() { this._tone('sine', 500, 1000, 0.25, 0.08); this._tone('sine', 750, 1500, 0.3, 0.06, 0.12); }
  _sfx_quest() { this._tone('sine', 600, 900, 0.15, 0.07); this._tone('sine', 900, 1200, 0.15, 0.07, 0.1); }
  _sfx_weather() { this._tone('triangle', 120, 60, 0.5, 0.05); }
  _sfx_death() { this._tone('sawtooth', 300, 40, 0.6, 0.12); }
  _sfx_roar() { this._tone('sawtooth', 90, 50, 0.6, 0.2); }
  _sfx_eat() { this._tone('square', 150, 90, 0.08, 0.05); }
  _sfx_craft() { this._tone('triangle', 400, 700, 0.12, 0.06); }
}
