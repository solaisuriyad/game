const gradient={addColorStop(){}};
function fakeCtx(){return new Proxy({},{get(t,k){if(k==="createImageData")return(w,h)=>({data:new Uint8ClampedArray((w||1)*(h||1)*4),width:w||1,height:h||1});if(k==="createRadialGradient"||k==="createLinearGradient")return()=>gradient;if(k==="measureText")return()=>({width:10});if(k==="roundRect")return()=>{};return()=>{};},set(t,k,v){t[k]=v;return true;}});}
function fakeEl(tag){const el={tagName:(tag||"div").toUpperCase(),children:[],style:{},_html:"",value:"",width:0,height:0,className:"",dataset:{},classList:{toggle(){},add(){},remove(){}},appendChild(c){el.children.push(c);return c;},addEventListener(){},removeEventListener(){},querySelectorAll(){return[];},querySelector(){return null;},getContext(){return fakeCtx();},getBoundingClientRect(){return{left:0,top:0,width:800,height:600};},setAttribute(){}};Object.defineProperty(el,"innerHTML",{get(){return el._html;},set(v){el._html=v;}});return el;}
const canvas=fakeEl("canvas");canvas.width=800;canvas.height=600;
globalThis.window={innerWidth:800,innerHeight:600,addEventListener(){},removeEventListener(){},location:{search:""}};
globalThis.document={body:{appendChild(){}},getElementById(id){return id==="game"?canvas:fakeEl("div");},createElement(tag){return fakeEl(tag);},addEventListener(){}};
globalThis.localStorage={_m:{},setItem(k,v){this._m[k]=String(v);},getItem(k){return this._m[k]??null;}};
globalThis.requestAnimationFrame=()=>{};
import("../src/main.js").then(()=>{
  const g=window.game; g.npcCount=250; // real NPC count so workers exist
  g.newGame({name:"t",gender:"m",skinTone:"#e8c39a",hairColor:"#4a3624",clothColor:"#7a6a4a",hairStyle:0});
  const ctx=fakeCtx();

  // 1. every building opens a walkable interior with at least one station
  const funcs = [...new Set(g.world.buildings.map(b=>b.building.func))];
  let bad=0;
  for(const f of funcs){
    const b = g.world.buildings.find(x=>x.building.func===f).building;
    g.buildingInterior.open(b);
    if(!g.buildingInterior.active){ console.log("FAIL open", f); bad++; continue; }
    const st = g.buildingInterior.stations;
    if(!st.length){ console.log("NO STATIONS:", f); bad++; }
    g.render(ctx); // render the interior
    g.buildingInterior.exit();
  }
  console.log("opened", funcs.length, "walkable interiors |", bad, "failed");
  if(bad>0) throw new Error(bad + " interiors failed");

  // 2. walk up to the guild "Jobs" counter and press E -> jobs menu opens
  const guild = g.world.buildings.find(b=>b.building.func==="guild").building;
  g.buildingInterior.open(guild);
  const jobs = g.buildingInterior.stations.find(s=>s.id==="jobs");
  g.buildingInterior.px = jobs.ix; g.buildingInterior.py = jobs.iy; // stand at the counter
  g.input.pressed = (k)=>k==="e";
  g.buildingInterior.update(1/60);
  console.log("jobs counter -> ui.open:", g.ui.open);
  if(!g.ui.open) throw new Error("jobs counter did not open a menu");
  g.ui.close();

  // 3. walk to the door and press E -> exit, player placed outside
  g.buildingInterior.px = g.buildingInterior.door.x; g.buildingInterior.py = g.buildingInterior.door.y;
  g.input.pressed = (k)=>k==="e";
  g.buildingInterior.update(1/60);
  console.log("door exit -> active:", g.buildingInterior.active, "| player placed near building:", Math.abs(g.player.x/32 - 2000) < 10 || Math.abs(g.player.y/32 - 2000) < 10);
  if(g.buildingInterior.active) throw new Error("door did not exit the interior");

  // 4. walls block movement (player can't walk through the top wall)
  g.buildingInterior.open(guild);
  g.buildingInterior.px = 600; g.buildingInterior.py = 100;
  g.input.dirVector = ()=>({x:0,y:-1});
  g.input.pressed = ()=>false;
  for(let i=0;i<60;i++) g.buildingInterior.update(1/60);
  console.log("wall blocks movement: py=", g.buildingInterior.py.toFixed(0), "(should stay >= 56)");
  if(g.buildingInterior.py < 56) throw new Error("player walked through a wall");
  g.buildingInterior.exit();

  console.log("INTERIOR TESTS PASSED");
  process.exit(0);
});
