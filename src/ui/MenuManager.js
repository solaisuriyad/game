import { getItem, itemName } from '../data/index.js';
import { SKILLS } from '../data/skills.js';
import { RANKS, RANK_POINTS } from '../data/quests.js';
import { BUILDING_FUNC_LABELS } from '../data/buildings.js';
import { PLAYER_TITLES } from '../data/dialogue.js';
import { T, TILE, WORLD_W, WORLD_H, VILLAGE_CX, VILLAGE_CY, ZONES } from '../world/WorldSystem.js';
import { HAIR_COLORS, SKIN_TONES, CLOTH_COLORS } from '../data/npcData.js';
import { LORE } from '../data/lore.js';
import { ACTIVE_SKILLS } from '../data/activeSkills.js';

export class MenuManager {
  constructor(game) {
    this.game = game;
    this.root = document.getElementById('ui-root');
    this.root.addEventListener('click', (e) => {
      const el = e.target.closest('[data-act]');
      if (el) this.handleAction(el.dataset.act, el.dataset.arg);
    });
    // map: scroll wheel = zoom in/out (toward cursor), Ctrl+arrow keys = pan all 4 directions
    window.addEventListener('wheel', (e) => {
      if (!this._mapOpen) return;
      e.preventDefault();
      const cv = document.getElementById('mapcanvas');
      if (!cv) return;
      const rect = cv.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const zoom = e.deltaY < 0 ? 1.2 : 1 / 1.2;
      const oldScale = this._mapScale;
      // min 0.24 lets you zoom all the way out to see the ENTIRE map at once
      const newScale = Math.max(0.24, Math.min(16, oldScale * zoom));
      if (newScale === oldScale) return;
      // zoom toward the cursor so it feels anchored
      const wx = (mx + this._mapPan.x) / oldScale;
      const wy = (my + this._mapPan.y) / oldScale;
      this._mapScale = newScale;
      this._mapPan.x = wx * newScale - mx;
      this._mapPan.y = wy * newScale - my;
      this._drawMapCanvas();
    }, { passive: false });
    window.addEventListener('keydown', (e) => {
      if (!this._mapOpen || !e.ctrlKey) return;
      const step = 48;
      if (e.key === 'ArrowUp') this._mapPan.y -= step;
      else if (e.key === 'ArrowDown') this._mapPan.y += step;
      else if (e.key === 'ArrowLeft') this._mapPan.x -= step;
      else if (e.key === 'ArrowRight') this._mapPan.x += step;
      else return;
      e.preventDefault();
      this._drawMapCanvas();
    });
    this.open = false;
    this.currentNPC = null;
    // settings gear button (top-right corner) — guarded for headless/test contexts
    if (typeof document !== 'undefined' && document.body) {
      this._gear = document.createElement('button');
      this._gear.className = 'settings-btn';
      this._gear.innerHTML = '⚙️';
      this._gear.title = 'Settings';
      this._gear.addEventListener('click', (e) => { e.stopPropagation(); this._renderSettings(); });
      document.body.appendChild(this._gear);
    }
  }

  setOpen(v) { this.open = v; this.game.paused = v; }

  show(title, html, opts = {}) {
    this.root.innerHTML = '';
    const panel = document.createElement('div');
    panel.className = 'panel' + (opts.className ? ' ' + opts.className : '');
    panel.innerHTML = `<div class="panel-head"><span>${title}</span><button class="close" data-act="close">×</button></div><div class="panel-body">${html}</div>`;
    this.root.appendChild(panel);
    this.setOpen(true);
  }
  close() {
    this.root.innerHTML = '';
    this.setOpen(false);
    this.currentNPC = null;
    this._mapOpen = false;
  }

  // ---------- action dispatch ----------
  handleAction(act, arg) {
    const g = this.game;
    switch (act) {
      case 'close': this.close(); break;
      case 'menu': this.openMenu(arg); break;
      case 'use': { const r = g.inventory.useItem(arg); g.toast(r.message); this.openMenu('inventory'); break; }
      case 'drop': g.inventory.removeItem(arg, 1); this.openMenu('inventory'); break;
      case 'equip': g.equipment.equip(arg); this.openMenu('equipment'); break;
      case 'unequipw': g.equipment.unequipWeapon(); this.openMenu('equipment'); break;
      case 'unequipa': g.equipment.unequipArmor(arg); this.openMenu('equipment'); break;
      case 'learn': g.skills.learn(arg); this.openMenu('skills'); break;
      case 'buy': g.economy.buy(arg, 1); this._renderShop(); break;
      case 'sell': g.economy.sell(arg, 1); this._renderShop(); break;
      case 'craft': g.crafting.craft(arg); this.openMenu('crafting'); break;
      case 'accept': g.quests.accept(arg); this.openMenu('guild'); break;
      case 'turnin': g.quests.turnIn(arg); this.openMenu('guild'); break;
      case 'submit': g.guild.submit(arg); this.openMenu('guild'); break;
      case 'submitall': g.guild.submitAll(arg); this.openMenu('guild'); break;
      case 'talk': this._chat(); break;
      case 'gift': this._showGiftPanel(); break;
      case 'giftgive': this._giveGift(arg); break;
      case 'testsfx': g.audio.sfx('pickup'); break;
      case 'setgender': this._cust.gender = arg; this._highlightGender(); break;
      case 'skill': g.activeSkills.select(arg); this.showSkillSelection(); break;
      case 'unskill': g.activeSkills.deselect(arg); this.showSkillSelection(); break;
      case 'starthunt': this.close(); break;
      case 'sleep': g.survival.rest(); this.close(); if (g.buildingInterior.active) g.buildingInterior.exit(); break;
      case 'drink': g.player.hunger = Math.min(100, g.player.hunger + 6); g.toast('You drink cool water from the well.'); this.close(); break;
      case 'save': g.save.save(+arg); this._renderMainMenu(); break;
      case 'load': g.save.load(+arg); this.close(); g.toast('Game loaded.'); break;
      case 'resume': this.close(); break;
      case 'newgame': this._startNewGame(); break;
      case 'online': this._startOnline(); break;
      case 'disconnect': this._disconnect(); break;
      case 'continue': this._continue(); break;
      case 'title': g.returnToTitle(); break;
      case 'setname': this._collectCustomization(); break;
    }
  }

