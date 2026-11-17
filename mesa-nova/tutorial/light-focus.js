// A single exposure layer for transient luminous effects. Concurrent effects use
// the strongest exposure, never additive darkness; origin/targets stay readable.
(function(root){
 const live=new Set();let canvas,ink,frame=0;
 const smooth=v=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v);};
 function clear(){cancelAnimationFrame(frame);frame=0;live.clear();canvas?.remove();canvas=null;ink=null;}
 function acquire({nodes=[],duration=1000,strength=.36,valid=()=>true}={}){
  if(root.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return {release(){}};
  const entry={nodes,until:performance.now()+duration,start:performance.now(),strength:Math.min(.48,strength),valid,rects:new Map()};live.add(entry);
  if(!canvas){canvas=document.createElement('canvas');canvas.className='light-focus-veil';canvas.setAttribute('aria-hidden','true');document.body.append(canvas);ink=canvas.getContext('2d');}
  if(!frame)frame=requestAnimationFrame(tick);
  return {release(immediate=false){if(immediate)live.delete(entry);else entry.until=Math.min(entry.until,performance.now()+200);if(!live.size)clear();}};
 }
 function tick(now){
  frame=0;let opacity=0;
  for(const entry of live){if(now>=entry.until||!entry.valid()){live.delete(entry);continue;}opacity=Math.max(opacity,entry.strength*smooth((now-entry.start)/180)*smooth((entry.until-now)/300));}
  if(!live.size){clear();return;}
  // A smooth exposure mask needs no supersampled detail, so keep it at CSS pixels.
  if(canvas.width!==innerWidth||canvas.height!==innerHeight){canvas.width=innerWidth;canvas.height=innerHeight;}
  ink.clearRect(0,0,innerWidth,innerHeight);ink.globalCompositeOperation='source-over';ink.fillStyle='rgba(5,7,9,'+opacity+')';ink.fillRect(0,0,innerWidth,innerHeight);
  ink.globalCompositeOperation='destination-out';
  for(const entry of live)for(const ref of entry.nodes){const node=typeof ref==='function'?ref():ref,r=node?.getBoundingClientRect?.();if(r?.width&&r.height)entry.rects.set(ref,r);const box=entry.rects.get(ref);if(!box)continue;
   const x=box.left+box.width/2,y=box.top+box.height/2,radius=Math.max(80,Math.hypot(box.width,box.height)/2+28),g=ink.createRadialGradient(x,y,radius*.7,x,y,radius*1.4);g.addColorStop(0,'#000');g.addColorStop(1,'#0000');ink.fillStyle=g;ink.fillRect(x-radius*1.4,y-radius*1.4,radius*2.8,radius*2.8);
  }
  canvas.dataset.exposure=opacity.toFixed(3);frame=requestAnimationFrame(tick);
 }
 root.RunaLightFocus={acquire,clear,get active(){return live.size;}};
 root.addEventListener('pagehide',clear);
})(globalThis);
