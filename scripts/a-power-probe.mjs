// Bloco A, ajuste focal (320/390): pilha de poderes dos Patronos e o selo de custo de cada poder, nos dois assentos.
// Same table as v2-layout-probe (captureTable). Optional POWER_SCENE=available makes every ability of both Patrons
// available (full ether, prep phase, not used this round) so that every cost badge is shown.
// Per power: ring (button), illustration, cost badge (<b>), the badge's text and visibility, how far the badge
// reaches into the ring and into the illustration, and the clear gap to the neighbouring power (stacked: the
// ring above; side by side: the ring to the right). Crops of each seat's powers (device pixels) are saved.
// V2_SOURCE=initial + V2_SNAP=<snapshot>/mesa-nova serves the "before" copy to the test browser only.
// Usage: node scripts/a-power-probe.mjs <out-dir> [viewport ...]   viewport = WxH[@dpr]
import fs from 'node:fs';import path from 'node:path';
import {chromium,CHROME,captureTable,card,view} from './hybrid12-lib.mjs';
import {initStudies} from '../mesa-nova/fluxo-studies.mjs';
const [out='prototype-qa/revisao-visual-20261103/formacao-A/poderes',...vps]=process.argv.slice(2),base=process.env.QA_BASE||'http://127.0.0.1:3086',SOURCE=process.env.V2_SOURCE||'current';
const SNAP=process.env.V2_SNAP||'prototype-qa/revisao-visual-20261103/formacao-A/v2-snapshot/mesa-nova',TYPES={'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json'};
const viewports=(vps.length?vps:['320x700@2','390x844@2']).map(v=>{const [wh,d]=v.split('@'),[w,h]=wh.split('x').map(Number);return {width:w,height:h,dpr:Number(d||1)};});
fs.mkdirSync(out,{recursive:true});
const {room,a,b}=captureTable();const fl17=card('FL17',a),fv16=card('FV16',a);a.hand.splice(1,2,fl17,fv16);const fl17board=card('FL17',a);a.reserve.unshift(fl17board);a.formation[1]=fl17board.uid;
// POWER_SCENE=available: Marika (Fluxo) gets the engine's own study state with the first advance reached (10 original
// cards seen), so her second ability is a pending advance (cost 3) instead of "Estudos concluídos"; no ability used.
if(process.env.POWER_SCENE==='available')for(const p of [a,b]){p.patron.usedPowers={};if(p.patron.affinity==='fluxo'){initStudies(p);p.study.seenIds=p.deck.slice(0,10).map(c=>c.studyOriginalId);}}
const state=view(room,a),report={source:SOURCE,scene:process.env.POWER_SCENE||'table',date:new Date().toISOString(),viewports:[]};
for(const vp of viewports){const browser=await chromium.launch({executablePath:process.env.QA_BROWSER||CHROME,headless:true});try{
 const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},deviceScaleFactor:vp.dpr,reducedMotion:'reduce'});let served=0;
 const allowed=new Set(['127.0.0.1','fonts.googleapis.com','fonts.gstatic.com']);
 await context.route('**/*',r=>{const u=new URL(r.request().url());if(!allowed.has(u.hostname))return r.abort();
  if(SOURCE==='initial'&&u.hostname==='127.0.0.1'&&u.pathname.startsWith('/runamarca/')){const rel=u.pathname.slice('/runamarca/'.length)||'index.html',file=path.join(SNAP,rel);if(fs.existsSync(file)&&fs.statSync(file).isFile()){served++;return r.fulfill({status:200,headers:{'content-type':TYPES[path.extname(rel)]||'application/octet-stream','cache-control':'no-store'},body:fs.readFileSync(file)});}}
  return r.continue();});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/runamarca/hybrid/index.html');await page.waitForFunction(()=>typeof render==='function');await page.evaluate(()=>document.fonts.ready);
 await page.evaluate(s=>{state=s;serverClockOffset=Date.now()-s.serverNow;render();},state);await page.waitForFunction(()=>window.RunaHybrid?.ready);
 await page.evaluate(()=>Promise.all([...document.querySelectorAll('#game .card')].map(n=>n.visualReady)));await page.waitForTimeout(1200);
 const tag=`${vp.width}x${vp.height}${vp.dpr!==1?'@'+vp.dpr:''}`,seats={};
 for(const [seat,sel] of [['rival','#opponent-head'],['self','#self-head']]){
  await page.evaluate(sel=>document.querySelector(sel).closest('.player-band').querySelector('.patron-powers')?.scrollIntoView({block:'center'}),sel);await page.waitForTimeout(400);
  const m=await page.evaluate(sel=>{const R=n=>{if(!n)return null;const r=n.getBoundingClientRect();return r.width||r.height?{x:+r.x.toFixed(2),y:+r.y.toFixed(2),w:+r.width.toFixed(2),h:+r.height.toFixed(2),b:+(r.y+r.height).toFixed(2),r:+(r.x+r.width).toFixed(2),cx:+(r.x+r.width/2).toFixed(2)}:null;};
   const band=document.querySelector(sel).closest('.player-band'),powers=band.querySelector('.patron-powers'),wraps=[...band.querySelectorAll('.patron-power-wrap')];
   const items=wraps.map(w=>{const ring=w.querySelector('.patron-power'),icon=w.querySelector('.power-cost'),img=icon?.querySelector('img'),badge=icon?.querySelector(':scope>b'),cs=badge&&getComputedStyle(badge);
    const visible=Boolean(badge&&cs.display!=='none'&&cs.visibility!=='hidden'&&+cs.opacity>0&&badge.getBoundingClientRect().width);
    return {label:ring?.getAttribute('aria-label')||ring?.title||'',disabled:Boolean(ring?.disabled),cost:badge?.textContent??null,visible,ring:R(ring),art:R(icon),badge:R(badge)};});
   const stacked=items.length>1&&items[1].ring&&items[0].ring&&items[1].ring.y>items[0].ring.b-1;
   for(const [k,it] of items.entries()){if(!it.badge||!it.ring)continue;it.badgeCentreDX=+(it.badge.cx-it.ring.cx).toFixed(2);it.badgeIntoRingPx=+Math.max(0,it.badge.b-it.ring.y).toFixed(2);it.badgeCoversArtPx=it.art?+Math.max(0,it.badge.b-it.art.y).toFixed(2):null;
    const prev=items[k-1];if(stacked&&prev?.ring)it.gapToRingAbovePx=+(it.badge.y-prev.ring.b).toFixed(2);const next=items[k+1];if(!stacked&&next?.ring)it.gapToNextRingPx=+(next.ring.x-it.badge.r).toFixed(2);}
   return {stacked,powers:R(powers),band:R(band),items};},sel);
  const box=m.powers;if(box){const pad=6;await page.screenshot({path:path.join(out,`poderes-${seat}-${tag}.png`),clip:{x:Math.max(0,box.x-pad),y:Math.max(0,box.y-pad-30),width:Math.min(vp.width-Math.max(0,box.x-pad),box.w+2*pad),height:box.h+2*pad+30},scale:'device'});}
  seats[seat]=m;}
 await page.evaluate(()=>scrollTo(0,0));
 report.viewports.push({viewport:tag,served,errors,seats});
 console.log(tag,JSON.stringify(Object.fromEntries(Object.entries(seats).map(([k,s])=>[k,{stacked:s.stacked,items:s.items.map(i=>({cost:i.cost,visible:i.visible,disabled:i.disabled,ring:i.ring&&i.ring.w,dx:i.badgeCentreDX,intoRing:i.badgeIntoRingPx,coversArt:i.badgeCoversArtPx,gapAbove:i.gapToRingAbovePx,gapNext:i.gapToNextRingPx}))}]))),'errors',errors.length);
 await context.close();}finally{await browser.close();}}
fs.writeFileSync(path.join(out,'probe.json'),JSON.stringify(report,null,1));
