import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeRoom,join,act,view,expireTurn,resolveCombat} from './game.mjs';
import {syncTurnClock} from './turn-clock.mjs';
import {createTutorialSession,TUTORIAL_DUELS} from './tutorial-session.mjs';
import {createBotScheduler} from './bot-scheduler.mjs';
import {enableRoomTimeline,roomNow,roomIsPaused,roomTimelineView,setRoomTimeout,clearRoomTimeout,
  pauseRoomTimeline,resumeRoomTimeline,disposeRoomTimeline} from './room-timeline.mjs';

const catalog=JSON.parse(fs.readFileSync(new URL('./cartas.json',import.meta.url)));
function fakeTime(){
  let now=1_000_000,serial=0;const pending=new Map();
  return {now:()=>now,setTimeout(callback,delay){const id=++serial;pending.set(id,{at:now+delay,callback});return id;},
    clearTimeout:id=>pending.delete(id),get count(){return pending.size;},
    tick(ms){const end=now+ms;let limit=10_000;while(true){const next=[...pending].filter(([,job])=>job.at<=end).sort((a,b)=>a[1].at-b[1].at||a[0]-b[0])[0];if(!next)break;if(!--limit)throw Error('Timer loop');pending.delete(next[0]);now=next[1].at;next[1].callback();}now=end;}};
}
function setup(duel=1,{onChange}={}){
  const time=fakeTime(),room=makeRoom('TUTEST','Aprendiz'),player=room.players[0],npc=join(room,'NPC');npc.bot=true;
  room.onChange=onChange;
  const session=createTutorialSession({room,player,catalog,duel,clock:time});
  Object.assign(room,{phase:'prep',round:1,first:player.id,turn:player.id,preparationsDone:0,matchId:'test-tutorial',combatCount:0});
  for(const p of room.players)Object.assign(p,{mana:10,manaMax:10,deckData:catalog.decks[0],
    patron:{hp:16,maxHp:16,powers:structuredClone(catalog.decks[0].patron.powers),usedPowers:{}},
    deck:Array.from({length:10},(_,i)=>({uid:p.id+'-draw-'+i,id:'draw',type:'spell',name:'Compra de teste',cost:1,effects:[]}))});
  let serial=0;
  const send=(action,id='request-'+(++serial),version=session.view().tutorial.version)=>session.command(player,{id,version,action});
  return {time,room,player,npc,session,send};
}
const creature=(p,id='creature')=>({uid:id,id:'test-card',modelId:'test-card',owner:p.id,name:'Criatura de teste',type:'creature',cost:2,attack:2,health:4,damage:0,attackMod:0,effects:[]});
const done=(s,id)=>s.view().tutorial.goals.find(goal=>goal.id===id)?.complete===true;
function formation(f){f.room.phase='vote';f.room.turn=null;f.player.vote=f.npc.vote=null;f.player.ready=f.npc.ready=false;f.send({type:'vote',fight:true});}
function resolve(f){f.session.npcAction({type:'ready'});assert.equal(f.room.phase,'resolving');f.time.tick(f.room.combat.duration+1);}
const microtasks=async()=>{for(let i=0;i<6;i++)await Promise.resolve();};

test('logical time: pause/resume preserves remaining time, cancellation and exactly-once callbacks',()=>{
 const time=fakeTime(),room={};enableRoomTimeline(room,time);const begin=roomNow(room);let fired=0;
 setRoomTimeout(room,()=>fired++,100);const cancelled=setRoomTimeout(room,()=>fired+=100,80);clearRoomTimeout(room,cancelled);
 time.tick(30);assert.equal(pauseRoomTimeline(room),true);assert.equal(pauseRoomTimeline(room),false);time.tick(300_000);
 assert.equal(roomNow(room),begin+30);assert.equal(fired,0);assert.equal(time.count,0);
 assert.equal(resumeRoomTimeline(room),true);assert.equal(resumeRoomTimeline(room),false);time.tick(69);assert.equal(fired,0);time.tick(1);assert.equal(fired,1);time.tick(500);assert.equal(fired,1);
 disposeRoomTimeline(room);assert.throws(()=>resumeRoomTimeline(room),/encerrado/);
});

