import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {setup,card,unit,spell,studies,place,cast,combat,catalog,act,view,jsonView,uid} from './r1-fixtures.mjs';
import {initStudies,seeStudyCard,studyCardCost} from './fluxo-studies.mjs';

test('R1-S01 original UID is counted once; generated UID is excluded; burned original still counts',()=>{
 const {room,a}=setup();initStudies(a);const original=a.deck.at(-1);
 seeStudyCard(a,original);seeStudyCard(a,{...original,uid:uid()});
 seeStudyCard(a,{...original,uid:uid(),studyOriginalId:undefined});
 assert.equal(a.study.seenIds.length,1);
 a.hand=Array.from({length:9},()=>unit(a));
 cast(room,a,spell(a,[{op:'draw',amount:2}]));
 assert.equal(a.study.seenIds.length,2);assert.equal(a.hand.length,9);assert.equal(a.discard.length,3);
});

test('R1-S02 stage thresholds and exact sequential payments 3/6/9; each stage once',()=>{
 const {room,a}=setup();initStudies(a);
 const advance=extra=>act(room,a,{type:'patronPower',powerId:'estudos-avancados',...extra},catalog);
 a.study.seenIds=a.originalDeck.slice(0,9).map(c=>c.studyOriginalId);
 assert.throws(()=>advance({}),/faltam/);assert.equal(a.mana,10);
 for(const [count,cost] of [[10,3],[20,6],[30,9]]){
  a.study.seenIds=a.originalDeck.slice(0,count).map(c=>c.studyOriginalId);a.mana=cost-1;
  assert.throws(()=>advance({centerNeighbor:0}),/insuficiente/);assert.equal(a.mana,cost-1);
  a.mana=cost;advance({centerNeighbor:0});assert.equal(a.mana,0);
 }
 assert.deepEqual(a.study.activated,[10,20,30]);a.mana=10;
 assert.throws(()=>advance({centerNeighbor:0}),/concluídos/);
});

test('R1-S03 permanent discount has floor zero and excludes creatures/equipment',()=>{
 const {a}=setup();studies(a);
 assert.equal(studyCardCost(a,spell(a,[],{cost:0})),0);
 assert.equal(studyCardCost(a,spell(a,[],{cost:1})),0);
 assert.equal(studyCardCost(a,spell(a,[],{cost:4})),3);
 assert.equal(studyCardCost(a,card('FV01',a)),2);
 assert.equal(studyCardCost(a,{uid:uid(),type:'equipment',cost:3}),3);
});

for(const [lane,echo] of [[0,1],[2,1]])test(`R1-E01 prepared edge ${lane+1} echoes only adjacent ${echo+1}`,()=>{
 const {room,a,b}=setup();studies(a);
 const targets=[0,1,2].map(l=>place(b,unit(b),l));
 const magic=card('FL13',a);cast(room,a,magic,{mode:'lane',lane,targetSide:b.id});
 assert.equal(a.mana,10,'cost 1 minus permanent discount');combat(room);
 assert.deepEqual(targets.map(c=>c.health),[0,1,2].map(l=>l===lane||l===echo?39:40));
 assert.equal(a.discard.filter(c=>c.uid===magic.uid).length,1);
});

for(const neighbor of [0,2])test(`R1-E02 prepared centre uses chosen neighbour ${neighbor+1}`,()=>{
 const {room,a,b}=setup();studies(a);
 const targets=[0,1,2].map(l=>place(b,unit(b),l));
 cast(room,a,card('FL13',a),{mode:'lane',lane:1,targetSide:b.id,sharedLane:neighbor});combat(room);
 assert.deepEqual(targets.map(c=>c.health),[0,1,2].map(l=>l===1||l===neighbor?39:40));
});

test('R1-E03 invalid adjacency or target is rejected before paying or moving card',()=>{
 const {room,a,b}=setup();studies(a);const magic=card('FL10',a),target=place(a,unit(a),1);a.hand=[magic];
 assert.throws(()=>act(room,a,{type:'play',cardId:magic.uid,targetId:target.uid,sharedLane:1},catalog),/adjacente/);
 assert.equal(a.mana,10);assert.equal(a.hand[0],magic);assert.equal(target.attack,0);
 assert.throws(()=>act(room,a,{type:'play',cardId:magic.uid,targetId:'invalid'},catalog),/criatura/);
 assert.equal(a.mana,10);assert.equal(a.discard.length,0);
});

