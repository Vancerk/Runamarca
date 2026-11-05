// Presentation disclosure only: combat simulation and ordering remain unchanged.
export function revealStage(room,now=Date.now()){
 const first=room.combat?.timeline?.[0];
 if(room.phase!=='resolving'||first?.kind!=='reveal')return 3;
 return Math.max(0,Math.min(3,Math.floor((now-room.combat.startedAt)*3/first.duration+.5)));
}
export function progressiveCombatView(room,viewer,result){
 const stage=revealStage(room,result.serverNow);
 if(room.phase!=='resolving'||stage>=3)return result;
 const combat=room.combat;
 // Never send future spell/strike/teleport predictions while positions are secret.
 result.combat={id:combat.id,round:combat.round,startedAt:combat.startedAt,duration:combat.timeline[0].duration,timeline:[{...combat.timeline[0]}],revealStage:stage,lanes:[],visual:[],spells:[]};
 for(const seat of result.players){
  const original=room.players.find(p=>p.id===seat.id);
  seat.revealPending=[0,1,2].filter(lane=>lane>=stage&&seat.id!==viewer.id&&!original.reserve.some(c=>c.uid===original.formation[lane]&&(c.anchor||c.sleep)));
  seat.formation=original.formation.map((uid,lane)=>seat.id===viewer.id||lane<stage||original.reserve.some(c=>c.uid===uid&&(c.anchor||c.sleep))?uid:null);
 }
 return result;
}
