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
    SkillSystem.js  CraftingSystem.js  EconomySystem.js
    GuildSystem.js  QuestSystem.js  RelationshipSystem.js
    ReputationSystem.js  EventSystem.js  DialogueSystem.js
    SaveSystem.js
  ui/
    HUD.js  MenuManager.js  Minimap.js  DialogueBox.js  TitleScreen.js
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
- **Near (in view / < radius):** full sim — pathfind, animate, schedule transitions.
- **Mid:** update schedule state + position at low frequency (0.5–1 Hz), no pathfinding.
- **Far/background:** abstract sim — only timestamps + schedule phase, no position.

This is what lets ~1000 NPCs coexist with a 60 fps game, and maps directly to
server interest management in co-op.

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

## 6. Co-op architecture (designed; Phase 5+)

- Authoritative Node server (WebSocket): owns enemy/NPC/world-event/combat/loot/quest
  state; clients own input + prediction + interpolation.
- Replication with interest management: only NPCs near a player are fully synced; far NPCs
  are abstract (mirrors the single-player simulation tiers).
- Individual progression (client/account) vs. shared world progression (server).
- Boss scaling: difficulty table keyed by party size adding mechanics, not just HP.

## 7. Extensibility

Add a new **monster/animal/item/weapon/quest/recipe/skill/ability/building/NPC occupation**
by adding one data record. Add a new **system** by registering an `update`/event handler
on the engine. This is the core "expandable, data-driven" promise of the design.
