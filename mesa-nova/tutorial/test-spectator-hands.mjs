// Arquibancada com mãos visíveis (11/11/2026): opção de sala, escolhida no saguão por um jogador, desligada por padrão.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeRoom,join,act,view,expireTurn} from './game.mjs';
import {syncTurnClock} from './turn-clock.mjs';
import {stopMusicClock} from './music-director.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('./cartas.json',import.meta.url)));
const close=room=>{room.phase='finished';syncTurnClock(room,expireTurn);stopMusicClock(room);};
function match(open){const room=makeRoom('ARQ123','A'),a=room.players[0],b=join(room,'B'),s=join(room,'Plateia','spectator');if(open!==undefined)act(room,a,{type:'spectatorHands',value:open},catalog);
 act(room,a,{type:'deck',deckId:catalog.decks[0].id},catalog);act(room,b,{type:'deck',deckId:catalog.decks[1].id},catalog);return {room,a,b,s};}
test('desligada por padrão: a arquibancada vê só a contagem das mãos',()=>{const {room,s}=match();try{const v=view(room,s);assert.equal(v.spectatorHands,false);for(const p of v.players){assert.equal(p.hand,undefined);assert.equal(p.handCount,5);}}finally{close(room);}});
test('ligada no saguão: a arquibancada vê as duas mãos; os jogadores continuam sem ver a do outro',()=>{const {room,a,b,s}=match(true);try{
 const v=view(room,s);assert.equal(v.spectatorHands,true);assert.deepEqual(v.players.map(p=>p.hand.length),[5,5]);assert.deepEqual(v.players[0].hand.map(c=>c.uid),a.hand.map(c=>c.uid));
 for(const [p,o] of [[a,b],[b,a]]){const w=view(room,p);assert.equal(w.players.find(x=>x.id===o.id).hand,undefined);assert.equal(w.players.find(x=>x.id===p.id).hand.length,5);}}finally{close(room);}});
test('só jogadores, só no saguão; quem assiste não consegue ligar',()=>{const {room,a,s}=match();try{
 assert.throws(()=>act(room,a,{type:'spectatorHands',value:true},catalog),/antes da partida/);
 const lobby=makeRoom('ARQ124','A'),la=lobby.players[0],ls=join(lobby,'Plateia','spectator');assert.throws(()=>act(lobby,ls,{type:'spectatorHands',value:true},catalog),/Só os jogadores/);
 act(lobby,la,{type:'spectatorHands',value:true},catalog);assert.equal(view(lobby,ls).spectatorHands,true);act(lobby,la,{type:'spectatorHands',value:false},catalog);assert.equal(view(lobby,ls).spectatorHands,false);}finally{close(room);}});
