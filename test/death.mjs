const gradient={addColorStop(){}};
function fakeCtx(){return new Proxy({},{get(t,k){if(k==="createImageData")return(w,h)=>({data:new Uint8ClampedArray((w||1)*(h||1)*4),width:w||1,height:h||1});if(k==="createRadialGradient"||k==="createLinearGradient")return()=>gradient;if(k==="measureText")return()=>({width:10});return()=>{};},set(t,k,v){t[k]=v;return true;}});}
function fakeEl(tag){const el={tagName:(tag||"div").toUpperCase(),children:[],style:{},_html:"",value:"",width:0,height:0,className:"",dataset:{},classList:{toggle(){},add(){},remove(){}},appendChild(c){el.children.push(c);return c;},addEventListener(){},removeEventListener(){},querySelectorAll(){return[];},querySelector(){return null;},getContext(){return fakeCtx();},getBoundingClientRect(){return{left:0,top:0,width:800,height:600};},setAttribute(){}};Object.defineProperty(el,"innerHTML",{get(){return el._html;},set(v){el._html=v;}});return el;}
const canvas=fakeEl("canvas");canvas.width=800;canvas.height=600;
globalThis.window={innerWidth:800,innerHeight:600,addEventListener(){},removeEventListener(){},location:{search:""}};
globalThis.document={body:{appendChild(){}},getElementById(id){return id==="game"?canvas:fakeEl("div");},createElement(tag){return fakeEl(tag);},addEventListener(){}};
globalThis.localStorage={_m:{},setItem(k,v){this._m[k]=String(v);},getItem(k){return this._m[k]??null;}};
globalThis.requestAnimationFrame=()=>{};
import("../src/main.js").then(async ()=>{
  const { VILLAGE_CX, VILLAGE_CY } = await import("../src/world/WorldSystem.js");
  const g=window.game; g.npcCount=10;
  g.newGame({name:"t",gender:"m",skinTone:"#e8c39a",hairColor:"#4a3624",clothColor:"#7a6a4a",hairStyle:0});
  const p=g.player;

  // teleport the player far from the village so respawn is observable
  p.x = 2000*32; p.y = 2000*32;
  const farX = p.x, farY = p.y;

  // kill the player via a monster source
  const wolf = g.monsters.find(m=>m.def.id==="wolf" && !m.dead) || g.monsters[0];
  wolf.x = p.x; wolf.y = p.y;
  p.health = 1;
  g.combat.damagePlayer(9999, wolf, null);

  console.log("deathInfo set:", !!g.deathInfo, "| killer:", g.deathInfo && g.deathInfo.killer, "| timer:", g.deathInfo && g.deathInfo.timer);
  if(!g.deathInfo) throw new Error("deathInfo not set on death");
  console.log("still at death spot (not teleported yet):", p.x===farX, p.y===farY);
  if(p.x!==farX) throw new Error("player teleported immediately instead of showing death screen");

  // simulate time passing so the death timer expires
  for(let i=0;i<240;i++) g.update(1/60);
  console.log("after death timer -> deathInfo cleared:", g.deathInfo===null, "| spawnGrace:", p.spawnGrace, "| health:", p.health);
  if(g.deathInfo) throw new Error("deathInfo not cleared after respawn");
  const VX = VILLAGE_CX*32+16, VY = VILLAGE_CY*32+16;
  console.log("respawned at village center:", p.x===VX, p.y===VY);
  if(p.x!==VX || p.y!==VY) throw new Error("did not respawn at village center");
  if(p.health !== p.maxHealth) throw new Error("health not restored on respawn");
  if(p.spawnGrace <= 0) throw new Error("spawn grace not granted");

  // spawn grace blocks damage
  p.health = 50;
  g.combat.damagePlayer(9999, wolf, null);
  console.log("spawn grace blocks damage:", p.health===50);
  if(p.health!==50) throw new Error("spawn grace did not block damage");

  // no double-death while already dead
  p.health = 0;
  g.combat.damagePlayer(9999, wolf, null);
  g.combat.damagePlayer(9999, wolf, null);
  console.log("no double deathInfo:", g.deathInfo===null);

  console.log("DEATH FLOW TEST PASSED");
  process.exit(0);
});
