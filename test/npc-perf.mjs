// Phase 9 — 1000-NPC optimization benchmark.
// Generates 1000 NPCs, simulates + renders several frames, and verifies the
// per-frame cost stays within budget (the background simulation tier + spatial
// culling are what make this feasible).
import { performance } from 'node:perf_hooks';

const gradient = { addColorStop() {} };
function fakeCtx() {
  return new Proxy({}, {
    get(t, k) {
      if (k === 'createImageData') return (w, h) => ({ data: new Uint8ClampedArray((w || 1) * (h || 1) * 4), width: w || 1, height: h || 1 });
      if (k === 'createRadialGradient' || k === 'createLinearGradient') return () => gradient;
      if (k === 'measureText') return () => ({ width: 10 });
      return () => {};
    },
    set(t, k, v) { t[k] = v; return true; }
  });
}
function fakeEl(tag = 'div') {
  const el = { tagName: tag.toUpperCase(), children: [], style: {}, _html: '', value: '', width: 0, height: 0, className: '', dataset: {}, appendChild(c) { el.children.push(c); return c; }, addEventListener() {}, removeEventListener() {}, querySelectorAll() { return []; }, querySelector() { return null; }, getContext() { return fakeCtx(); }, getBoundingClientRect() { return { left: 0, top: 0, width: 800, height: 600 }; }, setAttribute() {} };
  Object.defineProperty(el, 'innerHTML', { get() { return el._html; }, set(v) { el._html = v; } });
  return el;
}
const canvas = fakeEl('canvas');
canvas.width = 800; canvas.height = 600;

globalThis.window = { innerWidth: 800, innerHeight: 600, addEventListener() {}, removeEventListener() {}, AudioContext: undefined, location: { search: '' } };
globalThis.document = { getElementById(id) { return id === 'game' ? canvas : fakeEl('div'); }, createElement(tag) { return fakeEl(tag); }, addEventListener() {} };
globalThis.localStorage = { _m: {}, setItem(k, v) { this._m[k] = String(v); }, getItem(k) { return this._m[k] ?? null; } };
globalThis.requestAnimationFrame = () => {};
globalThis.performance = performance;

const { default: _ } = await import('../src/main.js');
const game = window.game;

// generate 1000 NPCs
const N = 1000;
game.npcCount = N;
const t0 = performance.now();
game.newGame({ name: 'PerfTest', gender: 'm', skinTone: '#e8c39a', hairColor: '#4a3624', clothColor: '#7a6a4a', hairStyle: 0 });
const genMs = performance.now() - t0;
console.log(`Generated ${game.npcs.length} NPCs in ${genMs.toFixed(0)}ms`);
if (game.npcs.length < N) throw new Error(`expected ${N} NPCs, got ${game.npcs.length}`);

// warm up a few frames (schedule phases, spawns)
const dt = 1 / 60;
for (let i = 0; i < 30; i++) game.update(dt);

// measure update (simulation) over 300 frames
let updateTotal = 0, updateMax = 0;
for (let i = 0; i < 300; i++) {
  const s = performance.now();
  game.update(dt);
  const ms = performance.now() - s;
  updateTotal += ms; updateMax = Math.max(updateMax, ms);
}
const updateAvg = updateTotal / 300;

// measure render over 300 frames (culling + sort + draw)
const ctx = fakeCtx();
let renderTotal = 0, renderMax = 0;
for (let i = 0; i < 300; i++) {
  const s = performance.now();
  game.render(ctx);
  const ms = performance.now() - s;
  renderTotal += ms; renderMax = Math.max(renderMax, ms);
}
const renderAvg = renderTotal / 300;

console.log(`NPCs: ${game.npcs.length}`);
console.log(`update  avg ${updateAvg.toFixed(2)}ms  max ${updateMax.toFixed(2)}ms`);
console.log(`render  avg ${renderAvg.toFixed(2)}ms  max ${renderMax.toFixed(2)}ms`);

// Budgets: 60 fps = 16.6ms/frame. These headless numbers (fake canvas) are a
// lower bound on real cost; assert a generous ceiling to catch regressions.
const UPDATE_BUDGET = 12;
const RENDER_BUDGET = 12;
if (updateAvg > UPDATE_BUDGET) throw new Error(`update too slow: ${updateAvg.toFixed(2)}ms > ${UPDATE_BUDGET}ms`);
if (renderAvg > RENDER_BUDGET) throw new Error(`render too slow: ${renderAvg.toFixed(2)}ms > ${RENDER_BUDGET}ms`);

// verify background tier: with the player in the village, NPCs are near; when the
// player travels deep into the forest, nearly all NPCs fall back to the cheap
// background tier (no per-frame movement/pathfinding).
const nearInVillage = game.npcs.filter((n) => n.distTo(game.player) <= 900).length;
console.log(`near NPCs (in village): ${nearInVillage} / ${game.npcs.length}`);

game.player.x = 20 * 32; game.player.y = 100 * 32; // deep forest
const nearInForest = game.npcs.filter((n) => n.distTo(game.player) <= 900).length;
console.log(`near NPCs (player in deep forest): ${nearInForest} / ${game.npcs.length}`);
if (nearInForest > 50) throw new Error(`background tier did not engage: ${nearInForest} NPCs still near`);

console.log('NPC PERF TEST PASSED');
process.exit(0);
