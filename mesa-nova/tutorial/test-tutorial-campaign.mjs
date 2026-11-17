import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {createGuidedTutorial,tutorialCatalog} from './tutorial-first-duel.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('./cartas.json',import.meta.url)));
function clock(){let now=1e6,n=0;const jobs=new Map();return {now:()=>now,setTimeout(fn,ms){jobs.set(++n,{fn,at:now+ms});return n;},clearTimeout:id=>jobs.delete(id),tick(ms){const end=now+ms;let max=1e4;while(max--){const job=[...jobs].filter(([,j])=>j.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!job)break;jobs.delete(job[0]);now=job[1].at;job[1].fn();}if(max<0)throw Error('loop');now=end;}};}
function setup(duel,extra={}){const time=clock(),session=createGuidedTutorial({code:'DUEL'+duel+'A',name:'Aprendiz',catalog,duel,clock:time,delay:5,...extra});let n=0;return {time,session,send(action){return session.command(session.player,{id:'test-'+(++n),version:session.view().tutorial.version,action});},async tick(ms=20){time.tick(ms);for(let i=0;i<15;i++)await Promise.resolve();}};}
function lessons(f){let n=20;while(f.session.view().tutorial.instruction?.kind==='explain'){assert.ok(n--);f.send({type:'tutorialContinue',sceneId:f.session.view().tutorial.instruction.id});}}
const done=(f,id)=>f.session.view().tutorial.goals.some(g=>g.id===id&&g.complete);
const alive=c=>c.damage<c.health;
function humanAction(f,{miss=false}={}){const {room,player:p}=f.session;
 if(room.phase==='mulligan')return {type:'confirmMulligan'};
 if(room.phase==='prep'&&room.turn===p.id){
  const affordable=id=>p.hand.find(c=>c.modelId===id&&c.cost<=p.mana&&(c.type!=='creature'||p.reserve.filter(c=>alive(c)&&!p.emanation.includes(c.uid)).length<8)),target=p.reserve.find(alive);let c;
  if((c=affordable('T2-BUFF'))&&target&&!done(f,'direct-spell'))return {type:'play',cardId:c.uid,mode:'direct',targetId:target.uid};
  if((c=affordable('T2-BUFF'))&&done(f,'direct-spell')&&!done(f,'prepare-spell'))return {type:'play',cardId:c.uid,mode:'lane',lane:1,targetSide:p.id};
  if((c=affordable('T2-ENTRY'))&&!done(f,'entry'))return {type:'play',cardId:c.uid};
  if((c=affordable('T2-REVEAL'))&&!p.reserve.some(c=>c.modelId==='T2-REVEAL'&&alive(c)))return {type:'play',cardId:c.uid};
  if((c=affordable('T3-SUPPORT'))&&!done(f,'emanation'))return {type:'play',cardId:c.uid,mode:'emanate'};
  if(done(f,'emanation')&&!done(f,'patron-power')&&p.mana>=2)return {type:'patronPower',powerId:'forjar-armadura'};
  c=p.reserve.filter(c=>alive(c)&&!p.emanation.includes(c.uid)).length<8&&p.hand.find(c=>c.type==='creature'&&c.cost<=p.mana);return c?{type:'play',cardId:c.uid}:{type:'endPrep'};
 }
 if(room.phase==='vote'&&p.vote===null)return {type:'vote',fight:true};
 if(room.phase==='formation'&&!p.ready){
  const units=p.reserve.filter(c=>alive(c)&&!p.emanation.includes(c.uid));const needRevelation=f.session.view().tutorial.duel===2&&!done(f,'revelation');
  const chosen=needRevelation?(units.find(c=>c.modelId==='T2-REVEAL')?[units.find(c=>c.modelId==='T2-REVEAL'),units.find(c=>c.modelId!=='T2-REVEAL'&&c.attack<=2)].filter(Boolean):units.slice(0,1)):units.slice(0,3);
  const order=miss&&!done(f,'activate-prepared')&&room.combatCount===2?[0,2]:[1,0,2];
  const c=chosen.find(c=>!p.formation.includes(c.uid)),lane=order.find(i=>!p.formation[i]);return c&&lane!==undefined?{type:'assign',cardId:c.uid,lane}:{type:'ready'};
 }
 return null;
}
for(const duel of [2,3])test('duel '+duel+' uses real rules and reaches all goals and victory',async()=>{const f=setup(duel);try{
 let i=0;while(f.session.view().tutorial.status==='active'&&i++<2000){lessons(f);const action=humanAction(f,{miss:duel===2});if(action)f.send(action);else await f.tick(f.session.room.phase==='resolving'?100000:20);}
 const state=f.session.view();console.log(JSON.stringify({duel,round:state.round,status:state.tutorial.status,goals:state.tutorial.goals,lessons:state.tutorial.lessons}));
 assert.equal(state.tutorial.status,'won');assert.equal(state.tutorial.goals.every(g=>g.complete),true);
 }finally{f.session.dispose();}});
