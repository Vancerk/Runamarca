// Revisão 12: utilidades compartilhadas pelos runners hybrid12-*. Somente fixtures
// locais (r1-fixtures.mjs), servidor de loopback e navegador headless local.
import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';import {setup,card,view,catalog,combat} from '../mesa-nova/r1-fixtures.mjs';
export {setup,card,view,catalog,combat};
const require=createRequire(import.meta.url),ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const PLAYWRIGHT='C:/Users/vanxf/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright';
export const CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe';
export const URL_HYBRID=(process.env.QA_BASE||'http://127.0.0.1:3086')+'/runamarca/hybrid/index.html';
export const URL_NATIVE=(process.env.QA_BASE||'http://127.0.0.1:3086')+'/runamarca/';
export const {chromium}=require(PLAYWRIGHT);
export function harness(out){
 fs.mkdirSync(out,{recursive:true});const checks=[],errors=[],gpu=[];
 const check=(name,value,detail)=>{checks.push({name,pass:!!value,detail});if(!value)console.log('FAIL',name,JSON.stringify(detail??'').slice(0,600));else console.log('ok  ',name);};
 return {checks,errors,gpu,check};
}
// Claude round 4: HYBRID_VERIFY_INCREMENTAL=1 turns on the incremental-rebuild verification in every page of the run
// (each incremental rebuild is followed by a full one and compared; a mismatch raises a page error).
export async function launch(){const browser=await chromium.launch({executablePath:process.env.QA_BROWSER||CHROME,headless:true,args:(process.env.QA_BROWSER_ARGS||'').split(' ').filter(Boolean)});if(process.env.QA_ISOLATE_CONTEXTS==='1'){
 // Some local Chrome runs stall on a second context even with the baseline source.
 // Keep assertions intact, but give each QA context its own browser process.
 const children=new Set(),close=browser.close.bind(browser);
 browser.newContext=async options=>{const child=await chromium.launch({executablePath:process.env.QA_BROWSER||CHROME,headless:true,args:(process.env.QA_BROWSER_ARGS||'').split(' ').filter(Boolean)});children.add(child);try{const context=await child.newContext(options),closeContext=context.close.bind(context);context.close=async()=>{try{await closeContext();}finally{children.delete(child);await child.close();}};return context;}catch(error){children.delete(child);await child.close();throw error;}};
 browser.newPage=async options=>(await browser.newContext(options)).newPage();
 browser.close=async()=>{await Promise.allSettled([...children].map(child=>child.close()));children.clear();await close();};
 }if(process.env.HYBRID_VERIFY_INCREMENTAL){const ctx=browser.newContext.bind(browser),page=browser.newPage.bind(browser),init=c=>{if(process.env.HYBRID_VERIFY_LOG)c.on('page',p=>p.on('console',m=>{const t=m.text();if(t.includes('[hybrid-incremental]'))import('node:fs').then(fs=>fs.appendFileSync(process.env.HYBRID_VERIFY_LOG,t+String.fromCharCode(10)));}));return c.addInitScript(()=>{window.__HYBRID_VERIFY_INCREMENTAL=true;}).then(()=>c);};browser.newContext=o=>ctx(o).then(init);browser.newPage=async o=>{const c=await browser.newContext(o);const p=await c.newPage();return p;};}return browser;}
