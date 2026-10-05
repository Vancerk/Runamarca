import assert from 'node:assert/strict';
import fs from 'node:fs';
import {act,join,makeRoom,resolveCombat,view} from './game.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('./cartas.json',import.meta.url)));
const deck=catalog.decks.find(d=>d.id==='forja-oficina-lyrik');
assert.equal(deck.cards.reduce((n,c)=>n+c.quantity,0),30);
assert.equal(deck.cards.find(c=>c.id==='FL03').quantity,4);assert.equal(deck.cards.find(c=>c.id==='FL03').cost,2);assert.equal(deck.cards.find(c=>c.id==='FL01').cost,3);assert.equal(deck.cards.find(c=>c.id==='FL01').health,2);assert.equal(deck.cards.find(c=>c.id==='FL01').quantity,2);assert.equal(deck.cards.find(c=>c.id==='FL05').cost,5);assert.equal(deck.cards.find(c=>c.id==='FL05').health,2);assert.equal(deck.cards.find(c=>c.id==='FL04').cost,2);assert.equal(deck.cards.find(c=>c.id==='FL07').cost,4);
assert.equal(deck.cards.find(c=>c.id==='FL04').rarity,'elite');assert.equal(deck.cards.find(c=>c.id==='FL04').quantity,2);
assert.equal(deck.cards.find(c=>c.id==='FL11').speech,'Protocolo: Exterminar!');
assert.equal(catalog.decks.find(d=>d.id==='forja-juramento').cards.length,12);
for(const c of deck.cards)assert.ok(fs.existsSync(new URL(c.image,import.meta.url)));
const card=(id,p,overrides={})=>({...structuredClone(deck.cards.find(c=>c.id===id)),uid:crypto.randomUUID(),modelId:id,owner:p.id,damage:0,attackMod:0,...overrides});
function setup(){const room=makeRoom('ABC123','A');const a=room.players[0],b=join(room,'B');for(const p of [a,b])Object.assign(p,{patron:{hp:100,maxHp:100},mana:10,manaMax:10,deck:Array.from({length:10},()=>({uid:crypto.randomUUID()})),taunts:{}});Object.assign(room,{first:a.id,turn:a.id,phase:'resolving',collectPreview:true});return {room,a,b};}
function place(p,c,lane){p.reserve.push(c);p.formation[lane]=c.uid;return c;}
{
 const {room,a,b}=setup(),fast=place(a,card('FL01',a),0),enemy=place(b,card('FL05',b,{health:2}),0);resolveCombat(room);
 assert.equal(fast.damage,0,'Iniciativa impede revide do inimigo morto');assert.ok(b.discard.includes(enemy));assert.equal(room.directedSteps.length,1);
}
{
 const {room,a,b}=setup(),x=place(a,card('FL01',a,{health:2}),0),y=place(b,card('FL01',b,{health:2}),0);resolveCombat(room);assert.ok(a.discard.includes(x)&&b.discard.includes(y),'Duas iniciativas trocam dano simultâneo');
}
{
 const {room,a,b}=setup();place(a,card('FL05',a),0);place(b,card('FL03',b),0);resolveCombat(room);assert.equal(b.patron.hp,96,'Transpassar: 5 contra 1 vida transmite 4');
}
{
 const {room,a,b}=setup(),taunter=place(b,card('FL09',b),1),redirected=place(a,card('FL05',a),0);b.taunts[taunter.uid]=0;resolveCombat(room);assert.equal(taunter.damage,5);assert.equal(b.patron.hp,100,'Provocar impede golpe na casa vazia');assert.equal(room.directedSteps.find(s=>s.sourceId===redirected.uid).targetId,taunter.uid);assert.equal(room.directedSteps.filter(s=>s.sourceId===taunter.uid).length,1);
}
{
 const {room,a,b}=setup(),veronica=place(a,card('FL11',a),0);place(b,card('FL03',b),0);resolveCombat(room);assert.equal(veronica.attack,6);assert.equal(veronica.health,8);
}
{
 const {room,a,b}=setup(),growth=place(a,card('FL04',a),0),reserve=card('FL04',a);a.reserve.push(reserve);place(b,card('FL03',b,{attack:0}),0);resolveCombat(room);assert.equal(growth.attack,1);assert.equal(growth.health,2);assert.equal(reserve.attack,0,'Reserva não recebe bônus por sobreviver sem participar');
}
{
 const {room,a,b}=setup(),growth=place(a,card('FL04',a),0);place(b,card('FL03',b),0);resolveCombat(room);assert.ok(a.discard.includes(growth),'Sintético 0/1 morre antes de crescer contra 1 de ataque');assert.equal(growth.attack,0,'Não recebe crescimento quando não sobrevive');
}
{
 const {room,a,b}=setup();place(a,card('FL12',a),1);const target=place(b,card('FL09',b),1),neighbor=place(b,card('FL09',b),0),emana=card('FL09',b);b.reserve.push(emana);b.emanation.push(emana.uid);resolveCombat(room);assert.equal(target.damage,6);assert.equal(neighbor.damage,1);assert.equal(emana.damage,0);
}
{
 const {room,a,b}=setup();place(a,card('FL08',a),0);const target=place(b,card('FL09',b),0);resolveCombat(room);assert.equal(room.preClash[0].cards[1].attack,3,'Monge reduz 2 antes do ataque');assert.equal(target.attackMod,0,'Redução acaba na rodada');
}
{
 const {room,a}=setup();room.phase='prep';const target=card('FL02',a,{damage:1}),elf=card('FL07',a);a.reserve.push(target,elf);a.emanation.push(elf.uid);const spell=card('FL10',a);a.hand.push(spell);act(room,a,{type:'play',cardId:spell.uid,mode:'direct',targetId:target.uid},catalog);assert.equal(target.attack,3);assert.equal(target.health,5);assert.equal(view(room,a).players[0].reserve.find(c=>c.uid===target.uid).effectiveAttack,4);act(room,a,{type:'endPrep',healTargetIds:[target.uid]},catalog);assert.equal(target.damage,0);assert.equal(a.mana,4,'Buff 5 e cura 1');
}
{
 const {room,a,b}=setup();room.phase='formation';const taunter=place(a,card('FL09',a),0);assert.throws(()=>act(room,a,{type:'ready'},catalog),/Provocar/);assert.throws(()=>act(room,a,{type:'taunt',cardId:taunter.uid,lane:0},catalog),/adjacente/);assert.throws(()=>act(room,a,{type:'taunt',cardId:taunter.uid,lane:2},catalog),/adjacente/);act(room,a,{type:'taunt',cardId:taunter.uid,lane:1},catalog);assert.equal(view(room,b).players[0].taunts[taunter.uid],undefined,'Alvo secreto até revelar');assert.equal(view(room,a).players[0].taunts[taunter.uid],1);
}
{
 const {room,a,b}=setup();room.phase='lobby';act(room,a,{type:'deck',deckId:deck.id},catalog);act(room,b,{type:'deck',deckId:'forja-juramento'},catalog);assert.equal(a.deck.length+a.hand.length,30);const imported=a.deck.concat(a.hand).find(c=>c.modelId==='FL05');assert.equal(imported.artZoom,144);assert.equal(imported.artX,41);assert.equal(imported.artY,39);
}
console.log('Oficina de Lyrik: composição, artes, Iniciativa, Transpassar, Provocar, crescimento, área adjacente, cura e sigilo aprovados.');

