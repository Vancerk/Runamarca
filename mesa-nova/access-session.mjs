import {createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const accessSessionAge=30*24*60*60*1000;

function signingKey(){
  const configured=process.env.RUNAMARCA_ACCESS_SECRET||process.env.DISCORD_CLIENT_SECRET;
  if(configured)return createHmac('sha256',configured).update('runamarca-access-v2').digest();
  // Outside the public asset directory and excluded from Git. Reused after local restarts.
  const dir=fileURLToPath(new URL('../runtime/',import.meta.url)),file=path.join(dir,'runamarca-access.key');
  mkdirSync(dir,{recursive:true});
  try{writeFileSync(file,randomBytes(32),{flag:'wx',mode:0o600});}catch(error){if(error.code!=='EEXIST')throw error;}
  const key=readFileSync(file);
  if(key.length!==32)throw Error('Chave de acesso inválida.');
  return key;
}

export function createAccessSessions(key=signingKey(),now=Date.now){
  function scope(req,base=''){
    const host=String(req.headers.host||'localhost').toLowerCase();
    const local=/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host);
    const name=local?'rm_access_v2_'+(host.match(/:(\d+)$/)?.[1]||'default'):'rm_access_v2';
    return {name,audience:host+'|'+(base||'/')};
  }
  const signature=(payload,audience)=>createHmac('sha256',key).update(audience+'|'+payload).digest('hex');
  function issue(req,base=''){
    const {name,audience}=scope(req,base),payload=`${now()+accessSessionAge}.${randomBytes(16).toString('hex')}`;
    return `${name}=${payload}.${signature(payload,audience)}`;
  }
  function has(req,base=''){
    const {name,audience}=scope(req,base);
    const value=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='))?.slice(name.length+1);
    if(!value||!/^\d{13}\.[a-f0-9]{32}\.[a-f0-9]{64}$/.test(value))return false;
    const [expiry,nonce,mac]=value.split('.'),remaining=Number(expiry)-now();
    return remaining>0&&remaining<=accessSessionAge&&timingSafeEqual(Buffer.from(mac,'hex'),Buffer.from(signature(expiry+'.'+nonce,audience),'hex'));
  }
  function grant(req,res,base=''){
    const secure=req.socket.encrypted||req.headers['x-forwarded-proto']==='https'?'; Secure':'';
    res.setHeader('Set-Cookie',`${issue(req,base)}; HttpOnly; SameSite=Lax; Path=${base||'/'}; Max-Age=${accessSessionAge/1000}${secure}`);
  }
  return {issue,has,grant};
}
