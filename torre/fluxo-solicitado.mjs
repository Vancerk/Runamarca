import {createHash,timingSafeEqual} from 'node:crypto';
import {accountDatabase,accountsConfigured,publicOrigin} from '../accounts.mjs';
import {runFlow} from './backend/fluxo.mjs';
import {TEST_RECIPIENT} from './backend/teste-bot.mjs';
// One execution authorized by van_renascido in this chat on 2026-10-07.
export const FLOW_JOB_ID='van-2026-10-07-10min-20burst';
const RECEIPT_HASH='6ea10a69030d8a2c1db68fb5d6445991d3870fed707a972b00d2a0ae23085e97';
const schema='CREATE TABLE IF NOT EXISTS elysium_torre_flow_runs (id TEXT PRIMARY KEY, payload JSONB NOT NULL)';
export async function readFlowResult(db=accountDatabase(),jobId=FLOW_JOB_ID){
 await db.query(schema);const {rows}=await db.query('SELECT payload FROM elysium_torre_flow_runs WHERE id=$1',[jobId]);return rows[0]?.payload||{id:jobId,status:'not_started',botConfigured:Boolean(process.env.DISCORD_BOT_TOKEN)};
}
export async function handleFlowResult(req,res,url){
 const jobId=url.pathname==='/api/torre-flow-result'?FLOW_JOB_ID:url.pathname==='/api/torre-visual-result'?'van-2026-10-07-visual-all-hexagons':url.pathname==='/api/torre-masters-result'?'van-2026-10-07-master-delivery-60':null;if(!jobId)return false;
 const provided=req.headers['x-flow-receipt'];const valid=typeof provided==='string'&&/^[a-f0-9]{64}$/.test(provided)&&timingSafeEqual(createHash('sha256').update(provided).digest(),Buffer.from(RECEIPT_HASH,'hex'));
 const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
 if(req.method!=='GET'||!valid){send(403,{error:'Acesso não autorizado.'});return true;}
 try{if(!accountsConfigured()){send(503,{status:'unconfigured'});return true;}const db=accountDatabase(),result=await readFlowResult(db,jobId);
  if(['van-2026-10-07-visual-all-hexagons','van-2026-10-07-master-delivery-60'].includes(jobId)&&result.samples?.length){const {rows}=await db.query('SELECT body FROM elysium_torre_files WHERE name=$1',['relatorios.json']);if(rows[0]){const ids=new Set(result.samples.map(s=>s.id));const reports=JSON.parse(Buffer.from(rows[0].body).toString('utf8')).filter(r=>ids.has(r.id));result.currentDecisions={};for(const r of reports)result.currentDecisions[r.status]=(result.currentDecisions[r.status]||0)+1;}}
  send(200,result);}catch{send(503,{status:'database_unavailable'});}return true;
}
export async function executeClaimedFlow(db,tower,{schedule,jobId=FLOW_JOB_ID,runner=runFlow,notes}={}){
 await db.query(schema);let result={id:jobId,status:'starting',requestedBy:TEST_RECIPIENT,startedAt:new Date().toISOString(),instance:process.env.RENDER_INSTANCE_ID||'test',samples:[],notes:notes||['Dados fictícios em arquivo separado; mapa inalterado.','Exercita validação do núcleo, Neon e Discord no Render; não simula navegador, login nem aprovação.']};
 const claim=await db.query('INSERT INTO elysium_torre_flow_runs(id,payload) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING id',[jobId,JSON.stringify(result)]);if(!claim.rows.length)return {skipped:true};
 let writes=Promise.resolve();const save=()=>{const payload=JSON.stringify({...result,updatedAt:new Date().toISOString()});const next=writes.then(()=>db.query('UPDATE elysium_torre_flow_runs SET payload=$2 WHERE id=$1',[jobId,payload]));writes=next.catch(()=>{});return next;};
 try{await tower.waitReady(20000);const baseline=tower.metrics();result.status='running';await save();const measured=await runner({submit:tower.submit,record:async samples=>{result.samples=samples;await save();},...(schedule?{schedule}:{})});const after=tower.metrics();result={...result,...measured,status:measured.stages.some(s=>s.failed)?'completed_with_errors':'completed',finishedAt:new Date().toISOString(),discord:Object.fromEntries(Object.keys(after).map(k=>[k,after[k]-baseline[k]])),rssMiB:Math.round(process.memoryUsage().rss/1024/1024*10)/10};await save();return result;}catch(error){result.status='failed';result.error=error.publicMessage||'O teste não conseguiu completar o acesso ao bot ou ao banco.';result.finishedAt=new Date().toISOString();await save();return result;}
}
export async function startRequestedFlow(getRuntime){
 if(process.env.RENDER!=='true'||process.env.RENDER_GIT_BRANCH!=='main'||process.env.RENDER_EXTERNAL_HOSTNAME!=='elysiumjogos.onrender.com'||publicOrigin()!=='https://elysiumjogos.onrender.com'||process.env.DISCORD_ADMIN_ID!==TEST_RECIPIENT||!accountsConfigured())return;
 const db=accountDatabase();const existing=await readFlowResult(db);if(existing.status!=='not_started')return;
 const runtime=await getRuntime();await executeClaimedFlow(db,{waitReady:runtime.waitReady,metrics:runtime.metrics,submit:runtime.flowSubmit});
}
