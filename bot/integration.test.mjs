import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {engine} from './runner/lib/engine.mjs';
import {createGameBotBridge} from './game-bridge/bridge.mjs';
import {createAsyncGameBotBridge} from './game-bridge/async-bridge.mjs';
import {sanitizeObservation} from './runner/lib/decision-core.mjs';
import {candidateActions,decide,POLICY_VERSION} from './runner/lib/policy-v2.mjs';
import {setCatalog,weights,budgets,publicRoom} from './runner/lib/pilots.mjs';
const source=fileURLToPath(new URL('./runner/source',import.meta.url));
const hostRoot=fileURLToPath(new URL('../',import.meta.url));
const catalog=JSON.parse(fs.readFileSync(path.join(source,'mesa-nova/cartas.json')));
setCatalog(catalog);
async function fixture(){
 const api=await engine(20261026,0,source),room=api.makeRoom('QA','A'),a=room.players[0],b=api.join(room,'B');
 for(const p of [a,b])api.act(room,p,{type:'deck',deckId:'fluxo-virelion'},catalog);
 for(const p of [a,b])api.act(room,p,{type:'confirmMulligan'},catalog);
 room.phase='prep';room.turn=a.id;a.bot=true;a.mana=10;a.manaMax=10;
 const port={...api,act:(r,p,action)=>api.act(r,p,action,catalog)};
 return {api,port,room,a,b};
}
test('exact profile and patched policy, legal physical decks',()=>{
 assert.equal(budgets.intermediario,500);assert.match(POLICY_VERSION,/v2.3-common-horizon/);
 for(const d of catalog.decks){assert.equal(d.cards.reduce((n,c)=>n+c.quantity,0),30);for(const c of d.cards)assert.ok(c.quantity<=({lacaio:4,padrao:3,elite:2,soberano:1})[c.rarity]);}
});
test('snapshot validates all loaded canonical modules against host',async()=>{
 const {api}=await fixture();const bridge=await createGameBotBridge({enabled:true,host:api,catalog,source,hostSourceRoot:hostRoot});
 assert.deepEqual(bridge.profile,{level:'intermediario',style:'equilibrado'});
 assert.ok(bridge.sourceIdentity.loadedFiles.length>10);
});
test('hand 7/8/9 and empty deck candidates, canonical draw at eight',async()=>{
 const {api,port,room,a}=await fixture();const model=catalog.decks.flatMap(d=>d.cards).find(c=>c.id==='FV08');
 for(const n of [7,8,9]){
  a.hand=Array.from({length:n},(_,i)=>({...structuredClone(model),uid:'draw'+i,modelId:'FV08',owner:a.id}));
  const s=api.view(room,a),list=candidateActions(port,s,weights.equilibrado);
  assert.equal(list.some(x=>x.type==='play'&&x.cardId==='draw0'&&x.mode==='direct'),n<9);
  if(n===8){const r=publicRoom(s),p=r.players[0];port.act(r,p,list.find(x=>x.cardId==='draw0'&&x.mode==='direct'));assert.equal(p.hand.length,9);}
 }
 a.hand=a.hand.slice(0,8);a.deck=[];assert.ok(!candidateActions(port,api.view(room,a),weights.equilibrado).some(x=>x.type==='play'&&x.mode==='direct'));
});
test('combined hand8/horizon search bounded, deterministic and no-op snapshot',async()=>{
 const {api,port,room,a}=await fixture();const m=catalog.decks.flatMap(d=>d.cards).find(c=>c.id==='FV08');
 a.hand=Array.from({length:8},(_,i)=>({...structuredClone(m),uid:'draw'+i,modelId:m.id,owner:a.id}));
 const s=api.view(room,a),before=structuredClone(s),start=performance.now();
 const d=decide(port,s,weights.equilibrado,'intermediario',500);
 assert.deepEqual(s,before);assert.ok(d.work<=500);
 assert.equal(d.diagnostic.profile.horizon,3);assert.equal(d.diagnostic.profile.forgeHorizon,3);
 for(const row of d.diagnostic.examined){assert.equal(row.horizon,3);assert.equal(row.passScore,d.diagnostic.baseline.score);}
 const again=decide(port,s,weights.equilibrado,'intermediario',500);assert.deepEqual(d.choice,again.choice);
 console.log(JSON.stringify({metric:'combined_fixture_ms',value:performance.now()-start,work:d.work,examined:d.diagnostic.examined.length}));
});
test('hidden rival hands/deck/formations do not affect sanitized input',async()=>{
 const {api,room,a,b}=await fixture();room.phase='formation';
 const first=sanitizeObservation(api.view(room,a));
 b.hand=b.hand.map((c,i)=>({...c,name:'SECRET'+i,modelId:'SECRET'+i}));b.deck.reverse();b.formation=['secret-lane',null,null];
 assert.deepEqual(sanitizeObservation(api.view(room,a)),first);
});
test('bridge legacy phases explicit; inactive phases no-op',async()=>{
 const {api,room,a}=await fixture();let calls=0;
 const bridge=await createGameBotBridge({enabled:true,host:{...api,easyBotAction:()=>{calls++;return {type:'legacy'};}},catalog,source,hostSourceRoot:hostRoot});
 for(const phase of ['lobby','mulligan']){room.phase=phase;assert.deepEqual(bridge.nextAction(room),{type:'legacy'});}
 room.phase='prep';a.pendingDiscard=1;assert.deepEqual(bridge.nextAction(room),{type:'legacy'});a.pendingDiscard=0;
 for(const phase of ['coin','resolving','finished']){room.phase=phase;assert.equal(bridge.nextAction(room),null);}
 assert.equal(calls,3);
});
test('all referenced catalog images exist with exact case',()=>{
 const paths=new Set();const walk=x=>{if(typeof x==='string'&&/\.(jpg|jpeg|png|webp)$/i.test(x))paths.add(x);else if(Array.isArray(x))x.forEach(walk);else if(x&&typeof x==='object')Object.values(x).forEach(walk);};walk(catalog);
 for(const rel of paths){const full=path.join(hostRoot,'mesa-nova',rel);assert.ok(fs.existsSync(full),rel);assert.ok(fs.readdirSync(path.dirname(full)).includes(path.basename(full)),rel);}
 console.log(JSON.stringify({metric:'catalog_image_paths',count:paths.size}));assert.equal(paths.size,73);
});
test('two concurrent rooms keep host event loop responsive and reject stale result',async()=>{
 const f=await fixture(),g=await fixture();
 const bridge=await createAsyncGameBotBridge({host:f.api,catalog,source,hostSourceRoot:hostRoot});
 try{
  // 100ms host responsiveness threshold chosen before measurement, independent
  // of search completion latency; two synthetic rooms, not an SLA/load test.
  const start=performance.now();const tick=new Promise(resolve=>setTimeout(()=>resolve(performance.now()-start),10));
  const first=bridge.nextAction(f.room),second=bridge.nextAction(g.room);
  const delay=await tick;assert.ok(delay<100,'event loop delayed '+delay);
  f.room.revision++;
  const [stale,action]=await Promise.all([first,second]);assert.equal(stale,null);assert.ok(action);
  g.api.act(g.room,g.a,action,catalog);
  console.log(JSON.stringify({metric:'two_rooms',eventLoopTimerMs:delay,totalMs:performance.now()-start,staleRejected:true}));
 }finally{await bridge.close();}
});
test('worker preserves own decision memory and matches synchronous bridge',async()=>{
 const f=await fixture();Object.assign(f.a,{preparationSerial:7,directPlayed:true,discountUsed:true});
 const options={host:f.api,catalog,source,hostSourceRoot:hostRoot};
 const sync=await createGameBotBridge({...options,enabled:true}),asyncBridge=await createAsyncGameBotBridge(options);
 try{assert.deepEqual(await asyncBridge.nextAction(f.room),sync.nextAction(f.room));}finally{await asyncBridge.close();}
});
test('bounded queue of eight completes, ninth refused without changing budget',async()=>{
 const fixtures=[];for(let i=0;i<9;i++)fixtures.push(await fixture());
 const bridge=await createAsyncGameBotBridge({host:fixtures[0].api,catalog,source,hostSourceRoot:hostRoot});
 try{
  const start=performance.now(),jobs=fixtures.slice(0,8).map(f=>bridge.nextAction(f.room));
  await assert.rejects(bridge.nextAction(fixtures[8].room),/queue capacity/);
  const results=await Promise.all(jobs);assert.ok(results.every(Boolean));
  console.log(JSON.stringify({metric:'queue8_ms',value:performance.now()-start,budget:500}));
 }finally{await bridge.close();}
});
test('shared bridge emits canonical legal vote, formation and forging actions',async()=>{
 const f=await fixture();const bridge=await createGameBotBridge({enabled:true,host:f.api,catalog,source,hostSourceRoot:hostRoot});
 f.room.phase='vote';f.a.vote=null;const vote=bridge.nextAction(f.room);assert.equal(vote.type,'vote');f.api.act(f.room,f.a,vote,catalog);
 f.room.phase='formation';f.a.ready=false;f.b.ready=false;
 const ready=bridge.nextAction(f.room);assert.equal(ready.type,'ready');f.api.act(f.room,f.a,ready,catalog);
 const api=await engine(20261026,0,source),room=api.makeRoom('FORGE','A'),a=room.players[0],b=api.join(room,'B');
 const deck=catalog.decks.find(d=>d.patron.powers?.some(p=>p.id==='forjar-arma'));
 for(const p of [a,b])api.act(room,p,{type:'deck',deckId:deck.id},catalog);
 for(const p of [a,b])api.act(room,p,{type:'confirmMulligan'},catalog);
 room.phase='prep';room.turn=a.id;a.bot=true;a.mana=10;a.manaMax=10;
 api.act(room,a,{type:'patronPower',powerId:'forjar-arma',weaponCost:3},catalog);
 // Start the next-round synthetic fixture at the canonical due date.
 room.round=a.forge.dueRound;room.phase='forging';
 const forgeBridge=await createGameBotBridge({enabled:true,host:api,catalog,source,hostSourceRoot:hostRoot});
 const action=forgeBridge.nextAction(room);assert.equal(action.type,'forgeChoice');api.act(room,a,action,catalog);
});
