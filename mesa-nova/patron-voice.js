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
 async function perform(options,version){
  const valid=()=>version===generation&&(!options.valid||options.valid());
  if(!valid())return;
  const context=options.getAudioContext?.();if(context?.state!=='running')return;
  let timeout;
  try{
   const task=(async()=>{
    const data=await root.RunaPatronIntro.manifest(options.base);
    if(!valid())return null;
    const line=selectCue(data,options.player,options.kind,options);
    if(!line?.audio)return null;
    const url=options.base+line.audio;
    if(!buffers.has(url))buffers.set(url,fetch(url).then(r=>{if(!r.ok)throw Error('Áudio indisponível');return r.arrayBuffer();}).then(b=>context.decodeAudioData(b)).catch(e=>{buffers.delete(url);throw e;}));
    return {line,buffer:await buffers.get(url)};
   })();
   const loaded=await Promise.race([task,new Promise(resolve=>{timeout=setTimeout(()=>resolve(null),6000);})]);
   clearTimeout(timeout);if(!loaded||!valid()||context.state!=='running')return;
   await new Promise(resolve=>{
    const source=context.createBufferSource(),gain=context.createGain();let done=false,timer,poll,lastCaption;
    const startedAt=context.currentTime||0;
    const caption=()=>{const text=captionAt(loaded.line,(context.currentTime||0)-startedAt);if(text!==lastCaption){lastCaption=text;options.onCaption?.(text);}};
    source.buffer=loaded.buffer;gain.gain.value=.9;source.connect(gain).connect(context.destination);
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
