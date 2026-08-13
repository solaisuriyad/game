// Authoritative multiplayer game server (Phase 5 foundation).
//
// The server is authoritative for player positions (it integrates movement from
// client inputs) and broadcasts a replicated state snapshot to each client.
// Interest management: each client only receives players within its radius.
//
// This is the seam where combat/NPC/monster authority (Phases 6–8) attach later —
// the message protocol and tick loop are already structured for it.
import { WorldSystem, PX_W, PX_H } from '../src/world/WorldSystem.js';

const SPEED = 140;          // matches single-player walk speed
const TICK_RATE = 20;       // server simulation & broadcast rate (Hz)
const INTEREST_RADIUS = 1600; // px — only sync players within this distance

export class GameServer {
  constructor(seed = 12345) {
    this.world = new WorldSystem(seed);
    this.players = new Map(); // id -> player record
    this.nextId = 1;
    this._timer = setInterval(() => this.tick(), 1000 / TICK_RATE);
    this._timer.unref?.();
  }

  stop() { clearInterval(this._timer); }

  handle(ws) {
    ws.onmessage = (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch { return; }
      this._onMessage(ws, msg);
    };
    ws.onclose = () => {
      const p = this.players.get(ws.playerId);
      if (p) {
        this.players.delete(ws.playerId);
        this._broadcast({ type: 'leave', id: p.id });
      }
    };
  }

  _onMessage(ws, msg) {
    switch (msg.type) {
      case 'join': {
        const id = this.nextId++;
        const spawn = this.world.randomVillagePosition();
        const player = {
          id, name: (msg.name || 'Hunter').slice(0, 20),
          x: spawn.x, y: spawn.y, facing: 0,
          dir: { x: 0, y: 0 },
          colors: msg.colors || {},
          ws
        };
        ws.playerId = id;
        this.players.set(id, player);
        const others = [...this.players.values()]
          .filter((p) => p.id !== id)
          .map((p) => this._serialize(p));
        ws.send(JSON.stringify({ type: 'welcome', id, spawn: { x: spawn.x, y: spawn.y }, players: others }));
        this._broadcast({ type: 'join', player: this._serialize(player) }, id);
        break;
      }
      case 'input': {
        const p = this.players.get(ws.playerId);
        if (p) {
          // clamp + normalize direction vector (server-side validation)
          let x = Number(msg.dir?.x) || 0, y = Number(msg.dir?.y) || 0;
          const mag = Math.hypot(x, y);
          if (mag > 1.01) { x /= mag; y /= mag; }
          p.dir = { x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) };
          p.facing = Number(msg.facing) || 0;
        }
        break;
      }
    }
  }

  _serialize(p) {
    return { id: p.id, name: p.name, x: Math.round(p.x), y: Math.round(p.y), facing: p.facing, colors: p.colors };
  }

  _broadcast(msg, exceptId = null) {
    const data = JSON.stringify(msg);
    for (const p of this.players.values()) {
      if (p.id === exceptId) continue;
      try { p.ws.send(data); } catch (e) {}
    }
  }

  tick() {
    const dt = 1 / TICK_RATE;
    // integrate authoritative movement (with world collision)
    for (const p of this.players.values()) {
      if (p.dir.x === 0 && p.dir.y === 0) continue;
      const dx = p.dir.x * SPEED * dt, dy = p.dir.y * SPEED * dt;
      p.x += dx; p.y += dy;
      p.x = Math.max(24, Math.min(PX_W - 24, p.x));
      p.y = Math.max(24, Math.min(PX_H - 24, p.y));
      if (this.world.circleBlocked(p.x, p.y, 12)) { p.x -= dx; p.y -= dy; }
    }
    // replicate to interested clients
    for (const p of this.players.values()) {
      const visible = [];
      for (const o of this.players.values()) {
        if (o.id === p.id) continue;
        if (Math.hypot(o.x - p.x, o.y - p.y) <= INTEREST_RADIUS) {
          visible.push({ id: o.id, x: Math.round(o.x), y: Math.round(o.y), facing: o.facing });
        }
      }
      try { p.ws.send(JSON.stringify({ type: 'state', players: visible })); } catch (e) {}
    }
  }
}
