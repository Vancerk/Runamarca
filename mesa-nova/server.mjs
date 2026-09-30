import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createHash,randomBytes,timingSafeEqual} from 'node:crypto';
import {act,code,easyBotAction,findPlayer,join,makeRoom,view} from './game.mjs';

const root=path.dirname(fileURLToPath(import.meta.url));
const catalog=JSON.parse(await readFile(path.join(root,'cartas.json'),'utf8'));
const rooms=new Map();
const sessions=new Map();
const attempts=new Map();
const accessHash='d1278d1e774f8b0c27c166302871dd40ccea755f31738a8210d70de8c44a9fe5';
const sessionAge=30*24*60*60*1000;
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.webp':'image/webp'};
function scheduleBot(room){if(room.botTimer||!room.players.some(p=>p.bot))return;room.botTimer=setTimeout(()=>{room.botTimer=null;const bot=room.players.find(p=>p.bot),next=easyBotAction(room);if(!bot||!next)return;try{act(room,bot,next,catalog);scheduleBot(room);}catch(error){room.log.push({message:`Bot fácil interrompido: ${error.message}`,round:room.round,turn:room.turn,phase:room.phase});room.log=room.log.slice(-10);room.revision++;}},700);}
function json(res,status,value){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));}
async function payload(req){let size=0;const parts=[];for await(const part of req){size+=part.length;if(size>32_000_000)throw Error('Arquivo acima do limite de 32 MB.');parts.push(part);}try{return JSON.parse(Buffer.concat(parts).toString('utf8'));}catch{throw Error('JSON inválido.');}}
function auth(req,room){const p=findPlayer(room,req.headers['x-player-token']);if(!p)throw Error('Acesso inválido.');return p;}
function hasAccess(req){const value=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('rm_access='))?.slice(10);const expiry=value&&sessions.get(value);if(!expiry)return false;if(expiry<Date.now()){sessions.delete(value);return false;}return true;}
function grantAccess(req,res,base){const session=randomBytes(32).toString('hex');sessions.set(session,Date.now()+sessionAge);const secure=req.socket.encrypted||req.headers['x-forwarded-proto']==='https'?'; Secure':'';res.setHeader('Set-Cookie',`rm_access=${session}; HttpOnly; SameSite=Lax; Path=${base||'/'}; Max-Age=${sessionAge/1000}${secure}`);}
export async function handleNewGame(req,res,url=new URL(req.url,'http://localhost'),base=''){
  try{
    if(base&&!url.pathname.startsWith(base+'/')&&url.pathname!==base)return false;
    const routePath=base?url.pathname.slice(base.length)||'/':url.pathname;
    if(routePath==='/health'&&req.method==='GET')return json(res,200,{ok:true});
    if(routePath==='/access'&&req.method==='GET'){
      const content=await readFile(path.join(root,'access.html'));
      res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(content);return;
    }
    if(routePath==='/access'&&req.method==='POST'){
      const ip=req.socket.remoteAddress||'unknown';const record=attempts.get(ip)||{count:0,until:Date.now()+15*60_000};if(record.until<Date.now()){record.count=0;record.until=Date.now()+15*60_000;}
      if(record.count>=10)return json(res,429,{error:'Muitas tentativas. Aguarde 15 minutos.'});
      const data=await payload(req);const supplied=createHash('sha256').update(String(data.code||'')).digest();const expected=Buffer.from(accessHash,'hex');
      if(!timingSafeEqual(supplied,expected)){record.count++;attempts.set(ip,record);return json(res,403,{error:'Código incorreto.'});}
      attempts.delete(ip);grantAccess(req,res,base);
      res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify({ok:true}));return;
    }
    let invited=false;
    if(!hasAccess(req)&&req.method==='GET'&&routePath==='/'&&url.searchParams.has('room')&&url.searchParams.has('invite')){
      const room=rooms.get(url.searchParams.get('room').toUpperCase());const invite=url.searchParams.get('invite');
      if(room&&typeof invite==='string'&&invite.length===room.inviteToken.length&&timingSafeEqual(Buffer.from(invite),Buffer.from(room.inviteToken))){grantAccess(req,res,base);invited=true;}
    }
    if(!hasAccess(req)&&!invited){
      if(req.method==='GET'&&!routePath.startsWith('/api/')){res.writeHead(302,{Location:`${base}/access`,'Cache-Control':'no-store'});res.end();return;}
      return json(res,403,{error:'Informe o código de acesso antes de entrar no RunaMarca.'});
    }
    if(routePath==='/api/create'&&req.method==='POST'){
      const data=await payload(req);let id;do{id=code();}while(rooms.has(id));const room=makeRoom(id,data.name,data.role==='spectator'?'spectator':'player');room.onChange=()=>scheduleBot(room);rooms.set(id,room);const p=room.players[0]||room.spectators[0];return json(res,200,{code:id,token:p.token,state:view(room,p)});
    }
    const route=routePath.match(/^\/api\/rooms\/([A-F0-9]{6})\/(join|state|act)$/);
    if(route){const room=rooms.get(route[1]);if(!room)throw Error('Sala não encontrada.');const operation=route[2];
      if(operation==='join'&&req.method==='POST'){const data=await payload(req);const role=data.role==='spectator'||(data.role==='auto'&&(room.phase!=='lobby'||room.players.length>=2))?'spectator':'player';const p=join(room,data.name,role);return json(res,200,{code:room.code,token:p.token,state:view(room,p)});}
      const p=auth(req,room);
      if(operation==='state'&&req.method==='GET'){
        if(url.searchParams.has('revision')&&Number(url.searchParams.get('revision'))===room.revision){res.writeHead(204,{'Cache-Control':'no-store'});return res.end();}
        return json(res,200,view(room,p));
      }
      if(operation==='act'&&req.method==='POST'){const data=await payload(req);act(room,p,data,catalog);scheduleBot(room);if(data.type==='leave'){if(!room.spectators.length&&room.players.every(x=>x.bot)){clearTimeout(room.botTimer);rooms.delete(room.code);}return json(res,200,{left:true});}return json(res,200,view(room,p));}
      return json(res,405,{error:'Método inválido.'});
    }
    if(req.method!=='GET')return json(res,405,{error:'Método inválido.'});
    const rel=decodeURIComponent(routePath).replace(/^\/+/, '')||'index.html';const file=path.resolve(root,rel);
    if(!file.startsWith(root+path.sep)||!types[path.extname(file)])return json(res,404,{error:'Não encontrado.'});
    try{const content=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)],'Cache-Control':'no-cache','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'});res.end(content);}catch{return json(res,404,{error:'Não encontrado.'});}
  }catch(error){json(res,400,{error:error.message||'Erro na mesa.'});}
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
  http.createServer((req,res)=>handleNewGame(req,res)).listen(Number(process.env.PORT)||3042,process.env.PORT?'0.0.0.0':'127.0.0.1',()=>console.log(`RunaMarca novo: porta ${Number(process.env.PORT)||3042}`));
}
