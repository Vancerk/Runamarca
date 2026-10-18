import assert from 'node:assert/strict';

export const profiles={
 pressao:{face:2.8,board:.85,hand:.7,support:1.1,future:.25,risk:.08},
 campo:{face:1.65,board:1.4,hand:1.15,support:1.5,future:.55,risk:.15},
 recursos:{face:1.25,board:1.15,hand:1.85,support:1.9,future:.85,risk:.23},
};
const fx=c=>c.effects||[],live=c=>c&&c.damage<c.health,hp=c=>c.health-c.damage;
const atk=c=>Math.max(0,c.attack+(c.attackMod||0));
const kind=c=>{const e=fx(c)[0];return e?.op==='draw'?'self':e?.op==='area_damage'?'area':e?.op==='choose_one'?'either':['heal','attack_modifier'].includes(e?.op)&&e.target==='chosen_allied_creature'?'friendly':'enemy';};
const clone=structuredClone;
export function formations(cards){
 const out=[[null,null,null]];
 function visit(slots,used){if(slots.length===3){out.push(slots);return;}visit([...slots,null],used);for(const c of cards)if(!used.has(c.uid))visit([...slots,c.uid],new Set([...used,c.uid]));}
 visit([],new Set());return out.slice(1);
}
function potential(c,direct=true){
 return atk(c)+fx(c).filter(e=>e.timing==='revelation'&&e.op==='attack_modifier'&&(!e.condition||direct)).reduce((s,e)=>s+e.amount,0);
}
function unit(c){return potential(c)*1.05+hp(c)*.55+fx(c).filter(e=>e.timing==='revelation'&&e.op==='damage').reduce((s,e)=>s+e.amount*1.3,0);}
function healTargets(p){
 const wounds=new Map(p.reserve.filter(live).map(c=>[c.uid,c.damage]));
 return p.emanation.filter(uid=>p.reserve.find(c=>c.uid===uid)?.modelId==='F03').map(()=>{
  const choices=p.reserve.filter(c=>live(c)&&wounds.get(c.uid)>0).sort((a,b)=>((hp(b)<=2?3:0)+unit(b)) - ((hp(a)<=2?3:0)+unit(a)));
  const target=choices[0];if(target)wounds.set(target.uid,wounds.get(target.uid)-1);return target?.uid||null;
 });
}
function topFormation(p,mode=0){
 const cards=p.reserve.filter(c=>live(c)&&!p.emanation.includes(c.uid)).sort((a,b)=>mode===1?potential(b)-potential(a):mode===2?hp(b)-hp(a):unit(b)-unit(a)).slice(0,3);
 const slots=[null,null,null];cards.forEach((c,i)=>slots[i]=c.uid);
 if(p.emanation.some(uid=>p.reserve.find(c=>c.uid===uid)?.modelId==='R05')){
  const strongest=[...cards].sort((a,b)=>potential(b)-potential(a))[0];if(strongest){const at=slots.indexOf(strongest.uid);[slots[0],slots[at]]=[slots[at],slots[0]];}
 }
 return slots;
}
export function createPlanner(api,catalog,random){
 const meter={evaluations:0,forecastCombats:0,searchedActions:0,formationCandidates:0,preparationSequences:0,skippedCombats:0,targetedSupports:0};
 let serial=0;
 function shadow(snapshot,memory,hypothesis=0){
  const room={code:'FORECAST',phase:'prep',round:snapshot.round,first:snapshot.first,turn:snapshot.you,preparationsDone:snapshot.turn===snapshot.first?0:1,winner:null,log:[],events:[],eventId:0,revision:0,players:[],spectators:[]};
  for(const seat of snapshot.players){
   const p={...clone(seat),hand:clone(seat.hand||Array.from({length:seat.handCount},()=>({cost:3,effects:[],type:'unknown'}))),deck:[],reserve:clone(seat.reserve),prepared:[],formation:[null,null,null],directPlayed:seat.id===snapshot.you?memory.direct:memory.publicDirect?.[seat.id]||false,discountUsed:seat.id===snapshot.you?memory.direct:false,vote:null,ready:false};
   const deck=catalog.decks.find(d=>d.id===seat.deckId);
   // Unseen draws are representative samples from the public deck list, never the real deck order.
   const known=[...seat.discard,...seat.reserve,...(seat.hand||[])],remaining=deck.cards.flatMap(c=>Array.from({length:Math.max(0,c.quantity-known.filter(k=>k.modelId===c.id).length)},()=>c));
   for(let i=0;i<seat.deckCount;i++){const model=remaining.length?remaining[(i+snapshot.round+hypothesis*7)%remaining.length]:deck.cards[0];p.deck.push({...clone(model),owner:p.id,uid:'forecast-'+p.id+'-'+i,modelId:model.id,damage:0,attackMod:0});}
   room.players.push(p);
  }
  for(const side of snapshot.players)for(const prep of side.prepared){
   const caster=room.players.find(p=>p.id===prep.caster);let card=prep.card;
   if(!card){
    const deck=catalog.decks.find(d=>d.id===caster.deckId),known=caster.discard.concat(caster.reserve);
    const traps=deck.cards.filter(c=>c.type!=='creature'&&['enemy','area'].includes(kind(c))&&known.filter(k=>k.modelId===c.id).length<c.quantity);
    card=traps[(hypothesis+prep.lane+snapshot.round)%traps.length]||deck.cards.find(c=>c.type!=='creature');
   }
   caster.prepared.push({card:{...clone(card),uid:card.uid||'guess-'+caster.id+'-'+prep.lane,owner:caster.id},targetSide:side.id,lane:prep.lane,hidden:prep.hidden});
  }
  return room;
 }
 function value(room,id,profile){
  meter.evaluations++;const p=room.players.find(p=>p.id===id),q=room.players.find(p=>p.id!==id),w=profiles[profile];
  if(room.phase==='finished')return room.winner===id?100000:room.winner?-100000:0;
  function field(seat){
   const active=seat.reserve.filter(c=>live(c)&&!seat.emanation.includes(c.uid)).map(unit).sort((a,b)=>b-a);
   let total=active.slice(0,3).reduce((s,x)=>s+x,0)+active.slice(3).reduce((s,x)=>s+x*.2,0);
   for(const uid of seat.emanation){const c=seat.reserve.find(c=>c.uid===uid);if(!live(c))continue;
    total+=c.modelId==='F03'?(seat.reserve.some(c=>c.damage>0)?4.8:2.8)*w.support:c.modelId==='R05'?3.2*w.support:c.modelId==='M04'?3.5*w.support:1;
   }
   return total;
  }
  const danger=p.patron.hp<=6?2:p.patron.hp<=10?1.45:1;
  const cards=seat=>seat.hand.reduce((s,c)=>s+(c.type==='unknown'?1:Math.min(1.35,.75+c.cost*.07)),0);
  const reserveThreat=p.hand.filter(c=>c.type==='creature'&&c.cost<=p.manaMax+1).reduce((s,c)=>s+unit(c)*.08,0);
  return w.face*((20-q.patron.hp)-danger*(20-p.patron.hp))+w.board*(field(p)-field(q))+w.hand*(cards(p)-cards(q))+w.future*reserveThreat;
 }
 function forecast(base,id,ours,theirs,profile,future=true){
  const room=clone(base),p=room.players.find(p=>p.id===id),q=room.players.find(p=>p.id!==id);
  room.phase='formation';p.formation=[...ours];q.formation=[...theirs];meter.forecastCombats++;api.forecastCombat(room);
  const first=value(room,id,profile);if(room.phase==='finished'||!future)return first;
  // A second battle projects attrition and recurring support. It does not invent new enemy plays.
  for(const seat of room.players){const targets=healTargets(seat);for(const uid of targets){const c=seat.reserve.find(c=>c.uid===uid);if(c)c.damage=Math.max(0,c.damage-1);}seat.formation=topFormation(seat);}
  room.phase='formation';meter.forecastCombats++;api.forecastCombat(room);
  return first+profiles[profile].future*value(room,id,profile);
 }
 function enemyFormations(room,id,number=6){
  const p=room.players.find(p=>p.id!==id),patterns=[];
  for(let mode=0;mode<3;mode++){
   const top=topFormation(p,mode);patterns.push(top,[top[2],top[0],top[1]],[top[1],top[2],top[0]]);
  }
  const cards=p.reserve.filter(c=>live(c)&&!p.emanation.includes(c.uid)).sort((a,b)=>unit(b)-unit(a));
  const visibleTraps=room.players.find(p=>p.id===id).prepared.filter(t=>t.targetSide===p.id).map(t=>t.lane);
  if(cards.length>=3&&visibleTraps.length){const weak=[...cards].sort((a,b)=>unit(a)-unit(b))[0],bait=topFormation(p);bait[visibleTraps[0]]=weak.uid;const seen=new Set();for(let i=0;i<3;i++){if(seen.has(bait[i]))bait[i]=cards.find(c=>!seen.has(c.uid)&&c.uid!==weak.uid)?.uid||null;if(bait[i])seen.add(bait[i]);}patterns.push(bait);}
  const unique=[...new Map(patterns.map(f=>[f.join('|'),f])).values()];
  return unique.slice(0,number);
 }
 function likelyScore(base,id,profile){
  const ours=topFormation(base.players.find(p=>p.id===id)),enemies=enemyFormations(base,id,3);
  return enemies.reduce((s,f)=>s+forecast(base,id,ours,f,profile),0)/enemies.length;
 }
 function actions(room,id,memory){
  const p=room.players.find(p=>p.id===id),q=room.players.find(p=>p.id!==id),out=[];
  const add=(command,priority=0)=>out.push({command,priority});
  const cost=(c,mode)=>Math.max(1,c.cost-(mode==='direct'&&!p.directPlayed&&!p.discountUsed?p.emanation.filter(uid=>p.reserve.find(c=>c.uid===uid)?.modelId==='M04').length:0));
  for(const c of p.hand){
   if(c.type==='creature'){
    if(c.cost>p.mana||p.reserve.length>=8)continue;
    add({type:'play',cardId:c.uid},unit(c)/Math.max(1,c.cost)+1);
    if(p.emanation.length<2&&fx(c).some(e=>e.timing.includes('emanat')))add({type:'play',cardId:c.uid,mode:'emanate'},4);
    continue;
   }
   const k=kind(c),e=fx(c)[0];
   if(c.type!=='prepared_spell'&&cost(c,'direct')<=p.mana){
    if(k==='self'&&p.hand.length<8)add({type:'play',cardId:c.uid,mode:'direct'},p.hand.length<=3?7:2);
    else if(k==='area'&&q.reserve.some(c=>live(c)&&!q.emanation.includes(c.uid)))add({type:'play',cardId:c.uid,mode:'direct'},5);
    else if(k==='either'||k==='friendly'){
     for(const target of p.reserve.filter(live)){if((e.op==='heal'||e.op==='choose_one')&&!target.damage)continue;if(e.op==='attack_modifier'&&p.emanation.includes(target.uid))continue;add({type:'play',cardId:c.uid,mode:'direct',targetId:target.uid},3);}
     if(k==='either'&&p.patron.hp<p.patron.maxHp)add({type:'play',cardId:c.uid,mode:'direct',targetId:'patron'},p.patron.hp<=6?8:1);
    }else if(k==='enemy')for(const target of q.reserve.filter(live))add({type:'play',cardId:c.uid,mode:'direct',targetId:target.uid},q.emanation.includes(target.uid)?7:3);
   }
   if(c.cost<=p.mana&&['enemy','area'].includes(k))for(let lane=0;lane<3;lane++)if(!p.prepared.some(t=>t.targetSide===q.id&&t.lane===lane))add({type:'play',cardId:c.uid,mode:'lane',lane,targetSide:q.id},2);
  }
  for(const c of p.reserve.filter(live)){
   if(p.mana<1||memory.moved.has(c.uid))continue;
   if(p.emanation.includes(c.uid)||p.emanation.length<2&&fx(c).some(e=>e.timing.includes('emanat')))add({type:'emanate',cardId:c.uid},4);
  }
  return out.sort((a,b)=>b.priority-a.priority).slice(0,24).map(x=>x.command);
 }
 function preparation(snapshot,memory,profile){
  const id=snapshot.you,base=shadow(snapshot,memory),cache=new Map();
  function estimate(room){const key=JSON.stringify(room.players.map(p=>({mana:p.mana,h:p.hand.map(c=>c.uid),r:p.reserve.map(c=>[c.uid,c.damage,c.attackMod]),e:p.emanation,s:p.prepared.map(t=>[t.card.name,t.targetSide,t.lane]),hp:p.patron.hp,d:p.directPlayed})));if(!cache.has(key))cache.set(key,likelyScore(room,id,profile));return cache.get(key);}
  function end(room){const next=clone(room),p=next.players.find(p=>p.id===id);api.act(next,p,{type:'endPrep',healTargetIds:healTargets(p)},catalog);return next;}
  const passScore=estimate(end(base));let best={score:passScore,first:{type:'endPrep',healTargetIds:healTargets(base.players.find(p=>p.id===id))}},beam=[{room:base,first:null}];
  for(let depth=0;depth<2;depth++){
   const candidates=[];
   for(const node of beam)for(const command of actions(node.room,id,memory)){
    const next=clone(node.room),p=next.players.find(p=>p.id===id);meter.searchedActions++;
    try{api.act(next,p,command,catalog);}catch{continue;}
    const first=node.first||command,score=next.phase==='finished'?value(next,id,profile):estimate(end(next));
    candidates.push({room:next,first,score});if(score>best.score+.05)best={first,score};
   }
   beam=candidates.sort((a,b)=>b.score-a.score).slice(0,4);if(!beam.length)break;
  }
  meter.preparationSequences++;
  if(best.first.targetId){const q=base.players.find(p=>p.id!==id);if(q.emanation.includes(best.first.targetId))meter.targetedSupports++;}
  return best.first;
 }
 function formation(snapshot,memory,profile){
  const id=snapshot.you,base=shadow(snapshot,memory),p=base.players.find(p=>p.id===id),cards=p.reserve.filter(c=>live(c)&&!p.emanation.includes(c.uid)),candidates=formations(cards);
  // All legal selections and placements are considered; quick scoring narrows exact engine forecasts.
  const opponents=enemyFormations(base,id,6),w=profiles[profile];
  function quick(f){let score=0;for(const g of opponents){for(let i=0;i<3;i++){const a=cards.find(c=>c.uid===f[i]),b=base.players.find(p=>p.id!==id).reserve.find(c=>c.uid===g[i]);if(a&&!b)score+=potential(a)*w.face;else if(a&&b)score+=(potential(a)>=hp(b)?unit(b):0)-(potential(b)>=hp(a)?unit(a):0);else if(b)score-=potential(b)*w.face*1.3;}}return score/opponents.length;}
  const shortlist=candidates.map(f=>({f,score:quick(f)})).sort((a,b)=>b.score-a.score).slice(0,32);meter.formationCandidates+=candidates.length;
  let best={score:-Infinity,f:[null,null,null]};
  for(const {f} of shortlist){
   const scores=[];
   for(let i=0;i<opponents.length;i++){const hypothesis=i%3===0?shadow(snapshot,memory,i):base;scores.push(forecast(hypothesis,id,f,opponents[i],profile));}
   const average=scores.reduce((s,x)=>s+x,0)/scores.length,score=average-w.risk*(average-Math.min(...scores));
   if(score>best.score){best={score,f};}
  }
  return best.f.map((uid,lane)=>uid?{type:'assign',cardId:uid,lane}:null).filter(Boolean);
 }
 function vote(snapshot,memory,profile){
  const base=shadow(snapshot,memory),id=snapshot.you,p=base.players.find(p=>p.id===id);
  if(!p.reserve.some(c=>live(c)&&!p.emanation.includes(c.uid)))return false;
  const fight=likelyScore(base,id,profile),wait=(1+profiles[profile].future)*value(base,id,profile);
  const answer=profile==='pressao'?fight>=wait-2:fight>=wait-.3;if(!answer)meter.skippedCombats++;return answer;
 }
 function mulligan(player,profile){
  const cheap=player.hand.filter(c=>c.type==='creature'&&c.cost<=2),threshold=profile==='pressao'?3:4;
  return player.hand.filter(c=>c.cost>threshold||(!cheap.length&&(c.type!=='creature'||c.cost>=3))||(profile==='pressao'&&c.type!=='creature'&&kind(c)!=='enemy')).map(c=>c.uid);
 }
 return {preparation,formation,vote,mulligan,meter};
}

assert.equal(formations([{uid:'a'},{uid:'b'}]).length,13,'Duas criaturas em tres posicoes devem ter treze formacoes legais');
