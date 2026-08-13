// Authoritative multiplayer game server.
//
// Phase 5: authoritative player positions + replication + interest management.
// Phase 7: authoritative monsters — the server owns monster state, AI, combat
//          resolution, deaths, and loot, and scales bosses by party size.
import { WorldSystem, PX_W, PX_H } from '../src/world/WorldSystem.js';
import { MonsterSim } from './monster-sim.js';
import { WildlifeSim } from './wildlife-sim.js';
import { SharedQuestState } from './quest-state.js';
import { WorldEvents } from './world-events.js';

const SPEED = 140;
const TICK_RATE = 20;
const INTEREST_RADIUS = 1600;  // players synced within this distance
const MONSTER_INTEREST = 2000; // monsters synced within this distance (bosses always)

export class GameServer {
  constructor(seed = 12345) {
    this.world = new WorldSystem(seed);
    this.players = new Map();
    this.sim = new MonsterSim(this.world);
    this.sim.emit = (type, data) => this._routeEvent(type, data);
    this.wildlife = new WildlifeSim(this.world);
    this.wildlife.emit = (type, data) => this._routeEvent(type, data);
    this.questState = new SharedQuestState();
    this.questState.emit = (type, data) => this._routeEvent(type, data);
    this.worldEvents = new WorldEvents(this.world, this.sim);
    this.worldEvents.emit = (type, data) => this._routeEvent(type, data);
    this.nextId = 1;
    this.lastTickMs = 0;
    this._timer = setInterval(() => this.tick(), 1000 / TICK_RATE);
    this._timer.unref?.();
  }

  stop() { clearInterval(this._timer); }

