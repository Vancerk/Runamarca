/* Music may continue while a lesson pauses simulation time. Map each cue once
   to the audio clock; later lesson acknowledgements must not rewind that cue. */
(()=>{
 function create({now=()=>performance.timeOrigin+performance.now()}={}){
  let match=null,music=null,ambience=null;
  function clear(){match=null;music=ambience=null;}
  function update(cue,serverNow){
   if(!cue){clear();return cue;}
   if(cue.matchKey!==match){clear();match=cue.matchKey;}
   const at=now(),reference=Number.isFinite(serverNow)?serverNow:at;
   const mapped=since=>at+(Number.isFinite(since)?since-reference:0);
   const musicKey=JSON.stringify([cue.sequence,cue.trackId,cue.since]);
   const ambienceKey=JSON.stringify([cue.ambienceId,cue.ambienceSince]);
   if(music?.key!==musicKey)music={key:musicKey,since:mapped(cue.since)};
   if(ambience?.key!==ambienceKey)ambience={key:ambienceKey,since:mapped(cue.ambienceSince)};
   return {...cue,since:music.since,ambienceSince:ambience.since};
  }
  return {now,update,clear};
 }
 globalThis.RunaTutorialMusicClock={create};
})();
