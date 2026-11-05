// Bloco A (adendo de formação) · letreiro "Emanação" da casa, medido no que é desenhado na tela.
// Same table as v2-layout-probe (captureTable + FL17/FV16). Per viewport and per label it records the CSS box and
// font, the projection scale (screen px per CSS px, both axes), and analyses the final screenshot: ink rows of the
// lettering (full height with tilde/cedilla, and the letter body without the thin marks), ink columns, contrast.
// Saves the 1:1 crop of each label and the whole table.
// V2_SOURCE=initial + V2_SNAP=<snapshot>/mesa-nova serves the "before" copy to the test browser only.
// Usage: node scripts/a-label-probe.mjs <out-dir> [viewport ...]   viewport = WxH[@dpr]
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import {chromium,CHROME,captureTable,card,view} from './hybrid12-lib.mjs';
const [out='prototype-qa/revisao-visual-20261103/formacao-A/letreiro',...vps]=process.argv.slice(2),base=process.env.QA_BASE||'http://127.0.0.1:3086',SOURCE=process.env.V2_SOURCE||'current';
const SNAP=process.env.V2_SNAP||'prototype-qa/revisao-visual-20261103/formacao-A/v2-snapshot/mesa-nova',TYPES={'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json'};
const viewports=(vps.length?vps:['1920x1080']).map(v=>{const [wh,d]=v.split('@'),[w,h]=wh.split('x').map(Number);return {width:w,height:h,dpr:Number(d||1)};});
fs.mkdirSync(out,{recursive:true});
const {room,a}=captureTable();const fl17=card('FL17',a),fv16=card('FV16',a);a.hand.splice(1,2,fl17,fv16);const fl17board=card('FL17',a);a.reserve.unshift(fl17board);a.formation[1]=fl17board.uid;
const state=view(room,a),report={source:SOURCE,snapshot:SOURCE==='initial'?SNAP:null,date:new Date().toISOString(),viewports:[]};
for(const vp of viewports){const browser=await chromium.launch({executablePath:process.env.QA_BROWSER||CHROME,headless:true});try{
 const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},deviceScaleFactor:vp.dpr,reducedMotion:'reduce'});let served=0;
 const allowed=new Set(['127.0.0.1','fonts.googleapis.com','fonts.gstatic.com']);
 await context.route('**/*',r=>{const u=new URL(r.request().url());if(!allowed.has(u.hostname))return r.abort();
  if(SOURCE==='initial'&&u.hostname==='127.0.0.1'&&u.pathname.startsWith('/runamarca/')){const rel=u.pathname.slice('/runamarca/'.length)||'index.html',file=path.join(SNAP,rel);if(fs.existsSync(file)&&fs.statSync(file).isFile()){served++;return r.fulfill({status:200,headers:{'content-type':TYPES[path.extname(rel)]||'application/octet-stream','cache-control':'no-store'},body:fs.readFileSync(file)});}}
  return r.continue();});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/runamarca/hybrid/index.html');await page.waitForFunction(()=>typeof render==='function');await page.evaluate(()=>document.fonts.ready);
 await page.evaluate(s=>{state=s;serverClockOffset=Date.now()-s.serverNow;render();},state);await page.waitForFunction(()=>window.RunaHybrid?.ready);
 await page.evaluate(()=>Promise.all([...document.querySelectorAll('#game .card')].map(n=>n.visualReady)));await page.waitForTimeout(1200);
 const tag=`${vp.width}x${vp.height}${vp.dpr!==1?'@'+vp.dpr:''}`;
 const measure=()=>page.evaluate(()=>[...document.querySelectorAll('#game .board .emanation-column>span')].map((n,i)=>{const r=n.getBoundingClientRect(),cs=getComputedStyle(n),col=n.parentElement.getBoundingClientRect();
  // projection scale: map the CSS box corners through the computed transform (DOMMatrix handles matrix3d)
  const m=new DOMMatrix(cs.transform==='none'?undefined:cs.transform),w=n.offsetWidth,h=n.offsetHeight,P=(x,y)=>{const p=m.transformPoint(new DOMPoint(x,y,0,1));return {x:p.x/p.w,y:p.y/p.w};};
  const tl=P(0,0),tr=P(w,0),bl=P(0,h),br=P(w,h),zoomUp=(()=>{let k=1,e=n.parentElement;while(e){const z=parseFloat(getComputedStyle(e).zoom);if(z&&z!==1)k*=z;e=e.parentElement;}return k;})();
  const sx=(Math.hypot(tr.x-tl.x,tr.y-tl.y)+Math.hypot(br.x-bl.x,br.y-bl.y))/2/w*zoomUp,sy=(Math.hypot(bl.x-tl.x,bl.y-tl.y)+Math.hypot(br.x-tr.x,br.y-tr.y))/2/h*zoomUp;
  return {i,text:n.textContent,rect:{x:r.x,y:r.y,w:r.width,h:r.height},column:{x:col.x,y:col.y,w:col.width,h:col.height},css:{w,h,font:cs.font,fontSize:parseFloat(cs.fontSize),letterSpacing:cs.letterSpacing,color:cs.color,background:cs.backgroundImage!=='none'?cs.backgroundImage.slice(0,80):cs.backgroundColor,textShadow:cs.textShadow,transform:cs.transform.slice(0,40)},ancestorZoom:zoomUp,scaleX:+sx.toFixed(3),scaleY:+sy.toFixed(3),fontOnScreenNominal:+(parseFloat(cs.fontSize)*sy).toFixed(2)};}));
 const shot0=await page.screenshot({scale:'device'});fs.writeFileSync(path.join(out,`mesa-${tag}.png`),shot0);const top=await measure();
 // ink analysis on the final pixels (device pixels; reported back in CSS px of the viewport)
 const analyse=(shot,labels)=>page.evaluate(async([b64,labels,dpr])=>{const im=new Image();im.src='data:image/png;base64,'+b64;await im.decode();const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(im,0,0);
  return labels.map(l=>{const pad=2,x0=Math.max(0,Math.floor((l.rect.x-pad)*dpr)),y0=Math.max(0,Math.floor((l.rect.y-pad)*dpr)),w=Math.min(c.width-x0,Math.ceil((l.rect.w+2*pad)*dpr)),h=Math.min(c.height-y0,Math.ceil((l.rect.h+2*pad)*dpr));
   const d=g.getImageData(x0,y0,w,h).data,L=new Float32Array(w*h);for(let k=0;k<w*h;k++)L[k]=.2126*d[k*4]+.7152*d[k*4+1]+.0722*d[k*4+2];
   // background: median luminance of the inner box; ink: pixels well above it (light lettering on a dark plate)
   const inner=[];{const ins=Math.ceil((pad+2.5)*dpr);for(let y=ins;y<h-ins;y++)for(let x=ins;x<w-ins;x++)inner.push(L[y*w+x]);}const sorted=inner.sort((p,q)=>p-q),bg=sorted[Math.floor(sorted.length*.5)],hi=sorted[Math.floor(sorted.length*.995)],th=bg+.45*(hi-bg);
   // the plate's own border (1 CSS px × zoom) is not lettering: only the inside of the plate is analysed
   const ins=Math.ceil((pad+2.5)*dpr),rows=new Array(h).fill(0),cols=new Array(w).fill(0);let inkN=0,inkSum=0;for(let y=ins;y<h-ins;y++)for(let x=ins;x<w-ins;x++){if(L[y*w+x]>th){rows[y]++;cols[x]++;inkN++;inkSum+=L[y*w+x];}}
   const maxRow=Math.max(...rows),band=(arr,min)=>{let a=-1,b=-1;arr.forEach((v,i)=>{if(v>=min){if(a<0)a=i;b=i;}});return a<0?null:{from:a,to:b,px:b-a+1};};
   // full = every ink row (tilde, cedilla included); body = rows holding at least 30% of the densest row (letter bodies, no thin marks)
   const full=band(rows,1),body=band(rows,Math.max(1,maxRow*.3)),across=band(cols,1);
   // first glyph (capital E): the first run of ink columns; its ink rows give the cap height on screen
   let c0=cols.findIndex(v=>v>0),c1=c0;while(c1>=0&&c1+1<w&&cols[c1+1]>0)c1++;let capH=null;if(c0>=0){let t=-1,bt=-1;for(let y=ins;y<h-ins;y++)for(let x=c0;x<=c1;x++)if(L[y*w+x]>th){if(t<0)t=y;bt=y;}capH=t<0?null:+((bt-t+1)/dpr).toFixed(2);}
   return {crop:{x:x0,y:y0,w,h},bgLum:+bg.toFixed(1),inkLum:+(inkN?inkSum/inkN:0).toFixed(1),contrast:+((inkN?inkSum/inkN:0)-bg).toFixed(1),inkPixels:inkN,
    fullHeightPx:full&&+(full.px/dpr).toFixed(2),capHeightPx:capH,bodyHeightPx:body&&+(body.px/dpr).toFixed(2),inkWidthPx:across&&+(across.px/dpr).toFixed(2),rowProfile:rows};});},[shot.toString('base64'),labels,vp.dpr]);
 // phones scroll the table: each label is brought to the middle of the screen before its pixels are read
 const labels=[];for(let k=0;k<top.length;k++){await page.evaluate(k=>document.querySelectorAll('#game .board .emanation-column>span')[k].scrollIntoView({block:'center',inline:'nearest'}),k);await page.waitForTimeout(400);const l=(await measure())[k],shot=await page.screenshot({scale:'device'});[l.ink]=await analyse(shot,[l]);const c=l.ink.crop;await page.screenshot({path:path.join(out,`letreiro-${l.i+1}-${tag}.png`),clip:{x:c.x/vp.dpr,y:c.y/vp.dpr,width:c.w/vp.dpr,height:c.h/vp.dpr},scale:'device'});labels.push(l);}
 await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(300);
 const emanaFaces=await page.evaluate(()=>[...document.querySelectorAll('.combat-emanation .card')].map(c=>{const f=c.querySelector('.hybrid-emana-face')||c,r=f.getBoundingClientRect();return {uid:c.dataset.uid,x:r.x,y:r.y,w:r.width,h:r.height};}));
 const hits=[];for(const l of top)for(const f of emanaFaces){const ox=Math.min(l.rect.x+l.rect.w,f.x+f.w)-Math.max(l.rect.x,f.x),oy=Math.min(l.rect.y+l.rect.h,f.y+f.h)-Math.max(l.rect.y,f.y);if(ox>.5&&oy>.5)hits.push({label:l.i,uid:f.uid,area:+(ox*oy).toFixed(1)});}
 report.viewports.push({viewport:tag,served,errors,labels,labelOverFaces:hits});
 console.log(tag,JSON.stringify(labels.map(l=>({i:l.i,cssFont:l.css.fontSize,css:[l.css.w,l.css.h],screen:[+l.rect.w.toFixed(1),+l.rect.h.toFixed(1)],scale:[l.scaleX,l.scaleY],nominal:l.fontOnScreenNominal,full:l.ink.fullHeightPx,cap:l.ink.capHeightPx,body:l.ink.bodyHeightPx,inkW:l.ink.inkWidthPx,contrast:l.ink.contrast}))),'hits',hits.length,'errors',errors.length,'served',served);
 await context.close();}finally{await browser.close();}}
fs.writeFileSync(path.join(out,'probe.json'),JSON.stringify(report,null,1));
