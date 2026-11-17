import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {makeRoom,join,act,view,expireTurn} from './game.mjs';
import {syncTurnClock} from './turn-clock.mjs';
import {syncMusic,enableMusicClock,stopMusicClock,MUSIC_RULES} from './music-director.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('./cartas.json',import.meta.url)));
const music=JSON.parse(fs.readFileSync(new URL('./music-catalog.json',import.meta.url)));
function match(){const room=makeRoom('ABC123','A'),a=room.players[0],b=join(room,'B');act(room,a,{type:'deck',deckId:catalog.decks[0].id},catalog);act(room,b,{type:'deck',deckId:catalog.decks[1].id},catalog);return {room,a,b};}
function close(room){room.phase='finished';syncTurnClock(room,expireTurn);stopMusicClock(room);}
test('mulligan starts after presentation, is personal, and duplicate readiness cannot renew it',()=>{
 const {room,a,b}=match();try{
  assert.equal(a.mulliganStartedAt,null);assert.ok(view(room,a).turnClock.startedAt>Date.now());
  act(room,a,{type:'openingReady'},catalog);const end=view(room,a).turnClock.endsAt;
  assert.ok(Math.abs(end-Date.now()-45000)<100);assert.ok(view(room,b).turnClock.endsAt>end);
  act(room,a,{type:'openingReady'},catalog);assert.equal(view(room,a).turnClock.endsAt,end);
  const hand=a.hand.map(c=>c.uid);a.mulliganStartedAt=Date.now()-46000;syncTurnClock(room,expireTurn);expireTurn(room);
  assert.equal(a.mulliganReady,true);assert.equal(b.mulliganReady,false);assert.deepEqual(a.hand.map(c=>c.uid),hand);
  act(room,b,{type:'openingReady'},catalog);b.mulliganStartedAt=Date.now()-46000;syncTurnClock(room,expireTurn);expireTurn(room);assert.equal(room.phase,'prep');
 }finally{close(room);}
});
test('an absent client has a bounded grace period and then keeps its current hand',()=>{
 const {room,a,b}=match();try{room.mulliganPresentationEndsAt=Date.now()-46000;syncTurnClock(room,expireTurn);const ids=b.hand.map(c=>c.uid);expireTurn(room);assert.equal(room.phase,'prep');assert.ok(a.mulliganReady&&b.mulliganReady);assert.ok(ids.every(id=>b.hand.some(c=>c.uid===id)));}finally{close(room);}
});
test('opening songs rotate autonomously while players are choosing, without repeats',async()=>{
 const {room}=match();try{
  const first=room.music.trackId,track=music.tracks.find(t=>t.id===first);enableMusicClock(room);
  room.music.since=Date.now()-track.durationSeconds*1000+MUSIC_RULES.crossfadeMs+120;syncMusic(room);
  const revision=room.revision;await new Promise(r=>setTimeout(r,230));
  assert.equal(room.music.stage,'opening');assert.notEqual(room.music.trackId,first);assert.ok(room.revision>revision);assert.equal(new Set(room.music.playedTrackIds).size,room.music.playedTrackIds.length);
 }finally{close(room);}
});
const returns=vm.runInNewContext(fs.readFileSync(new URL('./combat-return.js',import.meta.url),'utf8')+';RunaCombatReturn',{});
test('return selection excludes deaths, anchored formations and emanations; uses the returning owner',()=>{
 const s={phase:'prep',players:[{id:'a',patron:{affinity:'forja'},reserve:[{uid:'alive'},{uid:'anchor'},{uid:'aura'}],formation:['anchor'],emanation:['aura']},{id:'b',patron:{affinity:'ruptura'},reserve:[{uid:'swapped'}],formation:[],emanation:[]}]};
 const snapshots=['alive','anchor','dead','aura','swapped','alive'].map(uid=>({uid})),result=returns.candidates(s,snapshots);
 assert.deepEqual(Array.from(result,x=>[x.uid,x.owner,x.style]),[['alive','a','forge'],['swapped','b','chain']]);
 assert.equal(returns.styleFor({affinity:'fluxo'}),'ether');assert.equal(returns.styleFor({affinity:'future'}),'gentle');
 assert.equal(returns.candidates({...s,phase:'finished'},snapshots).length,0);
});
