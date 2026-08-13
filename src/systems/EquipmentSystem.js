import { getItem } from '../data/index.js';

export class EquipmentSystem {
  constructor(game) { this.game = game; }

  equip(id) {
    const item = getItem(id);
    const p = this.game.player;
    if (!item) return { ok: false, message: 'Unknown item' };
    if (item.category === 'weapon') {
      const prev = p.weapon;
      p.weapon = item;
      this.game.inventory.removeItem(id, 1);
      if (prev) this.game.inventory.addItem(prev.id, 1, { silent: true });
      this.game.bus.emit('equipmentChanged');
      return { ok: true, message: `Equipped ${item.name}.` };
    }
    if (item.category === 'armor') {
      const prev = p.armor[item.slot];
      p.armor[item.slot] = item;
      this.game.inventory.removeItem(id, 1);
      if (prev) this.game.inventory.addItem(prev.id, 1, { silent: true });
      this.game.bus.emit('equipmentChanged');
      return { ok: true, message: `Equipped ${item.name}.` };
    }
    return { ok: false, message: 'Not equippable.' };
  }

  unequipWeapon() {
    const p = this.game.player;
    if (!p.weapon) return;
    this.game.inventory.addItem(p.weapon.id, 1, { silent: true });
    p.weapon = null;
    this.game.bus.emit('equipmentChanged');
  }
  unequipArmor(slot) {
    const p = this.game.player;
    if (!p.armor[slot]) return;
    this.game.inventory.addItem(p.armor[slot].id, 1, { silent: true });
    p.armor[slot] = null;
    this.game.bus.emit('equipmentChanged');
  }
}
