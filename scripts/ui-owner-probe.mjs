// Revisão "ui-owner" (pedidos visuais do dono, 31/10/2026): medidas e verificações
// comportamentais da mesa híbrida. Fixtures reais (r1-fixtures.mjs), servidor local,
// Chrome headless local. Nenhum comando de jogo chega ao servidor: `command` é
// substituído por um gravador nas seções que clicam em escolhas.
//
// UI_OWNER_SOURCE=initial serve, por interceptação local, os arquivos de mesa-nova/
// guardados em prototype-qa/ui-owner/initial-snapshot/ (checkout inicial desta rodada,
// incluindo o trabalho não commitado anterior). Nada no checkout é trocado. Assim o
// mesmo runner mede "antes" e "depois" no mesmo viewport, estado e zoom.
//
// Uso: node scripts/ui-owner-probe.mjs <pasta> [seção...] [--source=initial]
//   seções: measure, mulligan, buttons, draw, registro, green, cursor, choices,
//           emana, idle, return   (padrão: todas)
import fs from 'node:fs';import path from 'node:path';
import {harness,chromium,CHROME,URL_HYBRID,URL_NATIVE,setup,card,view,captureTable,poll,writeJSON,finish} from './hybrid12-lib.mjs';
import {act,catalog,studies} from '../mesa-nova/r1-fixtures.mjs';
const argv=process.argv.slice(2),sourceArg=argv.find(a=>a.startsWith('--source=')),[out='prototype-qa/ui-owner/probe',...only]=argv.filter(a=>!a.startsWith('--')),SOURCE=sourceArg?.slice(9)||process.env.UI_OWNER_SOURCE||'current',ROUTE=argv.includes('--route=native')?'native':'hybrid';
const want=s=>!only.length||only.includes(s);const H=harness(out),{check}=H,report={route:ROUTE,source:SOURCE,date:new Date().toISOString()};
const SNAP='prototype-qa/ui-owner/initial-snapshot/mesa-nova',TYPES={'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json'},served={};
const browser=await chromium.launch({executablePath:CHROME,headless:true});
async function open(viewport,{dpr=1,reduced=false,touch=false,url=ROUTE==='native'?URL_NATIVE:URL_HYBRID}={}){
 const context=await browser.newContext({viewport,deviceScaleFactor:dpr,reducedMotion:reduced?'reduce':'no-preference',hasTouch:touch});
 await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.hostname!=='127.0.0.1')return r.abort();
  if(SOURCE==='initial'&&u.pathname.startsWith('/runamarca/')){let rel=u.pathname.slice('/runamarca/'.length)||'index.html';const file=path.join(SNAP,rel);if(fs.existsSync(file)&&fs.statSync(file).isFile()){served[rel]=(served[rel]||0)+1;return r.fulfill({status:200,headers:{'content-type':TYPES[path.extname(file)]||'application/octet-stream','cache-control':'no-cache'},body:fs.readFileSync(file)});}}
  return r.continue();});
 const page=await context.newPage();page.on('pageerror',e=>H.errors.push(viewport.width+'x'+viewport.height+': '+e.message));page.on('console',e=>{if(e.type()==='error'&&/WebGL|GL_INVALID/.test(e.text()))H.gpu.push(e.text());});
 await page.goto(url);await page.waitForFunction(()=>typeof render==='function');if(url===URL_HYBRID)await page.waitForFunction(()=>window.RunaHybridHand&&window.RunaHybridConfig);
 // Records any command instead of sending it (the fixture page has no room anyway).
 await page.evaluate(()=>{window.__commands=[];command=async function(data){window.__commands.push(JSON.parse(JSON.stringify(data)));};});
 return {context,page};}
async function paint(page,s,wait=500){await page.evaluate(s=>{state=s;serverClockOffset=Date.now()-s.serverNow;render();},s);await page.waitForFunction(()=>!window.RunaHybrid||RunaHybrid.ready||RunaHybrid.stats.failed);await page.evaluate(()=>Promise.all([...document.querySelectorAll('#game .card,#mulligan-cards .card')].map(n=>n.visualReady)));await page.waitForTimeout(wait);}
const R=r=>({x:+r.x.toFixed(2),y:+r.y.toFixed(2),w:+r.width.toFixed(2),h:+r.height.toFixed(2)});
function table({hand=9,mana=10}={}){const t=captureTable();const ids=['FL10','FV03','FL16','FL09','FV03','FL11','FL10','FV03','FL16'];t.a.hand=ids.slice(0,hand).map(id=>card(id,t.a));t.a.mana=mana;return t;}

// ---------- 1. Scale, proximity and empty space ----------
const MEASURE_JS=()=>{const R=n=>{if(!n||!n.getClientRects().length)return null;const r=n.getBoundingClientRect();return {x:+r.x.toFixed(2),y:+r.y.toFixed(2),w:+r.width.toFixed(2),h:+r.height.toFixed(2)};},q=s=>document.querySelector(s),vw=innerWidth,vh=innerHeight;
 const fan=window.RunaHybridFan?.stats||{},hand=[...document.querySelectorAll('#hand>.hand-card')],mid=hand[Math.floor(hand.length/2)];
 const faceOf=s=>{const n=q(s);if(!n)return null;const f=n.querySelector('.hybrid-card-face');return R(f||n);};
 const field=window.RunaHybrid?.scene?.field?.quad,fl=field?Math.min(...field.map(p=>p.x)):null,fr=field?Math.max(...field.map(p=>p.x)):null;
 const nart=q('.nartvanyr'),act=q('#center-actions'),patron=q('#self-head .patron-card'),band=q('#self-head')?.closest('.player-band');
 const crop=sel=>[...document.querySelectorAll(sel)].map(n=>{const r=n.getBoundingClientRect();return {sel,cutTop:+Math.max(0,-r.top).toFixed(1),cutBottom:+Math.max(0,r.bottom-vh).toFixed(1),cutLeft:+Math.max(0,-r.left).toFixed(1),cutRight:+Math.max(0,r.right-vw).toFixed(1)};}).filter(c=>c.cutTop>.5||c.cutBottom>.5||c.cutLeft>.5||c.cutRight>.5);
 return {viewport:{w:vw,h:vh,dpr:devicePixelRatio},scrollW:document.documentElement.scrollWidth,scrollH:document.documentElement.scrollHeight,layout:(({fit,zoom,overflow,visualScale,composition})=>({fit,zoom,overflow,visualScale,composition}))(window.RunaHybridLayout?.stats||{}),
  groups:{
   hand:{count:hand.length,cssW:fan.own?.width,cssH:fan.own?.height,visible:fan.own?.visible,middle:R(mid),step:fan.own?.step},
   patron:{self:R(patron),rival:R(q('#opponent-head .patron-card'))},
   other:{reserveFace:faceOf('.self-camp .card-row>.card'),rivalReserveFace:faceOf('.opponent-camp .card-row>.card'),combatFace:faceOf('#lanes .lane-side .card'),emanaFace:faceOf('#self-emana .card'),nart:R(nart),actions:R(act),phaseButton:R(q('#phase-actions button')),power:R(q('#self-head .patron-equipment button,#self-head button')),ether:R(q('#self-head .patron-ether')),deck:R(q('#self-deck')),log:R(q('#camp-log')),band:R(band),lanes:R(q('#lanes')),rivalBand:R(q('#opponent-head')?.closest('.player-band'))}},
  spaces:{leftInset:nart?+nart.getBoundingClientRect().left.toFixed(1):null,rightInset:act?+(vw-act.getBoundingClientRect().right).toFixed(1):null,fieldLeft:fl,fieldRight:fr,fieldWidth:field?+(fr-fl).toFixed(1):null,fieldShare:field?+((fr-fl)/vw).toFixed(4):null,patronToHand:patron&&hand.length?+(Math.max(0,Math.min(...hand.map(n=>n.getBoundingClientRect().y)))-patron.getBoundingClientRect().bottom).toFixed(1):null},
  crops:[...crop('#opponent-head'),...crop('#self-head'),...crop('.reserve-camp'),...crop('.nartvanyr'),...crop('#center-actions'),...crop('#camp-log'),...crop('#phase-actions button'),...crop('#lanes')]};};
