import {randomUUID} from 'node:crypto';
import {TEST_RECIPIENT} from './teste-bot.mjs';
export const MASTER_TEST_PLAN=[{name:'Kallisto',id:'321429719516053516',count:5},{name:'Kagami',id:'992870741202702356',count:10},{name:'Van',id:TEST_RECIPIENT,count:25},{name:'Reverso',id:'1452242736760488030',count:10},{name:'Ravena',id:'1503909232246915133',count:10}];
export function masterTestRunner(zones,author){
 if(!zones.length)throw Error('Mapa sem locais.');
 return async({submit,record,now=Date.now})=>{
  const start=now(),samples=[],date=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  for(const master of MASTER_TEST_PLAN)for(let index=1;index<=master.count;index++){
   const hex=zones[samples.length%zones.length],arrived=now();let started;
   const body={submissionKey:randomUUID(),hex,title:`[TESTE MESTRES] ${master.name} — ${index}/${master.count}`,date,masterId:master.id,authorCharacterId:author.id,authorDiscordId:TEST_RECIPIENT,participantIds:[],narrative:`Relatório fictício autorizado por van_renascido para testar a entrega e a decisão do mestre ${master.name}. Exemplo ${index} de ${master.count}, local ${hex}. Você pode aprovar, solicitar revisão informando um motivo ou encerrar sem aprovação. O autor de teste é van_renascido, que receberá os pedidos de revisão. Não representa uma missão real.`};
   let sample;try{const r=await submit(body,()=>{started=now();});sample={master:master.name,masterId:master.id,index,hex,id:r.id,messageId:r.messageId||null,status:r.status,arrivalMs:arrived-start,queueMs:started-arrived,totalMs:now()-arrived,error:r.deliveryError||null};}catch(e){sample={master:master.name,masterId:master.id,index,hex,status:'failed',arrivalMs:arrived-start,totalMs:now()-arrived,error:e.publicMessage||e.message};}
   samples.push(sample);await record([...samples]);
  }
  return {durationMs:now()-start,samples,stages:MASTER_TEST_PLAN.map(m=>{const rows=samples.filter(s=>s.masterId===m.id),times=rows.map(s=>s.totalMs).sort((a,b)=>a-b);return {stage:m.name,requested:m.count,acceptedByDiscord:rows.filter(s=>s.status==='pending').length,failed:rows.filter(s=>s.status!=='pending').length,p95TotalMs:times[Math.ceil(times.length*.95)-1],maxTotalMs:Math.max(...times)};})};
 };
}
