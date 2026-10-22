/* Layout layer only: preserve the same gameplay nodes, IDs and shared discard. */
(function(){
 const game=document.getElementById('game'),table=game.querySelector('.table'),board=table.querySelector('.board');
 game.classList.add('camp-layout');
 for(const [side,bandName] of [['opponent','upper-zone'],['self','lower-zone']]){
  const band=table.querySelector('.'+bandName),reserve=document.getElementById(side+'-reserve').closest('.reserve-area');
  reserve.classList.add('reserve-camp',side+'-camp');reserve.setAttribute('aria-label',side==='self'?'Acampamento aliado · jogue criaturas aqui':'Acampamento rival');
  const marker=document.createElement('span');marker.className='camp-marker';marker.setAttribute('aria-hidden','true');marker.innerHTML='<svg viewBox="0 0 80 38"><path d="M8 34 29 6 50 34ZM29 6 61 6 76 34H50M30 16 39 34H22M4 35H78" fill="none" stroke="currentColor" stroke-width="2"/></svg>';reserve.prepend(marker);
  if(side==='opponent')board.before(reserve);else board.after(reserve);
  const mount=document.getElementById(side+'-deck-mount');if(side==='self')table.querySelector('.hand-zone').append(mount);else table.querySelector('.opponent-hand-zone').append(mount);
 }
 const rail=game.querySelector('.rail'),log=document.getElementById('log'),drawer=document.createElement('details'),summary=document.createElement('summary');drawer.className='camp-log';drawer.id='camp-log';summary.textContent='Registro';summary.setAttribute('aria-controls','log');drawer.append(summary,log);table.querySelector('.opponent-camp').append(drawer);rail?.remove();let pinned=false;
 summary.addEventListener('click',e=>{e.preventDefault();pinned=!pinned;drawer.open=pinned;});
 drawer.addEventListener('pointerenter',()=>{if(matchMedia('(hover:hover)').matches)drawer.open=true;});drawer.addEventListener('pointerleave',()=>{if(!pinned&&!drawer.contains(document.activeElement))drawer.open=false;});
 drawer.addEventListener('focusout',()=>{queueMicrotask(()=>{if(!pinned&&!drawer.contains(document.activeElement)&&!drawer.matches(':hover'))drawer.open=false;});});drawer.addEventListener('toggle',()=>summary.setAttribute('aria-expanded',String(drawer.open)));summary.setAttribute('aria-expanded','false');
 // Overlay only. Closing never changes any arena geometry or consumes a game click.
 const closeLog=document.createElement('button');closeLog.type='button';closeLog.className='camp-log-close';closeLog.textContent='Fechar registro · Esc';drawer.insertBefore(closeLog,log);
 const close=()=>{pinned=false;drawer.open=false;};closeLog.onclick=()=>{close();summary.focus();};
 document.addEventListener('pointerdown',e=>{if(drawer.open&&!drawer.contains(e.target))close();});
 document.addEventListener('keydown',e=>{if(drawer.open&&e.key==='Escape'&&!e.defaultPrevented&&!e.isComposing&&!e.repeat&&!document.querySelector('dialog[open]')){e.preventDefault();e.stopImmediatePropagation();close();if(drawer.contains(document.activeElement))summary.focus();}});
 for(const n of board.querySelectorAll('.emanation-column>b'))n.textContent='☀';
 function fitReserve(){for(const row of table.querySelectorAll('.reserve-camp .card-row')){const cards=[...row.children].filter(n=>n.classList.contains('card')),width=cards[0]?.getBoundingClientRect().width||60;row.style.setProperty('--camp-overlap',Math.min(0,(row.clientWidth-cards.length*width-(cards.length-1)*12)/Math.max(1,cards.length-1))+'px');}}
 let hudFrame=0;const watched=new Map();
 function sizeHud(){cancelAnimationFrame(hudFrame);hudFrame=requestAnimationFrame(()=>{
  for(const id of ['self-head','opponent-head']){const head=document.getElementById(id),ether=head.querySelector('.patron-ether'),powers=head.querySelector('.patron-equipment');if(!ether||!powers)continue;head.style.setProperty('--camp-ether-width',ether.offsetWidth+'px');head.style.setProperty('--camp-power-width',powers.offsetWidth+'px');}
 });}
 const hudResize=new ResizeObserver(sizeHud);
 for(const id of ['self-head','opponent-head']){const head=document.getElementById(id);new MutationObserver(()=>{for(const n of watched.get(id)||[])hudResize.unobserve(n);const nodes=[...head.querySelectorAll('.patron-ether,.patron-equipment')];watched.set(id,nodes);nodes.forEach(n=>hudResize.observe(n));sizeHud();}).observe(head,{childList:true});}
 function fitHand(){const row=document.getElementById('hand'),cards=[...row.querySelectorAll('.hand-card')],width=cards[0]?.offsetWidth||112;if(cards.length>1)row.style.setProperty('--camp-hand-overlap',Math.min(-width*.45,(row.clientWidth-width*.5-cards.length*width)/(cards.length-1))+'px');}
 function fitRivalHand(){const row=document.getElementById('opponent-hand'),cards=[...row.querySelectorAll('.rival-hand-back')],width=cards[0]?.offsetWidth||68;if(cards.length>1)row.style.setProperty('--camp-rival-overlap',Math.min(-width*.3,(row.clientWidth-width*.5-cards.length*width)/(cards.length-1))+'px');}
 const resize=new ResizeObserver(()=>{fitReserve();fitHand();fitRivalHand();sizeHud();});for(const row of table.querySelectorAll('.reserve-camp .card-row')){resize.observe(row);new MutationObserver(fitReserve).observe(row,{childList:true});}resize.observe(document.getElementById('hand'));new MutationObserver(fitHand).observe(document.getElementById('hand'),{childList:true});resize.observe(document.getElementById('opponent-hand'));new MutationObserver(fitRivalHand).observe(document.getElementById('opponent-hand'),{childList:true});window.addEventListener('resize',()=>{fitReserve();fitHand();fitRivalHand();sizeHud();});fitReserve();fitHand();fitRivalHand();sizeHud();
})();
