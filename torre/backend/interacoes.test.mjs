import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createInteractionHandler} from './interacoes.mjs';
const click={type:3,id:'interaction',token:'secret',application_id:'app',channel_id:'dm',user:{id:'master'},message:{id:'message'},data:{custom_id:'legion:correct:report:1'}};
function fixture(){const calls=[],decisions=[],notices=[];const handler=createInteractionHandler({api:async(path,body,method)=>calls.push({path,body,method}),checkDecision:p=>{assert.equal(p.userId,'master');assert.equal(p.messageId,'message');},checkNotification:()=>{},onDecision:p=>{decisions.push(p);return {id:'report',status:'correction_requested'};},notify:async id=>notices.push(id)});return {handler,calls,decisions,notices};}
test('botão abre caixa de texto sem decidir; envio do modal mantém mensagem, mestre e versão originais',async()=>{
 const f=fixture();await f.handler(click);assert.equal(f.decisions.length,0);assert.equal(f.calls[0].body.type,9);
 const custom_id=f.calls[0].body.data.custom_id;
 await f.handler({...click,type:5,message:undefined,data:{custom_id,components:[{type:18,component:{type:4,custom_id:'reason',value:'Corrigir a data.'}}]}});
 assert.equal(f.decisions[0].reason,'Corrigir a data.');assert.equal(f.decisions[0].version,1);assert.equal(f.decisions[0].messageId,'message');assert.deepEqual(f.notices,['report']);
 const n=f.decisions.length;await f.handler({...click,type:5,data:{custom_id,components:[]}});assert.equal(f.decisions.length,n);
});
test('outro usuário não consegue usar o modal reservado ao mestre',async()=>{
 const f=fixture();await f.handler(click);const custom_id=f.calls[0].body.data.custom_id;
 await f.handler({...click,type:5,user:{id:'intruso'},data:{custom_id,components:[]}});assert.equal(f.decisions.length,0);assert.equal(f.calls.at(-1).body.type,4);
});


test('aprovação espera a gravação assíncrona antes de publicar ou atualizar a mensagem',async()=>{
 const calls=[],steps=[];let release;const saving=new Promise(resolve=>release=resolve);
 const handler=createInteractionHandler({api:async(path,body)=>{calls.push({path,body});},checkDecision:()=>{},onDecision:async()=>{await saving;steps.push('saved');return {id:'report',status:'approved'};},onApproved:async id=>{assert.equal(id,'report');steps.push('published');return null;},notify:async()=>{throw Error('Aprovação não notifica correção');}});
 const running=handler({...click,data:{custom_id:'legion:approve:report:1'}});await new Promise(r=>setImmediate(r));assert.deepEqual(steps,[]);assert.equal(calls.length,1);assert.equal(calls[0].body.type,5);
 release();await running;assert.deepEqual(steps,['saved','published']);assert.match(calls.at(-1).body.content,/Relato aprovado/);assert.deepEqual(calls.find(c=>c.path==='/channels/dm/messages/message').body.components,[]);
});
test('correção assíncrona usa o ID gravado e manda o motivo ao autor',async()=>{
 const calls=[],steps=[];const handler=createInteractionHandler({api:async(path,body)=>calls.push({path,body}),checkDecision:()=>{},onDecision:async params=>{await new Promise(r=>setImmediate(r));assert.equal(params.reason,'Ajuste a data.');steps.push('saved');return {id:'report',status:'correction_requested'};},notify:async id=>{assert.equal(id,'report');steps.push('notified');}});
 await handler(click);const custom_id=calls[0].body.data.custom_id;await handler({...click,type:5,data:{custom_id,components:[{type:18,component:{type:4,custom_id:'reason',value:'Ajuste a data.'}}]}});assert.deepEqual(steps,['saved','notified']);assert.match(calls.at(-1).body.content,/Pedido enviado ao privado/);assert.doesNotMatch(calls.at(-1).body.content,/undefined/);
});
test('falha na gravação não publica, não confirma sucesso nem envia aviso ao autor',async()=>{
 const calls=[];let notified=0,published=0;const handler=createInteractionHandler({api:async(path,body)=>calls.push({path,body}),checkDecision:()=>{},onDecision:async()=>{throw Error('Banco indisponível');},notify:async()=>notified++,onApproved:async()=>published++});await handler({...click,data:{custom_id:'legion:approve:report:1'}});assert.equal(notified,0);assert.equal(published,0);assert.match(calls.at(-1).body.content,/Não foi possível concluir/);assert.equal(calls.length,2);
});
