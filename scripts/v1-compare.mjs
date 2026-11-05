// V1 · side-by-side comparison sheets without resampling the evidence.
// Each row places the given PNGs at 1:1 and, below them, the same crop enlarged ×3 with nearest-neighbour
// (pixel replication only, labelled), so aliasing and blur stay visible instead of being smoothed away.
// Usage: node scripts/v1-compare.mjs <out.png> <crop x,y,w,h | full> <label=file.png> [label=file.png ...]
import fs from 'node:fs';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/vanxf/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const [out,cropArg,...pairs]=process.argv.slice(2);
const items=pairs.map(p=>{const i=p.indexOf('=');return {label:p.slice(0,i),b64:fs.readFileSync(p.slice(i+1)).toString('base64')};});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{const page=await (await browser.newContext({deviceScaleFactor:1})).newPage();
 const png=await page.evaluate(async([items,cropArg])=>{
  const imgs=await Promise.all(items.map(async it=>{const im=new Image();im.src='data:image/png;base64,'+it.b64;await im.decode();return {...it,im};}));
  const crop=cropArg==='full'?null:cropArg.split(',').map(Number),zoom=3,pad=12,label=22;
  const colW=Math.max(...imgs.map(i=>Math.max(i.im.width,crop?crop[2]*zoom:0))),topH=Math.max(...imgs.map(i=>i.im.height)),cropH=crop?crop[3]*zoom:0;
  const c=document.createElement('canvas');c.width=imgs.length*(colW+pad)+pad;c.height=pad+label+topH+(crop?pad+label+cropH:0)+pad;const g=c.getContext('2d');
  g.fillStyle='#202020';g.fillRect(0,0,c.width,c.height);g.imageSmoothingEnabled=false;g.font='600 14px sans-serif';g.fillStyle='#f2f2f2';
  imgs.forEach((it,k)=>{const x=pad+k*(colW+pad);g.fillText(it.label+' — 1:1 ('+it.im.width+'×'+it.im.height+')',x,pad+15);g.drawImage(it.im,x,pad+label);
   if(crop){const y=pad+label+topH+pad;g.fillText('recorte '+crop[2]+'×'+crop[3]+' ampliado ×3 (vizinho mais próximo)',x,y+15);g.drawImage(it.im,crop[0],crop[1],crop[2],crop[3],x,y+label,crop[2]*zoom,crop[3]*zoom);g.strokeStyle='#ff4d4d';g.lineWidth=1;g.strokeRect(x+crop[0]+.5,pad+label+crop[1]+.5,crop[2],crop[3]);}});
  return c.toDataURL('image/png').split(',')[1];},[items,cropArg]);
 fs.writeFileSync(out,Buffer.from(png,'base64'));console.log('ok',out);
}finally{await browser.close();}
