// Monta recortes lado a lado de capturas locais para comparação antes/depois.
// Uso: node scripts/hybrid10-crop.mjs <saída.png> <escala> <arquivo>@x,y,w,h [...]
import fs from 'node:fs';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/vanxf/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const [output,scale='1',...specs]=process.argv.slice(2),k=Number(scale);
const tiles=specs.map(spec=>{const [file,box]=spec.split('@'),[x,y,w,h]=box.split(',').map(Number);return {file,x,y,w,h,data:'data:image/png;base64,'+fs.readFileSync(file).toString('base64')};});
const width=tiles.reduce((s,t)=>s+t.w*k+6,6),height=Math.max(...tiles.map(t=>t.h*k))+30;
const html='<body style="margin:0;background:#111;color:#ff0;font:12px monospace;white-space:nowrap">'+tiles.map(t=>`<div style="display:inline-block;margin:3px;vertical-align:top"><div style="height:18px;overflow:hidden;width:${t.w*k}px">${t.file.split(/[\\/]/).slice(-1)[0]}</div><div style="width:${t.w*k}px;height:${t.h*k}px;overflow:hidden;position:relative"><img src="${t.data}" style="position:absolute;left:${-t.x*k}px;top:${-t.y*k}px;transform-origin:0 0;transform:scale(${k});image-rendering:auto"></div></div>`).join('')+'</body>';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{const page=await browser.newPage({viewport:{width:Math.ceil(width),height:Math.ceil(height)}});await page.setContent(html);await page.waitForFunction(()=>[...document.images].every(i=>i.complete));await page.screenshot({path:output});console.log(output);}finally{await browser.close();}
