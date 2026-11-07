import {MATERIALS} from "./art-direction.js";
import * as craft from "./table-craft.js";
import {installLifecycle} from './lifecycle.js';
import {installFlights} from './flights.js';
import {fitLayout,playScale,invalidateFit,compositionApplied} from './layout.js';
import './hand.js';
import {layoutRivalHand} from './fan-layout.js';
import {CardPlanes,matrix,elementQuad} from './card-plane.js';
import {Renderer,Geometry,V,lookAt,perspective,multiply,project} from './renderer.js';
import {createProps} from './props.js';
import {installImpacts} from './impact.js';
import {HYBRID} from './config.js';
import {installFocus} from './focus.js';
// UI-owner revision (presentation only): green = playable now, choice stage, and the
// post-combat return with flat faces measured on the visible table faces.
import './availability.js';
import './choices.js';
import './returns.js';
import {installRegistro} from './registro.js';
import './emana-read.js';
// The scene consumes layout only. Commands, private state and event timelines
// remain in the existing app. This is not a second copy of the game engine.
const game=document.getElementById('game'),canvas=document.createElement('canvas');canvas.className='hybrid-canvas';canvas.setAttribute('aria-hidden','true');game.prepend(canvas);
// Formation addendum B: veil over the WebGL decoration during the focus (above the canvas, below every DOM layer).
const veil=document.createElementNS('http://www.w3.org/2000/svg','svg');veil.setAttribute('class','hybrid-focus-veil');veil.setAttribute('aria-hidden','true');veil.innerHTML='<path fill-rule="evenodd"/>';canvas.after(veil);let focusApi=null,focusMetrics=null,lastDeckQuads={};const focusShifted=new Set();const focusValue=()=>focusApi?.value||0;
const recovery=document.createElement('section');recovery.className='table-recovery';recovery.hidden=true;recovery.setAttribute('role','alert');
recovery.innerHTML='<h2>A mesa 3D foi interrompida</h2><p>Seu lugar na partida continua reservado. Tentando recuperar a imagem…</p><button type="button">Tentar novamente</button><button type="button">Recarregar</button>';
document.body.append(recovery);const recoveryText=recovery.querySelector('p'),[retryButton,reloadButton]=recovery.querySelectorAll('button');
let recoveryTimer=0,recoveryFocus=null,recoveries=0,recovering=false,contextRecovery=null,contextInvalidated=false;
retryButton.onclick=retryScene;reloadButton.onclick=()=>location.reload();
function updateRecovery(){recovery.hidden=!failed||game.hidden;}
// Round 3 (owner, combat lag): most rebuilds during combat only change DOM content (health, text); the WebGL scene they
// produce is identical. A fingerprint of the mesh values (strided), the camera, the lamp and the canvas size decides whether
// the scene is uploaded and drawn again (with its GPU sync); identical scenes are not redrawn.
let lastDrawKey=null,skippedDraws=0;
// Round 4 (owner, combat reveal lag): incremental rebuild. A full build() lays out the whole table (field, sockets,
// panels, decks, props, lamp) and only then adds the card slabs. When nothing that layout depends on has changed —
// same viewport, focus, zoom, classes and the same nodes with the same layout boxes (layoutKey) — the static part of
// the scene is reused as it was produced, and only the card-dependent steps run again (card planes and slabs, reserve
// overlaps, target links, rival hand, veil, props, draw). The mesh is the same array in the same order (static part
// before the cards + new slabs + static part after the cards), so the image is the same. Anything else (resize, fit,
// focus frames, new panels or sockets, recovery) still runs the full build.
// QA: window.__HYBRID_VERIFY_INCREMENTAL runs the full build right after every incremental one and compares the mesh
// values and the inline styles of the page; mismatches are reported in RunaHybrid.stats.incremental.
let sceneCache=null,fullOnly=false;const incremental={full:0,cards:0,verified:0,mismatches:[],lastReason:''};
const nodeIds=new WeakMap();let nodeSerial=0;const nodeId=n=>{if(!n)return 0;let id=nodeIds.get(n);if(!id)nodeIds.set(n,id=++nodeSerial);return id;};
const KEY_NODES='#lanes,#lanes>.lane,#lanes>.lane>.lane-side,#game .board,.board .emanation-column,.board .emanation-column>span,#self-emana,#opponent-emana,#self-emana>*,#opponent-emana>*,.emana-empty,.spell-dock>.spell-mark,.reserve-camp,.reserve-camp .card-row,.player-band,.player-band .patron-center,.player-band .patron-avatar,.player-band .patron-ether,.player-band .patron-equipment,.player-band .patron-power,.nartvanyr,#center-actions,#camp-log,#self-deck,#opponent-deck';
// Nodes the full build only measures (never writes): their identity does not matter, only their layout boxes.
let animatingSerial=0;const READ_ONLY_KEY=new Set(['patron-avatar','patron-power']);
// Each node is keyed by its own layout box (offsets ignore the transforms the build writes on it) and by the screen
// box of its parent, which carries every ancestor transform (entry animations, shakes, focus shifts).
function layoutKey(){
 const r=n=>{if(!n)return '-';const b=n.getBoundingClientRect();return [b.x,b.y,b.width,b.height].map(v=>Math.round(v*100)/100).join(',');};
 const parts=[innerWidth,innerHeight,devicePixelRatio,scrollY,focusValue(),focusApi?.target??'',playScale(),compositionApplied(),game.className,document.body.className,r(game),r(document.querySelector('#game .board')),r(document.getElementById('lanes'))];
 let animating=false;for(const n of document.querySelectorAll(KEY_NODES)){if(!animating&&n.getAnimations().some(x=>x.playState==='running'))animating=true;parts.push((n.id||n.classList[0]||n.tagName)+'#'+(READ_ONLY_KEY.has(n.classList[0])?'r':nodeId(n))+':'+n.offsetLeft+','+n.offsetTop+','+n.offsetWidth+','+n.offsetHeight+':'+nodeId(n.offsetParent)+'@'+r(n.parentElement)+(n.hidden?'h':'')+(n.open?'o':'')+(n.dataset?.empty??''));}
 // A node animating by itself (entry animations) moves without changing any box above: never reuse the static part then.
 if(animating)parts.push('animating#'+(++animatingSerial));
 return parts.join('|');}
// Diagnostics only: the first differing part of two layout keys (why a full build was needed).
function keyDiff(a,b){const x=a.split('|'),y=b.split('|');if(x.length!==y.length)return 'nodes '+x.length+'→'+y.length;for(let i=0;i<x.length;i++)if(x[i]!==y[i])return i+': '+x[i].slice(0,70)+' → '+y[i].slice(0,70);return '';}
function invalidateScene(){sceneCache=null;}
// alignActions reads the previous deck footprints, before this build updates them.
// Keep those INPUT bounds with the cached scene: a changed footprint needs one
// more full pass to settle the confirmation panel, even if the DOM key is unchanged.
const deckInputKey=()=>JSON.stringify(lastDeckQuads);
// Round 4 (reveal lag): a task often rebuilds twice (the lifecycle syncs before and after hiding the targets of a
// neighbour slide) and only the last WebGL image is ever presented. The draw is requested by every build and runs
// once, in a microtask at the end of the current task (before the frame is rendered), with the latest scene; a
// scene identical to the one on screen (drawKey) is still not drawn. Errors go to the same recovery path.
let pendingDraw=null,drawQueued=false;
function requestDraw(meshes,key){
 if(pendingDraw?pendingDraw.key===key:key===lastDrawKey){skippedDraws++;lastMetrics={...lastMetrics,skippedDraws};return;}
 if(pendingDraw&&key===lastDrawKey){pendingDraw=null;skippedDraws++;lastMetrics={...lastMetrics,skippedDraws};return;}
 pendingDraw={meshes,key};if(window.__HYBRID_SYNC_DRAW){flushDraw();return;}if(!drawQueued){drawQueued=true;queueMicrotask(flushDraw);}}
function flushDraw(){drawQueued=false;const p=pendingDraw;pendingDraw=null;if(!p||failed||game.hidden||!renderer)return;
 try{renderer.setMeshes(p.meshes);const m=renderer.draw(vp,eye);lastMetrics={...m,bridgeMs:lastMetrics.bridgeMs,buildKind:lastMetrics.buildKind,cardFloats:lastMetrics.cardFloats,deferredDraw:true};lastDrawKey=p.key;skippedDraws=0;draws++;}
 catch(error){showRecovery(error.message);}}