  openMenu(key) {
    switch (key) {
      case 'inventory': this._renderInventory(); break;
      case 'character': this._renderCharacter(); break;
      case 'skills': this._renderSkills(); break;
      case 'equipment': this._renderEquipment(); break;
      case 'quests': this._renderQuests(); break;
      case 'map': this._renderMap(); break;
      case 'guild': this._renderGuild(); break;
      case 'crafting': this._renderCrafting(); break;
      case 'relationships': this._renderRelationships(); break;
      case 'lore': this._renderLore(); break;
      case 'help': this._renderHelp(); break;
      default: this.close();
    }
  }

  // ---------- buildings ----------
  openBuilding(b) {
    const g = this.game;
    const f = b.func;
    const shop = g.economy.shopFor(f);
    if (shop) { this._shopFunc = f; this._renderShop(); return; }
    if (f === 'guild') { this.openMenu('guild'); return; }
    if (['blacksmith', 'tailor', 'carpenter', 'herbalist', 'crafting'].includes(f)) { this._craftStation = f; this.openMenu('crafting'); return; }
    if (f === 'inn') { this._renderRest('inn'); return; }
    if (f === 'home') { this._renderRest('home'); return; }
    if (f === 'well') {
      this.show('Village Well', `<div class="muted">The well provides clean water.</div><div class="row" style="margin-top:10px"><button class="btn" data-act="drink">Drink water</button></div>`);
      return;
    }
    if (f === 'tavern') { this._renderTavern(); return; }
    if (f === 'lodge') {
      this.show("Hunter's Lodge", `<div class="muted">Seasoned hunters trade tips here. Buy supplies:</div>
        ${this._shopItemsHTML(['arrow', 'trap', 'bear_trap', 'knife', 'bandage'])}`);
      return;
    }
    if (f === 'shrine') {
      g.lore.discover('lore_shrine');
      this.show('Shrine', `<div class="muted">A quiet shrine at the forest's edge, marked with the old crescent rune. Offerings of bread and flowers lie at its base.</div>
        ${g.lore.has('lore_shrine') ? '<div class="muted" style="margin-top:8px">📜 You study the shrine and learn something of the old pact.</div>' : ''}`);
      return;
    }
    // generic info
    this.show(b.name, `<div class="muted">${BUILDING_FUNC_LABELS[f] || 'Nothing of note right now.'}</div>`);
  }

  // ---------- rendering helpers ----------
  _itemCard(id, qty, extra = '') {
    const item = getItem(id);
    if (!item) return '';
    const rar = item.rarity || 'common';
    return `<div class="item rarity-${rar}">
      <div class="n">${item.name}${qty > 1 ? ` <span class="muted">×${qty}</span>` : ''}</div>
      <div class="d">${item.desc || ''} <span class="muted">(${item.weight}kg)</span></div>
      <div class="btns">${extra}</div>
    </div>`;
  }

  _renderInventory() {
    const g = this.game, p = g.player;
    let html = `<div class="muted">Weight: <b>${g.inventory.weight().toFixed(1)}</b> / ${g.inventory.capacity()} kg · Gold: <b class="gold">${p.gold}g</b></div><h3>Items</h3><div class="grid2">`;
    if (!p.inventory.length) html += '<div class="muted">Empty.</div>';
    for (const it of p.inventory) {
      const item = getItem(it.id);
      let btns = '';
      if (item.category === 'food' || item.category === 'consumable' || it.id === 'backpack') btns += `<button class="btn green" data-act="use" data-arg="${it.id}">Use</button>`;
      if (item.category === 'weapon' || item.category === 'armor') btns += `<button class="btn" data-act="equip" data-arg="${it.id}">Equip</button>`;
      btns += `<button class="btn red" data-act="drop" data-arg="${it.id}">Drop</button>`;
      html += this._itemCard(it.id, it.qty, btns);
    }
    html += '</div>';
    this.show('Inventory', html);
  }

  _renderCharacter() {
    const g = this.game, p = g.player;
    const title = PLAYER_TITLES[Math.min(PLAYER_TITLES.length - 1, Math.floor(p.level / 4))];
    const s = p.baseStats;
    this.show('Character', `<h3>${p.name}</h3>
      <div class="muted">Level ${p.level} · ${title} · Guild Rank <b class="gp">${g.guild.rank()}</b> · <span class="gold">${g.reputation.title()}</span></div>
      <div class="bar-wrap" style="margin:8px 0"><div class="bar-fill" style="width:${(p.xp / p.xpNext * 100).toFixed(0)}%;background:#9ac8ff"></div></div>
      <div class="muted">XP ${p.xp} / ${p.xpNext}</div>
      <h3>Stats</h3>
      <div class="stats">
        <span>Health</span><span>${Math.ceil(p.health)} / ${p.maxHealth}</span>
        <span>Stamina</span><span>${Math.ceil(p.stamina)} / ${p.maxStamina}</span>
        <span>MP</span><span>${Math.ceil(p.mp)} / ${p.maxMp}</span>
        <span>Strength</span><span>${s.strength}</span>
        <span>Agility</span><span>${s.agility}</span>
        <span>Defense</span><span>${p.totalDefense}</span>
        <span>Critical</span><span>${Math.round((s.crit + g.skills.getEffect('critChance')) * 100)}%</span>
        <span>Hunting</span><span>${s.hunting}</span>
        <span>Gathering</span><span>${s.gathering}</span>
        <span>Crafting</span><span>${s.crafting}</span>
      </div>
      <h3>Records</h3>
      <div class="muted">Monsters slain: ${p.kills} · Animals hunted: ${p.animalsHunted} · Gathered: ${p.gatheredCount}</div>`);
  }

