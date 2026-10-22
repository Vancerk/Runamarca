/* Sample playback is synchronous at the animation cue. A cold/missing sample
   stays silent rather than generating or substituting an unrelated sound. */
(function(root){
 'use strict';
 function create({manifest={cues:{}},base='',fetcher=root.fetch?.bind(root),mode='epidemic',maxVoices=16}={}){
  let catalog=manifest,selectedMode='epidemic',volume=1,muted=false;
  const contexts=new WeakMap(),voices=new Set(),sources=new WeakMap(),bytes=new Map(),loading=new Map();
  const stats={played:0,fallback:0,failed:0,suppressed:0};
  function state(context){let value=contexts.get(context);if(!value){value={buffers:new Map(),pending:new Map(),last:new Map(),buses:new WeakMap()};contexts.set(context,value);}return value;}
  function output(context,destination){const cache=state(context);if(!context.createDynamicsCompressor)return destination;if(!cache.buses.has(destination)){const compressor=context.createDynamicsCompressor();compressor.threshold.value=-8;compressor.knee.value=8;compressor.ratio.value=10;compressor.attack.value=.003;compressor.release.value=.13;compressor.connect(destination);cache.buses.set(destination,compressor);}return cache.buses.get(destination);}
  async function file(url){
   if(bytes.has(url))return bytes.get(url);
   if(!loading.has(url))loading.set(url,(async()=>{const response=await fetcher(base+url);if(!response.ok)throw Error('Audio unavailable');const value=await response.arrayBuffer();bytes.set(url,value);return value;})().catch(()=>{stats.failed++;return null;}).finally(()=>loading.delete(url)));
   return loading.get(url);
  }
  async function prepare(context,key){
   const cue=catalog.cues?.[key];if(!context||!cue?.url||cue.enabled===false||!fetcher)return false;
   const cache=state(context);if(cache.buffers.has(cue.url))return true;
   if(!cache.pending.has(cue.url))cache.pending.set(cue.url,(async()=>{try{const data=await file(cue.url);if(!data)return false;const buffer=await context.decodeAudioData(data.slice(0));cache.buffers.set(cue.url,buffer);return true;}catch{stats.failed++;return false;}finally{cache.pending.delete(cue.url);}})());
   return cache.pending.get(cue.url);
  }
  async function preload(context){return Promise.all(Object.keys(catalog.cues||{}).map(key=>prepare(context,key)));}
  function release(source,seconds=.22){const voice=sources.get(source);if(!voice)return false;if(voice.releasing)return true;voice.releasing=true;const now=voice.context.currentTime,end=Math.min(voice.end,now+Math.max(.02,seconds)),param=voice.gain.gain;try{if(param.cancelAndHoldAtTime)param.cancelAndHoldAtTime(now);else{param.cancelScheduledValues?.(now);param.setValueAtTime(voice.level*Math.min(1,Math.max(0,(voice.end-now)/voice.fade)),now);}param.linearRampToValueAtTime(0,end);source.stop(end+.005);}catch{}return true;}
  function stopAll(){for(const voice of [...voices])release(voice.source);}
  // Coordinates are taken from the viewer's table, so the rival perspective mirrors naturally.
  function position(target){const r=target?.getBoundingClientRect?.(),p=r?{x:r.left+r.width/2,y:r.top+r.height/2}:target;if(!Number.isFinite(p?.x)||!Number.isFinite(p?.y))return null;const b=root.document?.querySelector('#game .board')?.getBoundingClientRect?.(),w=root.innerWidth||1280,h=root.innerHeight||720;return {pan:Math.max(-.85,Math.min(.85,(p.x/w*2-1)*.9)),depth:Math.max(0,Math.min(1,1-(p.y-(b?.top||0))/(b?.height||h)))};}
  function spatial(context,{from,to,pan=0,depth,travelSeconds=.45,destination=context.destination}={}){
   const a=position(from)||position(to)||{pan,depth:depth??0},b=position(to)||a,now=context.currentTime,end=now+Math.max(.02,travelSeconds),nodes=[];
   const input=context.createGain();nodes.push(input);input.gain.setValueAtTime(1-a.depth*.28,now);input.gain.linearRampToValueAtTime(1-b.depth*.28,end);let tail=input;
   if(context.createBiquadFilter){const f=context.createBiquadFilter();f.type='lowpass';f.Q.value=.2;f.frequency.setValueAtTime(18000-a.depth*11500,now);f.frequency.linearRampToValueAtTime(18000-b.depth*11500,end);tail.connect(f);tail=f;nodes.push(f);}
   if(context.createStereoPanner){const p=context.createStereoPanner();p.pan.setValueAtTime(a.pan,now);p.pan.linearRampToValueAtTime(b.pan,end);tail.connect(p);tail=p;nodes.push(p);}
   tail.connect(destination);
   // Quiet early room reflections give distance without a long artificial echo.
   if(context.createDelay&&context.createBiquadFilter){const delay=context.createDelay(.1),wet=context.createGain(),filter=context.createBiquadFilter();delay.delayTime.value=.026+Math.max(a.depth,b.depth)*.025;wet.gain.value=.025+Math.max(a.depth,b.depth)*.075;filter.type='lowpass';filter.frequency.value=2600;tail.connect(delay).connect(filter).connect(wet).connect(destination);nodes.push(delay,wet,filter);}
   return {input,dispose(){nodes.forEach(n=>{try{n.disconnect();}catch{}});}};
  }
  function preferences(options={}){
   if(options.mode!==undefined){selectedMode='epidemic';stopAll();}
   if(options.muted!==undefined){muted=Boolean(options.muted);if(muted)stopAll();}
   if(Number.isFinite(options.volume))volume=Math.min(1,Math.max(0,options.volume));
  }
  function play(context,key,{track=()=>{},destination=context?.destination,pan=0,from,to,depth,travelSeconds,offset=0,duration:limit,level:scale=1}={}){
   const cue=catalog.cues?.[key];
   if(selectedMode==='original'||!context||context.state!=='running'||!cue?.url||cue.enabled===false){stats.fallback++;return false;}
   if(muted||volume===0){stats.suppressed++;return true;}
   const cache=state(context),buffer=cache.buffers.get(cue.url);
   if(!buffer){void prepare(context,key);stats.fallback++;return false;}
   const now=context.currentTime,last=cache.last.get(key)??-Infinity;
   if(now-last<(cue.minIntervalMs??35)/1000){stats.suppressed++;return true;}
   if(voices.size>=maxVoices){stats.suppressed++;return true;}
   const source=context.createBufferSource(),gain=context.createGain(),nodes=[source,gain];
   source.buffer=buffer;source.playbackRate.value=cue.rate||1;
   const start=Math.max(0,Math.min(buffer.duration-.001,(cue.offset||0)+offset));
   const duration=Math.min(buffer.duration-start,limit??cue.duration??buffer.duration)/(cue.rate||1);
   const fade=Math.min(cue.fadeOut??.35,duration*.45),level=Math.min(1,Math.max(0,cue.gain??.5))*volume*scale;
   gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(level,now+Math.min(.004,duration/4));
   gain.gain.setValueAtTime(level,now+Math.max(.004,duration-fade));gain.gain.linearRampToValueAtTime(0,now+duration);
   source.connect(gain);
   const bus=output(context,destination);
   const space=spatial(context,{from,to,pan,depth,travelSeconds:Math.min(travelSeconds??duration,duration),destination:bus});gain.connect(space.input);
   let cleaned=false;const voice={source,context,gain,level,fade,end:now+duration,cleanup(){if(cleaned)return;cleaned=true;space.dispose();nodes.forEach(node=>{try{node.disconnect();}catch{}});voices.delete(voice);sources.delete(source);}};sources.set(source,voice);
   source.addEventListener('ended',voice.cleanup,{once:true});voices.add(voice);cache.last.set(key,now);
   try{track(source);source.start(now,start,duration*(cue.rate||1));stats.played++;return true;}catch{voice.cleanup();stats.failed++;return false;}
  }
  return {play,preload,prepare,preferences,stopAll,release,spatial,position,setManifest(value){stopAll();catalog=value||{cues:{}};if(fetcher)for(const url of new Set(Object.values(catalog.cues||{}).filter(c=>c.enabled!==false&&c.url).map(c=>c.url)))void file(url);},status(){return {...stats,active:voices.size,mode:selectedMode,available:Object.values(catalog.cues||{}).filter(c=>c.enabled!==false&&c.url).length};}};
 }
 const api=create();root.RunaSfx=Object.assign(api,{create});
 if(root.document){
  const script=root.document.currentScript,base=new URL('.',script?.src||root.location.href).href;
  const live=create({base});root.RunaSfx=Object.assign(live,{create});
  try{root.localStorage.removeItem('runamarca-sfx-mode');}catch{}
  const ready=root.fetch(new URL('sfx-catalog.json?v=20261021-polish',base)).then(r=>{if(!r.ok)throw Error('SFX catalog unavailable');return r.json();}).then(data=>live.setManifest(data)).catch(()=>{});
  const preload=live.preload;live.preload=async context=>{await ready;return preload(context);};
  root.addEventListener('pagehide',()=>live.stopAll());
 }
})(globalThis);
