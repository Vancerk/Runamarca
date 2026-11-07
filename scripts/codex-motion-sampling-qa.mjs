// Actual transfer, frozen only for image comparisons. Reference = identical pose at DPR 4.
import fs from 'node:fs';import path from 'node:path';import {spawn} from 'node:child_process';
const out=process.argv[2];if(!out||fs.existsSync(out))throw Error('fresh output directory required');fs.mkdirSync(out,{recursive:true});
process.env.QA_BASE='http://127.0.0.1:3131';process.env.QA_BROWSER??='C:/Program Files/Google/Chrome/Application/chrome.exe';
const {launch,paint,captureTable,view,catalog}=await import('./hybrid12-lib.mjs');const {act}=await import('../mesa-nova/game.mjs');
const baseline=path.resolve('prototype-qa/codex-voos-fluidez-20261107/source-before'),types={'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json'},result={checks:[],errors:[],cases:[]};
const check=(name,pass,detail)=>{result.checks.push({name,pass,detail});console.log(pass?'ok':'FAIL',name);};
const server=spawn(process.execPath,['scripts/board-prototype-server.mjs'],{windowsHide:true,stdio:'ignore',env:{...process.env,PROTOTYPE_PORT:'3131',RUNAMARCA_FEEDBACK_DIR:path.join(out,'store')}});let browser;
try{
 for(let i=0;i<100;i++){try{if((await fetch(process.env.QA_BASE+'/health')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 for(const [label,dpr,before] of [['antes',1,true],['depois',1,false],['referencia',4,true],['depois-dpr2',2,false]]){
  browser=await launch();
  const context=await browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:dpr}),f=captureTable();f.a.mana=10;f.a.reserve=f.a.reserve.slice(0,2);
  await context.route('**/*',route=>{
   const u=new URL(route.request().url());if(u.hostname!=='127.0.0.1')return route.abort();
   if(u.pathname.endsWith('/act')){try{act(f.room,f.a,route.request().postDataJSON(),catalog);return route.fulfill({json:view(f.room,f.a)});}catch(e){return route.fulfill({status:400,json:{error:e.message}});}}
   if(u.pathname.startsWith('/runamarca/')){
    const rel='mesa-nova/'+(u.pathname.slice(11)||'index.html'),src=before?path.join(baseline,rel):rel;
    if(types[path.extname(rel)]&&fs.existsSync(src)){
     let body=fs.readFileSync(src);if(rel.endsWith('/flights.js'))body=body.toString().replace('pause(ms+delay+600)','new Promise(()=>{})');
     return route.fulfill({body,contentType:types[path.extname(rel)]});
    }
   }return route.continue();
  });
  const page=await context.newPage();page.on('pageerror',e=>result.errors.push(label+': '+e.message));await page.goto(process.env.QA_BASE+'/runamarca/');await page.waitForFunction(()=>window.RunaHybrid&&typeof render==='function');await paint(page,view(f.room,f.a),1700);
  await page.evaluate(()=>{window.__flight=[];const original=Element.prototype.animate;Element.prototype.animate=function(frames,options){const a=original.call(this,frames,options);if(this.matches('.hybrid-motion-face')&&frames[0].opacity!==undefined){a.pause();a.currentTime=options.duration*.35;__flight.push({node:this,a,frames,options});}return a;};});
  const id=await page.evaluate(()=>[...document.querySelectorAll('#hand>.hand-card')].reverse().find(n=>seat().hand.find(c=>c.uid===n.dataset.uid)?.type==='creature')?.dataset.uid);
  await page.evaluate(id=>{void command({type:'play',cardId:id});},id);await page.waitForFunction(()=>__flight.length===2);await page.waitForTimeout(400);
  // Isolate the same painted face on a transparent field. Do not alter its transform or contents.
  await page.addStyleTag({content:'html,body{background:transparent!important}body>:not(.hybrid-flight-portal){visibility:hidden!important}.hybrid-flight-portal>.hybrid-motion-face{opacity:0!important;filter:none!important}.hybrid-flight-portal>.qa-subject{opacity:1!important;visibility:visible!important}'});
  for(const progress of [.05,.35,.7,.95])for(const face of [0,1]){
   const detail=await page.evaluate(({progress,face})=>{
    for(const [i,e]of __flight.entries()){e.a.currentTime=e.options.duration*progress;e.node.classList.toggle('qa-subject',i===face);}return {};
   },{progress,face});await page.waitForTimeout(70);
   Object.assign(detail,await page.evaluate(face=>{const e=__flight[face],r=e.node.getBoundingClientRect(),canvas=e.node.querySelector('.card-art-canvas');return {box:r.toJSON(),bitmap:{width:canvas.width,height:canvas.height},stats:window.RunaMotionSampling?.stats};},face));
   const r=detail.box,clip={x:Math.floor(r.x)-3,y:Math.floor(r.y)-3,width:Math.ceil(r.right)-Math.floor(r.x)+6,height:Math.ceil(r.bottom)-Math.floor(r.y)+6},file=`${label}-${face}-${progress}.png`;
   await page.screenshot({path:path.join(out,file),clip,omitBackground:true});result.cases.push({label,dpr,progress,face,file,clip,...detail});
  }
  if(!before){const stats=await page.evaluate(()=>RunaMotionSampling.stats);check(label+': sampling is active during the flight',stats.active===2,stats);}
  await page.evaluate(()=>{for(const e of __flight)e.a.finish();});await page.waitForTimeout(500);
  check(label+': no copies remain after arrival',await page.locator('.hybrid-motion-face').count()===0);
  if(!before)check(label+': sampler releases observers and frame loops',await page.evaluate(()=>RunaMotionSampling.stats.active===0));
  await context.close();await browser.close();browser=null;
  fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(result,null,2));
 }
 check('no page errors',result.errors.length===0,result.errors);
}finally{await browser?.close();server.kill();fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(result,null,2));}
if(result.errors.length||result.checks.some(c=>!c.pass))process.exitCode=1;