  _renderSkills() {
    const g = this.game, p = g.player;
    const trees = ['hunting', 'survival', 'combat', 'gathering', 'crafting'];
    let html = `<div class="muted">Skill Points: <b class="gold">${p.skillPoints}</b> (earn on level up)</div>`;
    for (const t of trees) {
      html += `<h3>${t[0].toUpperCase() + t.slice(1)}</h3><div class="grid2">`;
      for (const s of SKILLS.filter((x) => x.tree === t)) {
        const learned = p.learnedSkills.includes(s.id);
        const can = g.skills.canLearn(s.id);
        html += `<div class="item ${learned ? 'rarity-uncommon' : ''}">
          <div class="n">${s.name} ${learned ? '✓' : ''}</div>
          <div class="d">${s.desc}</div>
          <div class="btns">${learned ? '<span class="muted">Learned</span>' : `<button class="btn green" data-act="learn" data-arg="${s.id}" ${can ? '' : 'disabled'}>Learn (${s.cost} SP)</button>`}</div>
        </div>`;
      }
      html += '</div>';
    }
    this.show('Skills', html);
  }

  _renderEquipment() {
    const g = this.game, p = g.player;
    const slot = (k, name) => {
      const a = p.armor[k];
      return `<div class="item">${name}<div class="n">${a ? a.name : '—'}</div><div class="d">${a ? `Def ${a.defense} · ${a.durability} dur` : ''}</div><div class="btns">${a ? `<button class="btn red" data-act="unequipa" data-arg="${k}">Unequip</button>` : ''}</div></div>`;
    };
    let html = `<h3>Weapon</h3><div class="grid2"><div class="item">Weapon<div class="n">${p.weapon ? p.weapon.name : 'Fists'}</div><div class="d">${p.weapon ? `DMG ${p.weapon.damage} · ${p.weapon.durability} dur` : 'DMG 4'}</div><div class="btns">${p.weapon ? `<button class="btn red" data-act="unequipw">Unequip</button>` : ''}</div></div></div>`;
    html += `<h3>Armor</h3><div class="grid2">${slot('head', 'Head')}${slot('body', 'Body')}${slot('legs', 'Legs')}${slot('feet', 'Feet')}</div>`;
    html += `<h3>Equippable in inventory</h3><div class="grid2">`;
    let any = false;
    for (const it of p.inventory) {
      const item = getItem(it.id);
      if (item.category === 'weapon' || item.category === 'armor') { any = true; html += this._itemCard(it.id, it.qty, `<button class="btn" data-act="equip" data-arg="${it.id}">Equip</button>`); }
    }
    if (!any) html += '<div class="muted">Nothing equippable. Buy or craft gear.</div>';
    html += '</div>';
    this.show('Equipment', html);
  }

  _renderQuests() {
    const g = this.game;
    let html = '';
    if (!g.quests.active.length) html += '<div class="muted">No active quests. Visit the Adventure Guild.</div>';
    for (const q of g.quests.active) {
      const tpl = g.quests.questById(q.templateId);
      html += `<div class="item"><div class="n">${tpl.title}</div><div class="d">${tpl.text}</div>`;
      html += `<div class="d">${q.objectives.map((o) => `${o.kind}: ${Math.min(o.progress, o.count)}/${o.count}`).join(' · ')}</div></div>`;
    }
    html += `<div class="muted" style="margin-top:8px">Turn in quests at the Adventure Guild.</div>`;

    if (g.multiplayer.connected) {
      html += '<h3>Shared Quests (co-op)</h3>';
      if (!g.multiplayer.sharedQuests.length) html += '<div class="muted">No active shared quest.</div>';
      for (const q of g.multiplayer.sharedQuests) {
        html += `<div class="item"><div class="n">⚔ ${q.title}</div><div class="d">${q.text}</div>`;
        html += `<div class="d">${q.objectives.map((o) => `${o.kind}: ${Math.min(o.progress, o.count)}/${o.count}`).join(' · ')}</div>`;
        html += `<div class="d gold">Rewards: ${q.rewards.gp} GP · ${q.rewards.gold}g · ${q.rewards.xp} XP (all hunters)</div></div>`;
      }
      html += '<div class="muted" style="margin-top:8px">Shared quests are progressed by the whole party and reward every connected hunter.</div>';
    }
    this.show('Quest Log', html);
  }

  _renderGuild() {
    const g = this.game, p = g.player;
    const ri = g.guild.rankIndex();
    const next = g.guild.nextRankPoints();
    let html = `<div class="muted">Rank: <b class="gp">${RANKS[ri]}</b> · ${p.guildPoints} Guild Points${next ? ` · next rank at ${next} GP` : ' (max rank)'}</div>`;
    // submit
    html += '<h3>Submit Materials</h3><div class="grid2">';
    let anyMat = false;
    for (const it of p.inventory) {
      const item = getItem(it.id);
      if (item.guildValue) {
        anyMat = true;
        html += `<div class="item"><div class="n">${item.name} ×${it.qty}</div><div class="d"><span class="gp">${item.guildValue} GP</span> each</div>
          <div class="btns"><button class="btn" data-act="submit" data-arg="${it.id}">Submit 1</button><button class="btn gold" data-act="submitall" data-arg="${it.id}">Submit all</button></div></div>`;
      }
    }
    if (!anyMat) html += '<div class="muted">No guild-valuable materials in your bag.</div>';
    html += '</div>';
    // accept quests
    html += '<h3>Available Quests</h3><div class="grid2">';
    const avail = g.quests.availableTemplates();
    if (!avail.length) html += '<div class="muted">None available at your rank.</div>';
    for (const q of avail) {
      html += `<div class="item"><div class="n">${q.title} <span class="muted">(rank ${RANKS[q.rank]}+)</span></div><div class="d">${q.text}</div>
        <div class="btns"><button class="btn green" data-act="accept" data-arg="${q.id}">Accept</button></div></div>`;
    }
    html += '</div>';
    // active quests turn-in
    html += '<h3>Active Quests</h3><div class="grid2">';
    if (!g.quests.active.length) html += '<div class="muted">None.</div>';
    for (const q of g.quests.active) {
      const tpl = g.quests.questById(q.templateId);
      const done = g.quests.isComplete(q);
      html += `<div class="item"><div class="n">${tpl.title}</div><div class="d">${q.objectives.map((o) => `${o.kind}: ${Math.min(o.progress, o.count)}/${o.count}`).join(' · ')}</div>
        <div class="btns"><button class="btn ${done ? 'gold' : ''}" data-act="turnin" data-arg="${q.templateId}" ${done ? '' : 'disabled'}>Turn in</button></div></div>`;
    }
    html += '</div>';
    this.show('Adventure Guild', html);
  }

