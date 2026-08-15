import { Engine } from './core/Engine.js';
import { Input } from './core/Input.js';
import { Camera } from './core/Camera.js';
import { EventBus } from './core/EventBus.js';
import { AudioManager } from './core/AudioManager.js';
import { WorldSystem, TILE, PX_W, PX_H, VILLAGE_CX, VILLAGE_CY, ZONES } from './world/WorldSystem.js';
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
import { TrapSystem } from './systems/TrapSystem.js';
import { StealthSystem } from './systems/StealthSystem.js';
import { GatheringSystem } from './systems/GatheringSystem.js';
import { SurvivalSystem } from './systems/SurvivalSystem.js';
import { SkillSystem } from './systems/SkillSystem.js';
import { ActiveSkillSystem } from './systems/ActiveSkillSystem.js';
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
import { LoreSystem } from './systems/LoreSystem.js';
import { MultiplayerSystem } from './net/MultiplayerSystem.js';
import { RemotePlayer } from './entities/RemotePlayer.js';
import { HUD } from './ui/HUD.js';
import { MenuManager } from './ui/MenuManager.js';
import { BuildingInterior } from './ui/BuildingInterior.js';
import { ChatUI } from './ui/ChatUI.js';
import { World3DRenderer } from './world/World3DRenderer.js';
import { Interior3DRenderer } from './world/Interior3DRenderer.js';
import { ITEM_DB, WEAPON_DB, ARMOR_DB, getItem } from './data/index.js';
import { ABILITIES } from './data/abilities.js';
import { RANKS } from './data/quests.js';

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
    this.traps = []; this.baitPiles = []; this.floatTexts = []; this.toasts = [];
    this.remotePlayers = [];
    this.remoteMonsters = [];
    this.remoteAnimals = [];
    this.remoteResources = [];
    this.recentLoot = []; // { name, qty, color, t } — visible loot feed

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
    this.trapSystem = new TrapSystem(this);
    this.stealth = new StealthSystem(this);
    this.gathering = new GatheringSystem(this);
    this.survival = new SurvivalSystem(this);
    this.skills = new SkillSystem(this);
    this.activeSkills = new ActiveSkillSystem(this);
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
    this.lore = new LoreSystem(this);
    this.multiplayer = new MultiplayerSystem(this);
    this.RemotePlayer = RemotePlayer;
    this.sim = new PopulationSystem(this);

    this.renderer = new MapRenderer(this);
    this.hud = new HUD(this);
    this.ui = new MenuManager(this);
    this.buildingInterior = new BuildingInterior(this);
    this.chat = new ChatUI(this);

    // experimental 3D view (opt-in via ?3d=1). The normal 2D renderer stays the
    // default; 3D reuses the same world/entities and is gated so it can't break
    // the base game.
    this.mode3d = false;
    try { this.mode3d = new URLSearchParams(window.location.search).get('3d') === '1'; } catch (e) {}
    if (this.mode3d) {
      try {
        this.renderer3d = new World3DRenderer(this);
        this.interior3d = new Interior3DRenderer(this);
        // third-person camera: follow behind the player's back, 360° orbit via right-drag
        this.renderer3d.follow = true;
        // 3D: movement is camera-relative (W = away from camera), and the player
        // faces where the camera looks. This replaces the 2D top-down dirVector.
        this._dirFn = () => this.renderer3d.cameraDirVector();
      } catch (e) { this.mode3d = false; }
    }

    this.player = null;
    this.state = 'title';
    this.paused = false;
    this.deathInfo = null; // active death screen ({ killer, goldLost, dropped, timer })

    // optional NPC scale override: ?npcs=1000 (Phase 9 — 1000-NPC optimization)
    this.npcCount = 250; // a living village (250 NPCs — reduced 50% for a curated town)
    try {
      const q = new URLSearchParams(window.location.search).get('npcs');
      if (q) this.npcCount = Math.max(1, Math.min(2000, parseInt(q, 10) || 65));
    } catch (e) {}

    this._resize();
    Input.attach(canvas);
    window.addEventListener('resize', () => this._resize());
    canvas.addEventListener('mousedown', () => this.audio.resume());
    window.addEventListener('keydown', () => this.audio.resume(), { once: true });

    // mouse wheel: zoom the main game camera toward the cursor (not on the map)
    window.addEventListener('wheel', (e) => {
      if (this.mode3d) return; // 3D mode handles zoom via the orbit camera
      if (this.state !== 'playing' || this.ui.open || this.ui._mapOpen) return;
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      this.camera.zoomAt(sx, sy, factor);
    }, { passive: false });

    this.ui.renderTitle();
  }

  _resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.camera.setScreen(this.canvas.width, this.canvas.height);
  }

  newGame(cust) {
    // clear transient world state
    this.animals.length = 0; this.monsters.length = 0; this.npcs.length = 0;
    this.corpses.length = 0; this.drops.length = 0; this.projectiles.length = 0;
    this.traps.length = 0; this.baitPiles.length = 0; this.floatTexts.length = 0; this.toasts.length = 0;

    const spawn = { x: VILLAGE_CX * TILE + 16, y: VILLAGE_CY * TILE + 16 }; // village center plaza
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
    if (this.deathInfo) return; // already dead — ignore extra hits
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
    // clear status effects and freeze the player at their death spot — a clear
    // death screen explains what happened BEFORE the respawn, so it never feels
    // like a random teleport back to town.
    p.statuses.length = 0;
    p.health = 0;
    p.stamina = 0;
    p.flying = false; p.flyLevel = 0; p.altitude = 0; p.targetAlt = 0; p.flyTimer = 0;
    const killer = source ? (source.name || (source.def && source.def.name) || 'a creature') : 'the wild';
    this.deathInfo = { killer, goldLost: lostGold, dropped, timer: 3.5 };
    this.audio.sfx('death');
    this.camera.addShake(10);
  }

  // actually respawn the player (called when the death-screen timer runs out)
  _respawnPlayer() {
    const p = this.player;
    const info = this.deathInfo;
    this.deathInfo = null;
    p.x = VILLAGE_CX * TILE + 16; p.y = VILLAGE_CY * TILE + 16;
    p.health = p.maxHealth; p.stamina = p.maxStamina; p.mp = p.maxMp;
    p.hunger = Math.max(20, p.hunger);
    p.energy = 60;
    p.spawnGrace = 3; // brief invulnerability so you aren't instantly re-killed
    const mat = info.dropped > 0 ? ` and ${info.dropped} materials` : '';
    this.toast(`💀 You were defeated by ${info.killer}. Lost ${info.goldLost}g${mat}. Your progression is safe.`);
  }

  addXP(n) { this.skills.addXP(n); }
  addFloatText(x, y, text, color) { this.floatTexts.push({ x, y, text, color, t: 1.0 }); }
  toast(text) {
    this.toasts.push({ text, t: 4 });
    if (this.toasts.length > 4) this.toasts.shift();
  }
  // record a loot pickup for the visible loot feed
  addLoot(itemId, qty) {
    const item = this.items.get(itemId);
    if (!item) return;
    const colors = { common: '#b8b8b8', uncommon: '#4ac84a', rare: '#4a8ac8', epic: '#c84ac8', legendary: '#ffd76a' };
    // merge with the most recent identical entry
    const last = this.recentLoot[0];
    if (last && last.itemId === itemId && last.t > 6.5) {
      last.qty += qty;
      last.t = 8;
    } else {
      this.recentLoot.unshift({ itemId, name: item.name, qty, color: colors[item.rarity] || '#b8b8b8', t: 8 });
    }
    if (this.recentLoot.length > 8) this.recentLoot.length = 8;
  }

  _handleGlobalInput() {
    if (this.state !== 'playing') return;
    if (this.deathInfo) return; // no menus/actions while the death screen is up
    const input = this.input;
    if (input.pressed('escape')) {
      if (this.ui.open) this.ui.close(); else this.ui._renderMainMenu();
      return;
    }
    // Enter opens the chat box (only when free, and online)
    if (input.pressed('enter') && !this.ui.open && !this.buildingInterior.active && this.multiplayer.connected) {
      this.chat.open();
      return;
    }
    const menus = { i: 'inventory', c: 'character', k: 'skills', j: 'quests', m: 'map', b: 'crafting', f: 'relationships', l: 'lore', h: 'help' };
    for (const [k, menu] of Object.entries(menus)) {
      if (input.pressed(k)) { this.ui.openMenu(menu); return; }
    }
    if (input.pressed('e') && !this.ui.open) this.interact.interact();
    if (input.pressed('t') && !this.ui.open) {
      const r = this.trapSystem.place('snare');
      this.toast(r.message);
    }
    if (input.pressed('y') && !this.ui.open) {
      const r = this.trapSystem.place('bear_trap');
      this.toast(r.message);
    }
    if (input.pressed('g') && !this.ui.open) {
      const r = this.trapSystem.placeBait();
      this.toast(r.message);
    }
    if (input.pressed('o') && !this.ui.open) this.ui.showSkillSelection();
    if (input.pressed('1') && !this.ui.open) this.toast(this.activeSkills.use(0).message);
    if (input.pressed('2') && !this.ui.open) this.toast(this.activeSkills.use(1).message);
    if (input.pressed('3') && !this.ui.open) this.toast(this.activeSkills.use(2).message);
    // Yggdrasil blessing: press Q while near the world tree for a full restore
    if (input.pressed('q') && !this.ui.open && this.nearYggdrasil()) {
      this.yggdrasilBlessing();
    }
  }

  nearYggdrasil() {
    const y = this.world.yggdrasil;
    if (!y || !this.player) return false;
    return Math.hypot(y.x - this.player.x, y.y - this.player.y) < y.r + 120;
  }

  yggdrasilBlessing() {
    const p = this.player;
    p.health = p.maxHealth;
    p.stamina = p.maxStamina;
    p.mp = p.maxMp;
    p.hunger = 100;
    p.temperature = 21;
    p.yggBlessing = 60; // 60s of invulnerability
    this.audio.sfx('levelup');
    this.toast('🌳 The Yggdrasil blesses you! All stats restored, invincible for 60s.');
  }

  update(dt) {
    // inside a building: the interior view handles its own input (and freezes
    // the outside world while the player is indoors)
    if (this.buildingInterior.active) {
      this.buildingInterior.update(dt);
      return;
    }
    this._handleGlobalInput();
    if (this.state !== 'playing' || !this.player) return;
    // death screen: freeze the action for a moment, explain, then respawn
    if (this.deathInfo) {
      this.deathInfo.timer -= dt;
      if (this.deathInfo.timer <= 0) this._respawnPlayer();
      return;
    }
    if (this.paused) return;

    this.time.update(dt);
    this.weather.update(dt);
    this.player.update(dt, this);
    // 3D mode: the player aims where the mouse points (raycast onto the ground);
    // if the cursor is above the horizon, fall back to facing the camera.
    if (this.mode3d && this.renderer3d) {
      const aim = this.renderer3d.aimWorldPoint();
      if (aim) this.player.facing = Math.atan2(aim.y - this.player.y, aim.x - this.player.x);
      else this.player.facing = this.renderer3d.facingAngle();
    }
    this.combat.update(dt);
    this.activeSkills.update(dt);
    this.survival.update(dt);
    this.sim.update(dt);
    this.gathering.update(dt);
    this.trapSystem.update(dt);
    this.lore.update();
    this.multiplayer.update(dt);
    this.events.update(dt);
    if (this.economy.caravanTimer) this.economy.caravanTimer = Math.max(0, this.economy.caravanTimer - dt);

    // animals are server-authoritative in co-op; clients don't simulate them
    if (!this.multiplayer.connected) {
      for (const a of this.animals) a.update(dt, this);
    }
    // monsters are server-authoritative in co-op; clients don't simulate them
    if (!this.multiplayer.connected) {
      for (const m of this.monsters) m.update(dt, this);
    }
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
    for (const l of this.recentLoot) l.t -= dt;
    this.recentLoot = this.recentLoot.filter((l) => l.t > 0);

    // quest explore tracking (zone enter)
    const zoneName = this.world.getZoneName(this.player.x, this.player.y);
    if (zoneName !== this._lastZone) {
      this._lastZone = zoneName;
      this.quests.onExplore(zoneName);
      this.lore.onZone(zoneName);
      // guild rank gating — warn (don't hard-block) when under-ranked
      const zi = this.world.getZoneIndex(this.player.x, this.player.y);
      const minRank = ZONES[zi].minRank;
      const rank = this.guild.rankIndex();
      if (minRank > rank && zi !== this._warnedZone) {
        this._warnedZone = zi;
        this.toast(`⚠ ${ZONES[zi].name} is beyond your rank — ${RANKS[minRank]}+ recommended (you are ${RANKS[rank]}).`);
      }
    }

    this.camera.follow(this.player.x, this.player.y);
    this.hud.updateDiscovery();
    // audio must never be able to freeze the game (it only runs in real browsers)
    try { this.audio.tick(dt, this.time.timeOfDay, this._audioMood()); }
    catch (e) { this.audio.ctx = null; this.audio.musicGain = null; this.audio.ambientGain = null; }
  }

  onCrash(e) {
    // surface any error visibly instead of freezing the screen
    console.error('Game error:', e);
    try {
      const el = document.getElementById('ui-root');
      if (el) el.innerHTML = `<div class="panel"><div class="panel-head"><span>⚠ Error</span></div><div class="panel-body" style="color:#ff8a8a;font-family:monospace">${String(e && e.message ? e.message : e)}</div></div>`;
    } catch (_) {}
  }

  _audioMood() {
    if (!this.player) return 'forest';
    const zone = this.world.getZoneIndex(this.player.x, this.player.y);
    if (zone === 0) return this.time.isNight ? 'night' : 'village';
    const near = (m) => !m.dead && m.distTo(this.player) < 320;
    const monsters = this.multiplayer.connected ? this.remoteMonsters : this.monsters;
    if (monsters.some((m) => m.boss && near(m))) return 'boss';
    if (monsters.some((m) => near(m))) return 'combat';
    return zone >= 3 ? 'combat' : 'forest';
  }

  render(ctx) {
    // lightweight FPS tracking (real frames, not simulation ticks)
    const now = performance.now();
    if (!this._fpsLast) this._fpsLast = now;
    this._fpsAcc = (this._fpsAcc || 0) + (now - this._fpsLast);
    this._fpsN = (this._fpsN || 0) + 1;
    this._fpsLast = now;
    if (this._fpsAcc >= 500) {
      this._fps = Math.round(1000 * this._fpsN / this._fpsAcc);
      this._fpsAcc = 0; this._fpsN = 0;
    }
    ctx.fillStyle = '#10141a';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    // experimental 3D mode: render the world (or a building interior) in Three.js
    // instead of the 2D canvas. Game logic (update) is unchanged; only drawing swaps.
    if (this.mode3d && this.renderer3d && this.state === 'playing' && this.player) {
      if (this.buildingInterior.active && this.interior3d) {
        try { this.renderer3d.ensureRenderer(); this.interior3d.render(this.renderer3d); } catch (e) {}
      } else if (!this.buildingInterior.active) {
        try { this.renderer3d.render(); } catch (e) {}
      }
      return;
    }
    if (this.buildingInterior.active) {
      this.buildingInterior.render(ctx);
      return;
    }
    if (this.state === 'playing' && this.player) {
      this.renderer.render(ctx, this);
      this.hud.render(ctx);
      if (this.deathInfo) this.hud.renderDeathScreen(ctx);
    }
  }
}

const canvas = document.getElementById('game');
const game = new Game(canvas);
new Engine(canvas, game).start();
window.game = game; // debug handle
