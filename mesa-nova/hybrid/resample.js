// Claude review (05/11/2026): destination-sized reduction of card faces.
// The browser's own reductions (drawImage / createImageBitmap at every quality) all used the
// same soft mip-map path: measured against a Lanczos reduction of the same 900-px master they
// kept ~85% of the edge energy, so the illustration of a reserve card looked washed out.
// This is a separable Lanczos-3 filter in premultiplied alpha (no dark fringes on the rounded,
// transparent corners). The browser first halves the master while it stays >= 2x the target
// (cheap, GPU), and the last, quality-defining step is the Lanczos one, so the cost stays at a
// few milliseconds per face. Results are cached per face design and size; callers paint the
// returned canvas 1:1 (no further scaling).
const A=3,cache=new Map(),MAX=160;
const sinc=x=>x===0?1:Math.sin(Math.PI*x)/(Math.PI*x);
const kernel=x=>x<=-A||x>=A?0:sinc(x)*sinc(x/A);
// Precomputed taps for one axis: for every output index, the first source index and its weights.
function taps(src,dst){
 const scale=src/dst,support=A*Math.max(1,scale),out=[];
 for(let i=0;i<dst;i++){
  const center=(i+.5)*scale,first=Math.max(0,Math.floor(center-support)),last=Math.min(src-1,Math.ceil(center+support)),w=[];let sum=0;
  for(let j=first;j<=last;j++){const v=kernel((j+.5-center)/Math.max(1,scale));w.push(v);sum+=v;}
  out.push({first,w:Float32Array.from(w,v=>v/sum)});
 }
 return out;
}
function lanczos(data,sw,sh,dw,dh){
 // Premultiply into floats.
 const n=sw*sh,src=new Float32Array(n*4);
 for(let i=0;i<n;i++){const a=data[i*4+3]/255;src[i*4]=data[i*4]*a;src[i*4+1]=data[i*4+1]*a;src[i*4+2]=data[i*4+2]*a;src[i*4+3]=data[i*4+3];}
 const tx=taps(sw,dw),ty=taps(sh,dh),mid=new Float32Array(dw*sh*4);
 for(let y=0;y<sh;y++){const row=y*sw*4;for(let x=0;x<dw;x++){const {first,w}=tx[x];let r=0,g=0,b=0,a=0;for(let k=0;k<w.length;k++){const p=row+(first+k)*4,v=w[k];r+=src[p]*v;g+=src[p+1]*v;b+=src[p+2]*v;a+=src[p+3]*v;}const o=(y*dw+x)*4;mid[o]=r;mid[o+1]=g;mid[o+2]=b;mid[o+3]=a;}}
 const out=new Uint8ClampedArray(dw*dh*4);
 for(let y=0;y<dh;y++){const {first,w}=ty[y];for(let x=0;x<dw;x++){let r=0,g=0,b=0,a=0;for(let k=0;k<w.length;k++){const p=((first+k)*dw+x)*4,v=w[k];r+=mid[p]*v;g+=mid[p+1]*v;b+=mid[p+2]*v;a+=mid[p+3]*v;}const o=(y*dw+x)*4;a=Math.max(0,Math.min(255,a));const k=a>0?255/a:0;out[o]=r*k;out[o+1]=g*k;out[o+2]=b*k;out[o+3]=a;}}
 return out;
}
// The halving steps and the pixel read stay on the main thread (GPU draws, cheap); returns either the finished canvas
// (no Lanczos step needed) or the pixels for the Lanczos step.
function prepare(source,w,h){
 let cur=source,cw=source.width,ch=source.height;
 while(cw/2>=w*2&&ch/2>=h*2){const next=document.createElement('canvas');next.width=Math.round(cw/2);next.height=Math.round(ch/2);const ink=next.getContext('2d');ink.imageSmoothingEnabled=true;ink.imageSmoothingQuality='high';ink.drawImage(cur,0,0,next.width,next.height);cur=next;cw=next.width;ch=next.height;}
 if(cw<=w||ch<=h){const out=document.createElement('canvas');out.width=w;out.height=h;const ink=out.getContext('2d');ink.imageSmoothingEnabled=true;ink.imageSmoothingQuality='high';ink.drawImage(cur,0,0,w,h);return {canvas:out};}
 const read=cur===source||!(cur.getContext)?(()=>{const c=document.createElement('canvas');c.width=cw;c.height=ch;c.getContext('2d').drawImage(cur,0,0);return c;})():cur;
 return {pixels:read.getContext('2d',{willReadFrequently:true}).getImageData(0,0,cw,ch).data,cw,ch};
}
const finish=(data,w,h)=>{const out=document.createElement('canvas');out.width=w;out.height=h;out.getContext('2d').putImageData(new ImageData(data,w,h),0,0);return out;};
// Reduce the source (canvas or image) into a new canvas of exactly w×h device pixels (synchronous).
export function reduce(source,w,h){const p=prepare(source,w,h);return p.canvas||finish(lanczos(p.pixels,p.cw,p.ch,w,h),w,h);}
// Cached by face design (key) and size; the cached canvas is shared read-only.
export function reduced(key,source,w,h){
 const id=key+'|'+w+'x'+h;let hit=cache.get(id);if(hit){cache.delete(id);cache.set(id,hit);return hit;}
 hit=reduce(source,w,h);cache.set(id,hit);if(cache.size>MAX)cache.delete(cache.keys().next().value);return hit;
}
// Round 3 (owner: lag when rival creatures appear as the fog leaves): the Lanczos step of a newly revealed face took
// ~75 ms in one piece on the main thread, exactly in the reveal frame. It now runs in a Web Worker (same code, same
// result); the main thread only does the GPU halving and the pixel read, one face per slice. If the worker cannot be
// created or fails, the same reduction runs synchronously as before.
// With OffscreenCanvas the whole reduction (halving draws and the pixel read too, which on the main thread forced a
// ~50 ms GPU read-back) happens in the worker from a transferred ImageBitmap; the main thread only puts the result.
const WORKER_BITMAP='const fromBitmap=(bitmap,w,h)=>{let cur=bitmap,cw=bitmap.width,ch=bitmap.height;const canvas=(a,b)=>new OffscreenCanvas(a,b);while(cw/2>=w*2&&ch/2>=h*2){const next=canvas(Math.round(cw/2),Math.round(ch/2)),ink=next.getContext("2d");ink.imageSmoothingEnabled=true;ink.imageSmoothingQuality="high";ink.drawImage(cur,0,0,next.width,next.height);cur=next;cw=next.width;ch=next.height;}if(cw<=w||ch<=h){const out=canvas(w,h),ink=out.getContext("2d",{willReadFrequently:true});ink.imageSmoothingEnabled=true;ink.imageSmoothingQuality="high";ink.drawImage(cur,0,0,w,h);bitmap.close?.();return ink.getImageData(0,0,w,h).data;}const read=canvas(cw,ch),ink=read.getContext("2d",{willReadFrequently:true});ink.drawImage(cur,0,0);bitmap.close?.();return lanczos(ink.getImageData(0,0,cw,ch).data,cw,ch,w,h);};';
const bitmapPath=typeof OffscreenCanvas==='function'&&typeof createImageBitmap==='function';
let worker=null,seq=0,workerMs=0;const waiting=new Map(),inflight=new Map();
function getWorker(){
 if(worker!==null)return worker;
 try{const src='const A='+A+';const sinc='+sinc+';const kernel='+kernel+';'+taps+';'+lanczos+';'+WORKER_BITMAP+'onmessage=e=>{const {id,data,bitmap,sw,sh,dw,dh}=e.data;const t=performance.now();const out=bitmap?fromBitmap(bitmap,dw,dh):lanczos(data,sw,sh,dw,dh);postMessage({id,out,ms:performance.now()-t},[out.buffer]);};';
  worker=new Worker(URL.createObjectURL(new Blob([src],{type:'text/javascript'})));
  worker.onmessage=e=>{const job=waiting.get(e.data.id);if(!job)return;waiting.delete(e.data.id);workerMs+=e.data.ms||0;job.done(e.data.out);};
  worker.onerror=()=>{worker=false;for(const [id,job] of waiting){waiting.delete(id);job.fallback();}};
 }catch{worker=false;}
 return worker;
}
const remember=(id,canvas)=>{cache.set(id,canvas);if(cache.size>MAX)cache.delete(cache.keys().next().value);return canvas;};
function offThread(id,source,w,h){
 const wb=bitmapPath&&getWorker();
 if(wb)return createImageBitmap(source).then(bitmap=>new Promise(resolve=>{const n=++seq;
  waiting.set(n,{done:data=>resolve(remember(id,finish(data,w,h))),fallback:()=>resolve(remember(id,reduce(source,w,h)))});
  wb.postMessage({id:n,bitmap,dw:w,dh:h},[bitmap]);}),()=>remember(id,reduce(source,w,h)));
 const p=prepare(source,w,h);if(p.canvas)return Promise.resolve(remember(id,p.canvas));
 const wk=getWorker();if(!wk)return Promise.resolve(remember(id,finish(lanczos(p.pixels,p.cw,p.ch,w,h),w,h)));
 return new Promise(resolve=>{const n=++seq;const copy=new Uint8ClampedArray(p.pixels);
  waiting.set(n,{done:data=>resolve(remember(id,finish(data,w,h))),fallback:()=>resolve(remember(id,finish(lanczos(p.pixels,p.cw,p.ch,w,h),w,h)))});
  wk.postMessage({id:n,data:copy,sw:p.cw,sh:p.ch,dw:w,dh:h},[copy.buffer]);});
}
// Faces are prepared one per task slice (budget ~8 ms), so a board that receives many new faces at once does not turn
// them into a single long task. Each job resolves with its canvas; the same face and size in flight is shared.
const jobs=[];let running=false,ran=0,totalMs=0;
function pump(){running=true;const start=performance.now();while(jobs.length&&performance.now()-start<8){const job=jobs.shift();const t=performance.now();try{job.run().then(job.resolve,job.reject);}catch(e){job.reject(e);}totalMs+=performance.now()-t;ran++;}if(jobs.length)setTimeout(pump,0);else running=false;}
export function queued(key,source,w,h){
 const id=key+'|'+w+'x'+h,hit=cache.get(id);if(hit){cache.delete(id);cache.set(id,hit);return Promise.resolve(hit);}
 if(inflight.has(id))return inflight.get(id);
 const promise=new Promise((resolve,reject)=>{jobs.push({run:()=>offThread(id,source,w,h),resolve,reject});if(!running)setTimeout(pump,0);}).finally(()=>inflight.delete(id));
 inflight.set(id,promise);return promise;
}
export const stats=()=>({entries:cache.size,max:MAX,ran,totalMs:+totalMs.toFixed(1),pending:jobs.length,worker:worker===null?'idle':worker?'on':'off',workerMs:+workerMs.toFixed(1),inWorker:waiting.size});
window.RunaResample={reduce,reduced,queued,get stats(){return stats();}};
