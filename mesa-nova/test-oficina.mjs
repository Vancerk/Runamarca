import assert from 'node:assert/strict';
import fs from 'node:fs';
import {act,join,makeRoom,resolveCombat,view} from './game.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('./cartas.json',import.meta.url)));
const deck=catalog.decks.find(d=>d.id==='forja-oficina-lyrik');
assert.equal(deck.cards.reduce((n,c)=>n+c.quantity,0),30);
assert.equal(deck.cards.find(c=>c.id==='FL03').quantity,2);assert.equal(deck.cards.find(c=>c.id==='FL03').cost,2);assert.equal(deck.cards.find(c=>c.id==='FL01').cost,3);assert.equal(deck.cards.find(c=>c.id==='FL01').health,2);assert.equal(deck.cards.find(c=>c.id==='FL01').quantity,1);assert.equal(deck.cards.find(c=>c.id==='FL05').cost,5);assert.equal(deck.cards.find(c=>c.id==='FL05').health,2);assert.equal(deck.cards.find(c=>c.id==='FL04').cost,2);assert.equal(deck.cards.find(c=>c.id==='FL07').cost,4);
assert.equal(deck.cards.find(c=>c.id==='FL04').rarity,'elite');assert.equal(deck.cards.find(c=>c.id==='FL04').quantity,2);
assert.equal(deck.cards.find(c=>c.id==='FL11').speech,'Protocolo: Exterminar!');
assert.deepEqual(catalog.decks.map(d=>d.id),['forja-oficina-lyrik','fluxo-virelion']);assert.equal(deck.cards.find(c=>c.id==='FL02').attack,0);assert.equal(deck.cards.find(c=>c.id==='FL02').health,4);
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
 const {room,a}=setup();room.phase='prep';const target=card('FL02',a,{damage:1}),elf=card('FL07',a);a.reserve.push(target,elf);a.emanation.push(elf.uid);const spell=card('FL10',a);a.hand.push(spell);act(room,a,{type:'play',cardId:spell.uid,mode:'direct',targetId:target.uid},catalog);assert.equal(target.attack,2);assert.equal(target.health,6);assert.equal(view(room,a).players[0].reserve.find(c=>c.uid===target.uid).effectiveAttack,3);act(room,a,{type:'endPrep',healTargetIds:[target.uid]},catalog);assert.equal(target.damage,0);assert.equal(a.mana,4,'Buff 5 e cura 1');
}
{
 const {room,a,b}=setup();room.phase='formation';const taunter=place(a,card('FL09',a),0);assert.throws(()=>act(room,a,{type:'taunt',cardId:taunter.uid,lane:0},catalog),/adjacente/);assert.throws(()=>act(room,a,{type:'taunt',cardId:taunter.uid,lane:2},catalog),/adjacente/);act(room,a,{type:'taunt',cardId:taunter.uid,lane:1},catalog);assert.equal(view(room,b).players[0].taunts[taunter.uid],undefined,'Alvo secreto até revelar');assert.equal(view(room,a).players[0].taunts[taunter.uid],1);
}
{
 const {room,a,b}=setup();room.phase='lobby';act(room,a,{type:'deck',deckId:deck.id},catalog);act(room,b,{type:'deck',deckId:'fluxo-virelion'},catalog);assert.equal(a.deck.length+a.hand.length,30);const imported=a.deck.concat(a.hand).find(c=>c.modelId==='FL05');assert.equal(imported.artZoom,144);assert.equal(imported.artX,41);assert.equal(imported.artY,39);
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
for(const [subtype,lane,expectedAttack,expectedHp] of [['axiom',0,3,3],['axiom Sintético',0,3,3],['humano',0,2,3],['axiom',1,2,2]]){
 const {room,a}=setup(),engineer=card('FL17',a);a.reserve.push(engineer);a.emanation=[engineer.uid];place(a,card('FL01',a,{effects:[],subtype}),lane);resolveCombat(room);const preview=room.preClash[lane].cards[0];assert.equal(preview.attack,expectedAttack);assert.equal(preview.health,expectedHp);
}
for(const mode of ['direct','lane']){
 const {room,a,b}=setup();room.phase='prep';a.patron.hp=98;const target=place(b,card('FL09',b,{attack:0,effects:[]}),0),spell=card('FL18',a);a.hand.push(spell);
 act(room,a,{type:'play',cardId:spell.uid,mode,targetId:target.uid,lane:0,targetSide:b.id},catalog);
 if(mode==='lane'){assert.equal(a.patron.hp,98);room.phase='resolving';resolveCombat(room);assert.equal(room.spellHealthUpdates.find(s=>s.cardId===spell.uid).targets.find(u=>u.patronId===a.id).hp,99);}
 else{assert.equal(target.damage,1);assert.equal(room.events.find(e=>e.type==='spell').patronHealing.hp,99);}
 assert.equal(a.patron.hp,99);assert.equal(a.mana,7);
}
{
 const {room,a,b}=setup();room.phase='prep';a.patron.hp=100;const target=card('FL09',b);b.reserve.push(target);const spell=card('FL18',a);a.hand.push(spell);act(room,a,{type:'play',cardId:spell.uid,mode:'direct',targetId:target.uid},catalog);assert.equal(a.patron.hp,100,'Cura não ultrapassa a vida máxima');
}
{
 const {room,a,b}=setup();room.phase='prep';a.patron.hp=98;const elf=card('FL07',a);a.reserve.push(elf);a.emanation=[elf.uid];a.mana=0;assert.throws(()=>act(room,a,{type:'endPrep',healTargetIds:['patron']},catalog),/Mana insuficiente/);assert.equal(a.patron.hp,98);a.mana=1;act(room,a,{type:'endPrep',healTargetIds:['patron']},catalog);assert.equal(a.patron.hp,99);assert.equal(a.mana,0);const e=view(room,b).events.find(e=>e.type==='cleric_heal');assert.equal(e.targetPatronId,a.id);assert.equal(e.healthUpdates[0].hp,99);
}
{
 const {room,a,b}=setup();const dwarf=card('FL06',a);a.reserve.push(dwarf);a.emanation=[dwarf.uid];const x=place(a,card('FL16',a),0),y=place(b,card('FL01',b,{attack:1}),0);resolveCombat(room);assert.equal(room.preClash[0].cards[0].health,2);assert.equal(room.preClash[0].cards[0].attack,0);assert.ok(a.reserve.includes(x),'A aura de vida permite sobreviver a 1 de dano');assert.equal(x.health,1,'A vida adicional é uma aura, não crescimento permanente');assert.equal(x.damage,0);assert.equal(deck.cards.find(c=>c.id==='FL16').quantity,1);assert.equal(deck.cards.find(c=>c.id==='FL06').quantity,1);assert.equal(deck.cards.find(c=>c.id==='FL07').quantity,1);
}

// Provocar can be omitted or cancelled without extending the frontal block.
{
 const {room,a,b}=setup();room.phase='formation';const t=place(a,card('FL09',a),1);act(room,a,{type:'ready'},catalog);assert.equal(a.ready,true);assert.deepEqual(a.taunts,{});
}
{
 const {room,a,b}=setup();room.phase='formation';const t=place(b,card('FL09',b),1);act(room,b,{type:'taunt',cardId:t.uid,lane:0},catalog);act(room,b,{type:'taunt',cardId:t.uid,lane:null},catalog);assert.equal(b.taunts[t.uid],undefined);const front=place(a,card('FL05',a),1),side=place(a,card('FL05',a),0);room.phase='resolving';resolveCombat(room);assert.equal(room.directedSteps.find(s=>s.sourceId===front.uid).targetId,t.uid);assert.equal(room.directedSteps.find(s=>s.sourceId===side.uid).targetId,null);assert.equal(b.patron.hp,95);
}
{
 const {room,a}=setup();room.phase='formation';const t=place(a,card('FL16',a),1),other=place(a,card('FL09',a),0);act(room,a,{type:'taunt',cardId:t.uid,lane:0},catalog);act(room,a,{type:'taunt',cardId:other.uid,lane:1},catalog);act(room,a,{type:'ready'},catalog);assert.equal(a.ready,true);assert.throws(()=>act(room,a,{type:'taunt',cardId:t.uid,lane:null},catalog),/confirmada/);
}

{
 const {room,a}=setup();room.phase='formation';const left=place(a,card('FL09',a),0),right=place(a,card('FL16',a),2);act(room,a,{type:'taunt',cardId:left.uid,lane:1},catalog);assert.throws(()=>act(room,a,{type:'taunt',cardId:right.uid,lane:1},catalog),/Outra criatura/);act(room,a,{type:'taunt',cardId:right.uid,lane:null},catalog);act(room,a,{type:'ready'},catalog);assert.equal(a.ready,true,'Confirma mesmo sem casa adicional disponível');
}
