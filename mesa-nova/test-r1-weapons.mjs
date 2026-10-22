import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,unit,place,cast,combat,catalog,act,view,uid} from './r1-fixtures.mjs';
import {weaponRecipe,weaponOptions} from './equipment.mjs';

const costs=[1,3,6],structures=['resistente','perfurante','veloz'],blades=['precisa','dentada','brutal'];
const attackBase={1:1,3:2,6:4},durabilityBase={1:[3,2,1],3:[4,3,2],6:[5,4,3]};
function firstSteps(room,a,b,cost,structure){
 act(room,a,{type:'patronPower',powerId:'forjar-arma',weaponCost:cost},catalog);
 assert.equal(a.mana,7);assert.equal(a.forge.stage,'durability');
 act(room,a,{type:'endPrep'},catalog);act(room,b,{type:'endPrep'},catalog);
 act(room,a,{type:'vote',fight:false},catalog);act(room,b,{type:'vote',fight:false},catalog);
 assert.equal(room.turn,b.id);act(room,b,{type:'endPrep'},catalog);assert.equal(room.phase,'forging');
 act(room,a,{type:'forgeChoice',optionId:structure},catalog);
 assert.equal(room.phase,'prep');assert.equal(a.mana,10,'structure choice has no extra fee');
 act(room,a,{type:'endPrep'},catalog);act(room,a,{type:'vote',fight:false},catalog);act(room,b,{type:'vote',fight:false},catalog);
 assert.equal(room.phase,'forging');assert.equal(a.forge.stage,'attack');
}

test('R1-W00 actual option sets are 3 costs x 3 structures x 3 blades',()=>{
 assert.deepEqual(weaponOptions('cost').map(x=>Number(x.id)),costs);
 for(const cost of costs){
  assert.deepEqual(weaponOptions('durability',cost).map(x=>x.id),structures);
  assert.deepEqual(weaponOptions('attack',cost).map(x=>x.id),blades);
 }
});

for(const cost of costs)for(const [structureIndex,structure] of structures.entries())for(const blade of blades){
 test(`R1-W27 cost=${cost} structure=${structure} blade=${blade}: forge/play/equip/strike/wear and Patron target`,()=>{
  const {room,a,b}=setup({aDeck:'forja-oficina-lyrik'});
  firstSteps(room,a,b,cost,structure);act(room,a,{type:'forgeChoice',optionId:blade},catalog);
  assert.equal(room.round,6);assert.equal(room.phase,'prep');assert.equal(a.forge,undefined);assert.equal(a.mana,10,'blade choice has no extra fee');
  const weapon=a.hand.find(c=>c.type==='equipment'),expectedAttack=attackBase[cost]+({precisa:0,dentada:-1,brutal:1})[blade];
  const expectedDurability=Math.max(1,durabilityBase[cost][structureIndex]-(blade==='precisa'?0:1));
  assert.ok(weapon);assert.equal(weapon.cost,cost);assert.equal(weapon.attack,expectedAttack);assert.equal(weapon.durability,expectedDurability);
  assert.equal(weapon.effects.some(e=>e.op==='initiative'),structure==='veloz');
  assert.equal(weapon.effects.some(e=>e.op==='trample'),structure==='perfurante');
  const before=a.mana;act(room,a,{type:'play',cardId:weapon.uid},catalog);assert.equal(a.mana,before-cost);
  const wearer=place(a,unit(a,{attack:2,damage:blade==='dentada'?1:0}),0),target=place(b,unit(b,{health:80}),0);
  act(room,a,{type:'equip',cardId:weapon.uid,targetId:wearer.uid},catalog);assert.equal(a.mana,10-cost-1);
  assert.equal(3+cost+1,({1:5,3:7,6:10})[cost]);
  const expectedStrike=2+expectedAttack+(blade==='dentada'?2:0);
  assert.equal(view(room,a).players.find(p=>p.id===a.id).reserve.find(c=>c.uid===wearer.uid).effectiveAttack,expectedStrike);
  combat(room);assert.equal(target.damage,expectedStrike);assert.equal(weapon.durability,expectedDurability-1);
  assert.equal(wearer.damage,blade==='dentada'||blade==='brutal'?1:0);
  if(expectedDurability===1){assert.equal(wearer.equipment,undefined);assert.equal(a.discard.filter(c=>c.uid===weapon.uid).length,1);}
  else assert.equal(wearer.equipment.uid,weapon.uid);
  // All recipes can be equipped on a Patron, without claiming a Patron attack phase exists.
  const patronWeapon={...weaponRecipe(cost,structure,blade),uid:uid(),owner:b.id};b.weapons.push(patronWeapon);
  room.phase='prep';room.turn=b.id;b.mana=10;if(blade==='dentada')b.patron.hp=99;
  act(room,b,{type:'equip',cardId:patronWeapon.uid,targetId:'patron:'+b.id},catalog);
  assert.equal(b.mana,9);assert.equal(b.patron.equipment,patronWeapon);
  assert.equal(view(room,b).players.find(p=>p.id===b.id).patron.effectiveAttack,expectedAttack+(blade==='dentada'?2:0));
 });
}