let draws=0;
// Declarations are compared as a set: the same declarations in another order are the same style.
function snapshotStyles(){const out=[];for(const n of document.body.querySelectorAll('[style]'))out.push(nodeId(n)+'['+(n.id?'#'+n.id:n.tagName+'.'+(n.getAttribute('class')||''))+']='+n.getAttribute('style').split(';').map(x=>x.trim()).filter(Boolean).sort().join('; '));return out;}
function buildCards(started){
 canvas.style.visibility='visible';formatPhase();scaleRivalShelf();
 const g=new Geometry();g.data=sceneCache.a.slice();
 for(const row of document.querySelectorAll('.reserve-camp .card-row')){const cards=[...row.querySelectorAll(':scope>.card')];if(cards.length>1){const gap=parseFloat(getComputedStyle(row).gap)||0,value=Math.min(0,(row.clientWidth-cards.length*cards[0].offsetWidth-(cards.length-1)*gap)/(cards.length-1))+'px';if(row.style.getPropertyValue(OVERLAP)!==value)row.style.setProperty(OVERLAP,value);}}

 cardPlanes.update({geometry:g,surface,footprint,field,sockets});
 if(typeof renderTargetLinks==='function')renderTargetLinks();
 const cardsData=g.data.length-sceneCache.a.length;for(const v of sceneCache.b)g.data.push(v);
 layoutRivalHand();updateVeil();{const meshes=[{geo:g},...(sceneCache.glow.data.length?[{geo:sceneCache.glow,castShadow:false}]:[]),...(props?props.build():[])],key=drawKey(meshes);requestDraw(meshes,key);}
 window.RunaCardEffects?.reposition?.();window.RunaPlatinumEntry?.refreshProtocol?.();lastMetrics.bridgeMs=performance.now()-started;lastMetrics.buildKind='cards';lastMetrics.cardFloats=cardsData;builds++;incremental.cards++;RunaGeometry.changed();active=true;dirty=false;tableObserver?.takeRecords();
 if(window.__HYBRID_VERIFY_INCREMENTAL){const data=g.data.slice(),styles=snapshotStyles();fullOnly=true;try{build();}finally{fullOnly=false;}const full=sceneCache?.fullData,fullStyles=snapshotStyles();incremental.verified++;let firstDiff=-1;if(!full||full.length!==data.length)firstDiff=-2;else for(let i=0;i<data.length;i++)if(full[i]!==data[i]){firstDiff=i;break;}const sa=new Set(styles),sb=new Set(fullStyles),onlyInc=styles.filter(x=>!sb.has(x)),onlyFull=fullStyles.filter(x=>!sa.has(x));if(firstDiff!==-1||onlyInc.length||onlyFull.length){const m={build:builds,phase:typeof state==='undefined'?null:state.phase,animations:document.getAnimations().filter(a=>a.playState!=='finished').map(a=>({target:a.effect?.target?.id||a.effect?.target?.className,state:a.playState,pending:a.pending,time:a.currentTime})).slice(0,20),meshLength:[data.length,full?.length??null],firstDiff,onlyIncremental:onlyInc.slice(0,4).map(x=>x.slice(0,240)),onlyFull:onlyFull.slice(0,4).map(x=>x.slice(0,240))};if(incremental.mismatches.length<20)incremental.mismatches.push(m);console.error('[hybrid-incremental] mismatch '+JSON.stringify(m));setTimeout(()=>{throw Error('Hybrid incremental rebuild mismatch (build '+m.build+')');});}}
}
function drawKey(meshes){let h=(innerWidth*73856093^innerHeight*19349663^Math.round(devicePixelRatio*1000))|0;const mix=v=>{h=Math.imul(h^Math.round(v*65536),16777619)|0;};for(const m of meshes){const d=m.geo.data;mix(d.length);/* stride 13 (prime): a moved card body or socket changes hundreds of values, so it is still caught at ~1 ms per build */for(let i=0;i<d.length;i+=13)mix(d[i]);for(let i=Math.max(0,d.length-24);i<d.length;i++)mix(d[i]);for(const k in m)if(k!=='geo'){const v=m[k];if(typeof v==='number'||typeof v==='boolean')mix(+v);else if(v&&typeof v.length==='number')for(let i=0;i<v.length;i++)mix(+v[i]||0);}}for(const v of vp)mix(v);for(const v of eye)mix(v);for(const v of renderer.lamp||[])mix(v);mix(renderer.renderScale?renderer.renderScale(devicePixelRatio||1):0);return h;}
function createRenderer(){lastDrawKey=null;sceneCache=null;
 renderer=new Renderer(canvas,{shadowSize:RELIEF.shadowMap,shadowKeep:RELIEF.shadowKeep,edgeShade:RELIEF.edgeShade,renderScale:HYBRID.render?.scale});
 contextRecovery=renderer.gl.getExtension('WEBGL_lose_context');
 props=createProps({unproject,screen,redraw:()=>{if(!active||failed||game.hidden)return;renderer.shadowDirty=true;renderer.draw(vp,eye);}});
}
function retryScene(){
 clearTimeout(recoveryTimer);recoveryTimer=0;if(!failed)return;
 if(renderer?.gl.isContextLost()){contextRecovery?.restoreContext();recoveryText.textContent='Aguardando o navegador recuperar a imagem. Você também pode recarregar.';return;}
 try{
  recovering=true;
  props?.dispose();props=null;renderer?.dispose({contextLost:contextInvalidated});cardPlanes.restore();createRenderer();contextInvalidated=false;
  failed=false;dirty=true;lastSignature='';settledViewport='';invalidateFit();canvas.style.display='';document.body.classList.remove('hybrid-unavailable');
  syncNow();flushDraw();if(failed)return;recoveries++;updateRecovery();if(recoveryFocus?.isConnected)recoveryFocus.focus({preventScroll:true});
 }catch(error){showRecovery(error.message,false);}finally{recovering=false;}
}
// Camera, field, panels, Emanation, deck and relief parameters come from config.js.
// Revision 12: tilt (from the vertical) and FOV are read once here and shared by
// camera(), unproject() and every projection below.
const {tilt:cameraTilt,tiltDegrees:cameraTiltDegrees,distance:cameraDistance,fov:cameraFov}=HYBRID.camera,V_SCALE=HYBRID.visualScale,RELIEF=HYBRID.relief,OVERLAP='--hybrid-camp-overlap';
let sideSurface=null,mounts=null,sceneMetrics={};
let renderer,props=null,frame=0,pass=0,active=false,failed=false,eye,forward,right,up,vp,lastSignature='',field=null,anchors=[],lastMetrics={},dirty=true,builds=0;
const sockets=new WeakMap();let tableObserver=null;
const projectedPanels=new Set(),panelQuads=new WeakMap(),zones=new Map(),occluders=[];
const cardPlanes=new CardPlanes(()=>schedule(true),()=>syncNow());
const {metal:gold,wood,felt,structure:ink}=MATERIALS,modified=new Set();
const rect=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,cx:r.x+r.width/2,cy:r.y+r.height/2};};
function camera(){eye=[0,Math.cos(cameraTilt)*cameraDistance,Math.sin(cameraTilt)*cameraDistance];forward=V.norm(V.scale(eye,-1));right=V.norm(V.cross(forward,Math.abs(forward[1])>.999999?[0,0,-1]:[0,1,0]));up=V.cross(right,forward);vp=multiply(perspective(cameraFov,innerWidth/innerHeight),lookAt(eye,[0,0,0]));}
function unproject(x,y,height=0){const t=Math.tan(cameraFov/2),nx=x/innerWidth*2-1,ny=1-y/innerHeight*2,d=V.norm(V.add(forward,V.add(V.scale(right,nx*innerWidth/innerHeight*t),V.scale(up,ny*t)))),distance=(height-eye[1])/d[1];return V.add(eye,V.scale(d,distance));}
const screen=p=>project(p,vp,innerWidth,innerHeight);
// Fit the projected outer edge itself. At a steeper camera angle its midpoint is
// not the projection of the world midpoint (perspective divide is non-linear).
function edgeXAt(px,z,d){const average=x=>(screen([x,.13,z-d/2]).x+screen([x,.13,z+d/2]).x)/2;return (px-average(0))/(average(1)-average(0));}
function surface(r,height=0){const c=unproject(r.cx,r.cy,height),l=unproject(r.x,r.cy,height),right=unproject(r.x+r.w,r.cy,height),t=unproject(r.cx,r.y,height),b=unproject(r.cx,r.y+r.h,height);return {x:c[0],z:c[2],y:height,w:Math.abs(right[0]-l[0]),d:Math.abs(b[2]-t[2])};}
function footprint(x,z,w,d,y){return [[x-w/2,y,z-d/2],[x+w/2,y,z-d/2],[x+w/2,y,z+d/2],[x-w/2,y,z+d/2]].map(screen);}
function place(node,x,z,w,d,y,base,id){const points=footprint(x,z,w,d,y),left=Math.min(...points.map(p=>p.x)),top=Math.min(...points.map(p=>p.y)),width=Math.max(...points.map(p=>p.x))-left,height=Math.max(...points.map(p=>p.y))-top;const center=screen([x,y,z]);modified.add(node);const unit=playScale();Object.assign(node.style,{left:(center.x-width/2-base.x)/unit+'px',top:(center.y-height/2-base.y)/unit+'px',width:width/unit+'px',height:height/unit+'px'});anchors.push({id,world:[x,y,z],screen:center,node});}
function rim(g,x,z,w,d,y,color=gold){const t=MATERIALS.lineWidth;for(const side of [-1,1]){g.box(x+side*w/2,y,z,t,.025,d,color,0);g.box(x,y,z+side*d/2,w,.025,t,color,0);}}
// V2 (items 9 and 11): with the Patron name gone, the remaining set (ether + portrait + powers) is centred on the
// projected field at the band's row, for both seats. The ether and the powers hang off the portrait with different
// widths (which change with the viewport and the number of powers), so the portrait column is moved by the
// measured difference instead of a fixed offset. The bands are flat DOM (not projected), so screen rects apply.
function centrePatronSets(quad){
 const at=(p,q,y)=>p.y===q.y?(p.x+q.x)/2:p.x+(q.x-p.x)*(y-p.y)/(q.y-p.y),centreAt=y=>(at(quad[0],quad[3],y)+at(quad[1],quad[2],y))/2,out=[];
 const bands=[...document.querySelectorAll('#game .player-band')].map(band=>({band,column:band.querySelector('.patron-center'),avatar:band.querySelector('.patron-avatar'),ether:band.querySelector('.patron-ether'),powers:band.querySelector('.patron-equipment')})).filter(b=>b.column);
 // Reset all bands, read their geometry together, then apply all translations.
 // Interleaving those writes and reads used to force a new layout for each part.
 for(const b of bands){b.column.style.removeProperty('translate');for(const n of [b.ether,b.powers])n?.style.removeProperty('translate');}
 const measured=bands.map(b=>{const parts=[b.ether,b.avatar,b.powers].map(n=>n?.getBoundingClientRect()).filter(r=>r&&r.width),ar=b.avatar?.getBoundingClientRect(),ring=b.powers?.querySelector('.patron-power'),pr=(ring||b.powers)?.getBoundingClientRect(),er=b.ether?.getBoundingClientRect(),cr=b.column.getBoundingClientRect();return {...b,parts,ar,pr,er,ring,unit:cr.width/(b.column.offsetWidth||cr.width||1)||1};}),scale=playScale();
 for(const b of measured){const {parts,ar,pr,er}=b;if(parts.length<2)continue;
  if(innerWidth>900&&ar){const cy=ar.y+ar.height/2;if(er)b.ether.style.translate='0 '+(cy-er.y-er.height/2)/scale+'px';if(pr)b.powers.style.translate='0 '+(cy+(b.ring?ar.height*.09:0)-pr.y-pr.height/2)/scale+'px';}
  const left=Math.min(...parts.map(r=>r.left)),right=Math.max(...parts.map(r=>r.right)),y=ar?ar.y+ar.height/2:(parts[1].top+parts[1].bottom)/2,target=centreAt(y),shift=target-(left+right)/2;
  b.column.style.translate=shift/b.unit+'px 0';out.push({seat:b.band.querySelector('#self-head')?'self':'rival',shiftPx:shift,target});
 }return out;}
