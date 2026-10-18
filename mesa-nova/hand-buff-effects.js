/* One lightweight canvas for a Last Breath travelling to the affected hand. */
(function(root){
 'use strict';
 const active=new Set();
 const clamp=n=>Math.max(0,Math.min(1,n));
 function box(target){const n=typeof target==='function'?target():target,r=n?.getBoundingClientRect?.();return r?.width&&r?.height?r:null;}
 function point(r){return {x:r.left+r.width/2,y:r.top+r.height/2};}
 function curve(a,b,t,bend){const u=1-t,c={x:(a.x+b.x)/2+bend,y:Math.min(a.y,b.y)-65};return {x:u*u*a.x+2*u*t*c.x+t*t*b.x,y:u*u*a.y+2*u*t*c.y+t*t*b.y};}
 function play({from,targets=[],hiddenHand=null,count=0,getGeneration=()=>0,onSound=()=>{}}={}){
  const startBox=box(from),privateTargets=targets.filter(t=>box(t.node)),hidden=box(hiddenHand);
  if(!startBox||!count||(!privateTargets.length&&!hidden))return Promise.resolve(false);
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');if(!ctx)return Promise.resolve(false);
  canvas.className='hand-buff-layer';canvas.setAttribute('aria-hidden','true');canvas.style.cssText='position:fixed;inset:0;width:100%;height:100%;z-index:4502;pointer-events:none';
  const ratio=Math.min(root.devicePixelRatio||1,1.5),width=root.innerWidth,height=root.innerHeight;
  canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);ctx.scale(ratio,ratio);document.body.append(canvas);
  const reduced=root.matchMedia?.('(prefers-reduced-motion: reduce)').matches,duration=reduced?700:1500,start=performance.now(),generation=getGeneration(),origin=point(startBox);
  const destinations=privateTargets.length?privateTargets:[{node:hiddenHand,hidden:true}],record={cancel:null};let frame=0,done=false,resolve;
  const promise=new Promise(r=>resolve=r);
  function finish(ok){if(done)return;done=true;cancelAnimationFrame(frame);canvas.remove();active.delete(record);resolve(ok);}
  record.cancel=()=>finish(false);active.add(record);onSound();
  function glow(x,y,r,alpha){const g=ctx.createRadialGradient(x,y,1,x,y,r);g.addColorStop(0,'rgba(255,234,170,'+alpha+')');g.addColorStop(.32,'rgba(231,168,69,'+alpha*.5+')');g.addColorStop(1,'rgba(231,168,69,0)');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);}
  function tick(now){
   if(done)return;if(generation!==getGeneration()){finish(false);return;}
   const t=clamp((now-start)/duration);ctx.clearRect(0,0,width,height);
   glow(origin.x,origin.y-14,40+70*t,(1-t)*.65);
   if(t<.62){ctx.save();ctx.globalAlpha=Math.min(1,t*8)*(1-clamp((t-.28)/.34));ctx.fillStyle='#ffe2a0';ctx.font='600 15px Georgia,serif';ctx.textAlign='center';ctx.shadowColor='#201006';ctx.shadowBlur=6;ctx.fillText('Último Suspiro',origin.x,origin.y-34-t*20);ctx.restore();}
   destinations.forEach((entry,index)=>{
    const r=box(entry.node);if(!r)return;const dest=point(r),delay=Math.min(index*.025,.16),travel=clamp((t-delay)/.56),arrival=clamp((t-.48-delay)/.24),fade=1-clamp((t-.8)/.2),bend=(index-(destinations.length-1)/2)*18;
    if(!reduced&&travel<1){
     ctx.beginPath();for(let s=0;s<=22;s++){const p=curve(origin,dest,Math.max(0,travel-s*.012),bend);s?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);}ctx.strokeStyle='rgba(245,190,92,'+Math.sin(travel*Math.PI)+')';ctx.lineWidth=2.5;ctx.stroke();
     const p=curve(origin,dest,travel,bend);glow(p.x,p.y,18,.85*Math.sin(travel*Math.PI));
     for(let k=0;k<6;k++){const q=curve(origin,dest,Math.max(0,travel-k*.025),bend);ctx.fillStyle='rgba(255,226,158,'+(1-k/7)*Math.sin(travel*Math.PI)+')';ctx.fillRect(q.x+Math.sin(k*7+t*12)*9,q.y+Math.cos(k*4+t*8)*7,2,2);}
    }
    if(arrival>0){
     ctx.save();ctx.globalAlpha=arrival*fade;glow(dest.x,r.top+r.height*.46,Math.min(r.width*.8,110),.27);
     ctx.strokeStyle='#f1d18a';ctx.lineWidth=2;ctx.shadowColor='#efb34d';ctx.shadowBlur=12;
     if(!entry.hidden){ctx.beginPath();ctx.roundRect(r.left+4,r.top+4,r.width-8,r.height-8,10);ctx.stroke();}
     ctx.shadowBlur=5;ctx.fillStyle='#fff0bd';ctx.font='bold '+(entry.hidden?16:22)+'px Georgia,serif';ctx.textAlign='center';
     ctx.fillText(entry.hidden?'Aliados na mão fortalecidos':'+'+entry.attack+'/+'+entry.health,dest.x,r.top+Math.max(24,r.height*.3)-arrival*12);ctx.restore();
    }
   });
   if(t>=1){finish(true);return;}frame=requestAnimationFrame(tick);
  }
  frame=requestAnimationFrame(tick);return promise;
 }
 function clear(){for(const record of [...active])record.cancel();}
 root.RunaHandBuff={play,clear};root.addEventListener?.('pagehide',clear);
})(globalThis);
