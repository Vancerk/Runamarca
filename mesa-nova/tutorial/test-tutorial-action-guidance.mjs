import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {createGuidedTutorial} from './tutorial-first-duel.mjs';
import {mergeGuideCounts} from './tutorial-guidance.mjs';
import {clock,setup,explain,humanAction,finish} from './tutorial-test-helpers.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('./cartas.json',import.meta.url)));
test('actionable opening advances only after a valid real play; retries and duplicate receipts do not count',()=>{
 const f=setup(1);try{explain(f);let t=f.session.view().tutorial;assert.equal(t.instruction.id,'play-creature');assert.equal(t.clock.paused,false);
 const counts=structuredClone(t.guidance.counts),expensive=f.session.player.hand.find(c=>c.cost>f.session.player.mana);
 assert.throws(()=>f.send({type:'play',cardId:expensive.uid}));assert.deepEqual(f.session.view().tutorial.guidance.counts,counts);
 assert.throws(()=>f.send({type:'tutorialContinue',sceneId:'play-creature'}));
 for(let i=0;i<100;i++)f.session.view();assert.deepEqual(f.session.view().tutorial.guidance.counts,counts);
 const card=f.session.player.hand.find(c=>c.cost<=f.session.player.mana),request={id:'one-play',version:f.session.view().tutorial.version,action:{type:'play',cardId:card.uid}};
 f.session.command(f.session.player,request);t=f.session.view().tutorial;assert.equal(t.guidance.counts['play-creature'],1);assert.equal(t.instruction.id,'end-preparation');assert.match(t.instruction.text,/aguarda aqui/);assert.equal(t.clock.paused,false);
 f.session.command(f.session.player,request);assert.equal(f.session.view().tutorial.guidance.counts['play-creature'],1);
 }finally{f.session.dispose();}
});
test('first three real opportunities count once each; fourth has no automatic basic concept guide',async()=>{
 const f=setup(1,{opponentHealth:100});const rounds=new Map();try{
  await finish(f,'alternate',(f,a)=>{const v=f.session.view(),g=v.tutorial.guidance.counts;if(a&&v.round<=5){const k=v.round+':'+a.type;rounds.set(k,{count:{...g},guide:v.tutorial.instruction?.id});}if(a?.type==='assign'&&v.round===1){const before=JSON.stringify(g);assert.throws(()=>f.send({type:'assign',cardId:a.cardId,lane:99}));assert.equal(JSON.stringify(f.session.view().tutorial.guidance.counts),before);}});
  const counts=f.session.view().tutorial.guidance.counts;
  for(const key of ['play-creature','formation','confirm-formation','end-preparation','mana','reserve','vote'])assert.equal(counts[key],3,key);
  const fourth=[...rounds].filter(([k])=>k.startsWith('4:'));assert.ok(fourth.length);
  assert.ok(fourth.every(([,r])=>!['play-creature','formation','confirm-formation','end-preparation','mana','reserve','vote'].includes(r.guide)));
 }finally{f.session.dispose();}
});
test('reload/restore preserves pending opportunity, counts and exactly-once receipts, paused',()=>{
 const f=setup(1);explain(f);const card=f.session.player.hand.find(c=>c.cost<=f.session.player.mana),request={id:'saved-action',version:f.session.view().tutorial.version,action:{type:'play',cardId:card.uid}};
 f.session.command(f.session.player,request);const before=f.session.view().tutorial,snapshot=JSON.parse(JSON.stringify(f.session.snapshot()));f.session.dispose();f.time.tick(999999);
 const restored=createGuidedTutorial({catalog,duel:1,restore:snapshot,clock:f.time,delay:5});try{const v=restored.view().tutorial;assert.equal(v.clock.paused,true);assert.equal(v.instruction.key,before.instruction.key);assert.deepEqual(v.guidance.counts,before.guidance.counts);restored.command(restored.player,request);assert.deepEqual(restored.view().tutorial.guidance.counts,before.guidance.counts);}finally{restored.dispose();}
});
test('campaign count merge never loses practice or revives fourth automatic reminder',()=>{
 assert.deepEqual(mergeGuideCounts({'mana':2},{'mana':3,'formation':7}),{mana:3,formation:3});
 const f=setup(1,{guidanceCounts:{objective:3,'play-creature':3,mana:3,'end-preparation':3}});try{assert.equal(f.session.view().tutorial.instruction,null);assert.equal(f.session.view().tutorial.clock.paused,false);}finally{f.session.dispose();}
});
for(const duel of [1,2,3])test(`duel ${duel} supports legitimate victory and alternative positions with new health`,async()=>{
 const f=setup(duel);try{const expected=[8,12,16][duel-1];assert.equal(f.session.room.players[1].patron.hp,expected);assert.equal(f.session.player.patron.hp,16);const v=await finish(f,'alternate');assert.equal(v.tutorial.status,'won');assert.equal(v.winner,v.you);assert.ok(v.players[1].patron.hp<=0);if(duel===2)assert.ok(v.tutorial.goals.some(g=>!g.complete),'Winning must not require all spell effects');}finally{f.session.dispose();}
});
