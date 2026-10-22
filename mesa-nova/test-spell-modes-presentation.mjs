import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import * as F from './r1-fixtures.mjs';
for(const side of ['ally','enemy'])test('Inversor preparado '+side+': alvos e efeito real, custo único',()=>{
 const {room,a,b}=F.setup(),owner=side==='ally'?a:b,other=owner===a?b:a,target=F.place(owner,F.unit(owner,{attack:3,health:7,damage:2}),0);F.place(other,F.unit(other,{health:40}),0);
 const c=F.card('FEX04',a);F.cast(room,a,c,{mode:'lane',lane:0,targetSide:owner.id});assert.equal(a.mana,9);assert.equal(target.attack,3);F.combat(room);assert.equal(target.attack,5);assert.equal(target.health,3);assert.equal(target.damage,0);assert.ok(a.discard.some(x=>x.uid===c.uid));
});
test('Esteira preparada concede Iniciativa aliada antes do ataque; inimiga recusada sem pagar',()=>{
 const {room,a,b}=F.setup(),ally=F.place(a,F.unit(a,{attack:2,health:1}),0),enemy=F.place(b,F.unit(b,{attack:1,health:2}),0),c=F.card('FEX05',a);a.hand=[c];assert.throws(()=>F.act(room,a,{type:'play',cardId:c.uid,mode:'lane',lane:0,targetSide:b.id},F.catalog),/aliada/);assert.equal(a.mana,10);F.cast(room,a,c,{mode:'lane',lane:0,targetSide:a.id});F.combat(room);assert.ok(ally.grantedKeywords.includes('initiative'));assert.ok(a.reserve.includes(ally));assert.ok(b.discard.includes(enemy));
});
for(const mode of ['direct','lane'])test('Reciclagem '+mode+': custa 4, ganha 2 armadura sem consumo e compra 2',()=>{
 const {room,a,b}=F.setup();a.patron.extraLife=0;const c=F.card('FA06',a);F.cast(room,a,c,{mode,lane:0,targetSide:a.id});assert.equal(a.mana,6);
 if(mode==='lane'){assert.equal(a.patron.extraLife,0);F.combat(room);assert.equal(a.prepared.length,1);assert.equal(a.mana,6);F.place(a,F.unit(a),0);F.combat(room);}
 assert.equal(a.patron.extraLife,2);assert.equal(a.hand.length,mode==='lane'?3:2);/* segundo combate inicia também a preparação de A: compra normal de 1 */assert.equal(a.discard.filter(x=>x.uid===c.uid).length,1);
});
test('Reciclagem preparada não exige afetação da criatura protegida; Eco não duplica recurso',()=>{
 const {room,a}=F.setup();F.studies(a);a.study.discount=false;F.place(a,F.unit(a,{runeCoating:true}),0);F.place(a,F.unit(a),1);const c=F.card('FA06',a);F.cast(room,a,c,{mode:'lane',lane:0,targetSide:a.id});F.combat(room);assert.equal(a.patron.extraLife,2);assert.equal(a.hand.length,2);
});
test('Chamado preparado: ficha na reserva, escala na ativação, sigilo até revelar, sem Eco',()=>{
 const {room,a,b}=F.setup();F.studies(a);a.study.discount=false;const target=F.place(a,F.unit(a,{runeCoating:true}),0);F.place(a,F.unit(a),1);const c=F.card('RG06',a);F.cast(room,a,c,{mode:'lane',lane:0,targetSide:a.id});assert.equal(F.view(room,b).players[0].prepared[0].card,null);a.discard.push(F.card('RG06',a),F.card('RG06',a));F.combat(room);const tokens=a.reserve.filter(x=>x.modelId==='RG06-token');assert.equal(tokens.length,3);assert.ok(tokens.every(x=>x.attack===1&&x.health===1));assert.ok(tokens.every(x=>!a.formation.includes(x.uid)&&!a.emanation.includes(x.uid)));assert.equal(a.discard.filter(x=>x.uid===c.uid).length,1);assert.equal(target.health,40);
});
test('Monge e Verônica mostram apenas modo da instância; rival pré-revelação não recebe texto secreto',()=>{
 const {room,a,b}=F.setup();const cases=[['FL11','protocolMode','assault','Assalto','Escolta'],['FL11','protocolMode','escort','Escolta','Assalto'],['FL08','monkMode','weaken','Enfraquecer','Fortalecer'],['FL08','monkMode','buff','Fortalecer','Enfraquecer']];
 for(const [id,key,mode,label,inactive]of cases){const c=F.card(id,a);a.reserve.push(c);c[key]=mode;const own=F.view(room,a).players[0].reserve.find(x=>x.uid===c.uid),rival=F.view(room,b).players[0].reserve.find(x=>x.uid===c.uid);assert.match(own.text,new RegExp(label));assert.ok(!own.text.includes(inactive));assert.ok(!own.text.includes('escolha'));assert.equal(rival.text,c.text);assert.equal(rival[key],undefined);}
 room.phase='resolving';assert.match(F.view(room,b).players[0].reserve[0].text,/Assalto/);assert.ok(!F.view(room,b).players[0].reserve[0].text.includes('Escolta'));assert.match(F.catalog.decks.flatMap(d=>d.cards).find(c=>c.id==='FL11').text,/Escolta/);
});
test('Ithalion: Entrada não cria selo; gatilho documentado continua Revelação',()=>{const {room,a}=F.setup();const c=F.card('FV15',a);F.cast(room,a,c);assert.equal(room.seals?.length||0,0);assert.equal(c.effects[0].timing,'revelation');assert.match(c.text,/Revelação/);});
test('Linha de modos deriva dos flags reais; não confunde preparo com lado inimigo',()=>{
 const context={window:{}};vm.runInNewContext(fs.readFileSync(new URL('./card-visual.js',import.meta.url),'utf8'),context);const label=context.window.RunaCardVisual.spellModesLabel;
 for(const id of ['FEX04','FEX05','FA06','RG06','FV05'])assert.equal(label(F.card(id,F.setup().a)),'Direta / Armadilha');assert.equal(label(F.card('FL13',F.setup().a)),'Armadilha inimiga');assert.equal(label(F.card('FV11',F.setup().a)),'Armadilha aliada');assert.equal(label(F.card('FV02',F.setup().a)),'Armadilha livre');assert.equal(label(F.card('RG04',F.setup().a)),'Direta');
});
