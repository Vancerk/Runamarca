// Handles stay outside the room so combat snapshots remain serializable.
const schedules = new WeakMap();
export const TURN_SECONDS = Object.freeze({mulligan:45, prep:45, formation:25});
export function mulliganClock(room, player) {
  if(room.phase!=='mulligan'||player.mulliganReady)return null;
  const startedAt=player.mulliganStartedAt??room.mulliganPresentationEndsAt;
  if(!Number.isFinite(startedAt))return null;
  return {key:`${room.matchId||room.code}:mulligan:${player.id}`,phase:'mulligan',playerId:player.id,
    startedAt,endsAt:startedAt+TURN_SECONDS.mulligan*1000,seconds:TURN_SECONDS.mulligan,warningSeconds:10};
}
export function syncTurnClock(room, expire) {
  const seconds=room.collectPreview?null:TURN_SECONDS[room.phase];
  const actor=room.phase==='prep'?room.players.find(p=>p.id===room.turn):null;
  const opening=seconds&&room.phase==='mulligan'?room.players.map(p=>mulliganClock(room,p)).filter(Boolean).sort((a,b)=>a.endsAt-b.endsAt)[0]:null;
  const key=room.phase==='mulligan'?opening?.key:seconds?`${room.matchId||room.code}:${room.round}:${room.phase}:${actor?.id||'both'}:${actor?.preparationSerial||0}`:null;
  const previous=schedules.get(room);
  if(!key){if(previous)clearTimeout(previous.handle);schedules.delete(room);room.turnClock=null;return;}
  if(opening)room.turnClock=opening;
  else if(room.turnClock?.key!==key)room.turnClock={key,phase:room.phase,playerId:actor?.id||null,startedAt:Date.now(),endsAt:Date.now()+seconds*1000,seconds,warningSeconds:10};
  if(previous?.key===key&&previous.endsAt===room.turnClock.endsAt)return;
  if(previous)clearTimeout(previous.handle);
  const endsAt=room.turnClock.endsAt;
  const handle=setTimeout(()=>{
    schedules.delete(room);
    if(room.turnClock?.key!==key)return;
    if(!expire(room))syncTurnClock(room,expire);
  },Math.max(1,endsAt-Date.now()));
  handle.unref?.();schedules.set(room,{key,endsAt,handle});
}
