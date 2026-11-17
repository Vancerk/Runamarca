// Troca inicial (09/11/2026): uma única substituição; quem começa troca até 3 cartas, quem joga em segundo até 4.
// O limite é do motor (a interface apenas o exibe) e não muda nenhuma outra vantagem de ordem.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeRoom,join,act,view,easyBotAction,mulliganLimit,MULLIGAN_LIMIT,expireTurn} from './game.mjs';
import {syncTurnClock} from './turn-clock.mjs';
import {stopMusicClock} from './music-director.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('./cartas.json',import.meta.url)));
function match(){const room=makeRoom('LIM123','A'),a=room.players[0],b=join(room,'B');act(room,a,{type:'deck',deckId:catalog.decks[0].id},catalog);act(room,b,{type:'deck',deckId:catalog.decks[1].id},catalog);
 const first=room.players.find(p=>p.id===room.first),second=room.players.find(p=>p.id!==room.first);return {room,a,b,first,second};}
const close=room=>{room.phase='finished';syncTurnClock(room,expireTurn);stopMusicClock(room);};
const ids=(p,n)=>p.hand.slice(0,n).map(c=>c.uid),self=(room,p)=>view(room,p).players.find(x=>x.id===p.id),rival=(room,p)=>view(room,p).players.find(x=>x.id!==p.id);

test('limites: 3 para quem começa, 4 para quem joga em segundo; a visão mostra só o próprio limite',()=>{
 const {room,first,second}=match();try{
  assert.deepEqual({...MULLIGAN_LIMIT},{first:3,second:4});assert.equal(room.phase,'mulligan');assert.equal(room.first,room.coinWinner);
  assert.equal(mulliganLimit(room,first),3);assert.equal(mulliganLimit(room,second),4);
  assert.equal(self(room,first).mulliganLimit,3);assert.equal(self(room,second).mulliganLimit,4);
  assert.equal(rival(room,first).mulliganLimit,undefined);assert.equal(rival(room,first).hand,undefined);
  assert.equal(self(room,first).mulligansLeft,1);assert.equal(self(room,second).mulligansLeft,1);
 }finally{close(room);}
});

test('o motor recusa acima do limite e não altera mão, deck nem a troca disponível',()=>{
 const {room,first,second}=match();try{
  for(const [p,over,pattern] of [[first,4,/Quem começa pode trocar até 3 cartas/],[first,5,/até 3 cartas/],[second,5,/Quem joga em segundo pode trocar até 4 cartas/]]){
   const hand=p.hand.map(c=>c.uid),deck=p.deck.map(c=>c.uid),events=room.eventId,revision=room.revision;
   assert.throws(()=>act(room,p,{type:'mulligan',cardIds:ids(p,over)},catalog),pattern);
   assert.deepEqual(p.hand.map(c=>c.uid),hand);assert.deepEqual(p.deck.map(c=>c.uid),deck);assert.equal(p.mulligansLeft,1);assert.equal(p.mulliganReady,false);assert.equal(room.eventId,events);assert.equal(room.revision,revision);
  }
 }finally{close(room);}
});

test('seleções inválidas são recusadas: vazia, repetida, carta que não é da mão, carta do rival, formato errado',()=>{
 const {room,first,second}=match();try{
  const hand=first.hand.map(c=>c.uid),u=hand[0];
  for(const cardIds of [[],[u,u],['nao-existe'],[second.hand[0].uid],[first.deck[0].uid],null,'abc',[u,null],[{uid:u}],undefined])
   assert.throws(()=>act(room,first,{type:'mulligan',cardIds},catalog),/Selecione cartas da sua mão inicial/,JSON.stringify(cardIds));
  assert.deepEqual(first.hand.map(c=>c.uid),hand);assert.equal(first.mulligansLeft,1);
 }finally{close(room);}
});

test('menos cartas que o limite é permitido; a troca é única e a mão volta a cinco',()=>{
 for(const [who,count] of [['first',1],['first',2],['first',3],['second',1],['second',3],['second',4]]){
  const m=match(),p=m[who],room=m.room;try{
   const out=ids(p,count),kept=p.hand.slice(count).map(c=>c.uid),deck=p.deck.length;
   act(room,p,{type:'mulligan',cardIds:out},catalog);
   assert.equal(p.hand.length,5);assert.equal(p.deck.length,deck);assert.equal(p.mulligansLeft,0);assert.equal(p.mulliganReady,false,'a confirmação continua sendo um passo do próprio jogador');
   assert.deepEqual(p.hand.slice(0,5-count).map(c=>c.uid),kept,'as cartas mantidas ficam na mão, na mesma ordem');
   assert.equal(room.events.filter(e=>e.type==='mulligan'&&e.playerId===p.id).at(-1).count,count);
   assert.throws(()=>act(room,p,{type:'mulligan',cardIds:[p.hand[0].uid]},catalog),/mais trocas/);
   assert.equal(self(room,p).mulligansLeft,0);
  }finally{close(room);}
 }
});

