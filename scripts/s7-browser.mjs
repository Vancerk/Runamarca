// S7 end-to-end in the real client: isolated room server (mesa-nova/server.mjs under /runamarca,
// own store dir, shared bot off); actions go through HTTP /act; combat ends by the engine's own
// timer; both pages run the app's normal state polling (no injected render). A answers by touch at
// 320 px (temporary storage failure, retry, double tap), B by keyboard at 1440 px (hybrid route).
// Then: reconnection (no reopen), rematch (new matchId, dismiss keeps "Nova partida" usable),
// recovery from a new process.  Usage: node scripts/s7-browser.mjs <out-dir>
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import {spawnSync} from 'node:child_process';
import {dialog,tap,tabTo,answerSteps,inspectStep} from './survey-browser-qa.mjs';
const out=path.resolve(process.argv[2]||'prototype-qa/s7/browser'),storeDir=path.join(out,'store');fs.rmSync(storeDir,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});
process.env.NODE_ENV='test';process.env.RUNAMARCA_SHARED_BOT='0';process.env.RUNAMARCA_FEEDBACK_DIR=storeDir;delete process.env.DATABASE_URL;
const {harness,launch,finish}=await import('./hybrid12-lib.mjs');const H=harness(out),{check}=H;
const {handleNewGame,createTestAccess,roomsForTest,feedbackStore}=await import('../mesa-nova/server.mjs');
const {setup,place,unit}=await import('../mesa-nova/r1-fixtures.mjs');const {beginMatch}=await import('../accounts.mjs');const {SURVEY_VERSION}=await import('../mesa-nova/survey.mjs');const {observe}=await import('../mesa-nova/match-context.mjs');
const server=http.createServer(async(req,res)=>{if(req.url.startsWith('/runamarca'))req.headers.cookie=createTestAccess(req,'/runamarca');const handled=await handleNewGame(req,res,new URL(req.url,'http://localhost'),'/runamarca');if(handled===false&&!res.headersSent){res.writeHead(404,{'Content-Type':'application/json'});res.end('{}');}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}/runamarca`;
// Room prepared on the server (decks/patrons from fixtures), then played through HTTP.
const code='A7B7C1',t=setup({aDeck:'ruptura-grupo',bDeck:'fluxo-virelion'}),room=t.room;room.code=code;room.simulation=null;room.onChange=()=>observe(room,{store:feedbackStore});roomsForTest().set(code,room);
function arm(){room.winner=null;room.combat=null;room.lastCombat=null;room.preparationsDone=0;room.combatCount=0;room.seals=[];room.forceWindow=null;for(const p of room.players){p.ready=false;p.vote=null;delete p.voted;p.mana=p.manaMax=3;}beginMatch(room);room.phase='prep';room.turn=t.a.id;room.round=1;for(const p of room.players){p.reserve=[];p.formation=[null,null,null];p.patron.hp=60;}place(t.a,unit(t.a,{attack:5,health:9}),0);t.b.patron.hp=1;room.revision++;observe(room,{store:feedbackStore});return room.matchId;}
const post=(token,body)=>fetch(`${base}/api/rooms/${code}/act`,{method:'POST',headers:{'content-type':'application/json','x-player-token':token},body:JSON.stringify(body)}).then(r=>r.json());
const acts=[];async function playToEnd(){for(const [tk,body] of [[t.a.token,{type:'endPrep'}],[t.b.token,{type:'endPrep'}],[t.a.token,{type:'vote',fight:true}],[t.a.token,{type:'ready'}],[t.b.token,{type:'ready'}]]){const r=await post(tk,body);acts.push({type:body.type,ok:!r.error,error:r.error||null,phase:room.phase});}}
const browser=await launch(),requests={a:0,b:0};
async function page(seat,token,{w,h,touch,route}){const context=await browser.newContext({viewport:{width:w,height:h},hasTouch:touch,isMobile:touch});await context.addInitScript(([c,tk])=>{sessionStorage.setItem('runamarca-nova-seat',JSON.stringify({code:c,token:tk}));
  window.__s7={finale:[],opened:[],earlyOpen:false};document.addEventListener('runamarca:finale-complete',e=>window.__s7.finale.push({t:performance.now(),matchId:e.detail.matchId,title:document.querySelector('.capture-title')?.textContent,sparks:[...document.querySelectorAll('.victory-firework')].flatMap(n=>n.getAnimations({subtree:true})).filter(a=>a.playState==='running').length}));
  addEventListener('DOMContentLoaded',()=>new MutationObserver(()=>{const d=document.querySelector('dialog.match-survey');if(d&&!d.__seen){d.__seen=1;window.__s7.opened.push({t:performance.now(),doneButton:!!document.querySelector('.capture-done'),finaleFired:window.__s7.finale.length});if(!document.querySelector('.capture-done'))window.__s7.earlyOpen=true;}}).observe(document.documentElement,{childList:true,subtree:true}));},[code,token]);
 await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());const p=await context.newPage();p.on('pageerror',e=>H.errors.push(seat+': '+e.message));p.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',seat,m.text().slice(0,200));});p.on('request',r=>{if(r.method()==='POST'&&r.url().endsWith('/feedback'))requests[seat]++;});await p.goto(`${base}/${route==='hybrid'?'hybrid/index.html':''}?room=${code}`);return {context,page:p};}
try{
 const m1=arm();const A=await page('a',t.a.token,{w:320,h:700,touch:true,route:'native'}),B=await page('b',t.b.token,{w:1440,h:900,touch:false,route:'hybrid'});
 await Promise.all([A.page.waitForFunction(()=>state?.phase==='prep'),B.page.waitForFunction(()=>state?.phase==='prep')]);
 await playToEnd();
 const reward=await Promise.all([[A,'a-320-vitoria'],[B,'b-1440-derrota']].map(async([x,name])=>{await x.page.waitForSelector('.capture-done',{timeout:60000});const reading=await x.page.evaluate(()=>({title:document.querySelector('.capture-title')?.textContent,portraits:document.querySelectorAll('.capture-stage .final-patron').length,open:!!document.querySelector('dialog.match-survey')}));await x.page.screenshot({path:out+'/'+name+'.png'});return reading;}));
 check('vencedor e vencido leem o seu resultado com a recompensa ainda à vista',reward[0].title.startsWith('Vitória')&&reward[1].title.startsWith('Derrota')&&reward.every(x=>x.portraits===2&&!x.open),reward);
 await A.page.waitForFunction(()=>window.__s7.finale.length>0,null,{timeout:60000});await A.page.waitForTimeout(1500);
 await Promise.all([A,B].map(x=>x.page.waitForSelector('dialog.match-survey[open]',{timeout:60000})));
 const seq=await Promise.all([A,B].map(x=>x.page.evaluate(()=>({...window.__s7,phase:state.phase,matchId:state.matchId}))));
 check('encerramento visual → formulário: só depois da apresentação, do último fogo e do botão Nova partida',seq.every(s=>s.opened.length===1&&s.opened[0].doneButton&&s.opened[0].finaleFired>=1&&!s.earlyOpen&&s.finale[0].sparks===0&&s.matchId===m1),seq);
 const first=await Promise.all([A,B].map(x=>inspectStep(x.page)));
 check('320 e 1440: uma pergunta no centro, progresso e foco inicial no grupo de respostas',first.every(v=>v.visible===1&&v.q==='diversao'&&v.focusInQuestion&&v.offset.every(d=>Math.abs(d)<1)&&v.states[0]==='current'&&v.states.slice(1).every(s=>s==='pending')),first);
 await A.page.screenshot({path:`${out}/a-320-formulario.png`});await B.page.screenshot({path:`${out}/b-1440-formulario.png`});
 // A · touch, 320 px, temporary storage failure → error, answers kept → retry with double tap
 const fb=path.join(storeDir,'feedback');fs.renameSync(fb,fb+'-off');fs.writeFileSync(fb,'indisponível');
 const ap=A.page.locator(dialog),visible=ap.locator('fieldset:visible'),next=ap.getByRole('button',{name:'Confirmar',exact:true});
 await tap(A.page,next);const empty=await inspectStep(A.page);
 check('confirmar vazio não avança e explica o que falta',empty.current===0&&empty.value==null&&/Escolha uma resposta/.test(await ap.locator('.match-survey-status').textContent())&&requests.a===0,empty);
 await tap(A.page,visible.locator('label').last());const selected=await inspectStep(A.page);await tap(A.page,next);const second=await inspectStep(A.page);
 await A.page.screenshot({path:out+'/a-320-segunda.png'});await tap(A.page,ap.getByRole('button',{name:'Voltar'}));const back=await inspectStep(A.page);
 check('seleção espera confirmação, progresso distingue os três estados e Voltar recupera a escolha',selected.current===0&&selected.value==='5'&&second.states[0]==='done'&&second.current===1&&second.states[2]==='pending'&&back.value==='5'&&requests.a===0,{selected,second,back});
 const chosen=await answerSteps(A.page,{input:'touch'});
 check('nenhum POST antes do envio final, inclusive voltando e editando',requests.a===0&&chosen.diversao==='1'&&Object.keys(chosen).length===first[0].total,chosen);
 const sendA=A.page.locator('dialog.match-survey button[type=submit]');await sendA.scrollIntoViewIfNeeded();const sb=await sendA.boundingBox();await A.page.touchscreen.tap(sb.x+sb.width/2,sb.y+sb.height/2);
 await A.page.waitForFunction(()=>/mantidas/.test(document.querySelector('.match-survey-status')?.textContent||''),null,{timeout:10000}).catch(async e=>{console.log('DEBUG A',JSON.stringify(await A.page.evaluate(()=>({checked:document.querySelectorAll('dialog.match-survey input:checked').length,groups:document.querySelectorAll('dialog.match-survey fieldset').length,status:document.querySelector('.match-survey-status')?.textContent,btn:document.querySelector('dialog.match-survey button[type=submit]')?.textContent,dlg:(()=>{const r=document.querySelector('dialog.match-survey')?.getBoundingClientRect();return r&&[r.top,r.bottom,r.height]})(),vh:innerHeight,scroll:document.querySelector('.match-survey-form')?.scrollTop}))),'posts',requests.a);await A.page.screenshot({path:`${out}/debug-a.png`});throw e;});
 const kept=await A.page.evaluate(()=>({checked:document.querySelectorAll('dialog.match-survey input:checked').length,groups:document.querySelectorAll('dialog.match-survey fieldset').length,button:document.querySelector('dialog.match-survey button[type=submit]').textContent,status:document.querySelector('.match-survey-status').textContent}));
 check('falha temporária: erro informado, nada confirmado, respostas preservadas, botão para nova tentativa',kept.checked===kept.groups&&/Tentar novamente/.test(kept.button)&&!/registradas/.test(kept.status)&&fs.readdirSync(fb+'-off').filter(n=>n.endsWith('.json')).length===0,kept);
 await A.page.screenshot({path:`${out}/a-320-falha-respostas-mantidas.png`});
 fs.rmSync(fb);fs.renameSync(fb+'-off',fb);const before=requests.a;const rb=await sendA.boundingBox();await A.page.touchscreen.tap(rb.x+rb.width/2,rb.y+rb.height/2);await A.page.touchscreen.tap(rb.x+rb.width/2,rb.y+rb.height/2);
 await A.page.waitForFunction(()=>/registradas/.test(document.querySelector('.match-survey-status')?.textContent||''),null,{timeout:10000});
 check('nova tentativa grava; toque duplo envia uma única vez',requests.a-before===1&&(await feedbackStore.listFeedback({matchId:m1})).length===1,{postsOnRetry:requests.a-before});
 await A.page.screenshot({path:`${out}/a-320-enviado.png`});
 // B · keyboard only
 await B.page.waitForFunction(()=>document.activeElement?.closest?.('dialog.match-survey'));const chosenB=await answerSteps(B.page,{input:'keyboard'});
 await B.page.keyboard.type('Partida curta e clara.');
 await tabTo(B.page,dialog+' .survey-back');await B.page.keyboard.press('Enter');
 const prior=await inspectStep(B.page);await tabTo(B.page,dialog+' .survey-next');await B.page.keyboard.press('Enter');
 check('teclado: volta à resposta anterior, recupera o comentário e chega ao envio sem gravar antes',prior.focusInQuestion&&prior.value===chosenB[prior.q]&&await B.page.locator('textarea:visible').inputValue()==='Partida curta e clara.'&&requests.b===0,prior);
 await tabTo(B.page,dialog+' .survey-next');await B.page.keyboard.press('Enter');
 await B.page.waitForFunction(()=>/registradas/.test(document.querySelector('.match-survey-status')?.textContent||''),null,{timeout:10000});
 await B.page.screenshot({path:`${out}/b-1440-teclado-enviado.png`});
 const recs=await feedbackStore.listFeedback({matchId:m1}),ra=recs.find(r=>r.participant.participantId===t.a.id),rbr=recs.find(r=>r.participant.participantId===t.b.id);
 check('PvP: dois humanos com respostas independentes; comentário vazio (A) e preenchido (B, teclado); perguntas exibidas = respostas gravadas',recs.length===2&&ra.comment===null&&rbr.comment==='Partida curta e clara.'&&Object.keys(ra.answers).length===ra.survey.questions.length&&Object.keys(rbr.answers).length===rbr.survey.questions.length&&requests.b===1,{a:{q:ra.survey.questions.map(q=>q.id),ans:ra.answers},b:{q:rbr.survey.questions.map(q=>q.id),ans:rbr.answers,comment:rbr.comment}});
 // Reconnection: reload A → finale replays, survey stays closed
 await A.page.reload();await A.page.waitForSelector('.capture-done',{timeout:60000});await A.page.waitForTimeout(2500);
 const re=await A.page.evaluate(()=>({open:!!document.querySelector('dialog.match-survey'),finale:window.__s7.finale.length}));
 check('reconexão: encerramento reaparece, formulário não reabre (envio já registrado)',!re.open&&re.finale>=1,re);
 // Rematch: new matchId on the same room; B dismisses, "Nova partida" stays usable; no reopen on further revisions
 const m2=arm();await Promise.all([A,B].map(x=>x.page.waitForFunction(id=>state?.matchId===id&&state.phase==='prep',m2,{timeout:15000})));await playToEnd();
 await B.page.waitForSelector('dialog.match-survey[open]',{timeout:30000}).catch(async e=>{console.log('DEBUG R',JSON.stringify({acts:acts.slice(-5),phase:room.phase,winner:room.winner,matchId:room.matchId===m2,log:room.log.slice(-4).map(l=>l.message),b:await B.page.evaluate(()=>({phase:state.phase,matchId:state.matchId,finale:window.__s7.finale,done:!!document.querySelector('.capture-done'),open:RunaMatchSurvey.open,ss:Object.keys(sessionStorage)}))}));throw e;});const bm=await B.page.evaluate(()=>window.__s7.opened.length);
 await B.page.keyboard.press('Escape');await B.page.waitForTimeout(300);
 const after=await B.page.evaluate(()=>{const b=document.querySelector('.capture-done'),r=b?.getBoundingClientRect(),hit=r&&document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return {open:!!document.querySelector('dialog.match-survey'),newGame:!!b&&(hit===b||b.contains(hit))&&document.activeElement===b,matchId:state.matchId};});
 await room.revision++;await B.page.waitForTimeout(2000);const still=await B.page.evaluate(()=>!!document.querySelector('dialog.match-survey'));
 await A.page.waitForSelector('dialog.match-survey[open]',{timeout:60000});const am=await A.page.evaluate(()=>[...document.querySelectorAll('dialog.match-survey fieldset')].length);
 check('revanche: novo matchId abre novo formulário; dispensar não bloqueia "Nova partida" nem reabre',m2!==m1&&bm===2&&!after.open&&after.newGame&&after.matchId===m2&&!still&&am>=3&&(await feedbackStore.listFeedback({matchId:m2})).length===0&&(await feedbackStore.listFeedback({matchId:m1})).length===2,{m1,m2,bm,after,still});
 await B.page.screenshot({path:`${out}/b-revanche-dispensado.png`});
 await B.page.keyboard.press('Enter');await Promise.all([A,B].map(x=>x.page.waitForFunction(()=>state?.phase==='lobby',null,{timeout:15000})));
 check('Nova partida pelo teclado realmente volta ao lobby e fecha o questionário ainda aberto do rival',!(await A.page.locator(dialog).count())&&!(await B.page.locator('.capture-scene').count())&&(await feedbackStore.listFeedback({matchId:m2})).length===0);
 // Recovery in a new process
 const reader=path.join(out,'recover.mjs');fs.writeFileSync(reader,`import {createFeedbackStore} from ${JSON.stringify(new URL('../mesa-nova/feedback-store.mjs',import.meta.url).href)};const s=await createFeedbackStore({databaseUrl:'',dir:process.argv[2]});const l=await s.listFeedback();console.log(JSON.stringify(l.map(r=>({matchId:r.matchId,participant:r.participant.name,surveyVersion:r.survey.version,questions:r.survey.questions.map(q=>({id:q.id,text:q.text})),answers:r.answers,comment:r.comment}))));`);
 const rec=JSON.parse(spawnSync(process.execPath,[reader,storeDir],{encoding:'utf8'}).stdout||'[]');fs.writeFileSync(path.join(out,'recuperado.json'),JSON.stringify(rec,null,1));
 check('recuperação persistida em novo processo: 2 respostas da 1ª partida, nenhuma da revanche, sem tokens',rec.length===2&&rec.every(r=>r.matchId===m1&&r.surveyVersion===SURVEY_VERSION)&&!JSON.stringify(rec).includes(t.a.token),{count:rec.length});
 await A.context.close();await B.context.close();
}finally{await browser.close();server.close();}
finish(out,'s7-browser',H,{});
