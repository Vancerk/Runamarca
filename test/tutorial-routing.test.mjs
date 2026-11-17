import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {randomBytes,createHash} from 'node:crypto';
const code=randomBytes(6).toString('hex');
process.env.NODE_ENV='test';
process.env.RUNAMARCA_ACCESS_CODE_SHA256=createHash('sha256').update(code).digest('hex');
process.env.RUNAMARCA_ACCESS_SECRET=randomBytes(32).toString('hex');
process.env.RUNAMARCA_TUTORIAL_DIR=fs.mkdtempSync(path.join(os.tmpdir(),'tutorial-routing-'));
delete process.env.DATABASE_URL;
let server,origin,cookie;
const endpoint='/runamarca/tutorial/';
const headers=()=>({cookie,Origin:origin,'Content-Type':'application/json'});
before(async()=>{
 ({server}=await import('../server.js'));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin=`http://127.0.0.1:${server.address().port}`;
 const login=await fetch(origin+'/runamarca/access',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code})});
 assert.equal(login.status,200);cookie=login.headers.get('set-cookie').split(';')[0];
});
after(async()=>{if(server)await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});});

test('both Tutorial entries navigate to the guided page, and active play asks before leaving',()=>{
 let entry,during,dialog,closed=0;const destinations=[];
 const get=id=>id==='create'?{closest:()=>({after:node=>entry=node})}:id==='rules-toggle'?{after:node=>during=node}:id==='room-menu'?{close:()=>closed++}:null;
 const context=vm.createContext({state:null,location:{assign:url=>destinations.push(url)},document:{getElementById:get,body:{append:node=>dialog=node},createElement:tag=>({tag,setAttribute(){},querySelector(){return {};},close(){},showModal(){this.open=true;}})}});
 vm.runInContext(fs.readFileSync(new URL('../mesa-nova/tutorial-entry.js',import.meta.url),'utf8'),context);
 assert.equal(entry.href,endpoint);assert.equal(during.id,'open-tutorial');
 during.onclick();assert.deepEqual(destinations,[endpoint]);
 context.state={phase:'preparation'};during.onclick();assert.equal(dialog.open,true);assert.equal(closed,1);assert.equal(destinations.length,1);
 assert.match(dialog.innerHTML,/href="\/runamarca\/tutorial\/"/);assert.match(dialog.innerHTML,/continua sem pausa/);
});

test('tutorial HTML resolves its real boot resources to the guided client',async()=>{
 const page=await fetch(origin+endpoint,{headers:headers()}),html=await page.text();assert.equal(page.status,200);
 const base=new URL(html.match(/<base\b[^>]*href="([^"]+)"/i)?.[1]||'',page.url);
 assert.equal(base.pathname,endpoint,'the browser must not resolve tutorial scripts against the normal table');
 const resources=[...html.matchAll(/<(script|link)\b[^>]*\b(?:src|href)="([^"]+)"[^>]*>/gi)].map(m=>({tag:m[1],url:new URL(m[2],base)}));
 assert.ok(resources.some(r=>r.url.pathname===endpoint+'tutorial-ui.js'));
 for(const resource of resources){
  assert.equal(resource.url.origin,origin);assert.ok(resource.url.pathname.startsWith(endpoint),resource.url.pathname);
  const response=await fetch(resource.url,{headers:headers()});assert.equal(response.status,200,resource.url.pathname);
  assert.match(response.headers.get('content-type'),resource.tag==='script'?/javascript/:/css/,resource.url.pathname);
 }
 const app=await(await fetch(new URL('app.js',base),{headers:headers()})).text();
 assert.match(app,/const gameBase='\/runamarca\/tutorial\/';/);assert.match(app,/runamarca-tutorial-seat/);assert.doesNotMatch(app,/runamarca-nova-seat/);
 const catalog=await(await fetch(new URL('cartas.json',base),{headers:headers()})).json();assert.ok(catalog.decks.some(d=>JSON.stringify(d).includes('tutorial')));
});

test('the unauthenticated tutorial returns to its own page after the real access form',async()=>{
 const canonical=await fetch(origin+'/runamarca/tutorial?room=abc123',{headers:headers(),redirect:'manual'});assert.equal(canonical.status,308);assert.equal(canonical.headers.get('location'),endpoint+'?room=ABC123');
 const redirected=await fetch(origin+endpoint+'?room=ABC123',{redirect:'manual'});assert.equal(redirected.status,302);
 const gateUrl=new URL(redirected.headers.get('location'),origin);assert.equal(gateUrl.pathname,'/runamarca/access');
 assert.equal(gateUrl.searchParams.get('next'),endpoint+'?room=ABC123');
 const html=await(await fetch(gateUrl)).text(),script=html.match(/<script>([\s\S]*?)<\/script>/i)[1];
 let submit,destination;const elements={gate:{addEventListener:(_,fn)=>submit=fn},code:{value:code},error:{textContent:''}};
 vm.runInNewContext(script,{document:{getElementById:id=>elements[id]},URLSearchParams,location:{search:gateUrl.search,replace:value=>destination=new URL(value,gateUrl).href},fetch:(url,options)=>fetch(new URL(url,gateUrl),options)});
 await submit({preventDefault(){}});assert.equal(elements.error.textContent,'');assert.equal(destination,origin+endpoint+'?room=ABC123');
});

