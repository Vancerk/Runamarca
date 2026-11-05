/* One owner for hand arrivals. DOM nodes and animations are consumers, never
 * additional queues. Tickets are invalidated even when a new match reuses UIDs. */
(function(root){
 const arrivals=new Map(),tickets=new Set(),listeners=new Set();
 let epoch=0,serial=0,scope=null;
 const notify=type=>{for(const fn of listeners)fn(type);};
 const current=ticket=>!!ticket&&ticket.epoch===epoch&&tickets.has(ticket);
 function reserve(uid){
  if(!uid||arrivals.has(uid))return;
  arrivals.set(uid,{uid,inserted:false,owner:null});notify('reserve');
 }
 function release(uid){
  const arrival=arrivals.get(uid);if(!arrival)return false;
  if(arrival.owner)tickets.delete(arrival.owner);
  arrivals.delete(uid);notify('release');return true;
 }
 function begin(kind,{uid=null,arrival=false,lock=false}={}){
  if(arrival&&(!uid||arrivals.get(uid)?.owner))return null;
  if(arrival)reserve(uid);
  const ticket=Object.freeze({id:++serial,epoch,scope,uid:arrival?uid:null,kind,lock});
  tickets.add(ticket);if(arrival)arrivals.get(uid).owner=ticket;
  notify('begin');return ticket;
 }
 function insert(ticket){
  if(!current(ticket)||!ticket.uid)return false;
  arrivals.get(ticket.uid).inserted=true;notify('insert');return true;
 }
 function finish(ticket){
  if(!current(ticket))return false;
  tickets.delete(ticket);if(ticket.uid)arrivals.delete(ticket.uid);
  notify('release');return true;
 }
 function reset(nextScope=scope){
  scope=nextScope;epoch++;arrivals.clear();tickets.clear();notify('reset');
 }
 root.RunaCardArrivals={reserve,release,begin,insert,finish,reset,current,
  has:uid=>arrivals.has(uid),waiting:uid=>arrivals.has(uid)&&!arrivals.get(uid).inserted,
  retain(ids){for(const uid of arrivals.keys())if(!ids.has(uid))release(uid);},
  subscribe(fn){listeners.add(fn);return ()=>listeners.delete(fn);},
  get pending(){return [...arrivals.keys()];},
  get blocked(){return arrivals.size>0||[...tickets].some(t=>t.lock);},
  get stats(){return {scope,epoch,pending:[...arrivals.values()].map(a=>({uid:a.uid,phase:a.inserted?'inserting':a.owner?'flying':'queued',owner:a.owner?.id??null})),active:[...tickets].map(t=>({id:t.id,uid:t.uid,kind:t.kind,lock:t.lock}))};}
 };
})(globalThis);
