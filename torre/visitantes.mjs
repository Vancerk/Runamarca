import {randomBytes,createHmac,timingSafeEqual} from 'node:crypto';
const secret=randomBytes(32);
const signature=id=>createHmac('sha256',secret).update(id).digest('hex');
export function visitorIdentity(req,res){
 const raw=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('torre_visitor='))?.slice(14);
 const [id,tag]=String(raw||'').split('.');
 if(/^[a-f0-9]{32}$/.test(id||'')&&/^[a-f0-9]{64}$/.test(tag||'')&&timingSafeEqual(Buffer.from(tag),Buffer.from(signature(id))))return 'visitor:'+id;
 const next=randomBytes(16).toString('hex');
 res.setHeader('Set-Cookie',`torre_visitor=${next}.${signature(next)}; Path=/torre; HttpOnly; SameSite=Lax; Max-Age=86400${req.headers.host?.startsWith('127.0.0.1:')?'':'; Secure'}`);
 return 'visitor:'+next;
}