test('R1-W01 full hand discards completed weapon, and completion has no extra fee',()=>{
 const {room,a,b}=setup({aDeck:'forja-oficina-lyrik'});
 firstSteps(room,a,b,3,'resistente');a.hand=Array.from({length:9},()=>unit(a));
 act(room,a,{type:'forgeChoice',optionId:'precisa'},catalog);
 assert.equal(a.forge,undefined);assert.equal(a.hand.length,9);assert.equal(a.mana,10);
 assert.equal(a.discard.filter(c=>c.type==='equipment').length,1);
});

test('R1-W02 match termination rejects pending forge progression without generating weapon',()=>{
 const {room,a}=setup({aDeck:'forja-oficina-lyrik'});
 act(room,a,{type:'patronPower',powerId:'forjar-arma',weaponCost:6},catalog);
 room.phase='finished';room.winner=room.players[1].id;const before=structuredClone(a.forge);
 assert.throws(()=>act(room,a,{type:'forgeChoice',optionId:'resistente'},catalog),/terminou/);
 assert.deepEqual(a.forge,before);assert.equal(a.hand.filter(c=>c.type==='equipment').length,0);
});

test('R1-W03 invalid targets and insufficient Ether do not consume weapon or change equipment',()=>{
 const {room,a,b}=setup({aDeck:'forja-oficina-lyrik'});
 const enemy=place(b,unit(b),0),weapon={...weaponRecipe(1,'resistente','precisa'),uid:uid(),owner:a.id};a.weapons=[weapon];
 for(const targetId of [enemy.uid,'patron:'+b.id,'missing']){
  assert.throws(()=>act(room,a,{type:'equip',cardId:weapon.uid,targetId},catalog),/Combatente/);
  assert.equal(a.weapons[0],weapon);assert.equal(a.mana,10);
 }
 a.mana=0;assert.throws(()=>act(room,a,{type:'equip',cardId:weapon.uid,targetId:'patron'},catalog),/1 Éter/);assert.equal(a.weapons[0],weapon);
 a.mana=1;act(room,a,{type:'equip',cardId:weapon.uid,targetId:'patron'},catalog);assert.equal(a.mana,0);
 const second={...weaponRecipe(3,'resistente','precisa'),uid:uid(),owner:a.id};a.weapons=[second];a.mana=10;
 assert.throws(()=>act(room,a,{type:'equip',cardId:second.uid,targetId:'patron'},catalog),/já possui/);assert.equal(a.mana,10);
});

test('R1-W04 zero attack from a zero-attack blade does not wear equipment',()=>{
 const {room,a,b}=setup({aDeck:'forja-oficina-lyrik'});
 const weapon={...weaponRecipe(1,'resistente','dentada'),uid:uid(),owner:a.id},wearer=place(a,unit(a),0);a.weapons=[weapon];
 act(room,a,{type:'equip',cardId:weapon.uid,targetId:wearer.uid},catalog);
 place(b,unit(b),0);combat(room);assert.equal(weapon.durability,2);assert.equal(wearer.damage,0);
});

test('R1-W05 a weapon with no remaining durability cannot be equipped',()=>{
 const {room,a}=setup({aDeck:'forja-oficina-lyrik'});const wearer=unit(a);a.reserve=[wearer];
 const weapon={...weaponRecipe(1,'resistente','precisa'),uid:uid(),owner:a.id,durability:0};a.weapons=[weapon];
 assert.throws(()=>act(room,a,{type:'equip',cardId:weapon.uid,targetId:wearer.uid},catalog),/arma/);assert.equal(a.mana,10);
});
