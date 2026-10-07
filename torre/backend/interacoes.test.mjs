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
