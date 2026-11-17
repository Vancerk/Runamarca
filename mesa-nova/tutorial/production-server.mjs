import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes,createHash} from 'node:crypto';
import {createGuidedTutorial,tutorialCatalog} from './tutorial-first-duel.mjs';
import {mergeGuideCounts} from './tutorial-guidance.mjs';
import {sendTutorialFile} from './tutorial-media.mjs';
import {openProductionTutorialStore} from './production-store.mjs';
const root=path.dirname(fileURLToPath(import.meta.url)),mediaRoot=path.dirname(root),prefix='/runamarca/tutorial/';
const base=JSON.parse(fs.readFileSync(path.join(root,'cartas.json'),'utf8'));
const hash=value=>createHash('sha256').update(value).digest('hex');
export const tutorialBuild=hash(['game.mjs','tutorial-session.mjs','room-timeline.mjs','tutorial-first-duel.mjs','tutorial-curriculum.mjs','tutorial-guidance.mjs','cartas.json'].map(name=>fs.readFileSync(path.join(root,name),'utf8')).join('\n'));
const mime={'.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.ogg':'audio/ogg','.mp3':'audio/mpeg','.wav':'audio/wav','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf','.glb':'model/gltf-binary'};
const media=new Set(['.svg','.png','.jpg','.jpeg','.webp','.ogg','.mp3','.wav','.woff2','.woff','.ttf','.glb']);
const fail=(status,code,message)=>{throw Object.assign(Error(message),{status,code});};
async function body(req){let text='';for await(const chunk of req){text+=chunk;if(Buffer.byteLength(text)>12000)fail(413,'BODY_LIMIT','Pedido muito grande.');}try{return JSON.parse(text);}catch{fail(400,'JSON','Pedido inválido.');}}
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));}

