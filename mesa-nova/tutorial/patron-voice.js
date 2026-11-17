/* Match cues use the recorded voices. They never delay or change game rules. */
(function(root){
 const characterByEnergy={forja:'lyrik',fluxo:'marika',ruptura:'dom'};
 const buffers=new Map(),seen=new Set();let generation=0,queue=Promise.resolve(),stopCurrent=null;
 function selectCue(data,player,kind,detail={}){
  const bank=data.cues?.[characterByEnergy[player?.patron?.affinity]];
  if(kind==='power'){const cue=bank?.powers?.[detail.powerId];return cue?.enabled===false?null:cue||null;}
  if(kind==='victory')return bank?.victory?.[characterByEnergy[detail.opponent?.patron?.affinity]]||bank?.victory?.neutral||null;
  return kind==='defeat'?bank?.defeat||null:null;
 }
 function cancel(){generation++;seen.clear();stopCurrent?.();stopCurrent=null;queue=Promise.resolve();}
 function captionAt(line,seconds){
  const captions=line.captions||[{at:0,text:line.text}];
  return captions.filter(c=>c.at<=seconds).at(-1)?.text||null;
 }
 function captionOnly(line,options,valid){
  if(typeof options.onCaption!=='function'||(!line.text&&!line.captions?.some(c=>c.text)))return;
  // Unavailable recordings still have an authored subtitle. This clock never
  // starts audio later, changes its timing, or ducks the music without a voice.
  const duration=Number(line.durationSeconds)>0?Number(line.durationSeconds):Math.max(3,...(line.captions||[]).map(c=>Number(c.at)||0))+3;
  return new Promise(resolve=>{
   let done=false,poll,timer,lastCaption;const startedAt=Date.now();
   const finish=()=>{if(done)return;done=true;clearInterval(poll);clearTimeout(timer);options.onCaption(null);if(stopCurrent===finish)stopCurrent=null;resolve();};
   const caption=()=>{if(!valid()){finish();return;}const text=captionAt(line,(Date.now()-startedAt)/1000);if(text!==lastCaption){lastCaption=text;options.onCaption(text);}};
   stopCurrent=finish;poll=setInterval(caption,50);timer=setTimeout(finish,duration*1000);caption();
  });
 }
 async function perform(options,version){
  const valid=()=>version===generation&&(!options.valid||options.valid());
  if(!valid())return;
  const context=options.getAudioContext?.();let timeout,line;
  try{
   const task=(async()=>{
    const data=await root.RunaPatronIntro.manifest(options.base);
    if(!valid())return null;
    line=selectCue(data,options.player,options.kind,options);
    if(!line)return null;
    if(!line.audio||context?.state!=='running')return {line,buffer:null};
    const url=options.base+line.audio;
    if(!buffers.has(url))buffers.set(url,fetch(url).then(r=>{if(!r.ok)throw Error('Áudio indisponível');return r.arrayBuffer();}).then(b=>context.decodeAudioData(b)).catch(e=>{buffers.delete(url);throw e;}));
    try{return {line,buffer:await buffers.get(url)};}
    catch(error){console.warn('Fala do Patrono indisponível:',error.message);return {line,buffer:null};}
   })();
   const loaded=await Promise.race([task,new Promise(resolve=>{timeout=setTimeout(()=>resolve(line?{line,buffer:null}:null),6000);})]);
   clearTimeout(timeout);if(!loaded||!valid())return;
   if(!loaded.buffer||context?.state!=='running'){await captionOnly(loaded.line,options,valid);return;}
   await new Promise(resolve=>{
    const source=context.createBufferSource(),gain=context.createGain();let done=false,timer,poll,lastCaption;
    const startedAt=context.currentTime||0;
    const caption=()=>{const text=captionAt(loaded.line,(context.currentTime||0)-startedAt);if(text!==lastCaption){lastCaption=text;options.onCaption?.(text);}};
    source.buffer=loaded.buffer;gain.gain.value=.9;source.connect(gain).connect(root.RunaAudioMix?.destination(context,'voice')||context.destination);
    const finish=()=>{if(done)return;done=true;clearTimeout(timer);clearInterval(poll);options.onCaption?.(null);source.onended=null;try{source.stop();}catch{}source.disconnect();gain.disconnect();root.document?.body.classList.remove('patron-voice-active');if(stopCurrent===finish)stopCurrent=null;resolve();};
    stopCurrent=finish;source.onended=finish;
    root.document?.body.classList.add('patron-voice-active');
    poll=setInterval(()=>{if(!valid())finish();else caption();},50);
    timer=setTimeout(finish,loaded.buffer.duration*1000+1500);
    try{source.start();caption();}catch{finish();}
   });
  }catch(error){console.warn('Fala do Patrono indisponível:',error.message);}finally{clearTimeout(timeout);}
 }
 function play(options){
  if(options.key&&seen.has(options.key))return Promise.resolve();
  if(options.key)seen.add(options.key);
  const version=generation;
  queue=queue.catch(()=>{}).then(()=>perform(options,version));return queue;
 }
 root.addEventListener?.('pagehide',cancel);
 root.RunaPatronVoice={play,cancel,selectCue,captionAt};
})(globalThis);