test('R1-E04 direct positional buff echoes its local effect; one payment and one echo event',()=>{
 const {room,a}=setup();studies(a);const targets=[0,1,2].map(l=>place(a,unit(a),l));
 cast(room,a,card('FL10',a),{targetId:targets[1].uid,sharedLane:0});
 assert.deepEqual(targets.map(c=>c.attack),[1,1,0]);assert.deepEqual(targets.map(c=>c.health),[41,41,40]);
 assert.equal(a.mana,9);assert.equal(room.events.filter(e=>e.type==='spell_cast').length,1);
 assert.equal(room.events.filter(e=>e.type==='spell'&&e.echo).length,1);
});

test('R1-E05 empty adjacent house does not invalidate a valid primary spell',()=>{
 const {room,a}=setup();studies(a);const target=place(a,unit(a),0);
 cast(room,a,card('FL10',a),{targetId:target.uid});
 assert.equal(target.attack,1);assert.equal(a.mana,9);assert.equal(room.events.filter(e=>e.echo).length,0);
});

test('R1-E06 reserve-only target has no positional echo',()=>{
 const {room,a,b}=setup();studies(a);
 const target=unit(b,{attack:4});b.reserve.push(target);const other=place(b,unit(b),1);
 cast(room,a,card('FV13',a),{targetId:target.uid});
 assert.ok(b.hand.includes(target));assert.equal(other.damage,0);assert.equal(room.events.filter(e=>e.echo).length,0);
});

for(const adjacentAttack of [1,4])test(`R1-E12 Echo preserves Evasao minimum attack condition: adjacent attack ${adjacentAttack}`,()=>{
 const {room,a,b}=setup();studies(a);
 // Anchored formations survive into preparation, where direct Evasao is currently legal.
 const primary=place(b,unit(b,{attack:4,anchor:{lane:0,remaining:1,setAt:0}}),0);
 const adjacent=place(b,unit(b,{attack:adjacentAttack,anchor:{lane:1,remaining:1,setAt:0}}),1);
 const before=a.deck.length;cast(room,a,card('FV13',a),{targetId:primary.uid});
 assert.ok(b.hand.includes(primary));assert.equal(a.mana,8);assert.equal(a.deck.length,before-2);
 if(adjacentAttack<4){
  assert.ok(b.reserve.includes(adjacent),'the adjacent effect must not bypass the original minimum attack condition');
  assert.ok(!b.hand.includes(adjacent));assert.equal(room.events.filter(e=>e.type==='spell'&&e.echo).length,0);
 }else{
  assert.ok(b.hand.includes(adjacent));assert.equal(room.events.filter(e=>e.type==='spell'&&e.echo).length,1);
 }
});

test('R1-E14 Echo rechecks eligibility when the primary return removes an external attack aura',()=>{
 const {room,a,b}=setup();studies(a);
 const primary=place(b,card('RG05',b,{anchor:{lane:0,remaining:1,setAt:0}}),0);
 const adjacent=place(b,card('RG05',b,{anchor:{lane:1,remaining:1,setAt:0}}),1);
 assert.equal(view(room,b).players.find(p=>p.id===b.id).reserve.find(c=>c.uid===primary.uid).effectiveAttack,4);
 assert.equal(view(room,b).players.find(p=>p.id===b.id).reserve.find(c=>c.uid===adjacent.uid).effectiveAttack,4);
 cast(room,a,card('FV13',a),{targetId:primary.uid});
 assert.ok(b.hand.includes(primary));assert.ok(b.reserve.includes(adjacent),'after the first aura leaves, the adjacent creature has attack 3 and is ineligible');
 assert.equal(view(room,b).players.find(p=>p.id===b.id).reserve.find(c=>c.uid===adjacent.uid).effectiveAttack,3);
});

test('R1-E07 Banquete na reserva e compra não duplicam sob Compartilhamento',()=>{
 const {room,a}=setup();studies(a);const x=unit(a),y=unit(a);a.reserve.push(x,y);
 a.discard=[card('FV08',a),card('FV08',a)];cast(room,a,card('FV05',a));
 assert.equal(x.attack,1);assert.equal(y.attack,1);assert.equal(a.mana,3);
 a.mana=10;const before=a.deck.length;cast(room,a,card('FV08',a));
 assert.equal(a.deck.length,before-2);assert.equal(room.events.filter(e=>e.type==='spell'&&e.echo).length,0);
});