test('normal rooms cannot pause and retain wall-clock behavior',()=>{
 const room=makeRoom('NORMAL','Jogador');assert.equal(roomTimelineView(room),null);assert.equal(roomIsPaused(room),false);
 assert.ok(Math.abs(roomNow(room)-Date.now())<100);assert.throws(()=>pauseRoomTimeline(room),/não permite/);
});

test('preparation remains frozen past expiry, including direct engine and NPC entry points',()=>{
 const f=setup();try{
  syncTurnClock(f.room,expireTurn);const deadline=f.room.turnClock.endsAt;f.time.tick(10_000);f.send({type:'tutorialPause'});const at=f.session.view().serverNow;
  f.time.tick(180_000);assert.equal(f.session.view().serverNow,at);assert.equal(f.room.turnClock.endsAt,deadline);assert.equal(f.room.turn,f.player.id);
  assert.equal(expireTurn(f.room,deadline+1),false);assert.throws(()=>act(f.room,f.player,{type:'endPrep'},catalog),e=>e.code==='TUTORIAL_PAUSED');
  assert.throws(()=>f.session.npcAction({type:'endPrep'}),e=>e.code==='TUTORIAL_PAUSED');assert.equal(f.room.preparationsDone,0);
  f.send({type:'tutorialResume'});f.time.tick(49_999);assert.equal(f.room.turn,f.player.id);f.time.tick(1);assert.equal(f.room.turn,f.npc.id);assert.equal(f.room.preparationsDone,1);
 }finally{f.session.dispose();}
});

test('mulligan presentation and the personal 45-second deadline both pause',()=>{
 const time=fakeTime(),room=makeRoom('MULLIG','Aprendiz'),player=room.players[0],npc=join(room,'NPC');npc.bot=true;
 const session=createTutorialSession({room,player,catalog,duel:2,clock:time});let n=0;const send=action=>session.command(player,{id:'m'+(++n),version:session.view().tutorial.version,action});
 try{
  act(room,player,{type:'deck',deckId:catalog.decks[0].id},catalog);act(room,npc,{type:'deck',deckId:catalog.decks[1].id},catalog);assert.equal(room.phase,'mulligan');
  const presentation=room.mulliganPresentationEndsAt;send({type:'tutorialPause'});time.tick(500_000);assert.equal(room.phase,'mulligan');assert.equal(room.mulliganPresentationEndsAt,presentation);
  send({type:'tutorialResume'});send({type:'openingReady'});const until=session.view().turnClock.endsAt;
  time.tick(5_000);send({type:'tutorialPause'});time.tick(300_000);assert.equal(session.view().turnClock.endsAt,until);assert.equal(player.mulliganReady,false);
  send({type:'tutorialResume'});time.tick(39_999);assert.equal(player.mulliganReady,false);time.tick(1);assert.equal(player.mulliganReady,true);
 }finally{session.dispose();}
});

test('combat callbacks, progressive secrecy, damage and committed progress stop together',()=>{
 const f=setup();try{
  f.player.hand=[creature(f.player)];f.send({type:'play',cardId:'creature'});formation(f);f.send({type:'assign',cardId:'creature',lane:2});f.send({type:'ready'});f.session.npcAction({type:'ready'});
  assert.equal(f.room.phase,'resolving');f.time.tick(100);f.send({type:'tutorialPause'});const before=f.session.view(),hp=f.npc.patron.hp,duration=f.room.combat.duration;
  f.time.tick(300_000);resolveCombat(f.room);const after=f.session.view();assert.equal(f.room.combatCount,0);assert.equal(f.npc.patron.hp,hp);assert.equal(after.combat.revealStage,before.combat.revealStage);assert.equal(done(f.session,'resolve-combat'),false);
  f.send({type:'tutorialResume'});f.time.tick(duration-101);assert.equal(f.room.combatCount,0);f.time.tick(1);assert.equal(f.room.combatCount,1);assert.equal(f.npc.patron.hp,hp-2);assert.equal(done(f.session,'resolve-combat'),true);
 }finally{f.session.dispose();}
});

test('all three legal houses complete the first formation objective',()=>{
 for(const lane of [0,1,2]){const f=setup();try{
  f.player.hand=[creature(f.player)];f.send({type:'play',cardId:'creature'});formation(f);
  assert.throws(()=>f.send({type:'ready'}),e=>e.code==='TUTORIAL_PARTICIPATE');f.send({type:'assign',cardId:'creature',lane});f.send({type:'ready'});assert.equal(done(f.session,'confirm-formation'),true);
  resolve(f);formation(f);f.player.formation=[null,null,null];assert.doesNotThrow(()=>f.send({type:'ready'}),'empty confirmation is no longer restricted after the first exercise');
 }finally{f.session.dispose();}}
});

