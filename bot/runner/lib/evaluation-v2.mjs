import * as base from './policy-base.mjs';

export const EVALUATION_VERSION='public-utility-v2.2-protection';
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
const living=p=>(p.reserve||[]).filter(c=>base.alive(c)&&!(p.emanation||[]).includes(c.uid));
const deckCount=p=>Array.isArray(p.deck)?p.deck.length:(p.deckCount||0);
const health=p=>(p.patron.hp||0)+(p.patron.extraLife||0);
const pressure=p=>living(p).map(base.atk).sort((a,b)=>b-a).slice(0,3).reduce((a,b)=>a+b,0);
function quote(api,p,c){const q=api.quoteCardCost(p,c);return q.known&&Number.isFinite(q.effectiveCost)?q.effectiveCost:null;}

// Pure heuristic over a reconstructed, permitted-information room. Never reads
// deck identities, originalDeck, opponent hand contents, or RNG. No legality rule
// is inferred here: the canonical action executor remains the legality oracle.
export function components(api,r,id,w){
 const p=r.players.find(p=>p.id===id),q=r.players.find(p=>p.id!==id);
 const baseline=base.evaluate(r,id,w);
 if(r.phase==='finished')return {baseline,hand:0,investment:0,sharing:0,survival:0,fatigue:0,pressure:0,total:baseline};
 const allies=living(p),enemies=living(q),futureMana=Math.min(10,(p.manaMax||0)+1);
 const threat=Math.max(0,pressure(q)-pressure(p)*.45);
 // Investment return shrinks under visible pressure; it never overrides a
 // terminal result. This is not a prediction of an unseen opponent's hand.
 const safety=clamp((health(p)-threat)/12,0,1);
 const runway=clamp(deckCount(p)/3,0,1)*safety;
 const known=(p.hand||[]).filter(c=>c.type!=='unknown');
 // Forecast draws are unknown placeholders, not magically superior cards.
 // Give them the same neutral utility as a playable known spell; do not infer
 // their identity or charge their placeholder cost (99) as real card cost.
 let hand=-(p.hand||[]).filter(c=>c.type==='unknown').length*.2*w.hand,savings=[];
 const withoutDiscount=p.study?.discount?{...p,study:{...p.study,discount:false}}:null;
 for(const c of known){
  const cost=quote(api,p,c);
  // Unknown canonical quotes retain baseline value, not guessed payment rules.
  if(cost===null)continue;
  const payable=cost<=futureMana?1:clamp(futureMana/Math.max(1,cost),.2,.8);
  let use=.48+.32*payable;
  if(c.type==='creature')use+=allies.length<3?.12:allies.length>=6?-.2:0;
  if(c.type==='equipment'&&!allies.length)use-=.18;
  if((c.effects||[]).some(e=>e.op==='draw')&&(deckCount(p)===0||known.length>=8))use-=.3;
  hand+=(clamp(use,.15,1)-1)*w.hand;
  if(withoutDiscount){const before=quote(api,withoutDiscount,c);if(before!==null&&before>cost)savings.push((before-cost)*payable);}
 }
 // At most three known cards can amortize a persistent discount in this short
 // evaluation window. No magic value for merely having clicked Studies.
 const investment=savings.sort((a,b)=>b-a).slice(0,3).reduce((a,b)=>a+b,0)*(.65+.5*w.future)*runway;
 let sharing=0;
 if(p.study?.sharing&&typeof api.studyPrepared==='function'){
  // Ask the canonical helper which own cards produce echoes; do not duplicate
  // its evolving operation whitelist. Potential only: targets must be visible.
  let eligible=0;
  for(const c of known){
   // studyPrepared expects a legal prepared spell; it is not a card-type or
   // lane-play validator. Creatures and equipment cannot be supplied as
   // synthetic spell entries; direct spells may also echo on occupied lanes.
   if(['creature','equipment'].includes(c.type))continue;
   const cost=quote(api,p,c);if(cost===null||cost>futureMana)continue;
   const hypothetical={...p,prepared:[{card:c,lane:0,caster:p.id,targetSide:p.id}]};
   if(api.studyPrepared(hypothetical).some(t=>t.echo))eligible++;
  }
  sharing=Math.min(2,eligible)*Math.min(1,(allies.length+enemies.length)/3)*(.55+.35*w.future)*runway;
 }
 // Extra penalty near death makes surviving more valuable than accumulating
 // unusable resources. Public armour participates, just as in base evaluation.
 const danger=x=>Math.max(0,10-health(x))**2*.035*w.face;
 const survival=danger(q)-danger(p);
 // One draw of exposure, without peeking at the next card or simulating future
 // RNG. Canonical forecast already accounts for actual damage it resolves.
 const fatigueRisk=x=>deckCount(x)===0?Math.min(8,(x.fatigue||0)+1)*.3*w.face:deckCount(x)===1?.15*w.face:0;
 const fatigue=fatigueRisk(q)-fatigueRisk(p);
 // Realised field control must have an outlet. Reward visible attack slightly,
 // only when opposing blockers are scarce; formation/combat remain canonical.
 const outlet=(a,b)=>pressure(a)*clamp((3-living(b).length)/3,0,1);
 const attackPressure=(outlet(p,q)-outlet(q,p))*.12*w.face;
 const total=baseline+hand+investment+sharing+survival+fatigue+attackPressure;
 return {baseline,hand,investment,sharing,survival,fatigue,pressure:attackPressure,total};
}
export function evaluator(api,r,id,w){return components(api,r,id,w).total;}
