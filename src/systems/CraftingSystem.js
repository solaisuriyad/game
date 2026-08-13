import { RECIPES } from '../data/recipes.js';
import { getItem } from '../data/index.js';

export class CraftingSystem {
  constructor(game) { this.game = game; }

  canCraft(recipe) {
    const p = this.game.player;
    if (!this.game.inventory.hasItems(recipe.inputs)) return { ok: false, reason: 'Missing materials.' };
    // station requirement
    if (recipe.station && recipe.station !== 'crafting') {
      const b = this.game.world.buildingCenterByFunc(recipe.station);
      if (!b || Math.hypot(b.x - p.x, b.y - p.y) > 160) {
        return { ok: false, reason: `Requires the ${this.stationName(recipe.station)} station.` };
      }
    }
    // recipe unlock (some need skills)
    return { ok: true };
  }
  stationName(s) {
    return { blacksmith: 'Blacksmith', tailor: 'Tailor', carpenter: 'Carpenter', herbalist: 'Herbalist', crafting: 'Crafting Area' }[s] || s;
  }
  craft(recipe) {
    const check = this.canCraft(recipe);
    if (!check.ok) return { ok: false, message: check.reason };
    const g = this.game;
    g.inventory.consumeItems(recipe.inputs);
    for (const out of recipe.outputs) g.inventory.addItem(out.id, out.qty, { silent: true });
    g.addXP(8 + (recipe.outputs[0].id === 'potion_small' || recipe.outputs[0].qty > 2 ? 10 : 0));
    g.audio.sfx('craft');
    g.bus.emit('crafted', { recipe });
    const outName = getItem(recipe.outputs[0].id).name;
    return { ok: true, message: `Crafted ${outName}!` };
  }
  // recipes available to player right now (input availability ignored)
  availableRecipes() {
    const unlocked = this.game.skills.unlockedRecipes();
    return RECIPES.filter((r) => {
      if (unlocked.includes(r.id)) return true;
      // core recipes always available
      return ['cook_meat', 'cook_fish', 'stew', 'arrows', 'bandage', 'potion_small'].includes(r.id);
    });
  }
}