// The caller first enforces the portal's existing access gate. Game sessions,
// tokens, routes and timers remain separate from normal multiplayer rooms.
export function createProductionTutorial({storeFactory=openProductionTutorialStore,delay=850,clock}={}){
 const records=new Map(),loading=new Map(),rates=new Map();let storePromise,closing=false;
 const store=()=>storePromise||(storePromise=Promise.resolve().then(()=>storeFactory({build:tutorialBuild})).catch(error=>{storePromise=null;throw error;}));
 const progress=data=>({version:2,duels:[1,2,3].map(duel=>({duel,...data.progress[duel],saved:Boolean(data.duels[duel]),active:duel===data.activeDuel}))});
 function persist(record){
  if(closing||!record.session||record.failed)return record.saving;
  const snapshot=record.session.snapshot(),duel=record.data.activeDuel,t=record.session.view().tutorial,previous=record.data.progress[duel]||{};
  record.data.duels[duel]=snapshot;record.data.guidanceCounts=mergeGuideCounts(record.data.guidanceCounts,t.guidance?.counts);
  record.data.progress[duel]={won:previous.won||t.status==='won',practiced:[...new Set([...(previous.practiced||[]),...t.goals.filter(g=>g.complete&&g.id!=='win').map(g=>g.id)])],complete:previous.complete||(t.status==='won'&&t.goals.every(g=>g.complete))};
  record.data.updatedAt=new Date().toISOString();const snapshotData=structuredClone(record.data);
  record.saving=(record.saving||Promise.resolve()).then(async()=>{if(!record.failed)await(await store()).write(snapshotData);}).catch(()=>{record.failed=true;record.session?.halt();});
  return record.saving;
 }
 const writable=record=>{if(record.failed)fail(503,'SAVE_FAILED','O salvamento falhou. O tutorial foi pausado; o último ponto gravado foi preservado.');};
 function view(record){const state=record.session.view();state.tutorial.campaign=progress(record.data);state.tutorial.persistence={saved:!record.failed,error:record.failed?'O salvamento falhou. O tutorial foi pausado.':null};return state;}
 function attach(record,options){record.session=createGuidedTutorial({...options,catalog:base,delay,clock,guidanceCounts:record.data.guidanceCounts,onChange:()=>persist(record)});}
 async function exclusive(record,action){const previous=record.lock||Promise.resolve();let release;record.lock=new Promise(r=>release=r);await previous;try{return await action();}finally{release();}}
 async function authenticate(req,optional=false){
  const token=req.headers['x-player-token'];if(!token&&optional)return null;
  if(typeof token!=='string'||!/^[a-f0-9]{48}$/.test(token))fail(403,'SEAT_INVALID','Este salvamento pertence a outro participante.');
  const key=hash(token);let record=records.get(key);
  if(!record){
   if(!loading.has(key))loading.set(key,(async()=>{const data=await(await store()).get(key);if(!data)return null;
    if(data.tokenHash!==key)fail(403,'SEAT_INVALID','Salvamento inválido.');
    if(records.size>=128)fail(503,'BUSY','O tutorial está ocupado. Tente novamente em instantes.');
    const r={data,session:null,touched:Date.now(),failed:false};attach(r,{duel:data.activeDuel,restore:data.duels[data.activeDuel]});records.set(key,r);return r;
   })());
   try{record=await loading.get(key);}finally{loading.delete(key);}
  }
  if(!record)fail(403,'SEAT_INVALID','Este salvamento não foi encontrado.');record.touched=Date.now();return record;
 }
 async function handle(req,res,url){
  try{
   const pathname=decodeURIComponent(url.pathname);if(!pathname.startsWith(prefix))return false;
   if(req.method==='POST'){
    let origin;try{origin=new URL(req.headers.origin);}catch{}
    if(!origin||!['http:','https:'].includes(origin.protocol)||origin.host!==req.headers.host||!req.headers['content-type']?.startsWith('application/json'))fail(403,'ORIGIN','Abra o tutorial pelo endereço do jogo.');
   }
   const relative=pathname.slice(prefix.length);
   if(req.method==='GET'&&relative==='api/tutorial/progress'){const r=await authenticate(req);await r.saving;return json(res,200,{campaign:progress(r.data),code:r.session.room.code,state:view(r)});}
   if(req.method==='POST'&&relative==='api/tutorial'){
    const input=await body(req),duel=input.duel??1;if(![1,2,3].includes(duel))fail(400,'TUTORIAL_DUEL','Escolha um dos três duelos.');
    let record=await authenticate(req,true),token=req.headers['x-player-token'];
    if(!record){
     const ip=req.socket.remoteAddress||'local',now=Date.now(),recent=(rates.get(ip)||[]).filter(t=>now-t<60000);if(recent.length>=12)fail(429,'RATE_LIMIT','Aguarde um pouco antes de iniciar outro tutorial.');recent.push(now);rates.set(ip,recent);
     if(records.size>=128)fail(503,'BUSY','O tutorial está ocupado. Tente novamente em instantes.');
     token=randomBytes(24).toString('hex');record={data:{schema:1,build:tutorialBuild,id:randomBytes(12).toString('hex'),tokenHash:hash(token),activeDuel:duel,duels:{},progress:{}},session:null,touched:Date.now(),failed:false};records.set(record.data.tokenHash,record);
    }
    return await exclusive(record,async()=>{
     writable(record);const old=record.session,previousDuel=record.data.activeDuel,restore=input.resume===true?record.data.duels[duel]:null;
     if(input.resume===true&&!restore)fail(404,'NO_CHECKPOINT','Ainda não há um ponto salvo neste duelo.');
     if(old){old.halt();await persist(record);writable(record);}
     record.session=null;record.data.activeDuel=duel;
     try{attach(record,{duel,restore,code:randomBytes(3).toString('hex').toUpperCase(),name:typeof input.name==='string'?input.name.trim().slice(0,30)||'Aprendiz':'Aprendiz'});}catch(error){record.session=old;record.data.activeDuel=previousDuel;throw error;}
     old?.dispose();await persist(record);writable(record);return json(res,201,{code:record.session.room.code,token,state:view(record)});
    });
   }
   const route=relative.match(/^api\/rooms\/([A-Z0-9]{6})\/(state|act)$/);
   if(route){const record=await authenticate(req);return await exclusive(record,async()=>{
    if(record.session.room.code!==route[1])fail(409,'TUTORIAL_CHANGED','Outro duelo foi aberto. Volte ao menu para retomá-lo.');
    if(req.method==='GET'&&route[2]==='state'){await record.saving;const state=view(record);if(Number(url.searchParams.get('revision'))===state.revision&&!record.failed){res.writeHead(204,{'Cache-Control':'no-store'});return res.end();}return json(res,200,state);}
    if(req.method==='POST'&&route[2]==='act'){writable(record);record.session.command(record.session.player,await body(req));await record.saving;writable(record);return json(res,200,view(record));}
    fail(405,'METHOD','Método inválido.');
   });}
   if(relative.startsWith('api/'))fail(404,'NOT_FOUND','Recurso não encontrado.');
   if(!['GET','HEAD'].includes(req.method))fail(405,'METHOD','Método inválido.');
   if(relative==='cartas.json'){const catalogs=[1,2,3].map(d=>tutorialCatalog(base,d));return json(res,200,{...base,decks:catalogs.flatMap(c=>c.decks)});}
   const name=relative||'index.html',ext=path.extname(name).toLowerCase();
   if(!mime[ext]||name.split(/[\\/]/).some(p=>p.startsWith('.')||p.startsWith('test-')))fail(404,'NOT_FOUND','Arquivo não encontrado.');
   let file=path.resolve(root,name);if(!file.startsWith(root+path.sep))fail(404,'NOT_FOUND','Arquivo não encontrado.');
   if(!fs.existsSync(file)&&media.has(ext))file=path.resolve(mediaRoot,name);
   if(!file.startsWith(mediaRoot+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())fail(404,'NOT_FOUND','Arquivo não encontrado.');
   return sendTutorialFile(req,res,file,mime[ext]+(media.has(ext)?'':'; charset=utf-8'));
  }catch(error){const actionError=typeof error.code==='string'&&error.code.startsWith('TUTORIAL_');if(!res.headersSent)json(res,error.status||(actionError?400:503),{code:error.code||'TUTORIAL_UNAVAILABLE',error:error.status||actionError?error.message:'Não foi possível carregar ou salvar o tutorial. Seu progresso anterior foi preservado.'});else res.destroy();}
 }
 const cleanup=setInterval(()=>{for(const [key,r] of records)if(Date.now()-r.touched>120000)void exclusive(r,async()=>{if(Date.now()-r.touched<=120000)return;r.session?.halt();await persist(r);r.session?.dispose();records.delete(key);});for(const [ip,t] of rates)if(!t.some(at=>Date.now()-at<60000))rates.delete(ip);},30000);cleanup.unref();
 return {handle,build:tutorialBuild,async close(){clearInterval(cleanup);for(const r of records.values())await exclusive(r,async()=>{r.session?.halt();await persist(r);r.session?.dispose();});closing=true;if(storePromise)await(await storePromise).close();}};
}
