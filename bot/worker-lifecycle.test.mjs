import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {engine} from './runner/lib/engine.mjs';
import {createAsyncGameBotBridge} from './game-bridge/async-bridge.mjs';
const source=fileURLToPath(new URL('./runner/source',import.meta.url)),hostSourceRoot=fileURLToPath(new URL('../',import.meta.url));
const catalog=JSON.parse(fs.readFileSync(source+'/mesa-nova/cartas.json'));
async function setup(options={}){
 const host=await engine(20261026,0,source),room=host.makeRoom('LIFECYCLE','A'),a=room.players[0],b=host.join(room,'B');
 for(const p of [a,b])host.act(room,p,{type:'deck',deckId:'fluxo-virelion'},catalog);
 for(const p of [a,b])host.act(room,p,{type:'confirmMulligan'},catalog);
 room.phase='prep';room.turn=a.id;a.bot=true;a.mana=10;a.manaMax=10;
 return {room,a,b,host,bridge:await createAsyncGameBotBridge({host,catalog,source,hostSourceRoot,...options})};
}
test('clear invalidates a result even when revision has not changed',async()=>{
 const {room,bridge}=await setup();try{const job=bridge.nextAction(room);bridge.clear(room);assert.equal(await job,null);}finally{await bridge.close();}
});
test('close rejects pending decision and all later calls, idempotently',async()=>{
 const {room,bridge}=await setup();const job=bridge.nextAction(room);const checked=assert.rejects(job,/Bridge closed/);await bridge.close();await checked;await bridge.close();await assert.rejects(bridge.nextAction(room),/unavailable/);
});
test('one room cannot enqueue duplicate work; actor replacement invalidates result',async()=>{
 const {room,bridge,a}=await setup();try{const job=bridge.nextAction(room);await assert.rejects(bridge.nextAction(room),/already pending/);room.players[0]={...a};assert.equal(await job,null);}finally{await bridge.close();}
});
test('CPU deadline quarantines failing rooms without silently falling back',async()=>{
 const {room,bridge}=await setup({timeoutMs:1});
 try{
  const second=structuredClone(room);second.code='SECOND';
  const jobs=await Promise.allSettled([bridge.nextAction(room),bridge.nextAction(second)]);
  assert.ok(jobs.every(j=>j.status==='rejected'&&/deadline exceeded/.test(j.reason.message)));
  await assert.rejects(bridge.nextAction(room),/quarantined/);
 }finally{await bridge.close();}
});
test('startup failure and initialization timeout reject without a live bridge',async()=>{
 const host={easyBotAction(){},view(){}};
 await assert.rejects(createAsyncGameBotBridge({host,catalog,source:source+'/missing',hostSourceRoot}),/initialization failed/);
 await assert.rejects(createAsyncGameBotBridge({host,catalog,source,hostSourceRoot,startupTimeoutMs:1}),/initialization timeout/);
});
test('explicit disabled mode alone uses legacy; unsupported limits rejected',async()=>{
 let n=0;const host={easyBotAction(){n++;return {type:'legacy'};}};
 const bridge=await createAsyncGameBotBridge({enabled:false,host});assert.deepEqual(await bridge.nextAction({}),{type:'legacy'});assert.equal(n,1);await bridge.close();
 for(const options of [{maxPending:9},{timeoutMs:NaN},{maxPending:0},{level:'experiente'}])await assert.rejects(createAsyncGameBotBridge({host,catalog,source,hostSourceRoot,...options}));
});
