import {dealPatronDamage} from './combat-triggers.mjs';
export function domPowers(basic='token'){
 return [basic==='damage'?{id:'golpe-do-maioral',name:'Golpe do Maioral',cost:2,limit:'round',duration:'instant',text:'Cause 1 de dano a qualquer alvo.'}:{id:'convocar-carrasco',name:'Convocar Carrasco',cost:2,limit:'round',duration:'instant',text:'Convoque um Carrasco 1/1 na sua reserva.'},
 {id:'represalia-de-eter',name:'Represália de Éter',cost:4,limit:'match',duration:'round',text:'Até o fim desta rodada, sempre que qualquer jogador usar uma magia, cause ao Patrono dele dano igual ao Éter pago por ela. Inclui suas próprias magias.'}];
}
export function activateDomPower(room,p,power,data,{emit,pushLog,summon,applyDamage,removeDead,checkWin,attack}){
 if(!['convocar-carrasco','golpe-do-maioral','represalia-de-eter'].includes(power.id))return false;
 let target=null,targetPlayer=null;
 if(power.id==='convocar-carrasco'&&p.reserve.filter(c=>c.damage<c.health&&!p.emanation.includes(c.uid)).length>=8)throw Error('Reserva cheia: não há espaço para o Carrasco.');
 if(power.id==='golpe-do-maioral'){
  targetPlayer=data.targetId==='patron'?p:room.players.find(s=>data.targetId==='patron:'+s.id);
  target=targetPlayer?.patron||room.players.flatMap(s=>s.reserve).find(c=>c.uid===data.targetId&&c.damage<c.health);
  if(!target||targetPlayer&&target.hp<=0)throw Error('Escolha uma criatura viva ou um Patrono como alvo.');
 }
 p.mana-=power.cost;(p.patron.usedPowers??={})[power.id]=room.round;
 let updates=[],cardId=null;
 if(power.id==='convocar-carrasco')cardId=summon(p,{name:'Carrasco',subtype:'Carrasco',attack:1,health:1,modelId:'dom-carrasco',image:p.patron.image})?.uid;
 if(power.id==='represalia-de-eter')p.patron.etherReprisalRound=room.round;
 if(power.id==='golpe-do-maioral'){
  if(targetPlayer){dealPatronDamage(room,targetPlayer,1,{ownerId:p.id,sourceId:power.id,kind:'power',emit});updates=[{patronId:targetPlayer.id,hp:target.hp,maxHp:target.maxHp,extraLife:target.extraLife||0}];}
  else{if(!target.runeCoating)applyDamage(room,target,1);updates=[{uid:target.uid,hp:Math.max(0,target.health-target.damage),maxHp:target.health,attack:attack(target,room,room.players.find(s=>s.id===target.owner)?.formation.indexOf(target.uid)??-1)}];}
 }
 emit(room,'patron_power',{playerId:p.id,powerId:power.id,name:power.name,op:power.id==='golpe-do-maioral'?'damage':power.id==='convocar-carrasco'?'summon':'ether_reprisal',amount:power.id==='golpe-do-maioral'?1:0,targetId:targetPlayer?null:target?.uid,targetPatronId:targetPlayer?.id,cardId,paid:power.cost,healthUpdates:updates});
 pushLog(room,p.name+' usou '+power.name+'.',p.id);removeDead(room);checkWin(room);return true;
}
// Payment is the unique casting point, including preparation. Resolving an
// already prepared spell or copying it into an adjacent slot does not pay twice.
export function punishSpellPayment(room,caster,paid,{emit,pushLog}){
 if(paid<=0)return;
 const sources=room.players.filter(p=>p.patron?.etherReprisalRound===room.round);
 for(const source of sources){const result=dealPatronDamage(room,caster,paid,{ownerId:source.id,sourceId:'represalia-de-eter:'+source.id,kind:'reprisal',emit});emit(room,'ether_reprisal',{playerId:source.id,casterId:caster.id,targetPatronId:caster.id,powerId:'represalia-de-eter',amount:paid,absorbed:result.absorbed,healthUpdates:[{patronId:caster.id,hp:caster.patron.hp,maxHp:caster.patron.maxHp,extraLife:caster.patron.extraLife||0}]});pushLog(room,'Represália de Éter: '+caster.name+' recebeu '+paid+' de dano ao usar uma magia.',source.id);}
}
