/* One owner for hand arrivals and zone transfers. DOM nodes and animations are consumers, never
 * additional queues. Tickets are invalidated even when a new match reuses UIDs. */
(function(root){
 const arrivals=new Map(),moves=new Map(),tickets=new Set(),listeners=new Set();
 let epoch=0,serial=0,scope=null;
 const notify=(type,detail)=>{for(const fn of listeners)fn(type,detail);};
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
 function begin(kind,{uid=null,arrival=false,moving=false,lock=false}={}){
  if((arrival||moving)&&(!uid||arrivals.get(uid)?.owner||moves.has(uid)))return null;
  if(moving&&arrivals.has(uid))arrivals.delete(uid);
  if(arrival)reserve(uid);
  const ticket=Object.freeze({id:++serial,epoch,scope,uid:arrival||moving?uid:null,kind,lock,arrival,moving});
  tickets.add(ticket);if(arrival)arrivals.get(uid).owner=ticket;
  if(moving)moves.set(uid,ticket);
  notify('begin');return ticket;
 }
 function insert(ticket){
  if(!current(ticket)||!ticket.arrival)return false;
  arrivals.get(ticket.uid).inserted=true;notify('insert');return true;
 }
 function finish(ticket){
  if(!current(ticket))return false;
  tickets.delete(ticket);if(ticket.arrival)arrivals.delete(ticket.uid);if(ticket.moving)moves.delete(ticket.uid);
  notify('release');return true;
 }
 function reset(nextScope=scope){
  const moved=[...moves.keys()];scope=nextScope;epoch++;arrivals.clear();moves.clear();tickets.clear();notify('reset',moved);
 }
 root.RunaCardArrivals={reserve,release,begin,insert,finish,reset,current,
  moving:uid=>moves.has(uid),
  waitFor(kind){const waiting=()=>[...tickets].some(t=>t.kind===kind);if(!waiting())return Promise.resolve();const generation=epoch;return new Promise(resolve=>{const done=()=>{if(epoch!==generation||!waiting()){listeners.delete(done);resolve();}};listeners.add(done);});},
  has:uid=>arrivals.has(uid),waiting:uid=>arrivals.has(uid)&&!arrivals.get(uid).inserted,
  retain(ids){for(const uid of arrivals.keys())if(!ids.has(uid))release(uid);},
  subscribe(fn){listeners.add(fn);return ()=>listeners.delete(fn);},
  get pending(){return [...arrivals.keys()];},
  get blocked(){return arrivals.size>0||[...tickets].some(t=>t.lock);},
  get stats(){return {scope,epoch,pending:[...arrivals.values()].map(a=>({uid:a.uid,phase:a.inserted?'inserting':a.owner?'flying':'queued',owner:a.owner?.id??null})),moving:[...moves.keys()],active:[...tickets].map(t=>({id:t.id,uid:t.uid,kind:t.kind,lock:t.lock}))};}
 };
})(globalThis);
