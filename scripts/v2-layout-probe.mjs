// V2 · composition, fit and perspective probe of the hybrid table (isolated QA: fixture state injected in the
// page, no live match). Same table every run (captureTable + FL17/FV16). Per viewport it records:
//  · requested/applied composition and zoom (RunaHybridLayout.stats), field partition (world units) and the
//    on-screen width of combat/Emanation sockets;
//  · centring against the projected field surface: socket ↔ card faces, Emanation sockets ↔ their cards, and
//    Patron portrait + powers group ↔ projected field centre, for both seats;
//  · power cost badge placement (centre of the power's top edge), overlaps between board faces and decorations;
//  · effective rules text size (hand, Emanation), hand fan geometry (must not change), controls on screen;
//  · unscaled screenshots of the table, FL17/FV16 hover.
// V2_SOURCE=initial serves mesa-nova/ from prototype-qa/revisao-visual-20261103/v2/initial-snapshot (before).
// Usage: node scripts/v2-layout-probe.mjs <out-dir> [viewport ...]   viewport = WxH[@dpr]
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import {chromium,CHROME,captureTable,card,view} from './hybrid12-lib.mjs';
const [out='prototype-qa/revisao-visual-20261103/v2/probe',...vps]=process.argv.slice(2),base=process.env.QA_BASE||'http://127.0.0.1:3086',SOURCE=process.env.V2_SOURCE||'current';
const SNAP=process.env.V2_SNAP||'prototype-qa/revisao-visual-20261103/v2/initial-snapshot/mesa-nova',TYPES={'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json'};
const viewports=(vps.length?vps:['1920x1080','1366x768']).map(v=>{const [wh,d]=v.split('@'),[w,h]=wh.split('x').map(Number);return {width:w,height:h,dpr:Number(d||1)};});
fs.mkdirSync(out,{recursive:true});
const {room,a,b}=captureTable();const fl17=card('FL17',a),fv16=card('FV16',a);a.hand.splice(1,2,fl17,fv16);const fl17board=card('FL17',a);a.reserve.unshift(fl17board);a.formation[1]=fl17board.uid;
const state=view(room,a);
const report={source:SOURCE,date:new Date().toISOString(),viewports:[]};
for(const vp of viewports){const browser=await chromium.launch({executablePath:process.env.QA_BROWSER||CHROME,headless:true});try{
 const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},deviceScaleFactor:vp.dpr,reducedMotion:'reduce'});const served={};
 const allowed=new Set(['127.0.0.1','fonts.googleapis.com','fonts.gstatic.com']);
 await context.route('**/*',r=>{const u=new URL(r.request().url());if(!allowed.has(u.hostname))return r.abort();
  if(SOURCE==='initial'&&u.hostname==='127.0.0.1'&&u.pathname.startsWith('/runamarca/')){const rel=u.pathname.slice('/runamarca/'.length)||'index.html',file=path.join(SNAP,rel);if(fs.existsSync(file)&&fs.statSync(file).isFile()){const body=fs.readFileSync(file);served[rel]=crypto.createHash('sha256').update(body).digest('hex').slice(0,8);return r.fulfill({status:200,headers:{'content-type':TYPES[path.extname(rel)]||'application/octet-stream','cache-control':'no-store'},body});}}
  return r.continue();});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/runamarca/hybrid/index.html');await page.waitForFunction(()=>typeof render==='function');await page.evaluate(()=>document.fonts.ready);
 await page.evaluate(s=>{state=s;serverClockOffset=Date.now()-s.serverNow;render();},state);await page.waitForFunction(()=>window.RunaHybrid?.ready);
 await page.evaluate(()=>Promise.all([...document.querySelectorAll('#game .card')].map(n=>n.visualReady)));await page.waitForTimeout(1200);
 const tag=`${vp.width}x${vp.height}${vp.dpr!==1?'@'+vp.dpr:''}`;
 const m=await page.evaluate(([fl,fv])=>{
  const R=n=>{if(!n)return null;const r=n.getBoundingClientRect();return r.width||r.height?{x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),cx:+(r.x+r.width/2).toFixed(1),cy:+(r.y+r.height/2).toFixed(1)}:null;};
  const scene=RunaHybrid.scene||{},quad=scene.field?.quad||[],fieldCx=quad.length?quad.reduce((s,p)=>s+p.x,0)/quad.length:null;
  // centre of the projected field at a screen row y: midpoint of the quad's left/right edges at that row
  const rowCentre=y=>{if(quad.length<4)return fieldCx;const edge=(p,q)=>p.y===q.y?(p.x+q.x)/2:p.x+(q.x-p.x)*(y-p.y)/(q.y-p.y);const L=edge(quad[0],quad[3]),Rr=edge(quad[1],quad[2]);return (L+Rr)/2;};
  const sides=[...document.querySelectorAll('#lanes>.lane>.lane-side')].map((n,i)=>{const c=n.querySelector('.card');return {i,rect:R(n),card:c?{uid:c.dataset.uid,rect:R(c.querySelector('.hybrid-card-face')||c),offsetX:null}:null};});
  for(const s of sides)if(s.card&&s.rect)s.card.offsetX=+(s.card.rect.cx-s.rect.cx).toFixed(2),s.card.offsetY=+(s.card.rect.cy-s.rect.cy).toFixed(2);
  const P=RunaHybrid.scene?.partition||{};const emana=[...document.querySelectorAll('.combat-emanation .card')].map(c=>c.querySelector('.hybrid-emana-face')||c.querySelector('.hybrid-card-face')||c).filter((n,i,a)=>a.indexOf(n)===i).map(face=>{let best=null;for(const el of face.querySelectorAll('*')){if(![...el.childNodes].some(t=>t.nodeType===3&&t.textContent.trim().length>20))continue;const fs=parseFloat(getComputedStyle(el).fontSize),k=el.getBoundingClientRect().width/(el.offsetWidth||1);if(!best||fs*k>best)best=+(fs*k).toFixed(2);}const r=R(face);return {rect:r,fontPx:best,offsetFromRowCentreX:r?+(r.cx-rowCentre(r.cy)).toFixed(2):null};});
  const seat=sel=>{const head=document.querySelector(sel),band=head?.closest('.player-band'),powers=band?.querySelector('.patron-powers'),portrait=head?.querySelector('.patron-avatar')||head,ether=band?.querySelector('.patron-ether');const group=[ether,portrait,powers].filter(Boolean).map(R).filter(Boolean);const gx=group.length?{left:Math.min(...group.map(r=>r.x)),right:Math.max(...group.map(r=>r.x+r.w))}:null;const cy=group.length?group[0].cy:null;
   // cost = the number badge (<b>) on the power; ring = the outer power button; art = the illustration circle
   const pw=[...(band?.querySelectorAll('.patron-power-wrap')||[])].map(w=>{const p=w.querySelector('.patron-power'),art=w.querySelector('.power-cost'),c=w.querySelector('.power-cost>b');const pr=R(p),ar=R(art),cr=R(c);return {ring:pr,art:ar,cost:cr,costCenterDX:pr&&cr?+(cr.cx-pr.cx).toFixed(2):null,costCenterToRingTop:pr&&cr?+(cr.cy-pr.y).toFixed(2):null,overRingPx:pr&&cr?+(cr.y+cr.h-pr.y).toFixed(2):null,coversArtPx:ar&&cr?+Math.max(0,cr.y+cr.h-ar.y).toFixed(2):null};});
   const neigh=pw.length>1&&pw[0].cost&&pw[1].ring?+(pw[1].ring.x-(pw[0].cost.x+pw[0].cost.w)).toFixed(2):null;
   const name=band?.querySelector('.patron-name,.patron-title');
   return {ether:R(ether),portrait:R(portrait),powers:R(powers),portraitOffsetX:R(portrait)&&cy!=null?+(R(portrait).cx-rowCentre(R(portrait).cy)).toFixed(2):null,group:gx&&{...gx,cx:+((gx.left+gx.right)/2).toFixed(1)},fieldCentreAtRow:cy!=null?+rowCentre(cy).toFixed(1):null,groupOffsetX:gx&&cy!=null?+((gx.left+gx.right)/2-rowCentre(cy)).toFixed(2):null,band:R(band),powerItems:pw,costGapToNeighbourRing:neigh,nameVisible:Boolean(name&&getComputedStyle(name).display!=='none'&&R(name))};};
  const faces=[...document.querySelectorAll('#lanes .lane-side .card, .combat-emanation .card')].map(c=>({uid:c.dataset.uid,r:R(c.querySelector('.hybrid-card-face,.hybrid-emana-face')||c)})).filter(f=>f.r);
  const overlaps=[];for(let i=0;i<faces.length;i++)for(let j=i+1;j<faces.length;j++){const A=faces[i].r,B=faces[j].r,ox=Math.min(A.x+A.w,B.x+B.w)-Math.max(A.x,B.x),oy=Math.min(A.y+A.h,B.y+B.h)-Math.max(A.y,B.y);if(ox>.5&&oy>.5)overlaps.push({a:faces[i].uid,b:faces[j].uid,area:+(ox*oy).toFixed(1)});}
  const reserves=[...document.querySelectorAll('.reserve-camp')].map(n=>{const cards=[...n.querySelectorAll('.card')].map(R).filter(Boolean),shelf=R(n);const g=cards.length?{left:Math.min(...cards.map(r=>r.x)),right:Math.max(...cards.map(r=>r.x+r.w)),cy:cards[0].cy}:null;return {shelf,shelfOffsetX:shelf?+(shelf.cx-rowCentre(shelf.cy)).toFixed(2):null,cardsOffsetX:g?+((g.left+g.right)/2-rowCentre(g.cy)).toFixed(2):null};});
  const labels=[...document.querySelectorAll('.emanation-column .emanation-label,.emanation-column>span,.zone-label')].map(R).filter(Boolean);const labelHits=[];for(const f of faces)for(const l of labels){const ox=Math.min(f.r.x+f.r.w,l.x+l.w)-Math.max(f.r.x,l.x),oy=Math.min(f.r.y+f.r.h,l.y+l.h)-Math.max(f.r.y,l.y);if(ox>.5&&oy>.5)labelHits.push({uid:f.uid,area:+(ox*oy).toFixed(1)});}
  const hand=[...document.querySelectorAll('#hand>.hand-card')].map(n=>({uid:n.dataset.uid,rect:R(n),transform:getComputedStyle(n).transform}));
  const handFont=uid=>{const n=document.querySelector(`#hand>.card[data-uid="${uid}"]`),cv=n?.querySelector('.card-art-canvas');const d=cv?.__design;return n?{cssW:n.offsetWidth}:null;};
  const controls=[...document.querySelectorAll('#center-actions button,.camp-menu-trigger,#leave-room,.round-circuit')].filter(n=>getComputedStyle(n).display!=='none'&&n.getBoundingClientRect().width).map(n=>{const r=n.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,hit=document.elementFromPoint(Math.min(innerWidth-1,Math.max(0,x)),Math.min(innerHeight-1,Math.max(0,y)));return {label:(n.textContent||n.getAttribute('aria-label')||n.className).trim().slice(0,30),inView:r.left>=-.5&&r.top>=-.5&&r.right<=innerWidth+.5&&r.bottom<=innerHeight+.5,reachable:Boolean(hit&&(hit===n||n.contains(hit)))};});
  const L=window.RunaHybridLayout?.stats||{};
  return {layout:{composition:L.composition,compositionRequested:L.compositionRequested,compositionLimited:L.compositionLimited,zoom:L.zoom,fit:L.fit,visualScale:L.visualScale,rivalBandTop:L.rivalBandTop,rivalBandLimit:L.rivalBandLimit},
   partition:scene.partition,fieldQuad:quad,fieldCx,reserves,camera:RunaHybrid.stats.cameraTiltDegrees,sides,emana,self:seat('#self-head'),rival:seat('#opponent-head'),overlaps,labelHits,hand,controls,
   handCss:{fl17:handFont(fl),fv16:handFont(fv)},scroll:{w:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth}};},[fl17.uid,fv16.uid]);
 await page.screenshot({path:path.join(out,`mesa-${tag}.png`),scale:'device'});
 // controls outside the first screen (phones scroll): reachable after scrolling them into view
 m.controlsAfterScroll=await page.evaluate(()=>[...document.querySelectorAll('#center-actions button,.camp-menu-trigger')].filter(n=>getComputedStyle(n).display!=='none'&&n.getBoundingClientRect().width).map(n=>{n.scrollIntoView({block:'center'});const r=n.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2),ok={label:(n.textContent||'').trim().slice(0,20),inView:r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth,reachable:Boolean(hit&&(hit===n||n.contains(hit)))};scrollTo(0,0);return ok;}));
 // hover of FL17 and FV16 (real size)
 m.hover={};for(const [k,c] of [['FL17',fl17],['FV16',fv16]]){const box=await page.evaluate(uid=>{const r=document.querySelector(`#hand>.card[data-uid="${uid}"]`)?.getBoundingClientRect();return r?{x:r.x+r.width/2,y:Math.min(innerHeight-4,r.y+r.height*.3)}:null;},c.uid);if(!box)continue;await page.mouse.move(3,3);await page.waitForTimeout(150);await page.mouse.move(box.x,box.y);
  const ok=await page.waitForFunction(()=>{const cv=document.querySelector('#hover-preview:not([hidden]) .card.big .card-art-canvas');return cv&&cv.width>0&&cv.width<900;},null,{timeout:3000}).then(()=>true,()=>false);await page.waitForTimeout(300);
  const r=await page.evaluate(()=>{const n=document.querySelector('#hover-preview .card.big');if(!n)return null;const b=n.getBoundingClientRect();return {x:b.x,y:b.y,w:b.width,h:b.height};});
  if(ok&&r){await page.screenshot({path:path.join(out,`hover-${k}-${tag}.png`),clip:{x:Math.max(0,Math.floor(r.x)),y:Math.max(0,Math.floor(r.y)),width:Math.ceil(r.w),height:Math.ceil(Math.min(r.h,vp.height-r.y))},scale:'device'});m.hover[k]={rect:r};}}
 await page.mouse.move(3,3);
 report.viewports.push({viewport:tag,served:SOURCE==='initial'?Object.keys(served).length:0,errors,...m});console.log(tag,JSON.stringify({layout:m.layout,partition:m.partition&&{combat:+m.partition.combatWidth?.toFixed(3),emana:+m.partition.emanaWidth?.toFixed(3)},sockets:m.sides.map(s=>s.rect?.w),emana:m.emana.map(e=>e.rect?.w),selfOffset:m.self.groupOffsetX,rivalOffset:m.rival.groupOffsetX,emanaFont:m.emana.map(e=>e.fontPx),reserves:m.reserves.map(r=>r.cardsOffsetX),overlaps:m.overlaps.length,scroll:m.scroll}));
 await context.close();}finally{await browser.close();}}
fs.writeFileSync(path.join(out,'probe.json'),JSON.stringify(report,null,1));
