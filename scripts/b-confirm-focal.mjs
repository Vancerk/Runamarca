// Bloco B (revisão) · intervalo entre a confirmação de um assento e a do outro, com os dois assentos.
// Real engine (r1-fixtures): A (1920×1080, desktop) and B (390×844@2, touch) each send their own commands; every
// POST /act of a page is applied by the engine to that page's own seat and answered with its view, and both pages
// receive the engine's views by polling, as from the server. A confirms by KEYBOARD (Tab until "Encerrar", Enter);
// B, still free, keeps its destinations, drags a creature in and then confirms by TOUCH (tap). Checks: A's empty
// positions lose "Solte aqui"; the wait is legible and uses the same box as "Encerrar" (no jump); B's positions stay
// secret for A; the combat starts after the second confirmation. Usage: node scripts/b-confirm-focal.mjs <out-dir>
import fs from 'node:fs';import path from 'node:path';
import {harness,finish,chromium,CHROME} from './hybrid12-lib.mjs';
import {setup,card,act,catalog,view,resolveCombat} from '../mesa-nova/r1-fixtures.mjs';
const out=process.argv[2]||'prototype-qa/revisao-visual-20261103/formacao-B/confirmacao/focal',H=harness(out),{check}=H;fs.mkdirSync(out,{recursive:true});
const {room,a,b}=setup();room.matchId='b-confirm-'+Date.now();
const ca=card('FV01',a),cb=card('FL06',b),cb2=card('FL01',b);a.reserve.push(ca,card('FV07',a));b.reserve.push(cb,cb2);a.formation[0]=ca.uid;
room.phase='formation';for(const p of room.players)p.ready=false;
const json=p=>({...JSON.parse(JSON.stringify(view(room,p))),serverNow:Date.now()}),acts=[];
async function seat(name,p,viewport,{dpr=1,touch=false}={}){const browser=await chromium.launch({executablePath:process.env.QA_BROWSER||CHROME,headless:true}),ctx=await browser.newContext({viewport,deviceScaleFactor:dpr,hasTouch:touch,isMobile:touch});
 await ctx.route('**/*',async r=>{const u=new URL(r.request().url());if(!['127.0.0.1','fonts.googleapis.com','fonts.gstatic.com'].includes(u.hostname))return r.abort();
  if(/\/api\/rooms\/[^/]+\/act$/.test(u.pathname)&&r.request().method()==='POST'){const data=JSON.parse(r.request().postData()||'{}');try{act(room,p,data,catalog);acts.push({seat:name,type:data.type,lane:data.lane??null,ok:true});return r.fulfill({status:200,headers:{'content-type':'application/json'},body:JSON.stringify(json(p))});}catch(e){acts.push({seat:name,type:data.type,ok:false,error:e.message});return r.fulfill({status:400,headers:{'content-type':'application/json'},body:JSON.stringify({error:e.message})});}}
  return r.continue();});
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto((process.env.QA_BASE||'http://127.0.0.1:3086')+'/runamarca/hybrid/index.html');await page.waitForFunction(()=>typeof render==='function'&&window.RunaHybridConfig);await page.evaluate(()=>document.fonts.ready);return {name,p,browser,ctx,page,errors};}
const paint=(P)=>P.page.evaluate(v=>{state=v;serverClockOffset=Date.now()-v.serverNow;render();},json(P.p));
const A=await seat('A',a,{width:1920,height:1080}),B=await seat('B',b,{width:390,height:844},{dpr:2,touch:true});
// like the real long-poll client: a new view is rendered only when the room revision changes (every tick in combat)
const feed=[A,B].map(P=>{let busy=false,rev=-1;const t=setInterval(()=>{if(busy)return;if(room.phase==='resolving'&&Date.now()>=room.combat.startedAt+room.combat.duration)resolveCombat(room);if(room.revision===rev&&room.phase!=='resolving')return;rev=room.revision;busy=true;paint(P).catch(()=>{}).finally(()=>{busy=false;});},150);return {stop:async()=>{clearInterval(t);while(busy)await new Promise(r=>setTimeout(r,10));}};});
const slot=P=>P.page.evaluate(()=>{const b=document.querySelector('#phase-actions button.formation-slot,#phase-actions button.formation-confirm,#phase-actions button.formation-waiting');if(!b)return null;const r=b.getBoundingClientRect(),cs=getComputedStyle(b),t=b.querySelector('.slot-text')?.textContent||b.textContent.trim();
 const rgb=s=>(s.match(/rgba?\(([^)]+)\)/g)||[]).map(c=>c.match(/[\d.]+/g).slice(0,3).map(Number)),lum=([r,g,b2])=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);};return .2126*f(r)+.7152*f(g)+.0722*f(b2);},ratio=(x,y)=>{const [h,l]=[lum(x),lum(y)].sort((p,q)=>q-p);return (h+.05)/(l+.05);};
 const fg=rgb(cs.color)[0],bgs=[...rgb(cs.backgroundImage),...rgb(cs.backgroundColor)].filter(c=>c.some(v=>v>0)||true);const contrast=fg&&bgs.length?Math.min(...bgs.map(c=>ratio(fg,c))):null;
 return {text:t,disabled:b.disabled,name:b.getAttribute('aria-label')||t,x:+r.x.toFixed(2),y:+(r.y+scrollY).toFixed(2),w:+r.width.toFixed(2),h:+r.height.toFixed(2),opacity:+cs.opacity,color:cs.color,contrast:contrast&&+contrast.toFixed(2),focused:document.activeElement===b};});
