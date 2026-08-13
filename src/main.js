import { Engine } from './core/Engine.js';
import { Input } from './core/Input.js';
import { Camera } from './core/Camera.js';
import { EventBus } from './core/EventBus.js';
import { AudioManager } from './core/AudioManager.js';
import { WorldSystem, TILE, PX_W, PX_H, VILLAGE_CX, VILLAGE_CY } from './world/WorldSystem.js';
import { TimeSystem } from './world/TimeSystem.js';
import { WeatherSystem } from './world/WeatherSystem.js';
import { MapRenderer } from './world/MapRenderer.js';
import { Player } from './entities/Player.js';
import { Animal } from './entities/Animal.js';
import { Monster } from './entities/Monster.js';
import { Drop } from './entities/Drop.js';
import { Projectile } from './entities/Projectile.js';
import { AbilitySystem } from './ai/AbilitySystem.js';
import { animalBrain } from './ai/AnimalBrain.js';
import { monsterBrain } from './ai/MonsterBrain.js';
import { npcBrain } from './ai/NPCSchedule.js';
import { PopulationSystem } from './systems/PopulationSystem.js';
import { InventorySystem } from './systems/InventorySystem.js';
import { EquipmentSystem } from './systems/EquipmentSystem.js';
import { CombatSystem } from './systems/CombatSystem.js';
import { HuntingSystem } from './systems/HuntingSystem.js';
import { GatheringSystem } from './systems/GatheringSystem.js';
import { SurvivalSystem } from './systems/SurvivalSystem.js';
import { SkillSystem } from './systems/SkillSystem.js';
import { CraftingSystem } from './systems/CraftingSystem.js';
import { EconomySystem } from './systems/EconomySystem.js';
import { GuildSystem } from './systems/GuildSystem.js';
import { QuestSystem } from './systems/QuestSystem.js';
import { RelationshipSystem } from './systems/RelationshipSystem.js';
import { ReputationSystem } from './systems/ReputationSystem.js';
import { EventSystem } from './systems/EventSystem.js';
import { DialogueSystem } from './systems/DialogueSystem.js';
import { SaveSystem } from './systems/SaveSystem.js';
import { InteractSystem } from './systems/InteractSystem.js';
import { HUD } from './ui/HUD.js';
import { MenuManager } from './ui/MenuManager.js';
import { ITEM_DB, WEAPON_DB, ARMOR_DB, getItem } from './data/index.js';
import { ABILITIES } from './data/abilities.js';

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.audio = new AudioManager();
    this.bus = new EventBus();
    this.input = Input;

    this.world = new WorldSystem();
    this.time = new TimeSystem();
    this.weather = new WeatherSystem();
    this.camera = new Camera(canvas.width, canvas.height, PX_W, PX_H);

    // entity arrays
    this.animals = []; this.monsters = []; this.npcs = [];
    this.corpses = []; this.drops = []; this.projectiles = [];
    this.traps = []; this.floatTexts = []; this.toasts = [];

    // entity classes exposed for systems that spawn
    this.AAnimal = Animal; this.AMonster = Monster; this.DDrop = Drop; this.PProjectile = Projectile;
    this.items = new Map([...Object.entries(ITEM_DB), ...Object.entries(WEAPON_DB), ...Object.entries(ARMOR_DB)]);
    this.abilitiesData = ABILITIES;
    this.abilities = new AbilitySystem();
    this.ai = { animal: animalBrain, monster: monsterBrain, npc: npcBrain };

    // systems
    this.inventory = new InventorySystem(this);
    this.equipment = new EquipmentSystem(this);
    this.combat = new CombatSystem(this);
    this.hunting = new HuntingSystem(this);
    this.gathering = new GatheringSystem(this);
    this.survival = new SurvivalSystem(this);
    this.skills = new SkillSystem(this);
    this.crafting = new CraftingSystem(this);
    this.economy = new EconomySystem(this);
    this.guild = new GuildSystem(this);
    this.quests = new QuestSystem(this);
    this.relationship = new RelationshipSystem(this);
    this.reputation = new ReputationSystem(this);
    this.events = new EventSystem(this);
    this.dialogue = new DialogueSystem(this);
    this.save = new SaveSystem(this);
    this.interact = new InteractSystem(this);
    this.sim = new PopulationSystem(this);

    this.renderer = new MapRenderer(this);
    this.hud = new HUD(this);
    this.ui = new MenuManager(this);

    this.player = null;
    this.state = 'title';
    this.paused = false;

    this._resize();
    Input.attach(canvas);
    window.addEventListener('resize', () => this._resize());
    canvas.addEventListener('mousedown', () => this.audio.resume());
    window.addEventListener('keydown', () => this.audio.resume(), { once: true });

    this.ui.renderTitle();
  }

  _resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.camera.vw = this.canvas.width;
    this.camera.vh = this.canvas.height;
  }

  newGame(cust) {
    // clear transient world state
    this.animals.length = 0; this.monsters.length = 0; this.npcs.length = 0;
    this.corpses.length = 0; this.drops.length = 0; this.projectiles.length = 0;
    this.traps.length = 0; this.floatTexts.length = 0; this.toasts.length = 0;

    const spawn = { x: 99 * TILE + 16, y: 96 * TILE + 16 }; // on the village path
    this.player = new Player(spawn.x, spawn.y, cust);

    // starting kit
    this.player.equipWeapon(getItem('sword_wood'));
    this.player.equipArmor(getItem('cloth_shirt'));
    this.player.equipArmor(getItem('cloth_pants'));
    this.inventory.addItem('bread', 2, { silent: true });
    this.inventory.addItem('berries', 5, { silent: true });
    this.inventory.addItem('arrow', 20, { silent: true });
    this.inventory.addItem('bow_wood', 1, { silent: true });
    this.inventory.addItem('knife', 1, { silent: true });

    this.sim.generate();
    this.quests.ensureIntroQuest();
    this.state = 'playing';
    this.paused = false;
    this.toast(`Welcome, ${this.player.name}. Hunt 3 rabbits and bring their meat to the Guild!`);
    this.toast('WASD move · click attack · E interact · I inventory · M map');
  }

  returnToTitle() {
    this.player = null;
    this.animals.length = 0; this.monsters.length = 0; this.npcs.length = 0;
    this.corpses.length = 0; this.drops.length = 0;
    this.state = 'title';
    this.ui.close();
    this.ui.renderTitle();
  }

  onPlayerDeath(source) {
    const p = this.player;
    const lostGold = Math.round(p.gold * 0.2);
    p.gold -= lostGold;
    // drop half of each material stack at the death spot
    let dropped = 0;
    for (const it of p.inventory) {
      const item = getItem(it.id);
      if (item && item.category === 'material') {
        const n = Math.floor(it.qty / 2);
        if (n > 0) {
          this.drops.push(new Drop(p.x + (Math.random() - 0.5) * 30, p.y + (Math.random() - 0.5) * 30, it.id, n));
          it.qty -= n; dropped += n;
        }
      }
    }
    // durability loss
    if (p.weapon) p.weapon.durability = Math.max(1, p.weapon.durability - 20);
    for (const k in p.armor) if (p.armor[k]) p.armor[k].durability = Math.max(1, p.armor[k].durability - 15);
    // respawn on the village path
    p.x = 99 * TILE + 16; p.y = 96 * TILE + 16;
    p.health = p.maxHealth; p.stamina = p.maxStamina; p.hunger = Math.max(20, p.hunger);
    p.energy = 60;
    this.audio.sfx('death');
    this.camera.addShake(10);
    this.toast(`You were defeated! Lost ${lostGold}g and some materials. Your progression is safe.`);
  }

  addXP(n) { this.skills.addXP(n); }
  addFloatText(x, y, text, color) { this.floatTexts.push({ x, y, text, color, t: 1.0 }); }
  toast(text) {
    this.toasts.push({ text, t: 4 });
    if (this.toasts.length > 4) this.toasts.shift();
  }

  _handleGlobalInput() {
    if (this.state !== 'playing') return;
    const input = this.input;
    if (input.pressed('escape')) {
      if (this.ui.open) this.ui.close(); else this.ui._renderMainMenu();
      return;
    }
    const menus = { i: 'inventory', c: 'character', k: 'skills', j: 'quests', m: 'map', b: 'crafting', r: 'relationships', h: 'help' };
    for (const [k, menu] of Object.entries(menus)) {
      if (input.pressed(k)) { this.ui.openMenu(menu); return; }
    }
    if (input.pressed('e') && !this.ui.open) this.interact.interact();
  }

  update(dt) {
    this._handleGlobalInput();
    if (this.state !== 'playing' || !this.player) return;
    if (this.paused) return;

    this.time.update(dt);
    this.weather.update(dt);
    this.player.update(dt, this);
    this.combat.update(dt);
    this.survival.update(dt);
    this.sim.update(dt);
    this.gathering.update(dt);
    this.hunting.update(dt);
    this.events.update(dt);
    if (this.economy.caravanTimer) this.economy.caravanTimer = Math.max(0, this.economy.caravanTimer - dt);

    for (const a of this.animals) a.update(dt, this);
    for (const m of this.monsters) m.update(dt, this);
    for (const n of this.npcs) n.update(dt, this);
    for (const d of this.drops) d.update(dt, this);
    for (const pr of this.projectiles) pr.update(dt, this);

    this.animals = this.animals.filter((a) => !a.dead || a.corpseKeep);
    this.monsters = this.monsters.filter((m) => !m.dead);
    this.drops = this.drops.filter((d) => !d.dead);
    this.projectiles = this.projectiles.filter((p) => !p.dead);

    for (const ft of this.floatTexts) { ft.t -= dt * 1.4; ft.y -= 22 * dt; }
    this.floatTexts = this.floatTexts.filter((f) => f.t > 0);
    for (const t of this.toasts) t.t -= dt;
    this.toasts = this.toasts.filter((t) => t.t > 0);

    // quest explore tracking (zone enter)
    const zoneName = this.world.getZoneName(this.player.x, this.player.y);
    if (zoneName !== this._lastZone) { this._lastZone = zoneName; this.quests.onExplore(zoneName); }

    this.camera.follow(this.player.x, this.player.y);
    this.hud.updateDiscovery();
    this.audio.tick(dt, this.time.timeOfDay, this._audioMood());
  }

  _audioMood() {
    if (!this.player) return 'forest';
    const zone = this.world.getZoneIndex(this.player.x, this.player.y);
    if (zone === 0) return this.time.isNight ? 'night' : 'village';
    const nearCombat = this.monsters.some((m) => !m.dead && m.distTo(this.player) < 300);
    if (nearCombat) return 'combat';
    return zone >= 2 ? 'combat' : 'forest';
  }

  render(ctx) {
    ctx.fillStyle = '#10141a';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.state === 'playing' && this.player) {
      this.renderer.render(ctx, this);
      this.hud.render(ctx);
    }
  }
}

const canvas = document.getElementById('game');
const game = new Game(canvas);
new Engine(canvas, game).start();
window.game = game; // debug handle
