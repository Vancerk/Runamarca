import {HYBRID} from './config.js';
// The slot gets a presentation of an already public native card. No game lookup.
const descriptions=new WeakMap();
RunaPresentation.register('emanation-description',{notify(kind,p){if(kind==='card-created'&&!p.back)descriptions.set(p.node,p.card.silenced?'Silenciado':p.card.text||'');}});
// Revision 11: vertical compact face. Illustration in the upper region, card text in
// its own lower region, and on top the card's own native liquid heart: the
// `.health-liquid` canvas painted by app.js updateLiquidHeart()/drawLiquidHeart()
// and the `.card-stats-svg .health-value` number updated by applyHealthUpdates().
// They are not redrawn or copied here, only windowed onto the heart region, so
// damage, healing, buffs and the liquid animation stay exactly native.
// Heart region in the 900-px card bitmap: drawHeart(826,y) at 1.15× with a 15-px rim.
const HEART={cx:826,half:70,above:62,below:64};
const STYLE_KEYS=['position','inset','left','top','width','height','clip-path','z-index'];
// Native stacking is kept: liquid canvas below, SVG number above it.
function windowOnto(el,{left,top,s,height,heartY}){if(!el)return;const set={position:'absolute',inset:'auto',left:left+'px',top:top+'px',width:900*s+'px',height:height*s+'px','clip-path':`inset(${(heartY-HEART.above)*s}px ${(900-HEART.cx-HEART.half)*s}px ${(height-heartY-HEART.below)*s}px ${(HEART.cx-HEART.half)*s}px)`,'z-index':el.matches('.card-stats-svg')?'4':'3'};for(const [k,v] of Object.entries(set))if(el.style.getPropertyValue(k)!==v)el.style.setProperty(k,v);}
export function attachEmanation(node,record){
 if(record.emanation||node.classList.contains('back'))return;
 const face=document.createElement('span'),artBox=document.createElement('span'),art=document.createElement('canvas'),description=document.createElement('span');
 face.className='hybrid-emana-face';face.setAttribute('aria-hidden','true');artBox.className='emana-art';art.className='emana-illustration';art.width=480;art.height=240;description.className='emana-description';description.textContent=descriptions.get(node)??node.getAttribute('aria-label')?.split(' · ').slice(2).join(' · ')??'';
 artBox.append(art);face.append(artBox,description);record.face.append(face);node.classList.add('hybrid-emana-card');face.style.setProperty('--emana-art-fraction',HYBRID.emanaFace.artFraction*100+'%');
 // Reading the description must not start a native drag. Illustration and heart
 // keep the original button drag, click, keyboard and targeting handlers.
 description.addEventListener('pointerdown',e=>e.stopPropagation());
 const nativeHealth=()=>node.querySelector('.card-stats-svg .health-value'),originalLabel=node.getAttribute('aria-label')||'',combat=node.classList.contains('combat-card'),heartY=combat?747:1180,bitmapH=combat?820:1260;
 const syncHealth=()=>{const value=nativeHealth()?.textContent||'',label=originalLabel+' · vida '+value;if(node.getAttribute('aria-label')!==label)node.setAttribute('aria-label',label);};
 const observer=new MutationObserver(syncHealth),health=nativeHealth();if(health)observer.observe(health,{childList:true,characterData:true,attributes:true,subtree:true});syncHealth();
 // Illustration crop: the native art window of the card bitmap, cover-fitted to the
 // current region aspect. Redrawn only when that aspect changes (no paint loop).
 let source=null,drawnAspect=0;
 const drawArt=()=>{if(!source?.width)return;const sx=source.width*55/900,sy=source.height*(combat?55/820:135/1260),sw=source.width*790/900,sh=source.height*(combat?630/820:700/1260),ink=art.getContext('2d'),k=Math.max(art.width/sw,art.height/sh),w=sw*k,h=sh*k;ink.clearRect(0,0,art.width,art.height);ink.imageSmoothingEnabled=true;ink.imageSmoothingQuality='high';ink.drawImage(source,sx,sy,sw,sh,(art.width-w)/2,(art.height-h)*.35,w,h);};
 const originalReady=node.visualReady;node.visualReady=Promise.resolve(originalReady).then(()=>{source=node.querySelector('.card-art-canvas');drawArt();});
 // UI-owner revision, item 9: the complete card text is shown without an internal
 // scroll bar. The text keeps its full content; the illustration gives up height first
 // (artFraction → minArtFraction) and the font steps down to a readable floor
 // (HYBRID.emanaFace.fontPx, screen pixels). Recomputed only when the text or the
 // face size changes. If even the smallest step cannot hold the text (tiny phones),
 // the face is marked data-text-fit="detail": the text stays complete in the DOM and
 // the card's native detail (click/tap) shows the whole card without inner scroll.
 let fitKey='';
 const fit=(unit,width,faceH)=>{const focus=globalThis.RunaHybridFocus?.value;if(fitKey&&focus>0&&focus<1)return;const E=HYBRID.emanaFace,key=[description.textContent,Math.round(width*10),Math.round(faceH*10),Math.round(unit*1000)].join('|');if(key===fitKey)return;
  // Not laid out yet (hidden slot, first build): measure on a later update.
  if(!face.isConnected||!description.clientWidth||!description.getClientRects().length){fitKey='';return;}fitKey=key;
  const fonts=innerWidth<=600?E.fontPx.mobile:E.fontPx.desktop,steps=[];for(let a=E.artFraction;a>=E.minArtFraction-1e-6;a-=.06)steps.push(+a.toFixed(3));
  // Desktop last resort: text over the whole face, art hidden. Not on phones (continuation):
  // there a face without its illustration lost the card's identity in the socket; the
  // "detail" mode below keeps the full illustration and opens the complete card instead.
  if(innerWidth>600)steps.push(0);
  let chosen=null;for(const art of steps){face.style.setProperty('--emana-art-fraction',art*100+'%');for(const px of fonts){description.style.fontSize=px/unit+'px';if(description.scrollHeight<=description.clientHeight+1&&description.scrollWidth<=description.clientWidth+1){chosen={art,px};break;}}if(chosen)break;}
  if(!chosen){face.style.setProperty('--emana-art-fraction',steps.at(-1)*100+'%');description.style.fontSize=fonts.at(-1)/unit+'px';}
  face.dataset.textFit=chosen?'complete':'detail';face.dataset.fontPx=String(chosen?.px??fonts.at(-1));face.dataset.artFraction=String(chosen?.art??steps.at(-1));face.dataset.descriptionOverflow=String(description.scrollHeight>description.clientHeight+1);};
 record.emanation={face,description,update(width,quad){
  const physicalWidth=(Math.hypot(quad[1].x-quad[0].x,quad[1].y-quad[0].y)+Math.hypot(quad[2].x-quad[3].x,quad[2].y-quad[3].y))/2,unit=physicalWidth/width,E=HYBRID.emanaFace,faceH=record.cssH||width,artH=faceH*E.artFraction;
  const aspect=Math.round(artH/width*1000)/1000;// drawn for the largest art region; smaller fitted regions crop it (cover) via CSS
if(aspect&&aspect!==drawnAspect){drawnAspect=aspect;art.height=Math.max(60,Math.round(480*aspect));drawArt();}
  // Native heart window, top right, with a readable minimum on the table.
  const heartW=Math.max(E.minHeartPx/unit,E.heartWidthOfFace*width),s=heartW/(2*HEART.half),margin=2/unit,left=width-margin-heartW-(HEART.cx-HEART.half)*s,top=margin-(heartY-HEART.above)*s;
  for(const el of [node.querySelector('.health-liquid'),node.querySelector('.card-stats-svg')])windowOnto(el,{left,top,s,height:bitmapH,heartY});
  const nativeFont=parseFloat(getComputedStyle(nativeHealth()||node).fontSize)||51.2;face.dataset.heartPx=String(heartW*unit);face.dataset.lifeGrowth=String((heartW*unit)/(2*HEART.half*physicalWidth/900));face.dataset.nativeFont=String(nativeFont);
  fit(unit,width,faceH);syncHealth();},
  dispose(){observer.disconnect();face.remove();node.classList.remove('hybrid-emana-card');for(const el of [node.querySelector('.health-liquid'),node.querySelector('.card-stats-svg')])if(el)for(const k of STYLE_KEYS)el.style.removeProperty(k);}};
}