// Panels and deck faces share the table plane; native controls retain DOM hit tests.
function projectNode(node,r,a,y=.14){const quad=footprint(a.x,a.z,a.w,a.d,y),unit=r.w/parseFloat(getComputedStyle(node).width),m=matrix(quad.map(p=>({x:(p.x-r.x)/unit,y:(p.y-r.y)/unit})),r.w/unit,r.h/unit);node.style.transformOrigin='0 0';node.style.setProperty('transform','matrix3d('+m.join(',')+')','important');projectedPanels.add(node);panelQuads.set(node,quad);}
// Formation addendum, block B: field expansion during the focus (HYBRID.focus). The largest factor up to `max` that
// keeps both side panels panelMarginPx inside the screen (they are mounted on the field edges, so the field pushes
// them out) and, with the expansion anchored at the own reserve (near edge fixed), lets the far edge rise only into
// the gap to the rival reserve plus the room gained by moving the rival band and reserve up to rivalTopPx. The
// applied factor is 1 + (max - 1) * focus value; phones keep the normal field.
function rivalVisibleTop(){const band=document.querySelector('#opponent-head')?.closest('.player-band');return band?Math.min(...[band,...band.querySelectorAll('.patron-avatar,.patron-power,.patron-ether')].map(n=>n.getBoundingClientRect().top)):16;}
function focusExpand(a,w,d,plan){const v=focusValue(),F=HYBRID.focus;focusMetrics={value:+v.toFixed(3),target:focusApi?.target??0,factor:1,max:1,limits:null,rivalShiftPx:0};if(v<=0&&!(focusApi?.target))return 1;if(innerWidth<=900||!plan){focusMetrics.limits={phone:true};return 1;}
 const n=document.querySelector('.nartvanyr'),c=document.getElementById('center-actions'),nr=rect(n),cr=rect(c),{ns,cs,after}=plan,leftLimit=unproject(F.panelMarginPx,nr.cy,.13)[0],rightLimit=unproject(innerWidth-F.panelMarginPx,cr.cy,.13)[0],wMax=2*Math.min(a.x-after.left-.014-ns.w-leftLimit,rightLimit-after.right-.014-cs.w-a.x)-.25,fH=Math.max(1,wMax/w);
 const top=f=>Math.min(...footprint(a.x,a.z+d*(1-f)/2,w*f,d*f,.09).map(p=>p.y)),rb=rect(document.querySelector('.reserve-camp.opponent-camp')),bt=rect(document.querySelector('#opponent-head')?.closest('.player-band')||document.body),room=Math.max(0,top(1)-(rb.y+rb.h+F.rivalGapPx))+Math.max(0,rivalVisibleTop()-F.rivalTopPx),floor=top(1)-room;let lo=1,hi=F.max;if(top(hi)>=floor)lo=hi;else for(let k=0;k<14;k++){const m=(lo+hi)/2;if(top(m)>=floor)lo=m;else hi=m;}
 let max=Math.max(1,Math.min(F.max,fH,lo)),downMax=0,downPx=0,base=max;
 // Round 2 (owner): growth = gain × the growth the upward room allowed, taking the rest downward into the gap above
 // the own reserve (ownGapPx kept). Limited by the horizontal room and by that gap; reported in focusMetrics.
 if(F.gain>1&&max>1){const near=f=>Math.max(...footprint(a.x,a.z,w*f,d*f,.09).map(p=>p.y)),own=document.querySelector('.reserve-camp.self-camp'),ownTop=own?rect(own).y:innerHeight;downPx=Math.max(0,ownTop-F.ownGapPx-near(1))+(F.ownShiftMaxPx||0);const depthPx=near(1)-top(1),want=1+(max-1)*F.gain,roomG=Math.max(0,top(1)-(rb.y+rb.h+F.rivalGapPx))+Math.max(0,rivalVisibleTop()-(F.rivalTopGainPx??F.rivalTopPx)),upG=1+roomG/Math.max(1,depthPx),grown=Math.max(max,Math.min(want,fH,upG+downPx/Math.max(1,depthPx)));downMax=Math.max(0,(grown-1)*d-(Math.min(grown,upG)-1)*d);max=grown;}
 const factor=1+(max-1)*v;focusMetrics.down=max>1?downMax*(factor-1)/(max-1):0;Object.assign(focusMetrics,{factor:+factor.toFixed(4),max:+max.toFixed(4),limits:{requested:F.max,gain:F.gain||1,beforeGain:+base.toFixed(4),horizontal:+fH.toFixed(4),vertical:+lo.toFixed(4),roomUpPx:+room.toFixed(1),roomDownPx:+downPx.toFixed(1)}});return factor;}
