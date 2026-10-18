import assert from 'node:assert/strict';
import {makeRoom,join,resolveCombat,act} from './game.mjs';
function setup(){
 const room=makeRoom('ZERO','A'),a=room.players[0],b=join(room,'B');
 for(const p of room.players)Object.assign(p,{patron:{hp:100,maxHp:100},reserve:[],deck:Array.from({length:10},()=>({uid:Math.random().toString(),name:'Compra',type:'spell',effects:[]})),taunts:{},formation:[null,null,null],emanation:[]});
 Object.assign(room,{phase:'formation',first:a.id,turn:a.id,collectPreview:true});return {room,a,b};
}
function place(p,lane,attack=0,extra={}){
 const c={uid:p.id+lane,owner:p.id,modelId:'zero-fixture',name:'Teste',type:'creature',attack,health:10,damage:0,attackMod:0,effects:[],...extra};p.reserve.push(c);p.formation[lane]=c.uid;return c;
}
{
 const {room,a,b}=setup();for(const p of [a,b])for(let lane=0;lane<3;lane++)place(p,lane);
 act(room,a,{type:'ready'});act(room,b,{type:'ready'});
 assert.equal(room.phase,'resolving');assert.ok(!room.combat.timeline.some(s=>s.kind==='strike'||s.kind==='clash'),'Seis criaturas com zero não agendam animações de ataque');
 resolveCombat(room);assert.equal(room.directedSteps.length,0);assert.equal(a.patron.hp,100);assert.equal(b.patron.hp,100);
}
{
 const {room,a,b}=setup(),defender=place(a,0,0,{corruption:true,equipment:{attack:0,durability:3,maxDurability:3,recoil:1}}),attacker=place(b,0,2);
 room.phase='resolving';resolveCombat(room);
 assert.equal(room.directedSteps.length,1);assert.equal(room.directedSteps[0].sourceId,attacker.uid);assert.equal(room.directedSteps[0].targetId,defender.uid);assert.equal(defender.damage,2,'Zero ainda pode ser atacado');assert.equal(defender.equipment.durability,3,'Sem ataque não gasta equipamento');assert.equal(defender.attack,0,'Sem ataque não dispara Corrupção');
}
{
 const {room,a}=setup(),buffed=place(a,0,0,{attackMod:2,effects:[{op:'initiative'}]});room.phase='resolving';resolveCombat(room);
 assert.equal(room.directedSteps.length,1);assert.equal(room.directedSteps[0].sourceId,buffed.uid);assert.equal(room.directedSteps[0].amount,2,'Ataque efetivo positivo, mesmo com zero impresso, ataca');
}
console.log('Ataque zero: fase sem golpes, defesa preservada, sem desgaste/corrupção e bônus positivo aprovados.');
