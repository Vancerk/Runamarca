// V4 (item 19) · ataques na mesa híbrida, Full HD, assento A, motor real (r1-fixtures: ready → resolveCombat → views by
// polling only on revision change or during the combat). Every strike/clash animation (a .visual-card copy animated
// with Web Animations, contact cue at 42 %) is paused as soon as it is created and sought to 30 % (just before contact),
// 42 % (contact: the cue fires, impact and life change are applied for real) and 62 % (just after); a screenshot is
// taken at each, then the animation resumes at normal speed. For each frame: attacker UID (copy), the engine's target
// for that strike (timeline), the copy's leading point vs the target card / Patron on screen, the life shown on the
// target, and the enlarged hand card (hover) overlap with the contact and with the target.
// Scenes: creature×creature same position with an identical neighbour; creature×Patron; Taunt redirect with an
// identical neighbour. HOVER=<scene> keeps the pointer resting on a hand card during that scene.
// Usage: node scripts/v4-strike-frames.mjs <out-dir> [scene ...]
import fs from 'node:fs';import path from 'node:path';
import {harness,finish,chromium,CHROME} from './hybrid12-lib.mjs';
import {setup,place,card,act,catalog,view,resolveCombat} from '../mesa-nova/r1-fixtures.mjs';
const [out='prototype-qa/revisao-visual-20261103/v4/ataques',...only]=process.argv.slice(2),H=harness(out),{check}=H;fs.mkdirSync(out,{recursive:true});
const SCENES={
 'mesma-posicao':({a,b})=>{const at=place(a,card('FL06',a),1);place(a,card('FL04',a),2);const tg=place(b,card('FL06',b),1);const twin=place(b,card('FL06',b),2);return {attacker:at.uid,target:tg.uid,twin:twin.uid,label:'Anão estudioso (posição 2) × Anão estudioso rival na mesma posição; outro Anão estudioso igual na posição 3 rival'};},
 'patrono':({a,b})=>{const at=place(a,card('FL06',a),1);return {attacker:at.uid,target:'patron',label:'Anão estudioso (posição 2) × Patrono rival (posição rival vazia)'};},
 'redirecionado':({room,a,b})=>{const at=place(a,card('FL06',a),2);const twin=place(b,card('FL16',b),0);const tg=place(b,card('FL16',b),1);return {attacker:at.uid,target:tg.uid,twin:twin.uid,taunt:{cardId:tg.uid,lanes:[2]},label:'Anão estudioso (posição 3) atraído por Provocar: João Bobão rival na posição 2; outro João Bobão igual na posição 1'};},
};
async function scene(name,browser){
 const nativeRoute=process.env.V4_ROUTE==='native';
 const hoverOn=(process.env.HOVER||'').split(',').includes(name);
 const detailInput=process.env.V4_DETAIL;
 const t=setup(),{room,a,b}=t,viewer=process.env.V4_SEAT==='B'?b:a;
 viewer.hand=['FL10','RG07','FV08','FV14','FV03'].map(id=>card(id,viewer));room.matchId='v4-'+name;const info=SCENES[name](t);room.phase='formation';for(const p of room.players)p.ready=false;
 let detailCard;
 if(detailInput){
  const rival=viewer===a?b:a;
  detailCard=card('FL06',rival);rival.reserve.push(detailCard);
 }
 if(info.taunt)act(room,b,{type:'taunt',...info.taunt},catalog);
 const viewport=process.env.V4_VIEWPORT==='720p'?{width:1280,height:720}:{width:1920,height:1080};
 const ctx=await browser.newContext({viewport,hasTouch:detailInput==='tap'});await ctx.route('**/*',r=>{const u=new URL(r.request().url());if(!['127.0.0.1','fonts.googleapis.com','fonts.gstatic.com'].includes(u.hostname))return r.abort();if(process.env.BEFORE_HAND&&u.pathname==='/runamarca/hybrid/hand.js')return r.fulfill({status:200,headers:{'content-type':'text/javascript','cache-control':'no-store'},body:fs.readFileSync(process.env.BEFORE_HAND)});if(process.env.BEFORE_BRIDGE&&u.pathname==='/runamarca/hybrid/bridge.js')return r.fulfill({status:200,headers:{'content-type':'text/javascript','cache-control':'no-store'},body:fs.readFileSync(process.env.BEFORE_BRIDGE)});return r.continue();});
 const page=await ctx.newPage(),errors=[],frames=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto((process.env.QA_BASE||'http://127.0.0.1:3086')+(nativeRoute?'/runamarca/':'/runamarca/hybrid/index.html'));
 await page.waitForFunction(native=>typeof render==='function'&&(native||window.RunaHybridConfig),nativeRoute);await page.evaluate(()=>document.fonts.ready);
 let scenario=room,rev=-1,holding=false,holdAt=0,pushing=false;
 const push=async()=>{
  if(holding||pushing)return;
  if(scenario.phase==='resolving'&&Date.now()>=scenario.combat.startedAt+scenario.combat.duration){
   resolveCombat(scenario);scenario.combat=null;scenario.revision++;
  }
  if(scenario.revision===rev&&scenario.phase!=='resolving')return;
  rev=scenario.revision;pushing=true;
  try{
   const observedSeat=scenario.players.find(p=>p.id===viewer.id);
   const v={...view(scenario,observedSeat),serverNow:Date.now()};
   await page.evaluate(v=>{state=v;serverClockOffset=Date.now()-v.serverNow;render();},JSON.parse(JSON.stringify(v)));
  }finally{pushing=false;}
 };
 await push();if(!nativeRoute)await page.waitForFunction(()=>window.RunaHybrid?.ready);await page.evaluate(()=>Promise.all([...document.querySelectorAll('#game .card')].map(n=>n.visualReady)));await page.waitForTimeout(1200);
 let inspection=null,resumed=false,n=0;
 await page.exposeFunction('__shot',async label=>{
  const file=`${name}-${String(++n).padStart(2,'0')}-${label}.png`;
  await page.screenshot({path:path.join(out,file)});
  if(label==='depois'&&process.env.V4_RESUME==='1'&&inspection?.mode==='pointer'){
   await page.mouse.move(inspection.x+2,inspection.y);
   await page.waitForFunction(uid=>document.querySelector('#hover-preview:not([hidden])>.card.big')?.dataset.uid===uid,inspection.uid,{timeout:2500}).then(()=>{resumed=true},()=>{});
  }
  return file;
 });
 await page.exposeFunction('__frame',f=>{frames.push(f);});
 // The scene's server clock stops while a strike is held for its screenshots: no view is pushed and, on release, the
 // combat start is shifted by the held time, so the room does not resolve the combat under a paused presentation.
 await page.exposeFunction('__hold',on=>{if(on){holding=true;holdAt=Date.now();}else{scenario.combat.startedAt+=Date.now()-holdAt;holding=false;return scenario.combat.startedAt;}});
 if(process.env.DEBUG_VC)await page.evaluate(()=>{window.__vc=[];const o=window.visualCard;window.visualCard=function(src){const before=src.getBoundingClientRect();const c=o(src);const after=c.getBoundingClientRect(),cs=getComputedStyle(c);window.__vc.push({uid:src.dataset.uid,phase:state.phase,src:[before.x,before.y,before.width,before.height].map(v=>+v.toFixed(1)),style:[c.style.left,c.style.top],copy:[after.x,after.y,after.width,after.height].map(v=>+v.toFixed(1)),pos:cs.position,parent:c.parentElement?.id,parentRect:(()=>{const r=c.parentElement.getBoundingClientRect();return [r.x,r.y,r.width,r.height];})(),transform:cs.transform,zoomChain:(()=>{let z=[],e=c;while(e){const v=getComputedStyle(e).zoom;if(v&&v!=='1')z.push((e.id||e.className).toString().slice(0,30)+':'+v);e=e.parentElement;}return z;})()});return c;};});
 // settleAnimation() races the strike with a 1.55 s timer and then cancels it and removes the copy (finishVisual). The
 // capture holds a strike paused for several seconds to take its screenshots, so without this the timer removed the
 // copy mid-capture (copy missing at contact/after, source back on its socket). Only animations held by the capture
 // wait for their real end; every other animation keeps the app's own timeout.
 await page.evaluate(()=>{window.__held=new WeakSet();const settle=window.settleAnimation;window.settleAnimation=async function(animation,duration){if(!window.__held.has(animation))return settle(animation,duration);try{await Promise.race([animation.finished,new Promise(r=>setTimeout(r,30000))]);}catch{}finally{animation.cancel();}};});
 await page.evaluate(refresh=>{const orig=Element.prototype.animate;let group=null;
  const elapsed=window.combatElapsed;let heldElapsed=null;
  window.combatElapsed=battle=>heldElapsed??elapsed(battle);
  const waveCenters=new Map(),ellipse=CanvasRenderingContext2D.prototype.ellipse;
  CanvasRenderingContext2D.prototype.ellipse=function(x,y,...args){
   if(this.canvas.classList.contains('damage-fx-canvas'))waveCenters.set(x+','+y,{x,y});
   return ellipse.call(this,x,y,...args);
  };
  const R=n=>{const r=n?.getBoundingClientRect?.();return r&&r.width?{x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),cx:+(r.x+r.width/2).toFixed(1),cy:+(r.y+r.height/2).toFixed(1)}:null;};
  const lifeOf=uid=>{const n=uid==='patron:rival'?document.querySelector('#opponent-head .patron-card'):document.querySelector(`#game [data-uid="${uid}"]`);if(!n)return null;const t=n.querySelector('.health-value,.card-stats-svg .health,.patron-hp,.hp')||n.querySelector('[class*=health]');return t?.textContent?.trim()||null;};
  async function capture(g){for(const x of g)x.a.pause();heldElapsed=elapsed(state.combat);await window.__hold(true);const step=state.combat?.timeline?.find(s=>(s.strike&&(s.strike.sourceId===g[0].uid||g.some(x=>x.uid===s.strike.sourceId)))||(s.kind==='clash'&&g.some(x=>state.combat.visual?.find(e=>e.lane===s.lane)?.cards.some(c=>c?.uid===x.uid))));
   const me=state.you,rival=state.players.find(p=>p.id!==me).id,entry=step?.kind==='clash'?state.combat.visual?.find(e=>e.lane===step.lane):null,single=entry&&entry.cards.filter(Boolean).length===1?entry.cards.find(Boolean):null,strike=step?.strike||(single?{sourceId:single.uid,targetId:null,targetOwner:single.owner===me?rival:me,lane:step.lane,targetLane:step.lane,amount:single.attack}:null);
   for(const x of g)x.a.currentTime=0;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const origin=g.map(x=>{const node=document.querySelector(`#lanes .lane-side .card[data-uid="${x.uid}"]`);return {uid:x.uid,copyAt0:R(x.el),node:R(node),face:R(node?.querySelector('.hybrid-card-face')),copyFace:R(x.el.querySelector('.hybrid-card-face')),keyframes:x.a.effect.getKeyframes().map(k=>k.transform)};});window.__frame({label:'origem',origin});
   for(const [label,f] of [['antes',.30],['contato',.42],['depois',.62]]){
    // Exercise the normal view redraw between wind-up and contact, even when
    // the room happens to deliver no revision in this narrow time window.
    if(label==='contato'){if(refresh)render();waveCenters.clear();}
    for(const x of g)x.a.currentTime=f*x.duration;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const copies=g.map(x=>({uid:x.uid,own:state.players.find(p=>p.id===me).reserve.some(c=>c.uid===x.uid),rect:R(x.el)})),hover=R(document.querySelector('#hover-preview:not([hidden]) .card,#hover-preview:not([hidden])')),
     target=strike?(strike.targetId?{uid:strike.targetId,rect:R(document.querySelector(`#lanes [data-uid="${strike.targetId}"],#game .combat-emanation [data-uid="${strike.targetId}"]`)),life:lifeOf(strike.targetId)}:{uid:'patron:'+(strike.targetOwner===me?'own':'rival'),rect:R(document.querySelector(strike.targetOwner===me?'#self-head .patron-card':'#opponent-head .patron-card')),life:document.querySelector(strike.targetOwner===me?'#self-head':'#opponent-head')?.querySelector('.patron-hp,.hp,[class*=heart],[class*=health]')?.textContent?.trim()||null}):null;
    const twin=window.__twin?{uid:window.__twin,rect:R(document.querySelector(`#lanes [data-uid="${window.__twin}"]`)),life:lifeOf(window.__twin)}:null;
    const focusUid=document.activeElement?.dataset.uid,detailUid=document.querySelector('#card-detail[open] .card.big')?.dataset.uid;
    const file=await window.__shot(label);
    window.__frame({label,fraction:f,file,twin,live:g.map(x=>x.el.isConnected),phase:state.phase,step:step?{kind:step.kind,lane:step.lane}:null,strike:strike&&{sourceId:strike.sourceId,targetId:strike.targetId,targetLane:strike.targetLane,lane:strike.lane,amount:strike.amount,pair:Boolean(strike.pair)},copies,target,hover,focusUid,detailUid,waveCenters:[...waveCenters.values()]});}
   state.combat.startedAt=await window.__hold(false);heldElapsed=null;for(const x of g)x.a.play();}
  Element.prototype.animate=function(frames,opts){const a=orig.call(this,frames,opts);try{if(this.classList?.contains('visual-card')&&Array.isArray(frames)&&frames.length>=4&&opts?.easing==='linear'&&(opts.duration||0)>=1100&&state?.phase==='resolving'){if(!group){group=[];queueMicrotask(()=>{const g=group;group=null;capture(g);});}window.__held.add(a);group.push({a,el:this,uid:this.dataset.uid,duration:opts.duration});}}catch{}return a;};},process.env.V4_REFRESH_ON_WINDUP==='1');
 if(process.env.DEBUG_HOVER)await page.evaluate(()=>{const log=window.__hlog=[],t0=performance.now(),T=()=>Math.round(performance.now()-t0),holder=document.getElementById('hover-preview'),hand=document.getElementById('hand');
  new MutationObserver(m=>log.push({t:T(),k:'holder',transform:holder.style.transform,cls:holder.className,hidden:holder.hidden,stats:window.RunaHybridHand?.stats.activeSource})).observe(holder,{attributes:true,attributeFilter:['style','class','hidden']});
  new MutationObserver(m=>log.push({t:T(),k:'hand',added:m.reduce((n,x)=>n+x.addedNodes.length,0),removed:m.reduce((n,x)=>n+x.removedNodes.length,0),phase:state.phase,stack:new Error().stack.split(String.fromCharCode(10)).slice(1,4).join('|')})).observe(hand,{childList:true});
  for(const name of ['moveHover','showHover','hideHover','render']){const o=window[name];window[name]=function(...a){log.push({t:T(),k:name,ev:a.find(x=>x&&x.type)?.type||null,src:window.RunaHybridHand?.stats.activeSource,stack:name==='render'?null:new Error().stack.split(String.fromCharCode(10)).slice(2,5).join('|')});return o.apply(this,a);};}});
 if(hoverOn){
  const cards=page.locator('#hand>.hand-card');
  const p=await cards.nth(-2).evaluate(node=>{const r=node.getBoundingClientRect();return {uid:node.dataset.uid,x:r.x+r.width/2,y:Math.min(innerHeight-8,r.y+r.height*.3)};});
  const mode=process.env.V4_READING||'pointer';
  if(mode==='keyboard'){await cards.nth(-3).focus();await page.keyboard.press('Tab');}
  else await page.mouse.move(p.x,p.y);
  await page.waitForFunction(uid=>document.querySelector('#hover-preview:not([hidden])>.card.big')?.dataset.uid===uid,p.uid);
  await page.waitForTimeout(300);inspection={...p,mode};
 }
 if(detailCard){
  const button=page.locator(`#opponent-reserve .card[data-uid="${detailCard.uid}"]`);
  if(detailInput==='tap')await button.tap();else await button.click();
  await page.locator('#card-detail[open]').waitFor();
 }
 await page.evaluate(t=>{window.__twin=t||null;},info.twin);
 act(room,a,{type:'ready'},catalog);act(room,b,{type:'ready'},catalog);const timeline=room.combat.timeline.map(s=>({kind:s.kind,lane:s.lane,strike:s.strike&&{sourceId:s.strike.sourceId,targetId:s.strike.targetId,targetLane:s.strike.targetLane,lane:s.strike.lane}}));
 // The engine installs a real-time end timer on the original room. Screenshot
 // holds extend only this detached fixture; resolveCombat still resolves it.
 scenario=structuredClone({...room,onChange:null,botTimer:null});
 const feed=setInterval(()=>{push().catch(e=>errors.push(e.message));},150),deadline=Date.now()+60000;
 while(Date.now()<deadline){if((await page.evaluate(()=>state.phase))==='prep')break;await page.waitForTimeout(200);}clearInterval(feed);
 if(scenario.phase!=='prep')errors.push('Capture did not reach the next preparation');
 await page.waitForTimeout(300);
 if(detailCard){
  const close=page.locator('#close-detail');
  if(detailInput==='tap')await close.tap();else await close.click();
  await page.locator('#card-detail').waitFor({state:'hidden'});
 }
 const end=await page.evaluate(()=>({phase:state.phase,vc:window.__vc||null,hlog:window.__hlog||null}));await ctx.close();return {name,route:nativeRoute?'native':'hybrid',viewer:viewer===a?'A':'B',viewport,info,timeline,frames,errors,end,hoverOn,inspection,detailInput,detailUid:detailCard?.uid,resumeTested:process.env.V4_RESUME==='1',resumed};}
