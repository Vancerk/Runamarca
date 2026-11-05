// S8: authenticated flow on a local production server (server.js, no NODE_ENV=test, no test session).
// Usage: node scripts/s8-prod-auth.mjs <base-url> <out-dir>
// The valid access code is read from QA_ACCESS_CODE and never printed. Without it, only the
// refusal checks run and the authenticated part is recorded as not executed.
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/vanxf/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const [base,out]=process.argv.slice(2),code=process.env.QA_ACCESS_CODE||'';fs.mkdirSync(out,{recursive:true});
const origin=new URL(base).origin,mesa=base.replace(/\/$/,'')+'/runamarca';
const results=[],skipped=[],check=(name,ok,detail)=>{results.push({name,ok:Boolean(ok),detail});console.log((ok?'PASS ':'FAIL ')+name,JSON.stringify(detail??''));};
const browser=await chromium.launch({executablePath:process.env.QA_BROWSER||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
async function client(){const context=await browser.newContext({viewport:{width:1440,height:900}});await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());const page=await context.newPage();const failed=[],errors=[];
 page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('/access'))failed.push({status:r.status(),url:r.url()});});page.on('requestfailed',r=>failed.push({status:'failed',url:r.url()}));page.on('pageerror',e=>errors.push(e.message));return {context,page,failed,errors};}
