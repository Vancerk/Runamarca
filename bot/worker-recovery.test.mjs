import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {fileURLToPath} from 'node:url';
import {createGameBotBridge} from './game-bridge/bridge.mjs';
import {createAsyncGameBotBridge} from './game-bridge/async-bridge.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),snapshot=fileURLToPath(new URL('./runner/source/',import.meta.url));
const catalog=JSON.parse(fs.readFileSync(snapshot+'mesa-nova/cartas.json'));
test('host identity requires explicit absolute root; mismatch rejected, valid accepted',async()=>{
 const options={enabled:true,host:{view(){},easyBotAction(){}},source:snapshot,catalog};
 for(const create of [createGameBotBridge,createAsyncGameBotBridge])await assert.rejects(create(options),/hostSourceRoot/);
 assert.equal((await createGameBotBridge({...options,hostSourceRoot:root})).enabled,true);
 await assert.rejects(createGameBotBridge({...options,hostSourceRoot:root+'/missing'}));
});
async function fixture(){
 const text=fs.readFileSync(new URL('./game-bridge/async-bridge.mjs',import.meta.url),'utf8')
 .replace("import {Worker} from 'node:worker_threads';","import {Worker as RealWorker} from 'node:worker_threads';export const workerStats={live:0,peak:0,created:0};class Worker extends RealWorker{constructor(...args){super(...args);workerStats.created++;workerStats.live++;workerStats.peak=Math.max(workerStats.peak,workerStats.live);this.once('exit',()=>workerStats.live--);}}")
 .replace("'../runner/lib/decision-core.mjs'",JSON.stringify(new URL('./runner/lib/decision-core.mjs',import.meta.url).href))
 .replace("new URL('./worker.mjs',import.meta.url)",'new URL('+JSON.stringify(new URL('./tests/stall-worker-fixture.mjs',import.meta.url).href)+')');
 const mod=await import('data:text/javascript;base64,'+Buffer.from(text).toString('base64'));
 const host={easyBotAction(){throw Error('Unexpected legacy');},view:r=>({you:r.players[0].id,phase:r.phase,turn:r.turn,players:r.players.map((p,i)=>({id:p.id,handCount:0,deckCount:0,hand:i?[{uid:'SECRET_HAND_FIXTURE'}]:[],deck:i?[{uid:'SECRET_DECK_FIXTURE'}]:[],reserve:[],prepared:[]}))})};
 const bridge=await mod.createAsyncGameBotBridge({host,hostSourceRoot:root,timeoutMs:100,startupTimeoutMs:1000});bridge.fixtureStats=mod.workerStats;return bridge;
}
const room=id=>({revision:1,matchId:'one',phase:'prep',turn:id,players:[{id,bot:true},{id:'rival-'+id}]});
test('hung room quarantined, two other rooms recover exactly once; event loop responsive',async t=>{
 const bridge=await fixture(),bad=room('HANG1'),good=room('GOOD1'),good2=room('GOOD2');
 try{
  const started=performance.now();let tick;
  const timer=new Promise(resolve=>setTimeout(()=>{tick=performance.now()-started;resolve();},10));
  const a=assert.rejects(bridge.nextAction(bad),/deadline/),b=bridge.nextAction(good),c=bridge.nextAction(good2);
  await a;const [rb,rc]=await Promise.all([b,c]);await timer;
  assert.equal(rb.type,'fixture');assert.equal(rc.type,'fixture');assert.notEqual(rb.id,rc.id);assert.ok(tick<90,'main loop responsive: '+tick);
  await assert.rejects(bridge.nextAction(bad),/quarantined/);
  assert.equal((await bridge.nextAction(room('LATER'))).type,'fixture');
  assert.equal(bridge.fixtureStats.peak,1);t.diagnostic('timer10ms observed='+tick.toFixed(2)+'ms; peak workers='+bridge.fixtureStats.peak);
 }finally{await bridge.close();}
});
test('queued stale/cleared/rematched rooms are not applied after recovery',async()=>{
 const bridge=await fixture(),bad=room('HANG2'),a=room('STALE'),b=room('CLEAR'),c=room('REMATCH');
 try{
  const fail=assert.rejects(bridge.nextAction(bad),/deadline/);
  const jobs=[bridge.nextAction(a),bridge.nextAction(b),bridge.nextAction(c)];
  a.revision++;bridge.clear(b);c.matchId='two';
  await fail;assert.deepEqual(await Promise.all(jobs),[null,null,null]);
 }finally{await bridge.close();}
});
test('replacement budget is finite and close during recovery leaves no pending job',async()=>{
 const bridge=await fixture();
 try{
  for(let i=0;i<3;i++){
   const fail=assert.rejects(bridge.nextAction(room('HANG'+i)),/deadline/);
   const queued=bridge.nextAction(room('OK'+i));
   if(i<2){await fail;assert.equal((await queued).type,'fixture');}
   else{const rejected=assert.rejects(queued,/recovery limit/);await fail;await rejected;}
  }
  await assert.rejects(bridge.nextAction(room('END')),/unavailable/);assert.equal(bridge.fixtureStats.peak,1);
 }finally{await bridge.close();}
 const other=await fixture();const bad=assert.rejects(other.nextAction(room('HANG-close')),/deadline/);const queued=other.nextAction(room('QUEUE'));const rejected=assert.rejects(queued,/Bridge closed/);await bad;await other.close();await rejected;
});