{
 const {room,a,b}=setup();room.phase='prep';const target=place(b,card('FL09',b),0),ice=card('FL13',a);a.hand.push(ice);assert.throws(()=>act(room,a,{type:'play',cardId:ice.uid,mode:'direct',targetId:target.uid},catalog),/posição/);assert.throws(()=>act(room,a,{type:'play',cardId:ice.uid,mode:'lane',lane:0,targetSide:a.id},catalog),/inimiga/);act(room,a,{type:'play',cardId:ice.uid,mode:'lane',lane:0,targetSide:b.id},catalog);assert.equal(view(room,b).players[1].prepared[0].card,null);room.phase='resolving';resolveCombat(room);assert.equal(target.attack,4);assert.equal(target.attackMod,0);room.phase='resolving';resolveCombat(room);assert.equal(target.attack,4,'Toque permanente após dois combates');
}
{
 const {room,a,b}=setup();room.phase='prep';const target=card('FL09',b),zero=card('FL04',b),emana=card('FL09',b);b.reserve.push(target,zero,emana);b.emanation=[emana.uid];a.hand.push(card('FL14',a));act(room,a,{type:'play',cardId:a.hand[0].uid,mode:'direct'},catalog);assert.equal(target.attack,4);assert.equal(zero.attack,0);assert.equal(emana.attack,5);const e=room.events.find(e=>e.type==='spell');assert.equal(e.healthUpdates.find(u=>u.uid===target.uid).attack,4);
}
{
 const {room,a,b}=setup();room.phase='prep';const placed=place(b,card('FL09',b),0),reserve=card('FL09',b),emana=card('FL09',b);b.reserve.push(reserve,emana);b.emanation=[emana.uid];a.hand.push(card('FL14',a));act(room,a,{type:'play',cardId:a.hand[0].uid,mode:'lane',lane:0,targetSide:b.id},catalog);room.phase='resolving';resolveCombat(room);assert.equal(placed.attack,4);assert.equal(reserve.attack,5);assert.equal(emana.attack,5);assert.equal(a.prepared.length,0);assert.equal(placed.attackMod,0);
}
{
 const {room,a,b}=setup();room.phase='prep';const target=card('FL09',b);b.reserve.push(target);a.hand.push(card('FL15',a));act(room,a,{type:'play',cardId:a.hand[0].uid,mode:'direct',targetId:target.uid},catalog);assert.equal(target.damage,2);assert.equal(a.mana,7);assert.equal(room.events.find(e=>e.type==='spell').healthUpdates[0].hp,10);
}
console.log('Forja revisado: 30 cartas, custos/atributos, redução permanente, sigilo, Emanação imune a área e dano direto aprovados.');