const cookieNames=async context=>(await context.cookies()).map(c=>c.name);
try{
 // 1 · without a session
 const anon=await client();
 for(const route of ['/','/hybrid/index.html']){const r=await anon.page.goto(mesa+route);check('sem sessão: '+route+' leva à página de acesso',new URL(anon.page.url()).pathname==='/runamarca/access'&&r.ok(),{final:new URL(anon.page.url()).pathname});}
 const api=await anon.page.evaluate(async m=>{const call=async(path,init)=>{const r=await fetch(m+path,init);return {status:r.status,body:await r.json().catch(()=>null)};};return {create:await call('/api/create',{method:'POST',headers:{'Content-Type':'application/json'},body:'{"name":"QA"}'}),state:await call('/api/rooms/ABCDEF/state'),act:await call('/api/rooms/ABCDEF/act',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}),feedback:await call('/api/rooms/ABCDEF/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})};},mesa);
 check('APIs protegidas recusam cliente sem sessão (403 ACCESS_REQUIRED)',Object.values(api).every(x=>x.status===403&&x.body?.code==='ACCESS_REQUIRED'),Object.fromEntries(Object.entries(api).map(([k,v])=>[k,v.status+' '+v.body?.code])));
 // forged cookie with the real name and value format (access-session.mjs) but a wrong signature
 await anon.context.addCookies([{name:'rm_access_v2_'+new URL(base).port,value:`${Date.now()+86_400_000}.${'a'.repeat(32)}.${'0'.repeat(64)}`,url:origin+'/runamarca/'}]);
 const forged=await anon.page.evaluate(async m=>(await fetch(m+'/api/create',{method:'POST',headers:{'Content-Type':'application/json'},body:'{"name":"QA"}'})).status,mesa);
 check('cookie forjado não abre a API',forged===403,{status:forged});
 await anon.context.clearCookies();
 // 2 · invalid code through the access form
 await anon.page.goto(mesa+'/access');await anon.page.fill('#code','00000000');const [resp]=await Promise.all([anon.page.waitForResponse(r=>r.url().endsWith('/runamarca/access')&&r.request().method()==='POST'),anon.page.click('#gate button')]);
 await anon.page.waitForFunction(()=>document.getElementById('error').textContent.trim().length>0);
 const shown=await anon.page.textContent('#error'),after=await cookieNames(anon.context);
 check('código inválido é recusado pelo formulário (403, mensagem, sem cookie)',resp.status()===403&&/incorreto/i.test(shown)&&after.length===0,{status:resp.status(),message:shown,cookies:after});
 const still=await anon.page.goto(mesa+'/');check('depois da recusa a mesa continua bloqueada',new URL(anon.page.url()).pathname==='/runamarca/access',{final:new URL(anon.page.url()).pathname,status:still.status()});
 await anon.page.screenshot({path:out+'/acesso-recusado.png'});await anon.context.close();
 // 3 · valid code (only with QA_ACCESS_CODE)
 if(!code){skipped.push('fluxo autenticado (QA_ACCESS_CODE ausente)');console.log('NÃO EXECUTADO fluxo autenticado: QA_ACCESS_CODE ausente');}
 else{
  const enter=async c=>{await c.page.goto(mesa+'/access');await c.page.fill('#code',code);const [r]=await Promise.all([c.page.waitForResponse(x=>x.url().endsWith('/runamarca/access')&&x.request().method()==='POST'),c.page.click('#gate button')]);await c.page.waitForURL(u=>!u.pathname.endsWith('/access'),{timeout:10000}).catch(()=>{});return r.status();};
  const host=await client(),status=await enter(host),names=await cookieNames(host.context),cookie=(await host.context.cookies()).find(c=>c.name.includes('access'))||{};
  check('código válido cria a sessão pelo formulário (200, cookie HttpOnly)',status===200&&names.length>0&&cookie.httpOnly===true,{status,cookies:names,httpOnly:cookie.httpOnly,sameSite:cookie.sameSite});
  for(const [route,name] of [['/','principal 3D'],['/hybrid/index.html','alias 3D']]){const r=await host.page.goto(mesa+route);await host.page.waitForFunction(()=>typeof render==='function'&&document.getElementById('create'),null,{timeout:15000}).catch(()=>{});const ok=await host.page.evaluate(()=>typeof render==='function'&&Boolean(document.getElementById('create')));check('rota '+name+' abre com a sessão',r.status()===200&&new URL(host.page.url()).pathname===new URL(mesa+route).pathname&&ok,{status:r.status(),final:new URL(host.page.url()).pathname});await host.page.screenshot({path:out+'/rota-'+name+'.png'});}
  const expectedLabel=JSON.parse(fs.readFileSync('mesa-nova/version.json','utf8')).label;const label=await host.page.locator('#runamarca-version').innerText();check('versão publicada visível',label.startsWith(expectedLabel+' ·'),{label,expectedLabel});
  // create a room in the hybrid table through the UI
  await host.page.fill('#player-name','QA anfitrião');await host.page.click('#create');await host.page.waitForFunction(()=>{try{return Boolean(JSON.parse(sessionStorage.getItem('runamarca-nova-seat'))?.code)&&typeof state!=='undefined'&&state?.code;}catch{return false;}},null,{timeout:15000});
  const room=await host.page.evaluate(()=>({code:state.code,phase:state.phase,players:state.players.length}));check('sala criada pela interface',/^[A-F0-9]{6}$/.test(room.code),room);
  // second client: own session, joins by code
  const guest=await client(),guestStatus=await enter(guest);check('segundo cliente também entra pelo código',guestStatus===200,{status:guestStatus});
  await guest.page.goto(mesa+'/');await guest.page.waitForFunction(()=>typeof render==='function');await guest.page.fill('#player-name','QA convidado');await guest.page.fill('#join-code',room.code);await guest.page.click('#join');
  await guest.page.waitForFunction(c=>typeof state!=='undefined'&&state?.code===c&&state.players.length===2,room.code,{timeout:15000}).catch(()=>{});
  const joined=await guest.page.evaluate(()=>typeof state!=='undefined'&&state?{code:state.code,phase:state.phase,players:state.players.length}:null);check('entrada na sala pelo código',joined?.code===room.code&&joined.players===2,joined);
  await host.page.waitForFunction(()=>state.players.length===2,null,{timeout:15000}).catch(()=>{});const hostView=await host.page.evaluate(()=>({players:state.players.length,phase:state.phase}));check('anfitrião vê o convidado',hostView.players===2,hostView);
  await host.page.waitForTimeout(2500);await guest.page.waitForTimeout(500);
  const resources=async p=>p.evaluate(()=>{const imgs=[...document.images].filter(i=>i.currentSrc&&i.getBoundingClientRect().width>0);return {stylesheets:document.styleSheets.length,images:imgs.length,brokenImages:imgs.filter(i=>i.complete&&i.naturalWidth===0).map(i=>i.currentSrc).slice(0,5),hybridReady:Boolean(window.RunaHybrid?.ready)};});
  const hostRes=await resources(host.page),guestRes=await resources(guest.page);
  // Known, classified exceptions of this isolated setup (nothing else is tolerated):
  //  · other origins are aborted by this harness (no external network), e.g. Google Fonts;
  //  · /api/account answers 503 because Discord login is deliberately not configured here.
  const all=[...host.failed,...guest.failed],external=all.filter(x=>new URL(x.url).origin!==origin),discord=all.filter(x=>new URL(x.url).pathname==='/api/account'&&x.status===503),other=all.filter(x=>!external.includes(x)&&!discord.includes(x));
  const account=discord.length?await host.page.evaluate(async()=>{const r=await fetch('/api/account');return {status:r.status,error:(await r.json()).error};}):null;
  check('/api/account 503 só por login Discord não configurado na instância',!discord.length||account.status===503&&/Discord ainda não configurado/.test(account.error),{requests:discord.length,account});
  check('recursos da mesa carregados sem erro HTTP nem imagem quebrada; mesa híbrida pronta no anfitrião',other.length===0&&!hostRes.brokenImages.length&&!guestRes.brokenImages.length&&hostRes.hybridReady,{host:hostRes,guest:guestRes,unexpected:other.slice(0,10).map(x=>x.status+' '+x.url),externalBlockedByHarness:[...new Set(external.map(x=>new URL(x.url).host+new URL(x.url).pathname))]});
  check('sem erros de página',host.errors.length===0&&guest.errors.length===0,{errors:[...host.errors,...guest.errors].slice(0,5)});
  await host.page.screenshot({path:out+'/sala-anfitriao-hibrida.png'});await guest.page.screenshot({path:out+'/sala-convidado-nativa.png'});
  // the session does not leak to a fresh client
  const fresh=await client(),freshApi=await fresh.page.goto(mesa+'/api/rooms/'+room.code+'/state').catch(()=>null);check('cliente novo sem sessão continua recusado na sala criada',freshApi?.status()===403,{status:freshApi?.status()});
 }
}finally{await browser.close();}
const passed=results.filter(r=>r.ok).length;fs.writeFileSync(out+'/s8-prod-auth.json',JSON.stringify({base,authenticated:Boolean(code),passed,total:results.length,skipped,results},null,2));console.log(JSON.stringify({passed,total:results.length,authenticated:Boolean(code),skipped}));process.exitCode=passed===results.length?0:1;
