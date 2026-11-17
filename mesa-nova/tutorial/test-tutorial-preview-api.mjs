import test from 'node:test';
import assert from 'node:assert/strict';
import {startTutorialPreview} from './tutorial-preview-server.mjs';
test('isolated HTTP flow, owner authentication, origin, version, secrecy and exit',async()=>{
 const server=await startTutorialPreview({delay:15});
 const request=async(path,{method='GET',body,token,origin=server.origin}={})=>{
  const result=await fetch(server.origin+path,{method,headers:{'Content-Type':'application/json',Origin:origin,...(token?{'x-player-token':token}:{})},...(body?{body:JSON.stringify(body)}:{})});
  return {status:result.status,data:result.status===204?null:await result.json()};};
 try{
  assert.equal((await request('/health')).data.ok,true);
  assert.equal((await request('/runamarca/api/tutorial',{method:'POST',body:{name:'A'},origin:'https://example.invalid'})).status,403);
  const start=await request('/runamarca/api/tutorial',{method:'POST',body:{name:'Teste'}});assert.equal(start.status,201);
  const {code,token,state}=start.data,endpoint='/runamarca/api/rooms/'+code;assert.equal(state.tutorial.instruction.id,'objective');assert.equal(state.players.find(p=>p.id!==state.you).hand,undefined);assert.equal(state.players.find(p=>p.id!==state.you).handCount,2);
  assert.equal((await request(endpoint+'/state')).status,403);
  assert.equal((await request(endpoint+'/state',{token:'invalid'})).status,403);
  assert.equal((await request(endpoint+'/state?revision='+state.revision,{token})).status,204);
  const first={id:'api-first',version:state.tutorial.version,action:{type:'tutorialContinue',sceneId:'objective'}};
  const current=await request(endpoint+'/act',{method:'POST',token,body:first});assert.equal(current.data.tutorial.instruction.id,'play-creature');
  const duplicate=await request(endpoint+'/act',{method:'POST',token,body:first});assert.equal(duplicate.data.tutorial.version,current.data.tutorial.version);
  assert.equal((await request(endpoint+'/act',{method:'POST',token,body:{...first,id:'old'}})).data.code,'TUTORIAL_STALE');
  const refresh=await request(endpoint+'/state',{token});assert.equal(refresh.data.tutorial.instruction.id,'play-creature');
  const replay=await request('/runamarca/api/tutorial',{method:'POST',token,body:{name:'Teste'}});assert.notEqual(replay.data.code,code);assert.notEqual(replay.data.token,token);
  assert.equal((await request(endpoint+'/state',{token})).status,404);
  const end=await request('/runamarca/api/rooms/'+replay.data.code+'/act',{method:'POST',token:replay.data.token,body:{id:'exit',version:replay.data.state.tutorial.version,action:{type:'tutorialExit'}}});assert.equal(end.data.left,true);
  assert.equal((await request('/health')).data.rooms,0);
  assert.equal((await request('/runamarca/api/rooms',{method:'POST',body:{name:'Not allowed'}})).status,404);
  const source=await fetch(server.origin+'/runamarca/tutorial-preview-server.mjs');assert.equal(source.status,404);
 }finally{await server.close();}
});
