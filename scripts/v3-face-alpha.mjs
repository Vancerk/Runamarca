// V3 (item 16) · mede a margem transparente do desenho das faces (canvas mestre 900×820 de combate e 900×1260 da
// reserva): primeira coluna/linha com alfa ≥ 0.5 a partir de cada borda, ao longo do meio do lado.
import {chromium,CHROME,captureTable,view} from './hybrid12-lib.mjs';
const {room,a}=captureTable();a.formation=[null,a.reserve[0].uid,a.reserve[2].uid];const state=view(room,a);
const browser=await chromium.launch({executablePath:process.env.QA_BROWSER||CHROME,headless:true}),page=await (await browser.newContext({viewport:{width:1920,height:1080}})).newPage();
await page.goto((process.env.QA_BASE||'http://127.0.0.1:3086')+'/runamarca/hybrid/index.html');await page.waitForFunction(()=>typeof render==='function');
await page.evaluate(s=>{state=s;serverClockOffset=Date.now()-s.serverNow;render();},{...state,serverNow:Date.now()});await page.waitForFunction(()=>window.RunaHybrid?.ready);await page.evaluate(()=>Promise.all([...document.querySelectorAll('#game .card')].map(n=>n.visualReady)));await page.waitForTimeout(800);
console.log(JSON.stringify(await page.evaluate(()=>[...document.querySelectorAll('#lanes .lane-side .card .card-art-canvas, .reserve-camp.self-camp .card .card-art-canvas')].slice(0,4).map(cv=>{const g=cv.getContext('2d'),W=cv.width,H=cv.height,d=g.getImageData(0,0,W,H).data,A=(x,y)=>d[(y*W+x)*4+3]/255;
 const scan=(n,f)=>{for(let i=0;i<n;i++)if(f(i)>=.5)return i;return null;};const mx=Math.floor(W/2),my=Math.floor(H/2);
 return {where:cv.closest('.reserve-camp')?'reserve':'combat',W,H,left:scan(W,i=>A(i,my)),right:scan(W,i=>A(W-1-i,my)),top:scan(H,i=>A(mx,i)),bottom:scan(H,i=>A(mx,H-1-i)),corner:+A(2,2).toFixed(2)};}))));
await browser.close();
