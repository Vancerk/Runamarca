import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const catalog=JSON.parse(readFileSync(new URL('./music-catalog.json',import.meta.url)));
// Playback behavior uses a populated fixture; production currently keeps only ambience.
for(const track of catalog.tracks)track.enabled=true;
const code=readFileSync(new URL('./music-player.js',import.meta.url),'utf8');
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(){
 const context=vm.createContext({});vm.runInContext(code,context);
 let time=100_000,duck=1;const audios=[],statuses=[];
 class Audio {
  constructor(){this.readyState=1;this.currentTime=0;this.paused=true;this.events={};this.plays=0;this.volume=0;this.fail=false;}
  addEventListener(kind,fn){this.events[kind]=fn;}
  load(){}
  removeAttribute(key){delete this[key];}
  remove(){this.removed=true;}
  pause(){this.paused=true;}
  play(){this.plays++;if(this.fail)return Promise.reject(Object.assign(Error('gesture'),{name:'NotAllowedError'}));this.paused=false;return Promise.resolve();}
 }
 const player=context.RunaMusicPlayer.create({catalog,now:()=>time,duck:()=>duck,
  createAudio:()=>{const a=new Audio();audios.push(a);return a;},onStatus:s=>statuses.push(s),base:'/runamarca/'});
 const cue={matchKey:'test',sequence:0,trackId:'ale-base',since:100_000,ambienceSince:100_000,
  ambienceId:'crowded-tavern',crossfadeMs:6000,playing:true,playbackReady:true};
 return {player,audios,statuses,cue,setTime:t=>time=t,setDuck:v=>duck=v};
}
test('waits for a gesture and common start time; loading promises cannot duplicate playback',async()=>{
 const f=fixture();f.cue.since=101_200;f.cue.ambienceSince=101_200;
 f.player.update(f.cue);f.player.tick();assert.equal(f.audios[0].plays,0);
 f.player.unlock();assert.equal(f.audios[0].plays,0);
 f.setTime(101_200);f.player.tick();f.player.tick();
 assert.equal(f.audios[0].plays,1);await settle();
 assert.equal(f.audios[0].currentTime,0);assert.equal(f.audios[0].loop,false);assert.equal(f.audios[1].loop,true);
 assert.equal(f.audios[0].src,'/runamarca/audio/music/ale-base.mp3');
});
test('repeated room renders preserve both audio elements and positions',async()=>{
 const f=fixture();f.player.update(f.cue);f.player.unlock();await settle();
 f.audios[0].currentTime=3;f.setTime(103_000);
 for(let i=0;i<20;i++){f.player.update({...f.cue});f.player.tick();}
 assert.equal(f.audios.length,2);assert.equal(f.audios[0].plays,1);
 assert.equal(f.audios[0].currentTime,3);
 assert.equal(f.statuses.filter(s=>s==='loading').length,0,'no repeated loading status');
});
test('late entry seeks only within a live track; finished songs stay finished',async()=>{
 const a=fixture(),b=fixture();a.player.update(a.cue);a.player.unlock();await settle();
 b.setTime(115000);b.player.update(b.cue);b.player.unlock();await settle();assert.equal(b.audios[0].currentTime,15);
 a.setTime(115000);a.audios[0].currentTime=0;a.player.tick();assert.equal(a.audios[0].currentTime,15);
 const late=fixture();late.setTime(285000);late.player.update(late.cue);late.player.unlock();await settle();assert.equal(late.audios[0].plays,0);assert.equal(late.audios[1].plays,1);
 a.audios[0].events.ended();a.audios[0].paused=true;a.setTime(286000);a.player.tick();assert.equal(a.audios[0].plays,1);
});

