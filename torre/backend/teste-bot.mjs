import {randomUUID} from 'node:crypto';
import {ReportError} from './relatorios-core.mjs';
export const TEST_RECIPIENT='1080332488070672484';
export function createBotTester(discord){
 const attempts=new Map();
 return async function sendTest(key){
  if(typeof key!=='string'||!/^[-a-f0-9]{36}$/.test(key))throw new ReportError('Identificador de teste inválido.');
  for(const [id,entry]of attempts)if(Date.now()-entry.at>3600000)attempts.delete(id);
  if(attempts.has(key))return attempts.get(key).promise;
  if(!discord.configured())throw new ReportError('Configure DISCORD_BOT_TOKEN nas variáveis privadas do Render. O bot ligado pelo PowerShell funciona apenas na prévia local.',503);
  if(attempts.size>=20)throw new ReportError('Limite de testes atingido. Aguarde antes de enviar outro.',429);
  const report={id:randomUUID(),version:1,title:'[TESTE] Relatório fictício — Torre de Comando',date:new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),masterId:TEST_RECIPIENT,master:'van_renascido',authorCard:{name:'Participante fictício',player:'Teste do sistema'},participants:['Participante fictício — teste técnico'],narrative:'Este relatório é fictício e verifica somente a entrega ao privado de van_renascido. Não representa uma missão real, não possui botões de aprovação e não será publicado no mapa.',documentLinks:[],attachments:[]};
  const entry={at:Date.now()};entry.promise=(async()=>{try{await discord.waitReady();const message=await discord.send(report,{test:true});return {result:'accepted_by_discord',recipient:TEST_RECIPIENT,messageId:message.id};}catch(error){if(error.status||error.definite)attempts.delete(key);throw new ReportError(error.publicMessage||'Não foi possível confirmar a entrega. Confira seu privado antes de tentar outro teste.',error.status||502);}})();attempts.set(key,entry);return entry.promise;
 };
}
