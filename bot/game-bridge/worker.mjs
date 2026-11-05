import {parentPort,workerData} from 'node:worker_threads';
import {createGameBotBridge} from './bridge.mjs';
const states=new Map(),observations=new WeakMap();
const bridge=await createGameBotBridge({...workerData,enabled:true,host:{
 view:room=>observations.get(room),easyBotAction:()=>{throw Error('Legacy phase must stay on host');}
}});
parentPort.postMessage({kind:'ready',profile:bridge.profile});
parentPort.on('message',message=>{
 if(message.kind==='clear'){const state=states.get(message.key);if(state)bridge.clear(state);states.delete(message.key);return;}
 const {id,key,observation,revision,botState}=message;
 parentPort.postMessage({kind:'started',id});
 try{
  let state=states.get(key);if(!state){state={};states.set(key,state);}
  Object.assign(state,{phase:observation.phase,turn:observation.turn,revision,combatCount:observation.combatCount,
   players:[{id:observation.you,bot:true,...botState}]});
  observations.set(state,observation);
  const started=performance.now(),action=bridge.nextAction(state);
  parentPort.postMessage({kind:'result',id,action,elapsedMs:performance.now()-started});
 }catch{parentPort.postMessage({kind:'result',id,error:'Shared bot decision failed'});}
});
