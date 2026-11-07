// Revisão 12: duplicação visual em ataques, especialmente com Provocar.
// Combate real do motor (resolveCombat via r1-fixtures), sem injeção no servidor.
// Cenários: Golias (FL09, taunt maxAdditional:2) no centro provocando as duas casas
// adjacentes; Golias atacando; João Bobão (FL16) provocando; controle sem Provocar.
// Cada quadro (rAF) registra, por UID rastreado, as representações completas
// visíveis: nó original no #game, cópias no #visual-layer e faces de movimento
// híbridas; e, ao final, sobras (clones, máscaras, locks, cartas ocultas).
// Uma cópia é o nó mais externo com aquele data-uid no #visual-layer: o voo nativo
// (.visual-card.card-flight) carrega dentro de si a face .card.flight-face com o mesmo
// UID e o mesmo retângulo — é uma representação, não duas (igual na rota nativa).
// Os mesmos cenários rodam antes na rota nativa (1920×900, dois assentos) como
// referência: a checagem "introduzida pela híbrida" só aceita padrões que a rota nativa
// também mostra; a checagem absoluta "sem duplicata" continua valendo e falha se o
// defeito existir, mesmo herdado.
// Uso: HYBRID_QA_OUT=<pasta> node scripts/hybrid12-combat-duplicates.mjs
import {harness,launch,open,paint,poll,setup,card,view,writeJSON,finish,URL_NATIVE,URL_HYBRID} from './hybrid12-lib.mjs';import {act,catalog} from '../mesa-nova/r1-fixtures.mjs';
const out=process.env.HYBRID_QA_OUT||'prototype-qa/hybrid-12/combat',H=harness(out),{check}=H,report={scenarios:[]};
function scenario(kind){
 const {room,a,b}=setup();for(const p of [a,b]){p.hand=[card('FV03',p)];p.patron.hp=60;}
 const golias=card('FL09',a),bobo=card('FL16',a);
 if(kind==='golias-taunt'){a.reserve=[card('FV03',a),golias,card('FV03',a)];a.formation=[a.reserve[0].uid,golias.uid,a.reserve[2].uid];a.taunts={[golias.uid]:[0,2]};b.reserve=[card('FL09',b),card('FL11',b),card('FL09',b)];b.formation=b.reserve.map(c=>c.uid);}
 if(kind==='golias-attacks'){a.reserve=[golias];a.formation=[null,golias.uid,null];b.reserve=[card('FL16',b),card('FL11',b),card('FV03',b)];b.formation=b.reserve.map(c=>c.uid);}
 if(kind==='bobo-taunt'){a.reserve=[card('FL11',a),bobo,card('FL11',a)];a.formation=[a.reserve[0].uid,bobo.uid,a.reserve[2].uid];a.taunts={[bobo.uid]:[0,2]};b.reserve=[card('FL11',b),card('FL11',b),card('FL11',b)];b.formation=b.reserve.map(c=>c.uid);}
 if(kind==='control'){a.reserve=[card('FL11',a),card('FL11',a),card('FL11',a)];a.formation=a.reserve.map(c=>c.uid);b.reserve=[card('FL11',b),card('FL11',b),card('FL11',b)];b.formation=b.reserve.map(c=>c.uid);}
 for(const p of [a,b])for(const c of p.reserve)if(c.modelId==='FL11')c.protocolMode='assault';
 room.phase='formation';for(const p of [a,b]){p.ready=false;p.mana=0;}
 const pre={a:JSON.parse(JSON.stringify(view(room,a))),b:JSON.parse(JSON.stringify(view(room,b)))};
 // Both seats confirm when the page is ready; the server timeline starts there.
 const begin=()=>{act(room,a,{type:'ready'},catalog);act(room,b,{type:'ready'},catalog);if(!room.combat)throw Error('combat did not start for '+kind);};
 return {room,a,b,pre,begin,track:[...a.formation,...b.formation].filter(Boolean)};
}
// A duplicate's signature (counts + outer copy classes, hybrid-only classes removed) lets
// the hybrid runs be compared with the native route on the same scenario and seat.
const signature=d=>`o${d.originals}c${d.copies}f${d.faces}s${d.slab}:${(d.copyClasses||[]).map(c=>c.split(' ').filter(k=>!/^hybrid-/.test(k)).sort().join('.')).sort().join('|')}`;
const hybridOnly=d=>d.faces>0||d.slab>0;
const browser=await launch(),nativeRef={};
// Native reference (same engine scenario, native route, 1920×900): records the duplicates
// the existing 2D presentation already shows, so a hybrid duplicate can be classified
// as inherited or as introduced by the hybrid. It never relaxes the absolute check.
const RUNS=[...['golias-taunt','golias-attacks','bobo-taunt','control'].flatMap(kind=>['a','b'].map(seat=>({w:1920,h:900,kind,seat,url:URL_NATIVE}))),...[[1920,900],[1280,720]].flatMap(([w,h])=>['golias-taunt','golias-attacks','bobo-taunt','control'].flatMap(kind=>['a','b'].map(seat=>({w,h,kind,seat,url:URL_HYBRID}))))];
// Optional focus (COMBAT_KINDS=bobo-taunt,control); native references of the selected kinds always run first.
const focus=process.env.COMBAT_KINDS?.split(',').filter(Boolean),seats=process.env.COMBAT_SEATS?.split(','),screens=process.env.COMBAT_SCREENS?.split(',');
const SELECTED=RUNS.filter(r=>(!focus||focus.includes(r.kind))&&(!seats||seats.includes(r.seat))&&(r.url===URL_NATIVE||!screens||screens.includes(r.w+'x'+r.h)));
if(!SELECTED.length)throw Error('No combat scenarios selected');
try{for(const {w,h,kind,seat,url} of SELECTED){const native=url===URL_NATIVE;
 const s=scenario(kind),id=`${native?'native-':''}${kind}-${seat}-${w}x${h}`,{context,page}=await open(browser,{width:w,height:h},{url,errors:H.errors,gpu:H.gpu});
 await paint(page,{...s.pre[seat],serverNow:Date.now()},600);
 // Revision 12 fix: the combat now reaches the page through progressive server views
 // (lib poll). The first version pushed one view, which only carried the formation
 // reveal step, so strikes and Provocar redirections were never presented.
 s.begin();const steps=s.room.combat.timeline.map(t=>({kind:t.kind,duration:t.duration,lane:t.lane,strike:t.strike?{source:t.strike.sourceId,target:t.strike.targetId,pair:!!t.strike.pair}:null}));
 const feed=poll(page,()=>view(s.room,s[seat]));
 const result=await page.evaluate(async({track,total})=>{
  const frames=[],dupes=[];const vis=n=>{if(!n?.isConnected)return false;const r=n.getBoundingClientRect();if(!r.width||!r.height)return false;return n.checkVisibility({opacityProperty:true,visibilityProperty:true});};
  const sample=t=>{const row={t,uids:{}};for(const uid of track){const originals=[...document.querySelectorAll('#game .card')].filter(n=>n.dataset.uid===uid&&!n.closest('#visual-layer')&&vis(n)).length,copies=[...document.querySelectorAll('#visual-layer [data-uid]')].filter(n=>n.dataset.uid===uid&&vis(n)&&!n.parentElement?.closest(`#visual-layer [data-uid="${uid}"]`)).length,faces=window.RunaHybridLifecycle?.stats?.motionUids?.filter?.(u=>u===uid).length||0,slab=window.RunaHybrid?.slabs?.includes?.(uid)?1:0,hiddenOriginalSlab=slab&&!originals?1:0;const total=originals+copies+faces;row.uids[uid]={originals,copies,faces,slab};if(total>1||hiddenOriginalSlab&&copies)dupes.push({t,uid,originals,copies,faces,slab,copyClasses:[...document.querySelectorAll('#visual-layer [data-uid]')].filter(n=>n.dataset.uid===uid&&vis(n)&&!n.parentElement?.closest(`#visual-layer [data-uid="${uid}"]`)).map(n=>n.className)});}frames.push(row);};
  const t0=performance.now();let renders=0,steps=0;
  while(performance.now()-t0<total+2500){await new Promise(requestAnimationFrame);sample(Math.round(performance.now()-t0));steps=Math.max(steps,state.combat?.timeline?.length||0);if(frames.length%20===0){render();renders++;}}
  return {frames:frames.length,renders,dupes,stepsSeen:steps};
 },{track:s.track,total:s.room.combat.duration||steps.reduce((a,x)=>a+x.duration,0)});
 // End of combat by the engine's own timer; the poll delivers the preparation state.
 const ends=Date.now()+8000;while(s.room.phase==='resolving'&&Date.now()<ends)await new Promise(r=>setTimeout(r,100));const phaseAt=Date.now();await page.waitForTimeout(1500);
 // S3 (attempt 6): the preparation that follows the combat starts legitimate draws, whose
 // carrier/lock share the classes checked below. Each sample records the carriers (event
 // kind, UID), RunaHybridFlights.stats and the visual queue; the check waits for the
 // flights alive at the transition to finish, with an explicit limit (DRAIN_LIMIT), and
 // still demands zero leftovers at the end. The poll stays on, so late state arrives.
 const leftoversAt=()=>page.evaluate(async()=>{const queue=typeof visualQueue!=='undefined'?await Promise.race([visualQueue.then(()=>'idle',()=>'idle'),new Promise(r=>setTimeout(()=>r('busy'),0))]):null;const leftovers={visualLayer:[...document.querySelectorAll('#visual-layer .visual-card,#visual-layer .card-flight,#visual-layer [data-combat-id]')].length,motionFaces:document.querySelectorAll('.hybrid-motion-face').length,flightCarriers:document.querySelectorAll('.hybrid-flight-carrier').length,masks:document.querySelectorAll('.platinum-actor-masked').length,locks:document.querySelectorAll('.hybrid-draw-lock:not([hidden])').length,hiddenCards:[...document.querySelectorAll('#game .card')].filter(n=>n.dataset.uid&&getComputedStyle(n).visibility==='hidden'&&!visuallyDefeated.has(n.dataset.uid)).map(n=>n.dataset.uid),moving:RunaCardArrivals.stats.moving};const st=window.RunaHybridFlights?.stats;return {leftovers,phase:state.room?.phase??state.phase??null,carriers:[...document.querySelectorAll('.hybrid-flight-carrier')].map(n=>({kind:n.dataset.flightKind,uid:n.querySelector('[data-uid]')?.dataset.uid||null})),flights:st?{locked:st.locked,pending:st.pending,active:st.active,lastHistory:st.history.slice(-4)}:null,visualQueue:queue,lastVisualId:typeof lastVisualId!=='undefined'?lastVisualId:null};});
 const clean=l=>!l.visualLayer&&!l.motionFaces&&!l.flightCarriers&&!l.masks&&!l.locks&&!l.hiddenCards.length&&!l.moving.length;
 const DRAIN_LIMIT=6000,drain=[];let snap=await leftoversAt();drain.push({ms:Date.now()-phaseAt,...snap});
 while(!clean(snap.leftovers)&&Date.now()-phaseAt<1500+DRAIN_LIMIT){await page.waitForTimeout(150);snap=await leftoversAt();drain.push({ms:Date.now()-phaseAt,...snap});}
 await feed.stop();result.leftovers=snap.leftovers;result.drain={phaseAt,limitMs:DRAIN_LIMIT,samples:drain};
 const first=result.dupes.slice(0,6),sigs={};for(const d of result.dupes)sigs[signature(d)]=(sigs[signature(d)]||0)+1;
 report.scenarios.push({id,route:native?'native':'hybrid',steps,stepsSeen:result.stepsSeen,pushes:feed.pushes,endPhase:s.room.phase,frames:result.frames,renders:result.renders,duplicateFrames:result.dupes.length,signatures:sigs,firstDuplicates:first,leftovers:result.leftovers,drain:result.drain});
 // Per-UID records are saved as each scenario ends, so an interrupted suite keeps them.
 writeJSON(`${out}/frames-${id}.json`,{id,steps,dupes:result.dupes});writeJSON(`${out}/combat-duplicates-detail.json`,report);
 check(`${id}: the page received the whole combat timeline (${steps.length} steps) and the engine ended it`,result.stepsSeen===steps.length&&s.room.phase!=='resolving',{stepsSeen:result.stepsSeen,steps:steps.length,phase:s.room.phase,pushes:feed.pushes});
 if(native){nativeRef[kind+'-'+seat]=sigs;await context.close();continue;}
 if(result.dupes.length){await page.screenshot({path:`${out}/dupe-${id}.png`}).catch(()=>{});}
 const ref=nativeRef[kind+'-'+seat]||{},added=result.dupes.filter(d=>hybridOnly(d)||!ref[signature(d)]);
 check(`${id}: no duplicate introduced by the hybrid (motion face, WebGL body, or a pattern the native route does not show)`,added.length===0,{count:added.length,first:added.slice(0,6),native:ref});
 check(`${id}: no simultaneous full duplicate per UID`,result.dupes.length===0,{count:result.dupes.length,signatures:sigs,nativeSameScenario:ref,first});
 check(`${id}: no leftovers after combat`,!result.leftovers.visualLayer&&!result.leftovers.motionFaces&&!result.leftovers.flightCarriers&&!result.leftovers.masks&&!result.leftovers.locks&&!result.leftovers.hiddenCards.length&&!result.leftovers.moving.length,result.leftovers);
 await context.close();}
}finally{writeJSON(`${out}/combat-duplicates-detail.json`,report);finish(out,'combat-duplicates',H);await browser.close();}
