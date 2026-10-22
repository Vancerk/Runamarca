/* Presentation of the server-authorized Patron slot; never adds attacks. */
function patronPortraitNode(owner){return document.getElementById(owner===state?.you?'self-head':'opponent-head')?.querySelector('.patron-card')||null;}
function patronBoardCard(player){
 if(!player?.patron)return null;const p=player.patron;
 return {uid:'patron:'+player.id,owner:player.id,modelId:p.id||'patron',type:'patron',name:p.name,image:p.image,imageKind:'illustration',artFit:'cover',affinity:p.affinity,cost:0,hp:p.hp,maxHp:p.maxHp,powers:p.powers,attack:p.effectiveAttack||0,effectiveAttack:p.effectiveAttack||0,health:p.maxHp,damage:p.maxHp-p.hp,extraLife:p.extraLife||0,equipment:p.equipment,effects:[],text:'Patrono armado',baseStats:{attack:0,health:p.maxHp,cost:0}};
}
function choosePatronPosition(player){
 if(state.phase!=='formation'||state.spectator||player.id!==state.you||player.ready||!(player.patron.equipment?.durability>0)||player.patron.hp<=0)return;
 const session=[state.code,state.matchId,state.phase,state.round].join(':'),valid=()=>state.phase==='formation'&&!seat().ready&&session===[state.code,state.matchId,state.phase,state.round].join(':');
 const targets=()=>[...[...document.querySelectorAll('#lanes .lane-side')].filter(n=>n.dataset.owner===player.id&&!seat().formation[Number(n.dataset.lane)]).map(n=>({id:n.dataset.lane,node:n})),...(seat().formation.includes('patron:'+player.id)?[{id:'return',node:patronPortraitNode(player.id)?.parentElement}]:[])];
 const choose=id=>{if(valid())command({type:'assignPatron',lane:id==='return'?null:Number(id)});},fallback=()=>{const dialog=$('target-picker'),content=$('target-picker-content');content.replaceChildren();text(content,'h2','Posição do Patrono');for(const target of targets())content.append(button(target.id==='return'?'Voltar ao retrato':'Casa '+laneSymbols[Number(target.id)],()=>{dialog.close();choose(target.id);}));dialog.showModal();};
 RunaTargeting.start({source:()=>tableCard('patron:'+player.id)||patronPortraitNode(player.id),valid,targets,fallback,title:'Escolha uma casa vazia · ou o retrato para retornar · sem custo de Éter',confirm:choose});
}
function capturePatronReturns(){
 if(lastPhase!=='resolving'||state?.phase!=='prep')return [];
 return [...document.querySelectorAll('#lanes .card')].filter(n=>n.dataset.uid?.startsWith('patron:')).map(n=>({uid:n.dataset.uid,owner:n.dataset.uid.slice(7),style:'gentle',rect:n.getBoundingClientRect(),face:cloneVisual(n)})).filter(x=>x.rect.width>0);
}
const patronEntryArrived=new Set();
const patronEntryStarted=new Set();
function patronEntryPending(uid){if(state?.phase!=='resolving'||!state.combat||patronEntryArrived.has(state.combat.id+':'+uid))return false;let end=0;for(const step of state.combat.timeline){end+=step.duration;if(step.kind==='patron_entry'&&step.participants.some(p=>p.uid===uid))return Date.now()-serverClockOffset-state.combat.startedAt<end;}return false;}
function presentPatronEntries(step){
 if(state?.phase!=='resolving'||!state.combat)return;
 const generation=visualGeneration,combatId=state.combat.id,elapsedMs=Math.max(0,Date.now()-serverClockOffset-state.combat.startedAt);
 for(const item of step.participants||[]){const key=combatId+':'+item.uid;if(patronEntryStarted.has(key)||patronEntryArrived.has(key))continue;
  const target=tableCard(item.uid),from=patronPortraitNode(item.owner);if(!target)continue;
  patronEntryStarted.add(key);if(patronEntryStarted.size>48)patronEntryStarted.delete(patronEntryStarted.values().next().value);
  const valid=()=>generation===visualGeneration&&combatPresentationCurrent(combatId);
  const arrive=()=>{if(!valid())return;patronEntryArrived.add(key);if(patronEntryArrived.size>48)patronEntryArrived.delete(patronEntryArrived.values().next().value);const live=tableCard(item.uid);if(live)live.style.visibility='';};
  if(!from||!item.weapon||!globalThis.RunaWeaponEntry?.play){arrive();continue;}target.style.visibility='hidden';
  void Promise.resolve().then(()=>RunaWeaponEntry.play({weapon:item.weapon,from,to:target,context:audioContext,keepAtTarget:false,elapsedMs,elapsedTime:()=>Math.max(0,Date.now()-serverClockOffset-state.combat.startedAt),valid,onArrive:arrive})).catch(()=>{}).finally(arrive);
 }
}

function bindPatronPortraitDrag(player,side,avatar){
 const portrait=avatar?.querySelector('.patron-card');if(!portrait)return;
 const eligible=side==='self'&&!state.spectator&&state.phase==='formation'&&!player.ready&&player.patron?.hp>0&&player.patron.equipment?.durability>0;
 if(!eligible)return;
 bindCardDrag(portrait,{uid:'patron:'+player.id,type:'patron',owner:player.id},'patron');
 portrait.setAttribute('role','button');portrait.tabIndex=0;portrait.setAttribute('aria-label','Mover '+player.patron.name+' para uma casa de combate');
 const inspect=portrait.onclick;portrait.onclick=e=>{if(Date.now()<suppressClickUntil)return;inspect?.(e);};
 portrait.onkeydown=e=>{if(!e.repeat&&(e.key==='Enter'||e.key===' ')){e.preventDefault();e.stopPropagation();choosePatronPosition(player);}};
}
