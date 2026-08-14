# 🌲 VERDANT HOLLOW — The Complete Guide
*Every button, every screen, every mechanic — nothing left out.*

---

## PART 1 — HOW TO START THE GAME (on your computer)

You already downloaded the ZIP and extracted it. To start it every time:

1. Open your **Terminal** (Mac/Linux) or **Command Prompt / PowerShell** (Windows).
2. Type `cd ` (with a space), then drag-and-drop the extracted game folder into the terminal and press **Enter**. (This "moves you into" the folder.)
3. Type one of these and press **Enter**:

```
npm start
```
or (if that fails, this always works — no install needed):
```
node server.js
```

4. You'll see a message like: `Verdant Hollow serving on http://0.0.0.0:3000`.
5. Open your web browser and type this in the address bar:
```
http://localhost:3000
```
6. The game loads. **Leave the terminal window open** — closing it stops the game.

> To stop the game later: click the terminal and press **Ctrl + C**.

---

## PART 2 — THE TITLE SCREEN

When the game opens you'll see **VERDANT HOLLOW** with these things:

1. **Name box** — click it and type your character's name.
2. **Body** — pick `male`, `female`, or `neutral` (the button highlights green when selected, and your character's figure + hair changes to match).
3. **Skin** — click a colored circle to choose skin tone.
4. **Hair color** — click a circle.
5. **Clothing** — click a circle.
6. Buttons:
   - **Begin Adventure** (gold) — start a NEW game.
   - **Play Online (co-op)** — start a new game and join the shared online world (needs friends on the same server).
   - **Continue** — load your most recent save.

---

## PART 3 — THE COMPLETE BUTTON / KEY LIST

### 🚶 Moving & looking
| Key | What it does |
|---|---|
| **W / ↑** | Walk up |
| **A / ←** | Walk left |
| **S / ↓** | Walk down |
| **D / →** | Walk right |
| **R (hold) + W/A/S/D** | **RUN** — move much faster (but it drains your stamina) |
| **X** | **FLY** — take off into the air (30s, up to 50ft). Press **X again to land**. **While airborne (above ~15ft) you're out of reach of ground monsters** — only flying dragons/dragonoids can hit you. |
| **Mouse** | Aim / look in a direction |

### ⚔️ Fighting
| Key / Mouse | What it does |
|---|---|
| **Left-click** | Light attack (swing weapon / shoot bow) |
| **Hold left-click, then release** | Heavy attack (stronger, slower, more stamina) |
| **Right-click (hold)** | Block (reduces damage to 25%, but drains stamina) |
| **Space** | Dodge (you briefly can't be hit, costs **3% stamina**) |

### 🥷 Stealth & tracking
| Key | What it does |
|---|---|
| **Shift (hold)** | Sneak — quieter, harder to detect, but slower |
| **Tab** | Toggle tracking ON/OFF (shows footprints + blood trails) |

### ✨ Active skills (pick up to 3)
| Key | What it does |
|---|---|
| **1 / 2 / 3** | Cast the skill in that slot (costs **MP**) |
| **O** | Open the skill screen to pick / change your 3 skills |

You **select up to 3 skills** — they appear on the bottom of the screen bound to keys **1, 2, 3**. The 8 skills to choose from:
- **Power Strike** (big melee hit) · **Arrow Storm** (3 arrows) · **Fire Blast** (burning projectile) · **Frost Nova** (freeze/slow enemies)
- **Healing Light** (+80 health) · **Second Wind** (+120 stamina) · **Stone Guard** (+10 defense) · **Swift Step** (+60% speed)

### 🪤 Traps & bait
| Key | What it does |
|---|---|
| **T** | Place a **Snare** (catches small animals: rabbit/fox/bird) |
| **Y** | Place a **Bear Trap** (wounds + holds big animals and monsters) |
| **G** | Place **bait** (raw meat or berries) — lures animals to it |

### 👋 Interacting
| Key | What it does |
|---|---|
| **E** | Interact with whatever is nearest (talk to villager, gather plant, harvest a dead animal, **step inside a building**, use a shrine) |

> **Step inside buildings** — press **E** on any building to walk inside. You now move around the room with **WASD** like anywhere else. Each room is **fully furnished** (tables, chairs, sofas, beds, shelves, fireplaces, rugs, curtains) and **walk up to a counter** (where the NPC works) and press **E** to interact — buy/sell at a shop, craft at the forge, take a job at the Guild, or drink from the well. **Walk back to the door** and press **E** (or press **Esc**) to step outside. The Guild even has a **Jobs counter** where the clerk greets you by level and assigns you work.

> **Sleeping** — at the **Inn**, walk to a bed and press **E**: you lie down and sleep, then wake at dawn fully rested. Your **Player Residence** bed works the same way.

> **The Temple** — a black shrine holding only the **Shiva Lingam**, lit by oil lamps. Walk up and press **E** to **pray** — the forest god fully restores your health, stamina and MP.

### 📖 Menus (each opens a full screen)
| Key | Menu | What it shows |
|---|---|---|
| **I** | Inventory | Your backpack items, weight, gold |
| **C** | Character | Your name, level, stats, records |
| **K** | Skills | Skill tree (spend skill points) |
| **J** | Quest Log | Your active quests (and co-op quests) |
| **M** | World Map | A detailed map showing **trees, resources, monsters, animals, buildings, the Yggdrasil and every zone**. **Scroll wheel** zooms in/out, **Ctrl + arrow keys** pan all 4 directions. |
| **⚙️ (top-right)** | Settings | Adjust sound effect, music, ambient and master volume with sliders. |
| **B** | Crafting | Recipes you can craft |
| **F** | Relationships | Villagers who know you + your reputation |
| **L** | Codex | The forest's secret history (lore) |
| **H** | How to Play | In-game help |
| **Esc** | Main Menu | Resume / Save / Load / Quit |

---

## PART 4 — THE SCREEN (HUD) EXPLAINED

### Top-left — your body's bars
- **Red bar** = Health (max **200**). Drops only from monster hits / starving / freezing. Slowly heals on its own when you're calm and fed.
- **Green bar** = Stamina (max **200**). Drains **very slowly** while running/attacking/gathering. Refills fast when you stand still.
- **Purple bar** = MP (max **200**). Powers your **active skills**. Drains very slowly, and **~95× slower while you're casting** a skill. When MP reaches **75%**, it recovers **50% faster**.
- **Orange bar** = Hunger. Drains **very slowly**. Eating refills it.
- **Blue bar** = Temperature. Drops at night and in rain.

> **Full regeneration:** stand still and do nothing for **5 seconds** and your **Stamina** refills to full within **1 minute**, and your **MP** refills to full within **1.5 minutes** (as long as you don't use skills). Low stamina never slows your movement — you can always run.

> **Drops & charms:** defeating monsters and chopping trees can drop **Orbs** (restore health/stamina/MP). Bosses drop rare **Charms** that keep a resource FULL for a few minutes (Health 2 min · MP 3 min · Stamina 4 min).

### Top-right — world info
- The **time** (e.g. `7:59 AM · Day 1`).
- The **weather** (Sunny / Rain / Fog / Storm) and **which zone** you're in.
- Your **gold** (money).
- Your **Guild Rank** and **Guild Points** (F → SSS).
- Your **reputation title** (Unknown → Newcomer → … → Village Legend).
- If online: how many hunters are in the world.

### Top-center
- Shows **"🏃 Running"** when you hold R, **"🕵️ Sneaking"** when you hold Shift, and **"👣 Tracking"** when you press Tab.

### Bottom-left — quest tracker
- Your current quests and their progress (e.g. `2/3`).

### Bottom-center
- Your **equipped weapon** and **backpack weight** (e.g. `Short Bow · 8.2/20 kg`).

### Bottom-right — minimap
- A small map with you as the **white dot**.

---

## PART 5 — THE TWO-CIRCLE WORLD

The world is laid out as **two circles**:

- **The town circle** (small) — your village. The 250 villagers, the shops, and your residence all live here.
- **The wild circle** (about 10× bigger) — centered on the **Yggdrasil**, the colossal world tree deep in the forest. All monsters live around it.

Monsters radiate outward from the Yggdrasil **by rank**: the **A+ dragonoids** guard the trunk, **S-rank dragons** circle just outside, and each lower rank sits farther out — B, C, D, E — until **F-rank** (slimes & goblins) forms the outermost edge, nearest the town. A dense forest separates the town from the monster territory, with a few low-rank stragglers roaming the safe forest for your first fights.

So the journey is: leave town → cross the dense forest → fight F-rank at the edge → push inward through E, D, C, B, S → and finally face the A+ dragonoids at the tree itself. *(Press M to see it all — the map marks the monster territory around the tree.)*

## PART 6 — HOW TO PLAY (the full journey)

### 1. Your first quest
- Press **J** to read it: *"Hunt 3 rabbits and bring their meat to the Guild."*
- Walk **out of the village** down the path into the forest.

### 2. Hunt animals
- Find an animal (rabbit 🐇, deer 🦌, fox 🦊, boar 🐗, goat 🐐, bear 🐻, bird 🐦).
- Approach, **aim with the mouse**, **click** to attack (or shoot with a bow).
- When it falls, press **E** to **harvest** it — you get meat, hide, bones, etc.

### 3. Track animals (advanced)
- Press **Tab** to turn on **Tracking Mode**.
- You'll see **footprints** (little dots with direction lines) animals leave behind.
- Wounded animals leave **red blood trails** — follow them to finish the hunt.
- Hold **Shift** to sneak so animals don't run away.

### 4. Set traps
- Press **T** to place a snare, **Y** for a bear trap.
- Press **G** to bait it (you need raw meat or berries in your bag).
- Wait — the trap catches animals for you!

### 5. Gather resources
- Press **E** on glowing things in the forest:
  - 🌿 **Herbs** (green) → healing herbs
  - 🍄 **Mushrooms** → food / stew
  - 🫐 **Berries** → food
  - 🌸 **Flowers** → gift for villagers
  - 🪨 **Rocks/Ore** → stone, copper, iron, silver, gold
  - 🌳 **Trees** → wood (press E on a tree). After chopping, you can **walk through that spot for 5 minutes**; the tree then regrows.

### 6. Fight monsters
- Deeper in the forest you'll meet **slimes, goblins, wolves, dire wolves, goblin shamans & brutes, giant spiders, treants, thorn beasts, shadow stalkers, cave trolls, venom wyrms, hell hounds, skeletons, swamp beasts, demon beasts, ancient beasts** — and bosses.
- 🌳 In the dense forest stands the **Yggdrasil** — a colossal tree of 9 shifting colors that powers the forest and its monsters. Yggdrasil Spriggans guard it.
- Light attack (click), heavy attack (hold + release), block (right-click), dodge (Space).
- Different monsters have different moves — wolves pounce, spiders shoot webs, treants slam roots, bosses have multiple phases!

### 7. Return to the village & turn in
- Walk back, find the **Adventure Guild** (labeled building), press **E**.
- **Submit materials** — each material gives Guild Points + gold.
- **Turn in quests** for big rewards.

### 8. Get stronger
- **Level up** (get XP from hunting/gathering/fighting) → earn **Skill Points**.
- Press **K** to learn skills (Hunting, Survival, Combat, Gathering, Crafting).
- **Buy weapons/armor** at the Weapon Shop and Armor Shop.
- **Craft** at the Blacksmith/Tailor/Carpenter/Crafting Area (press B).
- Higher **Guild Rank** unlocks deeper forest areas and better quests.

---

## PART 7 — THE VILLAGE BUILDINGS (what each one does)

| Building | What it does |
|---|---|
| 🏛️ **Adventure Guild** | Submit materials, accept & turn in quests (the main hub) |
| 🏹 **Hunter's Lodge** | Buy arrows, traps, knives, bandages |
| 🎒 **Adventure Gear Shop** | Buy armor, healing potions, orbs, charms & safety gear (torch, rope, compass, tent) |
| 🏥 **Healing Center** | Treat wounds — buy potions, orbs & charms, or rest to fully recover |
| 🛕 **Temple of the Forest God** | Pray at the **Shiva Lingam** inside to fully restore all stats |
| 🏫 **Village School** | Where the children learn — talk to the teacher or study for XP |
| 🛝 **Playground** | The village children play here |
| 🗼 **Watchtowers (×3)** | Guard towers around the town — climb to look out over the roads |
| ⚒️ **Blacksmith** | Craft & repair weapons |
| 🗡️ **Weapon Shop** | Buy swords, bows, spears, axes, hammers, daggers |
| 🛡️ **Armor Shop** | Buy armor (head, body, legs, feet) |
| 🏪 **General Store** | Buy & sell general goods |
| 🍞 **Food Shop** | Buy food |
| 🛏️ **Inn** | Rest (full heal, wake at dawn) |
| 🍺 **Tavern** | Hear rumors, order a drink |
| 🧺 **Farmer's Market** | Sell produce |
| 📦 **Storage** | (reserved for item storage) |
| 🏠 **Chief's House** | The village leader's home |
| 🌿 **Healer** | Buy potions & medicine |
| 🪵 **Carpenter** | Craft wooden gear |
| 🧵 **Tailor** | Craft armor & backpack upgrades |
| 🐴 **Stable** | (future use) |
| 🎯 **Training Ground** | Practice combat |
| 🚰 **Well** | Drink water (+hunger) |
| 🎪 **Community Hall** | Social hub |
| ⛩️ **Shrine** | Study it to learn the forest's lore |
| 🛡️ **Guard Post** | Village guards |
| 🔥 **Crafting Area** | Campfire — cook food, craft basic items |
| 🏡 **Player Residence** | Sleep to fully recover |

---

## PART 8 — MONSTER RANKS & DRAGONS

Monsters have a **rank** shown above their head: **F → E → D → C → B → A → S → A+**.

- **F-rank** = weak normal monsters (slimes, goblins).
- **E–B rank** = stronger beasts as you go deeper.
- **S-rank** = the elemental **Dragons** (Fire, Ice, Earth Dragon).
- **A+ rank** = the **Dragonoids** — dragon/human hybrids, extremely powerful (the final challenge).

### The hunt-and-upgrade loop
Every monster drops **meat** + a **rank Essence** + weapon-crafting materials (bones, fangs, dragon scales, dragon cores…).

- Holding the **previous rank's Essence** gives you **+35% damage** against the next rank — so hunting F-rank monsters makes E-rank easier, and so on.
- You *can* beat a monster without its counter-essence, but it takes more time and effort.
- High-rank materials forge powerful weapons at the **Blacksmith**: Fang Blade → Dragon Sword → Draconic Sword → the legendary **Dragonoid Blade**.

## PART 9 — SURVIVAL (don't die!)

- **Health** — **slowly heals on its own** when you're calm and well-fed. Drops from monster hits, and very slowly from starvation/cold. Potions and sleeping restore it instantly.
- **Hunger** — drains **very slowly** (it lasts a long time). Eat food (press **I**, click **Use**). It drains a bit faster while running, fighting, or working.
- **Stamina** — drains while **running** (hold R), attacking, dodging, blocking, and gathering. **Refills quickly when you stand still**.
- **Temperature** — drops at night and in rain/storms. Too cold = health loss. Stay warm or get indoors.
- **Weight** — your backpack has a limit (20 kg → up to 100 kg with upgrades). If you're over, you can't pick up more. Drop things (**I** → **Drop**) or sell them.

### Death
If you reach 0 health, a **"💀 YOU DIED" screen** appears showing **what killed you** and what you lost. After a moment you **wake up back in the village**. You lose some gold and some carried materials (and a little equipment durability), but you **keep your level, skills, guild rank, and progress**. It's a setback, not the end.

> **Note:** the screen shake right before the death screen is just the hit + death effect — you're being defeated by a monster or aggressive animal, not teleported by a bug.

---

## PART 10 — WEATHER & DAY/NIGHT

- **Day** — safer, villagers are out, normal animals.
- **Night** — shops close, dangerous monsters appear, rare creatures spawn, vision is limited.
- **Rain/Fog** — reduces visibility and makes tracking harder.
- **Storms** — can bring out rare monsters.

---

## PART 11 — TALKING TO VILLAGERS & GIFTS

- Walk up to a villager and press **E**.
- Options: **Chat** (they gossip about events), **Give gift** (they like certain items — hunters like meat, healers like herbs, children like apples/berries), **Goodbye**.
- Giving gifts raises your **relationship** with them (Stranger → Acquaintance → Friend → Trusted).
- Higher reputation (from helping people and slaying monsters near the village) gives better shop prices.

---

## PART 12 — THE ENDGAME (the secret history)

- Press **L** to open the **Codex** — it tracks the forest's hidden story (12 entries).
- Discover lore by: exploring new forest zones, finding **hidden ruins & a watchtower**, studying the **Shrine**, and **defeating bosses**.
- Find them all to uncover the complete history of the forest — the game's true ultimate goal.

---

## PART 13 — PLAYING WITH FRIENDS (co-op, optional)

- From the title screen press **"Play Online (co-op)"**.
- Friends on the same server do the same.
- You'll see each other in the same world, fight together, share quests, and face tougher bosses (bosses scale with party size).
- *(If it can't connect on your setup, that's a hosting thing — single-player always works.)*

---

## PART 14 — TROUBLESHOOTING

| Problem | Fix |
|---|---|
| Page won't load | Make sure the terminal shows `serving on http://0.0.0.0:3000`, then go to `http://localhost:3000` |
| Black screen | Refresh the page (F5). |
| No sound | Click anywhere on the page once (browsers require a click before sound). |
| Game froze | Press F5 to reload, then **Continue** (your save is kept). |
| Can't move | Click once on the game canvas first. |

---

**Good luck, hunter — the forest is waiting!** 🌲🏹
