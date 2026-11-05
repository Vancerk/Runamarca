// Revisão 12: orientação EFETIVA da câmera, medida sem confiar no valor de config.js.
// 1. GPU: um init script intercepta a matriz `camera` realmente enviada ao shader de
//    materiais (uniformMatrix4fv). Dela saem a posição do olho (núcleo das linhas x, y, w)
//    e o eixo de visão (cruzamento das linhas x e y); o ângulo com a vertical vem daí.
// 2. Pixels: as duas bordas laterais do feltro, localizadas na captura (subpixel, pelo
//    lado interno) e ajustadas por regressão, convergem num ponto de fuga cuja altura
//    na tela dá o ângulo (só pixels + FOV da matriz). A razão de larguras longe/perto
//    (D − z·sen θ) continua registrada apenas como comparação.
// 3. Controle: a mesma medição com a sobreposição de QA em 15,9855369664° (ângulo da
//    revisão 11) precisa achar ~16°, o que prova que o método distingue os ângulos.
// Também: projeção da GPU × DOM (âncoras, hit-test das casas), ausência de inclinação
// CSS independente, sombras laterais perceptíveis e sem rolagem indevida.
// Uso: HYBRID_QA_OUT=<pasta> node scripts/hybrid12-camera.mjs
import {harness,launch,open,paint,captureTable,view,writeJSON,finish} from './hybrid12-lib.mjs';
const out=process.env.HYBRID_QA_OUT||'prototype-qa/hybrid-12/camera',H=harness(out),{check}=H,report={runs:[]},REV11=15.9855369663914;
// Runs before any page script: tags uniform locations with their names and records the
// last `camera` matrix of the program that also owns the `lamp` uniform (main pass).
function spy(tilt){
 if(tilt!==null)window.__HYBRID_TILT_DEGREES=tilt;
 const P=WebGLRenderingContext.prototype,get=P.getUniformLocation,set=P.uniformMatrix4fv,programs=new WeakMap();window.__gpuCamera=null;
 P.getUniformLocation=function(program,name){const loc=get.call(this,program,name);if(loc){loc.__name=name;loc.__program=program;const names=programs.get(program)||new Set();names.add(name);programs.set(program,names);}return loc;};
 P.uniformMatrix4fv=function(loc,transpose,data){if(loc?.__name==='camera'&&programs.get(loc.__program)?.has('lamp'))window.__gpuCamera={m:Array.from(data),at:performance.now(),w:this.drawingBufferWidth,h:this.drawingBufferHeight};return set.call(this,loc,transpose,data);};
}
// Orientation from a column-major view-projection matrix.
function orientation(m){const row=i=>[m[i],m[4+i],m[8+i],m[12+i]],r0=row(0),r1=row(1),r3=row(3),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],len=a=>Math.hypot(...a);
 // Eye: r0·[e,1]=r1·[e,1]=r3·[e,1]=0 (Cramer).
 const A=[r0,r1,r3].map(r=>r.slice(0,3)),B=[r0,r1,r3].map(r=>-r[3]),det=M=>M[0][0]*(M[1][1]*M[2][2]-M[1][2]*M[2][1])-M[0][1]*(M[1][0]*M[2][2]-M[1][2]*M[2][0])+M[0][2]*(M[1][0]*M[2][1]-M[1][1]*M[2][0]),D=det(A),eye=[0,1,2].map(k=>det(A.map((r,i)=>r.map((v,j)=>j===k?B[i]:v)))/D);
 let d=cross(r0.slice(0,3),r1.slice(0,3));if(dot(d,r3.slice(0,3))<0)d=d.map(v=>-v);d=d.map(v=>v/len(d));
 const toTarget=eye.map(v=>-v),n=len(toTarget);
 return {eye,forward:d,tiltDegrees:Math.acos(Math.min(1,-d[1]))*180/Math.PI,eyeTiltDegrees:Math.atan2(eye[2],eye[1])*180/Math.PI,distance:n,aimError:Math.acos(Math.min(1,dot(d,toTarget)/n))*180/Math.PI,fovDegrees:2*Math.atan(1/len(r1.slice(0,3)))*180/Math.PI};}
