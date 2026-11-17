// Abertura da partida (09/11/2026) · linha do tempo em quadros, do sorteio à mão inicial interativa.
// O motor é o real (game.mjs em processo): /state e /act da página são respondidos pela visão do próprio motor,
// como em s3-mulligan-blur. Nada é enviado a outro servidor além dos arquivos estáticos de QA_BASE.
// Uso: node scripts/abertura-timeline.mjs <out-dir>
//  FIRST=a|b  força quem venceu a moeda (repete o sorteio do motor até sair o assento pedido)
//  SKIP_INTRO=1 marca a apresentação dos patronos como vista   STEP=ms entre quadros (padrão 200)
//  CSS_OVERRIDE="regras css" injeta uma folha extra (comparações A/B de custo de composição)
//  TRACE=1 grava o rastro de renderização (devtools.timeline) e lista as etapas acima de 40 ms
//  PROFILE=1 grava o perfil de CPU da abertura e lista o que rodou nas pausas acima de 50 ms
//  VIEW=1920x1080   REDUCED=1 emula prefers-reduced-motion   MAX=ms de captura (padrão 30000)
//  RECORD=1 grava os quadros que o próprio navegador compõe (screencast do DevTools, JPEG com o instante de cada um)
//           em vez de tirar capturas espaçadas; não precisa de ffmpeg
import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';
import {makeRoom,join,act,view} from '../mesa-nova/game.mjs';
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/vanxf/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const catalog=JSON.parse(fs.readFileSync(new URL('../mesa-nova/cartas.json',import.meta.url)));
const [out='prototype-qa/abertura-20261109/linha-do-tempo']=process.argv.slice(2);fs.mkdirSync(out,{recursive:true});
const base=process.env.QA_BASE||'http://127.0.0.1:3121',[vw,vh]=(process.env.VIEW||'1920x1080').split('x').map(Number),step=Number(process.env.STEP||200),max=Number(process.env.MAX||30000);
const want=process.env.FIRST||'a';
function newRoom(){for(let i=0;i<64;i++){const room=makeRoom('ABR'+Math.floor(Math.random()*900+100),'Vanxf'),a=room.players[0],b=join(room,'Rival');act(room,a,{type:'deck',deckId:catalog.decks[1].id},catalog);return {room,a,b};}}
const browser=await chromium.launch({executablePath:process.env.QA_BROWSER||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const errors=[],frames=[];let code=0;
try{
 let g=newRoom(),frozen=null;const v=()=>frozen||{...view(g.room,g.a),serverNow:Date.now()};
 frozen=v();
 const record=!!process.env.RECORD,context=await browser.newContext({viewport:{width:vw,height:vh},reducedMotion:process.env.REDUCED?'reduce':'no-preference'});
 await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort('blockedbyclient'));
 await context.route(u=>/\/api\/rooms\/[^/]+\/state$/.test(u.pathname),async r=>{await new Promise(x=>setTimeout(x,80));await r.fulfill({json:v()});});
 await context.route('**/api/rooms/*/act',async r=>{try{act(g.room,g.a,r.request().postDataJSON(),catalog);await r.fulfill({json:v()});}catch(e){await r.fulfill({status:400,json:{error:e.message}});}});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));const cast=[];let castT0=null,cdp=null;
 await page.addInitScript(c=>{sessionStorage.setItem('runamarca-nova-seat',JSON.stringify({code:c,token:'probe'}));},g.room.code);
 await page.goto(base+'/runamarca/');
 await page.waitForFunction(()=>typeof render==='function'&&state&&visualBooted&&typeof RunaHybridFlights!=='undefined',null,{timeout:20000});
 await page.evaluate(()=>{window.__events=[];const original=animateEvent;animateEvent=async function(event){const record={type:event.type,id:event.id,start:Math.round(performance.now())};window.__events.push(record);try{return await original.apply(this,arguments);}finally{record.ms=Math.round(performance.now())-record.start;}};});
 // O sorteio é do motor; repete a escolha do deck rival em salas novas até o assento pedido vencer a moeda.
 for(let i=0;i<64;i++){act(g.room,g.b,{type:'deck',deckId:catalog.decks[0].id},catalog);if((g.room.first===g.a.id)===(want==='a'))break;
  g=newRoom();frozen=null;frozen=v();await page.evaluate(s=>{sessionStorage.setItem('runamarca-nova-seat',JSON.stringify({code:s.code,token:'probe'}));state=s;lastRevision=-1;serverClockOffset=Date.now()-s.serverNow;render();},frozen);}
 if(process.env.CSS_OVERRIDE)await page.addStyleTag({content:process.env.CSS_OVERRIDE});
 if(process.env.SKIP_INTRO)await page.evaluate(s=>sessionStorage.setItem('runamarca-intro:'+s.code+':'+s.matchId,'seen'),{code:g.room.code,matchId:g.room.matchId});
 await page.evaluate(()=>{window.__raf=[];(function tick(){window.__raf.push(performance.now());requestAnimationFrame(tick);})();});
 if(record){cdp=await context.newCDPSession(page);cdp.on('Page.screencastFrame',f=>{cdp.send('Page.screencastFrameAck',{sessionId:f.sessionId}).catch(()=>{});if(castT0==null)return;const t=Math.round(f.metadata.timestamp*1000-castT0);if(t<0)return;const file='c-'+String(cast.length).padStart(4,'0')+'-'+String(t).padStart(5,'0')+'.jpg';fs.writeFileSync(path.join(out,file),Buffer.from(f.data,'base64'));cast.push({t,file});});
  await cdp.send('Page.startScreencast',{format:'jpeg',quality:82,maxWidth:Number(process.env.CAST_WIDTH||1280),maxHeight:Number(process.env.CAST_WIDTH||1280),everyNthFrame:1});}
 const prof=process.env.PROFILE?await context.newCDPSession(page):null;if(prof){await prof.send('Profiler.enable');await prof.send('Profiler.setSamplingInterval',{interval:500});await prof.send('Profiler.start');}
 if(process.env.TRACE)await browser.startTracing(page,{categories:['devtools.timeline','disabled-by-default-devtools.timeline','blink.user_timing','gpu','cc','viz']});
 await page.evaluate(()=>performance.mark('abertura-t0'));
 const t0=Date.now();castT0=t0;frozen=null;
 const probe=()=>page.evaluate(()=>{const o=document.getElementById('mulligan-overlay'),b=document.querySelector('#mulligan-controls button'),r=b?.getBoundingClientRect();
  return {phase:state?.phase,first:state?.first===state?.you,intro:typeof patronIntroActive!=='undefined'&&patronIntroActive,overlayHidden:o.hidden,overlayClass:o.className,cards:document.querySelectorAll('#mulligan-cards .card').length,pending:document.querySelectorAll('#mulligan-cards .card.pending-arrival').length,
   coin:document.querySelectorAll('.coin-toss').length,button:b?b.textContent:null,clickable:[...document.querySelectorAll('#mulligan-controls button:not(:disabled)')].some(n=>{const q=n.getBoundingClientRect();return n.contains(document.elementFromPoint(q.x+q.width/2,q.y+q.height/2));}),startedAt:seat()?.mulliganStartedAt??null};});
 let interactiveAt=null;
 for(let i=0;Date.now()-t0<max;i++){const t=Date.now()-t0,file=record?null:`q-${String(i).padStart(3,'0')}-${String(t).padStart(5,'0')}.png`;if(file&&!process.env.NOCAP)await page.screenshot({path:path.join(out,file)});const s=await probe();frames.push({t,file,...s});
  if(s.clickable&&interactiveAt==null)interactiveAt=t;if(interactiveAt!=null&&t-interactiveAt>1600)break;
  const wait=step-(Date.now()-t0-t);if(wait>0)await page.waitForTimeout(wait);}
 let hot=null;if(prof){const {profile}=await prof.send('Profiler.stop');fs.writeFileSync(path.join(out,'abertura.cpuprofile'),JSON.stringify(profile));
  // Pausas: trechos em que as amostras ficaram fora de (idle)/(program) por mais de 50 ms seguidos; soma por função.
  const byId=new Map(profile.nodes.map(n=>[n.id,n])),parent=new Map();for(const n of profile.nodes)for(const c of n.children||[])parent.set(c,n.id);
  const idle=id=>['(idle)','(program)','(garbage collector)'].includes(byId.get(id).callFrame.functionName);let t=profile.startTime;const runs=[];let cur=null;
  profile.samples.forEach((id,i)=>{t+=profile.timeDeltas[i];if(idle(id)){if(cur){runs.push(cur);cur=null;}return;}cur??={start:t,end:t,self:new Map(),stacks:new Map()};cur.end=t;const f=byId.get(id).callFrame,key=(f.functionName||'(anon)')+' '+f.url.split('/').slice(-2).join('/')+':'+f.lineNumber;cur.self.set(key,(cur.self.get(key)||0)+profile.timeDeltas[i]);
   const chain=[];for(let x=id;x!=null&&chain.length<40;x=parent.get(x)){const c=byId.get(x).callFrame;if(c.url)chain.push((c.functionName||'(anon)')+'@'+c.url.split('/').pop()+':'+c.lineNumber);}const root=chain.slice(-3).reverse().join(' > ');cur.stacks.set(root,(cur.stacks.get(root)||0)+profile.timeDeltas[i]);});
  hot=runs.filter(r=>r.end-r.start>50000).map(r=>({atMs:Math.round((r.start-profile.startTime)/1000),ms:Math.round((r.end-r.start)/1000),self:[...r.self].sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k,v])=>k+' '+Math.round(v/1000)+'ms'),roots:[...r.stacks].sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k,v])=>k+' '+Math.round(v/1000)+'ms')}));console.log('HOT',JSON.stringify(hot,null,1));}
 let slow=null;if(process.env.TRACE){const buffer=await browser.stopTracing();fs.writeFileSync(path.join(out,'abertura-trace.json'),buffer);const trace=JSON.parse(buffer.toString()).traceEvents,mark=trace.find(e=>e.name==='abertura-t0');
  slow=trace.filter(e=>e.ph==='X'&&e.dur>40000&&mark&&e.ts>=mark.ts).map(e=>({atMs:Math.round((e.ts-mark.ts)/1000),ms:Math.round(e.dur/1000),name:e.name,cat:e.cat.split(',')[0],tid:e.tid,data:JSON.stringify(e.args?.data||e.args?.beginData||{}).slice(0,160)})).sort((a,b)=>a.atMs-b.atMs);
  console.log('SLOW',JSON.stringify(slow,null,0).replace(/\},\{/g,'},\n{'));}
 const events=await page.evaluate(()=>window.__events);
 // Fluidez durante a abertura: intervalos entre quadros do navegador desde o disparo até o fim da captura.
 const pace=await page.evaluate(()=>{const r=window.__raf,gaps=r.slice(1).map((t,i)=>t-r[i]).sort((a,b)=>a-b);const h=(globalThis.RunaHybridFlights?.stats.history||[]).filter(x=>x.profile==='deal'),from=Math.min(...h.map(x=>x.time)),to=Math.max(...h.map(x=>x.time)),flight=r.filter(t=>t>=from&&t<=to).map((t,i,a)=>i?t-a[i-1]:0);const hitches=r.slice(1).map((t,i)=>({atMs:Math.round(r[i]-r[0]),gapMs:Math.round(t-r[i]),sinceDealMs:h.length?Math.round(r[i]-from):null})).filter(x=>x.gapMs>50);return {hitches,dealMs:h.length?Math.round(to-from):null,dealFrames:flight.length,dealMaxGapMs:flight.length?+Math.max(...flight).toFixed(1):null,dealOver34:flight.filter(g=>g>34).length,frames:r.length,medianMs:+(gaps[gaps.length>>1]||0).toFixed(1),p95Ms:+(gaps[Math.floor(gaps.length*.95)]||0).toFixed(1),maxMs:+(gaps.at(-1)||0).toFixed(1),over50:gaps.filter(g=>g>50).length,over100:gaps.filter(g=>g>100).length};});
 const toss=await page.evaluate(()=>globalThis.RunaOpeningToss?.stats||null),deal=await page.evaluate(()=>(globalThis.RunaHybridFlights?.stats.history||[]).filter(h=>h.profile==='deal').map(h=>({id:h.id,stage:h.stage,time:Math.round(h.time),x:Math.round(h.pose?.x),y:Math.round(h.pose?.y),angle:h.pose?.angle})));
 const leftovers=await page.evaluate(()=>({stage:document.querySelectorAll('.opening-toss-stage').length,carriers:document.querySelectorAll('.hybrid-flight-carrier').length,pending:document.querySelectorAll('#mulligan-cards .pending-arrival').length,overlayClass:document.getElementById('mulligan-overlay').className,inert:['mulligan-cards','mulligan-controls'].filter(id=>document.getElementById(id).inert),focus:document.activeElement?.id||document.activeElement?.tagName}));
 fs.writeFileSync(path.join(out,'linha-do-tempo.json'),JSON.stringify({base,view:[vw,vh],first:want,reduced:!!process.env.REDUCED,interactiveAt,errors,events,hot,slow,pace,toss,deal,leftovers,cast,frames},null,1));
 console.log(JSON.stringify({events:events.map(e=>e.type+':'+e.ms),pace,leftovers,cast:cast.length,frames:frames.length,interactiveAt,errors:errors.length,first:g.room.first===g.a.id?'a':'b'}));
 if(errors.length||interactiveAt==null)code=1;
 if(cdp)await cdp.send('Page.stopScreencast').catch(()=>{});await context.close();
}catch(e){console.error(e);code=1;}finally{await browser.close();}
process.exit(code);
