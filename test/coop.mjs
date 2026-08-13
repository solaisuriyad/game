// End-to-end co-op test: real WebSocket clients against the authoritative
// server. Validates handshake, join/welcome, replication, input -> state sync,
// and interest management.
import http from 'node:http';
import { GameServer } from '../server/game-server.js';
import { handleUpgrade } from '../server/ws.js';

function makeServer() {
  const gs = new GameServer();
  const srv = http.createServer((req, res) => { res.writeHead(200); res.end('ok'); });
  srv.on('upgrade', (req, socket) => { const ws = handleUpgrade(req, socket); if (ws) gs.handle(ws); });
  return { gs, srv };
}

function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws._queue = [];
    ws.onopen = () => { ws.onmessage = (ev) => ws._queue.push(JSON.parse(ev.data)); resolve(ws); };
    ws.onerror = (e) => reject(e);
  });
}

function waitFor(ws, predicate, timeout = 4000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      const i = ws._queue.findIndex(predicate);
      if (i >= 0) { resolve(ws._queue.splice(i, 1)[0]); return; }
      if (Date.now() - start > timeout) { reject(new Error('timed out waiting for message')); return; }
      setTimeout(check, 15);
    };
    check();
  });
}

const { gs, srv } = makeServer();
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const port = srv.address().port;
const url = `ws://127.0.0.1:${port}`;

// --- connect two clients ---
const a = await connect(url);
const b = await connect(url);

// --- joins ---
a.send(JSON.stringify({ type: 'join', name: 'Alice', colors: { clothColor: '#a04040' } }));
const aWelcome = await waitFor(a, (m) => m.type === 'welcome');
b.send(JSON.stringify({ type: 'join', name: 'Bob', colors: { clothColor: '#4040a0' } }));
const bWelcome = await waitFor(b, (m) => m.type === 'welcome');

console.log('A welcome: id=', aWelcome.id, 'knownPlayers=', aWelcome.players.length);
console.log('B welcome: id=', bWelcome.id, 'knownPlayers=', bWelcome.players.length, '(expect 1 = Alice)');
if (aWelcome.players.length !== 0) throw new Error('A should see no existing players');
if (bWelcome.players.length !== 1 || bWelcome.players[0].name !== 'Alice') throw new Error('B should see Alice in welcome');

// A learns about Bob via a 'join' broadcast
const aJoinBob = await waitFor(a, (m) => m.type === 'join' && m.player.name === 'Bob');
console.log('A saw join event:', aJoinBob.player.name, 'colors=', aJoinBob.player.colors.clothColor);

// --- input -> authoritative movement -> replication ---
a.send(JSON.stringify({ type: 'input', dir: { x: 1, y: 0 }, facing: 0 }));
await new Promise((r) => setTimeout(r, 250));
const alice = gs.players.get(aWelcome.id);
console.log('server integrated Alice movement: spawn x=', aWelcome.spawn.x, 'now x=', Math.round(alice.x));
if (alice.x <= aWelcome.spawn.x + 1) throw new Error('server did not integrate movement');

const bState = await waitFor(b, (m) => m.type === 'state' && m.players.some((p) => p.id === aWelcome.id));
console.log('B received replicated state for Alice:', JSON.stringify(bState.players.find((p) => p.id === aWelcome.id)));

// --- interest management: move Alice far away, B should stop seeing her ---
const bob = gs.players.get(bWelcome.id);
alice.x = bob.x + 8000; alice.y = bob.y;
gs.tick();
const bStateNoAlice = await waitFor(b, (m) => m.type === 'state' && !(m.players || []).some((p) => p.id === aWelcome.id));
console.log('interest management: B no longer receives Alice (expected true):', true);
console.log('  state players=', JSON.stringify(bStateNoAlice.players));

// --- leave handling ---
b.send(JSON.stringify({ type: 'leave' })); // (leave is handled via socket close, not message)
b.close();
const aLeave = await waitFor(a, (m) => m.type === 'leave' && m.id === bWelcome.id);
console.log('A saw Bob leave:', aLeave.id === bWelcome.id);

// ================= Phase 7: combat authority + boss scaling =================
// (Bob left above, so only Alice is connected — party of 1)

const guardian = gs.sim.monsters.find((m) => m.defId === 'forest_guardian');
const baseGuardianHp = guardian.baseHp;
console.log('guardian base hp=', baseGuardianHp, 'party of 1 ->', guardian.maxHp);

// connect a 2nd player -> boss scales to 1.5x
const c = await connect(url);
c.send(JSON.stringify({ type: 'join', name: 'Carol', colors: {} }));
const cWelcome = await waitFor(c, (m) => m.type === 'welcome');
console.log('guardian hp with 2 players =', guardian.maxHp, '(expected', Math.round(baseGuardianHp * 1.5), ')');
if (guardian.maxHp !== Math.round(baseGuardianHp * 1.5)) throw new Error('boss HP not scaled for 2 players: ' + guardian.maxHp);

// a 3rd player -> 2.0x
const d = await connect(url);
d.send(JSON.stringify({ type: 'join', name: 'Dan', colors: {} }));
const dWelcome = await waitFor(d, (m) => m.type === 'welcome');
console.log('guardian hp with 3 players =', guardian.maxHp, '(expected', Math.round(baseGuardianHp * 2.0), ')');
if (guardian.maxHp !== Math.round(baseGuardianHp * 2.0)) throw new Error('boss HP not scaled for 3 players: ' + guardian.maxHp);

// --- attack -> monsterHit -> death -> loot (server-authoritative) ---
const aliceId = aWelcome.id;
const alicePlayer = gs.players.get(aliceId);
// find a nearby monster and place Alice beside it
let victim = gs.sim.monsters.find((m) => !m.dead && !m.boss);
alicePlayer.x = victim.x; alicePlayer.y = victim.y;
gs.sim.applyPlayerAttack(aliceId, 9999, 0, 'melee', gs.players);
console.log('victim dead:', victim.dead, 'loot rolled on server');
// Alice should receive a loot message (killing blow)
const lootMsg = await waitFor(a, (m) => m.type === 'loot');
console.log('Alice received loot:', JSON.stringify(lootMsg.items), 'from', lootMsg.name);
if (!Array.isArray(lootMsg.items) || lootMsg.items.length === 0) throw new Error('no loot delivered to killer');

// --- playerDamage event: a monster near Alice attacks, she takes damage ---
const wolf = gs.sim.monsters.find((m) => m.defId === 'wolf' && !m.dead);
if (wolf) {
  wolf.x = alicePlayer.x - 30; wolf.y = alicePlayer.y;
  wolf.targetId = aliceId; wolf.aggroTimer = 60;
  wolf.attackCd = 0;
  // force a melee basic strike on the next tick
  gs.sim.tick(1 / 20, gs.players);
  const dmgMsg = await waitFor(a, (m) => m.type === 'playerDamage', 3000);
  console.log('Alice received playerDamage:', dmgMsg.amount, 'status=', dmgMsg.status);
  if (dmgMsg.amount <= 0) throw new Error('player damage not delivered');
}

// --- monster state replication to a client ---
const stateMsg = await waitFor(c, (m) => m.type === 'monsterState' && m.monsters.length > 0);
console.log('Carol received monster state with', stateMsg.monsters.length, 'monsters; boss present:', stateMsg.monsters.some((m) => m.boss));
if (!stateMsg.monsters.some((m) => m.boss)) throw new Error('boss not in replicated monster state');

a.close(); b.close(); c.close(); d.close();
gs.stop();
srv.close();
console.log('CO-OP TESTS PASSED');
process.exit(0);
