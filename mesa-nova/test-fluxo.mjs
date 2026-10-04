import assert from 'node:assert/strict';import fs from 'node:fs';import {act,join,makeRoom,resolveCombat,view} from './game.mjs';import './combat-motion.js';
const catalog=JSON.parse(fs.readFileSync(new URL('./cartas.json',import.meta.url))),deck=catalog.decks.find(d=>d.id==='fluxo-virelion');assert.equal(deck.cards.reduce((n,c)=>n+c.quantity,0),30);assert.equal(deck.cards.length,12);assert.equal(deck.cards.find(c=>c.id==='FV07').effects.length,0);assert.equal(deck.cards.find(c=>c.id==='FV06').effects.length,1);
const card=(id,p,extra={})=>({...structuredClone(deck.cards.find(c=>c.id===id)),uid:crypto.randomUUID(),owner:p.id,damage:0,attackMod:0,...extra});
function setup(){const room=makeRoom('ABC123','A'),a=room.players[0],b=join(room,'B');for(const p of [a,b])Object.assign(p,{patron:{hp:100,maxHp:100},mana:10,manaMax:10,deck:Array.from({length:20},()=>({uid:crypto.randomUUID(),name:'Compra',cost:1}))});Object.assign(room,{first:a.id,turn:a.id,phase:'resolving',collectPreview:true});return {room,a,b};}
const place=(p,c,lane)=>{p.reserve.push(c);p.formation[lane]=c.uid;return c;};
{
 const a={left:0,top:0,width:100,height:140},b={left:0,top:400,width:100,height:140};const m=RunaMotion.contact(a,b);assert.equal(m.dy,129);assert.equal(400-m.dy-(140+m.dy),2,'As bordas não se atravessam');assert.equal(RunaMotion.contact(a,b,false).dy,258);
}
{
 const {room,a,b}=setup();const x=place(a,card('FV06',a,{health:10}),0),y=place(b,card('FV07',b,{health:10}),0);resolveCombat(room);assert.equal(y.attack,1);assert.equal(x.damage,2,'O dano simultâneo usa ataque anterior à maldição');assert.equal(y.damage,1);assert.ok(room.directedSteps[0].pair);assert.equal(room.directedSteps[0].healthUpdates.length,2);a.formation[0]=x.uid;b.formation[0]=y.uid;room.phase='resolving';resolveCombat(room);assert.equal(y.attack,1,'Mesmo alvo não é reduzido novamente');const z=card('FV07',b,{health:10});b.reserve.push(z);a.formation[0]=x.uid;b.formation[0]=z.uid;room.phase='resolving';resolveCombat(room);assert.equal(z.attack,1,'Outro alvo recebe a redução');
}
{
 const {room,a,b}=setup(),c=place(a,card('FV07',a,{health:10}),1);a.prepared.push({card:card('FV02',b),lane:1,targetSide:a.id});b.prepared=a.prepared.splice(0);resolveCombat(room);assert.equal(c.anchor.remaining,1);assert.equal(a.formation[1],c.uid);room.phase='formation';assert.throws(()=>act(room,a,{type:'assign',cardId:c.uid,lane:0},catalog),/ancorada/);assert.throws(()=>act(room,a,{type:'assign',cardId:null,lane:1},catalog),/ancorada/);room.phase='resolving';resolveCombat(room);assert.equal(c.anchor,undefined);assert.equal(a.formation[1],null);
}
{
 const {room,a,b}=setup(),c=place(a,card('FV07',a,{health:10}),0);place(b,card('FV07',b),0);a.prepared.push({card:card('FV11',a),lane:0,targetSide:a.id});resolveCombat(room);assert.equal(c.health,10);assert.equal(c.damage,0,'Vida temporária absorve primeiro o dano');assert.equal(a.prepared[0].remaining,1);a.formation[0]=c.uid;room.phase='resolving';resolveCombat(room);assert.equal(a.prepared.length,0);assert.ok(a.discard.some(c=>c.id==='FV11'));
}
{
 const {room,a}=setup(),c=place(a,card('FV07',a),0);a.prepared.push({card:card('FV12',a),lane:0,targetSide:a.id});resolveCombat(room);assert.equal(c.attack,4,'Benção é permanente');
}
{
 const {room,a}=setup();const x=place(a,card('FV10',a),1),y=place(a,card('FV07',a),0),z=place(a,card('FV07',a),2);resolveCombat(room);assert.equal(room.preClash[0].cards[0].attack,5);assert.equal(room.preClash[2].cards[0].attack,5);assert.equal(y.attack,2);assert.equal(z.attack,2);
}
{
 const {room,a}=setup();room.phase='prep';a.hand.push(card('FV09',a));act(room,a,{type:'play',cardId:a.hand[0].uid},catalog);assert.equal(a.hand.length,2);assert.equal(a.pendingDiscard,1);assert.throws(()=>act(room,a,{type:'endPrep'},catalog),/descartar/);act(room,a,{type:'discard',cardId:a.hand[0].uid},catalog);assert.equal(a.pendingDiscard,0);assert.equal(a.hand.length,1);
}
{
 const {room,a}=setup();room.phase='prep';for(let i=0;i<8;i++)a.reserve.push(card('FV07',a));const heal=card('FV04',a);a.hand.push(heal);act(room,a,{type:'play',cardId:heal.uid,mode:'emanate'},catalog);assert.equal(a.reserve.length,9);assert.throws(()=>act(room,a,{type:'emanate',cardId:heal.uid},catalog),/Reserva cheia/);const c=card('FV07',a);a.hand.push(c);assert.throws(()=>act(room,a,{type:'play',cardId:c.uid},catalog),/Reserva cheia/);
}
{
 const {room,a}=setup();room.phase='prep';const ally=card('FV07',a);a.reserve.push(ally);const spell=card('FV05',a);a.hand.push(spell);act(room,a,{type:'play',cardId:spell.uid},catalog);assert.equal(ally.attack,4);assert.equal(ally.health,4);const apprentice=place(a,card('FV03',a),0);room.phase='resolving';resolveCombat(room);assert.equal(room.preClash[0].cards[0].attack,2);assert.equal(apprentice.attack,1);
}
console.log('Fluxo: 30 cartas, maldição por alvo, simultaneidade, contato, âncora, barreira, buffs, descarte e reserva aprovados.');
