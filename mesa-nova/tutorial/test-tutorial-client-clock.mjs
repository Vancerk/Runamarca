import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('combat display freezes through long pauses and resumes without replaying earlier steps',()=>{
 const source=fs.readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const clock=source.slice(source.indexOf('let combatClock='),source.indexOf('function tickCombat('));
 let wall=1_000;const state={tutorial:{clock:{paused:false,epoch:0,now:1_000}}};
 const context={state,serverClockOffset:0,Date:{now:()=>wall}};vm.createContext(context);vm.runInContext(clock,context);
 const battle={id:'battle',startedAt:500};assert.equal(context.combatElapsed(battle),500);
 wall=1_100;assert.equal(context.combatElapsed(battle),600);
 state.tutorial.clock={paused:true,epoch:1,now:1_080};assert.equal(context.combatElapsed(battle),600,'late pause acknowledgement must not replay already displayed moments');
 wall+=300_000;context.serverClockOffset=wall-1_080;assert.equal(context.combatElapsed(battle),600);
 state.tutorial.clock={paused:false,epoch:2,now:1_080};assert.equal(context.combatElapsed(battle),600);
 wall+=120;context.serverClockOffset+=20;assert.equal(context.combatElapsed(battle),700,'resume uses the new clock epoch instead of old minimum offset');
 context.serverClockOffset+=500;assert.equal(context.combatElapsed(battle),700,'jitter cannot move backwards');
 assert.equal(context.combatElapsed({id:'next',startedAt:wall-context.serverClockOffset}),0,'next combat starts fresh');
});

test('mulligan does not send openingReady while paused, including a pause during the animation wait',async()=>{
 const source=fs.readFileSync(new URL('./mulligan-clock.js',import.meta.url),'utf8');
 let tick,release,commands=0;const player={mulliganReady:false,mulliganStartedAt:null};
 const state={phase:'mulligan',spectator:false,matchId:'m',tutorial:{clock:{paused:true,now:100}},turnClock:{endsAt:1000}};
 const context={state,seat:()=>player,document:{getElementById:()=>null},patronIntroActive:false,commandBusy:false,
  visualGeneration:0,visualQueue:Promise.resolve(),command:async()=>commands++,setInterval:fn=>tick=fn};
 vm.createContext(context);vm.runInContext(source,context);
 await tick();assert.equal(commands,0);
 state.tutorial.clock.paused=false;context.visualQueue=new Promise(resolve=>release=resolve);const waiting=tick();state.tutorial.clock.paused=true;release();await waiting;assert.equal(commands,0);
 state.tutorial.clock.paused=false;await tick();assert.equal(commands,1);
});

test('paused mulligan shows its state without urgency or a false timeout countdown',async()=>{
 const source=fs.readFileSync(new URL('./mulligan-clock.js',import.meta.url),'utf8');let tick;const classes=[];
 const node={hidden:false,textContent:'',classList:{toggle:(name,value)=>classes.push([name,value])}};
 const state={phase:'mulligan',tutorial:{clock:{paused:true,now:500}},turnClock:{endsAt:1000}};
 const context={state,seat:()=>({mulliganReady:false,mulliganStartedAt:100}),document:{getElementById:()=>node},
  patronIntroActive:false,commandBusy:false,serverClockOffset:0,Date:{now:()=>900_000},setInterval:fn=>tick=fn};
 vm.createContext(context);vm.runInContext(source,context);await tick();assert.equal(node.textContent,'Tutorial pausado');assert.equal(node.hidden,false);assert.deepEqual(classes.at(-1),['urgent',false]);
});
