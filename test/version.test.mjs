import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
process.env.NODE_ENV='test';
const {server}=await import('../server.js');

test('versão pública vem do manifesto, sem segredos e sem alterar o health check',async t=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
  const base=`http://127.0.0.1:${server.address().port}`;
  const response=await fetch(base+'/api/runamarca/version');assert.equal(response.status,200);
  const data=await response.json();const meta=JSON.parse(fs.readFileSync(new URL('../mesa-nova/version.json',import.meta.url),'utf8'));
  assert.equal(data.version,meta.version);assert.equal(data.label,meta.label);
  assert.equal(data.environment,'local-test');assert.equal(response.headers.get('cache-control'),'no-store');
  assert(!('DATABASE_URL' in data));assert(!('DISCORD_CLIENT_SECRET' in data));
  assert.deepEqual(await(await fetch(base+'/health')).json(),{ok:true});
});
