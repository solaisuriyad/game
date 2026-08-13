# Verdant Hollow

An open-world **hunting / survival / adventure RPG** with a living village and a dangerous forest — built as a data-driven, modular browser game (vanilla JavaScript ES modules + HTML5 Canvas, no build step, no runtime dependencies).

The core loop: **explore → hunt → gather → survive → return → submit to the Guild → earn points & rank → upgrade → push deeper → face stronger monsters.**

> Design docs: [`docs/GDD.md`](docs/GDD.md), [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), [`docs/ROADMAP.md`](docs/ROADMAP.md)

## Run it

```bash
npm start          # or: node server.js
```

Then open the live preview (server binds `0.0.0.0:3000`).

## Controls

| Input | Action |
|---|---|
| WASD / arrows | Move |
| Mouse | Aim |
| Click (release) | Light attack (hold & release for **heavy**) |
| Right-click (hold) | Block |
| Space | Dodge |
| Shift (hold) | **Sneak** (quieter, harder to detect — use cover & approach from behind) |
| Tab | Toggle **tracking** (footprint direction + blood trails) |
| T · Y · G | Place snare · place bear trap · bait (raw meat/berries) |
| E | Interact (gather / harvest / talk / buildings) |
| I · C · K · J · M · B · R | Inventory · Character · Skills · Quests · Map · Craft · Relationships |
| Esc | Menu (save / load / help / quit) |

## What's implemented (MVP vertical slice)

- **World** — procedural 200×200 tilemap: village (31 buildings), roads, farms, river, pond, forest with **5 danger zones** (Safe → Deep → Dark → Ancient → Forbidden), each visually distinct and gated by guild rank.
- **Living village** — ~65 procedurally generated NPCs with **families, spouses, friendships & rivalries**, day/night schedules, socializing, background simulation tiers, and gossip about your deeds.
- **Hunting & wildlife** — 7 animal species with wander/eat/flee/predator AI, footprint & blood-trail tracking, corpse harvesting.
- **Stealth, tracking & traps** — sneak (crouch), vision cones, line-of-sight through trees, noise-based detection & monster investigation, directional footprint/blood tracking mode, snare + bear traps with bait attraction.
- **Monsters** — 11 types (slime, goblin, wolf packs, giant spider, treant, skeleton, swamp beast, demon beast, ancient beast + 4 **phased bosses**: Alpha Wolf, Ancient Bear, Forest Guardian, Ancient Dragon) with a modular **Ability System** (lunge, pounce, web shot, howl, root slam, regenerate, rage, charge, roar, ground slam, tail swipe, fire/ice breath, summon, bleeds) and adaptive AI.
- **Combat** — light/heavy attacks, block, dodge (i-frames), stamina, crits, weapon durability, 3 weapon classes (sword/bow/spear + axe/hammer/dagger).
- **Survival** — health, stamina, hunger, temperature, energy/rest; day/night cycle and dynamic weather (rain, fog, storm) that affect gameplay.
- **Inventory & weight** — capacity 20→100 kg, meaningful carry decisions.
- **Guild progression** — submit materials for Guild Points + gold + XP; ranks F→SSS.
- **Quests** — hunt / kill / gather / explore / boss quests with progress tracking.
- **Crafting & economy** — recipes (cooking, arrows, potions, weapons, armor, bags), station gating, shops with reputation-based prices.
- **NPC relationships & reputation** — -100..+100 relationships, gifts, memories, village-defense favor, village reputation titles.
- **Random events** — caravan, rare sighting, monster attack, injured hunter (NPCs gossip about them).
- **Death system** — respawn with gold/material/durability penalties, progression kept.
- **Save/load** — 3 slots, localStorage, versioned schema.
- **Co-op (Phases 5–8)** — authoritative WebSocket server (`server/`): server-owned player movement + replication, **server-authoritative monsters** (AI, combat, deaths, individual loot), **boss scaling by party size** (+HP/+damage/tighter ability cooldowns), **shared kill/boss quests** (whole party contributes & is rewarded), and **shared world events** (raids, migrations, rare sightings) that NPCs gossip about consistently. Interest management syncs only nearby entities. Single-player remains fully offline.
- **UI** — HUD (bars, clock, minimap, compass, quest tracker), full-screen menus, dialogue, world map with fog-of-war.

## Tests

```bash
npm test                  # both
node test/smoke.mjs       # headless single-player (world gen, systems, combat, stealth, traps, save/load)
node test/coop.mjs        # end-to-end networking (join, replication, interest management)
```

## Co-op

`npm start` serves the game **and** runs the authoritative server on the same port
(WebSocket on `/ws`). The in-game **"Play Online (co-op)"** button connects to
`ws(s)://<host>/ws`. The server is authoritative for player positions and only
replicates players within interest range. **Note:** your hosting/proxy must forward
WebSocket upgrades (works directly on `localhost`; some sandboxed preview proxies
don't — in that case the button reports "could not connect").

## Architecture

Modular systems (`src/systems/*`) wired through a `Game` orchestrator + `EventBus`.
All content is **data-driven** (`src/data/*`) — add NPCs, items, weapons, monsters,
abilities, quests, recipes, skills, and buildings as data records, not code.

```
src/
  core/      engine, input, camera, RNG, event bus, audio
  data/      items, weapons, armor, animals, monsters, abilities, skills, recipes, quests, buildings, npcData, dialogue
  world/     WorldSystem (tilemap/collision/zones), TimeSystem, WeatherSystem, MapRenderer
  entities/  Entity, Player, Animal, Monster, NPC, Drop, Projectile
  ai/        AnimalBrain, MonsterBrain, AbilitySystem, NPCSchedule
  systems/   Inventory, Equipment, Combat, Hunting, Gathering, Survival, Skills, Crafting,
             Economy, Guild, Quest, Relationship, Reputation, Event, Dialogue, Save, Interact, Population
  ui/        HUD, MenuManager, style
```

## Roadmap (designed, not yet built)

Server-authoritative animals/resources (to bring hunt/gather quests into co-op), ~1000-NPC
scale, handcrafted story beats. See `docs/ROADMAP.md`.