const VIEWPORTS=[[1920,1080,1],[1920,900,1],[1440,900,1],[1280,720,1],[390,800,1],[320,1000,1],[1920,900,2],[390,800,2]];
if(want('measure')){report.measure=[];
 for(const [w,h,dpr] of VIEWPORTS){const id=`${w}x${h}-dpr${dpr}`,{context,page}=await open({width:w,height:h},{dpr});
  const rows={};for(const n of [9,5,1]){const t=table({hand:n});await paint(page,view(t.room,t.a));rows['hand'+n]=await page.evaluate(MEASURE_JS);if(n===9)await page.screenshot({path:`${out}/table-${id}.png`});}
  const t=table();await paint(page,view(t.room,t.b));rows.rivalSeat=await page.evaluate(MEASURE_JS);
  report.measure.push({id,...rows});const m=rows.hand9;console.log(id,'hand',m.groups.hand.cssW?.toFixed(1),'patron',m.groups.patron.self?.w,'reserve',m.groups.other.reserveFace?.w,'actions',m.groups.other.actions?.w,'field',m.spaces.fieldWidth,'zoom',m.layout.zoom,'crops',m.crops.length);
  check(`${id}: no horizontal page overflow`,m.scrollW<=w+1,{scrollW:m.scrollW});
  check(`${id}: Patron bands, panels, buttons and lanes are not cut by the viewport`,(w<=600?m.crops.filter(c=>c.cutLeft||c.cutRight):m.crops).length===0,m.crops);
  await context.close();}}

// ---------- mulligan (opening hand) ----------
if(want('mulligan')){report.mulligan=[];
 for(const [w,h,dpr] of VIEWPORTS){const id=`${w}x${h}-dpr${dpr}`,{context,page}=await open({width:w,height:h},{dpr});const {room,a}=setup();room.phase='mulligan';room.round=1;for(const p of room.players){p.mulliganReady=false;p.mulligansLeft=1;p.hand=p.deck.splice(0,5);}
  await paint(page,view(room,a),700);const m=await page.evaluate(()=>{const cards=[...document.querySelectorAll('#mulligan-cards .card')].map(n=>{const r=n.getBoundingClientRect(),s=getComputedStyle(n);return {x:r.x,y:r.y,w:parseFloat(s.width),h:parseFloat(s.height),right:r.right,bottom:r.bottom};}),controls=[...document.querySelectorAll('#mulligan-controls button')].map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,bottom:r.bottom};});return {cards,controls,scrollW:document.documentElement.scrollWidth,overlay:(()=>{const r=document.getElementById('mulligan-overlay').getBoundingClientRect();return {w:r.width,h:r.height};})(),docH:document.documentElement.scrollHeight};});
  await page.screenshot({path:`${out}/mulligan-${id}.png`});report.mulligan.push({id,...m});console.log(id,'mulligan card',m.cards[0]?.w?.toFixed(1),'x',m.cards[0]?.h?.toFixed(1));
  check(`${id}: five opening cards, inside the page width`,m.cards.length===5&&m.cards.every(c=>c.x>=-.5&&c.right<=w+.5)&&m.scrollW<=w+1,m);
  check(`${id}: mulligan controls reachable inside the viewport (desktop) or page (mobile)`,m.controls.length>=1&&m.controls.every(c=>w<=600||c.bottom<=h+.5),m.controls);
  await context.close();}}

