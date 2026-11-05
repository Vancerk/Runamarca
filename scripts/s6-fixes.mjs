// S6 focal fixes: (1) spell / Emanação classification by real catalog type and mode, through the
// engine; (2) storage initialisation retry on the same instance (directory and SQL backend on the
// project's pg-mem emulator — not a real PostgreSQL); (3) reordered identical answers = duplicate.
// Usage: node scripts/s6-fixes.mjs <out-dir>
import fs from 'node:fs';import path from 'node:path';
import {harness,finish} from './hybrid12-lib.mjs';
import {setup,place,unit,card,act,catalog,resolveCombat} from '../mesa-nova/r1-fixtures.mjs';
import {beginMatch} from '../accounts.mjs';
import {observe,snapshot,contextFor} from '../mesa-nova/match-context.mjs';
import {createFeedbackStore} from '../mesa-nova/feedback-store.mjs';
import {handleFeedback} from '../mesa-nova/feedback-api.mjs';
import {answersFrom} from './survey-qa.mjs';
const out=path.resolve(process.argv[2]||'prototype-qa/s6/fixes'),H=harness(out),{check}=H;fs.rmSync(path.join(out,'store'),{recursive:true,force:true});
const typeOf=id=>{let t=null;const walk=o=>{if(t)return;if(Array.isArray(o))o.forEach(walk);else if(o&&typeof o==='object'){if(o.id===id&&o.type&&o.name)t=o.type;else Object.values(o).forEach(walk);}};walk(JSON.parse(fs.readFileSync(new URL('../mesa-nova/cartas.json',import.meta.url))));return t;};
const step=(room,actor,action,store=null)=>{const before=snapshot(room);try{act(room,actor,action,catalog);observe(room,{actor,action,before,store});return 'ok';}catch(e){observe(room,{actor,action,before,error:e,store});return 'ERR '+e.message;}};
function fresh(){const t=setup();beginMatch(t.room);t.room.phase='prep';t.room.turn=t.a.id;t.a.mana=t.a.manaMax=10;observe(t.room,{});return t;}
const partOf=(t,p)=>contextFor(t.room.matchId).participants.find(x=>x.participantId===p.id);
// 1 · classification through the engine
const report={types:{FEX05:typeOf('FEX05'),FL13:typeOf('FL13'),FV03:typeOf('FV03')}};
{const t=fresh(),ally=place(t.a,unit(t.a),0),c=card('FEX05',t.a);t.a.hand.push(c);const r=step(t.room,t.a,{type:'play',cardId:c.uid,mode:'direct',targetId:ally.uid});const p=partOf(t,t.a);
 check(`magia direta (${report.types.FEX05}) FEX05: usedCards 1, spellsDirect 1, spellsPrepared 0`,r==='ok'&&p.usedCards.FEX05===1&&p.style.spellsDirect===1&&p.style.spellsPrepared===0,{r,used:p.usedCards,style:p.style});}
{const t=fresh(),c=card('FL13',t.a);t.a.hand.push(c);const r=step(t.room,t.a,{type:'play',cardId:c.uid,mode:'lane',lane:1,targetSide:t.b.id});const p=partOf(t,t.a);
 check(`magia preparada (${report.types.FL13}) FL13 em casa rival: usedCards 1, spellsPrepared 1, spellsDirect 0`,r==='ok'&&p.usedCards.FL13===1&&p.style.spellsPrepared===1&&p.style.spellsDirect===0,{r,used:p.usedCards,style:p.style});}
{const t=fresh(),c=card('FV03',t.a);t.a.hand.push(c);const r=step(t.room,t.a,{type:'play',cardId:c.uid,mode:'emanate'});const p=partOf(t,t.a);
 check(`entrada direta em Emanação (${report.types.FV03}) FV03 via play/mode:emanate: creatures 1, emanations 1, carta usada`,r==='ok'&&t.a.emanation.includes(c.uid)&&p.usedCards.FV03===1&&p.style.creatures===1&&p.style.emanations===1&&p.style.spellsDirect===0,{r,emanation:t.a.emanation,used:p.usedCards,style:p.style});}
// helpers for finished matches + handler calls
function finished(){const t=fresh();place(t.a,unit(t.a,{attack:5,health:9}),0);t.b.patron.hp=1;for(let g=0;g<6&&t.room.phase==='prep';g++)step(t.room,t.room.players.find(p=>p.id===t.room.turn),{type:'endPrep'});
 if(t.room.phase==='vote')step(t.room,t.a,{type:'vote',fight:true});if(t.room.phase==='formation'){step(t.room,t.a,{type:'ready'});step(t.room,t.b,{type:'ready'});}
 if(t.room.phase==='resolving'){t.room.combat.startedAt-=t.room.combat.duration+10;resolveCombat(t.room);observe(t.room,{});}return t;}
