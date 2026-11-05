// S6 focused validation: match context + feedback storage/contract, real engine and the real
// handler (feedback-api) with an isolated store directory. Failing checks.
// Usage: node scripts/s6-feedback.mjs <out-dir>
import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';
import {harness,finish} from './hybrid12-lib.mjs';
import {setup,place,unit,card,act,catalog,resolveCombat} from '../mesa-nova/r1-fixtures.mjs';
import {beginMatch} from '../accounts.mjs';
import {observe,snapshot,contextFor,publicRecord} from '../mesa-nova/match-context.mjs';
import {createFeedbackStore} from '../mesa-nova/feedback-store.mjs';
import {handleFeedback,CONTRACT} from '../mesa-nova/feedback-api.mjs';
import {SURVEY_VERSION} from '../mesa-nova/survey.mjs';
import {answersFrom} from './survey-qa.mjs';
const out=path.resolve(process.argv[2]||'prototype-qa/s6/feedback'),H=harness(out),{check}=H,storeDir=path.join(out,'store');fs.rmSync(storeDir,{recursive:true,force:true});
const store=await createFeedbackStore({databaseUrl:'',dir:storeDir});const report={storeDir:path.relative(process.cwd(),storeDir),postgres:process.env.DATABASE_URL?'DATABASE_URL presente (não usado neste teste isolado)':'DATABASE_URL ausente'};
const step=(room,actor,action)=>{const before=snapshot(room);try{act(room,actor,action,catalog);}catch(error){observe(room,{actor,action,before,error,store});return false;}observe(room,{actor,action,before,store});return true;};
const tick=room=>observe(room,{store});// room.onChange equivalent
async function call(room,player,method,body,query='',useStore=store){let status,value;const url=new URL('http://x/api/rooms/'+room.code+'/feedback'+query);
 await handleFeedback({req:{method},res:{},room,player,url,store:useStore,payload:async()=>body,json:(res,s,v)=>{status=s;value=v;}});return {status,value};}
function match({bots=[],simulation=null}={}){const t=setup();const {room,a,b}=t;for(const p of [a,b])if(bots.includes(p===a?'a':'b'))p.bot=true;room.simulation=simulation;beginMatch(room);room.phase='prep';room.turn=a.id;room.round=1;tick(room);return t;}
// Rounds of Preparation with one real spell per active turn, no combat (vote no).
function rounds(t,n){const {room,a,b}=t;for(let r=0;r<n;r++){for(let guard=0;guard<4&&room.phase==='prep';guard++){const me=room.players.find(p=>p.id===room.turn),ally=me.reserve.find(c=>c.type==='creature');
  if(ally){const c=card('FEX05',me);me.hand.push(c);me.mana=Math.max(me.mana,5);step(room,me,{type:'play',cardId:c.uid,mode:'direct',targetId:ally.uid});}step(room,me,{type:'endPrep'});}
 if(room.phase==='vote'){step(room,a,{type:'vote',fight:false});step(room,b,{type:'vote',fight:false});}tick(room);}}
// Combat that brings the rival Patron to 0 → engine sets phase 'finished'.
function finishMatch(t){const {room,a,b}=t;b.patron.hp=1;for(let guard=0;guard<6&&room.phase==='prep';guard++)step(room,room.players.find(p=>p.id===room.turn),{type:'endPrep'});
 if(room.phase==='vote'){step(room,a,{type:'vote',fight:true});step(room,b,{type:'vote',fight:true});}
 if(room.phase==='formation'){const attacker=a.reserve.find(c=>c.type==='creature'&&c.attack>=5);if(attacker&&!a.formation.includes(attacker.uid))a.formation=[attacker.uid,null,null];b.formation=b.formation.map((uid,i)=>i===0?null:uid);step(room,a,{type:'ready'});step(room,b,{type:'ready'});}
 if(room.phase==='resolving'){room.combat.startedAt-=room.combat.duration+10;resolveCombat(room);tick(room);}return room.phase;}
