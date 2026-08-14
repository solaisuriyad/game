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

// Alice joins
const a = await connect(url);
a.send(JSON.stringify({ type: 'join', name: 'Alice' }));
const aw = await waitFor(a, (m) => m.type === 'welcome');
const aOnline = await waitFor(a, (m) => m.type === 'online');
console.log('Alice online list:', aOnline.players.map(p=>p.name).join(', '));

// Bob joins -> Alice gets a system chat "Bob joined" + updated online list
const b = await connect(url);
b.send(JSON.stringify({ type: 'join', name: 'Bob' }));
await waitFor(b, (m) => m.type === 'welcome');
const sysJoin = await waitFor(a, (m) => m.type === 'chat' && m.system);
console.log('Alice sees system chat:', sysJoin.text);
if (!sysJoin.text.includes('Bob')) throw new Error('join system message missing Bob');
const aOnline2 = await waitFor(a, (m) => m.type === 'online');
if (aOnline2.players.length !== 2) throw new Error('online list should have 2 players');

// Bob sends a chat message -> Alice receives it (and Bob doesn't get it back via broadcast? it broadcasts to all incl Bob)
b.send(JSON.stringify({ type: 'chat', text: 'hello hunters' }));
const chatToA = await waitFor(a, (m) => m.type === 'chat' && m.text === 'hello hunters');
console.log('Alice receives chat:', chatToA.name + ': ' + chatToA.text);
if (chatToA.name !== 'Bob') throw new Error('chat name wrong');

// A new player (Carol) gets chat history
const c = await connect(url);
c.send(JSON.stringify({ type: 'join', name: 'Carol' }));
await waitFor(c, (m) => m.type === 'welcome');
const hist = await waitFor(c, (m) => m.type === 'chatHistory');
console.log('Carol chat history length:', hist.chat.length, '| includes "hello hunters":', hist.chat.some(m=>m.text==='hello hunters'));
if (!hist.chat.some(m=>m.text==='hello hunters')) throw new Error('chat history missing message');

// leave -> system chat broadcast
b.close();
const leaveMsg = await waitFor(a, (m) => m.type === 'chat' && m.system && m.text.includes('left'));
console.log('leave message:', leaveMsg.text);

srv.close();
console.log('CHAT + ONLINE TESTS PASSED');
process.exit(0);
