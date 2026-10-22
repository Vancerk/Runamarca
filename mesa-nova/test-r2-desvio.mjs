import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,unit,place,combat,studies,act,view,catalog,card,cast} from './r1-fixtures.mjs';
import {prepareDesvio} from './r2-desvio-fixtures.mjs';
for(const attack of [0,1,2,3,4,5,6,7])test(`Desvio ataque ${attack}: custo 2, troca atual, consumo único e término`,()=>{
 const {room,a,b}=setup(),receiver=place(a,unit(a,{attack:1,health:80}),0),source=place(b,unit(b,{attack,health:80}),0);
 const spell=prepareDesvio(room,a,b,0);assert.equal(a.mana,8);combat(room);
 assert.equal(room.preClash[0].cards[0].attack,attack);assert.equal(room.preClash[0].cards[1].attack,1);
 assert.equal(a.mana,8);assert.equal(a.prepared.length,0);assert.equal(a.discard.filter(c=>c.uid===spell.uid).length,1);
 assert.equal(receiver.attackMod,0);assert.equal(source.attackMod,0);assert.equal(receiver.attack,1);assert.equal(source.attack,attack);
 place(a,receiver,0);place(b,source,0);combat(room);assert.equal(room.transferOrder.length,0);
});
for(const missing of ['source','receiver','receiver-in-reserve','receiver-in-emanation','dead-source','dead-receiver','receiver-not-creature'])test(`Desvio alvo ${missing}: não ativa nem consome`,()=>{
 const {room,a,b}=setup();let source,receiver;
 if(missing!=='source')source=place(b,unit(b,{attack:4,health:80}),0);
 if(missing!=='receiver'){receiver=unit(a,{health:80});a.reserve.push(receiver);if(!['receiver-in-reserve','receiver-in-emanation'].includes(missing))a.formation[0]=receiver.uid;if(missing==='receiver-in-emanation')a.emanation=[receiver.uid];}
 if(missing==='dead-source')source.damage=source.health;if(missing==='dead-receiver')receiver.damage=receiver.health;if(missing==='receiver-not-creature')receiver.type='equipment';
 const spell=prepareDesvio(room,a,b,0);combat(room);assert.equal(a.prepared[0].card.uid,spell.uid);assert.equal(a.discard.includes(spell),false);assert.equal(room.transferOrder.length,0);assert.equal(a.mana,8);
});
test('Desvio lê ataque depois dos bônus iniciais e Revelação, antes dos ataques',()=>{
 const {room,a,b}=setup(),receiver=place(a,unit(a,{attack:1,health:80}),0),source=place(b,unit(b,{attack:3,health:80}),0);
 b.pendingCombatAttack=1;source.effects=[{op:'optional_reveal_attack',timing:'revelation',cost:1,amount:2,target:'self'}];source.revealRequested=true;source.revealPaymentRound=room.round;
 prepareDesvio(room,a,b,0);combat(room);assert.equal(room.transferOrder[0].sourceAttackBefore,6);assert.equal(room.transferOrder[0].targetAttackBefore,1);assert.equal(room.preClash[0].cards[0].attack,6);assert.equal(room.preClash[0].cards[1].attack,1);
 assert.equal(receiver.damage,1);assert.equal(source.damage,6);assert.equal(source.attack,3);assert.equal(receiver.attack,1);
});
test('Eco de Desvio exige original válida e tem as mesmas condições',()=>{
 const {room,a,b}=setup();studies(a);const source=place(b,unit(b,{attack:4,health:80}),0),neighbor=place(b,unit(b,{attack:6,health:80}),1),receiver=place(a,unit(a,{health:80}),1);
 const spell=prepareDesvio(room,a,b,0);combat(room);assert.equal(room.transferOrder.length,0);assert.equal(a.prepared.length,1);
 place(b,source,0);place(b,neighbor,1);place(a,receiver,1);place(a,unit(a,{health:80}),0);combat(room);
 assert.equal(room.transferOrder.length,2);assert.equal(room.transferOrder.filter(t=>t.echo).length,1);assert.equal(a.discard.filter(c=>c.uid===spell.uid).length,1);
});
test('Original válida resolve quando vizinha do Eco é inválida',()=>{
 const {room,a,b}=setup();studies(a);place(a,unit(a,{health:80}),0);place(b,unit(b,{attack:4,health:80}),0);place(b,unit(b,{attack:1,health:80}),1);
 prepareDesvio(room,a,b,0);combat(room);assert.equal(room.transferOrder.length,1);assert.equal(a.prepared.length,0);
});
test('Sigilo, custo e lado: o rival não vê a armadilha antes da revelação',()=>{
 const {room,a,b}=setup(),spell=prepareDesvio(room,a,b,0);assert.equal(view(room,b).players.find(p=>p.id===b.id).prepared[0].card,null);
 const c=card('FV02',a);c.effects=[{op:'transfer_attack',timing:'before_attacks'}];c.enemyOnly=true;a.hand.push(c);
 assert.throws(()=>act(room,a,{type:'play',cardId:c.uid,mode:'lane',lane:1,targetSide:a.id},catalog));assert.equal(a.mana,8);assert.ok(a.hand.includes(c));assert.equal(a.prepared[0].card.uid,spell.uid);
});
test('Preview visual coloca Desvio depois de Revelações e antes do primeiro ataque',()=>{
 const {room,a,b}=setup(),source=place(b,unit(b,{attack:4,health:80}),0);place(a,unit(a,{health:80}),0);
 source.effects=[{op:'optional_reveal_attack',timing:'revelation',cost:1,amount:2,target:'self'}];source.revealRequested=true;source.revealPaymentRound=room.round;
 const c=prepareDesvio(room,a,b,0);room.phase='formation';const timer=globalThis.setTimeout;let callback;
 try{globalThis.setTimeout=fn=>{callback=fn;return 1;};act(room,a,{type:'ready'},catalog);act(room,b,{type:'ready'},catalog);}finally{globalThis.setTimeout=timer;}
 const timeline=room.combat.timeline,index=timeline.findIndex(s=>s.kind==='magic'&&s.spell.cardId===c.uid);
 assert.ok(index>timeline.findLastIndex(s=>s.kind==='revelation'));assert.ok(index<timeline.findIndex(s=>['clash','strike'].includes(s.kind)));assert.equal(a.prepared.length,1);assert.equal(a.mana,8);
 assert.equal(timeline[index].spell.healthUpdates.length,2);callback();assert.equal(a.prepared.length,0);assert.equal(a.discard.filter(x=>x.uid===c.uid).length,1);
});
for(const [left,right,resultLeft,resultRight] of [[0,1,1,0],[1,6,6,1],[6,0,0,6],[8,2,2,8],[0,0,0,0],[4,4,4,4]])for(const reverse of [false,true])test(`Desvios opostos ${left}/${right}: simultâneos, ordem invertida=${reverse}`,()=>{
 const {room,a,b}=setup(),ac=place(a,unit(a,{attack:left,health:80}),0),bc=place(b,unit(b,{attack:right,health:80}),0);
 const c1=prepareDesvio(room,a,b,0),c2=prepareDesvio(room,b,a,0);if(reverse){room.players.reverse();room.first=b.id;}combat(room);
 const cards=room.preClash[0].cards;assert.equal(cards.find(c=>c.uid===ac.uid).attack,resultLeft);assert.equal(cards.find(c=>c.uid===bc.uid).attack,resultRight);
 assert.equal(a.prepared.length,0);assert.equal(b.prepared.length,0);assert.equal(a.discard.filter(c=>c.uid===c1.uid).length,1);assert.equal(b.discard.filter(c=>c.uid===c2.uid).length,1);
});
for(const opposite of [false,true])test(`Desvio com dois Ecos na mesma origem: uma troca por par, rival=${opposite}`,()=>{
 const {room,a,b}=setup();studies(a);
 for(let lane=0;lane<3;lane++){place(a,unit(a,{attack:lane===1?2:0,health:80}),lane);place(b,unit(b,{attack:4,health:80}),lane);prepareDesvio(room,a,b,lane);}
 if(opposite)prepareDesvio(room,b,a,1);combat(room);
 const middle=room.preClash[1].cards;assert.equal(middle[0].attack,4);assert.equal(middle[1].attack,2);
 const group=room.transferOrder.filter(t=>t.lane===1&&t.sourceId===middle[1].uid);assert.equal(group.length,3);for(const t of group){assert.equal(t.operation,'swap');assert.equal(t.sourceAttackBefore,4);assert.equal(t.targetAttackBefore,2);}
 assert.equal(a.prepared.length,0);assert.equal(a.discard.filter(c=>c.id==='R2-FV18').length,3);assert.equal(b.prepared.length,0);
});

