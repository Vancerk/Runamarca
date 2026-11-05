// Revision 10 regression: decorative 3D corner objects never block play.
// Uses the public fixtures and the local server only; nothing is sent elsewhere.
import fs from 'node:fs';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {setup,card,view} from '../mesa-nova/r1-fixtures.mjs';
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/vanxf/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out=process.env.HYBRID_QA_OUT||'prototype-qa/hybrid-10/qa',checks=[],errors=[];fs.mkdirSync(out,{recursive:true});
const check=(name,value,detail)=>{checks.push({name,pass:!!value,detail});assert.ok(value,name+' '+JSON.stringify(detail??''));};
const {room,a,b}=setup();for(const p of [a,b]){p.hand=Array.from({length:9},()=>card('FV03',p));p.reserve=Array.from({length:5},()=>card('FV03',p));}room.phase='prep';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const viewports=[{width:1920,height:900,dpr:1},{width:1920,height:1080,dpr:1},{width:1440,height:900,dpr:1},{width:1280,height:720,dpr:2},{width:1920,height:900,dpr:2},{width:390,height:800,dpr:1},{width:320,height:800,dpr:2}];
try{for(const v of viewports){
 const id=`${v.width}x${v.height}-dpr${v.dpr}`;const context=await browser.newContext({viewport:{width:v.width,height:v.height},deviceScaleFactor:v.dpr,hasTouch:v.width<600});await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 const page=await context.newPage();page.on('pageerror',e=>errors.push(id+': '+e.message));
 // Count anything that could reach the server after the fixture is painted.
 // Static GET assets (e.g. audio unlocked by the first gesture) are listed but are
 // not game traffic; any other method or non-asset route counts as a request.
 await page.addInitScript(()=>{window.__sent=[];const send=WebSocket.prototype.send;WebSocket.prototype.send=function(...x){window.__sent.push({kind:'ws'});return send.apply(this,x);};const f=window.fetch;window.fetch=function(input,init={}){window.__sent.push({kind:'fetch',url:String(input?.url||input),method:String(init?.method||input?.method||'GET').toUpperCase()});return f.apply(this,arguments);};});
 const gameTraffic=list=>list.filter(e=>e.kind==='ws'||e.method!=='GET'||!/\.(mp3|ogg|wav|webm|m4a|opus|json|png|jpe?g|webp|svg|css|js|mjs)(\?|$)/i.test(new URL(e.url,(process.env.QA_BASE||'http://127.0.0.1:3086')+'/runamarca/').pathname));
 await page.goto((process.env.QA_BASE||'http://127.0.0.1:3086')+'/runamarca/hybrid/index.html');await page.waitForFunction(()=>typeof render==='function'&&window.RunaHybridProps);
 await page.evaluate(s=>{state=s;serverClockOffset=Date.now()-s.serverNow;render();window.__commands=0;const c=command;command=function(...x){window.__commands++;return c.apply(this,x);};},view(room,a));
 await page.waitForFunction(()=>RunaHybrid?.ready);await page.waitForTimeout(700);
 const canvasInput=await page.evaluate(()=>getComputedStyle(document.querySelector('.hybrid-canvas')).pointerEvents);check('canvas still ignores input '+id,canvasInput==='none',canvasInput);
 const info=await page.evaluate(()=>RunaHybridProps.stats);
 if(v.width<=1100){const layerHidden=await page.evaluate(()=>document.querySelector('.hybrid-props')?.hidden!==false);check('small screens drop the ornaments '+id,info.visible.length===0&&layerHidden,info);const scroll=await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1);check('no horizontal overflow '+id,scroll);await page.screenshot({path:out+'/props-'+id+'.png'});await context.close();continue;}
 check('at least one interactive corner object '+id,info.visible.length>=1,info);
 // Geometric isolation: no target overlaps any control, card, HUD or drop zone.
 const isolation=await page.evaluate(()=>{const sel='#game button,#game a,#game .card,#game .player-band,#game .reserve-camp,#game .board,#game .lane-side,#game .deck-stack,#self-deck,#opponent-deck,#hand,#opponent-hand,#game .camp-log,#game .nartvanyr,#center-actions,.camp-utilities>*,#hover-preview:not([hidden])';const boxes=[...document.querySelectorAll('.hybrid-prop:not([hidden])')].map(n=>n.getBoundingClientRect());const hits=[];for(const n of document.querySelectorAll(sel)){const r=n.getBoundingClientRect();if(!r.width||!r.height)continue;for(const p of boxes)if(r.left<p.right&&r.right>p.left&&r.top<p.bottom&&r.bottom>p.top)hits.push(n.id||n.className);}
  // Hit-test the centre of every visible control: it must never resolve to a prop.
  const stolen=[];for(const n of document.querySelectorAll('#game button,#game .card,#hand>.hand-card,#self-deck,#opponent-deck')){const r=n.getBoundingClientRect();if(!r.width||!r.height||r.bottom<0||r.top>innerHeight)continue;const e=document.elementFromPoint(Math.min(innerWidth-1,Math.max(0,r.left+r.width/2)),Math.min(innerHeight-1,Math.max(0,r.top+r.height/2)));if(e?.closest('.hybrid-prop'))stolen.push(n.className);}
  return {hits,stolen,sizes:boxes.map(b=>({w:b.width,h:b.height}))};});
 check('targets do not overlap game controls '+id,isolation.hits.length===0,isolation);check('controls keep their own hit tests '+id,isolation.stolen.length===0,isolation);check('targets are at least 44 px '+id,isolation.sizes.every(s=>s.w>=44&&s.h>=44),isolation);
 const before=await page.evaluate(()=>({state:JSON.stringify(state),builds:RunaHybrid.stats.builds,sent:window.__sent.slice(),hand:document.querySelectorAll('#hand>.hand-card').length,selfEther:JSON.stringify(seat()?.ether??seat()?.mana??null)}));
 await page.screenshot({path:out+'/props-rest-'+id+'.png'});
 for(const prop of info.visible){
  const box=info.boxes[prop],start=await page.evaluate(()=>RunaHybridProps.stats);
  // Pointer or touch activation on the dedicated target.
  if(v.width<600)await page.touchscreen.tap(box.x+box.w/2,box.y+box.h/2);else await page.mouse.click(box.x+box.w/2,box.y+box.h/2);
  await page.waitForTimeout(160);const mid=await page.evaluate(()=>RunaHybridProps.stats);check(prop+' reacts to a click '+id,mid.activations[prop]===start.activations[prop]+1&&mid.animating,mid);
  await page.screenshot({path:out+'/props-'+prop+'-motion-'+id+'.png'});
  if(prop==='armillary')check('armillary rings turn '+id,mid.armillarySpin.some((s,i)=>Math.abs(s-start.armillarySpin[i])>.05),{start:start.armillarySpin,mid:mid.armillarySpin});else check('compass needle swings '+id,Math.abs(mid.compassHeading)>.02,mid);
  await page.waitForFunction(()=>!RunaHybridProps.stats.animating,null,{timeout:8000});const rest=await page.evaluate(()=>RunaHybridProps.stats);await page.waitForTimeout(600);const later=await page.evaluate(()=>RunaHybridProps.stats);check(prop+' animation stops at rest '+id,!later.animating&&later.frames===rest.frames,{rest:rest.frames,later:later.frames});
  // Keyboard: focusable and activated by Enter / Space.
  await page.focus('.hybrid-prop[data-prop="'+prop+'"]');await page.keyboard.press('Enter');await page.waitForTimeout(60);await page.keyboard.press(' ');const keyed=await page.evaluate(()=>RunaHybridProps.stats);check(prop+' keyboard activation '+id,keyed.activations[prop]===start.activations[prop]+3,keyed);
  await page.waitForFunction(()=>!RunaHybridProps.stats.animating,null,{timeout:8000});await page.evaluate(()=>document.activeElement?.blur());
 }
 const after=await page.evaluate(()=>({state:JSON.stringify(state),builds:RunaHybrid.stats.builds,sent:window.__sent.slice(),commands:window.__commands,hand:document.querySelectorAll('#hand>.hand-card').length,selfEther:JSON.stringify(seat()?.ether??seat()?.mana??null)}));
 check('decoration sends no command or request '+id,after.commands===0&&gameTraffic(after.sent.slice(before.sent.length)).length===0,{commands:after.commands,requests:after.sent.slice(before.sent.length)});
 check('decoration leaves game state and resources untouched '+id,after.state===before.state&&after.selfEther===before.selfEther&&after.hand===before.hand);
 check('decoration does not rebuild the table '+id,after.builds===before.builds,{before:before.builds,after:after.builds});
 // While a card drag is active the targets become inert.
 const dragged=await page.evaluate(()=>{const ghost=document.createElement('div');ghost.className='drag-preview';document.body.append(ghost);const value=[...document.querySelectorAll('.hybrid-prop:not([hidden])')].map(n=>getComputedStyle(n).pointerEvents);ghost.remove();return value;});check('targets inert during a drag '+id,dragged.every(p=>p==='none'),dragged);
 const aimed=await page.evaluate(()=>{const n=[...document.querySelectorAll('.hybrid-prop:not([hidden])')][0];if(!n)return true;const t=RunaTargeting.active;RunaTargeting.active=()=>true;const s=RunaHybridProps.stats.activations[n.dataset.prop];n.click();const ok=RunaHybridProps.stats.activations[n.dataset.prop]===s;RunaTargeting.active=t;return ok;});check('targets ignored while aiming '+id,aimed);
 const scroll=await page.evaluate(()=>({h:document.documentElement.scrollHeight<=innerHeight+1,w:document.documentElement.scrollWidth<=document.documentElement.clientWidth+1}));check('desktop keeps no scroll '+id,scroll.h&&scroll.w,scroll);
 await context.close();}
 // WebGL loss removes the targets together with the projected faces.
 const context=await browser.newContext({viewport:{width:1920,height:900}});await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());const page=await context.newPage();page.on('pageerror',e=>errors.push('loss: '+e.message));await page.goto((process.env.QA_BASE||'http://127.0.0.1:3086')+'/runamarca/hybrid/index.html');await page.waitForFunction(()=>typeof render==='function'&&window.RunaHybridProps);await page.evaluate(s=>{state=s;serverClockOffset=Date.now()-s.serverNow;render();},view(room,a));await page.waitForFunction(()=>RunaHybrid?.ready);await page.waitForTimeout(500);
 await page.evaluate(()=>document.querySelector('.hybrid-prop:not([hidden])')?.click());await page.evaluate(()=>document.querySelector('.hybrid-canvas').getContext('webgl').getExtension('WEBGL_lose_context').loseContext());await page.waitForTimeout(400);
 const lost=await page.evaluate(()=>({props:document.querySelectorAll('.hybrid-props,.hybrid-prop').length,failed:RunaHybrid.stats.failed,faces:document.querySelectorAll('.hybrid-card-face').length,animating:RunaHybridProps.stats.animating}));check('WebGL loss removes decorative targets and stops motion',lost.failed&&lost.props===0&&lost.faces===0&&!lost.animating,lost);await context.close();
}finally{await browser.close();fs.writeFileSync(out+'/props.json',JSON.stringify({checks,errors},null,1));}
check('no page errors',errors.length===0,errors);
console.log(`${checks.filter(c=>c.pass).length}/${checks.length} verificações de decoração passaram`);
