import {statGain} from './forja-variant.mjs';
export const tauntLanes=value=>Array.isArray(value)?value:Number.isInteger(value)?[value]:[];

export function applyProtocol(room,{p,lane,card},helpers){
 const assault=card.protocolMode==='assault';
 const affected=[{card,amount:2},...[lane-1,lane+1].filter(i=>i>=0&&i<3).map(i=>({card:helpers.laneCard(room,p.id,i),amount:1})).filter(x=>x.card)];
 for(const entry of affected){entry.amount=statGain(entry.card,entry.amount);
  if(assault)entry.card.attackMod=(entry.card.attackMod||0)+entry.amount;
  else{
   entry.card.protocolHealth=(entry.card.protocolHealth||0)+entry.amount;
   entry.card.protocolDamageBefore??=entry.card.damage;
   entry.card.health+=entry.amount;
  }
 }
 return affected.map(({card:c})=>({uid:c.uid,hp:Math.max(0,c.health-c.damage),maxHp:c.health,attack:helpers.attack(c,room,p.formation.indexOf(c.uid))}));
}

export function clearProtocolHealth(card){
 if(!card.protocolHealth)return;
 const bonus=card.protocolHealth;
 card.health-=bonus;
 // O bônus absorve dano novo; nunca cura feridas anteriores ao protocolo.
 card.damage=Math.max(0,card.damage-Math.min(bonus,Math.max(0,card.damage-(card.protocolDamageBefore||0))));
 delete card.protocolHealth;delete card.protocolDamageBefore;
}

export function activateMirage(room,caster,target,prep){
 const affinity=prep.card.effects.find(e=>e.op==='mirage')?.token_affinity??'forja';
 if(!['forja','fluxo','ruptura'].includes(affinity))throw Error('Afinidade da ficha de Miragem inválida.');
 if(caster.formation[prep.lane]||caster.reserve.filter(c=>c.damage<c.health&&!caster.emanation.includes(c.uid)).length>=8)return null;
 const token={uid:`${prep.card.uid}-mirage-${room.combatCount}`,modelId:'mirage-token',owner:caster.id,name:'Miragem',type:'creature',rarity:'lacaio',affinity,cost:0,attack:0,health:1,damage:0,attackMod:0,effects:[],token:true,text:'Miragem efêmera: desaparece ao fim deste combate, mesmo se sobreviver.',image:prep.card.image,baseStats:{attack:0,health:1,cost:0}};
 token.mirageLifetime={combat:room.combatCount,origin:token.uid};
 caster.reserve.push(token);caster.formation[prep.lane]=token.uid;if(prep.card.effects.some(e=>e.op==='mirage'&&e.grant_trample!==false))target.temporaryTrample=true;
 (room.spawnedMirages??=[]).push({card:structuredClone(token),lane:prep.lane,owner:caster.id,spellId:prep.card.uid});
 return token;
}

// Intrinsic token identity is deliberately independent of abilities and silence.
// Expiration is removal, not damage, defeat or a second death.
export function expireMirages(room,helpers={}){
 const expired=[];
 const expires=c=>c.modelId==='mirage-token'&&Number.isInteger(c.mirageLifetime?.combat)&&c.mirageLifetime.combat===room.combatCount;
 for(const p of room.players){
  for(const zone of ['reserve','hand','discard','deck']){
   const tokens=(p[zone]||[]).filter(expires);
   for(const c of tokens){
    const entry={uid:c.uid,owner:p.id,lane:p.formation.indexOf(c.uid),zone};expired.push(entry);
    const home=room.players.find(x=>x.id===c.teleportHome?.owner)||p;
    helpers.releaseEquipment?.(room,home,c,helpers);
    helpers.releaseForced?.(room,c.uid,false);
    for(const seat of room.players){
     seat.formation=seat.formation.map(uid=>uid===c.uid?null:uid);
     seat.emanation=seat.emanation.filter(uid=>uid!==c.uid);
     if(seat.taunts)delete seat.taunts[c.uid];
     if(seat.study?.positionEffects)seat.study.positionEffects=seat.study.positionEffects.filter(x=>x.targetId!==c.uid);
    }
    helpers.emit?.(room,'mirage_expired',{playerId:p.id,cardId:c.uid,name:c.name,zone});
    helpers.pushLog?.(room,`${c.name} se desfez ao fim do combate.`,p.id);
   }
   if(tokens.length)p[zone]=p[zone].filter(c=>!expires(c));
  }
 }
 if(room.lastCombat)room.lastCombat.expiredMirages=[...(room.lastCombat.expiredMirages||[]),...expired];
 return expired;
}
