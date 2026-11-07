// Normal-speed transfer with the real local engine. No paused animation or altered clock.
import fs from 'node:fs';import path from 'node:path';import {spawn} from 'node:child_process';
const out=process.argv[2];if(!out||fs.existsSync(out))throw Error('fresh output directory required');fs.mkdirSync(out,{recursive:true});
process.env.QA_BASE='http://127.0.0.1:3132';process.env.QA_BROWSER??='C:/Program Files/Google/Chrome/Application/chrome.exe';
const {launch,paint,captureTable,view,catalog}=await import('./hybrid12-lib.mjs');const {act}=await import('../mesa-nova/game.mjs');
const baseline=path.resolve('prototype-qa/codex-voos-fluidez-20261107/source-before'),types={'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json'},result={checks:[],errors:[],cases:[]};
const check=(name,pass,detail)=>{result.checks.push({name,pass:!!pass,detail});console.log(pass?'ok':'FAIL',name);};
const server=spawn(process.execPath,['scripts/board-prototype-server.mjs'],{windowsHide:true,stdio:'ignore',env:{...process.env,PROTOTYPE_PORT:'3132',RUNAMARCA_FEEDBACK_DIR:path.join(out,'store')}});let browser;
try{
 let ready=false;for(let i=0;i<100;i++){try{if((await fetch(process.env.QA_BASE+'/health')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}if(!ready)throw Error('QA server unavailable');
 const cases=[{label:'before-1',before:true},{label:'after-1'},{label:'before-2',before:true},{label:'after-2'},{label:'dpr2',dpr:2},{label:'without-worker',noWorker:true},{label:'reduced',reduced:true}];
 for(const variant of cases){
  browser=await launch();const context=await browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:variant.dpr||1,reducedMotion:variant.reduced?'reduce':'no-preference'}),f=captureTable();f.a.mana=10;f.a.reserve=f.a.reserve.slice(0,2);let commands=0;
  await context.route('**/*',route=>{
   const u=new URL(route.request().url());if(u.hostname!=='127.0.0.1')return route.abort();
   if(u.pathname.endsWith('/act')){try{act(f.room,f.a,route.request().postDataJSON(),catalog);commands++;return route.fulfill({json:view(f.room,f.a)});}catch(e){return route.fulfill({status:400,json:{error:e.message}});}}
   if(u.pathname.startsWith('/runamarca/')){const rel='mesa-nova/'+(u.pathname.slice(11)||'index.html'),src=variant.before?path.join(baseline,rel):rel;if(types[path.extname(rel)]&&fs.existsSync(src)){let body=fs.readFileSync(src);if(variant.noWorker&&rel.endsWith('/resample.js'))body=body.toString().replace('let worker=null,','let worker=false,');return route.fulfill({body,contentType:types[path.extname(rel)]});}}return route.continue();
  });
  const page=await context.newPage();page.on('pageerror',e=>result.errors.push(variant.label+': '+e.message));await page.goto(process.env.QA_BASE+'/runamarca/');await page.waitForFunction(()=>window.RunaHybrid&&typeof render==='function');await paint(page,view(f.room,f.a),1700);
  await page.evaluate(()=>{
   window.__flightRun={frames:[],animations:[],long:[]};let running=true,last=performance.now();const r=__flightRun;
   const observer=new PerformanceObserver(list=>r.long.push(...list.getEntries().map(e=>({at:e.startTime,ms:e.duration}))));observer.observe({type:'longtask'});
   const tick=t=>{r.frames.push({at:t,dt:t-last});last=t;if(running)requestAnimationFrame(tick);};requestAnimationFrame(tick);
   r.stop=()=>{running=false;observer.disconnect();};const original=Element.prototype.animate;
   Element.prototype.animate=function(frames,options){const a=original.call(this,frames,options);if(this.matches('.hybrid-motion-face')&&frames[0].opacity!==undefined){const item={start:performance.now(),duration:options.duration,sizes:[]};r.animations.push(item);const watch=()=>{if(!this.isConnected||a.playState==='finished'||a.playState==='idle')return;const c=this.querySelector('.card-art-canvas'),size=c.width+'x'+c.height;if(item.sizes.at(-1)!==size)item.sizes.push(size);requestAnimationFrame(watch);};watch();a.finished.then(()=>item.end=performance.now(),()=>item.cancelled=true);}return a;};
  });
  const uid=await page.evaluate(()=>[...document.querySelectorAll('#hand>.hand-card')].reverse().find(n=>seat().hand.find(c=>c.uid===n.dataset.uid)?.type==='creature')?.dataset.uid);if(!uid)throw Error('fixture has no creature');
  await page.evaluate(id=>command({type:'play',cardId:id}),uid);await page.waitForFunction(()=>!RunaCardArrivals.blocked&&!RunaHybridFlights.stats.active.length&&!RunaHybridLifecycle.stats.movingNeighbors);await page.waitForTimeout(100);
  const data=await page.evaluate(uid=>{const r=__flightRun;r.stop();const start=Math.min(...r.animations.map(a=>a.start)),end=Math.max(...r.animations.map(a=>a.end)),frames=r.frames.filter(f=>f.at>=start&&f.at<=end),d=frames.map(f=>f.dt).sort((a,b)=>a-b),stats=window.RunaMotionSampling?.stats,n=tableCard(uid);return {animations:r.animations,frameCount:d.length,p95:d[Math.floor(d.length*.95)],max:d.at(-1),long:r.long.filter(e=>e.at>=start&&e.at<=end),stats,resample:window.RunaResample.stats,remaining:document.querySelectorAll('.hybrid-motion-face,.hybrid-flight-carrier').length,inReserve:seat().reserve.some(c=>c.uid===uid),visible:!!n&&getComputedStyle(n).visibility!=='hidden',frames};},uid);
  result.cases.push({variant,commands,...data});check(variant.label+': exactly one legal play arrives visibly in reserve',commands===1&&data.inReserve&&data.visible);
  check(variant.label+': both faces finish at normal speed without cancellation',data.animations.length===2&&data.animations.every(a=>a.end&&!a.cancelled&&a.end-a.start>=a.duration-35),data.animations);
  check(variant.label+': flight copies and sampling loops are released',data.remaining===0&&(!data.stats||data.stats.active===0),{remaining:data.remaining,stats:data.stats});
  if(!variant.before)check(variant.label+': motion uses filtered images instead of only the master',data.animations.some(a=>a.sizes.some(s=>!s.startsWith('900x'))),data.animations.map(a=>a.sizes));
  if(variant.noWorker)check('unavailable worker retains a painted fast sample',data.resample.worker==='off'&&data.visible,data.resample);
  await context.close();await browser.close();browser=null;fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(result,null,2));
 }
 check('no page errors',result.errors.length===0,result.errors);
}finally{await browser?.close();server.kill();fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(result,null,2));}
if(result.errors.length||result.checks.some(c=>!c.pass))process.exitCode=1;
