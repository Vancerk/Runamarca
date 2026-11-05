import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {setup,card,view} from '../mesa-nova/r1-fixtures.mjs';
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/vanxf/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {room,a,b}=setup();for(const p of [a,b])for(let lane=0;lane<3;lane++){const c=card('FV03',p);p.reserve.push(c);p.formation[lane]=c.uid;}
room.phase='resolving';const hidden=card('FV02',b);b.prepared.push({card:hidden,lane:2,targetSide:a.id,hidden:true});
const results=[],errors=[];
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 const context=await browser.newContext({viewport:{width:1920,height:900},deviceScaleFactor:1});await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:3086/runamarca/hybrid/index.html');await page.waitForFunction(()=>typeof render==='function');
 for(const owner of [a,b])for(const progress of [0,.16,.17,.49,.51,.82,.84]){
  room.combat={id:owner.id+':'+progress,round:4,startedAt:Date.now()-progress*9000,duration:11000,timeline:[{kind:'reveal',duration:9000},{kind:'result',duration:2000}],visual:[],lanes:[],spells:[]};
  const state=view(room,owner),stage=Math.min(3,Math.floor(progress*3+.5)),enemy=owner===a?b:a;
  await page.evaluate(s=>{state=s;serverClockOffset=Date.now()-s.serverNow;render();},state);await page.waitForTimeout(80);
  const g=await page.evaluate(id=>({cards:[...document.querySelectorAll('.lane-side')].filter(n=>n.dataset.owner===id).map(n=>n.querySelector('.card')?.dataset.uid||null),hidden:[...document.querySelectorAll('.lane-side')].filter(n=>n.dataset.owner===id).map(n=>n.classList.contains('fogged-space')),scroll:document.documentElement.scrollHeight,frame:innerHeight}),enemy.id);
  assert.deepEqual(g.cards,enemy.formation.map((id,i)=>i<stage?id:null));if(stage<3)assert.equal(state.combat.timeline.length,1);
  results.push({owner:owner.id,progress,stage,...g});
  if(owner===a&&[0,.17,.51,.84].includes(progress))await page.screenshot({path:'prototype-qa/hybrid-4/reveal-stage-'+stage+'.png'});
 }
 // Populate both reserves to their legal capacity to measure the shelf borders.
 room.phase='prep';room.combat=null;for(const p of [a,b]){p.formation=[null,null,null];for(let n=p.reserve.length;n<8;n++)p.reserve.push(card('FV03',p));}
 await page.evaluate(s=>{state=s;render();},view(room,a));await page.waitForTimeout(3000);
 const shelves=await page.evaluate(()=>[...document.querySelectorAll('.reserve-camp')].map(n=>{const b=n.getBoundingClientRect();return [...n.querySelectorAll('.card')].every(c=>{const r=c.getBoundingClientRect();return r.top>=b.top&&r.bottom<=b.bottom&&r.left>=b.left&&r.right<=b.right;});}));assert.ok(shelves.every(Boolean));results.push({eightCardsWithinShelf:shelves});
 await page.evaluate(()=>{const original=CanvasRenderingContext2D.prototype.moveTo;CanvasRenderingContext2D.prototype.moveTo=function(x,y){if(this.canvas.classList.contains('turn-fuse'))globalThis.ropeY=y;return original.call(this,x,y);};state.turnClock={key:'qa-rope',phase:'prep',endsAt:Date.now()+5000};serverClockOffset=0;RunaTurnClock.sync();});
 await page.waitForTimeout(150);const rope=await page.evaluate(()=>{const r=document.getElementById('lanes').getBoundingClientRect();return {actual:ropeY,expected:r.top+r.height/2};});assert.ok(Math.abs(rope.actual-rope.expected)<1);results.push({rope});
 await page.screenshot({path:'prototype-qa/hybrid-4/center-rope.png'});
 room.log.push({message:b.reserve[0].name+' entrou na reserva.',round:4,phase:'prep',actor:b.id},{message:'Rival colocou uma magia oculta.',round:4,phase:'prep',actor:b.id});
 await page.evaluate(s=>{state=s;render();document.getElementById('camp-log').open=true;},view(room,a));
 const log=await page.locator('#log').innerText();assert.ok(log.includes('magia oculta'));assert.ok(!log.includes(hidden.name));results.push({historyDoesNotNameHiddenSpell:true});await page.screenshot({path:'prototype-qa/hybrid-4/history.png'});
 assert.deepEqual(errors,[]);
}finally{await browser.close();fs.writeFileSync('prototype-qa/hybrid-4/reveal-frames.json',JSON.stringify({results,errors},null,2));}
console.log(JSON.stringify({passed:results.length,errors}));