// ---------- 2. Combat/vote buttons on their plate ----------
if(want('buttons')){report.buttons=[];
 for(const [w,h] of [[1920,900],[1440,900],[1280,720],[390,800]]){const {context,page}=await open({width:w,height:h});
  for(const phase of ['vote','formation','prep']){const t=table({hand:5});t.room.phase=phase;if(phase==='vote'){for(const p of [t.a,t.b])p.voted=false;}if(phase==='formation'){for(const p of [t.a,t.b])p.ready=false;}t.room.turn=t.a.id;await paint(page,view(t.room,t.a),700);
   const sample=async()=>page.evaluate(()=>{const plate=window.RunaHybrid?.scene?.panels?.actions,node=document.getElementById('center-actions'),nr=node.getBoundingClientRect(),q=plate?{l:Math.min(...plate.map(p=>p.x)),r:Math.max(...plate.map(p=>p.x)),t:Math.min(...plate.map(p=>p.y)),b:Math.max(...plate.map(p=>p.y))}:{l:nr.left,r:nr.right,t:nr.top,b:nr.bottom};const buttons=[...document.querySelectorAll('#phase-actions button')].map(b=>{const r=b.getBoundingClientRect();return {text:b.textContent,disabled:b.disabled,l:r.left,r:r.right,t:r.top,b:r.bottom};});const badge=document.querySelector('.turn-clock-badge:not([hidden])');const br=badge?.getBoundingClientRect();return {plate:q,node:{l:nr.left,r:nr.right,t:nr.top,b:nr.bottom},buttons,badge:br?{l:br.left,r:br.right,t:br.top,b:br.bottom}:null,contentOverflow:node.scrollHeight-node.clientHeight};});
   const rest=await sample();const first=rest.buttons[0];let hover=null,focus=null;
   if(first){await page.mouse.move((first.l+first.r)/2,(first.t+first.b)/2);await page.waitForTimeout(300);hover=await sample();await page.mouse.move(5,h/2);await page.evaluate(()=>document.querySelector('#phase-actions button:not(:disabled)')?.focus({focusVisible:true}));await page.waitForTimeout(150);focus=await sample();await page.evaluate(()=>document.activeElement?.blur());}
   const inside=s=>s.buttons.every(b=>b.l>=s.plate.l-.5&&b.r<=s.plate.r+.5&&b.t>=s.plate.t-.5&&b.b<=s.plate.b+.5),moved=(a,b)=>a&&b?Math.max(0,...a.buttons.map((x,i)=>Math.max(Math.abs(x.l-b.buttons[i].l),Math.abs(x.t-b.buttons[i].t),Math.abs(x.r-b.buttons[i].r),Math.abs(x.b-b.buttons[i].b)))):0;
   const id=`${w}x${h}-${phase}`;report.buttons.push({id,rest,hover,focus,hoverShift:moved(rest,hover),focusShift:moved(rest,focus)});await page.screenshot({path:`${out}/buttons-${id}.png`});
   if(w>900){check(`${id}: every phase button lies inside its projected plate`,inside(rest),rest);
    check(`${id}: hover and keyboard focus do not move the buttons (≤0.5 px)`,moved(rest,hover)<=.5&&moved(rest,focus)<=.5,{hover:moved(rest,hover),focus:moved(rest,focus)});
    check(`${id}: plate content does not overflow its box`,rest.contentOverflow<=1,rest.contentOverflow);}
  }
  await context.close();}}

// ---------- 3. Drawn card above the preparation counter ----------
if(want('draw')){report.draw=[];
 for(const [w,h,reduced] of [[1920,900,false],[1280,720,false],[390,800,false],[1920,900,true]]){const id=`${w}x${h}${reduced?'-reduced':''}`,{context,page}=await open({width:w,height:h},{reduced});
  const t=table({hand:5});t.room.turn=t.a.id;t.room.turnClock={phase:'prep',key:'probe-'+id,startedAt:Date.now()-50000,endsAt:Date.now()+9000};const drawn=card('FV03',t.a);t.a.hand.push(drawn);
  await paint(page,view(t.room,t.a),600);
  const res=await page.evaluate(async uid=>{RunaCardArrivals.reserve(uid);render();await new Promise(r=>setTimeout(r,250));const shots=[];let done=false;const style=document.createElement('style');
   // Test-only: let hit testing see paint order of overlays that normally ignore input.
   style.textContent='.turn-fuse,.turn-clock-badge,.hybrid-flight-portal,.hybrid-flight-carrier,.hybrid-flight-carrier *{pointer-events:auto!important}';
   const probe=()=>{const carrier=document.querySelector('.hybrid-flight-carrier');if(!carrier)return null;const r=carrier.getBoundingClientRect(),badge=document.querySelector('.turn-clock-badge:not([hidden])'),br=badge?.getBoundingClientRect();document.head.append(style);const at=(x,y)=>{const top=document.elementFromPoint(x,y);return top?.closest('.hybrid-flight-carrier,.hybrid-flight-portal')?'card':top?.matches('.turn-fuse')?'fuse':top?.matches('.turn-clock-badge')?'badge':top?.className||top?.tagName||null;};
    const center=at(r.x+r.width/2,r.y+r.height/2);let badgeHit=null;if(br&&br.right>r.left&&br.left<r.right&&br.bottom>r.top&&br.top<r.bottom){const x=(Math.max(br.left,r.left)+Math.min(br.right,r.right))/2,y=(Math.max(br.top,r.top)+Math.min(br.bottom,r.bottom))/2;badgeHit=at(x,y);}style.remove();
    const face=carrier.querySelector('.hybrid-flight-face');return {stage:RunaHybridFlights.stats.active[0]?.stage,center,badgeOverlap:!!badgeHit,badgeHit,opacity:face?getComputedStyle(face).opacity:null,carrierZ:getComputedStyle(document.querySelector('.hybrid-flight-portal')).zIndex,fuseZ:getComputedStyle(document.querySelector('.turn-fuse')).zIndex};};
   const p=animateEvent({id:990001,type:'draw',playerId:state.you,cardId:uid}).finally(()=>done=true);const samples=[];while(!done){await new Promise(requestAnimationFrame);const s=probe();if(s)samples.push(s);}await p;return {samples};},drawn.uid);
  const stages=[...new Set(res.samples.map(s=>s.stage))],bad=res.samples.filter(s=>s.center&&s.center!=='card'||s.badgeHit&&s.badgeHit!=='card');
  report.draw.push({id,stages,samples:res.samples.length,bad:bad.slice(0,5),badgeOverlapFrames:res.samples.filter(s=>s.badgeOverlap).length,z:res.samples[0]&&{portal:res.samples[0].carrierZ,fuse:res.samples[0].fuseZ}});
  check(`${id}: the drawn card is above the turn fuse/counter in every sampled frame (rise, flip, read, arrival)`,res.samples.length>3&&bad.length===0,{bad:bad.slice(0,4),stages,frames:res.samples.length});
  // Capture during the read stage for visual inspection.
  const t2=table({hand:5});t2.room.turn=t2.a.id;t2.room.turnClock={phase:'prep',key:'probe2-'+id,startedAt:Date.now()-50000,endsAt:Date.now()+9000};const d2=card('FV03',t2.a);t2.a.hand.push(d2);await paint(page,view(t2.room,t2.a),400);
  await page.evaluate(uid=>{RunaCardArrivals.reserve(uid);render();setTimeout(()=>animateEvent({id:990002,type:'draw',playerId:state.you,cardId:uid}),200);},d2.uid);
  await page.waitForFunction(()=>RunaHybridFlights.stats.active[0]?.stage==='read',null,{timeout:8000}).catch(()=>{});await page.screenshot({path:`${out}/draw-read-${id}.png`});await page.waitForTimeout(3000);
  await context.close();}}

