import assert from 'node:assert/strict';
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import {act,makeRoom,join,resolveCombat,view} from './game.mjs';
import {receiveDamage,keywordPresentation,syncKeywordAuras} from './forja-variant.mjs';
import './weapons-data.js';
const catalog=JSON.parse(fs.readFileSync(new URL('./cartas.json',import.meta.url)));
const variant=catalog.decks.find(d=>d.id==='forja-oficina-experimental');
assert.equal(variant.cards.reduce((n,c)=>n+c.quantity,0),30);
assert.equal(variant.cards.find(c=>c.id==='FEX04').cost,1);
assert.equal(variant.cards.find(c=>c.id==='FEX05').cost,2);
for(const deck of catalog.decks){assert.equal(deck.cards.reduce((n,c)=>n+c.quantity,0),30);for(const c of deck.cards)assert.ok(c.quantity<=({lacaio:4,padrao:3,elite:2,soberano:1})[c.rarity],c.name+' respeita limite de raridade');}
assert.equal(variant.cards.find(c=>c.id==='FL10').quantity,3);assert.equal(variant.cards.find(c=>c.id==='FL16').quantity,4);assert.equal(variant.cards.find(c=>c.id==='FEX02').quantity,1);assert.equal(variant.cards.find(c=>c.id==='FEX05').quantity,1);assert.equal(variant.cards.find(c=>c.id==='FEX01').cost,2);
function setup(){const room=makeRoom('TEST01','A'),a=room.players[0],b=join(room,'B');for(const p of [a,b])Object.assign(p,{patron:{hp:100,maxHp:100},mana:10,manaMax:10,deck:Array.from({length:12},()=>({uid:randomUUID()}))});Object.assign(room,{first:a.id,turn:a.id,phase:'prep',collectPreview:true});return {room,a,b};}
function card(id,p,extra={}){return {...structuredClone(catalog.decks.flatMap(d=>d.cards).find(c=>c.id===id)),uid:randomUUID(),owner:p.id,modelId:id,damage:0,attackMod:0,...extra};}
function cast(room,p,id,targetId){const c=card(id,p);p.hand.push(c);act(room,p,{type:'play',cardId:c.uid,mode:'direct',targetId},catalog);}
{
 const {room,a,b}=setup(),targets=Array.from({length:5},()=>card('FL09',b)),combat=card('FL09',b),emana=card('FL09',b);
 b.reserve=[...targets,combat,emana];b.formation[0]=combat.uid;b.emanation=[emana.uid];cast(room,a,'FL14');
 assert.equal(targets.filter(c=>c.attack===4).length,3);assert.equal(combat.attack,5);assert.equal(emana.attack,5);assert.equal(a.mana,6);
}
{
 const {room,a,b}=setup(),targets=Array.from({length:2},()=>card('FL09',b));b.reserve=targets;cast(room,a,'FL14');assert.ok(targets.every(c=>c.attack===4));
}
{
 const {room,a,b}=setup(),targets=Array.from({length:3},()=>card('FL09',b));b.reserve=targets;b.formation=targets.map(c=>c.uid);const c=card('FL14',a);a.hand.push(c);act(room,a,{type:'play',cardId:c.uid,mode:'lane',lane:1,targetSide:b.id},catalog);room.phase='resolving';resolveCombat(room);assert.ok(targets.every(c=>c.attack===4));
}
{
 const {room,a,b}=setup(),target=card('FEX03',a);a.reserve=[target];cast(room,a,'FEX02',target.uid);const next=receiveDamage(target,2);assert.equal(next.damage,8);assert.equal(next.attack,1);assert.equal(next.health,10);assert.equal(next.volatileProject,undefined);
 const lethal=receiveDamage({...target,health:4},2);assert.equal(lethal.health,4);assert.equal(lethal.attack,0);assert.equal(lethal.damage,8);
 const enemy=card('FEX03',b);b.reserve.push(enemy);assert.throws(()=>cast(room,a,'FEX02',enemy.uid),/lado correto/);
}
{
 const {room,a}=setup(),target=card('FEX03',a,{attack:2,damage:3});a.reserve=[target];cast(room,a,'FEX04',target.uid);assert.equal(target.attack,6);assert.equal(target.health,2);assert.equal(target.damage,0);
}
{
 const {room,a}=setup(),target=card('FEX03',a);a.reserve=[target];cast(room,a,'FEX04',target.uid);assert.ok(a.discard.includes(target));
}
{
 const {room,a}=setup(),target=card('FEX03',a);a.reserve=[target];room.phase='resolving';resolveCombat(room);assert.equal(target.damage,0,'não há desgaste após combate');
}
{
 const {room,a,b}=setup(),source=card('FEX01',a),target=card('FL05',a),enemy=card('FL03',b);a.reserve=[source,target];a.emanation=[source.uid];a.formation[0]=target.uid;b.reserve=[enemy];b.formation[0]=enemy.uid;room.phase='formation';act(room,a,{type:'pressureLane',cardId:source.uid,lane:0},catalog);assert.ok(target.auraKeywords.includes('trample'));assert.deepEqual(keywordPresentation(target).highlightKeywords,[],'palavra original não duplicada');
 a.emanation=[];syncKeywordAuras(room);assert.equal(target.auraKeywords,undefined);
}
{
 const {room,a,b}=setup(),target=card('FEX03',a),enemy=card('FL05',b,{attack:1,health:2});a.reserve=[target];b.reserve=[enemy];a.formation[0]=target.uid;b.formation[0]=enemy.uid;target.attack=2;cast(room,a,'FEX05',target.uid);assert.ok(keywordPresentation(target).highlightKeywords.includes('Iniciativa'));assert.equal(view(room,a).players[0].reserve[0].highlightKeywords[0],'Iniciativa');room.phase='resolving';resolveCombat(room);assert.ok(b.discard.includes(enemy));assert.equal(target.damage,0,'inimigo não revida e não há desgaste');
}
for(const cost of [1,5,10])for(const structure of ['resistente','perfurante','veloz'])for(const blade of ['precisa','dentada','brutal']){const w=RunaWeapons.recipe(cost,structure,blade);assert.ok(!/Equipamento —|Perde 1 de durabilidade/.test(w.text));assert.ok(w.maxDurability>0);}
console.log('Forja variante: catálogo, Geada, volatilidade, inversão, primeiro dano dobrado, auras, Iniciativa e 27 textos de armas aprovados.');