const project=(m,p)=>{const v=[...p,1],r=[0,1,2,3].map(i=>m[i]*v[0]+m[4+i]*v[1]+m[8+i]*v[2]+m[12+i]*v[3]);return r;};
// Felt edges read from the screenshot pixels (teal: g and b well above r), in bitmap
// pixels (DPR-aware) and reported in CSS px.
// Each row is scanned twice: a coarse scan from outside finds the first teal pixel; the
// edge itself is then located from INSIDE the felt, as the sub-pixel crossing of the
// mid level between the felt interior and the rim just outside it (g − r). The first
// revision-12 version used the coarse crossing directly; the brushed-bronze rims
// (kind 3, sin(P.z·40)) modulate the rim pixels periodically along z, which made that
// crossing jitter ±3 px with a ~60 px period and biased the fitted slope at 1280×720.
// Rows whose inner probe is not uniform felt (a card, label or panel over the edge)
// are rejected before the fit and counted.
async function feltLines(page,png,quad){return page.evaluate(async({data,quad})=>{const img=new Image();img.src=data;await img.decode();const c=new OffscreenCanvas(img.width,img.height),g=c.getContext('2d',{willReadFrequently:true});g.drawImage(img,0,0);
  const s=img.width/innerWidth,W=img.width,teal=(d,i)=>d[i+1]>d[i]+22&&d[i+2]>d[i]+18,tau=(d,i)=>d[i+1]-d[i];
  const px=(x,y)=>{const d=g.getImageData(Math.round(x*s),Math.round(y*s),1,1).data;return teal(d,0);};
  const xs=quad.map(p=>p.x),ys=quad.map(p=>p.y),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys),probeX=x0+(x1-x0)*.03;
  let top=null,bottom=null;for(let y=y0-12;y<y1;y+=.5)if(px(probeX,y)){top=y;break;}for(let y=y1+12;y>y0;y-=.5)if(px(probeX,y)){bottom=y;break;}if(top===null||bottom===null)return {top,bottom,rows:0,rejected:{},left:null,right:null};
  const rejected={coarse:0,inner:0,crossing:0},inset=Math.max(4,Math.round(6*s)),span=Math.max(3,Math.round(4*s));
  // dir=+1: left edge (scan rightwards from outside); dir=−1: right edge.
  const edge=(d,fromCss,limitCss,dir)=>{let X=Math.round(fromCss*s);const lim=Math.round(limitCss*s);while(dir>0?X<lim:X>lim){if(X>=0&&X<W&&teal(d,X*4))break;X+=dir;}if(dir>0?X>=lim:X<=lim){rejected.coarse++;return null;}
   const inner=X+dir*inset;let level=0;for(let k=0;k<span;k++){const i=(inner+dir*k)*4;if(!teal(d,i)){rejected.inner++;return null;}level+=tau(d,i);}level/=span;
   let outside=Infinity;for(let k=1;k<=inset;k++){const i=(X-dir*k)*4;if(X-dir*k>=0&&X-dir*k<W)outside=Math.min(outside,tau(d,i));}if(!Number.isFinite(outside)||level-outside<12){rejected.crossing++;return null;}
   // Threshold at 70% of the way up to the felt level: the inner ink rim (w−.12) runs
   // ~.05 world inside the felt edge, and a 50% threshold alternated between the two
   // parallel boundaries as the brushed rim brightness changed (σ ≈ 1 px at 1280×720).
   const thr=outside+.7*(level-outside);for(let p=inner;dir>0?p>=X-inset:p<=X+inset;p-=dir){const a=tau(d,p*4),b=tau(d,(p-dir)*4);if(a>=thr&&b<thr){const f=(a-thr)/(a-b),xb=p-dir*f;return (xb+.5)/s;}}rejected.crossing++;return null;};
  const rows=[];let tried=0;for(let y=top+(bottom-top)*.12;y<=bottom-(bottom-top)*.12;y+=2){tried++;const d=g.getImageData(0,Math.round(y*s),W,1).data,l=edge(d,x0-20,x0+(x1-x0)*.2,1),r=edge(d,x1+20,x1-(x1-x0)*.2,-1);if(l!==null&&r!==null)rows.push([+y.toFixed(2),+l.toFixed(3),+r.toFixed(3)]);}
  // Projected straight edges stay straight: fit each lateral edge x(y) by least squares,
  // then drop samples with residual > 1.5 px (overlays the inner probe missed) and refit
  // twice. Standard errors come from the final residuals.
  const fit=pts=>{const n=pts.length,my=pts.reduce((a,p)=>a+p[0],0)/n,mx=pts.reduce((a,p)=>a+p[1],0)/n,syy=pts.reduce((a,p)=>a+(p[0]-my)**2,0),k=pts.reduce((a,p)=>a+(p[0]-my)*(p[1]-mx),0)/syy,res=pts.map(p=>p[1]-(mx+k*(p[0]-my))),rss=res.reduce((a,v)=>a+v*v,0),sigma=Math.sqrt(rss/Math.max(1,n-2));return {n,my,mx,k,syy,sigma,maxResidual:Math.max(...res.map(Math.abs)),at:y=>mx+k*(y-my)};};
  const robust=pts=>{if(pts.length<3)return null;let f=fit(pts),keep=pts;for(let i=0;i<2;i++){keep=pts.filter(p=>Math.abs(f.at(p[0])-p[1])<=1.5);if(keep.length<3)return null;f=fit(keep);}const {at,...rest}=f;return {...rest,c:f.mx-f.k*f.my,discarded:pts.length-keep.length};};
  const left=robust(rows.map(r=>[r[0],r[1]])),right=robust(rows.map(r=>[r[0],r[2]]));
  return {top,bottom,dpr:s,tried,rows:rows.length,rejected,left,right,samples:rows};},{data:'data:image/png;base64,'+png.toString('base64'),quad});}