// ---------- 10. Registro before the first click ----------
if(want('registro')){report.registro=[];
 for(const [w,h] of [[1920,900],[1440,900],[1280,720]]){const id=`${w}x${h}`,{context,page}=await open({width:w,height:h});const t=table();await paint(page,view(t.room,t.a),600);
  await page.evaluate(()=>{const d=document.getElementById('camp-log');window.__log=[];const t0=performance.now();for(const type of ['pointerenter','pointerleave','toggle'])d.addEventListener(type,e=>window.__log.push({type,open:d.open,t:Math.round(performance.now()-t0)}));});
  const closed=await page.evaluate(()=>{const r=document.querySelector('#camp-log>summary').getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};});
  const cx=closed.x+closed.w/2,cy=closed.y+closed.h/2,phases={};const count=()=>page.evaluate(()=>{const l=window.__log;window.__log=[];return l;});
  // Approach from the left, never clicking, and stay still.
  for(let i=0;i<=20;i++)await page.mouse.move(closed.x-60+i*(cx-closed.x+60)/20,cy);await page.waitForTimeout(1200);phases.still=await count();
  const openRect=await page.evaluate(()=>{const r=document.getElementById('camp-log').getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,open:document.getElementById('camp-log').open};});
  // Cross each edge of the closed trigger slowly, 1 px per step.
  const edges={left:[[closed.x-8,cy],[closed.x+8,cy]],top:[[cx,closed.y-8],[cx,closed.y+8]],right:[[closed.x+closed.w-8,cy],[closed.x+closed.w+8,cy]],bottom:[[cx,closed.y+closed.h-8],[cx,closed.y+closed.h+8]]};
  // Each crossing is counted on its own: start outside (settled), cross inward (exactly
  // one opening, no close), then cross outward (exactly one closing).
  for(const [edge,[[x0,y0],[x1,y1]]] of Object.entries(edges)){await page.mouse.move(x0,y0);await page.waitForTimeout(300);await count();for(let k=0;k<=16;k++)await page.mouse.move(x0+(x1-x0)*k/16,y0+(y1-y0)*k/16);await page.waitForTimeout(300);const inward=await count(),panel=await page.evaluate(()=>{const d=document.getElementById('camp-log'),r=d.getBoundingClientRect();return {open:d.open,l:r.left,t:r.top,r:r.right,b:r.bottom};}),openIn=panel.open;for(let k=16;k>=0;k--)await page.mouse.move(x0+(x1-x0)*k/16,y0+(y1-y0)*k/16);await page.waitForTimeout(300);const outward=await count(),openOut=await page.evaluate(()=>document.getElementById('camp-log').open);
   // Outside the closed trigger may still be inside the (larger) open panel: then it stays open.
   const expectedOut=x0>=panel.l-2&&x0<=panel.r+2&&y0>=panel.t-2&&y0<=panel.b+2;phases['edge-'+edge]={inward,outward,openIn,openOut,expectedOut,panel};}
  await page.mouse.move(w/2,h/2);await page.waitForTimeout(500);phases.leave=await count();const afterLeave=await page.evaluate(()=>document.getElementById('camp-log').open);
  // Click to pin, leave (stays open), Escape closes.
  await page.mouse.click(cx,cy);await page.mouse.move(w/2,h/2);await page.waitForTimeout(300);const pinned=await page.evaluate(()=>document.getElementById('camp-log').open);await page.keyboard.press('Escape');await page.waitForTimeout(200);const escaped=await page.evaluate(()=>document.getElementById('camp-log').open);
  // Hover again after the click cycle, then an outside pointerdown closes a pinned log.
  await page.mouse.move(cx,cy);await page.waitForTimeout(400);const reopened=await page.evaluate(()=>document.getElementById('camp-log').open);await page.mouse.click(cx,cy);await page.mouse.click(w/2,h*.45);await page.waitForTimeout(200);const outside=await page.evaluate(()=>document.getElementById('camp-log').open);
  // Keyboard: focus the summary and press Enter.
  await page.mouse.move(w/2,h/2);await page.waitForTimeout(300);await page.evaluate(()=>document.querySelector('#camp-log>summary').focus());await page.keyboard.press('Enter');await page.waitForTimeout(150);const keyboard=await page.evaluate(()=>document.getElementById('camp-log').open);await page.keyboard.press('Escape');
  const toggles=l=>l.filter(e=>e.type==='toggle').length;report.registro.push({id,closed,openRect,phases,afterLeave,pinned,escaped,reopened,outside,keyboard});
  console.log(id,'registro toggles still',toggles(phases.still),'edges',Object.entries(phases).filter(([k])=>k.startsWith('edge')).map(([k,v])=>k+':'+toggles(v.inward)+'/'+toggles(v.outward)).join(' '));
  check(`${id}: Registro opens once on hover and stays stable with the cursor still (no click yet)`,toggles(phases.still)===1&&openRect.open,{events:phases.still,openRect});
  for(const edge of ['left','top','right','bottom']){const p=phases['edge-'+edge];check(`${id}: crossing the ${edge} edge: at most one toggle per crossing, open inside, final state matches the open panel (no flicker)`,toggles(p.inward)<=1&&p.openIn&&toggles(p.outward)<=1&&p.openOut===p.expectedOut,p);}
  check(`${id}: leaving closes an unpinned Registro`,afterLeave===false,{afterLeave,events:phases.leave});
  check(`${id}: click pins, Escape closes, hover reopens, outside click closes, Enter opens`,pinned&&!escaped&&reopened&&!outside&&keyboard,{pinned,escaped,reopened,outside,keyboard});
  await context.close();}}

