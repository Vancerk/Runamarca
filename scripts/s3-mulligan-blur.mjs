// S3 probe: opening deal, mulligan replacement profile (S3:4) and full-scene blur (S3:5),
// on hybrid and native routes, desktop and mobile. Engine is authoritative: /act and the
// /state polling are resolved by game.mjs and answered with its real view, so the client
// boots, receives the opening deal, the mulligan and the first Preparation through its own
// queue. The run ends by interrupting a pending replacement with a new room (cancellation
// + new match) and requiring a clean table.
import fs from 'node:fs';import crypto from 'node:crypto';import {createRequire} from 'node:module';
import {makeRoom,join,act,view} from '../mesa-nova/game.mjs';
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/vanxf/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const catalog=JSON.parse(fs.readFileSync(new URL('../mesa-nova/cartas.json',import.meta.url)));
const out=process.env.HYBRID_QA_OUT||'prototype-qa/s3-continuity/probe',checks=[],errors=[],network=[],runs=[];fs.mkdirSync(out,{recursive:true});
const check=(name,pass,detail)=>checks.push({name,pass:!!pass,detail});
const served={};for(const file of ['app.js','mulligan.css','hybrid/flights.js','hybrid/bridge.js','hybrid/renderer.js','hybrid/card-plane.js']){const r=await fetch('http://127.0.0.1:3086/runamarca/'+file);const body=Buffer.from(await r.arrayBuffer());served[file]={status:r.status,sha256:crypto.createHash('sha256').update(body).digest('hex'),matchesDisk:body.equals(fs.readFileSync('mesa-nova/'+file))};}
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const layers=()=>{const f=n=>n?getComputedStyle(n).filter:null,chain=n=>{const list=[];for(let x=n;x&&x!==document.documentElement;x=x.parentElement){const v=getComputedStyle(x).filter;if(v!=='none')list.push((x.id||x.className||x.tagName)+':'+v);}return list;};
 return {game:[...document.querySelectorAll('#game>*')].map(n=>({layer:n.id||String(n.className).split(' ')[0]||n.tagName,filter:f(n)})),fog:f(document.querySelector('body>.formation-fog-canvas')),canvas:f(document.querySelector('.hybrid-canvas')),overlayHidden:document.getElementById('mulligan-overlay').hidden,
  cardFilters:[...document.querySelectorAll('#mulligan-cards .card')].map(chain),controlFilters:[...document.querySelectorAll('#mulligan-controls button')].map(chain),cards:document.querySelectorAll('#mulligan-cards .card').length,buttons:document.querySelectorAll('#mulligan-controls button').length,
  clickable:(()=>{const b=document.querySelector('#mulligan-controls button');if(!b)return false;const r=b.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return !!hit&&b.contains(hit)&&!b.closest('[inert]');})()};};
// Real hybrid markers (flights.js): carriers, motion faces, draw lock, waiting hand slots,
// inert regions and RunaHybridFlights.stats; native: #visual-layer flights; both: app arrival state.
const leftovers=()=>{const s=globalThis.RunaHybridFlights?.stats;return {carriers:document.querySelectorAll('.hybrid-flight-carrier').length,faces:document.querySelectorAll('.hybrid-motion-face').length,lock:document.querySelectorAll('.hybrid-draw-lock:not([hidden])').length,
 waiting:document.querySelectorAll('[data-hybrid-waiting]').length,inert:['hand','mulligan-cards','mulligan-controls'].filter(id=>document.getElementById(id)?.inert),statsLocked:s?.locked??null,statsPending:s?.pending??null,statsActive:s?.active?.length??null,
 visualLayer:document.getElementById('visual-layer')?.childElementCount??0,pendingArrival:typeof RunaCardArrivals!=='undefined'?RunaCardArrivals.pending.length:null,moving:typeof movingCards!=='undefined'?movingCards.size:null};};
