import {randomUUID} from 'node:crypto';
const effects=c=>c?.effects||[];
const tribal=c=>String(c.subtype||'').toLowerCase().split(/\s+/).includes('tribal');
const alive=c=>c&&c.damage<c.health;
export function tribalBonus(p,c){return tribal(c)?p.reserve.filter(s=>s!==c&&alive(s)).flatMap(effects).filter(e=>e.op==='tribal_aura').reduce((n,e)=>n+e.attack,0):0;}
export function syncTribalHealth(room){
 for(const p of room.players)for(const c of p.reserve){
  const bonus=tribal(c)?p.reserve.filter(s=>s!==c&&alive(s)).flatMap(effects).filter(e=>e.op==='tribal_aura').reduce((n,e)=>n+e.health,0):0;
  c.health+=bonus-(c.tribalHealth||0);c.tribalHealth=bonus;
 }
}
export function enteredCreature(room,p,c,{attack,emit,pushLog}){
 syncTribalHealth(room);
 if(attack(c,room,p.formation.indexOf(c.uid))>1)return;
 for(const gnoll of p.reserve.filter(s=>s!==c&&alive(s)))for(const e of effects(gnoll).filter(e=>e.op==='small_enter_attack')){
  gnoll.attackMod=(gnoll.attackMod||0)+e.amount;
  emit(room,'ability_notice',{playerId:p.id,sourceId:gnoll.uid,message:`${gnoll.name} recebe +${e.amount} de ataque até o fim deste combate.`});
  pushLog(room,`${gnoll.name} recebeu +${e.amount} de ataque pela entrada de ${c.name}.`,p.id);
 }
}
export function summonRuptura(room,p,spec,{emit,pushLog,attack},stableUid){
 if(p.reserve.filter(c=>alive(c)&&!p.emanation.includes(c.uid)).length>=8)return null;
 const c={uid:stableUid||randomUUID(),modelId:spec.modelId||'ruptura-token',owner:p.id,name:spec.name,type:'creature',rarity:'lacaio',affinity:p.patron.affinity,cost:0,attack:spec.attack??1,health:spec.health??1,damage:0,attackMod:0,subtype:spec.subtype||'',text:'Criatura convocada.',effects:[],token:true,image:spec.image||null,baseStats:{attack:spec.attack??1,health:spec.health??1,cost:0}};
 p.reserve.push(c);enteredCreature(room,p,c,{attack,emit,pushLog});
 emit(room,'summon',{playerId:p.id,cardId:c.uid,name:c.name,zone:'reserve',speech:'Estou a postos!'});return c;
}
export function blockedSummons(room,participants,helpers){
 for(const s of participants){if(!alive(s.card)||s.card.sleep||!s.target)continue;
  for(const e of effects(s.card).filter(e=>e.op==='blocked_summon'))summonRuptura(room,s.p,{name:e.name,subtype:e.subtype,attack:e.attack,health:e.health,image:s.card.image,modelId:s.card.modelId+'-token'},helpers,`${s.card.uid}-blocked-${room.combatCount}`);
 }
}
export function retaliation(room,p){
 let amount=0;const enemy=room.players.find(s=>s!==p);
 for(const uid of p.emanation){const source=p.reserve.find(c=>c.uid===uid);if(!alive(source))continue;
  for(const e of effects(source).filter(e=>e.op==='retaliation')){
   enemy.patron.retaliation=(enemy.patron.retaliation||0)+1;
   if(enemy.patron.retaliation>=e.threshold){enemy.patron.retaliation-=e.threshold;amount+=e.amount;}
  }
 }
 return amount;
}
export function releaseForced(room,sourceId,unassign=true){
 for(const p of room.players)for(const c of p.reserve)if(c.forcedBy===sourceId){if(unassign)p.formation=p.formation.map(uid=>uid===c.uid?null:uid);delete c.forcedBy;delete c.forcedLane;}
}
export function ruptureFormationAction(room,p,data,{findCreature,effects,emit,pushLog}){
 const c=findCreature(p,data.cardId),lane=p.formation.indexOf(data.cardId);
 if(!c||lane<0||c.sleep)throw Error('Escolha uma criatura ativa nas posições de combate.');
 if(data.type==='revealPayment'){
  const e=effects(c).find(e=>e.op==='optional_reveal_attack');if(!e)throw Error('Esta criatura não tem esse pagamento opcional.');
  if(c.revealPaymentRound===room.round)throw Error('A escolha do Aríete já foi feita neste combate.');
  if(data.pay){if(p.mana<e.cost)throw Error('Éter insuficiente para o bônus do Aríete.');p.mana-=e.cost;c.revealPaid=true;}
  c.revealPaymentRound=room.round;
  if(data.pay){const message=`${p.name} pagou ${e.cost} Éter: ${c.name} receberá +${e.amount} de ataque na Revelação deste combate.`;emit(room,'ability_notice',{playerId:p.id,sourceId:c.uid,message});pushLog(room,message,p.id);}
  return;
 }
 if(data.type==='forceOpponent'){
  if(!effects(c).some(e=>e.op==='force_opponent'))throw Error('Esta criatura não pode puxar um adversário.');
  const enemy=room.players.find(s=>s!==p);
  if(enemy.formation[lane]&&enemy.formation[lane]!==enemy.reserve.find(t=>t.forcedBy===c.uid)?.uid)throw Error('A posição inimiga já está ocupada.');
  const target=data.targetId===null?null:findCreature(enemy,data.targetId);
  if(data.targetId!==null&&(!target||enemy.emanation.includes(target.uid)||enemy.formation.includes(target.uid)||target.anchor||target.sleep||target.forcedBy))throw Error('Escolha uma criatura livre na reserva inimiga, fora da Emanação e do combate.');
  releaseForced(room,c.uid);
  if(target){enemy.formation[lane]=target.uid;target.forcedBy=c.uid;target.forcedLane=lane;enemy.ready=false;const message=`${c.name} puxou ${target.name} da reserva para enfrentá-lo.`;emit(room,'ability_notice',{playerId:p.id,sourceId:c.uid,targetId:target.uid,message});pushLog(room,message,p.id);}
 }
}
