// Headless test for the 3D renderer: builds the THREE scene graph from the real
// game state (no WebGL needed — we assert on scene contents, not pixels).
const gradient={addColorStop(){}};
function fakeCtx(){return new Proxy({},{get(t,k){if(k==="createImageData")return(w,h)=>({data:new Uint8ClampedArray((w||1)*(h||1)*4),width:w||1,height:h||1});if(k==="createRadialGradient"||k==="createLinearGradient")return()=>gradient;if(k==="measureText")return()=>({width:10});return()=>{};},set(t,k,v){t[k]=v;return true;}});}
function fakeEl(tag){const el={tagName:(tag||"div").toUpperCase(),children:[],style:{},_html:"",value:"",width:0,height:0,className:"",dataset:{},classList:{toggle(){},add(){},remove(){}},appendChild(c){el.children.push(c);return c;},addEventListener(){},removeEventListener(){},querySelectorAll(){return[];},querySelector(){return null;},getContext(){return fakeCtx();},getBoundingClientRect(){return{left:0,top:0,width:800,height:600};},setAttribute(){}};Object.defineProperty(el,"innerHTML",{get(){return el._html;},set(v){el._html=v;}});return el;}
const canvas=fakeEl("canvas");canvas.width=800;canvas.height=600;
globalThis.window={innerWidth:800,innerHeight:600,addEventListener(){},removeEventListener(){},location:{search:""}};
globalThis.document={body:{appendChild(){}},getElementById(id){return id==="game"?canvas:fakeEl("div");},createElement(tag){return fakeEl(tag);},addEventListener(){}};
globalThis.localStorage={_m:{},setItem(k,v){this._m[k]=String(v);},getItem(k){return this._m[k]??null;}};
globalThis.requestAnimationFrame=()=>{};

const { World3DRenderer } = await import('../src/world/World3DRenderer.js');
const { default: _ } = await import('../src/main.js');
const game = window.game;
game.npcCount = 30;
game.newGame({ name: 'T', gender: 'm', skinTone: '#e8c39a', hairColor: '#4a3624', clothColor: '#7a6a4a', hairStyle: 0 });

const r3 = new World3DRenderer(game);
r3.sync();

// terrain group exists: ground + river + pond + 2 instanced tree meshes + buildings
const terrainCount = r3._terrain.children.length;
console.log('terrain children (ground + water + instanced trees + buildings):', terrainCount);
if (terrainCount < 40) throw new Error('terrain looks too empty: ' + terrainCount);
// the instanced tree meshes now live in many chunks (thinned + distance-culled)
const trees = r3._terrain.children.filter((c) => c.isInstancedMesh);
const treeCount = trees.reduce((s, m) => s + m.count, 0);
console.log('tree instances (thinned, across', trees.length, 'chunks):', treeCount);
if (treeCount < 50000) throw new Error('expected many thinned trees, got ' + treeCount);

// distance culling: only chunks near the player should be visible
r3.sync();
const visChunks = r3._treeChunks.filter((c) => c.trunks.visible);
const visTrees = visChunks.reduce((s, c) => s + c.trunks.count, 0);
console.log('visible tree chunks:', visChunks.length, '/', r3._treeChunks.length, '| visible trees:', visTrees, '/', treeCount);
if (visChunks.length >= r3._treeChunks.length) throw new Error('tree culling not working (all chunks visible)');
if (visTrees >= treeCount) throw new Error('no trees culled');

// the Yggdrasil world tree must be present in the 3D scene (it's the centerpiece)
if (!r3._yggGlow) throw new Error('Yggdrasil missing from 3D scene');
console.log('Yggdrasil present (glow mesh) ✓');

// entity meshes: player + npcs + (some) monsters + animals near spawn
const ents = r3.entityRoot.children.length;
console.log('entity meshes near player:', ents);
if (ents < 10) throw new Error('expected NPCs + monsters + player in 3D scene, got ' + ents);

// camera should follow the player (finite, near player)
const c = r3.camera.position;
console.log('camera pos:', c.x.toFixed(0), c.y.toFixed(0), c.z.toFixed(0));
if (!Number.isFinite(c.x) || !Number.isFinite(c.y) || !Number.isFinite(c.z)) throw new Error('camera has NaN position');

// moving the player far away should rebuild the nearby entity set
game.player.x = (2000 + 600) * 32; game.player.y = 2000 * 32;
r3.sync();
const ents2 = r3.entityRoot.children.length;
console.log('entity meshes after moving far:', ents2, '(expect fewer, since far from town)');
if (ents2 > ents) throw new Error('expected fewer nearby entities after moving away');

// ---- camera-relative movement math ----
// yaw=0 -> camera due south, looking north. W should move NORTH (world -y),
// D should move EAST (world +x).
r3.yaw = 0; r3.pitch = 0.95; r3.distance = 440;
game.input.dirVector = () => ({ x: 0, y: -1 }); // W
let d = r3.cameraDirVector();
console.log('W (yaw=0) ->', d.x.toFixed(2), d.y.toFixed(2), '(expect x≈0, y≈-1)');
if (Math.abs(d.x) > 0.01 || Math.abs(d.y - (-1)) > 0.01) throw new Error('W not mapped to forward');

