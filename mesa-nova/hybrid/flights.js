import {layoutHands} from './fan-layout.js';
import {matrix} from './card-plane.js';
import {flightPortal,flattenFace,geometry,handPose,rectQuad,cardCopyAt} from './visuals.js';
import {HYBRID} from './config.js';
import {trackMotionSampling} from './motion-sampling.js';

// Presentation only: no speculative play, draw or cost is sent to the server.
export function installFlights({sync,lifecycle}){
 const entries=new Set(),history=[],arrivals=RunaCardArrivals;
 let paused=false;
 const row=document.getElementById('hand'),grid=document.getElementById('mulligan-cards'),controls=document.getElementById('mulligan-controls'),lock=document.createElement('div');
 lock.className='hybrid-draw-lock';lock.hidden=true;lock.setAttribute('aria-label','Comprando carta');document.body.append(lock);
 const key=()=>state?[state.code,state.matchId,state.you].join(':'):'';
 const liveHand=()=>new Set(seat()?.hand?.map(c=>c.uid)||[]);
 // Claude round 4 (reveal lag): called on every arrival notification. Unchanged values are not written again and the
 // hand is measured only while the lock is shown (its height is invisible otherwise), so a hidden lock no longer forces
 // a style and layout pass after each DOM change.
 function updateLock(){const busy=arrivals.blocked;if(row.inert!==busy)row.inert=busy;if(grid.inert!==busy)grid.inert=busy;if(controls.inert!==busy)controls.inert=busy;if(row.getAttribute('aria-busy')!==String(busy))row.setAttribute('aria-busy',String(busy));if(lock.hidden!==!busy)lock.hidden=!busy;if(!busy)return;const r=row.getBoundingClientRect(),h=Math.max(0,innerHeight-r.top+12)+'px';if(lock.style.height!==h)lock.style.height=h;}
 function markWaiting(){for(const parent of [row,grid])for(const node of parent.querySelectorAll('.card')){node.classList.toggle('pending-arrival',arrivals.has(node.dataset.uid));if(parent===row)node.toggleAttribute('data-hybrid-waiting',arrivals.waiting(node.dataset.uid));}}
 function cleanupPending(){arrivals.retain(liveHand());markWaiting();updateLock();}
 function stopEntries(){for(const e of entries){e.cancelled=true;for(const a of e.animations)a.cancel();e.node?.remove();e.arriving?.remove();}entries.clear();}
 function cancelAll(){const ids=arrivals.pending,moved=arrivals.cancelKinds(['draw','rival-draw','return','mulligan-return','opening-to-hand','transfer','reflow']);stopEntries();for(const uid of moved)finishVisual(uid);for(const uid of ids){arrivals.release(uid);if(liveHand().has(uid))revealArrival(uid);}markWaiting();layoutHands();updateLock();}
 // Claude round 4 (reveal lag): neighbours that finish sliding together (reflow tickets) release in the same microtask
 // checkpoint; their hand layouts are merged into one, run before the lifecycle's merged sync and before the frame.
 let handLayoutQueued=false;const layoutHandsSoon=()=>{if(handLayoutQueued)return;handLayoutQueued=true;queueMicrotask(()=>{handLayoutQueued=false;layoutHands();});};
 arrivals.subscribe((type,detail)=>{if(type==='reset')stopEntries();markWaiting();if(type==='release'){if(detail?.kind==='reflow')layoutHandsSoon();else layoutHands();}updateLock();});
 lifecycle.addHook({afterContent(){if(paused)cancelAll();else cleanupPending();},after:updateLock});
 const reduce=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 const duration=ms=>reduce()?Math.max(30,ms*.15):ms;
 const valid=e=>!e.cancelled&&arrivals.current(e.ticket)&&!paused&&e.generation===visualGeneration&&e.session===key()&&e.width===innerWidth&&e.height===innerHeight&&e.scroll===scrollY;
 function begin(kind,mine=false,uid=null,externalTicket){const ticket=externalTicket||arrivals.begin(kind,{uid,arrival:mine&&!!uid,lock:mine}),e={ticket,external:!!externalTicket,id:ticket?.id,kind,mine,uid,generation:visualGeneration,session:key(),width:innerWidth,height:innerHeight,scroll:scrollY,cancelled:!ticket,animations:new Set(),stage:'start'};if(ticket)entries.add(e);return e;}
 function stage(e,value,pose){e.stage=value;history.push({id:e.id,kind:e.kind,mine:e.mine,profile:e.profile||null,stage:value,time:performance.now(),pose:pose?{...pose}:null});if(history.length>180)history.shift();}
 // Revision 10 draw rhythm, compared frame by frame with the local reference video
 // (own draw ≈13.10–15.08 s): the back rises, flips quickly while still travelling,
 // settles with a small tilt correction, is read for about one second and then
 // accelerates into the hand. Values are ours, not the reference's internals.
 // Revision 11: the opening deal (the event that hands out the first five cards) uses
 // the same choreography with every programmed duration multiplied by
 // HYBRID.draw.openingFactor (0.25, i.e. 75% shorter). It is selected only by the
 // explicit {presentation:'opening'} option passed from the opening event and, since
 // S3, from the replacement draws tied to a mulligan event; normal draws (including
 // the first Preparation) keep DRAW.
 const DRAW=HYBRID.draw.normal,OPENING_DRAW=Object.freeze(Object.fromEntries(Object.entries(DRAW).map(([k,v])=>[k,v*HYBRID.draw.openingFactor])));
 async function animate(e,node,frames,ms,delay=0,easing='cubic-bezier(.22,.65,.22,1)'){
  if(!valid(e))return false;const a=node.animate(frames,{duration:ms,delay,easing,fill:'forwards'}),stopSampling=trackMotionSampling(node,a,frames);e.animations.add(a);let raf=0;
  const check=()=>{if(!valid(e)){a.cancel();return;}raf=requestAnimationFrame(check);};raf=requestAnimationFrame(check);
  try{await Promise.race([a.finished.catch(()=>{}),pause(ms+delay+600)]);if(valid(e)){const last=frames.at(-1);for(const p of ['transform','opacity'])if(last[p]!==undefined)node.style[p]=last[p];return true;}return false;}finally{stopSampling();cancelAnimationFrame(raf);a.cancel();e.animations.delete(a);}
 }
 async function hold(e,ms){const until=performance.now()+ms;while(valid(e)&&performance.now()<until)await pause(Math.min(40,until-performance.now()));return valid(e);}
 const box=node=>{const r=node?.getBoundingClientRect();return r?.width&&r?.height?r:null;};
 const deck=mine=>box(document.getElementById(mine?'self-deck':'opponent-deck'));
 function destination(uid,mine){if(!mine)return document.getElementById('opponent-hand')?.lastElementChild;return state?.phase==='mulligan'&&!seat()?.mulliganReady?[...grid.querySelectorAll('.card')].find(n=>n.dataset.uid===uid):[...row.querySelectorAll('.card')].find(n=>n.dataset.uid===uid);}
 async function ready(node){await Promise.race([Promise.resolve(node?.visualReady),pause(1600)]);await new Promise(requestAnimationFrame);layoutHands();sync();}
 function makeBack(){const n=document.createElement('div');n.className='card back';const i=document.createElement('img');i.src='card-back.png';i.className='concealed-back-image';i.alt='Carta oculta';n.append(i);return n;}
 function carrier(e,w,h,face){const n=document.createElement('div'),flip=document.createElement('div');n.className='hybrid-flight-carrier';n.dataset.flightKind=e.kind;Object.assign(n.style,{width:w+'px',height:h+'px'});flip.className='hybrid-flight-flipper';const copy=flattenFace(face);copy.classList.add('hybrid-flight-face');flip.append(copy);n.append(flip);flightPortal().append(n);e.node=n;return {n,flip,w,h};}
 const rectPose=r=>({x:r.x+r.width/2,y:r.y+r.height/2,w:r.width,h:r.height,angle:0});
 const transform=(c,p)=>`translate3d(${p.x-c.w/2}px,${p.y-c.h/2}px,0) rotate(${p.angle||0}deg) scale(${p.w/c.w},${p.h/c.h})`;
 const frame=(c,p,extra={})=>({transform:transform(c,p),...extra});
 function readPose(){const vw=document.documentElement.clientWidth,freeH=Math.max(130,innerHeight-(window.RunaHybridFan?.stats.own?.visible||90)-48),w=Math.min((innerWidth<=600?260:Math.max(210,Math.min(300,innerWidth*.19)))*HYBRID.visualScale,vw-32,freeH/1.4),h=w*1.4;return {x:innerWidth<=600?vw/2:Math.min(vw-w/2-24,vw*.85),y:Math.min(innerHeight-(window.RunaHybridFan?.stats.own?.visible||90)-h/2-24,Math.max(h/2+20,innerHeight*.45)),w,h,angle:0};}
 function finish(e){e.node?.remove();e.arriving?.remove();for(const a of e.animations)a.cancel();entries.delete(e);const owned=!e.external&&arrivals.finish(e.ticket);if(owned&&e.mine&&e.uid&&e.generation===visualGeneration&&e.session===key()&&liveHand().has(e.uid))revealArrival(e.uid);cleanupPending();}

 async function returnToHand(event){
  const mine=!state?.spectator&&event.playerId===state?.you,e=begin('return',mine,event.returnedId);if(!e.ticket)return;const saved=damageSnapshots.get(event.cardId);
  const remnant=damageRemnants.get(event.cardId);let fullFace;
  if(mine){hideHover();updateLock();}
  try{
   if(!saved?.copy)return;
   const pose=saved.copy.hybridFlightSource||{quad:rectQuad(saved.rect),w:saved.rect.width,h:saved.rect.height};
   const start={x:pose.quad.reduce((s,p)=>s+p.x,0)/4,y:pose.quad.reduce((s,p)=>s+p.y,0)/4,w:Math.hypot(pose.quad[1].x-pose.quad[0].x,pose.quad[1].y-pose.quad[0].y),h:Math.hypot(pose.quad[3].x-pose.quad[0].x,pose.quad[3].y-pose.quad[0].y),angle:0};
   const c=carrier(e,start.w,start.h,cloneVisual(saved.copy));c.n.style.transform=transform(c,start);remnant?.remove();stage(e,'from',start);
   let target=destination(event.returnedId,mine);if(!target)return;
   if(mine){const card=seat().hand.find(c=>c.uid===event.returnedId);if(!card)return;fullFace=cardEl(card,{zoom:true});await Promise.race([fullFace.visualReady,pause(1600)]);
    if(!valid(e))return;lifecycle.handTransition(()=>{arrivals.insert(e.ticket);markWaiting();});target=destination(event.returnedId,true);
   }else fullFace=makeBack();
   if(!valid(e)||!target)return;
   const front=flattenFace(fullFace);front.classList.add('hybrid-flight-face','hybrid-return-front');c.flip.append(front);
   const end=mine?handPose(target):rectPose(target.getBoundingClientRect()),rise={...start,y:start.y-25,w:start.w*1.08,h:start.h*1.08};/* Round 2 (owner): the carrier is laid out at the END (hand) size and starts scaled down, without will-change, so the face is rasterised for the hand and not enlarged from the small reserve bitmap during the transition. */c.w=end.w;c.h=end.h;Object.assign(c.n.style,{width:end.w+'px',height:end.h+'px',willChange:'auto'});c.n.style.transform=transform(c,start);
   stage(e,'to-hand',end);if(typeof identityPlay==='function'&&identityCard(event.returnedId)?.persistentReturnUsed)identityPlay('memory',c.n,c.n,()=>{},null,800);else sound('magic');
   await Promise.all([
    animate(e,c.n,[frame(c,start),{...frame(c,rise),offset:.22},frame(c,end)],duration(1000),0,'cubic-bezier(.25,.6,.3,1)'),
    animate(e,front,[{opacity:0},{opacity:0,offset:.22},{opacity:1,offset:.65},{opacity:1}],duration(1000))
   ]);stage(e,'land',end);if(valid(e))sound('place');
  }finally{remnant?.remove();if(damageRemnants.get(event.cardId)===remnant)damageRemnants.delete(event.cardId);finish(e);sync();}
 };

 async function draw({uid,mine=true,options={}}){
  // Not named 'opening': that name is the pending confirmed-hand transfer below.
  const openingDeal=options?.presentation==='opening',P=openingDeal?OPENING_DRAW:DRAW,e=begin(mine?'draw':'rival-draw',mine,uid);if(!e.ticket)return;e.profile=openingDeal?'opening':'normal';if(mine){hideHover();cleanupDrag();RunaTargeting?.cancel('draw');updateLock();}
  try{
   await arrivals.waitFor('opening-to-hand');if(!valid(e))return;
   let target=destination(uid,mine),from=deck(mine);if(!target||!from)return;
   if(mine)await ready(target);if(!valid(e))return;
   const card=mine?seat()?.hand?.find(c=>c.uid===uid):null,read=readPose(),c=carrier(e,read.w,read.h,makeBack()),start=rectPose(from);c.n.style.transform=transform(c,start);stage(e,'deck',start);sound('draw',0,{from:start,to:read,travelSeconds:.32});
   if(!mine){const r=box(target);if(!r)return;const end=rectPose(r);stage(e,'to-hand',end);await animate(e,c.n,[frame(c,start),frame(c,end)],duration(500));stage(e,'land',end);return;}
   if(!card)return;
   const front=cardEl(card,{zoom:true});await Promise.race([front.visualReady,pause(1600)]);if(!valid(e))return;
   const tilt=reduce()?0:(read.x<start.x?-13:13),lift={x:start.x+(read.x-start.x)*.22,y:Math.min(start.y-70,start.y+(read.y-start.y)*.3),w:read.w*.7,h:read.h*.7,angle:tilt};
   if(!await animate(e,c.n,[frame(c,start),frame(c,lift)],duration(P.rise),0,'cubic-bezier(.3,.55,.35,1)'))return;
   stage(e,'flip',lift);
   // The flip happens during the travel; the face is swapped at the edge-on frame.
   const overshoot={...read,w:read.w*1.03,h:read.h*1.03,angle:tilt*-.12};
   const travel=animate(e,c.n,[frame(c,lift),{...frame(c,overshoot),offset:.72},frame(c,read)],duration(P.travel),0,'cubic-bezier(.2,.7,.25,1)');
   const flip=(async()=>{if(!await animate(e,c.flip,[{transform:'rotateY(0deg)'},{transform:'rotateY(90deg)'}],duration(P.flip/2),0,'cubic-bezier(.5,0,1,1)'))return false;const face=flattenFace(front);face.classList.add('hybrid-flight-face');c.flip.replaceChildren(face);c.flip.style.transform='rotateY(-90deg)';return animate(e,c.flip,[{transform:'rotateY(-90deg)'},{transform:'rotateY(0deg)'}],duration(P.flip/2),0,'cubic-bezier(0,0,.5,1)');})();
   const [travelled,flipped]=await Promise.all([travel,flip]);if(!travelled||!flipped)return;
   c.n.classList.add('reading');stage(e,'read',read);if(!await hold(e,reduce()?P.readReduced:P.read))return;c.n.classList.remove('reading');
   target=destination(uid,true);if(!target||!box(target))return;
   if(target.closest('#hand'))lifecycle.handTransition(()=>{arrivals.insert(e.ticket);markWaiting();});
   target=destination(uid,true);const end=target.closest('#hand')?handPose(target):rectPose(target.getBoundingClientRect());stage(e,'to-hand',end);
   const middle={x:(read.x+end.x)/2,y:(read.y+end.y)/2-20,w:(read.w+end.w)/2,h:(read.h+end.h)/2,angle:end.angle*.5};
   // Accelerating departure, as observed when the read card leaves for the hand.
   if(await animate(e,c.n,[frame(c,read),{...frame(c,middle),offset:.45},frame(c,end)],duration(P.arrive),0,'cubic-bezier(.55,0,.75,.6)'))stage(e,'land',end);
  }finally{finish(e);}
 };

 async function mulliganReturn(event){
  const cards=mulliganDepartures.get(event.id)||[];mulliganDepartures.delete(event.id);const e=begin('mulligan-return',true);updateLock();
  try{const endBox=deck(true);if(!endBox)return;const end=rectPose(endBox);stage(e,'deck-target',end);
   await Promise.all(cards.map(async(item,i)=>{if(!item.rect?.width)return;const c=carrier({...e,node:null},84,117.6,makeBack());const from=rectPose(item.rect);c.n.style.transform=transform(c,from);try{await animate(e,c.n,[frame(c,from,{opacity:1}),frame(c,end,{opacity:.1})],duration(460),i*55);}finally{c.n.remove();}}));stage(e,'land',end);
  }finally{finish(e);}
 };

 async function transfer({uid,copy,rect,card,ticket,duration:customDuration,delay=0,destination:selector=null}){
  const e=begin('transfer',false,uid,ticket);let arriving;
  try{
   if(!rect?.width||!rect.height)return;
   const original=copy.hybridFlightSource,b=original?.bounds,same=b&&Math.abs(b.x-rect.x)<2&&Math.abs(b.y-rect.y)<2&&Math.abs(b.width-rect.width)<2;
   const from=same?original:{quad:rectQuad(rect),w:rect.width,h:rect.height};
   // command() already hid this UID. Keep the departing face at its captured
   // pose while the replacement DOM, art and projection become ready.
   if(arrivals.current(ticket))e.node=cardCopyAt(copy,from);
   await Promise.race([copy?.visualReady,pause(1600)]);await new Promise(requestAnimationFrame);layoutHands();sync();
   const target=selector?document.querySelector(selector):tableCard(uid);if(!target||!valid(e))return;
   await ready(target);if(!valid(e)||!box(target))return;
   const to=geometry(target),departing=e.node||cardCopyAt(copy,from);e.node=departing;
   arriving=cardCopyAt(target,to);e.arriving=arriving;arriving.style.opacity='0';target.style.visibility='hidden';document.querySelectorAll('.release-ghost').forEach(n=>n.remove());
   const ms=duration(customDuration??(650+weightOf(card)*120));stage(e,'from',{x:from.quad.reduce((s,p)=>s+p.x,0)/4,y:from.quad.reduce((s,p)=>s+p.y,0)/4});
   const m=(q,w,h)=>'matrix3d('+matrix(q,w,h).join(',')+')';
   await Promise.all([
    animate(e,departing,[{transform:m(from.quad,from.w,from.h),opacity:1},{transform:m(to.quad,from.w,from.h),opacity:0}],ms,delay),
    animate(e,arriving,[{transform:m(from.quad,to.w,to.h),opacity:0},{transform:m(to.quad,to.w,to.h),opacity:1}],ms,delay)
   ]);stage(e,'land',{x:to.quad.reduce((s,p)=>s+p.x,0)/4,y:to.quad.reduce((s,p)=>s+p.y,0)/4});if(valid(e))sound('place');
  }finally{arriving?.remove();copy?.remove();finish(e);}
 }
 RunaPresentation.register('hybrid-transfers',{
  active:()=>document.body.classList.contains('hybrid-active'),
  animations:{transfer,draw,return:returnToHand,mulliganReturn,async openingLayout(){await new Promise(requestAnimationFrame);layoutHands();sync();}},
 });

 const cancelReason=()=>{paused=document.hidden;cancelAll();};
 addEventListener('blur',()=>{paused=true;cancelAll();});addEventListener('focus',()=>paused=false);document.addEventListener('visibilitychange',cancelReason);addEventListener('pagehide',cancelAll);
 for(const type of ['pointerdown','click','keydown'])lock.addEventListener(type,e=>{e.preventDefault();e.stopImmediatePropagation();});
 window.RunaHybridFlights={cancel:cancelAll,get stats(){return {locked:arrivals.blocked,pending:arrivals.pending.length,active:[...entries].map(e=>({id:e.id,kind:e.kind,mine:e.mine,stage:e.stage})),history:[...history]};}};
}
