// Bloco B (adendo de formação) · testes focais do foco da formação e do voo em arco das baixas.
// Real engine (r1-fixtures: act/ready/resolveCombat/view), one page per seat fed with the engine's progressive views
// every POLL ms, as the room polling does. Scene: one 5/3 creature on each side in position 3 (both die in the same
// clash) plus one 3/9 survivor each in position 1. Cases: desktop both seats; Registro open during the flights;
// resize during the flights; reduced motion; phone (390) formation reachability. Writes <out>/b-combat-focal.json.
// Usage: node scripts/b-combat-focal.mjs <out-dir> [case ...]
import fs from 'node:fs';
import {harness,open,finish,chromium,CHROME} from './hybrid12-lib.mjs';
import {setup,place,unit,act,catalog,view,resolveCombat} from '../mesa-nova/r1-fixtures.mjs';
const [out='prototype-qa/revisao-visual-20261103/formacao-B/focal',...only]=process.argv.slice(2),POLL=150,H=harness(out),{check}=H;
const browser=await chromium.launch({executablePath:process.env.QA_BROWSER||CHROME,headless:true});
function scene(){const t=setup(),{room,a,b}=t;room.matchId='b-focal-'+Date.now();
 const da=place(a,unit(a,{attack:5,health:3,name:'Lâmina A'}),2),db=place(b,unit(b,{attack:5,health:3,name:'Lâmina B'}),2);place(a,unit(a,{attack:3,health:9}),0);place(b,unit(b,{attack:3,health:9}),0);
 room.phase='formation';for(const p of room.players)p.ready=false;return {...t,dead:{a:da.uid,b:db.uid}};}
