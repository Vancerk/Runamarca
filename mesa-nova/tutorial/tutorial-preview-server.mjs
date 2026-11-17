import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {createFirstTutorial,firstDuelCatalog} from './tutorial-first-duel.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const base=JSON.parse(fs.readFileSync(path.join(root,'cartas.json'),'utf8'));
const mediaRoot=path.dirname(root);
const mime={'.js':'text/javascript','.mjs':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.ogg':'audio/ogg','.mp3':'audio/mpeg','.wav':'audio/wav','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf','.glb':'model/gltf-binary'};
const media=new Set(['.svg','.png','.jpg','.jpeg','.webp','.ogg','.mp3','.wav','.woff2','.woff','.ttf','.glb']);
const same=(a,b)=>typeof a==='string'&&typeof b==='string'&&Buffer.byteLength(a)===Buffer.byteLength(b)&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
const fail=(status,code,message)=>{throw Object.assign(Error(message),{status,code});};
async function body(req){let text='';for await(const chunk of req){text+=chunk;if(Buffer.byteLength(text)>12000)fail(413,'BODY_LIMIT','Pedido muito grande.');}try{return JSON.parse(text);}catch{fail(400,'JSON','Pedido inválido.');}}
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));}
function contained(folder,relative){const resolved=path.resolve(folder,relative);return resolved.startsWith(path.resolve(folder)+path.sep)?resolved:null;}

export async function startTutorialPreview({port=0,delay=850}={}){
 const sessions=new Map();let origin;
 const server=http.createServer(async(req,res)=>{
  try{
   if(req.headers.host!==new URL(origin).host)fail(403,'HOST','Endereço local inválido.');
   const url=new URL(req.url,origin),pathname=decodeURIComponent(url.pathname);
   if(req.method==='POST'){
    if(req.headers.origin!==origin||!req.headers['content-type']?.startsWith('application/json'))fail(403,'ORIGIN','Abra o treino pelo endereço local da prévia.');
   }
   if(req.method==='GET'&&pathname==='/health')return json(res,200,{ok:true,preview:'tutorial-duel-one',rooms:sessions.size});
   if(req.method==='GET'&&pathname==='/api/runamarca/version')return json(res,200,{version:'tutorial-1-preview',label:'Primeiro duelo · prévia isolada'});
   if(req.method==='POST'&&pathname==='/runamarca/api/tutorial'){
    const input=await body(req);const name=typeof input.name==='string'?input.name.trim().slice(0,30):'Aprendiz';
    // Replay replaces only the caller's own session after a successful new setup.
    const previous=[...sessions].find(([,s])=>same(req.headers['x-player-token'],s.token));
    if(sessions.size>=16&&!previous)fail(429,'PREVIEW_LIMIT','A prévia já tem sessões abertas. Saia de um treino antes de iniciar outro.');
    let code;do{code=randomBytes(4).toString('hex').slice(0,6).toUpperCase();}while(sessions.has(code));
    const session=createFirstTutorial({code,name:name||'Aprendiz',catalog:base,delay}),token=randomBytes(24).toString('hex');
    sessions.set(code,{session,token,touched:Date.now()});if(previous){previous[1].session.dispose();sessions.delete(previous[0]);}
    return json(res,201,{code,token,state:session.view()});
   }
   const route=pathname.match(/^\/runamarca\/api\/rooms\/([A-Z0-9]{6})\/(state|act)$/);
   if(route){
    const record=sessions.get(route[1]);if(!record)fail(404,'ROOM_NOT_FOUND','O treino terminou ou a prévia foi reiniciada. Você pode começar de novo.');
    if(!same(req.headers['x-player-token'],record.token))fail(403,'SEAT_INVALID','Esta vaga pertence a outro participante.');
    record.touched=Date.now();
    if(req.method==='GET'&&route[2]==='state'){const state=record.session.view();if(Number(url.searchParams.get('revision'))===state.revision){res.writeHead(204,{'Cache-Control':'no-store'});return res.end();}return json(res,200,state);}
    if(req.method==='POST'&&route[2]==='act'){
     const request=await body(req),state=record.session.command(record.session.player,request);
     if(state.tutorial.status==='exited'){record.session.dispose();sessions.delete(route[1]);return json(res,200,{left:true});}
     return json(res,200,state);
    }
    fail(405,'METHOD','Método inválido.');
   }
   if(pathname.includes('/api/'))fail(404,'PREVIEW_ONLY','Esta prévia contém somente o primeiro treino.');
   if(req.method!=='GET'&&req.method!=='HEAD')fail(405,'METHOD','Método inválido.');
   if(pathname==='/'){res.writeHead(302,{Location:'/runamarca/'});return res.end();}
   if(pathname==='/runamarca/cartas.json')return json(res,200,firstDuelCatalog(base));
   if(!pathname.startsWith('/runamarca/'))fail(404,'NOT_FOUND','Arquivo não encontrado.');
   const relative=pathname.slice('/runamarca/'.length)||'index.html',ext=path.extname(relative).toLowerCase();
   if(!mime[ext]||relative.split(/[\\/]/).some(part=>part.startsWith('.')||part.startsWith('test-'))||relative.includes('tutorial-preview-server')||ext==='.mjs')fail(404,'NOT_FOUND','Arquivo não encontrado.');
   let file=contained(root,relative);if(!file||!fs.existsSync(file)){file=media.has(ext)?contained(mediaRoot,relative):null;}
   if(!file||!fs.existsSync(file)||!fs.statSync(file).isFile())fail(404,'NOT_FOUND','Arquivo não encontrado.');
   res.writeHead(200,{'Content-Type':mime[ext]+'; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});
   if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res);
  }catch(error){if(!res.headersSent)json(res,error.status||400,{code:error.code||'TUTORIAL_ERROR',error:error.message});else res.destroy();}
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});origin=`http://127.0.0.1:${server.address().port}`;
 const cleanup=setInterval(()=>{for(const [code,item] of sessions)if(Date.now()-item.touched>90*60*1000){item.session.dispose();sessions.delete(code);}},60000);cleanup.unref();
 return {origin,server,async close(){clearInterval(cleanup);for(const item of sessions.values())item.session.dispose();sessions.clear();await new Promise(resolve=>server.close(resolve));}};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const preview=await startTutorialPreview();const record={url:preview.origin+'/runamarca/',pid:process.pid,startedAt:new Date().toISOString(),mode:'isolated-first-duel'};
 if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(record,null,2));
 console.log(JSON.stringify(record));for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await preview.close();process.exit(0);});
}
