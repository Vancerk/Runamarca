import assert from 'node:assert/strict';
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import {act,makeRoom,join,resolveCombat} from './game.mjs';
import {grantPermanentStats,keywordPresentation} from './forja-variant.mjs';
import {unrestrictedReturn} from './test-return-fixture.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('./cartas.json',import.meta.url))),models=[...catalog.decks.flatMap(d=>d.cards),...catalog.additionalCards];
const card=(id,p,extra={})=>{const m=models.find(c=>c.id===id);return {...structuredClone(m),uid:randomUUID(),modelId:id,owner:p.id,damage:0,attackMod:0,baseStats:{attack:m.attack,health:m.health,cost:m.cost},...extra};};
function setup(){const room=makeRoom('AARD','A'),a=room.players[0],b=join(room,'B');for(const p of [a,b])Object.assign(p,{patron:{hp:100,maxHp:100},mana:100,manaMax:10,deck:Array.from({length:20},()=>card('FL16',p))});Object.assign(room,{phase:'prep',turn:a.id,first:a.id,collectPreview:true});return {room,a,b};}
const unit=(p,a=0,h=20,extra={})=>card('FL16',p,{attack:a,health:h,effects:[],...extra});
const place=(p,c,l)=>{p.reserve.push(c);p.formation[l]=c.uid;return c;};
const combat=r=>{r.phase='resolving';resolveCombat(r);};
const cast=(r,p,id,target)=>{r.phase='prep';r.turn=p.id;const c=card(id,p);if(id==='FV13')unrestrictedReturn(c);p.hand.push(c);act(r,p,{type:'play',cardId:c.uid,mode:'direct',targetId:target?.uid},catalog);return c;};
const prep=(p,owner,l,id='FV16')=>{const c=card(id,p);p.prepared.push({card:c,lane:l,targetSide:owner.id});return c;};
const variant=catalog.decks.find(d=>d.id==='forja-oficina-experimental');
assert.equal(variant.cards.reduce((n,c)=>n+c.quantity,0),30);assert.equal(variant.cards.find(c=>c.id==='FEX01').health,2);assert.equal(variant.cards.find(c=>c.id==='FEX06').quantity,2);assert.equal(variant.cards.find(c=>c.id==='FEX07').cost,3);
for(const ownerIndex of [0,1])for(const lane of [0,1,2]){
 const {room,a,b}=setup(),owner=[a,b][ownerIndex],caster=[b,a][ownerIndex],x=place(owner,unit(owner),lane);prep(caster,owner,lane);combat(room);
 assert.equal(x.damage,1);assert.equal(room.pushes[0].movements.length,lane===2?0:1);assert.equal(room.preClash[Math.min(2,lane+1)].cards[ownerIndex]?.uid,x.uid);assert.equal(caster.discard.length,1);
}
{
 const {room,a,b}=setup(),x=place(b,unit(b),0),y=place(b,unit(b),1);prep(a,b,0);combat(room);assert.equal(x.damage,1);assert.equal(y.damage,1);assert.equal(room.pushes[0].blocked,true);assert.equal(room.pushes[0].movements.length,0);assert.equal(room.preClash[0].cards[1].uid,x.uid);
}
{
 const {room,a,b}=setup(),x=place(b,unit(b,0,1),0);prep(a,b,0);combat(room);assert.ok(b.discard.includes(x));assert.equal(room.pushes[0].movements.length,0);assert.equal(room.preClash[1].cards[1],null);
}
{
 const {room,a,b}=setup();prep(a,b,0);combat(room);assert.equal(room.pushes.length,0);assert.equal(a.prepared.length,1,'No reveal: trap stays prepared');
}
{
 const {room,a,b}=setup(),x=place(b,unit(b),0);prep(a,b,0);prep(a,b,1);combat(room);assert.equal(x.damage,1,'Moving into an originally empty lane does not retrigger a prepared spell');assert.equal(a.prepared.length,1);
}
for(const original of ['alive','empty','dead']){
 const {room,a,b}=setup(),taunt=place(a,card('FL16',a,{health:1}),0),killer=place(b,unit(b,1,20,{effects:[{op:'initiative'}]}),0),attacker=place(b,unit(b,4),1);a.taunts[taunt.uid]=[1];
 const target=original==='empty'?null:place(a,unit(a),1);if(original==='dead'){place(b,unit(b,20,20,{effects:[{op:'initiative'}]}),2);target.health=1;a.prepared.push({card:card('RG07',a,{enemyOnly:false,effects:[{op:'damage',amount:1,target:'chosen_allied_creature'}]}),lane:1,targetSide:a.id});}
 combat(room);const hit=room.directedSteps.flatMap(s=>[s,s.pair].filter(Boolean)).find(s=>s.sourceId===attacker.uid);
 assert.equal(hit.targetLane,1);assert.equal(hit.targetId,original==='alive'?target.uid:null);if(target&&original==='alive')assert.equal(target.damage,4);else assert.equal(a.patron.hp,original==='dead'?76:96);
}
{
 const {room,a,b}=setup(),taunt=place(a,card('FL16',a,{health:1}),0),target=place(a,unit(a),1),x=place(b,unit(b,1),0),y=place(b,unit(b,4),1);a.taunts[taunt.uid]=[1];combat(room);assert.equal(target.damage,0,'Simultaneous strikes still hit the living taunter selected for that phase');
}
{
 const {room,a,b}=setup(),taunt=place(a,card('FL16',a,{health:1}),0),target=place(a,unit(a,0,1),1),killer=place(b,unit(b,1,20,{effects:[{op:'initiative'},{op:'adjacent_damage',amount:1}]}),0),attacker=place(b,unit(b,4),1);a.taunts[taunt.uid]=[1];combat(room);
 const hit=room.directedSteps.flatMap(s=>[s,s.pair].filter(Boolean)).find(s=>s.sourceId===attacker.uid);assert.equal(hit.targetId,target.uid);assert.equal(hit.blocked,true);assert.equal(a.patron.hp,100,'A released taunt cannot turn an original defender killed by initiative into a free Patron hit');
}
{
 const {room,a,b}=setup(),taunt=place(a,card('FL16',a,{health:1}),0),target=place(a,unit(a),1),inc=place(b,card('RG02',b),0),attacker=place(b,unit(b,4),1);a.taunts[taunt.uid]=[1];combat(room);assert.equal(target.damage,4,'A taunter killed in Revelation cannot redirect later strikes');
}
for(const spellId of ['FV02','FV14']){
 const {room,a,b}=setup(),x=place(a,unit(a),0);cast(room,a,'FEX07',x);assert.equal(x.health,21);assert.ok(keywordPresentation(x).highlightKeywords.includes('Antimagia'));prep(b,a,0,spellId);combat(room);assert.equal(x.sleep,undefined);assert.equal(x.anchor,undefined);assert.equal(x.runeCoating,true);a.formation[0]=x.uid;prep(b,a,0,spellId);combat(room);assert.equal(x.sleep,undefined);assert.equal(x.anchor,undefined);assert.equal(x.runeCoating,true,'Antimagia bloqueia também a magia do combate seguinte');
}
{
 const {room,a,b}=setup(),x=card('FEX06',a);a.reserve.push(x);cast(room,a,'FEX07',x);const before=b.mana;cast(room,b,'FV13',x);assert.equal(b.mana,before-3);assert.ok(a.reserve.includes(x));assert.equal(x.runeCoating,true);assert.equal(x.persistentReturnUsed,undefined,'Blocked bounce does not spend persistence');cast(room,b,'FV13',x);assert.ok(a.reserve.includes(x));assert.equal(x.health,4);assert.equal(x.persistentReturnUsed,undefined);assert.equal(x.runeCoating,true);
}
{
 const {room,a,b}=setup(),x=card('FEX06',a);a.reserve.push(x);cast(room,a,'FL10',x);x.damage=2;cast(room,b,'FV13',x);assert.equal(x.attack,3);assert.equal(x.health,4);assert.equal(x.damage,0);assert.ok(a.hand.includes(x));room.turn=a.id;act(room,a,{type:'play',cardId:x.uid},catalog);cast(room,b,'FV13',x);assert.equal(x.attack,2);assert.equal(x.health,3,'Bonus retention only happens once per physical card');
}
{
 const {room,a,b}=setup(),x=card('FEX06',a);a.reserve.push(x);cast(room,a,'FL10',x);cast(room,a,'FEX04',x);assert.equal(x.attack,4);assert.equal(x.health,3);cast(room,b,'FV13',x);assert.equal(x.attack,3);assert.equal(x.health,4,'Inversion itself is not a granted bonus');
}
{
 const {room,a}=setup(),x=card('FL21',a);a.reserve.push(x);cast(room,a,'FEX07',x);cast(room,a,'FEX07',x);assert.equal(x.health,3,'Antimagia impede também o segundo bônus aliado');assert.equal(x.runeCoating,true,'Antimagia remains active');
}
{
 const {room,a,b}=setup(),x=place(a,unit(a),0);cast(room,a,'FEX07',x);prep(b,a,0,'FV14').effects.push({op:'damage',amount:2});combat(room);assert.equal(x.damage,0,'Antimagia também bloqueia o dano da mesma magia');assert.equal(x.sleep,undefined);
}
{
 const {room,a,b}=setup(),x=place(a,unit(a),0),eye=place(b,card('FV07',b),0);cast(room,a,'FEX07',x);combat(room);assert.ok(x.anchor,'Creature stasis is not an enemy spell');assert.equal(x.runeCoating,true);
}
{
 const {room,a,b}=setup(),x=place(a,card('FEX06',a),0);grantPermanentStats(x,2,2);prep(a,a,0,'FL10');combat(room);assert.equal(x.permanentGains.attack,3);assert.equal(x.permanentGains.health,3);cast(room,b,'FV13',x);assert.equal(x.attack,5);assert.equal(x.health,6,'Prepared permanent bonuses are retained too');
}
console.log('Aard, Provocar, Revestimento e Persistente: deslocamento, colisão, letal, ambos os lados, Antimagia contínua e bônus permanentes aprovados.');

