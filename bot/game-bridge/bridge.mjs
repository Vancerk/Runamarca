import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {engine} from '../runner/lib/engine.mjs';
import {setCatalog,alive} from '../runner/lib/pilots.mjs';
import {decideGame} from '../runner/lib/game-decision-adapter.mjs';
import {sanitizeObservation} from '../runner/lib/decision-core.mjs';
import {publicRoom} from '../runner/lib/policy-base.mjs';
import {applyPlan} from '../runner/lib/policy-v1.mjs';
import {eligiblePatron} from '../runner/lib/compat-3090.mjs';
import {preparationAction,forcedPullPlan} from '../runner/lib/runner-actions.mjs';

// Must remain opt-in. This factory never imports a server or account/database module.
export async function createGameBotBridge({enabled=false,host,catalog,source,hostSourceRoot,level='intermediario',style='equilibrado',seed=20261026,now=Date.now,onDecision=()=>{}}){
 if(typeof host?.easyBotAction!=='function'||typeof host?.view!=='function')throw Error('BRIDGE: canonical view and legacy bot required');
 if(!enabled)return {enabled:false,nextAction:room=>host.easyBotAction(room),clear(){}};
 if(typeof hostSourceRoot!=='string'||!path.isAbsolute(hostSourceRoot))throw Error('BRIDGE: explicit absolute hostSourceRoot required');
 const planner=await engine(seed,0,source),identity=planner.sourceIdentity();
 // Refuse to plan against different rules than the host. Only implementation
 // files actually loaded by the isolated engine are compared, not server code.
 for(const file of identity.loadedFiles){
  const actual=fs.readFileSync(path.join(hostSourceRoot,file.relative));
  if(createHash('sha256').update(actual).digest('hex')!==file.sha256)throw Error('BRIDGE: host/planner source mismatch '+file.relative);
 }
 const snapshotCatalog=JSON.parse(fs.readFileSync(path.join(source,'mesa-nova/cartas.json'),'utf8'));
 if(JSON.stringify(catalog)!==JSON.stringify(snapshotCatalog))throw Error('BRIDGE: host/planner catalog mismatch');
 const api={...planner,act:(r,p,a)=>planner.act(r,p,a,catalog)};
 const queues=new WeakMap();
 const observe=(room,bot)=>{
  const v=structuredClone(host.view(room,bot)),self=v.players.find(p=>p.id===bot.id);
  // These are the bot's OWN legal decision memories, as in the simulator.
  self.preparationSerial=bot.preparationSerial;self.directPlayed=bot.directPlayed;self.discountUsed=bot.discountUsed;
  v.combatCount=room.combatCount||0;
  return sanitizeObservation(v);
 };
 function compile(view,plan){
  const r=publicRoom(view),p=r.players.find(x=>x.id===view.you),actions=[];
  const port={...api,act:(room,actor,action)=>{const data=structuredClone(action);api.act(room,actor,data);actions.push(data);}};
  applyPlan(port,r,p,plan);
  // Canonical ready validates all formation obligations before anything is sent
  // to the real host. No real room or real RNG participates in this dry run.
  port.act(r,p,{type:'ready'});
  return actions;
 }
 function queue(room,bot,actions){
  if(!actions.length)return null;
  const [action,...rest]=actions;
  queues.set(room,{actor:bot.id,expectedRevision:room.revision+1,actions:rest});
  return action;
 }
 function nextAction(room){
  const bot=room.players.find(p=>p.bot);if(!bot)return null;
  // Explicit legacy protocol, not a claim that these phases use the new policy.
  if(['lobby','mulligan'].includes(room.phase)||bot.pendingDiscard){queues.delete(room);return host.easyBotAction(room);}
  if(['coin','resolving','finished'].includes(room.phase)){queues.delete(room);return null;}
  if(['prep','forging'].includes(room.phase)&&room.turn!==bot.id)return null;
  if(room.phase==='formation'&&bot.ready)return null;
  const pending=queues.get(room);
  if(pending){
   queues.delete(room);
   if(room.phase==='formation'&&pending.actor===bot.id&&pending.expectedRevision===room.revision&&pending.actions.length)return queue(room,bot,pending.actions);
  }
  setCatalog(catalog);
  const observation=observe(room,bot);
  if(room.phase==='formation'&&observation.forceWindow&&now()<observation.forceWindow.until){
   const pull=forcedPullPlan(observation,now());
   // Unknown opponent lane occupancy is never inspected or guessed as empty.
   if(!pull.actions.length)return null;
   const simulated=publicRoom(observation),actor=simulated.players.find(p=>p.id===bot.id);
   for(const a of pull.actions)api.act(simulated,actor,a);
   return queue(room,bot,pull.actions);
  }
  if(room.phase==='vote'&&bot.vote!==null)return null;
  const decision=decideGame(api,observation,{level,style,phase:['formation','vote'].includes(room.phase)?'formation':room.phase});
  onDecision({observation:structuredClone(observation),decision:structuredClone(decision)});
  if(room.phase==='prep')return preparationAction(observation,decision.choice);
  if(room.phase==='forging'){if(decision.choice?.type!=='forgeChoice')throw Error('BRIDGE: forge choice required');return decision.choice;}
  if(room.phase==='vote'){
   const own=observation.players.find(p=>p.id===bot.id),ponderado=['paciente','ponderado'].includes(style);
   return {type:'vote',fight:(own.reserve.some(c=>alive(c)&&!own.emanation.includes(c.uid))||eligiblePatron(own))&&(!ponderado||decision.choice.plan.slots.some(Boolean))};
  }
  if(room.phase==='formation')return queue(room,bot,compile(observation,decision.choice.plan));
  throw Error('BRIDGE: unsupported phase '+room.phase);
 }
 return {enabled:true,nextAction,clear:room=>queues.delete(room),sourceIdentity:identity,profile:{level,style}};
}
