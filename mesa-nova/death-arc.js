// Formation addendum, block B (owner decision of 04/11/2026): a defeated card leaves its last visible position and
// travels in an arc to its owner's Nartvanyr compartment (#self-grave / #opponent-grave), shrinking on the way, and
// the compartment signals the arrival briefly. Presentation only: the moment the flight starts, its duration and
// the card copy come from the existing casualty code (the engine's result step / the damage aftermath); the count
// shown in the compartment comes from the engine state. The destination is read again on every frame, so a resize
// or a scroll during the flight still lands on the compartment; a compartment outside the screen is replaced by
// the nearest visible point on the way to it. Reduced motion: no travel, the copy fades where it is and the
// compartment signals the arrival.
(function(root){
 let active=0,serial=0;const flights=new Map(),listeners=new Set(),history=[];
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 const box=n=>{const r=n.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,w:r.width,h:r.height};};
 const inside=p=>{const m=12;return {x:Math.min(innerWidth-m,Math.max(m,p.x)),y:Math.min(innerHeight-m,Math.max(m,p.y))};};
 const emit=()=>{for(const f of listeners)try{f(active);}catch{}};
 function signal(node){if(!node?.isConnected)return;node.classList.remove('grave-arrival');void node.offsetWidth;node.classList.add('grave-arrival');setTimeout(()=>node.classList.remove('grave-arrival'),reduced()?400:720);}
 // copy: the card copy already on screen (flat, positioned at the card's last visible box); target(): the
 // owner's compartment node, re-read every frame. Resolves when the copy has arrived (or was removed).
 function fly(copy,target,{duration=850,endScale=.18,uid=null,owner=null}={}){
  const id=++serial,start=box(copy),t0=performance.now(),D=reduced()?Math.min(260,duration):duration,record={id,uid,owner,start:{x:start.x,y:start.y},startedAt:t0,duration:D,samples:[]};
  active++;flights.set(id,record);emit();
  return new Promise(resolve=>{
   let raf=0,done=false;
   const finish=()=>{if(done)return;done=true;cancelAnimationFrame(raf);const node=target();record.arrivedAt=performance.now();record.end=node?box(node):null;record.final=record.last||null;signal(node);flights.delete(id);history.push(record);if(history.length>40)history.shift();active--;emit();resolve(record);};
   const step=now=>{
    if(!copy.isConnected){finish();return;}
    const t=Math.min(1,(now-t0)/D),node=target(),dest=inside(node?box(node):start);
    if(reduced()){copy.style.transform=`scale(${1-.25*t})`;copy.style.opacity=String(1-t);}
    else{
     // quadratic arc: the control point rises above both ends by a quarter of the distance (40–200 px)
     const dx=dest.x-start.x,dy=dest.y-start.y,dist=Math.hypot(dx,dy),lift=Math.min(200,Math.max(40,dist*.25)),cx=(start.x+dest.x)/2,cy=Math.min(start.y,dest.y)-lift;
     const e=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2,u=1-e,x=u*u*start.x+2*u*e*cx+e*e*dest.x,y=u*u*start.y+2*u*e*cy+e*e*dest.y,s=1+(endScale-1)*e,rot=9*e;
     copy.style.transform=`translate(${x-start.x}px,${y-start.y}px) scale(${s}) rotate(${rot}deg)`;copy.style.opacity=String(t<.82?1:Math.max(0,1-(t-.82)/.18));
     record.last={t:+t.toFixed(3),x:+x.toFixed(1),y:+y.toFixed(1),s:+s.toFixed(3),dest:{x:+dest.x.toFixed(1),y:+dest.y.toFixed(1)}};if(record.samples.length<64)record.samples.push(record.last);}
    if(t>=1){finish();return;}raf=requestAnimationFrame(step);};
   raf=requestAnimationFrame(step);
  });
 }
 root.RunaDeathArc={fly,get active(){return active;},get flights(){return [...flights.values()].map(f=>({...f,samples:f.samples.length}));},get history(){return history.map(f=>({...f}));},onChange(f){listeners.add(f);return ()=>listeners.delete(f);}};
})(globalThis);
