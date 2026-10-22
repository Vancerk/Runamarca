import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';
const source=fs.readFileSync(new URL('platinum-entry.js',import.meta.url),'utf8');
const card={type:'creature',rarity:'soberano',effects:[{op:'adjacent_damage'}]};
function context(){const scope=vm.createContext({setTimeout,clearTimeout,performance,document:{createElement:()=>({getContext:()=>({drawImage(){}})})}});vm.runInContext(source,scope);return scope.RunaPlatinumEntry;}
test('cache frio: aguarda uma face que demora mais que os antigos 500ms',async()=>{
 const api=context();let checks=0,painted=false;const node={getBoundingClientRect:()=>({width:100}),querySelector:()=>painted?{width:900,height:1260}:null,visualReady:new Promise(r=>setTimeout(()=>{painted=true;r();},650))};
 // Stop after texture extraction: this test exercises readiness, not GPU painting.
 assert.equal(await api.play({card,source:node,key:'cold',valid:()=>++checks===1}),false);assert.equal(painted,true);assert.equal(checks,2,'the public actor reaches the post-texture validity check');
});
test('uma textura indisponível não marca a entrada como já apresentada',async()=>{
 const api=context();const missing={getBoundingClientRect:()=>({width:100}),querySelector:()=>null};await api.play({card,source:missing,key:'retry'});
 let awaited=false,checks=0;const retry={getBoundingClientRect:()=>({width:100}),querySelector:()=>({width:900,height:1260}),get visualReady(){awaited=true;return Promise.resolve();}};
 await api.play({card,source:retry,key:'retry',valid:()=>++checks===1});assert.equal(awaited,true);assert.equal(checks,2);
});
