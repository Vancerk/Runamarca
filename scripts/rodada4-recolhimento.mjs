// Rodada 4 (11/11/2026, dono) · fim do combate: o recolhimento das cartas para a reserva acontece ANTES de o campo
// ampliado diminuir. Combate real (motor em processo, três confrontos sem mortes), revisões empurradas como o
// servidor faria e relógio visual do próprio app. A cada quadro registra o valor do foco, as cópias do recolhimento
// na tela e as cartas ainda nos campos.  Uso: node scripts/rodada4-recolhimento.mjs <out-dir>
import fs from 'node:fs';import path from 'node:path';
import {harness,launch,open,paint,finish} from './hybrid12-lib.mjs';
const URL_TABLE=(process.env.QA_BASE||'http://127.0.0.1:3121')+'/runamarca/';// a mesa real (não a página isolada da ponte)
import {setup,place,unit,act,catalog,view,resolveCombat} from '../mesa-nova/r1-fixtures.mjs';
const out=process.argv[2]||'prototype-qa/rodada4-20261111/recolhimento';const H=harness(out),{check}=H;fs.mkdirSync(out,{recursive:true});
const browser=await launch();const report=[];
try{for(const [w,h] of [[1907,945],[1366,768]]){const tag=w+'x'+h;
 const {room,a,b}=setup();room.matchId='recolhe-'+tag;for(let lane=0;lane<3;lane++){place(a,unit(a,{attack:1,health:9}),lane);place(b,unit(b,{attack:1,health:9}),lane);}
 room.phase='formation';for(const p of room.players)p.ready=false;
 const {context,page}=await open(browser,{width:w,height:h},{url:URL_TABLE});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const pull=()=>{if(room.phase==='resolving'&&Date.now()>=room.combat.startedAt+room.combat.duration)resolveCombat(room);return JSON.parse(JSON.stringify(view(room,a)));};
 let last='';const push=async()=>{const v=pull(),key=[v.revision,v.phase,v.round,v.combat?.timeline?.length??-1,Array.isArray(v.combat?.casualties)].join('|');if(key===last)return;last=key;await page.evaluate(v=>{state=v;serverClockOffset=Date.now()-v.serverNow;render();},{...v,serverNow:Date.now()});};
 await paint(page,{...pull(),serverNow:Date.now()},100);await page.waitForFunction(()=>window.RunaHybrid?.ready);await page.waitForTimeout(900);
 await page.evaluate(()=>{window.__tick=setInterval(tickCombat,90);window.__rec=[];const t0=performance.now();const loop=()=>{const f=window.RunaHybridFocus;window.__rec.push({t:Math.round(performance.now()-t0),phase:state?.phase,focus:+(f?.value??0).toFixed(3),target:f?.target??0,returns:document.querySelectorAll('.combat-return-card').length,busy:Boolean(window.RunaCombatReturn?.busy),lane:document.querySelectorAll('#lanes .lane-side .card:not(.back)').length});if(window.__rec.length<4000)requestAnimationFrame(loop);};requestAnimationFrame(loop);});
 act(room,a,{type:'ready'},catalog);act(room,b,{type:'ready'},catalog);
 const timer=setInterval(()=>{push().catch(()=>{});},50);
 await page.waitForFunction(()=>state?.phase==='prep',null,{timeout:40000});
 await page.waitForFunction(()=>{const r=window.__rec,l=r.at(-1);return l&&l.focus===0&&l.target===0&&!l.busy;},null,{timeout:12000}).catch(()=>{});await page.waitForTimeout(300);clearInterval(timer);
 const rec=await page.evaluate(()=>window.__rec);fs.writeFileSync(path.join(out,tag+'.json'),JSON.stringify(rec));
 // Integração 12/11/2026: captura final da mesa já em repouso (DPR 1, mesmo viewport), só para inspeção visual.
 const shot=tag+'-final.png';await page.screenshot({path:path.join(out,shot)});const capture={shot,dpr:1,viewport:[w,h],phase:await page.evaluate(()=>state?.phase),focus:await page.evaluate(()=>+(window.RunaHybridFocus?.value??0).toFixed(3))};
 const after=rec.filter(r=>r.phase==='prep'),firstPrep=after[0],returnFrames=after.filter(r=>r.returns>0||r.busy),lastReturn=returnFrames.at(-1),firstDrop=after.find(r=>r.focus<.999),settled=after.find(r=>r.focus===0);
 const summary={tag,prepAt:firstPrep?.t,returnFrom:returnFrames[0]?.t,returnTo:lastReturn?.t,zoomOutFrom:firstDrop?.t,zoomedOutAt:settled?.t,laneCardsAtZoomOut:firstDrop?.lane??null,capture};report.push(summary);console.log(JSON.stringify(summary));
 check(tag+': o recolhimento aconteceu (cópias voltando à reserva depois do combate)',returnFrames.length>0,summary);
 check(tag+': o zoom só começa a diminuir depois do fim do recolhimento',Boolean(firstDrop&&lastReturn&&firstDrop.t>=lastReturn.t),summary);
 check(tag+': nenhum quadro com zoom diminuindo e cópias do recolhimento na tela',after.every(r=>!(r.focus<.999&&r.returns>0)),after.filter(r=>r.focus<.999&&r.returns>0).slice(0,3));
 check(tag+': o campo volta ao repouso depois (foco 0)',Boolean(settled),summary);
 check(tag+': sem erros de página',!errors.length,errors);await context.close();}
}finally{await browser.close();}
fs.writeFileSync(path.join(out,'recolhimento.json'),JSON.stringify(report,null,1));finish(out,'rodada4-recolhimento',H,{report});
