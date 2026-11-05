import {act,catalog} from '../mesa-nova/r1-fixtures.mjs';
import {launch,open,paint,poll,setup,card,view,harness,finish,writeJSON,URL_NATIVE,URL_HYBRID} from './hybrid12-lib.mjs';
const out=process.env.HYBRID_QA_OUT,H=harness(out),runs=[],browser=await launch();
function install({actor,neighbor}){
 // Preserve identity on flat copies, whose production data-uid is deliberately removed.
 const clone=cloneVisual;cloneVisual=function(n){const c=clone(n);c.dataset.s3Actor=n.dataset.uid||n.dataset.s3Actor||'';return c;};
 const pixel=document.createElement('canvas');pixel.width=pixel.height=4;
 const ctx=pixel.getContext('2d',{willReadFrequently:true}),ready=new WeakSet();
 const visible=n=>n.checkVisibility({opacityProperty:true,visibilityProperty:true})&&n.getBoundingClientRect().width>0;
 const hasArt=n=>[...n.querySelectorAll('canvas')].some(cv=>{
  if(!visible(cv)||!cv.width||!cv.height)return false;if(ready.has(cv))return true;
  ctx.clearRect(0,0,4,4);ctx.drawImage(cv,0,0,4,4);const bytes=ctx.getImageData(0,0,4,4).data;
  if(!bytes.some((v,i)=>i%4===3&&v))return false;ready.add(cv);return true;
 });
 const inspect=uid=>{
  const selector='[data-uid="'+uid+'"],[data-s3-actor="'+uid+'"]';
  const nodes=[...document.querySelectorAll(selector)].filter(n=>n.matches('.card,.hybrid-motion-face')&&visible(n)&&!n.closest('#hover-preview,dialog'));
  const faces=nodes.filter(hasArt).map(n=>{const r=n.getBoundingClientRect();return {role:n.closest('.combat-return-card')?'return':n.closest('.hybrid-flight-portal,#visual-layer')?'flight':'table',x:r.x+r.width/2,y:r.y+r.height/2};});
  const originals=faces.filter(f=>f.role==='table').length,copies=faces.filter(f=>f.role!=='table');
  // The old/new face on one return carrier shares a single body. A transfer
  // cross-fades two copies at the same position, never two separate actors.
  const distinct=copies.length>1&&(copies.length>2||copies[0].role!==copies[1].role||copies[0].role!=='return'&&Math.hypot(copies[0].x-copies[1].x,copies[0].y-copies[1].y)>2);
  return {faces,originals,bodies:originals+(copies.length?distinct?2:1:0),bare:!!window.RunaHybrid?.slabs.includes(uid)&&!originals};
 };
 const frames=window.__reserveFrames=[];window.__watch='';
 const probe=document.createElement('i');probe.style.cssText='position:fixed;visibility:hidden;contain:strict;height:1px;top:0';document.body.append(probe);
 new ResizeObserver(()=>{if(!window.__watch)return;
  if(__watch==='entry'&&!state.players.some(p=>p.reserve.some(c=>c.uid===actor)))return;
  frames.push({stage:__watch,t:performance.now(),actor:inspect(actor),neighbor:inspect(neighbor),returnCopy:!!document.querySelector('[data-return-uid="'+actor+'"]')});
 }).observe(probe);let w=1;function tick(){probe.style.width=(w=3-w)+'px';requestAnimationFrame(tick);}requestAnimationFrame(tick);
}
try{
 for(const [route,url] of [['native',URL_NATIVE],['hybrid',URL_HYBRID]])for(const seat of ['a','b']){
  const label=route+'-'+seat;if(process.env.S3_ONLY&&!label.includes(process.env.S3_ONLY))continue;
  const {context,page}=await open(browser,{width:1440,height:900},{url,errors:H.errors,gpu:H.gpu});
  const {room,a,b}=setup(),me=seat==='a'?a:b,actor=card('FV03',a),neighbor=card('FL16',a);
  a.reserve=[neighbor];a.hand=[actor];b.hand=[card('FV03',b)];a.patron.returnStyle='gentle';const next=()=>view(room,me);
  let feed;
  try{
   await paint(page,next());await page.evaluate(install,{actor:actor.uid,neighbor:neighbor.uid});
   await page.evaluate(()=>window.__watch='entry');const move={type:'play',cardId:actor.uid};
   if(seat==='a'){await page.route('**/api/rooms/*/act',async r=>{act(room,a,r.request().postDataJSON(),catalog);await r.fulfill({json:next()});});await page.evaluate(d=>command(d,null,true),move);}
   else{act(room,a,move,catalog);await paint(page,next(),0);}
   await page.waitForTimeout(1700);await page.evaluate(()=>window.__watch='');
   room.phase='formation';a.formation=[null,actor.uid,null];await paint(page,next(),0);
   act(room,a,{type:'ready'},catalog);act(room,b,{type:'ready'},catalog);feed=poll(page,next);
   await page.waitForFunction(()=>state.combat?.timeline.at(-1)?.kind==='result');
   await page.evaluate(()=>window.__watch='return');await page.waitForFunction(()=>__reserveFrames.some(f=>f.returnCopy),null,{timeout:6000});
   await page.waitForFunction(()=>!document.querySelector('.combat-return-card'));await page.waitForTimeout(250);await feed.stop();
   const frames=await page.evaluate(()=>{window.__watch='';return __reserveFrames;});
   runs.push({label,actor:actor.uid,neighbor:neighbor.uid,frames});for(const stage of ['entry','return']){
    const samples=frames.filter(f=>f.stage===stage),bad=samples.filter(f=>[f.actor,f.neighbor].some(c=>c.bodies!==1||c.bare));
    H.check(label+' '+stage+' visible flight and restored reserve',samples.some(f=>f.actor.faces.some(p=>p.role===(stage==='entry'?'flight':'return')))&&samples.at(-1)?.actor.originals===1);
    H.check(label+' '+stage+' exactly one actor and neighbor with art, no empty frame or bare slab',samples.length>2&&!bad.length,{frames:samples.length,bad:bad.length,first:bad[0]});
   }
  }catch(e){H.check(label+' scenario finished',false,String(e));}
  finally{await feed?.stop();await context.close();writeJSON(out+'/reserve-detail.json',runs);}
 }
 H.check('no runtime/WebGL errors',!H.errors.length&&!H.gpu.length);
}finally{finish(out,'reserve',H);await browser.close();}
