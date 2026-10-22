// Local placement preview only. No card/cost/effect is committed before command().
let pendingEntryPlacement=null;
function creatureNeedsEntryChoice(card){return card.type==='creature'&&(card.effects||[]).some(e=>['combat_protocol','monk_choice','bound_spell_damage'].includes(e.op)||e.timing==='on_enter'&&(e.target==='any_creature'||e.target==='chosen_allied_creature'||e.op==='armor_damage'));}
function pendingEntryValid(entry){
 const self=seat();return !entry.closed&&!entry.cancelled&&!connectionLost&&state?.phase==='prep'&&state.turn===state.you&&!state.spectator&&entry.key===[state.code,state.matchId,state.round,state.you].join(':')&&[...(self?.hand||[]),...(self?.study?.book?.cards||[])].some(c=>c.uid===entry.card.uid)&&affordable(entry.card)&&(entry.data.mode==='emanate'?self.emanation.length<2:self.reserve.filter(c=>c.damage<c.health&&!self.emanation.includes(c.uid)).length<8);
}
function renderPendingEntryPlacement(){
 const entry=pendingEntryPlacement;if(!entry)return;if(!pendingEntryValid(entry)){entry.cancel();return;}
 for(const node of document.querySelectorAll('#hand .card'))if(node.dataset.uid===entry.card.uid)node.style.visibility='hidden';
 if(!entry.node?.isConnected){const node=cardEl({...entry.card,uid:'provisional:'+entry.card.uid},{mini:true,combat:true});node.dataset.entryUid=entry.card.uid;node.classList.add('reserve-card','entry-provisional');node.onclick=null;const tag=document.createElement('span');tag.className='entry-provisional-label';tag.textContent='Escolha pendente';node.append(tag);$(entry.data.mode==='emanate'?'self-emana':'self-reserve').append(node);entry.node=node;}
}
function pendingEntryNode(uid){return pendingEntryPlacement?.card.uid===uid?pendingEntryPlacement.node:null;}
function cancelPendingEntryPlacement(){pendingEntryPlacement?.cancel();}
function entryPlacementTarget(entry,ids,title){return new Promise(resolve=>{
 const dialog=$('target-picker');let settled=false;const finish=id=>{if(settled)return;settled=true;dialog.removeEventListener('close',closed);entry.resolveTarget=null;resolve(id);};const closed=()=>finish(null);entry.resolveTarget=finish;dialog.addEventListener('close',closed);
 showTargetPicker(entry.card,ids,finish,title,null,()=>finish(null));
});}
async function beginEntryPlacement(data,dropRect){
 if(pendingEntryPlacement||commandBusy)return;
 const card=[...(seat()?.hand||[]),...(seat()?.study?.book?.cards||[])].find(c=>c.uid===data.cardId);if(!card)return;
 const entry={card,data:{...data},key:[state.code,state.matchId,state.round,state.you].join(':'),closed:false,cancelled:false,node:null,resolveTarget:null};
 const cancel=()=>{if(entry.closed||entry.committed)return;entry.cancelled=true;entry.resolveTarget?.(null);if($('target-picker').open)$('target-picker').close();};entry.cancel=cancel;
 const key=e=>{if(e.key==='Escape'&&!e.isComposing&&!e.repeat&&!e.ctrlKey&&!e.altKey&&!e.metaKey&&!document.querySelector('.room-menu-dialog[open]')){e.preventDefault();e.stopImmediatePropagation();cancel();}};
 const cleanup=()=>{if(entry.closed)return;entry.closed=true;if(pendingEntryPlacement===entry)pendingEntryPlacement=null;document.removeEventListener('keydown',key,true);entry.node?.remove();RunaTargeting?.cancel();finishVisual(card.uid);for(const node of document.querySelectorAll('#hand .card'))if(node.dataset.uid===card.uid)node.style.visibility='';};
 pendingEntryPlacement=entry;
 if(!pendingEntryValid(entry)){cleanup();err('Não é possível colocar esta criatura agora. Confira Éter e espaço disponíveis.');return;}
 for(const n of document.querySelectorAll('.release-ghost'))if(n.dataset.uid===card.uid)n.remove();renderPendingEntryPlacement();document.addEventListener('keydown',key,true);
 try{
  for(const [op,field,kind]of [['combat_protocol','protocolMode','protocol'],['monk_choice','monkMode','monk']])if(card.effects?.some(e=>e.op===op)&&!entry.data[field]){const choice=await chooseEntryMode(card,kind);if(!choice||!pendingEntryValid(entry))return;entry.data[field]=choice;}
  if(!entry.data.targetId){
   const effects=card.effects||[],alive=c=>c.damage<c.health;let ids,title;
   if(effects.some(e=>e.timing==='on_enter'&&e.target==='chosen_allied_creature')){ids=()=>[...seat().reserve.filter(alive).map(c=>c.uid),card.uid];title='Entrada · escolha uma criatura aliada';}
   else if(effects.some(e=>e.timing==='on_enter'&&e.target==='any_creature')){ids=()=>[...state.players.flatMap(p=>p.reserve.filter(alive).map(c=>c.uid)),card.uid];title='Entrada · escolha uma criatura';}
   else if(effects.some(e=>e.op==='bound_spell_damage'||e.timing==='on_enter'&&e.op==='armor_damage')&&(rival()?.reserve||[]).some(alive)){ids=()=>rival().reserve.filter(alive).map(c=>c.uid);title='Entrada · escolha uma criatura inimiga';}
   if(ids){const target=await entryPlacementTarget(entry,ids,title);if(!target||!pendingEntryValid(entry))return;entry.data.targetId=target;}
  }
  if(!pendingEntryValid(entry))return;
  const rect=entry.node?.getBoundingClientRect()||dropRect;entry.committed=true;cleanup();movingCards.add(card.uid);for(const n of document.querySelectorAll('#hand .card'))if(n.dataset.uid===card.uid)n.style.visibility='hidden';try{return await command(entry.data,rect,true);}finally{finishVisual(card.uid);}
 }finally{cleanup();}
}
function showCreaturePlacementMenu(card){
 if(commandBusy||pendingEntryPlacement||state?.phase!=='prep'||state.turn!==state.you)return;
 const dialog=$('target-picker'),content=$('target-picker-content');const place=mode=>{dialog.addEventListener('close',()=>command({type:'play',cardId:card.uid,...(mode?{mode}:{})}),{once:true});dialog.close();};content.replaceChildren();text(content,'h2',card.name);text(content,'p','Escolha onde colocar. A Entrada será confirmada depois das escolhas.');content.append(button('Colocar na reserva',()=>place(),'primary'));
 if(card.effects?.some(e=>String(e.timing).includes('emana')))content.append(button('Colocar em Emanação',()=>place('emanate')));content.append(button('Cancelar',()=>dialog.close()));dialog.showModal();
}
addEventListener('pagehide',cancelPendingEntryPlacement);
