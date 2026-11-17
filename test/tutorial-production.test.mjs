import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {newDb} from 'pg-mem';
import {createProductionTutorial,tutorialBuild} from '../mesa-nova/tutorial/production-server.mjs';
import {openProductionTutorialStore} from '../mesa-nova/tutorial/production-store.mjs';
import {clock,humanAction} from '../mesa-nova/tutorial/tutorial-test-helpers.mjs';
process.env.NODE_ENV='test';
const endpoint='/runamarca/tutorial/';
async function fixture(options={}){
 const api=createProductionTutorial(options),server=http.createServer((req,res)=>api.handle(req,res,new URL(req.url,'http://local')));
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
 return {api,origin,async req(route,{body,token,foreign=false,headers={},method=body?'POST':'GET'}={}){const r=await fetch(origin+endpoint+route,{method,redirect:'manual',headers:{Origin:foreign?'https://example.invalid':origin,'Content-Type':'application/json',...(token?{'x-player-token':token}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,headers:r.headers,data:r.status===204?null:r.headers.get('content-type')?.includes('application/json')?await r.json():await r.text()};},async close(){await api.close();await new Promise(r=>{server.close(r);server.closeAllConnections();});}};
}
const memory=()=>{const rows=new Map();return {rows,kind:'memory',async get(k){return rows.has(k)?structuredClone(rows.get(k)):null;},async write(d){rows.set(d.tokenHash,structuredClone(d));},async close(){}};};

test('namespaced API preserves three victories, counters, revisits, owner auth, restart and duplicate receipts',async()=>{
 const store=memory(),time=clock();let f=await fixture({storeFactory:()=>store,clock:time,delay:5}),token,n=0,last;
 try{
  assert.equal((await f.req('api/tutorial',{body:{duel:1},foreign:true})).status,403);
  for(const duel of [1,2,3]){
   const started=await f.req('api/tutorial',{body:{duel,name:'CPU',progress:{won:true}},token});assert.equal(started.status,201,JSON.stringify(started.data));token=started.data.token;let s=started.data.state,steps=0;
   assert.equal(s.tutorial.campaign.duels.find(d=>d.duel===duel).won,false);
   assert.equal((await f.req('api/rooms/'+s.code+'/state',{token:'f'.repeat(48)})).status,403);
   while(s.tutorial.status==='active'&&steps++<500){
    const p=s.players.find(p=>p.id===s.you),pseudo={...p,vote:p.voted?true:null};
    const note=s.tutorial.instruction;
    let action=note?.kind==='explain'?{type:'tutorialContinue',sceneId:note.id}:s.tutorial.clock.paused?{type:'tutorialResume'}:humanAction({session:{room:s,player:pseudo,view:()=>s}});
    if(action){const cmd={id:'production-'+(++n),version:s.tutorial.version,action};const next=await f.req('api/rooms/'+s.code+'/act',{token,body:cmd});assert.equal(next.status,200,JSON.stringify(next.data));s=next.data;
     if(n===1){const duplicate=await f.req('api/rooms/'+s.code+'/act',{token,body:cmd});assert.equal(duplicate.data.tutorial.version,s.tutorial.version);}
    }else{time.tick(s.phase==='resolving'?100000:20);for(let k=0;k<15;k++)await Promise.resolve();s=(await f.req('api/rooms/'+s.code+'/state',{token})).data;}
   }
   assert.ok(steps<500);assert.equal(s.tutorial.status,'won');assert.ok(s.players.find(p=>p.id!==s.you).patron.hp<=0);last=s;
  }
  assert.equal(last.tutorial.campaign.duels.filter(d=>d.won).length,3);
  const counts=last.tutorial.guidance.counts;await f.close();f=await fixture({storeFactory:()=>store,clock:time,delay:5});
  const back=await f.req('api/tutorial',{token,body:{duel:2,resume:true}});assert.equal(back.status,201);assert.equal(back.data.state.tutorial.status,'won');assert.deepEqual(back.data.state.tutorial.guidance.counts,counts);
  assert.equal(back.data.state.tutorial.campaign.duels.filter(d=>d.won).length,3);
  assert.equal(JSON.stringify([...store.rows.values()]).includes(token),false);
 }finally{await f.close();}
});

test('PostgreSQL durable checkpoints preserve data and do not write normal match/account tables',async()=>{
 const db=newDb(),pool=new(db.adapters.createPg().Pool)();let created=false;
 // pg-mem rejects AST coverage for a repeated CREATE IF NOT EXISTS. Preserve
 // the first real DDL/constraints; emulate PostgreSQL's second no-op only.
 const database={async query(sql,args){const ddl=sql.startsWith('CREATE TABLE IF NOT EXISTS runamarca_tutorial_saves');if(ddl&&created)return {rows:[]};const value=await pool.query(sql,args);if(ddl)created=true;return value;}};
 let store=await openProductionTutorialStore({build:tutorialBuild,database}),f=await fixture({storeFactory:()=>store});
 try{const first=await f.req('api/tutorial',{body:{duel:2}});assert.equal(first.status,201);const {token,code,state}=first.data;
  const cmd={id:'db-receipt',version:state.tutorial.version,action:{type:'confirmMulligan'}};const changed=await f.req('api/rooms/'+code+'/act',{token,body:cmd});assert.equal(changed.status,200);
  await f.close();store=await openProductionTutorialStore({build:tutorialBuild,database});f=await fixture({storeFactory:()=>store});
  const back=await f.req('api/rooms/'+code+'/state',{token});assert.equal(back.status,200);assert.equal(back.data.tutorial.clock.paused,true);assert.deepEqual(back.data.players.find(p=>p.id===back.data.you).hand,changed.data.players.find(p=>p.id===changed.data.you).hand);
  const rows=await pool.query('SELECT token_hash,payload FROM runamarca_tutorial_saves');assert.equal(rows.rows.length,1);assert.equal(JSON.stringify(rows.rows).includes(token),false);
  const stale=await openProductionTutorialStore({build:tutorialBuild,database});const staleData=await stale.get(rows.rows[0].token_hash);
  const current=await store.get(rows.rows[0].token_hash);await store.write({...current,updatedAt:'newer'});
  await assert.rejects(stale.write({...staleData,updatedAt:'older'}),/Outro processo/);
  assert.equal((await pool.query('SELECT payload FROM runamarca_tutorial_saves')).rows[0].payload.updatedAt,'newer');
  const incompatible=await openProductionTutorialStore({build:'different-build',database});await assert.rejects(incompatible.get(rows.rows[0].token_hash),/Checkpoint incompatível/);
  assert.equal((await pool.query('SELECT payload FROM runamarca_tutorial_saves')).rows[0].payload.updatedAt,'newer');
  await assert.rejects(pool.query('SELECT * FROM elysium_matches'));
 }finally{await f.close();await pool.end();}
});

test('save failure pauses without acknowledging lost writes, and mismatched build is preserved',async()=>{
 const saved=memory();let broken=false;const store={...saved,async write(d){if(broken)throw Error('database unavailable');await saved.write(d);}};const f=await fixture({storeFactory:()=>store});
 try{const first=(await f.req('api/tutorial',{body:{duel:2}})).data,before=JSON.stringify([...saved.rows.values()]);broken=true;
  const fail=await f.req('api/rooms/'+first.code+'/act',{token:first.token,body:{id:'failure',version:first.state.tutorial.version,action:{type:'confirmMulligan'}}});assert.equal(fail.status,503);assert.equal(fail.data.code,'SAVE_FAILED');assert.equal(JSON.stringify([...saved.rows.values()]),before);
  const s=(await f.req('api/rooms/'+first.code+'/state',{token:first.token})).data;assert.equal(s.tutorial.clock.paused,true);assert.equal(s.tutorial.persistence.saved,false);
 }finally{await f.close();}
});

test('static assets, byte ranges, source privacy and no extra service are preserved',async()=>{
 const f=await fixture({storeFactory:()=>memory()});try{
  const page=await f.req('');assert.equal(page.status,200);assert.match(page.data,/Tutorial · RunaMarca/);
  for(const denied of ['production-store.mjs','production-server.mjs','tutorial-store.mjs','test-tutorial-foundation.mjs','.env','runtime/a.json'])assert.equal((await f.req(denied)).status,404,denied);
  assert.equal((await f.req('app.js')).data.includes("const gameBase='/runamarca/tutorial/';"),true);
  assert.equal((await f.req('app.js')).data.includes('runamarca-nova-seat'),false);
  const css=await f.req('tutorial-simple.css',{headers:{Range:'bytes=0-9'}});assert.equal(css.status,206);assert.equal(Buffer.byteLength(css.data),10);assert.match(css.headers.get('content-range'),/^bytes 0-9\//);
  assert.equal((await f.req('api/tutorial',{body:{duel:0}})).status,400);
 }finally{await f.close();}
});

test('full portal gate, normal room routes and menu assets coexist with tutorial',async()=>{
 process.env.RUNAMARCA_ACCESS_SECRET='publication-integration-test-only';delete process.env.DATABASE_URL;
 process.env.RUNAMARCA_TUTORIAL_DIR=fs.mkdtempSync(path.join(os.tmpdir(),'runamarca-publication-'));
 const {server}=await import('../server.js'),{createTestAccess}=await import('../mesa-nova/server.mjs');
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`,cookie=createTestAccess({headers:{host:new URL(origin).host}},'/runamarca');
 try{
  assert.equal((await fetch(origin+endpoint,{redirect:'manual'})).status,302);
  for(const route of [endpoint+'api/tutorial/progress',endpoint+'api/rooms/UNKNOWN/state','/runamarca/api/rooms/UNKNOWN/state']){
   const denied=await fetch(origin+route,{redirect:'manual'});assert.equal(denied.status,403,route);assert.equal(denied.headers.get('location'),null);assert.equal((await denied.json()).code,'ACCESS_REQUIRED');
  }
  const headers={cookie,Origin:origin,'Content-Type':'application/json'};
  const page=await fetch(origin+'/runamarca/',{headers});assert.match(await page.text(),/tutorial-entry.js/);
  for(const url of [endpoint,endpoint+'app.js','/dados','/'])assert.equal((await fetch(origin+url,{headers})).status,200,url);
  const normal=await(await fetch(origin+'/runamarca/api/create',{method:'POST',headers,body:JSON.stringify({name:'Normal'})})).json();assert.equal(normal.state.phase,'lobby');
  const lesson=await(await fetch(origin+endpoint+'api/tutorial',{method:'POST',headers,body:JSON.stringify({duel:1})})).json();assert.equal(lesson.state.tutorial.duel,1);
  assert.equal((await fetch(origin+'/runamarca/api/rooms/'+normal.code+'/state',{headers:{...headers,'x-player-token':normal.token}})).status,200);
  assert.equal((await fetch(origin+endpoint+'api/rooms/'+lesson.code+'/state',{headers:{...headers,'x-player-token':normal.token}})).status,403);
  const links=await(await fetch(origin+'/runamarca/tutorial-entry.js',{headers})).text();assert.match(links,/get\('rules-toggle'\)\.after\(during\)/);assert.match(links,/partida atual continua sem pausa/);assert.match(links,/não tem salvamento permanente/);
 }finally{await new Promise(r=>server.close(r));}
});