test('R1-E08 creature Revelation and Emanation do not become spell echoes',()=>{
 const {room,a,b}=setup();studies(a);const inc=place(a,card('RG02',a),0),target=place(b,unit(b),0),other=place(b,unit(b),1);
 const ally=place(a,unit(a),1),aura=card('FV04',a,{auraLane:1});a.reserve.push(aura);a.emanation=[aura.uid];
 combat(room);assert.equal(target.damage,2,'1 Revelation and 1 attack');assert.equal(other.damage,0);
 assert.equal(room.preClash[1].cards[0].health,41);assert.equal(room.preClash[0].cards[0].health,inc.health);
 assert.equal(room.events.filter(e=>e.type==='spell'&&e.echo).length,0);assert.equal(ally.health,40);
});

test('R1-E09 preparing counts as play once: payment, Reprisal and existing Apprentice not repeated by echo/resolution',()=>{
 const {room,a,b}=setup();studies(a);
 const target=place(b,unit(b),0),other=place(b,unit(b),1),apprentice=card('FV03',a,{apprenticeTargetId:target.uid});a.reserve.push(apprentice);a.emanation.push(apprentice.uid);
 b.patron.etherReprisalRound=room.round;cast(room,a,card('FV14',a),{mode:'lane',lane:0,targetSide:b.id});
 assert.equal(a.mana,9);assert.equal(a.patron.hp,99);act(room,a,{type:'apprenticeTarget',cardId:apprentice.uid,targetId:target.uid},catalog);assert.equal(target.damage,1);
 combat(room);assert.equal(other.damage,0);assert.equal(target.sleep.remaining,1);assert.equal(other.sleep.remaining,1);
 assert.equal(room.events.filter(e=>e.type==='apprentice_damage').length,1);
 assert.equal(room.events.filter(e=>e.type==='ether_reprisal').length,1);
 assert.equal(room.events.filter(e=>e.type==='spell_cast').length,1);
});

test('R1-E10 a Geada with empty prepared trigger does not affect other occupied houses',()=>{
 const {room,a,b}=setup();studies(a);const target=place(b,unit(b,{attack:2}),1);
 const magic=card('FL14',a);cast(room,a,magic,{mode:'lane',lane:0,targetSide:b.id});
 combat(room);assert.equal(target.attack,2);assert.equal(target.health,40);assert.equal(a.prepared.length,1);
});

test('R1-E11 public JSON keeps counter and active effects, hides hand and enemy traps before reveal',()=>{
 const {room,a,b}=setup();studies(a);const x=place(a,unit(a),0),y=place(a,unit(a),1);
 cast(room,a,card('FL10',a),{targetId:x.uid});const trap=card('FV14',a);
 cast(room,a,trap,{mode:'lane',lane:0,targetSide:b.id});
 const visible=jsonView(room,b),self=visible.players.find(p=>p.id===a.id),enemy=visible.players.find(p=>p.id===b.id);
 assert.equal(self.study.seen,20);assert.equal(self.study.discount,true);assert.equal(self.study.sharing,true);
 assert.equal(self.hand,undefined);assert.equal(self.study.originalCards,undefined);assert.equal(self.study.book,undefined);
 assert.ok(self.reserve.filter(c=>[x.uid,y.uid].includes(c.uid)).every(c=>c.attack===1));
 assert.ok(enemy.prepared.every(p=>p.card===null&&p.hidden));
 assert.equal(JSON.stringify(visible).includes(trap.uid),false,'hidden spell UID never serialized');
 const own=jsonView(room,a);assert.equal(own.players.find(p=>p.id===b.id).prepared.filter(p=>p.card).length,2);
});

test('R1-G01 Grimorio: five distinct original models, ten independent UIDs, no study identity',()=>{
 const {room,a}=setup();initStudies(a);a.study.seenIds=a.originalDeck.map(c=>c.studyOriginalId);a.study.activated=[10,20];a.study.discount=true;
 const originals=new Set(a.originalDeck.map(c=>c.modelId));a.deck=[];
 act(room,a,{type:'patronPower',powerId:'estudos-avancados'},catalog);
 const handCopies=a.studyBook.cards,deckCopies=a.deck;
 assert.equal(handCopies.length,5);assert.equal(deckCopies.length,5);
 assert.equal(new Set(handCopies.map(c=>c.modelId)).size,5);
 assert.equal(new Set([...handCopies,...deckCopies].map(c=>c.uid)).size,10);
 assert.ok([...handCopies,...deckCopies].every(c=>!c.studyOriginalId&&originals.has(c.modelId)));
 assert.deepEqual(handCopies.map(c=>c.modelId).sort(),deckCopies.map(c=>c.modelId).sort());
 const first=handCopies[0],twin=deckCopies.find(c=>c.modelId===first.modelId);first.text='fixture-mutated-copy';
 assert.notEqual(twin.text,first.text);assert.equal(a.mana,1);
});

