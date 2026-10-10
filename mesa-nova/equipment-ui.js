// Equipment is its own card type: hand -> reserve -> one allied creature.
let forgeDialogKey='',forgeDialogOwner='';
function showForgePicker(stage,cost,power=null){
 hideHover();const dialog=$('forge-picker'),content=$('forge-picker-content');content.replaceChildren();
 dialog.dataset.ownerKey=[state?.code,state?.matchId,state?.round,state?.you].join(':');const mandatory=!power;dialog.dataset.mandatory=String(mandatory);$('close-forge-picker').hidden=mandatory;
 text(content,'small',stage==='cost'?'ETAPA 1 DE 3':stage==='durability'?'ETAPA 2 DE 3':'ETAPA 3 DE 3','forge-step-label');
 text(content,'h2',stage==='cost'?'Escolha o custo da arma':stage==='durability'?'Escolha a estrutura':'Escolha a lâmina');
 text(content,'p',stage==='cost'?'Iniciar custa 4 Éter. A arma ficará pronta na sua terceira preparação.':stage==='durability'?'A escolha de dano acontecerá antes da sua próxima preparação.':'Depois desta escolha, a arma será entregue na sua mão.');
 const row=document.createElement('div');row.className='forge-options';
 for(const option of RunaWeapons.options(stage,cost)){
  const choice=document.createElement('button');choice.type='button';choice.className='forge-choice';const image=document.createElement('img');image.src=RunaWeapons.imageForCost(stage==='cost'?Number(option.id):cost);image.alt='';choice.append(image);text(choice,'strong',option.name);text(choice,'span',option.text);
  if(stage==='attack'){const structure=RunaWeapons.options('durability',cost).find(o=>o.id===seat()?.forge?.chassis);text(choice,'small','Durabilidade final: '+Math.max(1,(structure?.durability||1)-(option.loss||0)));}
  choice.onclick=async()=>{if(commandBusy)return;choice.disabled=true;try{await command(power?{type:'patronPower',powerId:power.id,weaponCost:Number(option.id)}:{type:'forgeChoice',optionId:option.id});}finally{if(state?.phase!=='forging'){dialog.close();forgeDialogKey='';}else if(choice.isConnected)choice.disabled=false;}};row.append(choice);
 }
 content.append(row);if(!dialog.open)dialog.showModal();
}
function renderForge(){
 const dialog=$('forge-picker');if(!dialog)return;
 if(state?.phase!=='forging'||state.spectator||state.turn!==state.you){const sameOwner=dialog.dataset.ownerKey===[state?.code,state?.matchId,state?.round,state?.you].join(':');if(dialog.open&&(dialog.dataset.mandatory==='true'||state?.phase!=='prep'||state.turn!==state.you||state.spectator||!sameOwner))dialog.close();forgeDialogKey='';return;}
 const forge=seat()?.forge;if(!forge)return;
 const key=state.code+':'+state.you+':'+state.round+':'+forge.stage;
 if(forgeDialogKey!==key||!dialog.open){forgeDialogKey=key;forgeDialogOwner=state.you;showForgePicker(forge.stage,forge.cost);}
}
function chooseEquipment(card){
 if(state?.spectator||state.phase!=='prep'||state.turn!==state.you)return;
 if(seat().hand.some(c=>c.uid===card.uid)){if(!affordable(card)){err('Éter insuficiente.');return;}command({type:'play',cardId:card.uid});return;}
 if(!(seat().weapons||[]).some(c=>c.uid===card.uid))return;
 const targets=seat().reserve.filter(c=>c.type==='creature'&&c.damage<c.health&&!c.equipment);if(seat().mana<1){err('Equipar custa 1 Éter.');return;}if(!targets.length){err('Você precisa de uma criatura aliada sem equipamento.');return;}
 showTargetPicker(card,targets.map(c=>c.uid),targetId=>command({type:'equip',cardId:card.uid,targetId}),'Equipar · 1 Éter');
}
function addEquipmentVisual(node,card){
 if(card.type==='equipment'){
  node.classList.add('equipment-card');
  const ns='http://www.w3.org/2000/svg',stats=document.createElementNS(ns,'svg');stats.classList.add('card-stats-svg');stats.setAttribute('viewBox','0 0 900 1260');stats.setAttribute('aria-label','Bônus de ataque '+card.attack+', durabilidade '+card.durability+' de '+card.maxDurability);
  for(const [value,x,y,klass] of [['+'+card.attack,83.3,1172,'weapon-attack'],[card.durability,826,1177.12,'weapon-durability']]){const number=document.createElementNS(ns,'text');number.setAttribute('x',x);number.setAttribute('y',y);number.setAttribute('text-anchor','middle');number.setAttribute('dominant-baseline','central');number.setAttribute('class',klass);number.textContent=String(value);stats.append(number);}
  node.dataset.maxDurability=card.maxDurability;node.append(stats);updateWeaponCrack(node,card.durability,card.maxDurability);node.onclick=()=>chooseEquipment(card);
 }
 if(card.equipment){const weapon=card.equipment,chip=document.createElement('span');chip.className='equipped-weapon';chip.dataset.weaponId=weapon.uid;chip.dataset.maxDurability=weapon.maxDurability;chip.setAttribute('aria-label',weapon.name+' · '+weapon.durability+' de durabilidade');const image=document.createElement('img');image.src=RunaWeapons.imageForCost(weapon.cost)||weapon.image;image.alt='';chip.append(image);text(chip,'b','+'+weapon.attack,'weapon-bonus');text(chip,'b',String(weapon.durability),'weapon-durability');chip.onmouseenter=e=>{e.stopPropagation();showHover(weapon,e);};chip.onmousemove=e=>{e.stopPropagation();moveHover(e);};chip.onmouseleave=e=>{e.stopPropagation();hideHover();};chip.onclick=e=>{e.stopPropagation();showCard(weapon);};node.append(chip);updateWeaponCrack(chip,weapon.durability,weapon.maxDurability);}
}
function renderWeapons(){
 for(const [side,p] of [['self',seat()],['opponent',rival()]]){const reserve=$(side+'-reserve');if(!reserve||!p)continue;const weapons=p.weapons||[];if(!weapons.length)continue;const row=document.createElement('div');row.className='weapons-row';row.setAttribute('aria-label','Equipamentos na reserva');for(const weapon of weapons){const node=cardEl(weapon,{mini:true});row.append(node);}reserve.append(row);}
}
function applyEquipmentUpdates(updates=[]){
 for(const update of updates)for(const node of document.querySelectorAll('.equipped-weapon, .equipment-card'))if((node.dataset.weaponId||node.dataset.uid)===update.cardId){if(update.broken){breakWeaponVisual(node);}else{const n=node.querySelector('.weapon-durability');if(n)n.textContent=String(update.durability);updateWeaponCrack(node,update.durability,Number(node.dataset.maxDurability));}}
}
function updatePatronExtraLife(owner,value){
 const head=$(owner===seat()?.id?'self-head':'opponent-head'),avatar=head?.querySelector('.patron-avatar');if(!avatar)return;
 let badge=avatar.querySelector('.patron-extra-life');if(!value){badge?.remove();return;}if(!badge){badge=document.createElement('span');badge.className='patron-extra-life';avatar.append(badge);}badge.textContent=String(value);badge.title='Vida Extra: '+value+' · absorve dano antes da vida normal';badge.setAttribute('aria-label',badge.title);
}
$('close-forge-picker').onclick=()=>{$('forge-picker').close();forgeDialogKey='';};
$('forge-picker').addEventListener('cancel',event=>{if($('forge-picker').dataset.mandatory==='true')event.preventDefault();});

