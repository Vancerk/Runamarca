const fs=require('fs'),path=require('path');
const {chromium}=require('C:/Users/vanxf/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root='http://127.0.0.1:3086',out=path.resolve('prototype-qa/hybrid-3');fs.mkdirSync(out,{recursive:true});
const checks=[],errors=[];const check=(name,value)=>{checks.push({name,pass:!!value});if(!value)throw Error(name);};
async function api(route,data,token){const r=await fetch(root+'/runamarca/api/'+route,{method:data?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{'x-player-token':token}:{})},...(data?{body:JSON.stringify(data)}:{})});const j=await r.json();if(!r.ok)throw Error(JSON.stringify(j));return j;}
(async()=>{
 const a=await api('create',{name:'Protótipo A'}),b=await api('rooms/'+a.code+'/join',{name:'Protótipo B'}),seats=[a,b];
 const act=(seat,data)=>api('rooms/'+a.code+'/act',data,seat.token),get=(seat=a)=>api('rooms/'+a.code+'/state',null,seat.token),owner=id=>seats.find(x=>x.state.you===id);
 await act(a,{type:'deck',deckId:'forja-oficina-lyrik'});await act(b,{type:'deck',deckId:'ruptura-grupo'});
 await act(a,{type:'confirmMulligan'});await act(b,{type:'confirmMulligan'});
 let s=await get();while(s.round<6){if(s.phase==='prep')await act(owner(s.turn),{type:'endPrep'});else if(s.phase==='vote'){await act(a,{type:'vote',fight:false});await act(b,{type:'vote',fight:false});}else throw Error('Unexpected phase '+s.phase);s=await get();}
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
 const context=await browser.newContext({viewport:{width:1440,height:1100},reducedMotion:'reduce',hasTouch:true});
 await context.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(seat=>sessionStorage.setItem('runamarca-nova-seat',JSON.stringify({code:seat.code,token:seat.token})),a);
 await page.goto(root+'/runamarca/hybrid/index.html');await page.waitForTimeout(1000);if(await page.getByText('Pular introdução',{exact:true}).isVisible())await page.getByText('Pular introdução',{exact:true}).click();await page.waitForTimeout(1200);
 check('real ninth-card draw',await page.locator('#opponent-hand .rival-hand-back').count()===9);
 for(const width of [1440,900,390,320]){
  await page.setViewportSize({width,height:1100});await page.waitForTimeout(250);
  const g=await page.evaluate(()=>{const r=n=>{const b=n.getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width}};return {overflow:document.documentElement.scrollWidth>innerWidth+1,actions:r(document.getElementById('center-actions')),field:r(document.getElementById('lanes')),hands:[...document.querySelectorAll('#opponent-hand .rival-hand-back')].map(r),reserve:[...document.querySelectorAll('.reserve-camp')].map(r),lanes:document.querySelectorAll('.lane-side').length,emana:document.querySelectorAll('#self-emana>*').length+document.querySelectorAll('#opponent-emana>*').length,hidden:[...document.querySelectorAll('#opponent-hand img')].every(n=>n.getAttribute('src')==='card-back.png'&&n.alt==='Carta oculta')};});
  fs.writeFileSync(out+'/geometry-'+width+'.json',JSON.stringify(g,null,2));
  check(width+' no horizontal overflow',!g.overflow);if(width<=600)check(width+' phase actions below field',g.actions.top>=g.field.bottom);check(width+' nine rival backs within viewport',g.hands.length===9&&g.hands.every(r=>r.left>=-1&&r.right<=width+1));check(width+' six combat/four emanation slots',g.lanes===6&&g.emana===4);check(width+' rival reserve scaled down with distance',g.reserve.length===2&&g.reserve[0].width<g.reserve[1].width&&g.reserve[0].width>g.reserve[1].width*.7);check(width+' hidden hand backs only',g.hidden);
  await page.screenshot({path:out+'/nine-'+width+'.png',fullPage:true});
 }
 await page.setViewportSize({width:1440,height:1100});
 for(let i=0;i<3;i++){await page.locator('.camp-menu-trigger').click();check('menu opens '+i,await page.locator('#room-menu').evaluate(n=>n.open));await page.keyboard.press('Escape');check('menu closes '+i,!(await page.locator('#room-menu').evaluate(n=>n.open)));}
 s=await get();for(let turn=0;turn<2;turn++){
  const who=owner(s.turn);let own=(await get(who)).players.find(p=>p.id===who.state.you);
  for(let i=0;i<3;i++){
   const c=own.hand.find(c=>c.type==='creature'&&c.cost<=own.mana&&!(c.effects||[]).some(e=>['on_enter','on_play'].includes(e.timing)||['combat_protocol','monk_choice','bound_spell_damage'].includes(e.op)));
   if(!c)break;await act(who,{type:'play',cardId:c.uid});own=(await get(who)).players.find(p=>p.id===who.state.you);
  }
  await act(who,{type:'endPrep'});s=await get();
 }
 await act(a,{type:'vote',fight:true});s=await get();await page.waitForFunction(()=>state?.phase==='formation');await page.waitForTimeout(2000);
 const own=s.players.find(p=>p.id===a.state.you),enemy=(await get(b)).players.find(p=>p.id===b.state.you);
 check('real creatures available for drag',own.reserve.length>0&&enemy.reserve.length>0);
 const uid=own.reserve[0].uid,card=page.locator('#self-reserve [data-uid="'+uid+'"]');await card.scrollIntoViewIfNeeded();let box=await card.boundingBox();
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2,box.y-50,{steps:8});await page.keyboard.press('Escape');await page.mouse.up();
 check('interrupted drag preserves formation',(await get()).players.find(p=>p.id===a.state.you).formation.every(x=>x===null));check('interrupted drag removes ghost',await page.locator('.drag-preview').count()===0);
 for(let repeat=0;repeat<2;repeat++){
  await page.waitForFunction(uid=>{const n=document.querySelector('#self-reserve [data-uid='+CSS.escape(uid)+']');return n&&getComputedStyle(n).visibility!=='hidden'&&!movingCards.has(uid)},uid);await page.waitForTimeout(350);await card.scrollIntoViewIfNeeded();box=await card.boundingBox();const dest=await page.locator('.lane-side.own-drop[data-lane="0"]').boundingBox();
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(dest.x+dest.width/2,dest.y+dest.height/2,{steps:14});fs.writeFileSync(out+"/drag-hit-"+repeat+".json",JSON.stringify(await page.evaluate(({x,y})=>({hit:document.elementFromPoint(x,y)?.outerHTML?.slice(0,600),ghost:document.querySelectorAll(".drag-preview").length,busy:commandBusy,pending:!!pendingEntryPlacement}),{x:dest.x+dest.width/2,y:dest.y+dest.height/2}),null,2));await page.mouse.up();await page.waitForTimeout(1200);await page.screenshot({path:out+"/drag-"+repeat+".png",fullPage:true});
  check('real drag assigns creature '+repeat,(await get()).players.find(p=>p.id===a.state.you).formation[0]===uid);
  if(repeat===0){await page.keyboard.press('Escape');if(await page.locator('#room-menu').evaluate(n=>n.open))await page.keyboard.press('Escape');await act(a,{type:'assign',lane:0,cardId:null});await page.waitForTimeout(1600);}
 }
 await act(b,{type:'assign',lane:1,cardId:enemy.reserve[0].uid});
 check('opponent formation remains secret',(await get()).players.find(p=>p.id===b.state.you).formation.every(x=>x===null));
 await page.waitForTimeout(700);check('opponent board hides private creature',await page.locator('.lane-side:not(.own-drop) [data-uid="'+enemy.reserve[0].uid+'"]').count()===0);
 await page.mouse.move(5,5);await page.waitForTimeout(300);await page.screenshot({path:out+'/formation-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:1000});await page.waitForTimeout(300);await page.screenshot({path:out+'/formation-mobile.png',fullPage:true});
 await page.reload();await page.waitForFunction(()=>state?.phase==='formation');check('reload preserves seat and assigned card',await page.evaluate(uid=>seat().formation.includes(uid),uid));
 await act(a,{type:'ready'});await act(b,{type:'ready'});s=await get();check('real combat started',s.phase==='resolving');await page.waitForTimeout(2000);await page.screenshot({path:out+'/combat-mobile.png',fullPage:true});
 await page.waitForFunction(()=>state?.phase!=='resolving',{},{timeout:55000});check('combat returns to playable phase',await page.evaluate(()=>['prep','finished'].includes(state.phase)));check('no browser JS errors',errors.length===0);
 console.log(JSON.stringify({passed:checks.length,errors}));
 }finally{await browser.close();fs.writeFileSync(out+'/result.json',JSON.stringify({checks,errors},null,2));}
})().catch(e=>{console.error(e);process.exitCode=1;});
