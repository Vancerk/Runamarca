// S7: questionnaire selection and server validation (real engine contexts, real handler,
// isolated store). Failing checks.  Usage: node scripts/s7-survey.mjs <out-dir>
import fs from 'node:fs';import path from 'node:path';
import {harness,finish} from './hybrid12-lib.mjs';
import {setup,place,unit,card,act,catalog,resolveCombat} from '../mesa-nova/r1-fixtures.mjs';
import {beginMatch} from '../accounts.mjs';
import {observe,snapshot,contextFor} from '../mesa-nova/match-context.mjs';
import {createFeedbackStore} from '../mesa-nova/feedback-store.mjs';
import {handleFeedback,participantView} from '../mesa-nova/feedback-api.mjs';
import {selectSurvey,SURVEY_VERSION} from '../mesa-nova/survey.mjs';
const out=path.resolve(process.argv[2]||'prototype-qa/s7/survey'),H=harness(out),{check}=H;fs.rmSync(path.join(out,'store'),{recursive:true,force:true});
const store=await createFeedbackStore({databaseUrl:'',dir:path.join(out,'store')});
const step=(room,actor,action)=>{const before=snapshot(room);try{act(room,actor,action,catalog);observe(room,{actor,action,before,store});return 'ok';}catch(e){observe(room,{actor,action,before,error:e,store});return 'ERR '+e.message;}};
function start({aDeck,bDeck,bot=false,sim=null}={}){const t=setup({aDeck,bDeck});if(bot)t.b.bot=true;t.room.simulation=sim;beginMatch(t.room);t.room.phase='prep';t.room.turn=t.a.id;t.a.mana=t.a.manaMax=10;observe(t.room,{store});return t;}
function end(t,{rounds=0}={}){const {room,a,b}=t;for(let r=0;r<rounds;r++){for(let g=0;g<4&&room.phase==='prep';g++)step(room,room.players.find(p=>p.id===room.turn),{type:'endPrep'});if(room.phase==='vote'){step(room,a,{type:'vote',fight:false});step(room,b,{type:'vote',fight:false});}}
 place(a,unit(a,{attack:5,health:9}),0);b.patron.hp=1;b.formation[0]=null;for(let g=0;g<6&&room.phase==='prep';g++)step(room,room.players.find(p=>p.id===room.turn),{type:'endPrep'});
 if(room.phase==='vote')step(room,a,{type:'vote',fight:true});if(room.phase==='formation'){const u=a.reserve.find(c=>c.attack>=5);a.formation=[u.uid,null,null];step(room,a,{type:'ready'});step(room,b,{type:'ready'});}
 if(room.phase==='resolving'){room.combat.startedAt-=room.combat.duration+10;resolveCombat(room);observe(room,{store});}return room.phase;}
