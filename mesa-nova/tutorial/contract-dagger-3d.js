/* A small real 3D mesh. One draw call, no library, network dependency or idle loop. */
(function(root){
 'use strict';
 const faces=[],steel=[.43,.50,.52],edge=[.78,.82,.77],brass=[.61,.40,.16],dark=[.12,.085,.065];
 function tri(a,b,c,color){const u=b.map((v,i)=>v-a[i]),v=c.map((v,i)=>v-a[i]),n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],len=Math.hypot(...n)||1;faces.push({p:[a,b,c],n:n.map(x=>x/len),c:color});}
 function quad(a,b,c,d,color){tri(a,b,c,color);tri(a,c,d,color);}
 function ring(y,rx,rz,color,height,sides=12){const lo=[],hi=[];for(let i=0;i<sides;i++){const a=i/sides*Math.PI*2;lo.push([Math.cos(a)*rx,y,Math.sin(a)*rz]);hi.push([Math.cos(a)*rx,y+height,Math.sin(a)*rz]);}for(let i=0;i<sides;i++){const j=(i+1)%sides;quad(lo[i],lo[j],hi[j],hi[i],color);tri([0,y+height,0],hi[i],hi[j],color);tri([0,y,0],lo[j],lo[i],color);}}
 // Forged blade: two ground bevels meet at a raised spine, terminating in the point.
 const sections=[[0,0],[.45,.18],[1.6,.27],[1.83,.22]];
 for(let i=0;i<sections.length-1;i++){
  const [a,w]=sections[i],[b,q]=sections[i+1];
  for(const side of [-1,1])for(const front of [-1,1])quad([side*w,a,0],[side*q,b,0],[0,b,front*.105],[0,a,i?front*.09:0],side===front?steel:edge);
 }
 ring(1.8,.29,.14,brass,.15);ring(1.95,.155,.145,dark,1.02,16);
 for(let i=0;i<10;i++)ring(1.99+i*.091,.165,.155,i===0||i===9?brass:[.24,.15,.10],.027,16);
 ring(2.98,.19,.18,brass,.10);ring(3.08,.25,.21,[.39,.27,.14],.15);ring(3.23,.18,.16,brass,.09);
 // Swept guard, bevelled on both faces.
 for(const s of [-1,1]){const a=[s*.08,1.82,.12],b=[s*.49,1.89,.09],c=[s*.58,1.78,.05],d=[s*.52,1.72,.04],e=[s*.15,1.75,.12];quad(a,b,c,e,brass);tri(c,d,e,edge);const back=[a,b,c,d,e].map(p=>[p[0],p[1],-p[2]]);for(let i=0;i<5;i++){const p=[a,b,c,d,e];quad(p[i],p[(i+1)%5],back[(i+1)%5],back[i],[.29,.19,.08]);}tri(back[0],back[4],back[1],brass);tri(back[1],back[4],back[2],brass);tri(back[2],back[4],back[3],brass);}
 const data=new Float32Array(faces.flatMap(f=>f.p.flatMap(p=>[...p,...f.n,...f.c])));
 function rotate([x,y,z],[a,b,c]){let yy=y*Math.cos(a)-z*Math.sin(a),zz=y*Math.sin(a)+z*Math.cos(a);let xx=x*Math.cos(b)+zz*Math.sin(b);z=-x*Math.sin(b)+zz*Math.cos(b);return [xx*Math.cos(c)-yy*Math.sin(c),xx*Math.sin(c)+yy*Math.cos(c),z];}
 function makeGL(canvas){
  const gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false,powerPreference:'low-power'});if(!gl)return null;
  const shaders=[];const shader=(type,src)=>{const s=gl.createShader(type);shaders.push(s);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error('Dagger shader');return s;};
  const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,`attribute vec3 pos,normal,color;uniform mat3 rotation;uniform vec2 offset,resolution;uniform float scale;varying vec3 n,c,v;void main(){v=rotation*pos;n=rotation*normal;c=color;float f=scale*10.0/(10.0-v.z);vec2 pixel=offset+vec2(v.x,-v.y)*f;gl_Position=vec4(pixel/resolution*2.0-1.0,-v.z/16.0,1.0);gl_Position.y=-gl_Position.y;}`));
  gl.attachShader(program,shader(gl.FRAGMENT_SHADER,`precision mediump float;varying vec3 n,c,v;uniform float opacity;void main(){vec3 N=normalize(n),L=normalize(vec3(-.55,.8,1.4));float diffuse=.32+.70*abs(dot(N,L));float spec=pow(abs(dot(N,normalize(L+vec3(0.,0.,1.)))),36.);float cool=pow(max(0.,dot(N,normalize(vec3(.8,-.3,.7)))),8.);float grain=sin(v.y*190.+v.x*20.)*.012;gl_FragColor=vec4(c*(diffuse+grain)+vec3(1.,.83,.56)*spec*.55+vec3(.17,.24,.3)*cool,opacity);}`));
  gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Dagger program');gl.useProgram(program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
  ['pos','normal','color'].forEach((key,i)=>{const id=gl.getAttribLocation(program,key);gl.enableVertexAttribArray(id);gl.vertexAttribPointer(id,3,gl.FLOAT,false,36,i*12);});
  const u=Object.fromEntries(['rotation','offset','resolution','scale','opacity'].map(k=>[k,gl.getUniformLocation(program,k)]));gl.enable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  return {draw(p){gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.uniformMatrix3fv(u.rotation,false,[[1,0,0],[0,1,0],[0,0,1]].flatMap(v=>rotate(v,p.angles)));gl.uniform2f(u.offset,250+p.x,460+p.y);gl.uniform2f(u.resolution,700,700);gl.uniform1f(u.scale,p.scale);gl.uniform1f(u.opacity,p.opacity);gl.drawArrays(gl.TRIANGLES,0,data.length/9);},destroy(){gl.deleteBuffer(buffer);gl.deleteProgram(program);shaders.forEach(s=>gl.deleteShader(s));gl.getExtension('WEBGL_lose_context')?.loseContext();}};
 }
 function makeFallback(canvas){const ctx=canvas.getContext('2d');return {draw(p){ctx.setTransform(canvas.width/700,0,0,canvas.height/700,0,0);ctx.clearRect(0,0,700,700);ctx.globalAlpha=p.opacity;const fs=faces.map(f=>({...f,p:f.p.map(v=>rotate(v,p.angles)),n:rotate(f.n,p.angles)})).sort((a,b)=>a.p.reduce((s,v)=>s+v[2],0)-b.p.reduce((s,v)=>s+v[2],0));for(const f of fs){const light=.35+.65*Math.abs((-.55*f.n[0]+.8*f.n[1]+1.4*f.n[2])/1.7);ctx.fillStyle='rgb('+f.c.map(v=>Math.min(255,Math.round(v*light*255))).join(',')+')';ctx.beginPath();f.p.forEach((v,i)=>{const k=p.scale*10/(10-v[2]);ctx[i?'lineTo':'moveTo'](250+p.x+v[0]*k,460+p.y-v[1]*k);});ctx.closePath();ctx.fill();}},destroy(){ctx.clearRect(0,0,canvas.width,canvas.height);}};}
 root.RunaContractDagger={create(parent){let canvas=document.createElement('canvas');canvas.className='contract-dagger';canvas.setAttribute('aria-hidden','true');const dpr=Math.min(1.5,root.devicePixelRatio||1);canvas.width=canvas.height=Math.round(700*dpr);let renderer;try{renderer=makeGL(canvas);}catch{}if(!renderer){canvas=document.createElement('canvas');canvas.className='contract-dagger';canvas.setAttribute('aria-hidden','true');canvas.width=canvas.height=Math.round(700*dpr);renderer=makeFallback(canvas);canvas.dataset.renderer='projected-mesh';}else canvas.dataset.renderer='webgl';parent.append(canvas);return {draw(p){canvas.style.left=(p.tipX-250)+'px';canvas.style.top=(p.tipY-460)+'px';renderer.draw({...p,x:0,y:0});},destroy(){renderer.destroy();canvas.remove();}};}};
})(globalThis);
