import {layoutHands} from './fan-layout.js';
import {HYBRID} from './config.js';
// Complete native card: no substitute titles, frame or rules.
const records=new Map();let source=null,hoverRAF=0,sampleRAF=0,sampleBatches=0,lastBatchMs=0,supersampling=2;
function paint(node,record){
 const canvas=node.querySelector('.card-art-canvas');if(!canvas?.width||!record.sourceReady)return;
 const ratio=Math.min(4,Math.max(1,devicePixelRatio||1)*supersampling),w=Math.max(1,Math.round(node.offsetWidth*ratio)),h=Math.max(1,Math.round(node.offsetHeight*ratio)),key=node.visualFaceKey+':'+w+':'+h;
 if(record.pending===key)return;if(record.key===key){record.ticket++;record.pending=null;return;}
 const ticket=++record.ticket,next=document.createElement('canvas');next.width=w;next.height=h;record.pending=key;
 const painting=node.repaintVisualFace?node.repaintVisualFace(next):Promise.resolve().then(()=>{const ink=next.getContext('2d');ink.imageSmoothingEnabled=true;ink.imageSmoothingQuality='high';ink.drawImage(canvas,0,0,w,h);});
 Promise.resolve(painting).then(()=>{if(!node.isConnected||record.ticket!==ticket)return;record.sample.width=w;record.sample.height=h;record.sample.getContext('2d').drawImage(next,0,0);record.key=key;record.pending=null;record.ratio=ratio;node.classList.add('hybrid-hand-ready');});
}
function refresh(){const started=performance.now();sampleRAF=0;for(const [node,record] of records){if(!node.isConnected){record.observer.disconnect();records.delete(node);continue;}paint(node,record);}lastBatchMs=performance.now()-started;sampleBatches++;}
function schedule(){if(!sampleRAF)sampleRAF=requestAnimationFrame(refresh);}
function decorate(){layoutHands();const previous=new Map([...records].map(([node,r])=>[node.dataset.uid,{record:r,connected:node.isConnected}]));for(const node of document.querySelectorAll('#hand>.hand-card')){if(records.has(node))continue;const prior=previous.get(node.dataset.uid),old=prior&&!prior.connected?prior.record:null,sample=old?.key?old.sample:document.createElement('canvas');sample.className='hybrid-hand-sample';sample.setAttribute('aria-hidden','true');node.append(sample);node.classList.add('hybrid-original-hand');const observer=new ResizeObserver(schedule),record={sample,observer,ticket:0,sourceReady:false};if(old?.key){record.key=old.key;record.ratio=old.ratio;node.classList.add('hybrid-hand-ready');}records.set(node,record);observer.observe(node);node.visualReady=Promise.resolve(node.visualReady).then(()=>{record.sourceReady=true;if(node.isConnected)paint(node,record);});}refresh();}
const hand=document.getElementById('hand');new MutationObserver(decorate).observe(hand,{childList:true});addEventListener('resize',()=>{layoutHands();schedule();if(source)queueHover();});addEventListener('scroll',()=>{if(source)queueHover();},{passive:true});decorate();
// Revision 10: while the enlarged card is shown, the original is only made
// transparent. It keeps its box, fan slot, pointer/focus target and handlers, so
// the neighbours do not move and crossing its edge cannot make the preview flicker.
let hiddenSource=null,introSource=null,intros=0,intro=null;
let replacingSource=null;
const preview=document.getElementById('hover-preview');
let strikeFaces=[],readingDismissed=false,pointerX=null,pointerY=null;
let checkPointerAfterRender=false;

