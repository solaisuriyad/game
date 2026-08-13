import { getItem } from '../data/index.js';

// Shop stock by building function. sellFactor applies to player-sold goods.
const SHOP_STOCK = {
  general: { label: 'General Store', stock: ['bread', 'apple', 'bandage', 'arrow', 'trap', 'backpack'] },
  foodshop: { label: 'Food Shop', stock: ['bread', 'apple', 'meat_cooked', 'cooked_fish'] },
  weaponshop: { label: 'Weapon Shop', stock: ['sword_wood', 'sword_stone', 'sword_iron', 'bow_wood', 'bow_iron', 'spear_wood', 'spear_iron', 'axe_iron', 'dagger_iron'] },
  armorshop: { label: 'Armor Shop', stock: ['cloth_shirt', 'cloth_pants', 'leather_vest', 'leather_legs', 'hood', 'iron_chest', 'iron_legs', 'boots_leather', 'boots_iron'] },
  healer: { label: 'Healer', stock: ['potion_small', 'potion_big', 'bandage', 'herb'] }
};

const SELLABLE = new Set(['material', 'food', 'consumable', 'tool', 'weapon', 'armor']);

export class EconomySystem {
  constructor(game) { this.game = game; }

  shopFor(func) { return SHOP_STOCK[func] || null; }

  buyPrice(itemId) {
    const item = getItem(itemId);
    if (!item) return 0;
    const p = this.game.player;
    const discount = this.repDiscount();
    return Math.max(1, Math.round(item.value * (1 - discount)));
  }
  sellPrice(itemId) {
    const item = getItem(itemId);
    if (!item) return 0;
    const p = this.game.player;
    const bonus = this.repDiscount() * 0.5;
    return Math.max(1, Math.round(item.value * (0.5 + bonus)));
  }
  // higher reputation = better prices (up to 20% off buys)
  repDiscount() {
    const rep = this.game.player.reputation;
    return Math.min(0.2, (rep / 100) * 0.2);
  }

  buy(itemId, qty = 1) {
    const p = this.game.player;
    const price = this.buyPrice(itemId) * qty;
    if (p.gold < price) return { ok: false, message: 'Not enough gold.' };
    const res = this.game.inventory.addItem(itemId, qty);
    if (!res.ok) return res;
    p.gold -= price;
    this.game.audio.sfx('pickup');
    return { ok: true, message: `Bought ${qty}x ${getItem(itemId).name} for ${price}g.` };
  }
  sell(itemId, qty = 1) {
    const item = getItem(itemId);
    if (!item || !SELLABLE.has(item.category)) return { ok: false, message: 'This shop won\'t buy that.' };
    if (this.game.inventory.countItem(itemId) < qty) return { ok: false, message: 'Not enough.' };
    const price = this.sellPrice(itemId) * qty;
    this.game.inventory.removeItem(itemId, qty);
    this.game.player.gold += price;
    this.game.audio.sfx('pickup');
    return { ok: true, message: `Sold ${qty}x ${item.name} for ${price}g.` };
  }
}
