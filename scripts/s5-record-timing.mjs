// S5 Registro timing (focal). Combat with clashes on the three positions. The page gets only
// NEW engine revisions (a view is pushed only when it differs from the last one pushed) and
// runs the app's own visual clock (setInterval(tickCombat,90), as init() does in a real room).
// A page observer stamps, on the combat clock, when each entry first appears.
// Failing checks: the first clash entry is readable ≤ 300 ms after its step ended while the
// combat is still running; entries of steps not yet finished stay hidden; the next round
// shows the three entries exactly once.  Usage: node scripts/s5-record-timing.mjs <out-dir>
import fs from 'node:fs';
import {harness,launch,open,paint,finish,URL_HYBRID,URL_NATIVE} from './hybrid12-lib.mjs';
import {setup,place,unit,act,catalog,view,resolveCombat} from '../mesa-nova/r1-fixtures.mjs';
const out=process.argv[2]||'prototype-qa/s5/record-timing';const H=harness(out),{check}=H,ONLY=process.env.S5_ONLY||'',LIMIT=300;
const results=[],browser=await launch();
try{for(const [route,url] of [['native',URL_NATIVE],['hybrid',URL_HYBRID]]){if(ONLY&&!route.includes(ONLY))continue;
 const {room,a,b}=setup();room.matchId='timing';for(let lane=0;lane<3;lane++){place(a,unit(a,{attack:1,health:9}),lane);place(b,unit(b,{attack:2,health:9}),lane);}
 room.phase='formation';for(const p of room.players)p.ready=false;act(room,a,{type:'ready'},catalog);act(room,b,{type:'ready'},catalog);
 const c=room.combat,ends=[];let t=0;c.timeline.forEach((st,i)=>{t+=st.duration;if(st.kind==='clash')ends.push({step:i,lane:st.lane,end:t});});
 const {context,page}=await open(browser,{width:1440,height:900},{url});
 const pull=()=>{if(room.phase==='resolving'&&Date.now()>=c.startedAt+c.duration)resolveCombat(room);return JSON.parse(JSON.stringify(view(room,a)));};
 // A new engine revision = new room revision, phase, or a newly released timeline step / casualty list.
 let last='',pushed=0;const push=async()=>{const v=pull(),key=[v.revision,v.phase,v.round,v.combat?.timeline?.length??-1,Array.isArray(v.combat?.casualties)].join('|');if(key===last)return;last=key;pushed++;await page.evaluate(v=>{state=v;serverClockOffset=Date.now()-v.serverNow;render();},{...v,serverNow:Date.now()});};
 await paint(page,{...pull(),serverNow:Date.now()},100);
 await page.evaluate(()=>{window.__seen={};window.__tick=setInterval(tickCombat,90);new MutationObserver(()=>{const r=[...(window.RunaCombatRecord?.store?.values()||[])].at(-1);for(const p of document.querySelectorAll('#log .combat-record .cr-entry'))if(!(p.dataset.step in window.__seen))window.__seen[p.dataset.step]={atCombatMs:r?Date.now()-r.offset-r.startedAt:null,phase:state?.phase};}).observe(document.getElementById('log'),{childList:true,subtree:true});});
 const timer=setInterval(()=>{push().catch(()=>{});},50);
 // Mid-combat probe: just after the first clash ended (combat still running).
 const first=ends[0],second=ends[1];await page.waitForFunction(ms=>{const b=state?.combat;return b&&Date.now()-(typeof combatClock!=='undefined'&&combatClock.id===b.id?combatClock.offset:serverClockOffset)-b.startedAt>=ms;},first.end+LIMIT,{polling:20,timeout:20000});
 const mid=await page.evaluate(()=>({phase:state.phase,steps:[...document.querySelectorAll('#log .combat-record .cr-entry')].map(p=>+p.dataset.step),seen:window.__seen}));
 await page.waitForFunction(()=>state?.phase==='prep',null,{timeout:30000});await page.waitForTimeout(1200);clearInterval(timer);
 const end=await page.evaluate(()=>({phase:state.phase,entries:[...document.querySelectorAll('#log .combat-record .cr-entry')].map(p=>({step:+p.dataset.step,combat:p.dataset.combat,text:p.textContent})),seen:window.__seen}));
 await page.evaluate(()=>{const g=document.getElementById('camp-log');if(g)g.open=true;});await page.waitForTimeout(200);await (await page.$('#camp-log'))?.screenshot({path:`${out}/registro-${route}.png`}).catch(()=>{});
 const firstSeen=end.seen[first.step]?.atCombatMs;
 check(`${route}: first clash entry readable ≤ ${LIMIT} ms after its step ended, combat still running`,mid.phase==='resolving'&&mid.steps.includes(first.step)&&firstSeen!=null&&firstSeen>=first.end&&firstSeen-first.end<=LIMIT,{firstEnd:first.end,firstSeen,mid});
 check(`${route}: entries of unfinished steps stay hidden (second clash ends at ${second.end} ms)`,!mid.steps.some(s=>s!==first.step)&&ends.every(e=>end.seen[e.step]==null||end.seen[e.step].atCombatMs>=e.end||end.seen[e.step].phase!=='resolving'),{mid:mid.steps,seen:end.seen,ends});
 const clash=end.entries.filter(e=>ends.some(x=>x.step===e.step));
 check(`${route}: next round shows the three clash entries exactly once`,end.phase==='prep'&&clash.length===3&&new Set(clash.map(e=>e.combat+':'+e.step)).size===3&&end.entries.length===3,{entries:end.entries.map(e=>e.text)});
 results.push({route,pushedRevisions:pushed,clashEnds:ends,firstSeenAtCombatMs:firstSeen,seen:end.seen,mid,entries:end.entries.map(e=>e.text)});
 console.log(route,'revisões',pushed,'| 1º confronto terminou',first.end,'ms · 1ª entrada vista',firstSeen,'ms · vistos',JSON.stringify(end.seen));
 await page.evaluate(()=>clearInterval(window.__tick));await context.close();}}finally{await browser.close();}
finish(out,'s5-record-timing',H,{results});
