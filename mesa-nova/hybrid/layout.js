import {layoutHands,handEnvelope,rivalEdgeLift} from './fan-layout.js';
import {HYBRID} from './config.js';
// Fit presentation only. Nine-card envelope is independent of the current hand.
// The transient unprojected combat DOM is not a height constraint; normal flow
// and the complete HUD envelope are. Final projected overflow is checked in QA.
// Revision 11 separates three numbers: the responsive fit (same search and same
// revision-10 composition as before, capped at 1.15), the requested visual factor
// (HYBRID.visualScale, applied once on top of the fit) and the growth measured in QA.
// The compact hand/Patron composition is only switched on after the fit is chosen,
// so the fit cannot silently absorb the requested growth.
const root=document.documentElement,game=document.getElementById('game');let cached='',scale=1,stats={};
const number=(s,k)=>parseFloat(s[k])||0;
function apply(fit,visual=1,composition=1){const value=fit*visual;scale=value;root.style.setProperty('--hybrid-owner-composition',String(composition));const table=game.querySelector('.table'),style=getComputedStyle(table),available=table.clientWidth-number(style,'paddingLeft')-number(style,'paddingRight'),desktop=innerWidth>900,boardAvailable=available-(desktop?16:0),baseLaneH=(innerHeight<=820?180:240)*visual,baseBoardH=(innerHeight<=820?202:250)*visual,baseWidth=Math.max(1,Math.min(1420,boardAvailable)-249.6),sidePhysical=desktop?Math.min(116*value,Math.max(116*visual,(boardAvailable-baseWidth*visual-17.6)/2)):0,laneWidth=desktop?Math.min(baseWidth*1.15*visual,boardAvailable-sidePhysical*2-17.6):boardAvailable,boardWidth=desktop?laneWidth+sidePhysical*2+17.6:boardAvailable;
 for(const [key,v] of Object.entries({'--hybrid-play-scale':value,'--hybrid-ui-width':available/value+'px','--hybrid-board-width':boardWidth/value+'px','--hybrid-side-width':sidePhysical/value+'px','--hybrid-board-height':baseBoardH/value+'px','--hybrid-lane-height':baseLaneH/value+'px','--hybrid-base-lane-height':baseLaneH}))root.style.setProperty(key,String(v));
 // Flow height reserved for each fixed hand: its visible strip plus the configured
 // gap to the Patron band. Read from the count-independent nine-card envelope.
 const hands=handEnvelope();root.style.setProperty('--hybrid-hand-reserve',(hands.ownVisible+HYBRID.hand.patronGap)/value+'px');root.style.setProperty('--hybrid-rival-reserve',(hands.rivalVisible+HYBRID.hand.rivalGap)/value+'px');
 const near=game.querySelector('.self-camp'),far=game.querySelector('.opponent-camp');if(near&&far){far.style.zoom=value*(Number(far.dataset.hybridScale)||.82);far.style.width=near.getBoundingClientRect().width/value+'px';}
 layoutHands();return {available,baseWidth,laneWidth,boardWidth,baseLaneH,zoom:value,fit,visual,hands};}
function envelope(){const bands=[...game.querySelectorAll('.player-band')].map(n=>n.getBoundingClientRect()),hand=handEnvelope();return {primaryTop:Math.min(...bands.map(r=>r.top)),primaryBottom:Math.max(...bands.map(r=>r.bottom)),rivalVisible:hand.rivalVisible,ownVisible:hand.ownVisible,intentionalEdgeCrop:true,documentHeight:document.documentElement.scrollHeight,flowBottom:game.querySelector('.hand-zone').getBoundingClientRect().bottom+number(getComputedStyle(game.querySelector('.table')),'paddingBottom')};}
// Formation addendum, block A: Patron portrait × HYBRID.formA.portrait and ability rings × formA.ring, applied once
// over the V2 sizes of the current breakpoint, proportions kept. The portrait column and the band grow by the same
// amount, so the fit below measures the real height and nothing overlaps the reserve or the hand; the rings scale
// with their cost badge (CSS zoom, bridge.css), so the badge stays seated on the ring.
function sizePatrons(){const A=HYBRID.formA;root.style.setProperty('--hybrid-ring-scale',String(A.ring));
 for(const band of game.querySelectorAll('.player-band')){const fighter=band.querySelector('.fighter'),avatar=band.querySelector('.patron-avatar');if(!fighter||!avatar)continue;
  for(const n of [band,fighter,avatar])for(const k of ['width','height','min-height','grid-template-columns'])n.style.removeProperty(k);
  if(A.portrait===1||!avatar.offsetWidth)continue;const px=(n,k)=>parseFloat(getComputedStyle(n)[k])||0,aw=px(avatar,'width'),ah=px(avatar,'height'),dw=aw*(A.portrait-1),dh=ah*(A.portrait-1),fw=px(fighter,'width'),fh=px(fighter,'height'),bh=px(band,'height'),cols=getComputedStyle(band).gridTemplateColumns.split(' ').map(parseFloat);
  avatar.style.width=aw+dw+'px';avatar.style.height=ah+dh+'px';fighter.style.width=fw+dw+'px';fighter.style.gridTemplateColumns=fw+dw+'px';fighter.style.height=fh+dh+'px';
  if(cols.length===3&&cols.every(Number.isFinite))band.style.gridTemplateColumns=`minmax(0,1fr) ${cols[1]+dw}px minmax(0,1fr)`;band.style.height=bh+dh+'px';band.style.minHeight=bh+dh+'px';}}
