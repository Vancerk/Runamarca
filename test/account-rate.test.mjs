import test from 'node:test';
import assert from 'node:assert/strict';
import {newDb} from 'pg-mem';
import {AccountStore,useTestStore} from '../accounts.mjs';
import {server} from '../server.js';
test('authenticated users sharing one IP do not consume one account quota; guests still have a limit',async()=>{
 Object.assign(process.env,{NODE_ENV:'test',DISCORD_CLIENT_ID:'fake',DISCORD_CLIENT_SECRET:'fake',DATABASE_URL:'postgresql://fake',DISCORD_REDIRECT_URI:'http://localhost/auth/discord/callback'});
 const pg=newDb({noAstCoverageCheck:true}).adapters.createPg(),pool=new pg.Pool(),store=new AccountStore(pool);useTestStore(store);const sessions=[];for(let n=0;n<45;n++){const id=String(800000000000000000n+BigInt(n));await store.upsert({id,username:'Ficticio '+n});sessions.push(await store.createSession(id));}
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 try{const result=await Promise.all(sessions.map(token=>fetch(base+'/api/account',{headers:{cookie:'elysium_session='+token}})));assert.ok(result.every(r=>r.status===200));const guest=[];for(let n=0;n<31;n++)guest.push((await fetch(base+'/api/account')).status);assert.equal(guest[30],429);}finally{await new Promise(r=>server.close(r));await pool.end();}
});
