import {applyFormationSlots} from './compat-3090.mjs';
import * as base from './policy-base.mjs';
let catalog;
export const POLICY_VERSION='P2-3090-entry-patron-equipment-compat-v1.1-protection';
export function setCatalog(value){catalog=value;}
const clone=structuredClone,own=(s,id=s.you)=>s.players.find(p=>p.id===id),enemy=(s,id=s.you)=>s.players.find(p=>p.id!==id);
const unique=list=>[...new Map(list.map(x=>[JSON.stringify(x),x])).values()];
const profiles={iniciante:{roots:10,children:4,beam:1,depth:1,samples:1,forms:1,horizon:1,forgeHorizon:1,forgePaths:1},intermediario:{roots:12,children:5,beam:2,depth:2,samples:2,forms:1,horizon:1,forgeHorizon:3,forgePaths:1},experiente:{roots:18,children:6,beam:3,depth:3,samples:3,forms:2,horizon:2,forgeHorizon:3,forgePaths:3}};

export function candidateActions(api,s,w){
 const p=own(s);
 if(s.phase==='forging')return api.weaponOptions(p.forge.stage,p.forge.cost).map(o=>({type:'forgeChoice',optionId:o.id}));
 const augmented=clone(s),a=own(augmented);
 if(a.study?.book){const ids=new Set(a.hand.map(c=>c.uid));a.hand.push(...a.study.book.cards.filter(c=>a.study.book.instantIds.includes(c.uid)&&!ids.has(c.uid)).map(c=>({...c,cost:0})));}
 let actions=base.actions(augmented,w);
 if(p.pendingApprenticeTargets?.length)return actions;
 if(p.study?.book)return [...actions.filter(a=>a.type==='play'&&p.study.book.instantIds.includes(a.cardId)),{type:'grimoireFinish'}];
 actions=actions.filter(a=>!(a.type==='patronPower'&&['forjar-arma','estudos-avancados','represalia-de-eter'].includes(a.powerId)));
 for(const power of p.patron.powers||[]){
  const used=p.patron.usedPowers?.[power.id];if(p.mana<power.cost||(power.limit==='match'?used!==undefined:used===s.round))continue;
  if(power.id==='forjar-arma'&&!p.forge)for(const weaponCost of [1,3,6])actions.push({type:'patronPower',powerId:power.id,weaponCost});
  if(power.id==='represalia-de-eter'&&s.first===p.id)actions.push({type:'patronPower',powerId:power.id});
  const stage=p.study?.stage;
  if(power.id==='estudos-avancados'&&stage&&p.study.seen>=stage.threshold&&p.mana>=stage.cost){
   for(const centerNeighbor of stage.threshold===20?[0,2]:[undefined])actions.push({type:'patronPower',powerId:power.id,...(centerNeighbor===undefined?{}:{centerNeighbor})});
  }
 }
 return unique(actions);
}

// Search coverage is round-robin over cards/powers, not a quota of played cards.
function boundedActions(actions,limit){
 const groups=new Map();for(const a of actions){const k=a.cardId||a.powerId||a.type;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(a);}
 const out=[];for(let i=0;out.length<limit;i++){let added=false;for(const list of groups.values())if(list[i]){out.push(list[i]);added=true;if(out.length===limit)break;}if(!added)break;}return out;
}
function value(r,id,w){return base.evaluate(r,id,w);}
function knownForcedLanes(r){
 for(const p of r.players)for(const c of p.reserve){delete c.fixedFormationLane;const target=r.players.flatMap(q=>q.reserve).find(t=>t.forcedBy===c.uid);if(target&&Number.isInteger(target.forcedLane))c.fixedFormationLane=target.forcedLane;}
}
function model(s,index){
 const r=base.publicRoom(s),seed=(0x13572468+Math.imul(index+1,0x9e3779b1))>>>0;
 r.simulationSeed=seed;r.rulesSeed=seed;delete r.rulesRng;delete r.simulationContext;
 r.preparationsDone=['prep','forging'].includes(s.phase)?(s.turn===s.first?0:1):2;
 for(const p of r.players){
  if(p.id!==s.you)p.hand=Array.from({length:p.handCount||0},(_,i)=>({uid:'unknown-hand-'+i,modelId:'unknown',type:'unknown',cost:99,effects:[]}));
  // Canonical view omits damageRounds: sample bounds, never the actual memory.
  p.damageRounds=index%2?[r.round-1]:[];
 }
 knownForcedLanes(r);return r;
}
function fixedView(r,id){return {you:id,phase:r.phase,round:r.round,turn:r.turn,first:r.first,seals:r.seals||[],players:r.players};}
function plans(p,w,limit,seals=[]){
 const forms=base.rawForms(p,w).sort((a,b)=>base.roughForm(p,b,w)-base.roughForm(p,a,w)),chosen=forms.slice(0,limit);
 const empty=forms.find(f=>!f.some(Boolean));if(empty&&!chosen.some(f=>JSON.stringify(f)===JSON.stringify(empty)))chosen.push(empty);
 return chosen.flatMap(f=>{
  const originals=base.configs(p,f,seals).slice(0,4),out=[];
  for(const original of originals){
   const noPay=clone(original);for(const uid of Object.keys(noPay.payments))noPay.payments[uid]=false;out.push(noPay);
   for(const uid of Object.keys(original.payments)){const card=p.reserve.find(c=>c.uid===uid),cost=base.fx(card).find(e=>e.op==='optional_reveal_attack')?.cost;if(Number.isFinite(cost)&&p.mana>=cost){const pay=clone(noPay);pay.payments[uid]=true;out.push(pay);}}
  }
  return unique(out);
 });
}
function opponentPlans(p,w,count,seals=[]){
 const forms=base.rawForms(p,w).sort((a,b)=>b.filter(Boolean).length-a.filter(Boolean).length||base.roughForm(p,b,w)-base.roughForm(p,a,w));
 return Array.from({length:count},(_,i)=>base.configs(p,forms[Math.min(i,forms.length-1)]||[null,null,null],seals)[0]);
}

