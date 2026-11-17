import test from 'node:test';import assert from 'node:assert/strict';import * as F from './r1-fixtures.mjs';
const model=F.catalog.decks.flatMap(d=>d.cards).find(c=>c.effects?.some(e=>e.op==='silence'));
function magic(p,effects,extra={}){return F.spell(p,effects,{cost:0,...extra});}
function coat(room,p,target){F.cast(room,p,F.card('FEX07',p),{targetId:target.uid,mode:'direct'});}
test('Revestimento aplica +1/+1 antes de Antimagia e não é consumido por repetições',()=>{
 const {room,a,b}=F.setup();const target=F.unit(a,{attack:2,health:20});a.reserve=[target];coat(room,a,target);assert.equal(target.attack,3);assert.equal(target.health,21);assert.equal(target.runeCoating,true);
 for(let i=0;i<2;i++)F.cast(room,b,magic(b,[{op:'damage',amount:4,target:'chosen_enemy_creature'}]),{targetId:target.uid,mode:'direct'});
 F.cast(room,a,magic(a,[{op:'stat_buff',attack:5,health:5,target:'chosen_allied_creature'}]),{targetId:target.uid,mode:'direct'});assert.equal(target.damage,0);assert.equal(target.attack,3);assert.equal(target.health,21);assert.equal(target.runeCoating,true);
});
test('poder do Dom e poder de bônus aliado são bloqueados, preservando custo/limite',()=>{
 const {room,a,b}=F.setup({bDeck:'ruptura-grupo'}),target=F.unit(a);a.reserve=[target];coat(room,a,target);room.turn=b.id;
 F.act(room,b,{type:'patronPower',powerId:'golpe-do-maioral',targetId:target.uid},F.catalog);assert.equal(target.damage,0);assert.equal(b.mana,8);assert.equal(b.patron.usedPowers['golpe-do-maioral'],room.round);
 a.patron.powers.push({id:'potencializar',name:'Teste',cost:1,limit:'round',duration:'permanent'});room.turn=a.id;const attack=target.attack;F.act(room,a,{type:'patronPower',powerId:'potencializar',targetId:target.uid,attribute:'attack'},F.catalog);assert.equal(target.attack,attack);assert.equal(target.runeCoating,true);
});
test('magia coletiva preparada respeita protegido e continua nos demais alvos',()=>{
 const {room,a,b}=F.setup(),protectedOne=F.place(b,F.unit(b),0),other=F.place(b,F.unit(b),1);coat(room,b,protectedOne);
 const spell=magic(a,[{op:'area_damage',amount:2}],{type:'prepared_spell',positionOnly:true,enemyOnly:true});F.cast(room,a,spell,{mode:'lane',lane:0,targetSide:b.id});F.combat(room);assert.equal(protectedOne.damage,0);assert.equal(other.damage,2);assert.ok(a.discard.some(c=>c.uid===spell.uid));assert.equal(protectedOne.runeCoating,true);
});
test('Banquete preparado não perde benefício dos outros aliados quando a casa original tem Antimagia',()=>{
 const {room,a}=F.setup(),protectedOne=F.place(a,F.unit(a),0),other=F.place(a,F.unit(a),1);coat(room,a,protectedOne);const before=protectedOne.attack;
 F.cast(room,a,magic(a,[{op:'graveyard_stat_buff',attack:1,health:1,divisor:1}],{type:'prepared_spell',positionOnly:true}),{mode:'lane',lane:0,targetSide:a.id});F.combat(room);assert.equal(protectedOne.attack,before);assert.ok(other.attack>0);
});
test('efeito de criatura atravessa proteção; Silêncio do Fogo Fátuo remove proteção e bônus sem curar dano',()=>{
 const {room,a,b}=F.setup(),target=F.card('FL16',a);a.reserve=[target];coat(room,a,target);b.patron.extraLife=1;F.cast(room,b,F.card('FA04',b),{targetId:target.uid});assert.equal(target.damage,1);assert.equal(target.runeCoating,true);
 F.cast(room,b,F.card(model.id,b),{targetId:target.uid});assert.equal(target.runeCoating,undefined);assert.equal(target.attack,0);assert.equal(target.health,3);assert.equal(target.damage,1);assert.equal(target.silenced,true);
});
test('gatilhos próprios continuam: Rúnico Eficiente dobra o +1/+1 inicial',()=>{const {room,a}=F.setup(),target=F.card('FL21',a);a.reserve=[target];coat(room,a,target);assert.equal(target.attack,3);assert.equal(target.health,3);});
test('Pesquisa preserva compra independente usando o ataque que restou, sem aplicar o bônus bloqueado',()=>{
 const {room,a}=F.setup(),target=F.unit(a,{attack:3});a.reserve=[target];coat(room,a,target);const oldAttack=target.attack,oldHealth=target.health;a.mana=10;const count=a.hand.length;F.cast(room,a,F.card('FEX08',a),{targetId:target.uid,mode:'direct'});assert.equal(target.attack,oldAttack);assert.equal(target.health,oldHealth);assert.equal(a.hand.length,count+Math.floor(oldAttack/2));
});
