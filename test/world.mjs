const gradient={addColorStop(){}};
function fakeCtx(){return new Proxy({},{get(t,k){if(k==="createImageData")return(w,h)=>({data:new Uint8ClampedArray((w||1)*(h||1)*4),width:w||1,height:h||1});if(k==="createRadialGradient"||k==="createLinearGradient")return()=>gradient;if(k==="measureText")return()=>({width:10});return()=>{};},set(t,k,v){t[k]=v;return true;}});}
function fakeEl(tag){const el={tagName:(tag||"div").toUpperCase(),children:[],style:{},_html:"",value:"",width:0,height:0,className:"",dataset:{},classList:{toggle(){},add(){},remove(){}},appendChild(c){el.children.push(c);return c;},addEventListener(){},removeEventListener(){},querySelectorAll(){return[];},querySelector(){return null;},getContext(){return fakeCtx();},getBoundingClientRect(){return{left:0,top:0,width:800,height:600};},setAttribute(){}};Object.defineProperty(el,"innerHTML",{get(){return el._html;},set(v){el._html=v;}});return el;}
const canvas=fakeEl("canvas");canvas.width=800;canvas.height=600;
globalThis.window={innerWidth:800,innerHeight:600,addEventListener(){},removeEventListener(){},location:{search:""}};
globalThis.document={body:{appendChild(){}},getElementById(id){return id==="game"?canvas:fakeEl("div");},createElement(tag){return fakeEl(tag);},addEventListener(){}};
globalThis.localStorage={_m:{},setItem(k,v){this._m[k]=String(v);},getItem(k){return this._m[k]??null;}};
globalThis.requestAnimationFrame=()=>{};
import("../src/main.js").then(async ()=>{
  const { WORLD_W, WORLD_H, VILLAGE_CX, VILLAGE_CY, YGGDRASIL_CX, YGGDRASIL_CY } = await import("../src/world/WorldSystem.js");
  const g=window.game; g.npcCount=10;
  g.newGame({name:"t",gender:"m",skinTone:"#e8c39a",hairColor:"#4a3624",clothColor:"#7a6a4a",hairStyle:0});
  const y=g.world.yggdrasil;

  // 1. map size + two-circle geometry
  console.log("world:", WORLD_W+"x"+WORLD_H, "| village", VILLAGE_CX+","+VILLAGE_CY, "| tree", YGGDRASIL_CX+","+YGGDRASIL_CY);
  if(WORLD_W !== 4000 || WORLD_H !== 4000) throw new Error("world is not 4000x4000");
  const treeDist = Math.hypot(YGGDRASIL_CX-VILLAGE_CX, YGGDRASIL_CY-VILLAGE_CY);
  if(treeDist < 500) throw new Error("tree too close to village (two circles overlap)");

  // 2. monsters radiate from the tree by rank (A+ innermost → F outermost)
  const cx=y.x/32, cy=y.y/32;
  const dist=(m)=>Math.hypot(m.x/32-cx, m.y/32-cy);
  const inRing=(ids, min, max)=>{
    for(const id of ids){
      for(const m of g.monsters){
        if(m.def.id!==id || m.dead) continue;
        const d=dist(m);
        if(d < min || d > max) throw new Error(id+" spawned at "+d.toFixed(0)+" tiles (expected "+min+"-"+max+")");
      }
    }
  };
  inRing(['dragonoid_fire','dragonoid_ice','dragonoid_earth'], 40, 115);      // A+
  inRing(['fire_dragon','ice_dragon','earth_dragon','ancient_dragon'], 105, 205); // S
  inRing(['forest_guardian'], 195, 255);                                        // B
  inRing(['ancient_bear','hell_hound','yggdrasil_spriggan','ancient_beast'], 245, 335); // C
  inRing(['cave_troll','treant','goblin_brute','swamp_beast','demon_beast','thorn_beast','shadow_stalker','venom_wyrm','alpha_wolf'], 325, 415); // D
  inRing(['dire_wolf','skeleton','goblin_shaman'], 405, 495);                   // E
  console.log("rank rings OK — monsters radiate from the Yggdrasil by rank");

  // 3. the massive world tree
  if(!y.w || y.w < 1024) throw new Error("Yggdrasil footprint too small");
  console.log("Yggdrasil footprint:", y.w, "px (massive)");

  // 4. stragglers (low-rank monsters) near the village for early combat
  const nearVillage = g.monsters.filter((m)=>!m.dead && Math.hypot(m.x/32-VILLAGE_CX, m.y/32-VILLAGE_CY) < 100).length;
  console.log("low-rank monsters near the village:", nearVillage, "(expect >= 20)");
  if(nearVillage < 20) throw new Error("no low-rank stragglers near the village");

  // 5. all buildings are INSIDE the village (near its center), not stranded in
  //    the forest — this caught the regression where the village moved but the
  //    buildings' hardcoded coordinates did not
  const bdists = g.world.buildings.map((b)=>Math.hypot((b.x+b.w/2)/32 - VILLAGE_CX, (b.y+b.h/2)/32 - VILLAGE_CY));
  const maxBD = Math.max(...bdists);
  console.log("buildings:", g.world.buildings.length, "| max distance from village center:", maxBD.toFixed(0), "tiles (expect <= 40)");
  if(maxBD > 40) throw new Error("buildings are outside the village (placement regression)");

  console.log("WORLD LAYOUT TESTS PASSED");
  process.exit(0);
});
