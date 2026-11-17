import assert from 'node:assert/strict';
import fs from 'node:fs';
import {act,makeRoom,join,resolveCombat} from './game.mjs';
import {domPowers,punishSpellPayment} from './dom-powers.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('cartas.json',import.meta.url)));
function setup(){const room=makeRoom('DOMTEST','A'),a=room.players[0],b=join(room,'B');Object.assign(room,{phase:'prep',turn:a.id,first:a.id,round:4,collectPreview:true});for(const p of [a,b])Object.assign(p,{mana:10,manaMax:10,patron:{hp:20,maxHp:20,affinity:'ruptura',powers:domPowers(),usedPowers:{}},deck:[]});return {room,a,b};}
{
 const {room,a,b}=setup();act(room,a,{type:'patronPower',powerId:'convocar-carrasco'},catalog);assert.equal(a.mana,8);assert.equal(a.reserve[0].attack,1);assert.equal(a.reserve[0].health,1);assert.throws(()=>act(room,a,{type:'patronPower',powerId:'convocar-carrasco'},catalog),/utilizado/);
 act(room,a,{type:'patronPower',powerId:'represalia-de-eter'},catalog);assert.equal(a.mana,4);assert.equal(a.patron.etherReprisalRound,4);
 const log=[];const helpers={emit:(r,t,e)=>log.push({t,...e}),pushLog:()=>{}};a.patron.extraLife=2;punishSpellPayment(room,a,3,helpers);assert.equal(a.patron.extraLife,0);assert.equal(a.patron.hp,19);punishSpellPayment(room,b,2,helpers);assert.equal(b.patron.hp,18);punishSpellPayment(room,b,0,helpers);assert.equal(log.length,2);room.round++;punishSpellPayment(room,b,4,helpers);assert.equal(b.patron.hp,18);assert.throws(()=>act(room,a,{type:'patronPower',powerId:'represalia-de-eter'},catalog),/utilizado/);
}
{
 const {room,a,b}=setup();a.patron.powers=domPowers('damage');assert.throws(()=>act(room,a,{type:'patronPower',powerId:'golpe-do-maioral',targetId:'missing'},catalog),/alvo/);assert.equal(a.mana,10);act(room,a,{type:'patronPower',powerId:'golpe-do-maioral',targetId:'patron:'+b.id},catalog);assert.equal(b.patron.hp,19);assert.equal(a.mana,8);
}
console.log('Dom: poderes, custo, alvos, armadura e expiração aprovados.');
