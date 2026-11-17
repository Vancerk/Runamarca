// Contact sheet: node sheet.mjs <out.png> <cols> <cellW> <file...>
import {createRequire} from 'node:module';import fs from 'node:fs';import path from 'node:path';
const require=createRequire(import.meta.url);const {chromium}=require('C:/Users/vanxf/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const [out,cols,cw,...files]=process.argv.slice(2);
const html='<body style="margin:0;background:#111;font:11px sans-serif;color:#ffd27a"><div style="display:grid;grid-template-columns:repeat('+cols+','+cw+'px);gap:4px;padding:4px">'+files.map(f=>'<div><img style="width:100%;display:block" src="data:image/png;base64,'+fs.readFileSync(f).toString('base64')+'"><div>'+path.basename(f).replace(/\.png$/,'').split('-').slice(-1)[0]+' s</div></div>').join('')+'</div>';
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{const p=await (await b.newContext({viewport:{width:cols*(Number(cw)+4)+4,height:400}})).newPage();await p.setContent(html);await p.screenshot({path:out,fullPage:true});console.log('ok',out);}finally{await b.close();}
