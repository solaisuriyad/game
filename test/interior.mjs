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

  const funcs = [...new Set(g.world.buildings.map(b=>b.building.func))];
  console.log("building funcs:", funcs.length);
  let bad=0, noSpots=0;
  for(const f of funcs){
    const b = g.world.buildings.find(x=>x.building.func===f).building;
    g.buildingInterior.open(b);
    if(!g.buildingInterior.active){ console.log("FAIL open", f); bad++; continue; }
    // render the interior
    g.render(ctx);
    // exercise hotspot actions exist (call render which iterates hotspots)
    const spots = g.buildingInterior._hotspots();
    if(!spots.length){ console.log("NO HOTSPOTS:", f); noSpots++; }
    // simulate a click at the first hotspot center to exercise action wiring
    if(spots.length){
      const s = spots[0];
      g.buildingInterior._mouse = { x: (s.fx+s.fw/2)*800, y: (s.fy+s.fh/2)*600 };
      g.render(ctx); // re-render to trigger hover resolution (no crash)
    }
    g.buildingInterior.exit();
  }
  console.log("rendered", funcs.length, "interiors |", bad, "failed |", noSpots, "without hotspots");
  if(bad>0) throw new Error(bad + " interiors failed to open/render");
  if(noSpots>0) throw new Error(noSpots + " buildings have no hotspots");

  // specific: guild greeter + workers exist
  const guild = g.world.buildings.find(b=>b.building.func==="guild").building;
  g.buildingInterior.open(guild);
  g.render(ctx);
  console.log("guild interior opened + rendered OK");
  g.buildingInterior.exit();
  console.log("INTERIOR TESTS PASSED");
  process.exit(0);
});
