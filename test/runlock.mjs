const gradient={addColorStop(){}};
function fakeCtx(){return new Proxy({},{get(t,k){if(k==="createImageData")return(w,h)=>({data:new Uint8ClampedArray((w||1)*(h||1)*4),width:w||1,height:h||1});if(k==="createRadialGradient"||k==="createLinearGradient")return()=>gradient;if(k==="measureText")return()=>({width:10});return()=>{};},set(t,k,v){t[k]=v;return true;}});}
function fakeEl(tag){const el={tagName:(tag||"div").toUpperCase(),children:[],style:{},_html:"",value:"",width:0,height:0,className:"",dataset:{},classList:{toggle(){},add(){},remove(){}},appendChild(c){el.children.push(c);return c;},addEventListener(){},removeEventListener(){},querySelectorAll(){return[];},querySelector(){return null;},getContext(){return fakeCtx();},getBoundingClientRect(){return{left:0,top:0,width:800,height:600};},setAttribute(){}};Object.defineProperty(el,"innerHTML",{get(){return el._html;},set(v){el._html=v;}});return el;}
const canvas=fakeEl("canvas");canvas.width=800;canvas.height=600;
globalThis.window={innerWidth:800,innerHeight:600,addEventListener(){},removeEventListener(){},location:{search:""}};
globalThis.document={body:{appendChild(){}},getElementById(id){return id==="game"?canvas:fakeEl("div");},createElement(tag){return fakeEl(tag);},addEventListener(){}};
globalThis.localStorage={_m:{},setItem(k,v){this._m[k]=String(v);},getItem(k){return this._m[k]??null;}};
globalThis.requestAnimationFrame=()=>{};
const { default: _ } = await import('../src/main.js');
const game = window.game; game.npcCount = 10;
game.newGame({name:'t',gender:'m',skinTone:'#e8c39a',hairColor:'#4a3624',clothColor:'#7a6a4a',hairStyle:0});
const p = game.player;
game.ui.close();
// double-tap R toggles run lock
let pressR = true;
game.input.pressed = (k) => k === 'r' && pressR;
game.input.held = () => false;
game.input.dirVector = () => ({x:0,y:-1}); // moving forward
p.update(1/60, game); // first R press -> starts tap window
if (p.runLocked) throw new Error('runLocked should be false after first tap');
p.update(1/60, game); // second R press within window -> lock on
console.log('after double-tap R, runLocked:', p.runLocked);
if (!p.runLocked) throw new Error('run lock did not engage on double-tap');
// sprinting should now be true even without holding R (while moving)
p.update(1/60, game);
console.log('sprinting while runLocked + moving:', p.sprinting);
if (!p.sprinting) throw new Error('should sprint while run-locked and moving');
pressR = false;
// double-tap again to unlock
pressR = true;
p.update(1/60, game); p.update(1/60, game);
console.log('after double-tap again, runLocked:', p.runLocked);
if (p.runLocked) throw new Error('run lock did not unlock on double-tap');
console.log('RUN-LOCK TESTS PASSED');
process.exit(0);
