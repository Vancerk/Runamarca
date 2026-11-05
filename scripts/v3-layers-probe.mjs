// V3 (itens 15–16) · isolamento de camadas da mesa híbrida em Full HD, mesma cena, câmera e luz.
// Scene: captureTable with two own combat positions occupied (1 and 2, side by side with the Emanation socket between
// them) and the rest as in the A/B captures. Layers, each a full screenshot plus the crop of the two cards at 1:1:
//   full       — as played;
//   no-face    — DOM card faces hidden (WebGL only under them: card body, its shadow, socket);
//   no-card    — the occupied cards hidden (no face, no WebGL body, no cast shadow: socket only);
//   no-canvas  — WebGL canvas hidden (DOM only: faces, labels, CSS shadows);
//   no-css-fx  — DOM faces without CSS box-shadow/filter/outline (what the DOM itself draws around the card).
// It also records each card's face quad, its WebGL body footprint (RunaHybrid.faces), the lamp position and the
// candle prop, so the shadow direction can be compared with the light. V2_SOURCE/V2_SNAP serve a "before" copy.
// Usage: node scripts/v3-layers-probe.mjs <out-dir>
import fs from 'node:fs';import path from 'node:path';
import {chromium,CHROME,captureTable,card,view} from './hybrid12-lib.mjs';
const out=process.argv[2]||'prototype-qa/revisao-visual-20261103/v3/camadas',base=process.env.QA_BASE||'http://127.0.0.1:3086',SOURCE=process.env.V2_SOURCE||'current',SNAP=process.env.V2_SNAP||'';
const TYPES={'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json'};
fs.mkdirSync(out,{recursive:true});
const {room,a}=captureTable();const fl17=card('FL17',a),fv16=card('FV16',a);a.hand.splice(1,2,fl17,fv16);a.formation=[null,a.reserve[0].uid,a.reserve[2].uid];
const state=view(room,a);
const browser=await chromium.launch({executablePath:process.env.QA_BROWSER||CHROME,headless:true});
const ctx=await browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:1,reducedMotion:'reduce'});let served=0;
await ctx.route('**/*',r=>{const u=new URL(r.request().url());if(!['127.0.0.1','fonts.googleapis.com','fonts.gstatic.com'].includes(u.hostname))return r.abort();
 if(SOURCE==='initial'&&u.pathname.startsWith('/runamarca/')){const rel=u.pathname.slice('/runamarca/'.length)||'index.html',file=path.join(SNAP,rel);if(fs.existsSync(file)&&fs.statSync(file).isFile()){served++;return r.fulfill({status:200,headers:{'content-type':TYPES[path.extname(rel)]||'application/octet-stream','cache-control':'no-store'},body:fs.readFileSync(file)});}}
 return r.continue();});
const page=await ctx.newPage(),errors=[];if(process.env.BODY_INSET)await page.addInitScript(v=>{window.__HYBRID_QA_BODY_INSET=v;},Number(process.env.BODY_INSET));page.on('pageerror',e=>errors.push(e.message));
await page.goto(base+'/runamarca/hybrid/index.html');await page.waitForFunction(()=>typeof render==='function');await page.evaluate(()=>document.fonts.ready);
await page.evaluate(s=>{state=s;serverClockOffset=Date.now()-s.serverNow;render();},{...state,serverNow:Date.now()});await page.waitForFunction(()=>window.RunaHybrid?.ready);
await page.evaluate(()=>Promise.all([...document.querySelectorAll('#game .card')].map(n=>n.visualReady)));await page.waitForTimeout(1500);
const info=await page.evaluate(()=>{const cards=[...document.querySelectorAll('#lanes .lane-side .card')].map(n=>{const r=n.getBoundingClientRect(),f=n.querySelector('.hybrid-card-face')?.getBoundingClientRect(),side=n.closest('.lane-side');return {uid:n.dataset.uid,lane:+side.dataset.lane,own:side.dataset.owner===state.you,node:{x:r.x,y:r.y,w:r.width,h:r.height},face:f&&{x:f.x,y:f.y,w:f.width,h:f.height},css:{boxShadow:getComputedStyle(n).boxShadow.slice(0,120),filter:getComputedStyle(n).filter}};});
 const faces=window.RunaHybrid.faces.filter(f=>f.role==='combat').map(f=>({side:f.side,quad:f.quad,physicalSize:f.physicalSize}));
 return {cards,faces,lamp:RunaHybrid.stats.lamp,shadow:RunaHybrid.stats.shadow,props:RunaHybrid.scene.props,camera:RunaHybrid.stats.cameraTiltDegrees,slabs:RunaHybrid.slabs};});
const own=info.cards.filter(c=>c.own).sort((p,q)=>p.lane-q.lane),box={x:Math.floor(Math.min(...own.map(c=>c.node.x))-70),y:Math.floor(Math.min(...own.map(c=>c.node.y))-40)};box.w=Math.ceil(Math.max(...own.map(c=>c.node.x+c.node.w))+70-box.x);box.h=Math.ceil(Math.max(...own.map(c=>c.node.y+c.node.h))+50-box.y);info.crop=box;
const layers={full:'',
 'no-face':'#lanes .lane-side .card .hybrid-card-face{visibility:hidden!important}',
 'no-card':'#lanes .lane-side .card{visibility:hidden!important}',
 'no-canvas':'.hybrid-canvas{visibility:hidden!important}',
 'no-css-fx':'#lanes .lane-side .card,#lanes .lane-side .card *{box-shadow:none!important;filter:none!important;outline:none!important}'};
for(const [name,css] of Object.entries(layers)){const id=await page.evaluate(css=>{document.getElementById('qa-layer')?.remove();if(css){const s=document.createElement('style');s.id='qa-layer';s.textContent=css;document.head.append(s);}window.RunaHybrid.sync();return 1;},css);
 await page.waitForTimeout(700);await page.screenshot({path:path.join(out,`${name}.png`)});await page.screenshot({path:path.join(out,`${name}-recorte.png`),clip:{x:box.x,y:box.y,width:box.w,height:box.h}});}
await page.evaluate(()=>{document.getElementById('qa-layer')?.remove();RunaHybrid.sync();});
fs.writeFileSync(path.join(out,'camadas.json'),JSON.stringify({source:SOURCE,served,errors,...info},null,1));console.log(JSON.stringify({crop:box,cards:info.cards.map(c=>[c.lane,c.own,Math.round(c.node.w),Math.round(c.node.h),c.css.boxShadow]),lamp:info.lamp,props:info.props,errors:errors.length}));
await browser.close();
