/* Bounded, disposable particles. A render never restarts a running refill. */
(function(root){
 'use strict';
 const active=new Map(),colors={forja:'#ffbb59',fluxo:'#77d8ff',ruptura:'#ff7559'};
 const center=r=>({x:r.left+r.width/2,y:r.top+r.height/2});
 function clear(){for(const item of [...active.values()])item.stop();active.clear();}
 function place(event,{side}={}){
  if(!event.prepared)return;
  for(const lane of [event.lane,event.sharedLane].filter(Number.isInteger)){
   const key='spell:'+event.id+':'+lane;if(active.has(key))continue;
   const target=document.querySelector('#lanes .lane-side[data-owner="'+event.targetSide+'"][data-lane="'+lane+'"]');if(!target)continue;
   const r=target.getBoundingClientRect(),node=document.createElement('div');node.className='prepared-arrival';node.setAttribute('aria-hidden','true');Object.assign(node.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});node.innerHTML='<i></i><i></i><span>✧</span>';document.body.append(node);
   const reduced=root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
   const animation=node.animate([{opacity:0},{opacity:1,offset:.2},{opacity:1,offset:.55},{opacity:0}],{duration:reduced?300:950,fill:'both'}),record={side,stop(){animation.cancel();node.remove();active.delete(key);}};active.set(key,record);animation.finished.catch(()=>{}).finally(()=>{node.remove();if(active.get(key)===record)active.delete(key);});
  }
 }
 function refill(event,{side,affinity}={}){
  if(!side)return;const key=side+':'+event.id;if(active.has(key))return;
  const previous=Math.max(0,event.previousMana??0),oldMax=Math.max(0,event.previousMax??0),total=Math.min(10,event.manaMax??0);
  const indices=Array.from({length:total},(_,i)=>i).filter(i=>i>=previous);
  if(!indices.length)return;
  for(const item of [...active.values()])if(item.side===side)item.stop();
  const reduced=root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const layer=document.createElement('div');layer.className='ether-refill-layer';layer.setAttribute('aria-hidden','true');layer.style.setProperty('--ether-light',colors[affinity]||colors.fluxo);document.body.append(layer);
  const started=performance.now(),duration=reduced?360:1150+indices.length*55;let raf=0,done=false;
  const head=()=>document.getElementById(side+'-head');
  function restore(){const panel=head()?.querySelector('.patron-ether');panel?.classList.remove('ether-refilling');panel?.querySelectorAll('.ether-point').forEach(p=>{p.classList.remove('ether-new-capacity');p.style.removeProperty('opacity');p.style.removeProperty('filter');});}
  const record={side,stop(){if(done)return;done=true;cancelAnimationFrame(raf);layer.getAnimations?.({subtree:true}).forEach(a=>a.cancel());layer.remove();restore();active.delete(key);}};active.set(key,record);
  const rect=head()?.querySelector('.patron-card')?.getBoundingClientRect();
  const points=head()?.querySelectorAll('.ether-point');
  if(!rect||!points?.length){record.stop();return;}
  const origin=center(rect),spark=(klass,x,y)=>{const p=document.createElement('i');p.className=klass;p.style.left=x+'px';p.style.top=y+'px';layer.append(p);return p;};
  if(!reduced)indices.forEach((index,order)=>{
   const target=points[index];if(!target)return;const to=center(target.getBoundingClientRect()),dx=to.x-origin.x,dy=to.y-origin.y;
   const mote=spark('ether-refill-mote'+(index>=oldMax?' ether-capacity-mote':''),origin.x,origin.y);
   mote.animate([{transform:'translate(-50%,-50%) scale(.15)',opacity:0},{transform:`translate(calc(-50% + ${dx*.38}px),calc(-50% + ${dy*.38-35}px)) scale(1.1)`,opacity:1,offset:.4},{transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(.5)`,opacity:1,offset:.87},{transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(2.1)`,opacity:0}],{duration:720,delay:order*55,easing:'cubic-bezier(.22,.6,.34,1)',fill:'both'});
   const halo=spark('ether-refill-halo',to.x,to.y);halo.animate([{transform:'translate(-50%,-50%) scale(.35)',opacity:0},{transform:'translate(-50%,-50%) scale(.8)',opacity:1,offset:.15},{transform:'translate(-50%,-50%) scale(2.1)',opacity:0}],{duration:450,delay:order*55+570,fill:'both'});
  });
  function frame(now){if(done)return;const elapsed=now-started,panel=head()?.querySelector('.patron-ether');if(!panel||elapsed>=duration){record.stop();return;}panel.classList.add('ether-refilling');panel.style.setProperty('--ether-light',colors[affinity]||colors.fluxo);
   panel.querySelectorAll('.ether-point').forEach((point,index)=>{if(!indices.includes(index))return;const arrival=reduced?0:570+indices.indexOf(index)*55,t=Math.max(0,Math.min(1,(elapsed-arrival)/330));point.classList.toggle('ether-new-capacity',index>=oldMax);point.style.opacity=String(.22+.78*t);point.style.filter=`brightness(${1+Math.sin(t*Math.PI)*1.8})`;});raf=requestAnimationFrame(frame);
  }raf=requestAnimationFrame(frame);
 }
 root.RunaPreparationFeedback={refill,place,clear};
})(globalThis);
