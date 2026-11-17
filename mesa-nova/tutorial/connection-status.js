/* Connection presentation only. Polling owns recovery; actions are never replayed. */
(()=>{
 const panel=document.createElement('aside');panel.className='connection-status';panel.hidden=true;
 panel.setAttribute('aria-label','Conexão com a sala');
 const message=document.createElement('div');message.setAttribute('role','status');message.setAttribute('aria-live','polite');message.setAttribute('aria-atomic','true');
 const title=document.createElement('strong'),detail=document.createElement('p'),retry=document.createElement('button');
 retry.type='button';retry.textContent='Tentar agora';message.append(title,detail);panel.append(message,retry);document.body.append(panel);
 let roomKey=null,timer=null,checking=false;
 function releaseFocus(){if(panel.contains(document.activeElement))(document.querySelector('.camp-menu-trigger')||document.getElementById('player-name'))?.focus({preventScroll:true});}
 function reset(){clearTimeout(timer);releaseFocus();panel.hidden=true;delete panel.dataset.state;roomKey=null;checking=false;retry.disabled=false;}
 function lost(key,explanation){
  clearTimeout(timer);roomKey=key;panel.hidden=false;panel.dataset.state='lost';
  const heading='Conexão interrompida',text=explanation||'A mesa mostra o último estado recebido. Tentando reconectar; o relógio da partida continua.';
  if(title.textContent!==heading)title.textContent=heading;if(detail.textContent!==text)detail.textContent=text;
  retry.hidden=false;retry.disabled=checking;retry.textContent=checking?'Consultando…':'Tentar agora';
 }
 function restored(key){
  if(roomKey!==key||panel.dataset.state!=='lost')return;
  clearTimeout(timer);releaseFocus();panel.dataset.state='restored';title.textContent='Conexão restabelecida';detail.textContent='A mesa está sincronizada novamente.';retry.hidden=true;
  timer=setTimeout(reset,2200);
 }
 retry.addEventListener('click',async()=>{
  if(checking)return;checking=true;retry.disabled=true;retry.textContent='Consultando…';
  try{await refresh();}finally{checking=false;retry.disabled=false;retry.textContent='Tentar agora';}
 });
 RunaPresentation.register('connection-status',{after(){const current=sessionStorage.getItem('runamarca-nova-seat');if(!current||(roomKey&&current!==roomKey))reset();}});
 addEventListener('pagehide',reset);
 globalThis.RunaConnectionStatus={lost,restored,reset};
})();
