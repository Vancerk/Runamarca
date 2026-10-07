import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createStore} from './relatorios-core.mjs';
function fixture(t,send=async()=>({id:'message-1',channel_id:'channel-1'}),ready=()=>true){const folder=mkdtempSync(join(tmpdir(),'legion-tests-'));t.after(()=>rmSync(folder,{recursive:true,force:true}));const options={file:join(folder,'reports.json'),masters:[{id:'master-1',name:'Mestre'}],zones:new Set(['1720']),send,ready};return {store:createStore(options),options};}
const body=()=>({submissionKey:randomUUID(),hex:'1720',title:'Missão',date:'2026-10-02',participants:['Jogador'],authorName:'Jogador',authorCharacterId:'author-1',authorDiscordId:'1080332488070672484',masterId:'master-1',narrative:'Um relato de missão suficientemente longo.'});
test('aprovação exige mestre, mensagem e versão; pendentes não são públicos',async t=>{const {store,options}=fixture(t);const r=await store.submit(body());assert.equal(r.status,'pending');assert.deepEqual(store.list(),[]);assert.throws(()=>store.own(r.id,'wrong'),{status:403});assert.throws(()=>store.decide({id:r.id,version:1,action:'approve',userId:'intruso',messageId:'message-1'}),{status:403});assert.throws(()=>store.decide({id:r.id,version:1,action:'approve',userId:'master-1',messageId:'wrong'}),{status:403});assert.throws(()=>store.decide({id:r.id,version:0,action:'approve',userId:'master-1',messageId:'message-1'}),{status:409});store.decide({id:r.id,version:1,action:'approve',userId:'master-1',messageId:'message-1'});const publicReport=store.list()[0];assert.equal(publicReport.status,'approved');for(const secret of ['receipt','editReceipt','authorDiscordId','versions','submissionKey','masterId','channelId','messageId'])assert.equal(secret in publicReport,false);assert.throws(()=>store.decide({id:r.id,version:1,action:'reject',reason:'Esta missão não ocorreu.',userId:'master-1',messageId:'message-1'}),{status:409});assert.equal(createStore(options).list().length,1);});
test('correção exige novo aval e invalida a versão anterior',async t=>{let n=0;const {store}=fixture(t,async()=>({id:'message-'+ ++n,channel_id:'channel-1'}));const b=body(),r=await store.submit(b);store.decide({id:r.id,version:1,action:'correct',reason:'Corrija a data da sessão.',userId:'master-1',messageId:'message-1'});const changed=await store.revise(r.id,store.notification(r.id).editReceipt,{...b,expectedVersion:1,narrative:'Novo relato corrigido da missão e dos participantes.'});assert.equal(changed.version,2);assert.deepEqual(store.list(),[]);assert.throws(()=>store.decide({id:r.id,version:1,action:'approve',userId:'master-1',messageId:'message-1'}));store.decide({id:r.id,version:2,action:'approve',userId:'master-1',messageId:'message-2'});assert.equal(store.list()[0].narrative,changed.narrative);});
test('rejeição permanece privada',async t=>{const {store}=fixture(t);const r=await store.submit(body());store.decide({id:r.id,version:1,action:'reject',reason:'Esta missão não ocorreu.',userId:'master-1',messageId:'message-1'});assert.deepEqual(store.list(),[]);await assert.rejects(store.revise(r.id,r.receipt,body()),{status:409});});
test('falha de entrega e bot desconectado nunca publicam',async t=>{const error=Object.assign(new Error('refused'),{definite:true,publicMessage:'Envio recusado'});const {store}=fixture(t,async()=>{throw error;});const r=await store.submit(body());assert.equal(r.status,'delivery_failed');assert.deepEqual(store.list(),[]);const offline=fixture(t,undefined,()=>false).store;await assert.rejects(offline.submit(body()),{status:503});});
test('repetir a mesma requisição não envia DM duplicada',async t=>{let n=0;const {store}=fixture(t,async()=>({id:'message-'+ ++n,channel_id:'channel-1'}));const b=body();const [a,c]=await Promise.all([store.submit(b),store.submit(b)]);assert.equal(a.id,c.id);assert.equal(n,1);await assert.rejects(store.submit({...b,title:'Mudou'}),{status:409});});
test('validação rejeita data e mestre inválidos antes de enviar',async t=>{let n=0;const {store}=fixture(t,async()=>{n++;});await assert.rejects(store.submit({...body(),date:'2026-02-31'}),{status:400});await assert.rejects(store.submit({...body(),masterId:'inventado'}),{status:400});await assert.rejects(store.submit({...body(),hex:'0000'}),{status:400});assert.equal(n,0);});

