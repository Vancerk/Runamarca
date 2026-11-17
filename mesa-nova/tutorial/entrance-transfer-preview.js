// Generated from app.js animateTransfer. Keep this rehearsal identical to production.
async function animateTransfer(options){
 const ticket=options.ticket===undefined?RunaCardArrivals.begin('transfer',{uid:options.uid,moving:true}):options.ticket;
 if(!RunaCardArrivals.current(ticket)){options.copy?.remove();return;}
 try{return await RunaPresentation.play('transfer',{...options,ticket},animateNativeTransfer);}
 finally{options.copy?.remove();if(RunaCardArrivals.finish(ticket))finishVisual(options.uid);}
}
async function animateNativeTransfer({uid,copy,rect,card,ticket,duration:customDuration,delay=0,destination=null}){
 const generation=visualGeneration;let arrival=null,flight=null;
 const stop=()=>{if(!RunaCardArrivals.current(ticket))for(const node of [flight,arrival]){node?.getAnimations?.().forEach(a=>a.cancel());node?.remove();}};
 const unsubscribe=RunaCardArrivals.subscribe(stop);
 try{
  const target=destination?document.querySelector(destination):tableCard(uid);if(!target||!rect)return;
  const changesFace=copy.classList.contains('combat-card')!==target.classList.contains('combat-card')||copy.classList.contains('spell-mark')||Boolean(target.closest?.('#self-emana,#opponent-emana'));
  if(changesFace)await Promise.race([target.visualReady,pause(1800)]);if(generation!==visualGeneration||!RunaCardArrivals.current(ticket)||!target.isConnected&&target.isConnected!==undefined)return;
  if(target.closest?.('.combat-emanation')&&typeof layoutCombatEmanations==='function')layoutCombatEmanations();
  const end=target.getBoundingClientRect(),bounds=$('visual-layer').getBoundingClientRect();if(!end.width||!end.height)return;
  target.style.visibility='hidden';
  const dx=end.left+end.width/2-rect.left-rect.width/2,dy=end.top+end.height/2-rect.top-rect.height/2;
  const make=(face,w,h)=>{const wrapper=document.createElement('div');wrapper.className='card-flight';Object.assign(wrapper.style,{left:(rect.left+rect.width/2-w/2-bounds.left)+'px',top:(rect.top+rect.height/2-h/2-bounds.top)+'px',width:w+'px',height:h+'px'});face.classList.remove('hand-card','opening-card','dragging-source','drag-preview','pending-arrival','selected','arrived','snapping','visual-hit','payable');face.classList.add('flight-face');face.removeAttribute('style');wrapper.append(face);$('visual-layer').append(wrapper);return wrapper;};
  flight=make(copy,rect.width,rect.height);
  document.querySelectorAll('.release-ghost').forEach(node=>node.remove());
  const duration=customDuration??(720+weightOf(card)*180),options={duration,delay,easing:'cubic-bezier(.22,.65,.22,1)',fill:'both'};
  const oldScale=end.width/rect.width,newScale=rect.width/end.width;if(oldScale>1.01)flight.classList.add('flight-grows');
  if(!changesFace){
   const animation=flight.animate([{transform:'translate(0,0) scale(1)'},{transform:'translate('+dx+'px,'+dy+'px) scale('+oldScale+')'}],options);await settleAnimation(animation,duration+delay);
   if(generation===visualGeneration&&RunaCardArrivals.current(ticket))sound('place');return;
  }
  arrival=make(cloneVisual(target),end.width,end.height);
  const departing=flight.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:'translate('+dx*.15+'px,'+dy*.15+'px) scale('+(1+(oldScale-1)*.15)+')',opacity:1,offset:.15},{transform:'translate('+dx*.7+'px,'+dy*.7+'px) scale('+(1+(oldScale-1)*.7)+')',opacity:0,offset:.7},{transform:'translate('+dx+'px,'+dy+'px) scale('+oldScale+')',opacity:0}],options);
  const arriving=arrival.animate([{transform:'translate(0,0) scale('+newScale+')',opacity:0},{transform:'translate('+dx*.15+'px,'+dy*.15+'px) scale('+(newScale+(1-newScale)*.15)+')',opacity:0,offset:.15},{transform:'translate('+dx*.7+'px,'+dy*.7+'px) scale('+(newScale+(1-newScale)*.7)+')',opacity:1,offset:.7},{transform:'translate('+dx+'px,'+dy+'px) scale(1)',opacity:1}],options);
  await Promise.all([settleAnimation(departing,duration+delay),settleAnimation(arriving,duration+delay)]);if(generation===visualGeneration&&RunaCardArrivals.current(ticket))sound('place');
 }catch(error){console.error(error);}finally{unsubscribe();flight?.remove();arrival?.remove();if(!flight)copy?.remove();}
}