  _renderCrafting() {
    const g = this.game, p = g.player;
    const station = this._craftStation;
    const label = station ? { blacksmith: 'Blacksmith', tailor: 'Tailor', carpenter: 'Carpenter', herbalist: 'Herbalist', crafting: 'Crafting Area' }[station] : 'Crafting';
    let html = `<div class="muted">At: ${label}. Recipes needing a different station are disabled.</div><div class="grid2">`;
    for (const r of g.crafting.availableRecipes()) {
      const inputs = r.inputs.map((i) => `${i.qty}× ${itemName(i.id)}`).join(', ');
      const out = r.outputs.map((o) => `${o.qty}× ${itemName(o.id)}`).join(', ');
      const check = g.crafting.canCraft(r);
      html += `<div class="item"><div class="n">${r.name}</div><div class="d">${inputs} → ${out}${!check.ok ? `<br><span class="gold">${check.reason}</span>` : ''}</div>
        <div class="btns"><button class="btn green" data-act="craft" data-arg="${r.id}" ${check.ok ? '' : 'disabled'}>Craft</button></div></div>`;
    }
    html += '</div>';
    this.show('Crafting', html);
  }

  // The Guild's Jobs counter — an NPC greets you (noting your level) and offers
  // the jobs you qualify for. Accepting a job = accepting the quest.
  _renderJobs() {
    const g = this.game, p = g.player;
    const clerk = g.npcs.find((n) => n.occupation === 'guildclerk');
    const name = clerk ? clerk.name : 'the Guild Clerk';
    const title = PLAYER_TITLES[Math.min(PLAYER_TITLES.length - 1, Math.floor(p.level / 4))];
    let html = `<div class="item"><div class="n">${name} <span class="muted">Guild Clerk</span></div>
      <div class="d">"Ah, a <b>Level ${p.level}</b> ${title}! The guild always has work for a hunter like you. Here's what's available — pick a job and I'll mark it in your ledger."</div></div>`;
    html += '<h3>Available Jobs</h3><div class="grid2">';
    const avail = g.quests.availableTemplates();
    if (!avail.length) html += '<div class="muted">No jobs at your rank right now — come back after you rank up.</div>';
    for (const q of avail) {
      html += `<div class="item"><div class="n">${q.title} <span class="muted">(rank ${RANKS[q.rank]}+)</span></div><div class="d">${q.text}</div>
        <div class="btns"><button class="btn green" data-act="accept" data-arg="${q.id}">Accept job</button></div></div>`;
    }
    html += '</div>';
    this.show('Guild Jobs', html);
  }

  _renderRelationships() {
    const g = this.game;
    const sorted = g.npcs.slice().filter((n) => n.metPlayer || n.relationship !== 0).sort((a, b) => b.relationship - a.relationship);
    let html = `<div class="muted">Village Reputation: <b class="gold">${g.reputation.title()}</b> (${g.player.reputation}/100)</div><div class="grid2">`;
    if (!sorted.length) html += '<div class="muted">You haven\'t really met anyone yet. Go talk to villagers!</div>';
    for (const n of sorted) {
      html += `<div class="item"><div class="n">${n.name} <span class="muted">${n.occupationLabel}</span></div><div class="d">${g.relationship.tierLabel(n.relationship)} (${n.relationship})</div></div>`;
    }
    html += '</div>';
    this.show('Relationships', html);
  }

  _renderShop() {
    const g = this.game, p = g.player;
    const f = this._shopFunc;
    const shop = g.economy.shopFor(f) || { label: 'Shop', stock: [] };
    let html = `<div class="muted">${shop.label} · Your gold: <b class="gold">${p.gold}g</b></div><h3>Buy</h3><div class="grid2">`;
    for (const id of shop.stock) {
      const item = getItem(id);
      html += `<div class="item rarity-${item.rarity}"><div class="n">${item.name}</div><div class="d">${item.desc || ''}</div>
        <div class="btns"><button class="btn gold" data-act="buy" data-arg="${id}">Buy — ${g.economy.buyPrice(id)}g</button></div></div>`;
    }
    html += '</div><h3>Sell</h3><div class="grid2">';
    let anySell = false;
    for (const it of p.inventory) {
      const item = getItem(it.id);
      if (item && (item.category === 'material' || item.category === 'food' || item.category === 'consumable' || item.category === 'weapon' || item.category === 'armor' || item.category === 'tool')) {
        anySell = true;
        html += `<div class="item"><div class="n">${item.name} ×${it.qty}</div><div class="btns"><button class="btn" data-act="sell" data-arg="${it.id}">Sell — ${g.economy.sellPrice(it.id)}g</button></div></div>`;
      }
    }
    if (!anySell) html += '<div class="muted">Nothing to sell.</div>';
    html += '</div>';
    this.show(shop.label, html);
  }
  _shopItemsHTML(ids) {
    const g = this.game;
    let h = '<div class="grid2">';
    for (const id of ids) {
      const item = getItem(id);
      h += `<div class="item rarity-${item.rarity}"><div class="n">${item.name}</div><div class="d">${item.desc || ''}</div>
        <div class="btns"><button class="btn gold" data-act="buy" data-arg="${id}">Buy — ${g.economy.buyPrice(id)}g</button></div></div>`;
    }
    return h + '</div>';
  }

  _renderRest(kind) {
    const g = this.game;
    if (kind === 'inn') {
      this.show('Inn', `<div class="muted">A warm bed. Rest restores all health and wakes you at dawn.</div>
        <div class="row" style="margin-top:10px"><button class="btn green big" data-act="sleep">Rest (free for now)</button></div>`);
    } else {
      this.show('Player Residence', `<div class="muted">Your home. Rest here to recover fully.</div>
        <div class="row" style="margin-top:10px"><button class="btn green big" data-act="sleep">Sleep until morning</button></div>`);
    }
  }

