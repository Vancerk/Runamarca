import {patronBindingLane} from '../source/mesa-nova/patron-bindings.mjs';
export {patronBindingLane};
// Public-state adapters for canonical 3090 contracts. No hidden hands or RNG.
export const isPatronId=(p,id)=>id==='patron:'+p.id;
export const eligiblePatron=p=>Boolean(p.patron?.hp>0&&(p.patron.equipment?.durability>0||patronBindingLane(p)!==null));
export function formationCard(p,id){
 if(!isPatronId(p,id))return p.reserve.find(c=>c.uid===id);
 if(!p.patron)return null;
 const weapon=p.patron.equipment;
 return {uid:'patron:'+p.id,owner:p.id,type:'patron',name:p.patron.name,health:p.patron.maxHp,damage:p.patron.maxHp-p.patron.hp,
  attack:weapon&&p.patron.hp<p.patron.maxHp?weapon.woundedBonus||0:0,attackMod:0,sleep:p.patron.sleep,anchor:p.patron.anchor,equipment:weapon,effects:weapon?.effects||[]};
}
export function applyFormationSlots(room,p,slots,act){
 const bound=patronBindingLane(p);if(bound!==null&&slots[bound]!=='patron:'+p.id)throw Error('COMPAT: plano remove Patrono vinculado.');
 if(slots.length!==3||new Set(slots.filter(Boolean)).size!==slots.filter(Boolean).length)throw Error('COMPAT: formação inválida/duplicada.');
 for(let lane=0;lane<3;lane++){
  const id=p.formation[lane],card=formationCard(p,id);
  if(!id||id===slots[lane])continue;
  if(isPatronId(p,id)){act({type:'assignPatron',lane:null});continue;}
  if(card&&!card.anchor&&!card.sleep&&!card.forcedBy&&!room.players.some(q=>q.reserve.some(t=>t.forcedBy===id)))act({type:'assign',cardId:null,lane});
 }
 for(let lane=0;lane<3;lane++)if(slots[lane]&&p.formation[lane]!==slots[lane]){
  act(isPatronId(p,slots[lane])?{type:'assignPatron',lane}:{type:'assign',cardId:slots[lane],lane});
 }
}