// ---------- 6. Green only for playable cards ----------
const GREEN=/rgb\((131, 230, 120|105, 214, 91|99, 212, 92|146, 199, 107|185, 220, 155)/;
if(want('green')){report.green=[];
 for(const [w,h] of [[1920,900],[1280,720]]){const id=`${w}x${h}`,{context,page}=await open({width:w,height:h});
  const read=async(index)=>{const r=await page.evaluate(i=>{const n=document.querySelectorAll('#hand>.hand-card')[i];const r=n.getBoundingClientRect();return {x:r.x+r.width/2,y:Math.min(innerHeight-12,r.y+30)};},index);await page.mouse.move(r.x,r.y);await page.waitForTimeout(450);
   return page.evaluate(i=>{const n=document.querySelectorAll('#hand>.hand-card')[i],uid=n.dataset.uid,data=seat()?.hand?.find(c=>c.uid===uid),preview=document.querySelector('#hover-preview.hybrid-hand-preview>.card'),s=getComputedStyle(n),ps=preview?getComputedStyle(preview):null;return {uid,name:data?.name,cost:data?.cost,mana:seat()?.mana,affordable:!!data&&affordable(data),busy:commandBusy,hoverShadow:s.boxShadow,previewOutline:ps?ps.outlineColor+' '+ps.outlineStyle:null,previewShadow:ps?.boxShadow||null,playable:n.dataset.hybridPlayable??null};},index);};
  const cases=[];const run=async(label,setupFn,index,expectGreen)=>{await page.mouse.move(w/2,h*.4);await page.waitForTimeout(150);const t=table({hand:5,mana:2});setupFn?.(t);await paint(page,view(t.room,t.a),400);if(label.includes('busy'))await page.evaluate(()=>{commandBusy=true;});const r=await read(index);if(label.includes('busy'))await page.evaluate(()=>{commandBusy=false;});const green=GREEN.test(r.hoverShadow)||GREEN.test(r.previewOutline||'')||GREEN.test(r.previewShadow||'');cases.push({label,...r,green,expectGreen});check(`${id}: ${label} → ${expectGreen?'green':'neutral'} feedback (hand and preview)`,green===expectGreen,r);};
  // Hand: FL10, FV03, FL16, FL09, FV03 (costs from the catalog); mana 2.
  const costs=await page.evaluate(()=>0);void costs;
  const t0=table({hand:5,mana:2});const handCosts=t0.a.hand.map(c=>c.cost);const cheap=handCosts.findIndex(c=>c<=2),dear=handCosts.findIndex(c=>c>2);report.greenHand=handCosts;
  await run('own turn, affordable card',null,cheap,true);
  await run('own turn, card above current mana (inspection only)',null,dear,false);
  await run('rival turn, affordable cost',t=>{t.room.turn=t.b.id;},cheap,false);
  await run('own turn, affordable, command in flight (busy)',null,cheap,false);
  await run('formation phase, affordable cost',t=>{t.room.phase='formation';for(const p of [t.a,t.b])p.ready=false;},cheap,false);
  await run('own turn after receiving mana (10)',t=>{t.a.mana=10;},dear,true);
  // Discount: a spell costing mana+1 becomes playable through the Study discount (affordable() decides).
  const spellIdx=t0.a.hand.findIndex(c=>!['creature','equipment'].includes(c.type));
  if(spellIdx>=0)await run('own turn, spell one above mana with Study discount',t=>{studies(t.a);t.a.study.discount=true;t.a.mana=Math.max(0,t.a.hand[spellIdx].cost-1);},spellIdx,true);
  report.green.push({id,cases});await page.screenshot({path:`${out}/green-${id}.png`});await context.close();}}

// ---------- 7. No wait cursor ----------
if(want('cursor')){const {context,page}=await open({width:1920,height:900});const t=table({hand:5});const drawn=card('FV03',t.a);t.a.hand.push(drawn);await paint(page,view(t.room,t.a),400);
 const r=await page.evaluate(async uid=>{RunaCardArrivals.reserve(uid);render();await new Promise(r=>setTimeout(r,200));const p=animateEvent({id:990010,type:'draw',playerId:state.you,cardId:uid});await new Promise(r=>setTimeout(r,250));const lock=document.querySelector('.hybrid-draw-lock'),hand=document.getElementById('hand'),card=hand.querySelector('.hand-card');const res={lockHidden:lock.hidden,lockCursor:getComputedStyle(lock).cursor,handBusy:hand.getAttribute('aria-busy'),handInert:hand.inert,handCursor:getComputedStyle(hand).cursor,cardCursor:card?getComputedStyle(card).cursor:null,bodyCursor:getComputedStyle(document.body).cursor};await p;return res;},drawn.uid);
 report.cursor=r;check('cursor: no wait/progress cursor while the hand is temporarily locked; lock, inert and aria-busy remain',!/wait|progress/.test([r.lockCursor,r.handCursor,r.cardCursor,r.bodyCursor].join(' '))&&r.lockHidden===false&&r.handInert===true&&r.handBusy==='true',r);
 await context.close();}

// ---------- 8. Choices (Verônica, Monge, João Bobão, others) ----------
if(want('choices')){report.choices=[];
 for(const [w,h,touch] of [[1920,900,false],[1280,720,false],[390,800,true]]){const id=`${w}x${h}${touch?'-touch':''}`,{context,page}=await open({width:w,height:h},{touch});
  // Entry modes (Monge FL08 / Verônica FL11): promise resolves the mode; no command.
  for(const [model,kind] of [['FL08','monk'],['FL11','protocol']]){const t=table({hand:5});const c=card(model,t.a);t.a.hand.push(c);await paint(page,view(t.room,t.a),300);
   await page.evaluate(({uid,kind})=>{const card=seat().hand.find(c=>c.uid===uid);window.__choice=chooseEntryMode(card,kind).then(v=>window.__choiceResult=v===null?'cancel':v);window.__choiceResult=undefined;},{uid:c.uid,kind});await page.waitForTimeout(250);
   const ui=await page.evaluate(()=>{const d=document.getElementById('target-picker'),opts=[...d.querySelectorAll('.choice-option, .taunt-options>button')];return {open:d.open,stage:d.classList.contains('choice-stage'),count:opts.length,options:opts.map(o=>({text:o.textContent,title:o.querySelector('.choice-title')?.textContent??null,desc:o.querySelector('.choice-desc')?.textContent??null,r:(r=>({x:r.x,y:r.y,w:r.width,h:r.height}))(o.getBoundingClientRect())})),bg:getComputedStyle(d).backgroundColor,focus:document.activeElement?.className||document.activeElement?.tagName};});
   await page.screenshot({path:`${out}/choice-${kind}-${id}.png`});
   // Highlight only: hover and focus send nothing and resolve nothing.
   const o=ui.options[0];if(o&&!touch){await page.mouse.move(o.r.x+o.r.w/2,o.r.y+o.r.h/2);await page.waitForTimeout(150);}
   await page.evaluate(()=>document.querySelector('#target-picker .taunt-options>button')?.focus());if(!touch){await page.keyboard.press('ArrowRight');}await page.waitForTimeout(100);
   const mid=await page.evaluate(()=>({result:window.__choiceResult,commands:window.__commands.length,focused:document.activeElement?.textContent}));
   if(touch){const o2=ui.options[1];await page.touchscreen.tap(o2.r.x+o2.r.w/2,o2.r.y+o2.r.h/2);}else await page.keyboard.press('Enter');await page.waitForTimeout(250);
   const after=await page.evaluate(()=>({result:window.__choiceResult,open:document.getElementById('target-picker').open,commands:window.__commands.length,focus:document.activeElement?.className}));
   // Cancel with Escape returns null and consumes nothing.
   await page.evaluate(({uid,kind})=>{const card=seat().hand.find(c=>c.uid===uid);window.__choiceResult=undefined;window.__choice=chooseEntryMode(card,kind).then(v=>window.__choiceResult=v===null?'cancel':v);},{uid:c.uid,kind});await page.waitForTimeout(200);await page.keyboard.press('Escape');await page.waitForTimeout(200);const cancelled=await page.evaluate(()=>({result:window.__choiceResult,open:document.getElementById('target-picker').open,commands:window.__commands.length,handHas:true}));
   report.choices.push({id,kind,ui,mid,after,cancelled});const second=kind==='monk'?'buff':'escort';
   check(`${id} ${kind}: options presented as a choice stage (${ui.count} options with title and description)`,ui.open&&ui.stage&&ui.count===2&&ui.options.every(o=>o.title&&o.desc),ui);
   check(`${id} ${kind}: highlighting (hover/focus/arrow) sends nothing and does not resolve`,mid.result===undefined&&mid.commands===0,mid);
   check(`${id} ${kind}: ${touch?'tap':'ArrowRight + Enter'} confirms exactly the second option once`,after.result===second&&!after.open&&after.commands===0,after);
   check(`${id} ${kind}: Escape cancels without command`,cancelled.result==='cancel'&&!cancelled.open&&cancelled.commands===0,cancelled);}
  // Formation pickers: João Bobão (taunt), Verônica protocol, Monge mode → exactly one command per confirmation.
  for(const [model,fn,type] of [['FL16','showTauntPicker','taunt'],['FL11','showProtocolPicker','protocol'],['FL08','showMonkPicker','monkChoice']]){const t=table({hand:5});const c=card(model,t.a);t.a.reserve=[c,...t.a.reserve.slice(1)];t.a.formation=[null,c.uid,null];if(model==='FL11')delete c.protocolMode;t.room.phase='formation';for(const p of [t.a,t.b])p.ready=false;await paint(page,view(t.room,t.a),300);
   await page.evaluate(({uid,fn})=>{window.__commands=[];const card=seat().reserve.find(c=>c.uid===uid);window[fn](card);},{uid:c.uid,fn});await page.waitForTimeout(250);
   const ui=await page.evaluate(()=>{const d=document.getElementById('target-picker');return {open:d.open,stage:d.classList.contains('choice-stage'),options:[...d.querySelectorAll('.taunt-options>button')].map(b=>({text:b.textContent,disabled:b.disabled,title:b.querySelector('.choice-title')?.textContent??null}))};});
   await page.screenshot({path:`${out}/choice-${type}-${id}.png`});
   const target=await page.evaluate(()=>{const b=[...document.querySelectorAll('#target-picker .taunt-options>button')].find(b=>!b.disabled);const r=b.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,text:b.textContent};});
   if(!touch){await page.mouse.move(target.x,target.y);await page.waitForTimeout(150);}const hovered=await page.evaluate(()=>window.__commands.length);
   if(touch)await page.touchscreen.tap(target.x,target.y);else await page.mouse.click(target.x,target.y);await page.waitForTimeout(250);
   const after=await page.evaluate(()=>({commands:window.__commands,open:document.getElementById('target-picker').open}));
   await page.evaluate(({uid,fn})=>{window.__commands=[];const card=seat().reserve.find(c=>c.uid===uid);window[fn](card);},{uid:c.uid,fn});await page.waitForTimeout(200);await page.keyboard.press('Escape');await page.waitForTimeout(200);const cancel=await page.evaluate(()=>({commands:window.__commands.length,open:document.getElementById('target-picker').open}));
   report.choices.push({id,kind:type,ui,target,hovered,after,cancel});
   check(`${id} ${type}: choice stage with ${ui.options.length} titled options`,ui.open&&ui.stage&&ui.options.length>=2&&ui.options.every(o=>o.title),ui);
   check(`${id} ${type}: hover sends nothing; one ${touch?'tap':'click'} sends exactly one '${type}' command; Escape sends none`,hovered===0&&after.commands.length===1&&after.commands[0].type===type&&!after.open&&cancel.commands===0&&!cancel.open,{hovered,after,cancel});}
  // Phase change while the picker is open closes it without a command (render path).
  await context.close();}}