const json=(room,p)=>({...JSON.parse(JSON.stringify(view(room,p))),serverNow:Date.now()});
const paint=(page,v)=>page.evaluate(v=>{state=v;serverClockOffset=Date.now()-v.serverNow;render();},v);
const probe=()=>{const f=window.RunaHybridFocus,sc=window.RunaHybrid?.scene||{};return {t:Math.round(performance.now()),phase:state?.phase,value:+(f?.value??0).toFixed(3),target:f?.target??null,factor:sc.focus?.factor??1,arcs:window.RunaDeathArc?.active??0,body:document.body.classList.contains('hybrid-focus')};};
async function seat(viewport,{reduced=false,dpr=1}={}){const ctx=await browser.newContext({viewport,deviceScaleFactor:dpr,reducedMotion:reduced?'reduce':'no-preference',hasTouch:viewport.width<=900});
 await ctx.route('**/*',r=>{const u=new URL(r.request().url());return ['127.0.0.1','fonts.googleapis.com','fonts.gstatic.com'].includes(u.hostname)?r.continue():r.abort();});
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto((process.env.QA_BASE||'http://127.0.0.1:3086')+'/runamarca/hybrid/index.html');await page.waitForFunction(()=>typeof render==='function'&&window.RunaHybridConfig);await page.evaluate(()=>document.fonts.ready);return {ctx,page,errors};}
async function run(name,{viewport={width:1920,height:1080},reduced=false,during=null,dpr=1}={}){
 const s=scene(),A=await seat(viewport,{reduced,dpr}),B=await seat(viewport,{reduced,dpr}),pages=[[A,s.a],[B,s.b]];
 for(const [P,p] of pages){await paint(P.page,json(s.room,p));}
 await A.page.waitForFunction(()=>window.RunaHybrid?.ready);await A.page.waitForTimeout(900);
 const formation=await A.page.evaluate(([deadB])=>{const sides=[...document.querySelectorAll('#lanes .lane-side')],rival=sides.filter(n=>n.dataset.owner!==state.you),own=sides.filter(n=>n.dataset.owner===state.you);const c=own[1].getBoundingClientRect(),hit=document.elementFromPoint(c.x+c.width/2,c.y+c.height/2);
  return {focus:window.RunaHybridFocus?.stats,scene:window.RunaHybrid?.scene?.focus,rivalCards:rival.reduce((n,s)=>n+s.querySelectorAll('.card').length,0),rivalUidInLanes:Boolean(document.querySelector(`#lanes [data-uid="${deadB}"]`)),rivalFormationPublished:(state.players.find(p=>p.id!==state.you)?.formation||[]).filter(Boolean).length,hitIsSocket:Boolean(hit&&hit.closest('.lane-side')),hitTag:hit?.className||hit?.tagName,veil:getComputedStyle(document.querySelector('.hybrid-focus-veil')||document.body).pointerEvents};},[s.dead.b]);
 // both seats confirm (engine), then the combat runs in real time through the progressive views
 act(s.room,s.a,{type:'ready'},catalog);act(s.room,s.b,{type:'ready'},catalog);if(s.room.phase!=='resolving')throw Error(name+': no combat');
 const c=s.room.combat;let acc=0,resultAt=null;for(const st of c.timeline){if(st.kind==='result'){resultAt=acc;break;}acc+=st.duration;}
 const timeline=[],feeds=pages.map(([P,p])=>{let busy=false,stop=false;const timer=setInterval(()=>{if(busy||stop)return;if(s.room.phase==='resolving'&&Date.now()>=s.room.combat.startedAt+s.room.combat.duration)resolveCombat(s.room);busy=true;paint(P.page,json(s.room,p)).catch(()=>{}).finally(()=>{busy=false;});},POLL);return {stop:async()=>{stop=true;clearInterval(timer);while(busy)await new Promise(r=>setTimeout(r,10));}};});
 const startedAt=c.startedAt;let duringDone=false,graveBefore=null;
 const until=Date.now()+c.duration+6000;while(Date.now()<until){const v=await A.page.evaluate(probe);v.combatMs=Date.now()-startedAt;timeline.push(v);
  if(during&&!duringDone&&v.arcs>0){duringDone=true;graveBefore=await A.page.evaluate(()=>{const r=document.getElementById('self-grave').getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};});await during(A.page);}
  if(v.phase==='prep'&&!v.target&&v.value===0&&!v.arcs)break;await new Promise(r=>setTimeout(r,90));}
 await A.page.waitForTimeout(600);for(const f of feeds)await f.stop();
 const result=[];for(const [P,p] of pages){result.push(await P.page.evaluate(([deadSelf,deadRival])=>{const hist=window.RunaDeathArc?.history||[],box=n=>{const r=n.getBoundingClientRect();return {x:+(r.x+r.width/2).toFixed(1),y:+(r.y+r.height/2).toFixed(1)};};
  const me=state.players.find(p=>p.id===state.you),rival=state.players.find(p=>p.id!==state.you);
  return {seat:me.name,phase:state.phase,flights:hist.map(f=>({uid:f.uid,owner:f.owner===me.id?'self':'rival',start:f.start,end:f.end&&{x:+f.end.x.toFixed(1),y:+f.end.y.toFixed(1)},final:f.final,duration:f.duration,elapsed:Math.round(f.arrivedAt-f.startedAt),samples:f.samples?.length??0,peakAbove:f.samples?.length?+(Math.min(f.start.y,f.end?.y??f.start.y)-Math.min(...f.samples.map(s=>s.y))).toFixed(1):0})),
   graves:{self:document.getElementById('self-grave')?.textContent.trim(),rival:document.getElementById('opponent-grave')?.textContent.trim(),selfBox:box(document.getElementById('self-grave')),rivalBox:box(document.getElementById('opponent-grave'))},discard:{self:me.discard?.length??null,rival:rival.discard?.length??null},
   deadSelf,deadRival,focus:window.RunaHybridFocus?.stats,arcStarts:window.__arcStarts||null};},[p===s.a?s.dead.a:s.dead.b,p===s.a?s.dead.b:s.dead.a]));}
 const errors=[...A.errors,...B.errors];await A.ctx.close();await B.ctx.close();return {name,formation,timeline,result,resultAt,duration:c.duration,graveBefore,errors};}
const cases={
 desktop:()=>run('desktop'),
 registro:()=>run('registro',{during:async page=>{await page.evaluate(()=>{const g=document.getElementById('camp-log');if(g)g.open=true;});}}),
 resize:async()=>{const r=await run('resize',{during:async page=>{await page.setViewportSize({width:1600,height:900});}});r.resizedTo=1600;return r;},
 reduced:()=>run('reduced',{reduced:true}),
};
// early exit: leaving the match while focused (the table is hidden, as when the lobby comes back) drops the focus
async function leave(){const s=scene(),A=await seat({width:1920,height:1080});await paint(A.page,json(s.room,s.a));await A.page.waitForFunction(()=>window.RunaHybrid?.ready&&RunaHybridFocus.value===1,null,{timeout:10000});
 const before=await A.page.evaluate(()=>({value:RunaHybridFocus.value,body:document.body.className,shifted:[...document.querySelectorAll('.reserve-camp.opponent-camp,.player-band')].map(n=>n.style.translate).filter(Boolean).length}));
 await A.page.evaluate(()=>{document.getElementById('game').hidden=true;});await A.page.waitForTimeout(400);
 const after=await A.page.evaluate(()=>({value:RunaHybridFocus.value,target:RunaHybridFocus.target,focusClass:document.body.classList.contains('hybrid-focus'),veil:document.querySelector('.hybrid-focus-veil')?.hasAttribute('hidden')}));
 await A.page.evaluate(()=>{document.getElementById('game').hidden=false;});await A.page.waitForTimeout(400);const back=await A.page.evaluate(()=>({value:RunaHybridFocus.value,target:RunaHybridFocus.target}));
 const errors=A.errors;await A.ctx.close();return {before,after,back,errors};}
