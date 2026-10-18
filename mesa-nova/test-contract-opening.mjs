import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const code=readFileSync(new URL('./patron-intro-table.js',import.meta.url),'utf8');
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function fixture({skip=false,hold=false}={}){
 const calls=[],stored=new Map(),classes=new Set();let release;
 const c=vm.createContext({AbortController,console,state:{phase:'mulligan',code:'TEST01',matchId:'m1',first:'a',players:[{id:'a',name:'A',patron:{}},{id:'b',name:'B',patron:{}}]},visualGeneration:1,visualQueue:Promise.resolve(),gameBase:'/runamarca/',audioContext:null,
  document:{body:{classList:{add:x=>classes.add(x),remove:x=>classes.delete(x)}}},sessionStorage:{getItem:k=>stored.get(k),setItem:(k,v)=>stored.set(k,v)},seat:()=>({id:'a'}),$:()=>null,render:()=>calls.push('render'),
  RunaPatronIntro:{play:async()=>calls.push('dialogue'),cancel:()=>calls.push('cancel-dialogue')},
  RunaContractOpening:{cancel:()=>{},play:async opts=>{calls.push('contract');if(hold)await new Promise(resolve=>{release=resolve;opts.signal.addEventListener('abort',resolve,{once:true});});if(!skip&&!opts.signal.aborted)opts.onReveal();}},
  RunaDeckCarousel:{takeCapture:()=>null}
 });vm.runInContext(code,c);return {c,calls,classes,release:()=>release?.()};
}
test('room refreshes queue only one contract before dialogue and release the mulligan',async()=>{
 const f=fixture({hold:true});f.c.schedulePatronIntro();await settle();
 for(let i=0;i<6;i++)f.c.schedulePatronIntro();
 assert.deepEqual(f.calls,['contract']);assert.ok(f.classes.has('patron-intro-active'));
 f.release();await f.c.visualQueue;
 assert.deepEqual(f.calls,['contract','dialogue','render']);assert.equal(f.classes.size,0);
 f.c.schedulePatronIntro();await f.c.visualQueue;assert.equal(f.calls.filter(x=>x==='contract').length,1);
});
test('skipping the contract still starts the dialogue once',async()=>{
 const f=fixture({skip:true});f.c.schedulePatronIntro();await f.c.visualQueue;
 assert.deepEqual(f.calls,['contract','dialogue','render']);assert.equal(f.classes.size,0);
});
test('leaving the opening cancels it without a delayed dialogue in the next screen',async()=>{
 const f=fixture({hold:true});f.c.schedulePatronIntro();await settle();
 f.c.state.phase='prep';f.c.schedulePatronIntro();await f.c.visualQueue;
 assert.deepEqual(f.calls,['contract','cancel-dialogue']);assert.equal(f.classes.size,0);
});
