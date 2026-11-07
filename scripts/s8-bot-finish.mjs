// S8: a full match against the REAL automatic bot (shared bot runtime, scheduled by the server itself) until
// `finished`, then the post-match questionnaire in the browser for the human.
// · The runner controls only the human seat: room, bot and deck through the human's own commands, then only
//   legal passive moves (confirm mulligan, end preparation, vote after the bot, confirm formation).
// · A single positive vote starts formation. Let the bot decide first, so the
//   harness does not race it with a vote based on the preceding GET response.
// · It never reads or uses the bot's token and never edits HP, damage, rules, clocks or room state.
// · Explicit time limit; reaching it records round, phase and progress and fails (no retry loop).
// Usage: QA_ACCESS_CODE=<test code> node scripts/s8-bot-finish.mjs <base-url> <out-dir> <feedback-store-dir> [limit-seconds]
import fs from 'node:fs';import path from 'node:path';
import {answerSteps} from './survey-browser-qa.mjs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/vanxf/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const [base,out,storeDir,limitArg='540']=process.argv.slice(2),code=process.env.QA_ACCESS_CODE||'',limitMs=Number(limitArg)*1000;fs.mkdirSync(out,{recursive:true});
const mesa=base.replace(/\/$/,'')+'/runamarca',origin=new URL(base).origin;
const results=[],check=(name,ok,detail)=>{results.push({name,ok:Boolean(ok),detail});console.log((ok?'PASS ':'FAIL ')+name,JSON.stringify(detail??'').slice(0,700));};
const sleep=ms=>new Promise(r=>setTimeout(r,ms)),progress=[],acts=[];
if(!code)throw Error('QA_ACCESS_CODE ausente.');
const browser=await chromium.launch({executablePath:process.env.QA_BROWSER||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
let summary={};
try{
 const context=await browser.newContext({viewport:{width:1440,height:900}});await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
 await context.addInitScript(()=>{window.__s8={finale:[]};document.addEventListener('runamarca:finale-complete',e=>window.__s8.finale.push({matchId:e.detail?.matchId,at:Date.now()}));});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 // access through the normal form
 await page.goto(mesa+'/access');await page.fill('#code',code);await Promise.all([page.waitForResponse(r=>r.url().endsWith('/runamarca/access')&&r.request().method()==='POST'),page.click('#gate button')]);
 await page.goto(mesa+'/');await page.waitForFunction(()=>typeof render==='function'&&document.getElementById('create'));
 // human creates the room and calls the bot through the interface
 await page.fill('#player-name','QA humano');await page.click('#create');
 await page.waitForFunction(()=>{try{return Boolean(JSON.parse(sessionStorage.getItem('runamarca-nova-seat'))?.token)&&state?.code;}catch{return false;}});
 const seat=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('runamarca-nova-seat'))),room=seat.code,token=seat.token;
 await page.waitForFunction(()=>document.getElementById('bot-deck')?.options.length>0);await page.selectOption('#bot-deck','ruptura-grupo');await page.click('#add-bot');
 await page.waitForFunction(()=>state?.players?.length===2);
 const api=async(p,body)=>{const r=await page.request.fetch(mesa+p,{method:body?'POST':'GET',headers:{'content-type':'application/json','x-player-token':token},data:body?JSON.stringify(body):undefined});let j=null;try{j=await r.json();}catch{}return {status:r.status(),body:j};};
 const act=async b=>{const r=await api(`/api/rooms/${room}/act`,b);acts.push({type:b.type,status:r.status,error:r.body?.error||null});return r;};
 await act({type:'deck',deckId:'fluxo-virelion',art:{}});
 // play only the human seat until finished or the explicit limit
 const started=Date.now(),seen={phases:new Set(),botLog:new Set(),botTurns:0};let s=null,lastKey='',lastTurnBot=false,botId=null,matchId=null;
 while(Date.now()-started<limitMs){
  s=(await api(`/api/rooms/${room}/state`)).body;if(!s)break;matchId=s.matchId||matchId;seen.phases.add(s.phase);
  const me=s.players.find(p=>p.id===s.you),bot=s.players.find(p=>p.id!==s.you);botId=bot?.id||botId;
  for(const l of s.log||[])if(l.actor===bot?.id)seen.botLog.add(l.message);
  if(s.phase==='prep'&&s.turn===bot?.id&&!lastTurnBot){seen.botTurns++;lastTurnBot=true;}if(s.turn===me?.id)lastTurnBot=false;
  const key=s.round+'|'+s.phase;if(key!==lastKey){lastKey=key;const row={t:Math.round((Date.now()-started)/1000),round:s.round,phase:s.phase,humanHp:me?.patron?.hp,botHp:bot?.patron?.hp,humanDeck:me?.deckCount??me?.deck?.length,botDeck:bot?.deckCount??bot?.deck?.length};progress.push(row);console.log('progresso',JSON.stringify(row));}
  if(s.phase==='finished')break;
  if(s.phase==='mulligan'&&!me.mulliganReady)await act({type:'confirmMulligan'});
  else if(s.phase==='prep'&&s.turn===me.id&&!me.pendingDiscard)await act({type:'endPrep'});
  else if(s.phase==='vote'&&!me.voted&&bot.voted)await act({type:'vote',fight:true});
  else if(s.phase==='formation'&&!me.ready)await act({type:'ready'});
  await sleep(400);
 }
 const elapsed=Math.round((Date.now()-started)/1000),finished=s?.phase==='finished',me=s?.players.find(p=>p.id===s.you),bot=s?.players.find(p=>p.id!==s.you);
 summary={room,matchId,elapsedSeconds:elapsed,limitSeconds:limitMs/1000,finished,lastRound:s?.round,lastPhase:s?.phase,winner:s?.winner??null,humanHp:me?.patron?.hp,botHp:bot?.patron?.hp,botTurns:seen.botTurns,botLogSample:[...seen.botLog].slice(-8),rejected:acts.filter(a=>a.status!==200)};
 check('bot real jogou turnos próprios pelo servidor (sem uso do token dele)',seen.botTurns>=2&&seen.botLog.size>=2,{botTurns:seen.botTurns,botActions:seen.botLog.size});
 check('nenhuma ação humana recusada',summary.rejected.length===0,{rejected:summary.rejected.slice(0,5),total:acts.length});
 check('partida chegou a finished dentro do limite',finished,{elapsed,limit:limitMs/1000,round:s?.round,phase:s?.phase,humanHp:summary.humanHp,botHp:summary.botHp});
 if(finished){
  // browser: finale, then the questionnaire for the human
  await page.waitForFunction(()=>state?.phase==='finished',null,{timeout:30000});
  await page.waitForFunction(()=>window.__s8.finale.length>0,null,{timeout:90000}).catch(()=>{});
  const finale=await page.evaluate(()=>window.__s8.finale);check('navegador mostra o encerramento (runamarca:finale-complete)',finale.length>=1&&(!matchId||finale[0].matchId===matchId),{finale,matchId});
  await page.screenshot({path:out+'/encerramento.png'});
  await page.waitForSelector('dialog.match-survey[open]',{timeout:60000}).catch(()=>{});
  const qids=await page.$$eval('dialog.match-survey[open] fieldset',f=>f.map(x=>x.dataset.question)).catch(()=>[]);
  const openedAfterFinale=await page.evaluate(()=>Boolean(document.querySelector('dialog.match-survey[open]'))&&window.__s8.finale.length>0);
  check('questionário abre para o humano depois do encerramento, com pergunta sobre o bot',openedAfterFinale&&qids.length>=3&&qids.length<=5&&qids.includes('bot_desafio'),{qids});
  // The opening includes a short delayed fade. Capture its readable state,
  // rather than treating the first [open] frame as the finished presentation.
  await page.waitForFunction(()=>{const d=document.querySelector('dialog.match-survey[open]');return d&&Number(getComputedStyle(d).opacity)>=.99;},{},{timeout:5000});
  await page.screenshot({path:out+'/questionario.png'});
  await answerSteps(page);
  const comment=page.locator('dialog.match-survey[open] textarea');if(await comment.count())await comment.first().fill('QA S8: partida completa contra o bot real.');
  const [post]=await Promise.all([page.waitForResponse(r=>r.url().endsWith(`/api/rooms/${room}/feedback`)&&r.request().method()==='POST',{timeout:15000}),page.locator('dialog.match-survey[open] button[type=submit]').click()]);
  // match-survey.js (S7): once stored, the dialog stays open with the confirmation, inputs disabled and "Fechar".
  await page.waitForFunction(()=>/Respostas registradas/.test(document.querySelector('dialog.match-survey[open] .match-survey-status')?.textContent||''),null,{timeout:15000}).catch(()=>{});
  const confirmed=await page.evaluate(()=>{const d=document.querySelector('dialog.match-survey[open]');return d&&{message:d.querySelector('.match-survey-status')?.textContent.trim(),disabled:[...d.querySelectorAll('input,textarea')].every(n=>n.disabled),close:d.querySelector('.survey-skip')?.textContent.trim()};});
  await page.screenshot({path:out+'/enviado.png'});
  if(confirmed?.close==='Fechar')await page.locator('dialog.match-survey[open]').getByRole('button',{name:'Fechar',exact:true}).click();
  await page.waitForFunction(()=>!document.querySelector('dialog.match-survey[open]'),null,{timeout:10000}).catch(()=>{});
  // feedback-api.mjs contract: the first valid submission answers 201 {status:'stored',feedbackId}.
  const posted=await post.json().catch(()=>null);
  check('respostas válidas aceitas (201 stored), confirmação com campos desativados e "Fechar" fecha o diálogo',post.status()===201&&posted?.status==='stored'&&Boolean(posted.feedbackId)&&/Respostas registradas/.test(confirmed?.message||'')&&confirmed.disabled&&confirmed.close==='Fechar'&&!(await page.evaluate(()=>Boolean(document.querySelector('dialog.match-survey[open]')))),{status:post.status(),body:posted&&{status:posted.status,hasId:Boolean(posted.feedbackId)},confirmed});
  const get=(await api(`/api/rooms/${room}/feedback?matchId=${matchId}`)).body;
  check('GET do humano confirma o envio (submitted, sem novo formulário)',get?.submitted===true&&get.survey===null,{submitted:get?.submitted,survey:get?.survey,reason:get?.reason});
  // persistence in the isolated file store
  const read=dir=>fs.existsSync(dir)?fs.readdirSync(dir).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(fs.readFileSync(path.join(dir,f),'utf8'))):[];
  const records=read(path.join(storeDir,'feedback')).filter(r=>r.matchId===matchId),contexts=read(path.join(storeDir,'contexts'));
  const rec=records[0];
  check('persistência: um único registro da partida, do humano',records.length===1&&rec.participant?.kind==='human'&&rec.participant?.participantId===s.you,{records:records.length,participant:rec?.participant&&{kind:rec.participant.kind,isHuman:rec.participant.participantId===s.you}});
  check('contexto PvE com adversário bot no registro',rec?.opponentKind==='bot'&&JSON.stringify(rec?.context||{}).includes('pve'),{opponentKind:rec?.opponentKind,mode:rec?.context?.mode});
  check('nenhuma resposta atribuída ao bot',records.every(r=>r.participant?.participantId!==botId)&&read(path.join(storeDir,'feedback')).every(r=>r.participant?.participantId!==botId),{botId:Boolean(botId)});
  check('contexto da partida persistido',contexts.some(c=>c.matchId===matchId||JSON.stringify(c).includes(matchId)),{contexts:contexts.length});
  // reload: questionnaire does not reopen
  await page.reload();await page.waitForFunction(()=>window.__s8.finale.length>0&&state?.phase==='finished'&&RunaMatchSurvey.pending.length===0,null,{timeout:60000});
  check('após repetir o encerramento na reconexão o questionário enviado não reabre',!(await page.evaluate(()=>Boolean(document.querySelector('dialog.match-survey[open]')))),{});
  summary.feedback=rec&&{feedbackId:rec.feedbackId,opponentKind:rec.opponentKind,mode:rec.context?.mode,surveyVersion:rec.survey?.version,answers:rec.answers&&Object.keys(rec.answers)};
 }else{
  await page.screenshot({path:out+'/limite.png'});
 }
 check('sem erros de página',errors.length===0,{errors:errors.slice(0,5)});
}finally{await browser.close();}
const passed=results.filter(r=>r.ok).length;fs.writeFileSync(out+'/s8-bot-finish.json',JSON.stringify({summary,progress,passed,total:results.length,results,acts},null,1));console.log(JSON.stringify({passed,total:results.length,finished:summary.finished}));process.exitCode=passed===results.length?0:1;
