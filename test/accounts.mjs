// Accounts + server-side save end-to-end: register, save, re-login, wrong password.
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// use a throwaway save file so we never touch the real data dir
const tmp = path.join(os.tmpdir(), 'vh-accounts-' + Date.now() + '.json');
process.env.VERDANT_SAVE_FILE = tmp;

const { GameServer } = await import('../server/game-server.js');
const { handleUpgrade } = await import('../server/ws.js');

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
function waitFor(ws, pred, timeout = 4000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      const i = ws._queue.findIndex(pred);
      if (i >= 0) { resolve(ws._queue.splice(i, 1)[0]); return; }
      if (Date.now() - start > timeout) reject(new Error('timed out')); else setTimeout(check, 15);
    };
    check();
  });
}

const { gs, srv } = makeServer();
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const url = `ws://127.0.0.1:${srv.address().port}`;

// 1. first login with a password = registration; saveData should be null
let a = await connect(url);
a.send(JSON.stringify({ type: 'login', name: 'Hunter_Alice', password: 'pw123' }));
let welcome = await waitFor(a, (m) => m.type === 'welcome');
console.log('first login saveData null:', welcome.saveData === null);
if (welcome.saveData !== null) throw new Error('new account should have no save yet');

// 2. send a save with distinctive data
a.send(JSON.stringify({ type: 'save', data: { player: { x: 5000, y: 6000, gold: 999, level: 7, name: 'Hunter_Alice' } } }));
await new Promise((r) => setTimeout(r, 600)); // let the debounced write flush
a.close();
await new Promise((r) => setTimeout(r, 100));

// 3. re-login with the same password -> save restored
let b = await connect(url);
b.send(JSON.stringify({ type: 'login', name: 'Hunter_Alice', password: 'pw123' }));
welcome = await waitFor(b, (m) => m.type === 'welcome');
console.log('re-login gold:', welcome.saveData.player.gold, 'level:', welcome.saveData.player.level, 'spawn:', welcome.spawn.x, welcome.spawn.y);
if (welcome.saveData.player.gold !== 999) throw new Error('saved gold not restored');
if (welcome.saveData.player.level !== 7) throw new Error('saved level not restored');
if (welcome.spawn.x !== 5000 || welcome.spawn.y !== 6000) throw new Error('saved position not used for spawn');
b.close();
await new Promise((r) => setTimeout(r, 100));

// 4. wrong password -> loginError
let c = await connect(url);
c.send(JSON.stringify({ type: 'login', name: 'Hunter_Alice', password: 'wrong' }));
const err = await waitFor(c, (m) => m.type === 'loginError');
console.log('wrong password error:', err.error);
if (!err.error.includes('Wrong')) throw new Error('expected wrong-password error');
c.close();

// 5. guest login (no password) -> no saveData, works fine
let d = await connect(url);
d.send(JSON.stringify({ type: 'login', name: 'GuestName', password: '' }));
welcome = await waitFor(d, (m) => m.type === 'welcome');
console.log('guest saveData null:', welcome.saveData === null);
if (welcome.saveData !== null) throw new Error('guest should not receive account save');
d.close();

srv.close();
try { fs.rmSync(tmp, { force: true }); fs.rmSync(tmp + '.tmp', { force: true }); } catch (e) {}
console.log('ACCOUNTS + SERVER SAVE TESTS PASSED');
process.exit(0);
