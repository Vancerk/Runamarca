import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createFirstTutorial} from './tutorial-first-duel.mjs';
import {expireTurn} from './game.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('./cartas.json',import.meta.url)));
function clock(){let now=1e6,n=0;const jobs=new Map();return {now:()=>now,setTimeout(fn,ms){jobs.set(++n,{fn,at:now+ms});return n;},clearTimeout:id=>jobs.delete(id),tick(ms){const end=now+ms;let max=10000;while(max--){const job=[...jobs].filter(([,j])=>j.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!job)break;jobs.delete(job[0]);now=job[1].at;job[1].fn();}if(max<0)throw Error('timer loop');now=end;}};}
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
function setup(){const time=clock(),session=createFirstTutorial({code:'FIRST1',name:'Aprendiz',catalog,clock:time,delay:5});let n=0;return {time,session,send(action){return session.command(session.player,{id:'a'+(++n),version:session.view().tutorial.version,action});},async tick(ms=20){time.tick(ms);await flush();}};}
function instructions(f){let max=12;while(f.session.view().tutorial.instruction?.kind==='explain'){assert.ok(max--);f.send({type:'tutorialContinue',sceneId:f.session.view().tutorial.instruction.id});}}
test('controlled opening, genuine pause and untimed preparation',async()=>{const f=setup();try{
 const before=f.session.view();assert.equal(before.phase,'prep');assert.deepEqual(f.session.player.hand.map(c=>c.modelId),['TUT-H-1','TUT-H-2','TUT-H-3']);assert.equal(f.session.player.deck.length,27);assert.equal(before.tutorial.clock.paused,true);assert.equal(before.tutorial.clock.turnsTimed,false);
 const now=before.serverNow;await f.tick(500000);assert.equal(f.session.view().serverNow,now);assert.throws(()=>f.send({type:'endPrep'}),e=>e.code==='TUTORIAL_INSTRUCTION');instructions(f);await f.tick(500000);assert.equal(f.session.room.turn,f.session.player.id);assert.equal(expireTurn(f.session.room),false);assert.throws(()=>f.send({type:'endPrep'}),e=>e.code==='TUTORIAL_FIRST_PLAY');
 }finally{f.session.dispose();}});
test('scene receipts, stale requests and identity do not duplicate progress',()=>{const f=setup();try{
 const request={id:'continue',version:f.session.view().tutorial.version,action:{type:'tutorialContinue',sceneId:'objective'}};f.session.command(f.session.player,request);const v=f.session.view().tutorial.version;f.session.command(f.session.player,request);assert.equal(f.session.view().tutorial.version,v);
 assert.throws(()=>f.session.command(f.session.player,{...request,id:'stale'}),e=>e.code==='TUTORIAL_STALE');assert.throws(()=>f.session.command({...f.session.player},request),e=>e.code==='TUTORIAL_OWNER');assert.equal(f.session.view().tutorial.instruction.id,'play-creature');
 }finally{f.session.dispose();}});
for(const lane of [0,1,2])test('playable to real victory with first house '+lane,async()=>{const f=setup();try{
 let steps=0,first=true,damage=false,completedCombat=false;
 while(f.session.view().tutorial.status==='active'&&steps++<1800){instructions(f);const {room,player}=f.session,npc=room.players[1];damage||=player.patron.hp<16;completedCombat||=room.combatCount>0;
  if(room.phase==='prep'&&room.turn===player.id){const card=player.hand.find(c=>c.cost<=player.mana);if(card)f.send({type:'play',cardId:card.uid});else f.send({type:'endPrep'});}
  else if(room.phase==='vote'&&player.vote===null)f.send({type:'vote',fight:true});
  else if(room.phase==='formation'&&!player.ready){const alive=player.reserve.filter(c=>c.damage<c.health&&!player.emanation.includes(c.uid));const placed=new Set(player.formation.filter(Boolean));const free=[lane,(lane+1)%3,(lane+2)%3].find(i=>!player.formation[i]);const card=alive.find(c=>!placed.has(c.uid));if(card&&free!==undefined)f.send({type:'assign',cardId:card.uid,lane:free});else{f.send({type:'ready'});first=false;}}
  else await f.tick(room.phase==='resolving'?100000:20);
 }
 assert.equal(f.session.view().tutorial.status,'won',JSON.stringify({phase:f.session.room.phase,turn:f.session.room.turn,steps,log:f.session.room.log}));assert.equal(completedCombat,true);assert.equal(first,false);assert.equal(f.session.view().tutorial.goals.every(g=>g.complete),true);assert.ok(f.session.room.players[1].patron.hp<=0);console.log(JSON.stringify({firstHouse:lane,steps,round:f.session.room.round,humanHp:f.session.player.patron.hp,npcDamagedHuman:damage}));
 }finally{f.session.dispose();}});
test('manual pause and disposal prevent NPC work',async()=>{const f=setup();instructions(f);f.send({type:'play',cardId:f.session.player.hand[0].uid});instructions(f);f.send({type:'endPrep'});f.send({type:'tutorialPause'});const rev=f.session.room.revision;await f.tick(500000);assert.equal(f.session.room.revision,rev);assert.equal(f.session.npcDecision(),null);f.session.dispose();await f.tick(500000);assert.equal(f.session.view().tutorial.status,'exited');});
test('late pause and exit are safe, but a stale play still cannot spend or acknowledge a scene',()=>{const f=setup();try{
 const old=f.session.view().tutorial.version;instructions(f);const pause={id:'late-pause',version:old,action:{type:'tutorialPause'}};
 f.session.command(f.session.player,pause);assert.equal(f.session.view().tutorial.clock.paused,true);f.send({type:'tutorialResume'});
 f.session.command(f.session.player,pause);assert.equal(f.session.view().tutorial.clock.paused,false,'receipt cannot pause a second time');
 assert.throws(()=>f.session.command(f.session.player,{id:'late-play',version:old,action:{type:'play',cardId:f.session.player.hand[0].uid}}),e=>e.code==='TUTORIAL_STALE');
 f.send({type:'play',cardId:f.session.player.hand[0].uid});f.session.command(f.session.player,{id:'pause-scene',version:old,action:{type:'tutorialPause'}});assert.equal(f.session.view().tutorial.instruction.id,'end-preparation');
 f.session.command(f.session.player,{id:'late-exit',version:old,action:{type:'tutorialExit'}});assert.equal(f.session.view().tutorial.status,'exited');
 }finally{f.session.dispose();}});
test('NPC waits for formation confirmation and chooses the same lane for different secret placements',async()=>{
 for(const lane of [1,2]){const f=setup();try{
  instructions(f);f.send({type:'play',cardId:f.session.player.hand[0].uid});instructions(f);f.send({type:'endPrep'});
  for(let i=0;i<20&&f.session.room.phase!=='vote';i++)await f.tick();
  instructions(f);f.send({type:'vote',fight:true});instructions(f);assert.equal(f.session.npcDecision(),null);
  f.send({type:'assign',cardId:f.session.player.reserve[0].uid,lane});assert.equal(f.session.npcDecision(),null);
  f.send({type:'ready'});assert.equal(f.session.npcDecision().type,'assign');assert.equal(f.session.npcDecision().lane,0);
 }finally{f.session.dispose();}}
});
