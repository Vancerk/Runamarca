const fs=require('fs'),path=require('path');
const {chromium}=require('C:/Users/vanxf/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root='http://127.0.0.1:3086',out=path.resolve('prototype-qa');fs.mkdirSync(out,{recursive:true});
async function api(route,data,token){const r=await fetch(root+'/runamarca/api/'+route,{method:data?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{'x-player-token':token}:{})},...(data?{body:JSON.stringify(data)}:{})});const j=await r.json();if(!r.ok)throw Error(JSON.stringify(j));return j;}
(async()=>{
 const a=await api('create',{name:'Protótipo A'}),b=await api('rooms/'+a.code+'/join',{name:'Protótipo B'});fs.writeFileSync(out+'/seats.json',JSON.stringify({a,b}));
 const act=(seat,data)=>api('rooms/'+a.code+'/act',data,seat.token);
 await act(a,{type:'deck',deckId:'forja-oficina-lyrik'});await act(b,{type:'deck',deckId:'ruptura-grupo'});
 await act(a,{type:'confirmMulligan'});await act(b,{type:'confirmMulligan'});
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 await context.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(seat=>sessionStorage.setItem('runamarca-nova-seat',JSON.stringify({code:seat.code,token:seat.token})),a);
 await page.goto(root+'/runamarca/');await page.waitForTimeout(1200);if(await page.getByText('Pular introdução',{exact:true}).isVisible())await page.getByText('Pular introdução',{exact:true}).click();await page.waitForTimeout(1500);await page.screenshot({path:out+'/initial.png',fullPage:true});console.log(await page.locator('body').innerText());console.log('errors',errors);await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1;});