// The native strike supplies the actual travel in viewport pixels. Compare the
// two faces at contact with the visible card and glossary, excluding empty space
// in the preview container. A focused reading stays under the player's control.
export function protectContact(from,to,travel,shared){
 if(state?.phase!=='resolving')return;
 strikeFaces=[new DOMRect(from.left+travel.dx,from.top+travel.dy,from.width,from.height),
  new DOMRect(to.left-(shared?travel.dx:0),to.top-(shared?travel.dy:0),to.width,to.height)];
 dismissCoveredReading();
}
function dismissCoveredReading(){
 if(!strikeFaces.length||state?.phase!=='resolving'||!source||preview.hidden||document.activeElement===source)return;
 const covered=[...preview.children].some(panel=>{
  const r=panel.getBoundingClientRect();
  return r.width>0&&r.height>0&&strikeFaces.some(face=>
   r.left<face.right&&r.right>face.left&&r.top<face.bottom&&r.bottom>face.top);
 });
 if(covered){readingDismissed=true;hideHover();}
}
addEventListener('pointermove',event=>{
 if(event.pointerType!=='mouse'||(event.clientX===pointerX&&event.clientY===pointerY))return;
 pointerX=event.clientX;pointerY=event.clientY;strikeFaces=[];
 if(!readingDismissed)return;
 readingDismissed=false;
 // A small movement within the same button does not dispatch mouseenter.
 event.target.closest?.('#hand>.hand-card')?.onmouseenter?.(event);
},{capture:true,passive:true});
addEventListener('pointerdown',()=>{strikeFaces=[];readingDismissed=false;},{capture:true,passive:true});
function concealSource(node){if(hiddenSource===node)return;hiddenSource?.classList.remove('hybrid-hover-source');hiddenSource=node||null;hiddenSource?.classList.add('hybrid-hover-source');}
// `k` is the holder scale (only below 1 when the holder is wider than the viewport)
// and `z` the zoom of the enlarged card; transforms on the card use its own units.
function growFromSource(holder,r,k,z){const big=holder.querySelector(':scope>.card.big');if(!big||matchMedia('(prefers-reduced-motion: reduce)').matches)return;const f=big.getBoundingClientRect();if(!f.width||!r.width)return;const angle=parseFloat(getComputedStyle(source).getPropertyValue('--hybrid-fan-angle'))||0,u=k*z;
 intro=big.animate([{transformOrigin:'0 0',translate:`${(r.x-f.x)/u}px ${(r.y-f.y)/u}px`,scale:String(r.width/f.width),rotate:angle+'deg',opacity:.6},{transformOrigin:'0 0',translate:'0px 0px',scale:'1',rotate:'0deg',opacity:1}],{duration:HYBRID.hover.introMs,easing:'cubic-bezier(.2,.8,.25,1)'});intros++;}
// Revision 11: the enlarged card is sized from the hand card and the viewport height
// (never larger than the native preview) and placed low, its lower edge near the
// bottom of the window so it overlaps the hand region instead of floating above it.
function placeHover(){hoverRAF=0;const holder=document.getElementById('hover-preview');if(!source?.isConnected||holder.hidden){concealSource(null);return;}
 if(checkPointerAfterRender){
  checkPointerAfterRender=false;
  if(document.elementFromPoint(pointerX,pointerY)?.closest('#hand>.hand-card')!==source){hideHover();return;}
 }
 // Measure the card in its resting pose, even when a resize interrupts its entrance.
 if(intro){intro.finish();intro=null;}const r=source.getBoundingClientRect();if(r.bottom<0||r.top>innerHeight){hideHover();return;}
 const H=HYBRID.hover,vw=document.documentElement.clientWidth,big=holder.querySelector(':scope>.card.big');holder.style.left='0px';holder.style.top='0px';holder.style.transformOrigin='0 0';holder.style.transform='none';holder.style.setProperty('--hybrid-hover-zoom','1');
 let hb=holder.getBoundingClientRect(),bb=big?big.getBoundingClientRect():hb;const handW=parseFloat(getComputedStyle(source).width)||r.width,mobile=innerWidth<=620,maxH=(mobile?H.mobileMaxViewportHeight:H.maxViewportHeight)*innerHeight;
 const z=bb.width?Math.min(1,H.widthToHandCard*handW/bb.width,maxH/bb.height):1;holder.style.setProperty('--hybrid-hover-zoom',String(z));hb=holder.getBoundingClientRect();bb=big?big.getBoundingClientRect():hb;
 const k=Math.min(1,(vw-2*H.sideMargin)/hb.width,(innerHeight-H.topMargin-H.bottomInset)/hb.height),bx=(bb.x-hb.x)*k,by=(bb.y-hb.y)*k,bw=bb.width*k,bh=bb.height*k;
 const x=Math.max(H.sideMargin,Math.min(vw-hb.width*k-H.sideMargin,r.x+r.width/2-bx-bw/2)),y=Math.max(H.topMargin,Math.min(innerHeight-H.bottomInset-by-bh,innerHeight-H.bottomInset-hb.height*k));
 holder.style.transform=`translate3d(${x}px,${y}px,0) scale(${k})`;holder.dataset.previewScale=String(k*z);holder.dataset.cardZoom=String(z);concealSource(source);
 dismissCoveredReading();if(source&&introSource===source){introSource=null;growFromSource(holder,r,k,z);}}
