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
  g.newGame({name:"Luna",gender:"female",skinTone:"#e8c39a",hairColor:"#4a3624",clothColor:"#7a6a4a",hairStyle:0});
  console.log("player gender:", g.player.gender, "(expect female)");
  if(g.player.gender!=="female") throw new Error("gender not stored");
  g.ui._cust = { gender:"male" };
  g.ui.handleAction("setgender", "female");
  console.log("setgender ->", g.ui._cust.gender, "(expect female)");
  if(g.ui._cust.gender!=="female") throw new Error("setgender handler broken");
  const m = g.npcs.filter(n=>n.gender==="male").length;
  const f = g.npcs.filter(n=>n.gender==="female").length;
  console.log("NPC genders: male=", m, "female=", f);
  if(m===0||f===0) throw new Error("NPCs not gender-varied");
  g.ui._mapOpen=true; g.ui._mapScale=4; g.ui._mapPan={x:0,y:0};
  g.ui._drawMapCanvas();
  console.log("detailed map render OK");
  console.log("GENDER + MAP TESTS PASSED");
  process.exit(0);
});