// ---------- 9. Full Emanation text, no internal scroll ----------
if(want('emana')){report.emana=[];
 for(const [w,h,dpr] of [[1920,1080,1],[1920,900,1],[1440,900,1],[1280,720,1],[390,800,1],[320,1000,1],[1920,900,2]]){const id=`${w}x${h}-dpr${dpr}`,{context,page}=await open({width:w,height:h},{dpr});
  for(const seatName of ['a','b']){const t=captureTable();await paint(page,view(t.room,t[seatName]),700);
   const faces=await page.evaluate(()=>[...document.querySelectorAll('.hybrid-emana-face')].map(f=>{const d=f.querySelector('.emana-description'),s=getComputedStyle(d),node=f.closest('.card'),r=d.getBoundingClientRect(),fr=f.getBoundingClientRect(),zoomUnit=fr.width/f.offsetWidth;return {uid:node?.dataset.uid,fit:f.dataset.textFit||null,descVisibility:s.visibility,fitFont:f.dataset.fontPx||null,fitArt:f.dataset.artFraction||null,text:d.textContent,full:node?.getAttribute('aria-label')||'',overflowY:s.overflowY,scrollH:d.scrollHeight,clientH:d.clientHeight,fontScreenPx:+(parseFloat(s.fontSize)*zoomUnit).toFixed(2),descRect:{x:r.x,y:r.y,w:r.width,h:r.height},face:{x:fr.x,y:fr.y,w:fr.width,h:fr.height},heart:!!node?.querySelector('.health-liquid')&&!!node?.querySelector('.card-stats-svg .health-value')};}));
   await page.screenshot({path:`${out}/emana-${id}-${seatName}.png`});report.emana.push({id,seat:seatName,faces});
   for(const f of faces){
    if(f.fit==='detail'){
     // Phones only: the face shows no clipped text; the complete text must be readable in
     // the card's own enlarged view, without an inner scroll bar.
     check(`${id} ${seatName} ${f.uid}: socket too small → no clipped text on the face (phones only)`,w<=600&&f.descVisibility==='hidden',{w,vis:f.descVisibility,face:f.face});
     const node=await page.$(`.hybrid-emana-card[data-uid="${f.uid}"]`);await node.scrollIntoViewIfNeeded();await page.waitForTimeout(150);await node.click();await page.waitForTimeout(500);
     // Own preparation: the native tap opens the Emanation menu, which offers "Ler carta completa".
     if(await page.$('#target-picker[open] .hybrid-read-card')){await page.click('#target-picker[open] .hybrid-read-card');await page.waitForTimeout(400);}
     const detail=await page.evaluate(()=>{const hosts=[document.querySelector('#card-detail[open]'),document.querySelector('#hover-preview:not([hidden])'),document.querySelector('#target-picker[open]')].filter(Boolean);const big=hosts.map(h=>h.querySelector('.card')).find(Boolean);const host=hosts[0],br=big?.getBoundingClientRect(),hr=host?.getBoundingClientRect();return {host:host?.id||null,label:big?.getAttribute('aria-label')||null,cardInView:!!(br&&hr&&br.top>=hr.top-1&&br.bottom<=Math.min(hr.bottom,innerHeight)+1&&br.left>=Math.max(0,hr.left+host.clientLeft)-1&&br.right<=Math.min(hr.left+host.clientLeft+host.clientWidth,document.documentElement.clientWidth,innerWidth)+1),card:br&&{top:br.top,bottom:br.bottom,w:br.width},hostScrollTop:host?.scrollTop??null};});
     await page.keyboard.press('Escape');await page.evaluate(()=>{hideHover?.();for(const d of document.querySelectorAll('dialog[open]'))d.close();});await page.waitForTimeout(150);
     check(`${id} ${seatName} ${f.uid}: tapping the Emanation opens the complete card (full text), the whole card visible without scrolling`,!!detail.label&&detail.label.includes(f.text.split('\n')[0].slice(0,40))&&detail.cardInView&&detail.hostScrollTop===0,detail);
     continue;}
    check(`${id} ${seatName} ${f.uid}: Emanation text complete without internal scroll or hidden overflow`,!/auto|scroll/.test(f.overflowY)&&f.scrollH<=f.clientH+1&&f.text.length>0,{overflowY:f.overflowY,scrollH:f.scrollH,clientH:f.clientH,fit:f.fit,fitFont:f.fitFont,fitArt:f.fitArt,face:f.face,text:f.text});
    check(`${id} ${seatName} ${f.uid}: text readable (≥ 7 px on screen) and native heart present`,f.fontScreenPx>=6.95&&f.heart,{font:f.fontScreenPx,heart:f.heart});}}
  await context.close();}}

