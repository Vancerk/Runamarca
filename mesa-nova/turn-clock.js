/* One continuous canvas follows the server deadline, never the room render count. */
(function(root){
 let canvas,ctx,badge,raf=0,current=null,currentRoom='',point=null,lastSecond=-1,fuseKey=null,fuseSource=null,explosions=[],fired=new Set();
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 const audio=kind=>{if(typeof audioContext!=='undefined'&&audioContext?.state==='running')root.RunaTableAudio?.effect(audioContext,kind,{to:point});};
 function stopFuse(){if(fuseSource)root.RunaSfx?.release(fuseSource,.25);fuseSource=null;fuseKey=null;}
 function burn(key,remaining,start,end,y){if(fuseKey===key||remaining<=0||typeof audioContext==='undefined'||audioContext?.state!=='running')return;const progress=1-remaining/10;const handled=root.RunaSfx?.play(audioContext,'fuse',{offset:10-remaining,duration:remaining,from:{x:start+(end-start)*progress,y},to:{x:end,y},travelSeconds:remaining,track:s=>fuseSource=s});if(handled)fuseKey=key;}
 function mount(){if(canvas)return;canvas=document.createElement('canvas');canvas.className='turn-fuse';canvas.setAttribute('aria-hidden','true');document.body.append(canvas);ctx=canvas.getContext('2d');badge=document.createElement('div');badge.className='turn-clock-badge';badge.setAttribute('role','timer');document.body.append(badge);}
 function burst(key){if(fired.has(key)||!point)return;fired.add(key);if(fired.size>100)fired.delete(fired.values().next().value);
  explosions.push({x:point.x,y:point.y,at:performance.now()});audio('timeout');
  const button=document.querySelector('#phase-actions button.primary')||document.querySelector('#phase-actions button:last-child');button?.classList.add('fuse-impact');setTimeout(()=>button?.classList.remove('fuse-impact'),700);
 }
 function frame(time){raf=0;mount();const scale=Math.min(2,devicePixelRatio||1),w=innerWidth,h=innerHeight;
  if(canvas.width!==Math.round(w*scale)||canvas.height!==Math.round(h*scale)){canvas.width=Math.round(w*scale);canvas.height=Math.round(h*scale);}ctx.setTransform(scale,0,0,scale,0,0);ctx.clearRect(0,0,w,h);
  const s=typeof state!=='undefined'?state:null,clock=s?.turnClock;
  if(s?.code!==currentRoom){currentRoom=s?.code;current=null;explosions=[];}
  const visible=!!clock&&clock.phase!=='mulligan'&&clock.phase===s.phase&&!document.getElementById('game')?.hidden;
  const serverNow=Date.now()-(typeof serverClockOffset==='undefined'?0:serverClockOffset);
  if(current&&(!visible||current.key!==clock.key)&&serverNow>=current.endsAt-150)burst(current.key);
  if(visible){
   if(current?.key!==clock.key){lastSecond=-1;stopFuse();}current=clock;
   const remaining=Math.max(0,(clock.endsAt-serverNow)/1000),box=document.getElementById('phase-actions'),button=box?.querySelector('button:last-child'),board=document.querySelector('#game .board'),lanes=document.getElementById('lanes');
   if(button&&board&&lanes){const r=button.getBoundingClientRect(),l=lanes.getBoundingClientRect(),b=board.getBoundingClientRect(),panel=document.getElementById('center-actions'),middle=b.top+b.height/2,previous=Number.parseFloat(panel?.style.getPropertyValue('--turn-control-offset'))||0,offset=middle-(r.top+r.height/2-previous);if(panel&&Math.abs(offset-previous)>.1)panel.style.setProperty('--turn-control-offset',offset+'px');point={x:r.left+3,y:middle};
    badge.hidden=false;badge.textContent=Math.ceil(remaining)+'s';badge.style.left=(r.left+r.width/2)+'px';badge.style.top=(r.bottom+17)+'px';badge.classList.toggle('urgent',remaining<=10);badge.title=clock.phase==='formation'?'Tempo para confirmar o combate':'Tempo de preparação';
    if(remaining<=10){const start=Math.min(l.left+10,point.x-55),end=point.x,progress=Math.min(1,Math.max(0,1-remaining/10)),front=start+(end-start)*progress;
     const path=(a,z)=>{ctx.beginPath();ctx.moveTo(a,point.y);ctx.lineTo(z,point.y);ctx.stroke();};
     ctx.lineCap='round';ctx.lineWidth=8.75;ctx.strokeStyle='#261611';path(front,end);ctx.lineWidth=5.625;ctx.strokeStyle='#967043';path(front,end);ctx.lineWidth=2.125;ctx.strokeStyle='#c6a271';ctx.setLineDash([3,4]);path(front,end);ctx.setLineDash([]);ctx.lineWidth=2.5;ctx.strokeStyle='#38211a';path(start,front);
     const fy=point.y,glow=ctx.createRadialGradient(front,fy,0,front,fy,23);glow.addColorStop(0,'#fff0aa');glow.addColorStop(.2,'#ffc35b');glow.addColorStop(.5,'#ee6a1a88');glow.addColorStop(1,'#ee6a1a00');ctx.fillStyle=glow;ctx.fillRect(front-23,fy-23,46,46);
     for(let i=0;i<(reduced()?3:15);i++){const age=(time*.0018+i*.173)%1,angle=i*2.399,x=front+Math.cos(angle)*age*24,y=fy-Math.sin(age*Math.PI)*28+Math.sin(angle)*age*9;ctx.globalAlpha=1-age;ctx.fillStyle=i%3?'#ffc36a':'#fff2b3';ctx.fillRect(x,y,1.3+2*(1-age),1.3+2*(1-age));}ctx.globalAlpha=1;
     burn(clock.key,remaining,start,end,point.y);if(!remaining)burst(clock.key);
    }
   }else badge.hidden=true;
  }else{stopFuse();current=null;badge.hidden=true;lastSecond=-1;document.getElementById('center-actions')?.style.removeProperty('--turn-control-offset');}
  explosions=explosions.filter(e=>time-e.at<850);for(const e of explosions){const t=(time-e.at)/850;
   const g=ctx.createRadialGradient(e.x,e.y,0,e.x,e.y,20+65*t);g.addColorStop(0,`rgba(255,221,135,${(1-t)*.8})`);g.addColorStop(.3,`rgba(242,105,27,${(1-t)*.5})`);g.addColorStop(1,'rgba(80,42,25,0)');ctx.fillStyle=g;ctx.fillRect(e.x-90,e.y-90,180,180);
   ctx.lineWidth=2;ctx.strokeStyle=`rgba(255,170,62,${1-t})`;ctx.beginPath();ctx.arc(e.x,e.y,8+t*65,0,Math.PI*2);ctx.stroke();
   if(!reduced())for(let i=0;i<28;i++){const a=i*2.399,dist=t*(30+(i%5)*12);ctx.globalAlpha=1-t;ctx.fillStyle=i%3?'#d9873b':'#ffdc83';ctx.fillRect(e.x+Math.cos(a)*dist,e.y+Math.sin(a)*dist+25*t*t,2,3);}ctx.globalAlpha=1;
  }
  // The rope belongs to the table: erase it beneath every visible card, including
  // floating/dragged copies whose stacking context differs from the board's.
  if(visible||explosions.length){
   ctx.save();ctx.globalCompositeOperation='destination-out';ctx.fillStyle='#000';ctx.beginPath();
   for(const node of document.querySelectorAll('.card,.patron-card,.card-flight,.drag-preview,.used-spell,.combat-return-card,.grimoire-floating-card')){
    const r=node.getBoundingClientRect();if(!r.width||!r.height||getComputedStyle(node).visibility==='hidden'||node.closest('[hidden]'))continue;
    ctx.roundRect(r.left-2,r.top-2,r.width+4,r.height+4,Math.min(7,r.width*.06));
   }
   ctx.fill();ctx.restore();raf=requestAnimationFrame(frame);
  }
 }
 function sync(){const s=typeof state==='undefined'?null:state;if(!s||['lobby','finished'].includes(s.phase)){root.RunaTurnClock.clear();return;}if(!raf)raf=requestAnimationFrame(frame);}
 root.RunaTurnClock={sync,burst,clear(){stopFuse();document.getElementById('center-actions')?.style.removeProperty('--turn-control-offset');current=null;explosions=[];if(raf)cancelAnimationFrame(raf);raf=0;if(canvas)ctx.clearRect(0,0,canvas.width,canvas.height);if(badge)badge.hidden=true;}};
 setInterval(sync,250);document.addEventListener('visibilitychange',sync);
})(globalThis);
