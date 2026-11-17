// Abertura (09/11/2026) · quadros de um vídeo local (referência do dono ou gravação do Playwright) with headless Chrome: seek <video>, screenshot the element.
// The file is served by a loopback server with Range support (about:blank cannot read file://).
// Usage: node frames.mjs <video> <outPrefix|-> [t0] [t1] [step] [cropX,cropY,cropW,cropH] [scale]
import {createRequire} from 'node:module';import fs from 'node:fs';import http from 'node:http';
const require=createRequire(import.meta.url);const {chromium}=require('C:/Users/vanxf/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const [video,prefix,t0='0',t1='-1',step='0.5',crop='',scale='1']=process.argv.slice(2);
const size=fs.statSync(video).size;
const srv=http.createServer((req,res)=>{
 if(req.url==='/'){res.writeHead(200,{'content-type':'text/html'});return res.end('<body style="margin:0;background:#000"><video id=v muted preload=auto src="/v.mp4"></video>');}
 const m=/bytes=(\d+)-(\d*)/.exec(req.headers.range||'');const a=m?Number(m[1]):0,b=m&&m[2]?Number(m[2]):size-1;
 res.writeHead(m?206:200,{'content-type':`${/.webm$/i.test(video)?'video/webm':'video/mp4'}`,'accept-ranges':'bytes','content-length':b-a+1,...(m?{'content-range':`bytes ${a}-${b}/${size}`}:{})});fs.createReadStream(video,{start:a,end:b}).pipe(res);
});
await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
let code=0;
try{const p=await (await b.newContext({viewport:{width:1920,height:1080}})).newPage();
 await p.goto(`http://127.0.0.1:${port}/`);
 const meta=await Promise.race([p.evaluate(()=>new Promise((res,rej)=>{const v=document.getElementById('v');const ok=()=>res({d:v.duration,w:v.videoWidth,h:v.videoHeight});if(v.readyState>=1)ok();else{v.onloadedmetadata=ok;v.onerror=()=>rej(new Error('video error '+(v.error&&v.error.message)));}})),new Promise((_,rej)=>setTimeout(()=>rej(new Error('metadata timeout')),20000))]);
 console.log(JSON.stringify(meta));
 if(prefix!=='-'){
  const s=Number(scale);await p.evaluate(([w,h,s])=>{const v=document.getElementById('v');v.style.width=w*s+'px';v.style.height=h*s+'px';v.style.display='block';},[meta.w,meta.h,s]);
  await p.setViewportSize({width:Math.ceil(meta.w*s),height:Math.ceil(meta.h*s)});
  const end=Number(t1)<0?meta.d:Math.min(meta.d,Number(t1));const c=crop?crop.split(',').map(Number):null;let i=0;
  for(let t=Number(t0);t<=end+1e-6;t+=Number(step)){await p.evaluate(t=>new Promise(res=>{const v=document.getElementById('v');v.onseeked=()=>requestAnimationFrame(()=>requestAnimationFrame(res));v.currentTime=t;}),t);
   const f=`${prefix}-${String(i++).padStart(3,'0')}-${t.toFixed(3)}.png`;await p.screenshot({path:f,...(c?{clip:{x:c[0]*s,y:c[1]*s,width:c[2]*s,height:c[3]*s}}:{})});}
  console.log('frames',i);}
}catch(e){console.error(String(e));code=1;}finally{await b.close();srv.close();}
process.exit(code);
