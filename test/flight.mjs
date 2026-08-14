const gradient={addColorStop(){}};
function fakeCtx(){return new Proxy({},{get(t,k){if(k==="createImageData")return(w,h)=>({data:new Uint8ClampedArray((w||1)*(h||1)*4),width:w||1,height:h||1});if(k==="createRadialGradient"||k==="createLinearGradient")return()=>gradient;if(k==="measureText")return()=>({width:10});return()=>{};},set(t,k,v){t[k]=v;return true;}});}
function fakeEl(tag){const el={tagName:(tag||"div").toUpperCase(),children:[],style:{},_html:"",value:"",width:0,height:0,className:"",dataset:{},classList:{toggle(){},add(){},remove(){}},appendChild(c){el.children.push(c);return c;},addEventListener(){},removeEventListener(){},querySelectorAll(){return[];},querySelector(){return null;},getContext(){return fakeCtx();},getBoundingClientRect(){return{left:0,top:0,width:800,height:600};},setAttribute(){}};Object.defineProperty(el,"innerHTML",{get(){return el._html;},set(v){el._html=v;}});return el;}
const canvas=fakeEl("canvas");canvas.width=800;canvas.height=600;
globalThis.window={innerWidth:800,innerHeight:600,addEventListener(){},removeEventListener(){},location:{search:""}};
globalThis.document={body:{appendChild(){}},getElementById(id){return id==="game"?canvas:fakeEl("div");},createElement(tag){return fakeEl(tag);},addEventListener(){}};
globalThis.localStorage={_m:{},setItem(k,v){this._m[k]=String(v);},getItem(k){return this._m[k]??null;}};
globalThis.requestAnimationFrame=()=>{};
import("../src/main.js").then(()=>{
  const g=window.game; g.npcCount=10;
  g.newGame({name:"t",gender:"m",skinTone:"#e8c39a",hairColor:"#4a3624",clothColor:"#7a6a4a",hairStyle:0});
  const p=g.player;

  // put the player in flight, airborne
  p.flying = true; p.altitude = 50; p.flyLevel = 2; p.targetAlt = 50;

  // 1. a GROUND monster (wolf) cannot hit a flying player
  const wolf = g.monsters.find(m=>m.def.id==="wolf" && !m.dead) || g.monsters[0];
  wolf.x = p.x; wolf.y = p.y;
  p.health = 100;
  g.combat.damagePlayer(30, wolf, null);
  console.log("ground wolf vs flying player: health", p.health, "(expect 100 — blocked)");
  if(p.health !== 100) throw new Error("ground monster damaged a flying player");

  // 2. a FLYING monster (dragon) CAN still hit a flying player
  const dragon = g.monsters.find(m=>m.flying && !m.dead);
  if(dragon){
    dragon.x = p.x; dragon.y = p.y;
    p.health = 100;
    g.combat.damagePlayer(30, dragon, null);
    console.log("flying dragon vs flying player: health", p.health, "(expect < 100 — hits)");
    if(p.health >= 100) throw new Error("flying monster could not hit a flying player");
    // attacker indicator set
    console.log("recentAttacker:", p.recentAttacker && p.recentAttacker.name, "(expect a dragon name)");
    if(!p.recentAttacker) throw new Error("recentAttacker not set on damage");
  } else {
    console.log("(no flying monster in this run — skipping dragon check)");
  }

  // 3. on the GROUND, a wolf still hits normally
  p.flying = false; p.altitude = 0;
  p.health = 100;
  g.combat.damagePlayer(30, wolf, null);
  console.log("ground wolf vs grounded player: health", p.health, "(expect < 100 — hits)");
  if(p.health >= 100) throw new Error("ground monster could not hit a grounded player");

  // 4. thunder_attack now has a range gate (no cross-map screen shake)
  const thunder = g.monsters.find(m=>m.abilities.some(a=>a.id==="thunder_attack") && !m.dead);
  if(thunder){
    const ab = thunder.abilities.find(a=>a.id==="thunder_attack");
    console.log("thunder_attack has range:", ab.params.range, "(expect a number)");
    if(typeof ab.params.range !== "number") throw new Error("thunder_attack missing range gate");
  }

  console.log("FLIGHT SAFETY TESTS PASSED");
  process.exit(0);
});
