// Local engine fixtures and actual HTTP commands; no production session or storage.
import fs from 'node:fs';
import {launch,open,paint,setup,card,view,harness,finish} from './hybrid12-lib.mjs';
import {act,catalog} from '../mesa-nova/r1-fixtures.mjs';
const out=process.argv[2],H=harness(out),browser=await launch(),details=[];
const entryOnly=process.env.QA_TRANSFER_SECTION==='entry';
const idle=()=>!commandBusy&&!RunaCardArrivals.blocked&&!RunaCardArrivals.stats.moving.length&&!RunaHybridFlights.stats.active.length;
async function api(page,room,player){
 const requests=[];
 await page.route('**/api/rooms/*/act',async route=>{
  const data=route.request().postDataJSON();
  try{act(room,player,data,catalog);requests.push({data,ok:true});if(data.type==='unprepare')await new Promise(r=>setTimeout(r,500));await route.fulfill({json:view(room,player)});}
  catch(e){requests.push({data,error:e.message});await route.fulfill({status:400,json:{error:e.message}});}
 });return requests;
}
async function settle(page){await page.evaluate(()=>visualQueue);await page.waitForFunction(idle,null,{timeout:20000});await page.waitForTimeout(350);}
async function send(page,data){await page.evaluate(d=>command(d),data);await settle(page);}
async function dragReserve(page,uid){
 const points=await page.evaluate(uid=>{const s=tableCard(uid).getBoundingClientRect(),t=document.getElementById('self-reserve-area').getBoundingClientRect();return {from:{x:s.x+s.width/2,y:Math.min(innerHeight-25,s.y+50)},to:{x:t.x+t.width/2,y:t.y+t.height/2}};},uid);
 await page.mouse.move(points.from.x,points.from.y);await page.mouse.down();await page.mouse.move(points.to.x,points.to.y,{steps:12});await page.mouse.up();
}
try{
 // Two real confirmations: the last confirmation also deals the first prep card.
 for(const width of entryOnly?[]:[1920,1366]){
  const {room,a,b}=setup();room.matchId='opening-'+width;room.phase='mulligan';room.round=1;
  for(const p of [a,b]){p.hand=Array.from({length:5},()=>card('FV03',p));p.mulligansLeft=2;p.mulliganReady=false;p.mulliganStartedAt=Date.now();}
  room.mulliganPresentationEndsAt=Date.now();
  const {page,context}=await open(browser,{width,height:width===1920?1080:768},{errors:H.errors});await paint(page,view(room,a));
  const requests=await api(page,room,a);
  await page.waitForFunction(()=>!patronIntroActive&&!document.getElementById('mulligan-overlay').hidden&&!RunaCardArrivals.blocked);
  await send(page,{type:'mulligan',cardIds:[a.hand[0].uid,a.hand[1].uid]});
  const replacement=await page.evaluate(()=>RunaHybridFlights.stats.history.filter(x=>x.kind==='draw'&&x.stage==='deck'));
  H.check(width+': duas substituições usam o perfil rápido de abertura',replacement.length===2&&replacement.every(x=>x.profile==='opening'),replacement);
  act(room,b,{type:'confirmMulligan'},catalog);
  const ids=a.hand.map(c=>c.uid);
  await page.evaluate(()=>{window.startConfirm=performance.now();window.confirmDone=false;window.confirmPromise=command({type:'confirmMulligan'}).finally(()=>confirmDone=true);});
  await page.waitForFunction(()=>RunaCardArrivals.stats.moving.length===5);
  H.check(width+': cinco transferências têm donos distintos e a mão fica bloqueada',await page.evaluate(ids=>{
   const t=RunaCardArrivals.stats.active.filter(x=>x.kind==='transfer');return t.length===5&&new Set(t.map(x=>x.uid)).size===5&&ids.every(id=>RunaCardArrivals.moving(id))&&document.getElementById('hand').inert&&!movingCards.size;
  },ids));
  // Simulate state refreshes during the opening; rendering may not release a UID.
  await page.evaluate(()=>{window.confirmRenders=setInterval(()=>{if(confirmDone){clearInterval(confirmRenders);return;}render();},180);});
  await settle(page);await page.waitForFunction(()=>confirmDone);
  const result=await page.evaluate(ids=>({history:RunaHybridFlights.stats.history,owner:RunaCardArrivals.stats,visible:ids.every(uid=>[...document.querySelectorAll('#hand .card')].some(n=>n.dataset.uid===uid&&getComputedStyle(n).visibility!=='hidden')),ghosts:document.querySelectorAll('.hybrid-motion-face,.hybrid-flight-carrier').length,phase:state.phase,hand:seat().hand.length}),ids);
  const lands=result.history.filter(x=>x.kind==='transfer'&&x.stage==='land'),normal=result.history.find(x=>x.kind==='draw'&&x.profile==='normal'&&x.stage==='deck');
  H.check(width+': cinco cartas chegam e a compra normal espera o lote',lands.length===5&&normal?.time>=Math.max(...lands.map(x=>x.time)),{lands:lands.length,normal});
  H.check(width+': abertura chega à preparação sem carta oculta ou trava',result.visible&&result.phase==='prep'&&result.hand===6&&!result.ghosts&&!result.owner.active.length&&!result.owner.moving.length,result.owner);
  H.check(width+': comandos de mulligan e confirmação aceitos pelo motor',requests.every(x=>x.ok)&&requests.filter(x=>x.data.type==='mulligan').length===1&&requests.filter(x=>x.data.type==='confirmMulligan').length===1,requests);
  await page.screenshot({path:out+'/opening-'+width+'.png'});details.push({width,opening:result,requests});await context.close();
 }
 // A real card crosses all applicable zones and a prepared spell returns to hand.
 if(!entryOnly){
  const {room,a,b}=setup(),creature=card('FL17',a),trap=card('FL13',a);room.matchId='zones';a.hand=[creature,trap];
  const {page,context}=await open(browser,{width:1920,height:1080},{errors:H.errors});await paint(page,view(room,a));const requests=await api(page,room,a);
  for(const [name,data,destination] of [
   ['mão → reserva',{type:'play',cardId:creature.uid},'#self-reserve'],
   ['reserva → Emanação',{type:'emanate',cardId:creature.uid},'.combat-emanation'],
   ['Emanação → reserva',{type:'emanate',cardId:creature.uid},'#self-reserve'],
   ['mão → armadilha',{type:'play',cardId:trap.uid,mode:'lane',lane:0,targetSide:b.id},'.lane-side'],
   ['armadilha → outra casa',{type:'movePrepared',cardId:trap.uid,lane:2,targetSide:b.id},'.lane-side'],
   ['armadilha → mão',{type:'unprepare',cardId:trap.uid},'#hand'],
  ]){
   if(name==='mão → reserva'){
    await dragReserve(page,data.cardId);
    await page.waitForFunction(uid=>seat().reserve.some(c=>c.uid===uid),data.cardId);await settle(page);
   }else await send(page,data);
   const result=await page.evaluate(({uid,selector})=>({found:[...document.querySelectorAll(selector+' [data-uid]')].some(n=>n.dataset.uid===uid&&getComputedStyle(n).visibility!=='hidden'),moving:[...movingCards],owner:RunaCardArrivals.stats,ghosts:document.querySelectorAll('.hybrid-motion-face,.hybrid-flight-carrier').length}),{uid:data.cardId,selector:destination});
   H.check(name+': destino visível, sem espera duplicada',result.found&&!result.moving.length&&!result.owner.active.length&&!result.ghosts,result);
  }
  room.phase='formation';await paint(page,view(room,a));
  for(const [lane,cardId] of [[1,creature.uid],[2,creature.uid],[2,null]]){
   await send(page,{type:'assign',lane,cardId});
   H.check('formação '+lane+' '+(cardId?'colocar':'retirar')+': motor e tela concordam',a.formation[lane]===cardId&&await page.evaluate(uid=>!cardInFlight(uid)&&!!tableCard(uid)&&getComputedStyle(tableCard(uid)).visibility!=='hidden',creature.uid));
  }
  H.check('transferências não substituem mais funções do cliente',await page.evaluate(()=>!animateTransfer.toString().includes('const e=begin')&&!animateOpeningToHand.toString().includes('nativeOpening')&&RunaPresentation.stats.adapters.includes('hybrid-transfers')));
  H.check('todos os comandos entre zonas foram aceitos',requests.every(x=>x.ok),requests);
  await send(page,{type:'play',cardId:trap.uid,mode:'lane',lane:0,targetSide:a.id});
  H.check('recusa do servidor libera a origem e o controle do voo',!!requests.at(-1).error&&a.hand.includes(trap)&&await page.evaluate(uid=>!cardInFlight(uid)&&!RunaCardArrivals.stats.active.length&&getComputedStyle(tableCard(uid)).visibility!=='hidden',trap.uid),requests.at(-1));
  details.push({zones:requests});await page.screenshot({path:out+'/zones.png'});await context.close();
 }
 // The provisional placement owns no committed move until the player chooses.
 {
  const {room,a}=setup(),c=card('FL11',a);room.matchId='entry-choice';a.hand=[c];
  const {page,context}=await open(browser,{width:1920,height:1080},{errors:H.errors});await paint(page,view(room,a));const requests=await api(page,room,a),mana=a.mana;
  const assault=page.locator('#target-picker').getByRole('button',{name:/Assalto/});
  const choose=async()=>{await dragReserve(page,c.uid);await assault.waitFor();};
  await choose();
  H.check('entrada provisória aguarda a escolha sem enviar nem cobrar',requests.length===0&&a.mana===mana&&await page.evaluate(()=>!!pendingEntryPlacement&&!RunaCardArrivals.stats.moving.length));
  await page.keyboard.press('Escape');await page.waitForFunction(()=>!pendingEntryPlacement);
  H.check('cancelar a escolha restaura a carta e não cria voo',requests.length===0&&await page.evaluate(uid=>getComputedStyle(tableCard(uid)).visibility!=='hidden'&&!RunaCardArrivals.stats.active.length&&!document.querySelector('.entry-provisional'),c.uid));
  await choose();await assault.click();await page.waitForFunction(uid=>seat().reserve.some(c=>c.uid===uid),c.uid);await settle(page);
  H.check('confirmar a escolha envia uma jogada e entrega a carta na reserva',requests.length===1&&requests[0].ok&&c.protocolMode==='assault'&&a.mana===mana-c.cost&&await page.evaluate(uid=>!cardInFlight(uid)&&getComputedStyle(tableCard(uid)).visibility!=='hidden'&&!document.querySelector('.entry-provisional,.release-ghost'),c.uid),requests);
  details.push({entry:requests});await context.close();
 }
 // Hold an actual transfer at its artwork wait. Cancel, reuse the UID, then let
 // old paint finish: it must never reveal the new hidden destination.
 for(const mode of entryOnly?[]:['new-match','blur','resize','leave','paint-delay','reduced']){
  const {room,a}=setup(),c=card('FL17',a);room.matchId='race-'+mode;a.hand=[c];
  const {page,context}=await open(browser,{width:1366,height:768},{errors:H.errors,reduced:mode==='reduced'});await paint(page,view(room,a));
  await page.evaluate(({uid,delay})=>{
   const node=tableCard(uid),copy=cloneVisual(node),rect=node.getBoundingClientRect();
   if(delay)copy.visualReady=new Promise(r=>window.releaseTransferPaint=r);
   const ticket=RunaCardArrivals.begin('transfer',{uid,moving:true});render();
   window.transferDone=false;window.transferPromise=animateTransfer({uid,copy,rect,ticket}).finally(()=>transferDone=true);
  },{uid:c.uid,delay:mode!=='reduced'});
  await page.waitForFunction(()=>RunaHybridFlights.stats.active.some(x=>x.kind==='transfer'));
  if(mode==='new-match'){
   await page.evaluate(uid=>{state={...state,matchId:'race-new'};render();window.newTicket=RunaCardArrivals.begin('transfer',{uid,moving:true});render();releaseTransferPaint();},c.uid);
   await page.waitForFunction(()=>transferDone);
   H.check('conclusão antiga não revela UID reutilizado em outra partida',await page.evaluate(uid=>RunaCardArrivals.current(newTicket)&&RunaCardArrivals.moving(uid)&&getComputedStyle(tableCard(uid)).visibility==='hidden',c.uid));
   await page.evaluate(()=>{RunaCardArrivals.finish(newTicket);finishVisual(newTicket.uid);});
  }else if(mode==='paint-delay'){
   await page.waitForTimeout(700);
   const held=await page.evaluate(uid=>({held:document.querySelectorAll('.hybrid-motion-face').length,hidden:getComputedStyle(tableCard(uid)).visibility==='hidden',legacy:movingCards.size}),c.uid);
   H.check('pintura atrasada mantém a face de origem e oculta o destino',held.held===1&&held.hidden&&held.legacy===0,held);
   await page.evaluate(()=>releaseTransferPaint());
  }else if(mode==='blur'){await page.evaluate(()=>{dispatchEvent(new Event('blur'));releaseTransferPaint();});}
  else if(mode==='resize'){await page.setViewportSize({width:1440,height:900});await page.evaluate(()=>releaseTransferPaint());}
  else if(mode==='leave'){await page.evaluate(()=>{state=null;render();releaseTransferPaint();});}
  await page.waitForFunction(()=>transferDone);await page.waitForTimeout(350);
  const result=await page.evaluate(()=>({owner:RunaCardArrivals.stats,blocked:RunaCardArrivals.blocked,copies:document.querySelectorAll('.hybrid-motion-face,.hybrid-flight-carrier').length,visible:state?[...document.querySelectorAll('#hand .card')].every(n=>getComputedStyle(n).visibility!=='hidden'):true}));
  H.check(mode+': sem resíduos ou cartas invisíveis ao terminar',!result.owner.active.length&&!result.owner.moving.length&&!result.blocked&&!result.copies&&result.visible,result);
  details.push({mode,result});await context.close();
 }
 // A command whose HTTP response belongs to the previous match cannot put that
 // state back on screen after a reconnect/new match.
 if(!entryOnly){
  const {room,a}=setup(),c=card('FL17',a);room.matchId='old-command';a.hand=[c];
  const {page,context}=await open(browser,{width:1920,height:1080},{errors:H.errors});await paint(page,view(room,a));
  let release,seen;const sent=new Promise(r=>seen=r),gate=new Promise(r=>release=r);
  await page.route('**/api/rooms/*/act',async route=>{act(room,a,route.request().postDataJSON(),catalog);const response=view(room,a);seen();await gate;await route.fulfill({json:response});});
  await page.evaluate(uid=>{window.oldCommandDone=false;command({type:'play',cardId:uid}).finally(()=>oldCommandDone=true);},c.uid);await sent;
  await page.evaluate(uid=>{state={...state,matchId:'new-command'};render();window.newTicket=RunaCardArrivals.begin('transfer',{uid,moving:true});render();},c.uid);release();await page.waitForFunction(()=>oldCommandDone);
  H.check('resposta HTTP antiga não restaura a partida nem limpa o voo novo',await page.evaluate(uid=>state.matchId==='new-command'&&RunaCardArrivals.current(newTicket)&&getComputedStyle(tableCard(uid)).visibility==='hidden',c.uid));
  await context.close();
 }
 H.check('nenhum erro de página',H.errors.length===0,H.errors);
}catch(error){H.check('roteiro concluído sem interrupção',false,error.message);throw error;}
finally{await browser.close();fs.writeFileSync(out+'/details.json',JSON.stringify(details,null,2));finish(out,'transfers',H,{section:entryOnly?'entry':'all'});}
