// V3 · granulação do feltro numa área livre (desvio-padrão e diferença média entre pixels vizinhos da luminância),
// para detectar acne de sombra entre versões da mesma cena. Usage: node scripts/v3-felt-noise.mjs <x,y,w,h> <a.png> [b.png ...]
import fs from 'node:fs';import {chromium,CHROME} from './hybrid12-lib.mjs';
const [box,...files]=process.argv.slice(2),[x,y,w,h]=box.split(',').map(Number);
const browser=await chromium.launch({executablePath:process.env.QA_BROWSER||CHROME,headless:true}),page=await (await browser.newContext()).newPage();
for(const f of files){const r=await page.evaluate(async([b64,x,y,w,h])=>{const im=new Image();im.src='data:image/png;base64,'+b64;await im.decode();const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const g=c.getContext('2d');g.drawImage(im,0,0);const d=g.getImageData(x,y,w,h).data,L=[];for(let i=0;i<d.length;i+=4)L.push(.2126*d[i]+.7152*d[i+1]+.0722*d[i+2]);const m=L.reduce((a,b)=>a+b,0)/L.length,sd=Math.sqrt(L.reduce((a,b)=>a+(b-m)**2,0)/L.length);let hf=0,n=0;for(let j=0;j<h;j++)for(let i=1;i<w;i++){hf+=Math.abs(L[j*w+i]-L[j*w+i-1]);n++;}return {mean:+m.toFixed(1),sd:+sd.toFixed(2),neighbourDiff:+(hf/n).toFixed(2)};},[fs.readFileSync(f).toString('base64'),x,y,w,h]);console.log(f.split(/[\/]/).slice(-2).join('/'),JSON.stringify(r));}
await browser.close();
