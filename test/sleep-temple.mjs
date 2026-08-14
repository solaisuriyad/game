const gradient={addColorStop(){}};
function fakeCtx(){return new Proxy({},{get(t,k){if(k==="createImageData")return(w,h)=>({data:new Uint8ClampedArray((w||1)*(h||1)*4),width:w||1,height:h||1});if(k==="createRadialGradient"||k==="createLinearGradient")return()=>gradient;if(k==="measureText")return()=>({width:10});if(k==="roundRect")return()=>{};return()=>{};},set(t,k,v){t[k]=v;return true;}});}
function fakeEl(tag){const el={tagName:(tag||"div").toUpperCase(),children:[],style:{},_html:"",value:"",width:0,height:0,className:"",dataset:{},classList:{toggle(){},add(){},remove(){}},appendChild(c){el.children.push(c);return c;},addEventListener(){},removeEventListener(){},querySelectorAll(){return[];},querySelector(){return null;},getContext(){return fakeCtx();},getBoundingClientRect(){return{left:0,top:0,width:800,height:600};},setAttribute(){}};Object.defineProperty(el,"innerHTML",{get(){return el._html;},set(v){el._html=v;}});return el;}
const canvas=fakeEl("canvas");canvas.width=800;canvas.height=600;
globalThis.window={innerWidth:800,innerHeight:600,addEventListener(){},removeEventListener(){},location:{search:""}};
globalThis.document={body:{appendChild(){}},getElementById(id){return id==="game"?canvas:fakeEl("div");},createElement(tag){return fakeEl(tag);},addEventListener(){}};
globalThis.localStorage={_m:{},setItem(k,v){this._m[k]=String(v);},getItem(k){return this._m[k]??null;}};
globalThis.requestAnimationFrame=()=>{};
import("../src/main.js").then(()=>{
  const g=window.game; g.npcCount=250;
  g.newGame({name:"t",gender:"m",skinTone:"#e8c39a",hairColor:"#4a3624",clothColor:"#7a6a4a",hairStyle:0});
  g.ui.close(); // simulate "Enter the World"
  const ctx=fakeCtx();

  // 1. temple: black theme, NO priest/NPC, exactly one station (pray at the lingam)
  const temple = g.world.buildings.find(b=>b.building.func==="temple").building;
  g.buildingInterior.open(temple);
  g.render(ctx);
  const ts = g.buildingInterior.stations;
  console.log("temple stations:", ts.map(s=>s.id).join(", "));
  if(ts.length !== 1 || ts[0].id !== "pray") throw new Error("temple should have only the 'pray' station");
  if(ts.some(s=>s.occ)) throw new Error("temple should have no NPC (priest removed)");
  // praying fully restores stats
  g.player.health = 30; g.player.stamina = 10; g.player.mp = 10;
  g.buildingInterior.px = ts[0].ix; g.buildingInterior.py = ts[0].iy;
  g.input.pressed = (k)=>k==="e";
  g.buildingInterior.update(1/60);
  console.log("after praying: hp", g.player.health, "stam", g.player.stamina, "mp", g.player.mp);
  if(g.player.health !== g.player.maxHealth) throw new Error("praying did not restore health");
  g.buildingInterior.exit();

  // 2. inn: sleep-in-bed scene runs, heals, and exits at dawn
  const inn = g.world.buildings.find(b=>b.building.func==="inn").building;
  g.buildingInterior.open(inn);
  const bed = g.buildingInterior.stations.find(s=>s.id==="sleep");
  if(!bed) throw new Error("inn has no bed station");
  g.buildingInterior.px = bed.ix; g.buildingInterior.py = bed.iy;
  g.input.pressed = (k)=>k==="e";
  g.buildingInterior.update(1/60);
  console.log("sleeping started:", !!g.buildingInterior.sleeping);
  if(!g.buildingInterior.sleeping) throw new Error("sleep did not start");
  g.player.health = 10; g.player.stamina = 5;
  for(let i=0;i<240;i++) g.buildingInterior.update(1/60);
  console.log("after sleep -> active:", g.buildingInterior.active, "| health:", g.player.health, "| dawn:", g.time.timeOfDay.toFixed(2));
  if(g.buildingInterior.active) throw new Error("interior did not exit after sleep");
  if(g.player.health !== g.player.maxHealth) throw new Error("sleep did not restore health");
  if(Math.abs(g.time.timeOfDay - 0.3) > 0.01) throw new Error("sleep did not advance to dawn");

  console.log("SLEEP + TEMPLE TESTS PASSED");
  process.exit(0);
});
