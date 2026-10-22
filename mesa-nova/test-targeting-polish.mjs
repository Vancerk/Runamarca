import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
function harness(){
 const events=new Map(),frames=new Map();let serial=0;
 class Node{
  constructor(tag){this.tag=tag;this.children=[];this.attributes={};this.classes=new Set();this.isConnected=true;this.rect={left:100,top:100,width:80,height:100};this.classList={add:(...x)=>x.forEach(c=>this.classes.add(c)),remove:(...x)=>x.forEach(c=>this.classes.delete(c)),toggle:(c,on)=>on?this.classes.add(c):this.classes.delete(c)};}
  setAttribute(k,v){this.attributes[k]=v;} append(...nodes){this.children.push(...nodes);nodes.forEach(n=>n.parent=this);} remove(){this.isConnected=false;} contains(node){return node===this||this.children.some(n=>n.contains(node));}getBoundingClientRect(){return this.rect;}
 }
 const body=new Node('body');let pointed=null;
 const document={body,createElement:t=>new Node(t),createElementNS:(ns,t)=>new Node(t),elementFromPoint:()=>pointed,addEventListener:(type,fn)=>{if(!events.has(type))events.set(type,new Set());events.get(type).add(fn);},removeEventListener:(type,fn)=>events.get(type)?.delete(fn)};
 const scope=vm.createContext({document,performance:{now:()=>1000},requestAnimationFrame:fn=>{frames.set(++serial,fn);return serial;},cancelAnimationFrame:id=>frames.delete(id),addEventListener(){},removeEventListener(){}});
 vm.runInContext(fs.readFileSync(new URL('targeting.js',import.meta.url),'utf8'),scope);
 return {api:scope.RunaTargeting,Node,body,point:node=>pointed=node,dispatch(type,more={}){for(const fn of [...events.get(type)||[]])fn({preventDefault(){},stopImmediatePropagation(){},...more});},frame(){const todo=[...frames.values()];frames.clear();todo.forEach(fn=>fn());}};
}
test('mira acompanha ponteiro, confirma uma única vez e não consome ao iniciar',()=>{
 const h=harness(),source=new h.Node('card'),target=new h.Node('card');let spent=0;
 h.api.start({source,targets:()=>[{id:'target',node:target}],confirm:()=>spent++,valid:()=>true});assert.equal(spent,0);
 h.dispatch('pointermove',{clientX:400,clientY:240});h.point(target);h.frame();assert.ok(target.classes.has('aim-legal'));assert.ok(target.classes.has('aim-hover'));
 const svg=h.body.children[0];assert.match(svg.children[0].attributes.d,/400 240$/);
 assert.equal(h.api.release({clientX:400,clientY:240}),true);assert.equal(h.api.release({clientX:400,clientY:240}),false);assert.equal(spent,1);assert.ok(!target.classes.has('aim-legal'));
});
for(const cancel of ['Escape','right-click','invalid-drop','return-to-hand'])test(`mira cancela por ${cancel} sem confirmação`,()=>{
 const h=harness(),source=new h.Node('card'),target=new h.Node('card');let spent=0;
 h.api.start({source,targets:()=>[{id:'target',node:target}],confirm:()=>spent++});h.frame();
 if(cancel==='Escape')h.dispatch('keydown',{key:'Escape'});else if(cancel==='right-click')h.dispatch('contextmenu');else if(cancel==='invalid-drop'){h.point(null);h.api.release({clientX:20,clientY:20});}else h.api.cancel();
 assert.equal(spent,0);assert.equal(h.api.active(),false);assert.ok(!target.classes.has('aim-legal'));
});
test('alvo perde validade durante a mira e estado novo cancela a ação',()=>{
 const h=harness(),source=new h.Node('card'),target=new h.Node('card');let choices=[{id:'old',node:target}],valid=true,spent=0;
 h.api.start({source,targets:()=>choices,confirm:()=>spent++,valid:()=>valid});h.point(target);h.frame();choices=[];h.frame();assert.ok(!target.classes.has('aim-legal'));h.api.release({clientX:120,clientY:120});assert.equal(spent,0);
 h.api.start({source,targets:()=>[{id:'old',node:target}],confirm:()=>spent++,valid:()=>valid});valid=false;h.frame();assert.equal(h.api.active(),false);assert.equal(spent,0);
});
test('lista acessível é alternativa explícita, sem confirmação antecipada',()=>{
 const h=harness();let listed=0,spent=0;h.api.start({source:new h.Node('card'),targets:()=>[],confirm:()=>spent++,fallback:()=>listed++});h.body.children[1].children[1].onclick();assert.equal(listed,1);assert.equal(spent,0);assert.equal(h.api.active(),false);
});
test('origem DOM acompanha scroll/resize e cancela se o retrato desaparecer',()=>{
 const h=harness(),source=new h.Node('portrait'),target=new h.Node('card');h.api.start({source:()=>source,targets:()=>[{id:'t',node:target}],confirm(){}});h.frame();
 const path=h.body.children[0].children[0];assert.match(path.attributes.d,/^M 140 135 /);source.rect={left:250,top:330,width:60,height:80};h.frame();assert.match(path.attributes.d,/^M 280 358 /);source.isConnected=false;h.frame();assert.equal(h.api.active(),false);
});
test('fornecedor da Bomba fica marcado até confirmar ou cancelar; repetição/IME não cancela',()=>{
 const h=harness(),source=new h.Node('portrait'),donor=new h.Node('card');h.api.start({source,picked:()=>donor,targets:()=>[],confirm(){}});h.frame();assert.ok(donor.classes.has('aim-provider'));h.dispatch('keydown',{key:'Escape',repeat:true});assert.equal(h.api.active(),true);h.dispatch('keydown',{key:'Escape',isComposing:true});assert.equal(h.api.active(),true);h.dispatch('keydown',{key:'Escape'});assert.equal(h.api.active(),false);assert.ok(!donor.classes.has('aim-provider'));
});
test('alvos públicos respeitam lados, vida, Emanação e limiar sem ler mão rival',()=>{
 const h=harness(),a={id:'a',patron:{hp:16},reserve:[{uid:'friend',type:'creature',damage:0,health:2,attack:2}],emanation:[]},b={id:'b',patron:{hp:16},reserve:[{uid:'low',type:'creature',damage:0,health:2,effectiveAttack:1},{uid:'valid',type:'creature',damage:0,health:2,effectiveAttack:5},{uid:'dead',type:'creature',damage:2,health:2,effectiveAttack:8},{uid:'emana',type:'creature',damage:0,health:2,effectiveAttack:8}],emanation:['emana']};Object.defineProperty(b,'hand',{get(){throw Error('Hidden hand read');}});
 const state={players:[a,b]},card={reserveOnly:true,effects:[{min_attack:2}]};assert.deepEqual(Array.from(h.api.creatureIds(state,'a',card,'enemy')),['valid']);assert.deepEqual(Array.from(h.api.creatureIds(state,'b',{effects:[]},'friendly')),['low','valid','emana']);
 assert.ok(h.api.creatureIds(state,'a',{effects:[]},'any').includes('patron:b'));assert.ok(!h.api.creatureIds(state,'a',{effects:[]},'any-creature').some(x=>x.startsWith('patron:')));
});
test('cancelamento notifica colocação pendente uma vez; confirmar e abrir lista não cancelam a jogada',()=>{
 const h=harness(),source=new h.Node('card'),target=new h.Node('card');let cancelled=0,confirmed=0,listed=0;
 const options={source,targets:()=>[{id:'target',node:target}],onCancel:()=>cancelled++,confirm:()=>confirmed++,fallback:()=>listed++};
 h.api.start(options);h.api.cancel();h.api.cancel();assert.equal(cancelled,1);
 h.api.start(options);h.point(target);h.api.release({clientX:130,clientY:140});assert.equal(confirmed,1);assert.equal(cancelled,1);
 h.api.start(options);const tools=h.body.children.at(-1);tools.children[1].onclick();assert.equal(listed,1);assert.equal(cancelled,1);
 h.api.start({...options,valid:()=>false});h.frame();assert.equal(cancelled,2);
});