export function applyPlan(api,r,p,plan){
 r.phase='formation';r.forceWindow=null;p.ready=false;
 applyFormationSlots(r,p,plan.slots,action=>api.act(r,p,action));
 for(const [cardId,lanes] of Object.entries(plan.taunts||{}))api.act(r,p,{type:'taunt',cardId,lanes});
 for(const [cardId,mode] of Object.entries(plan.monks||{}))if(!p.reserve.find(c=>c.uid===cardId)?.monkMode)api.act(r,p,{type:'monkChoice',cardId,mode});
 for(const [cardId,mode] of Object.entries(plan.protocols||{}))if(!p.reserve.find(c=>c.uid===cardId)?.protocolMode)api.act(r,p,{type:'protocol',cardId,mode});
 for(const [cardId,pay] of Object.entries(plan.payments||{}))api.act(r,p,{type:'revealPayment',cardId,pay});
 for(const [cardId,lane] of Object.entries(plan.pressure||{}))api.act(r,p,{type:'pressureLane',cardId,lane});
 for(const [cardId,lanes] of Object.entries(plan.seals||{}))api.act(r,p,{type:'sealLanes',cardId,...lanes});
}

function pending(api,r,p,w){
 for(let n=0;n<12;n++){
  const s=api.view(r,p),self=own(s);
  if(self.pendingDiscard){
   const card=[...self.hand].sort((a,b)=>base.unit(a,w)-base.unit(b,w)||a.cost-b.cost)[0];if(!card)throw Error('P1: descarte sem carta.');api.act(r,p,{type:'discard',cardId:card.uid});continue;
  }
  if(!self.pendingApprenticeTargets?.length)return;
  const options=base.actions(s,w);let best;
  for(const action of options){const copy=clone(r);try{api.act(copy,own(copy,p.id),action);const score=value(copy,p.id,w);if(!best||score>best.score)best={action,score};}catch(e){if(e.code==='P1_BUDGET')throw e;}}
  if(!best)throw Error('P1: fila sem alvo canônico válido.');api.act(r,p,best.action);
 }
 throw Error('P1: fila obrigatória excedeu limite de planejamento.');
}
function finishBook(api,r,p,w){
 pending(api,r,p,w);
 for(let turn=0;turn<3&&p.studyBook;turn++){
  const baseline=clone(r);api.act(baseline,own(baseline,p.id),{type:'grimoireFinish'});let best={action:{type:'grimoireFinish'},score:value(baseline,p.id,w)};
  const s=api.view(r,p);
  for(const action of boundedActions(candidateActions(api,s,w).filter(a=>a.type==='play'),8)){
   const copy=clone(r),q=own(copy,p.id);
   try{api.act(copy,q,action);pending(api,copy,q,w);if(q.studyBook)api.act(copy,q,{type:'grimoireFinish'});const score=value(copy,p.id,w);if(score>best.score)best={action,score};}catch(e){if(e.code==='P1_BUDGET')throw e;}
  }
  api.act(r,p,best.action);pending(api,r,p,w);
 }
}
function responsePrior(s){
 const q=enemy(s),deck=catalog.decks.find(d=>d.id===q.deckId),visible=[...(q.reserve||[]),...(q.discard||[]),...(q.weapons||[]),...(q.prepared||[]).filter(x=>x.card).map(x=>x.card)],pool=[];
 for(const model of deck?.cards||[]){const used=visible.filter(c=>(c.modelId||c.id)===model.id).length;for(let n=0;n<Math.max(0,model.quantity-used);n++)pool.push(model);}
 const spells=pool.filter(c=>!['creature','equipment'].includes(c.type)),count=Math.min(q.handCount||0,pool.length);
 let noSpell=1;for(let i=0;i<count;i++)noSpell*=Math.max(0,(pool.length-spells.length-i)/(pool.length-i));
 return {spells,probability:s.first===s.you?1-noSpell:0,assumption:'uniform unseen original models minus public exposure; at most one modeled spell, no private hand/order'};
}
function opponentResponse(api,r,id,w,prior,sample,samples){
 const p=own(r,id),q=enemy(r,id);
 if(r.phase!=='prep'||r.turn!==p.id)return;
 pending(api,r,p,w);if(p.studyBook)finishBook(api,r,p,w);
 api.act(r,p,{type:'endPrep',healTargetIds:base.healing(p)});
 if(r.phase!=='prep'||r.turn!==q.id||!(samples>1&&(sample+.5)/samples<prior.probability)||!prior.spells.length||!q.hand.length)return;
 const candidates=prior.spells.filter(c=>api.quoteCardCost(q,c).known&&api.quoteCardCost(q,c).effectiveCost<=q.mana);
 const model=candidates[Math.min(candidates.length-1,Math.floor((sample+.5)/samples*candidates.length))];if(!model)return;
 q.hand[0]={...clone(model),uid:'belief-spell-'+sample,modelId:model.id,owner:q.id,damage:0,attackMod:0,baseStats:{attack:model.attack,health:model.health,cost:model.cost}};
 const view=api.view(r,q);let best;
 for(const action of boundedActions(candidateActions(api,view,w).filter(a=>a.cardId===q.hand[0].uid),6)){
  const copy=clone(r);try{api.act(copy,own(copy,q.id),action);pending(api,copy,own(copy,q.id),w);const score=value(copy,id,w);if(!best||score<best.score)best={action,score};}catch(e){if(e.code==='P1_BUDGET')throw e;}
 }
 if(best&&best.score<value(r,id,w)-1e-9){api.act(r,q,best.action);pending(api,r,q,w);}
}
function commitments(api,cost,limit,stage){
 if(!cost||stage==='attack')return [null];const all=[];
 for(const structure of api.weaponOptions('durability',cost))for(const blade of api.weaponOptions('attack',cost))all.push({durability:structure.id,attack:blade.id});
 const count=Math.min(limit,all.length);return Array.from({length:count},(_,i)=>all[count===1?0:Math.round(i*(all.length-1)/(count-1))]);
}
function progress(api,r,id,w,commit,realizeWeapon=true){
 for(let n=0;n<8;n++){
  if(r.phase==='finished')return;
  const p=own(r,id);
  if(r.phase==='forging'){
   const actor=own(r,r.turn),optionId=commit?.[actor.forge.stage]||api.weaponOptions(actor.forge.stage,actor.forge.cost)[0]?.id;
   if(!optionId)return;api.act(r,actor,{type:'forgeChoice',optionId});continue;
  }
  if(r.phase==='prep'&&r.turn!==id){const actor=own(r,r.turn);pending(api,r,actor,w);if(actor.studyBook)finishBook(api,r,actor,w);api.act(r,actor,{type:'endPrep',healTargetIds:base.healing(actor)});continue;}
  if(r.phase==='prep'&&r.turn===id){
   pending(api,r,p,w);if(p.studyBook)finishBook(api,r,p,w);
   const weapon=p.hand.find(c=>c.type==='equipment'&&c.modelId==='forged-weapon');
   if(realizeWeapon&&weapon&&p.mana>=weapon.cost+1){
    let best;
    for(const targetId of [...p.reserve.filter(c=>base.alive(c)).map(c=>c.uid),...(p.patron.hp>0?['patron']:[])].slice(0,4)){
     const copy=clone(r),q=own(copy,id);try{api.act(copy,q,{type:'play',cardId:weapon.uid});api.act(copy,q,{type:'equip',cardId:weapon.uid,targetId});const score=value(copy,id,w);if(!best||score>best.score)best={targetId,score};}catch(e){if(e.code==='P1_BUDGET')throw e;}
    }
    if(best){api.act(r,p,{type:'play',cardId:weapon.uid});api.act(r,p,{type:'equip',cardId:weapon.uid,targetId:best.targetId});}
   }
   return;
  }
  return;
 }
}

