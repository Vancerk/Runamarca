import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {setup,card,view} from '../mesa-nova/r1-fixtures.mjs';
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/vanxf/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {room,a,b}=setup({aDeck:'forja-oficina-lyrik',bDeck:'ruptura-grupo'}),checks=[],errors=[];
const check=(name,ok,detail)=>{checks.push({name,pass:!!ok,detail});assert.ok(ok,name+' '+JSON.stringify(detail??''));};
for(const p of [a,b]){p.patron.hp=p.patron.maxHp=16;p.hand=Array.from({length:9},()=>card('FV03',p));p.reserve=Array.from({length:8},()=>card('FV03',p));}
const hidden=card('FV02',b);b.prepared.push({card:hidden,lane:2,targetSide:a.id,hidden:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 const context=await browser.newContext({viewport:{width:1920,height:900},deviceScaleFactor:1,reducedMotion:'reduce'});
 await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:3086/runamarca/hybrid/index.html');await page.waitForFunction(()=>typeof render==='function');
 const paint=async(owner=a)=>{await page.evaluate(s=>{state=s;serverClockOffset=Date.now()-s.serverNow;render();},view(room,owner));await page.waitForTimeout(180);};
 for(let mana=0;mana<=10;mana++){
  for(const p of [a,b])p.mana=p.manaMax=mana;await paint();
  const resources=await page.locator('.patron-ether').evaluateAll(ns=>ns.map(n=>({label:n.getAttribute('aria-label'),count:n.querySelector('.ether-count').textContent,all:n.querySelectorAll('.ether-point').length,available:n.querySelectorAll('.ether-point.available').length,locked:n.querySelectorAll('.ether-point.locked').length})));
  check('ether '+mana+' uses ten sockets and real capacity',resources.length===2&&resources.every(r=>r.all===10&&r.available===mana&&r.locked===10-mana&&r.count===mana+'/'+mana),resources);
 }
 for(const viewport of [{width:1280,height:720},{width:1440,height:900},{width:1920,height:1080},{width:1920,height:900},{width:390,height:1000},{width:320,height:1000}]){
  await page.setViewportSize(viewport);await paint();await page.waitForTimeout(700);
  const g=await page.evaluate(()=>{const r=n=>{const b=n.getBoundingClientRect();return {x:b.x,y:b.y,w:b.width,h:b.height,right:b.right,bottom:b.bottom,cx:b.x+b.width/2};},shelves=[...document.querySelectorAll('.reserve-camp')];return {width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,field:r(document.getElementById('lanes')),shelves:shelves.map(n=>({rect:r(n),cards:[...n.querySelectorAll('.card')].map(r)})),hands:[...document.querySelectorAll('.rival-hand-back')].map(r),powers:[...document.querySelectorAll('.player-band')].map(n=>n.querySelectorAll('.patron-power').length),emana:[...document.querySelectorAll('.combat-emanation .emana-empty')].map(n=>({rect:r(n),symbol:getComputedStyle(n,':after').content})),lanes:[...document.querySelectorAll('.lane')].map(r),arch:[...document.querySelectorAll('.patron-avatar .patron-card')].map(n=>[getComputedStyle(n).borderTopLeftRadius,getComputedStyle(n).borderBottomLeftRadius]),controls:document.getElementById('center-actions').innerText};});
  check(viewport.width+'x'+viewport.height+' no horizontal overflow',g.scrollWidth<=viewport.width);
  if(viewport.width>900)check(viewport.width+'x'+viewport.height+' no vertical scroll',g.scrollHeight<=viewport.height,g);
  check(viewport.width+' eight legal reserve cards contained',g.shelves.length===2&&g.shelves.every(s=>s.cards.length===8&&s.cards.every(c=>c.x>=s.rect.x-1&&c.right<=s.rect.right+1&&c.y>=s.rect.y-1&&c.bottom<=s.rect.bottom+1)),g.shelves);
  check(viewport.width+' nine hidden backs contained',g.hands.length===9&&g.hands.every(r=>r.x>=-1&&r.right<=viewport.width+1));
  check(viewport.width+' two powers per patron',g.powers.every(n=>n===2));
  check(viewport.width+' emana has symbol on both sides',g.emana.length===4&&g.emana.every(e=>e.symbol.includes('✦')));
  check(viewport.width+' interleaved C E C E C',g.emana.every(e=>e.rect.cx>g.lanes[0].cx&&e.rect.cx<g.lanes[1].cx||e.rect.cx>g.lanes[1].cx&&e.rect.cx<g.lanes[2].cx));
  check(viewport.width+' arched patrons with straight base',g.arch.every(r=>r[0].includes('48%')&&r[1]==='5px'));
  check(viewport.width+' phase round and action remain',g.controls.includes('Preparação')&&g.controls.includes('Rodada')&&g.controls.includes('Encerrar'));
  if(viewport.width>900){const before=g.field;await page.locator('#hand .hand-card').nth(4).hover();await page.waitForTimeout(400);const hovered=await page.evaluate(()=>{const b=document.getElementById('lanes').getBoundingClientRect();return {x:b.x,y:b.y,w:b.width,h:b.height,preview:!document.getElementById('hover-preview').hidden};});check(viewport.width+' hover keeps field stable and preview opens',hovered.x===before.x&&hovered.y===before.y&&hovered.w===before.w&&hovered.h===before.h&&hovered.preview,hovered);await page.screenshot({path:'prototype-qa/hybrid-2/revision6-hover-'+viewport.width+'x'+viewport.height+'.png'});await page.mouse.move(4,4);}
  await page.screenshot({path:'prototype-qa/hybrid-2/revision6-filled-'+viewport.width+'x'+viewport.height+'.png',fullPage:true});
 }
 await page.setViewportSize({width:1920,height:900});room.phase='formation';for(const p of [a,b])p.formation=p.reserve.slice(0,3).map(c=>c.uid);
 for(const owner of [a,b]){await paint(owner);check('own three occupied leaves five on shelf '+owner.id,await page.locator('#self-reserve .card').count()===5);check('enemy field secret '+owner.id,await page.locator('.lane-side:not(.own-drop) .card').count()===0);check('no hidden spell identity '+owner.id,!(await page.locator('#log').innerText()).includes(hidden.name));await page.screenshot({path:'prototype-qa/hybrid-2/revision6-private-'+(owner===a?'a':'b')+'.png'});}
 room.phase='resolving';room.combat={id:'approved-full-reveal',round:4,startedAt:Date.now()-9000,duration:11000,timeline:[{kind:'reveal',duration:9000},{kind:'result',duration:2000}],visual:[],lanes:[],spells:[]};await paint();check('both three occupied leave five after reveal',await page.locator('#self-reserve .card').count()===5&&await page.locator('#opponent-reserve .card').count()===5);await page.screenshot({path:'prototype-qa/hybrid-2/revision6-revealed.png'});
 check('no JavaScript errors',errors.length===0,errors);
}finally{await browser.close();fs.writeFileSync('prototype-qa/hybrid-2/revision6-concept.json',JSON.stringify({checks,errors},null,2));}
console.log(JSON.stringify({passed:checks.length,errors}));
