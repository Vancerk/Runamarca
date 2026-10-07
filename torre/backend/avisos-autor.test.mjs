import {test} from 'node:test';
import assert from 'node:assert/strict';
import {authorNotice} from './avisos-autor.mjs';
import {createInteractionHandler} from './interacoes.mjs';
const report={id:'report',title:'Missão',master:'Kagami',version:2,status:'correction_requested',decisionReason:'Corrija a data e retire o participante ausente.',editReceipt:'a'.repeat(48)};
test('DM contém motivo integral, mestre e link reservado de revisão; site público não anuncia localhost',()=>{
 const payload=authorNotice(report,'https://example.org/preview.html');assert.equal(payload.embeds[0].description,report.decisionReason);assert.ok(payload.content.includes('Kagami'));assert.ok(payload.content.includes('#correction=report.'+report.editReceipt));assert.ok(payload.content.includes('reenvie'));assert.ok(!payload.content.includes('computador'));assert.deepEqual(payload.allowed_mentions,{parse:[]});
 assert.ok(authorNotice(report).content.includes('computador'));assert.throws(()=>authorNotice({...report,editReceipt:undefined}));
});
test('encerramento explícito envia motivo sem link que reabra relatório',()=>{
 const payload=authorNotice({...report,status:'rejected',editReceipt:undefined});assert.equal(payload.embeds[0].description,report.decisionReason);assert.ok(payload.content.includes('definitivo'));assert.ok(!payload.content.includes('#correction='));
});
test('Rejeitar de mensagem antiga solicita revisão; novo encerramento permanece definitivo',async()=>{
 for(const [button,expected]of [['reject','correct'],['correct','correct'],['close','reject']]){
  const calls=[],decisions=[],notifications=[];const handler=createInteractionHandler({api:async(path,body)=>calls.push({path,body}),checkDecision:()=>{},checkNotification:()=>{},onDecision:p=>{decisions.push(p);return {id:'report',status:expected==='correct'?'correction_requested':'rejected'};},notify:async id=>notifications.push(id)});
  const i={type:3,id:'interaction',token:'token',application_id:'app',channel_id:'dm',user:{id:'master'},message:{id:'message'},data:{custom_id:`legion:${button}:report:2`}};
  await handler(i);assert.equal(calls[0].body.type,9);const modal=calls[0].body.data.custom_id;
  await handler({...i,type:5,data:{custom_id:modal,components:[{type:18,component:{type:4,custom_id:'reason',value:report.decisionReason}}]}});
  assert.equal(decisions[0].action,expected);assert.equal(decisions[0].reason,report.decisionReason);assert.deepEqual(notifications,['report']);
 }
});
