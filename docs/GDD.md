# Verdant Hollow — Game Design Document (v1.0)

**Working title:** Verdant Hollow
**Genre:** Open-world survival / hunting / adventure RPG with village life-simulation
**Platform:** Browser (desktop), single-player MVP with designed co-op path
**Target feel:** *"I can go deeper and get better rewards — but I might not survive."*

---

## 1. Pillars (design principles)

1. **A living world** — the village and forest keep moving whether or not the player is looking.
2. **Risk/reward pressure** — every decision is "push deeper or return safely."
3. **Systemic emergence** — behavior comes from interacting systems, not scripted sequences.
4. **Respect the player's time** — death and failure are meaningful but never erase progression.
5. **Data-driven** — new NPCs, items, monsters, and quests are added as data, not code.

---

## 2. Core loop

```
Wake up → prepare → check guild → buy supplies → enter forest
→ explore → track → hunt → gather → manage stamina/hunger/weight
→ fight stronger enemies → decide: deeper or home? → return
→ submit to guild → points/money/rank → upgrade → learn skills
→ accept harder quests → explore deeper → repeat (rising difficulty)
```

## 3. World structure

One interconnected world:

| Region | Content | Difficulty |
|---|---|---|
| Main Village | ~30 buildings (guild, lodge, shops, farms, well, shrine, houses) | Safe |
| Zone 1 — Safe Forest | rabbits, deer, fox, herbs, wood, berries, mushrooms, slimes | Low |
| Zone 2 — Deep Forest | boar, wolves, goblins, rare plants, iron | Mid |
| Zone 3 — Dark Forest | giant spiders, predators, poison, night spawns | High |
| Zone 4 — Ancient Forest | treants, ancient beasts, mythril | Very high |
| Zone 5 — Forbidden Forest | legendary monsters, bosses, secrets | End-game |

Zones are gated by guild rank (F→E→D→C→B→A→S→SS→SSS) and visually distinct.

## 4. Village & NPC simulation

- ~30 houses + public buildings; **~1000 NPCs** at full scale (50–100 in MVP).
- Every NPC: name, age, appearance, clothing, occupation, personality, schedule,
  home, relationships, skills, wealth, likes/dislikes.
- Occupations: hunters, farmers, smiths, merchants, shopkeepers, guards, carpenters,
  tailors, fishermen, cooks, healers, herbalists, miners, woodcutters, stable hands,
  teachers, children, elders, tavern workers, guild staff, adventurers, travelers, laborers.
- **Schedule:** Morning (wake→eat→work) → Afternoon (occupation) → Evening (return→
  shop/socialize) → Night (sleep). Hunters leave the village during the day.

## 5. Player character

- New game asks **"Enter your character name"** then customization: gender/body type,
  hair style, hair color, skin tone, starting clothing.
- Starts weak: basic weapon, basic clothing, small backpack (20 kg), a little food,
  basic hunting tools, Rank F, low stats.

## 6. Systems summary

- **Hunting** — track (footprints/blood), sneak, aim, attack, chase, traps, harvest.
- **Combat** — light/heavy attack, dodge, block, stamina, crits, durability, weaknesses, skills.
- **Monster Ability System** — modular abilities (offensive/defensive/CC/mobility),
  unique species identity, AI state machine, territory, limited adaptive behavior,
  boss phases (non-trivial mechanics, not just HP).
- **Resources** — animal / forest / monster / mining materials, each with rarity, value,
  weight, crafting use, guild value.
- **Inventory & weight** — capacity 20→30→45→60→80→100 kg.
- **Guild** — submit materials for points/money/XP/rank; hunting/monster/gathering/
  delivery/rescue/exploration/boss/daily/weekly quests.
- **Progression** — stats (HP, stamina, str, agi, def, acc, crit, hunting, tracking,
  gathering, crafting), skill tree (hunting/survival/combat/gathering/crafting).
- **Equipment tiers** — Wood→Stone→Iron→Steel→Silver→Gold→Mythril→Legendary.
- **Crafting** — weapons, armor, tools, traps, potions, food, arrows, backpack upgrades.
- **Survival** — health, stamina, hunger, temperature, rest, weight, durability.
- **Day/night** — different spawns, shops open/closed, NPC schedules, night-only materials.
- **Weather** — sunny/cloudy/rain/heavy rain/fog/storm; affects visibility, tracking, spawns.
- **Economy** — supply/demand-informed prices; buy/sell.
- **Relationships** — -100..+100, memory, types (friend/family/rival/professional/trust/
  respect/fear/hostility), NPC↔NPC relationships, reputation (Unknown→…→Village Legend).
- **Quests** — procedural + handcrafted, generated from the NPC simulation.
- **Bosses** — phased, unique mechanics, rare loot.
- **Random events** — lost traveler, injured hunter, monster attack, rare sighting,
  caravan, bandits, migration, forest fire.
- **Death** — respawn in village, lose some carried materials + money + durability, keep
  major progression.

## 7. UI

- HUD: health, stamina, hunger, temperature, time, current quest, minimap, compass,
  equipped weapon, weight.
- Menus: inventory, character, skills, equipment, map, quest log, guild rank, crafting,
  relationships.

## 8. Multiplayer (designed, Phase 5+)

- Optional 2–4 player co-op over an authoritative server; solo remains fully supported.
- Individual vs. world progression, party system, downed/revive, fair loot, co-op quests,
  boss scaling by party size, per-player NPC relationships, interest management so 1000
  NPCs are never all synchronized.

## 9. Audio & art

- Environmental ambience (birds, wind, leaves, river, rain, animals, monsters, village,
  forge, market, tavern), contextual music (village/forest/combat/boss/night/danger/explore).
- Stylized fantasy, high readability, atmospheric lighting, distinct silhouettes.

---

## 10. MVP vertical slice (implemented in this repo)

- 1 village (~30 buildings placed; ~60 NPCs), 2 forest zones, 6 animal species,
  5 monster types, 3 weapon classes (sword/bow/spear), combat, hunting, gathering,
  inventory+weight, guild + points + ranks, quests, character progression, day/night,
  weather, basic economy, NPC relationships + reputation, save/load (multi-slot).
- Multiplayer, 1000-NPC scale, zones 3–5, full boss suite: on the roadmap.

See `ARCHITECTURE.md` and `ROADMAP.md` for the technical design and milestone plan.
