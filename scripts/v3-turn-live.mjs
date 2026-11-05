// V3 (itens 12–14) · circuito de turno observado pelos dois assentos na mesma sala real (rota híbrida, servidor
// isolado scripts/b-live-server.mjs). Each seat uses only its own token; lobby, deck and mulligan through each seat's
// API; then the active seat ends its preparation by clicking "Encerrar" (real action), so the turn alternates; then
// vote → formation → both confirm → combat → first turn after the combat, and one more alternation.
// For every observer and every state it records: who the engine authorises (state.turn === you, and whether the
// confirmation is enabled), which light is lit (data-active), where the lit light sits on screen relative to the
// projected field (near/own half or far/rival half), the visible caption and the accessible label, plus the timeline
// of the circuit right after each turn change (sampled every 40 ms). Screenshots of both seats at the same instant.
// Usage: node scripts/v3-turn-live.mjs <out-dir>
import fs from 'node:fs';import path from 'node:path';
import {chromium,CHROME} from './hybrid12-lib.mjs';
const out=process.argv[2]||'prototype-qa/revisao-visual-20261103/v3/turno',base=process.env.QA_BASE||'http://127.0.0.1:3087',control=process.env.QA_CONTROL||'http://127.0.0.1:3088';
fs.mkdirSync(out,{recursive:true});const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function seat(name){const browser=await chromium.launch({executablePath:process.env.QA_BROWSER||CHROME,headless:true}),ctx=await browser.newContext({viewport:{width:1920,height:1080}});
 await ctx.route('**/*',r=>{const u=new URL(r.request().url());return ['127.0.0.1','fonts.googleapis.com','fonts.gstatic.com'].includes(u.hostname)?r.continue():r.abort();});
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/runamarca/hybrid/index.html');await page.waitForFunction(()=>typeof render==='function'&&document.getElementById('create'));await page.evaluate(()=>document.fonts.ready);return {name,browser,ctx,page,errors};}
const A=await seat('A'),B=await seat('B'),seats=[A,B];
const api=async(P,tok,code,body)=>{const r=await P.page.request.fetch(`${base}/runamarca/api/rooms/${code}/${body?'act':'state'}`,{method:body?'POST':'GET',headers:{'content-type':'application/json','x-player-token':tok},data:body?JSON.stringify(body):undefined});let j=null;try{j=await r.json();}catch{}if(body&&r.status()!==200)throw Error(`${P.name} ${body.type}: ${r.status()} ${JSON.stringify(j)}`);return j;};
const observe=P=>P.page.evaluate(()=>{const c=document.getElementById('round-circuit'),me=state.players.find(p=>p.id===state.you),rv=state.players.find(p=>p.id!==state.you);if(!c)return {phase:state.phase,circuit:null};
 const R=n=>{const r=n?.getBoundingClientRect();return r&&r.width?{x:+(r.x+r.width/2).toFixed(1),y:+(r.y+r.height/2).toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1)}:null;};
 const q=window.RunaHybrid?.scene?.field?.quad||[],fy=q.length?(Math.min(...q.map(p=>p.y))+Math.max(...q.map(p=>p.y)))/2:innerHeight/2,active=c.dataset.active,lit=active==='ally'?'.rc-ally':active==='rival'?'.rc-rival':null,litBox=lit?R(c.querySelector(lit)):null;
 const ownBand=R(document.querySelector('#self-head')?.closest('.player-band')),rivalBand=R(document.querySelector('#opponent-head')?.closest('.player-band'));
 const confirm=[...document.querySelectorAll('#phase-actions button')].map(b=>({text:(b.querySelector('.slot-text')?.textContent||b.textContent).trim(),enabled:!b.disabled&&b.getAttribute('aria-disabled')!=='true'}));
 const lights={ally:R(c.querySelector('.rc-ally')),rival:R(c.querySelector('.rc-rival')),combat:R(c.querySelector('.rc-combat'))},paths={ally:R(c.querySelector('.rc-path-ally')),rival:R(c.querySelector('.rc-path-rival'))};
 return {phase:state.phase,round:state.round,engineTurnIsMine:state.phase==='prep'?state.turn===state.you:null,turnName:state.players.find(p=>p.id===state.turn)?.name||null,me:me.name,active,
  litLight:litBox,litSide:litBox?(litBox.y>fy?'near (own half)':'far (rival half)'):null,litInCircuit:litBox?(litBox.y>(active==='ally'?R(c.querySelector('.rc-rival')):R(c.querySelector('.rc-ally'))).y?'lower light (toward own seat)':'upper light (toward rival)'):null,fieldCentreY:+fy.toFixed(1),ownBandY:ownBand?.y,rivalBandY:rivalBand?.y,
  caption:c.querySelector('.round-circuit-state')?.hidden?null:c.querySelector('.round-circuit-state')?.textContent||null,aria:c.getAttribute('aria-label'),tags:[...c.querySelectorAll('.rc-light-tag')].map(t=>t.textContent),confirm,lights,paths};});
