// Physical finishing for the table. These meshes never determine hit areas,
// card positions, camera or game state. Colours are linear, like the renderer.
import {Geometry} from './renderer.js';
import {MATERIALS as M} from './art-direction.js';

const darkBronze=[.16,.075,.025], highlight=[.68,.40,.15];
const tint=(c,n)=>c.map(v=>Math.min(1,v*n));
const outline=(w,d,cut)=>{
 const x=w/2,z=d/2,c=Math.min(cut,x*.45,z*.45);
 return [[-x+c,-z],[x-c,-z],[x,-z+c],[x,z-c],[x-c,z],[-x+c,z],[-x,z-c],[-x,-z+c]];
};
const point=(p,y,x,z)=>[p[0]+x,y,p[1]+z];

function join(g,a,ay,b,by,x,z,color,kind){
 for(let i=0;i<a.length;i++){const j=(i+1)%a.length;g.quad(point(a[i],ay,x,z),point(b[i],by,x,z),point(b[j],by,x,z),point(a[j],ay,x,z),color,kind);}
}

// A bevel has its own sloping faces and normals. It stays visible under a
// vertical camera without drawing a fake offset rectangle under the object.
function slab(g,x,y,z,w,h,d,color,kind=0,bevel=.035,cut=.08){
 const outer=outline(w,d,cut),inner=outline(w-2*bevel,d-2*bevel,Math.max(.01,cut-bevel*.55));
 const bottom=y-h/2,top=y+h/2,shoulder=top-Math.min(bevel,h*.6);
 join(g,outer,bottom,outer,shoulder,x,z,tint(color,.64),kind);
 join(g,outer,shoulder,inner,top,x,z,tint(color,1.22),kind);
 // One continuous UV plane: a separate 0..1 mapping per triangle would make
 // the wood edge shader draw bright diagonals across the recessed well.
 const uv=p=>[p[0]/w+.5,p[1]/d+.5];
 for(let i=0;i<inner.length;i++){const a=inner[(i+1)%inner.length],b=inner[i];g.triangle([x,top,z],point(a,top,x,z),point(b,top,x,z),color,kind,[[.5,.5],uv(a),uv(b)]);}
}

function frame(g,x,z,w,d,y,width,color,kind=3,cut=.06){
 const outer=outline(w,d,cut),shoulder=outline(w-.026,d-.026,cut),inner=outline(w-2*width,d-2*width,Math.max(.008,cut-width*.4));
 join(g,outer,y-.025,shoulder,y+.006,x,z,tint(color,1.2),kind);
 // Reverse inner/outer order so the top bevel faces the camera.
 join(g,shoulder,y+.006,inner,y-.007,x,z,color,kind);
 join(g,inner,y-.007,inner,y-.027,x,z,tint(color,.42),kind);
}

function rivet(g,x,y,z,r=.025){
 g.cylinder(x,y-.006,z,r*1.35,.007,darkBronze,3,8);
 g.cylinder(x,y,z,r,.012,M.metal,3,10,r*.72);
}

function cornerFittings(g,x,z,w,d,y,size=.18){
 for(const sx of [-1,1])for(const sz of [-1,1]){
  const cx=x+sx*(w/2-size/2),cz=z+sz*(d/2-size/2);
  slab(g,cx,y,cz,size,.026,size,darkBronze,3,.012,.035);
  g.triangle([cx-sx*size*.32,y+.016,cz-sz*size*.32],[cx+sx*size*.32,y+.016,cz-sz*size*.32],[cx-sx*size*.32,y+.016,cz+sz*size*.32],M.metal,3);
  rivet(g,cx,y+.018,cz,.018);
 }
}

function makeBoardFrame(g,x,z,w,d){
 // All of the relief fits within the existing board lip and outside play areas.
 frame(g,x,z,w+M.boardLip,d+M.boardLip,.062,.11,M.wood,1,.10);
 frame(g,x,z,w+.11,d+.11,.083,.025,M.metal,3,.065);
 cornerFittings(g,x,z,w+.18,d+.18,.09,.15);
}

function makePanel(g,a,{band=false}={}){
 slab(g,a.x,.065,a.z,a.w,.13,a.d,M.wood,1,.035,.12);
 // Matte leather in the original mounting: no blue enamel/specular sheen.
 slab(g,a.x,.14,a.z,a.w-.12,.04,a.d-.12,M.panel,4.1,.014,.075);
 frame(g,a.x,a.z,a.w-.025,a.d-.025,.154,.055,M.metal,3,.095);
 if(!band)cornerFittings(g,a.x,a.z,a.w-.055,a.d-.055,.17,.14);
}