function queueHover(){if(!hoverRAF)hoverRAF=requestAnimationFrame(placeHover);}
function projectedShowHover({card,event},fallback){
 const previous=source,next=[...hand.children].find(n=>n.dataset.uid===card.uid)||null;
 if(readingDismissed&&next&&document.activeElement!==next)return;
 source=next;
 fallback();
 preview.classList.toggle('hybrid-hand-preview',Boolean(source));
 if(!source||preview.hidden){
  concealSource(null);
  if(preview.hidden)source=null;
  return;
 }
 if(document.activeElement===source)checkPointerAfterRender=false;
 if(source!==previous||hiddenSource!==source)introSource=source;
 queueHover();
};
function projectedMoveHover({event},fallback){if(source?.isConnected&&!document.getElementById('hover-preview').hidden){queueHover();return;}fallback();};
function projectedHideHover({event},fallback){
 // Replacing the focused button dispatches blur inside renderHand. Ordinary
 // blur (Tab, a dialog or another control) must still close the consultation.
 if(event?.type==='blur'&&event.target===replacingSource)return;
 if(event?.type==='mouseleave'&&!event.target.isConnected&&source?.isConnected)return;
 cancelAnimationFrame(hoverRAF);
 hoverRAF=0;source=null;introSource=null;checkPointerAfterRender=false;
 concealSource(null);
 preview.classList.remove('hybrid-hand-preview');
 fallback();
};
RunaPresentation.register('hand-reading',{
 beforePart(kind){
  if(kind!=='hand')return;
  if(state?.phase!=='resolving')strikeFaces=[];
  const previous=source;if(!previous?.isConnected)return;
  replacingSource=previous;return {previous,hadFocus:document.activeElement===previous};
 },
 afterPart(kind,player,before){
  if(kind!=='hand')return;replacingSource=null;if(!before)return;
  const {previous,hadFocus}=before;if(source!==previous)return;
  const replacement=[...hand.children].find(node=>node.dataset.uid===previous.dataset.uid);
  if(!replacement){hideHover();return;}
  source=replacement;if(introSource===previous)introSource=replacement;concealSource(replacement);
  checkPointerAfterRender=!hadFocus&&pointerX!==null;
  if(hadFocus&&document.activeElement===document.body)replacement.focus({preventScroll:true});
  queueHover();
 }
});
// A hidden source that leaves the hand (render, drag, draw) is never left transparent.
new MutationObserver(()=>{if(hiddenSource&&(!hiddenSource.isConnected||hiddenSource.parentElement!==hand))concealSource(null);}).observe(hand,{childList:true});
window.RunaHybridHand={get stats(){return {cards:records.size,activeSource:!!source,concealed:hiddenSource?.dataset.uid||null,intros,ratios:[...records.values()].map(r=>r.ratio),sampleBatches,lastBatchMs,supersampling,identity:'native-complete'};},resample:schedule,setSupersampling(value){supersampling=Math.max(1,Math.min(4,Number(value)||2));schedule();}};

RunaPresentation.register('hand-hover',{animations:{showHover:projectedShowHover,moveHover:projectedMoveHover,hideHover:projectedHideHover}});
