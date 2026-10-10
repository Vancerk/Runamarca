import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createAccessSessions,accessSessionAge} from '../mesa-nova/access-session.mjs';

const request=(host,cookie='')=>({headers:{host,cookie},socket:{encrypted:false}});
test('local ports keep independent cookies, including after server restart',()=>{
  const first=createAccessSessions(),restarted=createAccessSessions();
  const a=first.issue(request('127.0.0.1:3066'),'/runamarca');
  const b=restarted.issue(request('127.0.0.1:3067'),'/runamarca');
  assert.notEqual(a.split('=')[0],b.split('=')[0]);
  const jar=a+'; '+b;
  assert.equal(restarted.has(request('127.0.0.1:3066',jar),'/runamarca'),true);
  assert.equal(first.has(request('127.0.0.1:3067',jar),'/runamarca'),true);
  assert.equal(first.has(request('127.0.0.1:3067',a),'/runamarca'),false);
});
test('tampering, expiration and replay on another host or path are rejected',()=>{
  let now=1_800_000_000_000;
  const access=createAccessSessions(randomBytes(32),()=>now);
  const cookie=access.issue(request('elysiumjogos.onrender.com'),'/runamarca');
  assert.equal(access.has(request('elysiumjogos.onrender.com',cookie),'/runamarca'),true);
  assert.equal(access.has(request('runamarca.onrender.com',cookie),'/runamarca'),false);
  assert.equal(access.has(request('elysiumjogos.onrender.com',cookie),'/'),false);
  const last=cookie.at(-1)==='a'?'b':'a';
  assert.equal(access.has(request('elysiumjogos.onrender.com',cookie.slice(0,-1)+last),'/runamarca'),false);
  now+=accessSessionAge;
  assert.equal(access.has(request('elysiumjogos.onrender.com',cookie),'/runamarca'),false);
});
test('cookie retains security flags and 30 day lifetime',()=>{
  const access=createAccessSessions(randomBytes(32));let cookie;
  const req=request('elysiumjogos.onrender.com');req.headers['x-forwarded-proto']='https';
  access.grant(req,{setHeader:(_,value)=>{cookie=value;}},'/runamarca');
  assert.match(cookie,/; HttpOnly; SameSite=Lax; Path=\/runamarca; Max-Age=2592000; Secure$/);
});
test('other permission errors do not redirect to the access code screen',async()=>{
  const source=readFileSync(new URL('../mesa-nova/app.js',import.meta.url),'utf8');
  const fn=source.slice(source.indexOf('async function api('),source.indexOf('\nfunction trackArrivals'));
  let redirects=0,code='ACCOUNT_REQUIRED';
  const context=vm.createContext({gameBase:'/runamarca/',sessionStorage:{getItem:()=>null},setTimeout,clearTimeout,AbortController,location:{assign:()=>{redirects++;}},fetch:async()=>({status:403,ok:false,json:async()=>({code,error:'Permissão necessária.'})})});
  vm.runInContext(fn,context);
  await assert.rejects(context.api('/api/create',{}),error=>error.code==='ACCOUNT_REQUIRED');
  assert.equal(redirects,0);
  code='ACCESS_REQUIRED';
  await assert.rejects(context.api('/api/create',{}),error=>error.code==='ACCESS_REQUIRED');
  assert.equal(redirects,1);
});
