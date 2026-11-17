import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {startTutorialCampaign} from './tutorial-campaign-server.mjs';
import {openTutorialStore} from './tutorial-store.mjs';
const temp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'runamarca-tutorial-'));
function client(getServer){return async(route,{method='GET',body,token,origin=getServer().origin}={})=>{const response=await fetch(getServer().origin+route,{method,headers:{Origin:origin,Connection:'close','Content-Type':'application/json',...(token?{'x-player-token':token}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:response.status,data:response.status===204?null:await response.json()};};}

test('durable independent checkpoints, bearer ownership, restart paused, idempotency and no client-forged progress',async()=>{
 const directory=temp();let server=await startTutorialCampaign({directory,delay:20});const req=client(()=>server);let credentials,firstRequest;
 try{
  assert.equal((await req('/runamarca/api/tutorial',{method:'POST',origin:'https://example.invalid',body:{duel:2}})).status,403);
  assert.equal((await req('/runamarca/api/tutorial',{method:'POST',body:{duel:7}})).status,400);
  const first=await req('/runamarca/api/tutorial',{method:'POST',body:{duel:2,progress:{complete:true},snapshot:{evil:true}}});assert.equal(first.status,201);credentials=first.data;
  assert.equal(credentials.state.tutorial.persistence.saved,true);assert.equal(credentials.state.tutorial.campaign.duels.some(d=>d.complete),false);
  const {token,code}=credentials;assert.equal((await req('/runamarca/api/rooms/'+code+'/state')).status,403);
  assert.equal((await req('/runamarca/api/tutorial/progress',{token:'f'.repeat(48)})).status,403);
  assert.equal((await req('/runamarca/tutorial-store.mjs')).status,404);
  const pathAct='/runamarca/api/rooms/'+code+'/act';firstRequest={id:'saved-receipt',version:credentials.state.tutorial.version,action:{type:'confirmMulligan'}};
  const continued=await req(pathAct,{method:'POST',token,body:firstRequest});assert.equal(continued.status,200);const current=continued.data;
  const third=await req('/runamarca/api/tutorial',{method:'POST',token,body:{duel:3}});assert.equal(third.status,201);assert.equal(third.data.state.tutorial.instruction.id,'opening');
  assert.equal(third.data.state.tutorial.campaign.duels.filter(d=>d.saved).length,2);
  const back=await req('/runamarca/api/tutorial',{method:'POST',token,body:{duel:2,resume:true}});assert.equal(back.data.code,code);assert.equal(back.data.state.phase,current.phase);assert.equal(back.data.state.tutorial.clock.paused,true);
  const port=Number(new URL(server.origin).port);await server.close();server=await startTutorialCampaign({directory,port,delay:20});
  const restored=await req('/runamarca/api/rooms/'+code+'/state',{token});assert.equal(restored.status,200);assert.equal(restored.data.tutorial.clock.paused,true);assert.deepEqual(restored.data.players.find(p=>p.id===restored.data.you).hand,current.players.find(p=>p.id===current.you).hand);
  const before=restored.data.tutorial.version;assert.equal((await req(pathAct,{method:'POST',token,body:firstRequest})).data.tutorial.version,before);
  const raw=fs.readFileSync(path.join(directory,fs.readdirSync(directory).find(n=>n.endsWith('.json'))),'utf8');assert.equal(raw.includes(token),false);assert.equal(JSON.parse(raw).data.duels['2'].room.players.every(p=>p.token===null),true);
 }finally{await server.close();}
});

test('save failures pause the room and do not acknowledge a durable mutation',async()=>{
 const directory=temp();let broken=false;const storeFactory=(dir,opts)=>{const store=openTutorialStore(dir,opts);return {...store,write(data){if(broken)throw Object.assign(Error('disk full'),{code:'ENOSPC'});store.write(data);}};};
 const server=await startTutorialCampaign({directory,storeFactory});const req=client(()=>server);
 try{const first=(await req('/runamarca/api/tutorial',{method:'POST',body:{duel:2}})).data,endpoint='/runamarca/api/rooms/'+first.code;const filename=path.join(directory,fs.readdirSync(directory).find(n=>n.endsWith('.json'))),before=fs.readFileSync(filename,'utf8');broken=true;
  const reply=await req(endpoint+'/act',{method:'POST',token:first.token,body:{id:'full-disk',version:first.state.tutorial.version,action:{type:'confirmMulligan'}}});assert.equal(reply.status,503);assert.equal(reply.data.code,'SAVE_FAILED');
  const state=(await req(endpoint+'/state',{token:first.token})).data;assert.equal(state.tutorial.clock.paused,true);assert.equal(state.tutorial.persistence.saved,false);assert.equal(fs.readFileSync(filename,'utf8'),before);
 }finally{await server.close();}
});

test('corrupt or incompatible saves stop startup without overwriting prior evidence; one writer only',async()=>{
 const directory=temp();const server=await startTutorialCampaign({directory});const req=client(()=>server);
 try{await req('/runamarca/api/tutorial',{method:'POST',body:{duel:3}});await assert.rejects(startTutorialCampaign({directory}),{code:'SAVE_BUSY'});}finally{await server.close();}
 const filename=path.join(directory,fs.readdirSync(directory).find(n=>n.endsWith('.json')));const original=fs.readFileSync(filename,'utf8');fs.writeFileSync(filename,original.slice(0,-7));
 await assert.rejects(startTutorialCampaign({directory}),{code:'SAVE_INVALID'});assert.equal(fs.readFileSync(filename,'utf8'),original.slice(0,-7));
 fs.writeFileSync(filename,original);const envelope=JSON.parse(original);const store=openTutorialStore(directory,{build:'different'});try{assert.throws(()=>store.readAll(),{code:'SAVE_INVALID'});}finally{store.close();}assert.equal(JSON.parse(original).data.build,envelope.data.build);
});
