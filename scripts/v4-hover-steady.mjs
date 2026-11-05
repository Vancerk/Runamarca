// V4 (item 19, ponteiro parado sobre a mão) · deterministic probe of the enlarged hand card while the table re-renders.
// During a combat every view re-renders the hand; with the pointer resting on a hand card the preview is shown again
// and its intro restarts. The probe hovers a card, then re-renders the same state 40 times at irregular intervals
// (40–140 ms, as the room polling does) and samples the enlarged card on every animation frame, after its intro has
// ended (frames where the intro is running are reported apart). Every settled placement must equal the resting one.
// BEFORE_HAND=<file> serves another mesa-nova/hybrid/hand.js (the version before the fix) for the comparison.
// Usage: node scripts/v4-hover-steady.mjs <out-dir>
import fs from 'node:fs';import path from 'node:path';
import {harness,finish,chromium,CHROME} from './hybrid12-lib.mjs';
import {setup,place,card,view} from '../mesa-nova/r1-fixtures.mjs';
const [out='prototype-qa/revisao-visual-20261103/v4/carta-ampliada']=process.argv.slice(2),H=harness(out),{check}=H;fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.QA_BROWSER||CHROME,headless:true});const report={};
try{
 const {room,a,b}=setup();a.hand=['FL10','RG07','FV08','FV14','FV03'].map(id=>card(id,a));place(a,card('FL06',a),1);place(b,card('FL06',b),1);room.matchId='v4-hover';
 const ctx=await browser.newContext({viewport:{width:1920,height:1080}});await ctx.route('**/*',r=>{const u=new URL(r.request().url());if(!['127.0.0.1','fonts.googleapis.com','fonts.gstatic.com'].includes(u.hostname))return r.abort();if(process.env.BEFORE_HAND&&u.pathname==='/runamarca/hybrid/hand.js')return r.fulfill({status:200,headers:{'content-type':'text/javascript','cache-control':'no-store'},body:fs.readFileSync(process.env.BEFORE_HAND)});return r.continue();});
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto((process.env.QA_BASE||'http://127.0.0.1:3086')+'/runamarca/hybrid/index.html');await page.waitForFunction(()=>typeof render==='function'&&window.RunaHybridConfig);await page.evaluate(()=>document.fonts.ready);
 await page.evaluate(v=>{state=v;serverClockOffset=Date.now()-v.serverNow;render();},{...JSON.parse(JSON.stringify(view(room,a))),serverNow:Date.now()});
 await page.waitForFunction(()=>window.RunaHybrid?.ready);await page.evaluate(()=>Promise.all([...document.querySelectorAll('#game .card')].map(n=>n.visualReady)));await page.waitForTimeout(1000);
 const p=await page.evaluate(()=>{const cards=[...document.querySelectorAll('#hand>.card')],n=cards[cards.length-2];const r=n.getBoundingClientRect();return {x:r.x+r.width/2,y:Math.min(innerHeight-8,r.y+r.height*.3)};});
 // MODE=keyboard opens the consultation by keyboard focus on the same hand card (onfocus → showHover) instead of the pointer.
 const keyboard=process.env.MODE==='keyboard',cards=page.locator('#hand>.hand-card');
 const expectedUid=await cards.nth(-2).getAttribute('data-uid');
 if(keyboard){await cards.nth(-3).focus();await page.keyboard.press('Tab');}
 else await page.mouse.move(p.x,p.y);
 await page.waitForTimeout(700);
 const R=()=>page.evaluate(()=>{const h=document.getElementById('hover-preview'),r=h.getBoundingClientRect();return {hidden:h.hidden,x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1)};});
 const rest=await R();await page.screenshot({path:path.join(out,'01-repouso.png')});
 const r=await page.evaluate(async()=>{const h=document.getElementById('hover-preview'),samples=[];let on=true;const intro=()=>(h.querySelector(':scope>.card.big')?.getAnimations()||[]).some(a=>a.playState==='running'&&a.effect?.getKeyframes?.().some(k=>k.translate));
  (function tick(){if(!on)return;const r=h.getBoundingClientRect();samples.push({t:Math.round(performance.now()),hidden:h.hidden,intro:intro(),focus:document.activeElement?.dataset.uid,uid:h.querySelector(':scope>.card.big')?.dataset.uid,x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1)});requestAnimationFrame(tick);})();
  const gaps=[40,70,95,110,130,60,85,140,45,120];const before=window.RunaHybridHand.stats.intros;
  for(let i=0;i<40;i++){render();await new Promise(r=>setTimeout(r,gaps[i%gaps.length]));}
  await new Promise(r=>setTimeout(r,600));on=false;return {samples,intros:window.RunaHybridHand.stats.intros-before};});
 const after=await R();await page.screenshot({path:path.join(out,'02-depois-de-40-renders.png')});
 const key=s=>`${Math.round(s.x)},${Math.round(s.y)} ${Math.round(s.w)}×${Math.round(s.h)}`,settled=r.samples.filter(s=>!s.hidden&&!s.intro),counts={};for(const s of settled)counts[key(s)]=(counts[key(s)]||0)+1;
 const off=settled.filter(s=>Math.abs(s.x-rest.x)>1||Math.abs(s.y-rest.y)>1||Math.abs(s.w-rest.w)>1||Math.abs(s.h-rest.h)>1),worst=off.reduce((m,s)=>Math.max(m,Math.abs(s.y-rest.y),Math.abs(s.x-rest.x)),0);
 Object.assign(report,{mode:process.env.MODE||'pointer',handJs:process.env.BEFORE_HAND||'mesa-nova/hybrid/hand.js',rest,after,frames:r.samples.length,settledFrames:settled.length,introFrames:r.samples.filter(s=>s.intro).length,hiddenFrames:r.samples.filter(s=>s.hidden).length,intros:r.intros,placements:counts,offFrames:off.length,worstOffsetPx:+worst.toFixed(1),firstOff:off.slice(0,5)});
 check('the same enlarged card stays visible on every frame',!rest.hidden&&!after.hidden&&r.samples.every(s=>!s.hidden&&s.uid===expectedUid),{rest,after,hiddenFrames:report.hiddenFrames});
 check('every settled frame keeps the resting placement (±1 px) across 40 re-renders',settled.length>0&&off.length===0,{offFrames:off.length,worstOffsetPx:report.worstOffsetPx,placements:counts});
 check('refreshing the same card never replays its entrance',r.intros===0&&report.introFrames===0,{intros:r.intros,introFrames:report.introFrames});
 if(keyboard){
  check('keyboard focus stays on the same hand UID',r.samples.every(s=>s.focus===expectedUid),{expectedUid});
  const next=await cards.last().getAttribute('data-uid');
  await page.keyboard.press('Tab');await page.waitForTimeout(180);
  check('Tab moves on to the next card',await page.evaluate(uid=>document.activeElement.dataset.uid===uid&&document.querySelector('#hover-preview:not([hidden])>.big')?.dataset.uid===uid,next),{next});
 }else{
  await page.mouse.move(10,10);await page.waitForTimeout(180);
  check('leaving the hand closes the reading and reveals its original',await page.evaluate(()=>document.querySelector('#hover-preview').hidden&&!document.querySelector('#hand .hybrid-hover-source')),{});
 }
 check('no page errors',!errors.length,errors);
 await ctx.close();
}finally{await browser.close();}
fs.writeFileSync(path.join(out,'carta-ampliada.json'),JSON.stringify(report,null,1));finish(out,'v4-hover-steady',H,{report});