function combat(api,r,id,w,ownPlan,opponentPlan){
 for(let step=0;step<6&&['prep','forging'].includes(r.phase);step++){
  const actor=own(r,r.turn);pending(api,r,actor,w);if(actor.studyBook)finishBook(api,r,actor,w);
  if(r.phase==='forging'){const option=api.weaponOptions(actor.forge.stage,actor.forge.cost)[0];api.act(r,actor,{type:'forgeChoice',optionId:option.id});}
  else api.act(r,actor,{type:'endPrep',healTargetIds:base.healing(actor)});
 }
 for(const p of r.players){p.ready=false;pending(api,r,p,w);}
 applyPlan(api,r,own(r,id),ownPlan);applyPlan(api,r,enemy(r,id),opponentPlan);
 r.phase='resolving';api.resolveCombat(r);return r;
}
function forecast(api,s,actions,w,profile){
 const id=s.you,prior=responsePrior(s),samples=profile.samples;
 const forgeAction=actions.find(a=>a.type==='patronPower'&&a.powerId==='forjar-arma'),forge=own(s).forge;
 const cost=forgeAction?.weaponCost||forge?.cost,commits=commitments(api,cost,profile.forgePaths,forge?.stage);
 let best=-Infinity,bestData;
 for(const commit of commits){let sum=0,weightSum=0,min=Infinity;
  for(let sample=0;sample<samples;sample++){
   const r=model(s,sample),p=own(r,id);let valid=true;
   try{for(const action of actions){api.act(r,p,action);pending(api,r,p,w);}if(p.studyBook){if(!actions.length&&own(s).study?.book)api.act(r,p,{type:'grimoireFinish'});else finishBook(api,r,p,w);}}catch(e){if(e.code==='P1_BUDGET')throw e;valid=false;}
   if(!valid)return null;
   if(r.phase==='finished'){const score=value(r,id,w);sum+=score;weightSum++;min=Math.min(min,score);continue;}
   if(r.phase==='forging'||cost)progress(api,r,id,w,commit,Boolean(cost));
   opponentResponse(api,r,id,w,prior,sample,samples);
   const horizon=cost?profile.forgeHorizon:profile.horizon;
   let score=value(r,id,w),last=score;
   for(let turn=0;turn<horizon&&r.phase!=='finished';turn++){
    knownForcedLanes(r);
    const forms=plans(own(r,id),w,profile.forms,r.seals),opps=opponentPlans(enemy(r,id),w,samples,r.seals),opp=opps[sample];let selected;
    for(const plan of forms.slice(0,profile.forms*3+1)){
     const copy=clone(r);try{combat(api,copy,id,w,plan,opp);const v=value(copy,id,w);if(!selected||v>selected.value)selected={room:copy,value:v};}catch(e){if(e.code==='P1_BUDGET')throw e;}
    }
    if(!selected)break;
    Object.assign(r,selected.room);progress(api,r,id,w,commit,Boolean(cost));
    const now=value(r,id,w);score+=(turn===0?1:w.future**turn)*(now-last);last=now;
    if(r.phase==='finished'){score=now;break;}
   }
   const weight=1;
   sum+=weight*score;weightSum+=weight;min=Math.min(min,score);
  }
  const mean=weightSum?sum/weightSum:-Infinity;
  // Same style-sensitive downside term already used by the legacy formation search.
  const score=mean+(w.future>.5?.12*(min-mean):0);
  if(score>best){best=score;bestData={score,mean,worst:min,horizon:cost?profile.forgeHorizon:profile.horizon,responseSpellProbability:prior.probability,commit};}
 }
 return bestData;
}