  _renderTavern() {
    const g = this.game;
    const names = g.npcs.filter((n) => n.occupation === 'tavernkeep' || n.occupation === 'adventurer' || n.occupation === 'hunter').slice(0, 5).map((n) => n.name).join(', ');
    let html = `<div class="muted">The tavern hums with talk. Regulars: ${names}.</div><h3>Rumors</h3><div class="muted">${g.dialogue.smallTalk(g.npcs[0] || { personality: 'cheerful' })}</div>`;
    if (g.events.recent.length) {
      html += `<h3>Recent events</h3><div class="muted">${g.events.recent.slice(0, 3).map((e) => '· ' + e.type).join('<br>')}</div>`;
    }
    html += `<div class="row" style="margin-top:10px"><button class="btn" data-act="drink">Order a drink (+6 hunger)</button></div>`;
    this.show('Tavern', html);
  }

  _renderMap() {
    const g = this.game;
    this._mapOpen = true;
    this._mapScale = 4;           // px per tile (zoomed in so there's room to pan)
    this._mapView = 720;          // viewport size in px
    // center the map on the player so it never opens on empty black forest
    if (!this._mapPan) this._mapPan = { x: 0, y: 0 };
    this._mapPan.x = (g.player.x / TILE) * this._mapScale - this._mapView / 2;
    this._mapPan.y = (g.player.y / TILE) * this._mapScale - this._mapView / 2;
    this.show('World Map — scroll wheel to zoom · Ctrl + arrow keys to pan', '<canvas id="mapcanvas" class="map-canvas" width="720" height="720"></canvas>');
    this._drawMapCanvas();
  }

