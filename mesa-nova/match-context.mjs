// S6: per-match context, accumulated at the server boundary (never from the bounded log/event
// buffers and without touching the frozen engine). Each accepted or rejected action is seen as
// a before/after snapshot of the room; engine-driven changes (timers, combat) arrive through
// room.onChange. Contexts are keyed by room.matchId (beginMatch → new UUID), so reconnection
// keeps the same context, while reset and rematch start a new one.
import {createHash} from 'node:crypto';
const SPELLS=new Set(['spell','direct_spell','prepared_spell']),contexts=new Map(),MAX=500,STYLE=['actions','rejected','creatures','spellsDirect','spellsPrepared','equipment','emanations','patronPowers','mulliganCards','turnsEnded','votesFight','votesSkip','taunts','manaSpent'];
const modelOf=c=>c?.modelId||c?.id||null;
function cardIndex(p){const m=new Map();for(const zone of [p.hand,p.deck,p.reserve,p.discard,(p.prepared||[]).map(x=>x.card)])for(const c of zone||[])if(c?.uid)m.set(c.uid,{model:modelOf(c),type:c.type||null});return m;}
export function snapshot(room){return {matchId:room.matchId||null,phase:room.phase,round:room.round,players:new Map(room.players.map(p=>[p.id,{hand:new Set((p.hand||[]).map(c=>c.uid)),cards:cardIndex(p),mana:p.mana||0,used:JSON.stringify(p.patron?.usedPowers||{}),usedPowers:{...(p.patron?.usedPowers||{})}}]))};}
const countDeck=p=>{const out={};for(const c of [...(p.deck||[]),...(p.hand||[]),...(p.reserve||[])]){const k=modelOf(c);if(k)out[k]=(out[k]||0)+1;}return out;};
function kindOf(room){const humans=room.players.filter(p=>!p.bot).length;return room.simulation||humans===0?'simulation':'normal';}
function ensure(room,store){
 if(!room.matchId)return null;let ctx=contexts.get(room.matchId);if(ctx)return ctx;
 const roster=room.matchPlayers||room.players.map(p=>({id:p.id,discordId:p.discordId||null,name:p.name,bot:Boolean(p.bot)}));
 const humans=roster.filter(p=>!p.bot).length;
 ctx={schema:1,matchId:room.matchId,roomCode:room.code,kind:kindOf(room),simulationReason:room.simulation?String(room.simulation):humans===0?'no-human-participant':null,
  mode:humans===2?'pvp':humans===1?'pve':'bots',startedAt:Date.now(),endedAt:null,durationMs:null,rounds:room.round||1,finished:false,result:null,
  participants:roster.map(r=>{const p=room.players.find(x=>x.id===r.id)||{};return {participantId:r.id,accountId:r.discordId||null,name:r.name,kind:r.bot?'bot':'human',deckId:p.deckId||null,patron:p.patron?{id:p.patron.id||null,name:p.patron.name,affinity:p.patron.affinity||null}:null,deck:countDeck(p),usedCards:{},powers:{},style:Object.fromEntries(STYLE.map(k=>[k,0]))};}),
  observations:0,_used:new Map()};
 contexts.set(room.matchId,ctx);if(contexts.size>MAX)for(const [id,c] of contexts){if(c.finished){contexts.delete(id);break;}}
 return ctx;}
