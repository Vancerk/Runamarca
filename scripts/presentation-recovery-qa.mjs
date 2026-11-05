import path from 'node:path';
import {launch,open,paint,captureTable,view,harness,finish} from './hybrid12-lib.mjs';
const out=process.argv[2],H=harness(out),browser=await launch();
const geometry=()=>[...document.querySelectorAll('#lanes,.combat-emanation .card,#self-head,#center-actions')].map(n=>{const r=n.getBoundingClientRect();return [r.x,r.y,r.width,r.height];});
try{
 for(const width of [1920,1366]){
  const {page,context}=await open(browser,{width,height:width===1920?1080:768},{errors:H.errors,gpu:H.gpu});
  const {room,a}=captureTable();await paint(page,view(room,a),900);
  await page.evaluate(()=>sessionStorage.setItem('qa-recovery-seat','unchanged'));
  const before=await page.evaluate(geometry),match=await page.evaluate(()=>state.matchId);
  for(let cycle=1;cycle<=2;cycle++){
   await page.evaluate(()=>{document.querySelector('canvas.hybrid-canvas').getContext('webgl').getExtension('WEBGL_lose_context').loseContext();});
   await page.waitForFunction(()=>RunaHybrid.recovery.visible);
   const down=await page.evaluate(()=>({failed:RunaHybrid.stats.failed,visible:getComputedStyle(document.querySelector('#lanes')).visibility,button:document.activeElement?.textContent,match:state.matchId}));
   H.check(`${width} perda ${cycle}: mensagem acessível sem fallback 2D`,down.failed&&down.visible==='hidden'&&down.button==='Tentar novamente',down);
   await page.screenshot({path:path.join(out,`${width}-loss-${cycle}.png`)});
   await page.waitForFunction(c=>RunaHybrid.ready&&RunaHybrid.recovery.attempts>=c,cycle,{timeout:15000});await page.waitForTimeout(450);
   const after=await page.evaluate(geometry),max=Math.max(...before.flatMap((r,i)=>r.map((v,j)=>Math.abs(v-after[i]?.[j]))));
   H.check(`${width} recuperação ${cycle}: mesma geometria`,before.length===after.length&&max<=1,{max});
   const contextState=await page.evaluate(m=>({match:state.matchId===m,session:sessionStorage.getItem('qa-recovery-seat')==='unchanged',visible:RunaHybrid.recovery.visible,error:RunaHybrid.stats.webglError}),match);
   H.check(`${width} recuperação ${cycle}: mesma sessão e contexto válido`,contextState.match&&contextState.session&&!contextState.visible&&contextState.error===0,contextState);
   H.check(`${width} recuperação ${cycle}: quatro Emanações e uma cena`,await page.evaluate(()=>document.querySelectorAll('.combat-emanation .card').length===4&&document.querySelectorAll('canvas.hybrid-canvas').length===1));
  }
  // A real draw presentation keeps its owner even while the context is unavailable.
  await page.evaluate(()=>{const uid=seat().hand.at(-1).uid;RunaCardArrivals.reserve(uid);render();window.__recoveryDraw=animateDraw(uid,true);});
  await page.waitForTimeout(300);
  await page.evaluate(()=>document.querySelector('canvas.hybrid-canvas').getContext('webgl').getExtension('WEBGL_lose_context').loseContext());
  await page.waitForFunction(()=>RunaHybrid.recovery.unavailable);
  await page.waitForFunction(()=>RunaHybrid.ready&&RunaHybrid.recovery.attempts>=3,{},{timeout:15000});
  await page.evaluate(()=>window.__recoveryDraw);await page.waitForTimeout(250);
  const flight=await page.evaluate(()=>({blocked:RunaCardArrivals.blocked,tickets:RunaCardArrivals.stats.active.length,hidden:[...document.querySelectorAll('#hand>.hand-card')].filter(n=>getComputedStyle(n).visibility==='hidden').length,flights:document.querySelectorAll('#visual-layer .card-flight').length}));
  H.check(`${width}: perda durante compra termina sem trava ou duplicata`,!flight.blocked&&!flight.tickets&&!flight.hidden&&!flight.flights,flight);
  await page.screenshot({path:path.join(out,`${width}-restored.png`)});
  await page.evaluate(()=>{window.__savedRecoveryState=state;document.querySelector('canvas.hybrid-canvas').getContext('webgl').getExtension('WEBGL_lose_context').loseContext();});await page.waitForFunction(()=>RunaHybrid.recovery.visible);
  await page.evaluate(()=>{state=null;render();});await page.waitForTimeout(100);
  H.check(`${width}: sair da sala também esconde a recuperação`,await page.evaluate(()=>document.getElementById('game').hidden&&!RunaHybrid.recovery.visible));
  await page.waitForTimeout(1200);await page.evaluate(()=>{state=window.__savedRecoveryState;render();});await page.waitForFunction(()=>RunaHybrid.ready);
  H.check(`${width}: reentrada restaura a mesma partida`,await page.evaluate(m=>state.matchId===m&&!RunaHybrid.stats.failed,match));
  await context.close();
 }
 // Initial WebGL failure is independent of context loss after successful creation.
 const {page,context}=await open(browser,{width:1920,height:1080},{errors:H.errors,gpu:H.gpu,init:{fn:()=>{const original=HTMLCanvasElement.prototype.getContext;window.__denyWebgl=true;HTMLCanvasElement.prototype.getContext=function(kind,...args){if(window.__denyWebgl&&kind==='webgl')return null;return original.call(this,kind,...args);};}}});
 const {room,a}=captureTable();await paint(page,view(room,a),1600);
 const unavailable=await page.evaluate(()=>({failed:RunaHybrid.recovery.unavailable,visible:RunaHybrid.recovery.visible,text:document.querySelector('.table-recovery').textContent}));
 H.check('falha inicial: tentativa limitada e alternativa de recarregar',unavailable.failed&&unavailable.visible&&/Não foi possível/.test(unavailable.text)&&/Recarregar/.test(unavailable.text),unavailable);
 await page.evaluate(()=>window.__denyWebgl=false);await page.getByRole('button',{name:'Tentar novamente',exact:true}).click();await page.waitForFunction(()=>RunaHybrid.ready);
 H.check('falha inicial: tentativa manual cria o 3D sem nova sessão',await page.evaluate(()=>!RunaHybrid.recovery.visible&&RunaHybrid.recovery.attempts===1));
 await context.close();H.check('nenhum erro de página ou WebGL após recuperação',!H.errors.length&&!H.gpu.length,{errors:H.errors,gpu:H.gpu});
}finally{await browser.close();finish(out,'recovery',H);}
