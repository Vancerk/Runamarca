import {startForge} from './equipment.mjs';
export function activatePatronPower(room,p,data,{findCreature,attack,spellBuff,emit,pushLog}){
 const power=p.patron?.powers?.find(e=>e.id===data.powerId);
 if(!power)throw Error('Este Patrono não possui esse poder.');
 const used=p.patron.usedPowers?.[power.id];
 if((power.limit==='match'&&used!==undefined)||(power.limit==='round'&&used===room.round))throw Error('Este poder já foi utilizado.');
 if(p.mana<power.cost)throw Error('Energia insuficiente para o poder.');
 if(power.id==='forjar-arma'){startForge(room,p,power,data,{emit,pushLog});return;}
 if(power.id==='forjar-armadura'){p.mana-=power.cost;(p.patron.usedPowers??={})[power.id]=room.round;p.patron.extraLife=(p.patron.extraLife||0)+1;emit(room,'patron_power',{playerId:p.id,powerId:power.id,name:power.name,op:'extra_life',amount:0,targetPatronId:p.id,healthUpdates:[{patronId:p.id,hp:p.patron.hp,maxHp:p.patron.maxHp,extraLife:p.patron.extraLife}]});pushLog(room,p.name+' forjou 1 de Vida Extra para o Patrono.',p.id);return;}
 const target=findCreature(p,data.targetId);if(!target||target.damage>=target.health)throw Error('Escolha uma criatura aliada em campo.');
 if(power.id==='potencializar'&&!['attack','health'].includes(data.attribute))throw Error('Escolha ataque ou vida.');
 if(!['permanent','combat'].includes(power.duration))throw Error('A duração deste poder ainda não foi definida.');
 const atk=power.id==='ultimato-forja'?2:data.attribute==='attack'?1:0,hp=power.id==='ultimato-forja'?2:data.attribute==='health'?1:0;
 p.mana-=power.cost;(p.patron.usedPowers??={})[power.id]=room.round;
 if(power.duration==='permanent'){target.attack+=atk;target.health+=hp;if(power.id==='ultimato-forja')target.grantedTrample=true;}
 else{target.attackMod=(target.attackMod||0)+atk;target.health+=hp;target.temporaryHealth=(target.temporaryHealth||0)+hp;if(power.id==='ultimato-forja')target.temporaryTrample=true;}
 spellBuff(target,room.round,power.duration==='permanent');
 emit(room,'patron_power',{playerId:p.id,powerId:power.id,name:power.name,op:'stat_buff',targetId:target.uid,amount:atk,healthAmount:hp,healthUpdates:[{uid:target.uid,hp:target.health-target.damage,maxHp:target.health,attack:attack(target,room,p.formation.indexOf(target.uid))}]});
 pushLog(room,`${p.name} usou ${power.name} em ${target.name}.`,p.id);
}
