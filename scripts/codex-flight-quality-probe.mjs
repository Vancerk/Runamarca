// Isolated visual experiment. Freezes only the two transfer copies; no product changes.
import fs from 'node:fs';import path from 'node:path';import {spawn} from 'node:child_process';
const out=process.argv[2];if(!out||fs.existsSync(out))throw Error('Choose a fresh output directory');fs.mkdirSync(out,{recursive:true});
const PORT='3129';process.env.QA_BASE='http://127.0.0.1:'+PORT;process.env.QA_BROWSER='C:/Program Files/Google/Chrome/Application/chrome.exe';
const {launch,paint,captureTable,view,catalog}=await import('./hybrid12-lib.mjs');const {act}=await import('../mesa-nova/game.mjs');
const server=spawn(process.execPath,['scripts/board-prototype-server.mjs'],{windowsHide:true,env:{...process.env,PROTOTYPE_PORT:PORT,RUNAMARCA_FEEDBACK_DIR:path.join(out,'store')},stdio:'ignore'});
const result={errors:[],variants:[]};let browser;
try{
 for(let i=0;i<100;i++){try{if((await fetch(process.env.QA_BASE+'/health')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await launch();const context=await browser.newContext({viewport:{width:1920,height:1080}}),f=captureTable();f.a.mana=10;f.a.reserve=f.a.reserve.slice(0,2);
 await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.hostname!=='127.0.0.1')return route.abort();if(u.pathname.endsWith('/act')){try{act(f.room,f.a,route.request().postDataJSON(),catalog);return route.fulfill({json:view(f.room,f.a)});}catch(e){return route.fulfill({status:400,json:{error:e.message}});}}
  if(u.pathname.endsWith('/hybrid/flights.js')){const original=fs.readFileSync('mesa-nova/hybrid/flights.js','utf8');if(!original.includes('pause(ms+delay+600)'))throw Error('QA timeout hook not found');return route.fulfill({body:original.replace('pause(ms+delay+600)','new Promise(()=>{})'),contentType:'text/javascript'});}return route.continue();});
 const page=await context.newPage();page.on('pageerror',e=>result.errors.push(e.message));
 await page.goto(process.env.QA_BASE+'/runamarca/');await page.waitForFunction(()=>window.RunaHybrid&&typeof render==='function');await paint(page,view(f.room,f.a),1700);
 await page.evaluate(()=>{window.__flight=[];const original=Element.prototype.animate;Element.prototype.animate=function(frames,options){const a=original.call(this,frames,options);if(this.matches('.hybrid-motion-face')&&Array.isArray(frames)&&frames[0].opacity!==undefined){a.pause();a.currentTime=options.duration*.35;__flight.push({node:this,a,frames,options});}return a;};});
 const id=await page.evaluate(()=>[...document.querySelectorAll('#hand>.hand-card')].reverse().find(n=>seat().hand.find(c=>c.uid===n.dataset.uid)?.type==='creature')?.dataset.uid);
 await page.evaluate(id=>{void command({type:'play',cardId:id});},id);await page.waitForFunction(()=>__flight.length>=2);await page.waitForTimeout(100);
 result.card=id;result.pose=await page.evaluate(()=>__flight.map(e=>{const r=e.node.getBoundingClientRect();return{box:r.toJSON(),css:[e.node.style.width,e.node.style.height],transform:getComputedStyle(e.node).transform,canvases:[...e.node.querySelectorAll('canvas')].map(c=>({name:c.className,w:c.width,h:c.height,css:getComputedStyle(c).width,visible:getComputedStyle(c).visibility}))};}));
 const bounds=await page.evaluate(()=>{const r=__flight[0].node.getBoundingClientRect();return{x:Math.floor(r.x)-12,y:Math.floor(r.y)-12,width:Math.ceil(r.width)+24,height:Math.ceil(r.height)+24};});
 await page.evaluate(()=>{window.__sources=__flight.map(e=>[...e.node.querySelectorAll('canvas')].map(c=>{const original=document.createElement('canvas');original.width=c.width;original.height=c.height;original.getContext('2d').drawImage(c,0,0);return{canvas:c,original};}));});
 for(const variant of ['original','high-2','high-1','lanczos-2','lanczos-auto','lanczos-layer','high-current','lanczos-current']){
  const stats=await page.evaluate(variant=>{const start=performance.now(),maxWidth=Math.max(...__flight.map(e=>parseFloat(e.node.style.width)));for(let i=0;i<__flight.length;i++){const e=__flight[i];e.node.style.willChange=variant==='lanczos-auto'?'auto':'transform';for(const {canvas,original}of __sources[i]){canvas.style.willChange=variant==='lanczos-layer'?'transform':'';const scale=variant==='high-1'?1:2,w=variant==='original'?original.width:Math.ceil((variant.endsWith('current')?e.node.getBoundingClientRect().width:maxWidth*scale)*devicePixelRatio),h=variant==='original'?original.height:Math.ceil(w*original.height/original.width);canvas.width=w;canvas.height=h;const ink=canvas.getContext('2d');ink.imageSmoothingEnabled=true;ink.imageSmoothingQuality='high';ink.drawImage(variant.startsWith('lanczos')?RunaResample.reduce(original,w,h):original,0,0,w,h);}}return{ms:performance.now()-start};},variant);
  await page.waitForTimeout(100);await page.screenshot({path:path.join(out,variant+'.png'),clip:bounds});result.variants.push({variant,...stats});
 }
}finally{await browser?.close();server.kill();fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(result,null,2));}
console.log(JSON.stringify(result));if(result.errors.length)process.exitCode=1;