test('crossfade keeps ambience uninterrupted and retires old music after the common window',async()=>{
 const f=fixture();f.player.update(f.cue);f.player.unlock();await settle();
 f.setTime(107_000);f.player.tick();
 f.player.update({...f.cue,sequence:1,trackId:'medieval-alta-01',since:109_000});
 assert.equal(f.audios.length,3);assert.equal(f.audios[1].plays,1);
 f.setTime(108_000);f.player.tick();assert.equal(f.audios[2].plays,0);
 f.setTime(109_000);f.player.tick();await settle();
 f.setTime(112_000);f.player.tick();
 assert.ok(Math.abs(f.audios[0].volume-.085)<.001);
 assert.ok(Math.abs(f.audios[2].volume-.085)<.001);
 assert.equal(f.audios[1].volume,.07);assert.equal(f.audios[1].plays,1);
 f.setTime(116_000);f.player.tick();assert.equal(f.audios[0].removed,true);
 assert.equal(f.audios[2].volume,.17);
});
test('mute and dialogue ducking change volume without rerolling or restarting',async()=>{
 const f=fixture();f.player.update(f.cue);f.player.unlock();await settle();
 f.setTime(107_000);f.player.tick();assert.equal(f.audios[0].volume,.17);
 f.setDuck(.28);f.setTime(108_000);f.player.tick();
 assert.ok(Math.abs(f.audios[0].volume-.17*.28)<.0001);
 f.player.preferences({muted:true});assert.equal(f.audios[0].volume,0);assert.equal(f.audios[1].volume,0);
 f.player.preferences({muted:false,music:.12,ambience:.05});
 assert.ok(Math.abs(f.audios[0].volume-.12*.28)<.0001);
 assert.equal(f.audios.length,2);assert.equal(f.audios[0].plays,1);
});
test('browser autoplay refusal is retryable without a music substitution',async()=>{
 const f=fixture();f.player.update(f.cue);f.audios[0].fail=true;
 f.player.unlock();await settle();assert.ok(f.statuses.includes('blocked'));
 f.player.tick();assert.equal(f.audios[0].plays,1);
 f.audios[0].fail=false;f.player.retry();await settle();
 assert.equal(f.audios.length,2);assert.equal(f.audios[0].plays,2);assert.equal(f.audios[0].paused,false);
});
test('leaving or finishing fades out and frees both native audio sources',async()=>{
 const f=fixture();f.player.update(f.cue);f.player.unlock();await settle();
 f.setTime(107_000);f.player.tick();f.player.update(null);
 f.setTime(108_000);f.player.tick();assert.ok(f.audios[0].volume>0);
 f.setTime(110_000);f.player.tick();
 assert.ok(f.audios.every(a=>a.removed&&a.paused&&!a.src));
 assert.equal(f.statuses.at(-1),'idle');
});
test('failed files remain silent, report failure, and never select an alternative privately',()=>{
 const f=fixture();f.player.update(f.cue);f.audios[0].events.error();
 f.player.unlock();f.player.tick();assert.equal(f.audios[0].plays,0);
 assert.equal(f.audios.length,2);assert.equal(f.statuses.at(-1),'error');
 f.player.dispose();assert.ok(f.audios.every(a=>a.removed));
});

test('ambience-only cues do not load missing songs or restart the crowd on stage changes',async()=>{
 const f=fixture();f.cue.trackId=null;f.player.update(f.cue);f.player.unlock();await settle();
 assert.equal(f.audios.length,1);assert.match(f.audios[0].src,/crowded-tavern/);
 f.setTime(107000);f.player.tick();
 for(let i=0;i<10;i++)f.player.update({...f.cue,sequence:i,since:107000});
 assert.equal(f.audios.length,1);assert.equal(f.audios[0].plays,1);assert.equal(f.audios[0].volume,.07);
 assert.ok(!f.statuses.includes('error'));f.player.dispose();
});

test('an old server cannot replay the same song later in this match',async()=>{
 const f=fixture();f.player.update(f.cue);f.player.unlock();await settle();
 f.player.update({...f.cue,sequence:1,trackId:'medieval-alta-01',since:110000});
 f.player.update({...f.cue,sequence:2,since:120000});assert.equal(f.audios.length,3);
 f.player.update({...f.cue,matchKey:'new-match',since:130000});assert.equal(f.audios.length,5);
});
