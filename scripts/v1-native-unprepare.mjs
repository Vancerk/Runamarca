// V1 · native display sample on a card created off-DOM, in a flight that grows: taking back a prepared spell
// (unprepare) builds its flight copy with cardEl() before the server answers (face ready while detached), and
// animateTransfer magnifies it by transform (≈30 → 119 px). The real command() runs with `api` answering after
// 500 ms. Every animation frame records the flying copy: the face must be visible from the first connected frame,
// a growing flight shows the 900 px master, and the card lands in the hand with its painted sample; the copy's
// ResizeObservers are released afterwards. At the point of largest magnification the flight is paused, captured
// at its real size and compared with drawCard drawn directly at that size (Tenengrad, mean absolute difference).
// Usage: node scripts/v1-native-unprepare.mjs <out.json>   (V1_OVERRIDE_FILE serves an earlier app.js/css for A/B)
import fs from 'node:fs';import {createRequire} from 'node:module';
import {setup,card,view} from '../mesa-nova/r1-fixtures.mjs';
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/vanxf/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const [out]=process.argv.slice(2),base=process.env.QA_BASE||'http://127.0.0.1:3086';
const results=[],check=(name,ok,detail)=>{results.push({name,ok:Boolean(ok),detail});console.log((ok?'PASS ':'FAIL ')+name,JSON.stringify(detail??'').slice(0,600));};
const {room,a,b}=setup();Object.assign(room,{phase:'prep',turn:a.id});const fv16=card('FV16',a);a.hand=[card('FL17',a),card('FV03',a)];a.prepared=[{card:fv16,lane:0,targetSide:b.id}];
const before=view(room,a);a.prepared=[];a.hand.push(fv16);room.revision=(room.revision||0)+1;const after=view(room,a);
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
let peak=null,frames=[];
try{const context=await browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:1});const allowed=new Set(['127.0.0.1','fonts.googleapis.com','fonts.gstatic.com']);await context.route('**/*',r=>allowed.has(new URL(r.request().url()).hostname)?r.continue():r.abort());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const [p,file] of Object.entries(process.env.V1_OVERRIDE_FILE?JSON.parse(fs.readFileSync(process.env.V1_OVERRIDE_FILE,'utf8')):{})){const body=fs.readFileSync(file);await page.route('**'+p+'*',r=>r.fulfill({status:200,headers:{'cache-control':'no-store','content-type':p.endsWith('.css')?'text/css; charset=utf-8':'text/javascript; charset=utf-8'},body}));}
 await page.goto(base+'/runamarca/');await page.waitForFunction(()=>typeof render==='function');await page.evaluate(()=>document.fonts.ready);
 await page.evaluate(s=>{state=s;render();},before);await page.waitForTimeout(1200);
 // start the real command; the frame recorder runs in the page
 await page.evaluate(([uid,next])=>{
  const Native=window.ResizeObserver;window.__ros=[];window.ResizeObserver=class extends Native{constructor(cb){super(cb);this.targets=new Set();this.seen=new Set();window.__ros.push(this);}observe(t,o){this.targets.add(t);this.seen.add(t);return super.observe(t,o);}disconnect(){this.targets.clear();return super.disconnect();}};
  const original=window.paintCardFace;window.__ready=[];window.paintCardFace=function(canvas,...rest){const p=original.call(this,canvas,...rest);p.then(()=>window.__ready.push({t:performance.now(),connected:canvas.isConnected,w:canvas.width}));return p;};
  window.__t0=performance.now();window.__api={};window.api=async()=>{window.__api.at=performance.now();await new Promise(r=>setTimeout(r,500));window.__api.answered=performance.now();return next;};
  const ink=c=>{if(!c||c.width<2)return false;const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4*53)n+=d[i]>0;return n>20;};
  window.__frames=[];window.__stop=false;
  const tick=()=>{if(window.__stop)return;const copy=[...document.querySelectorAll(`#visual-layer [data-uid="${uid}"]`)].find(n=>n.querySelector?.('.card-art-canvas'));
   if(copy){window.__copy??=copy;const m=copy.querySelector('.card-art-canvas'),s=copy.querySelector('.native-face-sample'),r=copy.getBoundingClientRect(),cs=getComputedStyle(copy.parentElement);
    const masterShown=getComputedStyle(m).visibility==='visible'&&+cs.opacity>0,sampleShown=Boolean(s)&&getComputedStyle(s).visibility==='visible'&&+cs.opacity>0,mi=ink(m),si=ink(s);
    window.__frames.push({t:Math.round(performance.now()-window.__t0),w:+r.width.toFixed(1),grows:copy.parentElement.classList.contains('flight-grows'),sampled:copy.classList.contains('native-sampled'),masterShown,masterInk:mi,sampleShown,sampleInk:si,sampleSize:s&&[s.width,s.height],faceVisible:(masterShown&&mi)||(sampleShown&&si),shownFace:masterShown&&mi?'mestre':sampleShown&&si?'amostra':'nenhuma'});}
   requestAnimationFrame(tick);};requestAnimationFrame(tick);
  window.__run=command({type:'unprepare',cardId:uid});},[fv16.uid,after]);
 // pause at the largest magnification (end of the transform) and capture the copy at its real size
 await page.waitForFunction(()=>window.__copy?.isConnected&&window.__copy.parentElement.getAnimations().length>0,null,{timeout:5000});
 const paused=await page.evaluate(()=>{const anims=window.__copy.parentElement.getAnimations();for(const an of anims){an.pause();const end=an.effect.getComputedTiming().endTime;an.currentTime=end-1;}const r=window.__copy.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,anims:anims.length};});
 await page.waitForTimeout(250);
 const clip={x:Math.floor(paused.x),y:Math.floor(paused.y),width:Math.ceil(paused.x+paused.w)-Math.floor(paused.x),height:Math.ceil(paused.y+paused.h)-Math.floor(paused.y)};
 const shot=await page.screenshot({clip,scale:'device'});fs.writeFileSync(out.replace(/\.json$/,'-pico.png'),shot);
 peak=await page.evaluate(async([b64,rect])=>{const copy=window.__copy,m=copy.querySelector('.card-art-canvas'),s=copy.querySelector('.native-face-sample');
  const img=new Image();img.src='data:image/png;base64,'+b64;await img.decode();const w=Math.round(rect.w),h=Math.round(rect.h),ref=document.createElement('canvas');ref.width=w;ref.height=h;ref.getContext('2d').imageSmoothingQuality='high';
  // reference: the same card drawn at the displayed size (design rebuilt as cardEl does for a spell)
  const c=state.players[0].hand.find(x=>x.uid===copy.dataset.uid)||{};await RunaCardVisual.drawCard(ref,{name:c.name,rarity:c.rarity,kind:'spell',rules:c.text,highlightKeywords:c.highlightKeywords,spellModesLabel:RunaCardVisual.spellModesLabel(c),subtype:c.subtype||'',themeEnergy:['ruptura','forja','fluxo'].includes(c.affinity)?c.affinity:'fluxo',art:c.image,artFit:c.artFit,artZoom:c.artZoom||100,artX:c.artX??50,artY:c.artY??0,fontName:c.fontName,fontSubtype:c.fontSubtype,fontRules:c.fontRules,autoFitRules:true,generic:c.cost},{assets:'criador/',hideStats:true});
  const shotC=document.createElement('canvas');shotC.width=img.width;shotC.height=img.height;shotC.getContext('2d').drawImage(img,0,0);const ox=Math.round(rect.x-Math.floor(rect.x)),oy=Math.round(rect.y-Math.floor(rect.y));
  const box={x:Math.round(64/900*w),y:Math.round(855/1260*h),w:Math.round(772/900*w),h:Math.round(272/1260*h)};
  const lum=(ctx,x,y,bw,bh)=>{const d=ctx.getImageData(x,y,bw,bh).data,o=new Float32Array(bw*bh);for(let i=0;i<o.length;i++)o[i]=.2126*d[i*4]+.7152*d[i*4+1]+.0722*d[i*4+2];return o;};
  const ten=(L,bw,bh)=>{let t=0,n=0;for(let y=1;y<bh-1;y++)for(let x=1;x<bw-1;x++){const i=y*bw+x,gx=L[i-bw+1]+2*L[i+1]+L[i+bw+1]-L[i-bw-1]-2*L[i-1]-L[i+bw-1],gy=L[i+bw-1]+2*L[i+bw]+L[i+bw+1]-L[i-bw-1]-2*L[i-bw]-L[i-bw+1];t+=Math.hypot(gx,gy);n++;}return t/n;};
  const A=lum(shotC.getContext('2d'),box.x+ox,box.y+oy,box.w,box.h),B=lum(ref.getContext('2d'),box.x,box.y,box.w,box.h);let mae=0;for(let i=0;i<A.length;i++)mae+=Math.abs(A[i]-B[i]);
  const shown=getComputedStyle(m).visibility==='visible'?'mestre':s&&getComputedStyle(s).visibility==='visible'?'amostra':'nenhuma';
  return {displayed:[+rect.w.toFixed(1),+rect.h.toFixed(1)],layout:[m.clientWidth,m.clientHeight],shownFace:shown,master:[m.width,m.height],sample:s&&[s.width,s.height],tenengradShot:+ten(A,box.w,box.h).toFixed(2),tenengradRef:+ten(B,box.w,box.h).toFixed(2),maeToRef:+(mae/A.length).toFixed(2),refPng:ref.toDataURL('image/png').split(',')[1]};},[shot.toString('base64'),paused]);
 fs.writeFileSync(out.replace(/\.json$/,'-pico-referencia.png'),Buffer.from(peak.refPng,'base64'));delete peak.refPng;console.log('pico',JSON.stringify(peak));
 // resume and finish
 const res=await page.evaluate(async uid=>{for(const an of window.__copy.parentElement?.getAnimations?.()||[])an.play();await window.__run;await new Promise(r=>setTimeout(r,1500));window.__stop=true;
  const ink=c=>{if(!c||c.width<2)return false;const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4*53)n+=d[i]>0;return n>20;};
  const copy=window.__copy,handCard=document.querySelector(`#hand>.card[data-uid="${uid}"]`),hs=handCard?.querySelector('.native-face-sample');
  const copyRos=window.__ros.filter(o=>copy&&[...o.seen].includes(copy.querySelector('.card-art-canvas'))),active=window.__ros.filter(o=>o.targets.size&&[...o.targets].some(t=>!t.isConnected));const t0=window.__t0;
  return {api:{at:Math.round(window.__api.at-t0),answered:Math.round(window.__api.answered-t0)},readyOffDom:window.__ready.filter(x=>!x.connected).map(x=>({t:Math.round(x.t-t0),w:x.w})),frames:window.__frames,copyConnectedNow:copy?.isConnected,
   hand:handCard&&{sampled:handCard.classList.contains('native-sampled'),sample:hs&&[hs.width,hs.height],sampleInk:ink(hs),masterHidden:getComputedStyle(handCard.querySelector('.card-art-canvas')).visibility==='hidden',visibility:getComputedStyle(handCard).visibility},
   copyObservers:{count:copyRos.length,stillObserving:copyRos.filter(o=>o.targets.size).length},observersOnDetachedNodes:active.length};},fv16.uid);
 frames=res.frames;const visible=frames.filter(f=>f.w>0);
 check('a face da cópia fica pronta fora do DOM antes da resposta do servidor',res.readyOffDom.some(x=>x.t<res.api.answered),{readyOffDom:res.readyOffDom,api:res.api});
 check('o voo do unprepare cresce e aparece: há quadros da cópia conectada',visible.length>=3&&Math.max(...visible.map(f=>f.w))>visible[0].w*1.5,{frames:visible.length,firstW:visible[0]?.w,maxW:Math.max(...visible.map(f=>f.w))});
 check('a face está visível desde o primeiro quadro conectado do voo até o último',visible.length>0&&visible.every(f=>f.faceVisible),{firstInvisible:visible.find(f=>!f.faceVisible)||null,first:visible[0]});
 check('voo que cresce: marcado e mostrando o mestre de 900 px em todos os quadros (sem amostra ampliada)',visible.length>0&&visible.every(f=>f.grows&&f.shownFace==='mestre'),{faces:[...new Set(visible.map(f=>f.shownFace))],grows:visible.every(f=>f.grows),first:visible[0]});
 check('no ponto de maior ampliação a face mostrada é o mestre',peak.shownFace==='mestre',peak);
 check('a carta chega à mão com a amostra nítida pintada e visível',res.hand&&res.hand.sampled&&res.hand.sampleInk&&res.hand.masterHidden&&res.hand.visibility!=='hidden',res.hand);
 check('os observadores da cópia são liberados ao fim do voo',res.copyConnectedNow===false&&res.copyObservers.stillObserving===0&&res.observersOnDetachedNodes===0,{copyConnectedNow:res.copyConnectedNow,...res.copyObservers,observersOnDetachedNodes:res.observersOnDetachedNodes});
 check('sem erros de página',errors.length===0,{errors:errors.slice(0,5)});
 await page.screenshot({path:out.replace(/\.json$/,'-final.png'),scale:'device'});
}finally{await browser.close();}
fs.writeFileSync(out,JSON.stringify({results,peak,frames},null,1));const passed=results.filter(r=>r.ok).length;console.log(JSON.stringify({passed,total:results.length}));process.exitCode=passed===results.length?0:1;
