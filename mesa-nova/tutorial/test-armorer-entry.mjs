import test from 'node:test';import assert from 'node:assert/strict';import * as F from './r1-fixtures.mjs';
test('Armeiro equipa arma nova 1/3 sem custo extra, quebrando anterior no Nathvanyr',()=>{
 const {room,a}=F.setup({aDeck:'forja-couraca-lyrik'}),old={uid:'old-weapon',attack:9,durability:5,maxDurability:5,wear:1,woundedBonus:9,effects:[{op:'initiative'},{op:'trample'}]};a.patron.equipment=old;a.patron.hp--;
 F.cast(room,a,F.card('FA02',a));const first=a.patron.equipment;assert.equal(a.mana,7);assert.equal(first.attack,1);assert.equal(first.durability,3);assert.notEqual(first.uid,old.uid);assert.deepEqual(first.effects,[]);assert.equal(first.modelId,'armor-weapon');assert.match(first.image,/arma-oficina-1-3/);assert.equal(old.durability,0);assert.equal(a.discard.filter(c=>c.uid===old.uid).length,1);assert.equal(a.weapons.length,0);assert.equal(F.view(room,a).players[0].patron.effectiveAttack,1);
 a.mana=10;F.cast(room,a,F.card('FA02',a));assert.notEqual(a.patron.equipment.uid,first.uid);assert.equal(a.discard.filter(c=>c.uid===first.uid).length,1);assert.equal(a.weapons.length,0);
});
test('Rebitador melhora apenas arma do Patrono sem alvo; sem arma entra sem gerar bônus',()=>{
 const {room,a}=F.setup({aDeck:'forja-couraca-lyrik'});F.cast(room,a,F.card('FA03',a));assert.equal(a.patron.equipment,undefined);a.mana=10;F.cast(room,a,F.card('FA02',a));const other=F.unit(a,{equipment:{attack:9,durability:9,maxDurability:9}});a.reserve.push(other);a.mana=10;F.cast(room,a,F.card('FA03',a));assert.equal(a.patron.equipment.attack,2);assert.equal(a.patron.equipment.durability,4);assert.equal(a.patron.equipment.maxDurability,4);assert.equal(other.equipment.attack,9);
});