test('R1-G02 full hand burns five unused copies, generated draws excluded and fatigue counter not reset',()=>{
 const {room,a}=setup();initStudies(a);a.study.seenIds=a.originalDeck.map(c=>c.studyOriginalId);a.study.activated=[10,20];a.study.discount=true;
 a.deck=[];a.fatigue=3;a.hand=Array.from({length:9},()=>unit(a));
 act(room,a,{type:'patronPower',powerId:'estudos-avancados'},catalog);
 act(room,a,{type:'grimoireFinish'},catalog);assert.equal(a.hand.length,9);assert.equal(a.discard.length,5);assert.equal(a.deck.length,5);assert.equal(a.fatigue,3);
 a.hand=[];cast(room,a,spell(a,[{op:'draw',amount:5}]));
 assert.equal(a.hand.length,5);assert.equal(a.deck.length,0);assert.equal(a.study.seenIds.length,30);assert.equal(a.fatigue,3);
 a.patron.extraLife=1;cast(room,a,spell(a,[{op:'draw',amount:1}]));assert.equal(a.fatigue,4);assert.equal(a.patron.extraLife,0);assert.equal(a.patron.hp,97);
});

test('R1-G03 invalid free play consumes neither free-use count nor Ether; at most two free plays',()=>{
 const {room,a,b}=setup();initStudies(a);a.study.seenIds=a.originalDeck.map(c=>c.studyOriginalId);a.study.activated=[10,20];a.study.discount=true;
 b.reserve=[unit(b)];act(room,a,{type:'patronPower',powerId:'estudos-avancados'},catalog);
 const bookIds=new Set(a.studyBook.cards.map(c=>c.uid));
 const free=a.studyBook.cards.filter(c=>c.cost<=4),first=free.find(c=>c.type==='creature');assert.ok(first);
 a.reserve=Array.from({length:8},()=>unit(a));
 assert.throws(()=>act(room,a,{type:'play',cardId:first.uid,targetId:b.reserve[0].uid},catalog),/Reserva cheia/);
 assert.equal(a.mana,1);assert.equal(a.studyBook.remaining,2);assert.ok(a.studyBook.cards.includes(first));a.reserve=[];
 const playCopy=c=>{
  const data={type:'play',cardId:c.uid};
  if(c.type==='creature')data.targetId=b.reserve[0].uid;
  else if(c.positionOnly){data.mode='lane';data.lane=0;data.targetSide=c.effects[0].op==='barrier'?a.id:b.id;}
  else if(c.effects[0].op==='return_to_hand'){b.reserve[0].attack=4;data.targetId=b.reserve[0].uid;}
  act(room,a,data,catalog);
 };
 playCopy(first);assert.equal(a.studyBook.remaining,1);assert.equal(a.mana,1);
 const second=a.studyBook.cards.find(c=>c.cost<=4);playCopy(second);
 assert.equal(a.studyBook,undefined);assert.equal(a.mana,1);
 assert.equal(a.hand.filter(c=>bookIds.has(c.uid)).length,3,'exactly the three unused original Grimório copies are in hand');
 for(const remaining of a.hand)assert.equal(studyCardCost(a,remaining),Math.max(0,remaining.cost-(!['creature','equipment'].includes(remaining.type)?1:0)));
 const leftover=a.hand.find(c=>c.cost>0);a.mana=0;
 if(leftover?.type==='creature')assert.throws(()=>act(room,a,{type:'play',cardId:leftover.uid,targetId:b.reserve[0].uid},catalog));
 assert.equal(a.studyBook,undefined);
});

test('R1-G04 printed cost, not discounted cost, determines free eligibility',()=>{
 const {room,a}=setup();studies(a,30);a.study.activated=[10,20];
 // Minimal alternative original-pool fixture exercises printed cost 5 -> discounted 4.
 a.originalDeck=[unit(a,{modelId:'five',type:'direct_spell',cost:5,effects:[{op:'draw',amount:1}]}),...Array.from({length:4},(_,i)=>unit(a,{modelId:'cheap-'+i,cost:4}))];
 act(room,a,{type:'patronPower',powerId:'estudos-avancados'},catalog);
 const expensive=a.studyBook.cards.find(c=>c.modelId==='five');assert.ok(expensive);
 assert.equal(studyCardCost(a,expensive),4);assert.ok(!a.studyBook.instantIds.includes(expensive.uid));
});

