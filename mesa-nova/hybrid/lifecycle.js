import {layoutHands} from './fan-layout.js';
import {matrix} from './card-plane.js';
import {geometry,cardCopyAt,currentQuad} from './visuals.js';
// The game remains authoritative. Ghosts only bridge old/new public DOM poses.
export function installLifecycle({sync,ensureGeometry}){
 const hooks=[],motions=new Map(),owner=RunaCardArrivals;let renders=0,session='';
 const current=uid=>[...document.querySelectorAll('#game .card')].find(n=>n.dataset.uid===uid);
 const key=()=>state?[state.code,state.matchId,state.you].join(':'):'';
 function clear(){for(const m of motions.values())owner.finish(m.ticket);motions.clear();}
 function capture(selector){return [...document.querySelectorAll(selector)].filter(n=>n.dataset.uid&&!n.hasAttribute('data-hybrid-waiting')).map(node=>{const uid=node.dataset.uid,m=motions.get(uid),p=geometry(node);return {uid,node,pose:m?{...p,quad:currentQuad(m.copy,m.w,m.h)}:p,visible:m||getComputedStyle(node).visibility!=='hidden'};});}
 function hideMotionTargets(){for(const [uid] of motions){const n=current(uid);if(n)n.style.visibility='hidden';}}
 function move(from,to,duration=240){
  const previous=motions.get(from.uid);
  if(!from.visible||!to.node?.isConnected||(cardInFlight(from.uid)&&owner.moveTicket(from.uid)!==previous?.ticket))return;
  const distance=Math.max(...from.pose.quad.map((p,i)=>Math.hypot(p.x-to.pose.quad[i].x,p.y-to.pose.quad[i].y)));if(distance<.5)return;
  const ticket=owner.begin('reflow',{uid:from.uid,moving:true,replace:true});if(!ticket)return;
  const copy=cardCopyAt(from.node,from.pose),entry={copy,w:from.pose.w,h:from.pose.h,ticket,animation:null};
  owner.own(ticket,()=>{entry.animation?.cancel();copy.remove();if(motions.get(from.uid)===entry)motions.delete(from.uid);});
  const options={duration:matchMedia('(prefers-reduced-motion: reduce)').matches?60:duration,easing:'cubic-bezier(.2,.7,.25,1)',fill:'forwards'};
  entry.animation=copy.animate([{transform:'matrix3d('+matrix(from.pose.quad,from.pose.w,from.pose.h).join(',')+')'},{transform:'matrix3d('+matrix(to.pose.quad,from.pose.w,from.pose.h).join(',')+')'}],options);
  motions.set(from.uid,entry);to.node.style.visibility='hidden';
  entry.animation.finished.catch(()=>{}).finally(()=>{if(!owner.finish(ticket))return;finishVisual(from.uid);sync();});
 }
 function reflow(before,after){const oldIds=before.map(p=>p.uid).sort().join('|'),newIds=after.map(p=>p.uid).sort().join('|');if(oldIds===newIds)return;for(const to of after){const from=before.find(p=>p.uid===to.uid);if(from)move(from,to);}}
 function handTransition(change){const before=capture('#hand>.hand-card');change();layoutHands();const after=capture('#hand>.hand-card');for(const to of after){const from=before.find(p=>p.uid===to.uid);if(from)move(from,to,300);}hideMotionTargets();sync();}
 RunaPresentation.register('hybrid-scene',{
  capture(){
   if(key()!==session){clear();session=key();}
   const reserve=capture('.reserve-camp .card-row>.card'),hand=capture('#hand>.hand-card');hooks.forEach(h=>h.before?.());
   return {reserve,hand};
  },
  layout({reserve,hand}){
   hooks.forEach(h=>h.afterContent?.());layoutHands();hideMotionTargets();sync();
   reflow(reserve,capture('.reserve-camp .card-row>.card'));reflow(hand,capture('#hand>.hand-card'));hideMotionTargets();if(motions.size)sync();
  },
  after(){ensureGeometry();hooks.forEach(h=>h.after?.());renders++;},
  ensureGeometry,
 });
 // Revision 12: motionUids lists the UIDs whose neighbour-motion copy is on screen now
 // (the copy itself carries no data-uid), so QA can count every visible face per UID.
 const api={addHook:h=>hooks.push(h),handTransition,clear,sync,get stats(){return {renders,atomicProjection:true,movingNeighbors:motions.size,motionUids:[...motions].filter(([,m])=>m.copy.isConnected).map(([uid])=>uid)};}};
 window.RunaHybridLifecycle=api;addEventListener('pagehide',clear);return api;
}
