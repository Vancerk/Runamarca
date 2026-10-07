import test from 'node:test';
import assert from 'node:assert/strict';
import {createDiscordRest} from './discord-rest.mjs';
const response=(status,data,headers={})=>new Response(JSON.stringify(data),{status,headers});
test('429 waits retry_after and retries only the rejected request',async()=>{
 let clock=0,calls=0;const waits=[];const rest=createDiscordRest('fake',{now:()=>clock,sleep:async ms=>{waits.push(ms);clock+=ms;},fetchImpl:async()=>++calls===1?response(429,{retry_after:3,global:false},{'x-ratelimit-bucket':'bucket'}):response(200,{id:'sent'})});const sent=await rest.api('/channels/123/messages',{content:'test'});assert.equal(sent.id,'sent');assert.deepEqual(waits,[3050]);assert.equal(calls,2);assert.equal(rest.metrics().retries,1);
});
test('remaining=0 delays the next message before requesting Discord again',async()=>{
 let clock=0,calls=0;const waits=[];const rest=createDiscordRest('fake',{now:()=>clock,sleep:async ms=>{waits.push(ms);clock+=ms;},fetchImpl:async()=>response(200,{id:String(++calls)},{'x-ratelimit-bucket':'b','x-ratelimit-remaining':calls===1?'0':'1','x-ratelimit-reset-after':'0.5'})});await Promise.all([rest.api('/channels/123/messages',{}),rest.api('/channels/123/messages',{})]);assert.deepEqual(waits,[550]);assert.equal(rest.metrics().rateLimitResponses,0);
});
test('unknown delivery and server failure are not retried; invalid token stops later requests',async()=>{
 let requests=0;const ambiguous=createDiscordRest('fake',{fetchImpl:async()=>{requests++;throw Error('timeout');}});await assert.rejects(ambiguous.api('/channels/123/messages',{}));assert.equal(requests,1);
 const invalid=createDiscordRest('fake',{fetchImpl:async()=>{requests++;return response(401,{code:0});}});await assert.rejects(invalid.api('/channels/123/messages',{}));await assert.rejects(invalid.api('/users/@me/channels',{}));assert.equal(requests,2);
 const failed=createDiscordRest('fake',{fetchImpl:async()=>response(500,{})});await assert.rejects(failed.api('/channels/123/messages',{}),error=>error.definite===false);
});
