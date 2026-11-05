import {Geometry,multiply} from './renderer.js';
import {HYBRID} from './config.js';
// Revision 10: two decorative WebGL objects in the lower corners that react locally
// to click, touch or keyboard. They never read game state, send commands, play
// audio or change resources. The canvas keeps pointer-events:none; each object gets
// a dedicated transparent button placed over its projected footprint, and that
// button is withdrawn whenever it would overlap a card, HUD control or drop zone.
const gold=[.37,.235,.08],darkGold=[.2,.12,.04],steel=[.42,.44,.45],red=[.45,.06,.035],cream=[.52,.45,.3],globe=[.07,.16,.17];
const translate=(x,y,z)=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,x,y,z,1]);
const rotX=a=>{const c=Math.cos(a),s=Math.sin(a);return new Float32Array([1,0,0,0,0,c,s,0,0,-s,c,0,0,0,0,1]);};
const rotY=a=>{const c=Math.cos(a),s=Math.sin(a);return new Float32Array([c,0,-s,0,0,1,0,0,s,0,c,0,0,0,0,1]);};
const rotZ=a=>{const c=Math.cos(a),s=Math.sin(a);return new Float32Array([c,s,0,0,-s,c,0,0,0,0,1,0,0,0,0,1]);};
const chain=(...m)=>m.reduce((a,b)=>multiply(a,b));
const overlaps=(a,b,pad=0)=>a.x<b.x+b.w+pad&&a.x+a.w+pad>b.x&&a.y<b.y+b.h+pad&&a.y+a.h+pad>b.y;
// Everything that can receive game input, show HUD or act as a drop zone.
const OBSTACLES='#game button,#game a,#game .card,#game .player-band,#game .reserve-camp,#game .board,#game .lane-side,#game .deck-stack,#self-deck,#opponent-deck,#hand,#opponent-hand,#game .camp-log,#game .nartvanyr,#center-actions,#selection-panel:not([hidden]),.camp-utilities>*,.table-recovery';

function armillaryParts(){
 const base=new Geometry();base.cylinder(0,0,0,.52,.09,darkGold,3,28);base.cylinder(0,.09,0,.4,.05,gold,3,28);base.cylinder(0,.14,0,.07,.42,gold,3,12);base.cylinder(0,.56,0,.14,.05,gold,3,16);base.sphere(0,.9,0,.27,globe,3,18,10);base.cylinder(0,.62,0,.025,.56,steel,3,8);
 const ring=(radius,tube,color)=>{const g=new Geometry();g.torus(0,0,0,radius,tube,color,3,40,6);for(let i=0;i<4;i++){const a=i*Math.PI/2;g.box(Math.cos(a)*radius,0,Math.sin(a)*radius,.07,.07,.07,darkGold,3);}return g;};
 return {base,rings:[ring(.74,.032,gold),ring(.64,.028,[.42,.27,.1]),ring(.55,.026,gold)]};
}
function compassParts(){
 const body=new Geometry();body.cylinder(0,0,0,.56,.1,darkGold,3,32);body.torus(0,.11,0,.53,.045,gold,3,40,6);body.cylinder(0,.1,0,.5,.022,cream,0,32);
 for(let i=0;i<16;i++){const a=i*Math.PI/8,len=i%4?.06:.13,r=.42;body.box(Math.sin(a)*r,.124,-Math.cos(a)*r,i%4?.016:.03,.006,len,i%4?[.25,.19,.1]:[.16,.05,.03],0,-a);}
 body.cylinder(0,.122,0,.05,.03,gold,3,12);body.box(0,.13,-.6,.12,.08,.12,gold,3);
 const needle=new Geometry(),y=.15;needle.triangle([0,y,-.36],[-.055,y,0],[.055,y,0],red,3);needle.triangle([0,y,.32],[.055,y,0],[-.055,y,0],steel,3);needle.triangle([0,y+.012,-.36],[0,y+.035,0],[-.055,y,0],[.6,.1,.06],3);needle.triangle([0,y+.012,-.36],[.055,y,0],[0,y+.035,0],[.34,.04,.02],3);
 return {body,needle};
}

