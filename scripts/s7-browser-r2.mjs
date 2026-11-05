// S7 browser, round 2 (real client, isolated server under /runamarca, HTTP /act, engine timer, normal
// polling). 390 px phone pages. Cases: (1) first GET fails by network → bounded automatic retry opens
// the form once; hybrid phone: last alternatives, error message and buttons reachable; (2) storage
// unavailable on GET (submitted:null) until retries are exhausted → explicit "Tentar novamente" →
// opens once; dismiss sticks; (3) human vs bot (bot actions posted with the bot seat token; the
// shared bot runtime is off in QA); (4) simulation: no form, nothing stored.
// Usage: node scripts/s7-browser-r2.mjs <out-dir>
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';
import {answerSteps,inspectStep} from './survey-browser-qa.mjs';
const out=path.resolve(process.argv[2]||'prototype-qa/s7/browser-r2'),storeDir=path.join(out,'store');fs.rmSync(storeDir,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});
process.env.NODE_ENV='test';process.env.RUNAMARCA_SHARED_BOT='0';process.env.RUNAMARCA_FEEDBACK_DIR=storeDir;delete process.env.DATABASE_URL;
const {harness,launch,finish}=await import('./hybrid12-lib.mjs');const H=harness(out),{check}=H;
const {handleNewGame,createTestAccess,roomsForTest,feedbackStore}=await import('../mesa-nova/server.mjs');
const {setup,place,unit}=await import('../mesa-nova/r1-fixtures.mjs');const {beginMatch}=await import('../accounts.mjs');const {observe,feedbackId}=await import('../mesa-nova/match-context.mjs');
const {join}=await import('../mesa-nova/game.mjs');
const server=http.createServer(async(req,res)=>{if(req.url.startsWith('/runamarca'))req.headers.cookie=createTestAccess(req,'/runamarca');const h=await handleNewGame(req,res,new URL(req.url,'http://localhost'),'/runamarca');if(h===false&&!res.headersSent){res.writeHead(404);res.end('{}');}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}/runamarca`;
const fb=path.join(storeDir,'feedback'),breakStore=()=>{fs.mkdirSync(fb,{recursive:true});fs.renameSync(fb,fb+'-off');fs.writeFileSync(fb,'indisponível');},fixStore=()=>{fs.rmSync(fb);fs.renameSync(fb+'-off',fb);};
function newRoom(code,{bot=false,sim=null}={}){const t=setup({aDeck:'ruptura-grupo',bDeck:'fluxo-virelion'}),room=t.room;room.code=code;room.simulation=sim;t.b.bot=bot;room.onChange=()=>observe(room,{store:feedbackStore});roomsForTest().set(code,room);
 beginMatch(room);room.phase='prep';room.turn=t.a.id;room.round=1;for(const p of room.players){p.reserve=[];p.formation=[null,null,null];p.mana=p.manaMax=3;}place(t.a,unit(t.a,{attack:5,health:9}),0);t.b.patron.hp=1;room.revision++;observe(room,{store:feedbackStore});return t;}
const post=(t,token,body)=>fetch(`${base}/api/rooms/${t.room.code}/act`,{method:'POST',headers:{'content-type':'application/json','x-player-token':token},body:JSON.stringify(body)}).then(r=>r.json());
async function playToEnd(t,formation=[]){for(const [tk,b] of [[t.a.token,{type:'endPrep'}],[t.b.token,{type:'endPrep'}],[t.a.token,{type:'vote',fight:true}],...formation,[t.a.token,{type:'ready'}],[t.b.token,{type:'ready'}]]){const result=await post(t,tk,b);if(result.error)throw Error(b.type+': '+result.error);}}
const browser=await launch();
async function human(t,{route='hybrid',onRoute=null,token=t.a.token,width=390,height=800,reduced=false}={}){const context=await browser.newContext({viewport:{width,height},hasTouch:width<500,isMobile:width<500,reducedMotion:reduced?'reduce':'no-preference'});const log={gets:[],posts:0};
 await context.addInitScript(([c,tk])=>{sessionStorage.setItem('runamarca-nova-seat',JSON.stringify({code:c,token:tk}));window.__s7={finale:[],opened:0};document.addEventListener('runamarca:finale-complete',e=>window.__s7.finale.push(e.detail.matchId));addEventListener('DOMContentLoaded',()=>new MutationObserver(()=>{const d=document.querySelector('dialog.match-survey');if(d&&!d.__seen){d.__seen=1;window.__s7.opened++;}}).observe(document.documentElement,{childList:true,subtree:true}));},[t.room.code,token]);
 await context.route('**/*',async r=>{const u=new URL(r.request().url());if(u.hostname!=='127.0.0.1')return r.abort();if(u.pathname.endsWith('/feedback')&&r.request().method()==='GET'){const n=log.gets.length;log.gets.push({n});if(onRoute&&await onRoute(r,n,log))return;const resp=await r.fetch();const body=await resp.json().catch(()=>null);log.gets[n].submitted=body?.submitted;log.gets[n].reason=body?.reason;log.gets[n].survey=!!body?.survey;return r.fulfill({response:resp,json:body});}
  if(u.pathname.endsWith('/feedback')&&r.request().method()==='POST')log.posts++;return r.continue();});
 const page=await context.newPage();page.on('pageerror',e=>H.errors.push(e.message));await page.goto(`${base}/${route==='hybrid'?'hybrid/index.html':''}?room=${t.room.code}`);await page.waitForFunction(()=>state?.phase==='prep');return {context,page,log};}
const tapIn=async(page,loc)=>{await loc.scrollIntoViewIfNeeded();const b=await loc.boundingBox();await page.touchscreen.tap(b.x+b.width/2,b.y+b.height/2);};
const visibleTop=(page,sel)=>page.evaluate(sel=>{const n=document.querySelector(sel);if(!n)return false;const r=n.getBoundingClientRect();if(!r.width||r.top<0||r.bottom>innerHeight)return false;const h=document.elementFromPoint(r.left+r.width/2,r.top+Math.min(r.height/2,8));return h===n||n.contains(h);},sel);
try{
 if(process.env.V5_CASE!=='empate'){
 // 1 · network failure on the first GET, hybrid phone
 const t1=newRoom('B1C2D3');const h1=await human(t1,{onRoute:async(r,n)=>n===0?(await r.abort('failed'),true):false});await playToEnd(t1);
 await h1.page.waitForSelector('dialog.match-survey[open]',{timeout:60000});await h1.page.waitForTimeout(1500);
 const s1=await h1.page.evaluate(()=>({opened:window.__s7.opened,ss:sessionStorage.getItem('runamarca-survey:'+state.matchId),pending:RunaMatchSurvey.pending.length}));
 check('1º GET falha por rede → nova tentativa automática abre o formulário uma vez, sem marcar exibido/dispensado',h1.log.gets.length>=2&&h1.log.gets[0].submitted===undefined&&h1.log.gets.at(-1).survey&&s1.opened===1&&s1.ss===null&&s1.pending===0,{gets:h1.log.gets,s1});
 const qs=h1.page.locator('dialog.match-survey fieldset');const nq=await qs.count();const layout=await inspectStep(h1.page);
 check('390: questionário ao centro com uma pergunta e cinco alvos de toque de pelo menos 44 px',layout.offset.every(v=>Math.abs(v)<1)&&layout.visible===1&&await h1.page.locator('fieldset:visible label').evaluateAll(nodes=>nodes.length===5&&nodes.every(n=>n.offsetHeight>=44&&n.offsetWidth>=44)),layout);
 await h1.page.screenshot({path:out+'/1-hibrida-390-primeira.png'});await answerSteps(h1.page,{input:'touch',lastChoice:true});
 const lastChecked=await qs.nth(nq-1).locator('input').last().isChecked();
 breakStore();await tapIn(h1.page,h1.page.locator('dialog.match-survey button[type=submit]'));await h1.page.waitForFunction(()=>/mantidas/.test(document.querySelector('.match-survey-status')?.textContent||''),null,{timeout:10000});
 const ui=await h1.page.evaluate(()=>({checked:document.querySelectorAll('dialog.match-survey input:checked').length}));const msg=await visibleTop(h1.page,'.match-survey-status'),send=await visibleTop(h1.page,'dialog.match-survey button[type=submit]'),skip=await visibleTop(h1.page,'dialog.match-survey .survey-skip');
 await h1.page.screenshot({path:`${out}/1-hibrida-390-erro.png`});
 check('híbrida 390: última alternativa acessível; erro visível e não coberto; botões visíveis; respostas mantidas',lastChecked&&ui.checked===nq&&msg&&send&&skip,{lastChecked,ui,msg,send,skip,nq});
 fixStore();await tapIn(h1.page,h1.page.locator('dialog.match-survey button[type=submit]'));await h1.page.waitForFunction(()=>/registradas/.test(document.querySelector('.match-survey-status')?.textContent||''),null,{timeout:10000});
 await h1.page.screenshot({path:`${out}/1-hibrida-390-enviado.png`});
 check('híbrida 390: nova tentativa grava uma vez',(await feedbackStore.listFeedback({matchId:t1.room.matchId})).length===1,{posts:h1.log.posts});
 await h1.context.close();
 // 2 · storage unavailable on GET until retries are exhausted → explicit retry; then dismiss
 // Unreadable record for this participant (a directory where the JSON should be): GET reports submitted:null.
 const t2=newRoom('B2C3D4');const h2=await human(t2,{route:'native'});const blockRead=path.join(fb,feedbackId(t2.room.matchId,t2.a.id)+'.json');fs.mkdirSync(blockRead,{recursive:true});await playToEnd(t2);
 await h2.page.waitForSelector('.match-survey-retry',{timeout:40000}).catch(async e=>{console.log('DEBUG2',JSON.stringify({gets:h2.log.gets,page:await h2.page.evaluate(()=>({phase:state?.phase,finale:window.__s7.finale.length,opened:window.__s7.opened,pending:RunaMatchSurvey.pending,dialog:!!document.querySelector('dialog.match-survey'),done:!!document.querySelector('.capture-done')}))}));throw e;});const before2=await h2.page.evaluate(()=>({opened:window.__s7.opened,ss:sessionStorage.getItem('runamarca-survey:'+state.matchId)}));
 await h2.page.screenshot({path:`${out}/2-nativa-390-tentar-novamente.png`});
 fs.rmSync(blockRead,{recursive:true});await tapIn(h2.page,h2.page.locator('.match-survey-retry button.primary'));await h2.page.waitForSelector('dialog.match-survey[open]',{timeout:10000});
 check('armazenamento indisponível no GET (submitted:null): 4 tentativas limitadas, aviso com "Tentar novamente"; após recuperar abre uma vez',h2.log.gets.slice(0,4).every(g=>g.submitted===null)&&h2.log.gets.length===5&&before2.opened===0&&before2.ss===null&&(await h2.page.evaluate(()=>window.__s7.opened))===1,{gets:h2.log.gets,before2});
 await tapIn(h2.page,h2.page.getByRole('button',{name:'Agora não'}));room2Revision(t2);await h2.page.waitForTimeout(3000);
 const d2=await h2.page.evaluate(()=>({open:!!document.querySelector('dialog.match-survey'),ss:sessionStorage.getItem('runamarca-survey:'+state.matchId),opened:window.__s7.opened}));
 check('dispensa registrada e sem reabertura com novas revisões',!d2.open&&d2.ss==='dismissed'&&d2.opened===1&&(await feedbackStore.listFeedback({matchId:t2.room.matchId})).length===0,d2);
 await h2.context.close();
 // 3 · human vs bot
 const t3=newRoom('B3C4D5',{bot:true});const h3=await human(t3);await playToEnd(t3);await h3.page.waitForSelector('dialog.match-survey[open]',{timeout:60000});
 const qids=await h3.page.$$eval('dialog.match-survey fieldset',f=>f.map(x=>x.dataset.question));
 await answerSteps(h3.page,{input:'touch'});await tapIn(h3.page,h3.page.locator('dialog.match-survey button[type=submit]'));await h3.page.waitForFunction(()=>/registradas/.test(document.querySelector('.match-survey-status')?.textContent||''),null,{timeout:10000});
 const botGet=await fetch(`${base}/api/rooms/${t3.room.code}/feedback`,{headers:{'x-player-token':t3.b.token}}).then(r=>r.json());const r3=await feedbackStore.listFeedback({matchId:t3.room.matchId});
 await h3.page.screenshot({path:`${out}/3-pve-hibrida-390-enviado.png`});
 check('humano contra bot (navegador): formulário com pergunta sobre o bot; humano grava; bot sem questionário',qids.includes('bot_desafio')&&r3.length===1&&r3[0].opponentKind==='bot'&&botGet.survey===null&&botGet.reason==='BOT_PARTICIPANT',{qids,bot:botGet.reason,stored:r3.length});
 await h3.context.close();
 // 4 · simulation
 const t4=newRoom('B4C5D6',{sim:'request'});const viewer=join(t4.room,'Arquibancada','spectator');
 const obs=await human(t4,{token:viewer.token,width:1920,height:1080}),h4=await human(t4,{route:'native'});
 await playToEnd(t4);await h4.page.waitForFunction(()=>window.__s7.finale.length>0,null,{timeout:60000});await h4.page.waitForTimeout(4000);
 const s4=await h4.page.evaluate(()=>({dialog:!!document.querySelector('dialog.match-survey'),retry:!!document.querySelector('.match-survey-retry'),opened:window.__s7.opened}));
 await h4.page.screenshot({path:`${out}/4-simulacao-390-sem-formulario.png`});
 check('simulação (navegador): sem formulário, sem aviso, sem novas tentativas; nada gravado',!s4.dialog&&!s4.retry&&s4.opened===0&&h4.log.gets.length===1&&h4.log.gets[0].reason==='SIMULATION'&&(await feedbackStore.listFeedback({matchId:t4.room.matchId})).length===0,{s4,gets:h4.log.gets});
 const watch=await obs.page.evaluate(()=>({title:document.querySelector('.capture-title')?.textContent,wait:document.querySelector('.capture-wait')?.textContent,form:!!document.querySelector('.match-survey'),reset:!!document.querySelector('.capture-done')}));
 check('arquibancada vê o nome do vencedor sem questionário ou comando de jogador',watch.title===t4.a.name+' venceu a caçada'&&watch.wait&&!watch.form&&!watch.reset,watch);
 await obs.page.screenshot({path:out+'/4-espectador-1920.png'});await obs.context.close();await h4.context.close();
 }
 // Both unopposed lanes hit lethal on the same resolution. Real result and eligibility, no winner fixture.
 const t5=newRoom('B5C6D7');t5.a.patron.hp=1;const defender=unit(t5.b,{attack:5,health:9});t5.b.reserve.push(defender);
 const h5=await human(t5,{reduced:true,width:1920,height:1080}),outsider=join(t5.room,'Visitante','spectator');
 const other=await human(t5,{route:'native',token:outsider.token,reduced:true,width:1280,height:720});
 await playToEnd(t5,[[t5.b.token,{type:'assign',cardId:defender.uid,lane:1}]]);await h5.page.waitForSelector('.capture-done',{timeout:60000});await h5.page.screenshot({path:out+'/5-empate.png'});
 await h5.page.waitForSelector('dialog.match-survey[open]');const tied=await inspectStep(h5.page);
 const drawTitle=await h5.page.locator('.capture-title').textContent(),fair=await h5.page.locator('[data-question=resultado_justo] legend').textContent();
 await other.page.waitForFunction(()=>window.__s7.finale.length>0);await other.page.waitForFunction(()=>RunaMatchSurvey.pending.length===0);
 check('empate do motor: resultado neutro sem captura nem vencedor; participante pode responder, espectador não recebe pesquisa',t5.room.phase==='finished'&&t5.room.winner==null&&t5.a.patron.hp<=0&&t5.b.patron.hp<=0&&drawTitle==='Empate'&&/empate/.test(fair)&&!await h5.page.locator('.jailed-patron,.champion').count()&&other.log.gets[0]?.reason==='NOT_A_PARTICIPANT'&&!await other.page.locator('.match-survey').count(),{drawTitle,fair,outsider:other.log.gets,hp:[t5.a.patron.hp,t5.b.patron.hp]});
 check('movimento reduzido: questionário central entra sem fade e o resultado não anima a saída',tied.animation==='none'&&tied.fade==='0s'&&tied.offset.every(v=>Math.abs(v)<1),tied);
 await h5.page.screenshot({path:out+'/5-empate-questionario-1920.png'});
 // Hold only the response to a real POST. Closing or rematching may not act on the next match.
 const held=Promise.withResolvers(),release=Promise.withResolvers();
 await h5.page.route('**/feedback',async r=>{if(r.request().method()!=='POST')return r.fallback();const response=await r.fetch();held.resolve(response.status());await release.promise;return r.fulfill({response});});
 await answerSteps(h5.page);await h5.page.getByRole('button',{name:'Enviar respostas'}).click();
 const responseCode=await held.promise,id5=t5.room.matchId,msg=await h5.page.locator('.match-survey-status').textContent();
 await h5.page.locator('dialog.match-survey .survey-skip').click();await h5.page.locator('.capture-done').click();
 await h5.page.waitForFunction(()=>state?.phase==='lobby');release.resolve();
 await h5.page.waitForFunction(id=>sessionStorage.getItem('runamarca-survey:'+id)==='sent',id5);
 check('envio pendente: pode fechar e começar outra partida; confirmação atrasada não reabre a tela e o registro é único',responseCode===201&&/Aguardando confirmação/.test(msg)&&!await h5.page.locator('.match-survey,.capture-scene').count()&&(await feedbackStore.listFeedback({matchId:id5})).length===1,{responseCode,msg});
 await h5.context.close();await other.context.close();
}finally{await browser.close();server.close();}
function room2Revision(t){t.room.revision++;}
finish(out,'s7-browser-r2',H,{});
