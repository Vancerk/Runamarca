// The former lab's decisions are closed. Exercise canonical handlers instead of
// retaining a second implementation or skipped tests for resolved questions.
import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,unit,card,cast,act,combat,view,catalog} from './r1-fixtures.mjs';
import {dealPatronDamage,damagedPreviousRound} from './combat-triggers.mjs';
for(const armor of [0,10])test(`Histórico real serializável com armadura ${armor}`,()=>{
 const {room,a,b}=setup();b.patron.extraLife=armor;cast(room,a,card('RG07',a),{targetId:'patron:'+b.id});
 assert.equal(damagedPreviousRound(room,b),false);room.round++;assert.equal(damagedPreviousRound(room,b),true);
 b.damageRounds=JSON.parse(JSON.stringify(b.damageRounds));assert.equal(damagedPreviousRound(room,b),true);room.round++;assert.equal(damagedPreviousRound(room,b),false);
});
test('Conjuração inválida não consome a primeira magia nem cria disparo',()=>{
 const {room,a}=setup();const source=card('FV03',a);a.reserve.push(source);a.emanation=[source.uid];a.mana=0;const magic=card('FV08',a);a.hand.push(magic);
 assert.throws(()=>act(room,a,{type:'play',cardId:magic.uid},catalog));assert.equal(a.firstSpellRound,undefined);assert.equal(a.apprenticeQueue,undefined);
});
test('Primeira magia gratuita do Grimório dispara Aprendiz e não é renovada por outra gratuita',()=>{
 const {room,a,b}=setup();const source=card('FV03',a),target=unit(b),magic=card('FV08',a),second=card('FV08',a);a.reserve.push(source);a.emanation=[source.uid];b.reserve.push(target);a.mana=0;
 a.studyBook={cards:[magic,second],instantIds:[magic.uid,second.uid],remaining:2};
 act(room,a,{type:'play',cardId:magic.uid},catalog);assert.equal(a.mana,0);assert.equal(a.apprenticeQueue.length,1);act(room,a,{type:'apprenticeTarget',cardId:source.uid,targetId:target.uid},catalog);
 act(room,a,{type:'play',cardId:second.uid},catalog);assert.equal(a.apprenticeQueue.length,0);assert.equal(target.damage,1);
});
test('Disparo já ativado conserva fonte para o seletor mesmo se a primeira magia derrotou a Aprendiz',()=>{
 const {room,a,b}=setup();const source=card('FV03',a),target=unit(b);a.reserve.push(source);a.emanation=[source.uid];b.reserve.push(target);
 const magic={id:'fixture-self',uid:'fixture-self',type:'direct_spell',name:'Alvo individual',cost:0,effects:[{op:'damage',amount:1,target:'any_creature'}]};cast(room,a,magic,{targetId:source.uid});assert.ok(a.discard.includes(source));
 const own=view(room,a).players.find(p=>p.id===a.id);assert.equal(own.pendingApprenticeSources[0].uid,source.uid);assert.equal(view(room,b).players.find(p=>p.id===a.id).pendingApprenticeSources.length,0);
 act(room,a,{type:'apprenticeTarget',cardId:source.uid,targetId:target.uid},catalog);assert.equal(target.damage,1);
});
test('Histórico de dano atual não apaga a informação da rodada anterior',()=>{
 const {room,a,b}=setup();dealPatronDamage(room,b,1,{ownerId:a.id,sourceId:'prior',kind:'spell'});room.round++;dealPatronDamage(room,b,1,{ownerId:a.id,sourceId:'now',kind:'combat'});assert.equal(damagedPreviousRound(room,b),true);assert.deepEqual(b.damageRounds,[room.round-1,room.round]);
});
