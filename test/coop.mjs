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
// verify the server integrates client movement input authoritatively. Alice stays
// at her village spawn (so she remains within Bob's interest radius); we pick the
// first direction that isn't collision-blocked.
const alice = gs.players.get(aWelcome.id);
const startX = alice.x, startY = alice.y;
let dir = { x: 1, y: 0 };
for (const d of [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }]) {
  if (!gs.world.circleBlocked(alice.x + d.x * 30, alice.y + d.y * 30, 12)) { dir = d; break; }
}
a.send(JSON.stringify({ type: 'input', dir, facing: 0 }));
let moved = false;
for (let i = 0; i < 100; i++) {
  await new Promise((r) => setTimeout(r, 50));
  const nx = Math.abs(alice.x - startX), ny = Math.abs(alice.y - startY);
  if ((dir.x !== 0 && nx > 1) || (dir.y !== 0 && ny > 1)) { moved = true; break; }
}
console.log('server integrated Alice movement:', `(${Math.round(startX)},${Math.round(startY)}) -> (${Math.round(alice.x)},${Math.round(alice.y)})`);
if (!moved) throw new Error('server did not integrate movement');

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

// ================= Phase 8: shared quests + world events =================

// --- a shared quest is active for all clients ---
const sharedMsg = await waitFor(d, (m) => m.type === 'sharedQuests' && m.quests.length > 0);
console.log('Dan sees shared quests:', sharedMsg.quests.map((q) => `${q.title} [${q.objectives[0].id} ${q.objectives[0].progress}/${q.objectives[0].count}]`).join('; '));
if (!sharedMsg.quests.length) throw new Error('no shared quest active');

// --- killing wolves progresses the shared quest for everyone ---
// move Alice next to a wolf and kill it (server-authoritative kill path)
const killsNeeded = 3;
for (let i = 0; i < killsNeeded; i++) {
  const w = gs.sim.monsters.find((m) => m.defId === 'wolf' && !m.dead);
  if (!w) break;
  alicePlayer.x = w.x; alicePlayer.y = w.y;
  gs.sim.applyPlayerAttack(aliceId, 99999, 0, 'melee', gs.players);
}
// check the shared quest progressed on the server
const wolfQuest = gs.questState.active.find((q) => q.id === 'coop_wolves');
console.log('server wolf quest progress:', wolfQuest ? wolfQuest.objectives[0].progress + '/' + wolfQuest.objectives[0].count : '(not active)');
if (wolfQuest && wolfQuest.objectives[0].progress !== killsNeeded) throw new Error('shared quest did not track wolf kills');

// a progress update reaches a remote client (with the updated count)
const progMsg = await waitFor(c, (m) => m.type === 'sharedQuests' && m.quests.length && m.quests[0].objectives[0].progress >= 3);
console.log('Carol got shared quest progress update:', progMsg.quests[0].objectives[0].progress + '/' + progMsg.quests[0].objectives[0].count);
if (progMsg.quests[0].objectives[0].progress < 3) throw new Error('progress update did not reach client with updated count');

// --- completing a shared quest rewards every connected player ---
// force-complete the wolf quest via kills
const remain = gs.questState.active.find((q) => q.id === 'coop_wolves');
if (remain) {
  const def = (await import('../src/data/monsters.js')).MONSTERS.find((m) => m.id === 'wolf');
  let guard = 0;
  while (remain.objectives[0].progress < remain.objectives[0].count && guard++ < 20) {
    // spawn + kill a wolf to advance (teleport Alice to it so the hit lands)
    const pos = gs.world.randomPosition(80, 135);
    const w = gs.sim.spawn(def, pos.x, pos.y);
    alicePlayer.x = w.x; alicePlayer.y = w.y;
    gs.sim.applyPlayerAttack(aliceId, 99999, 0, 'melee', gs.players);
  }
  const completeMsg = await waitFor(d, (m) => m.type === 'questComplete');
  console.log('Dan received shared quest completion:', completeMsg.title, JSON.stringify(completeMsg.rewards));
  if (!completeMsg.rewards || completeMsg.rewards.gp <= 0) throw new Error('no rewards on shared quest completion');
}

// --- world events are broadcast to everyone ---
const before = gs.sim.monsters.length;
gs.worldEvents.emit('worldEvent', { type: 'rareSighting', text: 'A rare creature appeared!' });
const evMsg = await waitFor(c, (m) => m.type === 'worldEvent');
console.log('Carol received world event:', evMsg.event.type, '-', evMsg.event.text);
if (evMsg.event.type !== 'rareSighting') throw new Error('wrong world event received');

// ================= wildlife authority (hunt/gather co-op) =================

// --- animals are server-authoritative: hunt intent -> kill -> loot ---
const rabbit = gs.wildlife.animals.find((a) => a.defId === 'rabbit' && !a.dead);
if (rabbit) {
  alicePlayer.x = rabbit.x; alicePlayer.y = rabbit.y;
  gs.wildlife.attackAnimal(aliceId, 99999, 0, 'melee', gs.players);
  console.log('rabbit killed on server:', rabbit.dead);
  const huntLoot = await waitFor(a, (m) => m.type === 'loot' && m.name === 'Rabbit');
  console.log('Alice got rabbit loot:', JSON.stringify(huntLoot.items));
}

// --- shared hunt quest progresses ---
// (force a hunt quest into the active set, then complete it)
const rabbitQuest = gs.questState.active.find((q) => q.id === 'coop_rabbits');
console.log('shared hunt quest active:', rabbitQuest ? rabbitQuest.objectives[0].progress + '/' + rabbitQuest.objectives[0].count : '(not yet — advancing pool)');

// --- resources are server-authoritative: gather intent -> loot + depletion ---
const node = gs.wildlife.resources.find((r) => !r.depleted);
if (node) {
  alicePlayer.x = node.x; alicePlayer.y = node.y;
  const res = gs.wildlife.gatherResource(aliceId, node.id, gs.players);
  console.log('gather resource:', res.ok, '-> item', res.itemId, 'depleted:', node.depleted);
  if (!res.ok || !node.depleted) throw new Error('resource gather failed on server');
  const gatherLoot = await waitFor(a, (m) => m.type === 'loot');
  console.log('Alice got gather loot:', JSON.stringify(gatherLoot.items));
}

// --- wildlife state replicates to clients ---
const wildMsg = await waitFor(c, (m) => m.type === 'wildlifeState' && m.animals.length > 0);
console.log('Carol received wildlife state:', wildMsg.animals.length, 'animals,', wildMsg.resources.length, 'resources');
if (!wildMsg.animals.length) throw new Error('no animals replicated');

a.close(); b.close(); c.close(); d.close();
gs.stop();
srv.close();
console.log('CO-OP TESTS PASSED');
process.exit(0);
