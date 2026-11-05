import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,card,view} from './r1-fixtures.mjs';
test('each third discloses only reached positions, to both players and spectator',()=>{
 const {room,a,b}=setup();
 for(const p of [a,b])for(let lane=0;lane<3;lane++){const c=card('FV03',p);p.reserve.push(c);p.formation[lane]=c.uid;}
 const hidden=card('FV02',a);a.prepared.push({card:hidden,lane:2,targetSide:b.id,hidden:true});
 room.phase='resolving';room.combat={id:'battle',round:4,startedAt:0,duration:9999,timeline:[{kind:'reveal',duration:1200},{kind:'magic',duration:2500,spell:{name:'SECRET',card:hidden}}],visual:[{private:'SECRET'}],spells:[hidden],casualties:[b.formation[2]]};
 const spectator={id:'watcher'};room.spectators.push(spectator);
 const original=Date.now;
 try{
 for(const ms of [0,1,199,200,201,599,600,601,999,1000,1001,1200]){
  Date.now=()=>ms;const stage=Math.min(3,Math.floor(ms/400+.5));
  for(const viewer of [a,b,spectator]){
   const result=view(room,viewer);
   for(const p of [a,b])assert.deepEqual(result.players.find(x=>x.id===p.id).formation,p.formation.map((uid,i)=>viewer===p||i<stage?uid:null));
   if(stage<3){assert.equal(result.combat.timeline.length,1);assert.equal(result.combat.duration,1200);assert.equal(JSON.stringify(result.combat).includes('SECRET'),false);assert.deepEqual(result.combat.visual,[]);if(viewer!==a)assert.equal(result.players.find(x=>x.id===b.id).prepared[0].card,null);}
   else assert.equal(result.combat.timeline.length,2);
  }
 }
 }finally{Date.now=original;}
});
test('public anchored creatures and own formation retain their visibility',()=>{
 const {room,a,b}=setup();const c=card('FV03',b);c.anchor=true;b.reserve.push(c);b.formation[2]=c.uid;room.phase='resolving';room.combat={id:'b',startedAt:Date.now(),timeline:[{kind:'reveal',duration:1200}]};
 const result=view(room,a);assert.equal(result.players[1].formation[2],c.uid);assert.equal(result.players[1].revealPending.includes(2),false);
});