const own=P=>P.page.evaluate(()=>[...document.querySelectorAll('#lanes .lane-side')].filter(n=>n.dataset.owner===state.you).map(n=>({lane:+n.dataset.lane,card:Boolean(n.querySelector('.card')),label:n.querySelector('.drop-label')?.textContent.trim()??null})));
const rivalSeen=P=>P.page.evaluate(()=>[...document.querySelectorAll('#lanes .lane-side')].filter(n=>n.dataset.owner!==state.you).reduce((k,n)=>k+n.querySelectorAll('.card').length,0));
const crop=async(P,file,sel)=>{const r=await P.page.evaluate(sel=>{const n=document.querySelector(sel);if(!n)return null;n.scrollIntoView({block:'nearest'});const q=n.getBoundingClientRect();return {x:q.x,y:q.y,w:q.width,h:q.height};},sel);await P.page.screenshot({path:path.join(out,file)});return r;};
const R={};
try{
 await A.page.waitForFunction(()=>window.RunaHybrid?.ready&&window.RunaHybridFocus?.value===1,null,{timeout:15000});await B.page.waitForFunction(()=>window.RunaHybrid?.ready,null,{timeout:15000});await A.page.waitForTimeout(800);
 R.aBefore={slot:await slot(A),own:await own(A)};await A.page.screenshot({path:path.join(out,'A-antes-de-confirmar.png')});
 // A · keyboard: Tab until the confirmation has focus, then Enter
 await A.page.mouse.move(5,5);let tabs=0;for(;tabs<80;tabs++){if((await slot(A))?.focused)break;await A.page.keyboard.press('Tab');}
 R.aTabs=tabs;R.aFocused=(await slot(A))?.focused;await A.page.screenshot({path:path.join(out,'A-foco-teclado.png')});await A.page.keyboard.press('Enter');
 await A.page.waitForFunction(()=>state.players.find(p=>p.id===state.you).ready,null,{timeout:8000});await A.page.waitForTimeout(700);
 R.aAfter={slot:await slot(A),own:await own(A)};await A.page.screenshot({path:path.join(out,'A-aguardando.png')});
 // B · still free: sees its destinations, drags a creature in (pointer), then confirms by touch
 await B.page.waitForTimeout(600);R.bBefore={slot:await slot(B),own:await own(B),phase:await B.page.evaluate(()=>state.phase)};await B.page.screenshot({path:path.join(out,'B-montando.png')});
 const pts=await B.page.evaluate(uid=>{const c=document.querySelector(`.reserve-camp.self-camp .card[data-uid="${uid}"]`),s=[...document.querySelectorAll('#lanes .lane-side')].find(n=>n.dataset.owner===state.you&&n.dataset.lane==='1');const a=c.getBoundingClientRect(),b=s.getBoundingClientRect();return {from:{x:a.x+a.width/2,y:a.y+a.height/2},to:{x:b.x+b.width/2,y:b.y+b.height/2}};},cb.uid);
 await B.page.mouse.move(pts.from.x,pts.from.y);await B.page.mouse.down();await B.page.mouse.move(pts.to.x,pts.to.y,{steps:12});await B.page.mouse.up();
 await B.page.waitForFunction(uid=>state.players.find(p=>p.id===state.you).formation[1]===uid,cb.uid,{timeout:8000});await B.page.waitForTimeout(500);
 R.bAfterDrag={own:await own(B)};R.aSeesRival=await rivalSeen(A);await A.page.waitForTimeout(400);R.aFocusAfterRival=(await slot(A))?.focused;R.aSlotAfterRival=await slot(A);
 const box=await B.page.evaluate(()=>{const b=document.querySelector('#phase-actions button.formation-confirm');b.scrollIntoView({block:'center'});const r=b.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};});await B.page.waitForTimeout(300);
 await B.page.screenshot({path:path.join(out,'B-antes-do-toque.png')});await B.page.touchscreen.tap(box.x,box.y);
 await A.page.waitForFunction(()=>state.phase==='resolving',null,{timeout:10000});R.resolving=true;await A.page.waitForTimeout(400);R.aCombat={slot:await slot(A),phase:await A.page.evaluate(()=>state.phase)};
}catch(e){R.error=e.message;console.log('ERROR',e.message);}
for(const f of feed)await f.stop();R.acts=acts;R.errors={A:A.errors,B:B.errors};await A.browser.close();await B.browser.close();
const ab=R.aBefore?.slot,aa=R.aAfter?.slot;
check('A (desktop): before confirming, the empty own positions say "Solte aqui"',R.aBefore?.own.filter(s=>!s.card).every(s=>s.label==='Solte aqui')&&R.aBefore.own.some(s=>!s.card),R.aBefore?.own);
check('A: confirmation reached and activated by keyboard (Tab focus + Enter) → engine ready',R.aFocused===true&&acts.some(x=>x.seat==='A'&&x.type==='ready'&&x.ok),{tabs:R.aTabs,focused:R.aFocused,acts});
check('A: after confirming, the empty own positions have no "Solte aqui" (no label); the placed card stays',R.aAfter?.own.filter(s=>!s.card).every(s=>s.label===null)&&R.aAfter.own.some(s=>s.card),R.aAfter?.own);
check('A: "Encerrar" and the wait use the same box (x, y, w, h within 0.5 px)',ab&&aa&&['x','y','w','h'].every(k=>Math.abs(ab[k]-aa[k])<=.5),{before:ab,after:aa});
check('A: keyboard focus stays on the slot after confirming (and across the rival moves)',R.aAfter?.slot?.focused&&R.aFocusAfterRival===true,{after:R.aAfter?.slot?.focused,afterRival:R.aFocusAfterRival});
check('A: the wait is a legible state (text "Aguardando o rival", opacity 1, contrast ≥ 4.5, accessible name)',aa?.text==='Aguardando o rival'&&aa.opacity===1&&aa.contrast>=4.5&&/Aguardando o rival/.test(aa.name),aa);
check('B (390, not confirmed): still sees its destinations ("Solte aqui") and its confirmation',R.bBefore?.phase==='formation'&&R.bBefore.own.filter(s=>!s.card).length===3&&R.bBefore.own.every(s=>s.label==='Solte aqui')&&R.bBefore.slot?.text==='Encerrar',R.bBefore);
check('B: assembles its formation while A waits (drag accepted by the engine)',R.bAfterDrag?.own.some(s=>s.lane===1&&s.card)&&acts.some(x=>x.seat==='B'&&x.type==='assign'&&x.ok),{own:R.bAfterDrag?.own,acts});
check("A never sees B's positions during the formation",R.aSeesRival===0,{aSeesRival:R.aSeesRival});
check('B: confirmation by touch (tap) → engine ready → combat starts after the second confirmation',acts.some(x=>x.seat==='B'&&x.type==='ready'&&x.ok)&&R.resolving===true,{acts,resolving:R.resolving});
check('no page errors',!R.error&&!R.errors.A.length&&!R.errors.B.length,{error:R.error,errors:R.errors});
fs.writeFileSync(path.join(out,'resultado.json'),JSON.stringify(R,null,1));
finish(out,'b-confirm-focal',H,{result:R});