// ---------- 5. Idle: the face stays on its WebGL body ----------
if(want('idle')){report.idle=[];
 for(const [w,h] of [[1920,900],[1280,720]]){const {context,page}=await open({width:w,height:h});const t=captureTable();await paint(page,view(t.room,t.a),800);
  const r=await page.evaluate(async()=>{const nodes=[...document.querySelectorAll('#lanes .lane-side>.card')];const read=()=>nodes.map(n=>{const r=n.querySelector('.hybrid-card-face').getBoundingClientRect();return [r.x,r.y,r.width,r.height];});const base=read(),b0=RunaHybrid.stats.builds;let max=0;for(let f=0;f<90;f++){await new Promise(requestAnimationFrame);read().forEach((v,i)=>{for(let k=0;k<4;k++)max=Math.max(max,Math.abs(v[k]-base[i][k]));});}
   const anims=nodes.map(n=>n.getAnimations().map(a=>a.animationName||a.id||'anim'));const shadows=nodes.map(n=>{const s=getComputedStyle(n);return {filter:s.filter,boxShadow:s.boxShadow};});const faceShadows=nodes.map(n=>[...n.querySelectorAll('*')].filter(c=>{const s=getComputedStyle(c);return s.boxShadow!=='none'&&!c.matches('.hybrid-card-face')||/drop-shadow/.test(s.filter);}).map(c=>c.className.baseVal??c.className));return {cards:nodes.length,maxFaceDrift:max,idleBuilds:RunaHybrid.stats.builds-b0,animations:anims,shadows,faceShadows};});
  report.idle.push({id:`${w}x${h}`,...r});await page.screenshot({path:`${out}/idle-${w}x${h}.png`});
  check(`${w}x${h}: combat faces stay on their WebGL body at rest (drift ≤ 0.3 px over 90 frames)`,r.cards>0&&r.maxFaceDrift<=.3,r);
  check(`${w}x${h}: no rebuild while idle`,r.idleBuilds===0,r.idleBuilds);
  check(`${w}x${h}: no CSS drop shadow doubles the WebGL shadow on combat cards`,r.shadows.every(s=>s.filter==='none'&&s.boxShadow==='none'),r.shadows);
  await context.close();}}

