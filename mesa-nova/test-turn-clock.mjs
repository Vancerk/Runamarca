import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeRoom,join,act,expireTurn,view} from './game.mjs';
import {syncTurnClock} from './turn-clock.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('./cartas.json',import.meta.url))),deck=catalog.decks.find(d=>d.affinity==='forja');
function setup(){const room=makeRoom('CLOCK1','A'),a=room.players[0],b=join(room,'B');Object.assign(room,{phase:'prep',round:1,first:a.id,turn:a.id,preparationsDone:0});for(const p of [a,b])Object.assign(p,{mana:10,manaMax:10,deckData:deck,patron:{hp:20,maxHp:20,powers:structuredClone(deck.patron.powers)},deck:Array.from({length:5},(_,i)=>({uid:p.id+i,name:'Compra',type:'spell',cost:1}))});return {room,a,b};}
{
 const {room,a,b}=setup();act(room,a,{type:'patronPower',powerId:'forjar-armadura'},catalog);
 assert.equal(room.turnClock.seconds,60);const key=room.turnClock.key,end=room.turnClock.endsAt;
 assert.equal(view(room,a).turnClock.endsAt,view(room,b).turnClock.endsAt);assert.doesNotThrow(()=>structuredClone({...room,onChange:null}));
 assert.throws(()=>act(room,a,{type:'patronPower',powerId:'forjar-armadura'},catalog),/utilizado/);assert.equal(room.turnClock.key,key);assert.equal(room.turnClock.endsAt,end,'invalid or normal actions cannot renew time');
 room.turnClock.endsAt=Date.now()-1;assert.throws(()=>act(room,a,{type:'endPrep'},catalog),/tempo/);assert.equal(room.turn,b.id);assert.equal(room.preparationsDone,1);assert.equal(room.events.filter(e=>e.type==='turn_timeout').length,1);assert.notEqual(room.turnClock.key,key);
 act(room,b,{type:'endPrep'},catalog);assert.equal(room.phase,'vote');assert.equal(room.turnClock,null);
}
{
 const {room,a,b}=setup();a.hand=[{uid:'cheap',name:'Barata',cost:1},{uid:'costly',name:'Cara',cost:8}];a.pendingDiscard=1;
 syncTurnClock(room,expireTurn);room.turnClock.endsAt=Date.now()-1;assert.equal(expireTurn(room),true);assert.equal(a.pendingDiscard,0);assert.equal(a.discard[0].uid,'costly');assert.equal(room.turn,b.id);
 assert.equal(expireTurn(room),false,'a second expiry cannot end the next preparation');
 room.phase='finished';syncTurnClock(room,expireTurn);
}
{
 const {room,a,b}=setup();room.phase='vote';room.turn=null;
 const mk=(p,id,ef)=>({uid:id,modelId:'test',name:id,owner:p.id,type:'creature',attack:0,health:10,damage:0,attackMod:0,effects:[{...catalog.decks.flatMap(d=>d.cards).flatMap(c=>c.effects||[]).find(e=>e.op===ef.op),...ef}]});
 const monk=mk(a,'monk',{op:'monk_choice',timing:'revelation'}),protocol=mk(a,'protocol',{op:'combat_protocol',timing:'revelation'}),seals=mk(a,'seals',{op:'paired_seals',timing:'revelation'}),aura=mk(a,'aura',{op:'lane_health_aura',timing:'emanation',choose_lane:true,amount:1});
 a.reserve=[monk,protocol,seals,aura];a.formation=['monk','protocol','seals'];a.emanation=['aura'];
 act(room,a,{type:'vote',fight:true},catalog);assert.equal(room.turnClock.seconds,25);assert.equal(room.turnClock.warningSeconds,10);
 room.turnClock.endsAt=Date.now()-1;assert.equal(expireTurn(room),true);assert.ok(room.players.every(p=>p.ready));assert.equal(monk.monkMode,'weaken');assert.equal(protocol.protocolMode,'assault');assert.deepEqual(seals.sealChoices,{allyLane:2,enemyLane:2});assert.equal(aura.auraLane,0);assert.equal(room.phase,'resolving');assert.equal(room.turnClock,null,'automatic resolution has no player countdown');room.phase='finished';
}
{
 const {room,a,b}=setup();let changes=0;room.onChange=()=>changes++;syncTurnClock(room,expireTurn);room.turnClock.endsAt=Date.now()+65;syncTurnClock(room,expireTurn);
 await new Promise(r=>setTimeout(r,110));assert.equal(room.turn,b.id,'server expires without any incoming request');assert.equal(changes,1);room.phase='finished';syncTurnClock(room,expireTurn);
}
console.log('Cronômetro: 60/25s, prazo estável, atraso rejeitado, escolhas pendentes, reconexão, encerramento sem clientes e ausência de limite na resolução aprovados.');

