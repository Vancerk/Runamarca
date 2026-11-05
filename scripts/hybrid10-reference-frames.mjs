// Extrai quadros de um vídeo local de referência usando o decodificador do Chrome.
// Uso: node scripts/hybrid10-reference-frames.mjs <video> sheet <inicio> <fim> <passo> <nome> [colunas] [largura] [x,y,w,h]
//      node scripts/hybrid10-reference-frames.mjs <video> info
// As imagens ficam em prototype-qa/hybrid-10/reference/ (PNG ignorado pelo Git) e não são enviadas a serviço algum.
import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/vanxf/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const [video,mode='info',a='0',b='10',step='1',name='sheet',cols='6',width='320',crop='']=process.argv.slice(2);if(!video)throw new Error('vídeo ausente');
const out='prototype-qa/hybrid-10/reference';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--allow-file-access-from-files','--autoplay-policy=no-user-gesture-required']});
try{const page=await browser.newPage({viewport:{width:1600,height:1000}});const html=path.resolve(out,'player.html');fs.writeFileSync(html,'<!doctype html><body style="margin:0;background:#000"><video id=v muted preload=auto></video><canvas id=c></canvas></body>');
 await page.goto(pathToFileURL(html).href);await page.evaluate(src=>new Promise((ok,ko)=>{const v=document.getElementById('v');v.onloadedmetadata=()=>ok();v.onerror=()=>ko(new Error('decode '+(v.error&&v.error.code)));v.src=src;}),pathToFileURL(path.resolve(video)).href);
 const info=await page.evaluate(()=>{const v=document.getElementById('v');return {duration:v.duration,width:v.videoWidth,height:v.videoHeight};});console.log(JSON.stringify(info));
 if(mode==='sheet'){const times=[];for(let t=+a;t<=+b+1e-6;t+=+step)times.push(+t.toFixed(3));
  const data=await page.evaluate(async({times,cols,width,crop})=>{const v=document.getElementById('v'),c=document.getElementById('c'),r=crop||[0,0,v.videoWidth,v.videoHeight],w=width,h=Math.round(w*r[3]/r[2]),rows=Math.ceil(times.length/cols);c.width=w*cols;c.height=(h+18)*rows;const g=c.getContext('2d');g.fillStyle='#000';g.fillRect(0,0,c.width,c.height);g.font='bold 14px monospace';
   for(let i=0;i<times.length;i++){await new Promise(ok=>{v.onseeked=()=>ok();v.currentTime=Math.min(times[i],v.duration-0.01);});const x=(i%cols)*w,y=Math.floor(i/cols)*(h+18);g.drawImage(v,r[0],r[1],r[2],r[3],x,y+18,w,h);g.fillStyle='#ff0';g.fillText(times[i].toFixed(3)+'s',x+4,y+14);}
   return c.toDataURL('image/png');},{times,cols:+cols,width:+width,crop:crop?crop.split(',').map(Number):null});
  const file=path.join(out,name+'.png');fs.writeFileSync(file,Buffer.from(data.split(',')[1],'base64'));console.log(file,times.length);}
}finally{await browser.close();}
