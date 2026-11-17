// A private preflight. No command, payment, log or opponent event before confirmation.
let pendingSpellConfirmation=null;
function needsApprenticeConfirmation(card){
 const me=seat();return state?.phase==='prep'&&state.turn===state.you&&!['creature','equipment'].includes(card.type)&&!me?.firstSpellUsedThisRound&&(rival()?.reserve||[]).some(c=>c.damage<c.health)&&me?.emanation.some(uid=>me.reserve.find(c=>c.uid===uid)?.effects?.some(e=>e.op==='first_spell_damage'));
}
async function confirmApprenticeSpell(data,dragRect){
 if(pendingSpellConfirmation||commandBusy)return;
 const saved={...data},key=[state.code,state.matchId,state.round,state.turn,state.revision].join(':');
 const dialog=$('target-picker'),content=$('target-picker-content');if(dialog.open)return;
 const card=[...(seat()?.hand||[]),...(seat()?.study?.book?.cards||[])].find(c=>c.uid===saved.cardId);if(!card)return;
 pendingSpellConfirmation=saved;
 let accepted=false;
 try{
  accepted=await new Promise(resolve=>{
   let choice=false;const close=()=>{dialog.removeEventListener('close',close);dialog.removeEventListener('contextmenu',cancel);resolve(choice);};
   const cancel=e=>{e.preventDefault();dialog.close();};
   content.replaceChildren();text(content,'h2','Confirmar magia');text(content,'p',card.name);
   text(content,'p','Após confirmar, a magia será jogada e você poderá escolher o alvo da Aprendiz ou cancelar apenas o disparo. Cancelar agora mantém a carta na mão, sem revelar ao rival.');
   content.append(button('Confirmar magia',()=>{choice=true;dialog.close();},'primary'),button('Cancelar jogada',()=>dialog.close()));
   dialog.addEventListener('close',close);dialog.addEventListener('contextmenu',cancel);dialog.showModal();
  });
 }finally{pendingSpellConfirmation=null;finishVisual(saved.cardId);}
 if(!accepted)return;
 if(key!==[state.code,state.matchId,state.round,state.turn,state.revision].join(':')){err('O estado mudou. Escolha a magia novamente.');return;}
 return command(saved,dragRect,true);
}
