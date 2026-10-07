import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {zoneIndicators,readStamp} from '../public/indicadores.mjs';
import {createStore} from './relatorios-core.mjs';
import {createPublisher} from './publicacao.mjs';
test('leitura remove só o sinal novo; total permanece e nova aprovação volta a sinalizar',()=>{
 const a={id:'a',hex:'1720',version:1,status:'approved',decisionAt:'today'},p={id:'p',hex:'1720',status:'pending'};
 assert.deepEqual(zoneIndicators('1720',[a,a,p]),{total:1,unread:1,pending:1});
 const read={a:readStamp(a)};assert.deepEqual(zoneIndicators('1720',[a,p],read),{total:1,unread:0,pending:1});
 assert.equal(zoneIndicators('1720',[a,{...a,id:'b'}],read).unread,1);
 assert.equal(zoneIndicators('1720',[{...a,version:2}],read).unread,1);
 assert.equal(zoneIndicators('1720',[{...a,archived:true}],read).total,0);
});
function fixture(t,publish){const folder=mkdtempSync(join(tmpdir(),'tower-publication-'));t.after(()=>rmSync(folder,{recursive:true,force:true}));const options={file:join(folder,'reports.json'),masters:[{id:'master',name:'Mestre'}],zones:new Set(['1720']),send:async()=>({id:'message',channel_id:'dm'}),publish,archiveChannel:()=> '1177331405865357475'};return {store:createStore(options),options};}
const body=()=>({submissionKey:randomUUID(),hex:'1720',title:'Missão',date:'2026-10-04',participants:['Jogador'],authorName:'Jogador',authorDiscordId:'1080332488070672484',narrative:'Um relato completo de uma missão de teste.',masterId:'master'});
test('pendentes expõem apenas contagem; publicação aprovada persiste e não duplica',async t=>{
 let n=0;const {store,options}=fixture(t,async r=>{n++;return {version:r.version,url:'https://discord.com/channels/1/1177331405865357475/2',channelId:'1177331405865357475',messageId:'2'};});
 const r=await store.submit(body());assert.deepEqual(store.zoneCounts(),{'1720':1});assert.equal(await store.publishApproved(r.id),null);assert.equal(n,0);
 store.decide({id:r.id,version:1,action:'approve',userId:'master',messageId:'message'});assert.deepEqual(store.zoneCounts(),{});
 await store.publishApproved(r.id);await store.publishApproved(r.id);await createStore(options).publishQueued();assert.equal(n,1);assert.ok(store.list()[0].discordArchive.url);
});
test('entrega incerta da cópia não desfaz aprovação nem reenvia automaticamente',async t=>{
 let n=0;const {store,options}=fixture(t,async()=>{n++;throw Error('Timeout');});const r=await store.submit(body());store.decide({id:r.id,version:1,action:'approve',userId:'master',messageId:'message'});
 await store.publishApproved(r.id);await createStore(options).publishQueued();assert.equal(n,1);assert.equal(store.list()[0].status,'approved');assert.equal(store.adminList()[0].archiveStatus,'delivery_unknown');
});
test('publicação contém relato completo e anexos; edição atualiza a mesma mensagem',async()=>{
 const calls=[];const api=async(path,body,method)=>{calls.push({path,body,method});return method==='GET'?{guild_id:'123',type:0}:{id:'456'};};const publish=createPublisher({api,readAttachment:()=>Buffer.from('example')});
 const r={id:'report',version:1,hex:'1720',title:'Missão',date:'2026-10-04',authorCard:{player:'Jogador'},master:'Mestre',participants:['Personagem'],narrative:'A'.repeat(12000),attachments:[{name:'imagem.png',type:'image/png'}],documentLinks:['https://docs.google.com/document/d/example']};
 const archive=await publish(r,'1177331405865357475');const form=calls[1].body,payload=JSON.parse(form.get('payload_json'));assert.equal(payload.attachments.length,2);assert.equal(payload.enforce_nonce,true);assert.ok((await form.get('files[0]').text()).includes(r.narrative));assert.ok(archive.url.endsWith('/456'));
 await publish({...r,version:2,discordArchive:archive},'1177331405865357475');assert.equal(calls[3].method,'PATCH');assert.ok(calls[3].path.endsWith('/456'));
});
