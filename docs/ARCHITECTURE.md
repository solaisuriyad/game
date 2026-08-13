# Verdant Hollow — Architecture

## 1. Tech stack & why

- **Vanilla JavaScript (ES modules) + HTML5 Canvas 2D.** No build step, no runtime CDN
  dependency, zero install friction, and it runs in the live preview. This maximizes
  "actually playable" over "impressive but unrunnable."
- **Node static file server** (`server.js`) — serves the game, binds `0.0.0.0` for preview.
- **localStorage** for save slots (swap-in for a server/DB in co-op later).
- Data lives in plain JS modules (`src/data/*`) so content is data-driven and editable.

## 2. Module map

```
src/
  main.js                 # bootstrap: create systems, start engine
  core/                   # framework (no game logic)
    Engine.js             # fixed-timestep loop, update/render
    Input.js              # keyboard/mouse state
    Camera.js             # world->screen transform, culling
    EventBus.js           # pub/sub decoupling
    RNG.js                # seeded random helpers
    AudioManager.js       # procedural ambience + sfx hooks
  data/                   # DATA-DRIVEN content (no game logic)
    names.js  items.js  weapons.js  armor.js  animals.js  monsters.js
    abilities.js  skills.js  recipes.js  quests.js  buildings.js
    npcData.js  dialogue.js
  world/
    WorldSystem.js        # tilemap, zones, buildings, spawns, colliders
    MapRenderer.js        # tiles + painter's-algorithm entity draw
    TimeSystem.js         # day/night clock, schedules, events
    WeatherSystem.js      # weather state machine
  entities/
    Entity.js  Player.js  Animal.js  Monster.js  NPC.js
    ResourceNode.js  Drop.js  Projectile.js
  ai/
    StateMachine.js  AnimalBrain.js  MonsterBrain.js
    AbilitySystem.js  NPCSchedule.js
  systems/
    InventorySystem.js  EquipmentSystem.js  CombatSystem.js
    HuntingSystem.js  GatheringSystem.js  SurvivalSystem.js
    StealthSystem.js  TrapSystem.js  SkillSystem.js  CraftingSystem.js
    EconomySystem.js  GuildSystem.js  QuestSystem.js  RelationshipSystem.js
    ReputationSystem.js  EventSystem.js  DialogueSystem.js  SaveSystem.js
  net/
    NetworkClient.js  MultiplayerSystem.js
  entities/
    ...  RemotePlayer.js
  ui/
    HUD.js  MenuManager.js
server/
  ws.js            # dependency-free RFC6455 WebSocket server
  game-server.js   # authoritative sim + replication + interest management
```

## 3. Key architectural decisions

### Game loop (fixed timestep)
`Engine` accumulates `requestAnimationFrame` time and steps a fixed `dt` (1/60 s) for
determinism, then renders once. Systems subscribe to an `EventBus` and to an `update(dt)`
tick from the engine. This keeps combat/netcode-friendly determinism later.

### Data-driven content
Every item/weapon/monster/ability/quest/recipe/NPC-archetype is a record in `src/data`.
Systems read these records; **no individual NPC, item, or monster is hardcoded in code**.
NPCs are *instantiated* from archetype tables + name/occupation generators.

### Entity & component-lite
`Entity` carries transform, sprite, stats, and behavior. Brains (`AnimalBrain`,
`MonsterBrain`, `NPCSchedule`) drive state machines attached to entities rather than
giant class hierarchies. This is the seam where co-op replication will attach later.

### NPC simulation tiers (perf, and co-op interest management)
- **Near (in view / < 900px):** full sim — move, socialize, schedule transitions.
- **Far/background:** cheap update — distance check only; positions snap at schedule
  phase boundaries (no per-frame movement/pathfinding).

This is what lets ~1000 NPCs coexist with a 60 fps game (verified: 1000 NPCs
generate in ~30ms and simulate at ~3ms/frame), and maps directly to server
interest management in co-op. Supporting optimizations: **spatial render culling**
(only entities in view are sorted/drawn) and **bulk position pooling** (a precomputed
shuffled pool of walkable village tiles instead of per-NPC collision search).

### Server scaling (Phase 10)
The server tick is instrumented (`GameServer.lastTickMs`). At 200 concurrent clients
it holds ~25ms/tick against a 50ms budget (~17k msg/s); the dominant cost is the
O(n²) interest-management pass, which is the known scaling boundary to address if
more than a few hundred concurrent players are ever needed.

### Ability system
Monsters hold an array of `Ability` definitions (targeting rule, cooldown, cast window,
effect list). `AbilitySystem` resolves them against the monster's AI state. Adding a new
monster ability = add one record in `abilities.js` + reference it in `monsters.js`.

