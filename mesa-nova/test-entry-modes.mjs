import test from 'node:test';import assert from 'node:assert/strict';import * as F from './r1-fixtures.mjs';
test('invocação sem escolha é recusada antes de gastar ou consumir; modos não revelam ao rival',()=>{
 const {room,a,b}=F.setup();const c=F.card('FL11',a);a.hand=[c];const mana=a.mana;assert.throws(()=>F.act(room,a,{type:'play',cardId:c.uid},F.catalog),/protocolo/);assert.equal(a.mana,mana);assert.ok(a.hand.includes(c));F.cast(room,a,c,{protocolMode:'escort'});assert.equal(c.protocolMode,'escort');assert.equal(c.health,5);assert.equal(F.view(room,b).players[0].reserve[0].protocolMode,undefined);assert.equal(F.view(room,a).players[0].reserve[0].protocolMode,'escort');
});
for(const [id,key,choice]of [['FL11','protocolMode','escort'],['FL08','monkMode','buff']])test(`${id}: escolha persiste após dois combates, efeitos não acumulam`,()=>{
 const {room,a,b}=F.setup();const c=F.card(id,a);F.cast(room,a,c,{[key]:choice});const friend=F.unit(a);a.reserve.push(friend);const hp=c.health,friendHp=friend.health;
 for(let i=0;i<2;i++){a.formation=[c.uid,friend.uid,null];b.formation=[null,null,null];F.combat(room);assert.equal(c[key],choice);assert.equal(c.health,hp);assert.equal(friend.health,friendHp);assert.equal(c.attackMod,0);}
});
test('retorno à mão limpa o modo e reinvocação exige nova escolha',()=>{
 const {room,a,b}=F.setup();const c=F.card('FL11',a);F.cast(room,a,c,{protocolMode:'assault'});const old=c.uid;F.cast(room,b,F.card('FV13',b),{targetId:old,mode:'direct'});assert.notEqual(c.uid,old);assert.equal(c.protocolMode,undefined);a.mana=10;room.turn=a.id;const mana=a.mana;assert.throws(()=>F.act(room,a,{type:'play',cardId:c.uid},F.catalog),/protocolo/);assert.equal(a.mana,mana);F.cast(room,a,c,{protocolMode:'escort'});assert.equal(c.protocolMode,'escort');
});
test('bot usa modos explícitos padrão na entrada; Silêncio remove modo e habilidade',()=>{
 const {room,a,b}=F.setup();a.bot=true;const c=F.card('FL11',a);F.cast(room,a,c);assert.equal(c.protocolMode,'assault');F.cast(room,b,F.card('FV01',b),{targetId:c.uid});assert.equal(c.protocolMode,undefined);assert.equal(c.effects.length,0);assert.equal(c.silenced,true);
});
