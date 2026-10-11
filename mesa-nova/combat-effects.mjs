import {wearEquipment,absorbPatronDamage} from './equipment.mjs';
import {grantPermanentStats,statGain} from './forja-variant.mjs';
import {finishAttack} from './fluxo-effects.mjs';
import {tauntLanes} from './forja-effects.mjs';
// Directed attacks: each creature strikes once. Initiative strikes resolve
// together before normal strikes, including attacks redirected by Taunt.
export function resolveDirectedCombat(room,{effects,attack,laneCard,alive,applyDamage,pushLog,curseFromDamage,emit,blockedSummons,retaliation}){
 const participants=room.players.flatMap(p=>p.formation.map((uid,lane)=>({p,lane,card:laneCard(room,p.id,lane)})).filter(x=>x.card));
 const strikes=participants.map(({p,lane,card})=>{
  const enemy=room.players.find(x=>x.id!==p.id);
  const redirect=participants.find(x=>x.p===enemy&&effects(x.card).some(e=>e.op==='taunt')&&tauntLanes(enemy.taunts?.[x.card.uid]).includes(lane)&&Math.abs(x.lane-lane)===1);
  return {card,p,lane,originalTarget:laneCard(room,enemy.id,lane),redirected:Boolean(redirect),targetLane:redirect?.lane??lane,target:redirect?.card||laneCard(room,enemy.id,lane),enemy,initiative:effects(card).some(e=>e.op==='initiative')};
 });
 const contributors=new Map(),steps=[];
 for(const initiative of [true,false]){
  const eligible=strikes.filter(s=>s.initiative===initiative&&alive(s.card)&&!s.card.sleep&&s.card.eyeSkipCombat!==room.combatCount);
  // A Taunt that died in the earlier initiative phase releases redirected
  // attackers to their original defender (or Patron if that lane was empty).
  // Original defenders killed earlier still block, as in the existing rule.
  for(const s of eligible)if(s.redirected&&!alive(s.target)){s.target=s.originalTarget;s.targetLane=s.lane;s.redirected=false;}
  blockedSummons?.(room,eligible,{attack,emit,pushLog});
  const changes=new Map(),patronChanges=new Map();
  const damage=(target,amount,source)=>{if(!target||amount<=0)return;changes.set(target,(changes.get(target)||0)+amount);if(!contributors.has(target))contributors.set(target,new Set());contributors.get(target).add(source);};
  const patron=(p,amount)=>{if(amount>0)patronChanges.set(p,(patronChanges.get(p)||0)+amount);};
  const phaseSteps=[];
  for(const s of eligible){
   const baseAmount=attack(s.card,room,s.lane),target=s.target,amount=target?.attackBarrier?Math.ceil(baseAmount/2):baseAmount;const retaliationUpdates=[];const retaliationDamage=baseAmount<=2?(retaliation?.(room,s.p,retaliationUpdates)||0):0;patron(s.enemy,retaliationDamage);
   // A defender killed in the initiative phase stays in the way for this
   // exchange: normal damage doesn't suddenly turn into a free patron hit.
   const occupied=Boolean(target),hp=target?Math.max(0,target.health-target.damage):0,protection=hp+(target?.extraLife||0);
   if(occupied){if(alive(target)){damage(target,amount,s.card);if((s.card.temporaryTrample||s.card.grantedTrample||effects(s.card).some(e=>e.op==='trample')))patron(s.enemy,Math.max(0,amount-protection));}}
   else patron(s.enemy,amount);
   const splash=effects(s.card).find(e=>e.op==='adjacent_damage');
   const adjacent=[];
   if(splash&&occupied&&hp>0&&amount>0)for(const lane of [s.targetLane-1,s.targetLane+1])if(lane>=0&&lane<3){const neighbor=laneCard(room,s.enemy.id,lane);if(alive(neighbor)){damage(neighbor,splash.amount,s.card);adjacent.push(neighbor.uid);}}
   phaseSteps.push({lane:s.lane,initiative,retaliationDamage,retaliationUpdates,sourceId:s.card.uid,owner:s.p.id,targetId:target?.uid||null,targetOwner:s.enemy.id,targetLane:s.targetLane,amount,blocked:occupied&&hp===0,trample:occupied&&hp>0&&(s.card.temporaryTrample||s.card.grantedTrample||effects(s.card).some(e=>e.op==='trample'))?Math.max(0,amount-protection):0,adjacent,healthUpdates:[...changes].filter(([c])=>c===target||adjacent.includes(c.uid)).map(([c,total])=>({uid:c.uid,hp:Math.max(0,c.health-c.damage-Math.max(0,total-(c.extraLife||0))),maxHp:c.health,extraLife:Math.max(0,(c.extraLife||0)-total)}))});
   pushLog(room,`${s.card.name}${initiative?' (Iniciativa)':''} atacou ${occupied?target.name:'o Patrono'}${s.targetLane!==s.lane?' por Provocar':''}.`,s.p.id);
  }
  for(const [target,amount] of changes){applyDamage(room,target,amount);}
  for(const s of eligible)if(!s.target||alive(s.target)||phaseSteps.find(x=>x.sourceId===s.card.uid)?.blocked===false){finishAttack(s.card,s.target,effects);if(s.card.corruption){const step=phaseSteps.find(x=>x.sourceId===s.card.uid);step.healthUpdates.push({uid:s.card.uid,hp:Math.max(0,s.card.health-s.card.damage),maxHp:s.card.health,extraLife:s.card.extraLife||0,attack:attack(s.card,room,s.lane),corruption:true});}}
  for(const step of phaseSteps)for(const update of step.healthUpdates){const c=participants.find(x=>x.card.uid===update.uid)?.card;if(c){update.hp=Math.max(0,c.health-c.damage);update.extraLife=c.extraLife||0;update.attack=attack(c,room,participants.find(x=>x.card===c).lane);}}
  for(const [p,amount] of patronChanges){absorbPatronDamage(p,amount);room.lastCombat.patronHits.push(`${amount} em ${p.name}`);}
  for(const step of phaseSteps)if(!step.targetId||step.trample||step.retaliationDamage)step.patronDamage=(step.targetId?step.trample:step.amount)+(step.retaliationDamage||0);
  for(const step of phaseSteps){const source=eligible.find(s=>s.card.uid===step.sourceId);if(!step.blocked&&source.card.equipment?.recoil){const beforeHp=source.card.health-source.card.damage,beforeExtraLife=source.card.extraLife||0;applyDamage(room,source.card,source.card.equipment.recoil);step.recoil={amount:source.card.equipment.recoil,beforeHp,beforeExtraLife,update:{uid:source.card.uid,hp:Math.max(0,source.card.health-source.card.damage),maxHp:source.card.health,extraLife:source.card.extraLife||0,attack:attack(source.card,room,source.lane)}};step.healthUpdates.push(step.recoil.update);}const update=step.blocked?null:wearEquipment(room,room.players.find(p=>p.id===source.card.teleportHome?.owner)||source.p,source.card,{emit,pushLog});step.equipmentUpdates=update?[update]:[];}
  const used=new Set();for(const step of phaseSteps){if(used.has(step))continue;const pair=phaseSteps.find(x=>x!==step&&!used.has(x)&&step.targetId===x.sourceId&&x.targetId===step.sourceId&&!step.blocked&&!x.blocked);if(pair){used.add(pair);const updates=new Map([...step.healthUpdates,...pair.healthUpdates].map(x=>[x.uid,x]));steps.push({...step,pair,equipmentUpdates:[...step.equipmentUpdates,...pair.equipmentUpdates],healthUpdates:[...updates.values()]});}else steps.push(step);used.add(step);}
 }
 room.growthUpdates=[];
 for(const {card,lane} of participants)if(alive(card)){
  let kills=0;for(const [target,sources] of contributors)if(!alive(target)&&sources.has(card))kills++;
  const growth=effects(card).find(e=>e.op==='kill_growth');
  if(growth&&kills){grantPermanentStats(card,growth.attack*kills,growth.health*kills);}
  const survivor=effects(card).find(e=>e.op==='survive_growth');
  if(survivor){grantPermanentStats(card,survivor.attack,survivor.health);}
  if(growth&&kills||survivor)room.growthUpdates.push({uid:card.uid,attack:attack(card,room,lane),amount:(growth?.attack||0)*kills+(survivor?.attack||0),hp:Math.max(0,card.health-card.damage),maxHp:card.health});
 }
 room.directedSteps=steps;
}
