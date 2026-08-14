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
const { VILLAGE_CX, VILLAGE_CY } = await import('../src/world/WorldSystem.js');
const game = window.game;
if (!game) throw new Error('window.game not set');

console.log('State:', game.state);
game.npcCount = 100; // keep smoke test fast; NPC scale is covered by npc-perf.mjs
game.newGame({ name: 'Testa', gender: 'female', skinTone: '#e8c39a', hairColor: '#4a3624', clothColor: '#7a6a4a', hairStyle: 0 });
console.log('After newGame: state=', game.state, 'npcs=', game.npcs.length, 'animals=', game.animals.length, 'monsters=', game.monsters.length, 'nodes=', game.world.nodes.length, 'buildings=', game.world.buildings.length);

// families / NPC↔NPC relationships
const families = new Set(game.npcs.filter((n) => n.familyId).map((n) => n.familyId));
const spouses = game.npcs.filter((n) => n.spouseId).length;
const linked = game.npcs.filter((n) => Object.keys(n.npcRelations).length > 0).length;
console.log('families=', families.size, 'married NPCs=', spouses, 'NPCs with a relation=', linked);
if (families.size === 0) throw new Error('no families generated');
if (spouses === 0) throw new Error('no spouses generated');

// boss + zones present
const bosses = game.monsters.filter((m) => m.boss);
console.log('bosses present=', bosses.map((b) => b.name).join(', '));
if (!game.monsters.find((m) => m.def.id === 'forest_guardian')) throw new Error('forest guardian not spawned');
if (!game.monsters.find((m) => m.def.id === 'ancient_dragon')) throw new Error('ancient dragon not spawned');

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

// boss phase transition test
const guardian = game.monsters.find((m) => m.def.id === 'forest_guardian');
const baseAbilities = guardian.abilities.length;
guardian.hp = guardian.maxHp * 0.6; // below 0.7 threshold
guardian.update(1 / 60, game);
console.log('guardian phaseIndex=', guardian.phaseIndex, 'abilities=', guardian.abilities.length, 'color=', guardian.color);
if (guardian.phaseIndex !== 1) throw new Error('boss did not advance phase');
if (guardian.abilities.length === baseAbilities) throw new Error('boss abilities did not change');
// summon ability works
const before = game.monsters.length;
game.abilities.execute(guardian, 'summon', { summonId: 'spider', count: 2, range: 0 }, game);
console.log('summon spawned', game.monsters.length - before, 'minions');

// long simulation: stay in village (socializing), then push through every zone (gating + monster brains)
const dt2 = 1 / 60;
let sawSocializing = false;
for (let i = 0; i < 3600; i++) {
  if (i === 1500) { game.player.x = (VILLAGE_CX + 110) * 32; game.player.y = VILLAGE_CY * 32; }  // Deep Forest
  if (i === 2100) { game.player.x = (VILLAGE_CX + 175) * 32; game.player.y = VILLAGE_CY * 32; }  // Dark Forest
  if (i === 2700) { game.player.x = (VILLAGE_CX + 340) * 32; game.player.y = VILLAGE_CY * 32; }  // Ancient Forest
  game.update(dt2);
  if (i < 1500 && game.npcs.some((n) => n.chatting > 0)) sawSocializing = true;
}
console.log('cross-zone sim OK. final zone=', game.world.getZoneName(game.player.x, game.player.y), 'monsters=', game.monsters.length);
console.log('zone-gating triggered (warnedZone=', game._warnedZone, '):', game._warnedZone >= 1);
console.log('NPCs socialized near the village:', sawSocializing);

// ---- stealth / traps / tracking ----
// stealth reduces detection radius; crouching lowers it further
const wolf = game.monsters.find((m) => m.def.id === 'wolf' && !m.dead);
if (wolf) {
  game.player.x = wolf.x + 100; game.player.y = wolf.y;
  game.player.moving = true; game.player.crouching = false;
  const rStand = game.stealth.detectionRadius(wolf, 200);
  game.player.crouching = true;
  const rCrouch = game.stealth.detectionRadius(wolf, 200);
  console.log('stealth radius: standing=', rStand.toFixed(0), 'crouching=', rCrouch.toFixed(0));
  if (!(rCrouch < rStand)) throw new Error('crouching did not reduce detection radius');
  // line of sight blocked by trees
  if (typeof game.world.hasLineOfSight !== 'function') throw new Error('no hasLineOfSight');
}
// traps: place snare + bear trap + bait (use open forest ground — no buildings,
// water or trees — where placement is always valid)
let spot = null;
for (let i = 0; i < 50 && !spot; i++) {
  const c = game.world.randomPosition(35, 45);
  if (!game.world.blockedAt(c.x, c.y)) spot = c;
}
game.player.x = spot.x; game.player.y = spot.y;
game.inventory.addItem('trap', 2, { silent: true });
game.inventory.addItem('bear_trap', 1, { silent: true });
game.inventory.addItem('meat_raw', 3, { silent: true });
const pSnare = game.trapSystem.place('snare');
const pBear = game.trapSystem.place('bear_trap');
const pBait = game.trapSystem.placeBait();
console.log('traps:', pSnare.message, '|', pBear.message, '|', pBait.message);
if (!pSnare.ok || !pBear.ok || !pBait.ok) throw new Error('trap placement failed');
if (game.traps.length < 2) throw new Error('traps not recorded');
// bear trap springs on a large animal
const boar = game.animals.find((a) => a.def.id === 'boar' && !a.dead);
if (boar && game.traps.some((t) => t.type === 'bear_trap')) {
  const bt = game.traps.find((t) => t.type === 'bear_trap');
  boar.x = bt.x; boar.y = bt.y;
  game.trapSystem.update(1 / 60);
  console.log('bear trap sprung:', bt.sprung, 'boar rooted:', boar.hasStatus('root'));
  if (!bt.sprung) throw new Error('bear trap did not spring on boar');
}

