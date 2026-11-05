// Isolated, real PostgreSQL validation. No ambient DATABASE_URL or production service is used.
// node scripts/s6-postgres-real.mjs <portable-pg-bin> <new-output-directory>
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {randomBytes, createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import pg from 'pg';
import {createFeedbackStore} from '../mesa-nova/feedback-store.mjs';
import {handleFeedback} from '../mesa-nova/feedback-api.mjs';
import {observe, snapshot, contextFor, publicRecord} from '../mesa-nova/match-context.mjs';
import {beginMatch} from '../accounts.mjs';
import {answersFrom} from './survey-qa.mjs';
import {SURVEY_VERSION} from '../mesa-nova/survey.mjs';
import {setup, place, unit, act, catalog, resolveCombat} from '../mesa-nova/r1-fixtures.mjs';

const bin=path.resolve(process.argv[2]||''), out=path.resolve(process.argv[3]||'');
if(!process.argv[2]||!process.argv[3])throw Error('Provide PostgreSQL bin and a new evidence directory.');
await fs.mkdir(out); // Never overwrite another run.
const runtime=await fs.mkdtemp(path.join(os.tmpdir(),'runamarca-s6-postgres-'));
const data=path.join(runtime,'data'), log=path.join(runtime,'postgres.log');
const password=randomBytes(24).toString('hex'), passwordFile=path.join(runtime,'init-password');
const report={date:new Date().toISOString(),runtime,checks:[],hashes:{},scope:'Real PostgreSQL, pg driver and feedback handler; not a full browser match or Render deployment.'};
const products=['mesa-nova/game.mjs','mesa-nova/server.mjs','mesa-nova/match-context.mjs','mesa-nova/feedback-store.mjs','mesa-nova/feedback-api.mjs','mesa-nova/survey.mjs'];
for(const name of products)report.hashes[name]=createHash('sha256').update(await fs.readFile(name)).digest('hex');
const pools=new Set(), stores=new Set();let running=false;
const cleanError=e=>String(e?.stack||e).replaceAll(password,'[redacted]');
function command(exe,args){
 // On Windows the detached PostgreSQL child can inherit capture pipes and keep spawnSync open.
 // pg_ctl already sends server output to its dedicated log; do not give it capture pipes.
 const r=spawnSync(path.join(bin,exe+'.exe'),args,{encoding:'utf8',windowsHide:true,timeout:45000,...(exe==='pg_ctl'?{stdio:'ignore'}:{})});
 if(r.error||r.status!==0)throw Error(`${exe} failed: ${r.error?.message||r.stderr||r.stdout}`);
 return (r.stdout||'').trim();
}
async function check(name,fn){try{const detail=await fn();report.checks.push({name,pass:true,detail});console.log('PASS',name);}catch(e){report.checks.push({name,pass:false,error:cleanError(e)});console.log('FAIL',name);throw e;}}
async function freePort(){const s=net.createServer();await new Promise((ok,no)=>{s.once('error',no);s.listen(0,'127.0.0.1',ok);});const port=s.address().port;await new Promise(ok=>s.close(ok));return port;}
const port=await freePort();report.port=port;
const adminUrl=`postgresql://s6_admin:${password}@127.0.0.1:${port}/postgres`;
const databaseUrl=`postgresql://feedback_app:${password}@127.0.0.1:${port}/s6_feedback`;
function pool(url=databaseUrl){const p=new pg.Pool({connectionString:url,connectionTimeoutMillis:3000});pools.add(p);return p;}
async function closeConnections(){for(const s of stores){await s.close();stores.delete(s);}for(const p of pools){await p.end();pools.delete(p);}}
async function store(){const s=await createFeedbackStore({databaseUrl});stores.add(s);return s;}
function start(){running=true;command('pg_ctl',['-D',data,'-l',log,'-w','-t','30','start']);}
function stop(){command('pg_ctl',['-D',data,'-m','fast','-w','-t','30','stop']);running=false;}
function step(t,p,action){const before=snapshot(t.room);act(t.room,p,action,catalog);observe(t.room,{actor:p,action,before});}
function match({bot=false,simulation=false,finish=true}={}){
 const t=setup();t.b.bot=bot;t.room.simulation=simulation?'qa-explicit':null;beginMatch(t.room);observe(t.room);
 if(finish){place(t.a,unit(t.a,{attack:5,health:9}),0);t.b.patron.hp=1;
  for(let n=0;n<6&&t.room.phase==='prep';n++)step(t,t.room.players.find(p=>p.id===t.room.turn),{type:'endPrep'});
  if(t.room.phase==='vote')step(t,t.a,{type:'vote',fight:true});
  if(t.room.phase==='formation'){step(t,t.a,{type:'ready'});step(t,t.b,{type:'ready'});}
  assert.equal(t.room.phase,'resolving');resolveCombat(t.room);observe(t.room);assert.equal(t.room.phase,'finished');
 }
 return t;
}
// S7 contract: the questionnaire offered by the server (GET) defines valid answers; variant selects options.
const surveys=new Map();
async function offered(s,t,player){const k=t.room.matchId+':'+player.id;if(surveys.has(k))return surveys.get(k);let body;await handleFeedback({req:{method:'GET'},res:{},room:t.room,player,store:s,url:new URL('http://127.0.0.1/?matchId='+t.room.matchId),payload:async()=>({}),json:(r,code,value)=>{body=value;}});if(body?.survey)surveys.set(k,body.survey);return body?.survey||null;}
async function submit(s,t,player,variant=0,extra={}){
 const survey=await offered(s,t,player);let status,body;await handleFeedback({req:{method:'POST'},res:{},room:t.room,player,store:s,url:new URL('http://127.0.0.1/'),payload:async()=>({matchId:t.room.matchId,surveyVersion:survey?.version||SURVEY_VERSION,answers:answersFrom(survey,variant),...extra}),json:(r,code,value)=>{status=code;body=value;}});return {status,body};
}
try{
 report.binaryVersion=command('postgres',['--version']);
 await fs.writeFile(passwordFile,password,{flag:'wx'});
 try{command('initdb',['-D',data,'-U','s6_admin','--auth=scram-sha-256','--pwfile',passwordFile,'--no-locale','--encoding=UTF8']);}finally{await fs.unlink(passwordFile);}
 await fs.appendFile(path.join(data,'postgresql.conf'),`\nlisten_addresses = '127.0.0.1'\nport = ${port}\nmax_connections = 30\n`);
 start();
 const admin=pool(adminUrl);
 await admin.query(`CREATE ROLE feedback_app LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE`);
 await admin.query('CREATE DATABASE s6_feedback OWNER feedback_app');
 const sql=pool(), s=await store();
 await check('Real server and non-superuser application role',async()=>{const r=(await sql.query("select version(),current_user,(select rolsuper from pg_roles where rolname=current_user) as superuser,current_setting('listen_addresses') as listen")).rows[0];assert.equal(r.superuser,false);assert.equal(r.listen,'127.0.0.1');report.server=r;return r;});
 const pvp=match(), pve=match({bot:true}), sim=match({simulation:true}), ongoing=match({finish:false});
 await check('Schema creation and context JSONB round trip',async()=>{const c=publicRecord(contextFor(pvp.room.matchId));await s.saveContext(c);assert.deepEqual(await s.getContext(c.matchId),c);const tables=(await sql.query("select tablename from pg_tables where schemaname='public' order by tablename")).rows.map(r=>r.tablename);assert.equal(tables.length,2);return {tables};});
 await check('PvP answers separated; server context overrides client data',async()=>{const a=await submit(s,pvp,pvp.a,0,{context:{rounds:999}}),b=await submit(s,pvp,pvp.b,1);assert.equal(a.status,201);assert.equal(b.status,201);assert.notEqual(a.body.feedbackId,b.body.feedbackId);const rows=await s.listFeedback({matchId:pvp.room.matchId});assert.equal(rows.length,2);assert(rows.every(r=>r.context.rounds!==999));return {statuses:[a.status,b.status],rows:rows.length};});
 await check('Reordered resend is duplicate; changed answer is conflict',async()=>{const same=await submit(s,pvp,pvp.a,'reorder0'),different=await submit(s,pvp,pvp.a,2);assert.equal(same.status,200);assert.equal(same.body.status,'duplicate');assert.equal(different.status,409);return {same:same.status,different:different.status};});
 await check('Eight simultaneous submissions create one answer',async()=>{const t=match();await offered(s,t,t.a);// questionnaire fetched once, before the concurrent burst
 const results=await Promise.all(Array.from({length:8},()=>submit(s,t,t.a)));assert.equal(results.filter(r=>r.status===201).length,1);assert.equal(results.filter(r=>r.status===200).length,7);assert.equal((await s.listFeedback({matchId:t.room.matchId})).length,1);return {stored:1,duplicate:7};});
 await check('PvE human accepted and bot rejected',async()=>{const human=await submit(s,pve,pve.a),bot=await submit(s,pve,pve.b);assert.equal(human.status,201);assert.equal(bot.status,403);assert.equal((await s.listFeedback({matchId:pve.room.matchId})).length,1);return {human:human.status,bot:bot.status};});
 await check('Simulation, unfinished match, invalid participant and invalid answers rejected',async()=>{const cases=[await submit(s,sim,sim.a),await submit(s,ongoing,ongoing.a),await submit(s,pvp,{id:'foreign-seat'}),await submit(s,pvp,pvp.a,'invalid')];assert.deepEqual(cases.map(r=>r.status),[422,409,403,400]);assert.equal((await s.listFeedback({matchId:sim.room.matchId})).length,0);return {statuses:cases.map(r=>r.status)};});
 await check('New store initializes over existing tables and reads data',async()=>{const reopened=await store();assert.deepEqual(await reopened.getContext(pvp.room.matchId),await s.getContext(pvp.room.matchId));assert.equal((await reopened.listFeedback({matchId:pvp.room.matchId})).length,2);return {rows:2};});
 const beforeRestart=await s.listFeedback();
 const recoveryMatch=match();
 await offered(s,recoveryMatch,recoveryMatch.a);// questionnaire obtained while the database is up
 await closeConnections();stop();
 const retryStore=await store();
 await check('Database down produces 503 without confirmation',async()=>{const r=await submit(retryStore,recoveryMatch,recoveryMatch.a);assert.equal(r.status,503);assert.equal(r.body.code,'STORAGE_FAILED');return {status:r.status};});
 start();
 await check('Same store retries successfully after real PostgreSQL restart',async()=>{const prior=await retryStore.listFeedback({matchId:recoveryMatch.room.matchId});assert.equal(prior.length,0);const r=await submit(retryStore,recoveryMatch,recoveryMatch.a),dup=await submit(retryStore,recoveryMatch,recoveryMatch.a);assert.equal(r.status,201);assert.equal(dup.status,200);assert.equal((await retryStore.listFeedback({matchId:recoveryMatch.room.matchId})).length,1);return {stored:r.status,duplicate:dup.status};});
 await check('Earlier rows and context survive database restart',async()=>{const after=await retryStore.listFeedback();for(const old of beforeRestart)assert.deepEqual(after.find(r=>r.feedbackId===old.feedbackId),old);assert.equal((await retryStore.getContext(pvp.room.matchId)).finished,true);return {preserved:beforeRestart.length};});
 await check('Independent Node process recovers durable context and answers',async()=>{
  const source=`import {createFeedbackStore} from ${JSON.stringify(new URL('../mesa-nova/feedback-store.mjs',import.meta.url).href)};const s=await createFeedbackStore({databaseUrl:process.env.S6_TEST_DATABASE_URL});try{const rows=await s.listFeedback();const c=await s.getContext(process.env.S6_TEST_MATCH);console.log(JSON.stringify({count:rows.length,finished:c?.finished}));}finally{await s.close();}`;
  const child=spawnSync(process.execPath,['--input-type=module','-e',source],{encoding:'utf8',windowsHide:true,timeout:15000,env:{...process.env,DATABASE_URL:'',S6_TEST_DATABASE_URL:databaseUrl,S6_TEST_MATCH:pvp.room.matchId}});
  assert.equal(child.status,0,child.stderr);const result=JSON.parse(child.stdout);assert.equal(result.count,beforeRestart.length+1);assert.equal(result.finished,true);return result;
 });
 await check('Persisted examples contain no player tokens or database credential',async()=>{const rows=await retryStore.listFeedback();const serial=JSON.stringify(rows);for(const value of [password,pvp.a.token,pvp.b.token,pve.a.token])assert(!serial.includes(value));await fs.writeFile(path.join(out,'recovered-example.json'),JSON.stringify(rows.map(r=>({matchId:r.matchId,participant:r.participant.participantId,opponentKind:r.opponentKind,answers:r.answers,contextRounds:r.context.rounds})),null,2));return {records:rows.length};});
 await check('Product source hashes unchanged',async()=>{for(const file of products)assert.equal(createHash('sha256').update(await fs.readFile(file)).digest('hex'),report.hashes[file]);return {files:products.length};});
}catch(error){report.error=cleanError(error);console.error(cleanError(error));process.exitCode=1;}
finally{
 try{await closeConnections();if(running)stop();report.stopped=true;}catch(error){report.cleanupError=cleanError(error);process.exitCode=1;}
 try{await fs.copyFile(log,path.join(out,'postgres.log'));}catch{}
 await fs.writeFile(path.join(out,'results.json'),JSON.stringify(report,null,2));
 console.log(`${report.checks.filter(c=>c.pass).length}/${report.checks.length} checks; PostgreSQL stopped=${report.stopped===true}`);
}
