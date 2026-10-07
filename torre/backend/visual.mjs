import {randomUUID} from 'node:crypto';
import {TEST_RECIPIENT} from './teste-bot.mjs';
// All arrivals are admitted together. Drain through the normal report store,
// one turn at a time, so Discord decisions can enter the shared mutation queue.
export function visualRunner(zones,author){
 if(!zones.length||zones.length>1000||new Set(zones).size!==zones.length)throw Error('Lista de locais inválida.');
 return async function run({submit,record,now=Date.now}){
  const start=now(),samples=[],date=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  for(const [index,hex]of zones.entries()){
   let started;
   const body={submissionKey:randomUUID(),hex,title:'[TESTE VISUAL] Hexágono '+hex,date,masterId:TEST_RECIPIENT,authorCharacterId:author.id,authorDiscordId:TEST_RECIPIENT,participantIds:[],narrative:'Relatório fictício do teste visual solicitado por van_renascido. Local '+hex+'. Use Aprovar para publicar no mapa; Recusar e pedir revisão para informar uma correção; Encerrar sem aprovação para rejeitar definitivamente. Este registro não representa uma missão real.'};
   let sample;try{const r=await submit(body,()=>{started=now();});sample={index:index+1,hex,id:r.id,messageId:r.messageId||null,status:r.status,arrivalMs:0,queueMs:started-start,totalMs:now()-start,serviceMs:started===undefined?null:now()-started,error:r.deliveryError||null};}catch(e){sample={index:index+1,hex,status:'failed',arrivalMs:0,queueMs:started===undefined?null:started-start,totalMs:now()-start,serviceMs:started===undefined?null:now()-started,error:e.publicMessage||e.message};}
   samples.push(sample);await record([...samples]);
  }
  const totals=samples.map(s=>s.totalMs).sort((a,b)=>a-b);
  return {durationMs:now()-start,samples,stages:[{stage:'one_per_hexagon',requested:zones.length,acceptedByDiscord:samples.filter(s=>s.status==='pending').length,failed:samples.filter(s=>s.status!=='pending').length,p95TotalMs:totals[Math.ceil(totals.length*.95)-1],maxTotalMs:Math.max(...totals),maxQueueMs:Math.max(...samples.map(s=>s.queueMs||0)),arrivalSpanMs:0}]};
 };
}
