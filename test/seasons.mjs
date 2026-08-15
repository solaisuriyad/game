// Seasons + sun/moon + snow + auto-face + color math.
const gradient={addColorStop(){}};
function fakeCtx(){return new Proxy({},{get(t,k){if(k==="createImageData")return(w,h)=>({data:new Uint8ClampedArray((w||1)*(h||1)*4),width:w||1,height:h||1});if(k==="createRadialGradient"||k==="createLinearGradient")return()=>gradient;if(k==="measureText")return()=>({width:10});return()=>{};},set(t,k,v){t[k]=v;return true;}});}
function fakeEl(tag){const el={tagName:(tag||"div").toUpperCase(),children:[],style:{},_html:"",value:"",width:0,height:0,className:"",dataset:{},classList:{toggle(){},add(){},remove(){}},appendChild(c){el.children.push(c);return c;},addEventListener(){},removeEventListener(){},querySelectorAll(){return[];},querySelector(){return null;},getContext(){return fakeCtx();},getBoundingClientRect(){return{left:0,top:0,width:800,height:600};},setAttribute(){}};Object.defineProperty(el,"innerHTML",{get(){return el._html;},set(v){el._html=v;}});return el;}
const canvas=fakeEl("canvas");canvas.width=800;canvas.height=600;
globalThis.window={innerWidth:800,innerHeight:600,addEventListener(){},removeEventListener(){},location:{search:""}};
globalThis.document={body:{appendChild(){},removeChild(){}},getElementById(id){return id==="game"?canvas:fakeEl("div");},createElement(tag){return fakeEl(tag);},addEventListener(){}};
globalThis.localStorage={_m:{},setItem(k,v){this._m[k]=String(v);},getItem(k){return this._m[k]??null;}};
globalThis.requestAnimationFrame=()=>{};

const { default: _ } = await import('../src/main.js');
const game = window.game; game.npcCount = 10;
game.newGame({ name:'t', gender:'m', skinTone:'#e8c39a', hairColor:'#4a3624', clothColor:'#7a6a4a', hairStyle:0 });

// ---- seasons cycle every 180s ----
const t = game.time;
console.log('start season:', t.seasonName, '(expect Spring)');
if (t.seasonName !== 'Spring') throw new Error('expected Spring at start');
for (let i = 0; i < 181; i++) t.update(1);
console.log('after 181s season:', t.seasonName, '(expect Summer)');
if (t.seasonName !== 'Summer') throw new Error('season did not advance after 3 min');
for (let i = 0; i < 180; i++) t.update(1);
console.log('after another 180s:', t.seasonName, '(expect Autumn)');
if (t.seasonName !== 'Autumn') throw new Error('Autumn expected');
for (let i = 0; i < 180; i++) t.update(1);
console.log('after another 180s:', t.seasonName, '(expect Winter)');
if (t.seasonName !== 'Winter') throw new Error('Winter expected');
// serialize/deserialize keeps season
const snap = t.serialize();
const t2 = new (await import('../src/world/TimeSystem.js')).TimeSystem();
t2.deserialize(snap);
console.log('season survives serialize:', t2.seasonName, '(expect Winter)');
if (t2.seasonName !== 'Winter') throw new Error('season lost on serialize');

// ---- 3D season tint + snow + sun/moon ----
const { World3DRenderer } = await import('../src/world/World3DRenderer.js');
const r3 = new World3DRenderer(game);
r3._applySeason(0); // spring
console.log('canopy after spring:', r3._terrain ? 'ok' : 'missing');
// winter snow appears when raining
game.time.seasonIndex = 3; game.time.seasonTimer = 0;
game.weather.state = 'rain'; game.weather.intensity = 1;
r3._season = -1; // force re-apply
r3._applyEnvironment({ x: 0, z: 0 });
console.log('snow visible in winter rain:', !!(r3._snow && r3._snow.visible));
if (!r3._snow || !r3._snow.visible) throw new Error('snow did not appear in winter');
// sun visible by day, moon by night
game.time.timeOfDay = 0.5; r3._applyEnvironment({x:0,z:0});
console.log('sun visible at noon:', r3._skySun.visible, '| moon visible:', r3._skyMoon.visible);
if (!r3._skySun.visible || r3._skyMoon.visible) throw new Error('sun/moon day visibility wrong');
game.time.timeOfDay = 0.0; r3._applyEnvironment({x:0,z:0});
console.log('moon visible at midnight:', r3._skyMoon.visible, '| sun visible:', r3._skySun.visible);
if (!r3._skyMoon.visible || r3._skySun.visible) throw new Error('sun/moon night visibility wrong');

// ---- color math ----
const { hsvToHex, hexToHsv } = await import('../src/ui/MenuManager.js');
console.log('hsvToHex(0,1,1):', hsvToHex(0,1,1), '(expect #ff0000)');
if (hsvToHex(0,1,1) !== '#ff0000') throw new Error('hsv red wrong');
if (hsvToHex(120,1,1) !== '#00ff00') throw new Error('hsv green wrong');
if (hsvToHex(240,1,1) !== '#0000ff') throw new Error('hsv blue wrong');
const rt = hexToHsv('#ff0000');
console.log('hexToHsv(#ff0000):', Math.round(rt.h), rt.s, rt.v, '(expect h=0 s=1 v=1)');
if (Math.round(rt.h) !== 0 || rt.s !== 1 || rt.v !== 1) throw new Error('hex->hsv red wrong');

console.log('SEASONS + SUN/MOON + COLOR TESTS PASSED');
process.exit(0);
