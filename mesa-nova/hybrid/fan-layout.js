// Geometry of the existing hand buttons only. No game state or network access.
import {HYBRID} from './config.js';
const own=document.getElementById('hand'),rival=document.getElementById('opponent-hand');
let stats={};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// S3: layout.js writes these variables inline on <html>; reading the inline declaration gives
// the same value without forcing a style recalculation (measured: ~270 ms of a 1.6 s resize in
// the per-frame lifecycle render). The computed value stays as fallback when none is inline.
const rootVar=name=>{const v=document.documentElement.style.getPropertyValue(name);return v!==''?v:getComputedStyle(document.documentElement).getPropertyValue(name);};
const ownerComposition=()=>Number(rootVar('--hybrid-owner-composition'))||1;
// Claude round 4 (reveal lag): the stylesheet size of a hand card was read by removing its inline size, reading the
// computed style and writing the size back — a forced style recalculation on every fan (three per render). That size
// depends only on the viewport, the root variables and the classes involved, so it is kept per that key and measured
// again only when one of them changes.
const baseSizes=new Map();
function dimensions(nodes,isOwn,scale){
 const first=nodes[0];
 const sizeKey=first?[isOwn,innerWidth,innerHeight,devicePixelRatio,scale,document.documentElement.getAttribute('style'),document.documentElement.className,document.body.className,document.getElementById('game')?.className,first.parentElement?.className,first.className].join('|'):null;
 let cached=sizeKey?baseSizes.get(sizeKey):null;
 if(first&&!cached){first.style.removeProperty('width');first.style.removeProperty('height');const css=getComputedStyle(first);cached={w:parseFloat(css.width),h:parseFloat(css.height)};if(baseSizes.size>64)baseSizes.clear();baseSizes.set(sizeKey,cached);}
 const baseW=cached?cached.w:isOwn?(innerWidth<=600?102:innerHeight<=820?86:108):(innerWidth<=600?54:innerHeight<=820?54:64);
 const baseH=cached?cached.h:baseW*(isOwn?1.4:1.40625);
 const viewport=document.documentElement.clientWidth||innerWidth;
 // Revision 11: the narrow-screen caps also grow by the visual factor, so mobile
 // hands get the requested 15% too; any resulting edge crop is reported in QA.
 // UI-owner revision: `scale` now includes the composition factor (layout.js). The
 // revision-11 width is computed without it and then multiplied ONCE by the final
 // target of this hand: HYBRID.owner.hand (1.15) for the own hand, the composition
 // factor for the rival backs. Narrow-screen caps grow by the same factor, so the
 // requested size is not silently absorbed by the responsive cap.
 const composition=ownerComposition(),base=scale/composition,factor=isOwn?HYBRID.owner.hand:composition;
 const V=HYBRID.visualScale,previousWidth=Math.min(baseW*base,innerWidth<=600?(viewport-28)/(isOwn?3.3:5.2)*V:Infinity);
 const w=Math.min(baseW*base*1.25,innerWidth<=600?(viewport-28)/(isOwn?2.8:4.4)*V:Infinity)*factor;
 return {w,h:w*baseH/baseW,previousWidth,growth:w/previousWidth,ownerFactor:factor};
}
const fanAngle=count=>count<=1?0:Math.min(innerWidth<=600?10:18,Math.max(6,(count-1)*2.2));
const fanSag=(count,isOwn)=>Math.min(isOwn?24:16,Math.max(0,count-1)*(isOwn?3:2));
function fan(nodes,isOwn,scale){
 const row=isOwn?own:rival,viewport=document.documentElement.clientWidth||innerWidth,{w,h,previousWidth,growth,ownerFactor}=dimensions(nodes,isOwn,scale),count=nodes.length,mid=(count-1)/2;
 const maxAngle=fanAngle(count);
 const angle=maxAngle*Math.PI/180;
 const halfEdge=w/2*Math.cos(angle)+h*Math.sin(angle);
 // Revision 11: the fan span grows with the visual factor, so overlap stays as before.
 // UI-owner revision: and with the owner factor of this hand, so larger cards keep the overlap.
 const available=Math.min(viewport-(innerWidth<=600?28:96),(isOwn?920:760)*HYBRID.visualScale*ownerFactor);
 const step=count<=1?0:Math.max(0,Math.min(w*(isOwn?.58:.64),(available-2*halfEdge)/(count-1)));
 const previousHeight=h/growth,oldVisible=isOwn?clamp(previousHeight*.54,innerWidth<=600?58:64,100):clamp(previousHeight*.56,30,62),previousVisible=oldVisible+.25*Math.max(0,previousHeight-oldVisible),visible=previousVisible*growth;
 // Revision 11: when the grown desktop flow overflows to the top, the rival strip
 // ends above the rival band instead of covering it (extra crop is reported).
 const focusing=innerWidth>900&&(document.body.classList.contains('hybrid-focus')||(globalThis.RunaHybridFocus?.value||0)>0);
 let shown=visible;if(!isOwn&&(focusing||document.getElementById('game').classList.contains('hybrid-overflow'))){const band=document.getElementById('opponent-head')?.closest('.player-band');if(band){const top=focusing?Math.min(...[band,...band.querySelectorAll('.patron-avatar,.patron-power,.patron-ether')].map(n=>n.getBoundingClientRect().top)):band.getBoundingClientRect().top,limit=top+scrollY-HYBRID.hand.rivalGap;if(limit<visible)shown=Math.max(0,limit);}}
 const top=isOwn?innerHeight-visible:shown-h-scrollY;
 Object.assign(row.style,{zoom:String(1/scale),width:viewport+'px',left:'0px',top:isOwn?'auto':top+'px',bottom:isOwn?'0px':'auto',height:(isOwn?visible:0)+'px'});
 nodes.forEach((node,i)=>{
  const relative=mid?(i-mid)/mid:0,sag=fanSag(count,isOwn);
  const rotation=relative*maxAngle*(isOwn?1:-1),rise=relative*relative*sag*(isOwn?1:-1);
  node.style.setProperty('width',w+'px','important');node.style.setProperty('height',h+'px','important');
  node.style.left=(viewport/2+(i-mid)*step-w/2)+'px';node.style.top='0px';
  node.style.setProperty('--hybrid-fan-angle',rotation+'deg');node.style.setProperty('--hybrid-fan-rise',rise+'px');
 });
 return {count,width:w,height:h,step,maxAngle,visible:shown,designVisible:visible,overflowCrop:visible-shown,previousVisible,previousWidth,requestedGrowth:1.25,historicalGrowth:growth/ownerFactor,effectiveGrowth:growth,ownerFactor,responsiveCap:innerWidth<=600?(viewport-28)/(isOwn?2.8:4.4)*HYBRID.visualScale*ownerFactor:null,top,viewport};
}
export function layoutHands(){
 const scale=Number(rootVar('--hybrid-play-scale'))||1;
 stats={own:fan([...own.querySelectorAll(':scope>.hand-card:not([data-hybrid-waiting])')],true,scale),rival:fan([...rival.querySelectorAll(':scope>.rival-hand-back')],false,scale),scale,intentionalEdgeCrop:true};
 return stats;
}
// Reframe only the rival backs after the formation focus moves its Patron band.
export function layoutRivalHand(){stats.rival=fan([...rival.querySelectorAll(':scope>.rival-hand-back')],false,Number(rootVar('--hybrid-play-scale'))||1);}
export function handEnvelope(){
 // UI-owner revision: same envelope as revision 11 at the scale without the composition
 // factor, then the final factor of each hand (own 1.15, rival = composition).
 const composition=ownerComposition(),scale=(Number(rootVar('--hybrid-play-scale'))||1)/composition;
 const ownH=innerWidth<=600?102*1.4:innerHeight<=820?86*1.4:108*1.4;
 const rivalH=innerWidth<=600||innerHeight<=820?76:90;
 const ownOld=clamp(ownH*scale*.54,innerWidth<=600?58:64,100),rivalOld=clamp(rivalH*scale*.56,30,62);return {ownVisible:(ownOld+.25*Math.max(0,ownH*scale-ownOld))*1.25*HYBRID.owner.hand,rivalVisible:(rivalOld+.25*Math.max(0,rivalH*scale-rivalOld))*1.25*composition};
}
// UI-owner continuation: how much higher the bottom edge of the outermost back of a
// nine-card rival fan ends than the centre back (rise plus rotation about the top
// centre: sag + h·(1−cos φ) − w/2·sin φ). Read from the last layout, no side effects.
export function rivalEdgeLift(count=9){const r=stats.rival;if(!r?.height)return 0;const a=fanAngle(count)*Math.PI/180;return fanSag(count,false)+r.height*(1-Math.cos(a))-r.width/2*Math.sin(a);}
new MutationObserver(layoutHands).observe(rival,{childList:true});
addEventListener('scroll',()=>{if(stats.rival)rival.style.top=(stats.rival.visible-stats.rival.height-scrollY)+'px';},{passive:true});
window.RunaHybridFan={get stats(){return stats;},layout:layoutHands};
