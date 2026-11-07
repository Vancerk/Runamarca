// Bounded reproduction of the reported Edge headless crash. No browser settings or installation are changed.
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
const out=process.argv[2];if(!out||fs.existsSync(out))throw Error('Fresh evidence directory required');fs.mkdirSync(out,{recursive:true});
process.env.QA_BASE='http://127.0.0.1:3127';
const {launch,paint,captureTable,view}=await import('./hybrid12-lib.mjs');
const server=spawn(process.execPath,['scripts/board-prototype-server.mjs'],{windowsHide:true,stdio:'ignore',env:{...process.env,PROTOTYPE_PORT:'3127',RUNAMARCA_FEEDBACK_DIR:path.resolve(out,'store')}});
const base=path.resolve('prototype-qa/claude-rodada4-incremental-20261106/source-before');
const mime={'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.html':'text/html'};
const rows=[];
try{
 let healthy=false;for(let i=0;i<150;i++){try{if((await fetch(process.env.QA_BASE+'/health',{signal:AbortSignal.timeout(500)})).ok){healthy=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}if(!healthy)throw Error('Isolated server unavailable');
 for(const [name,exe] of [['Edge','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'],['Chrome','C:/Program Files/Google/Chrome/Application/chrome.exe']])for(const variant of ['before','current']){
  const row={browser:name,variant,headless:true,ok:false,phase:'launch',crashed:false,errors:[]};let browser;
  try{
   process.env.QA_BROWSER=exe;browser=await launch();row.version=browser.version();
   const context=await browser.newContext({viewport:{width:1920,height:1080}});
   await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.hostname!=='127.0.0.1')return route.abort();if(variant==='before'&&u.pathname.startsWith('/runamarca/')){const suffix=u.pathname.slice(11),rel='mesa-nova/'+(!suffix||suffix.endsWith('/')?suffix+'index.html':suffix),file=path.join(base,rel);if(fs.existsSync(file)&&fs.statSync(file).isFile()&&mime[path.extname(file)])return route.fulfill({body:fs.readFileSync(file),contentType:mime[path.extname(file)]});}return route.continue();});
   const page=await context.newPage();page.setDefaultTimeout(12000);page.setDefaultNavigationTimeout(12000);page.on('crash',()=>{row.crashed=true;});page.on('pageerror',e=>row.errors.push(e.message));
   row.phase='navigation';await page.goto(process.env.QA_BASE+'/runamarca/');await page.waitForFunction(()=>typeof render==='function'&&window.RunaHybrid);row.phase='table';const f=captureTable();await paint(page,view(f.room,f.a),1800);
   row.ready=await page.evaluate(()=>({ready:RunaHybrid.ready,failed:RunaHybrid.stats.failed,webglError:RunaHybrid.stats.webglError}));row.ok=row.ready.ready&&!row.ready.failed&&!row.ready.webglError&&!row.errors.length;
   if(row.ok)await page.screenshot({path:path.join(out,`${name}-${variant}.png`)});row.phase='complete';
  }catch(error){row.error=error.message.slice(0,1600);}finally{await browser?.close().catch(()=>{});rows.push(row);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2));console.log(JSON.stringify(row));}
 }
}finally{server.kill();}
