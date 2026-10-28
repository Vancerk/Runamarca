import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {EventEmitter} from 'node:events';import vm from 'node:vm';
const original=fs.readFileSync(new URL('./game-bridge/async-bridge.mjs',import.meta.url),'utf8');let serial=0;
async function fakeFactory(mode){
 class FakeWorker extends EventEmitter{
  static instances=[];
  constructor(){super();this.terminated=0;FakeWorker.instances.push(this);queueMicrotask(()=>mode==='exit'?this.emit('exit',2):this.emit('message',{kind:mode==='invalid'?'unexpected':'ready'}));}
  terminate(){this.terminated++;return Promise.resolve(0);}
  ref(){return this;}
  unref(){return this;}
  postMessage(msg){if(msg.kind==='clear')return;throw Error('Injected send failure');}
 }
 const key='__workerFault'+(++serial);globalThis[key]=FakeWorker;
 const source=original.replace("import {Worker} from 'node:worker_threads';",'const Worker=globalThis.'+key+';').replace("'../runner/lib/decision-core.mjs'",JSON.stringify(new URL('./runner/lib/decision-core.mjs',import.meta.url).href)).replace("new URL('./worker.mjs',import.meta.url)",JSON.stringify(new URL('./game-bridge/worker.mjs',import.meta.url).href));
 const module=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));delete globalThis[key];return {create:options=>module.createAsyncGameBotBridge({hostSourceRoot:process.cwd(),...options}),FakeWorker};
}
test('unexpected startup response terminates worker',async()=>{
 const {create,FakeWorker}=await fakeFactory('invalid');await assert.rejects(create({}),/Unexpected worker initialization/);assert.ok(FakeWorker.instances[0].terminated>=1);
});
test('exit before ready rejects as exit, not timeout, and terminates',async()=>{
 const {create,FakeWorker}=await fakeFactory('exit');await assert.rejects(create({startupTimeoutMs:1000}),/exited during initialization/);assert.ok(FakeWorker.instances[0].terminated>=1);
});
test('postMessage throws do not consume queue slots',async()=>{
 const {create}=await fakeFactory('send'),a={id:'A',bot:true},b={id:'B'},room={phase:'prep',turn:'A',revision:1,players:[a,b]};
 const host={view:()=>({you:'A',phase:'prep',turn:'A',players:[{id:'A',handCount:0,deckCount:0,hand:[],reserve:[],prepared:[]},{id:'B',handCount:0,deckCount:0,reserve:[],prepared:[]}]}),easyBotAction(){throw Error('Unexpected fallback');}};
 const bridge=await create({host});try{for(let i=0;i<10;i++)await assert.rejects(bridge.nextAction(room),/Injected send failure/);}finally{await bridge.close();}
});
function scheduler(nextAction){
 const src=fs.readFileSync(new URL('../mesa-nova/server.mjs',import.meta.url),'utf8'),timers=[],room={code:'A',players:[{bot:true}],log:[],revision:1},rooms=new Map([['A',room]]);let applied=0;
 const context={sharedBot:{nextAction,clear(){}},rooms,catalog:{},act(){applied++;},persistMatch(){},setTimeout(fn){timers.push(fn);return 1;}};
 vm.runInNewContext(src.slice(src.indexOf('function scheduleBot(room)'),src.indexOf('\nfunction json(')),context);
 context.scheduleBot(room);return {timers,room,get applied(){return applied;}};
}
test('transient queue pressure recovers without changing bot policy',async()=>{
 let calls=0;const s=scheduler(async()=>{if(++calls===1)throw Object.assign(Error('busy'),{code:'BOT_QUEUE_FULL'});return calls===2?{type:'ready'}:null;});
 while(s.timers.length)await s.timers.shift()();assert.equal(s.applied,1);assert.equal(s.room.log.length,0);assert.equal(calls,3);
});
test('queue pressure retries are bounded and then explicitly reported',async()=>{
 let calls=0;const s=scheduler(async()=>{calls++;throw Object.assign(Error('busy'),{code:'BOT_QUEUE_FULL'});});
 while(s.timers.length)await s.timers.shift()();assert.equal(calls,4);assert.equal(s.applied,0);assert.equal(s.room.log.length,1);
});
