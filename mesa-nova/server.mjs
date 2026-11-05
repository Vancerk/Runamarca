import {createBotScheduler} from './bot-scheduler.mjs';
import http from 'node:http';
import {createAsyncGameBotBridge} from '../bot/game-bridge/async-bridge.mjs';
import {enableMusicClock,stopMusicClock} from './music-director.mjs';
import {createAccessSessions} from './access-session.mjs';
import {waitRevision} from './wait-revision.mjs';
import {registerGame,bindParticipant,assertUniqueAccount,verifyParticipant,persistMatch,normalizeWager} from '../accounts.mjs';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createHash,timingSafeEqual} from 'node:crypto';
import {act,code,easyBotAction,findPlayer,join,makeRoom,view} from './game.mjs';
import {observe,snapshot} from './match-context.mjs';
import {createFeedbackStore} from './feedback-store.mjs';
import {handleFeedback} from './feedback-api.mjs';

const root=path.dirname(fileURLToPath(import.meta.url));
const catalog=JSON.parse(await readFile(path.join(root,'cartas.json'),'utf8'));
const sharedBot=await createAsyncGameBotBridge({
 enabled:process.env.RUNAMARCA_SHARED_BOT!=='0',
 host:{view,easyBotAction},catalog,
 source:path.resolve(root,'../bot/runner/source'),hostSourceRoot:path.resolve(root,'..'),
 level:process.env.RUNAMARCA_BOT_LEVEL||'intermediario',
 style:process.env.RUNAMARCA_BOT_STYLE||'equilibrado'
});
const rooms=new Map();
// S6: match context + durable feedback (PostgreSQL via DATABASE_URL, else RUNAMARCA_FEEDBACK_DIR).
export const feedbackStore=await createFeedbackStore();
// Every engine action passes here so the match context sees it (before/after, accepted or not).
function observedAct(room,actor,data){const before=snapshot(room);try{act(room,actor,data,catalog);}catch(error){observe(room,{actor,action:data,before,error,store:feedbackStore});throw error;}observe(room,{actor,action:data,before,store:feedbackStore});}
registerGame('runamarca',rooms);
const accessSessions=createAccessSessions();
const attempts=new Map();
// Access code is stored as its SHA-256. RUNAMARCA_ACCESS_CODE_SHA256 optionally replaces the default
// (e.g. an isolated QA instance); a defined but empty or malformed value stops startup, never falls back.
export const defaultAccessHash='d1278d1e774f8b0c27c166302871dd40ccea755f31738a8210d70de8c44a9fe5';
export function accessCodeHash(env=process.env){
  const configured=env.RUNAMARCA_ACCESS_CODE_SHA256;
  if(configured===undefined)return defaultAccessHash;
  if(!/^[0-9a-f]{64}$/i.test(configured))throw Error('RUNAMARCA_ACCESS_CODE_SHA256 inválida: use o SHA-256 do código em 64 caracteres hexadecimais, ou remova a variável para manter o código padrão.');
  return configured.toLowerCase();
}
const accessHash=accessCodeHash();
const types={'.ttf':'font/ttf','.woff2':'font/woff2','.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.mp3':'audio/mpeg','.ogg':'audio/ogg','.wav':'audio/wav'};
const scheduleBot=createBotScheduler({bridge:sharedBot,isActive:room=>rooms.has(room.code),act:observedAct,persist:room=>persistMatch(room,'runamarca'),onFailure:(error,room)=>{if(process.env.RUNAMARCA_BOT_DIAGNOSTICS==='1')console.error('[bot]',room.phase,error.code||'ACTION_REJECTED',error.message);}});
function json(res,status,value){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));}
async function payload(req){let size=0;const parts=[];for await(const part of req){size+=part.length;if(size>32_000_000)throw Error('Arquivo acima do limite de 32 MB.');parts.push(part);}try{return JSON.parse(Buffer.concat(parts).toString('utf8'));}catch{throw Error('JSON inválido.');}}
function auth(req,room){const p=findPlayer(room,req.headers['x-player-token']);if(!p)throw Object.assign(Error('Acesso inválido.'),{code:'SEAT_INVALID'});return p;}
// S7 QA only: the room map of this process (same guard as createTestAccess).
export function roomsForTest(){if(process.env.NODE_ENV!=='test')throw Error('Apenas testes.');return rooms;}
export function createTestAccess(req={headers:{host:'localhost'}},base=''){if(process.env.NODE_ENV!=='test')throw Error('Apenas testes.');return accessSessions.issue(req,base);}
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
      attempts.delete(ip);accessSessions.grant(req,res,base);
      res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify({ok:true}));return;
    }
    let invited=false;
    if(!accessSessions.has(req,base)&&req.method==='GET'&&routePath==='/'&&url.searchParams.has('room')&&url.searchParams.has('invite')){
      const room=rooms.get(url.searchParams.get('room').toUpperCase());const invite=url.searchParams.get('invite');
      if(room&&typeof invite==='string'&&invite.length===room.inviteToken.length&&timingSafeEqual(Buffer.from(invite),Buffer.from(room.inviteToken))){accessSessions.grant(req,res,base);invited=true;}
    }
    if(!accessSessions.has(req,base)&&!invited){
      if(req.method==='GET'&&!routePath.startsWith('/api/')){res.writeHead(302,{Location:`${base}/access`,'Cache-Control':'no-store'});res.end();return;}
      return json(res,403,{error:'Informe o código de acesso antes de entrar no RunaMarca.',code:'ACCESS_REQUIRED'});
    }
    if(routePath==='/api/create'&&req.method==='POST'){
      const data=await payload(req);let id;do{id=code();}while(rooms.has(id));const room=makeRoom(id,data.name,data.role==='spectator'?'spectator':'player');room.stake=normalizeWager(data.stake);room.simulation=process.env.RUNAMARCA_SIMULATION==='1'?'env':data.simulation===true||req.headers['x-runamarca-run']==='simulation'?'request':null;room.onChange=()=>{observe(room,{store:feedbackStore});scheduleBot(room);void persistMatch(room,'runamarca');};const p=room.players[0]||room.spectators[0];await bindParticipant(req,room,p);rooms.set(id,room);enableMusicClock(room);return json(res,200,{code:id,token:p.token,state:view(room,p)});
    }
    const route=routePath.match(/^\/api\/rooms\/([A-F0-9]{6})\/(join|state|act|feedback)$/);
    if(route){const room=rooms.get(route[1]);if(!room)throw Object.assign(Error('Sala não encontrada.'),{code:'ROOM_NOT_FOUND'});const operation=route[2];
      if(operation==='join'&&req.method==='POST'){const data=await payload(req);const role=data.role==='spectator'||(data.role==='auto'&&(room.phase!=='lobby'||room.players.length>=2))?'spectator':'player';const probe={};await bindParticipant(req,room,probe);assertUniqueAccount(room,probe);const p=join(room,probe.name||data.name,role);p.discordId=probe.discordId;return json(res,200,{code:room.code,token:p.token,state:view(room,p)});}
      const p=auth(req,room);await verifyParticipant(req,p);room.updatedAt=Date.now();
      if(operation==='feedback')return handleFeedback({req,res,room,player:p,json,payload,store:feedbackStore,url});
      if(operation==='state'&&req.method==='GET'){
        if(url.searchParams.get('wait')==='1'&&url.searchParams.has('revision')){await waitRevision(room,Number(url.searchParams.get('revision')),res);if(res.destroyed)return;}
        if(url.searchParams.has('revision')&&Number(url.searchParams.get('revision'))===room.revision){res.writeHead(204,{'Cache-Control':'no-store'});return res.end();}
        return json(res,200,view(room,p));
      }
      if(operation==='act'&&req.method==='POST'){const data=await payload(req);await persistMatch(room,'runamarca');observedAct(room,p,data);await persistMatch(room,'runamarca');scheduleBot(room);if(data.type==='leave'){if(!room.spectators.length&&room.players.every(x=>x.bot)){clearTimeout(room.botTimer);sharedBot.clear(room);stopMusicClock(room);rooms.delete(room.code);}return json(res,200,{left:true});}return json(res,200,view(room,p));}
      return json(res,405,{error:'Método inválido.'});
    }
    if(req.method!=='GET')return json(res,405,{error:'Método inválido.'});
    if(routePath==='/criador'){res.writeHead(302,{Location:`${base}/criador/`});res.end();return;}
    // V26: one public table. Keep shared DOM/canvas modules; serve the 3D entry
    // at the canonical URL so access, room invitations and bookmarks stay valid.
    const assetPath=['/','/index.html','/hybrid/','/hybrid/index.html'].includes(routePath)?'/index.html':routePath==='/criador/'?'/criador/index.html':routePath;
    const rel=decodeURIComponent(assetPath).replace(/^\/+/, '')||'index.html';const file=path.resolve(root,rel);
    if(!file.startsWith(root+path.sep)||!types[path.extname(file)])return json(res,404,{error:'Não encontrado.'});
    try{const content=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)],'Cache-Control':'no-cache','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'});res.end(content);}catch{return json(res,404,{error:'Não encontrado.'});}
  }catch(error){json(res,400,{error:error.message||'Erro na mesa.',code:error.code||'INVALID_ACTION'});}
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
  http.createServer((req,res)=>handleNewGame(req,res)).listen(Number(process.env.PORT)||3042,process.env.PORT?'0.0.0.0':'127.0.0.1',()=>console.log(`RunaMarca novo: porta ${Number(process.env.PORT)||3042}`));
}
