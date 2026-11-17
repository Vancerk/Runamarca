// Abertura (09/11/2026) · folha de comparação: uma linha por fonte (vídeo de referência do dono, antes, depois), cada
// uma com seus quadros em ordem e o instante de cada quadro. As imagens entram como estão, só reduzidas à largura da célula.
// Uso: node scripts/abertura-compare.mjs <out.png> <spec.json>
//  spec: {"title":"…","cell":300,"rows":[{"label":"…","frames":[{"file":"…","caption":"0,05 s"}]}]}
import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/vanxf/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const [out,specFile]=process.argv.slice(2),spec=JSON.parse(fs.readFileSync(specFile,'utf8')),base=path.dirname(specFile),cell=spec.cell||300;
const esc=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const img=f=>{const file=path.isAbsolute(f)?f:path.join(base,f);return 'data:image/'+(/\.jpe?g$/i.test(file)?'jpeg':'png')+';base64,'+fs.readFileSync(file).toString('base64');};
const cols=Math.max(...spec.rows.map(r=>r.frames.length));
const html='<body style="margin:0;background:#161210;font:12px/1.3 sans-serif;color:#e9dcc5"><div style="padding:14px 14px 6px;font:600 18px sans-serif;color:#ffd27a">'+esc(spec.title)+'</div>'+(spec.note?'<div style="padding:0 14px 8px;color:#cfbda4;max-width:'+(cols*(cell+6))+'px">'+esc(spec.note)+'</div>':'')+
 spec.rows.map(r=>'<div style="padding:8px 14px 2px;font:600 14px sans-serif;color:#f2e6cf">'+esc(r.label)+'</div><div style="display:grid;grid-template-columns:repeat('+cols+','+cell+'px);gap:6px;padding:0 14px 10px">'+
  r.frames.map(f=>'<div><img style="width:100%;display:block;background:#000" src="'+img(f.file)+'"><div style="color:#cfbda4;padding-top:2px">'+esc(f.caption||'')+'</div></div>').join('')+'</div>').join('')+'</body>';
const browser=await chromium.launch({executablePath:process.env.QA_BROWSER||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{const page=await (await browser.newContext({viewport:{width:cols*(cell+6)+28,height:400}})).newPage();await page.setContent(html);await page.screenshot({path:out,fullPage:true});console.log('ok',out);}finally{await browser.close();}
