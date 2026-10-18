import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const code=readFileSync(new URL('./sfx-player.js',import.meta.url),'utf8');
function fixture({fail=false,maxVoices=16}={}){
 const scope=vm.createContext({});vm.runInContext(code,scope);
 let fetched=0,decoded=0;const sources=[];
 const parameter=()=>({value:0,events:[],setValueAtTime(v,t){this.events.push(['set',v,t]);},linearRampToValueAtTime(v,t){this.events.push(['ramp',v,t]);},cancelAndHoldAtTime(t){this.events.push(['hold',t]);}});
 const node=()=>({gain:parameter(),pan:parameter(),connect(to){this.target=to;return to;},disconnect(){this.disconnected=true;}});
 const context={state:'running',currentTime:10,destination:{},createGain:node,createStereoPanner:node,
  async decodeAudioData(){decoded++;return {duration:2};},
  createBufferSource(){const listeners=[];const n={...node(),playbackRate:parameter(),addEventListener(type,fn){if(type==='ended')listeners.push(fn);},start(...args){this.started=args;},stop(at){this.stopped=true;this.stoppedAt=at;if(at===undefined)this.end();},end(){listeners.forEach(fn=>fn());}};sources.push(n);return n;}};
 const player=scope.RunaSfx.create({manifest:{cues:{hammer:{url:'hammer.mp3',gain:.4},turn:{url:'hammer.mp3'},pending:{enabled:false,url:'missing.mp3'}}},maxVoices,
 fetcher:async()=>{fetched++;return {ok:!fail,arrayBuffer:async()=>new ArrayBuffer(8)};}});
 return {player,context,sources,counts:()=>({fetched,decoded})};
}
test('a cold cue falls back immediately and never plays late after loading',async()=>{
 const f=fixture();assert.equal(f.player.play(f.context,'hammer'),false);
 await f.player.preload(f.context);assert.equal(f.sources.length,0);
 assert.equal(f.player.play(f.context,'hammer'),true);assert.equal(f.sources.length,1);
 assert.deepEqual(f.counts(),{fetched:1,decoded:1});
});
test('scene tracking cancels samples and cleanup releases their nodes',async()=>{
 const f=fixture();await f.player.preload(f.context);let tracked;
 f.player.play(f.context,'hammer',{track:s=>tracked=s});assert.equal(tracked,f.sources[0]);
 tracked.stop();assert.equal(f.player.status().active,0);assert.equal(tracked.disconnected,true);
});
test('original mode and missing files preserve the prior sound path',async()=>{
 const f=fixture({fail:true});await f.player.preload(f.context);
 assert.equal(f.player.play(f.context,'hammer'),false);assert.equal(f.player.play(f.context,'pending'),false);
 f.player.preferences({mode:'original'});assert.equal(f.player.play(f.context,'hammer'),false);
 assert.equal(f.sources.length,0);
});
test('muting suppresses playback without triggering a fallback sound',async()=>{
 const f=fixture();await f.player.preload(f.context);f.player.preferences({muted:true});
 assert.equal(f.player.play(f.context,'hammer'),true);assert.equal(f.sources.length,0);
 f.player.preferences({muted:false});f.player.play(f.context,'hammer');
 f.player.preferences({mode:'original'});assert.equal(f.sources[0].stopped,true);
});
test('repeated cues and voice limits cannot pile up unbounded audio',async()=>{
 const f=fixture({maxVoices:1});await f.player.preload(f.context);
 f.player.play(f.context,'hammer');f.player.play(f.context,'hammer');f.player.play(f.context,'turn');
 assert.equal(f.sources.length,1);assert.equal(f.player.status().suppressed,2);
 f.sources[0].end();f.context.currentTime+=1;f.player.play(f.context,'turn');assert.equal(f.sources.length,2);
});
test('samples respect caller output routing and reuse downloads across contexts',async()=>{
 const f=fixture();await f.player.preload(f.context);const destination={};
 f.player.play(f.context,'hammer',{destination,pan:.4});assert.equal(f.sources[0].target.target.target.target,destination);
 const other={...f.context};await f.player.preload(other);assert.deepEqual(f.counts(),{fetched:1,decoded:2});
});

test('overlapping actions never stop an earlier voice; cancellation fades first',async()=>{
 const f=fixture();await f.player.preload(f.context);f.player.play(f.context,'hammer');f.context.currentTime+=.15;f.player.play(f.context,'turn');
 assert.equal(f.sources.length,2);assert.ok(f.sources.every(s=>!s.stopped));
 const first=f.sources[0];assert.equal(f.player.release(first,.3),true);
 assert.equal(first.stoppedAt,f.context.currentTime+.3+.005);assert.equal(first.disconnected,undefined);
 assert.deepEqual(first.target.gain.events.at(-1),['ramp',0,f.context.currentTime+.3]);
 first.end();assert.equal(f.player.status().active,1);assert.equal(f.sources[1].stopped,undefined);
});
test('motion pans right to left and distant sounds are quieter without restarting sources',async()=>{
 const f=fixture();await f.player.preload(f.context);f.player.play(f.context,'hammer',{from:{x:1150,y:90},to:{x:200,y:680},travelSeconds:.6});
 const space=f.sources[0].target.target,pan=space.target.pan;
 assert.ok(pan.events[0][1]>0);assert.ok(pan.events[1][1]<0);assert.equal(pan.events[1][2],10.6);
 assert.ok(space.gain.events[0][1]<space.gain.events[1][1]);assert.equal(f.sources.length,1);
});
test('joining a burning fuse uses the remaining segment once, without a loop',async()=>{
 const f=fixture();await f.player.preload(f.context);f.player.play(f.context,'hammer',{offset:.6,duration:1.2});
 assert.deepEqual(f.sources[0].started,[10,.6,1.2]);assert.equal(f.sources[0].loop,undefined);
});

test('a short moving sample reaches its destination before its sound ends',async()=>{
 const f=fixture();await f.player.preload(f.context);f.player.play(f.context,'hammer',{from:{x:1150,y:680},to:{x:200,y:680},duration:.34,travelSeconds:.63});
 const pan=f.sources[0].target.target.target.pan;
 assert.equal(pan.events[1][2],10.34);assert.ok(pan.events[1][1]<0);
});
