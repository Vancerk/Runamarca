// Server-owned scheduling; the worker still chooses every action with the same policy.
export function createBotScheduler({bridge,isActive,act,persist=()=>{},delay=700,onFailure=()=>{}}){
 function schedule(room){
  if(room.botThinking){room.botReschedule=true;return;}
  if(room.botTimer||!room.players.some(p=>p.bot))return;
  room.botTimer=setTimeout(async()=>{
   room.botTimer=null;room.botThinking=true;room.botReschedule=false;
   try{
    const bot=room.players.find(p=>p.bot);if(!bot)return;
    const revision=room.revision,next=await bridge.nextAction(room);
    room.botQueueRetries=0;
    if(!isActive(room)){bridge.clear(room);return;}
    // Public music can change the revision without room.onChange. A stale worker
    // result is intentionally discarded; it must not also discard the next turn.
    if(!next){if(room.revision!==revision)room.botReschedule=true;return;}
    act(room,bot,next);void persist(room);room.botReschedule=true;
   }catch(error){
    if(error?.code==='BOT_QUEUE_FULL'&&(room.botQueueRetries||0)<3){room.botQueueRetries=(room.botQueueRetries||0)+1;room.botReschedule=true;return;}
    onFailure(error,room);
    room.log.push({message:'Bot interrompido; revisão técnica necessária.',round:room.round,turn:room.turn,phase:room.phase});
    room.log=room.log.slice(-10);room.revision++;room.botReschedule=false;
   }finally{room.botThinking=false;if(room.botReschedule&&isActive(room))schedule(room);}
  },delay);
 }
 return schedule;
}
