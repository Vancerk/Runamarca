/* Geometry only. Shared by the contextual guide and deterministic tests. */
(()=>{
 const clamp=(n,a,b)=>Math.max(a,Math.min(Math.max(a,b),n));
 const area=r=>Math.max(0,r.width)*Math.max(0,r.height);
 const intersection=(a,b)=>({x:Math.max(a.x,b.x),y:Math.max(a.y,b.y),width:Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x)),height:Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y))});
 function union(rects){const valid=rects.filter(r=>r&&[r.x,r.y,r.width,r.height].every(Number.isFinite)&&r.width>0&&r.height>0);if(!valid.length)return null;const x=Math.min(...valid.map(r=>r.x)),y=Math.min(...valid.map(r=>r.y));return {x,y,width:Math.max(...valid.map(r=>r.x+r.width))-x,height:Math.max(...valid.map(r=>r.y+r.height))-y};}
 function place(target,panel,view,avoid=[]){
  const pad=12,gap=20,w=Math.min(panel.width,view.width-2*pad),h=Math.min(panel.height,view.height-2*pad);
  const safe=(x,y)=>({x:clamp(x,view.x+pad,view.x+view.width-w-pad),y:clamp(y,view.y+pad,view.y+view.height-h-pad),width:w,height:h});
  const cx=target?target.x+target.width/2:view.x+view.width/2,cy=target?target.y+target.height/2:view.y+view.height/2;
  const options=target?[
   safe(target.x+target.width+gap,cy-h/2),safe(target.x-gap-w,cy-h/2),safe(cx-w/2,target.y-gap-h),safe(cx-w/2,target.y+target.height+gap)
  ]:[safe(view.x+pad,view.y+view.height-h-pad),safe(view.x+view.width-w-pad,view.y+pad),safe(view.x+pad,view.y+pad),safe(view.x+view.width-w-pad,view.y+view.height-h-pad)];
  const cost=r=>(target?area(intersection(r,target))*1000:0)+avoid.reduce((s,a)=>s+area(intersection(r,a))*5,0)+(target?Math.hypot(r.x+w/2-cx,r.y+h/2-cy):0);
  return options.map((r,i)=>({...r,score:cost(r),order:i})).sort((a,b)=>a.score-b.score||a.order-b.order)[0];
 }
 function camera(target,view,panel,{maxScale}={}){
  const pad=28,max=Number.isFinite(maxScale)?Math.min(2.2,Math.max(.5,maxScale)):view.width<700?1.18:1.38;
  let slot={x:view.x+pad,y:view.y+pad,width:view.width-pad*2,height:view.height-pad*2};
  let scale=Math.min(max,slot.width/target.width,slot.height/target.height);
  const original={x:target.x+(target.width-target.width*scale)/2,y:target.y+(target.height-target.height*scale)/2,width:target.width*scale,height:target.height*scale};
  let dest={...original,x:clamp(original.x,slot.x,slot.x+slot.width-original.width),y:clamp(original.y,slot.y,slot.y+slot.height-original.height)};
  let bubble=place(dest,panel,view);
  // Narrow screens and large groups get a dedicated, unobscured area above
  // the explanation. All legal houses/cards remain in the same group.
  if(view.width>=700&&view.height<520){
   slot={x:view.x+pad,y:view.y+pad,width:Math.max(24,view.width-panel.width-pad*2-24),height:view.height-pad*2};
   scale=Math.min(max,slot.width/target.width,slot.height/target.height);
   dest={x:slot.x+(slot.width-target.width*scale)/2,y:slot.y+(slot.height-target.height*scale)/2,width:target.width*scale,height:target.height*scale};
  }else if(view.width<700||area(intersection(bubble,dest))>0){
   slot={x:view.x+pad,y:view.y+pad,width:view.width-pad*2,height:Math.max(24,view.height-panel.height-pad*2-24)};
   scale=Math.min(max,slot.width/target.width,slot.height/target.height);
   dest={x:slot.x+(slot.width-target.width*scale)/2,y:slot.y+(slot.height-target.height*scale)/2,width:target.width*scale,height:target.height*scale};
  }
  return {scale,destination:dest};
 }
 globalThis.RunaTutorialFocusLayout=Object.freeze({union,intersection,place,camera});
})();
