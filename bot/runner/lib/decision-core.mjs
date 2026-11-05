import {pilot} from './pilots.mjs';

export const DECISION_CONTRACT='runamarca-decision-observation-v1';
export const DIFFICULTIES=Object.freeze(['iniciante','intermediario','experiente']);
export const STYLES=Object.freeze(['agressivo','equilibrado','ponderado','paciente','controle','aleatorio']);
const topKeys=['you','phase','round','turn','first','winner','seals','forceWindow','laneBonuses','combatCount'];
const playerKeys=['id','deckId','study','patron','deckCount','handCount','discardCount','discard','weapons','forge','mana','manaMax','fatigue','pendingApprenticeTargets','pendingApprenticeSources','firstSpellUsedThisRound','pendingDiscard','hand','reserve','emanation','taunts','formation','ready','voted','preparationSerial','directPlayed','discountUsed'];
const select=(source,keys)=>Object.fromEntries(keys.filter(k=>Object.hasOwn(source,k)).map(k=>[k,structuredClone(source[k])]));

// This accepts a canonical owner view, NOT an authoritative room. The host must
// obtain it through its canonical view API first. Allowlisting is defense in depth.
export function sanitizeObservation(view){
 if(!view||typeof view.you!=='string'||!Array.isArray(view.players)||view.players.length!==2||view.players.filter(p=>p.id===view.you).length!==1)throw Error('DECISION: canonical owner observation required');
 const s=select(view,topKeys),revealed=['resolving','finished'].includes(s.phase);
 s.players=view.players.map(original=>{
  if(!Number.isInteger(original.handCount)||!Number.isInteger(original.deckCount))throw Error('DECISION: canonical zone counts required');
  const p=select(original,playerKeys),self=p.id===s.you;
  if(!Array.isArray(p.reserve)||!Array.isArray(p.prepared??original.prepared))throw Error('DECISION: canonical public zones required');
  p.prepared=structuredClone(original.prepared||[]).map(item=>item.hidden&&item.caster!==s.you&&!revealed?{...item,card:null}:item);
  // Never pass the true deck order, private opponent hand or hidden choices.
  if(!self){
   delete p.hand;delete p.preparationSerial;delete p.directPlayed;delete p.discountUsed;
   p.pendingApprenticeTargets=[];p.pendingApprenticeSources=[];p.pendingDiscard=0;
   if(p.study){delete p.study.book;delete p.study.grimoire;delete p.study.originalCards;delete p.study.seenIds;delete p.study.positionEffects;}
   if(p.forge)p.forge=select(p.forge,['stage','cost','dueRound']);
   if(!revealed){
    p.taunts={};p.formation=(p.formation||[null,null,null]).map(uid=>p.reserve.some(c=>c.uid===uid&&(c.anchor||c.sleep))?uid:null);
    for(const c of p.reserve)for(const key of ['protocolMode','monkMode','sealChoices','revealPaid','revealPaymentRound','auraLane'])delete c[key];
   }
  }else if(!Array.isArray(p.hand))throw Error('DECISION: owner hand required');
  return p;
 });
 s.spectators=[];s.events=[];s.log=[];s.combat=null;s.lastCombat=null;
 return s;
}

// Explicit capability port: all mutating search calls must target reconstructed
// hypothetical rooms. No callback receives the authoritative room via this API.
export function planningPort(api){
 const hypothetical=(fn)=>(room,...args)=>{
  if(room?.simulation!==true)throw Error('DECISION: search attempted to access a real room');
  return fn(room,...args);
 };
 for(const name of ['act','view','resolveCombat','quoteCardCost','weaponOptions','weaponRecipe'])if(typeof api[name]!=='function')throw Error('DECISION: missing planning capability '+name);
 return {act:hypothetical(api.act),view:hypothetical(api.view),resolveCombat:hypothetical(api.resolveCombat),quoteCardCost:api.quoteCardCost,weaponOptions:api.weaponOptions,weaponRecipe:api.weaponRecipe,studyPrepared:api.studyPrepared,random:api.random};
}

export function decideFromObservation(api,observation,{style='equilibrado',level='intermediario',phase=observation.phase,objective=null}={}){
 if(!DIFFICULTIES.includes(level)||!STYLES.includes(style))throw Error('DECISION: unknown difficulty or style');
 if(objective!==null&&typeof objective!=='string')throw Error('DECISION: objective must be a descriptive label');
 const view=sanitizeObservation(observation),resolvedStyle=style==='ponderado'?'paciente':style;
 const decision=pilot(planningPort(api),view,resolvedStyle,level,phase);
 return {...decision,contract:DECISION_CONTRACT,profileIdentity:{level,style,resolvedStyle,objective}};
}

// Execution is opt-in and distinct from planning. Host enforces actor, revision,
// phase and canonical legality. Plans are not silently treated as single actions.
export function executeDecision(decision,{executeAction,executeFormation,pass}={}){
 const choice=structuredClone(decision.choice);
 if(choice?.plan){if(typeof executeFormation!=='function')throw Error('DECISION: explicit formation executor required');return executeFormation(choice.plan);}
 if(choice){if(typeof executeAction!=='function')throw Error('DECISION: explicit action executor required');return executeAction(choice);}
 if(typeof pass!=='function')throw Error('DECISION: explicit pass executor required');
 return pass();
}
