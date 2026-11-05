const fs=require('fs');
const {chromium}=require('C:/Users/vanxf/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root='http://127.0.0.1:3086',checks=[];
async function api(route,data,token){const r=await fetch(root+'/runamarca/api/'+route,{method:data?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{'x-player-token':token}:{})},...(data?{body:JSON.stringify(data)}:{})});const j=await r.json();if(!r.ok)throw Error(JSON.stringify(j));return j;}
(async()=>{
 const a=await api('create',{name:'Viewport A'}),b=await api('rooms/'+a.code+'/join',{name:'Viewport B'}),seats=[a,b];
 const act=(seat,data)=>api('rooms/'+a.code+'/act',data,seat.token),get=()=>api('rooms/'+a.code+'/state',null,a.token);
 for(const [i,seat] of seats.entries())await act(seat,{type:'deck',deckId:i?'ruptura-grupo':'forja-oficina-lyrik'});
 for(const seat of seats)await act(seat,{type:'confirmMulligan'});
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
 const context=await browser.newContext({viewport:{width:1920,height:900},deviceScaleFactor:1,reducedMotion:'reduce'});
 await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 const page=await context.newPage();await page.addInitScript(s=>sessionStorage.setItem('runamarca-nova-seat',JSON.stringify({code:s.code,token:s.token})),a);await page.goto(root+'/runamarca/hybrid/index.html');await page.waitForTimeout(2500);
 const skip=page.getByText('Pular introdução',{exact:true});if(await skip.isVisible())await skip.click();await page.waitForTimeout(1000);
 const geometry=()=>page.evaluate(()=>{const r=s=>{const b=document.querySelector(s).getBoundingClientRect();return {x:b.x,y:b.y,w:b.width,h:b.height,bottom:b.bottom}};return {width:innerWidth,height:innerHeight,scrollHeight:document.documentElement.scrollHeight,scrollWidth:document.documentElement.scrollWidth,board:r('.board'),patron:r('.lower-zone'),reserve:r('.self-camp'),hand:r('.hand-zone'),count:document.querySelectorAll('#hand .hand-card').length,rival:document.querySelectorAll('#opponent-hand .rival-hand-back').length};});
 let anchor;
 for(let round=1;round<=6;round++){
  await page.waitForFunction(n=>state?.round===n,round);await page.waitForTimeout(650);
  const before=await geometry();anchor??=before;
  const cards=page.locator('#hand .hand-card');if(await cards.count())await cards.nth(Math.floor((await cards.count())/2)).hover();await page.waitForTimeout(300);const hover=await geometry();await page.mouse.move(3,3);
  checks.push({round,before,hover,noScroll:before.scrollHeight<=900&&before.scrollWidth<=1920,stableHover:JSON.stringify(before.board)===JSON.stringify(hover.board)&&before.hand.h===hover.hand.h,stableDraw:JSON.stringify(before.board)===JSON.stringify(anchor.board)});
  if(round===6)break;
  let s=await get();while(s.round===round){if(s.phase==='prep')await act(seats.find(x=>x.state.you===s.turn),{type:'endPrep'});else if(s.phase==='vote'){await act(a,{type:'vote',fight:false});await act(b,{type:'vote',fight:false});}else throw Error(s.phase);s=await get();}
 }
 await page.screenshot({path:'prototype-qa/hybrid-5/fullhd-1920x900.png',fullPage:true});
 for(const height of [960,1000]){await page.setViewportSize({width:1920,height});await page.waitForTimeout(350);const g=await geometry();checks.push({viewport:height,geometry:g,noScroll:g.scrollHeight<=height});}
 fs.writeFileSync('prototype-qa/hybrid-5/viewport-result.json',JSON.stringify(checks,null,2));console.log(JSON.stringify(checks));
 if(checks.some(c=>c.noScroll===false||c.stableHover===false||c.stableDraw===false))process.exitCode=1;
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
