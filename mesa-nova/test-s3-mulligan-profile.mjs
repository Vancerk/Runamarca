import {installArrivals} from './test-card-arrivals-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {makeRoom,join,act} from './game.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('./cartas.json',import.meta.url)));
const app=fs.readFileSync(new URL('./app.js',import.meta.url),'utf8');
const source=app.split('\n').filter(line=>/^const mulliganReplacementsDue=|^function clearMulliganReplacements\(|^function tagMulliganReplacements\(/.test(line)).join('\n');
// Marks are generation-bound ("generation:id"); the isolated tagger runs in generation 0.
function tagger(){const box={};vm.runInNewContext(source+'\nbox.tag=tagMulliganReplacements;box.marks=openingReplacementDraws;box.due=mulliganReplacementsDue;',{box});
 box.tagged={has:id=>box.marks.has('0:'+id),get size(){return box.marks.size;},[Symbol.iterator]:()=>[...box.marks].map(m=>Number(m.split(':')[1]))[Symbol.iterator]()};return box;}
function match(code='S3MUL1'){const room=makeRoom(code,'A'),a=room.players[0],b=join(room,'B');act(room,a,{type:'deck',deckId:catalog.decks[0].id},catalog);act(room,b,{type:'deck',deckId:catalog.decks[1].id},catalog);return {room,a,b};}
const since=(room,id)=>room.events.filter(e=>e.id>id);
const lastId=room=>room.events.at(-1)?.id??0;

test('S3: tagger extracted from app.js',()=>{assert.ok(source.includes('tagMulliganReplacements')&&source.includes('openingReplacementDraws')&&source.includes('clearMulliganReplacements'));});

test('S3: partial and total mulligan replacement draws are tagged opening; opening and prep draws are not',()=>{
 const {room,a,b}=match(),t=tagger();
 const opening=room.events.slice();t.tag(opening);assert.equal(t.tagged.size,0,'opening deal events are not replacement draws');
 let mark=lastId(room);act(room,a,{type:'mulligan',cardIds:a.hand.slice(0,2).map(c=>c.uid)},catalog);
 const partial=since(room,mark);assert.deepEqual(partial.map(e=>e.type),['mulligan','draw','draw']);t.tag(partial);
 assert.deepEqual([...t.tagged],partial.filter(e=>e.type==='draw').map(e=>e.id));
 mark=lastId(room);act(room,b,{type:'mulligan',cardIds:b.hand.map(c=>c.uid)},catalog);
 const total=since(room,mark);assert.equal(total.filter(e=>e.type==='draw').length,5);t.tag(total);
 for(const e of total.filter(e=>e.type==='draw'))assert.ok(t.tagged.has(e.id),'total replacement draw tagged');
 assert.equal(t.tagged.size,7);assert.equal(t.due.size,0,'no dangling replacement debt');
 mark=lastId(room);act(room,a,{type:'confirmMulligan'},catalog);act(room,b,{type:'confirmMulligan'},catalog);
 const later=since(room,mark);t.tag(later);
 const prepDraws=later.filter(e=>e.type==='draw');assert.ok(prepDraws.length>=1,'match start produces a normal Preparation draw');
 for(const e of prepDraws)assert.ok(!t.tagged.has(e.id),'normal draws keep the normal profile');
});

test('S3: association survives batch splits and does not depend on phase',()=>{
 const {room,a}=match(),t=tagger();const mark=lastId(room);act(room,a,{type:'mulligan',cardIds:a.hand.slice(0,3).map(c=>c.uid)},catalog);
 const events=since(room,mark);room.phase='prep';// phase changes before the queue drains
 t.tag(events.slice(0,2));t.tag(events.slice(2));
 assert.deepEqual([...t.tagged],events.filter(e=>e.type==='draw').map(e=>e.id));
});

test('S3: special-power draws and other players are never captured by a pending mulligan',()=>{
 const t=tagger();t.tag([{id:10,type:'mulligan',playerId:'p1',count:2},{id:11,type:'draw',playerId:'p2'},{id:12,type:'draw',playerId:'p1',sourcePower:'sumario-ecoante'},{id:13,type:'draw',playerId:'p1'},{id:14,type:'spell',playerId:'p1'},{id:15,type:'draw',playerId:'p1'}]);
 assert.deepEqual([...t.tagged],[13],'only the replacement before an unrelated event of that player is tagged');
});

test('S3: mulligan blur covers every #game layer and body atmosphere, not the selection',()=>{
 const css=fs.readFileSync(new URL('./mulligan.css',import.meta.url),'utf8');
 assert.match(css,/#game\.is-obscured>\*/);assert.match(css,/\.formation-fog-canvas/);
 const blurRule=css.slice(css.indexOf('#game.is-obscured>*'),css.indexOf('filter:blur(8px)',css.indexOf('#game.is-obscured>*')));
 assert.ok(!/#mulligan-cards|#mulligan-controls|#visual-layer/.test(blurRule),'selection and flights stay sharp');
});

// Behavioral regression with the real queueEvents and invalidation functions of app.js.
const between=(start,end)=>app.slice(app.indexOf(start),app.indexOf(end,app.indexOf(start)+start.length));
function presentation(){
 const code=[source,between('function finishMatchPresentation(){','const publicCreatureEntries='),between('function queueEvents(){','function combatPlacements(')].join('\n');
 const c={played:[],console,serverClockOffset:0,visualGeneration:0,visualMatchKey:null,lastVisualId:0,visualBooted:false,matchEffectsEnded:false,visualQueue:Promise.resolve(),noticeQueue:Promise.resolve(),pendingArrival:[],handOrder:[],lastBattleStep:'',autoMulliganKey:'',selected:null,pendingSnap:null,state:null,
  document:{querySelectorAll:()=>[]},$:()=>null,resetDamagePresentation(){},clearTableEffects(){},syncAttackDisplay(){},syncHealthDisplay(){},renderBoard(){},speechBubble(){},setTimeout};
 for(const name of new Set([...code.matchAll(/\b(\w+)\.clear\(\)/g)].map(m=>m[1])))if(!['mulliganReplacementsDue','openingReplacementDraws'].includes(name))c[name]=new Set();
 vm.createContext(c);installArrivals(c);vm.runInContext(code+'\nthis.marks=openingReplacementDraws;this.mark=replacementMark;',c);
 // Same consumption as animateEvent's draw branch (asserted against the source below).
 c.animateEvent=async(event,generation)=>{if(event.type==='draw')c.played.push({room:c.state.code,id:event.id,opening:c.marks.delete(c.mark(generation,event.id))});};
 return c;
}
const roomView=(room,player,extra={})=>({code:room.code,you:player.id,matchId:room.matchId,phase:room.phase,events:room.events.slice(),eventId:room.events.at(-1)?.id,...extra});
const drain=async c=>{await new Promise(r=>setTimeout(r,20));await c.visualQueue;};

test('S3: animateEvent consumes the generation-bound mark and every invalidation clears marks',()=>{
 assert.match(app,/openingReplacementDraws\.delete\(replacementMark\(generation,event\.id\)\)\?\{presentation:'opening'\}/);
 for(const fn of ['function finishMatchPresentation(){','function resetVisualSession(){','function recoverVisualGap(){'])assert.match(between(fn,'\nfunction '),/visualGeneration\+\+;clearMulliganReplacements\(\)/,fn);
});

for(const invalidation of ['resetVisualSession','recoverVisualGap','finishMatchPresentation'])test(`S3: replacements interrupted by ${invalidation} never leak into another room with coinciding ids`,async()=>{
 const c=presentation(),first=match('S3MUL1');c.state=roomView(first.room,first.a);c.resetVisualSession();c.queueEvents();// boot
 let hold;c.visualQueue=new Promise(r=>hold=r);// replacements stay queued
 act(first.room,first.a,{type:'mulligan',cardIds:first.a.hand.slice(0,3).map(x=>x.uid)},catalog);c.state=roomView(first.room,first.a);c.queueEvents();
 assert.equal(c.marks.size,3,'replacements tagged while pending');
 if(invalidation==='recoverVisualGap'){c.state={...c.state,eventsFrom:c.lastVisualId+5};c.recoverVisualGap();}else if(invalidation==='finishMatchPresentation')c.finishMatchPresentation();
 if(invalidation!=='resetVisualSession')assert.equal(c.marks.size,0,'invalidation drops pending marks');
 const second=match('S3MUL2');// same engine => same numeric event ids
 const mark=lastId(second.room);act(second.room,second.a,{type:'confirmMulligan'},catalog);act(second.room,second.b,{type:'confirmMulligan'},catalog);
 const normal=since(second.room,mark).filter(e=>e.type==='draw');assert.ok(normal.length>=1);
 assert.ok(normal.some(e=>since(first.room,0).some(f=>f.id===e.id)),'ids coincide across rooms');
 c.state=roomView(second.room,second.a,{events:second.room.events.filter(e=>e.id<=mark),eventId:mark});c.resetVisualSession();c.matchEffectsEnded=false;c.visualBooted=true;c.lastVisualId=mark;
 assert.equal(c.marks.size,0,'no marks survive entering another room');
 c.state=roomView(second.room,second.a);c.queueEvents();hold();await drain(c);
 const played=c.played.filter(p=>p.room==='S3MUL2');assert.deepEqual(played.map(p=>p.id),normal.map(e=>e.id));assert.ok(played.every(p=>!p.opening),'normal draws keep the normal profile');
});

test('S3: phase changing before the real queue drains keeps the replacement profile only for replacements',async()=>{
 const c=presentation(),{room,a,b}=match();c.state=roomView(room,a);c.resetVisualSession();c.queueEvents();
 let hold;c.visualQueue=new Promise(r=>hold=r);act(room,a,{type:'mulligan',cardIds:a.hand.map(x=>x.uid)},catalog);c.state=roomView(room,a);c.queueEvents();
 const mark=lastId(room);act(room,a,{type:'confirmMulligan'},catalog);act(room,b,{type:'confirmMulligan'},catalog);c.state=roomView(room,a);assert.equal(c.state.phase,'prep');c.queueEvents();
 hold();await drain(c);
 const prep=new Set(since(room,mark).filter(e=>e.type==='draw').map(e=>e.id));assert.ok(prep.size>=1);
 assert.equal(c.played.filter(p=>p.opening).length,5);assert.ok(c.played.filter(p=>prep.has(p.id)).every(p=>!p.opening));assert.equal(c.marks.size,0);
});