// The rival band and reserve move up (CSS translate, cleared at the start of every build) only as much as the
// expanded far edge needs to keep rivalGapPx from the rival reserve.
// Round 3 (owner): during the focus the own reserve, Patron band and hand may move down (translate, cleared at the start
// of every build, at most HYBRID.focus.ownShiftMaxPx) so the expanded field keeps ownGapPx above the own reserve.
function shiftOwnStack(quad){if(!focusMetrics||focusMetrics.factor<=1||!HYBRID.focus.ownShiftMaxPx)return;const F=HYBRID.focus,camp=document.querySelector('.reserve-camp.self-camp');if(!camp)return;const bottom=Math.max(...quad.map(p=>p.y)),need=bottom+F.ownGapPx-rect(camp).y,shift=Math.max(0,Math.min(F.ownShiftMaxPx,need));if(shift<=.05)return;for(const node of [camp,document.querySelector('#self-head')?.closest('.player-band'),document.getElementById('hand')].filter(Boolean)){const r=node.getBoundingClientRect(),unit=r.height/(node.offsetHeight||r.height)||1;node.style.translate='0 '+(shift/unit)+'px';focusShifted.add(node);}focusMetrics.ownShiftPx=+shift.toFixed(1);}
function shiftRivalStack(quad){if(!focusMetrics||focusMetrics.factor<=1)return;const F=HYBRID.focus,camp=document.querySelector('.reserve-camp.opponent-camp'),band=document.querySelector('#opponent-head')?.closest('.player-band');if(!camp||!band)return;const top=Math.min(...quad.map(p=>p.y)),rb=rect(camp),bt=rect(band),shift=Math.max(0,Math.min(rivalVisibleTop()-(F.gain>1?(F.rivalTopGainPx??F.rivalTopPx):F.rivalTopPx),rb.y+rb.h+F.rivalGapPx-top));if(shift<=.05)return;for(const node of [camp,band]){const r=node.getBoundingClientRect(),unit=r.height/(node.offsetHeight||r.height)||1;node.style.translate='0 '+(-shift/unit)+'px';focusShifted.add(node);}focusMetrics.rivalShiftPx=+shift.toFixed(1);}
// During the focus the confirmation panel slides (with the focus value) until its lower edge meets the field's near
// edge, so the confirmation sits at the field's lower right corner and the wait after it stays in the same place. Its
// upper edge never rises above the rival reserve or the rival deck holder it overlaps horizontally (+rivalGapPx).
function alignActions(cs,a,d){const fv=focusValue();if(fv<=0)return;let z=cs.z+(a.z+d/2-cs.d/2-cs.z)*fv;const F=HYBRID.focus,q=footprint(cs.x,z,cs.w,cs.d,.13),left=Math.min(...q.map(p=>p.x)),right=Math.max(...q.map(p=>p.x)),top=Math.min(...q.map(p=>p.y)),cx=(left+right)/2;let limit=-Infinity;const boxes=[rect(document.querySelector('.reserve-camp.opponent-camp')||document.body),...(lastDeckQuads.opponent?[(()=>{const p=lastDeckQuads.opponent;const x0=Math.min(...p.map(v=>v.x)),y0=Math.min(...p.map(v=>v.y));return {x:x0,y:y0,w:Math.max(...p.map(v=>v.x))-x0,h:Math.max(...p.map(v=>v.y))-y0};})()]:[])];const hb=q=>{const x0=Math.min(...q.map(v=>v.x)),y0=Math.min(...q.map(v=>v.y));return {x:x0,y:y0,w:Math.max(...q.map(v=>v.x))-x0,h:Math.max(...q.map(v=>v.y))-y0};},over=r=>r.x<right&&r.x+r.w>left;for(const b of boxes)if(over(b))limit=Math.max(limit,b.y+b.h+F.rivalGapPx);let floor=Infinity;for(const r of [rect(document.querySelector('.reserve-camp.self-camp')||document.body),...(lastDeckQuads.self?[hb(lastDeckQuads.self)]:[])])if(over(r))floor=Math.min(floor,r.y-F.rivalGapPx);const bottomOf=z=>Math.max(...footprint(cs.x,z,cs.w,cs.d,.13).map(p=>p.y)),topOf=z=>Math.min(...footprint(cs.x,z,cs.w,cs.d,.13).map(p=>p.y));if(topOf(z)<limit)z=Math.max(z,unproject(cx,limit,.13)[2]+cs.d/2);if(bottomOf(z)>floor){const up=unproject(cx,floor,.13)[2]-cs.d/2;z=topOf(up)>=limit?up:(unproject(cx,(limit+floor)/2,.13)[2]);}cs.z=z;if(focusMetrics)Object.assign(focusMetrics,{actionsTopLimitPx:Number.isFinite(limit)?+limit.toFixed(1):null,actionsBottomLimitPx:Number.isFinite(floor)?+floor.toFixed(1):null});}
// Veil: darkens the WebGL wood and props outside the field, the own reserve and deck and the side panels; DOM
// content (cards, panels, controls) stays above it. Opacity follows the focus value.
function updateVeil(){const v=focusValue();veil.style.opacity=String(v*HYBRID.focus.veil);veil.toggleAttribute('hidden',v<=0);if(v<=0)return;const W=innerWidth,H=innerHeight,poly=q=>'M'+q.map(p=>p.x.toFixed(1)+' '+p.y.toFixed(1)).join('L')+'Z',box=(r,m=6)=>poly([{x:r.x-m,y:r.y-m},{x:r.x+r.w+m,y:r.y-m},{x:r.x+r.w+m,y:r.y+r.h+m},{x:r.x-m,y:r.y+r.h+m}]);veil.setAttribute('viewBox','0 0 '+W+' '+H);const holes=[];if(field)holes.push(poly(footprint(field.x,field.z,field.w+.3,field.d+.3,.09)));for(const sel of ['.reserve-camp.self-camp','#self-deck','#center-actions','.nartvanyr','#camp-log']){const n=document.querySelector(sel);if(!n||!n.getClientRects().length)continue;const q=panelQuads.get(n);holes.push(q?poly(q):box(rect(n)));}veil.firstElementChild.setAttribute('d','M0 0H'+W+'V'+H+'H0Z'+holes.join(''));}
// Formation addendum, block A: depth factor of the Emanation socket (HYBRID.formA.emanaUndoV2Height, config.js).
function emanaDepthFactor(){const O=HYBRID.owner.composition;return HYBRID.formA.emanaUndoV2Height?Math.min(1,O/(compositionApplied()||O)):1;}
// The label follows the projected plate centre but is typeset upright at screen
// size. Snapped dimensions avoid an extra perspective resample of small glyphs.
function fitLabel(node,q){const s=node.style,unit=playScale(),r=(node.offsetParent||node.parentElement).getBoundingClientRect(),cx=(q[0].x+q[1].x+q[2].x+q[3].x)/4,cy=(q[0].y+q[1].y+q[2].y+q[3].y)/4,w=Math.min(Math.hypot(q[1].x-q[0].x,q[1].y-q[0].y),Math.hypot(q[2].x-q[3].x,q[2].y-q[3].y)),h=Math.abs((q[3].y+q[2].y-q[0].y-q[1].y)/2);Object.assign(s,{left:(Math.round(cx-w/2)-r.left)/unit+'px',right:'auto',top:(Math.round(cy-h/2)-r.top)/unit+'px',width:Math.round(w)/unit+'px',height:Math.round(h)/unit+'px',padding:'0',fontSize:Math.max(9,Math.min(15,w/(HYBRID.compose?.label?.fontRatio??8.3)))/unit+'px',lineHeight:Math.round(h)/unit+'px',letterSpacing:'0',transform:'none'});node.style.setProperty('transform','none','important');if(node.firstElementChild)node.firstElementChild.style.transform='none';
 // Claude review round 2: the plate is placed in CSS units of its zoomed container; measure where it really landed and
 // correct position and width once, so it is centred on the projected Emanation axis whatever the effective zoom.
 {const tx=Math.round(cx-w/2),ty=Math.round(cy-h/2),got=node.getBoundingClientRect(),k=got.width/(Math.round(w)/unit)||1;if(Math.abs(got.left-tx)>.25||Math.abs(got.top-ty)>.25||Math.abs(got.width-Math.round(w))>.25){s.left=parseFloat(s.left)+(tx-got.left)/k+'px';s.top=parseFloat(s.top)+(ty-got.top)/k+'px';s.width=Math.round(w)/k+'px';s.height=Math.round(h)/k+'px';s.lineHeight=Math.round(h)/k+'px';}}
 return {x:Math.round(cx-w/2)+Math.round(w)/2,y:Math.round(cy-h/2)+Math.round(h)/2};}
// Keep the book's complete projected cover above the Registry, including at 0°.
function bookAnchor(nominal){const p=[...nominal],limit=rect(document.getElementById('camp-log')).y-10;for(let i=0;i<3;i++){const c=unproject(...p,0),points=[];for(const x of [-.9,.9])for(const z of [-1.1,1.1])for(const y of [0,.55])points.push(screen([c[0]+x*V_SCALE,y*V_SCALE,c[2]+z*V_SCALE]));const bottom=Math.max(...points.map(q=>q.y)),top=Math.min(...points.map(q=>q.y)),shift=bottom>limit?limit-bottom:top<12?12-top:0;if(Math.abs(shift)<.1)break;p[1]+=shift;}return p;}
function plate(g,node,kind){if(!node||!node.getClientRects().length)return;const r=rect(node);if(!r.w||!r.h||r.y>innerHeight+200||r.y+r.h< -200)return;const a=surface(r,.13);if(mounts&&node.matches('.nartvanyr'))Object.assign(a,mounts.nart);if(mounts&&node.matches('#center-actions'))Object.assign(a,mounts.actions);if(node.matches('.camp-log')&&sideSurface){a.x=sideSurface.x;a.w=sideSurface.w;if(mounts)a.z=mounts.logZ;}
 if(kind==='shelf')craft.shelf(g,a,node.matches('.self-camp')?1:node.matches('.opponent-camp')?-1:0);else{craft.panel(g,a,{band:node.matches('.player-band')});if(!node.matches('.player-band'))projectNode(node,r,a,.13);}
 anchors.push({id:node.className,world:[a.x,.13,a.z],screen:screen([a.x,.13,a.z]),node});}