{
 const {room,a}=setup(),source=card('FEX01',a);a.hand=[source];act(room,a,{type:'play',cardId:source.uid,mode:'emanate'},catalog);act(room,a,{type:'pressureLane',cardId:source.uid,lane:2},catalog);assert.equal(source.auraLane,2,'escolha disponível já na preparação');assert.throws(()=>act(room,a,{type:'pressureLane',cardId:source.uid,lane:3},catalog),/posição/);act(room,a,{type:'emanate',cardId:source.uid},catalog);assert.equal(source.auraLane,undefined,'sair da emanação remove a escolha');
}

{
 const {room,a,b}=setup(),target=card('FEX03',a);a.reserve=[target];
 assert.equal(receiveDamage(target,0).firstDamageTaken,undefined);
 const first=receiveDamage(target,2);assert.equal(first.damage,4);assert.equal(first.firstDamageTaken,true);
 const second=receiveDamage(first,2);assert.equal(second.damage,6);assert.equal(target.damage,0,'prévia não modifica original');
 const shield=receiveDamage({...target,extraLife:5},2);assert.equal(shield.extraLife,1);assert.equal(shield.damage,0);assert.equal(shield.firstDamageTaken,true);
 b.hand.push(card('RG07',b));room.turn=b.id;act(room,b,{type:'play',cardId:b.hand[0].uid,targetId:target.uid},catalog);assert.equal(target.damage,2,'magia direta dobra primeiro dano');
 room.turn=a.id;cast(room,a,'FEX04',target.uid);assert.equal(target.attack,7,'inversão usa vida restante após dano dobrado');
}
{
 const {room,a,b}=setup(),target=card('FEX03',a),spell=card('RG07',b,{directOnly:false,enemyOnly:true});a.reserve=[target];a.formation[0]=target.uid;b.hand=[spell];room.turn=b.id;
 act(room,b,{type:'play',cardId:spell.uid,mode:'lane',lane:0,targetSide:a.id},catalog);room.phase='resolving';resolveCombat(room);assert.equal(target.damage,2,'magia preparada também dobra primeiro dano');assert.equal(target.firstDamageTaken,true);
}
{
 const {room,a,b}=setup(),target=card('FEX03',a),enemy=card('FL03',b);a.reserve=[target];b.reserve=[enemy];a.formation[0]=target.uid;b.formation[0]=enemy.uid;room.phase='resolving';resolveCombat(room);assert.equal(target.damage,2,'primeiro ataque dobra');a.formation[0]=target.uid;b.formation[0]=enemy.uid;room.phase='resolving';resolveCombat(room);assert.equal(target.damage,3,'ataque seguinte não dobra');
}



