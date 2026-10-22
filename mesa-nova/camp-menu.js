/* Utilities only: keep the original controls and gameplay handlers. */
(()=>{
 const game=document.getElementById('game'),sidebar=game?.querySelector('.room-sidebar');if(!sidebar)return;
 const dock=document.createElement('nav');dock.className='camp-utilities';dock.setAttribute('aria-label','Menu e espectadores');
 const trigger=document.createElement('button');trigger.type='button';trigger.className='camp-menu-trigger';trigger.textContent='Menu';trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-controls','room-menu');trigger.setAttribute('aria-keyshortcuts','Escape');
 const audience=document.getElementById('spectators-game');if(audience)audience.title='Pessoas na arquibancada';dock.append(trigger);if(audience)dock.append(audience);
 game.querySelector('.lower-zone').append(dock);
 const menu=document.createElement('dialog');menu.id='room-menu';menu.className='room-menu-dialog';menu.setAttribute('aria-labelledby','room-menu-title');
 const title=document.createElement('h2');title.id='room-menu-title';title.textContent='Menu da sala';const close=document.createElement('button');close.type='button';close.className='room-menu-close';close.textContent='Voltar ao jogo · Esc';
 menu.append(title,close);for(const node of [...sidebar.children])if(node.tagName!=='H3')menu.append(node);document.body.append(menu);sidebar.remove();game.classList.add('room-menu-ready');
 const dismiss=()=>{if(!menu.open)return;menu.close();trigger.setAttribute('aria-expanded','false');trigger.focus({preventScroll:true});};
 trigger.setAttribute('aria-expanded','false');trigger.onclick=()=>{if(menu.open){dismiss();return;}menu.showModal();trigger.setAttribute('aria-expanded','true');close.focus({preventScroll:true});};close.onclick=dismiss;
 menu.addEventListener('cancel',event=>{event.preventDefault();dismiss();});
 const confirmation=document.createElement('dialog');confirmation.className='room-menu-dialog';confirmation.setAttribute('aria-labelledby','exit-confirm-title');
 const warning=document.createElement('h2');warning.id='exit-confirm-title';warning.textContent='Sair da sala?';const description=document.createElement('p');description.textContent='Você deixará sua participação nesta sala. O jogo não é pausado.';
 const stay=document.createElement('button'),exit=document.createElement('button');stay.type=exit.type='button';stay.textContent='Continuar na sala';exit.textContent='Sim, sair';confirmation.append(warning,description,stay,exit);document.body.append(confirmation);
 const leave=document.getElementById('leave-room'),originalLeave=leave.onclick;
 leave.onclick=()=>{confirmation.showModal();stay.focus();};stay.onclick=()=>{confirmation.close();leave.focus();};confirmation.addEventListener('cancel',e=>{e.preventDefault();stay.onclick();});exit.onclick=event=>{confirmation.close();dismiss();originalLeave?.call(leave,event);};
 document.addEventListener('keydown',event=>{
  if(event.key!=='Escape'||event.defaultPrevented||event.repeat||event.isComposing||event.ctrlKey||event.altKey||event.metaKey||event.shiftKey)return;
  // Let the upper modal's native cancel event handle Esc; never open a second layer.
  if(document.querySelector('dialog[open]'))return;
  if(event.target?.closest?.('input,textarea,select,[contenteditable="true"]'))return;
  if(globalThis.RunaTargeting?.active?.()||typeof activeDrag!=='undefined'&&activeDrag)return;
  if(game.hidden)return;event.preventDefault();trigger.onclick();
 });
})();
