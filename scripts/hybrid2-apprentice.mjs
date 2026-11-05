import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {setup,card,unit,cast,act,view,catalog} from '../mesa-nova/r1-fixtures.mjs';
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/vanxf/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const results=[],errors=[];let calls=0;
const check=(name,ok)=>{assert.ok(ok,name);results.push({name,pass:true});};
let room,a,b,source,spell,enemy;
function reset(){({room,a,b}=setup());room.code='APPRENTICE';enemy=unit(b);b.reserve.push(enemy);source=card('FV03',a);cast(room,a,source,{mode:'emanate'});spell=card('FV02',a);a.hand.push(spell);}
reset();
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 const pages=[];
 for(const index of [0,1]){
  const context=await browser.newContext({viewport:{width:1920,height:900},reducedMotion:'reduce'});
  await context.route('**/*',async route=>{
   const url=new URL(route.request().url());if(url.hostname!=='127.0.0.1')return route.abort();
   if(!url.pathname.includes('/api/'))return route.continue();
   const player=index?b:a;
   try{if(url.pathname.endsWith('/act')){calls++;act(room,player,route.request().postDataJSON(),catalog);}else await new Promise(r=>setTimeout(r,100));
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(view(room,player))});
   }catch(e){await route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({error:e.message})});}
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>sessionStorage.setItem('runamarca-nova-seat',JSON.stringify({code:'APPRENTICE',token:'fixture'})));pages.push(page);
 }
 const [page,rival]=pages;
 async function load(){for(const p of pages){await p.goto('http://127.0.0.1:3086/runamarca/hybrid/index.html');await p.waitForFunction(()=>typeof state!=='undefined'&&state?.phase==='prep');}await page.waitForTimeout(900);}
 const play=()=>page.evaluate(data=>void command(data),{type:'play',cardId:spell.uid,mode:'lane',lane:0,targetSide:a.id});
 await load();let before=JSON.stringify(view(room,b),(k,v)=>k==='serverNow'?undefined:v),mana=a.mana,count=calls;
 await play();await page.getByRole('button',{name:'Cancelar jogada',exact:true}).click();await page.waitForTimeout(250);
 check('cancel whole action sends no command',calls===count);check('cancel preserves hand, mana and opponent view',a.hand.includes(spell)&&a.mana===mana&&JSON.stringify(view(room,b),(k,v)=>k==='serverNow'?undefined:v)===before);
 for(const mode of ['right-click','close','escape']){
  await play();await page.getByRole('button',{name:'Confirmar magia',exact:true}).waitFor();
  if(mode==='right-click')await page.locator('#target-picker').click({button:'right'});
  else if(mode==='close')await page.locator('#close-target-picker').click();else await page.keyboard.press('Escape');
  await page.waitForFunction(()=>pendingSpellConfirmation===null);
  check('preflight '+mode+' remains private and uncommitted',calls===count&&a.hand.includes(spell)&&a.mana===mana&&JSON.stringify(view(room,b),(k,v)=>k==='serverNow'?undefined:v)===before);
 }
 await play();await page.getByRole('button',{name:'Confirmar magia',exact:true}).click();await page.waitForSelector('.target-aim');await page.waitForFunction(()=>!commandBusy);
 check('confirmed spell leaves hand and triggers one shot',!a.hand.includes(spell)&&a.apprenticeQueue.length===1);
 check('own-side open prepared spell is visible only after confirmation',view(room,b).players.find(p=>p.id===a.id).prepared[0].card.uid===spell.uid);
 await page.evaluate(()=>RunaTargeting.cancel('blur'));await page.evaluate(()=>promptApprenticeTarget());await page.waitForSelector('.target-aim');check('blur does not consume shot',a.apprenticeQueue.length===1);
 await page.screenshot({path:'prototype-qa/hybrid-2/apprentice-arrow.png'});
 await page.mouse.click(800,400,{button:'right'});await page.waitForFunction(()=>!seat().pendingApprenticeTargets.length);
 check('right click skips without damage or undoing spell',a.apprenticeQueue.length===0&&enemy.damage===0&&a.prepared.length===1&&!a.hand.includes(spell));
 await page.reload();await page.waitForTimeout(800);check('reload does not resurrect skipped shot',await page.locator('.target-aim').count()===0);
 await page.evaluate(()=>void command({type:'endPrep'}));await page.waitForFunction(()=>state.turn!==state.you);check('skip permits continuation',room.turn===b.id);
 for(const mode of ['close-list','escape','button','resolve']){
  reset();await load();await play();await page.getByRole('button',{name:'Confirmar magia',exact:true}).click();await page.waitForSelector('.target-aim');await page.waitForFunction(()=>!commandBusy);
  if(mode==='close-list'){await page.getByRole('button',{name:'Escolher por lista',exact:true}).click();await page.locator('#close-target-picker').click();}
  else if(mode==='escape')await page.keyboard.press('Escape');
  else if(mode==='button')await page.locator('.target-aim-tools button').last().click();
  else await page.locator('#opponent-reserve [data-uid="'+enemy.uid+'"]').click();
  await page.waitForFunction(()=>!seat().pendingApprenticeTargets.length);
  check(mode+' consumes exactly one pending shot',a.apprenticeQueue.length===0&&enemy.damage===(mode==='resolve'?1:0));
 }
 check('no browser errors',errors.length===0);
}finally{await browser.close();fs.writeFileSync('prototype-qa/hybrid-2/apprentice-browser.json',JSON.stringify({results,errors},null,2));}
console.log(JSON.stringify({passed:results.length,errors}));
