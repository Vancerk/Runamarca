// One short timer per room, shared by all viewers. No database work while waiting.
const watchers=new WeakMap();
export function waitRevision(room,revision,res,{timeout=20000,tick=100}={}){
 if(res.destroyed)return Promise.resolve(false);
 if(room.revision!==revision)return Promise.resolve(true);
 return new Promise(resolve=>{
  let group=watchers.get(room);if(!group){group={entries:new Set()};group.timer=setInterval(()=>{for(const entry of [...group.entries])if(room.revision!==entry.revision||Date.now()>=entry.until)entry.finish(room.revision!==entry.revision);},tick);watchers.set(room,group);}
  const entry={revision,until:Date.now()+timeout,finish(changed){group.entries.delete(entry);res.off('close',closed);if(!group.entries.size){clearInterval(group.timer);watchers.delete(room);}resolve(changed);}};
  const closed=()=>entry.finish(false);group.entries.add(entry);res.once('close',closed);
 });
}