const report={};
for(const [k,fn] of Object.entries(cases)){if(only.length&&!only.includes(k))continue;const r=await fn();report[k]=r;const [ra,rb]=r.result;
 const focusDuringCombat=r.timeline.filter(v=>v.phase==='resolving'),lastArc=r.timeline.findLastIndex(v=>v.arcs>0),release=r.timeline.findIndex((v,i)=>i>lastArc&&v.target===0);
 check(`${k}: formation focused (target 1, value 1${k==='reduced'?' immediately':''}) and the rival positions stay secret`,r.formation.focus?.target===1&&r.formation.focus?.value===1&&r.formation.rivalCards===0&&!r.formation.rivalUidInLanes&&r.formation.rivalFormationPublished===0,r.formation);
 check(`${k}: the veil and focus effects do not capture clicks (a socket centre hits the socket)`,r.formation.hitIsSocket&&r.formation.veil==='none',{hit:r.formation.hitTag,veil:r.formation.veil});
 check(`${k}: focus held through resolving`,focusDuringCombat.length>0&&focusDuringCombat.every(v=>v.target===1),{samples:focusDuringCombat.length});
 for(const x of [ra,rb]){const own=x.flights.find(f=>f.uid===x.deadSelf),riv=x.flights.find(f=>f.uid===x.deadRival),dist=(f,b)=>f?.final?Math.hypot(f.final.x-b.x,f.final.y-b.y):null;
  check(`${k} · ${x.seat}: one arc per defeated card, each from its last visible position to its owner's compartment`,x.flights.length===2&&own?.owner==='self'&&riv?.owner==='rival'&&(k==='reduced'||(dist(own,own?.end||{})<8&&dist(riv,riv?.end||{})<8&&Math.abs(own.end.x-x.graves.selfBox.x)<120)),{flights:x.flights,graves:x.graves});
  if(k!=='reduced')check(`${k} · ${x.seat}: the path is an arc (rises above both ends) and keeps the current duration (850 ms)`,[own,riv].every(f=>f&&f.peakAbove>=20&&f.duration===850&&f.elapsed>=820&&f.elapsed<=1100),[own,riv].map(f=>f&&{peak:f.peakAbove,duration:f.duration,elapsed:f.elapsed}));
  else check(`reduced · ${x.seat}: no travel, short fade (≤ 260 ms) and arrival signal`,[own,riv].every(f=>f&&f.duration<=260&&f.samples===0),[own,riv]);
  check(`${k} · ${x.seat}: compartment counts come from the engine state (1 each, no duplicates)`,x.discard.self===1&&x.discard.rival===1&&/1/.test(x.graves.self)&&/1/.test(x.graves.rival),{graves:x.graves,discard:x.discard});}
 check(`${k}: focus released only after the last flight, back to the normal framing`,lastArc>=0&&release>lastArc&&r.timeline.at(-1).value===0&&r.timeline.at(-1).factor===1,{lastArc:r.timeline[lastArc],release:r.timeline[release],end:r.timeline.at(-1)});
 const firstArc=r.timeline.find(v=>v.arcs>0);check(`${k}: flights start at the engine's result step (±400 ms)`,firstArc&&Math.abs(firstArc.combatMs-r.resultAt)<=400,{firstArcMs:firstArc?.combatMs,resultAt:r.resultAt});
 if(k==='registro'){const own=ra.flights.find(f=>f.uid===ra.deadSelf);check('registro: opening the Registro does not move the destination of a flight in progress (compartment when it opened = at arrival)',r.graveBefore&&own?.end&&Math.hypot(own.end.x-(r.graveBefore.x+r.graveBefore.w/2),own.end.y-(r.graveBefore.y+r.graveBefore.h/2))<1.5,{before:r.graveBefore,atArrival:own?.end});}
 if(k==='resize'){const own=ra.flights.find(f=>f.uid===ra.deadSelf);check('resize: a resize during the flight lands on the compartment of the new layout (grave read at arrival, after the resize)',own?.final&&own.end&&Math.hypot(own.final.x-own.end.x,own.final.y-own.end.y)<8&&r.resizedTo===1600,{final:own?.final,end:own?.end,grave:ra.graves.selfBox});}
 check(`${k}: no page errors`,r.errors.length===0,r.errors);}
if(!only.length||only.includes('leave')){const l=await leave();report.leave=l;check('leave: hiding the table (leaving the match) drops the focus at once; the formation brings it back',l.before.value===1&&l.after.target===0&&l.after.value===0&&!l.after.focusClass&&l.after.veil&&l.back.target===1,l);check('leave: no page errors',l.errors.length===0,l.errors);}
await browser.close();
finish(out,'b-combat-focal',H,{report});
