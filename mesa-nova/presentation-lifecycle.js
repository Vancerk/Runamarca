/* The client owns the update order. Presentation adapters register work instead
 * of replacing render(), attackSource() or attackTarget() at runtime. */
(function(root){
 const adapters=new Map(),regions=new WeakMap();
 let updates=0,layouts=0,measurements=0,depth=0;
 function register(name,adapter){
  if(adapters.has(name))throw new Error('Presentation adapter already registered: '+name);
  adapters.set(name,adapter);
  return ()=>{if(adapters.get(name)===adapter)adapters.delete(name);};
 }
 function update(content,effects){
  // A snapshot gives a nested update its own capture data. A registration made
  // during an update takes effect on the next update, never halfway through it.
  const frame=[...adapters.values()].map(adapter=>({adapter,captured:undefined}));
  depth++;
  try{
   for(const entry of frame)entry.captured=entry.adapter.capture?.();
   const result=content();
   for(const entry of frame)entry.adapter.layout?.(entry.captured);
   layouts++;
   return effects?.(result);
  }finally{
   try{for(const entry of frame)entry.adapter.after?.(entry.captured);}
   finally{depth--;updates++;}
  }
 }
 function ensureGeometry(){
  measurements++;
  for(const adapter of adapters.values())adapter.ensureGeometry?.();
 }
 function play(kind,payload,fallback){
  for(const adapter of adapters.values())if(adapter.animations?.[kind]&&adapter.active?.()!==false)return adapter.animations[kind](payload,fallback);
  return fallback(payload);
 }
 function createQueue(){
  let tail=Promise.resolve(),epoch=0,pending=0;const timers=new Map(),seen=new Map();
  const wait=(ms,token)=>new Promise(resolve=>{if(token!==epoch)return resolve(false);const id=setTimeout(()=>{timers.delete(id);resolve(token===epoch);},ms);timers.set(id,()=>resolve(false));});
  return {
   enqueue(run,key){
    if(key!==undefined&&seen.has(key))return seen.get(key);
    const token=epoch;pending++;
    const task=tail.then(()=>token===epoch?run({current:()=>token===epoch,wait:ms=>wait(ms,token)}):undefined);
    tail=task.catch(()=>{}).finally(()=>{if(token===epoch)pending--;});
    if(key!==undefined){seen.set(key,task);if(seen.size>512)seen.delete(seen.keys().next().value);}
    return task;
   },
   then(yes,no){return tail.then(yes,no);},
   defer(run,ms){const token=epoch,id=setTimeout(()=>{timers.delete(id);if(token===epoch)run();},ms);timers.set(id,()=>{});return id;},
   reset(){epoch++;pending=0;for(const [id,cancel] of timers){clearTimeout(id);cancel();}timers.clear();seen.clear();tail=Promise.resolve();},
   get stats(){return {epoch,pending,timers:timers.size};}
  };
 }
 function renderPart(kind,payload,draw){
  const frame=[...adapters.values()].map(adapter=>({adapter,before:adapter.beforePart?.(kind,payload)}));
  try{return draw();}finally{for(const {adapter,before} of frame)adapter.afterPart?.(kind,payload,before);}
 }
 function memo(node,key,draw){
  if(regions.get(node)===key)return false;
  draw();regions.set(node,key);return true;
 }
 root.RunaPresentation={register,update,ensureGeometry,play,createQueue,renderPart,memo,
  notify(kind,payload){for(const adapter of adapters.values())adapter.notify?.(kind,payload);},
  decorate(kind,value,payload){for(const adapter of adapters.values())value=adapter.decorate?.(kind,value,payload)??value;return value;},
  clone(source,copy){for(const adapter of adapters.values())adapter.clone?.(source,copy);},
  get stats(){return {updates,layouts,measurements,depth,adapters:[...adapters.keys()]};}};
})(globalThis);
