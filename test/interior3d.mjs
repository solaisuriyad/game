const gradient={addColorStop(){}};
function fakeCtx(){return new Proxy({},{get(t,k){if(k==="createImageData")return(w,h)=>({data:new Uint8ClampedArray((w||1)*(h||1)*4),width:w||1,height:h||1});if(k==="createRadialGradient"||k==="createLinearGradient")return()=>gradient;if(k==="measureText")return()=>({width:10});return()=>{};},set(t,k,v){t[k]=v;return true;}});}
function fakeEl(tag){const el={tagName:(tag||"div").toUpperCase(),children:[],style:{},_html:"",value:"",width:0,height:0,className:"",dataset:{},classList:{toggle(){},add(){},remove(){}},appendChild(c){el.children.push(c);return c;},addEventListener(){},removeEventListener(){},querySelectorAll(){return[];},querySelector(){return null;},getContext(){return fakeCtx();},getBoundingClientRect(){return{left:0,top:0,width:800,height:600};},setAttribute(){}};Object.defineProperty(el,"innerHTML",{get(){return el._html;},set(v){el._html=v;}});return el;}
const canvas=fakeEl("canvas");canvas.width=800;canvas.height=600;
globalThis.window={innerWidth:800,innerHeight:600,addEventListener(){},removeEventListener(){},location:{search:""}};
globalThis.document={body:{appendChild(){}},getElementById(id){return id==="game"?canvas:fakeEl("div");},createElement(tag){return fakeEl(tag);},addEventListener(){}};
globalThis.localStorage={_m:{},setItem(k,v){this._m[k]=String(v);},getItem(k){return this._m[k]??null;}};
globalThis.requestAnimationFrame=()=>{};

const { Interior3DRenderer } = await import('../src/world/Interior3DRenderer.js');
const { default: _ } = await import('../src/main.js');
const game = window.game; game.npcCount = 250;
game.newGame({name:'t',gender:'m',skinTone:'#e8c39a',hairColor:'#4a3624',clothColor:'#7a6a4a',hairStyle:0});
game.ui.close();

const i3 = new Interior3DRenderer(game);

// 1. open the guild and sync -> counters + NPCs + player should appear
const guild = game.world.buildings.find(b=>b.building.func==='guild').building;
game.buildingInterior.open(guild);
i3.sync();
let count = i3.entityRoot.children.length;
console.log('guild 3D interior objects (counters + NPCs + player + furniture):', count);
if (count < 4) throw new Error('guild 3D interior too empty: ' + count);
// player must be present
if (!i3._meshCache.has('player')) throw new Error('player figure missing');
// no NaN positions
let bad = false;
i3.entityRoot.traverse((o)=>{ if (o.isMesh && (isNaN(o.position.x)||isNaN(o.position.y)||isNaN(o.position.z))) bad = true; });
if (bad) throw new Error('NaN position in 3D interior');
console.log('no NaN positions ✓');

// 2. the temple gets the Shiva Lingam (extra meshes: base + lingam + glow)
game.buildingInterior.exit();
const temple = game.world.buildings.find(b=>b.building.func==='temple').building;
game.buildingInterior.open(temple);
i3.sync();
const templeCount = i3.entityRoot.children.length;
console.log('temple 3D interior objects:', templeCount, '(expect lingam: pray marker + base + pillar + glow)');
if (templeCount < 4) throw new Error('temple 3D interior missing lingam');
// temple has exactly one station (pray), no NPC
if (game.buildingInterior.stations.some(s=>s.occ)) throw new Error('temple should have no NPC');

// 3. sleeping rotates the player flat
game.buildingInterior.exit();
const inn = game.world.buildings.find(b=>b.building.func==='inn').building;
game.buildingInterior.open(inn);
game.buildingInterior.startSleep(520, 300);
i3.sync();
const pm = i3._meshCache.get('player').group;
console.log('player lying down (rotation.x):', pm.rotation.x.toFixed(2), '(expect ~1.57)');
if (Math.abs(pm.rotation.x - Math.PI/2) > 0.05) throw new Error('player not lying down while sleeping');
game.buildingInterior.sleeping = null;

// 4. exiting clears nothing (interior still holds its own scene); opening a new building rebuilds
const before = i3._meshCache.has('player');
game.buildingInterior.exit();
const guild2 = game.world.buildings.find(b=>b.building.func==='weaponshop').building;
game.buildingInterior.open(guild2);
i3.sync();
console.log('rebuilt on new building, player present:', i3._meshCache.has('player'));
if (!i3._meshCache.has('player')) throw new Error('player missing after switching buildings');

// 5. furniture parity: every building type renders furniture with no NaN
const funcs = [...new Set(game.world.buildings.map(b=>b.building.func))];
let badFurn = 0, emptyFurn = 0;
for (const f of funcs) {
  const b = game.world.buildings.find(x=>x.building.func===f).building;
  game.buildingInterior.open(b);
  i3.sync();
  if (i3.entityRoot.children.length < 3) { console.log('EMPTY:', f); emptyFurn++; }
  i3.entityRoot.traverse((o)=>{ if (o.isMesh && (isNaN(o.position.x)||isNaN(o.position.y)||isNaN(o.position.z))) badFurn++; });
}
console.log('checked', funcs.length, 'building types | empty:', emptyFurn, '| NaN meshes:', badFurn);
if (badFurn > 0) throw new Error('NaN position in furniture');
if (emptyFurn > 0) throw new Error(emptyFurn + ' buildings have no furniture');

console.log('3D INTERIOR TESTS PASSED');
process.exit(0);
