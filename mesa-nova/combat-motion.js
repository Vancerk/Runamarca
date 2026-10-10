(function(root){
 // Stop at the first rectangle edge contact along the centre-to-centre line.
 function contact(a,b,shared=true){
  const dx=b.left+b.width/2-a.left-a.width/2,dy=b.top+b.height/2-a.top-a.height/2,length=Math.hypot(dx,dy);
  if(!length)return {dx:0,dy:0};const ux=dx/length,uy=dy/length;
  const touch=Math.min(Math.abs(ux)>1e-6?(a.width+b.width)/2/Math.abs(ux):Infinity,Math.abs(uy)>1e-6?(a.height+b.height)/2/Math.abs(uy):Infinity);
  const travel=Math.max(0,length-touch-2)/(shared?2:1);return {dx:ux*travel,dy:uy*travel};
 }
 function strikeFrames(dx,dy,{directionX=dx,directionY=dy,weight=0}={}){
  const length=Math.hypot(dx,dy),direction=Math.hypot(directionX,directionY)||1,ux=directionX/direction,uy=directionY/direction,force=Math.max(0,Math.min(1,weight)),pull=26+force*14,recoil=Math.min(length,18+force*12),frame=(x,y,offset,easing)=>({transform:`translate(${x}px,${y}px)`,offset,...(easing?{easing}:{})});
  return [frame(0,0,0,'cubic-bezier(.2,.5,.35,1)'),frame(-ux*pull,-uy*pull,.19,'cubic-bezier(.7,0,1,.45)'),frame(dx,dy,.42),frame(dx,dy,.445,'cubic-bezier(.1,.65,.2,1)'),frame(dx-ux*recoil,dy-uy*recoil,.56,'cubic-bezier(.2,.5,.35,1)'),frame(0,0,1)];
 }
 function link(a,b){const ax=a.left+a.width/2,ay=a.top+a.height/2,bx=b.left+b.width/2,by=b.top+b.height/2,dx=bx-ax,dy=by-ay;if(Math.hypot(dx,dy)<1)return {start:{x:ax+a.width/2,y:ay},control:{x:ax+a.width/2+48,y:ay-70},end:{x:ax,y:ay-a.height/2}};const edge=(r,x,y)=>{const f=Math.min(Math.abs(x)>1e-6?r.width/2/Math.abs(x):Infinity,Math.abs(y)>1e-6?r.height/2/Math.abs(y):Infinity);return {x:x*f,y:y*f};},aEdge=edge(a,dx,dy),bEdge=edge(b,-dx,-dy);const start={x:ax+aEdge.x,y:ay+aEdge.y},end={x:bx+bEdge.x,y:by+bEdge.y};return {start,end,control:{x:(start.x+end.x)/2,y:(start.y+end.y)/2}};}
 function emanationFit(pointer,card,slots){
  if(!card.width||!card.height)return 1;
  let scale=1;
  for(const slot of slots){
   const distance=Math.hypot(Math.max(slot.left-pointer.x,0,pointer.x-slot.right),Math.max(slot.top-pointer.y,0,pointer.y-slot.bottom));
   const near=Math.max(0,1-distance/90),blend=near*near*(3-2*near),fit=Math.min(1,slot.width/card.width,slot.height/card.height);
   scale=Math.min(scale,1-(1-fit)*blend);
  }
  return scale;
 }
 root.RunaMotion={contact,strikeFrames,link,emanationFit};
})(globalThis);
