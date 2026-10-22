import {clearProtocolHealth} from './forja-effects.mjs';
export function spellBuff(card,round,permanent=false){card.spellBuff=permanent?'permanent':round;}
export function retainAnchors(p){p.formation=[0,1,2].map(lane=>p.reserve.find(c=>((c.sleep?.remaining>0&&c.sleep.lane===lane)||(c.anchor?.remaining>0&&c.anchor.lane===lane))&&c.damage<c.health)?.uid||null);}
// Corruption reacts to completed attacks, never spell or splash damage.
export function curseFromDamage(target,source,effects,attackContext=false){
 if(!attackContext||!source||source.type==='patron'||source.owner===target?.owner||!target?.curseArmed||target.corruptionTarget||!effects(target).some(e=>e.op==='damage_curse'))return;
 target.corruptionTarget=source.uid;source.corruption=true;
}
export function finishAttack(source,target,effects){curseFromDamage(target,source,effects,true);if(source.corruption)source.attack=Math.max(0,source.attack-1);}
export function healthAuras(p,effects){return p.emanation.flatMap(uid=>{const c=p.reserve.find(c=>c.uid===uid&&c.damage<c.health);return effects(c).map(e=>e.choose_lane?{...e,lane:c.auraLane}:e);});}
export function pruneSeals(room){room.seals=(room.seals||[]).filter(s=>room.players.some(p=>p.reserve.some(c=>c.uid===s.sourceId&&c.damage<c.health)));}
export function revealSeals(room,{effects,laneCard,pushLog}){
 pruneSeals(room);room.teleports=[];
 for(const p of room.players)for(let lane=0;lane<3;lane++){
  const c=laneCard(room,p.id,lane);if(!c||c.sleep||!effects(c).some(e=>e.op==='paired_seals')||(room.seals||[]).some(s=>s.sourceId===c.uid)||!c.sealChoices)continue;
  const enemy=room.players.find(x=>x!==p),seal={sourceId:c.uid,owner:p.id,enemyOwner:enemy.id,allyLane:c.sealChoices.allyLane,enemyLane:c.sealChoices.enemyLane};
  (room.seals??=[]).push(seal);
  if(room.collectPreview)room.revelationsApplied.push({sourceId:c.uid,effectIndex:effects(c).findIndex(e=>e.op==='paired_seals'),casterId:p.id,targetSide:p.id,lane,name:c.name,op:'paired_seals',seal});
  pushLog(room,c.name+' criou dois selos vinculados à sua vida.',p.id);
 }
 // Each pair exchanges once per combat; a creature never bounces through
 // multiple pairs in the same Revelation sequence.
 const moved=new Set();
 for(const s of room.seals||[]){
  const home=room.players.find(p=>p.id===s.owner),enemy=room.players.find(p=>p.id===s.enemyOwner),incoming=laneCard(room,enemy.id,s.enemyLane),outgoing=laneCard(room,home.id,s.allyLane);
  if(!incoming||moved.has(incoming.uid)||outgoing&&moved.has(outgoing.uid))continue;
  const movements=[];
  for(const [c,from,to,fromLane,toLane] of [[incoming,enemy,home,s.enemyLane,s.allyLane],[outgoing,home,enemy,s.allyLane,s.enemyLane]])if(c){
   c.teleportHome={owner:from.id,lane:fromLane};from.reserve=from.reserve.filter(x=>x!==c);to.reserve.push(c);c.owner=to.id;
   // Position effects follow the exchanged creature, then return to its home lane.
   if(c.anchor)c.anchor.lane=toLane;if(c.sleep)c.sleep.lane=toLane;
   moved.add(c.uid);movements.push({uid:c.uid,fromOwner:from.id,fromLane,owner:to.id,lane:toLane});
  }
  home.formation[s.allyLane]=incoming.uid;enemy.formation[s.enemyLane]=outgoing?.uid||null;
  room.teleports.push({sourceId:s.sourceId,seal:s,movements});pushLog(room,'Os selos trocaram as criaturas de lado; suas ações seguem pelo lado de chegada.',s.owner);
 }
}
export function restoreTeleportOwners(room){
 const cards=room.players.flatMap(p=>[...p.reserve,...p.discard]).filter(c=>c.teleportHome);
 for(const c of cards){const {owner,lane}=c.teleportHome,home=room.players.find(p=>p.id===owner),away=room.players.find(p=>p.id===c.owner),dead=away.discard.includes(c);
  away.reserve=away.reserve.filter(x=>x!==c);away.discard=away.discard.filter(x=>x!==c);away.formation=away.formation.map(uid=>uid===c.uid?null:uid);c.owner=home.id;
  if(c.anchor)c.anchor.lane=lane;if(c.sleep)c.sleep.lane=lane;delete c.teleportHome;(dead?home.discard:home.reserve).push(c);
 }
 pruneSeals(room);
}
export function finishFields(room){
 for(const p of room.players){
  p.formation=p.formation.map(uid=>uid==='patron:'+p.id?null:uid);
  for(const c of p.reserve){clearProtocolHealth(c);delete c.temporaryTrample;delete c.attackBarrier;if(c.temporaryHealth){c.health-=c.temporaryHealth;c.damage=Math.max(0,c.damage-Math.min(c.temporaryHealth,Math.max(0,c.damage-(c.temporaryDamageBefore||0))));delete c.temporaryHealth;delete c.temporaryDamageBefore;}if(c.sleep&&room.combatCount>=c.sleep.setAt&&--c.sleep.remaining<=0)delete c.sleep;if(c.anchor&&room.combatCount>=c.anchor.setAt&&--c.anchor.remaining<=0)delete c.anchor;}
  p.prepared=p.prepared.filter(prep=>{if(!prep.card.effects?.some(e=>e.op==='barrier')||prep.lastCombat!==room.combatCount)return true;if(--prep.remaining>0)return true;p.discard.push(prep.card);return false;});
 }
 restoreTeleportOwners(room);
}
