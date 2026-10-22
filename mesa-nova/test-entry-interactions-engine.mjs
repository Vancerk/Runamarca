import test from 'node:test';import assert from 'node:assert/strict';import * as F from './r1-fixtures.mjs';import {weaponRecipe} from './equipment.mjs';
function weapon(p,id,cost=1,chassis='resistente',blade='precisa'){return {...weaponRecipe(cost,chassis,blade),uid:id,owner:p.id};}
for(const who of ['patron','creature'])test('substituição manual '+who+': quebra, não soma, um custo/evento e durabilidade nova',()=>{
 const {room,a}=F.setup();const creature=F.unit(a,{attack:2,health:10});a.reserve=[creature];const target=who==='patron'?a.patron:creature,old=weapon(a,'old',6,'perfurante','dentada'),fresh=weapon(a,'fresh');target.equipment=old;a.weapons=[fresh];const hp=target.hp??target.health;
 F.act(room,a,{type:'equip',cardId:fresh.uid,targetId:who==='patron'?'patron':creature.uid},F.catalog);assert.equal(a.mana,9);assert.equal(target.equipment,fresh);assert.equal(fresh.durability,3);assert.equal(old.durability,0);assert.equal(a.discard.filter(c=>c===old).length,1);assert.equal(a.weapons.length,0);assert.equal(target.hp??target.health,hp);assert.equal(room.events.filter(e=>e.type==='equipment_broken').length,1);assert.equal(room.events.filter(e=>e.type==='equipment_equipped').length,1);
 const shown=F.view(room,a).players[0];if(who==='patron')assert.equal(shown.patron.effectiveAttack,1);else{assert.equal(shown.reserve[0].effectiveAttack,3);assert.ok(!shown.reserve[0].effects.some(e=>old.effects.some(o=>o.op===e.op)));}
});
for(const invalid of ['mana','enemy','dead','missing','broken'])test('substituição inválida '+invalid+': não cobra nem quebra a anterior',()=>{
 const {room,a,b}=F.setup(),old=weapon(a,'old'),fresh=weapon(a,'fresh');a.patron.equipment=old;a.weapons=[fresh];if(invalid==='mana')a.mana=0;if(invalid==='dead')a.patron.hp=0;if(invalid==='broken')fresh.durability=0;const before=a.mana;
 assert.throws(()=>F.act(room,a,{type:'equip',cardId:invalid==='missing'?'absent':fresh.uid,targetId:invalid==='enemy'?'patron:'+b.id:'patron'},F.catalog));assert.equal(a.mana,before);assert.equal(a.patron.equipment,old);assert.equal(old.durability,3);assert.equal(a.discard.length,0);assert.ok(a.weapons.includes(fresh));
});
test('Entrada alvo inválido: servidor preserva Éter, mão, eventos e reserva',()=>{
 for(const id of ['FL01','FV01','FA04']){const {room,a,b}=F.setup();b.reserve=[F.unit(b)];const c=F.card(id,a);a.hand=[c];assert.throws(()=>F.act(room,a,{type:'play',cardId:c.uid,targetId:'not-valid'},F.catalog));assert.equal(a.mana,10);assert.ok(a.hand.includes(c));assert.equal(a.reserve.length,0);assert.equal(room.events.length,0);}
});
test('Entrada sem inimigo mantém a convenção existente de entrar sem disparo',()=>{const {room,a}=F.setup();const c=F.card('FA04',a);F.cast(room,a,c);assert.ok(a.reserve.includes(c));assert.equal(a.mana,10-c.cost);});
