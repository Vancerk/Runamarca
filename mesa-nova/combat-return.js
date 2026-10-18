/* Presentation only: the authoritative reserve is already updated by the server. */
(function(root){
 'use strict';
 const clamp=t=>Math.max(0,Math.min(1,t)),smooth=t=>{t=clamp(t);return t*t*(3-2*t);},out=t=>1-Math.pow(1-clamp(t),3);
 const mix=(a,b,t)=>a+(b-a)*t,mid=r=>({x:r.left+r.width/2,y:r.top+r.height/2});
 const styles=new Map([
  ['forge',{stagger:720,duration:1470,sound:'hammer'}],
  ['ether',{stagger:130,duration:1350,sound:'sleep'}],
  ['chain',{stagger:180,duration:1390,sound:'pull'}],
  ['gentle',{stagger:110,duration:800,sound:'place'}],
 ]);
 const energyStyles={forja:'forge',fluxo:'ether',ruptura:'chain'};
 let active=null;
 function styleFor(patron){return styles.has(patron?.returnStyle)?patron.returnStyle:energyStyles[patron?.affinity]||'gentle';}
 function candidates(state,snapshots){
  if(!state||state.phase==='resolving'||state.phase==='finished'||state.phase==='lobby')return [];
  const found=new Set();
  return snapshots.flatMap(snapshot=>{
   const p=state.players.find(p=>(p.reserve||[]).some(c=>c.uid===snapshot.uid));
   if(!p||found.has(snapshot.uid)||(p.formation||[]).includes(snapshot.uid)||(p.emanation||[]).includes(snapshot.uid))return [];
   found.add(snapshot.uid);return [{...snapshot,owner:p.id,style:styleFor(p.patron)}];
  });
 }
 function capture(state,previousPhase,clone){
  if(previousPhase!=='resolving')return [];
  const snapshots=[...document.querySelectorAll('#lanes .lane-side .card')].map(node=>({uid:node.dataset.uid,rect:node.getBoundingClientRect(),node}));
  return candidates(state,snapshots).filter(s=>s.rect.width>0&&s.rect.height>0).map(s=>({...s,face:clone(s.node)}));
 }
 function cancel(){active?.();active=null;}
 function play(items,{getTarget,clone,hide=()=>{},release=()=>{},valid=()=>true,sound=()=>{},speed=1,reduced=root.matchMedia?.('(prefers-reduced-motion: reduce)').matches}={}){
  if(!items?.length)return Promise.resolve();cancel();
  return new Promise(resolve=>{
   const layer=document.createElement('div');layer.className='combat-return-layer';layer.setAttribute('aria-hidden','true');document.body.append(layer);
   const canvas=document.createElement('canvas');canvas.className='combat-return-particles';layer.append(canvas);const ctx=canvas.getContext('2d');
   const ratio=Math.min(1.5,root.devicePixelRatio||1);canvas.width=Math.ceil(innerWidth*ratio);canvas.height=Math.ceil(innerHeight*ratio);ctx.setTransform(ratio,0,0,ratio,0,0);
   const counts=new Map(),entries=[];let frame=0,closed=false;
   const reveal=e=>{if(e.released)return;e.released=true;release(e.uid);};
   const end=()=>{if(closed)return;closed=true;cancelAnimationFrame(frame);for(const e of entries){e.model?.destroy();reveal(e);}layer.remove();root.removeEventListener('resize',end);if(active===end)active=null;resolve();};
   active=end;root.addEventListener('resize',end,{once:true});
   for(const item of items){
    const target=getTarget(item.uid);if(!target){release(item.uid);continue;}
    const rect=target.getBoundingClientRect();if(!rect.width||!rect.height){release(item.uid);continue;}
    const spec=styles.get(item.style)||styles.get('gentle'),index=counts.get(item.owner)||0;counts.set(item.owner,index+1);
    const e={...item,spec,index,target,toRect:rect,from:mid(item.rect),to:mid(rect),delay:reduced?index*35:index*spec.stagger,done:false};
    const card=document.createElement('div');card.className='combat-return-card';card.dataset.returnStyle=e.style;card.dataset.returnUid=e.uid;
    Object.assign(card.style,{left:e.from.x+'px',top:e.from.y+'px',width:item.rect.width+'px',height:item.rect.height+'px'});
    const face=(node,className)=>{node.removeAttribute('style');node.classList.remove('selected','pending-arrival','visual-hit','snapping','dragging-source');node.classList.add(className);node.style.visibility='visible';node.setAttribute('tabindex','-1');return node;};
    e.old=face(item.face,'return-old-face');card.append(e.old);layer.append(card);e.card=card;
    // Canvas card art is asynchronous. Copy it after its real render completes.
    Promise.resolve(target.visualReady).then(()=>{if(closed||e.done)return;e.fresh=face(clone(getTarget(e.uid)||target),'return-new-face');e.card.append(e.fresh);}).catch(()=>{});
    hide(e.uid);target.style.visibility='hidden';entries.push(e);
   }
   if(!entries.length){end();return;}
   const start=performance.now();
   const place=(e,p,scaleX,scaleY,angle=0)=>{e.card.style.transform=`translate(-50%,-50%) translate(${p.x-e.from.x}px,${p.y-e.from.y}px) rotate(${angle}deg) scale(${scaleX},${scaleY})`;};
   const morph=(e,t)=>{e.old.style.opacity=1-t;if(e.fresh)e.fresh.style.opacity=t;};
   const emit=(e,key=e.spec.sound)=>{sound(key,{from:e.from,to:e.to,level:.65,travelSeconds:.7});};
   function tick(now){
    if(closed)return;if(!valid()){end();return;}
    ctx.clearRect(0,0,innerWidth,innerHeight);
    for(const e of entries){
     if(e.done)continue;
     const elapsed=(now-start)*speed-e.delay;if(elapsed<0)continue;
     const duration=reduced?320:e.spec.duration,t=clamp(elapsed/duration),sx=e.toRect.width/e.rect.width,sy=e.toRect.height/e.rect.height;
     // Keep the current reserve node hidden across ordinary room re-renders.
     if(!e.target.isConnected){e.target=getTarget(e.uid);if(!e.target){e.done=true;e.card.remove();e.model?.destroy();reveal(e);continue;}e.target.style.visibility='hidden';}
     if(reduced||e.style==='gentle'){
      const v=smooth(t),p={x:mix(e.from.x,e.to.x,v),y:mix(e.from.y,e.to.y,v)};place(e,p,mix(1,sx,v),mix(1,sy,v));morph(e,smooth((t-.45)/.4));
     }else if(e.style==='forge'){
      const impactAt=274,flight=clamp((elapsed-impactAt)/900),v=out(flight),dx=e.to.x-e.from.x,dy=e.to.y-e.from.y,len=Math.hypot(dx,dy)||1;
      if(elapsed<720){
       if(!e.model){e.hammerHost=document.createElement('div');e.hammerHost.className='return-hammer-host';layer.append(e.hammerHost);const contact={x:e.from.x-dx/len*e.rect.width*.22,y:e.from.y-dy/len*e.rect.height*.22};e.hammerHost.style.transformOrigin=contact.x+'px '+contact.y+'px';e.hammerHost.style.transform='scale(.65)';e.model=root.RunaForgeHammer3D?.create(e.hammerHost,{...contact,kind:'arrival',direction:{x:dx,y:dy},side:dy>0?'self':'opponent'});}
       e.model?.draw(elapsed/720);
      }else if(e.model){e.model.destroy();e.model=null;e.hammerHost?.remove();}
      if(elapsed>=impactAt&&!e.sounded){e.sounded=true;emit(e);}
      const arc=Math.sin(flight*Math.PI)*Math.min(70,len*.2),p={x:e.from.x+dx*v-dy/len*arc*.35,y:e.from.y+dy*v-arc*.55};
      place(e,p,mix(1,sx,v),mix(1,sy,v),Math.sin(flight*Math.PI)*(dx>0?7:-7));morph(e,smooth((flight-.5)/.4));
      if(elapsed>=impactAt)forgeParticles(ctx,e,(elapsed-impactAt)/1000);
     }else if(e.style==='ether'){
      if(!e.sounded){e.sounded=true;emit(e);}
      const departure=smooth((t-.12)/.29),arrival=smooth((t-.53)/.32);
      e.old.style.opacity=1-departure;e.old.style.maskImage=`linear-gradient(to top,transparent ${departure*100}%,#000 ${departure*100+18}%)`;
      if(t<.5){place(e,{x:e.from.x,y:e.from.y-departure*9},1,1);if(e.fresh)e.fresh.style.opacity=0;}
      else{place(e,{x:e.to.x,y:e.to.y+(1-arrival)*9},sx,sy);e.old.style.opacity=0;if(e.fresh){e.fresh.style.opacity=arrival;e.fresh.style.maskImage=`linear-gradient(to top,#000 ${arrival*100}%,transparent ${arrival*100+18}%)`;}}
      etherParticles(ctx,e,t,now);
     }else if(e.style==='chain'){
      const reach=out(t/.26),v=smooth((t-.28)/.63),p={x:mix(e.from.x,e.to.x,v),y:mix(e.from.y,e.to.y,v)};
      if(t>=.26&&!e.sounded){e.sounded=true;emit(e);}
      place(e,{x:p.x,y:p.y-7*Math.sin(v*Math.PI)},mix(1,sx,v),mix(1,sy,v),Math.sin(v*Math.PI*2)*3);morph(e,smooth((v-.6)/.35));
      const chainTip=t<.26?{x:mix(e.to.x,e.from.x,reach),y:mix(e.to.y,e.from.y,reach)}:p;
      chain(ctx,e.to,chainTip,t<.26?(1-reach)*32:6*Math.sin(v*Math.PI),1-smooth((t-.88)/.12),now);
     }else styles.get(e.style)?.draw?.({ctx,e,t,place,morph});
     if(t>=1){e.done=true;e.model?.destroy();e.hammerHost?.remove();e.card.remove();reveal(e);}
    }
    if(entries.every(e=>e.done)){end();return;}frame=requestAnimationFrame(tick);
   }
   frame=requestAnimationFrame(tick);
  });
 }
 function forgeParticles(ctx,e,t){
  if(t>1.15)return;const alpha=1-clamp(t/1.15);ctx.save();ctx.globalAlpha=alpha;
  const radius=15+t*100,g=ctx.createRadialGradient(e.from.x,e.from.y,1,e.from.x,e.from.y,radius);g.addColorStop(0,'#ffd28066');g.addColorStop(.5,'#e9782225');g.addColorStop(1,'#e9782200');ctx.fillStyle=g;ctx.fillRect(e.from.x-radius,e.from.y-radius,radius*2,radius*2);
  ctx.strokeStyle='#f7b45d';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(e.from.x,e.from.y,12+t*100,7+t*46,0,0,Math.PI*2);ctx.stroke();
  for(let i=0;i<21;i++){const a=i*2.39996,d=(22+i%5*9)*t*2;ctx.fillStyle=i%3?'#e9a152':'#fff2c0';ctx.beginPath();ctx.arc(e.from.x+Math.cos(a)*d,e.from.y+Math.sin(a)*d+t*t*30,Math.max(.3,2.3-t*2),0,Math.PI*2);ctx.fill();}
  ctx.restore();
 }
 function etherParticles(ctx,e,t,now){
  ctx.save();ctx.globalCompositeOperation='lighter';
  for(const [point,strength,r] of [[e.from,Math.sin(clamp(t/.65)*Math.PI),e.rect.width*.53],[e.to,Math.sin(clamp((t-.38)/.62)*Math.PI),e.toRect.width*.65]]){
   if(strength<=0)continue;ctx.globalAlpha=strength*.75;
   const glow=ctx.createRadialGradient(point.x,point.y,1,point.x,point.y,r*1.5);glow.addColorStop(0,'#88dbf42b');glow.addColorStop(1,'#88dbf400');ctx.fillStyle=glow;ctx.fillRect(point.x-r*1.5,point.y-r*1.5,r*3,r*3);
   ctx.strokeStyle='#a9e6f0';ctx.lineWidth=1.5;
   for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(point.x,point.y+12,r*(.8+i*.13),r*(.22+i*.04),0,now*.0005+i*2,now*.0005+i*2+4.7);ctx.stroke();}
  }
  for(let i=0;i<42;i++){
   const birth=i/42*.24,age=clamp((t-birth)/.7),travel=smooth((age-.15)/.7),swirl=i*2.39996+age*6;
   ctx.globalAlpha=Math.sin(age*Math.PI)*.8;const px=mix(e.from.x,e.to.x,travel)+Math.cos(swirl)*Math.sin(age*Math.PI)*32,py=mix(e.from.y,e.to.y,travel)+Math.sin(swirl)*18-Math.sin(age*Math.PI)*48;
   ctx.fillStyle=i%4?'#88cce9':'#fff2ca';ctx.beginPath();ctx.arc(px,py,1+i%3*.55,0,Math.PI*2);ctx.fill();
  }ctx.restore();
 }
 function chain(ctx,a,b,sag,alpha,now){
  const dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy),angle=Math.atan2(dy,dx),count=Math.ceil(length/10);ctx.save();ctx.globalAlpha=alpha;
  for(let i=0;i<count;i++){
   const t=i/Math.max(1,count),x=a.x+dx*t,y=a.y+dy*t+Math.sin(t*Math.PI)*sag;
   ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.lineWidth=3;ctx.strokeStyle='#0c0c0dcc';ctx.beginPath();ctx.ellipse(3,5,7,i%2?2.5:4.2,0,0,Math.PI*2);ctx.stroke();
   const steel=ctx.createLinearGradient(0,-6,0,5);steel.addColorStop(0,'#e2cfb4');steel.addColorStop(.32,'#94877a');steel.addColorStop(.57,'#3d3d40');steel.addColorStop(1,'#8c7564');ctx.strokeStyle=steel;ctx.beginPath();ctx.ellipse(0,0,7,i%2?2:4,0,0,Math.PI*2);ctx.stroke();ctx.restore();
  }
  ctx.translate(b.x,b.y);ctx.rotate(angle);ctx.shadowColor='#0009';ctx.shadowBlur=4;ctx.shadowOffsetY=4;ctx.strokeStyle='#c4b7a4';ctx.lineWidth=4;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-5,0);ctx.lineTo(5,0);ctx.bezierCurveTo(20,-17,20,17,5,10);ctx.stroke();ctx.fillStyle='#e7d3b0';ctx.beginPath();ctx.moveTo(5,10);ctx.lineTo(10,3);ctx.lineTo(11,13);ctx.fill();ctx.restore();
 }
 root.RunaCombatReturn={capture,candidates,styleFor,play,cancel,
  registerStyle(name,definition){styles.set(name,definition);}};
 root.addEventListener?.('pagehide',cancel);
})(globalThis);
