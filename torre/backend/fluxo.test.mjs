import test from 'node:test';
import assert from 'node:assert/strict';
import {newDb} from 'pg-mem';
import {FLOW_SCHEDULE,runFlow} from './fluxo.mjs';
import {executeClaimedFlow,handleFlowResult} from '../fluxo-solicitado.mjs';
test('schedule requests exactly 10 per minute then 20 in ten seconds',()=>{
 assert.equal(FLOW_SCHEDULE.length,30);assert.deepEqual(FLOW_SCHEDULE.slice(0,10).map(s=>s.at),[0,6000,12000,18000,24000,30000,36000,42000,48000,54000]);assert.equal(FLOW_SCHEDULE[10].at,60000);assert.equal(FLOW_SCHEDULE[29].at,69500);
});
test('flow run records acceptance and failures without treating queued delivery as instant',async()=>{
 let clock=0;const result=await runFlow({schedule:[{stage:'20_em_10_segundos',at:0,index:1}],now:()=>clock,sleep:async ms=>clock+=ms,submit:async(body,start)=>{assert.equal(body.masterId,'1080332488070672484');clock+=5;start();clock+=10;return {status:'pending',messageId:'test-message'};}});assert.equal(result.samples[0].queueMs,5);assert.equal(result.samples[0].totalMs,15);assert.equal(result.stages[1].acceptedByDiscord,1);
});
test('Neon claim makes the campaign run once even after another startup',async()=>{
 const pg=newDb({noAstCoverageCheck:true}).adapters.createPg(),pool=new pg.Pool();let sends=0;const db={query:(...args)=>pool.query(...args)};const tower={waitReady:async()=>{},metrics:()=>({httpRequests:sends}),submit:async(_body,start)=>{start();sends++;return {status:'pending',messageId:'m'+sends};}};
 try{const schedule=FLOW_SCHEDULE.map(s=>({...s,at:0}));const a=await executeClaimedFlow(db,tower,{schedule}),b=await executeClaimedFlow(db,tower,{schedule});assert.equal(a.status,'completed');assert.equal(a.stages[0].acceptedByDiscord,10);assert.equal(a.stages[1].acceptedByDiscord,20);assert.equal(sends,30);assert.equal(b.skipped,true);const {rows}=await pool.query('SELECT payload FROM elysium_torre_flow_runs');assert.equal(rows[0].payload.samples.length,30);}finally{await pool.end();}
});
test('result receipt cannot trigger a run and a forged receipt cannot read results',async()=>{
 let code;const res={writeHead:status=>code=status,end(){}};await handleFlowResult({method:'GET',headers:{'x-flow-receipt':'0'.repeat(64)}},res,new URL('http://local/api/torre-flow-result'));assert.equal(code,403);
});
