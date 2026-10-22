import {absorbPatronDamage} from './equipment.mjs';
import {receiveDamage} from './forja-variant.mjs';
const alive=c=>c&&c.type==='creature'&&c.damage<c.health;
export function resetCombatTriggers(room){
 delete room.rulesRng;
 for(const p of room.players){delete p.damageRounds;delete p.launcherUsedRounds;delete p.firstSpellRound;delete p.apprenticeQueue;}
}
function nextRandom(room){
 if(!room.rulesRng){
  let seed=Number.isInteger(room.rulesSeed)?room.rulesSeed>>>0:2166136261;
  if(!Number.isInteger(room.rulesSeed))for(const c of String(room.matchId||room.code)){seed=Math.imul(seed^c.charCodeAt(0),16777619)>>>0;}
  room.rulesRng={algorithm:'xorshift32',seed:seed||1,state:seed||1,draws:0};
 }
 let x=room.rulesRng.state;x^=x<<13;x^=x>>>17;x^=x<<5;room.rulesRng.state=x>>>0;room.rulesRng.draws++;
 return room.rulesRng.state/4294967296;
}
export function damagedPreviousRound(room,p){return (p.damageRounds||[]).includes(room.round-1);}
// All canonical patron damage passes here with explicit provenance. Fatigue is
// recorded for history, but never impersonates an allied source for Lançador.
export function dealPatronDamage(room,target,amount,{ownerId=null,sourceId=null,kind='unspecified',emit}={}){
 const result=absorbPatronDamage(target,amount);
 if(amount<=0)return result;
 target.damageRounds=[...new Set([...(target.damageRounds||[]).filter(r=>r>=room.round-1),room.round])];
 const owner=room.players.find(p=>p.id===ownerId);
 if(!owner||owner===target||!sourceId||kind==='fatigue')return result;
 const sources=owner.emanation.map(id=>owner.reserve.find(c=>c.uid===id)).filter(c=>alive(c)&&c.uid!==sourceId&&(c.effects||[]).some(e=>e.op==='launcher_damage')&&owner.launcherUsedRounds?.[c.launcherUseId||c.uid]!==room.round);
 // Mark the whole batch first. No source can cascade into another unused copy
 // from this same triggering event while resolving the batch's damage.
 for(const source of sources){source.launcherUseId??=source.uid;(owner.launcherUsedRounds??={})[source.launcherUseId]=room.round;}
 for(const source of sources){
  const targets=[{patron:target},...target.formation.map(id=>target.reserve.find(c=>c.uid===id)).filter(c=>alive(c)&&!target.emanation.includes(c.uid)).map(creature=>({creature}))];
  const chosen=targets[Math.floor(nextRandom(room)*targets.length)];
  let updates,targetId;
  if(chosen.patron){dealPatronDamage(room,target,1,{ownerId:owner.id,sourceId:source.uid,kind:'launcher',emit});targetId='patron:'+target.id;updates=[{patronId:target.id,hp:target.patron.hp,maxHp:target.patron.maxHp,extraLife:target.patron.extraLife||0}];}
  else{const c=chosen.creature;Object.assign(c,receiveDamage(c,1));targetId=c.uid;updates=[{uid:c.uid,hp:Math.max(0,c.health-c.damage),maxHp:c.health,extraLife:c.extraLife||0}];}
  emit?.(room,'launcher_damage',{playerId:owner.id,sourceId:source.uid,targetId,targetPatronId:chosen.patron?target.id:null,amount:1,op:'damage',originId:sourceId,originKind:kind,healthUpdates:updates});
 }
 return result;
}

// Called only at accepted payment (including zero-cost casts), before effects.
// The first-spell stamp is player-wide, so late entries/reset cannot renew it.
export function noteFirstSpell(room,p){
 if(p.firstSpellRound===room.round)return;
 p.firstSpellRound=room.round;
 p.apprenticeQueue=p.emanation.map(id=>p.reserve.find(c=>c.uid===id)).filter(c=>alive(c)&&(c.effects||[]).some(e=>e.op==='first_spell_damage')).map(c=>({source:structuredClone(c),amount:c.effects.find(e=>e.op==='first_spell_damage').amount||1}));
}
export function pendingFirstSpellShots(room,p){
 if(p.apprenticeQueue?.length&&(room.phase==='finished'||!room.players.find(q=>q!==p)?.reserve.some(alive)))p.apprenticeQueue=[];
 return p.apprenticeQueue||[];
}
export function resolveFirstSpellShot(room,p,data,{emit,pushLog,applyDamage,removeDead,checkWin,attack}){
 const shot=pendingFirstSpellShots(room,p)[0];if(!shot)return false;
 if(data.cardId!==shot.source.uid)throw Error('Resolva o disparo pendente da primeira magia.');
 const enemy=room.players.find(q=>q!==p),target=enemy.reserve.find(c=>c.uid===data.targetId&&alive(c));
 if(!target)throw Error('Escolha uma criatura inimiga viva; Patrono não é alvo da Aprendiz.');
 p.apprenticeQueue.shift();const beforeHealth=Math.max(0,target.health-target.damage);applyDamage(room,target,shot.amount);
 emit(room,'apprentice_target',{playerId:p.id,sourceId:shot.source.uid,targetId:target.uid,name:shot.source.name});
 emit(room,'apprentice_damage',{playerId:p.id,sourceId:shot.source.uid,targetId:target.uid,targetModel:target.modelId,name:shot.source.name,amount:shot.amount,damageDealt:Math.max(0,beforeHealth-Math.max(0,target.health-target.damage)),killed:!alive(target),op:'damage',healthUpdates:[{uid:target.uid,hp:Math.max(0,target.health-target.damage),maxHp:target.health,extraLife:target.extraLife||0,attack:attack(target,room,enemy.formation.indexOf(target.uid))}]});
 pushLog(room,`${shot.source.name} causou ${shot.amount} de dano pela primeira magia da rodada.`,p.id);
 removeDead(room);checkWin(room);pendingFirstSpellShots(room,p);return true;
}
