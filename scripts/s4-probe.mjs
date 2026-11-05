// S4 probe: entry form (bottom edge), Patron abilities (gap between abilities, cost position,
// hidden name, portrait detail) on native and hybrid routes at 1440, 390 and 320 px.
// Usage: node scripts/s4-probe.mjs <out-dir>. Screenshots + s4-probe.json in <out-dir>.
import fs from 'node:fs';
import {launch,open,paint,view,URL_HYBRID,URL_NATIVE} from './hybrid12-lib.mjs';
import {setup} from '../mesa-nova/r1-fixtures.mjs';
const out=process.argv[2]||'prototype-qa/s4/probe';fs.mkdirSync(out,{recursive:true});
const SIZES=[[1440,900],[390,800],[320,700]],ROUTES=[['native',URL_NATIVE],['hybrid',URL_HYBRID]];
const PAIRS=[['ruptura-grupo','fluxo-virelion'],['forja-oficina-lyrik','ruptura-grupo']];
const result={entry:[],patrons:[]},browser=await launch();
function measurePowers(){const r=n=>{const b=n.getBoundingClientRect();return {l:+b.left.toFixed(2),r:+b.right.toFixed(2),t:+b.top.toFixed(2),b:+b.bottom.toFixed(2),w:+b.width.toFixed(2),h:+b.height.toFixed(2),cx:+(b.left+b.width/2).toFixed(2)};};
 return [...document.querySelectorAll('.player-band')].map(band=>{const head=band.querySelector('[id$="-head"]'),wraps=[...band.querySelectorAll('.patron-power-wrap')];
  const powers=wraps.map(w=>{const p=w.querySelector('.patron-power'),c=p?.querySelector('.power-cost b')||w.querySelector('.power-cost b'),cost=w.querySelector('.power-cost');return {name:p?.dataset.power,wrap:r(w),button:p&&r(p),cost:cost&&r(cost),costValue:c&&r(c),costText:c?.textContent,costAboveButton:c&&p?r(c).b<=r(p).t+0.5:null,costCenterDx:c&&p?+(r(c).cx-r(p).cx).toFixed(2):null};});
  const name=band.querySelector('.band-identity .patron-info strong');
  return {side:head?.id,gap:wraps.length===2?+(wraps[1].getBoundingClientRect().left-wraps[0].getBoundingClientRect().right).toFixed(2):null,centers:wraps.length===2?+(powers[1].button.cx-powers[0].button.cx).toFixed(2):null,powers,nameVisible:!!name&&getComputedStyle(name).display!=='none'&&name.getBoundingClientRect().width>0,nameText:name?.textContent||null,portrait:!!band.querySelector('.patron-card')&&r(band.querySelector('.patron-card')).w>0};});}
try{for(const [route,url] of ROUTES)for(const [w,h] of SIZES){
 const tag=`${route}-${w}`;
 // Entry form (no state = lobby gate).
 {const {context,page}=await open(browser,{width:w,height:h},{url});await page.waitForTimeout(500);
  const form=await page.$('.entry');const info=await page.evaluate(()=>{const e=document.querySelector('.entry'),b=e?.getBoundingClientRect(),cs=e&&getComputedStyle(e),name=document.getElementById('player-name');
   return {rect:b&&{l:b.left,t:b.top,w:b.width,h:b.height},border:cs&&[cs.borderBottom,cs.boxShadow,cs.outline].join(' | '),after:e&&getComputedStyle(e,'::after').content+' '+getComputedStyle(e,'::after').background,before:e&&getComputedStyle(e,'::before').content,overflow:cs?.overflow,nameVisible:!!name&&name.getBoundingClientRect().width>0,buttons:[...document.querySelectorAll('.entry button')].filter(b=>b.getBoundingClientRect().width>0).map(b=>b.textContent.trim())};});
  if(form)await form.screenshot({path:`${out}/entry-${tag}.png`});
  await page.focus('#player-name').catch(()=>{});if(form)await form.screenshot({path:`${out}/entry-focus-${tag}.png`});
  info.focusOutline=await page.evaluate(()=>{const n=document.activeElement;return n?.id+' '+getComputedStyle(n).outlineStyle+' '+getComputedStyle(n).boxShadow;});
  result.entry.push({route,w,...info});await context.close();}
 // Patrons on a Preparation table.
 for(const [aDeck,bDeck] of PAIRS){const {room,a}=setup({aDeck,bDeck});room.phase='prep';room.turn=a.id;
  const {context,page}=await open(browser,{width:w,height:h},{url});await paint(page,{...JSON.parse(JSON.stringify(view(room,a))),serverNow:Date.now()},700);
  const m=await page.evaluate(measurePowers);const pair=`${tag}-${aDeck}`;
  for(const band of m){const el=await page.$(`#${band.side}`);const b=el&&await el.evaluateHandle(n=>n.closest('.player-band'));if(b)await b.asElement()?.screenshot({path:`${out}/band-${pair}-${band.side}.png`}).catch(()=>{});}
  await page.click('#self-head .patron-card').catch(()=>{});await page.waitForTimeout(250);
  const detail=await page.evaluate(()=>{const d=document.getElementById('card-detail');return d?.open?document.getElementById('detail-content').innerText:null;});
  await page.screenshot({path:`${out}/detail-${pair}.png`}).catch(()=>{});
  result.patrons.push({route,w,aDeck,bDeck,bands:m,detail});await context.close();}
}}finally{await browser.close();}
fs.writeFileSync(`${out}/s4-probe.json`,JSON.stringify(result,null,1));
for(const e of result.entry)console.log('entry',e.route,e.w,'border',e.border,'after',e.after,'buttons',e.buttons.length);
for(const p of result.patrons)for(const b of p.bands)console.log('patron',p.route,p.w,p.aDeck,b.side,'gap',b.gap,'centers',b.centers,'name',b.nameVisible,b.nameText,'cost',b.powers.map(x=>x.costText+'@'+x.costCenterDx+'/'+x.costAboveButton).join(' '));
for(const p of result.patrons.filter(p=>p.w===1440))console.log('detail',p.route,p.aDeck,JSON.stringify(p.detail));
