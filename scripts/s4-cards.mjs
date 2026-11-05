// S4 probe: card actions from the hand with real browser input (mouse, touch, keyboard) on
// native and hybrid routes. Every command the page sends to /api/rooms/... is captured and
// applied to the real engine (act); the engine's verdict and the new view are returned.
// Usage: node scripts/s4-cards.mjs <out-dir>
import fs from 'node:fs';
import {launch,open,paint,view,URL_HYBRID,URL_NATIVE} from './hybrid12-lib.mjs';
import {setup,card,place,unit,act,catalog} from '../mesa-nova/r1-fixtures.mjs';
const out=process.argv[2]||'prototype-qa/s4/cards';fs.mkdirSync(out,{recursive:true});
const results=[],browser=await launch();
function table(){const {room,a,b}=setup();room.phase='prep';room.turn=a.id;a.mana=a.manaMax=10;
 const hand={FL13:card('FL13',a),RG04:card('RG04',a),FEX05:card('FEX05',a),FV11:card('FV11',a)};a.hand=Object.values(hand);
 const ally=place(a,unit(a),0),foe=place(b,unit(b),0);return {room,a,b,hand,ally,foe};}
async function session(route,url,{touch=false}={}){const t=table(),sent=[];
 const {context,page}=await open(browser,touch?{width:390,height:800}:{width:1440,height:900},{url,touch});
 await context.route('**/api/rooms/**',async r=>{const req=r.request();if(req.method()!=='POST')return r.continue();let body={};try{body=JSON.parse(req.postData()||'{}');}catch{}
  let verdict;try{act(t.room,t.a,body,catalog);verdict={accepted:true};}catch(e){verdict={accepted:false,error:e.message};}
  sent.push({url:new URL(req.url()).pathname,body,engine:verdict});
  await r.fulfill({status:verdict.accepted?200:400,contentType:'application/json',body:JSON.stringify(verdict.accepted?{state:{...view(t.room,t.a),serverNow:Date.now()}}:{error:verdict.error})});});
 await paint(page,{...JSON.parse(JSON.stringify(view(t.room,t.a))),serverNow:Date.now()},700);
 return {t,sent,context,page};}
const center=async(page,sel)=>{const b=await page.locator(sel).first().boundingBox();return b&&{x:b.x+b.width/2,y:b.y+b.height/2};};
const handSel=uid=>`#hand [data-uid="${uid}"]`,cardSel=uid=>`#lanes .lane-side .card[data-uid="${uid}"]`,laneSel=(owner,lane)=>`.lane-side[data-owner="${owner}"][data-lane="${lane}"]`;
async function drag(page,from,to){await page.mouse.move(from.x,from.y);await page.mouse.down();for(let i=1;i<=14;i++){await page.mouse.move(from.x+(to.x-from.x)*i/14,from.y+(to.y-from.y)*i/14);await page.waitForTimeout(16);}await page.waitForTimeout(120);await page.mouse.up();await page.waitForTimeout(500);}
const toast=page=>page.evaluate(()=>{const t=document.getElementById('toast');return t&&getComputedStyle(t).visibility!=='hidden'&&t.classList.contains('show')?t.textContent:'';});
const legal=page=>page.evaluate(()=>[...document.querySelectorAll('.aim-legal')].map(n=>{const r=n.getBoundingClientRect();return {uid:n.dataset.uid||null,id:n.id||null,cls:String(n.className).split(' ').slice(0,3).join('.'),x:r.left+r.width/2,y:r.top+r.height/2};}));
// Real pointer input on a legal target (the aim layer is on top, so no element-level click).
const hitLegal=async(page,uid,{tap=false}={})=>{await page.evaluate(uid=>{const n=[...document.querySelectorAll('.aim-legal')].find(n=>!uid||n.dataset.uid===uid);n?.scrollIntoView({block:'center'});},uid);await page.waitForTimeout(200);const all=await legal(page),t=all.find(n=>!uid||n.uid===uid);if(!t)return {legal:all,hit:null};if(tap)await page.touchscreen.tap(t.x,t.y);else await page.mouse.click(t.x,t.y);await page.waitForTimeout(500);return {legal:all,hit:t};};
const state=page=>page.evaluate(()=>({aim:!!document.querySelector('.target-aim-tools'),aimTools:[...document.querySelectorAll('.target-aim-tools > *')].map(n=>n.textContent),dialog:document.getElementById('target-picker')?.open?document.getElementById('target-picker').innerText:null}));
async function run(route,url,name,fn,opts){const s=await session(route,url,opts);const rec={route,case:name};try{Object.assign(rec,await fn(s));}catch(e){rec.error=String(e.message||e);}
 rec.sent=s.sent;await s.page.screenshot({path:`${out}/${route}-${name}.png`}).catch(()=>{});await s.context.close();results.push(rec);
 console.log(route,name,'| sent',JSON.stringify(s.sent.map(x=>({...x.body,engine:x.engine.accepted?'aceito':'recusado: '+x.engine.error}))),'|',JSON.stringify(Object.fromEntries(Object.entries(rec).filter(([k])=>!['route','case','sent'].includes(k)))).slice(0,300));}