async function offered(t,player,store){let value;await handleFeedback({req:{method:'GET'},res:{},room:t.room,player,url:new URL('http://x/?matchId='+t.room.matchId),store,payload:async()=>({}),json:(r,s,v)=>{value=v;}});return value.survey;}
async function call(t,player,body,store){let status,value;await handleFeedback({req:{method:'POST'},res:{},room:t.room,player,url:new URL('http://x/'),store,payload:async()=>body,json:(r,s,v)=>{status=s;value=v;}});return {status,value};}
// 2a · directory store: init fails, cause removed, same instance works
{const dir=path.join(out,'store','dir-retry');fs.mkdirSync(path.dirname(dir),{recursive:true});fs.writeFileSync(dir,'bloqueio');const s=await createFeedbackStore({databaseUrl:'',dir});
 const rec={feedbackId:'a'.repeat(32),matchId:'retry-match-1',participant:{participantId:'p1'},contentHash:'h',submittedAt:new Date().toISOString(),answers:{fun:3}};
 let first=null;try{await s.saveFeedback(rec);first='gravou';}catch(e){first=e.code||e.message;}
 fs.rmSync(dir);const second=await s.saveFeedback(rec),back=await s.getFeedback(rec.feedbackId),again=await s.saveFeedback(rec),list=await s.listFeedback();
 check('diretório: 1ª operação falha, causa removida, mesma instância grava, recupera e não duplica',first!=='gravou'&&second.status==='stored'&&back?.answers.fun===3&&again.status==='duplicate'&&list.length===1,{first,second:second.status,again:again.status,count:list.length});}
// 2b · SQL backend on pg-mem: first pool fails to initialise, is released, retry succeeds
const {newDb}=await import('pg-mem');const db=newDb();const {Pool:MemPool}=db.adapters.createPg();let made=0;const ended=[];
class FlakyPool extends MemPool{constructor(o){super(o);this.n=++made;}query(...a){if(this.n===1)return Promise.reject(Object.assign(Error('connect ECONNREFUSED (simulado)'),{code:'ECONNREFUSED'}));return super.query(...a);}end(){ended.push(this.n);return super.end?super.end():Promise.resolve();}}
{const s=await createFeedbackStore({databaseUrl:'postgres://emulador-pg-mem/test',Pool:FlakyPool});const rec={feedbackId:'b'.repeat(32),matchId:'retry-match-2',participant:{participantId:'p2'},contentHash:'h',submittedAt:new Date().toISOString(),answers:{fun:5}};
 let first=null;try{await s.saveFeedback(rec);first='gravou';}catch(e){first=e.code;}
 const second=await s.saveFeedback(rec),back=await s.getFeedback(rec.feedbackId),again=await s.saveFeedback(rec),rows=db.public.many('select count(*)::int as n from runamarca_match_feedback')[0].n;
 check('SQL (pg-mem): 1ª inicialização falha e libera o pool, nova tentativa na mesma instância grava, recupera e não duplica',s.backend==='postgres'&&first==='ECONNREFUSED'&&ended.includes(1)&&second.status==='stored'&&back?.answers.fun===5&&again.status==='duplicate'&&rows===1&&made===2,{first,ended,pools:made,second:second.status,again:again.status,rows});}
// 3 · reordered identical answers are the same content; different answers still refused
const fileStore=await createFeedbackStore({databaseUrl:'',dir:path.join(out,'store','file')});
// A separate emulator instance: pg-mem does not re-plan `create table if not exists … unique(…)` over existing tables.
const {Pool:MemPool2}=newDb().adapters.createPg();
for(const [label,store] of [['diretório',fileStore],['SQL (pg-mem)',await createFeedbackStore({databaseUrl:'postgres://emulador-pg-mem/test',Pool:MemPool2})]]){
 const t=finished();const mid=t.room.matchId;await contextFor(mid).persisted;
 const sa=await offered(t,t.a,store),sb=await offered(t,t.b,store),v=sa.version;
 const r1=await call(t,t.a,{matchId:mid,surveyVersion:v,answers:answersFrom(sa,0)},store),r2=await call(t,t.a,{matchId:mid,surveyVersion:v,answers:answersFrom(sa,'reorder0')},store),r3=await call(t,t.a,{matchId:mid,surveyVersion:v,answers:answersFrom(sa,2)},store),rb=await call(t,t.b,{matchId:mid,surveyVersion:v,answers:answersFrom(sb,1)},store);
 const list=await store.listFeedback({matchId:mid}),ctx=await store.getContext(mid);
 check(`${label}: respostas reordenadas = reenvio equivalente (200 duplicate); diferentes = 409; 2º humano independente; contexto gravado`,r1.status===201&&r2.status===200&&r2.value.status==='duplicate'&&r3.status===409&&rb.status===201&&list.length===2&&ctx?.finished===true,{r1:r1.status,r2:r2.value,r3:r3.value?.code,rb:rb.status,count:list.length,ctx:!!ctx});
 report[label]={stored:list.map(r=>({feedbackId:r.feedbackId,participant:r.participant.participantId,answers:r.answers,contextRounds:r.context.rounds}))};}
finish(out,'s6-fixes',H,{report,postgres:'Sem PostgreSQL real local (sem psql/pg_ctl/docker, sem DATABASE_URL de teste). O backend SQL foi exercitado no pg-mem, dependência de teste do projeto; não é validação de PostgreSQL real.'});
