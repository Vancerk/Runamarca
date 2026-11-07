import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL(name,import.meta.url),'utf8');
function fixture(saved='{}',maxVoices=2){
 const storage=new Map([['runamarca-audio-v2',saved]]),scope=vm.createContext({localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)}});
 for(const file of ['audio-mix.js','sound-direction.js','sfx-player.js'])vm.runInContext(read(file),scope);
 const parameter=()=>({value:0,events:[],setValueAtTime(v,t){this.value=v;this.events.push([v,t]);},setTargetAtTime(v,t){this.value=v;this.events.push([v,t]);},linearRampToValueAtTime(v,t){this.events.push([v,t]);},cancelAndHoldAtTime(){},cancelScheduledValues(){}});
 const node=()=>({gain:parameter(),connect(to){this.target=to;return to;},disconnect(){}}),sources=[];
 const context={state:'running',currentTime:1,destination:{},createGain:node,async decodeAudioData(){return {duration:8};},createBufferSource(){const listeners=[];const n={...node(),playbackRate:parameter(),addEventListener(t,fn){listeners.push(fn);},start(...args){this.startArgs=args;},stop(t){this.stopAt=t;if(t===undefined)this.end();},end(){listeners.forEach(fn=>fn());}};sources.push(n);return n;}};
 const cues={a:{url:'a.mp3'},b:{url:'b.mp3'},turn:{url:'turn.mp3'},ice:{url:'ice.mp3',duration:5.39},frost:{url:'ice.mp3',duration:5.39},fuse:{url:'fuse.mp3'}};
 const player=scope.RunaSfx.create({manifest:{cues},maxVoices,fetcher:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)})});
 return {scope,storage,context,sources,player};
}
test('category levels persist, clamp corrupt values and master mute does not erase them',()=>{
 const f=fixture('{"effects":0.4,"voice":0.7}'),mix=f.scope.RunaAudioMix;
 assert.equal(mix.level('effects'),.4);const fx=mix.destination(f.context,'effects'),voice=mix.destination(f.context,'voice');
 assert.equal(mix.destination(f.context,'effects'),fx);assert.equal(fx.gain.value,.4);assert.equal(voice.gain.value,.7);
 mix.preferences({muted:true});assert.equal(fx.gain.value,0);assert.equal(voice.gain.value,0);
 mix.preferences({muted:false,effects:9});assert.equal(fx.gain.value,1);assert.equal(voice.gain.value,.7);
 assert.equal(JSON.parse(f.storage.get('runamarca-audio-v2')).voice,.7);assert.equal(fixture('broken').scope.RunaAudioMix.level('effects'),1);
});
test('changing voice level leaves effects alone and subscriptions are disposable',()=>{
 const f=fixture(),mix=f.scope.RunaAudioMix,fx=mix.destination(f.context,'effects'),voice=mix.destination(f.context,'voice');let calls=0;const off=mix.subscribe(()=>calls++);
 mix.preferences({voice:.2});assert.equal(voice.gain.value,.2);assert.equal(fx.gain.value,1);assert.equal(calls,1);off();mix.preferences({effects:.3});assert.equal(calls,1);
});
test('an important turn replaces a decorative tail instead of disappearing',async()=>{
 const f=fixture();await f.player.preload(f.context);f.player.play(f.context,'a');f.player.play(f.context,'b');f.player.play(f.context,'turn');
 assert.equal(f.sources.length,3);assert.equal(f.player.status().stolen,1);assert.ok(Math.abs(f.sources[0].stopAt-1.03)<1e-9);assert.equal(f.sources[2].startArgs[0],1);
});
test('decorative bursts cannot displace important cues or grow unlimited tails',async()=>{
 const f=fixture();await f.player.preload(f.context);for(let i=0;i<50;i++){f.context.currentTime+=.04;f.player.play(f.context,'turn');f.player.play(f.context,'a');}
 assert.ok(f.player.status().active<=6);assert.ok(f.player.status().limited>0);
});
test('the same recording shares a two-voice limit across different decorative cues',async()=>{
 const f=fixture('{}',16);await f.player.preload(f.context);f.player.play(f.context,'ice');f.player.play(f.context,'frost');f.context.currentTime+=.1;f.player.play(f.context,'ice');
 assert.equal(f.sources.length,2);assert.equal(f.player.status().limited,1);assert.equal(f.sources[0].startArgs[2],1.65);
});
test('one fuse, no added loop, no sound after late loading',async()=>{
 const f=fixture();assert.equal(f.player.play(f.context,'fuse'),false);await f.player.preload(f.context);assert.equal(f.sources.length,0);
 f.player.play(f.context,'fuse',{offset:2,duration:3});f.context.currentTime+=.1;f.player.play(f.context,'fuse');assert.equal(f.sources.length,1);assert.deepEqual(f.sources[0].startArgs,[1,2,3]);
});
test('every live cue has a finite concurrency policy, without changing sources or playback rate',()=>{
 const f=fixture(),catalog=JSON.parse(read('sfx-catalog.json'));assert.equal(Object.keys(catalog.cues).length,109);
 for(const [key,cue] of Object.entries(catalog.cues)){const p=f.scope.RunaSoundDirection.policy(key,cue);assert.ok(p.maxConcurrent>=1&&p.maxConcurrent<=4,key);assert.ok(p.priority>=1&&p.priority<=3,key);assert.ok(p.maxSeconds>0,key);assert.equal(p.url,undefined);assert.equal(p.rate,undefined);}
});