try{for(const [route,url] of [['native',URL_NATIVE],['hybrid',URL_HYBRID]]){
 // FL13 is enemy-position only: drag to a legal enemy house, then to an own (invalid) house.
 await run(route,url,'FL13-drag-legal-enemy-lane1',async({t,page})=>{await drag(page,await center(page,handSel(t.hand.FL13.uid)),await center(page,laneSel(t.b.id,1)));return {inHandAfter:await page.locator(handSel(t.hand.FL13.uid)).count(),prepared:t.b.prepared?.length??null,preparedA:t.a.prepared?.length??null};});
 await run(route,url,'FL13-drag-invalid-own-lane1',async({t,page})=>{await drag(page,await center(page,handSel(t.hand.FL13.uid)),await center(page,laneSel(t.a.id,1)));return {inHandAfter:await page.locator(handSel(t.hand.FL13.uid)).count(),toast:await toast(page),...await state(page)};});
 await run(route,url,'FL13-click',async({t,page})=>{await page.click(handSel(t.hand.FL13.uid));await page.waitForTimeout(250);return {toast:await toast(page),...await state(page)};});
 // RG04 is direct only: click opens the direct use (no trap option); confirm it.
 await run(route,url,'RG04-click-direct',async({t,page})=>{await page.click(handSel(t.hand.RG04.uid));await page.waitForTimeout(250);const before=await state(page);
  let target=null;if(before.dialog){await page.locator('#target-picker button.primary').first().click();await page.waitForTimeout(500);}else if(before.aim)target=await hitLegal(page,null);return {before,target,trapOptionOffered:/armadilha|Aliada |Inimiga /i.test(before.dialog||''),after:await state(page)};});
 // FEX05 targets an ally creature: mouse, keyboard, cancel; touch below.
 await run(route,url,'FEX05-click-target-mouse',async({t,page})=>{await page.click(handSel(t.hand.FEX05.uid));await page.waitForTimeout(250);const aim=await state(page);const target=await hitLegal(page,t.ally.uid);return {aim,target,after:await state(page)};});
 await run(route,url,'FEX05-keyboard-enter',async({t,page})=>{await page.click(handSel(t.hand.FEX05.uid));await page.waitForTimeout(250);const aim=await state(page);
  const focused=await page.evaluate(sel=>{const n=document.querySelector(sel);n?.focus();return document.activeElement===n?'focus':'not-focusable:'+n?.tabIndex;},cardSel(t.ally.uid));await page.keyboard.press('Enter');await page.waitForTimeout(500);return {aim,focused,after:await state(page)};});
 await run(route,url,'FEX05-cancel-escape',async({t,page})=>{await page.click(handSel(t.hand.FEX05.uid));await page.waitForTimeout(250);const aim=await state(page);await page.keyboard.press('Escape');await page.waitForTimeout(250);return {aim,after:await state(page),inHandAfter:await page.locator(handSel(t.hand.FEX05.uid)).count()};});
 await run(route,url,'FEX05-touch-tap',async({t,page})=>{await page.locator(handSel(t.hand.FEX05.uid)).scrollIntoViewIfNeeded();const h=await center(page,handSel(t.hand.FEX05.uid));await page.touchscreen.tap(h.x,h.y);await page.waitForTimeout(300);const aim=await state(page);const target=await hitLegal(page,t.ally.uid,{tap:true});return {handTap:h,aim,target,after:await state(page)};},{touch:true});
}}finally{await browser.close();}
fs.writeFileSync(`${out}/s4-cards.json`,JSON.stringify(results,null,1));
