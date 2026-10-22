import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const source=fs.readFileSync(new URL('./combat-return.js',import.meta.url),'utf8');
function harness(){
 let queue=new Map(),serial=0;const elements=[],targets=new Map(),released=[];
 const gradient={addColorStop(){}};
 const ctx=new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(o,k)=>o[k]||(()=>{})});
 function node(tag='div'){
  const classes=new Set();const n={tag,style:{},dataset:{},children:[],isConnected:true,rect:{left:500,top:600,width:84,height:84*820/900},
   classList:{add:(...s)=>s.forEach(x=>classes.add(x)),remove:(...s)=>s.forEach(x=>classes.delete(x)),contains:s=>classes.has(s)},
   append(...nodes){this.children.push(...nodes);},remove(){this.isConnected=false;this.children.forEach(n=>n.remove());},removeAttribute(k){if(k==='style')this.style={};},setAttribute(){},getBoundingClientRect(){return this.rect;},getContext:()=>ctx};
  elements.push(n);return n;
 }
 const body=node(),listeners=new Map(),scope=vm.createContext({document:{body,createElement:node,querySelectorAll:selector=>elements.filter(n=>n.lane&&(!selector.includes(':not(.back)')||!n.classList.contains('back')))},performance:{now:()=>0},innerWidth:1600,innerHeight:1000,devicePixelRatio:1,
  requestAnimationFrame:fn=>{queue.set(++serial,fn);return serial;},cancelAnimationFrame:id=>queue.delete(id),addEventListener:(k,fn)=>listeners.set(k,fn),removeEventListener:k=>listeners.delete(k),RunaForgeHammer3D:{create:()=>({draw(){},destroy(){}})}});
 vm.runInContext(source,scope);
 const item=(uid='one',style='gentle',owner='a')=>{const target=node();targets.set(uid,target);return {uid,owner,style,rect:{left:100,top:100,width:132,height:120},face:node()};};
 const play=(items,options={})=>scope.RunaCombatReturn.play(items,{getTarget:uid=>targets.get(uid),clone:()=>node(),release:uid=>{released.push(uid);const t=targets.get(uid);if(t)t.style.visibility='';},...options});
 const tick=time=>{const jobs=[...queue.values()];queue.clear();jobs.forEach(fn=>fn(time));};
 const cards=()=>elements.filter(n=>n.isConnected&&n.className==='combat-return-card');
 return {api:scope.RunaCombatReturn,node,targets,released,play,tick,cards,item,elements,listeners};
}
function scale(node){return [...node.style.transform.match(/scale\(([^)]+)\)/)[1].split(',')].map(Number);}
for(const [style,duration,mid] of [['forge',1470,700],['ether',1350,675],['chain',1390,800],['gentle',800,400]]){
 test(`${style}: tamanho muda durante o trajeto e chega no tamanho compacto, duas perspectivas`,async()=>{
  const h=harness(),a=h.item('a',style,'a'),b=h.item('b',style,'b');h.targets.get('b').rect={left:300,top:40,width:84,height:84*820/900};
  const done=h.play([a,b]);await Promise.resolve();h.tick(mid);
  assert.equal(h.cards().length,2);
  for(const card of h.cards()){const [sx,sy]=scale(card);assert.ok(sx<1&&sx>84/132,'mid-flight size must lie between source and destination');assert.ok(sy<1);assert.ok(card.children[0].classList.contains('flight-face'),'printed card aspect rules must not override the flight wrapper');}
  h.tick(duration+1);await done;assert.equal(h.cards().length,0);assert.equal(h.released.length,2);assert.equal(new Set(h.released).size,2);
 });
}
test('re-render e mudança de tamanho de destino não usam a caixa antiga',async()=>{
 const h=harness(),done=h.play([h.item()]);await Promise.resolve();h.tick(300);
 const previous=h.targets.get('one');previous.isConnected=false;const next=h.node();next.rect={left:800,top:700,width:90,height:82};h.targets.set('one',next);h.tick(799);
 const card=h.cards()[0],[sx,sy]=scale(card);assert.ok(Math.abs(sx-90/132)<.001);assert.ok(Math.abs(sy-82/120)<.001);assert.equal(next.style.visibility,'hidden');const x=Number(card.style.transform.match(/translate\(([-\d.]+)px,/)[1]);assert.ok(Math.abs(x-679)<.01,'destination center is within 0.01px before the last frame');
 h.tick(801);await done;assert.deepEqual(h.released,['one']);assert.equal(next.style.visibility,'');
});
test('cancelamento libera cada carta uma vez e remove o efeito',async()=>{
 const h=harness(),done=h.play([h.item('a','chain'),h.item('b','chain')]);h.tick(200);h.api.cancel();await done;h.api.cancel();assert.equal(h.cards().length,0);
 assert.deepEqual(h.released.sort(),['a','b']);assert.ok(!h.elements.find(n=>n.className==='combat-return-layer').isConnected);
});
test('alvo removido e sessão invalidada encerram sem deixar carta oculta',async()=>{
 const h=harness(),done=h.play([h.item()]);h.targets.delete('one');h.tick(100);await done;assert.deepEqual(h.released,['one']);
 const h2=harness();let valid=true;const done2=h2.play([h2.item()],{valid:()=>valid});valid=false;h2.tick(1);await done2;assert.equal(h2.targets.get('one').style.visibility,'');
});
test('movimento reduzido termina em 320ms e não cria martelo',async()=>{
 const h=harness(),done=h.play([h.item('a','forge')],{reduced:true});h.tick(160);assert.ok(scale(h.cards()[0])[0]<1);h.tick(321);await done;assert.equal(h.elements.filter(n=>n.className==='return-hammer-host').length,0);assert.deepEqual(h.released,['a']);
});
test('textura atrasada mantém a face antiga visível em vez de desaparecer antes da chegada',async()=>{
 const h=harness(),i=h.item();h.targets.get(i.uid).visualReady=new Promise(()=>{});const done=h.play([i]);h.tick(650);assert.equal(h.cards()[0].children[0].style.opacity,1);h.tick(801);await done;
});
test('captura não clona a identidade de carta oculta',()=>{
 const h=harness(),shown=h.node(),secret=h.node();shown.lane=secret.lane=true;shown.dataset.uid='shown';secret.dataset.uid='secret';secret.classList.add('back');
 const state={phase:'prep',players:[{id:'a',patron:{affinity:'forja'},reserve:[{uid:'shown'},{uid:'secret'}],formation:[],emanation:[]}]};let clones=0;
 const captures=h.api.capture(state,'resolving',()=>{clones++;return h.node();});assert.equal(captures.length,1);assert.equal(captures[0].uid,'shown');assert.equal(clones,1);
});