// S7 contract: answers come from the questionnaire the server offers (GET), never free-form.
const offered=new Map();async function valid(room,player,variant=0,useStore=store){const k=room.matchId+':'+player.id;if(!offered.has(k)){const g=await call(room,player,'GET',null,'?matchId='+room.matchId,useStore);if(g.value.survey)offered.set(k,g.value.survey);}const s=offered.get(k);return {surveyVersion:s?.version||SURVEY_VERSION,answers:answersFrom(s,variant)};}
// 1 · PvP, accumulation beyond the bounded buffers
const pvp=match();place(pvp.a,unit(pvp.a,{attack:5,health:9}),0);place(pvp.b,unit(pvp.b,{attack:1,health:9}),1);rounds(pvp,24);
const ctx1=contextFor(pvp.room.matchId),aPart=ctx1.participants.find(p=>p.participantId===pvp.a.id),bPart=ctx1.participants.find(p=>p.participantId===pvp.b.id);
const usedTotal=Object.values(aPart.usedCards).reduce((n,v)=>n+v,0)+Object.values(bPart.usedCards).reduce((n,v)=>n+v,0);
check('contexto acumula além dos buffers (log ≤ 10, eventos limitados)',ctx1.rounds>=24&&usedTotal>=24&&pvp.room.log.length<=10&&usedTotal>pvp.room.log.length&&(aPart.style.turnsEnded+bPart.style.turnsEnded)>=48,{rounds:ctx1.rounds,usedTotal,log:pvp.room.log.length,events:pvp.room.events.length,turnsEnded:[aPart.style.turnsEnded,bPart.style.turnsEnded]});
check('cartas do deck separadas das cartas usadas',Object.keys(aPart.deck).length>0&&aPart.usedCards.FEX05>=12&&!('FEX05' in aPart.deck)===!aPart.deck.FEX05,{deckKinds:Object.keys(aPart.deck).length,used:aPart.usedCards});
const early=await call(pvp.room,pvp.a,'POST',{matchId:pvp.room.matchId,...await valid(pvp.room,pvp.a)});
check('rejeita partida não encerrada (409 MATCH_NOT_FINISHED)',early.status===409&&early.value.code==='MATCH_NOT_FINISHED',early);
check('partida termina pelo motor',finishMatch(pvp)==='finished'&&ctx1.finished&&ctx1.result?.winner===pvp.a.id,{phase:pvp.room.phase,result:ctx1.result});
await ctx1.persisted;
const va=await valid(pvp.room,pvp.a,0),vb=await valid(pvp.room,pvp.b,1);
const ra=await call(pvp.room,pvp.a,'POST',{matchId:ctx1.matchId,...va,comment:'Boa partida.\r\nVoltaria a jogar.',context:{rounds:999,winner:'eu'}});
const rb=await call(pvp.room,pvp.b,'POST',{matchId:ctx1.matchId,...vb});
const fa=await store.getFeedback(ra.value.feedbackId),fb=await store.getFeedback(rb.value.feedbackId);
check('PvP: dois humanos com respostas independentes (201 + 201, ids distintos)',ra.status===201&&rb.status===201&&ra.value.feedbackId!==rb.value.feedbackId&&JSON.stringify(fa.answers)===JSON.stringify(Object.fromEntries(Object.entries(va.answers).sort()))&&JSON.stringify(fb.answers)===JSON.stringify(Object.fromEntries(Object.entries(vb.answers).sort()))&&fa.survey.version===SURVEY_VERSION,{ra,rb});
check('contexto vinculado pelo servidor; contexto do cliente ignorado',fa.context.rounds===ctx1.rounds&&fa.context.rounds!==999&&fa.ignoredClientFields.includes('context')&&fa.participant.participantId===pvp.a.id,{rounds:fa.context.rounds,ignored:fa.ignoredClientFields});
const dup=await call(pvp.room,pvp.a,'POST',{matchId:ctx1.matchId,...va,comment:'Boa partida.\r\nVoltaria a jogar.'}),diff=await call(pvp.room,pvp.a,'POST',{matchId:ctx1.matchId,...await valid(pvp.room,pvp.a,2)});
check('reenvio idêntico sem duplicar (200 duplicate) e conteúdo diferente recusado (409)',dup.status===200&&dup.value.status==='duplicate'&&diff.status===409&&(await store.listFeedback({matchId:ctx1.matchId})).length===2,{dup,diff});
const bad=await call(pvp.room,pvp.a,'POST',{matchId:ctx1.matchId,surveyVersion:SURVEY_VERSION,answers:{fun:7,'Bad Key':1},comment:'x'.repeat(1001)});
check('valida formato e limites (400 INVALID_FEEDBACK)',bad.status===400&&bad.value.errors.length>=3,bad);
const spectator={id:'spectator-seat',name:'Olheiro'};const sp=await call(pvp.room,spectator,'POST',{matchId:ctx1.matchId,...await valid(pvp.room,spectator)});
check('rejeita participante inválido (403 NOT_A_PARTICIPANT)',sp.status===403&&sp.value.code==='NOT_A_PARTICIPANT',sp);
// 2 · rematch in the same room → new matchId, isolated context
const oldId=ctx1.matchId,oldRounds=ctx1.rounds;step(pvp.room,pvp.a,{type:'reset'});beginMatch(pvp.room);pvp.room.phase='prep';pvp.room.turn=pvp.a.id;pvp.room.round=1;tick(pvp.room);rounds(pvp,2);
const ctx2=contextFor(pvp.room.matchId);
check('revanche: novo matchId, contexto isolado, anterior intacto',ctx2&&ctx2.matchId!==oldId&&ctx2.rounds<=3&&contextFor(oldId).rounds===oldRounds&&Object.values(ctx2.participants[0].usedCards).reduce((n,v)=>n+v,0)<=3,{old:oldId,new:ctx2?.matchId,rounds:ctx2?.rounds});
const g=await call(pvp.room,pvp.a,'GET',null);const gOld=await call(pvp.room,pvp.a,'GET',null,'?matchId='+oldId);
check('contrato GET: revanche em andamento não elegível; partida anterior já enviada',g.value.contract===CONTRACT&&g.value.eligible===false&&g.value.reason==='MATCH_NOT_FINISHED'&&gOld.value.eligible&&gOld.value.submitted===true,{g:g.value,gOld:{eligible:gOld.value.eligible,submitted:gOld.value.submitted}});
// 2b · Patron power and creature play (Dom, ruptura-grupo)
const dom=(()=>{const t=setup({aDeck:'ruptura-grupo',bDeck:'fluxo-virelion'});beginMatch(t.room);t.room.phase='prep';t.room.turn=t.a.id;t.a.mana=t.a.manaMax=10;tick(t.room);return t;})();
const foe=place(dom.b,unit(dom.b),0);step(dom.room,dom.a,{type:'patronPower',powerId:'golpe-do-maioral'});step(dom.room,dom.a,{type:'patronPower',powerId:'golpe-do-maioral',targetId:foe.uid});
const cre=card('FV03',dom.a);dom.a.hand.push(cre);step(dom.room,dom.a,{type:'play',cardId:cre.uid,lane:1});
const dp=contextFor(dom.room.matchId).participants.find(p=>p.participantId===dom.a.id);
check('poderes e criaturas: golpe-do-maioral 1× (tentativa sem alvo = recusada), criatura FV03 usada e classificada',dp.powers['golpe-do-maioral']===1&&dp.style.patronPowers===1&&dp.style.rejected===1&&dp.usedCards.FV03===1&&dp.style.creatures===1&&dp.style.spellsDirect===0,{powers:dp.powers,used:dp.usedCards,style:dp.style});
// 3 · PvE: only the human
const pve=match({bots:['b']});place(pve.a,unit(pve.a,{attack:5,health:9}),0);finishMatch(pve);await contextFor(pve.room.matchId).persisted;
const ph=await call(pve.room,pve.a,'POST',{matchId:pve.room.matchId,...await valid(pve.room,pve.a)}),pb=await call(pve.room,pve.b,'POST',{matchId:pve.room.matchId,...await valid(pve.room,pve.b)});
check('PvE: humano grava (201), bot recusado (403 BOT_PARTICIPANT)',ph.status===201&&pb.status===403&&pb.value.code==='BOT_PARTICIPANT'&&contextFor(pve.room.matchId).mode==='pve'&&contextFor(pve.room.matchId).kind==='normal',{ph,pb});
// 4 · simulations excluded (explicit flag, and bot vs bot)
const sim=match({simulation:'request'});place(sim.a,unit(sim.a,{attack:5,health:9}),0);finishMatch(sim);const ps=await call(sim.room,sim.a,'POST',{matchId:sim.room.matchId,...await valid(sim.room,sim.a)});
const bvb=match({bots:['a','b']});place(bvb.a,unit(bvb.a,{attack:5,health:9}),0);finishMatch(bvb);
check('simulações excluídas (422 SIMULATION; bot×bot classificado como simulação)',ps.status===422&&ps.value.code==='SIMULATION'&&contextFor(bvb.room.matchId).kind==='simulation',{ps,bvb:{kind:contextFor(bvb.room.matchId).kind,reason:contextFor(bvb.room.matchId).simulationReason}});
// 5 · storage failure: nothing confirmed
const blocker=path.join(out,'not-a-directory');fs.writeFileSync(blocker,'x');const broken=await createFeedbackStore({databaseUrl:'',dir:blocker});
const pvp2=match();place(pvp2.a,unit(pvp2.a,{attack:5,health:9}),0);finishMatch(pvp2);await contextFor(pvp2.room.matchId).persisted;
const fail=await call(pvp2.room,pvp2.a,'POST',{matchId:pvp2.room.matchId,...await valid(pvp2.room,pvp2.a)},'',broken);
check('falha de armazenamento → 503 STORAGE_FAILED, sem registro',fail.status===503&&fail.value.code==='STORAGE_FAILED'&&(await call(pvp2.room,pvp2.a,'GET',null,'',store)).value.submitted===false&&(await store.listFeedback({matchId:pvp2.room.matchId})).length===0,fail);
// 6 · recovery after restart: a new process opens the same directory
const reader=path.join(out,'recover.mjs');fs.writeFileSync(reader,`import {createFeedbackStore} from ${JSON.stringify(new URL('../mesa-nova/feedback-store.mjs',import.meta.url).href)};const s=await createFeedbackStore({databaseUrl:'',dir:process.argv[2]});const list=await s.listFeedback();const ctx=await s.getContext(process.argv[3]);console.log(JSON.stringify({count:list.length,records:list.map(r=>({feedbackId:r.feedbackId,matchId:r.matchId,participant:r.participant,opponentKind:r.opponentKind,answers:r.answers,comment:r.comment,contextRounds:r.context.rounds,mode:r.context.mode,kind:r.context.kind})),context:ctx&&{matchId:ctx.matchId,rounds:ctx.rounds,mode:ctx.mode,finished:ctx.finished,participants:ctx.participants.map(p=>({participantId:p.participantId,kind:p.kind,usedCards:p.usedCards,powers:p.powers,style:p.style}))}}));`);
const rec=spawnSync(process.execPath,[reader,storeDir,oldId],{encoding:'utf8'});const recovered=JSON.parse(rec.stdout||'{}');
check('recuperação em novo processo: 3 respostas e o contexto da partida',recovered.count===3&&recovered.context?.matchId===oldId&&recovered.context.finished,{count:recovered.count,stderr:rec.stderr?.slice(0,300)});
check('registros sem tokens ou credenciais',!/token|secret|password|cookie/i.test(JSON.stringify(recovered))&&!fs.readFileSync(path.join(storeDir,'feedback',ra.value.feedbackId+'.json'),'utf8').includes(pvp.a.token),{});
fs.writeFileSync(path.join(out,'recovered-example.json'),JSON.stringify(recovered,null,1));
finish(out,'s6-feedback',H,{report,contextExample:publicRecord(ctx1)});
