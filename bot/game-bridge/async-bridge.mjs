import {Worker} from 'node:worker_threads';
import path from 'node:path';
import {sanitizeObservation} from '../runner/lib/decision-core.mjs';
// One worker at a time, host-owned bounded queue. Worker/VM are not OS sandboxes.
export async function createAsyncGameBotBridge({host,catalog,source,hostSourceRoot,enabled=true,
 level='intermediario',style='equilibrado',timeoutMs=10000,startupTimeoutMs=10000,maxPending=8}={}){
 if(!enabled)return {enabled:false,nextAction:async room=>host.easyBotAction(room),clear(){},close:async()=>{}};
 if(typeof hostSourceRoot!=='string'||!path.isAbsolute(hostSourceRoot))throw Error('Explicit absolute hostSourceRoot required');
 if(level!=='intermediario'||style!=='equilibrado')throw Error('Reviewed deployment profile is intermediario/equilibrado (500)');
 if(!Number.isFinite(timeoutMs)||timeoutMs<1||timeoutMs>10000||!Number.isFinite(startupTimeoutMs)||startupTimeoutMs<1||startupTimeoutMs>10000||!Number.isInteger(maxPending)||maxPending<1||maxPending>8)throw Error('Invalid worker limits');
 const keys=new WeakMap(),epochs=new WeakMap(),inflight=new WeakSet(),blocked=new WeakMap(),queue=[];
 let worker,active=null,closed=false,recovering=false,recovery=null,serial=0,roomSerial=0,restarts=0;
 const error=(message,code)=>Object.assign(Error(message),{code});
 const keyFor=room=>{if(!keys.has(room))keys.set(room,++roomSerial);return keys.get(room);};
 const current=item=>(epochs.get(item.room)||0)===item.epoch&&item.room.revision===item.revision&&item.room.phase===item.phase&&item.room.turn===item.turn&&item.room.players.includes(item.bot)&&item.room.matchId===item.matchId;
 function settle(item,err,result){clearTimeout(item.timer);if(err)item.reject(err);else item.resolve(result);}
 function drain(err){if(active){settle(active,err);active=null;}for(const item of queue.splice(0))settle(item,err);}
 async function startWorker(){
  const candidate=new Worker(new URL('./worker.mjs',import.meta.url),{workerData:{catalog,source,hostSourceRoot,level,style},execArgv:['--experimental-vm-modules'],resourceLimits:{maxOldGenerationSizeMb:256}});
  worker=candidate;
  try{await new Promise((resolve,reject)=>{
   const finish=err=>{clearTimeout(timer);candidate.off('error',onError);candidate.off('exit',onExit);candidate.off('message',onMessage);err?reject(err):resolve();};
   const onError=()=>finish(Error('Shared bot initialization failed'));
   const onExit=()=>finish(Error('Shared bot exited during initialization'));
   const onMessage=msg=>finish(msg.kind==='ready'?null:Error('Unexpected worker initialization'));
   const timer=setTimeout(()=>finish(Error('Shared bot initialization timeout')),startupTimeoutMs);
   candidate.once('error',onError);candidate.once('exit',onExit);candidate.once('message',onMessage);
  });}catch(e){await candidate.terminate();throw e;}
  if(closed){await candidate.terminate();return;}
  candidate.on('error',()=>{if(worker===candidate&&!closed&&!recovering)void recover('worker_error');});
  candidate.on('exit',()=>{if(worker===candidate&&!closed&&!recovering)void recover('worker_exit');});
  candidate.on('message',msg=>{
   if(worker!==candidate||recovering||closed||!active||msg.id!==active.id||msg.kind!=='result')return;
   const item=active;active=null;
   if(msg.error&&current(item)){blocked.set(item.room,item.room.matchId);settle(item,error('Shared bot decision failed','BOT_ROOM_FAILED'));}
   else if(msg.error)settle(item,null,{action:null});
   else settle(item,null,msg);
   pump();
  });
  candidate.unref();
 }
 async function recover(reason){
  if(recovering||closed)return;
  recovering=true;const old=worker;
  if(active){
   // A rematch or a cleared observation must not inherit the failed old job.
   if(current(active)){blocked.set(active.room,active.matchId);settle(active,error('Shared bot decision '+reason,'BOT_ROOM_FAILED'));}
   else settle(active,null,{action:null});
   active=null;
  }
  recovery=(async()=>{
   await old.terminate(); // never overlap old and replacement workers
   if(closed)return;
   if(restarts>=2){closed=true;drain(error('Shared bot recovery limit reached','BOT_UNAVAILABLE'));return;}
   restarts++;
   try{await startWorker();}catch{closed=true;drain(error('Shared bot recovery startup failed','BOT_UNAVAILABLE'));}
  })();
  try{await recovery;}finally{recovering=false;if(!closed)pump();}
 }
 function pump(){
  if(closed||recovering||active)return;
  while(queue.length){
   const item=queue.shift();
   if(!current(item)){settle(item,null,{action:null});continue;}
   active=item;worker.ref();
   item.timer=setTimeout(()=>void recover('deadline exceeded'),timeoutMs);
   try{worker.postMessage(item.message);}catch(e){active=null;settle(item,e);continue;}
   return;
  }
  worker.unref();
 }
 await startWorker();
 function clear(room){epochs.set(room,(epochs.get(room)||0)+1);if(!closed&&!recovering)worker.postMessage({kind:'clear',key:keyFor(room)});}
 async function nextAction(room){
  if(closed)throw Error('Shared bot worker unavailable');
  if(blocked.has(room)&&blocked.get(room)===room.matchId)throw error('Shared bot room quarantined after failed decision','BOT_ROOM_FAILED');
  const bot=room.players.find(p=>p.bot);if(!bot)return null;
  if(['lobby','mulligan'].includes(room.phase)||bot.pendingDiscard){clear(room);return host.easyBotAction(room);}
  if(['coin','resolving','finished'].includes(room.phase)){clear(room);return null;}
  if(['prep','forging'].includes(room.phase)&&room.turn!==bot.id||room.phase==='formation'&&bot.ready||room.phase==='vote'&&bot.vote!==null)return null;
  if(inflight.has(room))throw Error('Decision already pending for room');
  if(queue.length+(active?1:0)>=maxPending)throw error('Shared bot queue capacity reached','BOT_QUEUE_FULL');
  const raw=structuredClone(host.view(room,bot)),self=raw.players.find(p=>p.id===bot.id);
  Object.assign(self,{preparationSerial:bot.preparationSerial,directPlayed:bot.directPlayed,discountUsed:bot.discountUsed});raw.combatCount=room.combatCount||0;
  const observation=sanitizeObservation(raw),revision=room.revision,phase=room.phase,turn=room.turn,id=++serial,key=keyFor(room),epoch=epochs.get(room)||0,matchId=room.matchId;
  const item={room,bot,revision,phase,turn,epoch,matchId,id,timer:null,message:{id,key,observation,revision,botState:{pendingDiscard:0,ready:bot.ready,vote:bot.vote,preparationSerial:bot.preparationSerial,directPlayed:bot.directPlayed,discountUsed:bot.discountUsed}}};
  inflight.add(room);
  try{
   const result=await new Promise((resolve,reject)=>{Object.assign(item,{resolve,reject});queue.push(item);pump();});
   if(!current(item)){clear(room);return null;}
   return result.action;
  }finally{inflight.delete(room);}
 }
 return {enabled:true,nextAction,clear,profile:{level,style,budget:500},async close(){closed=true;drain(Error('Bridge closed'));await worker.terminate();if(recovery)await recovery;}};
}