export function fitLayout(){const key=innerWidth+'x'+innerHeight+':'+game.classList.contains('is-obscured');if(key===cached)return scale;const trials=[];let chosen=1.15;sizePatrons();
 // Responsive fit with the unchanged revision-10 composition.
 game.classList.remove('hybrid-compact');apply(chosen);if(innerWidth>900){let lo=1,hi=1.15;for(let i=0;i<9;i++){const v=i===0?1.15:(lo+hi)/2;apply(v);const e=envelope(),ok=e.primaryTop>=e.rivalVisible+8&&e.primaryBottom<=innerHeight-e.ownVisible-10&&e.flowBottom<=innerHeight-4;trials.push({scale:v,...e,ok});if(ok){lo=v;if(v===1.15){lo=1.15;break;}}else hi=v;}chosen=Math.floor(lo*1000)/1000;}
 // Requested growth, once, then the compact desktop composition.
 if(innerWidth>900)game.classList.add('hybrid-compact');
 // If the grown flow no longer fits, the excess goes to the top (rival side), never
 // under the own hand: own Patron, powers and reserve stay reachable. The rival fan
 // then shows a shorter strip above its band; QA reports that crop explicitly.
 const O=HYBRID.owner,rivalBand=()=>game.querySelector('#opponent-head')?.closest('.player-band')?.getBoundingClientRect().top??Infinity;
 const grow=composition=>{game.classList.remove('hybrid-overflow');const plan=apply(chosen,HYBRID.visualScale*composition,composition);let overflow=0;if(innerWidth>900){overflow=Math.max(0,game.querySelector('.hand-zone').getBoundingClientRect().bottom-innerHeight);if(overflow>.5){game.classList.add('hybrid-overflow');layoutHands();}}return {plan,overflow};};
 // UI-owner revision: the composition factor (HYBRID.owner.composition) is applied in
 // full unless the overflow would push the rival Patron band within rivalMinStrip of
 // the top (its name, ether and powers must stay on screen, with a strip of the rival
 // fan above them). Then the largest factor in [1, composition] that keeps the band
 // there is used; the 1.15 hand target does not depend on it (fan-layout.js).
 // On every width the grown composition must also not create horizontal page scrolling
 // (narrow phones: the side panels already use all the width).
 // UI-owner continuation: rivalMinStrip is the strip of EVERY back of a nine-card rival
 // fan, i.e. of the outermost back, which ends rivalEdgeLift() px higher than the centre
 // one (the first version protected only the centre back: outer strips of 11.8–13.7 px).
 // Continuation: on 320 px the grown Patron bands pushed the ether blocks 3 px past the
 // left edge without any page scroll; the ten ether points must stay entirely on screen.
 // On phones the Nartvanyr panel is limited by the viewport, so a larger zoom leaves its
 // graveyard columns narrower in CSS px; their labels/counts must not overflow (at 390 px
 // "RIVAL" overflowed its column by 1 px at composition 1.10).
 const etherInView=()=>[...game.querySelectorAll('.player-band .patron-ether')].every(n=>{const r=n.getBoundingClientRect();return !r.width||(r.left>=-.5&&r.right<=innerWidth+.5);});
 // Sub-pixel text boxes (Range), not scrollWidth, which rounds to whole CSS px.
 const graveyardsFit=()=>innerWidth>900||[...game.querySelectorAll('.board>.nartvanyr>div')].every(d=>{const c=d.getBoundingClientRect(),range=document.createRange();return [...d.childNodes].filter(n=>n.nodeType===3&&n.textContent.trim()).every(n=>{range.selectNodeContents(n);const r=range.getBoundingClientRect();return r.left>=c.left-.5&&r.right<=c.right+.5;});});
 const limit=()=>O.rivalMinStrip+HYBRID.hand.rivalGap+rivalEdgeLift(9),fits=()=>(innerWidth<=900||rivalBand()>=limit())&&document.documentElement.scrollWidth<=document.documentElement.clientWidth+.5&&etherInView()&&graveyardsFit();
 // V2: the general factor (HYBRID.v2.global) is requested once on top of the V1 composition and limited by the
 // same fit; stats report the request, the applied factor and the part of the V2 factor that fitted.
 const requested=O.composition*HYBRID.v2.global;
 let composition=requested,result=grow(composition),compositionTrials=[];
 if(!fits()){let lo=1,hi=requested;for(let i=0;i<8;i++){const c=(lo+hi)/2;grow(c);const ok=fits();compositionTrials.push({composition:c,bandTop:innerWidth>900?rivalBand():null,scrollWidth:document.documentElement.scrollWidth,ok});if(ok)lo=c;else hi=c;}composition=Math.floor(lo*1000)/1000;result=grow(composition);}
 const {plan,overflow}=result;
 cached=key;const after=innerWidth>900?envelope():null;
 stats={requested:1.15,fit:chosen,scale:chosen,limited:chosen<1.15,visualScale:HYBRID.visualScale,composition,compositionRequested:requested,compositionLimited:composition<requested,compositionV1:O.composition,v2GlobalApplied:composition/O.composition,compositionTrials,rivalBandTop:innerWidth>900?rivalBand():null,rivalBandLimit:innerWidth>900?limit():null,rivalEdgeLift:rivalEdgeLift(9),zoom:plan.zoom,compact:innerWidth>900,overflow,plan,trials,after};return scale;}
// Effective zoom of the play contents (responsive fit × requested visual factor).
export function playScale(){return scale;}
// Applied composition (V1 owner factor × the part of the V2 general factor that fitted).
export function compositionApplied(){return stats.composition||HYBRID.owner.composition;}
export function invalidateFit(){cached='';}
window.RunaHybridLayout={get stats(){return {...stats};}};
