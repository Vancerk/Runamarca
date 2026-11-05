// Bloco B (adendo de formação) · foco da formação, medido no que aparece na tela.
// Same table as the A probes (captureTable + FL17/FV16). For each viewport it paints the normal preparation and then
// the formation of the same table (engine phase 'formation', own seat not ready, rival positions secret) and records:
// field quad, side panels, rival band/reserve, own reserve, hand, confirm button, circuit state, focus metrics, the
// legal-socket highlight while a reserve card is dragged, and screenshots (prep, formation, drag).
// V2_SOURCE=initial + V2_SNAP=<snapshot>/mesa-nova serves the "before" copy to the test browser only.
// Usage: node scripts/b-focus-probe.mjs <out-dir> [viewport ...]   viewport = WxH[@dpr]
import fs from 'node:fs';import path from 'node:path';
import {chromium,CHROME,captureTable,card,view} from './hybrid12-lib.mjs';
const [out='prototype-qa/revisao-visual-20261103/formacao-B/foco',...vps]=process.argv.slice(2),base=process.env.QA_BASE||'http://127.0.0.1:3086',SOURCE=process.env.V2_SOURCE||'current';
const SNAP=process.env.V2_SNAP||'prototype-qa/revisao-visual-20261103/formacao-B/a-snapshot/mesa-nova',TYPES={'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json'};
const viewports=(vps.length?vps:['1920x1080','1366x768','390x844@2','320x700@2']).map(v=>{const [wh,d]=v.split('@'),[w,h]=wh.split('x').map(Number);return {width:w,height:h,dpr:Number(d||1)};});
fs.mkdirSync(out,{recursive:true});
function scenes(){const {room,a,b}=captureTable();const fl17=card('FL17',a),fv16=card('FV16',a);a.hand.splice(1,2,fl17,fv16);const fl17board=card('FL17',a);a.reserve.unshift(fl17board);a.formation[1]=fl17board.uid;
 const prep=view(room,a);room.phase='formation';a.ready=false;b.ready=false;a.formation=[a.reserve[1].uid,null,null];const formation=view(room,a);a.ready=true;const waiting=view(room,a);return {prep,formation,waiting,free:a.reserve[2].uid};}
const S=scenes(),report={source:SOURCE,reduced:Boolean(process.env.REDUCED),date:new Date().toISOString(),viewports:[]},checks=[];const check=(name,ok,detail)=>{checks.push({name,pass:Boolean(ok),detail});console.log((ok?'ok   ':'FAIL ')+name+(ok?'':' '+JSON.stringify(detail).slice(0,500)));};
const measure=()=>{const R=n=>{if(!n)return null;const r=n.getBoundingClientRect();return r.width||r.height?{x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),b:+(r.y+r.height).toFixed(1),r:+(r.x+r.width).toFixed(1)}:null;};
 const sc=window.RunaHybrid?.scene||{},q=sc.field?.quad||[],bb=q.length?{left:Math.min(...q.map(p=>p.x)),right:Math.max(...q.map(p=>p.x)),top:Math.min(...q.map(p=>p.y)),bottom:Math.max(...q.map(p=>p.y))}:null;
 const pq=k=>{const p=sc.panels?.[k];return p?{left:Math.min(...p.map(v=>v.x)),right:Math.max(...p.map(v=>v.x)),top:Math.min(...p.map(v=>v.y)),bottom:Math.max(...p.map(v=>v.y))}:null;};
 const confirm=[...document.querySelectorAll('#center-actions button')].map(n=>({text:(n.querySelector('.slot-text')?.textContent||n.textContent).trim(),disabled:n.disabled,rect:R(n)}));
 const circuit=document.getElementById('round-circuit');
 const sides=[...document.querySelectorAll('#lanes .lane-side')].map(n=>({owner:n.dataset.owner===state.you?'self':'rival',lane:+n.dataset.lane,rect:R(n),legal:n.classList.contains('legal-drop'),ready:n.classList.contains('drop-ready')}));
 const card=document.querySelector('#lanes .lane-side .card .hybrid-card-face')||document.querySelector('#lanes .lane-side .card');
 return {phase:state.phase,field:bb,fieldW:bb&&+(bb.right-bb.left).toFixed(1),fieldH:bb&&+(bb.bottom-bb.top).toFixed(1),focus:sc.focus||null,panels:{nart:pq('nart'),actions:pq('actions')},
  rivalBand:R(document.querySelector('#opponent-head')?.closest('.player-band')),rivalReserve:R(document.querySelector('.reserve-camp.opponent-camp')),ownReserve:R(document.querySelector('.reserve-camp.self-camp')),ownBand:R(document.querySelector('#self-head')?.closest('.player-band')),hand:R(document.getElementById('hand')),
  handFilter:getComputedStyle(document.getElementById('hand')).filter,veil:(()=>{const v=document.querySelector('.hybrid-focus-veil');return v?{opacity:getComputedStyle(v).opacity,hidden:v.hidden}:null;})(),
  confirm,circuit:circuit?{phase:circuit.dataset.phase,active:circuit.dataset.active,label:circuit.getAttribute('aria-label'),caption:circuit.querySelector('.round-circuit-state')?.textContent||null}:null,sides,combatCard:R(card),
  scroll:{w:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,h:document.documentElement.scrollHeight,y:scrollY},bodyFocus:document.body.classList.contains('hybrid-focus')};};