test('confirmar sem trocar mantém as cinco cartas; cliques repetidos não confirmam nem trocam duas vezes',()=>{
 const {room,first,second}=match();try{
  const hand=first.hand.map(c=>c.uid);act(room,first,{type:'confirmMulligan'},catalog);
  assert.deepEqual(first.hand.map(c=>c.uid),hand);assert.equal(first.mulliganReady,true);assert.equal(room.phase,'mulligan');
  assert.throws(()=>act(room,first,{type:'confirmMulligan'},catalog),/já foi confirmada/);
  assert.throws(()=>act(room,first,{type:'mulligan',cardIds:[hand[0]]},catalog),/já foi confirmada/);
  act(room,second,{type:'mulligan',cardIds:ids(second,4)},catalog);const after=second.hand.map(c=>c.uid);
  assert.throws(()=>act(room,second,{type:'mulligan',cardIds:ids(second,1)},catalog),/mais trocas/);assert.deepEqual(second.hand.map(c=>c.uid),after);
  act(room,second,{type:'confirmMulligan'},catalog);assert.equal(room.phase,'prep');assert.equal(room.turn,first.id);
 }finally{close(room);}
});

test('reconexão: a visão após a troca informa que não há mais troca e conserva o limite da fase',()=>{
 const {room,second}=match();try{
  act(room,second,{type:'mulligan',cardIds:ids(second,2)},catalog);
  const again=self(room,second);assert.equal(again.mulligansLeft,0);assert.equal(again.mulliganReady,false);assert.equal(again.mulliganLimit,4);assert.equal(again.hand.length,5);
 }finally{close(room);}
});

test('tempo esgotado mantém a mão atual, com ou sem troca feita',()=>{
 const {room,first,second}=match();try{
  act(room,first,{type:'openingReady'},catalog);act(room,second,{type:'openingReady'},catalog);act(room,second,{type:'mulligan',cardIds:ids(second,4)},catalog);
  const hands=[first,second].map(p=>p.hand.map(c=>c.uid));for(const p of [first,second])p.mulliganStartedAt=Date.now()-46_000;
  syncTurnClock(room,expireTurn);expireTurn(room);
  assert.equal(room.phase,'prep');assert.deepEqual(first.hand.slice(0,5).map(c=>c.uid),hands[0]);assert.deepEqual(second.hand.map(c=>c.uid),hands[1]);
 }finally{close(room);}
});

test('o bot de treino respeita o limite do seu assento',()=>{
 for(let i=0;i<24;i++){const room=makeRoom('BOT'+i,'A'),a=room.players[0],bot=join(room,'Bot');bot.bot=true;bot.botDeckId=catalog.decks[1].id;
  try{act(room,a,{type:'deck',deckId:catalog.decks[0].id},catalog);act(room,bot,easyBotAction(room),catalog);assert.equal(room.phase,'mulligan');
   bot.hand.forEach(c=>c.cost=9);const action=easyBotAction(room);assert.equal(action.type,'mulligan');assert.ok(action.cardIds.length<=mulliganLimit(room,bot));act(room,bot,action,catalog);
   assert.deepEqual(easyBotAction(room),{type:'confirmMulligan'});}finally{close(room);}}
});

test('vantagens de ordem preservadas: o segundo não recebe carta nem mana extra; a ordem inverte a cada rodada',()=>{
 const {room,first,second}=match();try{
  act(room,first,{type:'confirmMulligan'},catalog);act(room,second,{type:'confirmMulligan'},catalog);
  assert.equal(room.turn,first.id);assert.equal(first.hand.length,6);assert.equal(first.manaMax,1);assert.equal(second.hand.length,5);assert.equal(second.manaMax,0);
  act(room,first,{type:'endPrep'},catalog);
  assert.equal(room.turn,second.id);assert.equal(second.hand.length,6);assert.equal(second.manaMax,1);assert.equal(second.mana,1);
  act(room,second,{type:'endPrep'},catalog);assert.equal(room.phase,'vote');
  act(room,first,{type:'vote',fight:false},catalog);act(room,second,{type:'vote',fight:false},catalog);
  assert.equal(room.round,2);assert.equal(room.first,second.id);assert.equal(room.turn,second.id);
 }finally{close(room);}
});
