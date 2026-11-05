// V1 · focal cost of the sharp hover/detail faces: hovers 8 different hand cards twice and opens 4 details,
// recording long tasks (PerformanceObserver), the time until the hover face holds its final bitmap, and the
// frame gaps while hovering. Run once with the current files and once with V1_OVERRIDE_FILE (before).
// Usage: node scripts/v1-hover-cost.mjs <native|hybrid> <out.json> [width] [height] [dpr]
import fs from 'node:fs';import {createRequire} from 'node:module';
import {setup,card,view} from '../mesa-nova/r1-fixtures.mjs';
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/vanxf/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const [route='hybrid',out,W='1920',H='1080',D='1']=process.argv.slice(2);
const {room,a}=setup();const ids=['FL17','FV16','FV15','FV05','FL14','FL11','FV03','FL10'];a.hand=ids.map(id=>card(id,a));
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{const context=await browser.newContext({viewport:{width:+W,height:+H},deviceScaleFactor:+D});const allowed=new Set(['127.0.0.1','fonts.googleapis.com','fonts.gstatic.com']);await context.route('**/*',r=>allowed.has(new URL(r.request().url()).hostname)?r.continue():r.abort());
 const page=await context.newPage();
 for(const [p,file] of Object.entries(process.env.V1_OVERRIDE_FILE?JSON.parse(fs.readFileSync(process.env.V1_OVERRIDE_FILE,'utf8')):{})){const body=fs.readFileSync(file);await page.route('**'+p+'*',r=>r.fulfill({status:200,headers:{'cache-control':'no-store','content-type':p.endsWith('.css')?'text/css; charset=utf-8':'text/javascript; charset=utf-8'},body}));}
 await page.goto((process.env.QA_BASE||'http://127.0.0.1:3086')+'/runamarca/'+(route==='hybrid'?'hybrid/index.html':''));await page.waitForFunction(()=>typeof render==='function');await page.evaluate(()=>document.fonts.ready);
 await page.evaluate(s=>{state=s;render();},view(room,a));if(route==='hybrid')await page.waitForFunction(()=>window.RunaHybrid?.ready);await page.waitForTimeout(1500);
 await page.evaluate(()=>{window.__long=[];new PerformanceObserver(l=>{for(const e of l.getEntries())window.__long.push(e.duration);}).observe({type:'longtask'});window.__gaps=[];let last=performance.now();const tick=t=>{window.__gaps.push(t-last);last=t;requestAnimationFrame(tick);};requestAnimationFrame(tick);});
 const settle=[];
 for(let pass=0;pass<2;pass++)for(const c of a.hand){const box=await page.evaluate(uid=>{const n=document.querySelector(`#hand>.card[data-uid="${uid}"]`);const r=n.getBoundingClientRect();return {x:r.x+r.width/2,y:Math.min(innerHeight-4,r.y+r.height*.3)};},c.uid);
  await page.mouse.move(5,5);await page.waitForTimeout(120);const t0=await page.evaluate(()=>performance.now());await page.mouse.move(box.x,box.y);
  const done=await page.waitForFunction(()=>{const cv=document.querySelector('#hover-preview:not([hidden]) .card.big .card-art-canvas');if(!cv)return false;const r=cv.getBoundingClientRect();return cv.width<900||cv.width>=Math.round(r.width*devicePixelRatio)*2-1&&cv.width!==900;},null,{timeout:1500}).then(()=>true,()=>false);
  const t1=await page.evaluate(()=>performance.now());settle.push({card:c.modelId,pass,sharpMs:done?Math.round(t1-t0):null});await page.waitForTimeout(150);}
 await page.mouse.move(5,5);
 for(const c of a.hand.slice(0,4)){await page.evaluate(uid=>showCard(state.players[0].hand.find(x=>x.uid===uid)),c.uid);await page.waitForTimeout(400);await page.evaluate(()=>document.getElementById('card-detail').close?.());}
 const r=await page.evaluate(()=>({long:window.__long,gaps:window.__gaps.slice(2)}));const sorted=[...r.gaps].sort((x,y)=>x-y),q=p=>+sorted[Math.min(sorted.length-1,Math.floor(sorted.length*p))].toFixed(1);
 const result={route,viewport:[+W,+H],dpr:+D,override:Boolean(process.env.V1_OVERRIDE_FILE),longTasks:{count:r.long.length,totalMs:Math.round(r.long.reduce((s,x)=>s+x,0)),maxMs:Math.round(Math.max(0,...r.long))},frameGapMs:{p50:q(.5),p95:q(.95),max:+Math.max(...r.gaps).toFixed(1)},hoverSharpMs:settle,note:'Chrome headless; medição sem limite de aprovação.'};
 fs.writeFileSync(out,JSON.stringify(result,null,1));console.log(JSON.stringify({longTasks:result.longTasks,frameGapMs:result.frameGapMs,sharp:settle.filter(s=>s.sharpMs!==null).map(s=>s.sharpMs)}));
}finally{await browser.close();}
