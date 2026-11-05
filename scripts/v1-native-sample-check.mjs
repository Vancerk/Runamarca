// V1 · native hand/board display samples: focal cost, hover opening and a card flight from the hand.
// Cost: 12 full render() calls of the table (fixture state, 9 hand cards + reserve), timing the synchronous render
// and the time until every visible face shows its painted sample; long tasks and frame gaps meanwhile. Run once
// with the current files and once with V1_OVERRIDE_FILE (before). Checks run only on the current files.
// Usage: node scripts/v1-native-sample-check.mjs <out.json> [width] [height] [dpr]
import fs from 'node:fs';import {createRequire} from 'node:module';
import {setup,card,view} from '../mesa-nova/r1-fixtures.mjs';
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/vanxf/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const [out,W='1920',H='1080',D='1']=process.argv.slice(2),before=Boolean(process.env.V1_OVERRIDE_FILE),base=process.env.QA_BASE||'http://127.0.0.1:3086';
const results=[],check=(name,ok,detail)=>{results.push({name,ok:Boolean(ok),detail});console.log((ok?'PASS ':'FAIL ')+name,JSON.stringify(detail??'').slice(0,400));};
const {room,a}=setup();const fl17=card('FL17',a),fv16=card('FV16',a);a.hand=[card('FV03',a),fl17,fv16,card('FL10',a),card('FV05',a),card('FL14',a),card('FV15',a),card('FL11',a),card('FV02',a)];a.reserve=[card('FL17',a),card('FV03',a)];
const inHand=view(room,a);a.hand=a.hand.filter(c=>c!==fl17);a.reserve.push(fl17);const inReserve=view(room,a);
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const result={before,viewport:[+W,+H],dpr:+D};
try{const context=await browser.newContext({viewport:{width:+W,height:+H},deviceScaleFactor:+D});const allowed=new Set(['127.0.0.1','fonts.googleapis.com','fonts.gstatic.com']);await context.route('**/*',r=>allowed.has(new URL(r.request().url()).hostname)?r.continue():r.abort());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const [p,file] of Object.entries(before?JSON.parse(fs.readFileSync(process.env.V1_OVERRIDE_FILE,'utf8')):{})){const body=fs.readFileSync(file);await page.route('**'+p+'*',r=>r.fulfill({status:200,headers:{'cache-control':'no-store','content-type':p.endsWith('.css')?'text/css; charset=utf-8':'text/javascript; charset=utf-8'},body}));}
 await page.goto(base+'/runamarca/');await page.waitForFunction(()=>typeof render==='function');await page.evaluate(()=>document.fonts.ready);
 await page.evaluate(s=>{state=s;render();},inHand);await page.waitForTimeout(1500);
 await page.evaluate(()=>{window.__long=[];new PerformanceObserver(l=>{for(const e of l.getEntries())window.__long.push(e.duration);}).observe({type:'longtask'});window.__gaps=[];let last=performance.now();const tick=t=>{window.__gaps.push(t-last);last=t;requestAnimationFrame(tick);};requestAnimationFrame(tick);});
 // cost: re-render the same table 12 times (each render rebuilds the card elements)
 const renders=[];for(let i=0;i<12;i++){renders.push(await page.evaluate(async s=>{const t0=performance.now();state={...s,revision:(s.revision||0)+Math.random()};render();const t1=performance.now();
   const faces=()=>[...document.querySelectorAll('#hand>.card,.reserve-camp .card')].filter(n=>n.querySelector('.card-art-canvas'));
   const done=()=>faces().every(n=>{const s=n.querySelector('.native-face-sample');return s?s.width>1:true;});
   while(!done()&&performance.now()-t0<3000)await new Promise(r=>requestAnimationFrame(r));
   return {renderMs:+(t1-t0).toFixed(1),readyMs:+(performance.now()-t0).toFixed(1),faces:faces().length,samples:document.querySelectorAll('.native-face-sample').length};},inHand));await page.waitForTimeout(120);}
 const g=await page.evaluate(()=>({long:window.__long,gaps:window.__gaps.slice(2)}));const sorted=[...g.gaps].sort((x,y)=>x-y),q=p=>+sorted[Math.min(sorted.length-1,Math.floor(sorted.length*p))].toFixed(1),med=k=>{const v=renders.map(r=>r[k]).sort((x,y)=>x-y);return {median:v[6],max:v.at(-1)};};
 result.cost={render:med('renderMs'),untilSamplesPainted:med('readyMs'),faces:renders[0].faces,samples:renders[0].samples,longTasks:{count:g.long.length,maxMs:Math.round(Math.max(0,...g.long))},frameGapMs:{p50:q(.5),p95:q(.95),max:+Math.max(...g.gaps).toFixed(1)},note:'Chrome headless; medição sem limite de aprovação.'};
 console.log('custo',JSON.stringify(result.cost));
 if(!before){
  // samples: every hand/reserve face shows its painted sample; the master stays 900 px and hidden
  const s=await page.evaluate(()=>[...document.querySelectorAll('#hand>.card,.reserve-camp .card')].filter(n=>n.querySelector('.card-art-canvas')).map(n=>{const m=n.querySelector('.card-art-canvas'),x=n.querySelector('.native-face-sample');const d=x&&x.width>1?x.getContext('2d').getImageData(0,0,x.width,x.height).data:null;let ink=0;if(d)for(let i=3;i<d.length;i+=4*61)ink+=d[i]>0;return {uid:n.dataset.uid,master:[m.width,m.height],masterHidden:getComputedStyle(m).visibility==='hidden',sample:x&&[x.width,x.height],sampleVisible:x&&getComputedStyle(x).visibility==='visible',painted:ink>0,perPx:x?+(x.width/(m.clientWidth*devicePixelRatio)).toFixed(2):null};}));
  check('mão e reserva mostram a amostra pintada (2× os pixels exibidos); o mestre continua 900 px e oculto',s.length>=10&&s.every(f=>f.sample&&f.sampleVisible&&f.painted&&f.masterHidden&&f.master[0]===900&&Math.abs(f.perPx-2)<.05),{faces:s.length,sample:s.find(f=>f.uid===fl17.uid)});
  // hover: the zoom card keeps the sharp path (no sample inside), opens and closes
  const box=await page.evaluate(uid=>{const r=document.querySelector(`#hand>.card[data-uid="${uid}"]`).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height*.3};},fl17.uid);
  await page.mouse.move(3,3);await page.mouse.move(box.x,box.y);const opened=await page.waitForFunction(()=>{const cv=document.querySelector('#hover-preview:not([hidden]) .card.big .card-art-canvas');return cv&&cv.width===Math.round(cv.getBoundingClientRect().width*devicePixelRatio);},null,{timeout:3000}).then(()=>true,()=>false);
  const hv=await page.evaluate(()=>{const big=document.querySelector('#hover-preview .card.big');return {samples:big?.querySelectorAll('.native-face-sample').length,canvas:big?.querySelector('.card-art-canvas')?.width};});
  await page.screenshot({path:out.replace(/\.json$/,'-hover.png'),scale:'device'});await page.mouse.move(3,3);await page.waitForTimeout(200);const closed=await page.evaluate(()=>document.getElementById('hover-preview').hidden);
  check('hover abre nítido sobre a mão amostrada e fecha',opened&&closed&&hv.samples===0,{...hv,closed});
  // flight: FL17 leaves the hand for the reserve through the native animateTransfer with a cloneVisual copy
  const flight=await page.evaluate(async([uid,next])=>{const node=document.querySelector(`#hand>.card[data-uid="${uid}"]`),rect=node.getBoundingClientRect(),copy=cloneVisual(node),c=state.players[0].hand.find(x=>x.uid===uid);
   const copyCanvases=[...copy.querySelectorAll('canvas')].map(x=>({cls:x.className,w:x.width,h:x.height}));
   state=next;render();const run=animateTransfer({uid,copy,rect,card:c});const samples=[];
   for(let i=0;i<40;i++){await new Promise(r=>setTimeout(r,25));const fly=[...document.body.children].find(n=>n!==copy&&n.contains?.(copy))||copy;if(copy.isConnected){const smp=copy.querySelector('.native-face-sample'),mst=copy.querySelector('.card-art-canvas'),r=copy.getBoundingClientRect();let ink=0;if(smp?.width>1){const d=smp.getContext('2d').getImageData(0,0,smp.width,smp.height).data;for(let k=3;k<d.length;k+=4*61)ink+=d[k]>0;}samples.push({t:i*25,grows:Boolean(copy.parentElement?.classList.contains('flight-grows')),x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),sampleVisible:smp&&getComputedStyle(smp).visibility==='visible',masterHidden:mst&&getComputedStyle(mst).visibility==='hidden',painted:ink>0});}}
   await run;const target=document.querySelector(`.reserve-camp .card[data-uid="${uid}"]`),ts=target?.querySelector('.native-face-sample');return {copyCanvases,samples,arrived:Boolean(target),targetSample:ts&&[ts.width,ts.height],targetVisible:target&&getComputedStyle(target).visibility};},[fl17.uid,inReserve]);
  const moving=flight.samples.filter(s=>s.sampleVisible!==undefined);
  check('voo da mão (encolhe, sem flight-grows): a cópia leva o mestre 900 px e a amostra pintada, visível durante o trajeto; a carta chega à reserva com a própria amostra',flight.copyCanvases.some(c=>c.cls==='card-art-canvas'&&c.w===900)&&flight.copyCanvases.some(c=>c.cls==='native-face-sample')&&moving.length>=2&&moving.every(s=>!s.grows&&s.sampleVisible&&s.masterHidden&&s.painted)&&new Set(moving.map(s=>s.x+','+s.y)).size>1&&flight.arrived&&flight.targetSample&&flight.targetVisible!=='hidden',{copyCanvases:flight.copyCanvases,frames:moving.length,first:moving[0],last:moving.at(-1),targetSample:flight.targetSample,targetVisible:flight.targetVisible});
  await page.screenshot({path:out.replace(/\.json$/,'-voo-final.png'),scale:'device'});
  check('sem erros de página',errors.length===0,{errors:errors.slice(0,5)});
 }
}finally{await browser.close();}
result.results=results;fs.writeFileSync(out,JSON.stringify(result,null,1));const passed=results.filter(r=>r.ok).length;console.log(JSON.stringify({passed,total:results.length}));process.exitCode=passed===results.length?0:1;
