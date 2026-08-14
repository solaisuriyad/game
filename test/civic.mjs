const gradient={addColorStop(){}};
function fakeCtx(){return new Proxy({},{get(t,k){if(k==="createImageData")return(w,h)=>({data:new Uint8ClampedArray((w||1)*(h||1)*4),width:w||1,height:h||1});if(k==="createRadialGradient"||k==="createLinearGradient")return()=>gradient;if(k==="measureText")return()=>({width:10});if(k==="roundRect")return()=>{};return()=>{};},set(t,k,v){t[k]=v;return true;}});}
function fakeEl(tag){const el={tagName:(tag||"div").toUpperCase(),children:[],style:{},_html:"",value:"",width:0,height:0,className:"",dataset:{},classList:{toggle(){},add(){},remove(){}},appendChild(c){el.children.push(c);return c;},addEventListener(){},removeEventListener(){},querySelectorAll(){return[];},querySelector(){return null;},getContext(){return fakeCtx();},getBoundingClientRect(){return{left:0,top:0,width:800,height:600};},setAttribute(){}};Object.defineProperty(el,"innerHTML",{get(){return el._html;},set(v){el._html=v;}});return el;}
const canvas=fakeEl("canvas");canvas.width=800;canvas.height=600;
globalThis.window={innerWidth:800,innerHeight:600,addEventListener(){},removeEventListener(){},location:{search:""}};
globalThis.document={body:{appendChild(){}},getElementById(id){return id==="game"?canvas:fakeEl("div");},createElement(tag){return fakeEl(tag);},addEventListener(){}};
globalThis.localStorage={_m:{},setItem(k,v){this._m[k]=String(v);},getItem(k){return this._m[k]??null;}};
globalThis.requestAnimationFrame=()=>{};
import("../src/main.js").then(async ()=>{
  const { VILLAGE_CX, VILLAGE_CY } = await import("../src/world/WorldSystem.js");
  const g=window.game; g.npcCount=250;
  g.newGame({name:"t",gender:"m",skinTone:"#e8c39a",hairColor:"#4a3624",clothColor:"#7a6a4a",hairStyle:0});
  const ctx=fakeCtx();

  // 1. new buildings exist and are inside the village
  const funcs = g.world.buildings.map(b=>b.building.func);
  for(const f of ['watchtower','school','playground','healing','temple','gearshop']){
    const n = funcs.filter(x=>x===f).length;
    console.log(f+":", n, "building(s)");
  }
  if(funcs.filter(x=>x==='watchtower').length !== 3) throw new Error("expected 3 watchtowers");
  for(const f of ['school','playground','healing','temple','gearshop']){
    if(!funcs.includes(f)) throw new Error("missing building: "+f);
  }
  // all within village radius
  for(const b of g.world.buildings){
    const d = Math.hypot((b.x+b.w/2)/32-VILLAGE_CX, (b.y+b.h/2)/32-VILLAGE_CY);
    if(d > 40) throw new Error(b.building.name+" outside village: "+d.toFixed(0));
  }
  console.log("all buildings within village ✓");

  // 2. new interiors open + render
  for(const f of ['watchtower','school','playground','healing','temple','gearshop']){
    const b = g.world.buildings.find(x=>x.building.func===f).building;
    g.buildingInterior.open(b);
    g.render(ctx);
    if(!g.buildingInterior.stations.length) throw new Error(f+" has no stations");
    g.buildingInterior.exit();
  }
  console.log("all 6 new interiors render ✓");

  // 3. gear shop + healing center shops have stock
  const gs = g.economy.shopFor('gearshop');
  const hl = g.economy.shopFor('healing');
  console.log("gear shop stock:", gs.stock.length, "items | healing center stock:", hl.stock.length, "items");
  if(!gs || gs.stock.length < 10) throw new Error("gear shop stock missing");
  if(!hl || hl.stock.length < 5) throw new Error("healing center stock missing");
  // safety gear items exist
  for(const id of ['torch','rope','compass','climbing_gear','lantern','tent']){
    if(!g.items.has(id)) throw new Error("missing item: "+id);
  }
  console.log("gear + safety items ✓");

  // 4. the temple has no priest (only the Shiva Lingam + oil lamps); nurse spawns for healing
  if(g.npcs.some(n=>n.occupation==='priest')) throw new Error("priest should have been removed from the temple");
  if(!g.npcs.some(n=>n.occupation==='nurse')) throw new Error("no nurse NPC spawned");
  console.log("no priest (temple) + nurse NPC ✓");

  // 5. compass use effect works
  g.inventory.addItem('compass', 1, { silent: true });
  const r = g.inventory.useItem('compass');
  console.log("compass:", r.message);
  if(!r.ok) throw new Error("compass could not be used");

  console.log("CIVIC BUILDINGS TESTS PASSED");
  process.exit(0);
});
