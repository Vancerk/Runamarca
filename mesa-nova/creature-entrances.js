/* Creature voices and Platinum entrances: natural tails, one cue per public summon. */
(function(root){
 const base=new URL('.',root.document?.currentScript?.src||root.location?.href||'http://localhost/').href;
 let manifest=null,pending=null,generation=0;const buffers=new Map(),seen=new Set(),active=new Set();
 async function catalog(){return manifest||(pending??=fetch(base+'creature-entrances.json?v=20261018-mix4').then(r=>{if(!r.ok)throw Error('Entradas indisponíveis');return r.json();}).then(x=>manifest=x).catch(e=>{pending=null;throw e;}));}
 function select(data,card){if(card?.type!=='creature')return null;return data.cards?.[card.modelId||card.id]||(card.rarity==='soberano'?{audio:data.energies?.[card.affinity]}:null);}
 async function buffer(context,url){if(!buffers.has(url))buffers.set(url,fetch(base+url).then(r=>{if(!r.ok)throw Error('Áudio indisponível');return r.arrayBuffer();}).then(b=>context.decodeAudioData(b)).catch(e=>{buffers.delete(url);throw e;}));return buffers.get(url);}
 async function preload(context){if(context?.state!=='running')return;try{const data=await catalog();await Promise.allSettled([...new Set([...Object.values(data.energies),...Object.values(data.cards).map(c=>c.audio)])].map(url=>buffer(context,url)));}catch{}}
 function text(card,fallback){return (card?.modelId||card?.id)==='FL12'?'Combate não! Execução!':fallback;}
 async function play({card,key,context,to,valid=()=>true,onStart=()=>{}}={}){
  if(card?.type!=='creature'||context?.state!=='running'||seen.has(key))return false;
  seen.add(key);const version=generation;
  try{
   const cue=select(await catalog(),card);if(!cue?.audio)return false;const decoded=await buffer(context,cue.audio);
   if(version!==generation||!valid()||context.state!=='running')return false;
   const source=context.createBufferSource(),gain=context.createGain();source.buffer=decoded;
   const now=context.currentTime,end=now+decoded.duration,tail=cue.kind==='voice'?.12:.65;gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(.85,now+.035);gain.gain.setValueAtTime(.85,Math.max(now+.035,end-tail));gain.gain.linearRampToValueAtTime(0,end);
   const space=root.RunaSfx?.spatial(context,{to,depth:.25});source.connect(gain).connect(space?.input||context.destination);
   let done=false;const record={cancel(){if(done)return;const t=context.currentTime;gain.gain.cancelScheduledValues(t);gain.gain.setValueAtTime(gain.gain.value,t);gain.gain.linearRampToValueAtTime(0,t+.12);source.stop(t+.13);}};
   function finish(){if(done)return;done=true;active.delete(record);source.disconnect();gain.disconnect();space?.dispose();if(!active.size)root.document?.body.classList.remove('creature-entrance-active');}
   source.onended=finish;active.add(record);root.document?.body.classList.add('creature-entrance-active');try{source.start();onStart({at:now,duration:decoded.duration,cue});}catch(e){finish();throw e;}return true;
  }catch(error){console.warn('Entrada de criatura indisponível:',error.message);return false;}
 }
 function clear(){generation++;seen.clear();for(const record of active)record.cancel();}
 root.RunaCreatureEntrances={preload,play,clear,select,text};root.addEventListener?.('pagehide',clear);
})(globalThis);