// UI-owner revision, item 10 — Registro. Closed, the <details> is projected onto its
// plate next to Nartvanyr, so its hit area is that projected quad. Opened by hover, the
// projection was dropped only at the next scheduled rebuild (2 frames) and the open
// panel appeared at its unprojected DOM box, elsewhere: the cursor was no longer over
// it, pointerleave closed it, the projection came back under the cursor, pointerenter
// opened it again — a loop until the first click pinned it. Now the open panel is
// anchored to the screen box of the closed trigger (so it covers the trigger and the
// cursor stays inside), and the swap happens synchronously when `open` changes.
let logTrigger=null;
function anchorLog(){const log=document.getElementById('camp-log');if(!log)return;if(!log.open){const q=panelQuads.get(log);if(q&&projectedPanels.has(log)&&log.style.transform)logTrigger={left:Math.min(...q.map(p=>p.x)),top:Math.min(...q.map(p=>p.y)),right:Math.max(...q.map(p=>p.x)),bottom:Math.max(...q.map(p=>p.y))};return;}
 if(!logTrigger)return;log.style.removeProperty('transform');const r=log.getBoundingClientRect(),unit=r.width/(parseFloat(getComputedStyle(log).width)||r.width)||1,left=Math.max(4,Math.min(innerWidth-r.width-4,logTrigger.left)),top=Math.max(4,Math.min(innerHeight-r.height-4,logTrigger.top));log.style.setProperty('transform',`translate(${(left-r.left)/unit}px,${(top-r.top)/unit}px)`,'important');projectedPanels.add(log);}
function scaleRivalShelf(){const near=document.querySelector('.reserve-camp.self-camp'),far=document.querySelector('.reserve-camp.opponent-camp');if(!near||!far)return;const a=rect(near),b=rect(far),unit=r=>surface({...r,x:r.cx-.5,w:1},.13).w,scale=Math.round(Math.min(.98,Math.max(.72,unit(a)/unit(b)))*1000)/1000;far.style.width=a.w/playScale()+'px';far.style.zoom=scale*playScale();far.style.maxWidth='none';far.dataset.hybridScale=scale.toFixed(5);const row=far.querySelector('.card-row'),cards=[...row.querySelectorAll(':scope>.card')];if(cards.length>1){const width=cards[0].offsetWidth,gap=parseFloat(getComputedStyle(row).gap)||0;const value=Math.min(0,(row.clientWidth-cards.length*width-(cards.length-1)*gap)/(cards.length-1))+'px';if(row.style.getPropertyValue(OVERLAP)!==value)row.style.setProperty(OVERLAP,value);}}
function glyph(g,x,z,index){const y=.104,c=MATERIALS.structure,size=.2;if(index===0){g.cylinder(x,y,z,size,.018,c,3,20);for(let i=0;i<8;i++){const a=i*Math.PI/4;g.box(x+Math.sin(a)*.31,y,z+Math.cos(a)*.31,.025,.015,.12,c,3,a);}}else if(index===1){g.cylinder(x,y,z,.27,.018,c,3,24);g.cylinder(x+.12,y+.019,z-.035,.24,.004,felt,2,24);}else{const p=[];for(let i=0;i<8;i++){const a=i*Math.PI/4,r=i%2?.11:.34;p.push([x+Math.sin(a)*r,y,z+Math.cos(a)*r]);}for(let i=0;i<8;i++)g.triangle([x,y,z],p[i],p[(i+1)%8],c,3);}}
function formatPhase(){for(const title of document.querySelectorAll('#phase-actions h3')){if(title.querySelector('.hybrid-round'))continue;const match=title.textContent.match(/^(.*?)\s*-?\s*Rodada\s+(\d+)$/i);if(!match)continue;const phase=document.createElement('span'),round=document.createElement('span');phase.textContent=match[1].trim().replace(/-$/,'').trim();round.className='hybrid-round';round.textContent='Rodada '+match[2];title.replaceChildren(phase,document.createTextNode(' '),round);}}
// Revision 12: side light for a near-vertical camera. The lamp keeps the screen
// direction of earlier revisions (upper right), but its elevation over the table is
// fixed by config (relief.lampElevationDegrees), so the cast-shadow length per unit of
// height no longer depends on the camera angle. The shadow frustum is fitted to the
// visible table (plus ornament height) instead of a fixed ±35 box, which gives ~4×
// finer shadow texels and lets low reliefs (rims, sockets, card thickness) cast.
function placeLamp(pixel,target){const p=unproject(...pixel,0),dir=V.norm([p[0]-target[0],0,p[2]-target[2]]),R=RELIEF.lampDistance,elevation=RELIEF.lampElevationDegrees*Math.PI/180;renderer.lamp=[target[0]+dir[0]*R,R*Math.tan(elevation),target[2]+dir[2]*R];
 const view=lookAt(renderer.lamp,target),pts=[];for(const [x,y] of [[0,0],[innerWidth,0],[innerWidth,innerHeight],[0,innerHeight]]){const q=unproject(x,y,0);for(const h of [-.35,2])pts.push([q[0],h,q[2]]);}
 const ls=pts.map(q=>[0,1,2].map(i=>view[i]*q[0]+view[4+i]*q[1]+view[8+i]*q[2]+view[12+i])),pad=.6,minX=Math.min(...ls.map(q=>q[0]))-pad,maxX=Math.max(...ls.map(q=>q[0]))+pad,minY=Math.min(...ls.map(q=>q[1]))-pad,maxY=Math.max(...ls.map(q=>q[1]))+pad,near=Math.max(.1,-Math.max(...ls.map(q=>q[2]))-1),far=-Math.min(...ls.map(q=>q[2]))+1;
 renderer.light=multiply(ortho(minX,maxX,minY,maxY,near,far),view);renderer.shadowInfo={worldTexel:Math.max(maxX-minX,maxY-minY)/renderer.shadowSize,depthRange:far-near,size:renderer.shadowSize,elevationDegrees:RELIEF.lampElevationDegrees,lengthPerHeight:1/Math.tan(elevation)};}
