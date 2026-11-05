// S2 — teste isolado: consultar stats comuns não pode consumir um erro WebGL pendente,
// draw() não consulta gl.getError(), e o erro fica retido até clearWebglError().
// Uso: node scripts/s2-webgl-error.mjs <pasta>   (sai com código 1 se algum caso falhar)
import fs from 'node:fs';import {createRequire} from 'node:module';import {setup,card,unit,place,view} from '../mesa-nova/r1-fixtures.mjs';
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/vanxf/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const [out]=process.argv.slice(2);fs.mkdirSync(out,{recursive:true});
const {room,a}=setup();a.reserve=Array.from({length:3},()=>card('FV03',a));a.formation=[a.reserve[0].uid];place(a,unit(a),1);a.hand=[card('FV03',a)];
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});const checks=[],errors=[];
const check=(name,ok,detail)=>{checks.push({name,ok:!!ok,detail});console.log((ok?'PASS ':'FAIL ')+name+' '+JSON.stringify(detail));};
try{const context=await browser.newContext({viewport:{width:1920,height:900}});await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 await context.addInitScript(()=>{window.__getErrorCalls=0;const g=WebGLRenderingContext.prototype.getError;WebGLRenderingContext.prototype.getError=function(){__getErrorCalls++;return g.call(this);};});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:3086/runamarca/hybrid/index.html');await page.waitForFunction(()=>typeof render==='function');
 await page.evaluate(s=>{state=s;serverClockOffset=Date.now()-s.serverNow;render();},view(room,a));await page.waitForFunction(()=>RunaHybrid?.ready);await page.waitForTimeout(800);
 check('estado inicial sem erro',await page.evaluate(()=>RunaHybrid.stats.webglError)===0,null);
 const draws=await page.evaluate(async()=>{const b0=RunaHybrid.stats.builds,c0=__getErrorCalls;for(let i=0;i<3;i++){render();await new Promise(r=>setTimeout(r,250));}return {builds:RunaHybrid.stats.builds-b0,getErrorCalls:__getErrorCalls-c0};});
 check('draw/build não chama gl.getError',draws.builds>0&&draws.getErrorCalls===0,draws);
 const r=await page.evaluate(()=>{const gl=document.querySelector('canvas.hybrid-table,#hybrid-canvas,canvas[data-hybrid]')?.getContext('webgl')||[...document.querySelectorAll('canvas')].map(c=>c.getContext('webgl')).find(Boolean);
  gl.enable(0xDEAD);const reads=[],c0=__getErrorCalls;for(let i=0;i<5;i++)reads.push(RunaHybrid.stats.builds);
  return {reads,callsDuringBuildReads:__getErrorCalls-c0,first:RunaHybrid.stats.webglError,again:RunaHybrid.stats.webglError,spread:{...RunaHybrid.stats}.webglError,cleared:RunaHybrid.clearWebglError(),after:RunaHybrid.stats.webglError};});
 check('consultar builds não toca a GPU',r.callsDuringBuildReads===0,r);
 check('erro pendente chega à verificação (INVALID_ENUM 1280)',r.first===1280,r.first);
 check('erro fica retido em leituras seguintes',r.again===1280&&r.spread===1280,[r.again,r.spread]);
 check('limpeza deliberada devolve e zera',r.cleared===1280&&r.after===0,[r.cleared,r.after]);
 check('sem erros de página',errors.length===0,errors);
}finally{await browser.close();}
const passed=checks.filter(c=>c.ok).length;fs.writeFileSync(out+'/webgl-error.json',JSON.stringify({passed,total:checks.length,checks,errors},null,1));console.log(JSON.stringify({passed,total:checks.length}));process.exitCode=passed===checks.length?0:1;
