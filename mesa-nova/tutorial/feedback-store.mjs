// S6: durable storage for match contexts and feedback answers.
// PostgreSQL when DATABASE_URL is set (same configuration as the account database, `pg`
// package); otherwise a directory (RUNAMARCA_FEEDBACK_DIR, default ./.runamarca-feedback).
// Feedback writes are create-only: the first record for (matchId, participant) wins, a resend
// is reported as duplicate and never overwrites. Errors propagate: nothing is confirmed
// before the record is on disk / committed.
import fs from 'node:fs/promises';import {constants} from 'node:fs';import path from 'node:path';import {randomUUID} from 'node:crypto';
async function writeAtomic(file,data){const tmp=`${file}.${randomUUID()}.tmp`;await fs.writeFile(tmp,data,{flag:'wx'});const fh=await fs.open(tmp,'r+');try{await fh.sync();}finally{await fh.close();}return tmp;}
function fileStore(dir){
 const ctxDir=path.join(dir,'contexts'),fbDir=path.join(dir,'feedback'),contextWrites=new Map();let ready=null;
 // A failed initialisation is not cached: the next operation retries it.
 const init=()=>ready??=Promise.all([fs.mkdir(ctxDir,{recursive:true}),fs.mkdir(fbDir,{recursive:true})]).catch(e=>{ready=null;throw e;});
 const safe=id=>{if(!/^[A-Za-z0-9-]{8,64}$/.test(String(id)))throw Object.assign(Error('Identificador inválido.'),{code:'BAD_ID'});return id;};
 const read=async file=>{try{return JSON.parse(await fs.readFile(file,'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw e;}};
 return {backend:'file',dir,
  async saveContext(ctx){
   // The end of a match and both submissions can replace the same file at once. Windows can
   // refuse the second rename while the first is closing; keep atomic writes ordered per match.
   const file=path.join(ctxDir,safe(ctx.matchId)+'.json'),data=JSON.stringify(ctx,null,1);
   const write=async()=>{await init();const tmp=await writeAtomic(file,data);try{await fs.rename(tmp,file);}catch(error){await fs.unlink(tmp).catch(()=>{});throw error;}};
   const prior=contextWrites.get(file),pending=prior?prior.then(write,write):write();
   contextWrites.set(file,pending);
   try{await pending;return ctx;}finally{if(contextWrites.get(file)===pending)contextWrites.delete(file);}
  },
  async getContext(matchId){await init();return read(path.join(ctxDir,safe(matchId)+'.json'));},
  async saveFeedback(rec){await init();const file=path.join(fbDir,safe(rec.feedbackId)+'.json'),tmp=await writeAtomic(file,JSON.stringify(rec,null,1));
   try{await fs.link(tmp,file);}catch(e){if(e.code==='EEXIST'){await fs.unlink(tmp).catch(()=>{});return {status:'duplicate',record:await read(file)};}
    if(['EPERM','ENOTSUP','EXDEV'].includes(e.code)){try{await fs.copyFile(tmp,file,constants.COPYFILE_EXCL);}catch(c){await fs.unlink(tmp).catch(()=>{});if(c.code==='EEXIST')return {status:'duplicate',record:await read(file)};throw c;}}else{await fs.unlink(tmp).catch(()=>{});throw e;}}
   await fs.unlink(tmp).catch(()=>{});return {status:'stored',record:rec};},
  async getFeedback(id){await init();return read(path.join(fbDir,safe(id)+'.json'));},
  async listFeedback({matchId}={}){await init();const out=[];for(const f of await fs.readdir(fbDir))if(f.endsWith('.json')){const r=await read(path.join(fbDir,f));if(r&&(!matchId||r.matchId===matchId))out.push(r);}return out.sort((a,b)=>a.submittedAt.localeCompare(b.submittedAt));}};}
function pgStore(url,PoolCtor){
 let pool,ready=null;
 // A failed initialisation releases its pool and is retried by the next operation.
 const init=()=>ready??=(async()=>{const attempt=new PoolCtor({connectionString:url,max:3});try{await attempt.query(`create table if not exists runamarca_match_context(match_id text primary key,payload jsonb not null,saved_at timestamptz not null default now());
  create table if not exists runamarca_match_feedback(feedback_id text primary key,match_id text not null,participant_id text not null,payload jsonb not null,submitted_at timestamptz not null default now(),unique(match_id,participant_id));`);}catch(e){await attempt.end().catch(()=>{});ready=null;throw e;}pool=attempt;})();
 return {backend:'postgres',
  async saveContext(ctx){await init();await pool.query('insert into runamarca_match_context(match_id,payload) values($1,$2) on conflict(match_id) do update set payload=excluded.payload,saved_at=now()',[ctx.matchId,ctx]);return ctx;},
  async getContext(id){await init();return (await pool.query('select payload from runamarca_match_context where match_id=$1',[id])).rows[0]?.payload||null;},
  async saveFeedback(rec){await init();const r=await pool.query('insert into runamarca_match_feedback(feedback_id,match_id,participant_id,payload) values($1,$2,$3,$4) on conflict do nothing returning feedback_id',[rec.feedbackId,rec.matchId,rec.participant.participantId,rec]);
   if(r.rowCount)return {status:'stored',record:rec};return {status:'duplicate',record:(await pool.query('select payload from runamarca_match_feedback where feedback_id=$1',[rec.feedbackId])).rows[0]?.payload||null};},
  async getFeedback(id){await init();return (await pool.query('select payload from runamarca_match_feedback where feedback_id=$1',[id])).rows[0]?.payload||null;},
  async listFeedback({matchId}={}){await init();return (await pool.query(matchId?'select payload from runamarca_match_feedback where match_id=$1 order by submitted_at':'select payload from runamarca_match_feedback order by submitted_at',matchId?[matchId]:[])).rows.map(r=>r.payload);},
  async close(){await pool?.end();}};}
// Pool: optional constructor for tests (e.g. an emulator); production uses pg.Pool.
export async function createFeedbackStore({databaseUrl=process.env.DATABASE_URL,dir=process.env.RUNAMARCA_FEEDBACK_DIR||path.resolve('.runamarca-feedback'),Pool=null}={}){
 if(databaseUrl){const PoolCtor=Pool||(await import('pg')).default.Pool;return pgStore(databaseUrl,PoolCtor);}
 return fileStore(dir);}
