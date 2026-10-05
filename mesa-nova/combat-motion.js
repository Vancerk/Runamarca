(function(root){
 // Stop at the first rectangle edge contact along the centre-to-centre line.
 function contact(a,b,shared=true){
  const dx=b.left+b.width/2-a.left-a.width/2,dy=b.top+b.height/2-a.top-a.height/2,length=Math.hypot(dx,dy);
  if(!length)return {dx:0,dy:0};const ux=dx/length,uy=dy/length;
  const touch=Math.min(Math.abs(ux)>1e-6?(a.width+b.width)/2/Math.abs(ux):Infinity,Math.abs(uy)>1e-6?(a.height+b.height)/2/Math.abs(uy):Infinity);
  const travel=Math.max(0,length-touch-2)/(shared?2:1);return {dx:ux*travel,dy:uy*travel};
 }
 function strikeFrames(dx,dy){return [{transform:'translate(0px,0px)',offset:0,easing:'cubic-bezier(.55,0,.85,.65)'},{transform:'translate('+dx+'px,'+dy+'px)',offset:.42},{transform:'translate('+dx+'px,'+dy+'px)',offset:.47,easing:'cubic-bezier(.2,.5,.35,1)'},{transform:'translate('+(-dx*.16)+'px,'+(-dy*.16)+'px)',offset:.68,easing:'cubic-bezier(.2,.5,.35,1)'},{transform:'translate(0px,0px)',offset:1}];}
 function link(a,b){const ax=a.left+a.width/2,ay=a.top+a.height/2,bx=b.left+b.width/2,by=b.top+b.height/2,dx=bx-ax,dy=by-ay;if(Math.hypot(dx,dy)<1)return {start:{x:ax+a.width/2,y:ay},control:{x:ax+a.width/2+48,y:ay-70},end:{x:ax,y:ay-a.height/2}};const edge=(r,x,y)=>{const f=Math.min(Math.abs(x)>1e-6?r.width/2/Math.abs(x):Infinity,Math.abs(y)>1e-6?r.height/2/Math.abs(y):Infinity);return {x:x*f,y:y*f};},aEdge=edge(a,dx,dy),bEdge=edge(b,-dx,-dy);const start={x:ax+aEdge.x,y:ay+aEdge.y},end={x:bx+bEdge.x,y:by+bEdge.y};return {start,end,control:{x:(start.x+end.x)/2,y:(start.y+end.y)/2}};}
 root.RunaMotion={contact,strikeFrames,link};
})(globalThis);
