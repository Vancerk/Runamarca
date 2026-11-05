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

test('a transfer owns a UID across zones, without reserving a private hand arrival',()=>{
 const a=owner(),t=a.begin('transfer',{uid:'card',moving:true});
 assert.equal(a.moving('card'),true);assert.equal(a.has('card'),false);assert.equal(a.blocked,false);
 assert.equal(a.begin('transfer',{uid:'card',moving:true}),null);
 assert.equal(a.begin('return',{uid:'card',arrival:true}),null);
 a.retain(new Set());a.release('card');assert.equal(a.current(t),true,'hand cleanup cannot cancel a field transfer');
 assert.equal(a.insert(t),false);a.finish(t);assert.equal(a.moving('card'),false);
});

test('cancelled transfer cannot expose a newer transfer of the same UID',()=>{
 const a=owner(),old=a.begin('transfer',{uid:'same',moving:true});a.reset();
 const next=a.begin('transfer',{uid:'same',moving:true});
 assert.equal(a.finish(old),false);assert.equal(a.moving('same'),true);assert.equal(a.current(next),true);
 a.finish(next);assert.equal(a.moving('same'),false);
});

test('opening completion waits for the owner, and cancellation releases waiting draws',async()=>{
 const a=owner(),opening=a.begin('opening-to-hand',{lock:true});let done=false;
 const wait=a.waitFor('opening-to-hand').then(()=>done=true);await Promise.resolve();assert.equal(done,false);
 const transfer=a.begin('transfer',{uid:'opening-card',moving:true});a.finish(transfer);
 await Promise.resolve();assert.equal(done,false);a.finish(opening);await wait;assert.equal(done,true);
 a.begin('opening-to-hand',{lock:true});const cancelled=a.waitFor('opening-to-hand');a.reset();
 a.begin('opening-to-hand',{lock:true});await cancelled;assert.equal(a.blocked,true,'old wait ends without releasing the new batch');
});

test('a combat movement supersedes reflow, disposes its resources once and owns the UID',()=>{
 const a=owner(),old=a.begin('reflow',{uid:'unit',moving:true});let removed=0;
 a.own(old,()=>removed++);
 const combat=a.begin('combat',{uid:'unit',moving:true,replace:true});
 assert.equal(removed,1);assert.equal(a.current(old),false);assert.equal(a.moveTicket('unit'),combat);
 assert.equal(a.finish(old),false);assert.equal(a.moving('unit'),true);
 a.own(combat,()=>removed++);a.reset('next');a.finish(combat);assert.equal(removed,2);
});

test('resizing cancels hand motion without ending a casualty arc that follows its destination',()=>{
 const a=owner(),death=a.begin('casualty',{uid:'dead',moving:true}),move=a.begin('transfer',{uid:'hand',moving:true});
 let cleaned=0;a.own(move,()=>cleaned++);
 assert.deepEqual(Array.from(a.cancelKinds(['transfer','reflow'])),['hand']);
 assert.equal(cleaned,1);assert.equal(a.current(death),true);assert.equal(a.current(move),false);
});

test('playing a settling neighbour takes ownership without waiting for its reflow',()=>{
 const a=owner(),old=a.begin('reflow',{uid:'unit',moving:true});let removed=0;a.own(old,()=>removed++);
 const transfer=a.begin('transfer',{uid:'unit',moving:true});assert.ok(transfer);assert.equal(removed,1);
 assert.equal(a.finish(old),false);assert.equal(a.moveTicket('unit'),transfer);
 assert.equal(a.begin('transfer',{uid:'unit',moving:true}),null,'a second action cannot supersede the real transfer');
});
