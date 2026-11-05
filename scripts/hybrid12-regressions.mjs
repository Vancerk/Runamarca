// Revisão 12: regressões de comportamento da câmera de 5°, do relevo e da limpeza.
// Complementa hybrid12-camera.mjs (orientação efetiva) e hybrid12-combat-duplicates.mjs.
//  1. Parâmetro único: a sobreposição de QA só vale quando definida antes da página e
//     dentro de 0–45°; valores inválidos voltam ao parâmetro e o diagnóstico mostra a origem.
//  2. Espessura (RunaHybrid.slabs): um corpo WebGL por carta de mesa visível, sem UID
//     repetido; ocultar uma carta remove o corpo no mesmo microtask (sem esperar quadro) e
//     reexibi-la devolve o corpo; arrasto nativo idem; sem comando de jogo.
//  3. Luz e sombra: lâmpada a 27° de elevação medida da posição real, frustum ajustado
//     (texel ≤ .03), mapa 2048, sombra lateral moderada sob carta e baralho.
//  4. Estabilidade: renderizar de novo o MESMO estado não move âncoras, faces nem corpos;
//     sem rebuild ocioso.
//  5. Legibilidade: recortes com texto (ações, Registro, Emanação, reserva, símbolos) não
//     escurecem nem perdem contraste em relação ao "before" (mesmo estado, mesma DPR).
//  6. Recuperação WebGL: perda de contexto oculta a mesa e restaura o 3D na mesma
//     partida, sem expor a entrada 2D nem enviar comandos.
// Uso: HYBRID_QA_OUT=<pasta> node scripts/hybrid12-regressions.mjs
// Owner's accepted overhead baseline; config.js itself is a browser module.
const DEFAULT_TILT=0;
import fs from 'node:fs';import {harness,launch,open,paint,captureTable,view,writeJSON,finish} from './hybrid12-lib.mjs';
const out=process.env.HYBRID_QA_OUT||'prototype-qa/hybrid-12/regressions',H=harness(out),{check}=H,report={},CAPTURES='prototype-qa/hybrid-12';
const frames=(page,n=2)=>page.evaluate(n=>new Promise(r=>{const f=k=>k?requestAnimationFrame(()=>f(k-1)):r();f(n);}),n);
const browser=await launch();
try{
 // 1. Override semantics.
 // The overhead camera now has a stable vertical-pole basis; 0° is valid, and 45° is the
 // inclusive upper limit.
 for(const [value,expect,flag] of [[undefined,DEFAULT_TILT,null],[10,10,10],[-3,DEFAULT_TILT,null],[0,0,0],[45,45,45],[60,DEFAULT_TILT,null],['abc',DEFAULT_TILT,null]]){
  const {context,page}=await open(browser,{width:1440,height:900},{errors:H.errors,gpu:H.gpu,init:value===undefined?null:{fn:v=>{window.__HYBRID_TILT_DEGREES=v;},arg:value}});
  const t=captureTable();await paint(page,view(t.room,t.a),500);
  const m=await page.evaluate(()=>({cfg:RunaHybridConfig.snapshot().camera,stats:RunaHybrid.stats.cameraTiltDegrees,eye:RunaHybrid.stats.cameraEye,frozen:Object.isFrozen(RunaHybridConfig.config.camera)}));(report.override||=[]).push({value,...m});
  check(`override ${JSON.stringify(value)} → ${expect}° (qaOverride ${flag})`,m.stats===expect&&m.cfg.tiltDegrees===expect&&m.cfg.parameter===DEFAULT_TILT&&m.cfg.qaOverride===flag&&m.cfg.measuredFrom==='vertical'&&Math.abs(Math.atan2(m.eye[2],m.eye[1])*180/Math.PI-expect)<1e-9&&m.frozen,m);
  // A late assignment (after load) must not move the camera.
  if(value===undefined){await page.evaluate(()=>{window.__HYBRID_TILT_DEGREES=30;RunaHybrid.sync();});await frames(page,3);const late=await page.evaluate(()=>RunaHybrid.stats.cameraTiltDegrees);check('override assigned after load is ignored',late===DEFAULT_TILT,late);}
  await context.close();}
 // 2–4, 6 per viewport and seat.
 for(const [w,h,dpr] of [[1920,900,1],[1280,720,1],[1920,1080,2],[390,800,1]])for(const seat of ['a','b']){
  const id=`${w}x${h}-dpr${dpr}-${seat}`,{context,page}=await open(browser,{width:w,height:h},{dpr,errors:H.errors,gpu:H.gpu});let commands=0;context.on('request',r=>{if(r.method()==='POST'&&r.url().includes('/api/rooms/'))commands++;});
  const t=captureTable(),v=view(t.room,t[seat]);await paint(page,v,700);await page.mouse.move(w/2,4);await frames(page,3);const rec=report[id]={};
  // 2. One body per visible board card.
  const slabs=await page.evaluate(()=>{const cards=[...document.querySelectorAll('.reserve-camp .card-row>.card,.lane-side>.card,.combat-emanation .card')].filter(n=>{const r=n.getBoundingClientRect(),s=getComputedStyle(n);return n.dataset.uid&&r.width&&r.height&&r.bottom>=0&&r.y<=innerHeight&&s.visibility!=='hidden';}).map(n=>n.dataset.uid);return {slabs:RunaHybrid.slabs,cards};});rec.slabs={n:slabs.slabs.length,cards:slabs.cards.length};
  check(`${id}: exactly one WebGL body per visible board card`,slabs.slabs.length===new Set(slabs.slabs).size&&JSON.stringify([...slabs.slabs].sort())===JSON.stringify([...slabs.cards].sort())&&slabs.cards.length>=8,{slabs:slabs.slabs.length,unique:new Set(slabs.slabs).size,cards:slabs.cards.length});
  const flush=await page.evaluate(async()=>{const n=[...document.querySelectorAll('.lane-side>.card[data-uid]')].find(n=>getComputedStyle(n).visibility!=='hidden');if(!n)return null;const uid=n.dataset.uid,b0=RunaHybrid.stats.builds;let frame=0;const counter=requestAnimationFrame(()=>{frame=1;});
   n.style.visibility='hidden';await Promise.resolve();await Promise.resolve();const hidden=!RunaHybrid.slabs.includes(uid),b1=RunaHybrid.stats.builds,sameFrame=frame===0;
   n.style.visibility='';await Promise.resolve();await Promise.resolve();const back=RunaHybrid.slabs.includes(uid);cancelAnimationFrame(counter);return {uid,hidden,back,sameFrame,builds:b1-b0};});rec.flush=flush;
  check(`${id}: hiding a board card drops its WebGL body before the next frame; showing it restores the body`,!!flush&&flush.hidden&&flush.back&&flush.sameFrame&&flush.builds>=1,flush);
  if(w>900){const own=page.locator('.reserve-camp.self-camp .card-row>.card').first(),box=await own.boundingBox();if(box){await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2,box.y-120,{steps:6});await frames(page,2);const uid=await own.getAttribute('data-uid'),during=await page.evaluate(u=>({slab:RunaHybrid.slabs.includes(u),source:!!document.querySelector('.dragging-source')}),uid);await page.keyboard.press('Escape');await page.mouse.up();await page.waitForTimeout(400);const after=await page.evaluate(u=>({slab:RunaHybrid.slabs.includes(u),ghost:document.querySelectorAll('.drag-preview').length,menuOpened:!!document.querySelector('.room-menu-dialog')?.open}),uid);rec.drag={during,after};
   // Native behaviour (not changed here): the Escape that cancels the drag also opens the
   // room menu. Close it so the following hit-tests see the table.
   if(after.menuOpened){await page.evaluate(()=>document.querySelector('.room-menu-dialog')?.close?.());await page.waitForTimeout(150);}
   check(`${id}: a dragged board card has no WebGL body while dragged and gets it back on cancel`,(!during.source||!during.slab)&&after.slab&&after.ghost===0,{during,after});}}
  // 3. Lamp and shadow from the live renderer.
  const L=await page.evaluate(()=>{const s=RunaHybrid.stats,f=RunaHybrid.scene.field;return {lamp:s.lamp,shadow:s.shadow,field:{x:f.x,z:f.z}};});const hd=Math.hypot(L.lamp[0]-L.field.x,L.lamp[2]-L.field.z),elev=Math.atan2(L.lamp[1],hd)*180/Math.PI;rec.lamp={elevation:elev,horizontal:hd,shadow:L.shadow};
  check(`${id}: lamp elevation measured from its position ≈ 27°, 16 units away, fitted 2048 shadow map`,Math.abs(elev-27)<.05&&Math.abs(hd-16)<.05&&L.shadow.size===2048&&L.shadow.worldTexel<=.03&&L.shadow.depthRange>0,rec.lamp);
  // 4. Same state rendered again: nothing moves, no idle rebuild.
  // Faces are compared through their LOCAL matrix (face centre inside its card node):
  // the native idle sway (card-idle, ±1.75 px) moves the node and the face together, so
  // absolute quads depend on the animation phase at build time; the local placement
  // must not change. Anchors are static DOM nodes and are compared absolutely.
  const snap=()=>page.evaluate(()=>{const faces={};for(const f of document.querySelectorAll('.hybrid-card-face')){const n=f.parentElement,uid=n?.dataset.uid;if(!uid)continue;const m=(f.style.transform.match(/matrix3d\(([^)]+)\)/)||[])[1]?.split(',').map(Number);if(!m)continue;const x=parseFloat(f.style.width)/2,y=parseFloat(f.style.height)/2,w=m[3]*x+m[7]*y+m[15];faces[uid+':'+(n.closest('.reserve-camp')?'r':n.closest('.combat-emanation')?'e':'c')]=[(m[0]*x+m[4]*y+m[12])/w,(m[1]*x+m[5]*y+m[13])/w];}
   return {a:Object.fromEntries(RunaHybrid.anchors.map(a=>[a.id,[a.actual.x,a.actual.y]])),f:faces,s:[...RunaHybrid.slabs].sort()};});
  const s0=await snap();await page.evaluate(v=>{state=JSON.parse(JSON.stringify(v));render();},v);await frames(page,4);const s1=await snap();const b0=await page.evaluate(()=>RunaHybrid.stats.builds);await page.waitForTimeout(700);const b1=await page.evaluate(()=>RunaHybrid.stats.builds);
  const drift=(x,y)=>{const keys=new Set([...Object.keys(x),...Object.keys(y)]);let max=0,missing=[];for(const k of keys){if(!x[k]||!y[k]){missing.push(k);continue;}max=Math.max(max,Math.hypot(x[k][0]-y[k][0],x[k][1]-y[k][1]));}return {max,missing};},da=drift(s0.a,s1.a),df=drift(s0.f,s1.f);rec.rerender={anchors:da,faces:df,slabsSame:JSON.stringify(s0.s)===JSON.stringify(s1.s)};
  check(`${id}: re-rendering the same state moves no anchor (≤ .1 px) nor face inside its card (≤ .35 px), same bodies`,da.max<=.1&&!da.missing.length&&df.max<=.35&&!df.missing.length&&rec.rerender.slabsSame,rec.rerender);
  check(`${id}: no scene rebuild while idle`,b1-b0<=1,{b0,b1});
  // 6. Recovery keeps the current match and blocks the unavailable graphics surface.
  if(w===1920&&h===900){await page.mouse.move(4,h-4);await page.evaluate(()=>window.hideHover?.());await page.waitForTimeout(200);const before=await page.evaluate(()=>({match:state.matchId,round:state.round,cards:document.querySelectorAll('#game .card[data-uid]').length}));
   await page.evaluate(()=>document.querySelector('.hybrid-canvas').getContext('webgl').getExtension('WEBGL_lose_context').loseContext());await page.waitForFunction(()=>RunaHybrid.recovery.visible);
   const interrupted=await page.evaluate(()=>({failed:RunaHybrid.stats.failed,hidden:getComputedStyle(document.querySelector('#lanes')).visibility==='hidden',canvas:getComputedStyle(document.querySelector('.hybrid-canvas')).display,recovery:RunaHybrid.recovery.visible}));
   await page.waitForFunction(()=>RunaHybrid.ready,null,{timeout:15000});await frames(page,4);
   const restored=await page.evaluate(()=>({failed:RunaHybrid.stats.failed,recovery:RunaHybrid.recovery.visible,error:RunaHybrid.stats.webglError,active:document.body.classList.contains('hybrid-active'),faces:document.querySelectorAll('.hybrid-card-face').length,match:state.matchId,round:state.round,cards:document.querySelectorAll('#game .card[data-uid]').length,hit:[...document.querySelectorAll('.lane-side')].length===6&&[...document.querySelectorAll('.lane-side')].every(n=>{const r=n.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('.lane-side')===n;})}));rec.recovery={before,interrupted,restored};
   check(`${id}: WebGL interruption restores the same 3D match without exposing 2D`,interrupted.failed&&interrupted.hidden&&interrupted.canvas==='none'&&interrupted.recovery&&!restored.failed&&!restored.recovery&&restored.error===0&&restored.active&&restored.faces>0&&restored.match===before.match&&restored.round===before.round&&restored.cards===before.cards&&restored.hit,rec.recovery);}
  check(`${id}: presentation sends no gameplay command`,commands===0,commands);
  await context.close();}
 // 3b. Contact shadow under the near combat card and the near deck, from pixels.
 // The card now sits close to its support: sample the outer face edge, not a
 // strip 5px away. The same contrast bounds still apply; the deck is unchanged.
 {const {context,page}=await open(browser,{width:1920,height:900},{errors:H.errors,gpu:H.gpu});const t=captureTable();await paint(page,view(t.room,t.a),700);await page.mouse.move(960,4);await frames(page,3);
  const boxes=await page.evaluate(()=>{const face=RunaHybrid.faces.find(f=>f.valid&&f.role==='combat'&&f.side==='near'),deck=RunaHybrid.scene.decks.find(d=>d.id==='self-deck'),bb=q=>{const xs=q.map(p=>p.x),ys=q.map(p=>p.y);return {x0:Math.min(...xs),x1:Math.max(...xs),y0:Math.min(...ys),y1:Math.max(...ys)};};const d=deck&&bb(deck.quad);if(d)d.margin=deck.world.holderMargin*(d.x1-d.x0)/deck.world.w;return {card:face&&bb(face.quad),deck:d,decks:RunaHybrid.scene.decks.map(d=>d.id)};});
  const png=await page.screenshot();const lum=await page.evaluate(async({data,list})=>{const img=new Image();img.src=data;await img.decode();const c=new OffscreenCanvas(img.width,img.height),g=c.getContext('2d');g.drawImage(img,0,0);return list.map(b=>{const d=g.getImageData(Math.round(b.x),Math.round(b.y),Math.max(1,Math.round(b.w)),Math.max(1,Math.round(b.h))).data;let s=0;for(let k=0;k<d.length;k+=4)s+=.2126*d[k]+.7152*d[k+1]+.0722*d[k+2];return s/(d.length/4);});},{data:'data:image/png;base64,'+png.toString('base64'),list:[boxes.card&&{x:boxes.card.x0,y:boxes.card.y0+(boxes.card.y1-boxes.card.y0)*.3,w:1,h:(boxes.card.y1-boxes.card.y0)*.4},boxes.card&&{x:boxes.card.x1-1,y:boxes.card.y0+(boxes.card.y1-boxes.card.y0)*.3,w:1,h:(boxes.card.y1-boxes.card.y0)*.4},boxes.deck&&{x:boxes.deck.x0-boxes.deck.margin-6,y:boxes.deck.y0+(boxes.deck.y1-boxes.deck.y0)*.3,w:3,h:(boxes.deck.y1-boxes.deck.y0)*.4},boxes.deck&&{x:boxes.deck.x1+boxes.deck.margin+3,y:boxes.deck.y0+(boxes.deck.y1-boxes.deck.y0)*.3,w:3,h:(boxes.deck.y1-boxes.deck.y0)*.4}].filter(Boolean)});
  report.contactShadow={boxes,lum};
  check('near combat card: shadow side darker than lit side, contrast moderate (.45–.93)',lum.length>=2&&lum[0]/lum[1]>.45&&lum[0]/lum[1]<.93,{left:lum[0],right:lum[1]});
  // Deck: table wood just outside the holder; the lamp is at the upper right, so the
  // holder and stack shade the left strip.
  check('near deck: holder/stack shadow on the table, left (shadow side) darker than right, moderate',lum.length===4&&lum[2]/lum[3]<.93&&lum[2]/lum[3]>.3,{left:lum[2],right:lum[3]});
  await context.close();}
 // 5. Legibility of text-bearing crops, after vs before (same state, same DPR).
 {const names=['actions','log','emana','reserve','symbols','combat'],sizes=['1920x900','1920x1080','1440x900','1280x720','1920x900-dpr2','1920x1080-dpr2'],pairs=[];
  for(const n of names)for(const s of sizes){const b=`${CAPTURES}/before-crop-${n}-${s}.png`,a=`${CAPTURES}/after-crop-${n}-${s}.png`;pairs.push({n,s,b,a,ok:fs.existsSync(b)&&fs.existsSync(a)});}
  const missing=pairs.filter(p=>!p.ok);check('before/after legibility crops exist for every region and size',missing.length===0,missing.map(p=>p.n+'-'+p.s));
  const {context,page}=await open(browser,{width:400,height:300},{errors:H.errors,gpu:H.gpu});
  const stats=[];for(const p of pairs.filter(p=>p.ok)){const r=await page.evaluate(async list=>Promise.all(list.map(async data=>{const img=new Image();img.src=data;await img.decode();const c=new OffscreenCanvas(img.width,img.height),g=c.getContext('2d');g.drawImage(img,0,0);const d=g.getImageData(0,0,img.width,img.height).data;let s=0,q=0;const n=d.length/4;for(let k=0;k<d.length;k+=4){const y=.2126*d[k]+.7152*d[k+1]+.0722*d[k+2];s+=y;q+=y*y;}const m=s/n;return {mean:m,contrast:Math.sqrt(Math.max(0,q/n-m*m))};})),[p.b,p.a].map(f=>'data:image/png;base64,'+fs.readFileSync(f).toString('base64')));stats.push({region:p.n,size:p.s,before:r[0],after:r[1],meanRatio:r[1].mean/r[0].mean,contrastRatio:r[1].contrast/r[0].contrast});}
  report.legibility=stats;await context.close();
  const dark=stats.filter(x=>x.meanRatio<.85||x.contrastRatio<.85);
  check('text-bearing crops keep ≥ 85% of their before luminance and contrast',stats.length===pairs.length&&dark.length===0,dark.map(x=>({region:x.region,size:x.size,mean:+x.meanRatio.toFixed(3),contrast:+x.contrastRatio.toFixed(3)})));}
 check('no runtime errors',H.errors.length===0,H.errors);check('no WebGL errors',H.gpu.length===0,H.gpu);
}finally{writeJSON(`${out}/regressions-detail.json`,report);finish(out,'regressions',H);await browser.close();}
