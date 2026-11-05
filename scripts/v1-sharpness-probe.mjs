// V1 · card sharpness/legibility probe (isolated QA: fixture state injected client-side, no live match touched).
// For FL17 and the longest-text card (FV16) it records, per stage (hand, reserve on the board, hover, detail):
// CSS box, layout box, bitmap of the cached face canvas, the hybrid intermediate sample, effective rules font
// size in device px, served hashes, and unscaled screenshots. Unrotated stages are also compared with a
// reference drawn by drawCard directly at the displayed device size (no resampling): Tenengrad sharpness of the
// rules box and mean absolute difference to that reference.
// Usage: node scripts/v1-sharpness-probe.mjs <native|hybrid> <out-dir> [width] [height] [dpr]
import fs from 'node:fs';import crypto from 'node:crypto';import path from 'node:path';
import {createRequire} from 'node:module';
import {setup,card,view} from '../mesa-nova/r1-fixtures.mjs';
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/vanxf/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const [route='native',out='prototype-qa/revisao-visual-20261103/v1/probe',W='1920',H='1080',D='1']=process.argv.slice(2),width=Number(W),height=Number(H),dpr=Number(D);
const base=(process.env.QA_BASE||'http://127.0.0.1:3086')+'/runamarca/',url=base+(route==='hybrid'?'hybrid/index.html':'');fs.mkdirSync(out,{recursive:true});
const {room,a}=setup();const fl17=card('FL17',a),fv16=card('FV16',a);a.hand=[card('FV03',a),fl17,fv16,card('FL10',a),card('FV05',a)];const board=card('FL17',a);a.reserve=[board,card('FV03',a)];
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const result={route,url,viewport:{width,height},dpr,stages:[],served:{}};
try{
 const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:dpr,reducedMotion:'reduce'});// Local server plus the Google Fonts hosts the page really uses (EB Garamond, Cinzel), as in the owner's browser.
 const allowed=new Set(['127.0.0.1','fonts.googleapis.com','fonts.gstatic.com']);await context.route('**/*',r=>allowed.has(new URL(r.request().url()).hostname)?r.continue():r.abort());
 const page=await context.newPage();
 // Optional A/B: V1_OVERRIDE_FILE=<json {"/runamarca/app.js":"<file>",...}> serves those bytes to this page only.
 for(const [p,file] of Object.entries(process.env.V1_OVERRIDE_FILE?JSON.parse(fs.readFileSync(process.env.V1_OVERRIDE_FILE,'utf8')):{})){const body=fs.readFileSync(file);result.override=(result.override||[]).concat(p);await page.route('**'+p+'*',r=>r.fulfill({status:200,headers:{'cache-control':'no-store','content-type':p.endsWith('.css')?'text/css; charset=utf-8':'text/javascript; charset=utf-8'},body}));}
 page.on('response',async r=>{const u=new URL(r.url());if(/\/(card-visual|app|style|hand|card-plane|bridge|renderer|camp-layout|board-prototype)\.(js|css)$/.test(u.pathname)){try{result.served[u.pathname]=crypto.createHash('sha256').update(await r.body()).digest('hex');}catch{}}});
 await page.goto(url);await page.waitForFunction(()=>typeof render==='function');await page.evaluate(()=>document.fonts.ready);
 // Record the exact design each face canvas receives (paintCardFace is a global function declaration in app.js).
 await page.evaluate(()=>{const original=window.paintCardFace;window.paintCardFace=function(canvas,design,combat,flat){canvas.__design={design,combat,flat};return original.apply(this,arguments);};});
 await page.evaluate(s=>{state=s;render();},view(room,a));
 if(route==='hybrid')await page.waitForFunction(()=>window.RunaHybrid?.ready);
 await page.waitForTimeout(1500);
 result.env=await page.evaluate(()=>({dpr:devicePixelRatio,inner:[innerWidth,innerHeight],fonts:[...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family+' '+f.weight+' '+f.style)}));
 const measure=async(stage,selector,uid,{reference=true}={})=>{
  const info=await page.evaluate(([sel,uid])=>{const node=[...document.querySelectorAll(sel)].find(n=>!uid||n.dataset.uid===uid);if(!node)return null;const r=node.getBoundingClientRect(),cs=getComputedStyle(node),canvas=node.querySelector('.card-art-canvas'),sample=node.querySelector('.hybrid-hand-sample,.hybrid-board-sample,.native-face-sample'),face=node.querySelector('.hybrid-card-face');
   const visible=(sample&&getComputedStyle(sample).display!=='none'&&getComputedStyle(sample).visibility!=='hidden')?sample:canvas;const vr=visible?.getBoundingClientRect();
   return {rect:{x:r.x,y:r.y,w:r.width,h:r.height},css:{w:parseFloat(cs.width),h:parseFloat(cs.height)},offset:{w:node.offsetWidth,h:node.offsetHeight},transform:cs.transform,canvas:canvas&&{w:canvas.width,h:canvas.height},sample:sample&&{w:sample.width,h:sample.height,shown:visible===sample},visible:vr&&{x:vr.x,y:vr.y,w:vr.width,h:vr.height},face:face&&{w:parseFloat(face.style.width),transform:face.style.transform.slice(0,40)}};},[selector,uid]);
  if(!info){result.stages.push({stage,missing:true});console.log('ausente',stage);return;}
  const used=await page.evaluate(([sel,uid])=>{const node=[...document.querySelectorAll(sel)].find(n=>!uid||n.dataset.uid===uid);return node?.querySelector('.card-art-canvas')?.__design||null;},[selector,uid]);
  const font=await page.evaluate(d=>{if(!d||d.combat)return {size:null,lines:null,combatFace:Boolean(d?.combat)};const c=document.createElement('canvas');c.width=900;c.height=1260;const l=RunaCardVisual.layoutRules(c.getContext('2d'),d.design);return {size:l.size,lines:l.lines.length};},used);
  const shownW=info.visible?.w||info.css.w;info.rulesFont=font.size?{master:font.size,lines:font.lines,cssPx:+(font.size*info.css.w/900).toFixed(2),devicePx:+(font.size*info.css.w/900*dpr).toFixed(2)}:{combatFace:true,note:'face de combate: ilustração sem texto de regras'};
  info.bitmapPerDevicePx=+((info.sample?.shown?info.sample.w:info.canvas?.w||0)/(info.css.w*dpr)).toFixed(2);
  // Clip and compare on the box that actually shows the face (the canvas or the hybrid sample), which may be
  // offset from the card box by sub-pixel snapping.
  const box=info.transform==='none'||info.transform==='matrix(1, 0, 0, 1, 0, 0)'?(info.visible||info.rect):info.rect;
  const clip={x:Math.floor(box.x),y:Math.floor(box.y),width:Math.ceil(box.x+box.w)-Math.floor(box.x),height:Math.ceil(box.y+box.h)-Math.floor(box.y)};
  // Cuts: is the whole face inside the viewport? (hand cards in the fan are partly below it by design)
  info.insideViewport=box.x>=-.5&&box.y>=-.5&&box.x+box.w<=width+.5&&box.y+box.h<=height+.5;
  if(!info.insideViewport){const x2=Math.min(width,clip.x+clip.width),y2=Math.min(height,clip.y+clip.height);clip.x=Math.max(0,clip.x);clip.y=Math.max(0,clip.y);clip.width=x2-clip.x;clip.height=y2-clip.y;}
  if(clip.width<=0||clip.height<=0){info.shot=null;result.stages.push({stage,...info});console.log(stage,'fora da tela');return;}
  const file=path.join(out,`${stage}.png`);const shot=await page.screenshot({path:file,clip,scale:'device',animations:'disabled'});info.shot={file:path.basename(file),clip};
  if(reference&&info.insideViewport&&['none','matrix(1, 0, 0, 1, 0, 0)'].includes(info.transform)&&used){
   // reference: drawCard at the displayed device size; compared on the rules box (card units 64..836 × 855..1127)
   const metrics=await page.evaluate(async([b64,design,css,rect,dprv,combat,flat])=>{
    const img=new Image();img.src='data:image/png;base64,'+b64;await img.decode();
    const w=Math.round(rect.w*dprv),h=Math.round(rect.h*dprv),ref=document.createElement('canvas');ref.width=w;ref.height=h;const rctx=ref.getContext('2d');rctx.imageSmoothingEnabled=true;rctx.imageSmoothingQuality='high';if(combat)await RunaCardVisual.drawCombat(ref,design,{assets:'criador/',flat});else await RunaCardVisual.drawCard(ref,design,{assets:'criador/',hideStats:true});
    const shotC=document.createElement('canvas');shotC.width=img.width;shotC.height=img.height;shotC.getContext('2d').drawImage(img,0,0);
    const box=combat?{x:Math.round(.05*w),y:Math.round(.05*h),w:Math.round(.9*w),h:Math.round(.9*h)}:{x:Math.round(64/900*w),y:Math.round(855/1260*h),w:Math.round(772/900*w),h:Math.round(272/1260*h)};
    const ox=Math.round((rect.x-Math.floor(rect.x))*dprv),oy=Math.round((rect.y-Math.floor(rect.y))*dprv);
    const lum=(ctx,x,y,bw,bh)=>{const d=ctx.getImageData(x,y,bw,bh).data,o=new Float32Array(bw*bh);for(let i=0;i<o.length;i++)o[i]=.2126*d[i*4]+.7152*d[i*4+1]+.0722*d[i*4+2];return o;};
    const ten=(L,bw,bh)=>{let s=0,n=0;for(let y=1;y<bh-1;y++)for(let x=1;x<bw-1;x++){const i=y*bw+x,gx=L[i-bw+1]+2*L[i+1]+L[i+bw+1]-L[i-bw-1]-2*L[i-1]-L[i+bw-1],gy=L[i+bw-1]+2*L[i+bw]+L[i+bw+1]-L[i-bw-1]-2*L[i-bw]-L[i-bw+1];s+=Math.hypot(gx,gy);n++;}return s/n;};
    const A=lum(shotC.getContext('2d'),box.x+ox,box.y+oy,box.w,box.h),B=lum(rctx,box.x,box.y,box.w,box.h);let mae=0;for(let i=0;i<A.length;i++)mae+=Math.abs(A[i]-B[i]);
    return {refSize:[w,h],box,tenengradShot:+ten(A,box.w,box.h).toFixed(2),tenengradRef:+ten(B,box.w,box.h).toFixed(2),maeToRef:+(mae/A.length).toFixed(2),refPng:ref.toDataURL('image/png').split(',')[1]};
   },[shot.toString('base64'),used.design,info.css,box,dpr,Boolean(used.combat),Boolean(used.flat)]).catch(e=>({error:e.message}));
   if(metrics.refPng){fs.writeFileSync(path.join(out,`${stage}-referencia.png`),Buffer.from(metrics.refPng,'base64'));delete metrics.refPng;}info.metrics=metrics;
  }
  result.stages.push({stage,...info});console.log(stage,JSON.stringify({css:info.css,canvas:info.canvas,sample:info.sample,font:info.rulesFont,bitmapPerDevicePx:info.bitmapPerDevicePx,metrics:info.metrics&&{ten:[info.metrics.tenengradShot,info.metrics.tenengradRef],mae:info.metrics.maeToRef}}));
 };
 await measure('mao-FL17','#hand>.card',fl17.uid,{reference:false});
 await measure('mao-FV16','#hand>.card',fv16.uid);
 await measure('reserva-FL17','.reserve-camp .card',board.uid);
 // hover: real hover on the hand card
 for(const [stage,c] of [['hover-FL17',fl17],['hover-FV16',fv16]]){const box=await page.evaluate(uid=>{const n=document.querySelector(`#hand>.card[data-uid="${uid}"]`);if(n.getBoundingClientRect().top>innerHeight-40)n.scrollIntoView({block:'center'});const r=n.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height*.3};},c.uid);await page.mouse.move(5,5);await page.mouse.move(box.x,box.y);const opened=await page.waitForFunction(()=>!document.getElementById('hover-preview').hidden&&document.querySelector('#hover-preview .card.big'),null,{timeout:3000}).then(()=>true,()=>false);if(!opened){result.stages.push({stage,unavailable:'hover não abre nesta largura'});console.log(stage,'hover indisponível');continue;}await page.waitForTimeout(600);await measure(stage,'#hover-preview .card.big',c.uid);}
 await page.mouse.move(5,5);await page.waitForTimeout(200);
 // detail: the same entry point as double click
 for(const [stage,c] of [['detalhe-FL17',fl17],['detalhe-FV16',fv16]]){await page.evaluate(uid=>{const c=state.players[0].hand.find(x=>x.uid===uid)||state.players.flatMap(p=>p.hand||[]).find(x=>x.uid===uid);showCard(c);},c.uid);await page.waitForTimeout(700);await measure(stage,'#detail-content .card.big',c.uid);await page.evaluate(()=>document.getElementById('card-detail').close?.());}
 await page.screenshot({path:path.join(out,'mesa.png'),scale:'device'});
}finally{await browser.close();}
fs.writeFileSync(path.join(out,'probe.json'),JSON.stringify(result,null,1));console.log('served',JSON.stringify(Object.fromEntries(Object.entries(result.served).map(([k,v])=>[k,v.slice(0,8)]))));
