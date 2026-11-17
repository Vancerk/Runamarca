// Rodada 3 (11/11/2026) · botão que gira como uma peça só. Motor real em processo: /act e /state respondidos pela visão do
// próprio motor. Clica "Encerrar" e "Começar combate"/"Não combater", captura quadros durante o giro e confere que nunca
// há dois botões visíveis no mesmo lugar e que, no fim, a peça dá lugar ao botão real sem sobras.
// Uso: node scripts/rodada3-flip.mjs <out-dir>   QA_BASE, LATENCY=ms (atraso simulado da resposta do servidor)
import fs from 'node:fs';import path from 'node:path';
import {harness,finish,chromium,CHROME} from './hybrid12-lib.mjs';
import {setup,card,view,act,catalog} from '../mesa-nova/r1-fixtures.mjs';
const [out='prototype-qa/rodada3-20261111/giro']=process.argv.slice(2),H=harness(out),{check}=H;fs.mkdirSync(out,{recursive:true});
const base=process.env.QA_BASE||'http://127.0.0.1:3121',latency=Number(process.env.LATENCY||120);
const browser=await chromium.launch({executablePath:process.env.QA_BROWSER||CHROME,headless:true});const report={base,latency,runs:[]};
try{
 const s=setup(),{room,a,b}=s;room.matchId='giro';room.code='GIRO01';room.round=1;room.preparationsDone=0;room.phase='prep';room.turn=a.id;a.hand=['FL10','RG07'].map(id=>card(id,a));
 const v=()=>({...view(room,a),serverNow:Date.now()});
 const ctx=await browser.newContext({viewport:{width:1920,height:1080}});await ctx.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort('blockedbyclient'));
 await ctx.route(u=>/\/api\/rooms\/[^/]+\/state$/.test(u.pathname),async r=>{await new Promise(x=>setTimeout(x,60));await r.fulfill({json:v()});});
 const acts=[];await ctx.route('**/api/rooms/*/act',async r=>{const data=r.request().postDataJSON();await new Promise(x=>setTimeout(x,latency));try{act(room,a,data,catalog);acts.push(data.type);
   if(room.phase==='prep'&&room.turn===b.id)act(room,b,{type:'endPrep'},catalog);await r.fulfill({json:v()});}catch(e){await r.fulfill({status:400,json:{error:e.message}});}});
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(c=>sessionStorage.setItem('runamarca-nova-seat',JSON.stringify({code:c,token:'probe'})),room.code);
 await page.goto(base+'/runamarca/');await page.waitForFunction(()=>typeof render==='function'&&state&&window.RunaHybrid?.ready,null,{timeout:20000});await page.waitForTimeout(1200);
 const probe=()=>page.evaluate(()=>{const vis=n=>{const r=n.getBoundingClientRect(),cs=getComputedStyle(n);return r.width>0&&cs.visibility!=='hidden'&&cs.opacity!=='0';};
  return {flip:document.querySelectorAll('.turn-flip').length,visibleButtons:[...document.querySelectorAll('#phase-actions button')].filter(vis).map(b=>b.textContent.trim()),rear:document.querySelector('.turn-flip-back')?.textContent||null,flipping:document.body.classList.contains('turn-flipping')};});
 for(const [label,selector] of [['encerrar','#phase-actions button.primary, #phase-actions button'],['voto','#phase-actions button']]){
  await page.waitForFunction(()=>document.querySelector('#phase-actions button:not(:disabled)'),null,{timeout:15000});
  const before=await page.evaluate(()=>[...document.querySelectorAll('#phase-actions button')].map(b=>b.textContent.trim()));
  const b0=await page.locator('#phase-actions button:not(:disabled)').first().boundingBox();
  await page.mouse.click(b0.x+b0.width/2,b0.y+b0.height/2);
  const frames=[];const t0=Date.now();for(let i=0;i<14;i++){const p=await probe();frames.push({t:Date.now()-t0,...p});if(i===3)await page.screenshot({path:path.join(out,label+'-meio.png'),clip:{x:Math.max(0,b0.x-60),y:Math.max(0,b0.y-60),width:b0.width+120,height:b0.height+120}});await page.waitForTimeout(90);}
  await page.waitForTimeout(1800);const end=await probe();await page.screenshot({path:path.join(out,label+'-fim.png'),clip:{x:Math.max(0,b0.x-60),y:Math.max(0,b0.y-60),width:b0.width+120,height:b0.height+160}});
  report.runs.push({label,before,frames,end});
  check(label+': durante o giro nenhum botão real fica visível junto da peça',frames.every(f=>!f.flip||f.visibleButtons.length===0),frames.filter(f=>f.flip&&f.visibleButtons.length));
  check(label+': o verso mostra o botão que o jogo desenhou depois do clique',frames.some(f=>f.flip&&f.rear&&end.visibleButtons.includes(f.rear))||end.visibleButtons.length===0,{rears:[...new Set(frames.map(f=>f.rear))],end:end.visibleButtons});
  check(label+': no fim não sobra peça e o botão real aparece',end.flip===0&&!end.flipping&&end.visibleButtons.length>=1,end);
  if(label==='encerrar'){await page.waitForFunction(()=>state?.phase==='vote',null,{timeout:15000});await page.waitForTimeout(900);}
 }
 check('ações enviadas uma vez cada',acts.filter(x=>x==='endPrep').length===1&&acts.filter(x=>x==='vote').length===1,acts);
 check('sem erros de página',!errors.length,errors);await ctx.close();
}finally{await browser.close();}
fs.writeFileSync(path.join(out,'giro.json'),JSON.stringify(report,null,1));finish(out,'rodada3-flip',H,{report});
