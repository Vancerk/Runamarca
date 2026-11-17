/* Local volumetric mesh: WebGL lighting/depth, no network assets or CSS flattening. */
(function(root){
 'use strict';
 const WIDTH=700,HEIGHT=700,clamp=t=>Math.max(0,Math.min(1,t)),ease=t=>t*t*(3-2*t);
 const steel=[.19,.29,.26],gold=[.78,.52,.19],leather=[.24,.13,.07],ivory=[.87,.78,.54];
 const triangles=[];
 function triangle(a,b,c,color){const u=b.map((v,i)=>v-a[i]),v=c.map((v,i)=>v-a[i]),n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],length=Math.hypot(...n)||1;triangles.push({points:[a,b,c],normal:n.map(x=>x/length),color});}
 function quad(a,b,c,d,color){triangle(a,b,c,color);triangle(a,c,d,color);}
 function box(cx,cy,cz,w,h,d,color,bevel=.04){
  const ring=(z,inset)=>{const x=w/2-inset,y=h/2-inset,b=Math.min(bevel,x*.4,y*.4);return [[-x+b,-y],[x-b,-y],[x,-y+b],[x,y-b],[x-b,y],[-x+b,y],[-x,y-b],[-x,-y+b]].map(([x,y])=>[cx+x,cy+y,cz+z]);};
  const rings=[ring(-d/2,bevel),ring(-d/2+bevel,0),ring(d/2-bevel,0),ring(d/2,bevel)];
  for(let k=0;k<3;k++)for(let i=0;i<8;i++){const j=(i+1)%8;quad(rings[k][j],rings[k][i],rings[k+1][i],rings[k+1][j],k===1?color:color.map(x=>Math.min(1,x*1.28)));}
  for(let i=0;i<8;i++){const j=(i+1)%8;triangle([cx,cy,cz+d/2],rings[3][i],rings[3][j],color);triangle([cx,cy,cz-d/2],rings[0][j],rings[0][i],color);}
 }
 function bar(a,b,width,depth,color){const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy),nx=-dy/len*width/2,ny=dx/len*width/2;const ring=z=>[[a[0]+nx,a[1]+ny,z],[a[0]-nx,a[1]-ny,z],[b[0]-nx,b[1]-ny,z],[b[0]+nx,b[1]+ny,z]];const p=ring(a[2]),q=ring(a[2]+depth);quad(...q,color);quad(p[3],p[2],p[1],p[0],color);for(let i=0;i<4;i++){const j=(i+1)%4;quad(p[i],p[j],q[j],q[i],color);}}
 // A heavy bevelled steel head, gold collars, wrapped haft and recessed eye insignia.
 box(0,0,0,2.08,1.1,1.26,steel,.12);
 for(const x of [-.9,.9])box(x,0,0,.23,1.16,1.31,gold,.05);
 // Steel striking plates at the two ends. Contact is on the +X face, never the belly.
 for(const x of [-1.10,1.10])box(x,0,0,.16,.96,1.08,[.38,.46,.43],.035);
 const strikePoint=[1.18,0,0];
 box(0,1.6,-.08,.28,2.65,.28,leather,.05);
 for(let i=0;i<10;i++)box(0,.62+i*.2,-.08,.34,.07,.34,i%3===0?gold:[.12,.09,.055],.025);
 box(0,.54,-.08,.52,.22,.5,gold,.06);box(0,2.93,-.08,.44,.28,.44,gold,.065);
 box(0,0,.647,1.36,.75,.06,[.09,.16,.14],.06);
 const eye=[[0,.3,.694],[.55,0,.694],[0,-.3,.694],[-.55,0,.694]];
 for(let i=0;i<4;i++)bar(eye[i],eye[(i+1)%4],.045,.025,ivory);
 bar([0,-.23,.7],[0,.23,.7],.048,.03,gold);
 // Small dents and rivets are geometry as well; highlights rotate with the surfaces.
 for(const x of [-.62,.62])for(const y of [-.28,.28])box(x,y,.702,.065,.065,.04,gold,.012);
 const vertices=new Float32Array(triangles.flatMap(t=>t.points.flatMap(p=>[...p,...t.normal,...t.color])));
 function rotate(p,angles){let [x,y,z]=p;const [a,b,c]=angles;[y,z]=[y*Math.cos(a)-z*Math.sin(a),y*Math.sin(a)+z*Math.cos(a)];[x,z]=[x*Math.cos(b)+z*Math.sin(b),-x*Math.sin(b)+z*Math.cos(b)];return [x*Math.cos(c)-y*Math.sin(c),x*Math.sin(c)+y*Math.cos(c),z];}
 function pose(t,reduced=false,side='self',motion={}){
  const timing=root.RunaForgeHammerStrike?.(reduced)||{impact:reduced?.4:.38,vanished:reduced?.9:.98};
  const p=clamp(t/timing.impact),drive=Math.pow(p,2.7),after=clamp((t-timing.impact)/(timing.vanished-timing.impact));
  const direction=side==='opponent'?-1:1,arrival=motion.kind==='arrival';
  const length=Math.hypot(motion.direction?.x||0,motion.direction?.y||0)||1;
  const ux=arrival?(motion.direction?.x||0)/length:-direction*.68,uy=arrival?(motion.direction?.y??direction)/length:-direction*.73;
  // A retreat that rapidly loses speed, followed by one small, damped reverberation.
  const retreat=1-Math.exp(-after*6),echo=Math.sin(after*Math.PI*4)*Math.exp(-after*8);
  // At the power's contact, the complete end face is parallel to the button plane.
  // Matching a/c also aligns its square edges; no corner reaches the button first.
  let a=arrival?.32:.38,b=arrival?.42:Math.PI/2,c=arrival?Math.atan2(-uy,ux):.38+(direction===1?Math.PI:0);
  if(arrival&&rotate([0,1,0],[a,b,c])[1]*-direction<0)a+=Math.PI;
  const wind=1-drive,recoil=reduced?0:retreat*.24+echo*.04;
  const angles=[a+wind*.28+recoil*.3,b-wind*.8-recoil,c+(arrival?-direction:direction)*(.34*wind+.13*retreat)];
  const approach=reduced?0:126*wind,arc=reduced?0:58*Math.sin(p*Math.PI),back=reduced?0:48*retreat+echo*9;
  const fadeStart=reduced?.46:.56,dissolve=ease(clamp((t-fadeStart)/(timing.vanished-fadeStart)));
  return {angles,x:-ux*(approach+back)-uy*arc,y:-uy*(approach+back)+ux*arc,scale:62+wind*16+retreat*2,opacity:t<.07?t/.07:1-dissolve,dissolve,heat:t<timing.impact?0:.35*(1-after)+dissolve*.75,phase:t<timing.impact?'swing':t<fadeStart?'recoil':t<timing.vanished?'dissolving':'gone'};
 }
 function shader(gl,type,text){const s=gl.createShader(type);gl.shaderSource(s,text);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){gl.deleteShader(s);throw Error('Shader do martelo indisponível');}return s;}
 function webgl(canvas){
  const gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false});if(!gl)return null;
  const vs=shader(gl,gl.VERTEX_SHADER,`attribute vec3 position,normal,color;uniform mat3 rotation;uniform vec2 offset,resolution;uniform float scale;varying vec3 shade,face,surface;void main(){vec3 p=rotation*position;float f=scale*9.0/(9.0-p.z);vec2 pixel=offset+vec2(p.x,-p.y)*f;gl_Position=vec4(pixel/resolution*2.0-1.0,-p.z/20.0,1.0);gl_Position.y=-gl_Position.y;shade=color;face=rotation*normal;surface=position;}`);
  const fs=shader(gl,gl.FRAGMENT_SHADER,`precision mediump float;varying vec3 shade,face,surface;uniform float opacity,heat,dissolve;void main(){vec3 n=normalize(face),lamp=normalize(vec3(-.5,.8,1.2));float light=.32+.72*max(0.0,dot(n,lamp));float rim=pow(max(0.0,dot(n,normalize(vec3(1.0,.1,.5)))),12.0);float spec=pow(max(0.0,dot(n,normalize(lamp+vec3(0.0,0.0,1.0)))),28.0);float grain=sin(surface.x*173.0+surface.y*97.0)*sin(surface.z*137.0+surface.y*61.0)*.022;float noise=fract(sin(dot(floor(surface*28.0),vec3(12.9898,78.233,45.164)))*43758.5453);float threshold=clamp((3.2-surface.y)/4.0,0.0,1.0)*.65+noise*.35;float mask=dissolve==0.0?1.0:smoothstep(dissolve-.035,dissolve+.045,threshold);float edge=dissolve==0.0?0.0:1.0-smoothstep(.0,.10,abs(threshold-dissolve));if(mask<.02)discard;vec3 c=shade*(light+grain)+vec3(.48,.38,.22)*rim+vec3(.85,.76,.52)*spec*.35;gl_FragColor=vec4(mix(c,vec3(1.0,.78,.26),min(.9,heat*.5+edge*.8)),opacity*mask);}`);
  const program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Programa do martelo indisponível');gl.useProgram(program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.STATIC_DRAW);
  for(const [i,name] of ['position','normal','color'].entries()){const location=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,3,gl.FLOAT,false,36,i*12);}
  const uniforms=Object.fromEntries(['rotation','offset','resolution','scale','opacity','heat','dissolve'].map(x=>[x,gl.getUniformLocation(program,x)]));
  gl.enable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  return {draw(p){gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);if(p.opacity<=0)return;const basis=[[1,0,0],[0,1,0],[0,0,1]].flatMap(v=>rotate(v,p.angles));gl.uniformMatrix3fv(uniforms.rotation,false,basis);gl.uniform2f(uniforms.offset,...p.offset);gl.uniform2f(uniforms.resolution,WIDTH,HEIGHT);gl.uniform1f(uniforms.scale,p.scale);gl.uniform1f(uniforms.opacity,p.opacity);gl.uniform1f(uniforms.heat,p.heat);gl.uniform1f(uniforms.dissolve,p.dissolve);gl.drawArrays(gl.TRIANGLES,0,vertices.length/9);},destroy(){gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);gl.getExtension('WEBGL_lose_context')?.loseContext();}};
 }
 function projected(canvas){
  const ctx=canvas.getContext('2d');if(!ctx)return null;
  return {draw(p){ctx.setTransform(canvas.width/WIDTH,0,0,canvas.height/HEIGHT,0,0);ctx.clearRect(0,0,WIDTH,HEIGHT);ctx.globalAlpha=p.opacity;if(!p.opacity)return;const faces=triangles.map(t=>({...t,points:t.points.map(v=>rotate(v,p.angles)),normal:rotate(t.normal,p.angles)})).sort((a,b)=>a.points.reduce((n,v)=>n+v[2],0)-b.points.reduce((n,v)=>n+v[2],0));for(const f of faces){const n=f.normal,light=.28+.72*Math.max(0,(-.5*n[0]+.8*n[1]+1.2*n[2])/Math.hypot(.5,.8,1.2));ctx.fillStyle='rgb('+f.color.map(x=>Math.round(Math.min(1,x*light)*255)).join(',')+')';ctx.beginPath();f.points.forEach((v,i)=>{const scale=p.scale*9/(9-v[2]),x=p.offset[0]+v[0]*scale,y=p.offset[1]-v[1]*scale;ctx[i?'lineTo':'moveTo'](x,y);});ctx.closePath();ctx.fill();}},destroy(){ctx.clearRect(0,0,canvas.width,canvas.height);}};
 }
 root.RunaForgeHammer3D={pose,strikePoint:Object.freeze(strikePoint),create(parent,{x,y,side='self',kind='power',direction}={}){
  const motion={kind,direction},contact=[WIDTH/2,kind==='arrival'?HEIGHT/2:side==='opponent'?510:190];
  const canvas=document.createElement('canvas');canvas.className='forge-hammer-model';canvas.dataset.side=side;canvas.width=WIDTH*Math.min(2,root.devicePixelRatio||1);canvas.height=HEIGHT*Math.min(2,root.devicePixelRatio||1);canvas.style.left=(x-contact[0])+'px';canvas.style.top=(y-contact[1])+'px';canvas.setAttribute('aria-hidden','true');parent.append(canvas);
  let renderer;try{renderer=webgl(canvas);}catch{}if(!renderer){canvas.remove();const replacement=document.createElement('canvas');replacement.className=canvas.className;replacement.dataset.side=side;replacement.width=canvas.width;replacement.height=canvas.height;replacement.style.cssText=canvas.style.cssText;replacement.setAttribute('aria-hidden','true');parent.append(replacement);return createFallback(replacement);}
  canvas.dataset.renderer='webgl';return control(canvas,renderer);
  function createFallback(node){node.dataset.renderer='projected-mesh';return control(node,projected(node));}
  function control(node,renderer){
   let destroyed=false;node.dataset.contactFace='positive-x';node.dataset.motionKind=kind;
   if(direction){node.dataset.driveX=String(direction.x);node.dataset.driveY=String(direction.y);}
   const shadow=document.createElement('div');shadow.className='forge-contact-shadow';shadow.style.left=x+'px';shadow.style.top=(y+7)+'px';shadow.setAttribute('aria-hidden','true');parent.insertBefore(shadow,node);
   const embers=document.createElement('canvas');embers.className='forge-hammer-embers';embers.width=node.width;embers.height=node.height;embers.style.cssText=node.style.cssText;embers.setAttribute('aria-hidden','true');parent.append(embers);const ink=embers.getContext('2d');
   const locate=p=>{const v=rotate(strikePoint,p.angles),scale=p.scale*9/(9-v[2]);p.offset=[contact[0]+p.x-v[0]*scale,contact[1]+p.y+v[1]*scale];return p;};
   function dust(t,reduced){
    if(!ink)return;ink.setTransform(embers.width/WIDTH,0,0,embers.height/HEIGHT,0,0);ink.clearRect(0,0,WIDTH,HEIGHT);if(reduced||t>=1)return;
    ink.globalCompositeOperation='lighter';
    for(let i=0;i<62;i++){
     const birth=.56+(i%16)/16*.29,age=(t-birth)/(.16+i%5*.013);if(age<=0||age>=1)continue;
     const origin=locate(pose(birth,false,side,motion)),local=i%3?[Math.sin(i*7.13)*.16,.5+(i%11)/11*2.5,-.08]:[Math.sin(i*5.31),Math.cos(i*3.19)*.4,.5];
     const v=rotate(local,origin.angles),scale=origin.scale*9/(9-v[2]),px=origin.offset[0]+v[0]*scale+Math.sin(i*2.39996)*age*38,py=origin.offset[1]-v[1]*scale-age*(24+i%7*4);
     ink.globalAlpha=Math.sin(age*Math.PI)*.8;ink.shadowColor='#ffd25a';ink.shadowBlur=7;ink.fillStyle=i%4?'#f8d27c':'#fff3be';ink.beginPath();ink.arc(px,py,(1.2+i%3*.45)*(1-age*.6),0,Math.PI*2);ink.fill();
    }
    ink.globalAlpha=1;ink.shadowBlur=0;ink.globalCompositeOperation='source-over';
   }
   return {canvas:node,draw(t,reduced=false){
    if(destroyed||!renderer)return;const p=locate(pose(t,reduced,side,motion)),timing=root.RunaForgeHammerStrike?.(reduced)||{impact:reduced?.4:.38},distance=clamp(t/timing.impact);
    node.dataset.phase=p.phase;shadow.style.opacity=String(p.opacity*(.12+.40*distance)*(1-Math.min(.5,Math.hypot(p.x,p.y)/150)));shadow.style.transform='translate(-50%,-50%) scale('+(1.4-.45*distance)+')';shadow.style.filter='blur('+(8-5*distance)+'px)';renderer.draw(p);dust(t,reduced);
   },destroy(){if(destroyed)return;destroyed=true;renderer?.destroy();shadow.remove();embers.remove();node.remove();}};
  }
 }};
})(globalThis);
