import fs from 'node:fs';
import {launch,open,paint,setup,card,view,harness,finish} from './hybrid12-lib.mjs';
import {act,catalog} from '../mesa-nova/r1-fixtures.mjs';
const out=process.argv[2],H=harness(out),browser=await launch();
const arrived=()=>!RunaCardArrivals.blocked&&!RunaHybridFlights.stats.active.length;
try{
 for(const mode of ['normal','paint-delay','resize','reduced']){
  const {room,a,b}=setup(),spell=card('FV13',a),target=card('FL21',b,{attack:6});
  room.matchId='stage2-'+mode;a.hand=[spell];b.reserve=[target];b.hand=['FV03','FL16','FL11'].map(id=>card(id,b));
  const {page,context}=await open(browser,{width:1920,height:1080},{errors:H.errors,reduced:mode==='reduced'});
  await paint(page,view(room,b));
  await page.evaluate(({uid,delay})=>{
   window.samples=[];window.returnDone=false;
   const original=presentReturn;presentReturn=async function(e){window.returnStart=performance.now();try{return await original(e);}finally{window.returnDone=true;window.returnEnd=performance.now();}};
   if(delay){const originalCard=cardEl;cardEl=function(c,options){const n=originalCard(c,options);if(c.uid===uid&&options?.zoom){const painted=n.visualReady;n.visualReady=Promise.all([painted,new Promise(r=>setTimeout(r,700))]);}return n;};}
   function sample(){const node=document.querySelector('#hand .card[data-uid="'+uid+'"]'),fly=document.querySelector('[data-flight-kind="return"]');let ink=false;
    for(const c of fly?.querySelectorAll('canvas')||[]){if(c.width&&c.height){const ctx=c.getContext('2d');if(ctx){const bytes=ctx.getImageData(0,0,c.width,c.height).data;for(let i=3;i<bytes.length;i+=400)if(bytes[i]){ink=true;break;}}}if(ink)break;}
    samples.push({time:performance.now(),fly:!!fly,ink,count:document.querySelectorAll('[data-flight-kind="return"]').length,handVisible:!!node&&getComputedStyle(node).visibility!=='hidden',blocked:RunaCardArrivals.blocked});
    if(!returnDone||performance.now()-returnEnd<350)requestAnimationFrame(sample);
   }requestAnimationFrame(sample);
  },{uid:target.uid,delay:mode==='paint-delay'});
  act(room,a,{type:'play',cardId:spell.uid,targetId:target.uid,mode:'direct'},catalog);
  H.check(mode+': Evasão real devolve a criatura ao dono',b.hand.includes(target)&&!b.reserve.includes(target));
  await page.evaluate(s=>{trackArrivals(state,s);state=s;serverClockOffset=Date.now()-s.serverNow;render();},view(room,b));
  if(mode==='resize'){await page.waitForFunction(()=>document.querySelector('[data-flight-kind="return"]'));await page.setViewportSize({width:1366,height:768});}
  if(mode==='paint-delay')await page.evaluate(()=>{window.paintUpdates=setInterval(()=>{if(returnDone){clearInterval(paintUpdates);return;}render();},120);});
  await page.waitForFunction(()=>window.returnDone,null,{timeout:20000});await page.waitForTimeout(400);
  const result=await page.evaluate(uid=>({samples,elapsed:returnEnd-returnStart,phase:state.phase,owner:RunaCardArrivals.stats,blocked:RunaCardArrivals.blocked,visible:[...document.querySelectorAll('#hand .card')].some(n=>n.dataset.uid===uid&&getComputedStyle(n).visibility!=='hidden'&&!n.hasAttribute('data-hybrid-waiting')),remnants:document.querySelectorAll('[data-flight-kind="return"],.damage-remnant').length}),target.uid);
  H.check(mode+': chegada visível na mesma preparação',result.phase==='prep'&&result.visible&&result.elapsed<(mode==='paint-delay'?2600:1800),result.elapsed);
  H.check(mode+': nenhuma trava ou cópia residual do retorno',!result.blocked&&!result.owner.pending.length&&!result.owner.active.some(t=>t.kind==='return')&&!result.remnants,result.owner);
  const flight=result.samples.filter(s=>s.fly);
  H.check(mode+': face pintada e única durante o voo',flight.length>0&&flight.every(s=>s.ink&&s.count===1&&!s.handVisible),{frames:flight.length,blank:flight.filter(s=>!s.ink).length,duplicate:flight.filter(s=>s.count!==1||s.handVisible).length});
  await page.evaluate(()=>visualQueue);act(room,a,{type:'endPrep'},catalog);
  await page.evaluate(s=>{trackArrivals(state,s);state=s;serverClockOffset=Date.now()-s.serverNow;render();},view(room,b));
  let plays=0;const commands=[];await page.route('**/api/rooms/*/act',async route=>{const data=route.request().postDataJSON();try{act(room,b,data,catalog);plays++;commands.push(data);await route.fulfill({json:view(room,b)});}catch(e){commands.push({data,error:e.message});await route.fulfill({status:400,json:{error:e.message}});}});
  // A legal turn change also deals a card to B; wait for that separate arrival.
  await page.evaluate(()=>visualQueue);await page.waitForFunction(arrived);
  await page.evaluate(uid=>command({type:'play',cardId:uid}),target.uid);
  const client=await page.evaluate(()=>({turn:state.turn,you:state.you,busy:commandBusy,blocked:RunaCardArrivals.blocked,entry:!!pendingEntryPlacement,confirmation:!!pendingSpellConfirmation,toast:document.getElementById('toast')?.textContent}));
  H.check(mode+': carta devolvida pode ser jogada novamente sem mudar de rodada',plays===1&&b.reserve.includes(target)&&room.phase==='prep'&&room.round===4,{plays,round:room.round,commands,client});
  await page.screenshot({path:out+'/'+mode+'.png'});fs.writeFileSync(out+'/'+mode+'.json',JSON.stringify(result,null,2));await context.close();
 }
 // Hold the old draw at the actual artwork await, then change match and reuse UID.
 {
  const {room,a}=setup(),drawn=card('FV03',a);a.hand=[drawn];room.matchId='old';
  const {page,context}=await open(browser,{width:1920,height:1080},{errors:H.errors});await paint(page,view(room,a));
  await page.evaluate(uid=>{const original=cardEl;window.oldDone=false;cardEl=function(c,o){const n=original(c,o);if(c.uid===uid&&o?.zoom){cardEl=original;n.visualReady=new Promise(r=>window.releaseOldPaint=r);}return n;};RunaCardArrivals.reserve(uid);render();animateDraw(uid,true).finally(()=>oldDone=true);},drawn.uid);
  await page.waitForFunction(()=>window.releaseOldPaint);
  await page.evaluate(uid=>{state={...state,matchId:'new'};render();RunaCardArrivals.reserve(uid);render();window.newDone=false;animateDraw(uid,true).finally(()=>newDone=true);releaseOldPaint();},drawn.uid);
  await page.waitForFunction(()=>oldDone);const during=await page.evaluate(uid=>({blocked:RunaCardArrivals.blocked,waiting:RunaCardArrivals.has(uid),state:RunaCardArrivals.stats}),drawn.uid);
  H.check('pintura antiga não libera a chegada de outra partida com o mesmo UID',during.blocked&&during.waiting,during);
  await page.waitForFunction(()=>newDone);await page.waitForTimeout(400);
  H.check('a nova chegada conclui sem resíduos',await page.evaluate(arrived));
  // Exit while a new draw is reading; old completion must not restore a card.
  await page.evaluate(uid=>{RunaCardArrivals.reserve(uid);render();window.exitDone=false;animateDraw(uid,true).finally(()=>exitDone=true);},drawn.uid);
  await page.waitForFunction(()=>RunaHybridFlights.stats.active.some(e=>e.stage==='read'));
  await page.evaluate(()=>{state=null;render();});await page.waitForFunction(()=>exitDone);
  H.check('sair da sala remove voo e trava imediatamente',await page.evaluate(()=>!RunaCardArrivals.blocked&&!RunaCardArrivals.stats.active.length&&!document.querySelector('.hybrid-flight-carrier')));
  await context.close();
 }
 // Opponent draws show only a back, without acquiring the local hand lock.
 {
  const {room,a,b}=setup();a.hand=[card('FV03',a)];b.hand=[card('FL21',b)];
  const {page,context}=await open(browser,{width:1366,height:768},{errors:H.errors});await paint(page,view(room,a));
  await page.evaluate(()=>{window.rivalDone=false;animateDraw(null,false).finally(()=>rivalDone=true);});
  await page.waitForFunction(()=>document.querySelector('[data-flight-kind="rival-draw"]'));
  H.check('compra rival preserva verso e não bloqueia a mão local',await page.evaluate(()=>{const n=document.querySelector('[data-flight-kind="rival-draw"]');return !!n.querySelector('.concealed-back-image')&&!n.querySelector('.card-art-canvas')&&!RunaCardArrivals.blocked;}));
  await page.waitForFunction(()=>rivalDone);H.check('compra rival libera seu ticket',await page.evaluate(arrived));await context.close();
 }
 H.check('nenhum erro de página',H.errors.length===0,H.errors);
}finally{await browser.close();finish(out,'arrivals',H);}
