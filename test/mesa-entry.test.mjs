import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
process.env.NODE_ENV='test';
process.env.RUNAMARCA_ACCESS_SECRET='isolated-canonical-entry-test';
delete process.env.DATABASE_URL;
const {server}=await import('../server.js');
const {createTestAccess}=await import('../mesa-nova/server.mjs');
test('entrada pública e aliases servem a mesa 3D, preservando acesso e convites',async t=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const base=`http://127.0.0.1:${server.address().port}`,host=new URL(base).host;
 for(const route of ['/runamarca/','/runamarca/index.html','/runamarca/hybrid/','/runamarca/hybrid/index.html']){
  const denied=await fetch(base+route,{redirect:'manual'});assert.equal(denied.status,302);assert.equal(denied.headers.get('location'),'/runamarca/access');
 }
 const headers={cookie:createTestAccess({headers:{host}},'/runamarca')};
 const expected=fs.readFileSync(new URL('../mesa-nova/index.html',import.meta.url),'utf8');
 for(const route of ['/runamarca/','/runamarca/index.html','/runamarca/hybrid/','/runamarca/hybrid/index.html']){
  const page=await fetch(base+route,{headers});assert.equal(page.status,200);assert.equal(await page.text(),expected);assert.equal(page.headers.get('cache-control'),'no-cache');
 }
 const created=await(await fetch(base+'/runamarca/api/create',{method:'POST',headers:{...headers,'content-type':'application/json'},body:JSON.stringify({name:'QA convite'})})).json();
 assert.ok(created.state.inviteToken);
 const invited=await fetch(base+`/runamarca/?room=${created.code}&invite=${created.state.inviteToken}`,{redirect:'manual'});
 assert.equal(invited.status,200);assert.equal(await invited.text(),expected);assert.match(invited.headers.get('set-cookie'),/HttpOnly/);
 const invalid=await fetch(base+`/runamarca/?room=${created.code}&invite=invalid`,{redirect:'manual'});assert.equal(invalid.status,302);
});
test('sala com código escolhido por quem cria: aceita, entra pelo mesmo código, recusa repetido e inválido',async t=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const base=`http://127.0.0.1:${server.address().port}`,host=new URL(base).host,headers={cookie:createTestAccess({headers:{host}},'/runamarca'),'content-type':'application/json'};
 const post=(route,body)=>fetch(base+'/runamarca/api/'+route,{method:'POST',headers,body:JSON.stringify(body)});
 const wanted='RUNA'+String(Date.now()%90+10);
 const made=await post('create',{name:'Dono',code:wanted.toLowerCase()});assert.equal(made.status,200);const room=await made.json();assert.equal(room.code,wanted);assert.equal(room.state.code,wanted);
 const joined=await post(`rooms/${wanted}/join`,{name:'Convidado',role:'player'});assert.equal(joined.status,200);const guest=await joined.json();assert.equal(guest.state.players.length,2);
 const state=await fetch(base+`/runamarca/api/rooms/${wanted}/state`,{headers:{...headers,'x-player-token':room.token}});assert.equal(state.status,200);
 const taken=await post('create',{name:'Outro',code:wanted});assert.equal(taken.status,409);assert.equal((await taken.json()).code,'ROOM_CODE_TAKEN');
 for(const bad of ['ABC','ÁBC123','AB C12','ABCDEFG'])assert.equal((await post('create',{name:'X',code:bad})).status,400,bad);
 const drawn=await(await post('create',{name:'Sorteado'})).json();assert.match(drawn.code,/^[A-F0-9]{6}$/);
});
