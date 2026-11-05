// Revisão 11: inspeção do fluxo vertical da mesa (ordem, zoom, margens e alturas)
// usada para parametrizar a distância mão–Patrono. Somente leitura.
// Uso: node scripts/hybrid11-flow-probe.mjs
import {createRequire} from 'node:module';import {setup,card,view} from '../mesa-nova/r1-fixtures.mjs';
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/vanxf/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {room,a,b}=setup();for(const p of [a,b]){p.hand=Array.from({length:9},()=>card('FV03',p));p.reserve=Array.from({length:5},()=>card('FV03',p));}
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
for(const [w,h] of [[1920,900],[1920,1080],[1280,720],[390,800]]){const page=await browser.newPage({viewport:{width:w,height:h}});await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());await page.goto('http://127.0.0.1:3086/runamarca/hybrid/index.html');await page.waitForFunction(()=>typeof render==='function'&&window.RunaHybridHand);
 await page.evaluate(s=>{state=s;serverClockOffset=Date.now()-s.serverNow;render();},view(room,a));await page.waitForFunction(()=>RunaHybrid?.ready);await page.waitForTimeout(600);
 console.log(w,h,JSON.stringify(await page.evaluate(()=>{const t=document.querySelector('#game>.table'),cs=getComputedStyle(t);const kids=[...t.children].filter(n=>n.getClientRects().length).map(n=>{const r=n.getBoundingClientRect(),s=getComputedStyle(n);return [n.className||n.id,Math.round(r.top),Math.round(r.bottom),s.zoom,s.marginTop,s.marginBottom,s.height,s.order];});return {table:[cs.display,cs.flexDirection,cs.justifyContent,cs.height,cs.paddingTop,cs.paddingBottom,cs.rowGap],game:getComputedStyle(document.getElementById('game')).height,kids,fan:RunaHybridFan.stats.own.visible,layout:RunaHybridLayout.stats.scale};})));await page.close();}
await browser.close();
