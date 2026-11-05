// S5 Registro, real time: the page receives the engine's normal progressive views by polling
// (150 ms); the combat is resolved only when its time is over (as the server does), so the
// page sees resolving → prep with ordinary revisions, never an injected late view.
// Failing checks: two simultaneous deaths (each once, on the right entry, kept next round),
// a new match in the same room starts with an empty Registro, the attack of 3 against a
// Patron with 8 armour is labelled as an attack (no life loss claimed), and the death burst
// that leaves the Patron at 97 names the Patron (patronId) and its resulting life.
// Usage: node scripts/s5-record-live.mjs <out-dir>
import fs from 'node:fs';
import {harness,launch,open,paint,poll,finish,URL_HYBRID,URL_NATIVE} from './hybrid12-lib.mjs';
import {setup,place,unit,card,act,catalog,view,resolveCombat} from '../mesa-nova/r1-fixtures.mjs';
const out=process.argv[2]||'prototype-qa/s5/record-live',POLL=Number(process.env.S5_POLL_MS)||300,ONLY=process.env.S5_ONLY||'';const H=harness(out),{check}=H;
const CASES={
 // Lane 3 is the last clash before the result step, so it ends right before the state leaves resolving.
 'duas-mortes':({a,b})=>{place(a,unit(a,{attack:5,health:3}),2);place(b,unit(b,{attack:5,health:3}),2);},
 'armadura':({a,b})=>{place(a,unit(a,{attack:3,health:9}),0);b.patron.extraLife=8;},
 'explosao':({a,b})=>{const c=place(a,card('RG03',a),0);c.effects=[{op:'death_patron_damage',amount:3}];place(b,unit(b,{attack:5,health:9}),0);},
};
function start(name,matchId){const t=setup(),{room,a}=t;room.matchId=matchId;CASES[name](t);room.phase='formation';for(const p of room.players)p.ready=false;
 act(room,a,{type:'ready'},catalog);act(room,t.b,{type:'ready'},catalog);if(room.phase!=='resolving')throw Error(name+': no combat');
 const views=[];const next=()=>{if(room.phase==='resolving'&&Date.now()>=room.combat.startedAt+room.combat.duration)resolveCombat(room);const v={...JSON.parse(JSON.stringify(view(room,a))),serverNow:Date.now()};views.push({phase:v.phase,steps:v.combat?.timeline?.length??null,casualties:Array.isArray(v.combat?.casualties)});return v;};
 return {...t,next,views,first:next()};}
const read=page=>page.evaluate(()=>({entries:[...document.querySelectorAll('#log .combat-record .cr-entry')].map(p=>({step:p.dataset.step,combat:p.dataset.combat,text:p.textContent})),pending:!!document.querySelector('#log .cr-pending'),
 sources:[...(window.RunaCombatRecord?.store?.values()||[])].map(r=>({id:r.id,source:r.source,steps:r.timeline.length,casualties:r.casualties})),matchKey:window.RunaCombatRecord?.matchKey,phase:state?.phase}));
// Real engine views every POLL ms, except none between 400 ms before the end of the last
// clash/strike step and the end of the combat (a network gap): the page goes from a resolving
// view in which that step has not finished straight to the engine's prep view.
function gapFeed(page,s){const c=s.room.combat;let t=0,lastEnd=0;for(const st of c.timeline){t+=st.duration;if(['clash','strike'].includes(st.kind))lastEnd=t;}
 const from=c.startedAt+lastEnd-400,to=c.startedAt+c.duration+50;s.gap={from:from-c.startedAt,to:to-c.startedAt};let stopped=false,busy=false;
 const timer=setInterval(()=>{if(stopped||busy)return;const now=Date.now();if(now>=from&&now<to&&s.room.phase==='resolving'){s.skipped=(s.skipped||0)+1;return;}busy=true;const v=s.next();page.evaluate(v=>{state=v;serverClockOffset=Date.now()-v.serverNow;render();},v).catch(()=>{}).finally(()=>{busy=false;});},POLL);
 return {stop:async()=>{stopped=true;clearInterval(timer);while(busy)await new Promise(r=>setTimeout(r,10));}};}
