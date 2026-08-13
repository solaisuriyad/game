// Modular monster ability definitions. `kind` selects a resolver in AbilitySystem.
// Kinds:
//   melee_basic  : close-range strike (optional poison/bleed)
//   lunge        : dash toward target + contact damage
//   throw_rock   : projectile (damage)
//   web_shot     : projectile (damage + slow/root)
//   pounce       : leap to target + damage
//   bleeding_bite: melee + bleed
//   howl         : call nearby allies
//   root_slam    : AoE around self (damage + knockback)
//   regenerate   : heal self
//   rage         : self buff (damage up)
export const ABILITIES = {
  melee_basic: { category: 'offensive', label: 'Strike', windup: 0.3, active: 0.2 },
  lunge: { category: 'mobility', label: 'Lunge', windup: 0.3, active: 0.25 },
  throw_rock: { category: 'offensive', label: 'Rock Toss', windup: 0.4, active: 0.1 },
  web_shot: { category: 'crowd-control', label: 'Web Shot', windup: 0.4, active: 0.1 },
  pounce: { category: 'mobility', label: 'Pounce', windup: 0.35, active: 0.25 },
  bleeding_bite: { category: 'offensive', label: 'Bleeding Bite', windup: 0.35, active: 0.2 },
  howl: { category: 'utility', label: 'Howl', windup: 0.6, active: 0.2 },
  root_slam: { category: 'offensive', label: 'Root Slam', windup: 0.6, active: 0.25 },
  regenerate: { category: 'defensive', label: 'Regenerate', windup: 0.8, active: 0.2 },
  rage: { category: 'defensive', label: 'Rage', windup: 0.5, active: 0.2 }
};