async function call(t,player,method,body){let status,value;await handleFeedback({req:{method},res:{},room:t.room,player,url:new URL('http://x/?matchId='+t.room.matchId),store,payload:async()=>body,json:(r,s,v)=>{status=s;value=v;}});return {status,value};}
const answer=s=>Object.fromEntries(s.questions.map(q=>[q.id,q.options[q.options.length>3?3:1].value]));
// Context A: PvE, Dom, a Patron power + direct spells, short.
const A=start({aDeck:'ruptura-grupo',bDeck:'fluxo-virelion',bot:true});{const foe=place(A.b,unit(A.b),1);step(A.room,A.a,{type:'patronPower',powerId:'golpe-do-maioral',targetId:foe.uid});const ally=place(A.a,unit(A.a),2);for(let i=0;i<2;i++){const c=card('FEX05',A.a);A.a.hand.push(c);step(A.room,A.a,{type:'play',cardId:c.uid,mode:'direct',targetId:ally.uid});}}
check('PvE terminou pelo motor',end(A)==='finished',{});
// Context B: PvP, prepared spells + creature into Emanação + several cards, 8 rounds.
const B=start({aDeck:'fluxo-virelion',bDeck:'forja-oficina-lyrik'});{const c1=card('FL13',B.a),c2=card('FV03',B.a),c3=card('FL13',B.a);B.a.hand.push(c1,c2,c3);step(B.room,B.a,{type:'play',cardId:c1.uid,mode:'lane',lane:1,targetSide:B.b.id});step(B.room,B.a,{type:'play',cardId:c2.uid,mode:'emanate'});step(B.room,B.a,{type:'play',cardId:c3.uid,mode:'lane',lane:2,targetSide:B.b.id});}
check('PvP terminou pelo motor após 8 rodadas',end(B,{rounds:8})==='finished'&&contextFor(B.room.matchId).rounds>=9,{rounds:contextFor(B.room.matchId).rounds});
// Context C: PvP with nothing played (B's second human).
const vA=participantView(contextFor(A.room.matchId),A.a.id),vB=participantView(contextFor(B.room.matchId),B.a.id),vC=participantView(contextFor(B.room.matchId),B.b.id);
const sA=selectSurvey(vA),sB=selectSurvey(vB),sC=selectSurvey(vC);
const ids=s=>s.questions.map(q=>q.id);
check('determinístico: mesma entrada → mesmo questionário',JSON.stringify(selectSurvey(vA))===JSON.stringify(sA)&&JSON.stringify(selectSurvey(vB))===JSON.stringify(sB),{});
check('3–5 perguntas, sem repetição, versão estável',[sA,sB,sC].every(s=>s.version===SURVEY_VERSION&&s.questions.length>=3&&s.questions.length<=5&&new Set(ids(s)).size===s.questions.length),{A:ids(sA),B:ids(sB),C:ids(sC)});
check('contextos contrastantes geram questionários diferentes',JSON.stringify(ids(sA))!==JSON.stringify(ids(sB))&&JSON.stringify(ids(sB))!==JSON.stringify(ids(sC)),{A:ids(sA),B:ids(sB),C:ids(sC)});
const q=(s,id)=>s.questions.find(x=>x.id===id);
check('coerência A (PvE): pergunta sobre o bot, sobre o poder usado (nome real) e sobre alvos de magias diretas; nada de magias preparadas',q(sA,'bot_desafio')&&/Golpe do Maioral/.test(q(sA,'poder_util')?.text||'')&&q(sA,'alvos_claros')&&!q(sA,'preparadas_claras')&&!q(sA,'rival_espera'),{A:sA.questions.map(x=>x.text)});
check('coerência B (PvP): espera do rival, duração com as rodadas reais, cartas jogadas como alternativas, magias preparadas (2); nada de poder',q(sB,'rival_espera')&&q(sB,'duracao').text.includes(`${vB.rounds} rodadas`)&&q(sB,'carta_destaque')?.options.every(o=>o.value==='nenhuma'||vB.you.usedCards[o.value])&&/2 magias/.test(q(sB,'preparadas_claras')?.text||'')&&!q(sB,'poder_util')&&!q(sB,'bot_desafio'),{B:sB.questions.map(x=>[x.text,x.options.map(o=>o.label).join('/')])});
check('coerência C (humano que não jogou cartas): nenhuma pergunta sobre ações não realizadas',!q(sC,'poder_util')&&!q(sC,'carta_destaque')&&!q(sC,'preparadas_claras')&&!q(sC,'alvos_claros')&&!q(sC,'emanacao_clara'),{C:ids(sC)});
// Duration: same context, 1 min vs 40 min → different questionnaire (text and alternatives).
{const v1={...vB,durationMs:60_000},v40={...vB,durationMs:40*60_000},s1=selectSurvey(v1),s40=selectSurvey(v40),d1=q(s1,'duracao'),d40=q(s40,'duracao');
 check('duração: 1 min × 40 min com os demais dados iguais geram questionários diferentes (texto com minutos reais; alternativas da faixa longa)',JSON.stringify(s1)!==JSON.stringify(s40)&&/cerca de 1 min/.test(d1.text)&&/cerca de 40 min/.test(d40.text)&&d40.options.some(o=>o.value==='cansativa')&&!d1.options.some(o=>o.value==='cansativa')&&d1.options[0].label==='Rápida demais'&&JSON.stringify(ids(s1))===JSON.stringify(ids(s40)),{d1:[d1.text,d1.options.map(o=>o.label)],d40:[d40.text,d40.options.map(o=>o.label)]});}