const busy=l=>l.carriers+l.faces+l.lock+l.waiting+l.inert.length+(l.statsPending||0)+(l.statsActive||0)+l.visualLayer+(l.moving||0)>0||!!l.statsLocked;
const drawsOf=async(page,from)=>page.evaluate(n=>window.__draws.slice(n),from);
const batch=list=>list.length?{cards:list.length,profiles:[...new Set(list.map(d=>d.presentation))],perCardMs:list.map(d=>d.ms),meanMs:Math.round(list.reduce((s,d)=>s+d.ms,0)/list.length),spanMs:Math.round(Math.max(...list.map(d=>d.end))-Math.min(...list.map(d=>d.start))),phases:[...new Set(list.map(d=>d.phase))]}:{cards:0};
try{for(const route of (process.env.S3_ROUTES||'hybrid,native').split(','))for(const viewport of [{width:1440,height:900,scale:1},{width:390,height:800,scale:3}].slice(0,Number(process.env.S3_VIEWPORTS||2))){
 const mobile=viewport.width<600,count=mobile?2:5,id=`${route}-${viewport.width}x${viewport.height}`;
 const rooms=new Map(),frozen=new Map();
 const newRoom=prefix=>{const room=makeRoom(prefix+Math.floor(Math.random()*900+100),'A'),a=room.players[0],b=join(room,'B');act(room,a,{type:'deck',deckId:catalog.decks[0].id},catalog);rooms.set(room.code,{room,a,b});return rooms.get(room.code);};
 const v=code=>{const {room,a}=rooms.get(code);return frozen.get(code)||{...view(room,a),serverNow:Date.now()};};
 const first=newRoom('S3P');frozen.set(first.room.code,v(first.room.code));// lobby snapshot until the intro key is stored
 const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},deviceScaleFactor:viewport.scale,isMobile:mobile,hasTouch:mobile});
 await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort('blockedbyclient'));
 await context.route(u=>/\/api\/rooms\/[^/]+\/state$/.test(u.pathname),async r=>{const code=new URL(r.request().url()).pathname.split('/').at(-2);if(!rooms.has(code))return r.fulfill({status:404,json:{code:'ROOM_NOT_FOUND'}});await new Promise(x=>setTimeout(x,120));await r.fulfill({json:v(code)});});
 let actHits=0;await context.route('**/api/rooms/*/act',async r=>{actHits++;const code=new URL(r.request().url()).pathname.split('/').at(-2),{room,a}=rooms.get(code);act(room,a,r.request().postDataJSON(),catalog);await r.fulfill({json:v(code)});});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(id+': '+e.message));
 page.on('requestfailed',q=>network.push({id,url:q.url(),reason:q.failure()?.errorText}));page.on('response',r=>{if(r.status()>=400)network.push({id,url:r.url(),status:r.status()});});
 page.on('console',m=>{if(m.type()==='error')network.push({id,console:m.text(),url:m.location()?.url});});
 await page.addInitScript(code=>{sessionStorage.setItem('runamarca-nova-seat',JSON.stringify({code,token:'probe'}));},first.room.code);
 await page.goto(`http://127.0.0.1:3086/runamarca/${route==='hybrid'?'hybrid/index.html':'index.html'}`);
 await page.waitForFunction(r=>typeof render==='function'&&state&&visualBooted&&(r!=='hybrid'||typeof RunaHybridFlights!=='undefined'),route,{timeout:20000});
 // Instrument before the opening event exists.
 await page.evaluate(()=>{window.__draws=[];const original=animateDraw;animateDraw=async function(uid,mine,options){const start=performance.now();try{return await original.apply(this,arguments);}finally{const end=performance.now();window.__draws.push({uid,mine,presentation:options?.presentation||'normal',phase:state?.phase,start,end,ms:Math.round(end-start)});}};});
 act(first.room,first.b,{type:'deck',deckId:catalog.decks[1].id},catalog);
 await page.evaluate(s=>sessionStorage.setItem('runamarca-intro:'+s.code+':'+s.matchId,'seen'),{code:first.room.code,matchId:first.room.matchId});frozen.delete(first.room.code);
 await page.waitForFunction(()=>window.__draws.length>=5,null,{timeout:20000}).catch(()=>{});await page.waitForTimeout(700);
 const opening=await drawsOf(page,0);
 const during=await page.evaluate(layers);await page.screenshot({path:`${out}/${id}-mulligan.png`});
 // Partial (mobile) or total (desktop) replacement; sample while it is running.
 let mark=opening.length;const ids=first.a.hand.slice(0,count).map(c=>c.uid);
 await page.evaluate(cardIds=>{void command({type:'mulligan',cardIds});},ids);
 await page.waitForFunction(()=>window.RunaHybridFlights?.stats?.active?.length||document.querySelector('.hybrid-flight-carrier,#visual-layer>*'),null,{timeout:5000}).catch(()=>{});
 const midFlight=await page.evaluate(leftovers);await page.screenshot({path:`${out}/${id}-replacement-midflight.png`});
 await page.waitForFunction(n=>window.__draws.length>=n,mark+count,{timeout:20000}).catch(()=>{});await page.waitForTimeout(400);
 const replacement=await drawsOf(page,mark);mark+=replacement.length;
 // Phase changes while the rival's Preparation draw is still queued behind ours.
 act(first.room,first.b,{type:'confirmMulligan'},catalog);await page.evaluate(()=>command({type:'confirmMulligan'}));
 await page.waitForFunction(n=>state.phase==='prep'&&window.__draws.length>n,mark,{timeout:20000}).catch(()=>{});await page.waitForTimeout(2500);
 const normal=await drawsOf(page,mark);mark+=normal.length;const after=await page.evaluate(layers),afterLeft=await page.evaluate(leftovers);await page.screenshot({path:`${out}/${id}-after.png`});
 // Cancellation + new match: a second room mulligans, and while replacements fly the seat moves to a third room.
 const second=newRoom('S3Q');act(second.room,second.b,{type:'deck',deckId:catalog.decks[1].id},catalog);const third=newRoom('S3R');// stays in the lobby until the seat moves, so its opening deal arrives by polling
 await page.evaluate(list=>{for(const s of list)sessionStorage.setItem('runamarca-intro:'+s.code+':'+s.matchId,'seen');(s=>{sessionStorage.setItem('runamarca-nova-seat',JSON.stringify({code:s.code,token:'probe'}));state=s;serverClockOffset=Date.now()-s.serverNow;render();})(list[0].view);},[second,third].map(x=>({code:x.room.code,matchId:x.room.matchId,view:v(x.room.code)})));
 await page.waitForFunction(c=>state?.code===c&&window.__draws.length>=0,second.room.code,{timeout:20000});await page.waitForFunction(n=>window.__draws.length>=n+5,mark,{timeout:20000}).catch(()=>{});await page.waitForTimeout(500);mark=(await page.evaluate(()=>window.__draws.length));
 await page.evaluate(cardIds=>{void command({type:'mulligan',cardIds});},second.a.hand.slice(0,3).map(c=>c.uid));await page.waitForTimeout(250);
 const cancelMid=await page.evaluate(leftovers);
 await page.evaluate(s=>{sessionStorage.setItem('runamarca-nova-seat',JSON.stringify({code:s.code,token:'probe'}));state=s;lastRevision=-1;serverClockOffset=Date.now()-s.serverNow;render();},(frozen.set(third.room.code,v(third.room.code)),v(third.room.code)));// same steps as the join handler
 act(third.room,third.b,{type:'deck',deckId:catalog.decks[1].id},catalog);// lobby snapshot until the intro key exists, as in the first room
 await page.evaluate(s=>sessionStorage.setItem('runamarca-intro:'+s.code+':'+s.matchId,'seen'),{code:third.room.code,matchId:third.room.matchId});frozen.delete(third.room.code);
 await page.waitForFunction(c=>state?.code===c,third.room.code,{timeout:20000});await page.waitForFunction(n=>window.__draws.length>=n+5,mark,{timeout:15000}).catch(()=>{});await page.waitForTimeout(2500);
 const thirdDiag=await page.evaluate(()=>({phase:state?.phase,matchId:state?.matchId,intro:Object.keys(sessionStorage).filter(k=>k.startsWith('runamarca-intro:')),visualBooted:typeof visualBooted!=='undefined'?visualBooted:null,lastVisualId:typeof lastVisualId!=='undefined'?lastVisualId:null,eventId:state?.eventId,overlay:[...document.querySelectorAll('[class*=intro],[class*=patron-present],[id*=intro]')].filter(n=>getComputedStyle(n).display!=='none').map(n=>n.id||n.className).slice(0,5)}));console.log('thirdDiag',JSON.stringify(thirdDiag));
 const afterCancel=await page.evaluate(leftovers),newMatch=await page.evaluate(n=>window.__draws.slice(n),mark),newLayers=await page.evaluate(layers);await page.screenshot({path:`${out}/${id}-new-match.png`});
 runs.push({id,route,viewport,actHits,mulliganCount:count,opening:{batch:batch(opening),draws:opening},replacement:{batch:batch(replacement),draws:replacement},normal:{batch:batch(normal),draws:normal},during,midFlight,after,afterLeft,cancelMid,afterCancel,newMatch,newLayers});
 const blurred=x=>/blur\(8px\)/.test(x||'');
 check(id+' every #game layer blurred during mulligan',during.game.length&&during.game.every(l=>blurred(l.filter)),during.game);
 if(route==='hybrid')check(id+' WebGL canvas blurred',blurred(during.canvas),during.canvas);
 check(id+' selection cards and controls sharp and clickable',during.cards===5&&during.buttons>=1&&during.clickable&&[...during.cardFilters,...during.controlFilters].every(c=>c.length===0),{cards:during.cards,buttons:during.buttons,clickable:during.clickable});
 check(id+' opening deal measured: 5 own cards, opening profile',opening.length===5&&opening.every(d=>d.presentation==='opening'&&d.mine),batch(opening));
 check(id+' replacement draws use opening profile',replacement.length===count&&replacement.every(d=>d.presentation==='opening'),batch(replacement));
 const ob=batch(opening),rb=batch(replacement);check(id+' replacement per-card pace equivalent to the opening deal (±20%)',rb.cards&&Math.abs(rb.meanMs-ob.meanMs)<=ob.meanMs*.2,{opening:ob.meanMs,replacement:rb.meanMs});
 check(id+' Preparation draws keep normal profile after the phase change',normal.length>=1&&normal.every(d=>d.presentation==='normal'&&d.phase==='prep'),batch(normal));
 check(id+' leftover check detects an active replacement flight',busy(midFlight),midFlight);
 check(id+' blur removed after closing selection',after.overlayHidden&&after.game.every(l=>!blurred(l.filter))&&!blurred(after.canvas),after.game);
 check(id+' no leftover flights, locks, waiting slots or inert after conclusion',!busy(afterLeft),afterLeft);
 check(id+' cancellation: replacement was in flight when the seat moved',busy(cancelMid),cancelMid);
 check(id+' cancellation + new match: no leftovers, new opening deal uses opening profile',!busy(afterCancel)&&newMatch.length===5&&newMatch.every(d=>d.presentation==='opening'),{afterCancel,newMatch:batch(newMatch)});
 check(id+' new match mulligan overlay blurred again',!newLayers.overlayHidden&&newLayers.game.every(l=>blurred(l.filter)),newLayers.game);
 await context.close();}}
finally{await browser.close();}
check('no page errors',errors.length===0,errors);
// Network classification: only external hosts aborted by this probe's own route are tolerated.
const unexpected=network.filter(n=>n.url?(new URL(n.url).hostname==='127.0.0.1'):true).filter(n=>!(n.console&&/Failed to load resource/.test(n.console)&&network.some(m=>m.id===n.id&&m.reason==='net::ERR_BLOCKED_BY_CLIENT')));
check('network: only probe-blocked external requests failed',unexpected.length===0,unexpected);
fs.writeFileSync(`${out}/result.json`,JSON.stringify({served,checks,errors,network,runs},null,1));
const failed=checks.filter(c=>!c.pass);console.log(`checks ${checks.length} failed ${failed.length}`);for(const c of failed)console.log('FAIL',c.name,JSON.stringify(c.detail).slice(0,400));process.exitCode=failed.length?1:0;