const both=async label=>{const [a,b]=await Promise.all(seats.map(observe));await Promise.all(seats.map(P=>P.page.screenshot({path:path.join(out,`${label}-${P.name}.png`)})));return {label,A:a,B:b};};
// samples of the circuit right after a turn change, both pages, every 40 ms for `ms`
const sampleChange=async ms=>{const t0=Date.now(),rows=[];while(Date.now()-t0<ms){const [a,b]=await Promise.all(seats.map(P=>P.page.evaluate(()=>({turnMine:state.phase==='prep'?state.turn===state.you:null,phase:state.phase,active:document.getElementById('round-circuit')?.dataset.active}))));rows.push({t:Date.now()-t0,A:a,B:b});await sleep(40);}
 const compact=[];for(const r of rows){const k=JSON.stringify([r.A,r.B]);if(compact.at(-1)?.k!==k)compact.push({t:r.t,k,A:r.A,B:r.B});}return compact.map(({t,A,B})=>({t,A,B}));};
const report={states:[],changes:[]};
try{
 await A.page.fill('#player-name','Marika QA');await A.page.click('#create');await A.page.waitForFunction(()=>state?.code);const code=await A.page.evaluate(()=>state.code);
 await B.page.fill('#player-name','Lyrik QA');await B.page.fill('#join-code',code);await B.page.click('#join');await B.page.waitForFunction(()=>state?.players?.length===2);
 const tok=Object.fromEntries(await Promise.all(seats.map(async P=>[P.name,(await P.page.evaluate(()=>JSON.parse(sessionStorage.getItem('runamarca-nova-seat')))).token])));report.code=code;
 await api(A,tok.A,code,{type:'deck',deckId:'fluxo-virelion',art:{}});await api(B,tok.B,code,{type:'deck',deckId:'forja-oficina-lyrik',art:{}});
 await A.page.waitForFunction(()=>state?.phase==='mulligan');await sleep(1500);await api(A,tok.A,code,{type:'confirmMulligan'});await api(B,tok.B,code,{type:'confirmMulligan'});
 await A.page.waitForFunction(()=>state?.phase==='prep');for(const P of seats)await P.page.waitForFunction(()=>document.querySelectorAll('#hand>.hand-card:not([data-hybrid-waiting])').length>=4&&document.querySelector('.hybrid-draw-lock')?.hidden!==false,null,{timeout:30000}).catch(()=>{});await sleep(800);
 report.scene=await (await fetch(`${control}/scene/${code}`,{method:'POST'})).json();await sleep(600);
 // preparation: alternate by real clicks on "Encerrar" of the active seat
 for(let k=0;k<4;k++){const s=await both('prep-r1-'+k);report.states.push(s);if(s.A.phase!=='prep')break;const active=s.A.engineTurnIsMine?A:B;
  await active.page.mouse.move(5,5);await active.page.locator('#phase-actions button',{hasText:'Encerrar'}).click();const change=await sampleChange(2200);report.changes.push({after:`${active.name} encerrou`,timeline:change});await sleep(300);
  if((await A.page.evaluate(()=>state.phase))!=='prep')break;}
 report.states.push(await both('vote'));
 await A.page.locator('#phase-actions button',{hasText:'Começar combate'}).click();await A.page.waitForFunction(()=>state.phase==='formation');await sleep(2200);report.states.push(await both('formation'));
 for(const P of seats){await P.page.locator('#phase-actions button.formation-confirm').click();await sleep(500);}
 await A.page.waitForFunction(()=>state.phase==='resolving',null,{timeout:15000});await sleep(1500);report.states.push(await both('combat'));
 await A.page.waitForFunction(()=>state.phase==='prep',null,{timeout:40000});const after=await sampleChange(2500);report.changes.push({after:'fim do combate',timeline:after});await sleep(1500);
 report.states.push(await both('prep-r2-first'));
 const s=report.states.at(-1),active=s.A.engineTurnIsMine?A:B;await active.page.mouse.move(5,5);await active.page.locator('#phase-actions button',{hasText:'Encerrar'}).click();report.changes.push({after:`${active.name} encerrou (rodada 2)`,timeline:await sampleChange(2200)});await sleep(500);report.states.push(await both('prep-r2-second'));
}catch(e){report.error=e.message;console.log('ERROR',e.message);}
finally{report.errors={A:A.errors,B:B.errors};for(const P of seats)await P.browser.close().catch(()=>{});fs.writeFileSync(path.join(out,'turno.json'),JSON.stringify(report,null,1));}
for(const s of report.states)for(const k of ['A','B']){const o=s[k];console.log(s.label,k,o.me,'| motor: vez minha?',o.engineTurnIsMine,'turno de',o.turnName,'| luz',o.active,'| lado na tela',o.litSide,'| no circuito',o.litInCircuit,'| legenda',o.caption,'| aria',o.aria,'| confirmar',JSON.stringify(o.confirm?.map(c=>c.text+(c.enabled?'+':'-'))));}
for(const c of report.changes)console.log('troca:',c.after,JSON.stringify(c.timeline.map(r=>[r.t,r.A.active,r.B.active])));
