// V2 · the card detail dialog on narrow screens (native and hybrid routes): FL17 and FV16 must be entirely inside
// the dialog's content box and the viewport (no right-edge cut), without horizontal scrolling. Unscaled captures.
// V2_SOURCE=initial serves mesa-nova/ from the V2 initial snapshot (before). QA_BROWSER/QA_BASE as in v2-layout-probe.
// Usage: node scripts/v2-detail-fit.mjs <out-dir> [viewport ...]   viewport = WxH[@dpr]
import fs from 'node:fs';import path from 'node:path';
import {chromium,CHROME,captureTable,card,view} from './hybrid12-lib.mjs';
const [out='prototype-qa/revisao-visual-20261103/v2/detalhe',...vps]=process.argv.slice(2),base=process.env.QA_BASE||'http://127.0.0.1:3086',SOURCE=process.env.V2_SOURCE||'current';
const SNAP='prototype-qa/revisao-visual-20261103/v2/initial-snapshot/mesa-nova',TYPES={'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json'};
const viewports=(vps.length?vps:['390x844@2','320x700@2']).map(v=>{const [wh,d]=v.split('@'),[w,h]=wh.split('x').map(Number);return {width:w,height:h,dpr:Number(d||1)};});
fs.mkdirSync(out,{recursive:true});const results=[],check=(name,ok,detail)=>{results.push({name,ok:Boolean(ok),detail});console.log((ok?'PASS ':'FAIL ')+name,JSON.stringify(detail??'').slice(0,300));};
const {room,a}=captureTable();const fl17=card('FL17',a),fv16=card('FV16',a);a.hand.splice(1,2,fl17,fv16);const state=view(room,a);
for(const vp of viewports)for(const route of ['native','hybrid']){const browser=await chromium.launch({executablePath:process.env.QA_BROWSER||CHROME,headless:true});try{
 const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},deviceScaleFactor:vp.dpr,reducedMotion:'reduce'});const allowed=new Set(['127.0.0.1','fonts.googleapis.com','fonts.gstatic.com']);
 await context.route('**/*',r=>{const u=new URL(r.request().url());if(!allowed.has(u.hostname))return r.abort();if(SOURCE==='initial'&&u.hostname==='127.0.0.1'&&u.pathname.startsWith('/runamarca/')){const rel=u.pathname.slice('/runamarca/'.length)||'index.html',file=path.join(SNAP,rel);if(fs.existsSync(file)&&fs.statSync(file).isFile())return r.fulfill({status:200,headers:{'content-type':TYPES[path.extname(rel)]||'application/octet-stream','cache-control':'no-store'},body:fs.readFileSync(file)});}return r.continue();});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/runamarca/'+(route==='hybrid'?'hybrid/index.html':''));await page.waitForFunction(()=>typeof render==='function');await page.evaluate(()=>document.fonts.ready);
 await page.evaluate(s=>{state=s;serverClockOffset=Date.now()-s.serverNow;render();},state);if(route==='hybrid')await page.waitForFunction(()=>window.RunaHybrid?.ready);await page.waitForTimeout(900);
 for(const c of [fl17,fv16]){await page.evaluate(uid=>showCard(state.players.find(p=>p.hand?.some(x=>x.uid===uid)).hand.find(x=>x.uid===uid)),c.uid);await page.waitForTimeout(600);
  const m=await page.evaluate(()=>{const d=document.getElementById('card-detail'),card=d.querySelector('#detail-content .card.big'),dr=d.getBoundingClientRect(),cs=getComputedStyle(d),cr=card.getBoundingClientRect(),content={left:dr.left+parseFloat(cs.borderLeftWidth)+parseFloat(cs.paddingLeft),right:dr.right-parseFloat(cs.borderRightWidth)-parseFloat(cs.paddingRight)};
   return {dialog:{x:+dr.x.toFixed(1),w:+dr.width.toFixed(1),overflowX:cs.overflowX,scrollW:d.scrollWidth,clientW:d.clientWidth},card:{x:+cr.x.toFixed(1),w:+cr.width.toFixed(1),right:+cr.right.toFixed(1)},content,insideContent:cr.left>=content.left-.5&&cr.right<=content.right+.5,insideViewport:cr.left>=-.5&&cr.right<=innerWidth+.5,dialogScrollsX:d.scrollWidth>d.clientWidth+1,pageScrollsX:document.documentElement.scrollWidth>document.documentElement.clientWidth+1};});
  const tag=`${route}-${c.modelId}-${vp.width}x${vp.height}`;await page.screenshot({path:path.join(out,`detalhe-${tag}.png`),clip:{x:Math.max(0,m.dialog.x-4),y:0,width:Math.min(vp.width,m.dialog.w+8),height:vp.height},scale:'device'});
  check(`${tag}: carta inteira dentro do diálogo e da tela, sem rolagem horizontal`,m.insideContent&&m.insideViewport&&!m.dialogScrollsX&&!m.pageScrollsX,m);
  await page.evaluate(()=>document.getElementById('card-detail').close());}
 check(`${route} ${vp.width}x${vp.height}: sem erros de página`,errors.length===0,{errors:errors.slice(0,3)});
}finally{await browser.close();}}
fs.writeFileSync(path.join(out,'detalhe.json'),JSON.stringify({source:SOURCE,results},null,1));const passed=results.filter(r=>r.ok).length;console.log(JSON.stringify({passed,total:results.length}));process.exitCode=passed===results.length?0:1;
