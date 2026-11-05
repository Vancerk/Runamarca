// S2 — perfil de CPU (CDP) de atualizações de estado reais (render()) na rota híbrida.
// Uso: node scripts/s2-render-cpuprofile.mjs <pasta> [dpr]
import fs from 'node:fs';import {createRequire} from 'node:module';import {setup,card,unit,place,view} from '../mesa-nova/r1-fixtures.mjs';
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/vanxf/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const [out,dprArg='1']=process.argv.slice(2);fs.mkdirSync(out,{recursive:true});
const {room,a,b}=setup();for(const p of [a,b]){p.reserve=Array.from({length:8},()=>card('FV03',p));p.formation=p.reserve.slice(0,3).map(c=>c.uid);const es=[card('FV03',p),card('RG13',p)];p.reserve.push(...es);p.emanation=es.map(c=>c.uid);p.hand=Array.from({length:9},()=>card('FV03',p));place(p,unit(p),1);}
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{const context=await browser.newContext({viewport:{width:1920,height:900},deviceScaleFactor:Number(dprArg)});await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());const page=await context.newPage();
 await page.goto('http://127.0.0.1:3086/runamarca/hybrid/index.html');await page.waitForFunction(()=>typeof render==='function');
 await page.evaluate(s=>{state=s;serverClockOffset=Date.now()-s.serverNow;render();},view(room,a));await page.waitForFunction(()=>RunaHybrid?.ready);await page.waitForTimeout(1200);
 const cdp=await context.newCDPSession(page);await cdp.send('Profiler.enable');await cdp.send('Profiler.setSamplingInterval',{interval:100});await cdp.send('Profiler.start');
 const sync=[];for(let i=0;i<6;i++){sync.push(await page.evaluate(s=>{const t=performance.now();state=s;render();return performance.now()-t;},view(room,a)));await page.waitForTimeout(250);}
 const {profile}=await cdp.send('Profiler.stop');const dt=profile.timeDeltas,byId=new Map(profile.nodes.map(n=>[n.id,n])),self=new Map();
 profile.samples.forEach((id,i)=>{self.set(id,(self.get(id)||0)+(dt[i]||0));});const agg={};
 const parent=new Map();for(const n of profile.nodes)for(const c of n.children||[])parent.set(c,n.id);const frame=id=>{const f=byId.get(id).callFrame;return `${f.functionName||'(anon)'} ${f.url.split('/').slice(-2).join('/')}:${f.lineNumber+1}`;};const callers={};
 for(const [id,us] of self){const nf=byId.get(id).callFrame;if(!nf.url&&parent.has(id)&&!nf.functionName.startsWith('(')){const k=nf.functionName+' <- '+frame(parent.get(id));callers[k]=(callers[k]||0)+us/1000;}const f=nf,k=`${f.functionName||'(anon)'} ${f.url.split('/').slice(-2).join('/')}:${f.lineNumber+1}`;agg[k]=(agg[k]||0)+us/1000;}
 const top=Object.entries(agg).filter(([k])=>!/^\((idle|program|garbage collector)\)/.test(k)).sort((x,y)=>y[1]-x[1]).slice(0,25).map(([k,v])=>[k,+v.toFixed(1)]);
 const res={syncRenderMs:sync,top,callers:Object.entries(callers).sort((x,y)=>y[1]-x[1]).slice(0,14).map(([k,v])=>[k,+v.toFixed(1)]),gc:+(agg['(garbage collector) :0']||0).toFixed(1)};fs.writeFileSync(out+'/cpuprofile-summary.json',JSON.stringify(res,null,1));console.log(JSON.stringify(res));
}finally{await browser.close();}
