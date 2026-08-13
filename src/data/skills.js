// Skill tree. Each skill: { id, tree, name, desc, tier, cost, effects }
// effects are applied by SkillSystem (flat bonuses / multipliers).
export const SKILLS = [
  // Hunting
  { id: 'h_track', tree: 'hunting', tier: 0, name: 'Sharp Eyes', desc: '+15% tracking range.', cost: 1, effects: { trackingRange: 0.15 } },
  { id: 'h_animal_dmg', tree: 'hunting', tier: 1, name: 'Beast Slayer', desc: '+10% damage vs animals.', cost: 1, effects: { animalDamage: 0.1 } },
  { id: 'h_harvest', tree: 'hunting', tier: 2, name: 'Swift Skinning', desc: '+25% harvesting speed.', cost: 1, effects: { harvestSpeed: 0.25 } },
  { id: 'h_loot', tree: 'hunting', tier: 2, name: 'Field Dressing', desc: '+15% loot from animals.', cost: 2, effects: { lootChance: 0.15 } },
  // Survival
  { id: 's_hunger', tree: 'survival', tier: 0, name: 'Forager', desc: 'Hunger drains 15% slower.', cost: 1, effects: { hungerRate: -0.15 } },
  { id: 's_stamina', tree: 'survival', tier: 1, name: 'Endurance', desc: 'Stamina regenerates 20% faster.', cost: 1, effects: { staminaRegen: 0.2 } },
  { id: 's_heal', tree: 'survival', tier: 1, name: 'Field Medic', desc: '+25% healing from food/potions.', cost: 1, effects: { healBonus: 0.25 } },
  { id: 's_resist', tree: 'survival', tier: 2, name: 'Hardened', desc: '+10% damage resistance.', cost: 2, effects: { damageResist: 0.1 } },
  // Combat
  { id: 'c_strong', tree: 'combat', tier: 0, name: 'Heavy Blows', desc: '+10% melee damage.', cost: 1, effects: { meleeDamage: 0.1 } },
  { id: 'c_fast', tree: 'combat', tier: 1, name: 'Swift Strikes', desc: '+12% attack speed.', cost: 1, effects: { attackSpeed: 0.12 } },
  { id: 'c_dodge', tree: 'combat', tier: 1, name: 'Dodge Mastery', desc: 'Dodge costs 25% less stamina.', cost: 1, effects: { dodgeCost: -0.25 } },
  { id: 'c_crit', tree: 'combat', tier: 2, name: 'Precision', desc: '+8% critical chance.', cost: 2, effects: { critChance: 0.08 } },
  // Gathering
  { id: 'g_yield', tree: 'gathering', tier: 0, name: 'Gatherer', desc: '+20% resource yield.', cost: 1, effects: { gatherYield: 0.2 } },
  { id: 'g_detect', tree: 'gathering', tier: 1, name: 'Resource Sense', desc: 'Rare resources highlighted farther away.', cost: 1, effects: { detectRange: 0.5 } },
  { id: 'g_speed', tree: 'gathering', tier: 1, name: 'Quick Hands', desc: '+20% gathering speed.', cost: 1, effects: { gatherSpeed: 0.2 } },
  // Crafting
  { id: 'cr_weapons', tree: 'crafting', tier: 0, name: 'Apprentice Smith', desc: 'Unlock basic weapon recipes.', cost: 1, effects: { recipes: ['sword_stone', 'spear_iron'] } },
  { id: 'cr_armor', tree: 'crafting', tier: 1, name: 'Leatherworker', desc: 'Unlock armor recipes.', cost: 1, effects: { recipes: ['leather_vest', 'leather_legs'] } },
  { id: 'cr_rare', tree: 'crafting', tier: 2, name: 'Master Crafter', desc: 'Unlock rare recipes.', cost: 2, effects: { recipes: ['potion_big'] } }
];
