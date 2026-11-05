// Bloco B · vídeo da sequência real, dois assentos humanos de QA no servidor isolado (scripts/b-live-server.mjs).
// A (Marika, fluxo-virelion) records 1920×1080; B (Lyrik, forja-oficina-lyrik) records 1366×768. Each seat uses
// only its own token. Lobby, deck choice, mulligan and the end of the preparation go through each seat's own API
// calls (boilerplate); the vote, the drags of the formation and both confirmations are real clicks/drags in the
// pages. The only scene change is the QA route of b-live-server (one creature of each deck moved to its reserve
// during the preparation). Then: fog → drag → confirmation → combat → casualties → next preparation, as served.
// Usage: node scripts/b-live-sequence.mjs <out-dir>
import fs from 'node:fs';import path from 'node:path';
import {chromium,CHROME} from './hybrid12-lib.mjs';
import {startCapture,encode} from './b-screencast.mjs';
const out=process.argv[2]||'prototype-qa/revisao-visual-20261103/formacao-B/video',base=process.env.QA_BASE||'http://127.0.0.1:3087',control=process.env.QA_CONTROL||'http://127.0.0.1:3088';
fs.mkdirSync(out,{recursive:true});const sleep=ms=>new Promise(r=>setTimeout(r,ms)),t0=Date.now(),marks=[],mark=(name,extra={})=>{const m={t:+((Date.now()-t0)/1000).toFixed(2),epoch:Date.now(),name,...extra};marks.push(m);console.log(JSON.stringify(m));};
const browser=await chromium.launch({executablePath:process.env.QA_BROWSER||CHROME,headless:true});
// one browser process per seat (a crash of one never takes the other one with it); a third one encodes
const launchEdge=()=>chromium.launch({executablePath:process.env.QA_BROWSER||CHROME,headless:true});
async function seat(name,viewport){const browser=await launchEdge();const dir=path.join(process.env.QA_FRAMES||out,'raw-'+name);fs.mkdirSync(dir,{recursive:true});
 const ctx=await browser.newContext({viewport,deviceScaleFactor:1});await ctx.route('**/*',r=>{const u=new URL(r.request().url());return ['127.0.0.1','fonts.googleapis.com','fonts.gstatic.com'].includes(u.hostname)?r.continue():r.abort();});
 const page=await ctx.newPage(),errors=[],acts=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',async r=>{if(r.url().includes('/act')&&r.request().method()==='POST'){let b=null;try{b=await r.json();}catch{}acts.push({status:r.status(),req:r.request().postData()?.slice(0,120),error:b?.error||null});}});await page.goto(base+'/runamarca/hybrid/index.html');await page.waitForFunction(()=>typeof render==='function'&&document.getElementById('create'));await page.evaluate(()=>document.fonts.ready);const capture=await startCapture(ctx,page,path.join(dir,'frames'),{max:viewport});return {name,browser,ctx,page,errors,acts,dir,capture,viewport};}
const A=await seat('A',{width:1920,height:1080}),B=await seat('B',{width:1366,height:768});
const token=async P=>(await P.page.evaluate(()=>JSON.parse(sessionStorage.getItem('runamarca-nova-seat')))).token;
const api=async(P,tok,code,body)=>{const r=await P.page.request.fetch(`${base}/runamarca/api/rooms/${code}/${body?'act':'state'}`,{method:body?'POST':'GET',headers:{'content-type':'application/json','x-player-token':tok},data:body?JSON.stringify(body):undefined});let j=null;try{j=await r.json();}catch{}if(body&&r.status()!==200)throw Error(`${P.name} ${body.type}: ${r.status()} ${JSON.stringify(j)}`);return j;};
const phase=P=>P.page.evaluate(()=>state?.phase);
const waitPhase=(P,ph,timeout=60000)=>P.page.waitForFunction(ph=>state?.phase===ph,ph,{timeout});
const shot=async(P,name)=>{await P.page.screenshot({path:path.join(out,`${name}-${P.name}.png`)});};
const report={};
try{
 // lobby: create and join through the interface
 await A.page.fill('#player-name','Marika QA');await A.page.click('#create');await A.page.waitForFunction(()=>state?.code);const code=await A.page.evaluate(()=>state.code);
 await B.page.fill('#player-name','Lyrik QA');await B.page.fill('#join-code',code);await B.page.click('#join');await B.page.waitForFunction(()=>state?.players?.length===2);
 const ta=await token(A),tb=await token(B);mark('room',{code});
 await api(A,ta,code,{type:'deck',deckId:'fluxo-virelion',art:{}});await api(B,tb,code,{type:'deck',deckId:'forja-oficina-lyrik',art:{}});
 await waitPhase(A,'mulligan');await sleep(1500);await api(A,ta,code,{type:'confirmMulligan'});await api(B,tb,code,{type:'confirmMulligan'});await waitPhase(A,'prep');mark('prep');
 // let both opening deals finish (hand dealt, no draw lock) before anything else, as a person would
 for(const P of [A,B])await P.page.waitForFunction(()=>document.querySelectorAll('#hand>.hand-card:not([data-hybrid-waiting])').length>=4&&document.querySelector('.hybrid-draw-lock')?.hidden!==false,null,{timeout:30000}).catch(()=>{});await sleep(800);mark('hands-dealt');
 const scene=await (await fetch(`${control}/scene/${code}`,{method:'POST'})).json();mark('qa-scene',scene);
 // end of the preparation for both seats (each with its own token), then the vote in the interface
 for(let guard=0;guard<6;guard++){const s=await api(A,ta,code);if(s.phase!=='prep')break;const turnA=s.turn===s.you;await api(turnA?A:B,turnA?ta:tb,code,{type:'endPrep'});await sleep(700);}
 await waitPhase(A,'vote');await sleep(1200);mark('vote');await shot(A,'01-votacao');
 await A.page.locator('#phase-actions button',{hasText:'Começar combate'}).click();
 await waitPhase(A,'formation');await waitPhase(B,'formation');mark('formation');await sleep(1900);
 report.focusA=await A.page.evaluate(()=>({focus:RunaHybridFocus.stats,scene:RunaHybrid.scene.focus,circuit:document.getElementById('round-circuit')?.dataset.active,caption:document.querySelector('.round-circuit-state')?.textContent}));await shot(A,'02-nevoa-foco');await shot(B,'02-nevoa-foco');
 // real drags: reserve card → own position 3 (lane index 2)
 async function drag(P,id,label){const pts=await P.page.evaluate(id=>{const c=[...document.querySelectorAll('.reserve-camp.self-camp .card')].find(n=>state.players.find(p=>p.id===state.you).reserve.find(x=>x.uid===n.dataset.uid)?.id===id),s=[...document.querySelectorAll('#lanes .lane-side')].find(n=>n.dataset.owner===state.you&&n.dataset.lane==='2');const a=c?.getBoundingClientRect(),b=s?.getBoundingClientRect();return a&&b?{uid:c.dataset.uid,from:{x:a.x+a.width/2,y:a.y+a.height/2},to:{x:b.x+b.width/2,y:b.y+b.height/2}}:null;},id);
  if(!pts)throw Error(P.name+': card '+id+' not found');await P.page.mouse.move(P.viewport.width/2,P.viewport.height*.4);await sleep(300);pts.hit=await P.page.evaluate(p=>{const h=document.elementFromPoint(p.x,p.y);return h?(h.className||h.tagName)+' | '+(h.closest('.card')?.dataset.uid||'-'):null;},pts.from);console.log(P.name,'hit',pts.hit,'forceWindow',JSON.stringify(await P.page.evaluate(()=>({fw:state.forceWindow,now:Date.now()-serverClockOffset,ready:state.players.find(p=>p.id===state.you).ready}))));await P.page.mouse.move(pts.from.x,pts.from.y);await sleep(250);await P.page.mouse.down();await P.page.mouse.move((pts.from.x+pts.to.x)/2,(pts.from.y+pts.to.y)/2,{steps:14});await sleep(120);
  const mid=await P.page.evaluate(()=>[...document.querySelectorAll('#lanes .lane-side')].map(n=>({own:n.dataset.owner===state.you,legal:n.classList.contains('legal-drop'),ready:n.classList.contains('drop-ready')})));await shot(P,'03-arrasto');
  await P.page.mouse.move(pts.to.x,pts.to.y,{steps:14});await sleep(250);await P.page.mouse.up();await sleep(200);await P.page.mouse.move(P.viewport.width*.94,P.viewport.height*.5,{steps:6});await P.page.waitForFunction(uid=>state.players.find(p=>p.id===state.you).formation[2]===uid,pts.uid,{timeout:8000}).catch(async e=>{console.log(P.name,'acts',JSON.stringify(P.acts.slice(-4)),'errors',JSON.stringify(P.errors));await shot(P,'debug-after-drag');throw e;});mark('drag-'+P.name,{uid:pts.uid,legal:mid.filter(s=>s.legal).length});return {uid:pts.uid,mid};}
 report.dragA=await drag(A,'FV01');report.dragB=await drag(B,'FL06');await sleep(500);
 // confirmations in the interface; the wait is shown in the same slot
 const slot=async P=>P.page.evaluate(()=>{const b=document.querySelector('#phase-actions button');const r=b?.getBoundingClientRect();return b&&{text:b.textContent.trim(),x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)};});
 report.confirmA={before:await slot(A)};await A.page.locator('#phase-actions button.formation-confirm').click();await A.page.waitForFunction(()=>/Aguardando o rival/.test(document.querySelector('#phase-actions button')?.textContent||''));report.confirmA.after=await slot(A);mark('confirm-A',report.confirmA);await sleep(600);await shot(A,'04-espera');
 await B.page.locator('#phase-actions button.formation-confirm').click();mark('confirm-B');
 await waitPhase(A,'resolving',15000);mark('resolving');await sleep(1200);await shot(A,'05-combate');await shot(B,'05-combate');
 // casualties: catch the arcs in flight
 await A.page.waitForFunction(()=>window.RunaDeathArc?.active>0||window.RunaDeathArc?.history.length>0,null,{timeout:30000,polling:16});mark('arcs',{inFlight:await A.page.evaluate(()=>RunaDeathArc.active)});await sleep(300);await shot(A,'06-baixas-arco');await shot(B,'06-baixas-arco');
 await waitPhase(A,'prep',30000);mark('next-prep');await A.page.waitForFunction(()=>RunaHybridFocus.target===0&&RunaHybridFocus.value===0,null,{timeout:10000});mark('focus-released');await sleep(1800);await shot(A,'07-proxima-preparacao');await shot(B,'07-proxima-preparacao');
 for(const P of [A,B])report['end'+P.name]=await P.page.evaluate(()=>{const me=state.players.find(p=>p.id===state.you),rv=state.players.find(p=>p.id!==state.you);return {phase:state.phase,round:state.round,arcs:RunaDeathArc.history.map(f=>({uid:f.uid,owner:f.owner===me.id?'self':'rival',duration:f.duration,elapsed:Math.round(f.arrivedAt-f.startedAt),start:f.start,final:f.final&&{x:f.final.x,y:f.final.y},end:f.end&&{x:+f.end.x.toFixed(1),y:+f.end.y.toFixed(1)}})),graves:{self:document.getElementById('self-grave')?.textContent.trim(),rival:document.getElementById('opponent-grave')?.textContent.trim()},discard:{self:me.discard.map(c=>c.name),rival:rv.discard.map(c=>c.name)},focus:RunaHybridFocus.stats,log:[...document.querySelectorAll('#log p')].slice(-8).map(p=>p.textContent)};});
 report.code=code;
}finally{report.marks=marks;report.errors={A:A.errors,B:B.errors};const fa=await A.capture.stop(),fb=await B.capture.stop();for(const [P,f] of [[A,fa],[B,fb]])fs.writeFileSync(path.join(P.dir,'frames.json'),JSON.stringify(f));report.frameClock={firstTs:fa[0]?.ts,voteEpoch:marks.find(m=>m.name==='vote')?.epoch};await A.browser.close().catch(()=>{});await B.browser.close().catch(()=>{});
 report.video={};const from=(marks.find(m=>m.name==='vote')?.epoch||0)-1500;for(const [P,all,n] of [[A,fa,'A-1920x1080'],[B,fb,'B-1366x768']]){const frames=all.filter(f=>f.ts*1000>=from);try{report.video[n]=await encode(browser,frames,path.join(out,`sequencia-real-${n}.mp4`),{width:P.viewport.width,height:P.viewport.height});report.video[n].startsAtVoteMinusMs=1500;report.video[n].file=path.basename(report.video[n].file);console.log('video',JSON.stringify(report.video[n]));}catch(e){console.log('video',n,e.message);}}
 await browser.close();
 fs.writeFileSync(path.join(out,'sequencia.json'),JSON.stringify(report,null,1));}
console.log('done',JSON.stringify(report.endA?.arcs),JSON.stringify(report.endB?.arcs?.length));
