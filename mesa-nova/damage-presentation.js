/* Presentation snapshots keep public cards alive until their effect reaches them. */
const damageSnapshots=new Map(),damageRemnants=new Map(),visuallyDefeated=new Set(),shownDeathBursts=new Set();
const presentedPushes=new Map(),shownHandBuffs=new Set();
function captureDamageSnapshots(){for(const node of document.querySelectorAll('#game .card')){if(!node.dataset.uid||node.classList.contains('back')||!node.getBoundingClientRect().width)continue;damageSnapshots.set(node.dataset.uid,{copy:cloneVisual(node),rect:node.getBoundingClientRect(),hp:node.querySelector('.health-value')?Number(node.querySelector('.health-value').textContent):null});}if(damageSnapshots.size>120)for(const uid of [...damageSnapshots.keys()].slice(0,damageSnapshots.size-120))damageSnapshots.delete(uid);}
function damageRemnant(uid){if(damageRemnants.get(uid)?.isConnected)return damageRemnants.get(uid);const saved=damageSnapshots.get(uid);if(!saved)return null;const node=document.createElement('div');node.className='damage-remnant';node.dataset.uid=uid;if(state?.phase==='resolving'&&state.combat?.id)node.dataset.combatId=state.combat.id;Object.assign(node.style,{left:saved.rect.left+'px',top:saved.rect.top+'px',width:saved.rect.width+'px',height:saved.rect.height+'px'});const face=cloneVisual(saved.copy);face.classList.remove('hand-card','opening-card','pending-arrival','selected','payable');face.style.visibility='visible';node.append(face);$('visual-layer').append(node);damageRemnants.set(uid,node);return node;}
function prepareDamagePresentation(){const pending=(state?.events||[]).filter(e=>e.id>lastVisualId);for(const e of pending){if(e.type==='return'){damageRemnant(e.cardId);if(e.playerId===state.you&&!pendingArrival.includes(e.returnedId))pendingArrival.push(e.returnedId);}if(['spell','apprentice_damage','silence'].includes(e.type)&&['damage','area_damage','ally_attack_damage','conditional_damage','defeat'].includes(e.op))for(const u of e.healthUpdates||[])if(u.uid&&u.hp<=0&&damageSnapshots.get(u.uid)?.hp>0&&!visuallyDefeated.has(u.uid))damageRemnant(u.uid);} }
function damageTarget(uid){return damageRemnants.get(uid)||tableCard(uid)||(damageSnapshots.get(uid)?{getBoundingClientRect:()=>damageSnapshots.get(uid).rect}:spellTarget(uid));}
function resetDamagePresentation(){globalThis.RunaHandBuff?.clear();shownHandBuffs.clear();if(typeof resetCardIdentityPresentation==='function')resetCardIdentityPresentation();for(const n of damageRemnants.values())n.remove();damageRemnants.clear();damageSnapshots.clear();visuallyDefeated.clear();shownDeathBursts.clear();presentedPushes.clear();}
function damageSpellKind(card,op){const id=card?.modelId||card?.id;if(op==='push_right')return 'wind';if(id==='RG07'||/estilhaço elétrico/i.test(card?.name||''))return 'shard';if(id==='RG04'||/fulgor final/i.test(card?.name||''))return 'fulgor';if(op==='ally_attack_damage')return 'forge';return op==='damage'||op==='area_damage'?'ember':null;}
function patronDamageSource(owner){return $(owner===seat()?.id?'self-head':'opponent-head')?.querySelector('.patron-card');}
function finishDamageVictim(update){
 if(!update.uid||update.hp>0||visuallyDefeated.has(update.uid))return;
 const record=deadVisuals.get(update.uid),active=[...document.querySelectorAll('#visual-layer .visual-card')].find(n=>n.dataset.uid===update.uid);
 const source=damageRemnants.get(update.uid)||tableCard(update.uid);
 if(!source&&!record&&!active)return;
 const p=state.players.find(p=>[...(p.reserve||[]),...(p.discard||[])].some(c=>c.uid===update.uid));
 const card=[...(p?.reserve||[]),...(p?.discard||[])].find(c=>c.uid===update.uid);
 const node=record?.copy||active||damageRemnants.get(update.uid)||visualCard(source);
 visuallyDefeated.add(update.uid);node.classList.add('visual-dead');
 globalThis.RunaCreatureDeath?.play({card,target:node,context:typeof audioContext==='undefined'?null:audioContext,key:state.matchId+':'+update.uid});
 // A corpse stays on the battlefield until the result step. Do not fly it to
 // the graveyard while other lanes are still revealing or attacking.
 if(state.phase==='resolving'&&state.combat?.id){deadVisuals.set(update.uid,{copy:node,owner:p?.id||card?.owner});return;}
 const grave=$(p?.id===seat()?.id?'self-grave':'opponent-grave'),a=center(node),b=center(grave);
 deadVisuals.delete(update.uid);
 safeFlight(node,[{transform:'translate(0,0) scale(1)',opacity:1},{transform:'translate(0,-3px) scale(.98)',opacity:1,offset:.25},{transform:`translate(${b.x-a.x}px,${b.y-a.y}px) scale(.18) rotate(9deg)`,opacity:0}],{duration:800,easing:'ease-in',fill:'forwards'},update.uid).finally(()=>{damageRemnants.delete(update.uid);});
}
function applyDamageHit(updates=[]){applyHealthUpdates(updates);for(const u of updates)finishDamageVictim(u);}
function playDamageEffect(kind,from,to,onHit,donor=null){const combatId=state?.phase==='resolving'?state.combat?.id:null;return RunaDamageFX.play({kind,from,to,donor,onHit,getGeneration:()=>combatId?visualGeneration+':'+combatPresentationCurrent(combatId):visualGeneration});}
async function presentDamageSpell(event){if(event.echo)globalThis.RunaMarikaEffects?.pages([damageTarget(event.targetId)].filter(Boolean));const from=patronDamageSource(event.playerId),target=event.targetPatronId?patronDamageSource(event.targetPatronId):damageTarget(event.targetId),kind=damageSpellKind(event.card||{name:event.name},event.op),donor=event.sourceId?damageTarget(event.sourceId):null;if(!kind||!from||!target){applyDamageHit(event.healthUpdates);return false;}await playDamageEffect(kind,from,target,()=>{if(event.targetPatronId)patronImpact(target);applyDamageHit(event.healthUpdates);if(event.sourceHealthUpdate)applyHealthUpdates([event.sourceHealthUpdate]);},donor);return true;}
async function presentPreparedMagic(spell){
 const generation=visualGeneration,combatId=state?.combat?.id;
 if(!combatPresentationCurrent(combatId))return;
 if(spell.op==='push_right')presentedPushes.set(state.combat.id+':'+spell.cardId,false);
 const kind=damageSpellKind(spell.card,spell.op),effectMs=kind?RunaDamageFX.duration(kind):900,exit=spell.card?await highlightUsedSpell(spell.card,spell.casterId,{effectMs,readingOnly:true}):null;
 try{
  if(generation!==visualGeneration||!combatPresentationCurrent(combatId))return;
  const side=[...document.querySelectorAll('.lane-side')].find(n=>n.dataset.owner===spell.targetSide&&Number(n.dataset.lane)===spell.lane),target=side?.querySelector('.card')||side;
  if(typeof presentIdentitySpell==='function'&&await presentIdentitySpell(spell,target))return;
  if(generation!==visualGeneration||!combatPresentationCurrent(combatId))return;
  if(spell.op==='push_right'){let movement=Promise.resolve();await playDamageEffect('wind',patronDamageSource(spell.casterId),target,()=>{movement=animatePushCollision(spell);});await movement;}
  else if(kind){const targets=spell.op==='area_damage'?(spell.healthUpdates||[]).filter(u=>u.uid).map(u=>({target:damageTarget(u.uid),updates:[u]})):[{target,updates:spell.healthUpdates||[]}];await Promise.all(targets.map(x=>x.target?playDamageEffect(kind,patronDamageSource(spell.casterId),x.target,()=>applyDamageHit(x.updates)):Promise.resolve(applyDamageHit(x.updates))));}
  else if(spell.op==='area_stat_buff'){await animateBanquet(spell);}
  else if(['heal','choose_one'].includes(spell.op)){healPulse(target);await pause(500);applyHealthUpdates(spell.healthUpdates);}
  else if(['attack_modifier','stat_buff'].includes(spell.op)&&Number(spell.amount)>0){buffRise(target,Number(spell.amount));await pause(500);applyHealthUpdates(spell.healthUpdates);await pause(600);}
  else{const flight=fly(spell.positive?'➶':'✷',patronDamageSource(spell.casterId),target,'spell',()=>{applyDamageHit(spell.healthUpdates);if(spell.op==='mirage'){const spawn=state.combat?.spawnedMirages?.find(x=>x.spellId===spell.cardId),home=[...document.querySelectorAll('.lane-side')].find(n=>n.dataset.owner===spell.casterId&&Number(n.dataset.lane)===spell.lane);if(spawn&&home&&!home.querySelector('.card')){home.replaceChildren(cardEl(spawn.card,{mini:true,combat:true}));}}});await settleAnimation(flight,900);}
 }finally{if(exit)await exit();}
}
async function animatePushCollision(spell){
 const push=spell.push,combatId=state?.combat?.id,generation=visualGeneration,source=push?tableCard(push.targetId):null;
 if(!push||!source){presentedPushes.set(combatId+':'+spell.cardId,true);renderBoard();applyDamageHit(spell.healthUpdates);return;}
 const destination=document.querySelector('.lane-side[data-owner="'+push.owner+'"][data-lane="'+push.lane+'"]'),a=center(source),b=destination?center(destination):a,move=push.movements?.length>0;
 const copy=visualCard(source),dx=move?b.x-a.x:push.collisionId?(b.x-a.x)*.32:35,dy=move?b.y-a.y:0;
 await safeFlight(copy,move?[{transform:'translate(0,0)'},{transform:`translate(${dx*.7}px,${dy*.7}px) rotate(4deg)`,offset:.65},{transform:`translate(${dx}px,${dy}px)`}]:[{transform:'translate(0,0)'},{transform:`translate(${dx}px,${dy}px) rotate(5deg)`,offset:.55},{transform:'translate(0,0)'}],{duration:550,easing:'cubic-bezier(.15,.8,.3,1)',fill:'forwards'},push.targetId);
 if(generation!==visualGeneration||!combatPresentationCurrent(combatId))return;
 presentedPushes.set(combatId+':'+spell.cardId,true);renderBoard();if(push.collisionId)impact(tableCard(push.collisionId));applyDamageHit(spell.healthUpdates);
}
async function presentReturn(event){const node=damageRemnants.get(event.cardId)||damageRemnant(event.cardId),destination=event.playerId===seat()?.id?document.querySelector('#hand .card[data-uid="'+event.returnedId+'"]'):$('opponent-hand')?.lastElementChild;if(!node||!destination){node?.remove();damageRemnants.delete(event.cardId);revealArrival(event.returnedId);return;}const a=center(node),b=center(destination),end=destination.getBoundingClientRect(),r=node.getBoundingClientRect();if(typeof identityPlay==='function'&&identityCard(event.returnedId)?.persistentReturnUsed)identityPlay('memory',node,node,()=>{},null,800);else sound('magic');try{await settleAnimation(node.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:'translate(0,-25px) scale(1.18)',opacity:1,offset:.22},{transform:`translate(${b.x-a.x}px,${b.y-a.y}px) scale(${end.width/r.width})`,opacity:1}],{duration:1000,easing:'cubic-bezier(.25,.6,.3,1)',fill:'forwards'}),1000);}finally{node.remove();damageRemnants.delete(event.cardId);revealArrival(event.returnedId);sound('place');}}
async function presentHandBuff(event){
 const key=event.buffId||event.id;if(shownHandBuffs.has(key))return;shownHandBuffs.add(key);
 const mine=event.playerId===state.you&&!state.spectator,near=event.playerId===seat()?.id,from=deadVisuals.get(event.sourceId)?.copy||damageTarget(event.sourceId)||$(near?'self-grave':'opponent-grave');
 return globalThis.RunaHandBuff?.play({from,count:event.count,
  targets:mine?(event.targets||[]).map(t=>({...t,node:()=>document.querySelector('#hand .card[data-uid="'+t.uid+'"]')})):[],
  hiddenHand:mine?null:$(near?'hand':'opponent-hand'),getGeneration:()=>visualGeneration,
  onSound:()=>sound('growth',1,{from,to:$(near?'hand':'opponent-hand'),level:.55})});
}
async function presentDeathBurst(event){if(shownDeathBursts.has(event.sourceId))return;shownDeathBursts.add(event.sourceId);const target=patronDamageSource(event.targetPatronId),source=damageTarget(event.sourceId);await playDamageEffect('ember',source,target,()=>{patronImpact(target);damagePatron(event.targetPatronId,event.amount);});}
function primaryStrikeUpdates(strike){const hits=[strike,strike.pair].filter(Boolean),ids=new Set(hits.map(h=>h.targetId).filter(Boolean));return (strike.healthUpdates||[]).filter(u=>ids.has(u.uid)).map(u=>{const recoil=hits.find(h=>h.sourceId===u.uid)?.recoil;return recoil?{...u,hp:recoil.beforeHp,extraLife:recoil.beforeExtraLife}:u;});}
function combatDamageAftermath(strike){if(typeof presentIdentityAftermath==='function')presentIdentityAftermath(strike);const hits=[strike,strike.pair].filter(Boolean);for(const hit of hits){const target=hit.targetId?damageTarget(hit.targetId):patronDamageSource(hit.targetOwner),source=damageTarget(hit.sourceId);if(!hit.targetId&&hit.amount)damagePatron(hit.targetOwner,hit.amount);if(hit.trample>0)playDamageEffect('cone',target,patronDamageSource(hit.targetOwner),()=>{patronImpact(patronDamageSource(hit.targetOwner));damagePatron(hit.targetOwner,hit.trample);});for(const uid of hit.adjacent||[]){const updates=strike.healthUpdates?.filter(u=>u.uid===uid)||[];playDamageEffect('kinetic',target,damageTarget(uid),()=>applyDamageHit(updates));}if(hit.recoil)playDamageEffect('brutal',source,source,()=>applyDamageHit([hit.recoil.update]));applyRetaliationUpdates(hit.retaliationUpdates);}}
function combatImpactKey(card,attack){const metal=/engrenauta/i.test([card?.subtype,card?.name].join(' '));return (metal?'metalImpact':'impact')+(attack<=3?'Low':attack<=6?'Medium':'Heavy');}
function heavyCombatImpact(target,attack,attacker){if(!target||attack<=0)return;RunaDamageFX.shockwave(target,attack,()=>visualGeneration);const full=state?.players?.flatMap(p=>[...(p.reserve||[]),...(p.discard||[])]).find(c=>c.uid===attacker?.uid)||attacker;const key=combatImpactKey(full,attack);sound(key,attack,{to:target,level:.82});const strength=RunaDamageFX.impactTier(attack),shake=[0,2,5,8][strength];(target?.querySelector?.('.flight-face')||target?.querySelector?.('.card-art-canvas'))?.animate?.([{transform:'translate(0,0)'},{transform:`translate(${shake}px,${shake*.4}px)`,offset:.18},{transform:`translate(${-shake*.6}px,-1px)`,offset:.43},{transform:'translate(0,0)'}],{duration:180+strength*55});}
