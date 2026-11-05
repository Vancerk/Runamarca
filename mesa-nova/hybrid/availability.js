// UI-owner revision, item 6: green means "playable now". Presentation only.
// A hand card (and its enlarged preview) is marked data-hybrid-playable="true" only
// when the existing app.js affordable(card) accepts it — the same function the native
// `.payable` class uses, so phase, turn, Study discount and Emanation discounts stay
// in one place — AND no interaction lock is active: a command in flight, the draw
// lock (#hand inert / aria-busy), targeting, a pending entry placement or spell
// confirmation, a drag, a pending discard or an open dialog. Inspecting a card that
// is not playable keeps a neutral highlight; nothing here enables or sends any play.
const hand=document.getElementById('hand'),preview=document.getElementById('hover-preview');
export function playBlocked(){
 try{return Boolean(commandBusy||(typeof pendingEntryPlacement!=='undefined'&&pendingEntryPlacement)||(typeof pendingSpellConfirmation!=='undefined'&&pendingSpellConfirmation)||(typeof activeDrag!=='undefined'&&activeDrag)||globalThis.RunaTargeting?.active?.()||hand.inert||hand.getAttribute('aria-busy')==='true'||seat()?.pendingDiscard||document.querySelector('dialog[open]'));}catch{return true;}
}
// A creature also needs a legal destination, mirroring game.mjs `play`: the reserve
// (at most 8 living creatures outside Emanation) or, for a card with an Emanation
// effect, one of the two Emanation slots. Costs and discounts stay in affordable().
export function hasDestination(card,p=seat()){if(card?.type!=='creature')return true;const reserve=(p?.reserve||[]).filter(c=>c.damage<c.health&&!p.emanation?.includes(c.uid)).length;const emana=(card.effects||[]).some(e=>String(e.timing).includes('emanat'))&&(p?.emanation?.length||0)<2;return reserve<8||emana;}
export function playable(uid,blocked=playBlocked()){if(blocked||!uid)return false;try{const card=seat()?.hand?.find(c=>c.uid===uid);return Boolean(card&&affordable(card)&&hasDestination(card));}catch{return false;}}
let frame=0;
export function refresh(){frame=0;const blocked=playBlocked();hand.classList.toggle('hybrid-play-blocked',blocked);
 for(const node of hand.querySelectorAll(':scope>.hand-card')){const v=String(playable(node.dataset.uid,blocked));if(node.dataset.hybridPlayable!==v)node.dataset.hybridPlayable=v;}
 const big=preview.querySelector(':scope>.card.big');if(big){const v=String(preview.classList.contains('hybrid-hand-preview')&&playable(big.dataset.uid,blocked));if(big.dataset.hybridPlayable!==v)big.dataset.hybridPlayable=v;}}
const queue=()=>{if(!frame)frame=requestAnimationFrame(refresh);};
// Re-evaluated synchronously on the inspection itself and after every render, command,
// lock or dialog change; there is no polling loop.
for(const type of ['pointerover','focusin'])hand.addEventListener(type,refresh,true);
new MutationObserver(queue).observe(hand,{attributes:true,attributeFilter:['inert','aria-busy'],childList:true});
new MutationObserver(refresh).observe(preview,{childList:true,attributes:true,attributeFilter:['class','hidden']});
for(const d of document.querySelectorAll('dialog'))new MutationObserver(queue).observe(d,{attributes:true,attributeFilter:['open']});
RunaPresentation.register('availability',{after:refresh,notify:kind=>{if(kind==='interaction')queue();}});
addEventListener('pointerup',queue,true);addEventListener('keyup',queue,true);
window.RunaHybridAvailability={refresh,playBlocked,playable,hasDestination};