for(const vp of viewports){const browser=await chromium.launch({executablePath:process.env.QA_BROWSER||CHROME,headless:true});try{
 const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},deviceScaleFactor:vp.dpr,reducedMotion:process.env.REDUCED?'reduce':'no-preference',hasTouch:vp.width<=900});let served=0;
 const allowed=new Set(['127.0.0.1','fonts.googleapis.com','fonts.gstatic.com']);
 await context.route('**/*',r=>{const u=new URL(r.request().url());if(!allowed.has(u.hostname))return r.abort();
  if(SOURCE==='initial'&&u.hostname==='127.0.0.1'&&u.pathname.startsWith('/runamarca/')){const rel=u.pathname.slice('/runamarca/'.length)||'index.html',file=path.join(SNAP,rel);if(fs.existsSync(file)&&fs.statSync(file).isFile()){served++;return r.fulfill({status:200,headers:{'content-type':TYPES[path.extname(rel)]||'application/octet-stream','cache-control':'no-store'},body:fs.readFileSync(file)});}}
  return r.continue();});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/runamarca/hybrid/index.html');await page.waitForFunction(()=>typeof render==='function');await page.evaluate(()=>document.fonts.ready);
 const paint=async s=>{await page.evaluate(s=>{state=s;serverClockOffset=Date.now()-s.serverNow;render();},{...s,serverNow:Date.now()});await page.waitForFunction(()=>window.RunaHybrid?.ready);await page.evaluate(()=>Promise.all([...document.querySelectorAll('#game .card')].map(n=>n.visualReady)));await page.waitForTimeout(2200);};
 const tag=`${vp.width}x${vp.height}${vp.dpr!==1?'@'+vp.dpr:''}`,m={};
 await paint(S.prep);m.prep=await page.evaluate(measure);await page.screenshot({path:path.join(out,`prep-${tag}.png`),scale:'device'});
 await paint(S.formation);m.formation=await page.evaluate(measure);await page.screenshot({path:path.join(out,`formation-${tag}.png`),scale:'device'});
 if(vp.width<=900)await page.screenshot({path:path.join(out,`formation-full-${tag}.png`),scale:'device',fullPage:true});
 // drag a free reserve card over the middle own socket (pointer drag, no drop)
 const pts=await page.evaluate(uid=>{const c=document.querySelector(`.reserve-camp.self-camp .card[data-uid="${uid}"]`);{const r=c?.getBoundingClientRect();if(r&&(r.top<0||r.bottom>innerHeight))c.scrollIntoView({block:'center'});}const s=[...document.querySelectorAll('#lanes .lane-side')].find(n=>n.dataset.owner===state.you&&n.dataset.lane==='1');const a=c?.getBoundingClientRect(),b=s?.getBoundingClientRect();return a&&b?{from:{x:a.x+a.width/2,y:a.y+a.height/2},to:{x:b.x+b.width/2,y:b.y+b.height/2}}:null;},S.free);
 if(pts){await page.mouse.move(pts.from.x,pts.from.y);await page.mouse.down();await page.mouse.move(pts.to.x,pts.to.y,{steps:10});await page.waitForTimeout(300);m.drag=await page.evaluate(measure);await page.screenshot({path:path.join(out,`drag-${tag}.png`),scale:'device'});await page.keyboard.press('Escape');await page.mouse.up();await page.waitForTimeout(300);}
 await page.evaluate(()=>scrollTo(0,0));await paint(S.waiting);if(vp.width<=900){await page.evaluate(()=>document.querySelector('#phase-actions button')?.scrollIntoView({block:'center'}));await page.waitForTimeout(500);}m.waiting=await page.evaluate(measure);await page.screenshot({path:path.join(out,`waiting-${tag}.png`),scale:'device'});
 await page.evaluate(()=>scrollTo(0,0));await paint(S.prep);m.back=await page.evaluate(measure);
 report.viewports.push({viewport:tag,served,errors,...m});
 if(SOURCE==='current'){const f=m.formation,p=m.prep,phone=vp.width<=900,inView=r=>r&&r.y>=-.5&&r.b<=vp.height+.5&&r.x>=-.5&&r.r<=vp.width+.5,conf=f.confirm[0]?.rect,wc=m.waiting.confirm[0];
  check(tag+': circuit — prep normal, formation red with caption Formação, waiting keeps it',p.circuit?.active!=='combat'&&f.circuit?.active==='combat'&&f.circuit?.caption==='Formação'&&m.waiting.circuit?.active==='combat',{prep:p.circuit,formation:f.circuit});
  check(tag+': own sockets lit while dragging a combatant (3 legal, target drop-ready)',m.drag&&m.drag.sides.filter(x=>x.legal).length===3&&m.drag.sides.every(x=>x.legal===(x.owner==='self'))&&m.drag.sides.some(x=>x.ready&&x.owner==='self'),m.drag?.sides);
  check(tag+': confirmation and wait in the same slot',f.confirm[0]?.text==='Encerrar'&&wc?.text==='Aguardando o rival'&&conf&&wc.rect&&Math.abs(wc.rect.x-conf.x)<2&&Math.abs(wc.rect.y+m.waiting.scroll.y+wc.rect.h/2-conf.y-f.scroll.y-conf.h/2)<6,{confirm:f.confirm,waiting:m.waiting.confirm});
  check(tag+': back to the normal framing in the preparation',m.back.fieldW===p.fieldW&&m.back.fieldH===p.fieldH&&!m.back.bodyFocus,{prep:[p.fieldW,p.fieldH],back:[m.back.fieldW,m.back.fieldH]});
  if(!phone){const fc=f.focus;
   check(tag+': field expanded (1 < factor <= 1.12), panels pushed and inside the screen',fc&&fc.factor>1&&fc.factor<=1.12+1e-9&&f.fieldW>p.fieldW&&f.panels.nart.left<p.panels.nart.left&&f.panels.actions.right>p.panels.actions.right&&f.panels.nart.left>=10&&f.panels.actions.right<=vp.width-10,{focus:fc,panels:f.panels,prepPanels:p.panels});
   check(tag+': rival band still on screen, rival reserve clear of the field',f.rivalBand.y>=3.5&&f.field.top>=f.rivalReserve.b+5,{rivalBand:f.rivalBand.y,fieldTop:f.field.top,rivalReserveBottom:f.rivalReserve.b});
   check(tag+": confirmation at the field's lower right (panel bottom = field bottom, or between the deck holders) and on screen",conf&&inView(conf)&&conf.x>=f.field.right-4&&(Math.abs(f.panels.actions.bottom-f.field.bottom)<3||(fc.actionsBottomLimitPx&&f.panels.actions.bottom<=fc.actionsBottomLimitPx+.5&&f.panels.actions.top>=fc.actionsTopLimitPx-.5)),{panel:f.panels.actions,field:f.field,limits:[fc?.actionsTopLimitPx,fc?.actionsBottomLimitPx]});
   check(tag+': hand dimmed and veil shown during the focus',/brightness/.test(f.handFilter)&&f.veil&&!f.veil.hidden&&Number(f.veil.opacity)>0.3,{filter:f.handFilter,veil:f.veil});}
  else{const strip=f.hand.y;
   check(tag+' (phone): own sockets, confirmation and own reserve on screen together, above the lowered hand',f.sides.filter(x=>x.owner==='self').every(x=>x.rect.y>=-.5&&x.rect.b<=strip+.5)&&conf&&conf.y>=0&&conf.b<=strip&&f.ownReserve.y>=0&&f.ownReserve.b<=strip+.5&&f.hand.y>=vp.height-60,{sockets:f.sides.filter(x=>x.owner==='self').map(x=>x.rect),confirm:conf,reserve:f.ownReserve,hand:f.hand});
   check(tag+' (phone): no field expansion and no horizontal scroll',(f.focus?.factor??1)===1&&f.scroll.w<=f.scroll.cw,{focus:f.focus,scroll:f.scroll});}
  check(tag+': no page errors',errors.length===0,errors);}
 const f=m.formation,p=m.prep;console.log(tag,JSON.stringify({fieldW:[p.fieldW,f.fieldW],fieldH:[p.fieldH,f.fieldH],focus:f.focus&&{factor:f.focus.factor,limits:f.focus.limits},confirm:f.confirm.map(c=>[c.text,c.rect&&[c.rect.x,c.rect.y]]),waiting:m.waiting.confirm.map(c=>c.text),circuit:[p.circuit?.active,f.circuit?.active,f.circuit?.caption],legal:m.drag?.sides.filter(s=>s.legal).length,errors:errors.length}));
 await context.close();}finally{await browser.close();}}
report.checks=checks;fs.writeFileSync(path.join(out,'probe.json'),JSON.stringify(report,null,1));console.log(checks.filter(c=>c.pass).length+'/'+checks.length+' checks');if(checks.some(c=>!c.pass))process.exitCode=1;