test('R1-G05 public floating Grimorio copies are visible; original deck and hand remain private',()=>{
 const {room,a,b}=setup();studies(a,30);a.study.activated=[10,20];
 act(room,a,{type:'patronPower',powerId:'estudos-avancados'},catalog);
 const v=jsonView(room,b).players.find(p=>p.id===a.id);
 assert.equal(v.study.grimoire.cards.length,5);assert.equal(v.study.book,undefined);assert.equal(v.study.originalCards,undefined);assert.equal(v.hand,undefined);
 act(room,a,{type:'grimoireFinish'},catalog);assert.equal(jsonView(room,b).players.find(p=>p.id===a.id).study.grimoire,null);
});

test('R1-C01 Atualizacao supports direct and prepared use; enemy target/side rejected without payment',()=>{
 for(const mode of ['direct','lane']){
  const {room,a,b}=setup();const target=place(a,unit(a),0),magic=card('FL10',a);a.hand=[magic];
  assert.throws(()=>act(room,a,{type:'play',cardId:magic.uid,mode,targetId:'invalid',lane:0,targetSide:b.id},catalog));assert.equal(a.mana,10);
  act(room,a,{type:'play',cardId:magic.uid,mode,targetId:target.uid,lane:0,targetSide:a.id},catalog);
  assert.equal(a.mana,8);if(mode==='lane')combat(room);
  assert.equal(target.attack,1);assert.equal(target.health,41);
 }
 const source=fs.readFileSync(new URL('./app.js',import.meta.url),'utf8');
 assert.ok(source.includes('card.positionOnly'));assert.ok(source.includes('card.directOnly'));
});

test('R1-C02 Runico doubles direct/prepared gains but not inversion, damage or reductions',()=>{
 for(const mode of ['direct','lane']){
  const {room,a,b}=setup();const target=place(a,card('FL21',a),0);
  cast(room,a,card('FL10',a),{mode,targetId:target.uid,lane:0,targetSide:a.id});if(mode==='lane')combat(room);
  assert.equal(target.attack,3);assert.equal(target.health,3);
  cast(room,b,card('FL13',b),{mode:'lane',lane:0,targetSide:a.id});a.formation[0]=target.uid;combat(room);
  assert.equal(target.attack,2);assert.equal(target.health,2);
 }
});

test('R1-C03 Fundamental sets current and max health to 1 without damage or consuming armor',()=>{
 const {room,a,b}=setup();const target=unit(b,{attack:3,health:8,damage:5,extraLife:2,effects:[{op:'first_damage_double'}]});b.reserve=[target];
 cast(room,a,card('FL19',a),{targetId:target.uid});
 assert.equal(target.health,1);assert.equal(target.damage,0);assert.equal(target.extraLife,2);assert.equal(target.firstDamageTaken,undefined);
 assert.equal(target.baseStats.health,40);assert.equal(a.mana,8);
});

test('R1-C04 external positional health aura reapplies after Fundamental under current aura rules',()=>{
 const {room,a,b}=setup();const target=place(b,unit(b,{health:8,damage:3}),0),aura=card('FL06',b);
 b.reserve.push(aura);b.emanation=[aura.uid];cast(room,a,card('FL19',a),{targetId:target.uid});
 assert.equal(target.health,1);combat(room);assert.equal(room.preClash[0].cards[1].health,2);assert.equal(target.health,1);assert.equal(target.damage,0);
});

test('R1-C05 Geada direct selects at most three reserve creatures, excludes combat and Emanation',()=>{
 const {room,a,b}=setup();const reserve=Array.from({length:5},()=>unit(b,{attack:3}));b.reserve=reserve;
 const field=place(b,unit(b,{attack:3}),0),aura=unit(b,{attack:3});b.reserve.push(aura);b.emanation=[aura.uid];
 cast(room,a,card('FL14',a));assert.equal(reserve.filter(c=>c.attack===2&&c.health===39).length,3);
 assert.equal(field.attack,3);assert.equal(aura.attack,3);assert.equal(a.mana,6);
});

