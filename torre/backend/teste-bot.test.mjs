import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createBotTester,TEST_RECIPIENT} from './teste-bot.mjs';
import {createDiscord} from './gateway.mjs';

test('teste usa somente o destinatário autorizado e não cria missão ou botões inválidos',async()=>{
 let sent=0;const tester=createBotTester({configured:()=>true,waitReady:async()=>{},send:async(report,options)=>{sent++;assert.equal(report.masterId,TEST_RECIPIENT);assert.match(report.narrative,/fictício/);assert.equal(options.test,true);return {id:'message-test'};}});const key=randomUUID();const [a,b]=await Promise.all([tester(key),tester(key)]);assert.equal(sent,1);assert.equal(a.recipient,'1080332488070672484');assert.deepEqual(a,b);assert.equal(a.result,'accepted_by_discord');
});
test('sem token nenhum envio é tentado; entrega incerta não é repetida automaticamente',async()=>{
 let sent=0;const offline=createBotTester({configured:()=>false,send:async()=>sent++});await assert.rejects(offline(randomUUID()),{status:503});assert.equal(sent,0);
 const uncertain=createBotTester({configured:()=>true,waitReady:async()=>{},send:async()=>{sent++;throw Error('timeout');}});const key=randomUUID();await assert.rejects(uncertain(key),{status:502});await assert.rejects(uncertain(key),{status:502});assert.equal(sent,1);
});
test('payload de teste contém o relatório anexado, sem aprovação; relatório normal preserva os botões',async()=>{
 const realFetch=globalThis.fetch,calls=[];globalThis.fetch=async(path,options)=>{calls.push({path,options});return new Response(JSON.stringify(String(path).endsWith('/users/@me/channels')?{id:'dm-test'}:{id:'message-test'}),{status:200});};const discord=createDiscord('',()=>{});
 const report={id:randomUUID(),version:1,title:'Teste',date:'2026-10-07',masterId:TEST_RECIPIENT,participants:['Participante fictício'],narrative:'Este é um relatório fictício para conferir a entrega.',attachments:[]};
 try{await assert.rejects(discord.waitReady(),{status:503});await discord.send(report,{test:true});assert.equal(JSON.parse(calls[0].options.body).recipient_id,TEST_RECIPIENT);const form=calls[1].options.body,payload=JSON.parse(form.get('payload_json'));assert.deepEqual(payload.components,[]);assert.match(await form.get('files[0]').text(),/relatório fictício/);await discord.send(report);assert.equal(JSON.parse(calls[3].options.body.get('payload_json')).components[0].components.length,3);}finally{globalThis.fetch=realFetch;discord.close();}
});