// ---- 3-resource system (Health/Stamina/MP at 200% + drops) ----
if (game.player.maxHealth !== 200 || game.player.maxStamina !== 200 || game.player.maxMp !== 200) throw new Error('resources not at 200% capacity');
const mpBefore = game.player.mp;
game.inventory.addItem('mana_orb', 1, { silent: true });
game.player.mp = 100;
game.inventory.useItem('mana_orb');
if (game.player.mp !== 150) throw new Error('mana orb did not restore MP');
game.inventory.addItem('holy_stamina', 1, { silent: true });
game.inventory.useItem('holy_stamina');
if (game.player.buffs.staminaHold !== 240) throw new Error('charm buff not applied');
console.log('resources: 200% capacity + orbs + charms OK');

// ---- resources: 200% capacity + orbs + charms OK ----

// ---- regression: attack must not permanently block recovery ----
// (attackWindup previously never decayed, which left the player stuck
//  "attacking" forever and blocked all stamina/MP/health regen)
const p2 = game.player;
// isolate the player from combat: move to the safe village + clear monsters
p2.x = VILLAGE_CX * 32; p2.y = VILLAGE_CY * 32;
game.monsters = [];
game.combat._recentCombat = 0;
// reset to a clean idle state so earlier test steps don't interfere
p2.attackWindup = 0.6; p2.charging = false; p2.blocking = false; p2.dodgeTimer = 0;
p2.working = 0; p2.sprinting = false; p2.moving = false; p2.castingSkill = 0;
for (let i = 0; i < 120; i++) game.update(1 / 60); // 2 seconds (attackWindup decays)
if (p2.attackWindup > 0) throw new Error('attackWindup did not decay (recovery permanently blocked)');
p2.stamina = 30; p2.mp = 198;
for (let i = 0; i < 600; i++) game.update(1 / 60); // 10 seconds idle
if (!p2.recovering) throw new Error('recovery did not engage after attacking + idling');
if (p2.stamina <= 30) throw new Error('stamina not recovering after attack');
console.log('regression: attack-then-recover OK (stamina ' + p2.stamina.toFixed(0) + ', mp ' + p2.mp.toFixed(0) + ')');

// ---- lore / forest history ----
game.player.x = VILLAGE_CX * 32 + 16; game.player.y = VILLAGE_CY * 32 + 16; // back in village
game.lore.discover('lore_shrine');
console.log('lore after shrine:', game.lore.count(), 'of', game.lore.total());
if (!game.lore.has('lore_shrine')) throw new Error('shrine lore not discovered');
// zone entry unlock
game.lore.onZone('Deep Forest');
if (!game.lore.has('lore_deep')) throw new Error('deep forest lore not unlocked');
// boss kill unlock
game.lore.onBossKill('forest_guardian');
if (!game.lore.has('lore_guardian')) throw new Error('guardian lore not unlocked');
// completion: discovering all other entries unlocks the final history entry
import('../src/data/lore.js').then(({ LORE }) => {
  for (const l of LORE) if (l.id !== 'lore_history') game.lore.discover(l.id, { silent: true });
  console.log('lore total after full discovery:', game.lore.count(), '/', game.lore.total(), '| history unlocked:', game.lore.has('lore_history'));
  if (!game.lore.has('lore_history')) throw new Error('final history entry did not unlock');
  // save/load preserves lore
  game.save.save(0);
  game.lore.discovered.clear();
  game.save.load(0);
  console.log('lore after reload:', game.lore.count());
  if (game.lore.count() === 0) throw new Error('lore did not persist through save/load');
  console.log('ALL SMOKE TESTS PASSED');
  process.exit(0);
});
