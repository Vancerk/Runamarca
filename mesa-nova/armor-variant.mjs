import {randomUUID} from 'node:crypto';
import {weaponRecipe,wearEquipment} from './equipment.mjs';
import {patronCombatant,patronCombatId} from './patron-combat.mjs';
export function armorEffect(room,p,source,target,e,{emit,draw,applyDamage,pushLog=()=>{}}){
 if(e.op==='gain_patron_armor'){p.patron.extraLife=(p.patron.extraLife||0)+e.amount;emit(room,'patron_power',{playerId:p.id,targetPatronId:p.id,op:'extra_life',healthUpdates:[{patronId:p.id,hp:p.patron.hp,maxHp:p.patron.maxHp,extraLife:p.patron.extraLife}]});return true;}
 if(e.op==='create_weapon'){if(p.patron.equipment){p.patron.equipment.durability=0;wearEquipment(room,p,patronCombatant(p),{emit,pushLog});}const weapon={...weaponRecipe(1,'resistente','precisa'),uid:randomUUID(),owner:p.id,modelId:'armor-weapon',image:'images/artes-20261021/arma-oficina-1-3.png',imageKind:'illustration'};p.patron.equipment=weapon;emit(room,'equipment_equipped',{playerId:p.id,targetId:null,targetPatronId:p.id,sourceId:source.uid||source.id,card:structuredClone(weapon),healthUpdates:[]});return true;}
 if(e.op==='upgrade_weapon'){const weapon=p.patron?.equipment;if(weapon){weapon.attack++;weapon.durability++;weapon.maxDurability++;emit(room,'ability_notice',{playerId:p.id,sourceId:source.uid||source.id,targetId:patronCombatId(p),message:'A arma do Patrono recebeu +1 de ataque e +1 de durabilidade.'});}return true;}
 if(e.op==='armor_damage'){if(target?.type==='creature'&&target.owner!==p.id)applyDamage(room,target,p.patron.extraLife||0);return true;}
 if(e.op==='armor_draw'){p.patron.extraLife=(p.patron.extraLife||0)+2;emit(room,'patron_power',{playerId:p.id,targetPatronId:p.id,op:'extra_life',healthUpdates:[{patronId:p.id,hp:p.patron.hp,maxHp:p.patron.maxHp,extraLife:p.patron.extraLife}]});draw(room,p,2);return true;}
 return false;
}
