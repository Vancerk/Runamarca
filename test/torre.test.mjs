import test from 'node:test';
import assert from 'node:assert/strict';
import {newDb,DataType} from 'pg-mem';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createDurableFiles} from '../torre/persistencia.mjs';
import {AccountStore,useTestStore} from '../accounts.mjs';
import {server} from '../server.js';
import {closeTorre} from '../torre/integracao.mjs';

function memoryPg(){const db=newDb({noAstCoverageCheck:true});db.public.registerFunction({name:'decode',args:[DataType.text,DataType.text],returns:DataType.bytea,implementation:(value,format)=>Buffer.from(value,format)});return db.adapters.createPg();}

test('Neon mirror survives restart, preserves binary files and enforces a storage budget',async()=>{
 const pg=memoryPg(),pool=new pg.Pool();const first=await mkdtemp(join(tmpdir(),'torre-first-')),second=await mkdtemp(join(tmpdir(),'torre-second-'));
 try{const storage=await createDurableFiles(pool,first,{limit:100});await writeFile(join(first,'personagens.json'),'[]');await mkdir(join(first,'anexos'));const name='a'.repeat(64)+'.png',bytes=Buffer.from([137,80,78,71,0,255]);await writeFile(join(first,'anexos',name),bytes);await storage.flush();await storage.flush();assert.equal((await pool.query('SELECT name FROM elysium_torre_files')).rows.length,2);
  await createDurableFiles(pool,second);assert.deepEqual(await readFile(join(second,'anexos',name)),bytes);assert.equal(await readFile(join(second,'personagens.json'),'utf8'),'[]');
  await writeFile(join(first,'relatorios.json'),'x'.repeat(101));await assert.rejects(storage.flush(),/limite reservado/);assert.equal((await pool.query('SELECT name FROM elysium_torre_files')).rows.length,2);
 }finally{await pool.end();await rm(first,{recursive:true,force:true});await rm(second,{recursive:true,force:true});}
});

test('Torre shares the games server and OAuth; rejects guests, users, forged origins and token setup',async()=>{
 process.env.NODE_ENV='test';process.env.DISCORD_CLIENT_ID='123456789012345678';process.env.DISCORD_CLIENT_SECRET='test-placeholder';process.env.DATABASE_URL='postgresql://unused/test';process.env.DISCORD_ADMIN_ID='1080332488070672484';delete process.env.DISCORD_BOT_TOKEN;
 const pg=memoryPg(),pool=new pg.Pool(),db=new AccountStore(pool);useTestStore(db);await db.upsert({id:process.env.DISCORD_ADMIN_ID,username:'admin'});await db.upsert({id:'222222222222222222',username:'player'});const admin='elysium_session='+await db.createSession(process.env.DISCORD_ADMIN_ID),player='elysium_session='+await db.createSession('222222222222222222');
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;process.env.DISCORD_REDIRECT_URI=base+'/auth/discord/callback';
 async function call(path,cookie='',data,origin=base){return fetch(base+path,{redirect:'manual',method:data?'POST':'GET',headers:{cookie,...(data?{origin,'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined});}
 try{
  assert.equal((await call('/')).status,200);assert.equal((await call('/dados')).status,200);assert.equal((await call('/health')).status,200);
  const guest=await call('/torre/');assert.equal(guest.status,302);assert.match(guest.headers.get('location'),/auth\/discord/);
  assert.equal((await call('/torre/api/config')).status,401);assert.equal((await call('/torre/',player)).status,403);assert.equal((await call('/torre/assets/detalhado-sem-codigos.webp',player)).status,403);
  const page=await call('/torre/',admin);assert.equal(page.status,200);assert.match(await page.text(),/\/account.js/);
  const config=await (await call('/torre/api/config',admin)).json();assert.equal(config.admin,true);assert.equal(config.managedAccount,true);assert.equal(config.ready,false);assert.ok(config.masters.some(m=>m.name==='Kagami'));
  const image=await call('/torre/assets/detalhado-sem-codigos.webp',admin);assert.equal(image.status,200);assert.ok((await image.arrayBuffer()).byteLength>2000000);
  assert.equal((await call('/torre/api/connect',admin,{token:'not-a-real-token'})).status,403);
  assert.equal((await call('/torre/api/characters/discord',admin,{id:'fake',discordId:'222222222222222222'},'https://attacker.invalid')).status,403);
  const roster=[{id:'character-test',name:'Teste',player:'Jogador fictício',level:2,division:'7ª Divisão',class:'Druida',virtue:'Fluxo'}];await pool.query('INSERT INTO elysium_torre_files(name,body,size) VALUES($1,$2,$3)',['personagens.json',Buffer.from(JSON.stringify(roster)),Buffer.byteLength(JSON.stringify(roster))]);await closeTorre();
  assert.equal((await (await call('/torre/api/characters',admin)).json())[0].name,'Teste');
  const saved=await call('/torre/api/characters/discord',admin,{id:'character-test',discordId:'222222222222222222'});assert.equal(saved.status,200);await closeTorre();assert.equal((await (await call('/torre/api/characters',admin)).json())[0].discordId,'222222222222222222');
  assert.equal((await call('/torre/api/admin/start',admin,{})).status,405);assert.equal((await call('/torre/api/admin/reports',player)).status,403);
  const index=await call('/torre/api/reports/index',admin);assert.equal(index.status,200);assert.deepEqual(await index.json(),[]);const conditional=await fetch(base+'/torre/api/reports/index',{headers:{cookie:admin,'If-None-Match':index.headers.get('etag')}});assert.equal(conditional.status,304);
  assert.equal((await call('/torre/api/reports/index',player)).status,403);
 }finally{await closeTorre();await new Promise(r=>server.close(r));await pool.end();}
});
