import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,card,unit,place,studies,cast,combat,view,act,catalog} from './r1-fixtures.mjs';

function prepare(room,p,c,side,lane){cast(room,p,c,{mode:'lane',targetSide:side.id,lane});return c;}
test('Eco preparado não ativa com origem vazia; espera a original sem pagar novamente',()=>{
 const {room,a,b}=setup();studies(a);const neighbor=place(b,unit(b),1);
 const anchor=prepare(room,a,card('FV02',a),b,0);const paid=a.mana;
 combat(room);assert.equal(neighbor.anchor,undefined);assert.equal(a.prepared.length,1);assert.equal(a.discard.some(c=>c.uid===anchor.uid),false);
 // A formação é recolhida ao final: recolocar a vizinha, deixando a origem vazia.
 place(b,neighbor,1);combat(room);assert.equal(neighbor.anchor,undefined);assert.equal(a.prepared.length,1);
 const origin=place(b,unit(b),0);place(b,neighbor,1);combat(room);
 assert.ok(origin.anchor);assert.ok(neighbor.anchor);assert.equal(a.prepared.length,0);
 assert.equal(a.discard.filter(c=>c.uid===anchor.uid).length,1);
 assert.equal(paid,10); // desconto de Estudos: Âncora custa zero
});
test('Eco verifica a condição da origem; vizinha válida não basta',()=>{
 const {room,a,b}=setup();studies(a);const origin=place(b,unit(b,{attack:1}),0),neighbor=place(b,unit(b,{attack:5}),1);
 const c=card('FV02',a);c.effects=[{op:'anchor',min_attack:4}];prepare(room,a,c,b,0);
 combat(room);assert.equal(origin.anchor,undefined);assert.equal(neighbor.anchor,undefined);assert.equal(a.prepared.length,1);
});
test('Vizinha inválida impede apenas Eco; original válida é consumida uma vez',()=>{
 const {room,a,b}=setup();studies(a);const origin=place(b,unit(b,{attack:5}),0),neighbor=place(b,unit(b,{attack:1}),1);
 const c=card('FV02',a);c.effects=[{op:'anchor',min_attack:4}];prepare(room,a,c,b,0);
 combat(room);assert.ok(origin.anchor);assert.equal(neighbor.anchor,undefined);assert.equal(a.prepared.length,0);
 place(b,neighbor,1);combat(room);assert.equal(neighbor.anchor,undefined);
});
test('Eco reavalia vizinha que perdeu o ataque exigido durante a resolução preparada',()=>{
 const {room,a,b}=setup();studies(a);const origin=place(b,unit(b,{attack:5}),0),neighbor=place(b,unit(b,{attack:5}),1);
 const weaken=card('FL13',a,{effects:[{op:'attack_modifier',amount:-4,permanent:true}]});prepare(room,a,weaken,b,1);
 const anchor=card('FV02',a,{effects:[{op:'anchor',min_attack:4}]});prepare(room,a,anchor,b,0);
 combat(room);assert.ok(origin.anchor);assert.equal(neighbor.attack,1);assert.equal(neighbor.anchor,undefined);
 assert.equal(a.prepared.length,0);assert.equal(room.events.filter(e=>e.type==='spell_cast').length,2);
});
test('Eco de Âncora mantém legalidade em posição aliada',()=>{
 const {room,a}=setup();studies(a);const origin=place(a,unit(a),0),neighbor=place(a,unit(a),1);
 prepare(room,a,card('FV02',a),a,0);combat(room);assert.ok(origin.anchor);assert.ok(neighbor.anchor);
});
test('Ativações originais preservam a janela simultânea de dano e cura',()=>{
 const {room,a,b}=setup(),target=place(a,unit(a,{health:2}),0);
 const damage=card('RG07',b,{directOnly:false,effects:[{op:'damage',amount:2}]});
 const heal=card('FL10',a,{effects:[{op:'heal',amount:2,target:'chosen_allied_creature'}]});
 // B resolves first in the prepared iteration, but its damage is simultaneous.
 room.players=[b,a];prepare(room,b,damage,a,0);prepare(room,a,heal,a,0);combat(room);
 assert.ok(a.reserve.includes(target));assert.equal(target.damage,0);assert.equal(a.prepared.length,0);assert.equal(b.prepared.length,0);
});
test('Banquete preparado: custo 8, oculto para rival e bônus em todas as posições aliadas',()=>{
 const {room,a,b}=setup();const target=place(a,unit(a,{attack:1,health:20}),0),other=place(a,unit(a),1);
 a.discard.push(card('FV08',a),card('FV08',a));const c=prepare(room,a,card('FV05',a),a,0);
 assert.equal(a.mana,2);assert.ok(view(room,a).players.find(p=>p.id===a.id).prepared[0].card);
 const enemy=view(room,b).players.find(p=>p.id===a.id).prepared[0];assert.equal(enemy.card,null);assert.equal(enemy.hidden,true);
 combat(room);assert.equal(target.attack,2);assert.equal(target.health,21);assert.equal(other.attack,1);assert.equal(other.health,41);
 assert.equal(a.discard.filter(x=>x.uid===c.uid).length,1);assert.equal(a.prepared.length,0);
});
test('Banquete espera aliado e usa Nartvanyr atual, não o do preparo; exclui a si mesmo',()=>{
 const {room,a}=setup();const other=place(a,unit(a),1);prepare(room,a,card('FV05',a),a,0);combat(room);assert.equal(a.prepared.length,1);assert.equal(other.attack,0);
 a.discard.push(card('FV08',a),card('FV08',a),card('FV08',a));
 const c=place(a,unit(a),0);combat(room);assert.equal(c.attack,1);assert.equal(c.health,41);assert.equal(a.prepared.length,0);
});
test('Banquete direto sem criaturas na reserva não beneficia Emanação nem combate',()=>{
 const {room,a}=setup(),fighter=place(a,unit(a),0),emana=unit(a);a.reserve.push(emana);a.emanation=[emana.uid];
 a.discard.push(card('FV08',a),card('FV08',a));const banquet=card('FV05',a);cast(room,a,banquet,{mode:'direct'});
 assert.equal(a.mana,2);assert.equal(fighter.attack,0);assert.equal(emana.attack,0);assert.ok(a.discard.includes(banquet));
});
test('Banquete direto: apenas reserva; exclui combate, Emanação, mão e inimigos, sem duplicação',()=>{
 const {room,a,b}=setup();studies(a);const first=place(a,unit(a),0),second=place(a,unit(a),1),reserve=unit(a),reserve2=unit(a),emana=unit(a),hand=unit(a),enemy=place(b,unit(b),0);a.reserve.push(reserve,reserve2,emana);a.emanation=[emana.uid];a.hand.push(hand);
 a.discard.push(card('FV08',a),card('FV08',a));cast(room,a,card('FV05',a),{mode:'direct'});
 for(const c of [reserve,reserve2]){assert.equal(c.attack,1);assert.equal(c.health,41);}
 for(const c of [first,second,emana,hand,enemy]){assert.equal(c.attack,0);assert.equal(c.health,40);}
 const spellEvent=room.events.findLast(e=>e.type==='spell'&&!e.echo);assert.deepEqual(new Set(spellEvent.healthUpdates.map(c=>c.uid)),new Set([reserve.uid,reserve2.uid]));
 assert.equal(room.events.filter(e=>e.type==='spell'&&e.echo).length,0);
});
test('Banquete preparado: todas as três posições, exclui reserva/Emanação/mão/inimigo e não gera Eco',()=>{
 const {room,a,b}=setup();studies(a);const first=place(a,unit(a),0),second=place(a,unit(a),1),third=place(a,unit(a),2),reserve=unit(a),emana=unit(a),hand=unit(a),enemy=place(b,unit(b),0);a.reserve.push(reserve,emana);a.emanation=[emana.uid];a.hand.push(hand);
 const c=card('FV05',a);
 a.discard.push(card('FV08',a),card('FV08',a));prepare(room,a,c,a,0);
 assert.equal(view(room,a).players.flatMap(p=>p.prepared).filter(p=>p.echo).length,0);
 combat(room);
 for(const target of [first,second,third]){assert.equal(target.attack,1);assert.equal(target.health,41);}
 for(const target of [reserve,emana,hand,enemy]){assert.equal(target.attack,0);assert.equal(target.health,40);}
 assert.equal(room.spellHealthUpdates.filter(x=>x.cardId===c.uid+'-eco').length,0);
 assert.equal(a.discard.filter(x=>x.uid===c.uid).length,1);
 assert.equal(a.study.positionEffects.filter(x=>x.spell.id==='FV05').length,0);
});
test('Banquete/Eco com 3 magias não contam o original recém-descartado como quarta',()=>{
 const {room,a}=setup();studies(a);const first=place(a,unit(a),0),second=place(a,unit(a),1);
 a.discard.push(card('FV08',a),card('FV08',a),card('FV08',a));prepare(room,a,card('FV05',a),a,0);combat(room);
 assert.equal(first.attack,1);assert.equal(second.attack,1);
});
test('Banquete conta armadilha anterior já resolvida; não conta as ainda preparadas',()=>{
 for(const before of [true,false]){
  const {room,a}=setup();const first=place(a,unit(a),0),second=place(a,unit(a),1);a.discard.push(card('FV08',a));
  const banquet=card('FV05',a),buff=card('FL10',a);a.mana=10;
  if(before){prepare(room,a,buff,a,1);prepare(room,a,banquet,a,0);}else{prepare(room,a,banquet,a,0);prepare(room,a,buff,a,1);}
  combat(room);assert.equal(first.attack,before?1:0);assert.equal(second.attack,before?2:1);
 }
});
test('Conhecimento ativado depois do Banquete preparado não reaplica o benefício coletivo',()=>{
 const {room,a}=setup();studies(a);a.study.sharing=false;a.study.activated=[10];
 const first=place(a,unit(a),0),second=place(a,unit(a),1);a.discard.push(card('FV08',a),card('FV08',a));prepare(room,a,card('FV05',a),a,0);combat(room);
 place(a,first,0);place(a,second,1);room.phase='prep';room.turn=a.id;a.mana=10;
 act(room,a,{type:'patronPower',powerId:'estudos-avancados',centerNeighbor:2},catalog);
 assert.equal(first.attack,1);assert.equal(second.attack,1);assert.equal(first.health,41);assert.equal(second.health,41);
});
test('Banquete preparado dobra ganhos do Rúnico; bônus é permanente e não reaplica',()=>{
 const {room,a}=setup();const runic=place(a,card('FL21',a),0);a.discard.push(card('FV08',a),card('FV08',a));
 prepare(room,a,card('FV05',a),a,0);combat(room);assert.equal(runic.attack,3);assert.equal(runic.health,3);
 place(a,runic,0);combat(room);assert.equal(runic.attack,3);assert.equal(runic.health,3);
});
test('Mover Banquete preparado mantém a identidade oculta; revelar o combate exibe a carta',()=>{
 const {room,a,b}=setup();const c=prepare(room,a,card('FV05',a),a,0);
 act(room,a,{type:'movePrepared',cardId:c.uid,lane:1,targetSide:a.id},catalog);
 let entry=view(room,b).players.find(p=>p.id===a.id).prepared[0];assert.equal(entry.card,null);assert.equal(entry.hidden,true);
 room.phase='resolving';entry=view(room,b).players.find(p=>p.id===a.id).prepared[0];assert.equal(entry.card.id,'FV05');
});
test('Preview e resolução real omitem Eco de origem vazia; preview do Aríete não debita estado real',()=>{
 const {room,a,b}=setup();studies(a);place(b,unit(b),1);prepare(room,a,card('FV02',a),b,0);
 const ram=place(b,card('RG11',b),2);room.phase='formation';act(room,b,{type:'revealPayment',cardId:ram.uid,pay:true},catalog);
 const timer=globalThis.setTimeout;let callback;
 try{globalThis.setTimeout=fn=>{callback=fn;return 1;};act(room,a,{type:'ready'},catalog);act(room,b,{type:'ready'},catalog);}finally{globalThis.setTimeout=timer;}
 assert.equal(room.combat.spells.length,0);assert.equal(room.combat.timeline.filter(s=>s.kind==='magic').length,0);assert.equal(b.mana,10);
 assert.ok(callback);callback();assert.equal(a.prepared.length,1);assert.equal(b.reserve.find(c=>c.uid===ram.uid).attackMod,0);
});
