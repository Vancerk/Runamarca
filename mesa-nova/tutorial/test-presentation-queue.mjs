import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('presentation-lifecycle.js',import.meta.url),'utf8');
function queue(){const c=vm.createContext({setTimeout,clearTimeout});vm.runInContext(source,c);return c.RunaPresentation.createQueue();}
test('events execute in order, duplicates share one task and failure does not block successors',async()=>{
 const q=queue(),seen=[];const first=q.enqueue(async()=>{seen.push(1);},'one');assert.equal(q.enqueue(()=>seen.push('duplicate'),'one'),first);
 await q.enqueue(()=>{throw Error('effect');}).catch(()=>{});q.enqueue(()=>seen.push(2));await q;
 assert.deepEqual(seen,[1,2]);assert.equal(q.stats.pending,0);
});
test('reset cancels waits, delayed callbacks and pending old events while new work starts immediately',async()=>{
 const q=queue(),seen=[];let started;const ready=new Promise(r=>started=r);
 const old=q.enqueue(async c=>{started();if(await c.wait(10000))seen.push('old');});
 q.enqueue(()=>seen.push('queued'));q.defer(()=>seen.push('timer'),10000);await ready;q.reset();
 await q.enqueue(()=>seen.push('new'),'same-id');await old;await q;
 assert.deepEqual(seen,['new']);assert.equal(q.stats.timers,0);assert.equal(q.stats.pending,0);
});
test('finishing an old task cannot change the count or deduplication of the new match',async()=>{
 const q=queue();let finish;const old=q.enqueue(()=>new Promise(r=>finish=r),'one');await Promise.resolve();q.reset();
 let count=0;await q.enqueue(()=>count++,'one');finish();await old;await q;
 assert.equal(count,1);assert.equal(q.stats.pending,0);
});
