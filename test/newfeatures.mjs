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

  // 1. monster kill auto-collects drops into inventory (not invisible ground drops)
  const slime = g.monsters.find(m=>m.def.id==="slime" && !m.dead);
  p.x = slime.x; p.y = slime.y;
  const invBefore = p.inventory.length;
  const meatBefore = g.inventory.countItem("meat_raw");
  g.combat.hitEntity(slime, 99999, {});
  const meatAfter = g.inventory.countItem("meat_raw");
  const essence = g.inventory.countItem("essence_f");
  console.log("drops auto-collected: meat", meatBefore, "->", meatAfter, "| F-essence:", essence);
  if(meatAfter <= meatBefore) throw new Error("meat not auto-collected on kill");
  if(essence < 1) throw new Error("rank essence not collected on kill");

  // 2. flying (X cycle: 50ft -> 75ft -> 50ft -> land)
  p.flying=false; p.flyCd=0; p.altitude=0; p.targetAlt=0; p.flyLevel=0;
  g.input.pressed = (k) => k === 'x'; // simulate pressing X
  p.update(1/60, g);
  g.input.pressed = () => false;
  console.log("flying after X:", p.flying, "level:", p.flyLevel, "(expect true, 1)");
  if(!p.flying || p.flyLevel !== 1) throw new Error("flying did not start");
  for(let i=0;i<120;i++) p.update(1/60, g);
  console.log("altitude:", p.altitude.toFixed(0), "(expect ~50)");
  if(p.altitude < 30) throw new Error("altitude not rising");

  // 3. Yggdrasil: massive + deep + blessing
  const y = g.world.yggdrasil;
  console.log("yggdrasil at", Math.round(y.x/32), Math.round(y.y/32), "radius", y.r, "px");
  if(!y.r || y.r < 200) throw new Error("yggdrasil not massive");
  const distFromVillage = Math.hypot(y.x/32 - 1500, y.y/32 - 1500);
  console.log("yggdrasil distance from village:", distFromVillage.toFixed(0), "tiles (expect deep forest)");
  if(distFromVillage < 200) throw new Error("yggdrasil not deep enough");
  // near Yggdrasil detection + blessing
  p.x = y.x; p.y = y.y;
  console.log("nearYggdrasil:", g.nearYggdrasil(), "(expect true)");
  if(!g.nearYggdrasil()) throw new Error("nearYggdrasil failed");
  p.health = 10; p.stamina = 5; p.mp = 5;
  g.yggdrasilBlessing();
  console.log("after blessing: hp", p.health, "stam", p.stamina, "mp", p.mp, "bless", p.yggBlessing);
  if(p.health !== p.maxHealth || p.yggBlessing !== 60) throw new Error("blessing did not restore/invuln");
  // no death near tree
  p.health = 5;
  g.combat.damagePlayer(9999, null, null);
  console.log("damage while near tree: health still", p.health, "(expect 5 — invulnerable)");
  if(p.health !== 5) throw new Error("player took damage near Yggdrasil");

  console.log("NEW FEATURES TESTS PASSED");
  process.exit(0);
});
