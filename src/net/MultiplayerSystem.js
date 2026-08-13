import { NetworkClient } from './NetworkClient.js';
import { MONSTERS } from '../data/monsters.js';
import { RemoteMonster } from '../entities/RemoteMonster.js';

// Client-side multiplayer controller.
//  Phase 5: positional sync + prediction + interpolation.
//  Phase 7: server-authoritative monsters — send attack intents, apply server
//           monster state, damage events, deaths and loot.
export class MultiplayerSystem {
  constructor(game) {
    this.game = game;
    this.client = new NetworkClient();
    this.connected = false;
    this.connecting = false;
    this.myId = null;
    this._targets = new Map();   // remote player id -> snapshot
    this._monsters = new Map();  // remote monster id -> RemoteMonster
    this._inputTimer = 0;
  }

  async connect(url, name) {
    const g = this.game;
    const p = g.player;
    this.connecting = true;
    try {
      await this.client.connect(url);
    } catch (e) {
      this.connecting = false;
      g.toast('Could not connect to the server.');
      return { ok: false, message: e.message };
    }
    this.connecting = false;
    this.connected = true;
    this.myId = null;
    this.client.onMessage = (msg) => this._onMessage(msg);
    this.client.onClose = () => this._onClose();
    this.client.send({
      type: 'join', name,
      colors: { skinTone: p.skinTone, hairColor: p.hairColor, clothColor: p.clothColor }
    });
    g.toast('Connected to the shared world.');
    return { ok: true };
  }

  sendAttack({ damage, facing, weaponType }) {
    if (!this.connected) return;
    this.client.send({ type: 'attack', damage, facing, weaponType });
  }

  _onMessage(msg) {
    const g = this.game;
    switch (msg.type) {
      case 'welcome':
        this.myId = msg.id;
        if (msg.spawn) { g.player.x = msg.spawn.x; g.player.y = msg.spawn.y; }
        for (const p of msg.players) this._targets.set(p.id, p);
        // switch to server-authoritative monsters
        g.monsters.length = 0;
        break;
      case 'join':
        this._targets.set(msg.player.id, msg.player);
        g.toast(`${msg.player.name} joined the world.`);
        break;
      case 'leave':
        this._targets.delete(msg.id);
        g.remotePlayers = g.remotePlayers.filter((r) => r.id !== msg.id);
        g.toast('A hunter left the world.');
        break;
      case 'state':
        for (const p of msg.players) {
          if (p.id === this.myId) continue;
          this._targets.set(p.id, p);
        }
        break;
      case 'monsterState':
        this._syncMonsters(msg.monsters);
        break;
      case 'monsterHit': {
        const m = this._monsters.get(msg.id);
        if (m) {
          m.hp = msg.hp;
          m.flash = 0.12;
          g.addFloatText(m.x, m.y - m.radius - 6, msg.damage, '#fff');
        }
        break;
      }
      case 'monsterPhase': {
        const m = this._monsters.get(msg.id);
        if (m) {
          g.addFloatText(m.x, m.y - m.radius - 12, msg.label || 'Transformed!', '#ff7a30');
          if (msg.color) m.color = msg.color;
        }
        break;
      }
      case 'monsterDeath': {
        const m = this._monsters.get(msg.id);
        if (m) { m.dead = true; g.addFloatText(m.x, m.y - m.radius - 6, 'Slain!', '#ffd76a'); }
        this._monsters.delete(msg.id);
        break;
      }
      case 'playerDamage':
        g.combat.damagePlayer(msg.amount, null, msg.status);
        break;
      case 'loot':
        for (const it of msg.items) g.inventory.addItem(it.item, it.qty, { silent: true });
        g.toast(`You received loot: ${msg.items.map((i) => `${i.qty}x ${this._itemName(i.item)}`).join(', ')}`);
        break;
    }
  }

  _itemName(id) {
    const it = this.game.items.get(id);
    return it ? it.name : id;
  }

  _syncMonsters(list) {
    const g = this.game;
    const seen = new Set();
    for (const data of list) {
      seen.add(data.id);
      let m = this._monsters.get(data.id);
      if (!m) {
        const def = MONSTERS.find((d) => d.id === data.defId);
        if (!def) continue;
        m = new RemoteMonster(g, def, data.id, data);
        this._monsters.set(data.id, m);
      } else {
        m.apply(data);
      }
    }
    g.remoteMonsters = [...this._monsters.values()].filter((m) => !m.dead);
  }

  _onClose() {
    const g = this.game;
    this.connected = false;
    this._targets.clear();
    this._monsters.clear();
    g.remotePlayers = [];
    g.remoteMonsters = [];
    g.sim.respawnMonsters(); // restore local single-player monsters
    g.toast('Disconnected from the server.');
  }

  update(dt) {
    if (!this.connected || !this.game.player) return;
    const g = this.game;
    const p = g.player;
    this._inputTimer -= dt;
    if (this._inputTimer <= 0) {
      this._inputTimer = 1 / 30;
      const dir = g.input.dirVector();
      this.client.send({ type: 'input', dir: { x: dir.x, y: dir.y }, facing: p.facing });
    }
    // remote players
    for (const [id, t] of this._targets) {
      let r = g.remotePlayers.find((x) => x.id === id);
      if (!r) { r = new g.RemotePlayer(id, t.name, t.x, t.y, t.colors); g.remotePlayers.push(r); }
      r.targetX = t.x; r.targetY = t.y; r.facing = t.facing;
    }
    g.remotePlayers = g.remotePlayers.filter((r) => this._targets.has(r.id));
    for (const r of g.remotePlayers) r.update(dt);
    // remote monsters (interpolation)
    for (const m of g.remoteMonsters) m.update(dt);
  }

  disconnect() {
    this.client.close();
    this.connected = false;
    this.connecting = false;
    this._targets.clear();
    this._monsters.clear();
    this.game.remotePlayers = [];
    this.game.remoteMonsters = [];
    this.game.sim.respawnMonsters();
  }
}
