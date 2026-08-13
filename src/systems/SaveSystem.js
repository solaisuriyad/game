import { getItem } from '../data/index.js';
import { WORLD_W, WORLD_H } from '../world/WorldSystem.js';

const PREFIX = 'verdant-hollow:';
const SCHEMA = 1;

// localStorage may be unavailable in sandboxed contexts; fall back to memory.
const _mem = {};
function storage() {
  try { localStorage.setItem('__t', '1'); localStorage.removeItem('__t'); return localStorage; }
  catch (e) { return { getItem: (k) => _mem[k] ?? null, setItem: (k, v) => { _mem[k] = String(v); } }; }
}

export class SaveSystem {
  constructor(game) { this.game = game; this._ls = storage(); }

  listSlots() {
    const out = [];
    for (let i = 0; i < 3; i++) {
      const raw = this._ls.getItem(PREFIX + i);
      if (raw) {
        try {
          const d = JSON.parse(raw);
          out.push({ slot: i, name: d.player.name, level: d.player.level, day: d.time.day, ts: d.ts });
        } catch (e) { out.push({ slot: i, name: '(corrupt)', level: 0, day: 0, ts: 0 }); }
      }
    }
    return out;
  }

  save(slot) {
    const g = this.game;
    const p = g.player;
    const data = {
      schema: SCHEMA,
      ts: Date.now(),
      player: {
        name: p.name, gender: p.gender, hairStyle: p.hairStyle, hairColor: p.hairColor,
        skinTone: p.skinTone, clothColor: p.clothColor,
        x: p.x, y: p.y, level: p.level, xp: p.xp, xpNext: p.xpNext, skillPoints: p.skillPoints,
        learnedSkills: p.learnedSkills, baseStats: p.baseStats,
        health: p.health, maxHealth: p.maxHealth, stamina: p.stamina, maxStamina: p.maxStamina,
        mp: p.mp, maxMp: p.maxMp, buffs: p.buffs,
        hunger: p.hunger, temperature: p.temperature, energy: p.energy,
        gold: p.gold, guildPoints: p.guildPoints, reputation: p.reputation,
        backpackLevel: p.backpackLevel, kills: p.kills, animalsHunted: p.animalsHunted,
        weapon: p.weapon ? p.weapon.id : null,
        armor: Object.fromEntries(Object.entries(p.armor).map(([k, v]) => [k, v ? v.id : null])),
        inventory: p.inventory.map((it) => ({ id: it.id, qty: it.qty }))
      },
      time: g.time.serialize(),
      weather: g.weather.serialize(),
      quests: g.quests.serialize(),
      lore: g.lore.serialize(),
      events: g.events.recent,
      discovered: this._encodeDiscovered(),
      npcs: g.npcs.filter((n) => n.relationship !== 0 || n.metPlayer).map((n) => ({
        id: n.id, relationship: n.relationship, met: n.metPlayer, memory: n.memory
      }))
    };
    this._ls.setItem(PREFIX + slot, JSON.stringify(data));
    return { ok: true, message: `Saved to slot ${slot + 1}.` };
  }

  load(slot) {
    const raw = this._ls.getItem(PREFIX + slot);
    if (!raw) return { ok: false, message: 'No save in this slot.' };
    const d = JSON.parse(raw);
    const g = this.game;
    const p = g.player;
    const pl = d.player;
    Object.assign(p, {
      name: pl.name, gender: pl.gender, hairStyle: pl.hairStyle, hairColor: pl.hairColor,
      skinTone: pl.skinTone, clothColor: pl.clothColor,
      x: pl.x, y: pl.y, level: pl.level, xp: pl.xp, xpNext: pl.xpNext, skillPoints: pl.skillPoints,
      learnedSkills: pl.learnedSkills, baseStats: pl.baseStats,
      health: pl.health, maxHealth: pl.maxHealth, stamina: pl.stamina, maxStamina: pl.maxStamina,
      hunger: pl.hunger, temperature: pl.temperature, energy: pl.energy,
      gold: pl.gold, guildPoints: pl.guildPoints, reputation: pl.reputation,
      backpackLevel: pl.backpackLevel || 0, kills: pl.kills, animalsHunted: pl.animalsHunted
    });
    p.weapon = pl.weapon ? getItem(pl.weapon) : null;
    p.armor = {};
    for (const [k, v] of Object.entries(pl.armor)) p.armor[k] = v ? getItem(v) : null;
    p.inventory = pl.inventory.map((it) => ({ id: it.id, qty: it.qty }));
    // migration: 200% capacity for the 3 core resources + MP/buffs (new fields)
    p.maxHealth = Math.max(p.maxHealth || 0, 200);
    p.maxStamina = Math.max(p.maxStamina || 0, 200);
    p.maxMp = pl.maxMp || 200;
    p.mp = pl.mp ?? p.maxMp;
    p.health = Math.min(p.health, p.maxHealth);
    p.stamina = Math.min(p.stamina, p.maxStamina);
    p.buffs = pl.buffs || { healthHold: 0, staminaHold: 0, manaHold: 0 };

    g.time.deserialize(d.time);
    g.weather.deserialize(d.weather);
    g.quests.deserialize(d.quests);
    if (d.lore) g.lore.deserialize(d.lore);
    g.events.recent = d.events || [];
    this._decodeDiscovered(d.discovered);

    const relMap = {};
    for (const n of d.npcs || []) relMap[n.id] = n;
    for (const npc of g.npcs) {
      const r = relMap[npc.id];
      if (r) { npc.relationship = r.relationship; npc.metPlayer = r.met; npc.memory = r.memory || []; }
    }
    // reset transient entities + repopulate the world (animals/monsters aren't saved)
    if (g.npcs.length === 0) g.sim.generate();
    else g.sim.resetPopulation();
    g.bus.emit('load');
    g.state = 'playing';
    g.paused = false;
    return { ok: true, message: `Loaded save slot ${slot + 1}.` };
  }

  hasSlot(slot) { return !!this._ls.getItem(PREFIX + slot); }

  _encodeDiscovered() {
    const d = this.game.world.discovered;
    let s = '';
    for (let i = 0; i < d.length; i++) s += String.fromCharCode(d[i]);
    return btoa(s);
  }
  _decodeDiscovered(b64) {
    if (!b64) return;
    const s = atob(b64);
    const d = this.game.world.discovered;
    for (let i = 0; i < d.length && i < s.length; i++) d[i] = s.charCodeAt(i);
  }
}
