(()=>{
 const get=id=>document.getElementById(id),destination='/runamarca/tutorial/';
 const entry=document.createElement('a');entry.href=destination;entry.className='tutorial-entry-link';entry.innerHTML='<strong>Tutorial</strong><span>Aprenda a jogar</span>';
 get('create').closest('.entry-buttons').after(entry);
 const during=document.createElement('button');during.type='button';during.textContent='Tutorial';during.id='open-tutorial';get('rules-toggle').after(during);
 const dialog=document.createElement('dialog');dialog.className='tutorial-leave-dialog';dialog.setAttribute('aria-labelledby','tutorial-leave-title');
 dialog.innerHTML='<h2 id="tutorial-leave-title">Abrir o tutorial?</h2><p>Você sairá desta tela. A partida atual continua sem pausa e os prazos continuam correndo.</p><p>Seu acesso à sala permanece neste navegador enquanto ela existir. A partida não tem salvamento permanente e pode ser perdida se o servidor reiniciar.</p><div><button type="button" data-cancel>Ficar na partida</button><a class="tutorial-entry-link" href="/runamarca/tutorial/">Ir para o tutorial</a></div>';
 document.body.append(dialog);dialog.querySelector('[data-cancel]').onclick=()=>dialog.close();
 during.onclick=()=>{if(!state||['lobby','finished'].includes(state.phase)){location.assign(destination);return;}get('room-menu')?.close();dialog.showModal();};
})();