// Called by the server around every act() (actor/action/before/error) and from room.onChange.
export function observe(room,{actor=null,action=null,before=null,error=null,store=null}={}){
 const ctx=ensure(room,store);if(!ctx)return null;
 if(before&&before.matchId&&before.matchId!==ctx.matchId)return ctx;// action belonged to a match that just ended/reset
 ctx.observations++;ctx.rounds=Math.max(ctx.rounds,room.round||1);
 const part=actor&&ctx.participants.find(p=>p.participantId===actor.id);
 if(part&&action){const s=part.style;s.actions++;
  if(error)s.rejected++;
  else{const was=before?.players.get(actor.id),now=room.players.find(p=>p.id===actor.id);
   const left=was?[...was.hand].filter(uid=>!(now?.hand||[]).some(c=>c.uid===uid)):[];
   if(['play','creature','equip','equipment'].includes(action.type)){const seen=ctx._used.get(actor.id)||new Set();ctx._used.set(actor.id,seen);for(const uid of left){if(seen.has(uid))continue;seen.add(uid);const m=was.cards.get(uid)?.model;if(m)part.usedCards[m]=(part.usedCards[m]||0)+1;}}
   // Classified by the real catalog type of the card that left the hand and the mode actually used:
   // creature (direct entry into Emanação via play/mode:'emanate' also counts as an emanation),
   // direct_spell / prepared_spell / spell (prepared when mode is 'lane'/'prepared' or the card is
   // position-only), equipment.
   if(['play','creature','equip','equipment'].includes(action.type))for(const uid of left){const info=was.cards.get(uid),type=info?.type;
    if(type==='creature'){s.creatures++;if(action.mode==='emanate')s.emanations++;}
    else if(type==='equipment')s.equipment++;
    else if(SPELLS.has(type))(['lane','prepared'].includes(action.mode)||(type==='prepared_spell'&&action.mode!=='direct'))?s.spellsPrepared++:s.spellsDirect++;}
   if(action.type==='emanate')s.emanations++;
   if(action.type==='mulligan')s.mulliganCards+=left.length;
   if(action.type==='endPrep')s.turnsEnded++;
   if(action.type==='vote')action.fight?s.votesFight++:s.votesSkip++;
   if(action.type==='taunt')s.taunts++;
   if(was&&now&&now.mana<was.mana)s.manaSpent+=was.mana-now.mana;
   if(was&&now&&JSON.stringify(now.patron?.usedPowers||{})!==was.used)for(const [id,v] of Object.entries(now.patron?.usedPowers||{}))if(was.usedPowers[id]!==v){part.powers[id]=(part.powers[id]||0)+1;s.patronPowers++;}}}
 if(room.phase==='finished'&&!ctx.finished&&room.matchId===ctx.matchId){ctx.finished=true;ctx.endedAt=Date.now();ctx.durationMs=ctx.endedAt-ctx.startedAt;ctx.result={winner:room.winner??null,draw:room.winner==null};
  if(store)ctx.persisted=store.saveContext(publicRecord(ctx)).then(()=>true,e=>{ctx.persistError=e.message;return false;});}
 return ctx;}
export function contextFor(matchId){return contexts.get(matchId)||null;}
// Most recent context of this room in which the participant played (e.g. after a reset).
export function latestFor(roomCode,participantId){let found=null;for(const c of contexts.values())if(c.roomCode===roomCode&&c.participants.some(p=>p.participantId===participantId))found=c.matchId;return found;}
// Serializable context (no tokens; participant ids are the engine's seat ids).
export function publicRecord(ctx){const {_used,persisted,persistError,...rest}=ctx;return structuredClone(rest);}
export function eligibility(ctx,participantId){
 if(!ctx)return {eligible:false,reason:'MATCH_UNKNOWN'};const part=ctx.participants.find(p=>p.participantId===participantId);
 if(!part)return {eligible:false,reason:'NOT_A_PARTICIPANT'};if(part.kind!=='human')return {eligible:false,reason:'BOT_PARTICIPANT'};
 if(ctx.kind!=='normal')return {eligible:false,reason:'SIMULATION'};if(!ctx.finished)return {eligible:false,reason:'MATCH_NOT_FINISHED'};return {eligible:true,part};}
export const feedbackId=(matchId,participantId)=>createHash('sha256').update(`${matchId}:${participantId}`).digest('hex').slice(0,32);
export function _resetContextsForTest(){contexts.clear();}
