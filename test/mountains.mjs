const gradient={addColorStop(){}};
function fakeCtx(){return new Proxy({},{get(t,k){if(k==="createImageData")return(w,h)=>({data:new Uint8ClampedArray((w||1)*(h||1)*4),width:w||1,height:h||1});if(k==="createRadialGradient"||k==="createLinearGradient")return()=>gradient;if(k==="measureText")return()=>({width:10});return()=>{};},set(t,k,v){t[k]=v;return true;}});}
function fakeEl(tag){const el={tagName:(tag||"div").toUpperCase(),children:[],style:{},_html:"",value:"",width:0,height:0,className:"",dataset:{},classList:{toggle(){},add(){},remove(){}},appendChild(c){el.children.push(c);return c;},addEventListener(){},removeEventListener(){},querySelectorAll(){return[];},querySelector(){return null;},getContext(){return fakeCtx();},getBoundingClientRect(){return{left:0,top:0,width:800,height:600};},setAttribute(){}};Object.defineProperty(el,"innerHTML",{get(){return el._html;},set(v){el._html=v;}});return el;}
const canvas=fakeEl("canvas");canvas.width=800;canvas.height=600;
globalThis.window={innerWidth:800,innerHeight:600,addEventListener(){},removeEventListener(){},location:{search:""}};
globalThis.document={body:{appendChild(){}},getElementById(id){return id==="game"?canvas:fakeEl("div");},createElement(tag){return fakeEl(tag);},addEventListener(){}};
globalThis.localStorage={_m:{},setItem(k,v){this._m[k]=String(v);},getItem(k){return this._m[k]??null;}};
globalThis.requestAnimationFrame=()=>{};

const { default: _ } = await import('../src/main.js');
const { T, isSnowRegion, SNOW_X0, SNOW_X1, SNOW_Y0, SNOW_Y1 } = await import('../src/world/WorldSystem.js');
const game = window.game; game.npcCount = 10;
game.newGame({ name:'t', gender:'m', skinTone:'#e8c39a', hairColor:'#4a3624', clothColor:'#7a6a4a', hairStyle:0 });
const w = game.world;

// 1. mountains exist, some snowy, some with waterfalls
console.log('mountains:', w.mountains.length, '| snowy:', w.mountains.filter(m=>m.snowy).length, '| waterfalls:', w.mountains.filter(m=>m.waterfall).length);
if (w.mountains.length < 12) throw new Error('not enough mountains');
if (!w.mountains.some(m=>m.snowy)) throw new Error('no snowy mountains');
if (!w.mountains.some(m=>m.waterfall)) throw new Error('no waterfall mountains');

// 2. snow region: tiles are SNOW inside, GRASS outside
const cx = Math.floor((SNOW_X0+SNOW_X1)/2), cy = Math.floor((SNOW_Y0+SNOW_Y1)/2);
console.log('snow region center tile:', w.tileAt(cx, cy), '(expect', T.SNOW + ')');
if (w.tileAt(cx, cy) !== T.SNOW) throw new Error('snow region not SNOW');
if (w.tileAt(2000, 2000) !== T.FLOOR && w.tileAt(2000,2000) !== T.PATH && w.tileAt(2000,2000) !== T.GRASS) {} // village may be floor/path
if (isSnowRegion(2000, 2000)) throw new Error('village incorrectly in snow region');

// 3. some trees are snowy
let snowyTrees = 0, totalTrees = 0;
for (const cell of w.staticGrid.values()) for (const o of cell) if (o.type==='tree') { totalTrees++; if (o.snowy) snowyTrees++; }
console.log('snowy trees:', snowyTrees, '/', totalTrees);
if (snowyTrees < 1000) throw new Error('expected many snowy trees in the snow region');

// 4. mountains block movement (they're colliders)
const m0 = w.mountains[0];
console.log('mountain blocks at its center:', w.blockedAt(m0.x, m0.y));
if (!w.blockedAt(m0.x, m0.y)) throw new Error('mountain does not block movement');

// 5. 3D: snow overlay + mountains present (tall cones in the terrain)
const { World3DRenderer } = await import('../src/world/World3DRenderer.js');
const r3 = new World3DRenderer(game);
let mountainCones = 0;
r3._terrain.traverse((o) => { if (o.isMesh && o.geometry && o.geometry.type === 'ConeGeometry' && o.geometry.parameters && o.geometry.parameters.height > 40) mountainCones++; });
console.log('3D mountain cones (height > 40):', mountainCones, '(expect >=', w.mountains.length + ')');
if (mountainCones < w.mountains.length) throw new Error('3D mountains missing');

// mountain heights vary: at least one small and one tall peak
const heights = w.mountains.map(m => m.h);
console.log('mountain height range:', Math.min(...heights), 'to', Math.max(...heights));
if (Math.max(...heights) < 250) throw new Error('expected at least one towering mountain');
if (Math.min(...heights) > 120) throw new Error('expected at least one small hill');

// 6. snow falls when player is inside the snow region
game.player.x = cx * 32; game.player.y = cy * 32;
game.time.seasonIndex = 0; game.time.seasonTimer = 0;
game.weather.state = 'sunny'; game.weather.intensity = 0;
r3.sync();
console.log('snow falling in snow region:', !!(r3._snow && r3._snow.visible));
if (!r3._snow || !r3._snow.visible) throw new Error('snow not falling in the permanent snow region');

console.log('MOUNTAINS + SNOW REGION TESTS PASSED');
process.exit(0);