  handle(ws) {
    ws.onmessage = (ev) => {
      let msg; try { msg = JSON.parse(ev.data); } catch { return; }
      this._onMessage(ws, msg);
    };
    ws.onclose = () => {
      const p = this.players.get(ws.playerId);
      if (p) {
        this.players.delete(ws.playerId);
        this._broadcast({ type: 'leave', id: p.id });
        this.sim.rescale(this.players.size);
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
          dir: { x: 0, y: 0 }, colors: msg.colors || {}, ws
        };
        ws.playerId = id;
        this.players.set(id, player);
        this.sim.rescale(this.players.size);
        this.questState.maybeActivate();
        const others = [...this.players.values()].filter((p) => p.id !== id).map((p) => this._serialize(p));
        ws.send(JSON.stringify({ type: 'welcome', id, spawn: { x: spawn.x, y: spawn.y }, players: others }));
        ws.send(JSON.stringify({ type: 'sharedQuests', quests: this.questState.serialize() }));
        this._broadcast({ type: 'join', player: this._serialize(player) }, id);
        break;
      }
      case 'input': {
        const p = this.players.get(ws.playerId);
        if (p) {
          let x = Number(msg.dir?.x) || 0, y = Number(msg.dir?.y) || 0;
          const mag = Math.hypot(x, y);
          if (mag > 1.01) { x /= mag; y /= mag; }
          p.dir = { x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) };
          p.facing = Number(msg.facing) || 0;
        }
        break;
      }
      case 'attack': {
        const p = this.players.get(ws.playerId);
        if (!p) break;
        const damage = Math.max(1, Math.round(Number(msg.damage) || 0));
        const facing = Number(msg.facing) || p.facing;
        const weaponType = msg.weaponType === 'bow' ? 'bow' : 'melee';
        this.sim.applyPlayerAttack(p.id, damage, facing, weaponType, this.players);
        break;
      }
      case 'huntHit': {
        const p = this.players.get(ws.playerId);
        if (!p) break;
        const damage = Math.max(1, Math.round(Number(msg.damage) || 0));
        const facing = Number(msg.facing) || p.facing;
        const weaponType = msg.weaponType === 'bow' ? 'bow' : 'melee';
        this.wildlife.attackAnimal(p.id, damage, facing, weaponType, this.players);
        break;
      }
      case 'gather': {
        const p = this.players.get(ws.playerId);
        if (!p) break;
        this.wildlife.gatherResource(p.id, Number(msg.resourceId), this.players);
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
  _sendTo(playerId, obj) {
    const p = this.players.get(playerId);
    if (p) try { p.ws.send(JSON.stringify(obj)); } catch (e) {}
  }

  // route authoritative events to clients (interest-aware where appropriate)
  _routeEvent(type, data) {
    switch (type) {
      case 'playerDamage':
        this._sendTo(data.to, { type: 'playerDamage', amount: data.amount, status: data.status, from: data.from });
        break;
      case 'monsterHit':
      case 'monsterPhase':
        this._broadcast({ type, ...data });
        break;
      case 'monsterDeath':
        this._broadcast({ type, id: data.id, to: data.to, defId: data.defId });
        this.questState.onKill(data.defId);
        break;
      case 'animalHit':
        this._broadcast({ type, id: data.id, hp: data.hp, damage: data.damage });
        break;
      case 'animalDeath':
        this._broadcast({ type, id: data.id, to: data.to, defId: data.defId });
        this.questState.onHunt(data.defId);
        break;
      case 'resourceGathered':
        this._broadcast({ type, id: data.id, to: data.to });
        break;
      case 'loot':
        this._sendTo(data.to, { type: 'loot', items: data.items, name: data.name });
        break;
      case 'questState':
        this._broadcast({ type: 'sharedQuests', quests: data });
        break;
      case 'questComplete':
        this._broadcast({ type: 'questComplete', id: data.id, title: data.title, rewards: data.rewards });
        break;
      case 'worldEvent':
        this._broadcast({ type: 'worldEvent', event: data });
        break;
    }
  }

  tick() {
    const t0 = performance.now();
    const dt = 1 / TICK_RATE;
    // integrate authoritative player movement
    for (const p of this.players.values()) {
      if (p.dir.x === 0 && p.dir.y === 0) continue;
      const dx = p.dir.x * SPEED * dt, dy = p.dir.y * SPEED * dt;
      p.x += dx; p.y += dy;
      p.x = Math.max(24, Math.min(PX_W - 24, p.x));
      p.y = Math.max(24, Math.min(PX_H - 24, p.y));
      if (this.world.circleBlocked(p.x, p.y, 12)) { p.x -= dx; p.y -= dy; }
    }
    // authoritative monster simulation (AI + combat + phases)
    this.sim.tick(dt, this.players);
    // authoritative wildlife & resources (hunt/gather)
    this.wildlife.tick(dt, this.players);
    // shared world events (raids, migrations, rare sightings)
    this.worldEvents.tick(dt);

    // replicate players (interest management)
    for (const p of this.players.values()) {
      const visible = [];
      for (const o of this.players.values()) {
        if (o.id === p.id) continue;
        if (Math.hypot(o.x - p.x, o.y - p.y) <= INTEREST_RADIUS) {
          visible.push({ id: o.id, x: Math.round(o.x), y: Math.round(o.y), facing: o.facing });
        }
      }
      try { p.ws.send(JSON.stringify({ type: 'state', players: visible })); } catch (e) {}
      // replicate monsters (interest management; bosses always visible)
      const monsters = [];
      for (const m of this.sim.monsters) {
        if (m.dead) continue;
        const d = Math.hypot(m.x - p.x, m.y - p.y);
        if (d <= MONSTER_INTEREST || m.boss) monsters.push(this.sim.serialize(m));
      }
      try { p.ws.send(JSON.stringify({ type: 'monsterState', monsters })); } catch (e) {}
      // replicate wildlife (interest-managed; resources within a larger radius)
      const animals = [];
      for (const a of this.wildlife.animals) {
        if (a.dead) continue;
        if (Math.hypot(a.x - p.x, a.y - p.y) <= 1600) {
          animals.push({ id: a.id, defId: a.defId, x: Math.round(a.x), y: Math.round(a.y), radius: a.radius, hp: a.hp, maxHp: a.maxHp, color: a.color, facing: a.facing });
        }
      }
      const resources = [];
      for (const r of this.wildlife.resources) {
        if (Math.hypot(r.x - p.x, r.y - p.y) <= 2200) {
          resources.push({ id: r.id, kind: r.kind, x: Math.round(r.x), y: Math.round(r.y), depleted: r.depleted });
        }
      }
      try { p.ws.send(JSON.stringify({ type: 'wildlifeState', animals, resources })); } catch (e) {}
    }
    // purge dead monsters & animals (death events already emitted)
    this.sim.monsters = this.sim.monsters.filter((m) => !m.dead);
    this.wildlife.animals = this.wildlife.animals.filter((a) => !a.dead);
    this.lastTickMs = performance.now() - t0;
  }
}