export function decide(api,s,w,level,budget){
 const profile=profiles[level],id=s.you,trace=[],start=performance.now();let used=0,budgetHit=false;
 const spend=()=>{if(used>=budget){budgetHit=true;const e=Error('P1 budget exhausted');e.code='P1_BUDGET';throw e;}used++;};
 const search={...api,act:(...args)=>{spend();return api.act(...args);},resolveCombat:(...args)=>{spend();return api.resolveCombat(...args);}};
 let choice=null,best=-Infinity,baseline=null;
 const baselines=new Map();
 const compareScore=actions=>{
  const delayed=actions.some(a=>a.type==='patronPower'&&a.powerId==='forjar-arma')||Boolean(own(s).forge),horizon=delayed?profile.forgeHorizon:profile.horizon;
  if(s.phase!=='forging'&&!baselines.has(horizon))baselines.set(horizon,forecast(search,s,[],w,{...profile,horizon}));
  const result=forecast(search,s,actions,w,profile);if(!result)return null;
  const reference=baselines.get(horizon);return {...result,absoluteScore:result.score,score:s.phase==='forging'?result.score:result.score-reference.score,passScore:reference?.score??null};
 };
 try{
  if(s.phase==='formation'||s.phase==='vote'){
   const r=model(s,0),p=own(r,id),q=enemy(r,id),forms=plans(p,w,level==='iniciante'?2:level==='intermediario'?4:6,r.seals),opps=opponentPlans(q,w,profile.samples,r.seals);
   for(const plan of forms){let total=0,ok=true;for(const opp of opps){const copy=clone(r);try{combat(search,copy,id,w,plan,opp);total+=value(copy,id,w);}catch(e){if(e.code==='P1_BUDGET')throw e;ok=false;break;}}if(ok){trace.push({kind:'formation',plan,score:total/opps.length,samples:opps.length});if(total/opps.length>best){best=total/opps.length;choice={plan,score:best};}}}
  }else if(own(s).pendingApprenticeTargets?.length){
   for(const action of candidateActions(search,s,w)){const r=model(s,0);try{search.act(r,own(r,id),action);const score=value(r,id,w);if(score>best){best=score;choice=action;}}catch(e){if(e.code==='P1_BUDGET')throw e;}}
  }else{
   baseline=s.phase==='forging'?null:forecast(search,s,[],w,profile);if(baseline)baselines.set(own(s).forge?profile.forgeHorizon:profile.horizon,baseline);best=s.phase==='forging'?-Infinity:0;
   const roots=boundedActions(candidateActions(search,s,w),profile.roots),beam=[];
   for(const action of roots){const score=compareScore([action]);if(!score)continue;trace.push({actions:[action],...score,delta:score.score});beam.push({actions:[action],...score});if(score.score>best+1e-9){best=score.score;choice=action;}}
   let frontier=beam.sort((a,b)=>b.score-a.score).slice(0,profile.beam);
   // Keep a delayed action in the beam as search coverage, never as a score bonus.
   const delayed=beam.find(x=>x.actions[0].type==='patronPower'&&['estudos-avancados','forjar-arma'].includes(x.actions[0].powerId));if(delayed&&!frontier.includes(delayed))frontier.push(delayed);
   for(const kind of ['emanate','equipment']){const node=beam.find(x=>kind==='emanate'?x.actions[0].mode==='emanate':own(s).hand.some(c=>c.uid===x.actions[0].cardId&&c.type==='equipment'));if(node&&!frontier.includes(node))frontier.push(node);}
   for(let depth=1;s.phase!=='forging'&&depth<profile.depth;depth++){
    const next=[];
    for(const node of frontier){const r=model(s,0);for(const action of node.actions){search.act(r,own(r,id),action);pending(search,r,own(r,id),w);}const v=search.view(r,own(r,id));
     if(v.phase!=='prep')continue;
     for(const action of boundedActions(candidateActions(search,v,w),profile.children)){
      const actions=[...node.actions,action],score=compareScore(actions);if(!score)continue;trace.push({actions,...score,delta:score.score});next.push({actions,...score});if(score.score>best+1e-9){best=score.score;choice=actions[0];}
     }
    }
    frontier=next.sort((a,b)=>b.score-a.score).slice(0,profile.beam);
   }
  }
 }catch(e){if(e.code!=='P1_BUDGET')throw e;}
 if((s.phase==='formation'||s.phase==='vote')&&!choice){const p=own(s),form=base.rawForms(p,w).sort((a,b)=>base.roughForm(p,b,w)-base.roughForm(p,a,w))[0];choice={plan:plans({...p,formation:form},w,1,s.seals)[0]||base.configs(p,form,s.seals)[0],score:null};}
 if(s.phase==='forging'&&!choice)choice=candidateActions(api,s,w)[0]||null;
 return {choice,work:used,budgetHit,policyVersion:POLICY_VERSION,diagnostic:{baseline,chosenScore:Number.isFinite(best)?best:null,profile,examined:trace,elapsedMs:performance.now()-start,assumptions:['visible-board formations only; no true hidden formation','unseen hand uniform public-catalog prior; at most one modeled enemy spell','independent hypothetical RNG, never actual future RNG','damageRounds omitted by view: two hypothetical bounds, no true memory','retrospective positionEffects absent from G view are not read']}};
}
