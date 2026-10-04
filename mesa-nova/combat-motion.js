(function(root){
 // Stop at the first rectangle edge contact along the centre-to-centre line.
 function contact(a,b,shared=true){
  const dx=b.left+b.width/2-a.left-a.width/2,dy=b.top+b.height/2-a.top-a.height/2,length=Math.hypot(dx,dy);
  if(!length)return {dx:0,dy:0};const ux=dx/length,uy=dy/length;
  const touch=Math.min(Math.abs(ux)>1e-6?(a.width+b.width)/2/Math.abs(ux):Infinity,Math.abs(uy)>1e-6?(a.height+b.height)/2/Math.abs(uy):Infinity);
  const travel=Math.max(0,length-touch-2)/(shared?2:1);return {dx:ux*travel,dy:uy*travel};
 }
 root.RunaMotion={contact};
})(globalThis);
