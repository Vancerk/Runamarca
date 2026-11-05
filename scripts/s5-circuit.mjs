// S5 probe: follows one full round through the real engine (endPrep A → endPrep B → vote /
// formation → ready → resolving → resolveCombat → next round) and paints each view for both
// seats on native and hybrid routes (desktop and phone). Records the round circuit state and
// the Registro drawer (closed and open: visible, hit-testable summary). Screenshots per step.
// Usage: node scripts/s5-circuit.mjs <out-dir>
import fs from 'node:fs';
import {launch,open,paint,URL_HYBRID,URL_NATIVE} from './hybrid12-lib.mjs';
import {setup,place,unit,act,catalog,view,resolveCombat} from '../mesa-nova/r1-fixtures.mjs';
const out=process.argv[2]||'prototype-qa/s5/circuit';fs.mkdirSync(out,{recursive:true});
const result=[],browser=await launch();
// Engine-driven round; each step keeps the room as the server would publish it.
function round(){const {room,a,b}=setup();place(a,unit(a,{attack:5,health:3}),0);place(b,unit(b,{attack:5,health:3}),0);place(a,unit(a,{attack:1,health:9}),1);place(b,unit(b,{attack:2,health:9}),1);
 room.phase='prep';room.turn=a.id;const steps=[],snap=label=>steps.push({label,phase:room.phase,round:room.round,turn:room.turn===a.id?'A':room.turn===b.id?'B':room.turn,views:{a:JSON.parse(JSON.stringify(view(room,a))),b:JSON.parse(JSON.stringify(view(room,b)))}});
 snap('prep-A');act(room,a,{type:'endPrep'},catalog);snap('after-endPrep-A');act(room,b,{type:'endPrep'},catalog);snap('after-endPrep-B');
 for(let guard=0;guard<4&&room.phase!=='resolving';guard++){if(room.phase==='vote'){try{act(room,a,{type:'vote',fight:true},catalog);}catch{}try{act(room,b,{type:'vote',fight:true},catalog);}catch{}snap('vote-'+guard);}
  if(room.phase==='formation'){snap('formation');for(const p of [a,b])try{act(room,p,{type:'ready'},catalog);}catch{}}if(!['vote','formation','resolving'].includes(room.phase))break;}
 if(room.phase==='resolving'){snap('combat');room.combat.startedAt-=room.combat.duration+500;resolveCombat(room);snap('next-round');}
 return steps;}
const steps=round();
function circuit(){const c=document.getElementById('round-circuit');if(!c)return null;const css=sel=>{const n=c.querySelector(sel),s=n&&getComputedStyle(n);return s&&{fill:s.fill,stroke:s.stroke,filter:s.filter,animation:s.animationName};};
 const panel=document.getElementById('phase-actions');return {label:c.querySelector('.round-circuit-label')?.textContent,active:c.dataset.active,phase:c.dataset.phase,aria:c.getAttribute('aria-label'),ally:css('.rc-ally'),rival:css('.rc-rival'),combat:css('.rc-combat'),pathAlly:css('.rc-path-ally'),pathRival:css('.rc-path-rival'),
  buttonsInCircuit:c.querySelectorAll('button').length,panelText:document.getElementById('center-actions')?.innerText.replace(/s+/g,' ').trim(),pointerEvents:getComputedStyle(c).pointerEvents,actionButtons:[...(panel?.querySelectorAll('button')||[])].map(b=>b.textContent.trim()).filter(Boolean)};}
function registro(){const d=document.getElementById('camp-log'),s=d?.querySelector('summary');if(!s)return null;const r=s.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
 return {open:d.open,summary:{x:+r.left.toFixed(1),y:+r.top.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1)},inWindow:r.width>0&&r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth,hit:hit===s||s.contains(hit),hitBy:hit&&!(hit===s||s.contains(hit))?(hit.id||String(hit.className).slice(0,40)):null,lines:d.querySelectorAll('#log p').length};}
try{for(const [route,url] of [['native',URL_NATIVE],['hybrid',URL_HYBRID]])for(const [w,h,dev] of [[1440,900,'desktop'],[390,800,'phone']])for(const seat of ['a','b']){
 const {context,page}=await open(browser,{width:w,height:h},{url});
 for(const st of steps){await paint(page,{...st.views[seat],serverNow:Date.now()},st.label==='combat'?900:450);
  const c=await page.evaluate(circuit),tag=`${route}-${dev}-${seat}-${st.label}`;const el=await page.$('#center-actions');if(el)await el.screenshot({path:`${out}/circuit-${tag}.png`}).catch(()=>{});
  const rec={route,dev,seat,step:st.label,enginePhase:st.phase,round:st.round,turn:st.turn,circuit:c};
  if(st.label==='next-round'){rec.registroClosed=await page.evaluate(registro);await page.screenshot({path:`${out}/registro-closed-${route}-${dev}-${seat}.png`});
   await page.click('#camp-log>summary').catch(e=>rec.clickError=String(e.message).slice(0,160));await page.waitForTimeout(250);rec.registroOpen=await page.evaluate(registro);await page.screenshot({path:`${out}/registro-open-${route}-${dev}-${seat}.png`});
   await page.click('#camp-log>summary').catch(e=>rec.closeError=String(e.message).slice(0,160));await page.waitForTimeout(200);rec.registroReclosed=await page.evaluate(()=>document.getElementById('camp-log')?.open);}
  result.push(rec);}
 await context.close();}}finally{await browser.close();}
fs.writeFileSync(`${out}/s5-circuit.json`,JSON.stringify({steps:steps.map(({views,...s})=>s),result},null,1));
console.log('engine steps',steps.map(s=>`${s.label}:${s.phase}/r${s.round}/${s.turn}`).join(' → '));
for(const r of result)console.log(r.route,r.dev,r.seat,r.step.padEnd(16),r.enginePhase.padEnd(10),'|',r.circuit?`${r.circuit.label} active=${r.circuit.active} combatFill=${r.circuit.combat?.fill} anim=${r.circuit.pathAlly?.animation} btnsInCircuit=${r.circuit.buttonsInCircuit} actions=${JSON.stringify(r.circuit.actionButtons)} painel=${JSON.stringify(r.circuit.panelText)}`:'(sem circuito)',r.registroClosed?`| Registro fechado hit=${r.registroClosed.hit}${r.registroClosed.hitBy?'('+r.registroClosed.hitBy+')':''} inWin=${r.registroClosed.inWindow} · aberto open=${r.registroOpen?.open} hit=${r.registroOpen?.hit}${r.registroOpen?.hitBy?'('+r.registroOpen.hitBy+')':''} inWin=${r.registroOpen?.inWindow} linhas=${r.registroOpen?.lines} · refecha=${!r.registroReclosed} ${r.clickError||''}${r.closeError||''}`:'');
