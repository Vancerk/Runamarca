import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,card,unit,cast,act,view,catalog} from './r1-fixtures.mjs';
function fixture(n=1,mode='lane'){
 const {room,a,b}=setup(),enemy=unit(b);b.reserve.push(enemy);
 const sources=Array.from({length:n},()=>{const source=card('FV03',a);cast(room,a,source,{mode:'emanate'});return source;});
 const spell=card(mode==='lane'?'FV02':'FV08',a);cast(room,a,spell,mode==='lane'?{mode,lane:0,targetSide:b.id}:{});
 const skip=source=>act(room,a,{type:'apprenticeSkip',cardId:source.uid,round:room.round},catalog);
 return {room,a,b,enemy,sources,spell,skip};
}
test('decline preserves committed prepared spell, payment, privacy and first-spell usage',()=>{
 const {room,a,b,enemy,sources,spell,skip}=fixture(),mana=a.mana,events=room.events.length;
 skip(sources[0]);assert.equal(a.apprenticeQueue.length,0);assert.equal(enemy.damage,0);assert.equal(a.mana,mana);assert.equal(room.events.length,events);assert.equal(a.prepared[0].card.uid,spell.uid);assert.equal(a.firstSpellRound,room.round);
 assert.equal(view(room,b).players.find(p=>p.id===b.id).prepared[0].card,null);
 assert.deepEqual(view(room,b).players.find(p=>p.id===a.id).pendingApprenticeSources,[]);
 cast(room,a,card('FV08',a));assert.equal(a.apprenticeQueue.length,0);act(room,a,{type:'endPrep'},catalog);
});
test('decline after direct spell retains its resolved effects and discard',()=>{
 const {room,a,enemy,sources,spell,skip}=fixture(1,'direct'),snapshot=JSON.stringify({discard:a.discard,mana:a.mana,enemy});
 skip(sources[0]);assert.ok(a.discard.includes(spell));assert.equal(JSON.stringify({discard:a.discard,mana:a.mana,enemy}),snapshot);
});
test('two sources: wrong, stale and repeated cancellation cannot consume another shot',()=>{
 const {room,a,sources,skip}=fixture(2);
 assert.throws(()=>skip(sources[1]),/pendente/);assert.equal(a.apprenticeQueue.length,2);
 assert.throws(()=>act(room,a,{type:'apprenticeSkip',cardId:sources[0].uid,round:room.round-1},catalog),/pendente/);
 skip(sources[0]);assert.equal(a.apprenticeQueue.length,1);assert.throws(()=>skip(sources[0]),/pendente/);assert.equal(a.apprenticeQueue.length,1);skip(sources[1]);assert.equal(a.apprenticeQueue.length,0);
});
test('other player and wrong phase cannot decline owner shot',()=>{
 const {room,a,b,sources}=fixture(),data={type:'apprenticeSkip',cardId:sources[0].uid,round:room.round};
 assert.throws(()=>act(room,b,data,catalog));assert.equal(a.apprenticeQueue.length,1);
 room.phase='formation';assert.throws(()=>act(room,a,data,catalog));assert.equal(a.apprenticeQueue.length,1);
});
test('resolving normally still applies one damage and consumes queue',()=>{
 const {room,a,enemy,sources,skip}=fixture();act(room,a,{type:'apprenticeTarget',cardId:sources[0].uid,targetId:enemy.uid},catalog);assert.equal(enemy.damage,1);assert.equal(a.apprenticeQueue.length,0);assert.throws(()=>skip(sources[0]),/pendente/);
});
