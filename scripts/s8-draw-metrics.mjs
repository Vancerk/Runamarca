// S8/R07: draw() metrics must include the readPixels sync. Focal check on 3086, 1920x900.
// Usage: node scripts/s8-draw-metrics.mjs <out-dir> [dpr]
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {setup,card,view} from '../mesa-nova/r1-fixtures.mjs';
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/vanxf/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const [out,dprArg]=process.argv.slice(2),dpr=Number(dprArg||1);fs.mkdirSync(out,{recursive:true});
const {room,a,b}=setup();for(const p of [a,b]){p.hand=Array.from({length:9},()=>card('FV03',p));p.reserve=Array.from({length:8},()=>card('FV03',p));}
const results=[],check=(name,ok,detail)=>{results.push({name,ok,detail});console.log((ok?'PASS ':'FAIL ')+name,JSON.stringify(detail??''));};
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{const context=await browser.newContext({viewport:{width:1920,height:900},deviceScaleFactor:dpr,reducedMotion:'reduce'});await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());const page=await context.newPage();
 await page.goto('http://127.0.0.1:3086/runamarca/hybrid/index.html');await page.waitForFunction(()=>typeof render==='function');await page.evaluate(s=>{state=s;render();},view(room,a));await page.waitForFunction(()=>RunaHybrid?.ready);await page.waitForTimeout(1000);
 const source=await page.evaluate(()=>fetch('/runamarca/hybrid/renderer.js',{cache:'no-store'}).then(r=>r.text()));
 // Wrap readPixels so the probe sees its position inside draw(), without changing what it does.
 await page.evaluate(()=>{const proto=WebGLRenderingContext.prototype,original=proto.readPixels;window.__syncReads=0;proto.readPixels=function(...args){window.__syncReads++;window.__syncAt=performance.now();return original.apply(this,args);};});
 const samples=[];for(let i=0;i<20;i++){const previous=await page.evaluate(()=>RunaHybrid.stats.builds);await page.evaluate(()=>RunaHybrid.sync());await page.waitForFunction(n=>RunaHybrid.stats.builds>n,previous);samples.push(await page.evaluate(()=>{const s=RunaHybrid.stats;return {cpuMs:s.cpuMs,drawMs:s.drawMs,submitMs:s.submitMs,syncMs:s.syncMs,bridgeMs:s.bridgeMs,syncReads:window.__syncReads};}));await page.waitForTimeout(75);}
 const fields=['drawMs','submitMs','syncMs','cpuMs'],finite=samples.every(s=>fields.every(k=>Number.isFinite(s[k])&&s[k]>=0));
 check('source served is the adjusted renderer',/syncMs:done-submitted/.test(source)&&/this\.timings\.push\(done-t\)/.test(source));
 check('draw() reports drawMs, submitMs, syncMs and cpuMs as finite numbers',finite,{fields});
 const worstSum=Math.max(...samples.map(s=>Math.abs(s.drawMs-(s.submitMs+s.syncMs))));
 check('drawMs = submitMs + syncMs (the total includes the sync)',worstSum<1e-6,{worstDifference:worstSum});
 check('one readPixels per build (sync still runs)',samples.every((s,i)=>i===0||s.syncReads-samples[i-1].syncReads>=1),{reads:samples.map(s=>s.syncReads)});
 check('drawMs never exceeds the bridge build that contains it',samples.every(s=>s.drawMs<=s.bridgeMs+1e-6),{});
 const pick=k=>{const v=samples.map(s=>s[k]).sort((x,y)=>x-y);return {median:v[Math.floor(v.length/2)],p95:v[Math.floor(v.length*.95)],max:v.at(-1)};};
 const summary={dpr,viewport:'1920x900',builds:samples.length,drawMs:pick('drawMs'),submitMs:pick('submitMs'),syncMs:pick('syncMs'),bridgeMs:pick('bridgeMs'),cpuMsLast:samples.at(-1).cpuMs,note:'Measurement only, no performance threshold: Chrome headless, CPU-side wall time of draw(); syncMs is the CPU wait for the queued GPU work.'};
 console.log(JSON.stringify(summary));
 fs.writeFileSync(out+'/draw-metrics-dpr'+dpr+'.json',JSON.stringify({summary,samples,results},null,2));
 const passed=results.filter(r=>r.ok).length;console.log(JSON.stringify({passed,total:results.length}));process.exitCode=passed===results.length?0:1;
}finally{await browser.close();}