// Re-evaluate the actual recorded origins as well as the contact. A copy that
// starts on the wrong row can still travel to the right target and deal damage.
const saved=process.env.V4_STRIKE_RECORD;
const report=saved?JSON.parse(fs.readFileSync(saved,'utf8')):{};
const browser=saved?null:await chromium.launch({executablePath:process.env.QA_BROWSER||CHROME,headless:true});
const overlap=(a,b)=>a&&b?Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)):0;
for(const name of Object.keys(saved?report:SCENES)){if(only.length&&!only.includes(name))continue;const r=saved?report[name]:await scene(name,browser);report[name]=r;
 const origins=r.frames.flatMap(frame=>frame.origin||[]).map(({uid,copyAt0,face,node})=>{
  const surface=r.route==='native'?node:face;
  return {uid,dx:surface&&copyAt0?copyAt0.cx-surface.cx:null,dy:surface&&copyAt0?copyAt0.cy-surface.cy:null};
 });
 const animatedUids=new Set(r.frames.flatMap(frame=>(frame.copies||[]).map(copy=>copy.uid)));
 check(name+': every copy starts on its own projected face (1 CSS px per axis)',
  origins.length>0&&[...animatedUids].every(uid=>origins.some(origin=>origin.uid===uid))&&
  origins.every(p=>Number.isFinite(p.dx)&&Number.isFinite(p.dy)&&Math.abs(p.dx)<=1&&Math.abs(p.dy)<=1),origins);
 const mine=r.frames.filter(f=>f.label!=='origem'&&(f.strike?.sourceId===r.info.attacker||f.copies.some(c=>c.uid===r.info.attacker)));const contact=mine.find(f=>f.label==='contato'),before=mine.find(f=>f.label==='antes');
 const engineTarget=r.timeline.find(s=>s.strike?.sourceId===r.info.attacker)?.strike?.targetId??(r.timeline.some(s=>s.kind==='clash')?null:undefined);
 check(`${name}: three live frames (before, contact, after) of the attacker's strike`,mine.map(f=>f.label).join(',')==='antes,contato,depois'&&mine.every(f=>f.phase==='resolving'&&f.live?.length===f.copies.length&&f.live.every(Boolean)),{frames:mine.map(f=>[f.label,f.live])});
 check(`${name}: engine target = expected (${r.info.target==='patron'?'Patron':'card '+r.info.target.slice(-3)})`,r.info.target==='patron'?r.timeline.some(s=>s.kind==='clash'&&s.lane===contact?.step?.lane)&&contact?.strike?.sourceId===r.info.attacker&&!contact?.strike?.targetId:engineTarget===r.info.target,{engineTarget,expected:r.info.target,timeline:r.timeline});
 if(contact){const copy=contact.copies.find(c=>c.uid===r.info.attacker)||contact.copies[0],lead={x:copy.rect.cx,y:copy.own?copy.rect.y:copy.rect.y+copy.rect.h},tr=contact.copies.find(c=>c.uid===contact.target?.uid)?.rect??contact.target?.rect,gap=(p,q)=>p&&q?Math.hypot(Math.max(0,q.x-(p.x+p.w),p.x-(q.x+q.w)),Math.max(0,q.y-(p.y+p.h),p.y-(q.y+q.h))):null;
  const expectedTarget=r.info.target==='patron'?'patron:'+(copy.own?'rival':'own'):r.info.target;
  check(name+': damage at contact on the expected UID, identical neighbour untouched',
   contact.target?.uid===expectedTarget&&before?.target?.life!=null&&contact.target?.life!=null&&
   contact.strike?.amount>0&&Number(contact.target.life)===Math.max(0,Number(before.target.life)-contact.strike.amount)&&
   (!r.info.twin||(before.twin?.uid===r.info.twin&&before.twin.life!=null&&contact.twin?.life===before.twin.life&&overlap(copy.rect,contact.twin.rect)===0)),
   {expectedTarget,lifeBefore:before?.target?.life,lifeAtContact:contact.target?.life,twin:contact.twin});
  r.measure={attackerCopy:copy.rect,targetRect:tr,leadingPoint:lead,distanceToTarget:gap(copy.rect,tr),overlapWithTarget:overlap(copy.rect,tr),hoverOverTarget:overlap(contact.hover,tr),hoverOverCopy:overlap(contact.hover,copy.rect),lifeBefore:before?.target?.life,lifeAtContact:contact.target?.life};
  check(`${name}: at contact the attacker's copy touches the engine's target on screen (rectangle gap ≤ 12 px)`,tr&&r.measure.distanceToTarget<=12,r.measure);}
 if(!saved||contact?.waveCenters){
  const strikes=r.frames.filter(f=>f.label==='contato');
  const within=(p,rect)=>rect&&p.x>=rect.x&&p.x<=rect.x+rect.w&&p.y>=rect.y&&p.y<=rect.y+rect.h;
  check(name+': impact rings drawn inside the struck faces',strikes.length>0&&strikes.every(f=>{
   const faces=f.strike?.pair?f.copies.map(c=>c.rect):[f.target?.rect];
   return f.waveCenters?.length&&faces.every(rect=>f.waveCenters.some(p=>within(p,rect)))&&f.waveCenters.every(p=>faces.some(rect=>within(p,rect)));
  }),strikes.map(f=>({waves:f.waveCenters,uid:f.target?.uid})));
 }
 if(r.detailUid)check(name+': the card opened by '+r.detailInput+' stays in its dialog until closed by the player',mine.length===3&&mine.every(f=>f.detailUid===r.detailUid),mine.map(f=>f.detailUid));
 if(r.hoverOn){
  const contacts=r.frames.filter(f=>f.label==='contato').map(f=>({
   hover:f.hover,overCopies:f.copies.map(c=>overlap(f.hover,c.rect)),
   targetCoveredPct:100*overlap(f.hover,f.target?.rect)/(f.target.rect.w*f.target.rect.h)
  }));
  r.hoverContacts=contacts;
  check(name+': the player opened the hand reading',Boolean(r.inspection)||contacts.some(c=>c.hover),r.inspection||contacts);
  if(r.inspection?.mode==='keyboard'){
   check(name+': deliberate reading stays open through the strike',mine.every(f=>f.hover&&f.focusUid===r.inspection.uid),mine.map(f=>f.focusUid));
  }else{
   check(name+': the passive reading leaves contact and target visible',contacts.every(c=>c.overCopies.every(v=>v===0)&&c.targetCoveredPct<=3),contacts);
   if(r.resumeTested)check(name+': reading stays dismissed through recoil and reopens on movement within the same hand card',mine.every(f=>!f.hover)&&r.resumed,{resumed:r.resumed});
   if(name==='patrono'&&r.viewer==='A'&&r.viewport.width===1920)check(name+': unobstructed reading stays visible',mine.every(f=>f.hover),contacts);
  }
 }
 check(`${name}: no page errors`,!r.errors.length,r.errors);}
await browser?.close();
if(!saved)fs.writeFileSync(path.join(out,'ataques.json'),JSON.stringify(report,null,1));
finish(out,saved?'veredito':'v4-strike-frames',H,saved?{record:saved}:{report});
