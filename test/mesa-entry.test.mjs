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
