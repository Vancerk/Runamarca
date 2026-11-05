// Local-only development entry point; uses the existing test-session issuer.
// No production entry point or game/access rules are modified.
import {randomBytes} from 'node:crypto';
process.env.NODE_ENV='test';
process.env.RUNAMARCA_ACCESS_SECRET=randomBytes(32).toString('hex');
for(const name of ['DATABASE_URL','DISCORD_CLIENT_ID','DISCORD_CLIENT_SECRET','DISCORD_REDIRECT_URI'])delete process.env[name];
const {server}=await import('../server.js');
const {createTestAccess}=await import('../mesa-nova/server.mjs');
server.prependListener('request',(req)=>{
 if(req.url.startsWith('/runamarca/'))req.headers.cookie=(req.headers.cookie?req.headers.cookie+'; ':'')+createTestAccess(req,'/runamarca');
});
const port=Number(process.env.PROTOTYPE_PORT||3086);
server.listen(port,'127.0.0.1',()=>console.log(`Prototype local: http://127.0.0.1:${port}/runamarca/`));
