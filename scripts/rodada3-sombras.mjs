// Rodada 3 (11/11/2026) · capturas das sombras trocadas de filter:drop-shadow para box-shadow: a carta arrastada,
// a carta da mão em voo para a reserva (cópia em movimento) e a reserva parada depois.
// Uso: node scripts/rodada3-sombras.mjs <out-dir>
import fs from 'node:fs';import path from 'node:path';
import {chromium,CHROME} from './hybrid12-lib.mjs';
import {setup,card,view,act,catalog} from '../mesa-nova/r1-fixtures.mjs';
const [out='prototype-qa/rodada3-20261111/sombras']=process.argv.slice(2);fs.mkdirSync(out,{recursive:true});
const base=process.env.QA_BASE||'http://127.0.0.1:3121';const browser=await chromium.launch({executablePath:process.env.QA_BROWSER||CHROME,headless:true});const checks=[];
try{
 const s=setup(),{room,a,b}=s;room.code='SOMB01';room.round=1;room.preparationsDone=0;room.phase='prep';room.turn=a.id;a.mana=a.manaMax=10;
 a.hand=['FV01','FV03','FV06','FV07','FV15'].map(id=>card(id,a));b.hand=['FL01','FL02','FL04'].map(id=>card(id,b));
 const v=()=>({...view(room,a),serverNow:Date.now()});
 const ctx=await browser.newContext({viewport:{width:1920,height:1080}});await ctx.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort('blockedbyclient'));
 await ctx.route(u=>/\/api\/rooms\/[^/]+\/state$/.test(u.pathname),r=>r.fulfill({json:v()}));
 await ctx.route('**/api/rooms/*/act',async r=>{await new Promise(x=>setTimeout(x,80));try{act(room,a,r.request().postDataJSON(),catalog);await r.fulfill({json:v()});}catch(e){await r.fulfill({status:400,json:{error:e.message}});}});
 const page=await ctx.newPage();await page.addInitScript(c=>sessionStorage.setItem('runamarca-nova-seat',JSON.stringify({code:c,token:'probe'})),room.code);
 await page.goto(base+'/runamarca/');await page.waitForFunction(()=>typeof render==='function'&&state&&window.RunaHybrid?.ready,null,{timeout:20000});await page.waitForTimeout(2000);
 // 1. carta arrastada (uma magia, para não jogar a criatura que voa no passo 2)
 const spell=a.hand.find(c=>c.type!=='creature')||a.hand[0];
 const handCard=page.locator(`#hand .card[data-uid="${spell.uid}"]`).first(),box=await handCard.boundingBox();
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+40,box.y-180,{steps:8});await page.mouse.move(960,560,{steps:12});await page.waitForTimeout(250);
 const drag=await page.evaluate(()=>{const n=document.querySelector('.drag-preview');if(!n)return null;const cs=getComputedStyle(n);return {filter:cs.filter,boxShadow:cs.boxShadow};});
 checks.push({name:'carta arrastada: sombra comum, sem filtro',pass:Boolean(drag&&drag.filter==='none'&&drag.boxShadow!=='none'),drag});
 await page.screenshot({path:path.join(out,'1-carta-arrastada.png')});
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2,{steps:10});await page.mouse.up();await page.mouse.move(1780,320,{steps:4});await page.waitForTimeout(1200);// ponteiro longe da mão: sem carta ampliada na captura
 // 2. criatura em voo para a reserva
 const c=a.hand.find(c=>c.type==='creature'&&!(c.effects||[]).some(e=>/entry|enter|choose|target/.test(String(e.timing)+String(e.op))));// sem efeito de entrada que peça escolha
 const faces=page.evaluate(()=>new Promise(res=>{const seen=[];const t0=performance.now();const tick=()=>{for(const n of document.querySelectorAll('.hybrid-motion-face')){const cs=getComputedStyle(n);seen.push({filter:cs.filter,boxShadow:cs.boxShadow});}if(performance.now()-t0<1200)requestAnimationFrame(tick);else res(seen);};requestAnimationFrame(tick);}));
 await page.evaluate(id=>{command({type:'play',cardId:id},null,true);},c.uid);
 for(const n of [1,2,3])await page.screenshot({path:path.join(out,`2-voo-${n}.png`)});// capturas seguidas (cada uma leva ~100 ms)
 const seen=await faces;checks.push({name:'cópias em movimento: sombra comum, sem filtro',pass:seen.length>0&&seen.every(f=>f.filter==='none'&&f.boxShadow!=='none'),amostras:seen.length,exemplo:seen[0]});
 await page.waitForTimeout(1500);await page.screenshot({path:path.join(out,'3-reserva-parada.png')});
 checks.push({name:'criatura chegou à reserva',pass:await page.evaluate(id=>Boolean(document.querySelector(`.reserve-camp.self-camp .card[data-uid="${id}"]`)),c.uid)});
 await ctx.close();
}finally{await browser.close();}
fs.writeFileSync(path.join(out,'sombras.json'),JSON.stringify(checks,null,1));
for(const c of checks)console.log(c.pass?'PASS':'FAIL',c.name,JSON.stringify(c).slice(0,240));
process.exitCode=checks.every(c=>c.pass)?0:1;
