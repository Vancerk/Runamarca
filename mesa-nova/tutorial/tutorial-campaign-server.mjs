import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes,timingSafeEqual,createHash} from 'node:crypto';
import {createGuidedTutorial,tutorialCatalog} from './tutorial-first-duel.mjs';
import {mergeGuideCounts} from './tutorial-guidance.mjs';
import {openTutorialStore} from './tutorial-store.mjs';
import {sendTutorialFile} from './tutorial-media.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const base=JSON.parse(fs.readFileSync(path.join(root,'cartas.json'),'utf8'));
const hash=value=>createHash('sha256').update(value).digest('hex');
const build=hash(['game.mjs','tutorial-session.mjs','room-timeline.mjs','tutorial-first-duel.mjs','tutorial-curriculum.mjs','tutorial-guidance.mjs','cartas.json'].map(name=>fs.readFileSync(path.join(root,name),'utf8')).join('\n'));
const mediaRoot=path.dirname(root);
const mime={'.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.ogg':'audio/ogg','.mp3':'audio/mpeg','.wav':'audio/wav','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf','.glb':'model/gltf-binary'};
const media=new Set(['.svg','.png','.jpg','.jpeg','.webp','.ogg','.mp3','.wav','.woff2','.woff','.ttf','.glb']);
const same=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
const fail=(status,code,message)=>{throw Object.assign(Error(message),{status,code});};
async function body(req){let text='';for await(const chunk of req){text+=chunk;if(Buffer.byteLength(text)>12000)fail(413,'BODY_LIMIT','Pedido muito grande.');}try{return JSON.parse(text);}catch{fail(400,'JSON','Pedido inválido.');}}
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));}
function contained(folder,relative){const resolved=path.resolve(folder,relative);return resolved.startsWith(path.resolve(folder)+path.sep)?resolved:null;}

