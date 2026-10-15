import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createStore} from './relatorios-core.mjs';
const owner='111111111111111111',other='222222222222222222';
test('envio deriva identidade, rejeita outra carta; link permite leitura mas só o autor corrige',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'author-identity-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));const cards=[{id:'own',name:'Herói',player:'Pessoa',discordId:owner,level:1},{id:'other',name:'Outro',player:'Outra',discordId:other,level:1}],characters={list:()=>cards,snapshots:ids=>ids.map(id=>cards.find(c=>c.id===id)),bindDiscord:()=>{}};let sends=0;
 const store=createStore({file:join(dir,'r.json'),masters:[{id:'master',name:'Mestre'}],zones:new Set(['1720']),requireAuthorIdentity:true,characters,send:async()=>({id:'message-'+ ++sends,channel_id:'channel'})});
 const body={submissionKey:randomUUID(),hex:'1720',title:'Teste de identidade',date:'2026-10-15',masterId:'master',participantIds:[],narrative:'Um relato fictício suficientemente longo para o teste.'};await assert.rejects(store.submit(body),{status:401});await assert.rejects(store.submit({...body,authorCharacterId:'other'},owner),{status:403});await assert.rejects(store.submit({...body,authorDiscordId:other},owner),{status:403});assert.equal(sends,0);
 const r=await store.submit(body,owner);assert.equal(r.authorCard.id,'own');assert.equal(store.notification(r.id).authorDiscordId,owner);store.decide({id:r.id,version:1,action:'correct',reason:'Corrigir data.',userId:'master',messageId:'message-1'});const secret=store.notification(r.id).editReceipt;
 assert.equal(store.detail(r.id,secret).canEdit,false);assert.equal(store.detail(r.id,secret,other).canEdit,false);assert.equal(store.detail(r.id,secret,owner).canEdit,true);assert.equal(store.detail(r.id,secret,other).title,body.title);
 await assert.rejects(store.revise(r.id,secret,{...body,authorCharacterId:'own',expectedVersion:1}),{status:401});await assert.rejects(store.revise(r.id,secret,{...body,authorCharacterId:'own',expectedVersion:1},other),{status:403});const revised=await store.revise(r.id,secret,{...body,authorCharacterId:'own',expectedVersion:1},owner);assert.equal(revised.version,2);assert.equal(revised.status,'pending');assert.throws(()=>store.detail(r.id,secret,owner),{status:403});assert.equal(sends,2);
});
