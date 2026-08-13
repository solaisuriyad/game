// Active combat/survival skills — the player chooses up to 3 at the start (and
// can change them anytime with O). Each costs MP and has a cooldown.
// `kind`: offense | support | mobility. `cast` is handled in ActiveSkillSystem.
export const ACTIVE_SKILLS = [
  { id: 'power_strike', name: 'Power Strike', kind: 'offense', mpCost: 25, cooldown: 6, color: '#ff8a5a',
    desc: 'A mighty blow that hits all nearby enemies for massive damage.' },
  { id: 'arrow_storm', name: 'Arrow Storm', kind: 'offense', mpCost: 20, cooldown: 5, color: '#c8a06a',
    desc: 'Fire three arrows in a spreading fan.' },
  { id: 'fire_blast', name: 'Fire Blast', kind: 'offense', mpCost: 35, cooldown: 8, color: '#ff5030',
    desc: 'Hurl a burning projectile that sets enemies on fire.' },
  { id: 'frost_nova', name: 'Frost Nova', kind: 'offense', mpCost: 30, cooldown: 9, color: '#8ac8ff',
    desc: 'Freeze and slow all nearby enemies.' },
  { id: 'healing_light', name: 'Healing Light', kind: 'support', mpCost: 30, cooldown: 10, color: '#6fe06f',
    desc: 'Restore 80 health.' },
  { id: 'second_wind', name: 'Second Wind', kind: 'support', mpCost: 15, cooldown: 10, color: '#7ac8ff',
    desc: 'Restore 120 stamina.' },
  { id: 'stone_guard', name: 'Stone Guard', kind: 'support', mpCost: 25, cooldown: 12, color: '#b8b8c8',
    desc: '+10 defense for 8 seconds.' },
  { id: 'swift_step', name: 'Swift Step', kind: 'mobility', mpCost: 15, cooldown: 8, color: '#c8e06a',
    desc: '+60% move speed for 6 seconds.' }
];

export const ACTIVE_SKILL_BY_ID = Object.fromEntries(ACTIVE_SKILLS.map((s) => [s.id, s]));