// Tilt from the vanishing point of the two lateral felt edges. Lines parallel to the table
// depth axis meet at the screen row y_v whatever their height or z extent, and for the
// convention eye=[0,cos θ·D,sin θ·D] y_v = (1 − cot θ / tan(fov/2))·H/2. Written without
// the division by the (near-infinite) y_v: tan θ = H·Δk / (t·(H·Δk + 2·W₀)), where
// Δk = k_R − k_L (dx/dy of the two edges), W₀ = c_R − c_L (gap at y=0), t = tan(fov/2)
// and H the CSS viewport height. Inputs are pixels plus the FOV taken from the GPU
// matrix; the declared tilt is never used. Uncertainty: first-order propagation of the
// fit standard errors (mean x and slope of each edge, independent).
function vanishingTilt(fw,H,W,fovDegrees){
 const t=Math.tan(fovDegrees*Math.PI/360),L=fw.left,R=fw.right;
 const angle=([mxL,kL,mxR,kR])=>{const cL=mxL-kL*L.my,cR=mxR-kR*R.my,dk=kR-kL,w0=cR-cL;return Math.atan(H*dk/(t*(H*dk+2*w0)))*180/Math.PI;};
 const p=[L.mx,L.k,R.mx,R.k],sd=[L.sigma/Math.sqrt(L.n),L.sigma/Math.sqrt(L.syy),R.sigma/Math.sqrt(R.n),R.sigma/Math.sqrt(R.syy)],degrees=angle(p);
 let variance=0;for(let i=0;i<4;i++){const h=Math.max(1e-6,sd[i]*1e-3),q=[...p];q[i]+=h;const dq=(angle(q)-degrees)/h;variance+=(dq*sd[i])**2;}
 const cL=L.mx-L.k*L.my,cR=R.mx-R.k*R.my,dk=R.k-L.k,yv=dk?(cR-cL)/(-dk):-Infinity,xv=Number.isFinite(yv)?cL+L.k*yv:null;
 return {degrees,se:Math.sqrt(variance),slopes:{left:L.k,right:R.k},gapAtTop:cR-cL,vanishing:{y:yv,x:xv,centreOffset:xv===null?null:xv-W/2},fovDegrees};}
