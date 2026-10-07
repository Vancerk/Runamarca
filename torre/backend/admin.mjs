import {randomBytes,timingSafeEqual} from 'node:crypto';
import {ReportError} from './relatorios-core.mjs';
export function createAdmin(adminId){
 const requests=new Map(),sessions=new Map();
 const equal=(a,b)=>{const left=Buffer.from(String(a||'')),right=Buffer.from(String(b||''));return left.length===right.length&&timingSafeEqual(left,right);};
 function cleanup(){for(const [k,v]of requests)if(v.expires<Date.now())requests.delete(k);for(const [k,v]of sessions)if(v.expires<Date.now())sessions.delete(k);}
 return {
  start(){cleanup();if(requests.size>=30)throw new ReportError('Tente entrar novamente mais tarde.',429);const code=randomBytes(8).toString('hex').toUpperCase(),secret=randomBytes(24).toString('hex');requests.set(code,{secret,expires:Date.now()+600000,authorized:false});return {code,secret,command:'/administrar codigo:'+code};},
  authorize(code,userId){cleanup();if(userId!==adminId)throw new ReportError('Esta área está reservada ao administrador.',403);const entry=requests.get(String(code||'').toUpperCase());if(!entry)throw new ReportError('Código inválido ou expirado.');entry.authorized=true;},
  finish(code,secret){cleanup();const entry=requests.get(code);if(!entry||!equal(secret,entry.secret))throw new ReportError('Solicitação inválida.',403);if(!entry.authorized)return null;const token=randomBytes(32).toString('hex');sessions.set(token,{id:adminId,expires:Date.now()+28800000});requests.delete(code);return token;},
  user(req){cleanup();const token=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('legion_admin='))?.slice(13);return sessions.get(token)?.id||null;},
  require(req){const id=this.user(req);if(!id)throw new ReportError('Entre como administrador para acessar esta operação.',403);return id;},
  logout(req){const token=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('legion_admin='))?.slice(13);sessions.delete(token);}
 };
}
