import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {scenario,verifyScenario,changes} from './cenario-balanceamento-rodada2.mjs';
const root=process.cwd(),originalSource=await fs.readFile(path.join(root,'mesa-nova/game.mjs'),'utf8'),catalogText=await fs.readFile(path.join(root,'mesa-nova/cartas.json'),'utf8');
const variant=process.argv[2]||'nova';assert.ok(['atual','protegida','nova'].includes(variant));
const dualArea=variant==='nova',immuneEmana=variant!=='atual';
const {source,catalog}=scenario(originalSource,JSON.parse(catalogText),dualArea,immuneEmana);
const hash=text=>createHash('sha256').update(text).digest('hex');
function rng(seed){let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
async function engine(seed){
 const random=rng(seed),timers=[];let clock=0,uid=0;
 class Clock extends Date {static now(){return clock;}}
 const context=vm.createContext({Buffer,structuredClone,Date:Clock,console,setTimeout:(fn,delay)=>{timers.push({fn,delay});return timers.length;}});
 const module=new vm.SourceTextModule(source,{context,identifier:'original-game.mjs'});
 await module.link(async specifier=>{
  if(specifier==='node:crypto')return new vm.SyntheticModule(['randomBytes','randomUUID'],function(){this.setExport('randomBytes',n=>{const b=Buffer.alloc(n);for(let i=0;i<n;i++)b[i]=Math.floor(random()*256);return b;});this.setExport('randomUUID',()=>`${seed}-${++uid}`);},{context});
  if(specifier==='../accounts.mjs')return new vm.SyntheticModule(['beginMatch'],function(){this.setExport('beginMatch',()=>{});},{context});
  throw Error('Unexpected dependency: '+specifier);
 });await module.evaluate();
 return{...module.namespace,timers,flush(){assert.equal(timers.length,1);const t=timers.shift();clock+=t.delay;t.fn();return t.delay;}};
}
const fx=c=>c.effects||[],live=c=>c&&c.damage<c.health,hp=c=>c.health-c.damage;
function baseAttack(c){return Math.max(0,c.attack+(c.attackMod||0));}
function combatAttack(c,direct){return Math.max(0,baseAttack(c)+fx(c).filter(e=>e.timing==='revelation'&&e.op==='attack_modifier'&&e.target==='self'&&(!e.condition||direct)).reduce((s,e)=>s+e.amount,0));}
function combatValue(c,direct){return combatAttack(c,direct)*1.3+hp(c)*.65+fx(c).filter(e=>e.timing==='revelation'&&e.op==='damage').reduce((s,e)=>s+e.amount*1.5,0);}
function kind(c){const e=fx(c)[0];return e?.op==='draw'?'self':e?.op==='area_damage'?'area':e?.op==='choose_one'?'either':['heal','attack_modifier'].includes(e?.op)&&e.target==='chosen_allied_creature'?'friendly':'enemy';}
function tacticalAction(snapshot,memory,random){
 const p=snapshot.players.find(x=>x.id===snapshot.you),enemy=snapshot.players.find(x=>x.id!==p.id),active=p.reserve.filter(c=>live(c)&&!p.emanation.includes(c.uid)),enemies=enemy.reserve.filter(live),choices=[];
 const add=(action,value,cost)=>{if(cost<=p.mana&&value>0)choices.push({action,score:value/(.8+cost*.65)+cost*.03});};
 const magicCost=c=>Math.max(1,c.cost-(!memory.direct?p.emanation.filter(id=>p.reserve.find(c=>c.uid===id)?.modelId==='M04').length:0));
 const wound=p.reserve.filter(c=>live(c)&&c.damage>0).sort((a,b)=>b.damage-a.damage||combatValue(b,true)-combatValue(a,true));
 for(const c of p.hand){
  if(c.type==='creature'){
   if(p.reserve.length>=8||c.cost>p.mana)continue;
   let value=combatValue(c,true);
   for(const e of fx(c).filter(e=>e.timing==='on_enter')){
    if(e.op==='summon')value+=Math.min(e.amount,7-p.reserve.length)*((e.attack||1)*1.3+(e.health||1)*.65);
    if(e.op==='draw')value+=Math.min(e.amount,10-p.hand.length)*1.7;
   }
   add({type:'play',cardId:c.uid},value,c.cost);
   if(p.emanation.length<2&&active.length>=2&&fx(c).some(e=>e.timing.includes('emanat'))){
    const utility=c.modelId==='R05'&&active.length>=3?4.7:c.modelId==='F03'&&wound.length?4.2:c.modelId==='M04'&&p.hand.filter(x=>x.type!=='creature').length>=2?4.7:0;
    add({type:'play',cardId:c.uid,mode:'emanate'},utility,c.cost);
   }
   continue;
  }
  const k=kind(c),e=fx(c)[0],cost=magicCost(c);
  if(c.type!=='prepared_spell'){
   if(k==='self'&&p.hand.length<=6)add({type:'play',cardId:c.uid,mode:'direct'},Math.min(e.amount,10-p.hand.length)*2.8,cost);
   if(k==='area'&&enemies.length){let v=0;const amount=e.direct_amount??e.amount;for(const target of enemies.filter(t=>!immuneEmana||!enemy.emanation.includes(t.uid)))v+=Math.min(amount,hp(target))*.45+(hp(target)<=amount?2+baseAttack(target)*.9:0);add({type:'play',cardId:c.uid,mode:'direct'},v,cost);}
   if(k==='friendly'||k==='either'){
    for(const target of p.reserve.filter(live)){
     const gain=Math.min(target.damage,e.amount||e.options?.find(o=>o.target==='chosen_allied_creature')?.amount||0);
     const value=e.op==='attack_modifier'?e.amount>0&&!p.emanation.includes(target.uid)?e.amount*1.35+(hp(target)>=3?.5:0):0:gain>0?gain*.9+(hp(target)<=2&&baseAttack(target)>=2?1:0):0;
     add({type:'play',cardId:c.uid,mode:'direct',targetId:target.uid},value,cost);
    }
    if(k==='either'&&p.patron.hp<=16)add({type:'play',cardId:c.uid,mode:'direct',targetId:'patron'},2.3+(p.patron.hp<=6?3:0),cost);
   }
   if(k==='enemy')for(const target of enemies){
    const amount=e.op==='conditional_damage'?(baseAttack(target)>=e.condition.gte?e.amount_if_true:e.amount_if_false):e.amount||0;
    const lethal=e.op==='defeat'||amount>=hp(target),value=lethal?2.5+baseAttack(target)*1.1+target.cost*.4+(e.draw_on_kill||0)*1.7:Math.min(amount,hp(target))*.5;
    add({type:'play',cardId:c.uid,mode:'direct',targetId:target.uid},value,cost);
   }
  }
  // A magia em area pode ser preparada. Avalia somente criaturas publicas;
  // nao conhece a formacao secreta efetivamente escolhida pelo rival.
  if(k==='area'&&c.cost<=p.mana){
   const occupied=enemy.prepared.filter(x=>x.caster===p.id).map(x=>x.lane),lanes=[0,1,2].filter(i=>!occupied.includes(i));
   const fighters=enemies.filter(t=>!enemy.emanation.includes(t.uid)),count=Math.min(3,fighters.length);
   if(lanes.length&&count){
    const targets=dualArea?[...fighters].sort((a,b)=>combatValue(b,true)-combatValue(a,true)).slice(0,3):enemies.filter(t=>!immuneEmana||!enemy.emanation.includes(t.uid));
    let value=0;for(const target of targets)value+=Math.min(e.amount,hp(target))*.45+(hp(target)<=e.amount?2+baseAttack(target)*.9:0);
    add({type:'play',cardId:c.uid,mode:'lane',lane:lanes[Math.floor(random()*lanes.length)],targetSide:enemy.id},value*count/3,c.cost);
   }
  }
  // Prepared-only text is honored even though the current server also accepts direct use.
  if(c.type==='prepared_spell'&&c.cost<=p.mana&&enemies.some(t=>!enemy.emanation.includes(t.uid))){
   const occupied=enemy.prepared.filter(x=>x.caster===p.id).map(x=>x.lane),lanes=[0,1,2].filter(i=>!occupied.includes(i));
   if(lanes.length){const fighters=enemies.filter(t=>!enemy.emanation.includes(t.uid)),count=Math.min(3,fighters.length);let v=0;for(const t of fighters){const amount=e.op==='conditional_damage'?(baseAttack(t)>=e.condition.gte?e.amount_if_true:e.amount_if_false):e.amount||0;v+=e.op==='attack_modifier'?Math.min(baseAttack(t),Math.abs(amount))*.85:Math.min(amount,hp(t))*.5+(amount>=hp(t)?2.5+baseAttack(t)*.8+t.cost*.3:0);}v=v/fighters.length+fx(c).filter(e=>e.op==='draw').reduce((s,e)=>s+e.amount*1.7,0);add({type:'play',cardId:c.uid,mode:'lane',lane:lanes[Math.floor(random()*lanes.length)],targetSide:enemy.id},v*count/3,c.cost);}
  }
 }
 for(const c of active){
  if(p.emanation.length>=2||memory.moved.has(c.uid)||!fx(c).some(e=>e.timing.includes('emanat')))continue;
  const utility=c.modelId==='R05'&&active.length>=4?2.7:c.modelId==='F03'&&active.length>=3&&wound.length?3:c.modelId==='M04'&&active.length>=3&&p.hand.filter(x=>x.type!=='creature').length>=2?3:0;
  add({type:'emanate',cardId:c.uid},utility,1);
 }
 choices.sort((a,b)=>b.score-a.score);
 if(choices[0]?.score>.2)return choices[0].action;
 const healTargets=p.emanation.filter(id=>p.reserve.find(c=>c.uid===id)?.modelId==='F03').map(()=>wound[0]?.uid||null);
 return{type:'endPrep',healTargetIds:healTargets};
}
function formation(snapshot,memory,random){
 const p=snapshot.players.find(x=>x.id===snapshot.you),enemy=snapshot.players.find(x=>x.id!==p.id);
 const available=p.reserve.filter(c=>live(c)&&!p.emanation.includes(c.uid));
 const selected=available.sort((a,b)=>combatValue(b,memory.direct)-combatValue(a,memory.direct)).slice(0,3);
 const trapLanes=p.prepared.filter(x=>x.hidden&&x.caster!==p.id).map(x=>x.lane),free=[0,1,2].filter(i=>!trapLanes.includes(i));
 const slots=free.concat(trapLanes).filter((x,i,a)=>a.indexOf(x)===i);
 const bonus=p.emanation.some(id=>p.reserve.find(c=>c.uid===id)?.modelId==='R05');
 const cards=[...selected];for(let i=cards.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]];}
 if(bonus&&slots.includes(0)&&cards.length){const strongest=[...cards].sort((a,b)=>combatAttack(b,memory.direct)-combatAttack(a,memory.direct))[0],index=cards.indexOf(strongest);[cards[0],cards[index]]=[cards[index],cards[0]];slots.splice(slots.indexOf(0),1);slots.unshift(0);}
 // Only the position of a hidden enemy spell is visible, never its card or their formation.
 return cards.map((card,i)=>({type:'assign',cardId:card.uid,lane:slots[i]}));
}
const areaNames=new Set(catalog.decks.flatMap(d=>d.cards).filter(c=>fx(c).some(e=>e.op==='area_damage')).map(c=>c.name));
const emptyStats=()=>({turns:0,draws:0,extraDraws:0,mulliganDraws:0,burned:0,fatigue:0,fatigueDamage:0,plays:0,creaturesPlayed:0,spellsPlayed:0,tokens:0,dead:0,manaAllocated:0,manaUnused:0,emptyHandEnds:0,handAtEnds:[],activeAtEnds:[],healedPatron:0,healedCreatures:0,emanationPlays:0,preparedPlays:0,triggered:0,areaCasts:0,areaPrepared:0,areaTriggered:0,areaExpired:0,conditionalDraws:0,cards:{}});
async function match(leftDeck,rightDeck,wantedFirst,initialSeed){
 let api,room,p,q,seed=initialSeed;
 for(let attempts=0;attempts<200;attempts++,seed++){
  api=await engine(seed);room=api.makeRoom('SIM'+seed,leftDeck.affinity);p=room.players[0];q=api.join(room,rightDeck.affinity);
  api.act(room,p,{type:'deck',deckId:leftDeck.id},catalog);api.act(room,q,{type:'deck',deckId:rightDeck.id},catalog);
  if(room.players.find(x=>x.id===room.first).deckId===wantedFirst.id)break;
 }
 assert.equal(room.players.find(x=>x.id===room.first).deckId,wantedFirst.id);
 const random=rng(seed^0xA52176),stats=new Map(room.players.map(x=>[x.id,emptyStats()])),mem=new Map(room.players.map(x=>[x.id,{direct:false,moved:new Set(),round:0}]));
 const trace=[];let lastEvent=room.eventId,combats=0,animationMs=0;
 const before=()=>room.players.map(p=>({id:p.id,patronHp:p.patron.hp,reserve:p.reserve.map(c=>({uid:c.uid,damage:c.damage,token:c.token})),discard:p.discard.map(c=>c.uid)}));
 function collect(cause,old){
  let automatic=new Set();
  for(const event of room.events.filter(e=>e.id>lastEvent)){
   const s=stats.get(event.playerId);if(!s)continue;
   if(event.type==='turn'){s.turns++;s.manaAllocated+=room.players.find(p=>p.id===event.playerId).manaMax;automatic.add(event.playerId);const m=mem.get(event.playerId);m.direct=false;m.moved.clear();m.round=room.round;}
   if(event.type==='draw'){s.draws++;if(cause==='mulligan')s.mulliganDraws++;else if(automatic.has(event.playerId))automatic.delete(event.playerId);else s.extraDraws++;}
   if(event.type==='burn'){s.burned++;automatic.delete(event.playerId);}
   if(event.type==='fatigue'){s.fatigue++;s.fatigueDamage+=event.amount;automatic.delete(event.playerId);}
   if(event.type==='summon')s.tokens++;
   if(event.type==='expire'&&areaNames.has(event.name))s.areaExpired++;
  }
  lastEvent=room.eventId;
  for(const b of old){const player=room.players.find(p=>p.id===b.id),s=stats.get(b.id);s.dead+=b.reserve.filter(c=>!player.reserve.some(n=>n.uid===c.uid)&&player.discard.some(n=>n.uid===c.uid)).length;if(player.patron.hp>b.patronHp)s.healedPatron+=player.patron.hp-b.patronHp;if(cause!=='combat')for(const c of b.reserve){const current=player.reserve.find(n=>n.uid===c.uid);if(current&&current.damage<c.damage)s.healedCreatures+=c.damage-current.damage;}}
 }
 function action(player,command){
  const s=stats.get(player.id),m=mem.get(player.id),card=command.type==='play'?player.hand.find(c=>c.uid===command.cardId):null,old=before(),drawsBefore=s.draws;
  if(command.type==='endPrep'){s.manaUnused+=player.mana;s.handAtEnds.push(player.hand.length);s.activeAtEnds.push(player.reserve.filter(c=>!player.emanation.includes(c.uid)).length);if(!player.hand.length)s.emptyHandEnds++;}
  api.act(room,player,command,catalog);
  if(card){s.plays++;s.cards[card.modelId]=(s.cards[card.modelId]||0)+1;if(card.type==='creature')s.creaturesPlayed++;else s.spellsPlayed++;if(command.mode==='emanate')s.emanationPlays++;if(command.mode==='lane')s.preparedPlays++;if(command.mode==='direct'){m.direct=true;if(fx(card).some(e=>e.op==='area_damage'))s.areaCasts++;}}
  if(command.type==='emanate'){m.moved.add(command.cardId);s.emanationPlays++;}
  trace.push({round:room.round,player:player.name,type:command.type,card:card?.name,mode:command.mode});collect(command.type,old);
  if(card&&command.mode==='lane'&&fx(card).some(e=>e.op==='area_damage'))s.areaPrepared++;
  if(card?.modelId==='R10')s.conditionalDraws+=s.draws-drawsBefore;
 }
 let guard=0;
 while(room.phase!=='finished'&&room.round<=60&&guard++<3000){
  if(room.phase==='mulligan'){for(const player of room.players){if(player.mulliganReady)continue;const expensive=player.hand.filter(c=>c.cost>=4);const cheap=player.hand.filter(c=>c.type==='creature'&&c.cost<=2);const returning=cheap.length?expensive:player.hand.filter(c=>c.cost>=3||c.type!=='creature');action(player,player.mulligansLeft&&returning.length?{type:'mulligan',cardIds:returning.map(c=>c.uid)}:{type:'confirmMulligan'});if(room.phase!=='mulligan')break;}}
  else if(room.phase==='prep'){const player=room.players.find(p=>p.id===room.turn),snap=api.view(room,player);action(player,tacticalAction(snap,mem.get(player.id),random));}
  else if(room.phase==='vote'){const order=[...room.players].sort((a,b)=>a.id===room.first?-1:1);for(const player of order){if(room.phase!=='vote')break;action(player,{type:'vote',fight:player.reserve.some(c=>live(c)&&!player.emanation.includes(c.uid))});}}
  else if(room.phase==='formation'){for(const player of room.players){if(player.ready)continue;for(const command of formation(api.view(room,player),mem.get(player.id),random))action(player,command);action(player,{type:'ready'});}}
  else if(room.phase==='resolving'){const old=before();combats++;for(const step of room.combat.timeline.filter(x=>x.kind==='magic')){const s=stats.get(step.spell.casterId);s.triggered++;if(step.spell.op==='area_damage')s.areaTriggered++;}animationMs+=api.flush();collect('combat',old);}
  else throw Error('Unexpected phase '+room.phase);
 }
 assert.equal(room.phase,'finished','Simulation must end by real game rules');assert.equal(api.timers.length,0);
 const players=room.players.map(player=>({deck:player.patron.affinity,first:player.id===room.first,won:player.id===room.winner,hp:player.patron.hp,hand:player.hand.length,deckLeft:player.deck.length,unplayed:player.hand.map(c=>({id:c.modelId,name:c.name,cost:c.cost})),...stats.get(player.id)}));
 return{seed,first:players.find(p=>p.first).deck,winner:room.winner?room.players.find(p=>p.id===room.winner).patron.affinity:null,rounds:room.round,combats,animationMs,players,trace};
}
const checks=await verifyScenario(engine,catalog,dualArea,immuneEmana);
console.log('Verificacoes: '+checks.length+' aprovadas; variante '+variant);
const games=[];let matchIndex=0;
for(let a=0;a<catalog.decks.length;a++)for(let b=a+1;b<catalog.decks.length;b++)for(let n=0;n<10;n++){
 const wanted=catalog.decks[n%2?a:b];const game=await match(catalog.decks[a],catalog.decks[b],wanted,20261003+(++matchIndex)*1000);games.push(game);
 console.log(`${matchIndex}/30 ${game.players.map(p=>p.deck).join(' x ')} | primeiro: ${game.first} | vencedor: ${game.winner||'empate'} | rodada ${game.rounds}`);
}
const sum=(xs,f)=>xs.reduce((s,x)=>s+f(x),0),mean=xs=>xs.length?sum(xs,x=>x)/xs.length:0,median=xs=>{const a=[...xs].sort((x,y)=>x-y);return a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2;};
function wilson(w,n){const z=1.96,p=w/n,d=1+z*z/n,c=(p+z*z/(2*n))/d,h=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/d;return[c-h,c+h].map(v=>Math.round(v*100));}
const summary={games:games.length,rounds:{mean:mean(games.map(g=>g.rounds)),median:median(games.map(g=>g.rounds)),min:Math.min(...games.map(g=>g.rounds)),max:Math.max(...games.map(g=>g.rounds))},firstWins:games.filter(g=>g.winner===g.first).length,draws:games.filter(g=>!g.winner).length,matchups:[],decks:[]};
for(let a=0;a<catalog.decks.length;a++)for(let b=a+1;b<catalog.decks.length;b++){
 const left=catalog.decks[a].affinity,right=catalog.decks[b].affinity,subset=games.filter(g=>g.players.some(p=>p.deck===left)&&g.players.some(p=>p.deck===right)),wins=subset.filter(g=>g.winner===left).length;
 summary.matchups.push({left,right,leftWins:wins,rightWins:subset.filter(g=>g.winner===right).length,draws:subset.filter(g=>!g.winner).length,leftWilson95:wilson(wins,subset.length),meanRounds:mean(subset.map(g=>g.rounds)),firstWins:subset.filter(g=>g.winner===g.first).length});
}
for(const deck of catalog.decks){
 const rows=games.flatMap(g=>g.players.filter(p=>p.deck===deck.affinity));const totals={};for(const field of ['turns','plays','creaturesPlayed','spellsPlayed','tokens','draws','extraDraws','mulliganDraws','burned','fatigue','fatigueDamage','dead','manaAllocated','manaUnused','emptyHandEnds','healedPatron','healedCreatures','emanationPlays','preparedPlays','triggered','areaCasts','areaPrepared','areaTriggered','areaExpired','conditionalDraws'])totals[field]=sum(rows,x=>x[field]);
 summary.decks.push({deck:deck.affinity,games:rows.length,wins:rows.filter(p=>p.won).length,firstWins:rows.filter(p=>p.first&&p.won).length,secondWins:rows.filter(p=>!p.first&&p.won).length,...totals,meanExtraDraws:totals.extraDraws/rows.length,meanTokens:totals.tokens/rows.length,meanPlays:totals.plays/rows.length,meanHandEnd:mean(rows.flatMap(p=>p.handAtEnds)),meanActiveEnd:mean(rows.flatMap(p=>p.activeAtEnds)),emptyHandPct:100*totals.emptyHandEnds/rows.flatMap(p=>p.handAtEnds).length,unusedManaPct:100*totals.manaUnused/totals.manaAllocated,cardPlays:deck.cards.map(c=>({id:c.id,name:c.name,plays:sum(rows,p=>p.cards[c.id]||0),heldAtFinish:sum(rows,p=>p.unplayed.filter(x=>x.id===c.id).length)}))});
}
assert.equal(await fs.readFile(path.join(root,'mesa-nova/game.mjs'),'utf8'),originalSource);assert.equal(await fs.readFile(path.join(root,'mesa-nova/cartas.json'),'utf8'),catalogText);
const output=path.join(root,'design','testes-2026-10-03-rodada2');await fs.mkdir(output,{recursive:true});
await fs.writeFile(path.join(output,`resultados-${variant}.json`),JSON.stringify({method:{version:3,date:'2026-10-03',variant,dualArea,immuneEmana,changes,checks,policy:'tactical-public-information-v3-area-modes-and-conditional-draw',gameHash:hash(originalSource),catalogHash:hash(catalogText),scenarioGameHash:hash(source),scenarioCatalogHash:hash(JSON.stringify(catalog)),engine:'Original SourceTextModule with reviewed in-memory experimental overlays; source files unchanged; seeded crypto, virtual animation timers, persistence isolated',seedBase:20261003,schedule:'10 per matchup; 5 starts for each deck; 30 total; 20 appearances per deck',limits:'Heuristic players, not expert humans; same policy in all three variants; v3 recognizes area traps and conditional draw, so old v2 comparison also reflects that policy difference.'},summary,games},null,2));
console.log('\nSUMMARY\n'+JSON.stringify(summary,null,2));
