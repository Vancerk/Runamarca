/* Projected 3D chain links. Slot anchors stay on the board (z=0), while
   card clasps rise above it. All dimensions follow actual DOM rectangles. */
(function(root){
 'use strict';
 const project=(x,y,z)=>({x:x+z*.15,y:y-z*.65});
 function path(ctx,points){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));}
 function metalRing(ctx,x,y,z,angle,rx,ry,twist){
 const ca=Math.cos(angle),sa=Math.sin(angle),ct=Math.cos(twist),st=Math.sin(twist),points=[];
 for(let i=0;i<=28;i++){const a=i/28*Math.PI*2,u=Math.cos(a)*rx,v=Math.sin(a)*ry;points.push(project(x+ca*u-sa*v*ct,y+sa*u+ca*v*ct,z+v*st));}
 ctx.lineJoin='round';ctx.lineCap='round';ctx.save();ctx.translate(0,2.6);path(ctx,points);ctx.strokeStyle='#35130fee';ctx.lineWidth=5.4;ctx.stroke();ctx.restore();path(ctx,points);ctx.strokeStyle='#a73829';ctx.lineWidth=4.8;ctx.stroke();
 const shine=ctx.createLinearGradient(x-rx,y-ry,x+rx,y+ry);shine.addColorStop(0,'#f0b087');shine.addColorStop(.45,'#ca6550');shine.addColorStop(1,'#793225');path(ctx,points);ctx.strokeStyle=shine;ctx.lineWidth=2;ctx.stroke();
 }
 function create(){const n=document.createElement('canvas');n.className='card-effect card-effect-anchor ce-chain-volume';n.__born=performance.now();n.__ctx=n.getContext('2d');return n;}
 function draw(n,card,slot){if(!n.__ctx||!card||!slot)return;const pad=16,w=slot.width+pad*2,h=slot.height+pad*2,dpr=Math.min(1.5,devicePixelRatio||1);Object.assign(n.style,{left:slot.left-pad+'px',top:slot.top-pad+'px',width:w+'px',height:h+'px'});const resized=n.width!==Math.round(w*dpr)||n.height!==Math.round(h*dpr);if(resized){n.width=Math.round(w*dpr);n.height=Math.round(h*dpr);}const still=matchMedia('(prefers-reduced-motion: reduce)').matches,now=performance.now(),t=still?1:Math.min(1,(now-n.__born)/620),geometry=[w,h,card.left-slot.left,card.top-slot.top,card.width,card.height,dpr].map(v=>Math.round(v*10)/10).join(':');if(!resized&&t===1&&n.__geometry===geometry)return;if(!resized&&t<1&&n.__lastPaint&&now-n.__lastPaint<1000/30)return;n.__lastPaint=now;n.__geometry=t===1?geometry:null;n.__paintCount=(n.__paintCount||0)+1;const ctx=n.__ctx;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);const reach=1-Math.pow(1-t,3);
 const left=card.left-slot.left+pad,top=card.top-slot.top+pad,cw=card.width,ch=card.height;
 n.__attachments=[];
 for(let k=0;k<4;k++){const right=k%2,bottom=k>1,sx=pad+(right?slot.width-13:13),sy=pad+(bottom?slot.height-Math.min(34,slot.height*.25):Math.min(34,slot.height*.25)),ex=left+(right?cw-4:4),ey=top+(bottom?ch-4:4),cardHeight=24,dx=(ex-cardHeight*.15-sx)*reach,dy=(ey+cardHeight*.65-sy)*reach,len=Math.hypot(dx,dy),angle=Math.atan2(dy,dx),count=Math.max(3,Math.ceil(len/11)),lift=Math.min(28,Math.max(16,len*.2));
 n.__attachments.push({slot:{x:sx+slot.left-pad,y:sy+slot.top-pad},card:{x:ex+slot.left-pad,y:ey+slot.top-pad}});
 // A separate soft shadow lies on the board under each raised strand.
 ctx.save();ctx.strokeStyle='#09060530';ctx.lineWidth=12;ctx.beginPath();ctx.moveTo(sx+3,sy+4);ctx.quadraticCurveTo(sx+dx*.55+6,sy+dy*.55+10,sx+dx+4,sy+dy+8);ctx.stroke();ctx.strokeStyle='#09060555';ctx.lineWidth=7;ctx.stroke();ctx.restore();
 ctx.save();ctx.translate(sx,sy);ctx.rotate(angle);ctx.fillStyle='#491b15';ctx.strokeStyle='#cf8060';ctx.lineWidth=1.3;ctx.beginPath();ctx.roundRect(-7,-7,14,14,3);ctx.fill();ctx.stroke();ctx.fillStyle='#e0a180';ctx.beginPath();ctx.arc(0,0,2,0,Math.PI*2);ctx.fill();ctx.restore();
 const links=[];for(let i=0;i<=count;i++){const q=i/count,wiggle=still?0:Math.sin(now*.0018+k+i*.24)*Math.sin(Math.PI*q)*1.2;links.push({x:sx+dx*q-Math.sin(angle)*wiggle,y:sy+dy*q+Math.cos(angle)*wiggle,z:(Math.sin(Math.PI*q)*lift+q*cardHeight)*reach,twist:i%2?1.08:.12});}links.sort((a,b)=>a.z-b.z);for(const link of links)metalRing(ctx,link.x,link.y,link.z,angle,7,4.7,link.twist);
 const end=project(sx+dx,sy+dy,cardHeight*reach);ctx.save();ctx.translate(end.x,end.y);ctx.rotate(angle);ctx.shadowColor='#100500';ctx.shadowBlur=3;ctx.shadowOffsetY=3;ctx.fillStyle='#aa4432';ctx.strokeStyle='#edb88e';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-3,-8);ctx.lineTo(7,-8);ctx.lineTo(9,-3);ctx.lineTo(6,0);ctx.lineTo(9,3);ctx.lineTo(7,8);ctx.lineTo(-3,8);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
 }
 }
 root.RunaAnchorChains={create,draw};
})(globalThis);
