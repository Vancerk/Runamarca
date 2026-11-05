import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

// Executes the original source, with deterministic platform services. No game rule is replaced.
export async function engine(seed,firstIndex,source){
 const sourceRoot=fs.realpathSync(source),sourceManifestFile=path.join(sourceRoot,'manifest.json'),sourceManifestBytes=fs.readFileSync(sourceManifestFile),sourceManifest=JSON.parse(sourceManifestBytes),loadedFiles=[];
 if(sourceManifest.schema!==2||!sourceManifest.hashes||typeof sourceManifest.hashes!=='object')throw Error('Unsupported source manifest');
 function verifiedBytes(file){
  const actual=fs.realpathSync(file),rel=path.relative(sourceRoot,actual).replaceAll('\\','/');
  if(!actual.startsWith(sourceRoot+path.sep))throw Error('Read outside frozen source');
  const bytes=fs.readFileSync(actual);
  if(sourceManifest.hashes[rel]!==createHash('sha256').update(bytes).digest('hex'))throw Error('Frozen source hash mismatch: '+rel);
  return bytes;
 }
 let state=seed|0,uid=0,clock=0,serial=0,pilot=0;
 const planner=[seed^0x45d9f3b,seed^0x739baf13],timers=new Map(),modules=new Map();
 function random(){state=(state+0x6D2B79F5)|0;let t=Math.imul(state^state>>>15,1|state);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;}
 const plannerRandom=()=>{planner[pilot]=(Math.imul(planner[pilot],1664525)+1013904223)|0;return (planner[pilot]>>>0)/4294967296;};
 class Clock extends Date{constructor(...args){super(...(args.length?args:[clock]));}static now(){return clock;}}
 const ctx=vm.createContext({Buffer,URL,structuredClone,console,Date:Clock,setTimeout:(fn,delay)=>{const id=++serial;timers.set(id,{fn,at:clock+delay});return {id,unref(){return this;}};},clearTimeout:h=>timers.delete(h?.id??h)});
 vm.runInContext('Math.random = () => { throw Error("RNG implícito não permitido na simulação"); };',ctx);
 function synthetic(key,exports){if(!modules.has(key))modules.set(key,new vm.SyntheticModule(Object.keys(exports),function(){for(const [k,v]of Object.entries(exports))this.setExport(k,v);},{context:ctx}));return modules.get(key);}
 function load(file){
  if(file==='node:crypto')return synthetic(file,{createHash,randomUUID:()=>`${seed}-${++uid}`,randomBytes:n=>n===1?Buffer.from([firstIndex]):Buffer.from(Array.from({length:n},()=>Math.floor(random()*256)))});
  if(file==='node:fs')return synthetic(file,{readFileSync:(name,options)=>{const bytes=verifiedBytes(name instanceof URL?fileURLToPath(name):path.resolve(name)),encoding=typeof options==='string'?options:options?.encoding;return encoding?bytes.toString(encoding):bytes;}});
  if(file.endsWith(path.sep+'accounts.mjs'))return synthetic(file,{beginMatch:()=>{}});
  if(file.startsWith('node:'))throw Error('Dependência não auditada: '+file);
  if(modules.has(file))return modules.get(file);
  const actual=fs.realpathSync(file),rel=path.relative(sourceRoot,actual).replaceAll('\\','/');
  if(!actual.startsWith(sourceRoot+path.sep))throw Error('Módulo fora da fonte congelada: '+rel);
  const data=fs.readFileSync(actual),sha256=createHash('sha256').update(data).digest('hex');
  if(sourceManifest.schema===2&&sourceManifest.hashes[rel]!==sha256)throw Error('Módulo difere da importação G: '+rel);
  loadedFiles.push({path:actual,relative:rel,sha256});
  const mod=new vm.SourceTextModule(data.toString('utf8'),{context:ctx,identifier:actual,initializeImportMeta:meta=>meta.url=pathToFileURL(actual).href});modules.set(file,mod);return mod;
 }
 const main=load(path.resolve(source,'mesa-nova/game.mjs'));await main.link((s,p)=>load(s.startsWith('node:')?s:path.resolve(path.dirname(p.identifier),s)));await main.evaluate();const real=main.namespace;
 function call(name,room,...args){
  if(!room.simulation)return real[name](room,...args);
  const saved={state,uid,clock,serial,timers:new Map(timers)};
  // Search uses a fixed hypothetical stream, never the future RNG of the actual match.
  state=room.simulationContext?.state??room.simulationSeed??0x13572468;uid=room.simulationContext?.uid??1000000;timers.clear();
  try{return real[name](room,...args);}finally{room.simulationContext={state,uid};({state,uid,clock,serial}=saved);timers.clear();for(const [k,v]of saved.timers)timers.set(k,v);}
 }
 const api={...real,makeRoom:(...args)=>{const room=real.makeRoom(...args);room.rulesSeed=seed>>>0;return room;},random:plannerRandom,setPilot:i=>{pilot=i;},restoreDecisionContext:(data)=>{clock=data.clock;planner[0]=data.planner[0];planner[1]=data.planner[1];},now:()=>clock,
  quoteCardCost:(own,card)=>{
   // G's paidCost uses this exported canonical helper. Its additional legacy
   // M04 modifier has no pure exported quote: do not reproduce that formula.
   if((own.emanation||[]).some(uid=>own.reserve.some(c=>c.uid===uid&&c.modelId==='M04')))return {known:false,reason:'canonical M04 payment quote not exported'};
   const file=path.join(sourceRoot,'mesa-nova/fluxo-studies.mjs'),helper=modules.get(file)?.namespace.studyCardCost;
   if(typeof helper!=='function')return {known:false,reason:'canonical studyCardCost not exported'};
   const effectiveCost=helper({...own,studyBook:own.study?.book||own.studyBook},card);
   if(!Number.isFinite(effectiveCost)||effectiveCost<0)throw Error('CONTRACT: custo canônico inválido.');
   return {known:true,effectiveCost,source:{export:'studyCardCost',module:'mesa-nova/fluxo-studies.mjs',sha256:loadedFiles.find(f=>f.relative==='mesa-nova/fluxo-studies.mjs').sha256}};
  },
  studyPrepared:own=>structuredClone(modules.get(path.join(sourceRoot,'mesa-nova/fluxo-studies.mjs')).namespace.studyPrepared(own)),
  sourceIdentity:()=>structuredClone({root:sourceRoot,manifestSha256:createHash('sha256').update(sourceManifestBytes).digest('hex'),sourceRoot:sourceManifest.sourceRoot||null,identity:sourceManifest.identity||'legacy source',loadedFiles}),
  weaponOptions:(stage,cost)=>structuredClone(modules.get(path.join(sourceRoot,'mesa-nova/equipment.mjs')).namespace.weaponOptions(stage,cost)),
  weaponRecipe:(cost,chassis,blade)=>structuredClone(modules.get(path.join(sourceRoot,'mesa-nova/equipment.mjs')).namespace.weaponRecipe(cost,chassis,blade)),
  act:(r,p,a,c)=>call('act',r,p,a,c),resolveCombat:r=>call('resolveCombat',r),
  view:(room,p)=>{
   const s=structuredClone(real.view(room,p));s.events=[];s.log=[];s.combat=null;s.lastCombat=null;s.music=null;s.combatCount=room.combatCount||0;
   delete s.inviteToken;delete s.matchId;delete s.recording;
   for(const v of s.players){if(v.id===p.id){v.preparationSerial=p.preparationSerial;v.directPlayed=p.directPlayed;v.discountUsed=p.discountUsed;}else{
    delete v.hand;for(const c of v.reserve)for(const key of ['protocolMode','monkMode','sealChoices','revealPaid','revealPaymentRound','auraLane'])delete c[key];
   }}return s;
  },
  flush(){const entry=[...timers].sort((a,b)=>a[1].at-b[1].at||a[0]-b[0])[0];if(!entry)throw Error('Fase sem temporizador');timers.delete(entry[0]);clock=entry[1].at;entry[1].fn();},
  diagnostic:()=>({state,planner:[...planner],uid,clock,serial,timers:[...timers].map(([id,t])=>({id,at:t.at}))})
 };
 return api;
}
