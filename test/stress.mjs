// Phase 10 — multiplayer stress test.
// Connects many concurrent WebSocket clients to the authoritative server and
// verifies it stays responsive: join latency, replication throughput, server
// tick time under budget, and clean handling of mass connect/disconnect.
import http from 'node:http';
import { performance } from 'node:perf_hooks';
import { GameServer } from '../server/game-server.js';
import { handleUpgrade } from '../server/ws.js';

const CLIENTS = parseInt(process.env.STRESS_CLIENTS || '60', 10);

function makeServer() {
  const gs = new GameServer();
  const srv = http.createServer((req, res) => { res.writeHead(200); res.end('ok'); });
  srv.on('upgrade', (req, socket) => { const ws = handleUpgrade(req, socket); if (ws) gs.handle(ws); });
  return { gs, srv };
}

function connect(url, name) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws._count = 0;
    ws.onopen = () => { ws.onmessage = () => { ws._count++; }; resolve(ws); };
    ws.onerror = (e) => reject(e);
  });
}

const { gs, srv } = makeServer();
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const port = srv.address().port;
const url = `ws://127.0.0.1:${port}`;

// ---- connect CLIENTS clients, measure join latency ----
const tStart = performance.now();
const clients = [];
let maxWelcomeMs = 0;
for (let i = 0; i < CLIENTS; i++) {
  const c = await connect(url);
  const j = performance.now();
  c.send(JSON.stringify({ type: 'join', name: 'P' + i, colors: {} }));
  // wait for the welcome on this client (interleave connections)
  await new Promise((res) => {
    const orig = c.onmessage;
    c.onmessage = (ev) => { orig(ev); const m = JSON.parse(ev.data); if (m.type === 'welcome') res(); };
  });
  maxWelcomeMs = Math.max(maxWelcomeMs, performance.now() - j);
  clients.push(c);
}
const joinMs = performance.now() - tStart;
console.log(`connected ${CLIENTS} clients in ${joinMs.toFixed(0)}ms (max single welcome ${maxWelcomeMs.toFixed(1)}ms)`);

// ---- drive inputs from all clients, let the server tick in real time ----
const runMs = 2500;
const t0 = performance.now();
const inputTimer = setInterval(() => {
  for (const c of clients) {
    c.send(JSON.stringify({ type: 'input', dir: { x: Math.random() * 2 - 1, y: Math.random() * 2 - 1 }, facing: Math.random() * 6.28 }));
    c.send(JSON.stringify({ type: 'attack', damage: 15, facing: 0, weaponType: 'melee' }));
  }
}, 1000 / 30);
await new Promise((r) => setTimeout(r, runMs));
clearInterval(inputTimer);
const elapsed = (performance.now() - t0) / 1000;

// total replicated state messages received across clients
const totalMsgs = clients.reduce((s, c) => s + c._count, 0);
const msgsPerSec = Math.round(totalMsgs / elapsed);
console.log(`received ${totalMsgs} messages in ${elapsed.toFixed(1)}s (~${msgsPerSec} msg/s across ${CLIENTS} clients)`);

// server tick time (measured inside GameServer)
console.log(`server last tick: ${gs.lastTickMs.toFixed(2)}ms (budget ${(1000 / 20).toFixed(0)}ms)`);
if (gs.lastTickMs > 40) throw new Error(`server tick over budget: ${gs.lastTickMs.toFixed(1)}ms`);

// monsters + players are live
console.log(`server state: ${gs.players.size} players, ${gs.sim.monsters.length} monsters`);

// ---- mass disconnect: server should clean up without crashing ----
for (const c of clients) c.close();
await new Promise((r) => setTimeout(r, 300));
console.log(`after disconnect: ${gs.players.size} players remain`);
if (gs.players.size !== 0) throw new Error(`players not cleaned up: ${gs.players.size} remain`);

// server still ticking after the storm
gs.tick();
console.log(`server still healthy after mass disconnect (tick ${gs.lastTickMs.toFixed(2)}ms)`);

gs.stop();
srv.close();
console.log('STRESS TEST PASSED');
process.exit(0);