function ortho(l,r,b,t,n,f){return new Float32Array([2/(r-l),0,0,0,0,2/(t-b),0,0,0,0,-2/(f-n),0,-(r+l)/(r-l),-(t+b)/(t-b),-(f+n)/(f-n),1]);}
function build(){if(failed||game.hidden||!renderer){if(game.hidden){canvas.style.visibility='hidden';veil.setAttribute('hidden','');props?.hide();}sceneCache=null;return;}const started=performance.now();
 if(sceneCache&&!fullOnly&&!window.__HYBRID_NO_INCREMENTAL){const key=layoutKey();if(key===sceneCache.key&&deckInputKey()===sceneCache.deckInputs){buildCards(started);return;}incremental.lastReason=key===sceneCache.key?'deck bounds settling':'layout changed: '+keyDiff(sceneCache.key,key);}else incremental.lastReason=fullOnly?'verify':'no cache';
 const deckInputs=deckInputKey();
 sceneCache=null;canvas.style.visibility='visible';formatPhase();for(const node of projectedPanels){if(!node.isConnected){projectedPanels.delete(node);continue;}node.style.removeProperty('transform');}for(const node of focusShifted)node.style.removeProperty('translate');focusShifted.clear();fitLayout();camera();scaleRivalShelf();const side=document.querySelector('.nartvanyr');sideSurface=side?surface(rect(side),.13):null;anchors=[];zones.clear();occluders.length=0;const lanes=document.getElementById('lanes'),r=rect(lanes);if(!r.w||!r.h)return;const g=new Geometry(),glow=new Geometry(),corners=[[0,0],[innerWidth,0],[innerWidth,innerHeight],[0,innerHeight]].map(([x,y])=>unproject(x,y,-.03)),xs=corners.map(p=>p[0]),zs=corners.map(p=>p[2]);g.box((Math.min(...xs)+Math.max(...xs))/2,-.29,(Math.min(...zs)+Math.max(...zs))/2,Math.max(...xs)-Math.min(...xs)+5,.5,Math.max(...zs)-Math.min(...zs)+5,wood,1);
 const a=surface(r,.09);let w=a.w,d=a.d;for(let i=0;i<25;i++){const p=footprint(a.x,a.z,w,d,.09);if(p.every(p=>p.x>=6&&p.x<=innerWidth-6&&p.y>=r.y+1&&p.y<=r.y+r.h-1))break;w*=.978;d*=.978;}const F=HYBRID.field,P=HYBRID.panels,originalWidth=w,minTrim=w*F.minEdgeTrim;let edgeTrim=minTrim,panelPlan=null;
 // (c) Desktop: the side panels' outer insets are the parameter. The field loses an
 // equal parcel on both lateral edges until both panels respect the inset, so the
 // field↔panel gaps stay symmetric and the panels move toward the centre.
 if(innerWidth>900){const n=document.querySelector('.nartvanyr'),c=document.getElementById('center-actions'),l=document.getElementById('camp-log'),nr=rect(n),cr=rect(c),ns=surface(nr,.13),cs=surface(cr,.13),ls=surface(rect(l),.13),xUnit=r=>surface({...r,x:r.cx-.5,w:1,h:1},.13).w,yUnit=r=>surface({...r,y:r.cy-.5,w:1,h:1},.13).d,after={left:P.sideGapPx*playScale()*xUnit(nr),right:P.sideGapPx*playScale()*xUnit(cr),register:Math.max(.0102,P.registerGapPx*playScale()*yUnit(rect(l)))},inset=P.outerInsetFraction*innerWidth,leftLimit=edgeXAt(inset,ns.z,ns.d),rightLimit=edgeXAt(innerWidth-inset,cs.z,cs.d),wl=2*(a.x-after.left-.014-ns.w-leftLimit)-.25,wr=2*(rightLimit-after.right-.014-cs.w-a.x)-.25;
  edgeTrim=Math.min(originalWidth*F.maxEdgeTrim,Math.max(minTrim,(originalWidth-Math.min(wl,wr))/2));panelPlan={ns,cs,ls,after,inset,limits:{wl,wr}};}
 w-=edgeTrim*2;
 // V2 (items 6–7): the sockets start from the V1 partition (combat = what is left after both Emanation sockets),
 // take the local factors once (combat .85, Emanation .75) and then the general factor up to 1.25, limited by the
 // field width available between the side panels; the field becomes the sum of the final sockets and gutters.
 let V=HYBRID.v2,baseEmana=Math.min(w*(innerWidth<=600?F.emanaFractionMobile:F.emanaFraction),F.emanaMaxWorld*playScale()),gutter=w*F.gutter,baseCombat=(w-baseEmana*2-gutter*4)/3,localCombat=baseCombat*V.combatLocal,localEmana=baseEmana*V.emanaLocal,availableWidth=w,globalApplied=Math.min(V.global,(w-gutter*4)/(3*localCombat+2*localEmana)),combatWidth=localCombat*globalApplied,emanaWidth=localEmana*globalApplied;
 // Claude review (HYBRID.compose): narrower combat sockets (same cards) and an Emanation socket shaped by the
 // complete portrait card it now holds: card height = socket depth − 2 margins, width = height / card ratio.
 const C=HYBRID.compose;if(C){combatWidth*=C.combatWidth;if(C.emanaFullCard){const sd=d*C.emanaSlotDepth,m=sd*C.emanaMargin;emanaWidth=(sd-2*m)/C.cardRatio+2*m;}}w=3*combatWidth+2*emanaWidth+4*gutter;{const FX=focusExpand(a,w,d,panelPlan);if(FX!==1){combatWidth*=FX;emanaWidth*=FX;gutter*=FX;w*=FX;a.z+=d*(1-FX)/2+(focusMetrics?.down||0);d*=FX;}}const left=a.x-w/2,combatX=[0,1,2].map(i=>left+combatWidth/2+i*(combatWidth+emanaWidth+2*gutter)),emanaX=[0,1].map(i=>left+combatWidth+gutter+emanaWidth/2+i*(combatWidth+emanaWidth+2*gutter));field={x:a.x,z:a.z,w,d,y:.09};
 mounts=null;sceneMetrics={field:{...field,quad:footprint(a.x,a.z,w,d,.09)},props:[],patronSets:null,partition:{originalWidth,edgeTrim,availableWidth,fieldWidth:w,baseCombat,baseEmana,localCombat,localEmana,globalRequested:V.global,globalApplied,combatWidth,emanaWidth,combatFinalFactor:combatWidth/baseCombat,emanaFinalFactor:emanaWidth/baseEmana,gutter,combatX,emanaX}};sceneMetrics.focus=focusMetrics;shiftRivalStack(sceneMetrics.field.quad);shiftOwnStack(sceneMetrics.field.quad);sceneMetrics.patronSets=centrePatronSets(sceneMetrics.field.quad);
 if(panelPlan){const {ns,cs,ls,after}=panelPlan;ns.x=a.x-(w+.25)/2-after.left-.014-ns.w/2;cs.x=a.x+(w+.25)/2+after.right+.014+cs.w/2;alignActions(cs,a,d);mounts={nart:ns,actions:cs,logZ:ns.z-ns.d/2-ls.d/2-after.register-.028};sideSurface=ns;sceneMetrics.gaps={after,targetPixels:{side:P.sideGapPx*playScale(),registry:P.registerGapPx*playScale()},outerInset:panelPlan.inset,limits:panelPlan.limits};sceneMetrics.panels={nart:footprint(ns.x,ns.z,ns.w,ns.d,.13),actions:footprint(cs.x,cs.z,cs.w,cs.d,.13)};}

 craft.boardFrame(g,a.x,a.z,w,d);g.box(a.x,.073,a.z,w,.025,d,felt,2);rim(g,a.x,a.z,w+.05,d+.05,.095,ink);
 const laneNodes=[...lanes.querySelectorAll(':scope>.lane')];for(let i=0;i<3;i++){const x=combatX[i];{const before=g.data.length;glyph(g,x,a.z,i);for(let k=before;k<g.data.length;k+=12){g.data[k]=x+(g.data[k]-x)*V_SCALE;g.data[k+2]=a.z+(g.data[k+2]-a.z)*V_SCALE;}}const sides=laneNodes[i]?.querySelectorAll(':scope>.lane-side')||[];for(let side=0;side<2;side++){const z=a.z+(side?1:-1)*d/4,sw=combatWidth,sd=d/2*.96;rim(g,x,z,sw,sd,.093,ink);if(sides[side]){place(sides[side],x,z,sw,sd,.09,r,'combat-'+i+'-'+side);zones.set(sides[side],footprint(x,z,sw,sd,.14));}}}
 const board=document.querySelector('#game .board'),br=rect(board);for(const [i,column] of [...board.querySelectorAll('.emanation-column')].entries()){const x=emanaX[i],far=screen([x,.12,a.z-d/2]),near=screen([x,.12,a.z+d/2]),mid=screen([x,.12,a.z]);column.style.left=(mid.x-br.x)/playScale()+'px';column.style.top=(far.y-br.y)/playScale()+'px';column.style.height=(near.y-far.y)/playScale()+'px';
  // (e) The zone label lies on the table plane, in the gap between both sockets.
  const label=column.querySelector(':scope>span');if(label){const perWorld=screen([x+.5,.12,a.z]).x-screen([x-.5,.12,a.z]).x,LB=HYBRID.compose?.label,labelW=HYBRID.compose?.emanaFullCard?Math.min(emanaWidth+2*gutter,Math.max(emanaWidth+.12,LB.minPx/perWorld)):emanaWidth+.12;const labelPoint=fitLabel(label,footprint(x+(LB?.offsetX||0)/perWorld,a.z+(LB?.offsetY||0)/perWorld,labelW,(LB?.depth??F.emanaLabelDepth)*d,.12));const lr=rect(label);if(lr.w&&lr.h){const quad={x,z:a.z,w:emanaWidth+.12,d:F.emanaLabelDepth*d};anchors.push({id:'emana-label-'+i,world:[x,.12,a.z],screen:labelPoint,node:label});}}}const fullEmana=Boolean(HYBRID.compose?.emanaFullCard),emanaDepth=fullEmana?HYBRID.compose.emanaSlotDepth:F.emanaSlotDepth*emanaDepthFactor(),emanaGap=fullEmana?HYBRID.compose.emanaCenterGap:F.emanaCenterGap;sceneMetrics.partition.emanaDepth=emanaDepth;sceneMetrics.partition.emanaDepthV2=F.emanaSlotDepth;for(const [side,id] of [[-1,'opponent'],[1,'self']]){const holder=document.getElementById(id+'-emana');[...holder.children].slice(0,2).forEach((node,i)=>{const sd=d*emanaDepth,x=emanaX[i],z=a.z+side*(emanaGap/2+emanaDepth/2)*d,sw=emanaWidth;sockets.set(node,{x,z,w:sw,d:sd,y:.2});(sceneMetrics.emanaSockets??=[]).push({id:id+'-'+i,uid:node.dataset.uid||null,inner:footprint(x,z,sw,sd,.1625),rim:footprint(x,z,sw+.06,sd+.06,.17)});occluders.push(footprint(x,z,sw+.16,sd+.16,.19));g.box(x,.09,z,sw+.12,.11,sd+.12,wood,1);g.box(x,.15,z,sw,.025,sd,MATERIALS.socket);rim(g,x,z,sw+.06,sd+.06,.17,ink);const er=Math.min(sw*.28,.22);for(let k=0;k<8;k++){const t=k*Math.PI/4,u=(k+1)*Math.PI/4,rr=k%2?er*.3:er,ss=(k+1)%2?er*.3:er;g.triangle([x,.177,z],[x+Math.sin(t)*rr,.177,z+Math.cos(t)*rr],[x+Math.sin(u)*ss,.177,z+Math.cos(u)*ss],gold,3);}// Revision 11: the slot box is centred on the projected footprint's bounds, not
  // on the projected world centre, so the face stays inside its socket and clear of
  // the zone label (the two differ under perspective).
  const fp=footprint(x,z,sw,sd,.12),top=Math.min(...fp.map(p=>p.y)),h=Math.max(...fp.map(p=>p.y))-top,p={x:screen([x,.12,z]).x,y:top+h/2};modified.add(node);node.style.left=(p.x-br.x)/playScale()+'px';node.style.top=(p.y-br.y)/playScale()+'px';node.style.setProperty('width',(fp[1].x-fp[0].x)/playScale()+'px','important');node.style.setProperty('height',h/playScale()+'px','important');node.style.transform='translate(-50%,-50%)';const empty=node.querySelector('.emana-empty');if(empty){const er=rect(empty),ea=surface(er,.18);projectNode(empty,er,ea,.18);}anchors.push({id:'emana-'+id+'-'+i,world:[x,.12,z],screen:p,node});});}
 for(const node of document.querySelectorAll('.spell-dock>.spell-mark')){const sr=rect(node);if(sr.w&&sr.h)projectNode(node,sr,surface(sr,.23),.23);}for(const node of document.querySelectorAll('.reserve-camp'))plate(g,node,'shelf');for(const node of document.querySelectorAll('.player-band,.nartvanyr,#center-actions,.camp-log:not([open])'))plate(g,node,'panel');anchorLog();
 // Deck silhouettes use current public DOM geometry, never unseen card faces.
 // (g) Each deck rests on a dedicated holder just past the right end of its own
 // reserve. Both use the same physical size, gap and height, derived from the near
 // reserve depth, so only perspective makes the far one look smaller. The native
 // node (ID, title, focus, count) is projected onto the stack top; its DOM slot is
 // unchanged, it never takes a reserve position and it ignores the card count.
 const nearCamp=document.querySelector('.reserve-camp.self-camp'),nearSurface=nearCamp?.getClientRects().length?surface(rect(nearCamp),.13):null,D=HYBRID.deck;sceneMetrics.decks=[];
 for(const [id,camp] of [['self-deck','.reserve-camp.self-camp'],['opponent-deck','.reserve-camp.opponent-camp']]){const node=document.getElementById(id),cn=document.querySelector(camp);if(!node||!cn||!nearSurface||!cn.getClientRects().length)continue;const rr=rect(node);if(!rr.w||!rr.h)continue;
  const narrow=innerWidth<=900,depth=narrow?D.narrowDepth:D.depth,gap=narrow?D.narrowGap:D.gap,column=Math.round((depth/D.aspect+2*D.holderMargin+gap)*cn.offsetHeight*10)/10+'px';if(narrow&&cn.style.getPropertyValue('--hybrid-deck-column')!==column)cn.style.setProperty('--hybrid-deck-column',column);
  const cs=surface(rect(cn),.13),unit=nearSurface.d,dd=depth*unit,dw=dd/D.aspect,m=D.holderMargin*unit,x=narrow?cs.x+cs.w/2-gap*unit/2-m-dw/2:cs.x+cs.w/2+gap*unit+m+dw/2,z=cs.z,layers=node.dataset.empty==='true'?0:4,top=.13+.004+layers*.034;
  g.box(x,.065,z,dw+2*m,.13,dd+2*m,wood,1);rim(g,x,z,dw+2*m,dd+2*m,.135);g.box(x,.132,z,dw+m,.006,dd+m,[.06,.028,.012],1);
  /* Revision 12: seen from above the layer sides vanish, so each lower layer steps out toward the shadow side (away from the lamp) and its edge stays readable. */for(let i=0;i<layers;i++){const step=(layers-1-i)*D.stagger*unit;g.box(x-step,.134+i*.034+.017,z+step,dw+.03,.034,dd+.03,i%2?gold:[.055,.045,.025],3);}
  const q={x,z,w:dw,d:dd};projectNode(node,rr,q,top);sceneMetrics.decks.push({id,world:{x,z,w:dw,d:dd,y:top,holderMargin:m,gapFromReserve:gap*unit},reserve:{x:cs.x,z:cs.z,w:cs.w,d:cs.d},quad:footprint(x,z,dw,dd,top)});lastDeckQuads[id==='self-deck'?'self':'opponent']=footprint(x,z,dw+2*m,dd+2*m,.13);anchors.push({id,world:[x,top,z],screen:screen([x,top,z]),node});}
 for(const row of document.querySelectorAll('.reserve-camp .card-row')){const cards=[...row.querySelectorAll(':scope>.card')];if(cards.length>1){const gap=parseFloat(getComputedStyle(row).gap)||0,value=Math.min(0,(row.clientWidth-cards.length*cards[0].offsetWidth-(cards.length-1)*gap)/(cards.length-1))+'px';if(row.style.getPropertyValue(OVERLAP)!==value)row.style.setProperty(OVERLAP,value);}}const cardsFrom=g.data.length;cardPlanes.update({geometry:g,surface,footprint,field,sockets});const cardsTo=g.data.length;if(typeof renderTargetLinks==='function')renderTargetLinks();const towardCenter=(x,y)=>[innerWidth/2+(x-innerWidth/2)*.85,innerHeight/2+(y-innerHeight/2)*.85];const baseCandle=towardCenter(innerWidth-65,115),deckQ=lastDeckQuads.opponent,deckCentre=deckQ?{x:deckQ.reduce((n,p)=>n+p.x,0)/4,y:deckQ.reduce((n,p)=>n+p.y,0)/4}:null,candlePixel=deckCentre?[Math.min(innerWidth-45,deckCentre.x+(baseCandle[0]-deckCentre.x)*1.25),Math.max(90,deckCentre.y+(baseCandle[1]-deckCentre.y)*1.25)]:baseCandle;placeLamp(candlePixel,[a.x,0,a.z]);if(innerWidth>1100){/* (i) Each ornament grows by the visual factor about its own base. */let mark=g.data.length;const grow=o=>{for(let i=mark;i<g.data.length;i+=12){g.data[i]=o[0]+(g.data[i]-o[0])*V_SCALE;g.data[i+1]*=V_SCALE;g.data[i+2]=o[2]+(g.data[i+2]-o[2])*V_SCALE;}mark=g.data.length;};const c=unproject(...candlePixel,0);sceneMetrics.props.push({id:'candle',pixel:candlePixel});craft.candleHolder(g,glow,c[0],c[2]);grow(c);for(let i=0;i<glow.data.length;i+=12){glow.data[i]=c[0]+(glow.data[i]-c[0])*V_SCALE;glow.data[i+1]*=V_SCALE;glow.data[i+2]=c[2]+(glow.data[i+2]-c[2])*V_SCALE;}const bookPixel=bookAnchor(towardCenter(78,150)),book=unproject(...bookPixel,0);sceneMetrics.props.push({id:'books',pixel:bookPixel});craft.books(g,book[0],book[2]);/* Exactly one new ornament: a bronze bookmark beside the books. */g.box(book[0]+.7,.018,book[2]+1.25,.16,.025,.72,gold,3,-.14);grow(book);/* Slice 4: one new bronze screw beside the books, away from controls. */const screwPixel=towardCenter(112,151),screw=unproject(...screwPixel,0);sceneMetrics.props.push({id:'screw',pixel:screwPixel});g.cylinder(screw[0],.012,screw[2],.11,.035,gold,3,16);g.box(screw[0],.049,screw[2],.13,.006,.019,[.034,.025,.016],0,.3);grow(screw);const leaf=unproject(bookPixel[0]+70,bookPixel[1]+22,0),lx=leaf[0],lz=leaf[2],tip=[lx+.20,.025,lz-.42],tail=[lx-.18,.025,lz+.36],ridge=[lx,.055,lz];g.triangle(tip,[lx-.23,.018,lz-.05],ridge,[.30,.14,.035]);g.triangle([lx-.23,.018,lz-.05],tail,ridge,[.25,.10,.025]);g.triangle(tail,[lx+.25,.018,lz+.04],ridge,[.32,.16,.041]);g.triangle([lx+.25,.018,lz+.04],tip,ridge,[.36,.18,.052]);grow(leaf);sceneMetrics.props.push({id:'dry-leaf',pixel:[bookPixel[0]+70,bookPixel[1]+22]});const sealPixel=[candlePixel[0]-38,candlePixel[1]+32],seal=unproject(...sealPixel,0);g.cylinder(seal[0],.012,seal[2],.21,.035,[.22,.045,.021],0,18);g.box(seal[0],.048,seal[2],.17,.006,.025,[.13,.025,.013]);grow(seal);sceneMetrics.props.push({id:'wax-seal',pixel:sealPixel});const washerPixel=[screwPixel[0]+18,screwPixel[1]+6],washer=unproject(...washerPixel,0);g.cylinder(washer[0],.012,washer[2],.09,.018,gold,3,16);g.cylinder(washer[0],.031,washer[2],.055,.002,wood,1,16);grow(washer);sceneMetrics.props.push({id:'bronze-washer',pixel:washerPixel});const dropPixel=[sealPixel[0]-14,sealPixel[1]+6],drop=unproject(...dropPixel,0);g.cylinder(drop[0],.012,drop[2],.065,.018,[.22,.045,.021],0,12);grow(drop);sceneMetrics.props.push({id:'wax-drop',pixel:dropPixel});}
 const nextScene={a:g.data.slice(0,cardsFrom),b:g.data.slice(cardsTo),glow,fullData:window.__HYBRID_VERIFY_INCREMENTAL?g.data.slice():null,key:null,deckInputs};
 layoutRivalHand();updateVeil();{const meshes=[{geo:g},...(glow.data.length?[{geo:glow,castShadow:false}]:[]),...(props?props.build():[])],key=drawKey(meshes);requestDraw(meshes,key);}
 // renderBoard can replace the marked cards without changing the root zoom.
 // Resolve their UIDs again after the new nodes have their final projected poses.
 window.RunaCardEffects?.reposition?.();window.RunaPlatinumEntry?.refreshProtocol?.();lastMetrics.bridgeMs=performance.now()-started;lastMetrics.buildKind='full';builds++;incremental.full++;RunaGeometry.changed();active=true;dirty=false;nextScene.key=layoutKey();sceneCache=nextScene;/* The synchronous projection already handled pending DOM changes. Do not
 rebuild it again for the face wrappers it just created. Later async paints still notify. */tableObserver?.takeRecords();}
