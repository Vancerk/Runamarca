// Revisão 12: capturas reproduzíveis antes/depois, mesmo estado (captureTable).
// Uso: node scripts/hybrid12-capture.mjs <pasta> <before|after>
// Gera <tag>-1920x900.png, <tag>-1920x1080.png (perspectiva A), os demais tamanhos
// desktop, a perspectiva B e recortes em escala real (DPR 1 e 2) de símbolos das
// casas, placa de ações, Emanação, carta de combate e reserva.
import {harness,launch,open,paint,captureTable,view,writeJSON} from './hybrid12-lib.mjs';
const [out='prototype-qa/hybrid-12',tag='after']=process.argv.slice(2),{errors,gpu}=harness(out),browser=await launch(),metrics=[];
const CROPS={symbols:'#lanes',actions:'#center-actions',emana:'#self-emana .card',combat:'.lane-side.own-drop .card',reserve:'.reserve-camp.self-camp',log:'#camp-log'};
try{
 for(const [w,h,dpr] of [[1920,900,1],[1920,1080,1],[1440,900,1],[1280,720,1],[1920,900,2],[1920,1080,2]]){
  const {context,page}=await open(browser,{width:w,height:h},{dpr,errors,gpu});
  for(const seat of ['a','b']){
   const t=captureTable();await paint(page,view(t.room,t[seat]),700);
   const id=`${w}x${h}`+(dpr>1?`-dpr${dpr}`:'')+(seat==='b'?'-seat-b':'');
   await page.mouse.move(w/2,h*.42);await page.waitForTimeout(150);
   await page.screenshot({path:`${out}/${tag}-${id}.png`});
   const m=await page.evaluate(()=>({stats:window.RunaHybrid?.stats,config:window.RunaHybridConfig?.snapshot?.(),scroll:{w:document.documentElement.scrollWidth,h:document.documentElement.scrollHeight},field:RunaHybrid.scene?.field?.quad}));
   metrics.push({id,...m});
   if(seat==='a')for(const [name,sel] of Object.entries(CROPS)){const box=await page.locator(sel).first().boundingBox().catch(()=>null);if(!box)continue;const pad=6,clip={x:Math.max(0,box.x-pad),y:Math.max(0,box.y-pad),width:Math.min(w-Math.max(0,box.x-pad),box.width+2*pad),height:Math.min(h-Math.max(0,box.y-pad),box.height+2*pad)};if(clip.width>2&&clip.height>2)await page.screenshot({path:`${out}/${tag}-crop-${name}-${id}.png`,clip});}
  }
  await context.close();}
}finally{writeJSON(`${out}/${tag}-capture.json`,{date:new Date().toISOString(),metrics,errors,gpu});await browser.close();console.log(tag,'capturas',metrics.length,'errors',errors.length,'gpu',gpu.length);}
