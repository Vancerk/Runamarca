// Compare a frozen predecessor with stage 2 through loopback only.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {harness,finish,launch,captureTable,view} from './hybrid12-lib.mjs';
const out=process.argv[2]||'prototype-qa/simplificacao-etapa2-20261105/comparison',H=harness(out),report=[];
const base=process.env.QA_BASE||'http://127.0.0.1:3095',revision=process.env.QA_COMPARE_REVISION||'b290d19d4b1c1f68adfc8944dab8f6093c35a078';
const changed=execFileSync('git',['diff','--name-only',revision,'--','mesa-nova']).toString().trim().split(/\r?\n/).filter(Boolean).map(p=>p.slice('mesa-nova/'.length));
const baseline=Object.fromEntries(changed.map(file=>{let bytes=null;try{bytes=execFileSync('git',['show',revision+':mesa-nova/'+file],{maxBuffer:4<<20,stdio:['ignore','pipe','ignore']});}catch{}return [file,bytes];}));
const summary=values=>{const sorted=[...values].sort((a,b)=>a-b);return {median:sorted[Math.floor(sorted.length/2)],p95:sorted[Math.min(sorted.length-1,Math.ceil(sorted.length*.95)-1)],max:sorted.at(-1)};};
const stable=()=>new Promise(resolve=>setTimeout(resolve,650));
function positions(){
 const selectors=['#self-head','#opponent-head','#center-actions','#lanes','.combat-emanation .card','#self-reserve .card','#opponent-reserve .card','#hand>.hand-card'];
 return selectors.flatMap(selector=>[...document.querySelectorAll(selector)].map((n,index)=>{const r=n.getBoundingClientRect();return {key:selector+':'+index,uid:n.dataset.uid||null,x:r.x,y:r.y,w:r.width,h:r.height};}));
}
const scenes=new Map([1920,1366].map(width=>[width,captureTable()]));
const browser=await launch();
try{
 for(const width of [1920,1366])for(const condition of ['before','after']){
  const viewport={width,height:width===1920?1080:768},context=await browser.newContext({viewport}),served={};
  await context.route('**/*',async route=>{
   const url=new URL(route.request().url());if(url.hostname!=='127.0.0.1')return route.abort();
   const file=decodeURIComponent(url.pathname).replace(/^\/runamarca\//,'');
   if(condition==='before'&&Object.hasOwn(baseline,file)&&baseline[file]===null)return route.fulfill({status:404,body:'Absent in the baseline'});
   let bytes=condition==='before'?baseline[file]:changed.includes(file)&&fs.existsSync('mesa-nova/'+file)?fs.readFileSync('mesa-nova/'+file):null;
   if(file==='app.js'){
    bytes=bytes||fs.readFileSync('mesa-nova/app.js');
    bytes=Buffer.concat([bytes,Buffer.from('\nwindow.__initialFunctions={render,attackSource,attackTarget,animateTransfer,animateOpeningToHand,command,cardEl,cloneVisual,showHover,moveHover,hideHover,applyDamageHit,heavyCombatImpact,contact:RunaMotion.contact,strikeFrames:RunaMotion.strikeFrames,drawCard:RunaCardVisual.drawCard,drawCombat:RunaCardVisual.drawCombat};\n')]);
   }
   if(bytes){served[file]=createHash('sha256').update(bytes).digest('hex');return route.fulfill({status:200,contentType:file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':'text/javascript',body:bytes});}
   return route.continue();
  });
  const page=await context.newPage();page.on('pageerror',e=>H.errors.push(condition+':'+e.message));
  await page.goto(base+'/runamarca/hybrid/index.html');await page.waitForFunction(()=>window.RunaHybridFlights&&window.RunaHybridHand);
  const {room,a,b}=scenes.get(width);room.matchId='stage2-stable';room.phase='prep';a.ready=false;b.ready=false;
  const paint=async()=>{await page.evaluate(s=>{state=s;serverClockOffset=Date.now()-s.serverNow;render();},view(room,a));await page.evaluate(()=>Promise.all([document.fonts.ready,...[...document.querySelectorAll('#game .card')].map(n=>n.visualReady)]));await stable();};
  await paint();
  const styles=await page.evaluate(()=>[...document.querySelectorAll('link[rel="stylesheet"]')].filter(n=>new URL(n.href).origin===location.origin).map(n=>({file:new URL(n.href).pathname,applied:!!n.sheet&&n.sheet.cssRules.length>0})));
  H.check(`${width} ${condition}: all local stylesheets are applied`,styles.length>0&&styles.every(s=>s.applied),styles);
  const startPositions=await page.evaluate(positions);
  const metrics=await page.evaluate(async()=>{
   const calls=[],intervals=[];let previous=performance.now();
   for(let i=0;i<20;i++){
    await new Promise(requestAnimationFrame);const now=performance.now();intervals.push(now-previous);previous=now;
    const before=RunaHybrid.stats.builds,at=performance.now();render();const ms=performance.now()-at,sync=RunaHybrid.stats.builds-before;
    await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);
    calls.push({ms,sync,settled:RunaHybrid.stats.builds-before});
   }
   return {calls,intervals,stats:window.RunaPresentation?.stats||null,identity:{render:render===__initialFunctions.render,source:attackSource===__initialFunctions.attackSource,target:attackTarget===__initialFunctions.attackTarget,transfer:animateTransfer===__initialFunctions.animateTransfer,opening:animateOpeningToHand===__initialFunctions.animateOpeningToHand,explicit:['command','cardEl','cloneVisual','showHover','moveHover','hideHover','applyDamageHit','heavyCombatImpact'].every(k=>window[k]===__initialFunctions[k]),contact:RunaMotion.contact===__initialFunctions.contact,strike:RunaMotion.strikeFrames===__initialFunctions.strikeFrames,draw:RunaCardVisual.drawCard===__initialFunctions.drawCard&&RunaCardVisual.drawCombat===__initialFunctions.drawCombat},hybrid:RunaHybrid.stats};
  });
  H.check(`${width} ${condition}: 3D scene remains active`,metrics.hybrid.active&&!metrics.hybrid.failed,metrics.hybrid.failed);
  if(condition==='after')H.check(`${width}: render, strikes, opening and transfer functions are never replaced`,Object.values(metrics.identity).every(Boolean),metrics.identity);
  await page.screenshot({path:path.join(out,`${width}-${condition}-prep.png`)});
  const draws=[];
  for(let i=0;i<2;i++)draws.push(await page.evaluate(async()=>{
   const uid=seat().hand.at(-1).uid,before=performance.now(),longTasks=[],frames=[];let frame=0,last=before;
   const observer=new PerformanceObserver(list=>longTasks.push(...list.getEntries().map(e=>e.duration)));observer.observe({type:'longtask'});
   const sample=now=>{frames.push(now-last);last=now;frame=requestAnimationFrame(sample);};frame=requestAnimationFrame(sample);
   if(globalThis.RunaCardArrivals)RunaCardArrivals.reserve(uid);else pendingArrival.push(uid);
   render();await animateDraw(uid,true);const elapsed=performance.now()-before;
   await new Promise(requestAnimationFrame);cancelAnimationFrame(frame);observer.disconnect();
   const n=document.querySelector('#hand .card[data-uid="'+uid+'"]');
   return {elapsed,longTasks,frames,history:RunaHybridFlights.stats.history.filter(h=>h.time>=before),visible:!!n&&getComputedStyle(n).visibility!=='hidden',locked:RunaHybridFlights.stats.locked};
  }));
  H.check(`${width} ${condition}: both normal purchases finish visible and unlocked`,draws.every(d=>d.visible&&!d.locked),draws.map(d=>({ms:d.elapsed,locked:d.locked,visible:d.visible})));
  room.phase='formation';a.ready=false;b.ready=false;await paint();
  const formation=await page.evaluate(()=>({focus:RunaHybridFocus.value,button:document.querySelector('.formation-slot')?.textContent,hiddenRival:[...document.querySelectorAll('.lane-side')].filter(n=>n.dataset.owner!==state.you).every(n=>!n.querySelector('.card'))}));
  H.check(`${width} ${condition}: formation focus and rival secrecy preserved`,formation.focus===1&&formation.hiddenRival,formation);
  await page.screenshot({path:path.join(out,`${width}-${condition}-formation.png`)});
  const formationPositions=await page.evaluate(positions);
  a.ready=true;await paint();const waiting=await page.locator('.formation-slot').textContent();
  H.check(`${width} ${condition}: confirmation becomes a readable wait`,/Aguardando/.test(waiting),waiting);
  await page.evaluate(()=>{state=null;render();});await stable();
  H.check(`${width} ${condition}: leaving releases focus and hides the board`,await page.evaluate(()=>document.getElementById('game').hidden&&RunaHybridFocus.value===0));
  room.matchId='stage2-next';room.phase='prep';a.ready=false;await paint();
  H.check(`${width} ${condition}: a new match restores the scene`,await page.evaluate(()=>!document.getElementById('game').hidden&&RunaHybrid.ready&&!RunaHybrid.stats.failed));
  const row={condition,revision,viewport,served,startPositions,formationPositions,metrics,draws,summary:{renderMs:summary(metrics.calls.map(c=>c.ms)),synchronousBuilds:summary(metrics.calls.map(c=>c.sync)),settledBuilds:summary(metrics.calls.map(c=>c.settled))}};report.push(row);
  fs.writeFileSync(path.join(out,'comparison.json'),JSON.stringify(report,null,2));await context.close();
 }
 for(const width of [1920,1366]){
  const [before,after]=report.filter(r=>r.viewport.width===width);
  for(const key of ['startPositions','formationPositions']){
   let max=0;const left=before[key],right=after[key];
   const identities=left.length===right.length&&left.every((a,i)=>a.key===right[i].key&&a.uid===right[i].uid);
   if(identities)for(let i=0;i<left.length;i++)for(const dim of ['x','y','w','h'])max=Math.max(max,Math.abs(left[i][dim]-right[i][dim]));
   H.check(`${width} ${key}: same elements and projected geometry (≤ 1 CSS px)`,identities&&max<=1,{elements:left.length,max,identities});
  }
 }
 // The canonical document and the historical alias now serve the same 3D entry.
 const context=await browser.newContext({viewport:{width:1920,height:1080}});
 await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 const page=await context.newPage();page.on('pageerror',e=>H.errors.push('canonical:'+e.message));await page.goto(base+'/runamarca/');await page.waitForFunction(()=>window.RunaHybridHand);const {room,a}=captureTable();await page.evaluate(s=>{state=s;render();},view(room,a));await page.waitForFunction(()=>RunaHybrid.ready);
 H.check('canonical entry renders the same 3D scene',await page.evaluate(()=>!document.getElementById('game').hidden&&RunaHybrid.ready&&RunaPresentation.stats.adapters.includes('hybrid-scene')));
 await context.close();H.check('no page errors',H.errors.length===0,H.errors);
}finally{await browser.close();finish(out,'presentation-stage2',H,{report});}