function makeShelf(g,a,floor=0){
 slab(g,a.x,.065,a.z,a.w,.13,a.d,M.wood,1,.025,.085);
 slab(g,a.x,.148,a.z,a.w-.14,.025,a.d-.14,M.shelf,1,.012,.05);
 // Continuous rails, recessed well and iron corner shoes instead of a flat line.
 // Round 3 (owner): the edge toward the owner's Patron is a thick plank the cards rest on (floor = +1 own shelf, −1 rival).
 for(const sz of [-1,1]){if(sz===floor){const depth=.32,z=a.z+sz*(a.d/2-depth/2);slab(g,a.x,.165,z,a.w,.15,depth,M.wood,1,.03,.03);slab(g,a.x,.243,z-sz*.02,a.w-.04,.008,depth-.07,[.42,.25,.12],1,.004,.02);slab(g,a.x,.12,a.z+sz*(a.d/2-.012),a.w,.07,.024,[.08,.045,.022],1,.01,.01);}else slab(g,a.x,sz<0?.205:.16,a.z+sz*(a.d/2-.035),a.w,.09,.10,M.wood,1,.024,.025);}
 for(const sx of [-1,1])slab(g,a.x+sx*(a.w/2-.035),.18,a.z,.10,.14,a.d,M.wood,1,.022,.025);
 frame(g,a.x,a.z,a.w-.01,a.d-.01,.178,.022,darkBronze,3,.05);
 cornerFittings(g,a.x,a.z,a.w-.03,a.d-.03,.20,.13);
}

// Make each book once in local space. Every rebuild only places this cached mesh.
function transformInto(target,source,x,y,z,angle=0,scale=1){
 const c=Math.cos(angle),s=Math.sin(angle),data=source.data;
 if(angle===0&&scale===1){
  for(let i=0;i<data.length;i+=12)target.data.push(x+data[i],y+data[i+1],z+data[i+2],data[i+3],data[i+4],data[i+5],data[i+6],data[i+7],data[i+8],data[i+9],data[i+10],data[i+11]);
  return;
 }
 for(let i=0;i<data.length;i+=12){
  target.data.push(x+scale*(data[i]*c+data[i+2]*s),y+scale*data[i+1],z+scale*(-data[i]*s+data[i+2]*c),data[i+3]*c+data[i+5]*s,data[i+4],-data[i+3]*s+data[i+5]*c,data[i+6],data[i+7],data[i+8],data[i+9],data[i+10],data[i+11]);
 }
}

// Normal state updates reuse the static joinery. The bound also prevents a
// resize or focus transition from retaining a mesh for every intermediate size.
const joinery=new Map();
function cached(g,key,x,z,build){
 let mesh=joinery.get(key);
 if(!mesh){mesh=new Geometry();build(mesh);joinery.set(key,mesh);if(joinery.size>24)joinery.delete(joinery.keys().next().value);}
 transformInto(g,mesh,x,0,z);
}
export function boardFrame(g,x,z,w,d){cached(g,`board:${w}:${d}`,x,z,m=>makeBoardFrame(m,0,0,w,d));}
export function panel(g,a,{band=false}={}){cached(g,`panel:${a.w}:${a.d}:${band}`,a.x,a.z,m=>makePanel(m,{...a,x:0,z:0},{band}));}
export function shelf(g,a,floor=0){cached(g,`shelf:${a.w}:${a.d}:${floor}`,a.x,a.z,m=>makeShelf(m,{...a,x:0,z:0},floor));}

function segment(g,x1,z1,x2,z2,y,width,color){
 const dx=x2-x1,dz=z2-z1;
 g.box((x1+x2)/2,y,(z1+z2)/2,width,.009,Math.hypot(dx,dz),color,3,Math.atan2(dx,dz));
}

function book(){
 const g=new Geometry(),cover=[.17,.043,.026],paper=[.58,.43,.23];
 slab(g,0,.026,0,1.48,.052,1.88,cover,4.4,.024,.08);
 slab(g,.015,.111,0,1.35,.13,1.72,paper,4.1,.018,.055);
 // Page edges have small, irregular differences in tone rather than black stripes.
 for(let i=0;i<5;i++){
  const y=.06+i*.023;
  g.box(.015,y,.862,1.28,.003,.006,tint(paper,.65+i*.045),0);
  g.box(.692,y,0,.006,.003,1.63,tint(paper,.75),0);
 }
 slab(g,0,.19,0,1.50,.065,1.90,cover,4.4,.029,.085);
 slab(g,-.70,.116,0,.12,.20,1.86,tint(cover,.65),4.4,.025,.04);
 for(const z of [-.62,-.22,.22,.62])slab(g,-.696,.126,z,.145,.22,.075,darkBronze,3,.018,.025);
 frame(g,.025,0,1.23,1.64,.225,.018,M.metal,3,.10);
 cornerFittings(g,.025,0,1.30,1.72,.23,.18);
 // Runamarca's diamond seal, embossed into the leather, without borrowed artwork.
 const rune=[[0,-.34],[.25,0],[0,.34],[-.25,0],[0,-.34]];
 for(let i=0;i<4;i++)segment(g,...rune[i],...rune[i+1],.238,.027,M.metal);
 segment(g,-.12,0,0,-.17,.241,.019,highlight);segment(g,0,-.17,.12,0,.241,.019,highlight);
 segment(g,.12,0,0,.17,.241,.019,highlight);segment(g,0,.17,-.12,0,.241,.019,highlight);
 // Clasp and a short ribbon remain inside the previously reserved prop bounds.
 slab(g,.57,.237,.04,.30,.035,.18,darkBronze,3,.014,.035);
 rivet(g,.62,.261,.04,.027);
 g.box(.30,.034,.93,.10,.015,.19,[.035,.06,.12]);
 return g;
}
let bookMesh,bookStack;
export function books(g,x,z,scale=1){
 if(!bookStack){bookMesh=book();bookStack=new Geometry();for(let i=0;i<3;i++)transformInto(bookStack,bookMesh,(i-1)*.025,i*.145,0,.055*(i-1)-.06,.98+i*.01);}
 transformInto(g,bookStack,x,0,z,0,scale);
}

