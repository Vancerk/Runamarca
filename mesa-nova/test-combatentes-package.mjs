import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,card,unit,place,cast,combat,view,act,catalog} from './r1-fixtures.mjs';
import {weaponRecipe} from './equipment.mjs';
import {restoreBoundPatrons,patronBindingLane} from './patron-bindings.mjs';
import {studies} from './r1-fixtures.mjs';
const model=id=>catalog.decks.flatMap(d=>d.cards).find(c=>c.id===id);
const prepare=(r,p,id,side,lane)=>cast(r,p,card(id,p),{mode:'lane',targetSide:side.id,lane});
const armed=p=>p.patron.equipment={...weaponRecipe(1,'resistente','precisa'),uid:'weapon-'+p.id};
test('catálogo: IDs preservados, novos nomes, vida das Crias e custo exato de Hora da Bigorna',()=>{
 assert.equal(model('FV16').name,'Sigilo de Aether');assert.equal(model('R2-FV18').name,'Roubo Arcano');
 assert.equal(model('RG03').health,1);
 for(const d of catalog.decks.filter(d=>d.affinity==='forja')){
  const power=d.patron.powers.find(p=>p.id==='forjar-armadura');assert.equal(power.name,'Hora da Bigorna');assert.equal(power.cost,2);
  assert.equal(d.patron.powers.find(p=>p.id==='forjar-arma').cost,3);
 }
});
for(const [id,key] of [['FV02','anchor'],['FV14','sleep']])test(`${id}: Patrono retorna ao retrato, persiste/reconecta, volta sem arma e expira em dois combates`,()=>{
 const {room,a,b}=setup();armed(b);b.patron.equipment.durability=1;b.formation[0]='patron:'+b.id;
 const enemy=place(a,unit(a,{attack:1,health:30}),0);prepare(room,a,id,b,0);combat(room);
 assert.equal(b.patron[key].remaining,1);assert.ok(!b.formation.includes('patron:'+b.id));
 const v=JSON.parse(JSON.stringify(view(room,a)));assert.equal(v.players.find(p=>p.id===b.id).patron[key].lane,0);
 if(key==='anchor')assert.equal(b.patron.equipment,undefined);else delete b.patron.equipment;
 room.phase='formation';restoreBoundPatrons(room);assert.equal(b.formation[0],'patron:'+b.id);
 assert.throws(()=>act(room,b,{type:'assignPatron',lane:null},catalog),/vinculado/);
 assert.throws(()=>act(room,b,{type:'assign',lane:0,cardId:unit(b).uid},catalog),/reservada/);
 place(a,enemy,0);const hp=b.patron.hp;combat(room);assert.equal(b.patron.hp,hp-1);assert.equal(b.patron[key],undefined);
 room.phase='formation';assert.throws(()=>act(room,b,{type:'assignPatron',lane:0},catalog),/arma/);
});
for(const [id,attacks] of [['FV02',true],['FV14',false]])test(`${id}: usa arma nova, mas Sono continua sem atacar`,()=>{
 const {room,a,b}=setup();armed(b);b.formation[0]='patron:'+b.id;prepare(room,a,id,b,0);combat(room);
 b.patron.equipment={...weaponRecipe(6,'resistente','precisa'),uid:'new-weapon',attack:4};
 const target=place(a,unit(a,{health:30}),0);combat(room);assert.equal(target.damage,attacks?4:0);
});
test('Sigilo: chega sobre Roubo, que troca após Revelação; não antecipa a janela',()=>{
 const {room,a,b}=setup();const incoming=place(b,unit(b,{attack:2}),0),ally=place(a,unit(a,{attack:5}),1);
 const revealer=place(a,card('RG02',a),0);prepare(room,a,'FV16',b,0);prepare(room,a,'R2-FV18',b,1);
 combat(room);assert.equal(room.transferOrder.length,1);assert.equal(room.transferOrder[0].sourceAttackBefore,2);
 assert.equal(room.preparedActivations.filter(x=>x.op==='transfer_attack').length,0);assert.equal(a.prepared.length,0);
 assert.equal(room.preClash[1].cards.find(c=>c.uid===incoming.uid).attack,5);assert.equal(room.preClash[1].cards.find(c=>c.uid===ally.uid).attack,2);assert.ok(incoming.damage>=2);assert.ok(revealer);
});
test('Sigilo: última casa, colisão com Patrono e alvo morto não geram entrada fictícia',()=>{
 for(const mode of ['last','collision','dead']){
  const {room,a,b}=setup();const c=place(b,unit(b,{health:mode==='dead'?1:40}),mode==='last'?2:0);
  if(mode==='collision'){armed(b);b.formation[1]='patron:'+b.id;}
  prepare(room,a,'FV16',b,mode==='last'?2:0);if(mode!=='last')prepare(room,a,'FL13',b,1);
  combat(room);assert.equal(room.pushes.flatMap(x=>x.movements).length,0);
  if(mode==='collision')assert.equal(b.patron.hp,99);
  if(mode==='dead')assert.ok(b.discard.includes(c));
  if(mode!=='last')assert.ok(a.prepared.some(x=>x.card.id==='FL13'));
 }
});
test('Sigilo: Antimagia impede deslocamento e dano; Eco não repete instância inicial',()=>{
 const {room,a,b}=setup();studies(a);const origin=place(b,unit(b,{runeCoating:true}),0),neighbor=place(b,unit(b),1);
 prepare(room,a,'FV16',b,0);combat(room);assert.equal(origin.damage,0);assert.equal(room.pushes.length,1);
 // Only the valid Echo at lane 1 acts; the original was blocked, consumed once.
 assert.equal(neighbor.damage,1);assert.equal(room.pushes[0].movements[0].lane,2);assert.equal(a.prepared.length,0);
 assert.equal(new Set(room.preparedActivations.map(x=>x.cardId)).size,room.preparedActivations.length);
});
test('vínculos acompanham deslocamento forçado, não sobrescrevem casa e rejeitam conflito legado',()=>{
 const {room,a,b}=setup();armed(b);b.formation[0]='patron:'+b.id;
 b.patron.anchor={lane:0,remaining:2,setAt:0};b.patron.sleep={lane:0,remaining:2,setAt:0};prepare(room,a,'FV16',b,0);
 combat(room);assert.equal(patronBindingLane(b),1);room.phase='formation';place(b,unit(b),1);
 assert.throws(()=>restoreBoundPatrons(room),/ocupada/);assert.notEqual(b.formation[1],'patron:'+b.id);
 b.patron.sleep.lane=0;assert.throws(()=>patronBindingLane(b),/conflitantes/);
});
test('Hora da Bigorna cobra 2 de verdade, uma vez por rodada; Crias instanciadas têm vida 1',()=>{
 const {room,a,b}=setup({aDeck:'forja-oficina-lyrik'});a.mana=1;
 assert.throws(()=>act(room,a,{type:'patronPower',powerId:'forjar-armadura'},catalog),/Energia/);
 a.mana=2;act(room,a,{type:'patronPower',powerId:'forjar-armadura'},catalog);assert.equal(a.mana,0);assert.equal(a.patron.extraLife,1);
 assert.throws(()=>act(room,a,{type:'patronPower',powerId:'forjar-armadura'},catalog),/utilizado/);
 assert.equal(card('RG03',b).health,1);assert.equal(card('RG03',b).baseStats.health,1);
});
test('Sigilo: dominó em duas casas vazias causa três danos, sem cobrança na ativação',()=>{
 const {room,a,b}=setup(),c=place(b,unit(b,{health:40}),0);
 prepare(room,a,'FV16',b,0);prepare(room,a,'FV16',b,1);prepare(room,a,'FV16',b,2);const mana=a.mana;
 combat(room);assert.equal(c.damage,3);assert.equal(a.prepared.length,0);assert.equal(a.mana,mana);
 assert.deepEqual(room.pushes.flatMap(p=>p.movements).map(m=>m.lane),[1,2]);
});
test('Sigilo: Patrono na origem e colisão são combatentes, sem consumir armadilha de criatura',()=>{
 const {room,a,b}=setup();armed(b);b.formation[0]='patron:'+b.id;const c=place(b,unit(b),1);
 prepare(room,a,'FV16',b,0);combat(room);assert.equal(b.patron.hp,99);assert.equal(c.damage,1);
 const next=setup();armed(next.b);next.b.formation[0]='patron:'+next.b.id;
 const trap=prepare(next.room,next.a,'FL13',next.b,0);combat(next.room);
 assert.equal(next.a.prepared.length,1);assert.ok(!next.a.discard.some(x=>x.uid===trap.uid));
});