test('apenas o link privado permite corrigir; autor imutável e links de versões antigas são bloqueados',async t=>{
 let n=0;const {store,options}=fixture(t,async()=>({id:'message-'+ ++n,channel_id:'channel-1'}));const b=body(),r=await store.submit(b);
 await assert.rejects(store.revise(r.id,r.receipt,{...b,expectedVersion:1}),{status:409});
 assert.throws(()=>store.decide({id:r.id,version:1,action:'correct',userId:'master-1',messageId:'message-1'}),{status:400});
 store.decide({id:r.id,version:1,action:'correct',reason:'Corrigir data e participantes.',userId:'master-1',messageId:'message-1'});
 const edit=store.notification(r.id).editReceipt;
 assert.equal(store.own(r.id,r.receipt).canEdit,false);assert.equal(store.own(r.id,edit).canEdit,true);
 assert.equal('editReceipt' in store.own(r.id,r.receipt),false);
 await assert.rejects(store.revise(r.id,r.receipt,{...b,expectedVersion:1}),{status:403});
 await assert.rejects(store.revise(r.id,edit,{...b,expectedVersion:1,authorDiscordId:'992870741202702356'}),{status:400});
 await assert.rejects(store.revise(r.id,edit,{...b,expectedVersion:0}),{status:409});
 await store.revise(r.id,edit,{...b,expectedVersion:1,title:'Título corrigido'});
 assert.throws(()=>store.own(r.id,edit),{status:403});
 const saved=JSON.parse(readFileSync(options.file,'utf8'))[0];assert.equal(saved.versions[0].title,b.title);assert.equal(saved.versions[0].decisionReason,'Corrigir data e participantes.');
 store.decide({id:r.id,version:2,action:'correct',reason:'Mais um ajuste.',userId:'master-1',messageId:'message-2'});
 const second=store.notification(r.id).editReceipt;assert.notEqual(edit,second);
 await store.revise(r.id,second,{...b,expectedVersion:2});
 store.decide({id:r.id,version:3,action:'approve',userId:'master-1',messageId:'message-3'});
 await assert.rejects(store.revise(r.id,r.receipt,{...b,expectedVersion:3}),{status:409});assert.equal(store.list().length,1);
});

test('falha da DM de correção não desfaz decisão nem publica; destinatário e segredo permanecem privados',async t=>{
 const {store,options}=fixture(t);const r=await store.submit(body());
 store.decide({id:r.id,version:1,action:'correct',reason:'Corrigir relato.',userId:'master-1',messageId:'message-1'});
 store.notificationResult(r.id,'DM recusada');const restored=createStore(options);
 assert.equal(restored.own(r.id,r.receipt).status,'correction_requested');assert.equal(restored.own(r.id,r.receipt).notificationError,'DM recusada');assert.deepEqual(restored.list(),[]);
 assert.equal(restored.notification(r.id).authorDiscordId,'1080332488070672484');assert.equal('authorDiscordId' in restored.own(r.id,r.receipt),false);
 assert.throws(()=>restored.checkNotification({id:r.id,version:1,userId:'intruso',messageId:'message-1'}),{status:403});
});



test('gravação durável antecede a DM e é confirmada antes de responder',async t=>{
 const {options}=fixture(t);const steps=[];const store=createStore({...options,durable:async()=>steps.push(JSON.parse(readFileSync(options.file,'utf8'))[0].status),send:async()=>{steps.push('discord');return {id:'message',channel_id:'channel'};}});await store.submit(body());assert.deepEqual(steps,['sending','discord','pending']);
});
test('falha no banco antes da entrega não envia mensagem ao mestre',async t=>{
 const {options}=fixture(t);let sends=0;const store=createStore({...options,durable:async()=>{throw Error('Banco indisponível');},send:async()=>{sends++;}});await assert.rejects(store.submit(body()),/Banco indisponível/);assert.equal(sends,0);assert.deepEqual(store.list(),[]);
});
