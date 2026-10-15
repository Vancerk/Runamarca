import test from 'node:test';
import assert from 'node:assert/strict';
import {newDb} from 'pg-mem';
import {AccountStore,useTestStore} from '../accounts.mjs';
import {server} from '../server.js';
import {createTestAccess} from '../mesa-nova/server.mjs';
test('limite é compartilhado pelos jogos; visitante só assiste e somente admin desbloqueia',async()=>{
 Object.assign(process.env,{NODE_ENV:'test',DISCORD_CLIENT_ID:'fake',DISCORD_CLIENT_SECRET:'fake',DATABASE_URL:'postgresql://fake',DISCORD_ADMIN_ID:'111111111111111111'});delete process.env.DISCORD_BOT_TOKEN;
 const pg=newDb({noAstCoverageCheck:true}).adapters.createPg(),pool=new pg.Pool(),store=new AccountStore(pool);useTestStore(store);const cookies=[];
 for(const id of ['111111111111111111','222222222222222222']){await store.upsert({id,username:id});cookies.push('elysium_session='+await store.createSession(id));}
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;process.env.DISCORD_REDIRECT_URI=base+'/auth/discord/callback';const access=createTestAccess({headers:{host:new URL(base).host}},'/runamarca');
 const call=async(path,body,cookie='',token)=>{const r=await fetch(base+path,{method:body?'POST':'GET',headers:{cookie,origin:base,...(body?{'Content-Type':'application/json'}:{}),...(token?{'x-player-token':token}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,body:await r.json()};};
 try{
  assert.equal((await call('/api/dice/rooms',{name:'Guest'})).status,401);assert.equal((await call('/api/rooms',{name:'Guest'})).status,401);assert.equal((await call('/runamarca/api/create',{name:'Guest'},access)).status,401);
  const dice=await call('/api/dice/rooms',{name:'Player'},cookies[1]);assert.equal(dice.status,200);assert.equal((await call('/api/rooms',{name:'Player'},cookies[1])).status,200);assert.equal((await call('/runamarca/api/create',{name:'Player'},cookies[1]+'; '+access)).status,200);
  const guest=await call('/api/dice/rooms/'+dice.body.code+'/join',{name:'Guest',role:'player'});assert.equal(guest.status,200);const state=await call('/api/dice/rooms/'+dice.body.code+'/state',null,'',guest.body.token);assert.equal(state.body.spectator,true);assert.equal((await call('/api/dice/rooms/'+dice.body.code+'/action',{type:'takeSeat'},'',guest.body.token)).status,401);
  assert.equal((await call('/api/dice/rooms',{name:'Fourth'},cookies[1])).status,429);for(let i=0;i<4;i++)assert.equal((await call('/api/rooms',{name:'Again'},cookies[1])).status,429);assert.equal((await call('/api/rooms',{name:'Blocked'},cookies[1])).status,403);
  assert.equal((await call('/api/admin/room-limits',null,cookies[1])).status,403);assert.equal((await call('/api/admin/room-limits/unblock',{id:'222222222222222222'},cookies[1])).status,403);const limits=await call('/api/admin/room-limits',null,cookies[0]);assert.equal(limits.body.limits[0].blocked,true);assert.equal((await call('/api/admin/room-limits/unblock',{id:'222222222222222222'},cookies[0])).status,200);assert.equal((await call('/api/dice/rooms',{name:'Allowed'},cookies[1])).status,200);
 }finally{await new Promise(r=>server.close(r));await pool.end();}
});
