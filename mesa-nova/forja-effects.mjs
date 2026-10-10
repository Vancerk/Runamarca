export const tauntLanes=value=>Array.isArray(value)?value:Number.isInteger(value)?[value]:[];

export function applyProtocol(room,{p,lane,card},helpers){
 const assault=card.protocolMode==='assault';
 const affected=[{card,amount:2},...[lane-1,lane+1].filter(i=>i>=0&&i<3).map(i=>({card:helpers.laneCard(room,p.id,i),amount:1})).filter(x=>x.card)];
 for(const entry of affected){
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
 if(caster.formation[prep.lane]||caster.reserve.filter(c=>c.damage<c.health&&!caster.emanation.includes(c.uid)).length>=8)return null;
 const token={uid:`${prep.card.uid}-mirage-${room.combatCount}`,modelId:'mirage-token',owner:caster.id,name:'Miragem',type:'creature',rarity:'lacaio',affinity:'forja',cost:0,attack:0,health:1,damage:0,attackMod:0,effects:[],token:true,text:'Criatura convocada.',image:prep.card.image,baseStats:{attack:0,health:1,cost:0}};
 caster.reserve.push(token);caster.formation[prep.lane]=token.uid;if(prep.card.effects.some(e=>e.op==='mirage'&&e.grant_trample!==false))target.temporaryTrample=true;
 (room.spawnedMirages??=[]).push({card:structuredClone(token),lane:prep.lane,owner:caster.id,spellId:prep.card.uid});
 return token;
}
