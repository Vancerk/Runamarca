import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';
const code=fs.readFileSync(new URL('./tutorial-music-clock.js',import.meta.url),'utf8'),playerCode=fs.readFileSync(new URL('./music-player.js',import.meta.url),'utf8');
function fixture(){
 const ctx=vm.createContext({});vm.runInContext(code,ctx);vm.runInContext(playerCode,ctx);let real=1_000_000,virtual=100_000;
 const clock=ctx.RunaTutorialMusicClock.create({now:()=>real}),audios=[];
 class Audio{constructor(){this.time=0;this.seeks=[];this.paused=true;this.readyState=4;this.duration=600;this.handlers={};this.plays=0;}get currentTime(){return this.time;}set currentTime(x){this.seeks.push([this.time,x]);this.time=x;}addEventListener(t,fn){this.handlers[t]=fn;}load(){}removeAttribute(){}remove(){}pause(){this.paused=true;}play(){this.plays++;this.paused=false;return Promise.resolve();}}
 const catalog={playbackReady:true,tracks:[{id:'song',url:'song.mp3',durationSeconds:600},{id:'next',url:'next.mp3',durationSeconds:600},{id:'room',url:'room.mp3',durationSeconds:600}]};
 const player=ctx.RunaMusicPlayer.create({catalog,now:clock.now,createAudio:()=>{const a=new Audio();audios.push(a);return a;}}),cue={matchKey:'train',sequence:0,trackId:'song',since:100000,ambienceId:'room',ambienceSince:100000,playing:true,playbackReady:true,crossfadeMs:6000};
 const sync=(next=cue)=>player.update(clock.update(next,virtual));
 const advance=(ms,paused=false)=>{real+=ms;if(!paused)virtual+=ms;for(const a of audios)if(!a.paused)a.time+=ms/1000;player.tick();};
 return {clock,player,cue,audios,sync,advance,virtual:()=>virtual,real:()=>real};
}
test('long lesson pauses and acknowledgements preserve playback without backward seeks',async()=>{
 const f=fixture();f.sync();f.player.unlock();await new Promise(setImmediate);
 for(let i=0;i<180;i++){f.advance(1000,true);if(i%15===0)f.sync({...f.cue});}
 f.advance(2000);f.sync();for(let i=0;i<30;i++)f.advance(1000);
 assert.equal(f.audios.length,2);for(const a of f.audios){assert.equal(a.plays,1);assert.ok(Math.abs(a.currentTime-212)<.001);assert.ok(a.seeks.every(([from,to])=>to>=from-.05));}
});
test('a new track maps to its future lead while ambience keeps its original timeline',()=>{
 const f=fixture(),first=f.clock.update(f.cue,f.virtual());f.advance(90000,true);
 const next=f.clock.update({...f.cue,sequence:1,trackId:'next',since:f.virtual()+1200},f.virtual());
 assert.equal(next.since,f.real()+1200);assert.equal(next.ambienceSince,first.ambienceSince);assert.equal(f.cue.since,100000);
});
test('resume in a fresh page preserves saved offset, while repeated state sync does not remap it',()=>{
 const f=fixture();const a=f.clock.update({...f.cue,since:40000},100000);assert.equal(f.real()-a.since,60000);
 f.advance(25000,true);const b=f.clock.update({...f.cue,since:40000},100000);assert.equal(a.since,b.since);assert.equal(f.real()-b.since,85000);
});
test('a different match or explicit exit cannot reuse the old mapping',()=>{
 const f=fixture(),a=f.clock.update(f.cue,100000);f.advance(20000,true);const b=f.clock.update({...f.cue,matchKey:'other'},100000);assert.equal(b.since-a.since,20000);
 f.clock.clear();f.advance(10000,true);assert.equal(f.clock.update(f.cue,100000).since,f.real());
});
