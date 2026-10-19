/* The approved four-position orbit: front, right, back, left. */
(function(root){
 'use strict';let mounted=null,choiceCapture=null;
 const mod=(n,d)=>(n%d+d)%d,element=(tag,cls,text)=>{const e=document.createElement(tag);e.className=cls||'';if(text)e.textContent=text;return e;};
 function capture(deckId){
  const holder=document.getElementById('deck-options');if(!holder||holder.getBoundingClientRect().width===0)return null;
  const orbit=holder.querySelector('.contract-orbit'),orbitRect=orbit.getBoundingClientRect();
  const items=[...holder.querySelectorAll('.deck-option')].map(node=>{
   const rect=node.getBoundingClientRect();if(!rect.width)return null;
   const copy=node.cloneNode(true);copy.inert=true;return {copy,affinity:['forja','fluxo','ruptura'].find(x=>node.classList.contains(x)),rect:{left:rect.left,top:rect.top,width:rect.width,height:rect.height},chosen:node.dataset.deckId===deckId};
  }).filter(Boolean);return items.length?{items,orbit:{left:orbitRect.left,top:orbitRect.top,width:orbitRect.width,height:orbitRect.height,perspective:getComputedStyle(orbit).perspective},at:performance.now()}:null;
 }
 function mount(holder,decks,build,onChoose,chosenId){
  mounted?.destroy();holder.replaceChildren();holder.className='deck-options contract-carousel';
  const lobby=document.getElementById('lobby');if(lobby){lobby.classList.add('contract-lobby');if(!lobby.querySelector(':scope>.contract-backdrop'))lobby.prepend(element('div','contract-backdrop'));}
  const orbit=element('div','contract-orbit');orbit.setAttribute('aria-label','Arraste para escolher um deck');holder.append(orbit);
  const nodes=decks.map(deck=>{const node=build(deck);node.setAttribute('aria-label',deck.name);node.append(element('div','contract-pack-back'),element('i','contract-pack-spine'),element('i','contract-pack-spine left'),element('i','contract-pack-top'));node.querySelectorAll('img').forEach(x=>x.draggable=false);orbit.append(node);return node;});
  const prev=element('button','orbit-arrow orbit-prev','‹'),next=element('button','orbit-arrow orbit-next','›');prev.type=next.type='button';prev.setAttribute('aria-label','Deck anterior');next.setAttribute('aria-label','Próximo deck');holder.append(prev,next);
  const caption=element('div','orbit-caption'),name=element('strong'),count=element('small'),plan=element('p'),choose=element('button');choose.type='button';caption.append(name,count,plan,choose);holder.append(caption);
  let turn=Math.max(0,decks.findIndex(d=>d.id===chosenId)),target=turn,raf=0,drag=null,locked=Boolean(chosenId),destroyed=false;
  const index=()=>mod(Math.round(target),decks.length);
  function draw(){const width=orbit.clientWidth,radius=Math.min(310,width*.32),depth=Math.min(300,width*.32);nodes.forEach((node,i)=>{const angle=(i-turn)*Math.PI*2/decks.length,c=Math.cos(angle),s=Math.sin(angle);node.classList.toggle('is-front',i===index());node.style.zIndex=String(Math.round(20+c*10));node.style.opacity='1';node.style.transform=`translate(-50%,-50%) translate3d(${s*radius}px,${(1-c)*-19}px,${(c-1)*depth}px) rotateY(${-s*34+Math.max(0,-c)*180}deg) rotateZ(${-s*3}deg)`;node.style.setProperty('--orbit-brightness',String(.48+.52*(c+1)/2));node.inert=true;});const deck=decks[index()];name.textContent=deck.name;plan.textContent=deck.plan;count.textContent=`${index()+1} / ${decks.length} · ${deck.affinity}`;choose.textContent=locked?'Desfazer escolha':'Escolher este deck';choose.disabled=false;prev.disabled=next.disabled=locked;holder.classList.toggle('is-chosen',locked);}
  function go(delta){if(locked||destroyed)return;target+=delta;const from=turn,started=performance.now();cancelAnimationFrame(raf);if(matchMedia('(prefers-reduced-motion: reduce)').matches){turn=target;draw();return;}function frame(now){const t=Math.min(1,(now-started)/740),e=t<.5?4*t*t*t:1-((-2*t+2)**3)/2;turn=from+(target-from)*e;draw();if(t<1)raf=requestAnimationFrame(frame);}raf=requestAnimationFrame(frame);}
  prev.onclick=()=>go(-1);next.onclick=()=>go(1);choose.onclick=()=>{if(locked){choiceCapture=null;onChoose(null);return;}const deck=decks[index()];choiceCapture=capture(deck.id);onChoose(deck);};
  const keys=e=>{if(e.key==='ArrowLeft'){e.preventDefault();go(-1);}if(e.key==='ArrowRight'){e.preventDefault();go(1);}};holder.addEventListener('keydown',keys);
  orbit.addEventListener('pointerdown',e=>{if(locked||e.button!==0)return;cancelAnimationFrame(raf);target=Math.round(turn);drag={id:e.pointerId,x:e.clientX,start:turn,last:e.clientX,moved:false};orbit.setPointerCapture(e.pointerId);});
  orbit.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x;drag.last=e.clientX;drag.moved||=Math.abs(dx)>7;turn=drag.start-dx/Math.max(180,orbit.clientWidth*.35);orbit.classList.toggle('dragging',drag.moved);draw();});
  const end=e=>{if(!drag||drag.id!==e.pointerId)return;target=Math.round(turn);drag=null;orbit.classList.remove('dragging');go(0);};orbit.addEventListener('pointerup',end);orbit.addEventListener('pointercancel',end);
  const resize=new ResizeObserver(draw);resize.observe(orbit);draw();
  mounted={holder,decks,chosenId,destroy(){destroyed=true;cancelAnimationFrame(raf);resize.disconnect();holder.removeEventListener('keydown',keys);},update(id){if(id&&!locked){choiceCapture??=capture(id);target=decks.findIndex(d=>d.id===id);turn=target;locked=true;draw();}this.chosenId=id;},capture:()=>capture(decks[index()].id)};
 }
 root.RunaDeckCarousel={render(holder,decks,build,onChoose,chosenId){if(!decks?.length)return;if(mounted?.holder===holder&&mounted.decks===decks&&!(mounted.chosenId&&!chosenId)){mounted.update(chosenId);return;}choiceCapture=null;mount(holder,decks,build,onChoose,chosenId);},takeCapture(){const c=choiceCapture||mounted?.capture();choiceCapture=null;return c;},reset(){mounted?.destroy();mounted=null;choiceCapture=null;},refresh(){if(mounted){const m=mounted;mounted=null;m.destroy();}},capture};
})(globalThis);
