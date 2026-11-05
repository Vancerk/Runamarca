// V1 · focal test of sharpenZoomFace (hover/detail sharp faces): only the drawing for the most recent size may be
// applied, the old bitmap stays until the new one is ready (no empty frame), and closing during a redraw applies
// nothing. paintCardFace is wrapped so each redraw finishes only when the test releases it (delayed completion).
// Also exercises the real detail through a viewport resize and open/close.
// Usage: node scripts/v1-zoom-race.mjs <native|hybrid> <out-dir>
import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';
import {setup,card,view} from '../mesa-nova/r1-fixtures.mjs';
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/vanxf/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const [route='native',out='prototype-qa/revisao-visual-20261103/v1/corrida']=process.argv.slice(2);fs.mkdirSync(out,{recursive:true});
const results=[],check=(name,ok,detail)=>{results.push({name,ok:Boolean(ok),detail});console.log((ok?'PASS ':'FAIL ')+name,JSON.stringify(detail??''));};
const {room,a}=setup();const fl17=card('FL17',a);a.hand=[fl17,card('FV16',a)];
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{const context=await browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:1});const allowed=new Set(['127.0.0.1','fonts.googleapis.com','fonts.gstatic.com']);await context.route('**/*',r=>allowed.has(new URL(r.request().url()).hostname)?r.continue():r.abort());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto((process.env.QA_BASE||'http://127.0.0.1:3086')+'/runamarca/'+(route==='hybrid'?'hybrid/index.html':''));await page.waitForFunction(()=>typeof render==='function');await page.evaluate(()=>document.fonts.ready);
 await page.evaluate(s=>{state=s;render();},view(room,a));if(route==='hybrid')await page.waitForFunction(()=>window.RunaHybrid?.ready);await page.waitForTimeout(600);
 // Controlled redraws: every paintCardFace call on a temporary canvas (the one sharpenZoomFace prepares) waits for release(width).
 await page.evaluate(()=>{const original=window.paintCardFace;window.__held=[];window.__hold=false;window.paintCardFace=function(canvas,...rest){if(!window.__hold||canvas.isConnected)return original.call(this,canvas,...rest);return new Promise(resolve=>window.__held.push({w:canvas.width,run:()=>original.call(this,canvas,...rest).then(resolve)}));};
  window.__release=async w=>{const i=window.__held.findIndex(x=>x.w===w);if(i<0)return false;const [x]=window.__held.splice(i,1);await x.run();await new Promise(r=>setTimeout(r,30));return true;};
  window.__probe=()=>{const cv=window.__card.querySelector('.card-art-canvas');const d=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data;let ink=0;for(let i=3;i<d.length;i+=4*97)ink+=d[i]>0;return {w:cv.width,h:cv.height,painted:ink>0};};});
 const mount=async width=>page.evaluate(([uid,width])=>{const c=state.players[0].hand.find(x=>x.uid===uid);const host=document.createElement('div');host.style.cssText='position:fixed;left:40px;top:40px;z-index:999';const el=cardEl(c,{zoom:true});el.style.setProperty('width',width+'px','important');el.style.setProperty('height',Math.round(width*1.4)+'px','important');host.append(el);document.body.append(host);window.__card=el;window.__host=host;},[fl17.uid,width]);
 const size=async width=>{await page.evaluate(w=>{window.__card.style.setProperty('width',w+'px','important');window.__card.style.setProperty('height',Math.round(w*1.4)+'px','important');},width);await page.waitForTimeout(120);};
 const settle=async w=>page.waitForFunction(w=>window.__card.querySelector('.card-art-canvas').width===w,w,{timeout:4000}).then(()=>true,()=>false);
 // 1 · 400 → 500 (held) → back to 400 → release 500: the stale 500 drawing must not land.
 await mount(400);check('início: face nítida aplicada em 400',await settle(400),await page.evaluate(()=>window.__probe()));
 await page.evaluate(()=>{window.__hold=true;});
 await size(500);const pending=await page.evaluate(()=>window.__held.map(x=>x.w));
 const during=await page.evaluate(()=>window.__probe());check('500 pendente: face anterior continua desenhada (sem quadro vazio)',pending.includes(500)&&during.w===400&&during.painted,{pending,during});
 await size(400);await page.evaluate(()=>window.__release(500));const after=await page.evaluate(()=>window.__probe());
 check('voltar a 400 antes da conclusão: o desenho atrasado de 500 não é aplicado',after.w===400&&after.painted,after);
 // 2 · two pending sizes released out of order: only the latest (600) may land.
 await size(550);await size(600);const two=await page.evaluate(()=>window.__held.map(x=>x.w));
 await page.evaluate(()=>window.__release(600));const latest=await page.evaluate(()=>window.__probe());await page.evaluate(()=>window.__release(550));const stale=await page.evaluate(()=>window.__probe());
 check('fora de ordem: só o tamanho mais recente (600) é aplicado; o 550 atrasado é descartado',two.includes(550)&&two.includes(600)&&latest.w===600&&stale.w===600&&stale.painted,{pending:two,latest,stale});
 // 3 · closing during a redraw: nothing is applied to the removed card and later resizes do not redraw it.
 await size(650);const held3=await page.evaluate(()=>window.__held.map(x=>x.w));const removed=await page.evaluate(async()=>{const cv=window.__card.querySelector('.card-art-canvas');window.__host.remove();await window.__release(650);return {w:cv.width,connected:cv.isConnected};});
 await page.evaluate(()=>{window.__card.style.setProperty('width','700px','important');});await page.waitForTimeout(150);const extra=await page.evaluate(()=>window.__held.length);
 check('fechar durante o redesenho: nada é aplicado ao cartão removido e não há novo pedido',held3.includes(650)&&removed.w===600&&!removed.connected&&extra===0,{held3,removed,newRequests:extra});
 await page.evaluate(()=>{window.__hold=false;window.__held=[];});
 // 4 · real detail: open, viewport resize, close (current code, no hold).
 const detail=async()=>page.evaluate(()=>{const cv=document.querySelector('#detail-content .card.big .card-art-canvas');if(!cv)return null;const r=cv.getBoundingClientRect();return {w:cv.width,expected:Math.round(r.width*devicePixelRatio),open:document.getElementById('card-detail').open};});
 await page.evaluate(uid=>showCard(state.players[0].hand.find(x=>x.uid===uid)),fl17.uid);await page.waitForTimeout(400);const d1=await detail();
 await page.setViewportSize({width:1280,height:560});await page.waitForTimeout(500);const d2=await detail();
 await page.setViewportSize({width:1920,height:1080});await page.waitForTimeout(500);const d3=await detail();
 check('detalhe real: bitmap acompanha o tamanho exibido ao abrir e após dois resizes',d1&&d2&&d3&&[d1,d2,d3].every(d=>d.w===d.expected&&d.open)&&d2.expected!==d1.expected&&d3.expected===d1.expected,{d1,d2,d3});
 await page.evaluate(()=>document.getElementById('card-detail').close());await page.setViewportSize({width:1600,height:900});await page.waitForTimeout(300);await page.setViewportSize({width:1920,height:1080});await page.waitForTimeout(600);
 check('detalhe fechado: resize posterior sem erro',errors.length===0,{errors});
 // 5 · real hover open/close/reopen
 const hoverRound=async()=>{const box=await page.evaluate(uid=>{const r=document.querySelector(`#hand>.card[data-uid="${uid}"]`).getBoundingClientRect();return {x:r.x+r.width/2,y:Math.min(innerHeight-4,r.y+r.height*.3)};},fl17.uid);await page.mouse.move(3,3);await page.waitForTimeout(150);await page.mouse.move(box.x,box.y);const ok=await page.waitForFunction(()=>{const cv=document.querySelector('#hover-preview:not([hidden]) .card.big .card-art-canvas');return cv&&cv.width===Math.round(cv.getBoundingClientRect().width*devicePixelRatio);},null,{timeout:3000}).then(()=>true,()=>false);const seen=await page.evaluate(()=>{const h=document.getElementById('hover-preview'),cv=h.querySelector('.card.big .card-art-canvas');return {hidden:h.hidden,w:cv?.width,rectW:cv&&+cv.getBoundingClientRect().width.toFixed(2)};});await page.mouse.move(3,3);await page.waitForTimeout(150);const hidden=await page.evaluate(()=>document.getElementById('hover-preview').hidden);rounds.detail=(rounds.detail||[]).concat({sharp:ok,closed:hidden,...seen});return ok&&hidden;};
 const rounds=[];for(let i=0;i<3;i++)rounds.push(await hoverRound());
 check('hover real: abre nítido e fecha três vezes seguidas',rounds.every(Boolean),{rounds,detail:rounds.detail});
 check('sem erros de página',errors.length===0,{errors});
}finally{await browser.close();}
const passed=results.filter(r=>r.ok).length;fs.writeFileSync(path.join(out,route+'.json'),JSON.stringify({route,passed,total:results.length,results},null,1));console.log(JSON.stringify({route,passed,total:results.length}));process.exitCode=passed===results.length?0:1;
