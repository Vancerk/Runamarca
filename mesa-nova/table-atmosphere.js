/* Persistent presentation layer: room renders never restart the fog's clock. */
(function(root){
 'use strict';
 const clamp=t=>Math.max(0,Math.min(1,t));
 let canvas=null,ink=null,raf=0,session='',phase='',fields=[],reveal=null;
 // Reuse soft brushes instead of rebuilding dozens of gradients on every frame.
 const brushes=new Map();
 function ensure(){if(canvas?.isConnected)return;canvas=document.createElement('canvas');canvas.className='formation-fog-canvas';canvas.setAttribute('aria-hidden','true');document.body.append(canvas);ink=canvas.getContext('2d');}
 function stop(){cancelAnimationFrame(raf);raf=0;canvas?.remove();canvas=null;ink=null;fields=[];reveal=null;}
 function sync(options){
  const key=options?.session||'';
  if(!key||!['formation','resolving'].includes(options.phase)){stop();session=key;phase=options?.phase||'';return;}
  if(session!==key){stop();session=key;}
  const sides=[...document.querySelectorAll('#lanes .lane-side')],byKey=new Map(sides.map(n=>[n.dataset.owner+':'+n.dataset.lane,n]));
  if(options.phase==='formation'){
   reveal=null;fields=sides.filter(n=>n.classList.contains('fogged-space')).map(n=>({key:n.dataset.owner+':'+n.dataset.lane,node:n,seed:Number(n.dataset.lane)*1.73+(n.dataset.owner===options.selfId?2.1:0)}));
  }else{
   const battle=options.battle,first=battle?.timeline?.[0];
   if(!battle||first?.kind!=='reveal'||Date.now()-options.clockOffset-battle.startedAt>=first.duration){stop();phase=options.phase;return;}
   if(reveal?.id!==battle.id){
    if(!fields.length)fields=sides.filter(n=>options.spectator||n.dataset.owner!==options.selfId).map(n=>({key:n.dataset.owner+':'+n.dataset.lane,node:n,seed:Number(n.dataset.lane)*1.73}));
    const start=battle.startedAt+options.clockOffset;
    reveal={id:battle.id,start,frameStart:performance.now()-(Date.now()-start),duration:first.duration};
   }
   fields=fields.map(f=>({...f,node:byKey.get(f.key)})).filter(f=>f.node);
  }
  phase=options.phase;if(!fields.length){stop();return;}ensure();if(!raf)raf=requestAnimationFrame(tick);
 }
 function brush(color){
  if(brushes.has(color))return brushes.get(color);
  const sprite=document.createElement('canvas');sprite.width=sprite.height=192;const ctx=sprite.getContext('2d'),g=ctx.createRadialGradient(96,96,0,96,96,96);
  g.addColorStop(0,'rgba('+color+',1)');g.addColorStop(.34,'rgba('+color+',.78)');g.addColorStop(.68,'rgba('+color+',.24)');g.addColorStop(1,'rgba('+color+',0)');ctx.fillStyle=g;ctx.fillRect(0,0,192,192);brushes.set(color,sprite);return sprite;
 }
 function cloud(ctx,x,y,rx,ry,alpha,color,angle=0){ctx.save();ctx.globalAlpha*=alpha;ctx.translate(x,y);if(angle)ctx.rotate(angle);ctx.drawImage(brush(color),-rx,-ry,rx*2,ry*2);ctx.restore();}
 function fog(rect,seed,time){
  const w=rect.width,h=rect.height,cx=rect.left+w/2,cy=rect.top+h/2;
  // Paint directly in viewport space: the slot is an anchor, never a clipping box.
  for(let i=0;i<8;i++){
   const t=time*.38+seed+i*2.39996,x=rect.left+w*(.18+i*.09)+Math.sin(t)*9,y=cy+Math.sin(t*.83)*h*.14;
   cloud(ink,x,y,w*(.24+Math.sin(t*.67)*.025),h*(.55+Math.cos(t)*.10),.57,i%3?'177,189,198':'141,159,175',Math.sin(t)*.08);
  }
  for(let i=0;i<10;i++){
   const t=time*(.28+i%3*.055)+seed+i*2.39996;
   const x=cx+Math.sin(i*2.39996+t*.32)*w*.33,y=cy+Math.cos(i*1.71+t)*h*.29;
   cloud(ink,x,y,w*(.13+i%3*.025),h*(.31+i%3*.065),.45+i%3*.07,i%2?'219,222,219':'155,175,187',Math.sin(t)*.18);
  }
  // Tapered curls wander past the top, bottom and lateral edges independently.
  for(let i=0;i<3;i++){
   const t=time*.44+seed+i*2.3,top=i===0,side=i===2;
   const x=side?rect.right-8:rect.left+w*(.24+i*.30)+Math.sin(t)*w*.08;
   const y=side?cy:top?rect.top+6:rect.bottom-6,dir=top?-1:1;
   for(let j=0;j<12;j++){
    const u=j/11,angle=u*4.5+t*.24,r=11+u*17;
    const px=x+Math.sin(angle)*r*(side ? .65 : 1),py=y+dir*Math.cos(angle)*r;
    cloud(ink,px,py,15-u*10,9-u*5,(1-u)*.25,'203,214,217',angle*.25);
   }
  }
 }
 function torch(rows,cut,time,progress,reduced){
  if(reduced||progress<=0||progress>=1)return;
  for(const r of rows){
   const y=(r.top+r.bottom)/2,height=r.bottom-r.top;
   cloud(ink,cut,y,63,height*.82,.38,'255,177,55');cloud(ink,cut,y,20,height*.61,.42,'255,231,139');
   ink.save();ink.globalCompositeOperation='lighter';
   for(let i=0;i<5;i++){
    const sway=Math.sin(time*15+i*1.7),base=y+height*(.28-i*.12),tip=base-19-(i%3)*9;
    const g=ink.createLinearGradient(cut,tip,cut,base+7);g.addColorStop(0,'#fff8c8');g.addColorStop(.4,'#ffd47b');g.addColorStop(1,'#d9691a00');ink.fillStyle=g;
    ink.beginPath();ink.moveTo(cut-6,base+6);ink.bezierCurveTo(cut-12+sway*3,base-8,cut+6,tip+6,cut+sway*6,tip);ink.bezierCurveTo(cut+13,base-6,cut+9,base+5,cut-6,base+6);ink.fill();
   }
   for(let i=0;i<14;i++){const age=(time*1.6+i*.173)%1;ink.globalAlpha=(1-age)*.7;ink.fillStyle=i%3?'#ffd073':'#fff4bf';ink.beginPath();ink.arc(cut-9-age*33+Math.sin(i*3.7)*10,y+Math.cos(i*2.4)*height*.4-age*27,1.2-age*.6,0,Math.PI*2);ink.fill();}
   ink.restore();
  }
 }
 function tick(now){
  raf=0;if(!canvas?.isConnected||!ink)return;
  const ratio=Math.min(1.5,root.devicePixelRatio||1),width=Math.ceil(innerWidth*ratio),height=Math.ceil(innerHeight*ratio);
  if(canvas.width!==width)canvas.width=width;if(canvas.height!==height)canvas.height=height;ink.setTransform(ratio,0,0,ratio,0,0);ink.clearRect(0,0,innerWidth,innerHeight);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,time=reduced?3:now/1000;
  const rects=fields.filter(f=>f.node?.isConnected).map(f=>({...f,rect:f.node.getBoundingClientRect()}));
  if(!rects.length){stop();return;}
  const progress=reveal?clamp((now-reveal.frameStart)/reveal.duration):0;
  if(reveal&&progress>=1){stop();return;}
  const left=Math.min(...rects.map(f=>f.rect.left))-64,right=Math.max(...rects.map(f=>f.rect.right))+64,cut=reveal?left+(right-left)*progress:null;
  for(const f of rects)fog(f.rect,f.seed,time);
  if(reveal){
   const g=ink.createLinearGradient(cut-21,0,cut+23,0);g.addColorStop(0,'transparent');g.addColorStop(1,'#fff');ink.globalCompositeOperation='destination-in';ink.fillStyle=g;ink.fillRect(0,0,innerWidth,innerHeight);ink.globalCompositeOperation='source-over';
  }
  if(reveal){
   const grouped=new Map();for(const f of rects){const owner=f.node.dataset.owner,r=grouped.get(owner)||{top:Infinity,bottom:-Infinity};r.top=Math.min(r.top,f.rect.top);r.bottom=Math.max(r.bottom,f.rect.bottom);grouped.set(owner,r);}
   torch([...grouped.values()],cut,time,progress,reduced);
  }
  canvas.dataset.phase=phase;canvas.dataset.progress=String(progress);raf=requestAnimationFrame(tick);
 }
 root.RunaTableAtmosphere={sync,clear:stop};
 root.RunaDragShadow={create(layer){
  const node=document.createElement('div');node.className='drag-ground-shadow';node.setAttribute('aria-hidden','true');layer.append(node);
  return {update(x,y,width,height,fit=1){
   const r=document.querySelector('#game>.table')?.getBoundingClientRect();node.hidden=!r||x<r.left||x>r.right||y<r.top||y>r.bottom;
   node.style.left=(x+(24+width*.11)*fit)+'px';node.style.top=(y+(32+height*.10)*fit)+'px';node.style.width=(width*fit*1.02)+'px';node.style.height=(height*fit)+'px';
   node.style.filter='blur('+(3+fit*2)+'px)';node.style.opacity=String(.62+fit*.10);
  },destroy(){node.remove();}};
 }};
 root.addEventListener('pagehide',stop);
})(globalThis);
