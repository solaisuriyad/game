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
  // backpack 10x
  console.log("backpack capacity:", g.inventory.capacity(), "(expect 200)");
  if(g.inventory.capacity()!==200) throw new Error("backpack not 10x bigger");
  // dragons + dragonoids exist with ranks
  const defs = {};
  g.monsters.forEach(m=>defs[m.def.id]=m.rank);
  const fire = g.monsters.find(m=>m.def.id==="fire_dragon");
  const droid = g.monsters.find(m=>m.def.id==="dragonoid_fire");
  console.log("fire dragon rank:", fire && fire.rank, "(expect S)");
  console.log("dragonoid rank:", droid && droid.rank, "(expect A+)");
  if(!fire || fire.rank!=="S") throw new Error("fire dragon missing or wrong rank");
  if(!droid || droid.rank!=="A+") throw new Error("dragonoid missing or wrong rank");
  // rank labels on normal monsters (slime=F, wolf=E)
  const slime = g.monsters.find(m=>m.def.id==="slime");
  console.log("slime rank:", slime.rank, "(expect F)");
  if(slime.rank!=="F") throw new Error("slime rank wrong");
  // monster drops meat + essence + weapon material
  const wolf = g.monsters.find(m=>m.def.id==="wolf" && !m.dead);
  g.player.x = wolf.x; g.player.y = wolf.y;
  g.combat.hitEntity(wolf, 99999, {});
  const droppedItems = g.drops.map(d=>d.itemId);
  console.log("wolf drops:", droppedItems.join(", "));
  if(!droppedItems.includes("meat_raw")) throw new Error("monster did not drop meat");
  if(!droppedItems.includes("essence_e")) throw new Error("monster did not drop rank essence");
  // rank bonus: holding essence_e boosts damage vs D-rank monster
  const before = g.player.inventory.length;
  g.inventory.addItem("essence_e", 1, {silent:true});
  // find a D-rank monster
  const dMonster = g.monsters.find(m=>m.rank==="D" && !m.dead);
  if(dMonster){
    g.player.x = dMonster.x; g.player.y = dMonster.y;
    const hp0 = dMonster.hp;
    g.combat.hitEntity(dMonster, 100, {}); // base 100 -> with bonus ~135 (minus defense)
    console.log("D-rank monster took:", hp0 - dMonster.hp, "from a 100-damage hit (bonus applied)");
    if(hp0 - dMonster.hp <= 100) throw new Error("rank essence bonus not applied");
  }
  // REGRESSION: attacking an F-rank monster must NOT crash (prevRank("F") is null)
  const fMonster = g.monsters.find(m=>m.rank==="F" && !m.dead);
  if(fMonster){
    g.player.x = fMonster.x; g.player.y = fMonster.y;
    g.combat.hitEntity(fMonster, 10, {}); // would previously throw TypeError
    console.log("F-rank attack OK (no crash)");
  }
  console.log("RANKS + DROPS + DRAGONS TESTS PASSED");
  process.exit(0);
});