// Continuação da revisão 12: HYBRID_QA_SOURCE=rev11 serve, por interceptação local das
// respostas, os arquivos de mesa-nova/ que diferem entre o checkout e a árvore Git
// verificada da revisão 11 (87f9208…), lidos com `git cat-file` (nenhum arquivo do checkout
// é tocado). `sourceOverride.served` registra o que foi de fato servido do baseline.
export const REV11_TREE='87f9208df3408f1d033e9a8321b60744eea7b0fa';
export const sourceOverride=(()=>{
 const label=process.env.HYBRID_QA_SOURCE||'current';if(label==='current')return {label,files:{},served:{}};
 if(label!=='rev11')throw Error('HYBRID_QA_SOURCE must be current or rev11');
 const git=(...a)=>execFileSync('git',a,{cwd:ROOT,windowsHide:true,maxBuffer:1<<26});
 const changed=git('diff','--name-only',REV11_TREE,'--','mesa-nova').toString().split('\n').filter(Boolean),files={};
 for(const p of changed){let blob;try{blob=git('cat-file','blob',`${REV11_TREE}:${p}`);}catch{blob=null;}files['/runamarca/'+p.slice('mesa-nova/'.length)]={path:p,body:blob,sha1:blob&&createHash('sha1').update(blob).digest('hex')};}
 return {label,tree:REV11_TREE,files,served:{}};
})();
const TYPES={'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json'};
// Opens the hybrid page with network restricted to loopback. `init` may set the camera
// override (window.__HYBRID_TILT_DEGREES) used only by the angle comparison runner;
// `initPath` injects QA observer scripts: a path, {content} or a list of them.
export async function open(browser,viewport,{dpr=1,reduced=false,touch=false,url=URL_HYBRID,errors=[],gpu=[],init=null,initPath=null}={}){
 const context=await browser.newContext({viewport,deviceScaleFactor:dpr,reducedMotion:reduced?'reduce':'no-preference',hasTouch:touch});
 await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.hostname!=='127.0.0.1')return r.abort();const o=sourceOverride.files[u.pathname];
  if(!o)return r.continue();sourceOverride.served[u.pathname]=(sourceOverride.served[u.pathname]||0)+1;
  if(!o.body)return r.fulfill({status:404,body:'not in rev11 tree'});return r.fulfill({status:200,headers:{'content-type':TYPES[path.extname(u.pathname)]||'application/octet-stream','cache-control':'no-cache'},body:o.body});});
 const page=await context.newPage();if(init)await page.addInitScript(init.fn,init.arg);for(const s of [initPath].flat().filter(Boolean))await page.addInitScript(typeof s==='string'?{path:s}:s);
 page.on('pageerror',e=>errors.push(viewport.width+'x'+viewport.height+': '+e.message));
 page.on('console',e=>{if(e.type()==='error'&&/WebGL|GL_INVALID/.test(e.text()))gpu.push(e.text());});
 await page.goto(url);await page.waitForFunction(()=>typeof render==='function');
 if(url===URL_HYBRID)await page.waitForFunction(()=>window.RunaHybridHand&&window.RunaHybridConfig);
 return {context,page};
}
export async function paint(page,s,wait=450){
 await page.evaluate(s=>{state=s;serverClockOffset=Date.now()-s.serverNow;render();},s);
 await page.waitForFunction(()=>!window.RunaHybrid||RunaHybrid.ready||RunaHybrid.stats.failed);
 await page.evaluate(()=>Promise.all([...document.querySelectorAll('#game .card')].map(n=>n.visualReady)));
 await page.waitForTimeout(wait);
}
// Server polling stand-in. view(room,p) releases the combat timeline progressively (only
// the steps already due are public), so a single state push would show the formation
// reveal and nothing else. This re-sends a fresh view every `ms`, as the room polling
// does, until stop() — the combat then runs exactly as a client would receive it.
export function poll(page,next,ms=150){let busy=false,stopped=false,pushes=0;const push=()=>{if(busy||stopped)return;busy=true;const v=next();page.evaluate(v=>{state=v;serverClockOffset=Date.now()-v.serverNow;render();},v).then(()=>{pushes++;},()=>{}).finally(()=>{busy=false;});};push();const timer=setInterval(push,ms);
 return {stop:async()=>{stopped=true;clearInterval(timer);while(busy)await new Promise(r=>setTimeout(r,10));},get pushes(){return pushes;}};}
// Reproducible table used by the before/after captures: combat cards in the three
// lanes (Golias with Provocar, João Bobão, Verônica), full reserves, two Emanations
// with long real texts and a nine-card hand. Same UIDs every run (fixture serial).
export function captureTable(){
 const {room,a,b}=setup();
 const pick=(p,ids)=>ids.map(id=>card(id,p));
 a.hand=pick(a,['FL10','FV03','FL16','FL09','FV03','FL11','FL10','FV03','FL16']);
 b.hand=pick(b,['FV03','FV03','FV03','FV03','FV03']);
 a.reserve=pick(a,['FL09','FL16','FL11','FV03','FV03']);b.reserve=pick(b,['FL16','FL09','FV03','FL11','FV03']);
 const ea=pick(a,['FV15','FL11']),eb=pick(b,['RG13','FV07']);a.reserve.push(...ea);b.reserve.push(...eb);a.emanation=ea.map(c=>c.uid);b.emanation=eb.map(c=>c.uid);
 a.formation=[a.reserve[0].uid,a.reserve[1].uid,a.reserve[2].uid];b.formation=[b.reserve[0].uid,null,b.reserve[3].uid];
 for(const p of [a,b])p.patron.hp=16;room.phase='prep';
 return {room,a,b};
}
export function dataOf(models,id){return [...models.decks.flatMap(d=>d.cards),...(models.additionalCards||[])].find(c=>c.id===id);}
export function writeJSON(file,data){fs.writeFileSync(file,JSON.stringify(data,null,1));}
export function finish(out,name,{checks,errors,gpu},extra={}){
 const failed=checks.filter(c=>!c.pass);writeJSON(`${out}/${name}.json`,{date:new Date().toISOString(),checks,errors,gpu,...extra});
 console.log(`${checks.length-failed.length}/${checks.length} checks; errors ${errors.length}; gpu ${gpu.length}`);
 if(failed.length||errors.length)process.exitCode=1;
}
