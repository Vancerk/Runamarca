import assert from 'node:assert/strict';
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import {makeRoom,join,act,resolveCombat,view} from './game.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('./cartas.json',import.meta.url))),models=[...catalog.decks.flatMap(d=>d.cards),...catalog.additionalCards];
const card=(id,p,extra={})=>({...structuredClone(models.find(c=>c.id===id)),uid:randomUUID(),modelId:id,owner:p.id,damage:0,attackMod:0,...extra});
function setup(){const room=makeRoom('VIS123','A'),a=room.players[0],b=join(room,'B');for(const p of [a,b])Object.assign(p,{deckData:catalog.decks.find(d=>d.id==='fluxo-virelion'),mana:10,manaMax:10,patron:{hp:100,maxHp:100},deck:Array.from({length:20},()=>card('FL21',p))});Object.assign(room,{first:a.id,turn:a.id,phase:'prep'});return {room,a,b};}
{
 const {room,a,b}=setup(),trap=card('FL13',a);a.hand.push(trap);act(room,a,{type:'play',cardId:trap.uid,mode:'lane',lane:1,targetSide:b.id},catalog);
 const own=view(room,a).players.find(p=>p.id===b.id).prepared[0],enemy=view(room,b).players.find(p=>p.id===b.id).prepared[0];
 assert.equal(own.card.uid,trap.uid);assert.equal(own.hidden,false);assert.equal(enemy.card,null);assert.equal(enemy.hidden,true);
}
{
 const {room,a,b}=setup(),eye=card('FV07',a,{attack:0,health:20}),enemy=card('FL21',b,{attack:0,health:20});a.reserve.push(eye);b.reserve.push(enemy);a.formation[1]=eye.uid;b.formation[1]=enemy.uid;
 room.phase='resolving';resolveCombat(room);
 assert.ok(eye.anchor);assert.ok(enemy.anchor);
 assert.equal(view(room,b).players.find(p=>p.id===a.id).formation[1],eye.uid,'Olho continua visível ao oponente depois da Revelação');
 assert.equal(view(room,a).players.find(p=>p.id===b.id).formation[1],enemy.uid);
 const secret=card('FL21',a);a.reserve.push(secret);a.formation[2]=secret.uid;room.phase='formation';assert.equal(view(room,b).players.find(p=>p.id===a.id).formation[2],null,'Escolha nova continua oculta');
 room.phase='resolving';resolveCombat(room);assert.equal(eye.anchor,undefined);assert.equal(enemy.anchor,undefined);
}
console.log('Visibilidade pública: armadilha visível só ao conjurador, Olho travado visível nas duas perspectivas e novas formações preservam o sigilo.');
