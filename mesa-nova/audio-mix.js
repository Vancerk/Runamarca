/* Local category controls, shared by every audio context. Never reads game state. */
(function(root){
 'use strict';
 const key='runamarca-audio-v2',clamp=(n,f)=>Number.isFinite(n)?Math.max(0,Math.min(1,n)):f;
 let saved={};try{saved=JSON.parse(root.localStorage?.getItem(key)||'{}')||{};}catch{}
 let values={effects:clamp(saved.effects,1),voice:clamp(saved.voice,1),muted:saved.muted===true};
 const contexts=new WeakMap(),buses=new Set(),listeners=new Set();
 const level=category=>values.muted?0:values[category]??1;
 function apply(bus,immediate=false){const t=bus.context.currentTime,p=bus.node.gain,value=level(bus.category);if(immediate)p.value=value;else{p.cancelScheduledValues?.(t);p.setTargetAtTime?p.setTargetAtTime(value,t,.015):p.setValueAtTime(value,t);}}
 function destination(context,category,output=context.destination){
  let targets=contexts.get(context);if(!targets){targets=new WeakMap();contexts.set(context,targets);}let categories=targets.get(output);if(!categories){categories=new Map();targets.set(output,categories);}if(!categories.has(category)){const bus={context,category,node:context.createGain()};bus.node.connect(output);categories.set(category,bus);buses.add(bus);apply(bus,true);}return categories.get(category).node;
 }
 function preferences(next={}){
  values={effects:clamp(next.effects,values.effects),voice:clamp(next.voice,values.voice),muted:next.muted===undefined?values.muted:!!next.muted};
  for(const bus of buses){if(bus.context.state==='closed'){buses.delete(bus);continue;}apply(bus);}try{root.localStorage?.setItem(key,JSON.stringify(values));}catch{}
  for(const fn of listeners)fn({...values});return {...values};
 }
 root.RunaAudioMix={destination,preferences,level,snapshot:()=>({...values}),subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);}};
})(globalThis);
