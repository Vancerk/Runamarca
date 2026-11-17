// Hand identities are private even when the deathrattle itself is public.
export function handBuffView(event,viewer){
 if(event.type!=='hand_buff'||event.playerId===viewer)return event;
 const {targets,...publicEvent}=event;return publicEvent;
}
export function combatHandBuffView(combat,viewer){
 if(!combat)return combat;
 return {...combat,timeline:combat.timeline.map(step=>step.kind==='hand_buff'?{...step,buff:handBuffView(step.buff,viewer)}:step)};
}
export function insertHandBuffSteps(timeline,buffs=[],clashes=[]){
 const after=new Map();
 for(const buff of buffs){
  if(buff.count===0)continue;
  let index=timeline.findIndex(step=>[...(step.strike?.healthUpdates||[]),...(step.spell?.healthUpdates||[]),...(step.ability?.healthUpdates||[])].some(u=>u.uid===buff.sourceId&&u.hp<=0));
  if(index<0)index=timeline.findIndex(step=>step.kind==='clash'&&clashes.find(c=>c.lane===step.lane)?.cards.some(c=>c?.uid===buff.sourceId));
  if(index<0)index=Math.max(0,timeline.findIndex(step=>step.kind==='result')-1);
  const additions=after.get(index)||[];additions.push({kind:'hand_buff',duration:1700,buff});after.set(index,additions);
 }
 return timeline.flatMap((step,index)=>[step,...(after.get(index)||[])]);
}
