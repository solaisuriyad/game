// Headless smoke test: stub the DOM and drive the game a few frames.
import { performance } from 'node:perf_hooks';

const gradient = { addColorStop() {} };
function fakeCtx() {
  return new Proxy({}, {
    get(t, k) {
      if (k === 'createImageData') return (w, h) => ({ data: new Uint8ClampedArray((w || 1) * (h || 1) * 4), width: w || 1, height: h || 1 });
      if (k === 'createRadialGradient' || k === 'createLinearGradient') return () => gradient;
      if (k === 'measureText') return () => ({ width: 10 });
      if (k === 'getImageData') return (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) });
      return () => {};
    },
    set(t, k, v) { t[k] = v; return true; }
  });
}
function fakeEl(tag = 'div') {
  const el = {
    tagName: tag.toUpperCase(), children: [], style: {}, _html: '', value: '', width: 0, height: 0,
    className: '', dataset: {},
    innerHTML: '',
    appendChild(c) { el.children.push(c); return c; },
    addEventListener() {}, removeEventListener() {},
    querySelectorAll() { return []; }, querySelector() { return null; },
    getContext() { return fakeCtx(); },
    getBoundingClientRect() { return { left: 0, top: 0, width: 800, height: 600 }; },
    setAttribute() {}
  };
  Object.defineProperty(el, 'innerHTML', { get() { return el._html; }, set(v) { el._html = v; } });
  return el;
}
const canvas = fakeEl('canvas');
canvas.width = 800; canvas.height = 600;

globalThis.window = {
  innerWidth: 800, innerHeight: 600,
  addEventListener() {}, removeEventListener() {},
  AudioContext: undefined, webkitAudioContext: undefined
};
globalThis.document = {
  getElementById(id) { return id === 'game' ? canvas : fakeEl('div'); },
  createElement(tag) { return fakeEl(tag); },
  addEventListener() {}
};
globalThis.localStorage = { _m: {}, setItem(k, v) { this._m[k] = String(v); }, getItem(k) { return this._m[k] ?? null; }, removeItem(k) { delete this._m[k]; } };
globalThis.requestAnimationFrame = () => {};
globalThis.performance = performance;

const { default: _ } = await import('../src/main.js');
const game = window.game;
if (!game) throw new Error('window.game not set');

console.log('State:', game.state);
game.newGame({ name: 'Testa', gender: 'female', skinTone: '#e8c39a', hairColor: '#4a3624', clothColor: '#7a6a4a', hairStyle: 0 });
console.log('After newGame: state=', game.state, 'npcs=', game.npcs.length, 'animals=', game.animals.length, 'monsters=', game.monsters.length, 'nodes=', game.world.nodes.length, 'buildings=', game.world.buildings.length);

// run 600 frames (~10s)
const dt = 1 / 60;
for (let i = 0; i < 600; i++) game.update(dt);
console.log('Simulated 10s OK. player pos=', Math.round(game.player.x), Math.round(game.player.y), 'zone=', game.world.getZoneName(game.player.x, game.player.y));
console.log('clock=', game.time.clock, 'weather=', game.weather.state);

// exercise a render
const ctx = fakeCtx();
game.render(ctx);
console.log('render OK');

// exercise menus quickly
game.ui.openMenu('inventory'); game.ui.openMenu('character'); game.ui.openMenu('skills');
game.ui.openMenu('guild'); game.ui.openMenu('crafting'); game.ui.openMenu('map');
game.ui._renderMainMenu(); game.ui.close();
console.log('menus OK');

// exercise save/load
game.save.save(0);
const r = game.save.load(0);
console.log('save/load:', r.message);

// exercise combat-ish: damage an animal, kill it
const a = game.animals.find((x) => !x.dead);
if (a) { game.combat.hitEntity(a, 999, {}); console.log('killed animal -> corpses=', game.corpses.length); }
const c = game.corpses[0];
if (c) { const h = game.hunting.harvestCorpse(c); console.log('harvest:', h.message); }

// guild submit
game.inventory.addItem('hide_deer', 3, { silent: true });
console.log('submit:', game.guild.submit('hide_deer').message);

console.log('ALL SMOKE TESTS PASSED');