test('no eligible creature does not trap the player or falsely complete the formation lesson',()=>{
 const f=setup();try{formation(f);assert.doesNotThrow(()=>f.send({type:'ready'}));assert.equal(done(f.session,'confirm-formation'),false);}finally{f.session.dispose();}
 const second=setup(2);try{second.player.reserve=[creature(second.player)];formation(second);assert.doesNotThrow(()=>second.send({type:'ready'}));}finally{second.session.dispose();}
});

test('rejected actions, foreign actors and invented completion commands do not grant progress',()=>{
 const f=setup();try{
  f.player.hand=[creature(f.player)];f.player.mana=0;const before=f.session.checkpoint();assert.throws(()=>f.send({type:'play',cardId:'creature'}),/Mana|mana/);assert.equal(done(f.session,'play-creature'),false);
  assert.throws(()=>f.session.command(f.npc,{id:'alien',version:0,action:{type:'tutorialPause'}}),e=>e.code==='TUTORIAL_OWNER');
  assert.throws(()=>f.session.view({...f.player}),e=>e.code==='TUTORIAL_OWNER');assert.throws(()=>f.send({type:'tutorialComplete',goal:'win'}));assert.deepEqual(f.session.checkpoint().completed,before.completed);
 }finally{f.session.dispose();}
});

test('request receipts are idempotent; conflicting and stale commands cannot spend again',()=>{
 const f=setup();try{
  f.player.hand=[creature(f.player)];const request={id:'once',version:0,action:{type:'play',cardId:'creature'}};
  f.session.command(f.player,request);const mana=f.player.mana;f.send({type:'tutorialPause'});const version=f.session.view().tutorial.version;
  const replay=f.session.command(f.player,request);assert.equal(replay.replayed,true);assert.equal(replay.state.tutorial.version,version);assert.equal(f.player.mana,mana);assert.equal(f.player.reserve.length,1);
  assert.throws(()=>f.session.command(f.player,{...request,action:{type:'endPrep'}}),e=>e.code==='TUTORIAL_CONFLICT');
  assert.throws(()=>f.session.command(f.player,{id:'old',version:0,action:{type:'tutorialResume'}}),e=>e.code==='TUTORIAL_STALE');assert.equal(roomIsPaused(f.room),true);
 }finally{f.session.dispose();}
});

test('prepared magic is completed only after actual activation, not merely placed or predicted',()=>{
 const f=setup(2);try{
  const model=catalog.decks.flatMap(deck=>deck.cards).find(c=>c.type==='prepared_spell'&&c.positionOnly&&c.effects?.some(e=>e.op==='attack_modifier'));
  assert.ok(model,'the test uses an executable catalogue spell');const spell={...structuredClone(model),uid:'prepared-test',owner:f.player.id};f.player.hand=[spell];
  f.send({type:'play',cardId:spell.uid,mode:'lane',targetSide:f.npc.id,lane:1});assert.equal(done(f.session,'prepare-spell'),true);assert.equal(done(f.session,'activate-prepared'),false);
  formation(f);f.send({type:'ready'});resolve(f);assert.equal(done(f.session,'activate-prepared'),false,'empty lane did not activate');assert.ok(f.player.prepared.some(p=>p.card.uid===spell.uid));
  f.npc.reserve=[creature(f.npc,'target')];formation(f);f.session.npcAction({type:'assign',cardId:'target',lane:1});f.send({type:'ready'});f.session.npcAction({type:'ready'});
  assert.equal(done(f.session,'activate-prepared'),false,'animation preview is not committed evidence');f.time.tick(f.room.combat.duration+1);assert.equal(done(f.session,'activate-prepared'),true);
 }finally{f.session.dispose();}
});

test('the executable direct_spell type advances the direct lesson only after payment and effect',()=>{
 const f=setup(2);try{
  const model=catalog.decks.flatMap(deck=>deck.cards).find(c=>c.id==='FL10');assert.ok(model);assert.equal(model.type,'direct_spell');
  const card={...structuredClone(model),uid:'direct-test',owner:f.player.id};const target=creature(f.player);f.player.reserve=[target];f.player.hand=[card];
  const mana=f.player.mana,hp=target.health;f.send({type:'play',cardId:card.uid,mode:'direct',targetId:target.uid});
  assert.equal(done(f.session,'direct-spell'),true);assert.equal(f.player.mana,mana-card.cost);assert.equal(target.health,hp+1);
 }finally{f.session.dispose();}
});

