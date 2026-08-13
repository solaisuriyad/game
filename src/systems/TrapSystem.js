// Traps & bait. Two trap types:
//   snare      — passively catches small game (rabbit/fox/bird) after a delay
//   bear_trap  — spring trap: damages + roots larger animals/monsters that step on it
// Bait (raw meat / berries) attracts nearby wildlife, boosting snare catch rate and
// luring animals into bear traps.
import { getItem } from '../data/index.js';

const SMALL_GAME = new Set(['rabbit', 'fox', 'bird']);
const LARGE_GAME = new Set(['boar', 'deer', 'goat', 'bear']);

export class TrapSystem {
  constructor(game) { this.game = game; }

  place(type) {
    const g = this.game;
    const p = g.player;
    const itemId = type === 'bear_trap' ? 'bear_trap' : 'trap';
    if (!g.inventory.removeItem(itemId, 1)) return { ok: false, message: `No ${itemId === 'bear_trap' ? 'bear trap' : 'snare'} in inventory.` };
    if (g.world.blockedAt(p.x, p.y) || g.world.nearestBuilding(p.x, p.y, 30)) {
      g.inventory.addItem(itemId, 1, { silent: true });
      return { ok: false, message: 'Cannot place a trap there.' };
    }
    if (g.traps.length > 12) { g.inventory.addItem(itemId, 1, { silent: true }); return { ok: false, message: 'Too many traps out.' }; }
    g.traps.push({
      type, x: p.x, y: p.y, armed: type !== 'snare', timer: type === 'snare' ? 10 : 0,
      bait: null, caught: null, sprung: false, durability: type === 'bear_trap' ? 3 : 1
    });
    g.audio.sfx('craft');
    return { ok: true, message: `${itemId === 'bear_trap' ? 'Bear trap' : 'Snare'} placed.` };
  }

  placeBait() {
    const g = this.game;
    const p = g.player;
    // find a nearby trap to bait, else place bait on the ground as a lure pile
    const trap = g.traps.find((t) => Math.hypot(t.x - p.x, t.y - p.y) < 40);
    if (trap) {
      let used = null;
      if (g.inventory.countItem('meat_raw') > 0) { g.inventory.removeItem('meat_raw', 1); used = 'meat_raw'; }
      else if (g.inventory.countItem('berries') > 0) { g.inventory.removeItem('berries', 1); used = 'berries'; }
      if (!used) return { ok: false, message: 'Bait a trap with raw meat or berries.' };
      trap.bait = used;
      trap.timer = Math.min(trap.timer, 4); // speed up
      return { ok: true, message: 'Baited the trap.' };
    }
    // ground bait pile (attracts animals)
    let used = null;
    if (g.inventory.countItem('meat_raw') > 0) { g.inventory.removeItem('meat_raw', 1); used = 'meat_raw'; }
    else if (g.inventory.countItem('berries') > 0) { g.inventory.removeItem('berries', 1); used = 'berries'; }
    else return { ok: false, message: 'Need raw meat or berries to bait.' };
    g.baitPiles.push({ x: p.x, y: p.y, kind: used, t: 60 });
    return { ok: true, message: 'Placed bait on the ground.' };
  }

  update(dt) {
    const g = this.game;
    // decay bait piles
    for (const b of g.baitPiles) b.t -= dt;
    g.baitPiles = g.baitPiles.filter((b) => b.t > 0);

    for (const t of g.traps) {
      if (t.caught || t.sprung) continue;

      // ---- bear trap: spring when a large animal/monster steps on it ----
      if (t.type === 'bear_trap') {
        const victim = this._springVictim(t);
        if (victim) {
          t.sprung = true; t.caught = victim;
          const dmg = victim.family ? 60 : 45;
          if (victim.family) g.combat.hitEntity(victim, dmg, {});
          else { victim.hp -= dmg; victim.flash = 0.1; if (victim.hp <= 0) { victim.dead = true; g.corpses.push({ x: victim.x, y: victim.y, def: victim.def, xp: victim.xp }); } }
          victim.addStatus('root', 3, 1);
          if (victim.family) victim.aggroTimer = 8; victim.target = g.player;
          g.audio.sfx('hit');
          g.addFloatText(t.x, t.y - 14, 'SNAP!', '#ff7a30');
        }
        continue;
      }

      // ---- snare: armed after a delay, then catches small game ----
      if (t.type === 'snare' && !t.armed) {
        t.timer -= dt;
        if (t.timer <= 0) t.armed = true;
        continue;
      }
      if (t.type === 'snare' && t.armed) {
        const prey = this._snarePrey(t);
        if (prey) {
          prey.dead = true;
          g.corpses.push({ x: prey.x, y: prey.y, def: prey.def, xp: prey.xp, trapped: true });
          t.caught = prey;
          g.addFloatText(t.x, t.y - 14, 'Caught!', '#9fe08a');
          g.audio.sfx('pickup');
        }
      }
    }
    // clean up spent bear traps (sprung and left) and snares with caught prey after a while
    g.traps = g.traps.filter((t) => {
      if (t.caught && t.type === 'snare') return false; // harvest the corpse instead
      if (t.sprung && !t.caught) return true;
      if (t.sprung && t.caught && !t.caught.dead) return true;
      return true;
    });
  }

  _springVictim(t) {
    const g = this.game;
    for (const a of g.animals) {
      if (a.dead || a.def.id === 'bird') continue;
      if (!LARGE_GAME.has(a.def.id) && a.def.id !== 'rabbit' && a.def.id !== 'fox') continue;
      if (a.distTo(t) < 22) return a;
    }
    for (const m of g.monsters) {
      if (m.dead) continue;
      if (m.distTo(t) < m.radius + 14) return m;
    }
    return null;
  }

  _snarePrey(t) {
    const g = this.game;
    let best = null, bd = 46;
    for (const a of g.animals) {
      if (a.dead || !SMALL_GAME.has(a.def.id)) continue;
      const d = a.distTo(t);
      if (d < bd) { bd = d; best = a; }
    }
    // bait draws prey in and greatly raises the catch radius
    if (t.bait) {
      if (best && bd < 90) return best;
      return null;
    }
    return bd < 46 ? best : null;
  }
}

// ensure getItem import is used (kept for future price/durability lookups)
void getItem;