function signature(){if(game.hidden)return 'hidden';const ids=['lanes','self-reserve','opponent-reserve','self-head','opponent-head','center-actions','self-deck','opponent-deck'];return [innerWidth,innerHeight,scrollY,...ids.map(id=>{const n=document.getElementById(id);if(!n)return '';const r=rect(n);return [r.x,r.y,r.w,r.h,n.children.length].map(v=>Math.round(v*10)/10).join(',');})].join('|');}
let settledViewport='',settlementFrame=0,initialFit=true;
function buildStable(){
 const key=innerWidth+'x'+innerHeight+':'+game.classList.contains('is-obscured');build();
 if(key===settledViewport||failed||game.hidden)return;
 settledViewport=key;cancelAnimationFrame(settlementFrame);
 if(initialFit)game.classList.add('hybrid-fitting');
 function settle(){
  // The resize has already fitted and projected the new viewport. Its second
  // full fit must not block the mark timer during the short protocol scene.
  if(!initialFit&&document.querySelector('.platinum-protocol-scene')){
   settlementFrame=requestAnimationFrame(settle);return;
  }
  settlementFrame=0;invalidateFit();invalidateScene();
  try{build();lastSignature=signature();}catch(error){showRecovery(error.message);}
  finally{game.classList.remove('hybrid-fitting');initialFit=false;}
 }
 settlementFrame=requestAnimationFrame(()=>{settlementFrame=requestAnimationFrame(settle);});
}
function schedule(force=false){dirty||=force;if(frame)return;frame=requestAnimationFrame(()=>{frame=0;const s=signature();if(dirty||s!==lastSignature){try{buildStable();lastSignature=signature();}catch(e){showRecovery(e.message);}}});}
function showRecovery(reason,automatic=true){
 automatic=automatic&&!recovering;
 const first=!failed;failed=true;active=false;pendingDraw=null;cancelAnimationFrame(frame);frame=0;cancelAnimationFrame(settlementFrame);settlementFrame=0;
 props?.dispose();props=null;canvas.style.display='none';veil.style.display='none';
 document.body.classList.add('hybrid-unavailable');document.body.classList.add('hybrid-active');updateRecovery();
 recoveryText.textContent=automatic?'Seu lugar na partida continua reservado. Tentando recuperar a imagem…':'Não foi possível recuperar a imagem. Tente novamente ou recarregue a página.';
 if(first){recoveryFocus=document.activeElement;if(!game.hidden)retryButton.focus({preventScroll:true});}
 // One automatic attempt per interruption; a manual retry never loops.
 if(automatic&&!recoveryTimer)recoveryTimer=setTimeout(retryScene,800);
}
RunaPresentation.register('emanation-layout',{animations:{'emanation-layout':()=>{if(!failed&&!game.hidden)schedule(true);}}});
try{document.body.classList.add('hybrid-active');tableObserver=new MutationObserver(()=>schedule(true));tableObserver.observe(game,{childList:true,subtree:true});new MutationObserver(()=>{updateRecovery();schedule(true);}).observe(game,{attributes:true,attributeFilter:['hidden']});const rowStyle=row=>(row.getAttribute('style')||'').replace(/--camp-overlap:[^;]*;?/,'');for(const row of document.querySelectorAll('.reserve-camp .card-row')){let style=rowStyle(row);new MutationObserver(()=>{const next=rowStyle(row);if(next!==style){style=next;schedule(true);}}).observe(row,{attributes:true,attributeFilter:['style']});}new ResizeObserver(()=>schedule(true)).observe(document.querySelector('#game>.table'));document.getElementById('camp-log')?.addEventListener('toggle',()=>schedule(true));{const log=document.getElementById('camp-log');if(log)new MutationObserver(()=>syncNow()).observe(log,{attributes:true,attributeFilter:['open']});installRegistro({trigger:()=>logTrigger&&!failed?logTrigger:null});}document.fonts?.ready.then(()=>{invalidateScene();schedule(true);});addEventListener('resize',()=>{invalidateScene();document.querySelector('.platinum-protocol-scene')?syncNow():schedule(true);});addEventListener('scroll',()=>schedule(),{passive:true});canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();contextInvalidated=true;showRecovery('Contexto WebGL interrompido');});canvas.addEventListener('webglcontextrestored',retryScene);createRenderer();schedule(true);}catch(e){showRecovery(e.message);}
window.RunaHybrid={get ready(){return active;},get recovery(){return {unavailable:failed,attempts:recoveries,visible:!recovery.hidden};},get stats(){return {...lastMetrics,builds,draws,incremental:{...incremental,mismatches:[...incremental.mismatches]},active,failed,mode:'gentle',cameraTiltDegrees,cameraTiltFrom:'vertical',cameraEye:eye?[...eye]:null,cameraFovDegrees:cameraFov*180/Math.PI,cameraDistance,lamp:renderer?.lamp?[...renderer.lamp]:null,shadow:renderer?.shadowInfo||null,get webglError(){return renderer?renderer.checkWebglError():0;}};},clearWebglError(){return renderer?renderer.clearWebglError():0;},get faces(){return cardPlanes.diagnostics;},get slabs(){return active&&!failed?[...cardPlanes.slabs]:[];},get anchors(){return anchors.map(({id,screen,world,node})=>{const r=rect(node),q=panelQuads.get(node),expected=q?{x:(Math.min(...q.map(p=>p.x))+Math.max(...q.map(p=>p.x)))/2,y:(Math.min(...q.map(p=>p.y))+Math.max(...q.map(p=>p.y)))/2}:screen;return {id,world,projected:expected,surfaceCenter:screen,projectionKind:q?'surface-bounds':'center',actual:{x:r.cx,y:r.cy},error:Math.hypot(r.cx-expected.x,r.cy-expected.y)};});},zone:node=>zones.get(node)?.map(p=>({x:p.x,y:p.y})),fogZone:node=>{const q=zones.get(node);if(!q)return;const p=q.map(v=>unproject(v.x,v.y,.14)),c=p.reduce((a,v)=>V.add(a,v),[0,0,0]).map(v=>v/4);return p.map(v=>screen(V.add(c,V.scale(V.sub(v,c),1.1))));},get scene(){return sceneMetrics;},overlayTransform:quad=>'matrix3d('+matrix(quad,384,192).join(',')+')',get occluders(){return occluders.map(q=>q.map(p=>({x:p.x,y:p.y})));},get decoration(){return 'wax-drop';},sync:()=>schedule(true)};

function syncNow(){if(failed||game.hidden)return;cancelAnimationFrame(frame);frame=0;try{buildStable();lastSignature=signature();}catch(error){showRecovery(error.message);}}
const projectedPose=node=>{const r=cardPlanes.records.get(node);return r?{quad:r.quad.map(p=>({x:p.x,y:p.y})),w:r.cssW,h:r.cssH}:elementQuad(node);};
// Geometry is an explicit presentation boundary, including strikes started by the visual clock.
const ensureGeometry=()=>{if(!failed&&!game.hidden&&renderer&&(dirty||signature()!==lastSignature))syncNow();};
RunaGeometry.install({pose:node=>failed?elementQuad(node):projectedPose(node),zone:node=>zones.get(node),fogZone:node=>RunaHybrid.fogZone(node),occluders:()=>occluders,field:()=>failed?null:sceneMetrics.field,ensure:ensureGeometry});
window.RunaHybrid.pose=node=>RunaGeometry.pose(node); // Diagnostic compatibility; production effects use RunaGeometry.
const lifecycle=installLifecycle({sync:syncNow,ensureGeometry});focusApi=installFocus({sync:syncNow,lifecycle});
installFlights({sync:syncNow,lifecycle});
installImpacts();