function updateWeaponCrack(node,durability,maxDurability){
 const worn=durability>0&&durability<=maxDurability/2;
 if(node.classList.toggle)node.classList.toggle('weapon-worn',worn);else if(worn)node.classList.add('weapon-worn');
 const stats=node.querySelector('.card-stats-svg');if(!stats)return;stats.querySelector('.weapon-crack')?.remove();if(!worn)return;
 const crack=document.createElementNS('http://www.w3.org/2000/svg','path');crack.setAttribute('class','weapon-crack');crack.setAttribute('d','M826 1118 L813 1141 L830 1156 L817 1174 L834 1189 L824 1215');crack.setAttribute('fill','none');crack.setAttribute('stroke','#26333e');crack.setAttribute('stroke-width','5');stats.prepend(crack);
}
function breakWeaponVisual(node){const r=node.getBoundingClientRect(),layer=$('visual-layer');if(!r.width)return;node.style.opacity='0';RunaDamageFX.audio('brutal','impact',RunaDamageFX.point(node));for(const [i,clip] of ['polygon(0 0,58% 0,45% 100%,0 100%)','polygon(58% 0,100% 0,100% 100%,45% 100%)'].entries()){const part=document.createElement('div');part.className='broken-weapon-fragment';Object.assign(part.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px',clipPath:clip});part.append(cloneVisual(node));part.firstElementChild.style.opacity='1';layer.append(part);const direction=i?1:-1;part.animate([{transform:'translate(0,0) rotate(0)',opacity:1},{transform:'translate('+direction*32+'px,46px) rotate('+direction*28+'deg)',opacity:0}],{duration:650,easing:'ease-in',fill:'forwards'}).finished.catch(()=>{}).finally(()=>part.remove());}setTimeout(()=>node.remove(),650);}
