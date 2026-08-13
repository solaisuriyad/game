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
    this.open = false;
    this.currentNPC = null;
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
      case 'skill': g.activeSkills.select(arg); this.showSkillSelection(); break;
      case 'unskill': g.activeSkills.deselect(arg); this.showSkillSelection(); break;
      case 'starthunt': this.close(); break;
      case 'sleep': g.survival.rest(); this.close(); break;
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
    this.show('World Map', '<canvas id="mapcanvas" class="map-canvas" width="720" height="720"></canvas>');
    const cv = document.getElementById('mapcanvas');
    const ctx = cv.getContext('2d');
    const s = cv.width / WORLD_W;
    // terrain
    const hud = g.hud;
    ctx.drawImage(hud.terrain, 0, 0, cv.width, cv.height);
    ctx.drawImage(hud._fogCanvas(), 0, 0, cv.width, cv.height);
    // zone rings
    ctx.strokeStyle = 'rgba(255,215,106,0.4)';
    for (const z of ZONES) {
      ctx.beginPath(); ctx.arc(VILLAGE_CX * s, VILLAGE_CY * s, z.to * s, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,215,106,0.5)';
    ctx.font = '10px sans-serif';
    for (const z of ZONES) {
      ctx.fillText(z.name, (VILLAGE_CX + z.to - 4) * s, (VILLAGE_CY + 2) * s);
    }
    // buildings
    ctx.fillStyle = '#ffd76a';
    for (const b of g.world.buildings) {
      ctx.fillRect(b.x / TILE * s - 1, b.y / TILE * s - 1, b.w / TILE * s + 2, b.h / TILE * s + 2);
    }
    // player
    const p = g.player;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(p.x / TILE * s, p.y / TILE * s, 3, 0, Math.PI * 2); ctx.fill();
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

  _renderHelp() {
    this.show('How to Play', `<div class="help">
      <b>Move</b> — WASD / arrows<br>
      <b>Run</b> — hold R while moving (drains stamina)<br>
      <b>Aim</b> — mouse · <b>Attack</b> — click (hold & release for heavy)<br>
      <b>Block</b> — hold right mouse · <b>Dodge</b> — Space<br>
      <b>Sneak</b> — hold Shift (quieter, harder to detect, use cover & approach from behind)<br>
      <b>Track</b> — Tab toggles tracking (footprint direction + blood trails)<br>
      <b>Traps</b> — T place snare · Y place bear trap · G bait (raw meat/berries)<br>
      <b>Interact</b> — E (gather, harvest, talk, buildings)<br>
      <b>Active skills</b> — 1 / 2 / 3 to cast (cost MP) · O to change your 3 skills<br>
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
      <div class="title-form">
        <input id="name-input" type="text" maxlength="20" placeholder="Enter your character name" />
        <div class="opt-row">
          <span class="muted">Body:</span>
          ${['male', 'female', 'neutral'].map((g2, i) => `<button class="btn ${i === 0 ? '' : ''}" data-act="setgender" data-arg="${g2}">${g2}</button>`).join('')}
        </div>
        <div class="opt-row"><span class="muted">Skin:</span><span id="skintones"></span></div>
        <div class="opt-row"><span class="muted">Hair color:</span><span id="haircolors"></span></div>
        <div class="opt-row"><span class="muted">Clothing:</span><span id="clothcolors"></span></div>
        <button class="btn gold big" data-act="newgame" style="margin-top:12px">Begin Adventure</button>
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
    // gender buttons
    panel.querySelectorAll('[data-act="setgender"]').forEach((b) => {
      b.addEventListener('click', () => { this._cust.gender = b.dataset.arg; });
    });
  }

  _collectCustomization() {
    const input = document.getElementById('name-input');
    this._cust.name = input ? input.value.trim() || 'Hunter' : 'Hunter';
  }

  _continue() {
    const slots = this.game.save.listSlots();
    if (!slots.length) { this.game.toast('No saved games yet.'); return; }
    const mostRecent = slots.reduce((a, b) => (a.ts > b.ts ? a : b));
    const r = this.game.save.load(mostRecent.slot);
    if (r.ok) { this.close(); this.game.toast(r.message); }
  }

  _startOnline() {
    this._collectCustomization();
    const c = this._cust;
    this.game.newGame({
      name: c.name, gender: c.gender, skinTone: SKIN_TONES[c.skin],
      hairColor: HAIR_COLORS[c.hair], clothColor: CLOTH_COLORS[c.cloth], hairStyle: 0
    });
    const url = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws';
    this.game.toast('Connecting to the shared world...');
    this.game.multiplayer.connect(url, c.name).then((r) => {
      if (!r.ok) this.game.toast('Connection failed: ' + (r.message || 'unreachable'));
    });
    this.showSkillSelection();
  }

  _disconnect() {
    this.game.multiplayer.disconnect();
    this.close();
    this.game.toast('Left the shared world.');
  }

  _startNewGame() {
    this._collectCustomization();
    const c = this._cust;
    this.game.newGame({
      name: c.name, gender: c.gender, skinTone: SKIN_TONES[c.skin],
      hairColor: HAIR_COLORS[c.hair], clothColor: CLOTH_COLORS[c.cloth], hairStyle: 0
    });
    this.showSkillSelection();
  }

  // Choose up to 3 active skills (also reachable in-game with O)
  showSkillSelection() {
    const g = this.game;
    const as = g.activeSkills;
    let html = `<div class="muted">Choose up to <b>3 active skills</b> (use them with hotkeys <b>1 / 2 / 3</b>). You can change this anytime by pressing <b>O</b>.</div><div class="grid2">`;
    for (const s of ACTIVE_SKILLS) {
      const selected = as.selected.includes(s.id);
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
