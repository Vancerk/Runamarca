import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {act,makeRoom,join,view} from './game.mjs';
import {insertHandBuffSteps} from './hand-buff-presentation.mjs';
const read=name=>readFileSync(new URL(name,import.meta.url),'utf8');
const catalog=JSON.parse(read('cartas.json')),deck=catalog.decks.find(d=>d.id==='forja-oficina-experimental');
function setup(){const room=makeRoom('HANDBUFF','A'),a=room.players[0],b=join(room,'B');for(const p of [a,b])Object.assign(p,{patron:{hp:100,maxHp:100},mana:10,manaMax:10,deckData:deck,deck:[],taunts:{}});Object.assign(room,{first:a.id,turn:b.id,phase:'prep'});const spectator={id:'spectator',name:'S'};room.spectators.push(spectator);return {room,a,b,spectator};}
function card(id,p,extra={}){const model=catalog.decks.flatMap(d=>d.cards).find(c=>c.id===id);return {...structuredClone(model),uid:crypto.randomUUID(),modelId:id,owner:p.id,damage:0,attackMod:0,...extra};}
test('Last Breath emits exact permanent gains, with hand identities private for rivals and spectators',()=>{
 const {room,a,b,spectator}=setup(),source=card('FEX09',a),normal=card('FL17',a),double=card('FL21',a),spell=card('FL10',a);a.reserve=[source];a.hand=[normal,double,spell];
 const hit={uid:'hit',owner:b.id,name:'Dano',type:'direct_spell',cost:0,effects:[{op:'damage',amount:2}],directOnly:true};b.hand=[hit];act(room,b,{type:'play',cardId:'hit',mode:'direct',targetId:source.uid},catalog);
 const event=view(room,a).events.find(e=>e.type==='hand_buff');assert.equal(event.count,2);assert.deepEqual(event.targets,[{uid:normal.uid,attack:1,health:1},{uid:double.uid,attack:2,health:2}]);assert.equal(normal.attack,2);assert.equal(double.attack,3);
 for(const viewer of [b,spectator]){const publicEvent=view(room,viewer).events.find(e=>e.type==='hand_buff');assert.equal(publicEvent.sourceId,source.uid);assert.equal(publicEvent.targets,undefined);assert.ok(!JSON.stringify(publicEvent).includes(normal.uid));}
});
for(const directed of [false,true])test('combat schedules hand bonus after lethal '+(directed?'strike':'clash')+'; preview and resolution share one presentation identity',()=>{
 const {room,a,b,spectator}=setup();room.phase='formation';const source=card('FEX09',a),normal=card('FL17',a),attacker=card('FL03',b,{attack:10,health:10,effects:directed?[{op:'initiative'}]:[]});a.reserve=[source];a.formation[0]=source.uid;a.hand=[normal];b.reserve=[attacker];b.formation[0]=attacker.uid;
 const original=setTimeout;let finish;try{globalThis.setTimeout=fn=>{finish=fn;return 0;};act(room,a,{type:'ready'},catalog);act(room,b,{type:'ready'},catalog);}finally{globalThis.setTimeout=original;}
 const timeline=view(room,a).combat.timeline,index=timeline.findIndex(s=>s.kind==='hand_buff'),buff=timeline[index].buff;assert.ok(index>0);assert.equal(timeline[index-1].kind,directed?'strike':'clash');assert.equal(timeline[index-1].lane,0);assert.equal(buff.targets[0].uid,normal.uid);assert.equal(normal.attack,1,'simulation cannot mutate the real hand');
 for(const viewer of [b,spectator])assert.equal(view(room,viewer).combat.timeline[index].buff.targets,undefined);
 finish();assert.equal(normal.attack,2);assert.equal(room.events.find(e=>e.type==='hand_buff').buffId,buff.buffId);
});
test('simultaneous Last Breaths are ordered after a spell and before later combat steps',()=>{
 const timeline=[{kind:'reveal'},{kind:'magic',spell:{healthUpdates:[{uid:'a',hp:0},{uid:'b',hp:0}]}},{kind:'strike'},{kind:'result'}];
 const result=insertHandBuffSteps(timeline,[{sourceId:'a'},{sourceId:'b'}]);assert.deepEqual(result.map(s=>s.kind),['reveal','magic','hand_buff','hand_buff','strike','result']);
});
function canvasFixture(){
 let now=0,id=0;const frames=new Map(),canvases=[],labels=[];
 const ctx=new Proxy({createRadialGradient:()=>({addColorStop(){}}),fillText:text=>labels.push(text)},{get:(o,k)=>k in o?o[k]:()=>{}});
 const scope={innerWidth:1000,innerHeight:800,devicePixelRatio:1,performance:{now:()=>now},matchMedia:()=>({matches:false}),requestAnimationFrame:fn=>{frames.set(++id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id),document:{body:{append:n=>canvases.push(n)},createElement:()=>({style:{},setAttribute(){},getContext:()=>ctx,remove(){this.removed=true;}})}};
 vm.createContext(scope);vm.runInContext(read('hand-buff-effects.js'),scope);
 return {api:scope.RunaHandBuff,labels,canvases,tick(ms){now=ms;const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(ms));},frames};
}
const node=(left,top)=>({getBoundingClientRect:()=>({left,top,width:120,height:160})});
test('bonus travels to each visible card, labels actual gains, and releases its canvas',async()=>{
 const f=canvasFixture();let sounds=0;const run=f.api.play({from:node(400,300),targets:[{node:node(300,600),attack:1,health:1},{node:node(500,600),attack:2,health:2}],count:2,onSound:()=>sounds++});f.tick(1000);assert.ok(f.labels.includes('+1/+1'));assert.ok(f.labels.includes('+2/+2'));assert.equal(sounds,1);f.tick(1600);assert.equal(await run,true);assert.equal(f.canvases[0].removed,true);assert.equal(f.frames.size,0);
});
test('hidden hand receives only a collective effect and clearing cancels pending animation',async()=>{
 const f=canvasFixture(),run=f.api.play({from:node(400,300),hiddenHand:node(500,20),count:2});f.tick(1000);assert.deepEqual(f.labels,['Aliados na mão fortalecidos']);f.api.clear();assert.equal(await run,false);assert.equal(f.canvases[0].removed,true);assert.equal(f.frames.size,0);
});
test('old match generation and empty hand cannot leave a visual behind',async()=>{
 const f=canvasFixture();assert.equal(await f.api.play({from:node(1,1),count:0}),false);assert.equal(f.canvases.length,0);let generation=1;
 const run=f.api.play({from:node(400,300),hiddenHand:node(500,20),count:2,getGeneration:()=>generation});generation++;f.tick(100);assert.equal(await run,false);assert.equal(f.frames.size,0);
});
