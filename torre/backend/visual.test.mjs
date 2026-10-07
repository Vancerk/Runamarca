import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {newDb} from 'pg-mem';
import {createCharacters} from './personagens.mjs';
import {createStore} from './relatorios-core.mjs';
import {visualRunner} from './visual.mjs';
import {executeClaimedFlow} from '../fluxo-solicitado.mjs';
import {VISUAL_JOB_ID} from '../visual-solicitado.mjs';
const master='1080332488070672484';
test('visual batch uses real report store; approvals publish, refusals stay private and correction can resubmit',async t=>{
 const folder=mkdtempSync(join(tmpdir(),'torre-visual-'));t.after(()=>rmSync(folder,{recursive:true,force:true}));
 const characters=createCharacters({folder,root:join(folder,'public'),python:'unused',extractor:'unused'}),author=characters.ensureVisualTestAuthor();
 assert.equal(characters.ensureVisualTestAuthor().id,author.id);assert.equal(characters.list().length,1);
 const restored=createCharacters({folder,root:join(folder,'public'),python:'unused',extractor:'unused'});assert.equal(restored.snapshots([author.id])[0].discordId,master);
 const bodies=[];let sent=0;const store=createStore({file:join(folder,'reports.json'),characters,masters:[{id:master,name:'van'}],zones:new Set(['1401','1501','1601']),send:async()=>({id:'message-'+(++sent),channel_id:'dm'})});
 const pg=newDb({noAstCoverageCheck:true}).adapters.createPg(),pool=new pg.Pool(),db={query:(...args)=>pool.query(...args)},runner=visualRunner(['1401','1501','1601'],author);
 try{const tower={waitReady:async()=>{},metrics:()=>({httpRequests:sent}),submit:async(body,start)=>{bodies.push(body);start();return store.submit(body);}};
 const result=await executeClaimedFlow(db,tower,{jobId:VISUAL_JOB_ID,runner});assert.equal(result.stages[0].acceptedByDiscord,3);assert.equal(store.adminList().length,3);assert.equal(store.index().length,0);assert.deepEqual(bodies.map(b=>b.hex),['1401','1501','1601']);assert.ok(result.samples.every(s=>s.arrivalMs===0));
 const records=store.adminList();store.decide({id:records[0].id,version:1,userId:master,messageId:'message-1',action:'approve'});assert.equal(store.index().length,1);assert.equal(store.index()[0].hex,'1401');
 store.decide({id:records[1].id,version:1,userId:master,messageId:'message-2',action:'reject',reason:'Teste de encerramento'});assert.equal(store.index().length,1);
 store.decide({id:records[2].id,version:1,userId:master,messageId:'message-3',action:'correct',reason:'Ajustar a data'});const notice=store.notification(records[2].id);assert.equal(notice.authorDiscordId,master);assert.ok(notice.editReceipt);const revision=await store.revise(records[2].id,notice.editReceipt,{...bodies[2],expectedVersion:1,narrative:'Relato fictício corrigido conforme solicitado.'});assert.equal(revision.status,'pending');assert.equal(revision.version,2);
 const again=await executeClaimedFlow(db,tower,{jobId:VISUAL_JOB_ID,runner});assert.equal(again.skipped,true);assert.equal(sent,4);
 }finally{await pool.end();}
});
test('visual runner does not duplicate zones and records delivery failures honestly',async()=>{
 assert.throws(()=>visualRunner(['1401','1401'],{id:'test'}));let count=0;const result=await visualRunner(['1401','1501'],{id:'test'})({record:async()=>{},submit:async(body,start)=>{assert.equal(body.masterId,master);start();if(++count===1)return {status:'delivery_unknown'};throw Error('offline');}});assert.equal(result.stages[0].acceptedByDiscord,0);assert.equal(result.stages[0].failed,2);
});