function waxBody(g){
 const wax=[.74,.56,.31],n=32,base=.48,top=1.13;
 const h=i=>top+.017*Math.sin(i*2.7)+.013*Math.sin(i*.9);
 const p=(i,r,y)=>[Math.cos(i/n*Math.PI*2)*r,y,Math.sin(i/n*Math.PI*2)*r];
 for(let i=0;i<n;i++){
  const j=(i+1)%n,hi=h(i),hj=h(j);
  g.quad(p(i,.215,base),p(i,.225,hi),p(j,.225,hj),p(j,.215,base),wax,4.2);
  g.quad(p(i,.225,hi),p(i,.095,top-.045),p(j,.095,top-.045),p(j,.225,hj),tint(wax,1.08),4.2);
  g.triangle([0,top-.052,0],p(j,.095,top-.045),p(i,.095,top-.045),[.29,.17,.065],4.2);
 }
 // A handful of wax runs, broad enough to read at the actual display size.
 for(const [angle,length,r] of [[.45,.18,.043],[1.8,.29,.046],[3.4,.13,.037],[4.6,.23,.04],[5.5,.11,.035]]){
  const x=Math.cos(angle)*.216,z=Math.sin(angle)*.216;
  g.cylinder(x,top-length,z,r,length-.035,tint(wax,1.06),4.2,9,r*.8);
  g.sphere(x,top-length,z,r,tint(wax,1.06),4.2,10,5);
 }
 g.cylinder(0,top-.04,0,.016,.10,[.025,.012,.007],0,8);
}

function candle(){
 const g=new Geometry();
 g.cylinder(0,.005,0,.41,.045,darkBronze,3,32,.43);
 g.torus(0,.054,0,.39,.032,M.metal,3,32,6);
 g.cylinder(0,.04,0,.34,.045,M.metal,3,32,.26);
 g.cylinder(0,.085,0,.15,.10,darkBronze,3,24,.10);
 g.cylinder(0,.18,0,.10,.17,M.metal,3,24,.12);
 g.torus(0,.22,0,.115,.022,highlight,3,24,6);
 g.cylinder(0,.35,0,.12,.08,darkBronze,3,24,.29);
 g.cylinder(0,.43,0,.29,.035,M.metal,3,32,.32);
 g.cylinder(0,.467,0,.28,.008,[.07,.035,.011],3,32);
 g.torus(0,.47,0,.295,.023,M.metal,3,32,6);
 waxBody(g);return g;
}
function flame(){
 const g=new Geometry(),levels=[[1.16,.025,0],[1.21,.068,0],[1.28,.049,.014],[1.37,0,.038]],n=16;
 for(let l=0;l<levels.length-1;l++){
  const [ya,ra,xa]=levels[l],[yb,rb,xb]=levels[l+1];
  for(let i=0;i<n;i++){
   const a=i/n*Math.PI*2,b=(i+1)/n*Math.PI*2;
   const p=(t,r,y,x)=>[x+Math.cos(t)*r,y,Math.sin(t)*r*.72];
   const c=l===0?[1,.28,.018]:l===1?[1,.65,.10]:[1,.86,.42];
   g.quad(p(a,ra,ya,xa),p(a,rb,yb,xb),p(b,rb,yb,xb),p(b,ra,ya,xa),c,5);
  }
 }
 return g;
}
let candleMesh,flameMesh;
export function candleHolder(g,glow,x,z,scale=1){
 candleMesh??=candle();flameMesh??=flame();
 transformInto(g,candleMesh,x,0,z,0,scale);
 // The luminous flame is drawn with the normal geometry, but casts no solid shadow.
 transformInto(glow,flameMesh,x,0,z,0,scale);
}
