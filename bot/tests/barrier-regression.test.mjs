import {fileURLToPath} from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {engine} from '../runner/lib/engine.mjs';
import {receiveDamage} from '../runner/source/mesa-nova/forja-variant.mjs';
const source=fileURLToPath(new URL('../runner/source/',import.meta.url));
const catalog=JSON.parse(fs.readFileSync(source+'mesa-nova/cartas.json'));
const models=[...catalog.decks.flatMap(d=>d.cards),...(catalog.additionalCards||[])];
async function fixture(seed=54123){
 const api=await engine(seed,0,source),r=api.makeRoom('BARRIER','A'),a=r.players[0],b=api.join(r,'B');
 for(const [p,deckId]of [[a,'fluxo-virelion'],[b,'ruptura-grupo']])api.act(r,p,{type:'deck',deckId},catalog);
 for(const p of r.players)api.act(r,p,{type:'confirmMulligan'},catalog);
 r.phase='prep';r.turn=a.id;r.first=a.id;r.round=4;r.collectPreview=true;
 for(const p of r.players){p.hand=[];p.reserve=[];p.prepared=[];p.emanation=[];p.formation=[null,null,null];p.mana=p.manaMax=10;p.patron.hp=p.patron.maxHp=100;p.directPlayed=false;p.pendingDiscard=0;delete p.apprenticeQueue;delete p.firstSpellRound;}
 let serial=0;
 const card=(id,p=a,extra={})=>{const model=models.find(c=>c.id===id);assert.ok(model,'model '+id);return {...structuredClone(model),uid:'barrier-fixture-'+(++serial),modelId:id,owner:p.id,damage:0,attackMod:0,baseStats:{attack:model.attack,health:model.health,cost:model.cost},...extra};};
 const unit=(p=a,attack=0,health=30,extra={})=>card('FV01',p,{name:'Fixture creature',attack,health,cost:0,effects:[],baseStats:{attack,health,cost:0},...extra});
 const place=(p,c,lane)=>{if(!p.reserve.includes(c))p.reserve.push(c);if(lane!==undefined)p.formation[lane]=c.uid;return c;};
 const cast=(p,c,action={})=>{r.phase='prep';r.turn=p.id;p.mana=10;p.hand.push(c);api.act(r,p,{type:'play',cardId:c.uid,mode:'direct',...action},catalog);return c;};
 const shield=(c,p=a)=>cast(p,card('FV11',p),{targetId:c.uid});
 const spell=(p,op,extra={})=>card('RG07',p,{cost:0,positionOnly:false,directOnly:false,effects:[{op,...extra}]});
 const hit=(c,amount,p=b)=>cast(p,spell(p,'damage',{amount,target:'any'}),{targetId:c.uid});
 const combat=()=>{r.phase='resolving';api.resolveCombat(r);};
 return {api,r,a,b,card,unit,place,cast,shield,spell,hit,combat};
}
for(const amount of [1,2,7])test('shield negates one complete attack of '+amount+', then next attack damages',async()=>{
 const f=await fixture(),target=f.place(f.a,f.unit(),0),enemy=f.place(f.b,f.unit(f.b,amount,30),0);
 f.shield(target);f.combat();assert.equal(target.damage,0);assert.ok(!target.spectralBarrier);const blockedStep=f.r.directedSteps.find(s=>s.sourceId===enemy.uid);assert.equal(blockedStep.amount,0);assert.equal(blockedStep.barrierPrevented,true);assert.ok(blockedStep.healthUpdates.some(u=>u.uid===target.uid&&u.spectralBarrier===false),'Combat telemetry clears shield after blocked hit');
 f.a.formation=[target.uid,null,null];f.b.formation=[enemy.uid,null,null];f.combat();assert.equal(target.damage,amount);
});
test('zero damage does not consume; positive packets consume once without stacking',async()=>{
 const f=await fixture(),target=f.place(f.a,f.unit());f.shield(target);f.shield(target);f.hit(target,0);assert.equal(target.spectralBarrier,true);f.hit(target,4);assert.equal(target.damage,0);assert.ok(!target.spectralBarrier);f.hit(target,2);assert.equal(target.damage,2);
});
test('shield persists through three combats without damage, no timer',async()=>{
 const f=await fixture(),target=f.place(f.a,f.unit());f.shield(target);for(let i=0;i<3;i++){f.combat();assert.equal(target.spectralBarrier,true);assert.equal(target.damage,0);}f.hit(target,6);assert.equal(target.damage,0);assert.ok(!target.spectralBarrier);
});
test('shield preserves armor and first-damage/volatile triggers until actual damage',async()=>{
 const f=await fixture(),target=f.place(f.a,f.unit(f.a,0,50,{extraLife:3,volatileProject:true,effects:[{op:'first_damage_double'}]}));f.shield(target);f.hit(target,2);assert.equal(target.damage,0);assert.equal(target.extraLife,3);assert.equal(target.volatileProject,true);assert.ok(!target.firstDamageTaken);assert.equal(target.attack,0);f.hit(target,2);assert.equal(target.firstDamageTaken,true);assert.ok(!target.volatileProject);assert.equal(target.extraLife,0);assert.ok(target.damage>0);assert.equal(target.attack,1);
});
test('direct target remains an allied creature, never Patron or enemy',async()=>{
 const f=await fixture(),enemy=f.place(f.b,f.unit(f.b));for(const targetId of ['patron','patron:'+f.a.id,enemy.uid]){const c=f.card('FV11');assert.throws(()=>f.cast(f.a,c,{targetId}));}assert.ok(!f.a.patron.spectralBarrier);const hp=f.a.patron.hp;f.cast(f.b,f.spell(f.b,'damage',{amount:3,target:'any'}),{targetId:'patron:'+f.a.id});assert.equal(f.a.patron.hp,hp-3);
});
test('lane shield activates once, discards one physical card and never refreshes next combat',async()=>{
 const f=await fixture(),target=f.place(f.a,f.unit(),0),enemy=f.place(f.b,f.unit(f.b,0),0),c=f.card('FV11');f.cast(f.a,c,{mode:'lane',targetSide:f.a.id,lane:0});f.combat();assert.equal(target.spectralBarrier,true);assert.equal(f.a.prepared.length,0);assert.equal(f.a.discard.filter(x=>x.uid===c.uid).length,1);
 enemy.attack=3;f.a.formation=[target.uid,null,null];f.b.formation=[enemy.uid,null,null];f.combat();assert.equal(target.damage,0);assert.ok(!target.spectralBarrier);f.a.formation=[target.uid,null,null];f.b.formation=[enemy.uid,null,null];f.combat();assert.equal(target.damage,3);assert.equal(f.a.discard.filter(x=>x.uid===c.uid).length,1);
});
test('lane shield refuses enemy side and never protects a Patron occupant',async()=>{
 const f=await fixture();assert.throws(()=>f.cast(f.a,f.card('FV11'),{mode:'lane',targetSide:f.b.id,lane:0}));f.a.formation=['patron:'+f.a.id,null,null];f.cast(f.a,f.card('FV11'),{mode:'lane',targetSide:f.a.id,lane:0});f.combat();assert.ok(!f.a.patron.spectralBarrier);
});
test('area damage respects shield independently per creature',async()=>{
 const f=await fixture(),protectedUnit=f.place(f.a,f.unit()),other=f.place(f.a,f.unit());f.shield(protectedUnit);f.cast(f.b,f.spell(f.b,'area_damage',{amount:3}),{});assert.equal(protectedUnit.damage,0);assert.equal(other.damage,3);assert.ok(!protectedUnit.spectralBarrier);
});
test('damage from creature Entry goes through shield',async()=>{
 const f=await fixture(),target=f.place(f.a,f.unit());f.shield(target);f.b.patron.extraLife=4;f.cast(f.b,f.card('FA04',f.b),{targetId:target.uid});assert.equal(target.damage,0);assert.ok(!target.spectralBarrier);
});
test('Apprentice first-spell shot consumes shield and reports effective zero',async()=>{
 const f=await fixture(),target=f.place(f.a,f.unit()),apprentice=f.card('FV03',f.b);f.shield(target);f.cast(f.b,apprentice,{mode:'emanate'});delete f.b.firstSpellRound;f.cast(f.b,f.card('FV08',f.b));assert.ok(f.b.apprenticeQueue?.length);f.api.act(f.r,f.b,{type:'apprenticeTarget',cardId:apprentice.uid,targetId:target.uid},catalog);assert.equal(target.damage,0);assert.ok(!target.spectralBarrier);const event=f.r.events.filter(e=>e.type==='apprentice_damage').at(-1);assert.equal(event.damageDealt,0);
});
test('shield does not prevent defeat, silence, or return to hand',async()=>{
 for(const op of ['defeat','silence','return_to_hand']){const f=await fixture(),target=f.place(f.a,f.unit(f.a,3));f.shield(target);f.cast(f.b,f.spell(f.b,op,op==='silence'?{target:'any_creature'}:op==='return_to_hand'?{reset:true}:{}),{targetId:target.uid});if(op==='defeat')assert.ok(f.a.discard.some(c=>c.uid===target.uid));else if(op==='silence')assert.ok(!target.spectralBarrier);else{const returned=f.a.hand.find(c=>c.uid===target.uid);assert.ok(returned);assert.ok(!returned.spectralBarrier);}}
});
test('zero effective combat damage prevents adjacent damage and trample, not attack curse',async()=>{
 const f=await fixture(),witch=f.place(f.a,f.card('FV06',f.a,{health:30,baseStats:{attack:1,health:30,cost:4}}),0),neighbor=f.place(f.a,f.unit(),1),attacker=f.place(f.b,f.unit(f.b,20,40,{effects:[{op:'trample'},{op:'adjacent_damage',amount:3}]}),0);f.shield(witch);const hp=f.a.patron.hp;f.combat();assert.equal(witch.damage,0);assert.equal(neighbor.damage,0);assert.equal(f.a.patron.hp,hp);assert.equal(attacker.corruption,true);assert.equal(attacker.attack,19);
});
test('survive-combat growth remains valid when shield blocks damage',async()=>{
 const f=await fixture(),target=f.place(f.a,f.unit(f.a,1,10,{effects:[{op:'survive_growth',attack:1,health:1}]}),0);f.place(f.b,f.unit(f.b,3),0);f.shield(target);f.combat();assert.equal(target.damage,0);assert.equal(target.attack,2);assert.equal(target.health,11);
});
test('Studies sharing gives two independent shields without duplicating physical trap',async()=>{
 const f=await fixture(),left=f.place(f.a,f.unit(),0),center=f.place(f.a,f.unit(),1),spell=f.card('FV11');f.a.study.sharing=true;f.cast(f.a,spell,{mode:'lane',targetSide:f.a.id,lane:0});f.combat();assert.equal(left.spectralBarrier,true);assert.equal(center.spectralBarrier,true);assert.equal(f.a.discard.filter(c=>c.uid===spell.uid).length,1);assert.equal(f.a.prepared.length,0);f.hit(left,2);assert.ok(!left.spectralBarrier);assert.equal(center.spectralBarrier,true);
});
test('prepared inversion does not lose shield state when damage occurs in same wave',async()=>{
 for(const order of [0,1]){const f=await fixture(),target=f.place(f.a,f.unit(f.a,8,10),0);f.place(f.a,f.unit(),1);f.cast(f.a,f.card('FV11'),{mode:'lane',targetSide:f.a.id,lane:0});f.cast(f.b,f.card('FEX04',f.b),{mode:'lane',targetSide:f.a.id,lane:0});f.cast(f.b,f.spell(f.b,'area_damage',{amount:3}),{mode:'lane',targetSide:f.a.id,lane:1});if(order)f.r.players.reverse();f.combat();assert.equal(target.damage,0);assert.ok(!target.spectralBarrier);}
});
test('two positive prepared damage packets consume only first, not the whole wave',async()=>{
 const f=await fixture(),target=f.place(f.a,f.unit(),0);f.place(f.a,f.unit(),1);f.shield(target);for(const lane of [0,1])f.b.prepared.push({card:f.spell(f.b,'area_damage',{amount:2}),lane,targetSide:f.a.id});f.combat();assert.equal(target.damage,2);assert.ok(!target.spectralBarrier);
});
test('central helper never protects Patron and zero damage is identity',()=>{
 const c={type:'creature',damage:0,health:9,spectralBarrier:true};assert.equal(receiveDamage(c,0),c);assert.equal(c.spectralBarrier,true);const p={type:'patron',damage:0,health:20,spectralBarrier:true};assert.equal(receiveDamage(p,3).damage,3);
});
test('Lançador damage uses shield, not the Patron hit that triggered it',async()=>{
 const {dealPatronDamage}=await import('../runner/source/mesa-nova/combat-triggers.mjs');const f=await fixture(),target=f.place(f.a,f.unit(),0),launcher=f.place(f.b,f.card('R2-RG14',f.b));f.b.emanation=[launcher.uid];f.shield(target);f.r.rulesRng={algorithm:'xorshift32',state:123456789,draws:0};const hp=f.a.patron.hp;const emitted=[];dealPatronDamage(f.r,f.a,1,{ownerId:f.b.id,sourceId:'allied-source',kind:'spell',emit:(...x)=>emitted.push(x)});assert.equal(f.a.patron.hp,hp-1);assert.equal(target.damage,0);assert.ok(!target.spectralBarrier);assert.equal(f.r.rulesRng.draws,1);assert.ok(emitted.some(x=>x[1]==='launcher_damage'&&x[2].targetId===target.uid));
});
test('combat decay is damage and consumes shield only on its first occurrence',async()=>{
 const f=await fixture(),target=f.place(f.a,f.unit(f.a,0,20,{effects:[{op:'combat_decay',amount:2}]}));f.shield(target);f.combat();assert.equal(target.damage,0);assert.ok(!target.spectralBarrier);f.combat();assert.equal(target.damage,2);
});
test('weapon recoil is damage while durability remains spent for attacking',async()=>{
 const f=await fixture(),target=f.place(f.a,f.unit(f.a,1,20,{equipment:{uid:'fixture-weapon',name:'Fixture weapon',type:'equipment',attack:0,durability:3,maxDurability:3,wear:1,recoil:2,effects:[]}}),0);f.place(f.b,f.unit(f.b,0),0);f.shield(target);f.combat();assert.equal(target.damage,0);assert.ok(!target.spectralBarrier);assert.equal(target.equipment.durability,2);const step=f.r.directedSteps.find(s=>s.sourceId===target.uid);assert.equal(step.recoil.amount,0);assert.equal(step.recoil.requestedAmount,2);assert.equal(step.recoil.barrierPrevented,true);assert.equal(step.recoil.update.spectralBarrier,false);
});
test('Retaliação still counts an attack whose damage is negated',async()=>{
 const f=await fixture(),target=f.place(f.a,f.unit(),0);f.place(f.b,f.unit(f.b,1),0);const source=f.place(f.b,f.unit(f.b,0,20,{effects:[{op:'retaliation',timing:'emanation',threshold:3,amount:4}]}));f.b.emanation=[source.uid];f.shield(target);f.combat();assert.equal(target.damage,0);assert.equal(f.a.patron.retaliation,1);
});
test('without shield simultaneous packets preserve legacy first-damage aggregation',async()=>{
 const f=await fixture(),target=f.place(f.a,f.unit(f.a,0,40,{effects:[{op:'first_damage_double'}]}),0);f.place(f.a,f.unit(),1);for(const lane of [0,1])f.b.prepared.push({card:f.spell(f.b,'area_damage',{amount:2}),lane,targetSide:f.a.id});f.combat();assert.equal(target.damage,8);assert.equal(target.firstDamageTaken,true);
});
test('empty shield trap waits without a timer and activates on a later occupant',async()=>{
 const f=await fixture(),spell=f.card('FV11');f.cast(f.a,spell,{mode:'lane',targetSide:f.a.id,lane:0});for(let i=0;i<3;i++){f.combat();assert.equal(f.a.prepared.filter(x=>x.card.uid===spell.uid).length,1);}const target=f.place(f.a,f.unit(),0);f.combat();assert.equal(target.spectralBarrier,true);assert.equal(f.a.prepared.length,0);assert.equal(f.a.discard.filter(x=>x.uid===spell.uid).length,1);
});
test('Studies20 shares an active positional shield but never resurrects a consumed one',async()=>{
 for(const consumed of [false,true]){const f=await fixture(),left=f.place(f.a,f.unit(),0),center=f.place(f.a,f.unit(),1);f.a.study.activated=[10];f.a.study.discount=true;f.a.study.seenIds=Array.from({length:20},(_,i)=>'seen-'+i);f.shield(left);if(consumed)f.hit(left,2);f.r.phase='prep';f.r.turn=f.a.id;f.a.mana=10;f.api.act(f.r,f.a,{type:'patronPower',powerId:'estudos-avancados',centerNeighbor:2},catalog);assert.equal(f.a.study.sharing,true);assert.equal(Boolean(center.spectralBarrier),!consumed);assert.equal(Boolean(left.spectralBarrier),!consumed);}
});

test('blocked adjacent damage emits an explicit consumed-shield health update',async()=>{
 const f=await fixture(),primary=f.place(f.a,f.unit(),0),neighbor=f.place(f.a,f.unit(),1),attacker=f.place(f.b,f.unit(f.b,3,30,{effects:[{op:'adjacent_damage',amount:2}]}),0);f.shield(neighbor);f.combat();assert.equal(primary.damage,3);assert.equal(neighbor.damage,0);assert.ok(!neighbor.spectralBarrier);const step=f.r.directedSteps.find(s=>s.sourceId===attacker.uid);assert.ok(step.healthUpdates.some(u=>u.uid===neighbor.uid&&u.spectralBarrier===false));
});