export function createProps({unproject,screen,redraw,reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches}){
 const layer=document.createElement('div');layer.className='hybrid-props';layer.hidden=true;document.body.append(layer);
 const parts={armillary:armillaryParts(),compass:compassParts()};
 const props=[
  {id:'armillary',label:'Girar a esfera armilar. Decoração local, não afeta a partida.',scale:1.18*HYBRID.visualScale,bounds:{r:.8,h:1.25},
   candidates:hand=>[[150,innerHeight-hand-118],[118,innerHeight-hand-84],[96,innerHeight*.74]],
   spin:[0,.6,1.9],velocity:[0,0,0],tilt:[.42,Math.PI/2,-.95]},
  {id:'compass',label:'Tocar a bússola. Decoração local, não afeta a partida.',scale:1.42*HYBRID.visualScale,bounds:{r:.62,h:.3},
   candidates:hand=>[[innerWidth-330,innerHeight-hand-84],[innerWidth-200,innerHeight-hand-120],[innerWidth-240,innerHeight*.66]],
   swing:null,hop:null,heading:0}
 ];
 let raf=0,frames=0,lastTick=0,enabled=false,disposed=false;const activations={armillary:0,compass:0},models=new Map();
 for(const p of props){const b=document.createElement('button');b.type='button';b.className='hybrid-prop';b.dataset.prop=p.id;b.setAttribute('aria-label',p.label);b.title=p.id==='armillary'?'Esfera armilar (decorativa)':'Bússola (decorativa)';b.hidden=true;
  // Local reaction only. The event still bubbles normally; nothing is sent.
  b.addEventListener('click',()=>activate(p));layer.append(b);p.button=b;}
 function busy(){return Boolean(document.querySelector('.drag-preview'))||Boolean(globalThis.RunaTargeting?.active?.());}
 function activate(p){if(disposed||!enabled||!p.anchor||busy())return;activations[p.id]++;const r=reduced(),now=performance.now();
  if(p.id==='armillary'){const kick=r?[.8,-1,.6]:[6.5,-8.5,4.8];p.velocity=p.velocity.map((v,i)=>Math.max(-14,Math.min(14,v+kick[i])));}
  else{p.swing={start:now,amplitude:(r?.35:1.9)*(activations.compass%2?1:-1),duration:r?380:2100};p.hop=r?null:{start:now,duration:340};}
  p.button.dataset.active='true';kick();}
 function kick(){if(!raf&&!disposed){lastTick=performance.now();raf=requestAnimationFrame(tick);}}
 function pose(p,now){const a=p.anchor,s=p.scale;if(!a)return false;let moving=false;
  if(p.id==='armillary'){const dt=Math.min(.05,(now-lastTick)/1000),decay=Math.exp(-(reduced()?6:1.7)*dt);for(let i=0;i<3;i++){p.spin[i]+=p.velocity[i]*dt;p.velocity[i]*=decay;if(Math.abs(p.velocity[i])<.03)p.velocity[i]=0;else moving=true;}
   const place=chain(translate(a[0],a[1],a[2]),new Float32Array([s,0,0,0,0,s,0,0,0,0,s,0,0,0,0,1])),centre=translate(0,.9,0);
   models.get('armillary-base').set(place);
   // Each tilted ring turns about the vertical axis at its own speed.
   models.get('armillary-ring-0').set(chain(place,centre,rotY(p.spin[0]),rotX(p.tilt[0])));
   models.get('armillary-ring-1').set(chain(place,centre,rotY(p.spin[1]),rotX(p.tilt[1])));
   models.get('armillary-ring-2').set(chain(place,centre,rotY(p.spin[2]),rotZ(p.tilt[2])));}
  else{let heading=0,lift=0,tip=0;if(p.swing){const t=(now-p.swing.start)/p.swing.duration;if(t<1){heading=p.swing.amplitude*Math.exp(-4.2*t)*Math.cos(t*Math.PI*5.5);moving=true;}else p.swing=null;}
   if(p.hop){const t=(now-p.hop.start)/p.hop.duration;if(t<1){lift=Math.sin(Math.PI*t)*.16;tip=Math.sin(Math.PI*t)*.12;moving=true;}else p.hop=null;}
   const place=chain(translate(a[0],a[1]+lift,a[2]),rotX(tip),new Float32Array([s,0,0,0,0,s,0,0,0,0,s,0,0,0,0,1]));models.get('compass-body').set(place);models.get('compass-needle').set(chain(place,rotY(heading)));p.heading=heading;}
  if(!moving)delete p.button.dataset.active;return moving;}
 function tick(now){raf=0;if(disposed||!enabled)return;let moving=false;for(const p of props)if(p.anchor)moving=pose(p,now)||moving;lastTick=now;frames++;redraw();if(moving)raf=requestAnimationFrame(tick);}
 // Called from the bridge build, after the camera is current. Returns extra meshes.
 function build(){
  if(disposed)return [];const show=innerWidth>1100&&innerHeight>=600;enabled=show;layer.hidden=!show;
  if(!show){for(const p of props){p.anchor=null;p.button.hidden=true;}cancelAnimationFrame(raf);raf=0;return [];}
  const hand=window.RunaHybridFan?.stats?.own?.visible||140,obstacles=[...document.querySelectorAll(OBSTACLES)].map(n=>n.getBoundingClientRect()).filter(r=>r.width&&r.height&&r.bottom>0&&r.top<innerHeight).map(r=>({x:r.x,y:r.y,w:r.width,h:r.height})),taken=[],meshes=[];
  for(const p of props){p.anchor=null;p.button.hidden=true;
   for(const [px,py] of p.candidates(hand)){const w=unproject(px,py,0),r=p.bounds.r*p.scale,h=p.bounds.h*p.scale,corners=[];for(const dx of [-r,r])for(const dz of [-r,r])for(const dy of [0,h])corners.push(screen([w[0]+dx,dy,w[2]+dz]));
    const x0=Math.min(...corners.map(c=>c.x)),y0=Math.min(...corners.map(c=>c.y)),x1=Math.max(...corners.map(c=>c.x)),y1=Math.max(...corners.map(c=>c.y)),cx=(x0+x1)/2,cy=(y0+y1)/2,bw=Math.max(44,x1-x0),bh=Math.max(44,y1-y0),box={x:cx-bw/2,y:cy-bh/2,w:bw,h:bh};
    if(box.x<4||box.y<4||box.x+box.w>innerWidth-4||box.y+box.h>innerHeight-4)continue;if(obstacles.some(o=>overlaps(box,o,6))||taken.some(o=>overlaps(box,o,6)))continue;
    p.anchor=[w[0],0,w[2]];p.box=box;taken.push(box);Object.assign(p.button.style,{left:box.x+'px',top:box.y+'px',width:box.w+'px',height:box.h+'px'});p.button.hidden=false;break;}
   if(!p.anchor)continue;
   if(p.id==='armillary'){for(const [key,geo] of [['armillary-base',parts.armillary.base],...parts.armillary.rings.map((g,i)=>['armillary-ring-'+i,g])]){if(!models.has(key))models.set(key,new Float32Array(16));meshes.push({geo,model:models.get(key)});}}
   else for(const [key,geo] of [['compass-body',parts.compass.body],['compass-needle',parts.compass.needle]]){if(!models.has(key))models.set(key,new Float32Array(16));meshes.push({geo,model:models.get(key)});}
   pose(p,performance.now());}
  if(props.some(p=>p.anchor&&p.button.dataset.active))kick();return meshes;}
 function dispose(){disposed=true;enabled=false;cancelAnimationFrame(raf);raf=0;layer.remove();}
 function hide(){enabled=false;layer.hidden=true;cancelAnimationFrame(raf);raf=0;}
 const api={build,dispose,hide,get stats(){return {enabled,animating:Boolean(raf),frames,activations:{...activations},visible:props.filter(p=>p.anchor&&!p.button.hidden).map(p=>p.id),boxes:Object.fromEntries(props.filter(p=>p.box&&p.anchor).map(p=>[p.id,{...p.box}])),armillarySpin:[...props[0].spin],compassHeading:props[1].heading};}};
 window.RunaHybridProps=api;return api;
}
