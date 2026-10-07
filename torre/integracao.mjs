import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {identify,accountsConfigured,publicOrigin,accountDatabase} from '../accounts.mjs';
import {createDurableFiles} from './persistencia.mjs';
import {createTorreRuntime} from './backend/handler.mjs';
import {startRequestedMasters} from './mestres-solicitado.mjs';
import {startRequestedVisual} from './visual-solicitado.mjs';
import {readFlowResult,startRequestedFlow} from './fluxo-solicitado.mjs';
import {visitorIdentity} from './visitantes.mjs';
const folder=fileURLToPath(new URL('.',import.meta.url));
let pending,runtime,tail=Promise.resolve();
const json=(res,status,error)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify({error}));};
const serial=job=>{const result=tail.then(job);tail=result.catch(()=>{});return result;};
async function getRuntime(){if(!pending)pending=(async()=>{const db=accountDatabase();await db.init();const dataFolder=await mkdtemp(resolve(tmpdir(),'elysium-torre-'));const persistence=await createDurableFiles(db.pool,dataFolder);runtime=createTorreRuntime({folder:resolve(folder,'backend'),root:resolve(folder,'public'),dataFolder,origin:publicOrigin(),durable:()=>persistence.flush(),serial,flowStatus:()=>readFlowResult(db)});return {...runtime,persistence};})().catch(error=>{pending=null;throw error;});return pending;}
export async function closeTorre(){runtime?.close();runtime=null;pending=null;}
// Public reports share the games' server/database; only administration requires OAuth.
export async function handleTorre(req,res,url){
 if(url.pathname!=='/torre'&&!url.pathname.startsWith('/torre/'))return false;
 try{
  if(process.env.LEGION_ENABLED==='false'||!accountsConfigured()){json(res,503,'A Torre de Comando ainda não está configurada neste servidor.');return true;}
  const user=await identify(req);
  const isAdmin=Boolean(user&&user.discord_id===process.env.DISCORD_ADMIN_ID);
  if(url.pathname.startsWith('/torre/api/admin/')&&!isAdmin){json(res,403,'Acesso reservado ao administrador.');return true;}
  if(url.pathname==='/torre'){res.writeHead(308,{Location:'/torre/','Cache-Control':'no-store'});res.end();return true;}
  if(['POST','PUT','PATCH','DELETE'].includes(req.method)&&req.headers.origin!==publicOrigin()){json(res,403,'Origem inválida.');return true;}
  req.torreVisitorId=user?'user:'+user.discord_id:visitorIdentity(req,res);
  const tower=await getRuntime();req.torreAdminId=isAdmin?user.discord_id:undefined;
  const run=async()=>{const original=req.url;req.url=url.pathname.slice('/torre'.length)+url.search;
   const headers=new Map(),parts=[];let status=200;
   const buffered={setHeader:(key,value)=>headers.set(key,value),writeHead(code,values={}){status=code;for(const [key,value]of Object.entries(values))headers.set(key,value);},end(value){if(value!==undefined)parts.push(Buffer.isBuffer(value)?value:Buffer.from(String(value)));}};
   try{await tower.handler(req,buffered);if(req.method==='POST'&&status>=200&&status<300)await tower.persistence.flush();res.writeHead(status,Object.fromEntries(headers));res.end(parts.length?Buffer.concat(parts):undefined);}finally{req.url=original;}
  };
  if(req.method==='POST')await serial(run);else await run();
 }catch(error){json(res,error.status||503,error.status?error.message:'A Torre de Comando está temporariamente indisponível. Tente novamente.');}
 return true;
}

export const startFlowTest=async()=>{await startRequestedFlow(getRuntime);await startRequestedVisual(getRuntime);await startRequestedMasters(getRuntime);};
