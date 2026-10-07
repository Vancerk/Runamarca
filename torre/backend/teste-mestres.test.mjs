import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {newDb} from 'pg-mem';
import {MASTER_TEST_PLAN,masterTestRunner} from './teste-mestres.mjs';
import {createStore} from './relatorios-core.mjs';
import {executeClaimedFlow} from '../fluxo-solicitado.mjs';
import {MASTER_JOB_ID} from '../mestres-solicitado.mjs';
test('campaign sends exact authorized counts, persists normal decisions and never repeats on restart',async t=>{
 const folder=mkdtempSync(join(tmpdir(),'masters-campaign-'));t.after(()=>rmSync(folder,{recursive:true,force:true}));let sends=0;
 const author={id:'fixture',name:'Teste',player:'van',level:1,discordId:'1080332488070672484'};
 const store=createStore({file:join(folder,'reports.json'),masters:MASTER_TEST_PLAN.map(m=>({id:m.id,name:m.name})),zones:new Set(['1720','2824']),characters:{snapshots:()=>[author]},send:async r=>{sends++;assert.ok(MASTER_TEST_PLAN.some(m=>m.id===r.masterId));return {id:'message-'+sends,channel_id:'dm'};}});
 const pg=newDb({noAstCoverageCheck:true}).adapters.createPg(),pool=new pg.Pool(),db={query:(...a)=>pool.query(...a)},tower={waitReady:async()=>{},metrics:()=>({httpRequests:sends}),submit:async(b,start)=>{start();return store.submit(b);}};
 try{const runner=masterTestRunner(['1720','2824'],author),result=await executeClaimedFlow(db,tower,{jobId:MASTER_JOB_ID,runner});assert.equal(sends,60);assert.deepEqual(result.stages.map(s=>[s.stage,s.acceptedByDiscord]),[['Kallisto',5],['Kagami',10],['Van',25],['Reverso',10],['Ravena',10]]);assert.equal(store.index().length,0);assert.ok(!result.samples.some(s=>s.masterId==='663696447522340866'));const id=result.samples[0].id;assert.throws(()=>store.decide({id,version:1,userId:'1080332488070672484',messageId:'message-1',action:'approve'}),{status:403});store.decide({id,version:1,userId:MASTER_TEST_PLAN[0].id,messageId:'message-1',action:'correct',reason:'Corrigir a data'});assert.equal(store.notification(id).authorDiscordId,'1080332488070672484');assert.ok(store.notification(id).editReceipt);assert.equal((await executeClaimedFlow(db,tower,{jobId:MASTER_JOB_ID,runner})).skipped,true);assert.equal(sends,60);}finally{await pool.end();}
});
test('blocked DMs count as failures per master and do not claim delivery',async()=>{
 const result=await masterTestRunner(['1720'],{id:'fixture'})({record:async()=>{},submit:async(body,start)=>{start();return {status:body.masterId===MASTER_TEST_PLAN[0].id?'delivery_failed':'pending',deliveryError:body.masterId===MASTER_TEST_PLAN[0].id?'DM bloqueada':undefined};}});assert.equal(result.stages[0].failed,5);assert.equal(result.stages[0].acceptedByDiscord,0);assert.equal(result.stages[1].acceptedByDiscord,10);
});
