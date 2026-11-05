// S4: Patron abilities on the hybrid route at 320 px (stacked column) and Marika's portrait
// detail. Measures, along the real layout axis (vertical), the distance between the edges of
// the two ability buttons, the cost badge position (centred on top of its button) and any
// collision of the badge with the previous ability or clipping by the band.
// Usage: node scripts/s4-stack.mjs <out-dir>
import fs from 'node:fs';
import {launch,open,paint,view,URL_HYBRID,URL_NATIVE} from './hybrid12-lib.mjs';
import {setup} from '../mesa-nova/r1-fixtures.mjs';
const out=process.argv[2]||'prototype-qa/s4/stack';fs.mkdirSync(out,{recursive:true});
const PAIRS=[['ruptura-grupo','fluxo-virelion'],['fluxo-virelion','forja-oficina-lyrik']],result={stack:[],detail:[]},browser=await launch();
function measure(){const r=n=>{if(!n)return null;const b=n.getBoundingClientRect();return {l:+b.left.toFixed(2),t:+b.top.toFixed(2),r:+b.right.toFixed(2),b:+b.bottom.toFixed(2),cx:+(b.left+b.width/2).toFixed(2),w:+b.width.toFixed(2),h:+b.height.toFixed(2)};};
 const hits=(a,b)=>a&&b&&a.l<b.r&&b.l<a.r&&a.t<b.b&&b.t<a.b;
 return [...document.querySelectorAll('.player-band')].map(band=>{const side=band.querySelector('[id$="-head"]')?.id,wraps=[...band.querySelectorAll('.patron-power-wrap')],P=wraps.map(w=>({name:w.querySelector('.patron-power')?.dataset.power,button:r(w.querySelector('.patron-power')),badge:r(w.querySelector('.power-cost b')),text:w.querySelector('.power-cost b')?.textContent,caption:r(w.querySelector('.power-caption'))}));
  const dir=getComputedStyle(band.querySelector('.patron-powers')).flexDirection,B=r(band),[a,b]=P;
  const stacked=a&&b&&b.button.t>=a.button.b-0.5;
  const badgeOk=P.map(p=>{const el=band.querySelector(`.patron-power[data-power="${p.name}"] .power-cost b`),fs=el&&parseFloat(getComputedStyle(el).fontSize);
   const vis=el&&getComputedStyle(el),clip=[...document.querySelectorAll('.patron-power-wrap,.patron-powers,.patron-equipment,.player-band')].filter(n=>n.contains(el)&&getComputedStyle(n).overflow!=='visible').map(n=>{const q=n.getBoundingClientRect();return q.top<=p.badge.t+0.5&&q.bottom>=p.badge.b-0.5&&q.left<=p.badge.l+0.5&&q.right>=p.badge.r-0.5;});
   return {centredDx:+(p.badge.cx-p.button.cx).toFixed(2),topEdgeDy:+((p.badge.t+p.badge.h/2)-p.button.t).toFixed(2),fontPx:fs,visible:!!vis&&vis.visibility!=='hidden'&&vis.display!=='none'&&+vis.opacity>0,notClipped:clip.every(Boolean),inViewport:p.badge.t>=0&&p.badge.b<=innerHeight&&p.badge.l>=0&&p.badge.r<=innerWidth};});
  return {side,flexDirection:dir,stacked,axis:stacked?'vertical':'horizontal',edgeDistance:a&&b?+(stacked?b.button.t-a.button.b:b.button.l-a.button.r).toFixed(2):null,
   badgeCollidesPrevious:a&&b?Boolean(hits(b.badge,a.button)||(a.caption?.h>0&&hits(b.badge,a.caption))):null,badgeClearance:a&&b&&stacked?+(b.badge.t-a.button.b).toFixed(2):null,column:r(band.querySelector('.patron-powers')),powers:P,badges:badgeOk,band:B};});}
try{for(const [route,url,w,h] of [['hybrid',URL_HYBRID,320,700],['native',URL_NATIVE,320,700]])for(const [aDeck,bDeck] of PAIRS){
 const {room,a}=setup({aDeck,bDeck});room.phase='prep';room.turn=a.id;
 const {context,page}=await open(browser,{width:w,height:h},{url});await paint(page,{...JSON.parse(JSON.stringify(view(room,a))),serverNow:Date.now()},700);
 const bands=await page.evaluate(measure);result.stack.push({route,w,aDeck,bands});
 for(const b of bands){const el=await page.$(`#${b.side}`);const band=el&&(await el.evaluateHandle(n=>n.closest('.player-band'))).asElement();if(band)await band.screenshot({path:`${out}/band-${route}-${w}-${aDeck}-${b.side}.png`}).catch(()=>{});
  if(b.column)await page.screenshot({path:`${out}/powers-${route}-${w}-${aDeck}-${b.side}.png`,clip:{x:Math.max(0,b.column.l-14),y:Math.max(0,b.column.t-26),width:Math.min(w,b.column.w+28),height:b.column.h+34}}).catch(()=>{});}
 if(aDeck==='fluxo-virelion'){await page.click('#self-head .patron-card');await page.waitForTimeout(250);
  result.detail.push({route,w,patron:'Marika',text:await page.evaluate(()=>document.getElementById('card-detail')?.open?document.getElementById('detail-content').innerText:null)});await page.screenshot({path:`${out}/detail-${route}-${w}-marika.png`});}
 await context.close();}}finally{await browser.close();}
fs.writeFileSync(`${out}/s4-stack.json`,JSON.stringify(result,null,1));
for(const s of result.stack)for(const b of s.bands)console.log(s.route,s.w,s.aDeck,b.side,b.axis,'edge',b.edgeDistance,'collide',b.badgeCollidesPrevious,'clear',b.badgeClearance,'badges',JSON.stringify(b.badges));
for(const d of result.detail)console.log('detail',d.route,d.patron,JSON.stringify(d.text));