test('allied prepared spell visibility remains card-specific while paused',()=>{
 const f=setup(2);try{
  f.player.prepared=[{card:{uid:'open',name:'Aberta'},lane:0,targetSide:f.player.id,hidden:false},{card:{uid:'hidden',name:'Oculta'},lane:1,targetSide:f.player.id,hidden:true}];
  f.send({type:'tutorialPause'});const own=f.session.view().players.find(p=>p.id===f.player.id).prepared;
  const rival=view(f.room,f.npc).players.find(p=>p.id===f.player.id).prepared;
  assert.equal(own[1].card.uid,'hidden');assert.equal(rival[0].card.uid,'open');assert.equal(rival[1].card,null);assert.equal(rival[1].hidden,true);
 }finally{f.session.dispose();}
});

test('an in-flight NPC result from before a pause is discarded, including after resume',async()=>{
 const f=setup();let answer,applied=0,cleared=0;const bridge={nextAction:()=>new Promise(resolve=>answer=resolve),clear:()=>cleared++};
 const schedule=createBotScheduler({bridge,isActive:()=>f.session.view().tutorial.status==='active',act:()=>applied++});
 try{
  schedule(f.room);f.time.tick(700);assert.equal(f.room.botThinking,true);f.send({type:'tutorialPause'});f.send({type:'tutorialResume'});answer({type:'endPrep'});await microtasks();assert.equal(applied,0);assert.equal(cleared,1);assert.equal(f.room.botThinking,false);
 }finally{f.session.dispose();}
});

test('an in-flight NPC failure from before a pause cannot interrupt the resumed tutorial',async()=>{
 const f=setup();let failure,reported=0;const bridge={nextAction:()=>new Promise((_,reject)=>failure=reject),clear:()=>{}};
 const schedule=createBotScheduler({bridge,isActive:()=>true,act:()=>{},onFailure:()=>reported++});
 try{schedule(f.room);f.time.tick(700);f.send({type:'tutorialPause'});f.send({type:'tutorialResume'});failure(Error('old failure'));await microtasks();assert.equal(reported,0);assert.equal(f.room.log.some(x=>x.message.includes('Bot interrompido')),false);}finally{f.session.dispose();}
});

test('exiting cancels owned timers and rejects a late NPC response without restarting work',async()=>{
 const f=setup();let answer,applied=0;const bridge={nextAction:()=>new Promise(resolve=>answer=resolve),clear:()=>{}};
 const schedule=createBotScheduler({bridge,isActive:()=>true,act:()=>applied++});
 schedule(f.room);f.time.tick(700);f.send({type:'tutorialExit'});answer({type:'endPrep'});await microtasks();f.time.tick(600_000);
 assert.equal(applied,0);assert.equal(f.time.count,0);assert.equal(f.session.view().tutorial.status,'exited');assert.equal(f.room.phase,'finished');assert.throws(()=>f.send({type:'tutorialResume'}),e=>e.code==='TUTORIAL_FINISHED');
});

test('three agreed roles remain provisional, with contextual help in the third duel',()=>{
 assert.deepEqual(TUTORIAL_DUELS.map(d=>d.id),[1,2,3]);assert.equal(TUTORIAL_DUELS[2].guidance,'contextual');
 const f=setup(3);try{const checkpoint=JSON.stringify(f.session.checkpoint());assert.ok(!checkpoint.includes(f.player.token));assert.ok(!checkpoint.includes(f.npc.token));assert.equal(f.session.view().players.find(p=>p.id===f.npc.id).hand,undefined);}finally{f.session.dispose();}
});