for(const reverse of [false,true])test(`Desvio e Eco do mesmo controlador: uma troca 1/6, listagem invertida=${reverse}`,()=>{
 const {room,a,b}=setup();studies(a);a.study.discount=false;
 for(let lane=0;lane<3;lane++){place(a,unit(a,{attack:1,health:80}),lane);place(b,unit(b,{attack:6,health:80}),lane);}
 const ally=a.reserve[1],enemy=b.reserve[1];
 const spells=[prepareDesvio(room,a,b,0),prepareDesvio(room,a,b,1)];if(reverse)a.prepared.reverse();combat(room);
 assert.equal(room.preClash[1].cards.find(c=>c.uid===ally.uid).attack,6);assert.equal(room.preClash[1].cards.find(c=>c.uid===enemy.uid).attack,1);
 assert.equal(a.mana,6);assert.equal(a.prepared.length,0);for(const c of spells)assert.equal(a.discard.filter(x=>x.uid===c.uid).length,1);
 assert.equal(room.transferOrder.filter(x=>x.lane===1).length,2);assert.equal(ally.attackMod,0);assert.equal(enemy.attackMod,0);
});

for(const side of ['ally','enemy'])test(`Antimagia no ${side}: bloqueia troca inteira e preserva consumo`,()=>{
 const {room,a,b}=setup(),ally=place(a,unit(a,{attack:1,health:80}),0),enemy=place(b,unit(b,{attack:6,health:80}),0);
 (side==='ally'?ally:enemy).runeCoating=true;const spell=prepareDesvio(room,a,b,0);combat(room);
 assert.equal(room.preClash[0].cards.find(c=>c.uid===ally.uid).attack,1);assert.equal(room.preClash[0].cards.find(c=>c.uid===enemy.uid).attack,6);
 assert.equal(room.transferOrder[0].blocked,true);assert.equal(a.prepared.length,0);assert.equal(a.discard.filter(c=>c.uid===spell.uid).length,1);
});
test('Desvio rejeita parâmetro sem suporte antes de cobrar ou consumir',()=>{
 const {room,a,b}=setup();const c=card('R2-FV18',a);c.effects[0].amount=99;a.hand.push(c);
 assert.throws(()=>act(room,a,{type:'play',cardId:c.uid,mode:'lane',lane:0,targetSide:b.id},catalog),/parâmetro/);assert.equal(a.mana,10);assert.ok(a.hand.includes(c));
});
test('Miragem transferida cria ficha Fluxo 0/1, sem Provocar e sem duração nova',()=>{
 const {room,a,b}=setup(),source=place(b,unit(b,{attack:0}),1),magic=card('FL20',a);
 assert.equal(magic.affinity,'fluxo');assert.equal(magic.cost,1);cast(room,a,magic,{mode:'lane',lane:1,targetSide:b.id});combat(room);
 const token=a.reserve.find(c=>c.modelId==='mirage-token');assert.ok(token);assert.equal(token.affinity,'fluxo');assert.deepEqual([token.attack,token.health],[0,1]);assert.deepEqual(token.effects,[]);
 assert.equal(token.token,true);assert.ok(a.discard.includes(magic));assert.equal(source.temporaryTrample,undefined);combat(room);assert.ok(a.reserve.includes(token));
});
for(const noSpace of ['occupied','full'])test(`Miragem: ${noSpace} consome sem criar ficha`,()=>{
 const {room,a,b}=setup();place(b,unit(b),0);if(noSpace==='occupied')place(a,unit(a),0);else a.reserve=Array.from({length:8},()=>unit(a));
 const magic=card('FL20',a);cast(room,a,magic,{mode:'lane',lane:0,targetSide:b.id});combat(room);
 assert.ok(a.discard.includes(magic));assert.equal(a.prepared.length,0);assert.ok(!a.reserve.some(c=>c.modelId==='mirage-token'));
});
