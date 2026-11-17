/* Native audio, following a server cue. No per-client musical selection. */
(function(root){
 'use strict';
 const clamp=value=>Math.min(1,Math.max(0,Number(value)||0));
 function create({catalog,createAudio,now=Date.now,duck=()=>1,onStatus=()=>{},base=''}={}){
  const tracks=new Map(catalog.tracks.map(t=>[t.id,t]));
  const entries=new Set(),heard=new Map();
  let cue=null,unlocked=false,disposed=false,muted=false;
  let musicVolume=clamp(catalog.musicVolume??.17),ambienceVolume=clamp(catalog.ambienceVolume??.07);
  let currentMusic=null,currentAmbience=null,duckLevel=1,lastTick=now(),lastStatus='';
  const report=value=>{if(lastStatus!==value){lastStatus=value;onStatus(value);}};
  function discard(entry){
   if(!entries.delete(entry))return;
   entry.cancelled=true;entry.audio.pause();
   entry.audio.removeAttribute?.('src');entry.audio.load?.();entry.audio.remove?.();
  }
  function retire(entry,at,duration){
   if(!entry||entry.retireAt!==undefined)return;
   entry.retireAt=at;entry.retireDuration=duration;
  }
  const durationOf=entry=>Number.isFinite(entry.audio.duration)&&entry.audio.duration>0?entry.audio.duration:entry.track.durationSeconds;
  function expected(entry,time){const elapsed=Math.max(0,(time-entry.since)/1000);return entry.kind==='ambience'?elapsed%durationOf(entry):Math.min(elapsed,entry.track.durationSeconds);}
  function seek(entry,time){
   try{entry.audio.currentTime=expected(entry,time);entry.lastSeek=time;}catch{}
  }
  function attempt(entry,time){
   if(!unlocked||entry.failed||entry.blocked||entry.playPending||entry.cancelled||entry.ended||time<entry.since||entry.audio.readyState<1)return;
   if(entry.kind==='music'&&time-entry.since>=entry.track.durationSeconds*1000){entry.ended=true;return;}
   if(!entry.started||entry.audio.paused){
    seek(entry,time);entry.playPending=true;
    try{
     Promise.resolve(entry.audio.play()).then(()=>{
      entry.playPending=false;
      if(entry.cancelled){entry.audio.pause();return;}
      // Loading can take seconds; align again once actual playback begins.
      seek(entry,now());entry.started=true;report('playing');
     }).catch(error=>{
      entry.playPending=false;if(entry.cancelled)return;
      if(error?.name==='NotAllowedError'){entry.blocked=true;report('blocked');}
      else if(error?.name!=='AbortError'){entry.failed=true;report('error');}
     });
    }catch{entry.playPending=false;entry.failed=true;report('error');}
   }
  }
  function make(trackId,since,kind,key,fadeMs){
   const track=tracks.get(trackId);
   if(!track?.url||!(track.durationSeconds>0)){report('error');return null;}
   const audio=createAudio();
   const entry={audio,track,since,kind,key,fadeMs,mix:0,lastSeek:0};
   audio.preload='auto';audio.loop=kind==='ambience';audio.volume=0;
   audio.addEventListener('ended',()=>{if(kind==='music')entry.ended=true;});
   audio.addEventListener('error',()=>{if(!entry.cancelled){entry.failed=true;report('error');}});
   audio.src=base+track.url;entries.add(entry);audio.load?.();
   return entry;
  }
  function update(next){
   if(disposed)return;
   const time=now();
   if(!next?.playing||!next.playbackReady||!catalog.playbackReady){
    if(cue){for(const entry of entries)retire(entry,time,Math.min(2500,cue.crossfadeMs||6000));}
    cue=null;currentMusic=currentAmbience=null;return;
   }
   cue={...next};
   // A repeat cue from an older server must never restart a song in this match.
   let history=heard.get(cue.matchKey);if(!history){history=new Map();heard.set(cue.matchKey,history);if(heard.size>8)heard.delete(heard.keys().next().value);}
   const occurrence=[cue.sequence,cue.since].join(':');
   if(cue.trackId&&history.has(cue.trackId)&&history.get(cue.trackId)!==occurrence)cue.trackId=null;
   else if(cue.trackId)history.set(cue.trackId,occurrence);
   // An archived song must stay silent even if a server still sends an older cue.
   if(tracks.get(cue.trackId)?.enabled===false)cue.trackId=null;
   const duration=cue.crossfadeMs||6000;
   const musicKey=[cue.matchKey,cue.sequence,cue.trackId,cue.since].join(':');
   let changed=false;
   if(!cue.trackId){if(currentMusic){retire(currentMusic,time,duration);currentMusic=null;changed=true;}}
   else if(currentMusic?.key!==musicKey){
    changed=true;
    retire(currentMusic,cue.since,duration);
    currentMusic=make(cue.trackId,cue.since,'music',musicKey,duration);
   }
   const ambienceKey=[cue.matchKey,cue.ambienceId,cue.ambienceSince].join(':');
   if(currentAmbience?.key!==ambienceKey){
    changed=true;
    retire(currentAmbience,time,duration);
    currentAmbience=make(cue.ambienceId,cue.ambienceSince,'ambience',ambienceKey,duration);
   }
   if(changed)report(unlocked?'loading':'waiting-gesture');
  }
  function tick(){
   if(disposed)return;
   const time=now(),elapsed=Math.max(0,Math.min(1000,time-lastTick));lastTick=time;
   duckLevel+=(clamp(duck())-duckLevel)*Math.min(1,elapsed/350);
   for(const entry of entries){
    const retiring=entry.retireAt!==undefined&&time>=entry.retireAt;
    if(retiring){
     entry.retireFrom??=entry.mix||0;
     const remaining=1-(time-entry.retireAt)/entry.retireDuration;
     if(remaining<=0){discard(entry);continue;}
     entry.mix=entry.retireFrom*Math.min(1,remaining);
    }else entry.mix=clamp((time-entry.since)/entry.fadeMs);
    // Retired tracks are not restarted if they were never audible.
    if(!retiring)attempt(entry,time);
    entry.audio.volume=muted?0:clamp(entry.mix*(entry.kind==='music'?musicVolume:ambienceVolume)*duckLevel);
    if(entry.started&&!entry.audio.paused&&!entry.playPending&&time-entry.lastSeek>10_000){
     const duration=durationOf(entry),desired=expected(entry,time);
     const delta=((desired-entry.audio.currentTime+duration/2)%duration+duration)%duration-duration/2;
     if(Math.abs(delta)>1.5)seek(entry,time);else entry.lastSeek=time;
    }
   }
   if(!entries.size)report('idle');
   else if([...entries].some(e=>e.failed))report('error');
   else if([...entries].some(e=>e.blocked))report('blocked');
   else if([...entries].some(e=>e.started&&!e.audio.paused))report('playing');
  }
  return {
   update,tick,
   unlock(){unlocked=true;for(const e of entries)e.blocked=false;tick();},
   retry(){for(const e of entries){e.blocked=e.failed=false;e.audio.load?.();}this.unlock();},
   preferences(values={}){
    if(values.music!==undefined)musicVolume=clamp(values.music);
    if(values.ambience!==undefined)ambienceVolume=clamp(values.ambience);
    if(values.muted!==undefined)muted=Boolean(values.muted);
    tick();return {music:musicVolume,ambience:ambienceVolume,muted};
   },
   dispose(){disposed=true;for(const entry of entries)discard(entry);},
  };
 }
 root.RunaMusicPlayer={create};
})(globalThis);
