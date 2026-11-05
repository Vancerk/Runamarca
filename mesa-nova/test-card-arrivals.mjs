import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {installArrivals} from './test-card-arrivals-fixture.mjs';
const owner=()=>installArrivals(vm.createContext({}));

test('queued purchases stay hidden and locked until their individual arrival',()=>{
 const a=owner();a.reset('match:a');a.reserve('one');a.reserve('two');a.reserve('one');
 assert.equal(a.pending.length,2);assert.equal(a.blocked,true);
 const first=a.begin('draw',{uid:'one',arrival:true,lock:true});
 assert.equal(a.waiting('one'),true);a.insert(first);
 assert.equal(a.waiting('one'),false);assert.equal(a.has('one'),true);
 assert.equal(a.waiting('two'),true);assert.equal(a.blocked,true);
 a.finish(first);assert.equal(a.has('one'),false);assert.equal(a.blocked,true);
 const second=a.begin('draw',{uid:'two',arrival:true,lock:true});a.finish(second);
 assert.equal(a.blocked,false);assert.equal(a.pending.length,0);
});
test('a UID has only one flight owner; duplicate completion cannot unlock it',()=>{
 const a=owner(),first=a.begin('return',{uid:'same',arrival:true,lock:true});
 const duplicate=a.begin('draw',{uid:'same',arrival:true,lock:true});
 assert.equal(duplicate,null);assert.equal(a.finish(duplicate),false);
 assert.equal(a.current(first),true);assert.equal(a.blocked,true);
 assert.equal(a.finish(first),true);assert.equal(a.finish(first),false);
});
for(const scope of ['new-match','same-match'])test(`late paint/insertion/completion cannot touch a replacement (${scope})`,()=>{
 const a=owner();a.reset('same-match');const old=a.begin('return',{uid:'same',arrival:true,lock:true});
 a.reset(scope);const next=a.begin('draw',{uid:'same',arrival:true,lock:true});
 assert.equal(a.current(old),false);assert.equal(a.insert(old),false);assert.equal(a.finish(old),false);
 assert.equal(a.waiting('same'),true);assert.equal(a.current(next),true);assert.equal(a.blocked,true);
 a.finish(next);assert.equal(a.blocked,false);
});
test('hand removal releases only the removed arrival and its flight lock',()=>{
 const a=owner(),old=a.begin('return',{uid:'removed',arrival:true,lock:true});a.reserve('kept');
 a.retain(new Set(['kept']));assert.equal(a.current(old),false);assert.equal(a.insert(old),false);
 assert.deepEqual(Array.from(a.pending),['kept']);assert.equal(a.blocked,true);
 a.release('kept');assert.equal(a.blocked,false);
});
test('reset cancels queued arrivals and opening locks together',()=>{
 const a=owner();a.reserve('queued');const opening=a.begin('opening',{lock:true});
 a.reset();assert.equal(a.current(opening),false);assert.equal(a.blocked,false);
 assert.equal(a.pending.length,0);assert.equal(a.stats.active.length,0);
});
test('rival flights neither reserve a private hand UID nor lock the local hand',()=>{
 const a=owner(),flight=a.begin('rival-draw');assert.equal(a.blocked,false);assert.equal(a.pending.length,0);
 assert.equal(a.current(flight),true);a.finish(flight);assert.equal(a.stats.active.length,0);
});
test('release listeners observe the settled state and can unsubscribe',()=>{
 const a=owner(),states=[],off=a.subscribe(type=>states.push([type,a.blocked]));
 a.reserve('card');const flight=a.begin('draw',{uid:'card',arrival:true,lock:true});a.finish(flight);
 assert.deepEqual(states.at(-1),['release',false]);const count=states.length;off();a.reset();assert.equal(states.length,count);
});