async function live(page,name,matchId){const s=start(name,matchId);await paint(page,s.first,200);const feed=gapFeed(page,s);
 await page.waitForFunction(()=>state?.phase==='prep',null,{timeout:30000}).catch(()=>{});await page.waitForTimeout(800);const atPrep=await read(page);
 await page.waitForTimeout(1500);const later=await read(page);await feed.stop();
 const lastResolving=s.views.filter(v=>v.phase==='resolving').at(-1);const lastRes=s.views.filter(v=>v.phase==='resolving').at(-1);return {s,atPrep,later,lastResolving:lastRes,revisions:s.views.length,gap:s.gap,skipped:s.skipped||0};}
const results=[],browser=await launch();
try{for(const [route,url] of [['native',URL_NATIVE],['hybrid',URL_HYBRID]])for(const [w,h,dev] of [[1440,900,'desktop'],[390,800,'phone']]){
 const id=`${route}-${dev}`;if(ONLY&&!id.includes(ONLY))continue;const {context,page}=await open(browser,{width:w,height:h},{url});
 // 1 · two simultaneous deaths, real time
 const d=await live(page,'duas-mortes','match-1');const txt=d.later.entries.map(e=>e.text);
 const skulls=txt.join('\n').match(/☠/g)?.length||0,lethal=txt.filter(t=>/☠ .*\(você\) → Nartvanyr/.test(t)&&/☠ .*\(rival\) → Nartvanyr/.test(t));
 check(`${id} duas mortes: progressive engine views, then a gap — no resolving view after the lethal clash ended — before the prep view`,d.revisions>5&&d.skipped>0&&d.atPrep.phase==='prep',{revisions:d.revisions,skipped:d.skipped,gap:d.gap,lastResolving:d.lastResolving});
 check(`${id} duas mortes: exactly two skulls, both on the same lane-3 clash entry`,skulls===2&&lethal.length===1&&/^Posição 3 /.test(lethal[0]),{skulls,entries:txt,source:d.later.sources});
 check(`${id} duas mortes: entry kept in the next round, unchanged and not duplicated`,JSON.stringify(d.atPrep.entries)===JSON.stringify(d.later.entries)&&new Set(d.later.entries.map(e=>e.combat+':'+e.step)).size===d.later.entries.length&&d.later.entries.length>0,{atPrep:d.atPrep.entries.length,later:d.later.entries.length});
 await page.evaluate(()=>{const g=document.getElementById('camp-log');if(g)g.open=true;});await page.waitForTimeout(250);await (await page.$('#camp-log'))?.screenshot({path:`${out}/registro-${id}-duas-mortes.png`}).catch(()=>{});
 // 2 · new match in the same room (same code, new matchId), same page
 const n=await live(page,'armadura','match-2');
 check(`${id} nova partida na mesma sala: Registro starts clean (no entry of match-1)`,n.later.matchKey?.endsWith(':match-2')&&n.later.entries.every(e=>e.combat!==d.later.entries[0]?.combat)&&!n.later.entries.some(e=>/☠/.test(e.text)),{matchKey:n.later.matchKey,entries:n.later.entries.map(e=>e.text)});
 // 3a · attack of 3 against a Patron with 8 armour: attack only, no life loss claimed
 const arm=n.later.entries.map(e=>e.text).find(t=>/Patrono/.test(t))||'';
 check(`${id} armadura 8: entry names the rival Patron and the nominal attack 3, without claiming life loss or absorption`,/ataque 3 ao Patrono rival/.test(arm)&&!/sofre 3|perde|absorv[ei]u/.test(arm),{entry:arm});
 // 3b · death burst leaving the Patron at 97
 const x=await live(page,'explosao','match-3');const burst=x.later.entries.map(e=>e.text).find(t=>/Último Suspiro/.test(t))||'';
 check(`${id} explosão: burst names its source, the rival Patron (patronId) and the published resulting life 97`,/explosão de 3 ao Patrono rival/.test(burst)&&/Patrono rival fica com vida 97/.test(burst)&&!/Criatura/.test(burst),{entry:burst,all:x.later.entries.map(e=>e.text)});
 await page.evaluate(()=>{const g=document.getElementById('camp-log');if(g)g.open=true;});await page.waitForTimeout(250);await (await page.$('#camp-log'))?.screenshot({path:`${out}/registro-${id}-explosao.png`}).catch(()=>{});
 results.push({id,poll:POLL,gap:d.gap,skipped:d.skipped,duasMortes:{entries:txt,sources:d.later.sources,lastResolving:d.lastResolving,revisions:d.revisions},novaPartida:n.later,armadura:arm,explosao:{entry:burst,lastResolving:x.lastResolving}});
 await context.close();}}finally{await browser.close();}
finish(out,'s5-record-live',H,{results});
