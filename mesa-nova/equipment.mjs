import {randomUUID} from 'node:crypto';
import './weapons-data.js';
export const weaponOptions=globalThis.RunaWeapons.options;
export const weaponRecipe=globalThis.RunaWeapons.recipe;
export function startForge(room,p,power,data,{emit,pushLog}){
 if(p.forge)throw Error('Uma arma já está em produção.');
 const cost=Number(data.weaponCost);if(![1,5,10].includes(cost))throw Error('Escolha custo 1, 5 ou 10 para a arma.');
 p.mana-=power.cost;(p.patron.usedPowers??={})[power.id]=room.round;
 p.forge={stage:'durability',cost,dueRound:room.round+1,powerId:power.id};
 emit(room,'forge_started',{playerId:p.id,cost});pushLog(room,p.name+' iniciou a criação de uma arma de custo '+cost+'.',p.id);
}
export function awaitForge(room,p,{emit,pushLog}){
 if(!p.forge||p.forge.dueRound>room.round)return false;
 room.phase='forging';room.turn=p.id;
 emit(room,'forge_step',{playerId:p.id,stage:p.forge.stage});pushLog(room,p.name+' deve escolher '+(p.forge.stage==='durability'?'a estrutura':'a lâmina')+' da arma antes da preparação.',p.id);return true;
}
export function chooseForge(room,p,data,{emit,pushLog}){
 const forge=p.forge;if(!forge||forge.dueRound>room.round)throw Error('Não há etapa de forja disponível.');
 const choice=weaponOptions(forge.stage,forge.cost).find(o=>o.id===data.optionId);if(!choice)throw Error('Escolha uma opção válida da etapa atual.');
 if(forge.stage==='durability'){forge.chassis=choice.id;forge.stage='attack';forge.dueRound=room.round+1;emit(room,'forge_progress',{playerId:p.id,stage:'durability'});}
 else if(forge.stage==='attack'){
  const weapon={...weaponRecipe(forge.cost,forge.chassis,choice.id),uid:randomUUID(),owner:p.id,modelId:'forged-weapon'};
  if(p.hand.length>=9){p.discard.push(weapon);emit(room,'burn',{playerId:p.id,name:weapon.name});pushLog(room,'A arma forjada foi ao Nartvanyr: mão cheia.',p.id);}
  else{p.hand.push(weapon);emit(room,'forge_complete',{playerId:p.id});pushLog(room,p.name+' concluiu a arma e a recebeu na mão.',p.id);}
  delete p.forge;
 }else throw Error('Etapa de forja inválida.');
}
export function equipWeapon(room,p,data,{emit,pushLog,attack}){
 const weapon=(p.weapons||[]).find(w=>w.uid===data.cardId&&w.durability>0),target=p.reserve.find(c=>c.uid===data.targetId&&c.type==='creature'&&c.damage<c.health);
 if(!weapon||!target)throw Error('Escolha uma arma da reserva e uma criatura aliada viva.');
 if(target.equipment)throw Error('Esta criatura já possui um equipamento.');
 if(p.mana<1)throw Error('Equipar custa 1 Éter.');
 p.mana--;p.weapons=p.weapons.filter(w=>w!==weapon);target.equipment=weapon;
 emit(room,'equipment_equipped',{playerId:p.id,targetId:target.uid,card:structuredClone(weapon),healthUpdates:[{uid:target.uid,hp:target.health-target.damage,maxHp:target.health,attack:attack(target,room,p.formation.indexOf(target.uid))}]});pushLog(room,p.name+' equipou '+weapon.name+' em '+target.name+'.',p.id);
}
export function releaseEquipment(room,p,creature,{emit,pushLog}){
 const weapon=creature.equipment;if(!weapon)return;delete creature.equipment;
 if(weapon.durability>0){(p.weapons??=[]).push(weapon);emit(room,'equipment_returned',{playerId:p.id,cardId:weapon.uid,sourceId:creature.uid});pushLog(room,weapon.name+' voltou à reserva com '+weapon.durability+' de durabilidade.',p.id);}
}
export function wearEquipment(room,p,creature,{emit,pushLog}){
 const weapon=creature.equipment;if(!weapon)return null;
 weapon.durability=Math.max(0,weapon.durability-weapon.wear);
 const update={sourceId:creature.uid,cardId:weapon.uid,durability:weapon.durability,broken:weapon.durability===0};
 if(update.broken){delete creature.equipment;p.discard.push(weapon);emit?.(room,'equipment_broken',{playerId:p.id,cardId:weapon.uid,sourceId:creature.uid});pushLog(room,weapon.name+' quebrou e foi ao Nartvanyr.',p.id);}
 return update;
}

export function absorbPatronDamage(p,amount){const absorbed=Math.min(p.patron.extraLife||0,Math.max(0,amount));p.patron.extraLife=Math.max(0,(p.patron.extraLife||0)-absorbed);p.patron.hp-=Math.max(0,amount)-absorbed;return {absorbed,damage:Math.max(0,amount)-absorbed};}