test('R1-C06 Geada prepared requires occupied trigger then reduces all enemy combat creatures only',()=>{
 const {room,a,b}=setup();const field=[0,1,2].map(l=>place(b,unit(b,{attack:3}),l)),reserve=unit(b,{attack:3});b.reserve.push(reserve);
 cast(room,a,card('FL14',a),{mode:'lane',lane:1,targetSide:b.id});combat(room);
 assert.ok(field.every(c=>c.attack===2&&c.health===39));assert.equal(reserve.attack,3);assert.equal(reserve.health,40);
});

test('R1-C07 Barreira expires after two combats even with empty protected house',()=>{
 const {room,a}=setup();const magic=card('FV11',a);cast(room,a,magic,{mode:'lane',lane:0,targetSide:a.id});
 combat(room);assert.equal(a.prepared[0].remaining,1);combat(room);
 assert.equal(a.prepared.length,0);assert.equal(a.discard.filter(c=>c.uid===magic.uid).length,1);
});

test('R1-C08 Barreira halves attacks rounded up and never halves spell damage',()=>{
 const {room,a,b}=setup();const target=place(a,unit(a),0),attacker=place(b,unit(b,{attack:5}),0);
 cast(room,a,card('FV11',a),{mode:'lane',lane:0,targetSide:a.id});combat(room);
 assert.equal(target.damage,3);cast(room,b,card('RG07',b),{targetId:target.uid});assert.equal(target.damage,4);
 assert.equal(attacker.damage,0);
});

for(const barrier of [false,true])test(`R1-C09 existing Transpassar respects current health, Extra Life, armor and Barrier=${barrier}`,()=>{
 const {room,a,b}=setup();const attacker=place(a,card('FL05',a,{attack:7,health:30}),0),target=place(b,unit(b,{health:4,damage:2,extraLife:1}),0);b.patron.extraLife=2;
 if(barrier)cast(room,b,card('FV11',b),{mode:'lane',lane:0,targetSide:b.id});combat(room);
 const amount=barrier?4:7,overflow=Math.max(0,amount-3);
 assert.equal(b.patron.extraLife,Math.max(0,2-overflow));assert.equal(b.patron.hp,100-Math.max(0,overflow-2));
 assert.ok(b.discard.includes(target));assert.ok(a.reserve.includes(attacker));
});

test('R1-C10 normal attacker does not turn an original blocker killed in Initiative into a free Patron hit',()=>{
 const {room,a,b}=setup();place(a,card('FL05',a,{attack:5,health:30}),0);place(a,unit(a,{attack:2,effects:[{op:'initiative'}]}),1);
 const blocker=place(b,unit(b,{health:1,effects:[{op:'taunt'}]}),0);b.taunts[blocker.uid]=1;
 combat(room);assert.ok(b.discard.includes(blocker));assert.equal(b.patron.hp,100);
 assert.ok(room.directedSteps.some(s=>s.blocked));
});

for(const type of ['ally','enemy','own-patron','enemy-patron'])test(`R1-C11 Fulgor executes 6 damage on legal target ${type} and pays 5`,()=>{
 const {room,a,b}=setup();let target=type==='ally'?unit(a):unit(b),targetId;
 if(type==='ally'){a.reserve=[target];targetId=target.uid;}
 if(type==='enemy'){b.reserve=[target];targetId=target.uid;}
 if(type==='own-patron'){target=a.patron;targetId='patron:'+a.id;}
 if(type==='enemy-patron'){target=b.patron;targetId='patron:'+b.id;}
 const magic=card('RG04',a);assert.equal(magic.effects[0].uncounterable,true);cast(room,a,magic,{targetId});
 assert.equal(a.mana,5);assert.equal(targetId.startsWith('patron:')?target.hp:target.damage,targetId.startsWith('patron:')?94:6);
});

test('R1-C12 Fulgor cannot be prepared and invalid target does not consume mana/card',()=>{
 const {room,a,b}=setup(),magic=card('RG04',a);a.hand=[magic];
 assert.throws(()=>act(room,a,{type:'play',cardId:magic.uid,mode:'lane',lane:0,targetSide:b.id},catalog),/diretamente/);
 assert.throws(()=>act(room,a,{type:'play',cardId:magic.uid,targetId:'missing'},catalog),/alvo/);
 assert.equal(a.mana,10);assert.equal(a.hand[0],magic);assert.equal(a.discard.length,0);
});

test('R1-C13 real counterspell cannot cancel Fulgor', {skip:'LIMITAÇÃO: não existe contrato/ação de anulação ou counterspell executável na versão atual; flag e dano testados separadamente.'},()=>{});
