import {clearProtocolHealth} from './forja-effects.mjs';
// Rules authored for the independent Ecos de Virelion deck.
export function spellBuff(card,round,permanent=false){card.spellBuff=permanent?'permanent':round;}
export function retainAnchors(p){p.formation=[0,1,2].map(lane=>p.reserve.find(c=>((c.sleep?.remaining>0&&c.sleep.lane===lane)||(c.anchor?.remaining>0&&c.anchor.lane===lane))&&c.damage<c.health)?.uid||null);}
export function curseFromDamage(target,source,effects){
 if(!source||source.owner===target.owner||!target.curseArmed||!effects(target).some(e=>e.op==='damage_curse'))return;
 target.cursedTargets??=[];if(target.cursedTargets.includes(source.uid))return;
 target.cursedTargets.push(source.uid);source.attack=Math.max(0,source.attack-1);
}
export function finishFields(room){
 for(const p of room.players){
  for(const c of p.reserve){clearProtocolHealth(c);delete c.temporaryTrample;delete c.protocolMode;if(c.temporaryHealth){c.health-=c.temporaryHealth;c.damage=Math.max(0,c.damage-c.temporaryHealth);delete c.temporaryHealth;}if(c.sleep&&room.combatCount>=c.sleep.setAt&&--c.sleep.remaining<=0)delete c.sleep;if(c.anchor&&room.combatCount>=c.anchor.setAt&&--c.anchor.remaining<=0)delete c.anchor;}
  p.prepared=p.prepared.filter(prep=>{if(!prep.card.effects?.some(e=>e.op==='barrier')||prep.lastCombat!==room.combatCount)return true;if(--prep.remaining>0)return true;p.discard.push(prep.card);return false;});
 }
}
