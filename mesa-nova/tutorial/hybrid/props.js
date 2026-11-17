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
const OBSTACLES='#game button,#game a,#game .card,#game .player-band,#game .reserve-camp,#game .board,#game .lane-side,#game .deck-stack,#self-deck,#opponent-deck,#hand,#opponent-hand,#game .camp-log,#game .nartvanyr,#center-actions,#selection-panel:not([hidden]),.camp-utilities>*,.table-recovery,#registro-trilho:not([hidden])';

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

// 10/11/2026 (dono): a vela ganha uma lanterna de bronze em volta (base, quatro hastes, tampa e alça). O toque a faz
// balançar em torno da chama, que não sai do lugar. A vela e a luz continuam sendo as da mesa (bridge.js).
function lanternParts(){
 const g=new Geometry(),R=.62,H=1.62;g.torus(0,.03,0,R,.045,gold,3,36,6);g.cylinder(0,0,0,R+.04,.03,darkGold,3,36);
 for(let i=0;i<4;i++){const a=Math.PI/4+i*Math.PI/2,x=Math.cos(a)*R,z=Math.sin(a)*R;g.cylinder(x,.03,z,.035,H-.03,gold,3,8);g.sphere(x,H,z,.055,darkGold,3,8,6);}
 g.torus(0,H*.52,0,R,.02,darkGold,3,36,6);g.torus(0,H,0,R,.04,gold,3,36,6);
 g.cylinder(0,H+.02,0,R+.05,.26,darkGold,3,28,.2);g.cylinder(0,H+.28,0,.2,.09,gold,3,16,.12);g.sphere(0,H+.42,0,.07,gold,3,10,6);
 const handle=new Geometry();handle.torus(0,0,0,.2,.022,gold,3,24,6);
 return {body:g,handle,pivot:1.25,top:H+.5};
}
export function createProps({unproject,screen,redraw,reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches}){
 const layer=document.createElement('div');layer.className='hybrid-props';layer.hidden=true;document.body.append(layer);
 const parts={armillary:armillaryParts(),compass:compassParts(),lantern:lanternParts()},fixed={},corner=()=>(innerHeight<=820?HYBRID.props?.cornerScaleShort:HYBRID.props?.cornerScale)||1;
 const props=[
  {id:'armillary',title:'Esfera armilar (decorativa)',label:'Girar a esfera armilar. Decoração local, não afeta a partida.',base:1.18*HYBRID.visualScale,scale:1.18*HYBRID.visualScale,bounds:{r:.8,h:1.25},
   /* 11/11/2026: com o Registro vertical na esquerda, a esfera também pode descer abaixo da calha */candidates:hand=>[[innerWidth*.13,innerHeight-hand-150],[190,innerHeight-hand-140],[150,innerHeight-hand-118],[118,innerHeight-hand-84],[96,innerHeight*.74],[innerWidth*.13,innerHeight-hand-55],[150,innerHeight-hand-50],[96,innerHeight-hand-40],[80,innerHeight*.9]],
   spin:[0,.6,1.9],velocity:[0,0,0],tilt:[.42,Math.PI/2,-.95]},
  {id:'compass',title:'Bússola (decorativa)',label:'Tocar a bússola. Decoração local, não afeta a partida.',base:1.42*HYBRID.visualScale,scale:1.42*HYBRID.visualScale,bounds:{r:.62,h:.3},
   candidates:hand=>[[innerWidth*.86,innerHeight-hand-140],[innerWidth-330,innerHeight-hand-84],[innerWidth-200,innerHeight-hand-120],[innerWidth-240,innerHeight*.66]],
   swing:null,hop:null,heading:0},
  // Lugar fixo, dado pela mesa (place): a lanterna é sempre desenhada; o botão só aparece onde não cobre nada do jogo.
  {id:'lantern',title:'Lanterna (decorativa)',label:'Balançar a lanterna. Decoração local, não afeta a partida.',scale:1,bounds:{r:.66,h:2.1},always:true,candidates:()=>fixed.lantern?[fixed.lantern.pixel]:[],sway:null,angle:0},
  {id:'diary',title:'Diário de caça',label:'Abrir uma página do diário de caça. Decoração local, não afeta a partida.',scale:1,bounds:{r:.5,h:.3},mesh:false,candidates:()=>fixed.diary?[fixed.diary.pixel,[fixed.diary.pixel[0]-14,fixed.diary.pixel[1]-10]]:[]}
 ];
 let raf=0,frames=0,lastTick=0,enabled=false,disposed=false;const activations={armillary:0,compass:0,lantern:0,diary:0},models=new Map();
 for(const p of props){const b=document.createElement('button');b.type='button';b.className='hybrid-prop';b.dataset.prop=p.id;b.setAttribute('aria-label',p.label);b.title=p.title;b.hidden=true;
  // Local reaction only. The event still bubbles normally; nothing is sent.
  b.addEventListener('click',()=>activate(p));layer.append(b);p.button=b;}
 function busy(){return Boolean(document.querySelector('.drag-preview'))||Boolean(globalThis.RunaTargeting?.active?.());}
 function activate(p){if(disposed||!enabled||!p.anchor||busy())return;activations[p.id]++;const r=reduced(),now=performance.now();
  if(p.id==='armillary'){const kick=r?[.8,-1,.6]:[6.5,-8.5,4.8];p.velocity=p.velocity.map((v,i)=>Math.max(-14,Math.min(14,v+kick[i])));}
  else if(p.id==='lantern')p.sway={start:now,amplitude:(r?.03:.2)*(activations.lantern%2?1:-1),duration:r?300:2600};
  else if(p.id==='diary'){openDiary(p.button);return;}
  else{p.swing={start:now,amplitude:(r?.35:1.9)*(activations.compass%2?1:-1),duration:r?380:2100};p.hop=r?null:{start:now,duration:340};}
  p.button.dataset.active='true';kick();}
 function kick(){if(!raf&&!disposed){lastTick=performance.now();raf=requestAnimationFrame(tick);}}
 // Diário: cada toque abre uma página com a anotação de uma carta dos decks desta partida (texto público do catálogo).
 let lore=null,page=0,note=null;
 function openDiary(opener){
  lore??=fetch((typeof gameBase==='string'?gameBase:'/runamarca/')+'cartas.json').then(r=>r.json()).then(c=>{const decks=typeof state!=='undefined'&&state?.players?c.decks.filter(d=>state.players.some(p=>p.deckId===d.id)):[],pick=d=>d.cards.filter(x=>x.narrative).map(x=>({name:x.name,text:x.narrative,deck:d.name}));const mine=decks.flatMap(pick);return mine.length?mine:c.decks.flatMap(pick);}).catch(()=>[]);
  lore.then(list=>{if(disposed)return;if(!note){note=document.createElement('dialog');note.id='diary-note';note.className='diary-note';note.setAttribute('aria-labelledby','diary-note-title');
    note.innerHTML='<h2 id="diary-note-title">Diário de caça</h2><p class="diary-note-name"></p><p class="diary-note-text"></p><p class="diary-note-foot"></p><div class="diary-note-actions"><button type="button" class="diary-note-next">Virar a página</button><button type="button" class="diary-note-close primary">Fechar</button></div>';document.body.append(note);
    note.querySelector('.diary-note-close').onclick=()=>note.close();note.querySelector('.diary-note-next').onclick=()=>{page++;fill(list);};note.addEventListener('close',()=>note.opener?.focus?.({preventScroll:true}));note.addEventListener('click',e=>{if(e.target===note)note.close();});}
   note.opener=opener;fill(list);if(!note.open)note.showModal();note.querySelector('.diary-note-close').focus({preventScroll:true});});
  function fill(list){const item=list.length?list[page%list.length]:null;note.querySelector('.diary-note-name').textContent=item?item.name:'Páginas em branco';note.querySelector('.diary-note-text').textContent=item?item.text:'Nada foi anotado ainda.';note.querySelector('.diary-note-foot').textContent=item?item.deck+' · página '+(page%list.length+1)+' de '+list.length:'';note.querySelector('.diary-note-next').hidden=list.length<2;}
 }
 function pose(p,now){const a=p.anchor,s=p.scale;if(!a)return false;let moving=false;
  if(p.id==='diary')return false;
  if(p.id==='lantern'){let angle=0;if(p.sway){const t=(now-p.sway.start)/p.sway.duration;if(t<1){angle=p.sway.amplitude*Math.exp(-3.4*t)*Math.cos(t*Math.PI*7);moving=true;}else p.sway=null;}p.angle=angle;
   const L=parts.lantern,scale=new Float32Array([s,0,0,0,0,s,0,0,0,0,s,0,0,0,0,1]),swing=chain(translate(a[0],0,a[2]),scale,translate(0,L.pivot,0),rotZ(angle),rotX(angle*.45),translate(0,-L.pivot,0));
   const handle=chain(swing,translate(0,L.top+.12,0),rotX(Math.PI/2+angle*1.6));models.get('lantern-body').set(swing);models.get('lantern-handle').set(handle);
   {const k=1-.65*Math.max(0,Math.min(1,globalThis.RunaHybridFocus?.value||0)),squash=chain(translate(a[0],0,a[2]),new Float32Array([1,0,0,0,0,k,0,0,0,0,1,0,0,0,0,1]),translate(-a[0],0,-a[2]));models.get('lantern-body-shadow')?.set(chain(squash,swing));models.get('lantern-handle-shadow')?.set(chain(squash,handle));}if(!moving)delete p.button.dataset.active;return moving;}
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
  // 11/11/2026 (fluidez): cada montagem da cena escondia e reexibia os botões dos objetos (dois atributos trocados por
  // objeto, a cada jogada); cada troca invalida o estilo da página. Agora só se escreve o que mudou.
  if(disposed)return [];const show=innerWidth>1100&&innerHeight>=600;enabled=show;if(layer.hidden!==!show)layer.hidden=!show;
  if(!show){for(const p of props){p.anchor=null;if(!p.button.hidden)p.button.hidden=true;}cancelAnimationFrame(raf);raf=0;return [];}
  const hand=window.RunaHybridFan?.stats?.own?.visible||140,obstacles=[...document.querySelectorAll(OBSTACLES)].map(n=>n.getBoundingClientRect()).filter(r=>r.width&&r.height&&r.bottom>0&&r.top<innerHeight).map(r=>({x:r.x,y:r.y,w:r.width,h:r.height})),taken=[],meshes=[];
  for(const p of props){p.anchor=null;let shown=false;if(fixed[p.id])p.scale=fixed[p.id].scale;else if(p.base)p.scale=p.base*corner();
   for(const [px,py] of p.candidates(hand)){const w=unproject(px,py,0),r=p.bounds.r*p.scale,h=p.bounds.h*p.scale,corners=[];for(const dx of [-r,r])for(const dz of [-r,r])for(const dy of [0,h])corners.push(screen([w[0]+dx,dy,w[2]+dz]));
    const x0=Math.min(...corners.map(c=>c.x)),y0=Math.min(...corners.map(c=>c.y)),x1=Math.max(...corners.map(c=>c.x)),y1=Math.max(...corners.map(c=>c.y)),cx=(x0+x1)/2,cy=(y0+y1)/2,bw=Math.max(44,x1-x0),bh=Math.max(44,y1-y0),box={x:cx-bw/2,y:cy-bh/2,w:bw,h:bh};
    const blocked=box.x<4||box.y<4||box.x+box.w>innerWidth-4||box.y+box.h>innerHeight-4||obstacles.some(o=>overlaps(box,o,6))||taken.some(o=>overlaps(box,o,6));
    if(blocked&&!p.always)continue;
    p.anchor=[w[0],0,w[2]];p.box=box;if(!blocked){taken.push(box);const st=p.button.style;for(const [k,v] of [['left',box.x],['top',box.y],['width',box.w],['height',box.h]])if(st[k]!==v+'px')st[k]=v+'px';shown=true;}break;}
   if(p.button.hidden!==!shown)p.button.hidden=!shown;
   if(!p.anchor||p.mesh===false)continue;
   /* 12/11/2026 (dono): o lampião tem sombra própria, que balança com ele (a que ficava era a da vela de dentro). Ela é desenhada por uma cópia só de sombra (shadowOnly) que, no zoom do combate, encolhe na altura até 35% — a sombra encurta em vez de cruzar o campo ampliado — e volta ao tamanho natural no fim. */if(p.id==='lantern'){for(const [key,geo] of [['lantern-body',parts.lantern.body],['lantern-handle',parts.lantern.handle]]){if(!models.has(key))models.set(key,new Float32Array(16));if(!models.has(key+'-shadow'))models.set(key+'-shadow',new Float32Array(16));meshes.push({geo,model:models.get(key),castShadow:false},{geo,model:models.get(key+'-shadow'),shadowOnly:true});}pose(p,performance.now());continue;}
   if(p.id==='armillary'){for(const [key,geo] of [['armillary-base',parts.armillary.base],...parts.armillary.rings.map((g,i)=>['armillary-ring-'+i,g])]){if(!models.has(key))models.set(key,new Float32Array(16));meshes.push({geo,model:models.get(key)});}}
   else for(const [key,geo] of [['compass-body',parts.compass.body],['compass-needle',parts.compass.needle]]){if(!models.has(key))models.set(key,new Float32Array(16));meshes.push({geo,model:models.get(key)});}
   pose(p,performance.now());}
  if(props.some(p=>p.anchor&&p.button.dataset.active))kick();return meshes;}
 function dispose(){disposed=true;enabled=false;cancelAnimationFrame(raf);raf=0;layer.remove();note?.remove();}
 function hide(){enabled=false;layer.hidden=true;cancelAnimationFrame(raf);raf=0;}
 // Lugar e escala dos objetos que a própria mesa posiciona (lanterna sobre a vela, diário sobre os livros); null retira.
 function place(id,pixel,scale=1){if(pixel)fixed[id]={pixel:[pixel[0],pixel[1]],scale};else delete fixed[id];}
 const api={build,place,dispose,hide,get stats(){return {enabled,animating:Boolean(raf),frames,activations:{...activations},visible:props.filter(p=>p.anchor&&!p.button.hidden).map(p=>p.id),boxes:Object.fromEntries(props.filter(p=>p.box&&p.anchor).map(p=>[p.id,{...p.box}])),armillarySpin:[...props[0].spin],compassHeading:props[1].heading,lanternAngle:props[2].angle,diaryOpen:!!note?.open};}};
 window.RunaHybridProps=api;return api;
}