### Combat
`CombatSystem` resolves hit tests, damage, knockback, status effects, crits, and stamina
costs; it emits events (`onDamage`, `onDeath`, `onKill`). Hunting/guild/quest systems
*listen* to those events rather than being called — keeps systems decoupled.

### Save system
`SaveSystem` serializes a snapshot object (player, inventory, guild, quests, relationships,
reputation, discovered tiles, time/weather, world events) as JSON to localStorage per slot.
Versioned with a `schemaVersion` for migrations. In co-op, "player progression" is
client-owned, "world progression" is server-owned — the same snapshot is already split
along those lines (see `SaveSystem`).

## 4. Data models (core)

- **Item:** `{id, name, category, rarity, weight, value, guildValue, tags, effects}`
- **Weapon:** `{id, tier, type, damage, speed, range, crit, durability, weight, effects}`
- **Armor:** `{id, tier, slot, defense, durability, weight, effects}`
- **Animal:** `{id, name, zones, hp, speed, drops, behavior, aggression, size}`
- **Monster:** `{id, family, zones, level, stats, abilities[], lootTable, xp, aiProfile}`
- **Ability:** `{id, category, target, range, cooldown, cast, effects[], aiUse}`
- **NPCArchetype:** `{occupation, schedule, homes, skills, wealth, personalityPool}`
- **Recipe:** `{id, inputs[], outputs[], station, skillRequirement}`
- **Quest:** `{id, type, title, text, objectives[], rewards, giver, repeatable}`
- **Building:** `{id, type, rect, name, function, interior}`
- **Skill:** `{id, tree, tier, name, desc, effects, cost}`

## 5. NPC / AI architecture

```
NPCSchedule (clock -> phase)
  -> decides destination (home / work / social / market)
  -> spawns a PathRequest (A*-lite on tile grid) when near the player
  -> near: full behavior (walk, idle anim, interact) / far: timer-tick only

AnimalBrain  : idle | wander | eat | drink | flee | (predator) hunt | dead
MonsterBrain : idle | wander | patrol | investigate | detect | chase | attack |
               useAbility | defend | flee | callAllies | return | enrage | dead
```

Both brains read an `aiProfile` (aggression, courage, territorial, pack, nocturnal,
ambush, adaptive flags) so behavior differs per species without per-species code.

## 6. Co-op architecture (Phases 5–8 implemented)

- Authoritative Node server (WebSocket on `/ws`, `server/ws.js` + `server/game-server.js` +
  `server/monster-sim.js` + `server/quest-state.js` + `server/world-events.js`):
  - **Players** — owns positions (integrates client inputs, world-collision-clamped),
    replicates state snapshots at 20 Hz with interest management.
  - **Monsters** (Phase 7) — owns monster positions, AI (nearest-player targeting, chase,
    full ability set incl. dash/projectile/AoE/summon), health, boss phases, deaths, and
    loot. Clients send attack intents; the server validates range/facing and resolves
    damage, deaths, and individual loot (assigned to the killer).
  - **Boss scaling** (§61) — bosses scale by party size: +50% HP and +25% damage per extra
    player, and ability cooldowns tighten (more mechanics pressure), not just bigger numbers.
  - **Shared quests** (Phase 8, `server/quest-state.js`) — server owns kill/boss objective
    progress (monsters are authoritative); all connected players contribute and are all
    rewarded on completion. Hunt/gather objectives remain client-side until animals and
    resource nodes are server-authoritative (Phase 9 scope).
  - **Shared world events** (Phase 8, `server/world-events.js`) — server-driven raids,
    migrations, and rare sightings broadcast to every player; spawned monsters replicate
    via the monster-state channel.
- **NPC/world-state sync** — shared world events feed each client's village `events.recent`,
  so every player's NPCs gossip about the same happenings (consistent shared world feel).
  Individual NPC relationships remain client-owned (§62).
- Client (`src/net/` + `entities/RemoteMonster.js`): client-side prediction for own movement,
  interpolated remote players/monsters; in co-op the client stops simulating local monsters
  and renders server-authoritative ones instead.

### Known limitation (documented)
Monster→player damage is **server-authored** (amount + status), but mitigation (block/dodge/
defense) is applied client-side in this iteration; full server-side mitigation validation is
a later refinement. Damage *values* from player attacks run client-side (character
progression is client-owned, per §54) but are server-validated for range/facing and applied
authoritatively.

## 7. Extensibility

Add a new **monster/animal/item/weapon/quest/recipe/skill/ability/building/NPC occupation**
by adding one data record. Add a new **system** by registering an `update`/event handler
on the engine. This is the core "expandable, data-driven" promise of the design.
