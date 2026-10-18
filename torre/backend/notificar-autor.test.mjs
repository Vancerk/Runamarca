import test from 'node:test';
import assert from 'node:assert/strict';
import {createAuthorNotifier,channelNotice} from './notificar-autor.mjs';
const report={id:'report-1',authorDiscordId:'1080332488070672484',title:'Segredo',master:'Van',status:'correction_requested',version:1,editReceipt:'a'.repeat(48),decisionReason:'Motivo reservado'};
const siteUrl='https://example.org/torre/';
test('DM é prioritária; ping é genérico e menciona somente o autor',async()=>{
 const calls=[],notify=createAuthorNotifier({api:async(path,body)=>{calls.push({path,body});return {id:'message'};},dmFor:async()=>({id:'dm'}),siteUrl,fallbackChannel:()=>'1177331405865357475'});
 assert.equal((await notify(report)).method,'dm');assert.equal(calls.length,1);assert.ok(calls[0].body.content.includes(report.editReceipt));
 const payload=channelNotice(report,siteUrl),text=JSON.stringify(payload);assert.ok(payload.content.includes('#notice=report-1'));for(const secret of [report.editReceipt,report.title,report.decisionReason])assert.ok(!text.includes(secret));assert.deepEqual(payload.allowed_mentions,{parse:[],users:[report.authorDiscordId]});
});
test('DM bloqueada gera um único ping salvo; reenvio não duplica o ping',async()=>{
 let messages=0;const blocked=Object.assign(Error('DM bloqueada'),{discordCode:50007});
 const notify=createAuthorNotifier({api:async()=>({id:'notice-'+ ++messages}),dmFor:async()=>{throw blocked;},siteUrl,fallbackChannel:()=>'1177331405865357475'});
 const delivery=await notify(report);assert.equal(delivery.method,'channel');assert.equal(messages,1);assert.deepEqual(await notify({...report,notificationDelivery:delivery}),delivery);assert.equal(messages,1);
 await notify({...report,version:2,notificationDelivery:delivery});assert.equal(messages,2);
});
test('sem canal, falha desconhecida, token inválido ou erro 5xx não geram ping',async()=>{
 for(const [code,channel]of [[50007,null],[undefined,'1177331405865357475'],[50013,'1177331405865357475'],[undefined,null]]){let calls=0;const failure=Object.assign(Error('falha'),{discordCode:code});const notify=createAuthorNotifier({api:async()=>calls++,dmFor:async()=>{throw failure;},siteUrl,fallbackChannel:()=>channel});await assert.rejects(notify(report));assert.equal(calls,0);}
});
