import assert from 'node:assert/strict';
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import {act,makeRoom,join} from './game.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('./cartas.json',import.meta.url)));
const deck=catalog.decks.find(d=>d.id==='forja-oficina-experimental');
assert.equal(deck.cards.reduce((n,c)=>n+c.quantity,0),30);
for(const id of ['FL16','FL13'])assert.equal(deck.cards.some(c=>c.id===id),false);
for(const id of ['FL17','FEX01'])assert.equal(deck.cards.find(c=>c.id===id).quantity,1);
assert.equal(deck.cards.find(c=>c.id==='FEX08').quantity,2);
assert.equal(deck.cards.find(c=>c.id==='FEX09').quantity,3);
assert.deepEqual(catalog,JSON.parse(fs.readFileSync(new URL('./criador/prototipo.json',import.meta.url))));
const model=id=>catalog.decks.flatMap(d=>d.cards).find(c=>c.id===id);
function card(id,p,extra={}){return {...structuredClone(model(id)),uid:randomUUID(),modelId:id,owner:p.id,damage:0,attackMod:0,...extra};}
function setup(){const room=makeRoom('NEWFOR','A'),a=room.players[0],b=join(room,'B');for(const p of [a,b])Object.assign(p,{patron:{hp:20,maxHp:20},mana:10,manaMax:10,deck:Array.from({length:15},()=>({uid:randomUUID(),type:'creature',attack:1,health:1}))});Object.assign(room,{phase:'prep',turn:a.id,first:a.id});return {room,a,b};}
for(const [id,expectedAttack,draws] of [['FL17',3,1],['FL21',5,2]]){
 const {room,a}=setup(),target=card(id,a);a.reserve=[target];const spell=card('FEX08',a);a.hand=[spell];act(room,a,{type:'play',cardId:spell.uid,mode:'direct',targetId:target.uid},catalog);
 assert.equal(target.attack,expectedAttack);assert.equal(target.health,id==='FL21'?5:3);assert.equal(a.hand.length,draws);assert.equal(a.mana,5);
}
{
 const {room,a}=setup(),target=card('FL17',a,{attack:6});a.reserve=[target];const spell=card('FEX08',a);a.hand=[spell,...Array.from({length:8},()=>card('FL17',a))];act(room,a,{type:'play',cardId:spell.uid,mode:'direct',targetId:target.uid},catalog);assert.equal(a.hand.length,9);assert.equal(a.discard.length,4);assert.equal(a.deck.length,11);
}
{
 const {room,a,b}=setup(),source=card('FEX09',a),normal=card('FL17',a),doubler=card('FL21',a),magic=card('FL10',a),enemy=card('FL17',b);a.reserve=[source];a.hand=[normal,doubler,magic];b.hand=[enemy];room.turn=b.id;
 const hit={uid:randomUUID(),owner:b.id,id:'test-damage',name:'Dano',type:'direct_spell',cost:0,effects:[{op:'damage',amount:2}],directOnly:true};b.hand.push(hit);act(room,b,{type:'play',cardId:hit.uid,mode:'direct',targetId:source.uid},catalog);
 assert.equal(normal.attack,2);assert.equal(normal.health,2);assert.equal(doubler.attack,3);assert.equal(doubler.health,3);assert.equal(enemy.attack,1);assert.equal(magic.attack,undefined);assert.equal(a.reserve.length,0);assert.equal(a.discard.filter(c=>c.id==='FEX09').length,1);
}
console.log('Oficina Experimental: 30 cartas, trocas, coleção sincronizada, bônus permanente, arredondamento, duplicação de atributos, compra com mão cheia e Último Suspiro na mão aprovados.');