// ---------- 4. Post-combat return, frame by frame ----------
if(want('return')){report.return=[];
 const RUNS=[];for(const style of ['forge','ether','chain','gentle'])for(const seatName of ['a','b'])RUNS.push({w:1920,h:900,style,seatName});RUNS.push({w:1280,h:720,style:'gentle',seatName:'a'},{w:1280,h:720,style:'forge',seatName:'b'},{w:1920,h:900,style:'ether',seatName:'a',reduced:true},{w:1920,h:900,style:'chain',seatName:'a',resize:true});
 for(const {w,h,style,seatName,reduced=false,resize=false} of RUNS){const id=`${w}x${h}-${style}-${seatName}${reduced?'-reduced':''}${resize?'-resize':''}`,{context,page}=await open({width:w,height:h},{reduced});
  const {room,a,b}=setup();for(const p of [a,b]){p.hand=[card('FV03',p)];p.patron.hp=60;p.patron.returnStyle=style;}
  a.reserve=[card('FL11',a),card('FL16',a),card('FL09',a),card('FV03',a)];a.formation=[a.reserve[0].uid,a.reserve[1].uid,a.reserve[2].uid];b.reserve=[card('FL16',b),card('FV03',b),card('FL11',b)];b.formation=b.reserve.map(c=>c.uid);for(const p of [a,b])for(const c of p.reserve)if(c.modelId==='FL11')c.protocolMode='escort';
  room.phase='formation';for(const p of [a,b]){p.ready=false;p.mana=0;}const me=seatName==='a'?a:b;await paint(page,{...JSON.parse(JSON.stringify(view(room,me))),serverNow:Date.now()},600);
  // Each frame: the VISIBLE art of every face in a return copy (the .card-art-canvas box,
  // which includes any inner projection), its natural aspect and opacity; the last pose
  // of the arriving face is kept per UID and compared, when the copy is removed, with
  // the visible face of the reserve card.
  await page.evaluate(()=>{window.__ret={frames:[],landings:[]};const L=window.__ret,lastSeen=new Map();const loop=()=>{const cards=[...document.querySelectorAll('.combat-return-card')];if(cards.length){const f={t:performance.now(),cards:cards.map(c=>{const faces=[...c.querySelectorAll(':scope>.card')].map(n=>{const cv=n.querySelector('.card-art-canvas'),r=(cv||n).getBoundingClientRect(),op=+getComputedStyle(n).opacity*(+getComputedStyle(c).opacity);return {cls:n.classList.contains('return-new-face')?'new':'old',w:r.width,h:r.height,natural:cv?cv.height/cv.width:null,opacity:op,projected:!!n.querySelector('.hybrid-card-face')};});const fresh=c.querySelector(':scope>.card.return-new-face');if(fresh){const r=fresh.getBoundingClientRect();lastSeen.set(c.dataset.returnUid,{x:r.x,y:r.y,w:r.width,h:r.height,opacity:+getComputedStyle(fresh).opacity});}return {uid:c.dataset.returnUid,faces};}),slabs:window.RunaHybrid?.slabs?.length??null};L.frames.push(f);}requestAnimationFrame(loop);};requestAnimationFrame(loop);
   new MutationObserver(ms=>{for(const m of ms)for(const n of m.removedNodes)if(n.classList?.contains('combat-return-card')){const uid=n.dataset.returnUid,live=tableCard(uid);if(!live)continue;const pose=live.classList.contains('hybrid-surface-card')?window.RunaHybrid?.pose?.(live):null,q=pose?.quad;let b;if(q){const [A,B,C,D]=q,cx=(A.x+B.x+C.x+D.x)/4,cy=(A.y+B.y+C.y+D.y)/4,w=(Math.hypot(B.x-A.x,B.y-A.y)+Math.hypot(C.x-D.x,C.y-D.y))/2,h=(Math.hypot(D.x-A.x,D.y-A.y)+Math.hypot(C.x-B.x,C.y-B.y))/2;b={x:cx-w/2,y:cy-h/2,w,h};}else b=(r=>({x:r.x,y:r.y,w:r.width,h:r.height}))(live.getBoundingClientRect());L.landings.push({uid,target:b,last:lastSeen.get(uid)||null,t:performance.now()});}}).observe(document.body,{childList:true,subtree:true});});
  act(room,a,{type:'ready'},catalog);act(room,b,{type:'ready'},catalog);if(!room.combat)throw Error('no combat');const feed=poll(page,()=>view(room,me));
  const ends=Date.now()+(room.combat.duration||20000)+9000;while(room.phase==='resolving'&&Date.now()<ends)await new Promise(r=>setTimeout(r,100));
  if(resize){await page.waitForFunction(()=>document.querySelector('.combat-return-card'),null,{timeout:6000}).catch(()=>{});await page.setViewportSize({width:w-200,height:h});}
  await page.waitForTimeout(3500);await feed.stop();if(resize)await page.setViewportSize({width:w,height:h});await page.waitForTimeout(400);
  const res=await page.evaluate(()=>{const L=window.__ret;const worst=[];for(const f of L.frames)for(const c of f.cards)for(const face of c.faces){if(!face.natural||face.opacity<.05||!face.w)continue;const aspect=face.h/face.w,err=Math.abs(aspect/face.natural-1);worst.push({err,cls:face.cls,aspect,natural:face.natural,projected:face.projected});}worst.sort((a,b)=>b.err-a.err);const leftovers={layers:document.querySelectorAll('.combat-return-layer').length,cards:document.querySelectorAll('.combat-return-card').length,hidden:[...document.querySelectorAll('#game .card')].filter(n=>n.dataset.uid&&getComputedStyle(n).visibility==='hidden'&&!visuallyDefeated.has(n.dataset.uid)).map(n=>n.dataset.uid),moving:RunaCardArrivals.stats.moving};return {frames:L.frames.length,maxAspectErr:worst[0]?.err??null,worst:worst.slice(0,3),projectedFaces:worst.filter(x=>x.projected).length,landings:L.landings,leftovers};});
  // Copies removed before their crossfade completed were cancelled (native resync of the
  // event window: app.js bumps visualGeneration and calls RunaCombatReturn.cancel()); they
  // are reported apart, the landing check uses copies that finished.
  const finished=res.landings.filter(l=>l.last&&l.last.opacity>=.95),cancelled=res.landings.filter(l=>!l.last||l.last.opacity<.95).length;res.cancelled=cancelled;
  const landErr=finished.map(l=>Math.max(Math.abs(l.last.x-l.target.x),Math.abs(l.last.y-l.target.y),Math.abs(l.last.w-l.target.w),Math.abs(l.last.h-l.target.h)));
  report.return.push({id,...res,landErr});console.log(id,'return frames',res.frames,'maxAspectErr',res.maxAspectErr?.toFixed(3),'land',landErr.map(v=>v.toFixed(1)).join(','),'cancelled',res.cancelled);
  if(!resize){check(`${id}: return faces keep their own proportions in every frame (≤ 3%)`,res.frames>3&&res.maxAspectErr!==null&&res.maxAspectErr<=.03,{frames:res.frames,worst:res.worst});
   check(`${id}: no projected (double-transformed) face inside the return copies`,res.projectedFaces===0,res.projectedFaces);
   check(`${id}: the last frame lands on the visible reserve face (≤ 2.5 px)`,landErr.length>0&&landErr.every(v=>v<=2.5),{landErr,landings:res.landings.slice(0,4)});}
  check(`${id}: no leftovers (layers, copies, hidden cards, moving set)`,!res.leftovers.layers&&!res.leftovers.cards&&!res.leftovers.hidden.length&&!res.leftovers.moving.length,res.leftovers);
  await page.screenshot({path:`${out}/return-end-${id}.png`});await context.close();}}

report.served=served;writeJSON(`${out}/ui-owner-probe-detail.json`,report);finish(out,'ui-owner-probe',H);await browser.close();
