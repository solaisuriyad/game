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
  const ctx = fakeCtx();

  // approach every live monster and make sure its coords stay valid (no NaN)
  const ids = [...new Set(g.monsters.map(m=>m.def.id))];
  let bad = 0;
  for(const id of ids){
    const m = g.monsters.find(x=>x.def.id===id && !x.dead);
    if(!m) continue;
    const flying = m.flying;
    g.player.x = m.x - 120; g.player.y = m.y;
    g.player.health = 200; g.player.mp = 200;
    for(let i=0;i<120;i++) g.update(1/60);
    if(Number.isNaN(m.x) || Number.isNaN(m.y)){
      console.log("FAIL", id, "(flying="+flying+") -> NaN coords");
      bad++;
    }
    g.render(ctx);
  }
  console.log("checked", ids.length, "monster types,", bad, "with NaN coords");
  if(bad > 0) throw new Error(bad + " monster types produced NaN coordinates");

  // skeleton specifically exists and is drawn
  const skel = g.monsters.find(m=>m.def.id==="skeleton" && !m.dead);
  console.log("skeleton present:", !!skel, "| family:", skel && skel.family, "| rank:", skel && skel.rank);
  if(!skel) throw new Error("no skeleton spawned");
  if(skel.family !== "undead") throw new Error("skeleton family wrong");

  console.log("MONSTER STABILITY TESTS PASSED");
  process.exit(0);
});
