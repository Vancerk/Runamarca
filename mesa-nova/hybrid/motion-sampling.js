// Motion copies keep the full master, but display a filtered level close to their
// projected size. Reading WAAPI timing avoids a layout/style query on every frame.
// Moving faces use cached GPU reductions; the more costly stationary-face filter
// is intentionally not queued here. No sample is ever enlarged.
const sources=new WeakMap(),STEP=1.5,metrics={active:0,updates:0,paints:0,maxMs:0,totalMs:0};
const snapshot=canvas=>{const c=document.createElement('canvas');c.width=canvas.width;c.height=canvas.height;c.getContext('2d').drawImage(canvas,0,0);return c;};
function sourceFor(canvas){
 let source=sources.get(canvas);if(source)return source;
 const owner=canvas.closest('.card');
 source={master:null,levels:new Map(),last:null};sources.set(canvas,source);
 Promise.resolve(owner?.visualReady).then(()=>{if(canvas.isConnected&&canvas.width&&canvas.height)source.master=snapshot(canvas);});
 return source;
}
function level(source,ratio){
 const m=source.master,k=Math.max(0,Math.floor(Math.log(1/Math.min(1,ratio))/Math.log(STEP))),factor=STEP**k;
 const w=Math.ceil(m.width/factor),h=Math.ceil(m.height/factor),key=w+'x'+h;
 if(source.levels.has(key))return source.levels.get(key);
 const c=document.createElement('canvas');c.width=w;c.height=h;const ink=c.getContext('2d');ink.imageSmoothingEnabled=true;ink.imageSmoothingQuality='high';ink.drawImage(m,0,0,w,h);source.levels.set(key,c);
 return c;
}
function sizes(frames,w,h){
 return frames.map((frame,i)=>{
  const m=new DOMMatrix(frame.transform||'none'),points=[[0,0],[w,0],[w,h],[0,h]].map(([x,y])=>{const p=m.transformPoint(new DOMPoint(x,y));return {x:p.x/p.w,y:p.y/p.w};});
  return {offset:frame.offset??i/(frames.length-1),points};
 });
}
export function trackMotionSampling(node,animation,frames){
 if(!Array.isArray(frames)||frames.length<2||!frames.every(f=>f.transform))return ()=>{};
 const w=parseFloat(node.style.width),h=parseFloat(node.style.height);if(!(w>0&&h>0))return ()=>{};
 const path=sizes(frames,w,h),canvases=new Set();let raf=0,done=false;
 const scan=()=>{for(const c of node.querySelectorAll('canvas.card-art-canvas,canvas.health-liquid')){canvases.add(c);sourceFor(c);}};
 const observer=new MutationObserver(scan);observer.observe(node,{childList:true,subtree:true});scan();metrics.active++;
 function stop(){if(done)return;done=true;cancelAnimationFrame(raf);observer.disconnect();canvases.clear();metrics.active--;}
 function tick(){
  if(done||!node.isConnected||animation.playState==='idle'||animation.playState==='finished'){stop();return;}
  const start=performance.now(),progress=animation.effect.getComputedTiming().progress;
  if(progress!==null){
   let i=0;while(i<path.length-2&&progress>path[i+1].offset)i++;
   const a=path[i],b=path[i+1],t=Math.max(0,Math.min(1,(progress-a.offset)/(b.offset-a.offset||1))),q=a.points.map((p,j)=>({x:p.x+(b.points[j].x-p.x)*t,y:p.y+(b.points[j].y-p.y)*t}));
   const edge=(i,j)=>Math.hypot(q[i].x-q[j].x,q[i].y-q[j].y),pw=Math.max(edge(0,1),edge(3,2))*devicePixelRatio,ph=Math.max(edge(0,3),edge(1,2))*devicePixelRatio;
   for(const c of canvases){
    if(!c.isConnected){canvases.delete(c);continue;}const source=sources.get(c),m=source?.master;if(!m)continue;
    const sample=level(source,Math.max(pw/m.width,ph/m.height));if(source.last===sample)continue;
    // Publish after painting; intrinsic dimensions never change the CSS face box.
    c.width=sample.width;c.height=sample.height;c.getContext('2d').drawImage(sample,0,0);source.last=sample;metrics.paints++;
   }
  }
  const ms=performance.now()-start;metrics.updates++;metrics.totalMs+=ms;metrics.maxMs=Math.max(metrics.maxMs,ms);raf=requestAnimationFrame(tick);
 }
 raf=requestAnimationFrame(tick);animation.finished.catch(()=>{}).finally(stop);return stop;
}
window.RunaMotionSampling={get stats(){return {...metrics};}};