test('five-card opening allows optional one-time 3/4 swap and deterministic replacement',()=>{
 for(const first of [true,false]){const f=setup(2,{first});try{lessons(f);const p=f.session.player,v=f.session.view().players.find(p=>p.id===f.session.player.id);assert.equal(p.hand.length,5);assert.equal(v.mulliganLimit,first?3:4);
 const keep=p.hand.at(-1).uid;f.send({type:'mulligan',cardIds:p.hand.slice(0,first?3:4).map(c=>c.uid)});assert.equal(p.hand.length,5);assert.ok(p.hand.some(c=>c.uid===keep));assert.equal(p.mulligansLeft,0);assert.equal(p.hand.at(-1).modelId,first?'T2-H-1':'T2-ENTRY');
 assert.throws(()=>f.send({type:'mulligan',cardIds:[p.hand[0].uid]}));
 }finally{f.session.dispose();}}
});
test('checkpoint restores scene and exactly-once receipts with no offline advancement',()=>{
 const f=setup(2);const request={id:'persisted',version:f.session.view().tutorial.version,action:{type:'confirmMulligan'}};f.session.command(f.session.player,request);const snapshot=JSON.parse(JSON.stringify(f.session.snapshot()));const hand=snapshot.room.players[0].hand.map(c=>c.uid);f.session.dispose();f.time.tick(999999);
 const restored=createGuidedTutorial({catalog,duel:2,restore:snapshot,clock:f.time,delay:5});try{assert.equal(restored.view().tutorial.clock.paused,true);assert.deepEqual(restored.player.hand.map(c=>c.uid),hand);const before=restored.view().tutorial.version;restored.command(restored.player,request);assert.equal(restored.view().tutorial.version,before);assert.equal(restored.view().serverNow,snapshot.control.clock.now);}finally{restored.dispose();}
});
test('checkpoint in combat restores remaining logical time and commits damage only once',async()=>{
 const f=setup(3);let snapshot;try{let i=0;while(f.session.room.phase!=='resolving'&&i++<100){lessons(f);const a=humanAction(f);if(a)f.send(a);else await f.tick();}assert.equal(f.session.room.phase,'resolving');await f.tick(500);snapshot=JSON.parse(JSON.stringify(f.session.snapshot()));}finally{f.session.dispose();}
 f.time.tick(500000);const restored=createGuidedTutorial({catalog,duel:3,restore:snapshot,clock:f.time,delay:5});try{
 const count=snapshot.room.combatCount;assert.equal(restored.room.combatCount,count);const id=restored.room.combat.id;assert.equal(id,snapshot.room.combat.id);
 f.time.tick(500000);assert.equal(restored.room.combatCount,count);restored.command(restored.player,{id:'resume',version:restored.view().tutorial.version,action:{type:'tutorialResume'}});
 f.time.tick(100000);for(let i=0;i<15;i++)await Promise.resolve();assert.equal(restored.room.combatCount,count+1);f.time.tick(500000);assert.equal(restored.room.combatCount,count+1);
 }finally{restored.dispose();}
});

test('preparation instruction remains actionable until a valid prepared spell, with no confirmation detour',async()=>{
 const f=setup(2);try{
  let attempts=0;while(f.session.view().tutorial.instruction?.id!=='prepare-spell'&&attempts++<300){
   lessons(f);if(f.session.view().tutorial.instruction?.id==='prepare-spell')break;
   const a=humanAction(f);if(a)f.send(a);else await f.tick(f.session.room.phase==='resolving'?100000:20);
  }
  const note=f.session.view().tutorial.instruction;assert.equal(note?.id,'prepare-spell');assert.equal(note.kind,'action');assert.equal(f.session.view().tutorial.clock.paused,false);
  const before={...f.session.view().tutorial.guidance.counts};assert.throws(()=>f.send({type:'play',cardId:note.cardId,mode:'lane',lane:99,targetSide:f.session.player.id}));assert.deepEqual(f.session.view().tutorial.guidance.counts,before);
  f.send({type:'play',cardId:note.cardId,mode:'lane',lane:2,targetSide:f.session.player.id});assert.equal(f.session.view().tutorial.guidance.counts['prepare-spell'],(before['prepare-spell']||0)+1);
 }finally{f.session.dispose();}
});
