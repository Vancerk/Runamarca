import test from 'node:test';
import assert from 'node:assert/strict';
import {newDb} from 'pg-mem';
import {AccountStore,useTestStore,normalizeWager,summarizeWagers,beginMatch,persistMatch} from '../accounts.mjs';
import {server} from '../server.js';

test('Bronze mantém equivalência das moedas e itens separados',()=>{
  assert.deepEqual(normalizeWager('2 Or + 35 Pr + 70 Br'),{bronze:23570,items:[]});
  assert.equal(normalizeWager('1 Pl').bronze,1000000);
  assert.deepEqual(normalizeWager('uma chave'),{bronze:0,items:[{name:'uma chave',quantity:1}]});
  assert.throws(()=>normalizeWager({bronze:1.5}));
  assert.deepEqual(summarizeWagers([{wager:{bronze:100,items:[{name:'Chave',quantity:2}]},outcome:'loss'}]),{bet:100,won:0,lost:100,items:{Chave:{bet:2,won:0,lost:2}}});
});

test('login OAuth, sessão persistente, administrador, inventário e resultados',async()=>{
  process.env.NODE_ENV='test';process.env.DISCORD_CLIENT_ID='123456789012345678';process.env.DISCORD_CLIENT_SECRET='test-only-placeholder';process.env.DATABASE_URL='postgresql://unused/test';process.env.DISCORD_ADMIN_ID='1080332488070672484';
  const pg=newDb().adapters.createPg();const pool=new pg.Pool();const store=new AccountStore(pool);useTestStore(store);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;process.env.DISCORD_REDIRECT_URI=base+'/auth/discord/callback';
  const realFetch=globalThis.fetch;
  let discordUser={id:process.env.DISCORD_ADMIN_ID,username:'van',global_name:'Van',avatar:null};
  globalThis.fetch=async(input,options)=>{if(String(input)==='https://discord.com/api/oauth2/token')return new Response(JSON.stringify({access_token:'fake-test-access-token'}),{status:200});if(String(input)==='https://discord.com/api/users/@me')return new Response(JSON.stringify(discordUser),{status:200});return realFetch(input,options);};
  async function call(path,data,cookie='',token=''){const response=await realFetch(base+path,{method:data?'POST':'GET',redirect:'manual',headers:{...(data?{'content-type':'application/json',origin:base}:{}),...(cookie?{cookie}:{}),...(token?{'x-player-token':token}:{})},body:data?JSON.stringify(data):undefined});return {status:response.status,response,data:response.headers.get('content-type')?.includes('application/json')?await response.json():null};}
  async function login(){const start=await call('/auth/discord?return=%2Fperfil');assert.equal(start.status,302);const target=new URL(start.response.headers.get('location'));assert.equal(target.searchParams.get('scope'),'identify');const state=target.searchParams.get('state');const cookie=start.response.headers.get('set-cookie').split(';')[0];const finish=await call('/auth/discord/callback?code=test-code&state='+state,null,cookie);assert.equal(finish.status,302);assert.equal(finish.response.headers.get('location'),'/perfil');return {cookie:finish.response.headers.getSetCookie().find(c=>c.startsWith('elysium_session=')).split(';')[0],state,oauthCookie:cookie};}
  try{
    const admin=await login();const who=await call('/api/account',null,admin.cookie);assert.equal(who.data.user.admin,true);
    const hashes=await store.query('SELECT token_hash FROM elysium_sessions');assert.notEqual(hashes.rows[0].token_hash,admin.cookie.split('=')[1]);
    const profile=await call('/api/account/profile',null,admin.cookie);assert.deepEqual(profile.data.inventory,[]);
    const replay=await call('/auth/discord/callback?code=test-code&state='+admin.state,null,admin.oauthCookie);assert.match(replay.response.headers.get('location'),/expired/);
    const changed=await call('/auth/discord/callback?code=test-code&state=wrong',null,admin.oauthCookie);assert.match(changed.response.headers.get('location'),/expired/);
    discordUser={id:'222222222222222222',username:'friend',global_name:'Amigo',avatar:null};const friend=await login();
    assert.equal((await call('/api/admin/rooms',null,friend.cookie)).status,403);
    const forged=await realFetch(base+'/api/admin/inventory',{method:'POST',headers:{cookie:admin.cookie,origin:'https://attacker.invalid','content-type':'application/json'},body:JSON.stringify({id:discordUser.id,insignia:'defesa-estanho',operation:'grant'})});assert.equal(forged.status,403);
    const search=await call('/api/admin/players?search=friend',null,admin.cookie);assert.equal(search.data.players[0].id,discordUser.id);
    assert.equal((await call('/api/admin/inventory',{id:discordUser.id,insignia:'defesa-estanho',operation:'grant'},admin.cookie)).status,200);
    assert.deepEqual(await store.inventory(discordUser.id),['defesa-estanho']);
    const dice=await call('/api/dice/rooms',{name:'Fake name',target:1000,stake:'2 Pr'},friend.cookie);assert.equal(dice.status,200);
    const dicePath=`/api/dice/rooms/${dice.data.code}`;
    assert.equal((await call(dicePath+'/join',{name:'Other'},friend.cookie)).status,400);
    const joined=await call(dicePath+'/join',{name:'Van'},admin.cookie);assert.equal(joined.status,200);
    assert.equal((await call(dicePath+'/state',null,'',dice.data.token)).status,400);
    const state=await call(dicePath+'/state',null,friend.cookie,dice.data.token);assert.deepEqual(state.data.ownedInsignias,['defesa-estanho']);assert.equal(state.data.players[0].name,'Amigo');
    const unauthorized=await call(dicePath+'/action',{type:'propose',insignia:'imperador'},friend.cookie,dice.data.token);assert.equal(unauthorized.status,400);
    assert.equal((await call(dicePath+'/action',{type:'propose',insignia:'defesa-estanho'},friend.cookie,dice.data.token)).status,200);
    await call('/api/admin/inventory',{id:discordUser.id,insignia:'defesa-estanho',operation:'revoke'},admin.cookie);
    assert.deepEqual(await store.inventory(discordUser.id),[]);
    await call('/api/admin/inventory',{id:process.env.DISCORD_ADMIN_ID,insignia:'defesa-estanho',operation:'grant'},admin.cookie);
    assert.equal((await call(dicePath+'/action',{type:'accept',insignia:'defesa-estanho'},admin.cookie,joined.data.token)).status,400,'revoked proposal cannot be accepted');
    const room={code:'ABCDEF',stake:'2 Or + 35 Pr + 70 Br',players:[{id:'a',discordId:process.env.DISCORD_ADMIN_ID,name:'Van'},{id:'b',discordId:discordUser.id,name:'Amigo'}]};beginMatch(room);room.phase='finished';room.winner='a';await persistMatch(room,'runamarca');assert.equal(room.recording,'saved');await persistMatch(room,'runamarca');room.recording='pending';await persistMatch(room,'runamarca');
    const dbProfile=await store.profile(process.env.DISCORD_ADMIN_ID);assert.equal(dbProfile.matches.length,1);assert.equal(dbProfile.wagers.won,23570);assert.equal(Number(dbProfile.stats[0].count),1);
    const guestRoom={...room,players:[{id:'a',discordId:process.env.DISCORD_ADMIN_ID,name:'Van'},{id:'guest',name:'Convidado'}]};beginMatch(guestRoom);guestRoom.phase='finished';await persistMatch(guestRoom,'runamarca');assert.equal(guestRoom.recording,'unranked');
    const botRoom={...room,players:[{id:'a',discordId:process.env.DISCORD_ADMIN_ID,name:'Van'},{id:'b',discordId:discordUser.id,bot:true,name:'Bot'}]};beginMatch(botRoom);botRoom.phase='finished';await persistMatch(botRoom,'runamarca');assert.equal(botRoom.recording,'unranked');
    assert.equal((await call('/api/admin/rooms',null,admin.cookie)).data.rooms[0].game,'seis-ossos');
    assert.equal((await call('/auth/logout',{},friend.cookie)).status,200);assert.equal((await call('/api/account',null,friend.cookie)).data.user,null);
  }finally{globalThis.fetch=realFetch;await new Promise(resolve=>server.close(resolve));await pool.end();}
});