test('resuming publishes a change and restarts an NPC whose old response was discarded during the pause',async()=>{
 let schedule,answer,calls=0,applied=0;
 const f=setup(1,{onChange:()=>schedule?.(f.room)});
 const bridge={nextAction:()=>++calls===1?new Promise(resolve=>answer=resolve):Promise.resolve(calls===2?{type:'endPrep'}:null),clear:()=>{}};
 schedule=createBotScheduler({bridge,isActive:()=>f.session.view().tutorial.status==='active',act:()=>applied++});
 try{
  schedule(f.room);f.time.tick(700);f.send({type:'tutorialPause'});answer({type:'endPrep'});await microtasks();assert.equal(applied,0);assert.equal(f.room.botThinking,false);
  f.send({type:'tutorialResume'});f.time.tick(700);await microtasks();assert.equal(calls,2);assert.equal(applied,1);
 }finally{f.session.dispose();}
});

test('Emanação uses the catalogue, charges the card on entry and one mana when transferring',()=>{
 const f=setup(3);try{
  const model=catalog.decks.flatMap(deck=>deck.cards).find(c=>c.type==='creature'&&c.effects?.some(e=>String(e.timing).includes('emanat')));
  assert.ok(model);const card={...structuredClone(model),uid:'emana-test',owner:f.player.id,damage:0,attackMod:0};f.player.hand=[card];const mana=f.player.mana;
  f.send({type:'play',cardId:card.uid,mode:'emanate'});assert.equal(done(f.session,'emanation'),true);assert.equal(f.player.mana,mana-card.cost);assert.ok(f.player.emanation.includes(card.uid));
  f.send({type:'emanate',cardId:card.uid});assert.equal(f.player.mana,mana-card.cost-1);assert.equal(f.player.emanation.includes(card.uid),false);
 }finally{f.session.dispose();}
});

test('the five-second formation priority stays intact across a long tutorial pause',()=>{
 const f=setup();try{
  const model=catalog.decks.flatMap(deck=>deck.cards).find(c=>c.type==='creature'&&c.effects?.some(e=>e.op==='force_opponent'));
  assert.ok(model);f.player.reserve=[{...structuredClone(model),uid:'priority',owner:f.player.id,damage:0,attackMod:0}];f.npc.reserve=[creature(f.npc,'rival')];formation(f);
  assert.ok(f.room.forceWindow);f.time.tick(2000);f.send({type:'tutorialPause'});const left=f.room.forceWindow.until-roomNow(f.room);f.time.tick(300_000);assert.equal(f.room.forceWindow.until-roomNow(f.room),left);
  f.send({type:'tutorialResume'});assert.throws(()=>f.session.npcAction({type:'assign',cardId:'rival',lane:0}),/prioridade/);
  f.time.tick(3000);assert.doesNotThrow(()=>f.session.npcAction({type:'assign',cardId:'rival',lane:0}));
 }finally{f.session.dispose();}
});

test('a real Patron power is a separate successful action from entering Emanação',()=>{
 const f=setup(3);try{
  const deck=catalog.decks.find(d=>d.affinity==='forja');f.player.patron.powers=structuredClone(deck.patron.powers);
  assert.equal(done(f.session,'patron-power'),false);f.send({type:'patronPower',powerId:'forjar-armadura'});
  assert.equal(done(f.session,'patron-power'),true);assert.equal(done(f.session,'emanation'),false);
 }finally{f.session.dispose();}
});

test('winning and retry status follow actual combat; victory does not fabricate unobserved lessons',()=>{
 for(const learnerWins of [true,false]){const f=setup(2);try{
  const attacker=learnerWins?f.player:f.npc,loser=learnerWins?f.npc:f.player;loser.patron.hp=1;attacker.reserve=[creature(attacker,'attacker')];
  formation(f);
  if(learnerWins)f.send({type:'assign',cardId:'attacker',lane:2});else f.session.npcAction({type:'assign',cardId:'attacker',lane:2});
  f.send({type:'ready'});resolve(f);assert.equal(f.session.view().tutorial.status,learnerWins?'won':'retry');assert.equal(done(f.session,'win'),learnerWins);assert.equal(done(f.session,'direct-spell'),false);
 }finally{f.session.dispose();}}
});

test('an existing match cannot be converted into a tutorial or have its clock changed',()=>{
 const room=makeRoom('EXISTS','Aprendiz'),player=room.players[0],npc=join(room,'NPC');npc.bot=true;room.phase='prep';room.matchId='already-running';
 assert.throws(()=>createTutorialSession({room,player,catalog}),e=>e.code==='TUTORIAL_ROOM');assert.equal(room.simulation,undefined);assert.equal(roomTimelineView(room),null);assert.equal(room.matchId,'already-running');
});
