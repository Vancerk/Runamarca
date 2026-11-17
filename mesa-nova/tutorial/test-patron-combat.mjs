import test from 'node:test';import assert from 'node:assert/strict';import * as F from './r1-fixtures.mjs';import {weaponRecipe} from './equipment.mjs';
function setup(deck='forja-oficina-lyrik') {const x=F.setup({aDeck:deck});x.room.phase='formation';x.a.patron.hp=x.a.patron.maxHp=x.b.patron.hp=x.b.patron.maxHp=16;return x;}
function weapon(p,extra={}){p.patron.equipment={...weaponRecipe(1,'resistente','precisa'),uid:'weapon-'+p.id,attack:3,durability:3,maxDurability:3,...extra};}
for(const deck of ['forja-oficina-lyrik','fluxo-virelion','ruptura-grupo'])test(`Patrono armado pode ocupar casa vazia, em segredo, sem pagar: ${deck}`,()=>{
 const {room,a,b}=setup(deck);weapon(a);const mana=a.mana;F.act(room,a,{type:'assignPatron',lane:2},F.catalog);assert.equal(a.formation[2],'patron:'+a.id);assert.equal(a.mana,mana);assert.equal(F.view(room,a).players[0].formation[2],'patron:'+a.id);assert.deepEqual(F.view(room,b).players[0].formation,[null,null,null]);
 F.act(room,a,{type:'assignPatron',lane:null},F.catalog);assert.deepEqual(a.formation,[null,null,null]);
});
test('sem arma, arma quebrada, casa ocupada e formação confirmada são recusados',()=>{
 const {room,a}=setup();assert.throws(()=>F.act(room,a,{type:'assignPatron',lane:0},F.catalog),/arma/);weapon(a,{durability:0});assert.throws(()=>F.act(room,a,{type:'assignPatron',lane:0},F.catalog),/arma/);weapon(a);const c=F.place(a,F.unit(a),0);assert.throws(()=>F.act(room,a,{type:'assignPatron',lane:0},F.catalog),/desocupada/);assert.equal(a.formation[0],c.uid);a.ready=true;assert.throws(()=>F.act(room,a,{type:'assignPatron',lane:1},F.catalog),/confirmada/);
});
test('Patrono troca dano uma vez, armadura absorve e excedente vai à vida; retorna ao retrato',()=>{
 const {room,a,b}=setup();weapon(a);a.patron.extraLife=2;const target=F.place(b,F.unit(b,{attack:5,health:10}),0);F.act(room,a,{type:'assignPatron',lane:0},F.catalog);F.combat(room);assert.equal(a.patron.extraLife,0);assert.equal(a.patron.hp,13);assert.equal(target.health-target.damage,7);assert.equal(a.patron.equipment.durability,2);assert.ok(!a.formation.includes('patron:'+a.id));assert.ok(!a.reserve.some(c=>c.type==='patron'));
});
test('casa inimiga vazia causa apenas um ataque ao Patrono inimigo',()=>{const {room,a,b}=setup();weapon(a);F.act(room,a,{type:'assignPatron',lane:1},F.catalog);F.combat(room);assert.equal(b.patron.hp,13);assert.equal(a.patron.hp,16);});
test('Iniciativa da arma mata antes da resposta e desgaste quebra a arma uma vez',()=>{
 const {room,a,b}=setup();weapon(a,{durability:1,effects:[{op:'initiative'}]});const victim=F.place(b,F.unit(b,{attack:9,health:2}),1);F.act(room,a,{type:'assignPatron',lane:1},F.catalog);const id=a.patron.equipment.uid;F.combat(room);assert.equal(a.patron.hp,16);assert.ok(b.discard.some(c=>c.uid===victim.uid));assert.equal(a.patron.equipment,undefined);assert.equal(a.discard.filter(c=>c.uid===id).length,1);
});
test('bônus ferido e Transpassar da arma são aplicados ao Patrono combatente',()=>{
 const {room,a,b}=setup();a.patron.hp=15;weapon(a,{woundedBonus:2,effects:[{op:'trample'}]});F.place(b,F.unit(b,{attack:0,health:2}),2);F.act(room,a,{type:'assignPatron',lane:2},F.catalog);F.combat(room);assert.equal(b.patron.hp,13);
});
