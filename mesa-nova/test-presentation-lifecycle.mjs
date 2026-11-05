import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=name=>fs.readFileSync(new URL(name,import.meta.url),'utf8');
function fixture(extra={}){const context=vm.createContext(extra);vm.runInContext(read('presentation-lifecycle.js'),context);return {context,api:context.RunaPresentation};}

test('content is positioned before effects read it; observers run after effects',()=>{
 const {api}=fixture(),calls=[];let position='old';
 api.register('observer',{after:()=>calls.push('observer')});
 api.register('scene',{capture:()=>position,layout:before=>{assert.equal(before,'old');assert.equal(position,'unplaced');position='projected';calls.push('layout');}});
 api.update(()=>{position='unplaced';calls.push('content');return 'new state';},result=>{assert.equal(result,'new state');assert.equal(position,'projected');calls.push('effect');});
 assert.deepEqual(calls,['content','layout','effect','observer']);assert.equal(api.stats.depth,0);
});
test('a nested update cannot replace the outer capture',()=>{
 const {api}=fixture(),seen=[];let value=0;
 api.register('scene',{capture:()=>value,layout:before=>seen.push(before)});
 api.update(()=>{value=1;api.update(()=>{value=2;});});
 assert.deepEqual(seen,[1,0]);assert.equal(api.stats.updates,2);assert.equal(api.stats.depth,0);
});
test('an interrupted content update runs cleanup and the next update still works',()=>{
 const {api}=fixture();let layouts=0,effects=0,cleanups=0;
 api.register('scene',{layout:()=>layouts++,after:()=>cleanups++});
 assert.throws(()=>api.update(()=>{throw Error('content failed');},()=>effects++),/content failed/);
 assert.equal(layouts,0);assert.equal(effects,0);assert.equal(cleanups,1);assert.equal(api.stats.depth,0);
 api.update(()=>{},()=>effects++);assert.equal(layouts,1);assert.equal(effects,1);assert.equal(cleanups,2);
});
test('registration changes take effect on the next update and disposal removes the adapter',()=>{
 const {api}=fixture(),seen=[];let dispose;
 api.update(()=>{dispose=api.register('scene',{layout:()=>seen.push('layout')});});
 assert.deepEqual(seen,[]);api.update(()=>{});assert.deepEqual(seen,['layout']);
 assert.throws(()=>api.register('scene',{}),/already registered/);
 dispose();api.update(()=>{});assert.deepEqual(seen,['layout']);
});
test('actual strike lookup requests current geometry before selecting by owner and UID',()=>{
 let cards=[],geometry=0;const source={dataset:{uid:'source'},closest:()=>({dataset:{owner:'a'}})},target={dataset:{uid:'target'},closest:()=>({dataset:{owner:'b'}})},twin={dataset:{uid:'twin'},closest:()=>({dataset:{owner:'b'}})},patron={};
 const {api,context}=fixture({document:{querySelectorAll:()=>cards},tableCard:id=>id==='patron:b'?patron:null});
 const app=read('app.js');vm.runInContext(app.slice(app.indexOf('function attackSource('),app.indexOf('async function animateLaneClash(')),context);
 const sourceFn=context.attackSource,targetFn=context.attackTarget;
 api.register('scene',{ensureGeometry:()=>{geometry++;cards=[source,twin,target];}});
 assert.equal(context.attackSource({sourceId:'source',owner:'a'}),source);
 assert.equal(context.attackTarget({owner:'a',targetOwner:'b',targetId:'target'}),target);
 assert.equal(context.attackTarget({owner:'a',targetOwner:'b'}),patron);
 assert.equal(context.attackTarget({owner:'a',targetOwner:'a',targetId:'source'}),null);
 assert.equal(geometry,4);assert.equal(context.attackSource,sourceFn);assert.equal(context.attackTarget,targetFn);
});
test('shared client remains usable with no 3D geometry adapter',()=>{
 const {api}=fixture();let applied=false;
 api.update(()=>{},()=>{api.ensureGeometry();applied=true;});
 assert.equal(applied,true);assert.equal(api.stats.updates,1);assert.equal(api.stats.measurements,1);
});

test('an unfinished visual effect does not delay the next state update',async()=>{
 const {api}=fixture(),seen=[];let finish;
 const animation=new Promise(resolve=>{finish=resolve;});
 const first=api.update(()=>seen.push('revision 1'),()=>animation);
 api.update(()=>seen.push('revision 2'));
 assert.deepEqual(seen,['revision 1','revision 2']);
 assert.equal(first,animation);assert.equal(api.stats.depth,0);assert.equal(api.stats.updates,2);
 finish();await first;
});
