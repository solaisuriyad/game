# Verdant Hollow — Development Roadmap

## Priority phases (per spec §69)

| Phase | Scope | Status |
|---|---|---|
| 1 | Single-player core gameplay | ✅ MVP in this repo |
| 2 | Monster AI + unique abilities | ✅ state machine, modular abilities, adaptive AI, **phased bosses** |
| 3 | NPC relationship + memory + reputation | ✅ relationships (−100..+100), memory, gifts, reputation, village-defense favor |
| 4 | Village social simulation | ✅ families, NPC↔NPC links, socializing, gossip about the player |
| 5 | Co-op networking foundation | ⬜ designed |
| 6 | Co-op player sync | ⬜ designed |
| 7 | Co-op combat + monster scaling | ⬜ designed |
| 8 | Co-op quests, loot, world events | ⬜ designed |
| 9 | 1000-NPC optimization | ⬜ designed (sim tiers already implemented) |
| 10 | Multiplayer stress test | ⬜ |

## MVP milestone breakdown (what is built now)

**M1 — Framework & world** ✅
- Fixed-timestep engine, input, camera, event bus, seeded RNG, audio hooks.
- Procedural tilemap: village + roads + forest, zones 1–2, buildings, colliders.

**M2 — Player & movement** ✅
- Name entry + customization, movement, stamina, stats.

**M3 — NPC simulation** ✅
- Generated NPCs (names/occupations/appearance), schedule state machine, background sim.

**M4 — Animals, hunting, gathering** ✅
- 6 species with behavior, corpse harvesting, tracking trails, resource nodes.

**M5 — Combat & monsters** ✅
- Light/heavy/block/dodge, 3 weapon classes, 5 monster types, ability system, XP.

**M6 — Inventory/equipment/crafting/economy** ✅
- Weighted inventory, equipment tiers, recipes, shops (buy/sell).

**M7 — Guild, quests, progression, skills** ✅
- Material submission, rank F→SSS, quests, leveling, skill points/tree.

**M8 — Survival, time, weather, events** ✅
- Hunger/temp/rest, day/night, weather effects, random events.

**M9 — UI, map, save/load, death** ✅
- HUD, menus, minimap + world map w/ fog, multi-slot save, death penalties.

## Next steps (recommended order)

1. Traps, sneak/stalk depth, full tracking (stealth).
2. Co-op (Phase 5+) behind an authoritative server.
3. 1000-NPC scale test + audio/music polish.
4. More handcrafted quests & village story beats (the forest's history).