export async function startTutorialCampaign({port=0,delay=850,directory=path.resolve(root,'../../runtime-data'),clock,storeFactory=openTutorialStore}={}){
 const store=storeFactory(directory,{build}),records=new Map();let origin,closing=false;
 const progress=data=>({version:2,duels:[1,2,3].map(duel=>({duel,...data.progress[duel],saved:Boolean(data.duels[duel]),active:duel===data.activeDuel}))});
 function persist(record){
  if(closing||!record.session||record.failed)return;
  try{
   const snapshot=record.session.snapshot(),duel=record.data.activeDuel,t=record.session.view().tutorial,previous=record.data.progress[duel]||{};
   record.data.duels[duel]=snapshot;record.data.guidanceCounts=mergeGuideCounts(record.data.guidanceCounts,t.guidance?.counts);
   record.data.progress[duel]={won:previous.won||t.status==='won',practiced:[...new Set([...(previous.practiced||[]),...t.goals.filter(g=>g.complete&&g.id!=='win').map(g=>g.id)])],complete:previous.complete||(t.status==='won'&&t.goals.every(g=>g.complete))};
   record.data.updatedAt=new Date().toISOString();store.write(record.data);
  }catch(error){record.failed=true;record.saveError=error.code||'SAVE_FAILED';record.session.halt();}
 }
 function view(record){const state=record.session.view();state.tutorial.campaign=progress(record.data);state.tutorial.persistence={saved:!record.failed,error:record.failed?'O salvamento falhou. O treino foi pausado para preservar o último ponto gravado.':null};return state;}
 function writable(record){if(record.failed)fail(503,'SAVE_FAILED','O salvamento falhou; o treino está pausado. Confira o armazenamento antes de continuar.');}
 function attach(record,{duel,restore,code,name}){
  record.session=createGuidedTutorial({code,name,catalog:base,duel,restore,delay,clock,guidanceCounts:record.data.guidanceCounts,onChange:()=>persist(record)});
 }
 try{for(const data of store.readAll()){const record={data,session:null,touched:Date.now(),failed:false};attach(record,{duel:data.activeDuel,restore:data.duels[data.activeDuel]});records.set(data.id,record);}}
 catch(error){for(const r of records.values())r.session.dispose();store.close();throw error;}
 function authenticate(req,optional=false){const token=req.headers['x-player-token'];if(!token&&optional)return null;
  const found=typeof token==='string'&&/^[a-f0-9]{48}$/.test(token)&&[...records.values()].find(r=>same(r.data.tokenHash,hash(token)));
  if(!found)fail(403,'SEAT_INVALID','Este salvamento pertence a outro participante.');found.touched=Date.now();return found;
 }
 const server=http.createServer(async(req,res)=>{
  try{
   if(req.headers.host!==new URL(origin).host)fail(403,'HOST','Endereço local inválido.');
   const url=new URL(req.url,origin),pathname=decodeURIComponent(url.pathname);
   if(req.method==='POST'&&(req.headers.origin!==origin||!req.headers['content-type']?.startsWith('application/json')))fail(403,'ORIGIN','Abra o treino pelo endereço local da prévia.');
   if(req.method==='GET'&&pathname==='/health')return json(res,200,{ok:true,preview:'tutorial-campaign',build,storage:records.size});
   if(req.method==='GET'&&pathname==='/api/runamarca/version')return json(res,200,{version:'tutorial-3-preview',label:'Três duelos · prévia isolada'});
   if(req.method==='GET'&&pathname==='/runamarca/api/tutorial/progress'){const r=authenticate(req);return json(res,200,{campaign:progress(r.data),code:r.session.room.code,state:view(r)});}
   if(req.method==='POST'&&pathname==='/runamarca/api/tutorial'){
    const input=await body(req);const duel=input.duel??1;if(![1,2,3].includes(duel))fail(400,'TUTORIAL_DUEL','Escolha um dos três duelos.');
    let record=authenticate(req,true),token=req.headers['x-player-token'];
    if(record)writable(record);else{if(records.size>=16)fail(429,'PREVIEW_LIMIT','Esta prévia já tem 16 salvamentos.');token=randomBytes(24).toString('hex');record={data:{schema:1,build,id:randomBytes(12).toString('hex'),tokenHash:hash(token),activeDuel:duel,duels:{},progress:{}},session:null,touched:Date.now(),failed:false};}
    const old=record.session;if(old){old.halt();persist(record);writable(record);}
    const restore=input.resume===true?record.data.duels[duel]:null;
    if(input.resume===true&&!restore)fail(404,'NO_CHECKPOINT','Ainda não há um ponto salvo neste duelo.');
    let code;do{code=randomBytes(3).toString('hex').toUpperCase();}while([...records.values()].some(r=>Object.values(r.data.duels).some(s=>s.room.code===code)));
    // Set session null while constructing: initialization callbacks cannot save a partial room.
    record.session=null;record.data.activeDuel=duel;
    try{attach(record,{duel,restore,code,name:typeof input.name==='string'?input.name.trim().slice(0,30)||'Aprendiz':'Aprendiz'});}catch(error){record.session=old;throw error;}
    old?.dispose();records.set(record.data.id,record);persist(record);writable(record);
    return json(res,201,{code:record.session.room.code,token,state:view(record)});
   }
   const route=pathname.match(/^\/runamarca\/api\/rooms\/([A-Z0-9]{6})\/(state|act)$/);
   if(route){const record=authenticate(req);if(record.session.room.code!==route[1])fail(409,'TUTORIAL_CHANGED','Outro duelo foi aberto neste salvamento. Volte ao menu para retomá-lo.');
    if(req.method==='GET'&&route[2]==='state'){const state=view(record);if(Number(url.searchParams.get('revision'))===state.revision&&!record.failed){res.writeHead(204,{'Cache-Control':'no-store'});return res.end();}return json(res,200,state);}
    if(req.method==='POST'&&route[2]==='act'){writable(record);const input=await body(req);record.session.command(record.session.player,input);writable(record);return json(res,200,view(record));}
    fail(405,'METHOD','Método inválido.');
   }
   if(pathname.includes('/api/'))fail(404,'PREVIEW_ONLY','Esta prévia contém somente os treinos.');
   if(req.method!=='GET'&&req.method!=='HEAD')fail(405,'METHOD','Método inválido.');
   if(pathname==='/'){res.writeHead(302,{Location:'/runamarca/'});return res.end();}
   if(pathname==='/runamarca/cartas.json'){const catalogs=[1,2,3].map(d=>tutorialCatalog(base,d));return json(res,200,{...base,decks:catalogs.flatMap(c=>c.decks)});}
   if(!pathname.startsWith('/runamarca/'))fail(404,'NOT_FOUND','Arquivo não encontrado.');
   const relative=pathname.slice('/runamarca/'.length)||'index.html',ext=path.extname(relative).toLowerCase();
   if(!mime[ext]||relative.split(/[\\/]/).some(p=>p.startsWith('.')||p.startsWith('test-')))fail(404,'NOT_FOUND','Arquivo não encontrado.');
   let file=contained(root,relative);if(!file||!fs.existsSync(file))file=media.has(ext)?contained(mediaRoot,relative):null;
   if(!file||!fs.existsSync(file)||!fs.statSync(file).isFile())fail(404,'NOT_FOUND','Arquivo não encontrado.');
   return sendTutorialFile(req,res,file,mime[ext]+(media.has(ext)?'':'; charset=utf-8'));
  }catch(error){if(!res.headersSent)json(res,error.status||400,{code:error.code||'TUTORIAL_ERROR',error:error.message});else res.destroy();}
 });
 try{await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});}catch(error){for(const r of records.values())r.session.dispose();store.close();throw error;}
 origin=`http://127.0.0.1:${server.address().port}`;
 const cleanup=setInterval(()=>{for(const record of records.values())if(Date.now()-record.touched>120000&&!record.session.view().tutorial.clock.paused){record.session.halt();persist(record);}},30000);cleanup.unref();
 return {origin,server,build,async close(){clearInterval(cleanup);for(const r of records.values()){r.session.halt();persist(r);}closing=true;for(const r of records.values())r.session.dispose();await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});store.close();}};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const stateFile=process.argv[2],port=Number(process.argv[3]||0),preview=await startTutorialCampaign({port});const record={url:preview.origin+'/runamarca/',pid:process.pid,build:preview.build,startedAt:new Date().toISOString(),mode:'isolated-three-duels'};
 if(stateFile)fs.writeFileSync(stateFile,JSON.stringify(record,null,2));console.log(JSON.stringify(record));for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await preview.close();process.exit(0);});
}
