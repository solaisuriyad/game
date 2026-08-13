import { getItem, itemWeight } from '../data/index.js';

const CAPACITIES = [20, 30, 45, 60, 80, 100]; // kg by backpack level

export class InventorySystem {
  constructor(game) {
    this.game = game;
  }
  get inv() { return this.game.player.inventory; }
  backpackLevel() { return this.game.player.backpackLevel; }
  capacity() { return CAPACITIES[this.backpackLevel()]; }
  weight() {
    let w = 0;
    for (const it of this.inv) w += itemWeight(it.id) * it.qty;
    return w;
  }
  countItem(id) {
    let n = 0;
    for (const it of this.inv) if (it.id === id) n += it.qty;
    return n;
  }
  addItem(id, qty = 1, opts = {}) {
    const item = getItem(id);
    if (!item) return { ok: false, message: 'Unknown item' };
    const stackable = item.category !== 'weapon' && item.category !== 'armor';
    const addW = itemWeight(id) * qty;
    if (!opts.silent && this.weight() + addW > this.capacity()) {
      return { ok: false, message: 'Backpack is full — drop something first.' };
    }
    if (stackable) {
      const slot = this.inv.find((it) => it.id === id);
      if (slot) slot.qty += qty;
      else this.inv.push({ id, qty });
    } else {
      for (let i = 0; i < qty; i++) this.inv.push({ id, qty: 1 });
    }
    this.game.bus.emit('inventoryChanged');
    return { ok: true };
  }
  removeItem(id, qty = 1) {
    for (let i = this.inv.length - 1; i >= 0 && qty > 0; i--) {
      if (this.inv[i].id === id) {
        const take = Math.min(this.inv[i].qty, qty);
        this.inv[i].qty -= take; qty -= take;
        if (this.inv[i].qty <= 0) this.inv.splice(i, 1);
      }
    }
    this.game.bus.emit('inventoryChanged');
    return qty <= 0;
  }
  hasItems(inputs) {
    for (const inp of inputs) if (this.countItem(inp.id) < inp.qty) return false;
    return true;
  }
  consumeItems(inputs) {
    for (const inp of inputs) this.removeItem(inp.id, inp.qty);
  }
  // use a consumable / food / tool (returns message)
  useItem(id) {
    const item = getItem(id);
    if (!item) return { ok: false, message: 'Unknown item' };
    const p = this.game.player;
    if (item.category === 'food') {
      p.hunger = Math.min(100, p.hunger + (item.hunger || 0));
      if (item.heal && item.heal > 0) p.health = Math.min(p.maxHealth, p.health + item.heal);
      if (item.heal && item.heal < 0) p.health = Math.max(1, p.health + item.heal);
      this.removeItem(id, 1);
      this.game.audio.sfx('eat');
      return { ok: true, message: `Ate ${item.name}.` };
    }
    if (item.category === 'consumable') {
      if (item.heal) {
        const bonus = 1 + (this.game.skills.getEffect('healBonus') || 0);
        p.health = Math.min(p.maxHealth, p.health + Math.round(item.heal * bonus));
      }
      this.removeItem(id, 1);
      return { ok: true, message: `Used ${item.name}.` };
    }
    if (item.id === 'backpack') {
      if (p.backpackLevel >= CAPACITIES.length - 1) return { ok: false, message: 'Backpack is already maxed.' };
      p.backpackLevel++;
      this.removeItem(id, 1);
      return { ok: true, message: `Backpack upgraded to ${CAPACITIES[p.backpackLevel]} kg!` };
    }
    return { ok: false, message: 'That item cannot be used.' };
  }
}
