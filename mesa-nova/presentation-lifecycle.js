/* The client owns the update order. Presentation adapters register work instead
 * of replacing render(), attackSource() or attackTarget() at runtime. */
(function(root){
 const adapters=new Map();
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
 root.RunaPresentation={register,update,ensureGeometry,
  get stats(){return {updates,layouts,measurements,depth,adapters:[...adapters.keys()]};}};
})(globalThis);
