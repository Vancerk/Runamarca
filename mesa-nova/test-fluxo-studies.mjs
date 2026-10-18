import assert from 'node:assert/strict';import fs from 'node:fs';import {randomUUID} from 'node:crypto';
import {act,makeRoom,join,view,resolveCombat} from './game.mjs';import {initStudies,seeStudyCard,studyCardCost,studyPrepared} from './fluxo-studies.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('cartas.json',import.meta.url))),deck=catalog.decks.find(d=>d.affinity==='fluxo');
function setup(){const room=makeRoom('STUDY1','Marika'),a=room.players[0],b=join(room,'Lyrik');Object.assign(room,{phase:'prep',turn:a.id,first:a.id,collectPreview:true,round:4});for(const p of [a,b])Object.assign(p,{deckData:deck,mana:10,manaMax:10,preparationSerial:1,patron:{...structuredClone(deck.patron),hp:100,maxHp:100,affinity:p===a?'fluxo':'forja'},deck:[]});a.deck=deck.cards.flatMap(c=>Array.from({length:c.quantity},()=>({...structuredClone(c),uid:randomUUID(),owner:a.id,modelId:c.id,baseStats:{attack:c.attack,health:c.health,cost:c.cost},damage:0,attackMod:0})));initStudies(a);return {room,a,b};}
const vanilla=(p)=>({uid:randomUUID(),owner:p.id,modelId:'plain',name:'Alvo',type:'creature',cost:1,attack:0,health:10,damage:0,attackMod:0,effects:[],baseStats:{attack:0,health:10,cost:1}});
const spell=(p,effects,cost=1)=>({uid:randomUUID(),owner:p.id,id:randomUUID(),name:'Magia',type:'spell',cost,effects});
const progress=(p,n)=>p.study.seenIds=p.originalDeck.slice(0,n).map(c=>c.studyOriginalId);
const advance=(room,p,extra={})=>act(room,p,{type:'patronPower',powerId:'estudos-avancados',...extra},catalog);
{
 const room=makeRoom('OPEN01','A'),a=room.players[0],b=join(room,'B');act(room,a,{type:'deck',deckId:deck.id},catalog);act(room,b,{type:'deck',deckId:catalog.decks[0].id},catalog);assert.equal(a.study.seenIds.length,5);assert.equal(a.originalDeck.length,30);
 act(room,a,{type:'mulligan',cardIds:a.hand.slice(0,2).map(c=>c.uid)},catalog);assert.equal(a.study.seenIds.length,5);act(room,a,{type:'confirmMulligan'},catalog);assert.deepEqual(new Set(a.study.seenIds),new Set(a.hand.map(c=>c.studyOriginalId)));act(room,b,{type:'confirmMulligan'},catalog);assert.ok(a.study.seenIds.length===5||a.study.seenIds.length===6);
}
{
 const {room,a,b}=setup();const count=a.deck.length;act(room,a,{type:'patronPower',powerId:'sumario-ecoante'},catalog);assert.equal(a.mana,9);assert.equal(a.hand.length,1);assert.equal(a.deck.length,count-1);assert.equal(a.study.seenIds.length,1);assert.throws(()=>act(room,a,{type:'patronPower',powerId:'sumario-ecoante'},catalog),/utilizado/);
 const first=a.hand[0];seeStudyCard(a,first);assert.equal(a.study.seenIds.length,1);seeStudyCard(a,{uid:randomUUID(),modelId:first.modelId});assert.equal(a.study.seenIds.length,1);
 room.round++;a.hand=Array(9).fill(null).map(()=>spell(a,[]));act(room,a,{type:'patronPower',powerId:'sumario-ecoante'},catalog);assert.equal(a.study.seenIds.length,2);assert.equal(a.discard.length,1);
 assert.equal(view(room,b).players.find(p=>p.id===a.id).study.originalCards,undefined);
}
{
 const {room,a}=setup();progress(a,9);assert.throws(()=>advance(room,a),/faltam/);assert.equal(a.mana,10);progress(a,10);a.mana=2;assert.throws(()=>advance(room,a),/insuficiente/);a.mana=3;advance(room,a);assert.equal(a.mana,0);assert.ok(a.study.discount);assert.equal(studyCardCost(a,spell(a,[],1)),0);assert.equal(studyCardCost(a,vanilla(a)),1);assert.throws(()=>advance(room,a),/faltam/);
 const direct=spell(a,[{op:'draw',amount:1}],1);a.hand=[direct];act(room,a,{type:'play',cardId:direct.uid},catalog);assert.equal(a.mana,0);
 const prepared=spell(a,[{op:'damage',amount:1}],1);a.hand=[prepared];act(room,a,{type:'play',cardId:prepared.uid,mode:'lane',lane:0,targetSide:room.players[1].id},catalog);assert.equal(a.prepared[0].paid,0);
}
{
 const {room,a,b}=setup();progress(a,20);advance(room,a);a.mana=10;const old=spell(a,[{op:'damage',amount:1}],1);a.hand=[old];act(room,a,{type:'play',cardId:old.uid,mode:'lane',lane:1,targetSide:b.id},catalog);assert.throws(()=>advance(room,a,{centerNeighbor:1}),/adjacente/);assert.equal(a.mana,10);advance(room,a,{centerNeighbor:0});assert.equal(a.mana,4);assert.equal(studyPrepared(a).length,2);
 const targets=[vanilla(b),vanilla(b),vanilla(b)];b.reserve=targets;b.formation=targets.map(c=>c.uid);room.phase='resolving';resolveCombat(room);assert.equal(targets[0].damage,1);assert.equal(targets[1].damage,1);assert.equal(targets[2].damage,0);assert.equal(a.discard.filter(c=>c.uid===old.uid).length,1);assert.equal(a.prepared.length,0);
}
{
 const {room,a,b}=setup();progress(a,20);advance(room,a);a.mana=10;advance(room,a,{centerNeighbor:2});a.mana=10;const targets=[vanilla(b),vanilla(b),vanilla(b)];b.reserve=targets;b.formation=targets.map(c=>c.uid);
 const direct=spell(a,[{op:'damage',target:'chosen_enemy_creature',amount:2}],2);a.hand=[direct];act(room,a,{type:'play',cardId:direct.uid,targetId:targets[1].uid,sharedLane:0},catalog);assert.deepEqual(targets.map(c=>c.damage),[2,2,0]);assert.equal(a.mana,9);
 const reserve=vanilla(b);b.reserve.push(reserve);const noShare=spell(a,[{op:'damage',target:'chosen_enemy_creature',amount:1}],1);a.hand=[noShare];act(room,a,{type:'play',cardId:noShare.uid,targetId:reserve.uid},catalog);assert.equal(reserve.damage,1);assert.deepEqual(targets.map(c=>c.damage),[2,2,0]);
 const area=spell(a,[{op:'area_damage',amount:1}],1);a.prepared=[{card:area,lane:0,targetSide:b.id}];assert.equal(studyPrepared(a).length,1,'an area spell already covers adjacent houses, and must not double globally');
}
{
 const {room,a,b}=setup();const allies=[vanilla(a),vanilla(a)];a.reserve=allies;a.formation=[allies[0].uid,allies[1].uid,null];const buff=spell(a,[{op:'stat_buff',target:'chosen_allied_creature',attack:1,health:1}],1);a.hand=[buff];act(room,a,{type:'play',cardId:buff.uid,targetId:allies[0].uid},catalog);assert.equal(allies[1].health,10);progress(a,20);a.mana=10;advance(room,a);a.mana=10;advance(room,a,{centerNeighbor:2});assert.equal(allies[1].health,11,'active earlier positional spell spreads when knowledge is activated');assert.equal(allies[1].attack,1);assert.equal(b.reserve.length,0);
}
{
 const {room,a,b}=setup();progress(a,30);advance(room,a);a.mana=10;advance(room,a,{centerNeighbor:2});a.mana=10;
 const originals=[vanilla(a),spell(a,[{op:'damage',target:'chosen_enemy_creature',amount:1}],4),spell(a,[{op:'draw',amount:1}],5),vanilla(a),vanilla(a)];a.originalDeck=originals.map(c=>({...c,studyOriginalId:c.uid}));const ids=originals.map(c=>c.uid),enemy=vanilla(b);b.reserve=[enemy];
 assert.throws(()=>advance(room,a,{originalIds:ids,instantIndices:[2]}),/custo/);assert.equal(a.mana,10);assert.throws(()=>advance(room,a,{originalIds:[ids[0],ids[0]]}),/até 5/);assert.throws(()=>advance(room,a,{originalIds:['inexistente']}),/original/);
 advance(room,a,{originalIds:ids,instantIndices:[0,1]});assert.equal(a.mana,1);assert.equal(a.studyBook.cards.length,5);const [creature,magic]=a.studyBook.cards;assert.ok(a.studyBook.cards.every(c=>!c.studyOriginalId));assert.equal(view(room,b).players.find(p=>p.id===a.id).study.book,undefined);
 act(room,a,{type:'play',cardId:creature.uid},catalog);assert.equal(a.reserve[0].uid,creature.uid);assert.equal(a.mana,1);assert.throws(()=>act(room,a,{type:'play',cardId:magic.uid,targetId:'invalid'},catalog));assert.equal(a.studyBook.instantIds.length,1);assert.equal(a.mana,1);act(room,a,{type:'play',cardId:magic.uid,targetId:enemy.uid},catalog);assert.equal(enemy.damage,1);assert.equal(a.mana,1);assert.equal(a.studyBook,undefined);assert.equal(a.hand.length,3);assert.equal(a.study.seenIds.length,30);assert.throws(()=>advance(room,a),/concluídos/);
}
{
 const {room,a}=setup();progress(a,30);a.study.activated=[10,20];a.study.discount=true;const card=a.originalDeck.find(c=>c.cost<=4);advance(room,a,{originalIds:[card.studyOriginalId],instantIndices:[0]});assert.equal(a.studyBook.cards.length,1);act(room,a,{type:'endPrep'},catalog);assert.equal(a.studyBook,undefined);assert.equal(a.hand.length,1,'closing preparation safely stores unused copies');
}
{
 const {room,a}=setup(),allies=[vanilla(a),vanilla(a)];a.reserve=allies;a.formation=[allies[0].uid,allies[1].uid,null];
 const play=effects=>{const c=spell(a,effects,0);a.hand=[c];act(room,a,{type:'play',cardId:c.uid,targetId:allies[0].uid},catalog);};
 play([{op:'stat_buff',attack:2,health:2,target:'chosen_allied_creature'}]);play([{op:'silence',target:'any_creature'}]);assert.equal(a.study.positionEffects.length,0);
 play([{op:'stat_buff',attack:1,health:1,target:'chosen_allied_creature'}]);progress(a,20);advance(room,a);a.mana=10;advance(room,a,{centerNeighbor:2});assert.equal(allies[1].health,11,'only a new enchantment after Silence spreads');assert.equal(allies[1].attack,1);
}
{
 const {room,a,b}=setup(),targets=[vanilla(b),vanilla(b)];targets[1].health=1;b.reserve=targets;b.formation=[targets[0].uid,targets[1].uid,null];
 const c=spell(a,[{op:'attack_modifier',amount:-1,healthAmount:-1,permanent:true,target:'chosen_enemy_creature'}],0);a.hand=[c];act(room,a,{type:'play',cardId:c.uid,targetId:targets[0].uid},catalog);progress(a,20);advance(room,a);a.mana=10;advance(room,a,{centerNeighbor:2});assert.ok(b.discard.includes(targets[1]));assert.equal(b.formation[1],null,'copied existing health penalty resolves death immediately');
}
{
 const {room,a,b}=setup();progress(a,30);a.study.activated=[10,20];a.study.discount=true;a.mana=10;
 const originals=Array.from({length:5},()=>vanilla(a));a.originalDeck=originals.map(c=>({...c,studyOriginalId:c.uid}));const ids=originals.map(c=>c.uid);
 act(room,a,{type:'grimoirePreview',originalIds:ids.slice(0,2)},catalog);const publicStudy=view(room,b).players.find(p=>p.id===a.id).study;
 assert.equal(publicStudy.grimoire.cards.length,2);assert.equal(publicStudy.originalCards,undefined);assert.equal(publicStudy.book,undefined);assert.equal(a.mana,10);
 assert.throws(()=>act(room,a,{type:'grimoirePreview',originalIds:['invalid']},catalog),/original/);
 advance(room,a,{originalIds:ids,chooseInstant:true});assert.equal(a.studyBook.instantIds.length,5);assert.equal(a.studyBook.remaining,2);assert.equal(a.studyPreview,undefined);
 const cards=[...a.studyBook.cards];act(room,a,{type:'play',cardId:cards[4].uid},catalog);assert.equal(a.studyBook.remaining,1);act(room,a,{type:'play',cardId:cards[2].uid},catalog);
 assert.equal(a.studyBook,undefined);assert.equal(a.hand.length,3);assert.equal(a.mana,1);a.mana=0;assert.throws(()=>act(room,a,{type:'play',cardId:cards[0].uid},catalog),/Mana/);
 assert.equal(room.events.filter(e=>e.type==='creature'&&e.fromGrimoire).length,2);assert.equal(view(room,b).players.find(p=>p.id===a.id).study.grimoire,null);
}
console.log('Fluxo: estudos, compartilhamento, escolha pública do Grimório, 5 cópias, escolha posterior de 2 usos gratuitos, alvos, sigilo do deck e encerramento aprovados.');
