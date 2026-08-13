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
  const t0=Date.now();
  g.newGame({name:"t",gender:"m",skinTone:"#e8c39a",hairColor:"#4a3624",clothColor:"#7a6a4a",hairStyle:0});
  console.log("world:", g.world.WORLD_W+"x"+g.world.WORLD_H+" tiles = "+g.world.WORLD_W*32+"px across");
  console.log("gen time:", (Date.now()-t0)+"ms");
  const ranks={};
  for(const m of g.monsters) ranks[m.rank]=(ranks[m.rank]||0)+1;
  console.log("RANK CENSUS:", JSON.stringify(ranks));
  console.log("\nHIGH-TIER MONSTERS (S / A+):");
  for(const m of g.monsters){ if(m.rank==="S"||m.rank==="A+"){ console.log("  "+m.name+" ("+m.rank+") at dist "+Math.hypot(m.x/32-1500,m.y/32-1500).toFixed(0)); } }
  console.log("spawn tile:", g.player.x/32, g.player.y/32, "(expect 400,400)");
  console.log("buildings:", g.world.buildings.length, "| resources:", g.world.nodes.length);
  console.log("Yggdrasil at:", g.world.yggdrasil ? Math.round(g.world.yggdrasil.x/32)+","+Math.round(g.world.yggdrasil.y/32) : "missing");
  process.exit(0);
});