// Mean luminance of a screen rectangle (CSS px) from the screenshot.
async function luminance(page,png,boxes){return page.evaluate(async({data,boxes})=>{const img=new Image();img.src=data;await img.decode();const c=new OffscreenCanvas(img.width,img.height),g=c.getContext('2d');g.drawImage(img,0,0);const s=img.width/innerWidth;return boxes.map(b=>{const d=g.getImageData(Math.round(b.x*s),Math.round(b.y*s),Math.max(1,Math.round(b.w*s)),Math.max(1,Math.round(b.h*s))).data;let t=0;for(let k=0;k<d.length;k+=4)t+=.2126*d[k]+.7152*d[k+1]+.0722*d[k+2];return t/(d.length/4);});},{data:'data:image/png;base64,'+png.toString('base64'),boxes});}
const browser=await launch();
try{
 const runs=[[1920,900,1,null],[1920,1080,1,null],[1440,900,1,null],[1280,720,1,null],[1920,900,2,null],[1920,1080,2,null],[390,800,1,null],[1920,900,1,REV11],[1280,720,1,REV11]];
 for(const [w,h,dpr,tilt] of runs){const id=`${w}x${h}-dpr${dpr}`+(tilt===null?'':'-rev11-angle'),{context,page}=await open(browser,{width:w,height:h},{dpr,errors:H.errors,gpu:H.gpu,init:{fn:spy,arg:tilt}});
  for(const seat of ['a','b']){const t=captureTable();await paint(page,view(t.room,t[seat]),700);await page.mouse.move(w/2,4);await page.waitForTimeout(200);if(w<=900){/* Mobile: bring the field above the fixed hand before hit-testing. */await page.evaluate(()=>document.getElementById('lanes').scrollIntoView({block:'center'}));await page.waitForTimeout(400);}
   const s=await page.evaluate(()=>{const st=RunaHybrid.stats,cfg=RunaHybridConfig.snapshot(),gpu=window.__gpuCamera,game=document.getElementById('game');
    const tilted=['#game','#game>.table','#game .board','#lanes','body','html'].map(sel=>{const n=document.querySelector(sel);if(!n)return null;const cs=getComputedStyle(n);return {sel,transform:cs.transform,perspective:cs.perspective,rotate:cs.rotate};}).filter(Boolean);
    const lanes=[...document.querySelectorAll('#lanes>.lane>.lane-side')].map(n=>n.getBoundingClientRect().toJSON());
    return {stats:{tilt:st.cameraTiltDegrees,from:st.cameraTiltFrom,eye:st.cameraEye,fov:st.cameraFovDegrees,distance:st.cameraDistance,shadow:st.shadow,lamp:st.lamp,webglError:st.webglError,active:st.active},cfg:cfg.camera,gpu,anchors:RunaHybrid.anchors.map(a=>({id:a.id,world:a.world,kind:a.projectionKind,actual:a.actual,surfaceCenter:a.surfaceCenter,cssError:a.error})),field:RunaHybrid.scene.field,faces:RunaHybrid.faces.filter(f=>f.valid&&f.role==='combat').map(f=>({quad:f.quad,side:f.side})),tilted,lanes,scroll:{w:document.documentElement.scrollWidth,h:document.documentElement.scrollHeight},vw:innerWidth,vh:innerHeight};});
   const run={id,seat,tilt,stats:s.stats,cfg:s.cfg};report.runs.push(run);
   check(`${id} ${seat}: GPU camera matrix captured from the material pass`,!!s.gpu&&s.gpu.m.length===16&&s.stats.active,{gpu:!!s.gpu});if(!s.gpu)continue;
   const o=orientation(s.gpu.m);run.gpu=o;const expected=tilt===null?5:tilt;
   check(`${id} ${seat}: effective tilt from the GPU matrix ≈ ${expected.toFixed(4)}° from vertical`,Math.abs(o.tiltDegrees-expected)<.01&&Math.abs(o.eyeTiltDegrees-expected)<.01&&o.aimError<.01,o);
   if(tilt===null)check(`${id} ${seat}: effective tilt near 5° (4–6°), never the revision-11 16°`,o.tiltDegrees>=4&&o.tiltDegrees<=6,o.tiltDegrees);
   check(`${id} ${seat}: eye on the near side, looking at the table centre, no roll`,o.eye[2]>0&&o.eye[1]>0&&Math.abs(o.eye[0])<1e-6&&Math.abs(o.forward[0])<1e-6,o);
   check(`${id} ${seat}: GPU FOV and distance match the declared camera (43°, hypot(22,16))`,Math.abs(o.fovDegrees-43)<.01&&Math.abs(o.distance-Math.hypot(22,16))<1e-3&&Math.abs(s.stats.fov-43)<1e-9,{fov:o.fovDegrees,distance:o.distance});
   check(`${id} ${seat}: RunaHybrid.stats and snapshot report the true configuration`,s.stats.from==='vertical'&&Math.abs(s.stats.tilt-expected)<1e-9&&s.cfg.tiltDegrees===s.stats.tilt&&(tilt===null?s.cfg.qaOverride===null&&s.cfg.parameter===5:s.cfg.qaOverride===tilt)&&s.stats.eye.every((v,i)=>Math.abs(v-o.eye[i])<1e-3),{stats:s.stats,cfg:s.cfg});
   // DOM ↔ GPU: projecting world anchors with the captured matrix lands on the DOM nodes.
   const toScreen=p=>{const r=project(s.gpu.m,p);return {x:(r[0]/r[3]+1)*s.vw/2,y:(1-r[1]/r[3])*s.vh/2};},errs=s.anchors.map(a=>{const p=toScreen(a.world);return {id:a.id,kind:a.kind,error:Math.hypot(p.x-a.actual.x,p.y-a.actual.y),surfaceError:Math.hypot(p.x-a.surfaceCenter.x,p.y-a.surfaceCenter.y),cssError:a.cssError};}),centre=errs.filter(e=>e.kind==='center'),bounds=errs.filter(e=>e.kind!=='center');
   run.anchorErrors={maxCentre:Math.max(0,...centre.map(e=>e.error)),maxBounds:Math.max(0,...bounds.map(e=>e.error)),n:errs.length};
   check(`${id} ${seat}: world anchors projected by the GPU matrix match DOM centres (< 1 px)`,centre.length>=6&&centre.every(e=>e.error<1),centre.filter(e=>e.error>=1));
   // Panels/decks are centred on their projected quad bounds: the GPU projection of the world centre must equal the bridge surface centre, and the DOM must sit on the bounds.
   check(`${id} ${seat}: projected panels/decks: GPU centre = surface centre, DOM on quad bounds`,bounds.length>=4&&bounds.every(e=>e.surfaceError<.5&&e.cssError<1.5),bounds.filter(e=>e.surfaceError>=.5||e.cssError>=1.5));
   const hits=await page.evaluate(pts=>pts.map(({id,x,y})=>{const n=document.elementFromPoint(x,y);return {id,ok:!!n?.closest('.lane-side'),hit:n?.className||n?.tagName};}),s.anchors.filter(a=>/^combat-/.test(a.id)).map(a=>({id:a.id,...toScreen(a.world)})));
   check(`${id} ${seat}: GPU-projected lane centres hit-test their lane sides`,hits.length===6&&hits.every(x=>x.ok),hits);
   check(`${id} ${seat}: no independent CSS tilt on the table containers`,s.tilted.every(x=>(x.transform==='none'||!/matrix3d|rotate/i.test(x.transform))&&x.perspective==='none'&&(x.rotate==='none'||!x.rotate)),s.tilted);
   const desktop=w>900;check(`${id} ${seat}: no horizontal overflow${desktop?', no desktop vertical scroll':', mobile scrolls vertically'}`,s.scroll.w<=w&&(desktop?s.scroll.h<=h:s.scroll.h>h),s.scroll);
   if(!desktop||seat!=='a')continue;
   // Pixel measurement of the felt trapezoid (independent of any matrix).
   const png=await page.screenshot(),fw=await feltLines(page,png,s.field.quad);run.pixels=fw;
   // At least 40 kept rows per edge, spanning the felt, with sub-pixel residuals.
   const enough=e=>e&&e.n-0>=40&&Number.isFinite(e.k)&&Number.isFinite(e.mx)&&e.sigma<.75;
   check(`${id}: felt edges found in the screenshot (≥ 40 rows per edge, residual σ < .75 px)`,enough(fw?.left)&&enough(fw?.right),{rows:fw?.rows,tried:fw?.tried,rejected:fw?.rejected,left:fw?.left&&{n:fw.left.n,sigma:fw.left.sigma,discarded:fw.left.discarded,max:fw.left.maxResidual},right:fw?.right&&{n:fw.right.n,sigma:fw.right.sigma,discarded:fw.right.discarded,max:fw.right.maxResidual}});
   if(enough(fw?.left)&&enough(fw?.right)){const vp=vanishingTilt(fw,s.vh,s.vw,o.fovDegrees);
    // Width-ratio estimate kept for comparison only: it needs the world z of the rows
    // (taken from the scene) and assumes the detected rows are the field rims.
    const D=Math.hypot(22,16),f=s.field,wAt=y=>(fw.right.c+fw.right.k*y)-(fw.left.c+fw.left.k*y),ratio=wAt(fw.top)/wAt(fw.bottom),zf=f.z-f.d/2,zn=f.z+f.d/2,ratioDegrees=Math.asin(Math.max(-1,Math.min(1,D*(1-ratio)/(zn-ratio*zf))))*180/Math.PI;
    run.pixelTilt={degrees:vp.degrees,se:vp.se,ratio,ratioDegrees,vanishing:vp.vanishing,slopes:vp.slopes,gapAtTop:vp.gapAtTop,fovDegrees:vp.fovDegrees};
    check(`${id}: tilt measured from felt pixels (vanishing point) ≈ ${expected.toFixed(2)}° (±1.5°)`,Number.isFinite(vp.degrees)&&Number.isFinite(vp.se)&&Math.abs(vp.degrees-expected)<1.5,{degrees:vp.degrees,se:vp.se,expected,ratioDegrees});
    check(`${id}: vanishing point on the vertical centre line (no roll, |Δx| < 2% of width)`,vp.vanishing.centreOffset!==null&&Math.abs(vp.vanishing.centreOffset)<s.vw*.02,vp.vanishing);}
   // Side light: the strip just left of a combat card (shadow side, lamp upper right) is
   // darker than the strip just right of it; the contrast stays moderate.
   if(tilt===null){const face=s.faces.find(f=>f.side==='near');if(face){const xs=face.quad.map(p=>p.x),ys=face.quad.map(p=>p.y),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys),hh=(y1-y0)*.5,[left,right]=await luminance(page,png,[{x:x0-5,y:y0+hh*.4,w:3,h:hh},{x:x1+2,y:y0+hh*.4,w:3,h:hh}]);run.cardShadow={left,right,ratio:left/right};
     check(`${id}: combat card casts a perceptible, moderate lateral shadow`,left/right<.93&&left/right>.45,{left,right,ratio:left/right});}
    check(`${id}: shadow frustum fitted (texel ≤ .03 world) with bounded lateral length`,s.stats.shadow&&s.stats.shadow.worldTexel<=.03&&s.stats.shadow.lengthPerHeight>1&&s.stats.shadow.lengthPerHeight<3,s.stats.shadow);
    await page.screenshot({path:`${out}/camera-${id}.png`});}
  }
  await context.close();}
 // Control: the pixel method sees a stronger trapezoid at the revision-11 angle.
 for(const size of ['1920x900','1280x720']){const a=report.runs.find(r=>r.id===`${size}-dpr1`&&r.seat==='a'),b=report.runs.find(r=>r.id===`${size}-dpr1-rev11-angle`&&r.seat==='a');
  check(`${size}: 5° is measurably closer to vertical than the revision-11 angle (pixels and GPU)`,a?.pixelTilt&&b?.pixelTilt&&a.pixelTilt.ratio>b.pixelTilt.ratio&&b.pixelTilt.degrees-a.pixelTilt.degrees>8&&(b.pixelTilt.degrees-a.pixelTilt.degrees)>6*Math.hypot(a.pixelTilt.se,b.pixelTilt.se)&&b.gpu.tiltDegrees-a.gpu.tiltDegrees>10,{now:a?.pixelTilt,rev11:b?.pixelTilt});}
 // Precision summary: pixel estimate − GPU angle for every measured run.
 report.precision=report.runs.filter(r=>r.pixelTilt&&r.gpu).map(r=>({id:r.id,gpu:r.gpu.tiltDegrees,pixels:r.pixelTilt.degrees,se:r.pixelTilt.se,error:r.pixelTilt.degrees-r.gpu.tiltDegrees,ratioMethod:r.pixelTilt.ratioDegrees,keptRows:{left:r.pixels.left.n,right:r.pixels.right.n},discarded:{left:r.pixels.left.discarded,right:r.pixels.right.discarded},rejected:r.pixels.rejected,sigma:{left:r.pixels.left.sigma,right:r.pixels.right.sigma}}));
 console.log('precision',JSON.stringify(report.precision.map(p=>({id:p.id,gpu:+p.gpu.toFixed(3),px:+p.pixels.toFixed(3),se:+p.se.toFixed(3),err:+p.error.toFixed(3),ratio:+p.ratioMethod.toFixed(3)}))));
 check('no runtime errors',H.errors.length===0,H.errors);check('no WebGL errors',H.gpu.length===0,H.gpu);
}finally{writeJSON(`${out}/camera-detail.json`,report);finish(out,'camera',H);await browser.close();}