test('access return targets cannot become external redirects or another game route',async()=>{
 for(const returnTo of ['https://example.invalid/','//example.invalid/','/runamarca/../dados','/runamarca/tutorial/../../dados','/runamarca/tutorial/\\evil','/runamarca/tutorial/app.js','javascript:alert(1)']){
  const response=await fetch(origin+'/runamarca/access',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code,returnTo})});
  assert.equal(response.status,200);assert.equal((await response.json()).returnTo,undefined,returnTo);
 }
 const response=await fetch(origin+'/runamarca/access',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code,returnTo:endpoint+'?room=abc123&mode=normal'})});
 assert.equal((await response.json()).returnTo,endpoint+'?room=ABC123');
});

test('real duel selection and resume never consume or replace a saved normal-room seat',async()=>{
 const normal=await(await fetch(origin+'/runamarca/api/create',{method:'POST',headers:headers(),body:JSON.stringify({name:'Normal'})})).json();
 const normalSeat=JSON.stringify({code:normal.code,token:normal.token}),storage=new Map([['runamarca-nova-seat',normalSeat]]);
 const ui=await(await fetch(origin+endpoint+'tutorial-ui.js',{headers:headers()})).text();
 const start=ui.slice(ui.indexOf(' async function start('),ui.indexOf(' async function send('));assert.ok(start.length>0);
 let saved=null,renders=0;const errors={textContent:''};
 const context=vm.createContext({state:null,busy:false,gameBase:endpoint,lastRevision:-1,serverClockOffset:0,help:false,lastKey:'',Date,Error,
  saved:()=>saved,remember:value=>{saved={token:value.token,code:value.code};},get:id=>id==='player-name'?{value:'CPU'}:errors,menuError:errors,
  sessionStorage:{setItem:(k,v)=>storage.set(k,v)},history:{replaceState(){}},render:()=>renders++,sync(){},
  tutorialAccessReply(response,reply){if(!response.ok)throw Error(reply.error);return reply;},
  fetch:(url,options)=>fetch(new URL(url,origin),{...options,headers:{...headers(),...options.headers}})});
 vm.runInContext(start+'\nglobalThis.startDuel=start;',context);
 for(const duel of [1,2,3]){
  await context.startDuel(duel,false);assert.equal(errors.textContent,'');assert.equal(context.state.tutorial.duel,duel);assert.equal(context.state.tutorial.status,'active');assert.ok(context.state.tutorial.instruction);assert.equal(typeof context.state.tutorial.clock.paused,'boolean');
  assert.equal(storage.get('runamarca-nova-seat'),normalSeat);assert.notEqual(JSON.parse(storage.get('runamarca-tutorial-seat')).token,normal.token);
  await context.startDuel(duel,true);assert.equal(context.state.tutorial.duel,duel);assert.equal(storage.get('runamarca-nova-seat'),normalSeat);
 }
 assert.equal(renders,6);
 const stillNormal=await(await fetch(origin+'/runamarca/api/rooms/'+normal.code+'/state',{headers:{...headers(),'x-player-token':normal.token}})).json();assert.equal(stillNormal.phase,'lobby');assert.equal(stillNormal.tutorial,undefined);
});

test('expired guided access preserves tutorial and room, while other permission errors do not redirect',async()=>{
 const source=fs.readFileSync(new URL('../mesa-nova/tutorial/app.js',import.meta.url),'utf8');
 const api=source.slice(source.indexOf('function tutorialAccessReply('),source.indexOf('\nfunction trackArrivals'));assert.ok(api.length>0);
 const redirects=[];let denial='ACCESS_REQUIRED';
 const context=vm.createContext({gameBase:endpoint,state:null,sessionStorage:{getItem:()=>null},setTimeout,clearTimeout,AbortController,
  location:{search:'?room=ABC123',assign:url=>redirects.push(url)},fetch:async()=>({status:403,ok:false,json:async()=>({code:denial,error:'Acesso necessário.'})})});
 vm.runInContext(api,context);
 await assert.rejects(context.api('/api/rooms/ABC123/state',null,'GET'),error=>error.code==='ACCESS_REQUIRED');
 const target=new URL(redirects[0],origin);assert.equal(target.pathname,'/runamarca/access');assert.equal(target.searchParams.get('next'),endpoint+'?room=ABC123');
 denial='ACCOUNT_REQUIRED';await assert.rejects(context.api('/api/rooms/ABC123/state',null,'GET'),error=>error.code==='ACCOUNT_REQUIRED');assert.equal(redirects.length,1);
});
