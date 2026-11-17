// Rodada 3 (11/11/2026) · fluidez das transições, com o motor real em processo. Para cada ação comum mede: tempo até a
// resposta do servidor (LATENCY simulada), intervalos entre quadros do navegador nos 2,5 s seguintes e, com PROFILE=1,
// as funções que ocuparam as pausas acima de 50 ms. QA_BASE aponta a versão medida.
// Uso: node scripts/rodada3-fluidez.mjs <out-dir>   LATENCY=ms (padrão 80)  PROFILE=1  RUNS=n  TRACE=1  FILTERS=1
// FILTERS=1 lista os filtros CSS visíveis nos primeiros 800 ms; a varredura lê o layout de todos os elementos e
// pesa nas próprias pausas, por isso fica desligada nas medições de tempo.
import fs from 'node:fs';import path from 'node:path';
import {chromium,CHROME} from './hybrid12-lib.mjs';
import {setup,card,view,act,catalog} from '../mesa-nova/r1-fixtures.mjs';
const [out='prototype-qa/rodada3-20261111/fluidez']=process.argv.slice(2);fs.mkdirSync(out,{recursive:true});
const base=process.env.QA_BASE||'http://127.0.0.1:3121',latency=Number(process.env.LATENCY||80),runs=Number(process.env.RUNS||1);
const browser=await chromium.launch({executablePath:process.env.QA_BROWSER||CHROME,headless:true,args:(process.env.QA_BROWSER_ARGS||'').split(' ').filter(Boolean)});const report={base,latency,runs:[]};
const steps=[
 {name:'jogar criatura na reserva',do:({a})=>{const c=a.hand.find(c=>c.type==='creature'&&!(c.effects||[]).some(e=>/entry|enter|choose|target/.test(String(e.timing)+String(e.op))));return c?{type:'play',cardId:c.uid}:null;}},
 {name:'jogar magia direta',do:({a})=>{const c=a.hand.find(c=>c.type==='direct_spell'&&!(c.effects||[]).some(e=>/damage|target|enemy|ally/.test(JSON.stringify(e))));return c?{type:'play',cardId:c.uid}:null;}},
 {name:'encerrar a vez (rival encerra e compra)',do:()=>({type:'endPrep'})},
 {name:'votar combate (entra a formação e o foco)',do:()=>({type:'vote',fight:true})},
];
try{for(let run=0;run<runs;run++){
 const s=setup(),{room,a,b}=s;room.matchId='fluidez'+run;room.code='FLUI0'+run;room.round=1;room.preparationsDone=0;room.phase='prep';room.turn=a.id;a.mana=a.manaMax=10;
 a.hand=['FV01','FV03','FV06','FV07','FV15','FV13','FV14','FV08'].flatMap(id=>{try{return [card(id,a)];}catch{return [];}});b.hand=['FL01','FL02','FL04'].map(id=>card(id,b));
 const v=()=>({...view(room,a),serverNow:Date.now()});
 const ctx=await browser.newContext({viewport:{width:1920,height:1080}});await ctx.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort('blockedbyclient'));
 await ctx.route(u=>/\/api\/rooms\/[^/]+\/state$/.test(u.pathname),async r=>{await new Promise(x=>setTimeout(x,40));await r.fulfill({json:v()});});
 await ctx.route('**/api/rooms/*/act',async r=>{const data=r.request().postDataJSON(),t=Date.now();await new Promise(x=>setTimeout(x,latency));try{act(room,a,data,catalog);
   if(room.phase==='prep'&&room.turn===b.id)act(room,b,{type:'endPrep'},catalog);if(room.phase==='vote'&&b.vote===null&&a.vote!==null)act(room,b,{type:'vote',fight:false},catalog);await r.fulfill({json:v()});}catch(e){await r.fulfill({status:400,json:{error:e.message}});}});
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(c=>sessionStorage.setItem('runamarca-nova-seat',JSON.stringify({code:c,token:'probe'})),room.code);
 if(process.env.QA_INIT)await page.addInitScript({content:process.env.QA_INIT});// QA_INIT: script de comparação A/B (ex.: window.__HYBRID_RENDER_SCALE=1)
 await page.goto(base+'/runamarca/');await page.waitForFunction(()=>typeof render==='function'&&state&&window.RunaHybrid?.ready,null,{timeout:20000});await page.waitForTimeout(2000);
 const cdp=process.env.PROFILE?await ctx.newCDPSession(page):null;if(cdp){await cdp.send('Profiler.enable');await cdp.send('Profiler.setSamplingInterval',{interval:400});}
 for(const step of steps){const data=step.do(s);if(!data){report.runs.push({run,step:step.name,skipped:true});continue;}
  await page.waitForFunction(()=>!commandBusy&&!RunaCardArrivals.blocked,null,{timeout:15000}).catch(()=>{});await page.waitForTimeout(400);
  if(cdp)await cdp.send('Profiler.start');
  if(process.env.TRACE)await browser.startTracing(page,{categories:['devtools.timeline','disabled-by-default-devtools.timeline','blink','cc','gpu','viz','benchmark','disabled-by-default-devtools.timeline.frame','loading',...(process.env.INVALIDATION?['disabled-by-default-devtools.timeline.invalidationTracking','disabled-by-default-blink.invalidation']:[])]});
  const r=await page.evaluate(async([data,scanFilters])=>{const gaps=[];const t0=performance.now();let responded=null;let last=performance.now(),on=true;const draws=[];let seen=window.RunaHybrid?.stats?.draws;const builds=[];let seenB=window.RunaHybrid?.stats?.builds;const tick=now=>{const st=window.RunaHybrid?.stats;if(st&&st.builds!==seenB){seenB=st.builds;builds.push({at:Math.round(now-t0),kind:st.buildKind,ms:Math.round(st.bridgeMs||0),why:st.incremental?.lastReason?.slice(0,90)});}if(st&&st.draws!==seen){seen=st.draws;draws.push({at:Math.round(now-t0),draw:Math.round(st.drawMs||0),sync:Math.round(st.syncMs||0),submit:Math.round(st.submitMs||0),tri:st.triangles,kind:st.buildKind});}gaps.push([Math.round(last),Math.round(now-last)]);last=now;if(on)requestAnimationFrame(tick);};requestAnimationFrame(tick);
   const original=window.fetch;window.fetch=async(...args)=>{const res=await original(...args);if(String(args[0]).includes('/act'))responded=performance.now()-t0;return res;};
   window.__tex=[];window.__faces=0;window.__filt=new Map();const fscan=()=>{for(const n of document.querySelectorAll('body *')){const cs=getComputedStyle(n),f=cs.filter;if(f&&f!=='none'){const r=n.getBoundingClientRect();if(r.width*r.height<400)continue;const k=(typeof n.className==='string'&&n.className?n.className.split(' ').slice(0,2).join('.'):n.tagName)+' :: '+f.slice(0,90)+' :: '+Math.round(r.width)+'x'+Math.round(r.height);window.__filt.set(k,(window.__filt.get(k)||0)+1);}}};if(scanFilters){const fiv=setInterval(fscan,40);setTimeout(()=>clearInterval(fiv),800);}if(window.__rs)window.__rs.length=0;const done=command(data,null,true);await Promise.race([done,new Promise(x=>setTimeout(x,6000))]);const commandMs=performance.now()-t0;await new Promise(x=>setTimeout(x,2500));on=false;window.fetch=original;
   const g=gaps.map(x=>x[1]).slice(1),sorted=[...g].sort((x,y)=>x-y);return {builds:builds.slice(0,10),filt:[...(window.__filt||new Map())].slice(0,14),rs:(window.__rs||[]).slice(-40),slowDraws:draws.filter(d=>d.draw>20),drawCount:draws.length,tex:window.__tex?.length,texPx:Math.round((window.__tex||[]).reduce((n,t)=>n+t,0)/1e6*10)/10,faces:window.__faces,commandMs:Math.round(commandMs),responseMs:responded&&Math.round(responded),frames:g.length,p50:sorted[sorted.length>>1],p95:sorted[Math.floor(sorted.length*.95)],max:sorted.at(-1),over34:g.filter(x=>x>34).length,over50:g.filter(x=>x>50).length,long:gaps.filter(x=>x[1]>50).map(x=>({at:Math.round(x[0]-t0),ms:x[1]}))};},[data,Boolean(process.env.FILTERS)]);
  let trace=null;if(process.env.TRACE){const buf=await browser.stopTracing();const ev=JSON.parse(buf.toString()).traceEvents;fs.writeFileSync(path.join(out,'trace-'+run+'-'+steps.indexOf(step)+'.json'),buf);const main=ev.find(e=>e.name==='thread_name'&&e.args?.name==='CrRendererMain');const tid=main?.tid,pid=main?.pid;const sum=new Map();for(const e of ev)if(e.ph==='X'&&e.dur>8000&&(e.tid===tid||e.cat.includes('gpu'))){const k=(e.tid===tid?'main:':'gpu:')+e.name;sum.set(k,(sum.get(k)||0)+e.dur);}trace=[...sum].sort((x,y)=>y[1]-x[1]).slice(0,14).map(([k,v])=>k+' '+Math.round(v/1000)+'ms');console.log('   trace:',trace.join(' | '));}
  let hot=null;if(cdp){const {profile}=await cdp.send('Profiler.stop');const byId=new Map(profile.nodes.map(n=>[n.id,n])),self=new Map();let t=profile.startTime;profile.samples.forEach((id,i)=>{t+=profile.timeDeltas[i];const f=byId.get(id).callFrame;if(['(idle)','(program)','(garbage collector)'].includes(f.functionName))return;const key=(f.functionName||'(anon)')+' '+(f.url.split('/').pop().split('?')[0])+':'+f.lineNumber;self.set(key,(self.get(key)||0)+profile.timeDeltas[i]);});
   hot=[...self].sort((x,y)=>y[1]-x[1]).slice(0,12).map(([k,v])=>k+' '+Math.round(v/1000)+'ms');fs.writeFileSync(path.join(out,`perfil-${run}-${steps.indexOf(step)}.cpuprofile`),JSON.stringify(profile));}
  const gpu=await page.evaluate(()=>{const m=window.RunaHybrid?.stats?.renderer||window.RunaHybrid?.stats?.metrics?.renderer||null;return m;});report.runs.push({run,step:step.name,...r,hot,gpu});console.log(step.name,JSON.stringify({...r,long:r.long.slice(0,8)}));if(hot)console.log('   hot:',hot.slice(0,8).join(' | '));}
 if(errors.length)console.log('errors',errors);await ctx.close();}
}finally{await browser.close();}
fs.writeFileSync(path.join(out,'fluidez.json'),JSON.stringify(report,null,1));