  _drawMapCanvas() {
    const g = this.game;
    const cv = document.getElementById('mapcanvas');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const s = this._mapScale;
    const content = WORLD_W * s;
    // clamp pan so the view never leaves the map
    this._mapPan.x = Math.max(0, Math.min(content - this._mapView, this._mapPan.x));
    this._mapPan.y = Math.max(0, Math.min(content - this._mapView, this._mapPan.y));
    const px = this._mapPan.x, py = this._mapPan.y;

    ctx.fillStyle = '#10141a';
    ctx.fillRect(0, 0, this._mapView, this._mapView);
    const hud = g.hud;
    // draw only the visible slice of the terrain + fog (source-rect crop) so we
    // never scale a giant world canvas to a huge destination (black-screen fix)
    const srcW = (this._mapView / s) * (hud.mm / WORLD_W);
    const srcH = (this._mapView / s) * (hud.mm / WORLD_H);
    const srcX = (px / s) * (hud.mm / WORLD_W);
    const srcY = (py / s) * (hud.mm / WORLD_H);
    ctx.drawImage(hud.terrain, srcX, srcY, srcW, srcH, 0, 0, this._mapView, this._mapView);
    ctx.drawImage(hud._fogCanvas(), srcX, srcY, srcW, srcH, 0, 0, this._mapView, this._mapView);
    ctx.save();
    ctx.translate(-px, -py);
    // zone rings
    ctx.strokeStyle = 'rgba(255,215,106,0.4)';
    for (const z of ZONES) {
      ctx.beginPath(); ctx.arc(VILLAGE_CX * s, VILLAGE_CY * s, z.to * s, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,215,106,0.5)';
    ctx.font = '12px sans-serif';
    for (const z of ZONES) {
      ctx.fillText(z.name, (VILLAGE_CX + z.to - 6) * s, (VILLAGE_CY + 2) * s);
    }
    // trees (green dots — iterate only the grid cells near the viewport for speed)
    const vx0 = px / TILE, vy0 = py / TILE, vx1 = (px + this._mapView) / TILE, vy1 = (py + this._mapView) / TILE;
    const cellSz = g.world._cell * TILE;
    const cx0 = Math.floor(px / cellSz), cy0 = Math.floor(py / cellSz);
    const cx1 = Math.floor((px + this._mapView) / cellSz), cy1 = Math.floor((py + this._mapView) / cellSz);
    ctx.fillStyle = '#2f6b2a';
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const cell = g.world.staticGrid.get(cx + ',' + cy);
        if (!cell) continue;
        for (const c of cell) {
          if (c.type !== 'tree') continue;
          const tx = (c.x + 13) / TILE, ty = (c.y + 13) / TILE;
          if (tx < vx0 || tx > vx1 || ty < vy0 || ty > vy1) continue;
          ctx.fillRect(tx * s - 1, ty * s - 1, 3, 3);
        }
      }
    }
    // resource nodes (colored dots)
    for (const n of g.world.nodes) {
      const tx = n.x / TILE, ty = n.y / TILE;
      if (tx < vx0 || tx > vx1 || ty < vy0 || ty > vy1) continue;
      ctx.fillStyle = { herb: '#5fbf5f', mushroom: '#c8c8c8', berry: '#d04040', flower: '#e8a0d0', ore: '#9a9a98' }[n.kind] || '#fff';
      ctx.fillRect(tx * s - 1, ty * s - 1, 3, 3);
    }
    // buildings
    ctx.fillStyle = '#ffd76a';
    for (const b of g.world.buildings) {
      ctx.fillRect(b.x / TILE * s - 1, b.y / TILE * s - 1, b.w / TILE * s + 2, b.h / TILE * s + 2);
    }
    // monsters (colored dots, live)
    const monsters = g.multiplayer.connected ? g.remoteMonsters : g.monsters;
    for (const m of monsters) {
      if (m.dead) continue;
      const mx = m.x / TILE, my = m.y / TILE;
      ctx.fillStyle = m.color || '#c05050';
      ctx.beginPath(); ctx.arc(mx * s, my * s, m.boss ? 4 : 2.5, 0, Math.PI * 2); ctx.fill();
    }
    // animals (small brown dots)
    for (const a of g.animals) {
      if (a.dead) continue;
      const ax = a.x / TILE, ay = a.y / TILE;
      ctx.fillStyle = a.color || '#b08a5a';
      ctx.fillRect(ax * s - 1, ay * s - 1, 2, 2);
    }
    // the Yggdrasil (big 9-color marker) + the monster territory ring around it
    if (g.world.yggdrasil) {
      const yx = g.world.yggdrasil.x / TILE, yy = g.world.yggdrasil.y / TILE;
      // dashed circle marking the outer edge of monster territory (F-rank ring)
      ctx.strokeStyle = 'rgba(255,90,90,0.45)';
      ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.arc(yx * s, yy * s, 550 * s, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,122,224,0.9)';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('Monster Territory', (yx - 70) * s, (yy - 560) * s);
      ctx.fillStyle = '#ff7ae0';
      ctx.beginPath(); ctx.arc(yx * s, yy * s, 8, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.beginPath(); ctx.arc(yx * s, yy * s, 11, 0, Math.PI * 2); ctx.stroke();
    }
    // player — blinking bright light
    const p = g.player;
    const mpx = p.x / TILE * s, mpy = p.y / TILE * s;
    const blink = 0.5 + 0.5 * Math.sin(g.time.timeOfDay * 200);
    // radiating glow
    const glow = ctx.createRadialGradient(mpx, mpy, 1, mpx, mpy, 14 + blink * 8);
    glow.addColorStop(0, `rgba(255,255,255,${0.9})`);
    glow.addColorStop(0.4, `rgba(255,255,150,${0.4 + blink * 0.4})`);
    glow.addColorStop(1, 'rgba(255,255,150,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(mpx, mpy, 22 + blink * 8, 0, Math.PI * 2); ctx.fill();
    // bright core
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(mpx, mpy, 4 + blink * 2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.beginPath(); ctx.arc(mpx, mpy, 4 + blink * 2, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    // ---- legend (main things on the map) ----
    const lx = 10, ly = 10;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(lx, ly, 170, 118);
    ctx.fillStyle = '#f0e6d0';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('Map Legend', lx + 8, ly + 14);
    ctx.font = '10px sans-serif';
    const legend = [
      ['#fff', 'You (blinking light)'],
      ['#ffd76a', 'Building'],
      ['#2f6b2a', 'Tree'],
      ['#5fbf5f', 'Resource'],
      ['#c05050', 'Monster'],
      ['#ff7ae0', 'Yggdrasil']
    ];
    legend.forEach(([c, label], i) => {
      const yy = ly + 26 + i * 15;
      ctx.fillStyle = c;
      ctx.fillRect(lx + 8, yy - 7, 9, 9);
      ctx.fillStyle = '#e8e0c8';
      ctx.fillText(label, lx + 22, yy);
    });
  }

  _renderLore() {
    const g = this.game;
    let html = `<div class="muted">The History of the Forest — ${g.lore.count()} / ${g.lore.total()} discovered</div>`;
    for (const entry of LORE) {
      const found = g.lore.has(entry.id);
      html += `<div class="item ${found ? 'rarity-uncommon' : ''}" style="opacity:${found ? 1 : 0.55}">
        <div class="n">${found ? entry.title : '???'}</div>
        <div class="d">${found ? entry.text : '<span class="muted">Undiscovered — explore the forest, find its hidden places, and defeat its guardians.</span>'}</div>
      </div>`;
    }
    this.show('Codex — History of the Forest', html);
  }

  _renderSettings() {
    const a = this.game.audio;
    const pct = (v) => Math.round(v * 100);
    this.show('Settings', `
      <div class="muted">Adjust game audio. Changes save automatically.</div>
      <h3>Master Volume — <span id="vol-master">${pct(a.master)}%</span></h3>
      <input type="range" class="vol" min="0" max="100" value="${pct(a.master)}" oninput="window.game.audio.setMasterVolume(this.value/100);document.getElementById('vol-master').textContent=this.value+'%';">
      <h3>Sound Effects — <span id="vol-sfx">${pct(a.sfxVolume)}%</span></h3>
      <input type="range" class="vol" min="0" max="100" value="${pct(a.sfxVolume)}" oninput="window.game.audio.setSfxVolume(this.value/100);document.getElementById('vol-sfx').textContent=this.value+'%';">
      <h3>Music — <span id="vol-music">${pct(a.musicVolume)}%</span></h3>
      <input type="range" class="vol" min="0" max="100" value="${pct(a.musicVolume)}" oninput="window.game.audio.setMusicVolume(this.value/100);document.getElementById('vol-music').textContent=this.value+'%';">
      <h3>Ambient (wind &amp; birds) — <span id="vol-ambient">${pct(a.ambientVolume)}%</span></h3>
      <input type="range" class="vol" min="0" max="100" value="${pct(a.ambientVolume)}" oninput="window.game.audio.setAmbientVolume(this.value/100);document.getElementById('vol-ambient').textContent=this.value+'%';">
      <div class="muted" style="margin-top:10px">Test sound: <button class="btn" data-act="testsfx">Play sound</button></div>
    `);
  }

  _renderHelp() {
    this.show('How to Play', `<div class="help">
      <b>Move</b> — WASD / arrows<br>
      <b>Run</b> — hold R while moving (drains stamina)<br>
      <b>Fly</b> — X to take flight (30s, 50ft high, 5s cooldown)<br>
      <b>Yggdrasil blessing</b> — press Q near the world tree to fully restore + become invincible<br>
      <b>Aim</b> — mouse · <b>Attack</b> — click (hold & release for heavy)<br>
      <b>Block</b> — hold right mouse · <b>Dodge</b> — Space<br>
      <b>Sneak</b> — hold Shift (quieter, harder to detect, use cover & approach from behind)<br>
      <b>Track</b> — Tab toggles tracking (footprint direction + blood trails)<br>
      <b>Traps</b> — T place snare · Y place bear trap · G bait (raw meat/berries)<br>
      <b>Interact</b> — E (gather, harvest, talk, buildings)<br>
      <b>Active skills</b> — keys 1–8 to cast (cost MP) · O for the skill list<br>
      <b>Menus</b> — I inventory · C character · K skills · J quests · M map · B craft · F relationships · L codex · Esc menu<br><br>
      Hunt animals, gather materials, then <b>submit them at the Adventure Guild</b> to earn Guild Points, gold and rank.
      Buy food to keep your hunger up, rest at the inn, and push deeper into the forest for better loot — but watch your weight and stamina!
    </div>`);
  }

  // ---------- dialogue ----------
  openDialogue(npc) {
    this.currentNPC = npc;
    const g = this.game;
    npc.metPlayer = true;
    if (npc.relationship === 0) { g.relationship.change(npc, 1); }
    const mem = g.dialogue.memoryLine(npc);
    const fam = this._familyLine(npc);
    const text = g.dialogue.greeting(npc)
      + (mem ? `<br><span class="muted">${mem}</span>` : '')
      + (fam ? `<br><span class="muted">${fam}</span>` : '');
    this.show(npc.name + ' — ' + npc.occupationLabel, `<div class="dialogue">
      <div class="text">${text}</div>
      <div class="opts">
        <button class="btn" data-act="talk">Chat</button>
        <button class="btn" data-act="gift">Give gift</button>
        <button class="btn red" data-act="close">Goodbye</button>
      </div>
    </div>`, { className: 'dialogue' });
  }

  _familyLine(npc) {
    const parts = [];
    if (npc.spouseId) {
      const s = this.game.npcs.find((n) => n.id === npc.spouseId);
      if (s) parts.push(`married to ${s.firstName}`);
    }
    if (npc.childIds && npc.childIds.length) {
      parts.push(`has ${npc.childIds.length} child${npc.childIds.length > 1 ? 'ren' : ''}`);
    }
    if (npc.parentIds && npc.parentIds.length) {
      parts.push('lives with their family');
    }
    const rels = Object.entries(npc.npcRelations).map(([id, rel]) => {
      const o = this.game.npcs.find((n) => n.id === id);
      return o ? `${rel} of ${o.firstName}` : null;
    }).filter(Boolean);
    if (rels.length) parts.push(rels.slice(0, 3).join(', '));
    return parts.length ? 'Relations: ' + parts.join(' · ') : null;
  }

  _chat() {
    const npc = this.currentNPC;
    if (!npc) return;
    const g = this.game;
    const text = g.dialogue.smallTalk(npc);
    this.show(npc.name + ' — ' + npc.occupationLabel, `<div class="dialogue">
      <div class="text">${text}</div>
      <div class="opts"><button class="btn" data-act="talk">Chat again</button><button class="btn" data-act="gift">Give gift</button><button class="btn red" data-act="close">Goodbye</button></div>
    </div>`, { className: 'dialogue' });
  }

  _showGiftPanel() {
    const g = this.game;
    const npc = this.currentNPC;
    let html = '<div class="grid2">';
    let any = false;
    for (const it of g.player.inventory) {
      const item = getItem(it.id);
      if (item.category === 'material' || item.category === 'food') {
        any = true;
        html += `<div class="item"><div class="n">${item.name} ×${it.qty}</div><div class="btns"><button class="btn" data-act="giftgive" data-arg="${it.id}">Give</button></div></div>`;
      }
    }
    if (!any) html += '<div class="muted">Nothing suitable to give.</div>';
    html += '</div>';
    this.show('Give gift to ' + npc.name, html);
  }

  _giveGift(itemId) {
    const g = this.game;
    const npc = this.currentNPC;
    const res = g.relationship.giveGift(npc, itemId);
    g.toast(res.message);
    this.openDialogue(npc);
  }

  // ---------- title / main menu ----------
  renderTitle() {
    this.root.innerHTML = '';
    this.setOpen(true);
    const panel = document.createElement('div');
    panel.className = 'panel title-screen';
    panel.innerHTML = `<div class="panel-body">
      <h1>VERDANT HOLLOW</h1>
      <div class="sub">An open-world hunting & survival RPG</div>
      <div class="muted" style="margin-bottom:10px">Version 6.4 — 3D building interiors (?3d=1)</div>
      <div class="title-form">
        <input id="name-input" type="text" maxlength="20" placeholder="Enter your character name" />
        <div class="opt-row">
          <span class="muted">Body:</span>
          ${['male', 'female', 'neutral'].map((g2) => `<button class="btn gender-btn" data-act="setgender" data-arg="${g2}">${g2}</button>`).join('')}
        </div>
        <div class="opt-row"><span class="muted">Skin:</span><span id="skintones"></span></div>
        <div class="opt-row"><span class="muted">Hair color:</span><span id="haircolors"></span></div>
        <div class="opt-row"><span class="muted">Clothing:</span><span id="clothcolors"></span></div>
        <button class="btn gold big" data-act="newgame" style="margin-top:12px">Begin Adventure</button>
        <div class="opt-row" style="margin-top:10px">
          <span class="muted">Server:</span>
          <input id="server-input" type="text" maxlength="120" placeholder="leave empty for this machine (e.g. myserver.com:3000)" />
        </div>
        <div class="opt-row">
          <span class="muted">Password:</span>
          <input id="password-input" type="password" maxlength="60" placeholder="optional — set one to save your progress online" />
        </div>
        <button class="btn green" data-act="online" style="margin-top:8px">Play Online (co-op)</button>
        <button class="btn" data-act="continue" style="margin-top:8px">Continue</button>
      </div>
      <div class="muted" style="margin-top:16px">Press M in-game for the world map · Esc for the menu</div>
    </div>`;
    this.root.appendChild(panel);

    // customization state
    this._cust = { name: '', gender: 'male', skin: 1, hair: 1, cloth: 0 };
    const renderSwatches = (sel, arr, key) => {
      const el = document.getElementById(sel);
      el.innerHTML = '';
      arr.forEach((c, i) => {
        const d = document.createElement('div');
        d.className = 'swatch' + (i === this._cust[key] ? ' sel' : '');
        d.style.background = c;
        d.addEventListener('click', () => { this._cust[key] = i; renderSwatches(sel, arr, key); });
        el.appendChild(d);
      });
    };
    renderSwatches('skintones', SKIN_TONES, 'skin');
    renderSwatches('haircolors', HAIR_COLORS, 'hair');
    renderSwatches('clothcolors', CLOTH_COLORS, 'cloth');
    // restore the last-used server address
    try {
      const saved = localStorage.getItem('verdant-hollow:server');
      if (saved) { const el = document.getElementById('server-input'); if (el) el.value = saved; }
    } catch (e) {}
    this._highlightGender();
  }

  _highlightGender() {
    if (!this._cust) return;
    this.root.querySelectorAll('[data-act="setgender"]').forEach((b) => {
      b.classList.toggle('sel', b.dataset.arg === this._cust.gender);
    });
  }

  _collectCustomization() {
    const input = document.getElementById('name-input');
    this._cust.name = input ? input.value.trim() : '';
  }

  // validate the required popup fields; returns an error string or null
  _validateCustomization() {
    this._collectCustomization();
    if (!this._cust.name) return 'Please enter your character name.';
    if (!this._cust.gender) return 'Please choose a body type.';
    return null;
  }

  _continue() {
    const slots = this.game.save.listSlots();
    if (!slots.length) { this.game.toast('No saved games yet.'); return; }
    const mostRecent = slots.reduce((a, b) => (a.ts > b.ts ? a : b));
    const r = this.game.save.load(mostRecent.slot);
    if (r.ok) { this.close(); this.game.toast(r.message); }
  }

  _startOnline() {
    const err = this._validateCustomization();
    if (err) { this._showFieldError(err); return; }
    const c = this._cust;
    const url = this._serverUrl();
    let password = '';
    try {
      const pwEl = document.getElementById('password-input');
      if (pwEl) password = pwEl.value;
      localStorage.setItem('verdant-hollow:server', document.getElementById('server-input') ? document.getElementById('server-input').value.trim() : '');
    } catch (e) {}
    this.game.newGame({
      name: c.name, gender: c.gender, skinTone: SKIN_TONES[c.skin],
      hairColor: HAIR_COLORS[c.hair], clothColor: CLOTH_COLORS[c.cloth], hairStyle: 0
    });
    this.game.toast('Connecting to the shared world...');
    this.game.multiplayer.connect(url, c.name, password).then((r) => {
      if (!r.ok) this.game.toast('Connection failed: ' + (r.message || 'unreachable'));
      else this.game.toast(password ? 'Connected — your progress will be saved online. Press Enter to chat.' : 'Connected as a guest (no password = no online save). Press Enter to chat.');
    });
    this.close();
  }

  // build the WebSocket URL from the server box (empty = this machine)
  _serverUrl() {
    let raw = '';
    try { raw = document.getElementById('server-input') ? document.getElementById('server-input').value.trim() : ''; } catch (e) {}
    if (!raw) return (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws';
    raw = raw.replace(/\/+$/, '');
    if (/^wss?:\/\//.test(raw)) return raw;                       // full ws url given
    const proto = location.protocol === 'https:' ? 'wss://' : 'ws://';
    return proto + raw + '/ws';
  }

  _disconnect() {
    this.game.multiplayer.disconnect();
    this.close();
    this.game.toast('Left the shared world.');
  }

  _startNewGame() {
    const err = this._validateCustomization();
    if (err) { this._showFieldError(err); return; }
    const c = this._cust;
    this.game.newGame({
      name: c.name, gender: c.gender, skinTone: SKIN_TONES[c.skin],
      hairColor: HAIR_COLORS[c.hair], clothColor: CLOTH_COLORS[c.cloth], hairStyle: 0
    });
    this.showSkillSelection();
  }

  _showFieldError(msg) {
    let el = document.getElementById('name-error');
    if (!el) {
      el = document.createElement('div');
      el.id = 'name-error';
      el.className = 'muted';
      el.style.color = '#ff8a8a';
      el.style.marginTop = '6px';
      const form = document.querySelector('.title-form');
      if (form) form.appendChild(el);
    }
    el.textContent = msg;
  }

  // Select up to 3 active skills (hotkeys 1/2/3). Reachable anytime with O.
  showSkillSelection() {
    const g = this.game;
    const as = g.activeSkills;
    let html = `<div class="muted">Choose up to <b>3 skills</b> (keys <b>1 / 2 / 3</b>). Change anytime with <b>O</b>.</div><div class="grid2">`;
    for (const s of ACTIVE_SKILLS) {
      const selected = as.isSelected(s.id);
      const full = as.selected.length >= 3 && !selected;
      html += `<div class="item rarity-${selected ? 'uncommon' : 'common'}">
        <div class="n" style="color:${s.color}">${s.name}</div>
        <div class="d">${s.desc}<br><span class="muted">MP ${s.mpCost} · cooldown ${s.cooldown}s</span></div>
        <div class="btns"><button class="btn ${selected ? 'red' : 'green'}" data-act="${selected ? 'unskill' : 'skill'}" data-arg="${s.id}" ${full ? 'disabled' : ''}>${selected ? 'Remove' : 'Select'}</button></div>
      </div>`;
    }
    html += `</div><div class="muted" style="margin-top:8px">Selected: ${as.selected.length}/3</div>`;
    html += `<div class="row" style="margin-top:10px"><button class="btn gold big" data-act="starthunt">Enter the World</button></div>`;
    this.show('Choose Your Skills', html);
  }

  _renderMainMenu() {
    const g = this.game;
    let html = '<div class="row" style="flex-direction:column;gap:8px;align-items:stretch">';
    html += '<button class="btn big" data-act="resume">Resume</button>';
    if (g.multiplayer.connected) {
      html += `<div class="muted">Online — ${g.remotePlayers.length + 1} hunters in this world</div>`;
      html += '<button class="btn red" data-act="disconnect">Disconnect from server</button>';
    }
    html += '<h3>Save</h3><div class="row">';
    for (let i = 0; i < 3; i++) html += `<button class="btn" data-act="save" data-arg="${i}">Save slot ${i + 1}</button>`;
    html += '</div><h3>Load</h3><div class="row">';
    const slots = g.save.listSlots();
    for (let i = 0; i < 3; i++) {
      const s = slots.find((x) => x.slot === i);
      html += `<button class="btn" data-act="load" data-arg="${i}" ${s ? '' : 'disabled'}>${s ? `Slot ${i + 1}: ${s.name} (Lv ${s.level})` : `Slot ${i + 1}: empty`}</button>`;
    }
    html += '</div>';
    html += '<button class="btn" data-act="menu" data-arg="help">How to Play</button>';
    html += '<button class="btn red" data-act="title">Quit to title</button>';
    html += '</div>';
    this.show('Menu', html);
  }
}