// Contract
const gA=await call(A,A.a,'GET'),gBot=await call(A,A.b,'GET');
check('GET entrega o questionário só ao humano elegível (PvE: bot sem formulário)',gA.value.survey?.version===SURVEY_VERSION&&JSON.stringify(gA.value.survey)===JSON.stringify(sA)&&gBot.value.survey===null&&gBot.value.reason==='BOT_PARTICIPANT',{a:gA.value.eligible,bot:gBot.value.reason});
const base={matchId:B.room.matchId,surveyVersion:SURVEY_VERSION};
const wrongV=await call(B,B.a,'POST',{...base,surveyVersion:'antigo',answers:answer(sB)}),extra=await call(B,B.a,'POST',{...base,answers:{...answer(sB),diversao_extra:3}}),missing=await call(B,B.a,'POST',{...base,answers:{diversao:4}}),badOpt=await call(B,B.a,'POST',{...base,answers:{...answer(sB),duracao:'enorme'}}),fromOther=await call(B,B.a,'POST',{...base,answers:answer(sA)});
check('servidor valida conforme o questionário oferecido (versão, ids, todas respondidas, alternativas)',wrongV.value.code==='SURVEY_VERSION'&&extra.value.code==='INVALID_ANSWERS'&&missing.value.code==='INVALID_ANSWERS'&&badOpt.value.code==='INVALID_ANSWERS'&&fromOther.status===400,{wrongV:wrongV.value.code,extra:extra.value.errors,missing:missing.value.errors?.length,badOpt:badOpt.value.errors,other:fromOther.value.code});
const pa=await call(B,B.a,'POST',{...base,answers:answer(sB),comment:''}),pb=await call(B,B.b,'POST',{...base,answers:answer(sC),comment:'Gostei do ritmo.'});
const ra=await store.getFeedback(pa.value.feedbackId),rb=await store.getFeedback(pb.value.feedbackId);
check('PvP: respostas independentes; comentário vazio → null, preenchido gravado; perguntas exibidas gravadas com as respostas',pa.status===201&&pb.status===201&&ra.comment===null&&rb.comment==='Gostei do ritmo.'&&JSON.stringify(ra.survey.questions.map(x=>x.id))===JSON.stringify(ids(sB))&&JSON.stringify(rb.survey.questions.map(x=>x.id))===JSON.stringify(ids(sC))&&Object.keys(ra.answers).every(k=>ra.survey.questions.some(x=>x.id===k)),{a:ra.survey.questions.map(x=>x.id),b:rb.survey.questions.map(x=>x.id)});
const again=await call(B,B.a,'GET');check('após envio, GET não oferece novo formulário (submitted)',again.value.submitted===true&&again.value.survey===null,again.value);
// Simulation excluded
const S=start({sim:'request'});end(S);const gS=await call(S,S.a,'GET'),pS=await call(S,S.a,'POST',{matchId:S.room.matchId,surveyVersion:SURVEY_VERSION,answers:{diversao:3}});
check('simulação: sem formulário e sem gravação (422)',gS.value.survey===null&&gS.value.reason==='SIMULATION'&&pS.status===422&&(await store.listFeedback({matchId:S.room.matchId})).length===0,{g:gS.value.reason,p:pS.status});
fs.writeFileSync(path.join(out,'exemplos-questionarios.json'),JSON.stringify({pve_poder_magias_diretas:sA,pvp_preparadas_emanacao_8_rodadas:sB,pvp_sem_cartas_jogadas:sC},null,1));
finish(out,'s7-survey',H,{});