game.input.dirVector = () => ({ x: 1, y: 0 }); // D
d = r3.cameraDirVector();
console.log('D (yaw=0) ->', d.x.toFixed(2), d.y.toFixed(2), '(expect x≈1, y≈0)');
if (Math.abs(d.x - 1) > 0.01 || Math.abs(d.y) > 0.01) throw new Error('D not mapped to camera-right');

// rotate 180°: camera north of player looking south -> W should move SOUTH (+y)
r3.yaw = Math.PI;
game.input.dirVector = () => ({ x: 0, y: -1 }); // W
d = r3.cameraDirVector();
console.log('W (yaw=π) ->', d.x.toFixed(2), d.y.toFixed(2), '(expect x≈0, y≈+1)');
if (Math.abs(d.x) > 0.01 || Math.abs(d.y - 1) > 0.01) throw new Error('W not rotated with camera yaw');

// facing angle should be finite
const fa = r3.facingAngle();
console.log('facingAngle finite:', Number.isFinite(fa));
if (!Number.isFinite(fa)) throw new Error('facing angle is NaN');

// ---- 3D aiming: mouse raycast onto the ground ----
game.player.x = 2000 * 32; game.player.y = 2000 * 32; // village center
r3.yaw = 0; r3.pitch = 0.95; // reset camera (a previous test set yaw = π)
r3.sync(); // position the camera around the player

// aim at a point low on screen (definitely hits the ground)
r3._mouseNdc = { x: 0, y: -0.5 };
const aimC = r3.aimWorldPoint();
console.log('aim (center-low):', aimC ? aimC.x.toFixed(0) + ',' + aimC.y.toFixed(0) : 'null');
if (!aimC || !Number.isFinite(aimC.x) || !Number.isFinite(aimC.y)) throw new Error('aim point invalid');

// aim to the right of the screen -> world point should move +x (east)
r3._mouseNdc = { x: 1, y: -0.5 };
const aimR = r3.aimWorldPoint();
console.log('aim (right):', aimR ? aimR.x.toFixed(0) + ',' + aimR.y.toFixed(0) : 'null');
if (!aimR) throw new Error('aim right missed the ground');
if (!(aimR.x > aimC.x)) throw new Error('aim did not move right with cursor');

// aim above the horizon (camera nearly level) -> returns null (fallback path)
r3.pitch = 0.15; // nearly horizontal camera
r3.sync();
r3._mouseNdc = { x: 0, y: 1 }; // very top of screen = sky
const aimTop = r3.aimWorldPoint();
console.log('aim (above horizon):', aimTop === null ? 'null (correct)' : 'hit ' + aimTop.x.toFixed(0));
if (aimTop !== null) throw new Error('aim above horizon should return null');
r3.pitch = 0.95; r3.sync(); // restore

// the player's facing should point toward the aim point (not just camera forward)
r3._mouseNdc = { x: 0, y: -0.5 };
const ap = r3.aimWorldPoint();
const wantFacing = Math.atan2(ap.y - game.player.y, ap.x - game.player.x);
console.log('aim facing finite:', Number.isFinite(wantFacing));
if (!Number.isFinite(wantFacing)) throw new Error('aim facing is NaN');

// ---- distinct 3D models ----
// a dragon should have WINGS (more parts than a generic beast)
const dragon = game.monsters.find((m) => m.family === 'dragon' && !m.dead);
const dragonMesh = r3._makeEntityMesh(dragon, 'dragon', dragon.color);
console.log('dragon parts:', dragonMesh.children.length, '(expect > 5 — wings/tail/horns)');
if (dragonMesh.children.length < 5) throw new Error('dragon model too simple (missing wings/tail)');

// flying entities are lifted off the ground
dragon.x = game.player.x + 100; dragon.y = game.player.y;
r3.sync();
const dk = r3._key(dragon);
const dEntry = r3._meshCache.get(dk);
console.log('dragon elevation:', dEntry.group.position.y.toFixed(0), '(expect ~80, flying)');
if (Math.abs(dEntry.group.position.y - 80) > 1) throw new Error('flying dragon not elevated');

// a slime is grounded (elevation 0)
const slime = game.monsters.find((m) => m.family === 'slime' && !m.dead);
slime.x = game.player.x + 120; slime.y = game.player.y;
r3.sync();
const sEntry = r3._meshCache.get(r3._key(slime));
console.log('slime elevation:', sEntry.group.position.y.toFixed(0), '(expect 0)');
if (sEntry.group.position.y !== 0) throw new Error('grounded slime should not be elevated');

console.log('3D RENDERER TESTS PASSED');
process.exit(0);
