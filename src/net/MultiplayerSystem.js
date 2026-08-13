import { NetworkClient } from './NetworkClient.js';

// Client-side multiplayer controller (Phase 5 foundation).
//  - connects to the authoritative server
//  - sends local inputs (client prediction for own movement)
//  - reconciles remote players from server snapshots with interpolation
export class MultiplayerSystem {
  constructor(game) {
    this.game = game;
    this.client = new NetworkClient();
    this.connected = false;
    this.connecting = false;
    this.myId = null;
    this._targets = new Map(); // remote id -> latest snapshot {x,y,facing}
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

  _onMessage(msg) {
    const g = this.game;
    switch (msg.type) {
      case 'welcome':
        this.myId = msg.id;
        if (msg.spawn) { g.player.x = msg.spawn.x; g.player.y = msg.spawn.y; }
        for (const p of msg.players) this._targets.set(p.id, p);
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
    }
  }

  _onClose() {
    const g = this.game;
    this.connected = false;
    this._targets.clear();
    g.remotePlayers = [];
    g.toast('Disconnected from the server.');
  }

  update(dt) {
    if (!this.connected || !this.game.player) return;
    const g = this.game;
    const p = g.player;
    // send inputs at ~30 Hz
    this._inputTimer -= dt;
    if (this._inputTimer <= 0) {
      this._inputTimer = 1 / 30;
      const dir = g.input.dirVector();
      this.client.send({ type: 'input', dir: { x: dir.x, y: dir.y }, facing: p.facing });
    }
    // create / remove / update remote player proxies
    for (const [id, t] of this._targets) {
      let r = g.remotePlayers.find((x) => x.id === id);
      if (!r) {
        const { RemotePlayer } = g;
        r = new RemotePlayer(id, t.name, t.x, t.y, t.colors);
        g.remotePlayers.push(r);
      }
      r.targetX = t.x; r.targetY = t.y; r.facing = t.facing;
    }
    g.remotePlayers = g.remotePlayers.filter((r) => this._targets.has(r.id));
    for (const r of g.remotePlayers) r.update(dt);
  }

  disconnect() {
    this.client.close();
    this.connected = false;
    this.connecting = false;
    this._targets.clear();
    this.game.remotePlayers = [];
  }
}
