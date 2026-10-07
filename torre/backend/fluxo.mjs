import {randomUUID} from 'node:crypto';
import {TEST_RECIPIENT} from './teste-bot.mjs';
export const FLOW_SCHEDULE=[...Array.from({length:10},(_,i)=>({stage:'10_por_minuto',at:i*6000,index:i+1})),...Array.from({length:20},(_,i)=>({stage:'20_em_10_segundos',at:60000+i*500,index:i+1}))];
export async function runFlow({submit,record=async()=>{},now=Date.now,sleep=ms=>new Promise(r=>setTimeout(r,ms)),schedule=FLOW_SCHEDULE}){
 const start=now(),samples=[];
 await Promise.all(schedule.map(async event=>{await sleep(Math.max(0,start+event.at-now()));const arrived=now();let started;
  const body={submissionKey:randomUUID(),hex:'1720',title:'[TESTE DE FLUXO] '+event.stage+' — '+event.index,date:new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),masterId:TEST_RECIPIENT,authorName:'Teste técnico',authorCharacterId:'flow-test-author',authorDiscordId:TEST_RECIPIENT,participants:['Participante fictício — teste técnico'],narrative:'Relatório fictício de teste de fluxo solicitado por van_renascido. Este envio mede o tempo de fila, gravação no Neon e entrega pelo Discord. Não corresponde a uma missão real e não será publicado no mapa.'};
  let sample;try{const report=await submit(body,()=>{started=now();});sample={stage:event.stage,index:event.index,scheduledMs:event.at,arrivalMs:arrived-start,queueMs:started-arrived,totalMs:now()-arrived,status:report.status,messageId:report.messageId||null,error:report.deliveryError||null};}catch(error){sample={stage:event.stage,index:event.index,scheduledMs:event.at,arrivalMs:arrived-start,queueMs:started===undefined?null:started-arrived,totalMs:now()-arrived,status:'failed',error:error.publicMessage||error.message};}
  samples.push(sample);await record([...samples]);
 }));
 const quantile=(values,q)=>{const sorted=values.sort((a,b)=>a-b);return sorted[Math.min(sorted.length-1,Math.ceil(sorted.length*q)-1)]||0;};
 return {durationMs:now()-start,samples:samples.sort((a,b)=>a.scheduledMs-b.scheduledMs),stages:['10_por_minuto','20_em_10_segundos'].map(stage=>{const rows=samples.filter(s=>s.stage===stage);return {stage,requested:rows.length,acceptedByDiscord:rows.filter(s=>s.status==='pending').length,failed:rows.filter(s=>s.status!=='pending').length,p95TotalMs:quantile(rows.map(s=>s.totalMs),.95),maxTotalMs:Math.max(0,...rows.map(s=>s.totalMs)),maxQueueMs:Math.max(0,...rows.map(s=>s.queueMs||0)),arrivalSpanMs:rows.length?Math.max(...rows.map(s=>s.arrivalMs))-Math.min(...rows.map(s=>s.arrivalMs)):0};})};
}
