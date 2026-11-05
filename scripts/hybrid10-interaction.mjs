// Revision 10 regression: hover replaces the original without duplicate or fan
// movement, draw rhythm and cancellation, impacts that do not repeat on render,
// and rival secrecy from both perspectives. Local fixtures and server only.
import fs from 'node:fs';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {setup,card,view,catalog} from '../mesa-nova/r1-fixtures.mjs';
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/vanxf/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out=process.env.HYBRID_QA_OUT||'prototype-qa/hybrid-10/qa',checks=[],errors=[],measurements={};fs.mkdirSync(out,{recursive:true});
const check=(name,value,detail)=>{checks.push({name,pass:!!value,detail});assert.ok(value,name+' '+JSON.stringify(detail??''));};
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
async function open(viewport,{dpr=1,reduced=false,touch=false}={}){const context=await browser.newContext({viewport,deviceScaleFactor:dpr,reducedMotion:reduced?'reduce':'no-preference',hasTouch:touch});await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());const page=await context.newPage();page.on('pageerror',e=>errors.push(viewport.width+': '+e.message));await page.goto((process.env.QA_BASE||'http://127.0.0.1:3086')+'/runamarca/hybrid/index.html');await page.waitForFunction(()=>typeof render==='function'&&window.RunaHybridHand&&window.RunaHybridImpacts);return {context,page};}
const paint=async(page,s)=>{await page.evaluate(s=>{state=s;serverClockOffset=Date.now()-s.serverNow;render();},s);await page.waitForFunction(()=>RunaHybrid?.ready);await page.waitForTimeout(450);};
const handState=page=>page.evaluate(()=>({cards:[...document.querySelectorAll('#hand>.hand-card')].map(n=>{const r=n.getBoundingClientRect();return {uid:n.dataset.uid,x:r.x,y:r.y,w:r.width,h:r.height,opacity:getComputedStyle(n).opacity,concealed:n.classList.contains('hybrid-hover-source')};}),lanes:document.getElementById('lanes').getBoundingClientRect().toJSON(),preview:!document.getElementById('hover-preview').hidden,previewUid:document.querySelector('#hover-preview>.card.big')?.dataset.uid??null,stats:RunaHybridHand.stats}));
try{
 // A. Hover: nine cards, each one, desktop sizes and DPR 2.
 for(const [viewport,dpr,reduced] of [[{width:1920,height:900},1,false],[{width:1280,height:720},2,false],[{width:1440,height:900},1,true]]){
  const id=`${viewport.width}x${viewport.height}-dpr${dpr}${reduced?'-reduced':''}`,{room,a,b}=setup();for(const p of [a,b]){p.hand=Array.from({length:9},(_,i)=>card(i%2?'FV03':'FL10',p));p.reserve=Array.from({length:3},()=>card('FV03',p));}
  const {context,page}=await open(viewport,{dpr,reduced});await paint(page,view(room,a));
  const rest=await handState(page);check('nine cards at rest '+id,rest.cards.length===9&&rest.cards.every(c=>c.opacity==='1'&&!c.concealed));
  for(let i=0;i<9;i++){
   const c=rest.cards[i],x=c.x+c.w/2,y=Math.min(viewport.height-6,c.y+Math.min(36,c.h*.2)+ (i===0?0:0));
   await page.mouse.move(x,Math.max(c.y+8,viewport.height-40));await page.waitForTimeout(220);const s=await handState(page);
   const hovered=s.cards.find(k=>k.concealed);
   check('preview shown for a hand card '+id+' '+i,s.preview&&!!hovered,{preview:s.preview,concealed:s.stats.concealed});
   check('exactly one original concealed (no duplicate) '+id+' '+i,s.cards.filter(k=>k.concealed).length===1&&hovered.opacity==='0'&&s.cards.filter(k=>!k.concealed).every(k=>k.opacity==='1'));
   check('fan and field do not move '+id+' '+i,s.cards.every((k,j)=>Math.abs(k.x-rest.cards[j].x)<.2&&Math.abs(k.y-rest.cards[j].y)<.2&&Math.abs(k.w-rest.cards[j].w)<.2)&&['x','y','width','height'].every(key=>Math.abs(s.lanes[key]-rest.lanes[key])<.2));
  }
  check('grow-in animation follows motion preference '+id,reduced?(await page.evaluate(()=>RunaHybridHand.stats.intros))===0:(await page.evaluate(()=>RunaHybridHand.stats.intros))>=9);
  // Crossing the boundary between two overlapping cards changes the preview once.
  const c4=rest.cards[4],c5=rest.cards[5],yy=viewport.height-30,seen=[];for(let step=0;step<=24;step++){await page.mouse.move(c4.x+c4.w*.35+(c5.x+c5.w*.65-(c4.x+c4.w*.35))*step/24,yy);await page.waitForTimeout(30);seen.push(await page.evaluate(()=>RunaHybridHand.stats.concealed));}
  await page.waitForTimeout(200);seen.push(await page.evaluate(()=>RunaHybridHand.stats.concealed));
  const changes=seen.filter((v,i)=>i&&v!==seen[i-1]).length,flicker=seen.some((v,i)=>i&&i<seen.length-1&&v!==seen[i-1]&&v!==seen[i+1]&&seen[i-1]===seen[i+1]);
  check('boundary crossing has no oscillation '+id,!flicker&&changes<=3&&seen.at(-1)!==null,{seen,changes});
  await page.screenshot({path:out+'/hover-'+id+'.png'});
  // Leaving restores every original; no stuck preview.
  await page.mouse.move(viewport.width/2,viewport.height*.42);await page.waitForTimeout(250);const left=await handState(page);check('leaving restores the original '+id,!left.preview&&left.cards.every(k=>k.opacity==='1'&&!k.concealed)&&left.stats.concealed===null);
  // Keyboard focus gives the same reading.
  await page.focus('#hand>.hand-card:nth-child(3)');await page.waitForTimeout(250);const focused=await handState(page);check('focus shows preview and conceals origin '+id,focused.preview&&focused.cards[2].concealed&&focused.cards[2].opacity==='0');
  await page.evaluate(()=>document.activeElement.blur());await page.waitForTimeout(150);const blurred=await handState(page);check('blur restores origin '+id,!blurred.preview&&blurred.cards.every(k=>k.opacity==='1'));
  // Hover cancelled by a draw, then by a drag that is interrupted.
  await page.mouse.move(rest.cards[6].x+rest.cards[6].w/2,viewport.height-30);await page.waitForTimeout(220);
  const drawn=card('FV03',a);a.hand.push(drawn);a.hand.splice(0,1);await page.evaluate(({s,uid})=>{pendingArrival.push(uid);state=s;render();window.flightDone=false;animateDraw(uid,true).finally(()=>window.flightDone=true);},{s:view(room,a),uid:drawn.uid});
  await page.waitForFunction(()=>RunaHybridFlights.stats.active.some(e=>e.stage==='read'));const drawing=await handState(page);check('draw cancels hover without stuck original '+id,!drawing.preview&&drawing.cards.every(k=>!k.concealed));
  await page.waitForFunction(()=>flightDone,null,{timeout:8000});await page.waitForTimeout(150);
  const hist=await page.evaluate(()=>RunaHybridFlights.stats.history.filter(e=>e.kind==='draw'));const t=k=>hist.filter(e=>e.stage===k).at(-1)?.time;
  if(!reduced){const m={deckToFlip:t('flip')-t('deck'),flipToRead:t('read')-t('flip'),read:t('to-hand')-t('read'),arrive:t('land')-t('to-hand'),total:t('land')-t('deck')};measurements['draw-'+id]=m;check('draw read lasts about one second '+id,m.read>=1000&&m.read<1250,m);check('draw total close to the measured reference (~2.0 s) '+id,m.total>1750&&m.total<2300,m);}
  const released=await page.evaluate(()=>({inert:document.getElementById('hand').inert,lock:document.querySelector('.hybrid-draw-lock').hidden,carriers:document.querySelectorAll('.hybrid-flight-carrier').length}));check('controls restored after draw '+id,!released.inert&&released.lock&&released.carriers===0,released);
  const fresh=await handState(page),target=fresh.cards[3];await page.mouse.move(target.x+target.w/2,viewport.height-30);await page.waitForTimeout(220);await page.mouse.down();await page.mouse.move(target.x+target.w/2,viewport.height-180,{steps:8});const dragging=await handState(page);check('drag hides hover preview '+id,!dragging.preview,dragging.stats);await page.keyboard.press('Escape');await page.mouse.up();await page.waitForTimeout(350);await page.mouse.move(viewport.width/2,viewport.height*.42);await page.waitForTimeout(250);const after=await handState(page);check('interrupted drag leaves no concealed card '+id,after.cards.every(k=>k.opacity==='1'&&!k.concealed)&&!after.preview,after.stats);
  await context.close();
 }
 // B. Draw cancellations restore controls: session change and resize during each stage.
 for(const stage of ['flip','read','to-hand']){for(const how of ['session','resize','blur']){
  const {room,a}=setup();a.hand=Array.from({length:4},()=>card('FV03',a));const {context,page}=await open({width:1920,height:900});await paint(page,view(room,a));
  const drawn=card('FL10',a);a.hand.push(drawn);await page.evaluate(({s,uid})=>{pendingArrival.push(uid);state=s;render();window.flightDone=false;animateDraw(uid,true).finally(()=>window.flightDone=true);},{s:view(room,a),uid:drawn.uid});
  await page.waitForFunction(st=>RunaHybridFlights.stats.active.some(e=>e.stage===st),stage,{timeout:6000});
  if(how==='session'){const next=view(room,a);next.matchId='other-match';await page.evaluate(s=>{state=s;render();},next);}else if(how==='resize')await page.setViewportSize({width:1600,height:900});else await page.evaluate(()=>dispatchEvent(new Event('blur')));
  // Neighbour interpolation (240–300 ms, revision 8) may still be finishing; it must end on its own.
  await page.waitForFunction(()=>flightDone,null,{timeout:6000});await page.waitForFunction(()=>!document.querySelector('.hybrid-flight-carrier,.hybrid-motion-face'),null,{timeout:1500}).catch(()=>{});
  const r=await page.evaluate(()=>({inert:document.getElementById('hand').inert,busy:document.getElementById('hand').getAttribute('aria-busy'),lock:document.querySelector('.hybrid-draw-lock').hidden,carriers:document.querySelectorAll('.hybrid-flight-carrier,.hybrid-motion-face').length,waiting:document.querySelectorAll('[data-hybrid-waiting]').length,active:RunaHybridFlights.stats.active.length}));
  check(`draw cancelled by ${how} during ${stage} restores controls`,!r.inert&&r.busy==='false'&&r.lock&&r.carriers===0&&r.waiting===0&&r.active===0,r);await context.close();}}
 // C. Impacts: one jolt per contact, none added by repeated renders.
 {const {room,a,b}=setup();for(const p of [a,b]){p.hand=[card('FV03',p)];p.reserve=Array.from({length:3},()=>card('FV03',p));p.formation=p.reserve.map(c=>c.uid);}room.phase='resolving';const atk=a.reserve[0],def=b.reserve[0];
  room.combat={id:'impact-test',round:4,startedAt:Date.now()-260,duration:9000,timeline:[{kind:'reveal',duration:200},{kind:'strike',duration:6000,lane:0,strike:{sourceId:atk.uid,owner:a.id,targetOwner:b.id,targetId:def.uid,amount:1,lane:0,healthUpdates:[{uid:def.uid,hp:def.health-1,maxHp:def.health}]}},{kind:'result',duration:2800}],visual:[],lanes:[],spells:[],casualties:[]};
  const {context,page}=await open({width:1920,height:900});const s=view(room,a);await page.evaluate(s=>{state=s;serverClockOffset=Date.now()-s.serverNow;render();},s);await page.waitForFunction(()=>RunaHybrid?.ready);
  for(let i=0;i<6;i++){await page.waitForTimeout(220);await page.evaluate(()=>render());}
  await page.waitForTimeout(1200);const r=await page.evaluate(()=>RunaHybridImpacts.stats);measurements.impact=r;
  check('combat contact produces one visible jolt and one lift',r.count===1&&r.lifted===1,r);
  await page.evaluate(()=>{const n=document.querySelector('#lanes .lane-side .card');heavyCombatImpact(n,2,null);heavyCombatImpact(n,2,null);});const twice=await page.evaluate(()=>RunaHybridImpacts.stats);check('same-node repeat within 120 ms is skipped',twice.count===r.count+1&&twice.skipped>=r.skipped+1,twice);
  await context.close();}
 // C (spells). A lethal spell whose victim already left the board and survives only as a
 // .damage-remnant in #visual-layer still flashes on the impact frame of the real spell
 // flow; a non-lethal spell keeps flashing the board card. The probe wraps the effect's
 // own onHit (and, only during that call, Element.animate) without replacing either.
 for(const reduced of [false,true]){const tag=reduced?' (reduced motion)':'',{room,a,b}=setup();a.hand=[card('FV03',a)];a.reserve=[card('FV03',a)];a.formation=[a.reserve[0].uid,null,null];
  const victim=card('FV03',b),other=b.deck.find(c=>c.type==='creature'&&c.health>=2);b.deck=b.deck.filter(c=>c!==other);Object.assign(other,{owner:b.id});b.hand=[card('FV03',b)];b.reserve=[victim,other];b.formation=[victim.uid,other.uid,null];
  const {context,page}=await open({width:1920,height:900},{reduced});await paint(page,view(room,a));
  await page.evaluate(()=>{window.__hits=[];const fx=RunaDamageFX,play=fx.play;fx.play=function(o={}){const onHit=o.onHit;return play.call(this,{...o,onHit:onHit&&(()=>{const uid=window.__watch,remnant=damageRemnants.get(uid),rec={uid,pre:{table:!!tableCard(uid),remnant:!!remnant?.isConnected,inLayer:!!remnant?.closest('#visual-layer'),inGame:!!remnant?.closest('#game'),hp:displayedHealth.get(uid),spellHits:RunaHybridImpacts.stats.spellHits}},flashes=[],native=Element.prototype.animate;
   Element.prototype.animate=function(k,opt){const anim=native.call(this,k,opt);if(JSON.stringify(k).includes('#bcd8ff'))flashes.push({el:this,anim,k});return anim;};
   let value;try{value=onHit();}finally{Element.prototype.animate=native;}
   const target=remnant||tableCard(uid);rec.post={hp:displayedHealth.get(uid),spellHits:RunaHybridImpacts.stats.spellHits,defeated:visuallyDefeated.has(uid),dead:!!target?.classList.contains('visual-dead'),flashes:flashes.length,onTarget:flashes.filter(x=>target?.contains(x.el)).length,running:flashes.filter(x=>x.anim.playState==='running').length,face:flashes.every(x=>x.el.matches('.hybrid-card-face,.card')&&getComputedStyle(x.el).visibility==='visible'),layer:flashes.map(x=>x.el.closest('#visual-layer')?'visual-layer':x.el.closest('#game')?'game':'other'),transformFree:flashes.every(x=>x.k.every(f=>!('transform' in f))),projected:flashes.every(x=>getComputedStyle(x.el).transform!=='none'||!x.el.matches('.hybrid-card-face'))};window.__hits.push(rec);return value;})});};});
  const spellCard=card('RG07',a),cast=(target,hp)=>{room.events.push({id:++room.eventId,type:'spell',op:'damage',at:Date.now(),playerId:a.id,targetId:target.uid,name:spellCard.name,card:spellCard,amount:1,healthUpdates:[{uid:target.uid,hp,maxHp:target.health}]});};
  // Lethal: the server already moved the victim to the discard when the event arrives.
  b.reserve=[other];b.formation=[null,other.uid,null];b.discard=[...(b.discard||[]),victim];cast(victim,0);
  await page.evaluate(({s,uid})=>{window.__watch=uid;state=s;render();},{s:view(room,a),uid:victim.uid});
  await page.waitForFunction(()=>__hits.length===1,null,{timeout:10000});const lethal=await page.evaluate(()=>__hits[0]);measurements['lethal-spell'+tag]=lethal;
  check('lethal spell precondition: victim off the board, remnant connected outside #game'+tag,!lethal.pre.table&&lethal.pre.remnant&&lethal.pre.inLayer&&!lethal.pre.inGame&&lethal.pre.hp>0,lethal.pre);
  check('lethal spell: native damage and death presentation'+tag,lethal.post.hp===0&&lethal.post.defeated&&lethal.post.dead,lethal.post);
  if(!reduced)check('lethal spell flashes the remnant face once, translate/filter only',lethal.post.spellHits===lethal.pre.spellHits+1&&lethal.post.flashes===1&&lethal.post.onTarget===1&&lethal.post.running===1&&lethal.post.face&&lethal.post.layer[0]==='visual-layer'&&lethal.post.transformFree&&lethal.post.projected,lethal.post);
  else check('reduced motion: no hybrid flash on the lethal spell',lethal.post.spellHits===lethal.pre.spellHits&&lethal.post.flashes===0,lethal.post);
  const victims=uid=>page.evaluate(uid=>({nodes:[...document.querySelectorAll('#visual-layer>[data-uid]')].filter(n=>n.dataset.uid===uid).length,table:!!tableCard(uid),remnant:damageRemnants.has(uid),stats:RunaHybridImpacts.stats}),uid);
  for(let i=0;i<4;i++){await page.waitForTimeout(90);await page.evaluate(()=>render());}const during=await victims(victim.uid);
  check('renders during the death neither repeat the flash nor recreate the victim'+tag,during.stats.spellHits===lethal.post.spellHits&&during.nodes<=1&&!during.table,during);
  await page.waitForFunction(uid=>!damageRemnants.has(uid)&&![...document.querySelectorAll('#visual-layer [data-uid]')].some(n=>n.dataset.uid===uid),victim.uid,{timeout:5000});
  await page.evaluate(()=>render());const settled=await victims(victim.uid);check('victim finishes its native discard flight and stays gone'+tag,settled.nodes===0&&!settled.remnant&&!settled.table&&settled.stats.spellHits===lethal.post.spellHits,settled);
  // Non-lethal: the board card itself still receives the flash.
  other.damage=(other.damage||0)+1;cast(other,other.health-1);
  await page.evaluate(({s,uid})=>{window.__watch=uid;state=s;render();},{s:view(room,a),uid:other.uid});
  await page.waitForFunction(()=>__hits.length===2,null,{timeout:10000});const light=await page.evaluate(()=>__hits[1]);measurements['spell'+tag]=light;
  check('non-lethal spell keeps native health on the board card'+tag,light.pre.table&&!light.pre.remnant&&light.post.hp===other.health-1&&!light.post.defeated,light);
  if(!reduced)check('non-lethal spell flashes the board face once',light.post.spellHits===light.pre.spellHits+1&&light.post.onTarget===1&&light.post.running===1&&light.post.layer[0]==='game'&&light.post.transformFree,light.post);
  else check('reduced motion: no hybrid flash on the non-lethal spell',light.post.spellHits===light.pre.spellHits&&light.post.flashes===0,light.post);
  await context.close();}
 // D. Secrecy in both perspectives, including a rival draw and hovering rival backs.
 {const {room,a,b}=setup();a.hand=Array.from({length:6},()=>card('FL10',a));b.hand=Array.from({length:6},()=>card('FV03',b));const secret=catalog.decks.flatMap(d=>d.cards).find(c=>c.id==='FL10').name;
  for(const [p,label] of [[b,'B sees A'],[a,'A sees B']]){const {context,page}=await open({width:1920,height:900});await paint(page,view(room,p));const rival=p===b?a:b,hidden=p===b?secret:catalog.decks.flatMap(d=>d.cards).find(c=>c.id==='FV03').name;
   const drawn=card(p===b?'FL10':'FV03',rival);rival.hand.push(drawn);await page.evaluate(s=>{state=s;render();window.rivalDone=false;animateDraw(null,false).finally(()=>window.rivalDone=true);},view(room,p));await page.waitForTimeout(150);
   const mid=await page.evaluate(()=>({faces:document.querySelectorAll('.hybrid-flight-carrier .card-art-canvas,.hybrid-flight-carrier .card-title').length,backs:document.querySelectorAll('.hybrid-flight-carrier img.concealed-back-image').length}));
   await page.waitForFunction(()=>rivalDone,null,{timeout:4000});
   await page.mouse.move(960,30);await page.waitForTimeout(250);
   const leak=await page.evaluate(name=>{const rival=document.getElementById('opponent-hand');const attrs=[...document.querySelectorAll('*')].flatMap(n=>[n.getAttribute('aria-label'),n.getAttribute('title'),n.getAttribute('alt')]).filter(Boolean).join('|');return {canvases:rival.querySelectorAll('canvas').length,text:document.body.innerText.includes(name),attrs:attrs.includes(name),props:document.querySelector('.hybrid-props')?.innerText||'',preview:document.getElementById('hover-preview').hidden};},hidden);
   check(label+': rival draw shows only a back',mid.faces===0&&mid.backs<=1,mid);check(label+': no rival hand identity in DOM text, labels, canvases or decoration',leak.canvases===0&&!leak.text&&!leak.attrs&&leak.props==='',leak);
   await context.close();}}
}finally{await browser.close();fs.writeFileSync(out+'/interaction.json',JSON.stringify({checks,errors,measurements},null,1));}
check('no page errors',errors.length===0,errors);
console.log(`${checks.filter(c=>c.pass).length}/${checks.length} verificações de interação passaram`);console.log(JSON.stringify(measurements));
