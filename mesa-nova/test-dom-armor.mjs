import assert from 'node:assert/strict';
import fs from 'node:fs';
import {act,makeRoom,join,resolveCombat} from './game.mjs';
import {domPowers,punishSpellPayment} from './dom-powers.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('cartas.json',import.meta.url)));
function setup(){const room=makeRoom('DOMTEST','A'),a=room.players[0],b=join(room,'B');Object.assign(room,{phase:'prep',turn:a.id,first:a.id,round:4,collectPreview:true});for(const p of [a,b])Object.assign(p,{mana:10,manaMax:10,patron:{hp:20,maxHp:20,affinity:'ruptura',powers:domPowers(),usedPowers:{}},deck:[]});return {room,a,b};}
{
 const {room,a,b}=setup();act(room,a,{type:'patronPower',powerId:'convocar-carrasco'},catalog);assert.equal(a.mana,8);assert.equal(a.reserve[0].attack,1);assert.equal(a.reserve[0].health,1);assert.throws(()=>act(room,a,{type:'patronPower',powerId:'convocar-carrasco'},catalog),/utilizado/);
 act(room,a,{type:'patronPower',powerId:'represalia-de-eter'},catalog);assert.equal(a.mana,4);assert.equal(a.patron.etherReprisalRound,4);
 const log=[];const helpers={emit:(r,t,e)=>log.push({t,...e}),pushLog:()=>{}};a.patron.extraLife=2;punishSpellPayment(room,a,3,helpers);assert.equal(a.patron.extraLife,0);assert.equal(a.patron.hp,19);punishSpellPayment(room,b,2,helpers);assert.equal(b.patron.hp,18);punishSpellPayment(room,b,0,helpers);assert.equal(log.length,2);room.round++;punishSpellPayment(room,b,4,helpers);assert.equal(b.patron.hp,18);assert.throws(()=>act(room,a,{type:'patronPower',powerId:'represalia-de-eter'},catalog),/utilizado/);
}
{
 const {room,a,b}=setup();a.patron.powers=domPowers('damage');assert.throws(()=>act(room,a,{type:'patronPower',powerId:'golpe-do-maioral',targetId:'missing'},catalog),/alvo/);assert.equal(a.mana,10);act(room,a,{type:'patronPower',powerId:'golpe-do-maioral',targetId:'patron:'+b.id},catalog);assert.equal(b.patron.hp,19);assert.equal(a.mana,8);
}
{
 const {room,a,b}=setup();const d=catalog.decks.find(d=>d.id==='forja-couraca-lyrik');assert.equal(d.cards.reduce((n,c)=>n+c.quantity,0),30);const put=id=>{const c={...structuredClone(d.cards.find(c=>c.id===id)),uid:id,owner:a.id,modelId:id,damage:0,attackMod:0};a.hand.push(c);return c;};put('FA01');act(room,a,{type:'play',cardId:'FA01'},catalog);assert.equal(a.patron.extraLife,2);put('FA02');act(room,a,{type:'play',cardId:'FA02'},catalog);assert.equal(a.patron.equipment.attack,1);assert.equal(a.patron.equipment.durability,3);a.mana=10;put('FA06');a.deck=[{uid:'draw1',type:'creature'},{uid:'draw2',type:'creature'}];act(room,a,{type:'play',cardId:'FA06',mode:'direct'},catalog);assert.equal(a.patron.extraLife,4);assert.equal(a.mana,6);assert.equal(a.hand.length,2);a.patron.extraLife=0;a.deck=[{uid:'draw3',type:'creature'},{uid:'draw4',type:'creature'}];put('FA06');act(room,a,{type:'play',cardId:'FA06',mode:'direct'},catalog);assert.equal(a.mana,2);assert.equal(a.patron.extraLife,2);
}
console.log('Dom e Couraça: custos, limites, alvos, armadura, compras e expiração aprovados.');
{
 const {room,a,b}=setup();const d=catalog.decks.find(d=>d.id==='forja-couraca-lyrik');const put=id=>{const c={...structuredClone(d.cards.find(c=>c.id===id)),uid:id,owner:a.id,modelId:id,damage:0,attackMod:0};a.hand.push(c);a.mana=10;return c;};
 const target={uid:'enemy',owner:b.id,name:'Alvo',type:'creature',attack:0,health:3,damage:0,effects:[]};b.reserve.push(target);a.patron.extraLife=3;put('FA04');assert.throws(()=>act(room,a,{type:'play',cardId:'FA04',targetId:'patron:'+b.id},catalog),/alvo/);assert.equal(a.mana,10);act(room,a,{type:'play',cardId:'FA04',targetId:target.uid},catalog);assert.equal(b.reserve.length,0);assert.equal(a.patron.extraLife,3);
 a.patron.equipment={attack:1,durability:3,maxDurability:3};put('FA03');act(room,a,{type:'play',cardId:'FA03',targetId:'patron'},catalog);assert.deepEqual(a.patron.equipment,{attack:2,durability:4,maxDurability:4});
 const guard=put('FA05');act(room,a,{type:'play',cardId:'FA05'},catalog);a.formation=[guard.uid,null,null];room.phase='resolving';room.laneBonuses={};resolveCombat(room);assert.equal(a.patron.extraLife,4);
}
{
 const {room,a,b}=setup();b.patron.etherReprisalRound=room.round;a.patron.extraLife=2;a.hand=[{uid:'recycle',id:'FA06',modelId:'FA06',owner:a.id,name:'Reciclagem',type:'spell',cost:4,effects:[{op:'armor_draw'}]}];a.deck=[{uid:'d1',type:'creature'},{uid:'d2',type:'creature'}];act(room,a,{type:'play',cardId:'recycle',mode:'direct'},catalog);assert.equal(a.patron.extraLife,2);assert.equal(a.patron.hp,18);assert.equal(a.hand.length,2);
}
{
 const {room,a,b}=setup();b.patron.etherReprisalRound=room.round;a.study={discount:true,seenIds:[],activated:[10],positionEffects:[]};a.hand=[{uid:'discounted',owner:a.id,name:'Compra',type:'spell',cost:3,directOnly:true,effects:[{op:'draw',amount:1}]}];a.deck=[{uid:'d1',type:'creature'}];act(room,a,{type:'play',cardId:'discounted',mode:'direct'},catalog);assert.equal(a.mana,8);assert.equal(a.patron.hp,18);assert.equal(room.events.filter(e=>e.type==='ether_reprisal').length,1);
}
{
 const {room,a,b}=setup();b.patron.etherReprisalRound=room.round;a.hand=[{uid:'trap',owner:a.id,name:'Preparada',type:'spell',cost:2,effects:[{op:'damage',amount:1}]}];act(room,a,{type:'play',cardId:'trap',mode:'lane',lane:0,targetSide:b.id},catalog);assert.equal(a.patron.hp,18);assert.equal(a.prepared.length,1);assert.equal(room.events.filter(e=>e.type==='ether_reprisal').length,1);
 const target={uid:'reveal-target',owner:b.id,type:'creature',name:'Alvo',attack:1,health:3,damage:0,attackMod:0,effects:[]};b.reserve.push(target);b.formation=[target.uid,null,null];room.phase='resolving';room.laneBonuses={};resolveCombat(room);assert.equal(room.events.filter(e=>e.type==='ether_reprisal').length,1);
}
{
 const {room,a,b}=setup();b.patron.etherReprisalRound=room.round;const card={uid:'free',owner:a.id,name:'Magia gratuita',type:'spell',cost:3,directOnly:true,effects:[{op:'draw',amount:1}]};a.studyBook={cards:[card],instantIds:[card.uid],remaining:1};a.deck=[{uid:'draw-free',type:'creature'}];act(room,a,{type:'play',cardId:card.uid,mode:'direct'},catalog);assert.equal(a.mana,10);assert.equal(a.patron.hp,20);assert.equal(room.events.filter(e=>e.type==='ether_reprisal').length,0);
}
