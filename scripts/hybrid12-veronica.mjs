// Revisão 12: Verônica (FL11, combat_protocol) na mesa híbrida com câmera de 5°.
// Combate real do motor (r1-fixtures: act 'ready' → resolveCombat), sem injeção no servidor.
// Referências nativas: mesa-nova/test-veronica-origin.mjs (trilho liga a fonte ATUAL aos
// beneficiários ATUAIS após resize/scroll), test-veronica-markers.mjs (marcas só nos
// beneficiários reais, depois da Revelação, expirando com o combate) e
// test-platinum-manifestations.mjs (manifestação limpa ao terminar/abortar).
// Verifica, nas duas perspectivas (assento dono e rival):
//  - motor: beneficiários = a própria Verônica + aliados adjacentes ocupados (sem fantasma);
//  - trilhos .protocol-link: origem no nó de combate atual da Verônica e um destino por
//    beneficiário, coincidindo com o centro do nó e da face projetada;
//  - após resize (desktop) ou scroll (mobile) durante a manifestação, os trilhos seguem
//    as novas posições;
//  - nenhuma marca antes da Revelação; depois, exatamente uma marca por beneficiário,
//    ancorada no nó certo; marcas expiram ao sair do combate;
//  - movimento reduzido: sem trilhos, marcas corretas; interrupção no meio: limpeza;
//  - nenhum comando de jogo enviado; sem erros JS/WebGL.
// Uso: HYBRID_QA_OUT=<pasta> node scripts/hybrid12-veronica.mjs
// Continuação: HYBRID_QA_SOURCE=rev11 serve os arquivos do baseline da revisão 11 (ver
// hybrid12-lib.mjs); HYBRID_QA_TARGET=native usa a rota nativa como controle (sem faces
// projetadas: a checagem de face é registrada como não aplicável). Cada execução guarda o
// trace de hybrid12-veronica-trace.js (cena, animações, validade, geração, resize, quadros,
// marcas) em veronica-detail.json.
import {harness,launch,open,paint,poll,setup,card,view,writeJSON,finish,URL_HYBRID,URL_NATIVE,sourceOverride} from './hybrid12-lib.mjs';import {act,catalog} from '../mesa-nova/r1-fixtures.mjs';
const out=process.env.HYBRID_QA_OUT||'prototype-qa/hybrid-12/veronica',H=harness(out),{check}=H,TOL=1.5,TARGET=process.env.HYBRID_QA_TARGET||'hybrid',NATIVE=TARGET==='native',TRACE=new URL('./hybrid12-veronica-trace.js',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1');
const report={target:TARGET,moveOnMark:process.env.HYBRID_QA_MOVE_ON_MARK==='1',source:sourceOverride.label,tree:sourceOverride.tree||null,overridable:Object.fromEntries(Object.entries(sourceOverride.files).map(([u,f])=>[u,{path:f.path,sha1:f.sha1}])),served:sourceOverride.served,runs:[]};
const pageNow=page=>page.evaluate(()=>+performance.now().toFixed(1));
// lane: Verônica's lane on seat A; empty: an A lane left unoccupied.
function scenario({mode,lane,empty=null}){
 const {room,a,b}=setup();for(const p of [a,b]){p.hand=[card('FV03',p)];p.patron.hp=60;}
 const veronica=card('FL11',a);veronica.protocolMode=mode;const row=[card('FL16',a),card('FV03',a),card('FL16',a)];row[lane]=veronica;a.reserve=row;a.formation=row.map((c,i)=>i===empty?null:c.uid);
 b.reserve=[card('FV03',b),card('FL16',b),card('FV03',b)];b.formation=b.reserve.map(c=>c.uid);
 room.phase='formation';for(const p of [a,b]){p.ready=false;p.mana=0;}
 const pre={a:JSON.parse(JSON.stringify(view(room,a))),b:JSON.parse(JSON.stringify(view(room,b)))};
 const expected=[lane-1,lane,lane+1].filter(i=>i>=0&&i<3&&a.formation[i]).map(i=>a.formation[i]).sort();
 // Both seats confirm only when the page is ready: the server timeline starts here.
 const begin=()=>{act(room,a,{type:'ready'},catalog);act(room,b,{type:'ready'},catalog);if(!room.combat)throw Error('combat did not start');let start=0,step=null;for(const s of room.combat.timeline){if(s.ability?.op==='combat_protocol'){step={...s,start};break;}start+=s.duration;}return step;};
 return {room,a,b,pre,veronica:veronica.uid,expected,begin};
}
// Geometry of the live manifestation, read in one frame: rail endpoints (style of the
// fixed layer + its rect), plates, and centres of every face-up combat card (native node
// and projected hybrid face).
function measure(){
 const centre=r=>({x:r.left+r.width/2,y:r.top+r.height/2});
 const cards={};for(const n of document.querySelectorAll('#lanes .lane-side .card')){if(!n.dataset.uid||n.classList.contains('back'))continue;const p=window.RunaHybrid?.pose?.(n),q=p?.quad,face=q?{x:(Math.min(...q.map(v=>v.x))+Math.max(...q.map(v=>v.x)))/2,y:(Math.min(...q.map(v=>v.y))+Math.max(...q.map(v=>v.y)))/2}:null;const r=n.getBoundingClientRect();cards[n.dataset.uid]={...centre(r),bottom:r.bottom,face};}
 const scene=document.querySelector('.platinum-protocol-scene');let rails=[],plates=0;
 if(scene){const L=scene.getBoundingClientRect();plates=scene.querySelectorAll('.protocol-plate').length;rails=[...scene.querySelectorAll('.protocol-link')].map(r=>{const s={x:L.x+parseFloat(r.style.left),y:L.y+parseFloat(r.style.top)+2.5},w=parseFloat(r.style.width),a=parseFloat((r.style.transform.match(/rotate\(([-+\d.e]+)rad\)/)||[])[1]);return {start:s,end:{x:s.x+w*Math.cos(a),y:s.y+w*Math.sin(a)},width:w,angle:a,hidden:r.style.visibility==='hidden'};});}
 const marks=[...document.querySelectorAll('.card-effect-veronica.ce-persistent')].map(n=>{const w=parseFloat(n.style.width);return {x:parseFloat(n.style.left)+w/2,anchor:parseFloat(n.style.top)+w*.72,hidden:n.style.visibility==='hidden'};});
 // Diagnostic: state of every combat card node (a mark hides while its card is hidden,
 // e.g. under a native flight copy) and the combat step the client is showing.
 const nodes={};for(const n of document.querySelectorAll('#lanes .lane-side .card'))if(n.dataset.uid)nodes[n.dataset.uid]={visibility:getComputedStyle(n).visibility,width:+n.getBoundingClientRect().width.toFixed(1),back:n.classList.contains('back'),classes:[...n.classList].filter(c=>!/^(card|mini|combat|has-art|hybrid-surface-card)$/.test(c))};
 for(const n of document.querySelectorAll('#lanes .lane-side .card[data-uid]'))if(cards[n.dataset.uid])cards[n.dataset.uid].node=window.__vnode(n);
 return {t:+performance.now().toFixed(1),order:window.__vorder.slice(-30),zoom:document.documentElement.style.getPropertyValue('--hybrid-play-scale'),scene:!!scene,rails,plates,cards,marks,nodes,banner:document.getElementById('battle-banner')?.textContent||'',scrollY,vw:innerWidth,vh:innerHeight,leftovers:{scenes:document.querySelectorAll('.platinum-protocol-scene').length,masked:document.querySelectorAll('.platinum-actor-masked').length,flights:document.querySelectorAll('.card-effects-layer .ce-flight').length}};
}
const near=(p,q,tol=TOL)=>!!p&&!!q&&Math.hypot(p.x-q.x,p.y-q.y)<=tol;
// Every rail starts on the Verônica and ends on exactly one beneficiary; the set of
// matched UIDs equals the engine's beneficiaries.
function railsMatch(m,src,expected){const s=m.cards[src];if(!s)return {ok:false,why:'source node missing'};const ends=m.rails.map(r=>Object.entries(m.cards).filter(([,c])=>near(r.end,c)).map(([u])=>u));const matched=ends.map(e=>e.length===1?e[0]:null);
 const ok=m.rails.length===expected.length&&m.rails.every(r=>near(r.start,s)&&!r.hidden)&&matched.every(Boolean)&&JSON.stringify([...matched].sort())===JSON.stringify(expected)&&m.plates===2*expected.length;
 const faceErr=Math.max(0,...expected.map(u=>m.cards[u]?.face?Math.hypot(m.cards[u].face.x-m.cards[u].x,m.cards[u].face.y-m.cards[u].y):Infinity));
 // Codex review: rail ends measured directly against the projected faces (source face at
 // the start, the matched beneficiary's face at the end), not node centre vs face centre.
 const dist=(p,q)=>p&&q?Math.hypot(p.x-q.x,p.y-q.y):Infinity,railFaceErr=m.rails.length?Math.max(...m.rails.map((r,i)=>Math.max(dist(r.start,s.face),dist(r.end,m.cards[matched[i]]?.face)))):Infinity;
 return {ok,matched,faceErr,railFaceErr,startErr:Math.max(0,...m.rails.map(r=>Math.hypot(r.start.x-s.x,r.start.y-s.y))),rails:m.rails.length,plates:m.plates};}
function marksMatch(m,expected){const owners=m.marks.map(k=>Object.entries(m.cards).filter(([,c])=>Math.abs(c.x-k.x)<=1&&Math.abs(c.bottom-k.anchor)<=1).map(([u])=>u));return {ok:m.marks.length===expected.length&&owners.every(o=>o.length===1)&&JSON.stringify(owners.map(o=>o[0]).sort())===JSON.stringify(expected)&&m.marks.every(k=>!k.hidden),owners,marks:m.marks.length,hidden:m.marks.map(k=>k.hidden),expected,expectedNodes:Object.fromEntries(expected.map(u=>[u,m.nodes?.[u]||null])),banner:m.banner,t:m.t,coords:{marks:m.marks,cards:Object.fromEntries(expected.map(u=>[u,m.cards[u]||null])),vw:m.vw,vh:m.vh,scrollY:m.scrollY,zoom:m.zoom,order:m.order}};}
const frames=(page,n=3)=>page.evaluate(n=>new Promise(r=>{const f=k=>k?requestAnimationFrame(()=>f(k-1)):r();f(n);}),n);
// Continuação (sincronização com quadros). A manifestação dura ~950 ms e termina sozinha;
// o passo seguinte (golpe) oculta o original da carta atacante, e a marca dela some junto.
// Amostrar do Node depois de vários round-trips (resize lento, rebuild de até ~240 ms)
// caía depois desses limites tanto na revisão 12 quanto no baseline da revisão 11
// (prototype-qa/hybrid-12/continuacao-veronica-cmpA-*). Por isso as medições de trilho após
// o movimento e as de marca são feitas na página, em requestAnimationFrame, a partir do
// próprio evento (resize/scroll; marcas aplicadas), sem alterar tempos nem tolerâncias.
// `measure` é instalada na página como window.__vmeasure (init script).
// S3 diagnostic: order of the updates between presented frames (html inline style writes,
// camp zoom writes, mark style writes), drained by each measure() call. No check depends on it.
function orderTrace(){window.__vorder=[];let serial=0;const ids=new WeakMap();window.__vnode=n=>{if(!ids.has(n))ids.set(n,++serial);return ids.get(n);};
 const push=(what,n,detail={})=>{if(window.__vorder.length>=120)window.__vorder.shift();window.__vorder.push({t:+performance.now().toFixed(1),what,el:n.id||n.className?.baseVal||String(n.className||'').slice(0,40),...detail});};
 addEventListener('DOMContentLoaded',()=>new MutationObserver(rs=>{for(const n of new Set(rs.map(r=>r.target))){if(n===document.documentElement)push('html-style',n,{zoom:n.style.getPropertyValue('--hybrid-play-scale')});else if(n.classList?.contains('card-effect-veronica'))push('mark-style',n,{left:n.style.left,top:n.style.top});else if(n.classList?.contains('self-camp')||n.classList?.contains('opponent-camp'))push('camp-style',n,{zoom:n.style.zoom});else if(n.closest?.('#lanes'))push('board-style',n,{node:window.__vnode(n)});}}).observe(document.documentElement,{attributes:true,attributeFilter:['style'],subtree:true}));
 addEventListener('resize',()=>push('resize-event',document.documentElement));}
// ResizeObserver runs after the frame's rAFs and layout. A MessageChannel task
// can instead read a *new* viewport before its first resize event or paint.
function frameSampler(){
 const callbacks=new Set();let probe,observer,width=1,armed=false,toggled=false;
 window.__vpresented=f=>{
  callbacks.add(f);if(armed)return;armed=true;
  if(!probe){probe=document.createElement('i');probe.style.cssText='position:fixed;top:0;left:0;width:1px;height:1px;visibility:hidden;contain:strict;pointer-events:none';
   document.body.append(probe);observer=new ResizeObserver(()=>{
    if(!toggled||probe.offsetWidth!==width)return;
    const batch=[...callbacks];callbacks.clear();armed=false;toggled=false;for(const cb of batch)cb();
   });observer.observe(probe);}
  requestAnimationFrame(()=>{toggled=true;width=3-width;probe.style.width=width+'px';});
 };
}
const MEASURE={content:`window.__vmeasure=${measure.toString()};(${orderTrace.toString()})();(${frameSampler.toString()})();`};
// Move sampler: starts at the first resize/scroll event, runs every frame until the
// manifestation layer is gone (`complete`); hitting the safety cap is an incomplete capture.
function armMove(){const m=__vmeasure(),S=window.__vmove={armedAt:performance.now(),samples:[],complete:false},CAP=600;
 const presented=window.__vpresented;
 const sample=()=>{const x=__vmeasure();S.samples.push(x);if(!x.scene){S.complete=true;S.done=true;return;}if(S.samples.length>=CAP){S.done=true;return;}presented(sample);};
 const start=e=>{if(S.movedAt!=null)return;S.movedAt=+performance.now().toFixed(1);S.event=e.type;S.sceneAtMove=!!document.querySelector('.platinum-protocol-scene');removeEventListener('resize',start);removeEventListener('scroll',start);presented(sample);};
 addEventListener('resize',start);addEventListener('scroll',start,{passive:true});return m;}
// Marks sampler (presented state too): from the frame in which the expected count of
// persistent marks first exists, every frame while the client shows the Revelation step,
// until the step has ended and some frame had every mark positioned. Cap = incomplete.
const positioned=m=>m.marks.every(k=>Number.isFinite(k.x)&&Number.isFinite(k.anchor));
function armMarks(n){const S=window.__vmarks={samples:[],firstAt:null,complete:false},CAP=600,ready=m=>m.marks.every(k=>Number.isFinite(k.x)&&Number.isFinite(k.anchor));
 const presented=window.__vpresented;
 const loop=()=>{if(S.firstAt==null&&document.querySelectorAll('.card-effect-veronica.ce-persistent').length>=n)S.firstAt=+performance.now().toFixed(1);
  if(S.firstAt!=null){const m=__vmeasure();S.samples.push(m);S.visible?.();if(m.banner!=='REVELAÇÃO'&&S.samples.some(ready)){S.complete=true;S.done=true;return;}if(S.samples.length>=CAP){S.done=true;return;}}presented(loop);};presented(loop);}
// Marks verdict over the presented frames, from the first frame with the expected count.
// Codex review (2nd round): the start-up allowance is bounded — a new mark is placed by
// RunaCardEffects on the next frame, so at most MARK_STARTUP_FRAMES unpositioned frames may
// precede the first positioned one (observed 0–1 in 77 runs) — and that first positioned frame
// must belong to the Revelation step: there is no fallback to a later (Confronto) frame.
// From it on, every Revelation frame must be positioned and consistent.
const MARK_STARTUP_FRAMES=2;
function evaluateMarks(all,expected){
 const p0=all.findIndex(positioned),fromFirst=p0<0?[]:all.slice(p0),during=fromFirst.filter(x=>x.banner==='REVELAÇÃO');
 const results=during.map(x=>positioned(x)?marksConsistent(x,expected):{ok:false,why:'mark lost its position after being placed',t:x.t}),bad=results.filter(x=>!x.ok);
 const why=p0<0?'no frame with every mark positioned':p0>MARK_STARTUP_FRAMES?`${p0} unpositioned frames before the first positioned one (max ${MARK_STARTUP_FRAMES})`:fromFirst[0].banner!=='REVELAÇÃO'?`first positioned frame is outside the Revelation step (${fromFirst[0].banner})`:bad.length?'inconsistent frame during the Revelation':null;
 return {ok:!why,why,unpositionedBeforeFirst:Math.max(0,p0),duringRevelation:during.length,firstPositionedBanner:fromFirst[0]?.banner||null,allVisibleDuringRevelation:during.length>0&&during.every(x=>marksMatch(x,expected).ok),first:results[0]||null,firstBad:bad[0]||null};}
// Frames in which none of the involved cards moved since the previous presented frame:
// there the rails must already match (a lag is tolerated only in the frame of a layout move).
const stillFrom=(a,b,uids)=>uids.every(u=>a?.cards[u]&&b?.cards[u]&&Math.hypot(a.cards[u].x-b.cards[u].x,a.cards[u].y-b.cards[u].y)<=.5);
// A mark follows its card: hidden exactly when the card's own original is hidden (e.g. under
// the native strike-flight copy, which starts when the Revelation step ends). Count, owners
// and UIDs stay exact; no mark on an empty house, none for a non-beneficiary.
function marksConsistent(m,expected){const k=marksMatch(m,expected),owned=k.owners.map(o=>o.length===1?o[0]:null);
 const visibilityOk=owned.every((u,i)=>u&&(m.marks[i].hidden===(m.nodes[u]?.visibility==='hidden')));
 const ok=m.marks.length===expected.length&&owned.every(Boolean)&&JSON.stringify([...owned].sort())===JSON.stringify(expected)&&visibilityOk;
 return {...k,ok,visibilityOk,visibleMarksOk:k.ok};}
const sceneEnd=page=>page.waitForFunction(()=>window.__vtrace?.scenes?.length&&window.__vtrace.scenes.every(s=>s.reason),null,{timeout:4000}).then(()=>page.evaluate(()=>window.__vtrace.scenes.map(s=>({reason:s.reason,lifetime:s.lifetime,outcomes:s.outcomes,animations:s.animations,durations:s.durations}))),()=>null);
// S3 diagnostic (HYBRID_QA_PROFILE=1, default off): V8 CPU profile + precise call counts of
// the page between the resize and the end of the move sampler. Per function (name@file):
// calls, inclusive and self ms. Product code is not touched; no check depends on it.
const PROFILE=process.env.HYBRID_QA_PROFILE==='1';
function profileSummary(profile,coverage){const byId=new Map(profile.nodes.map(n=>[n.id,n])),dt=new Map(),self=new Map(),incl=new Map();
 profile.samples.forEach((id,i)=>dt.set(id,(dt.get(id)||0)+(profile.timeDeltas[i+1]??0)/1000));
 const key=n=>`${n.callFrame.functionName||'(anon)'}@${(n.callFrame.url||'').split('/').pop()}:${n.callFrame.lineNumber+1}`;
 const walk=(n,stack)=>{const k=key(n),own=dt.get(n.id)||0;self.set(k,(self.get(k)||0)+own);let total=own;for(const c of n.children||[])total+=walk(byId.get(c),stack.includes(k)?stack:[...stack,k]);if(!stack.includes(k))incl.set(k,(incl.get(k)||0)+total);return total;};
 walk(profile.nodes[0],[]);const calls={};for(const s of coverage.result)for(const f of s.functions){const c=f.ranges[0]?.count||0;if(!c||!/mesa-nova/.test(s.url))continue;calls[`${f.functionName||'(anon)'}@${s.url.split('/').pop()}`]=(calls[`${f.functionName||'(anon)'}@${s.url.split('/').pop()}`]||0)+c;}
 const top=[...incl].filter(([k])=>!/^\((root|program|idle|garbage collector)\)/.test(k)).sort((a,b)=>b[1]-a[1]).slice(0,45).map(([k,ms])=>({fn:k,inclusiveMs:+ms.toFixed(1),selfMs:+(self.get(k)||0).toFixed(1)}));
 const watched=Object.fromEntries(Object.entries(calls).filter(([k])=>/^(fitLayout|apply|envelope|layoutHands|buildStable|build|syncNow|schedule|update|layoutReserveRows|positionCombatEmanations|layoutRoomAccount|sizeHud|renderTargetLinks|render|grow|fits)@/.test(k)));
 return {wallMs:+((profile.endTime-profile.startTime)/1000).toFixed(1),gcMs:+(self.get([...self.keys()].find(k=>k.startsWith('(garbage collector)'))||'')||0).toFixed(1),programMs:+[...self].filter(([k])=>k.startsWith('(program)')).reduce((a,[,v])=>a+v,0).toFixed(1),watchedCalls:watched,top};}
const browser=await launch();
const RUNS=[
 {w:1920,h:900,seat:'a',sc:{mode:'assault',lane:1},move:{resize:[1680,900]}},
 {w:1920,h:900,seat:'b',sc:{mode:'assault',lane:1},move:{resize:[1680,900]}},
 {w:1280,h:720,seat:'a',sc:{mode:'escort',lane:0},move:{resize:[1440,900]}},
 {w:1280,h:720,seat:'b',sc:{mode:'assault',lane:2,empty:1},move:{resize:[1440,900]}},
 {w:390,h:800,seat:'a',sc:{mode:'assault',lane:1},move:{scroll:90}},
 {w:390,h:800,seat:'b',sc:{mode:'escort',lane:1},move:{scroll:90}},
 {w:1920,h:900,seat:'a',sc:{mode:'assault',lane:1},reduced:true},
 {w:1920,h:900,seat:'b',sc:{mode:'assault',lane:1},abort:true},
];
// HYBRID_QA_ONLY=<trecho do id> e HYBRID_QA_REPEAT=<n>: repetição focada (diagnóstico).
const STALL=Number(process.env.HYBRID_QA_STALL)||0,ONLY=process.env.HYBRID_QA_ONLY||'',REPEAT=Math.max(1,Number(process.env.HYBRID_QA_REPEAT)||1),runId=run=>`${run.w}x${run.h}-${run.seat}-${run.sc.mode}-lane${run.sc.lane}${run.sc.empty!=null?'-empty'+run.sc.empty:''}${run.reduced?'-reduced':''}${run.abort?'-abort':''}`;
const PLAN=RUNS.filter(r=>runId(r).includes(ONLY)).flatMap(r=>Array.from({length:REPEAT},()=>r));report.only=ONLY||null;report.repeat=REPEAT;
try{for(const run of PLAN){
 const s=scenario(run.sc),id=`${run.w}x${run.h}-${run.seat}-${run.sc.mode}-lane${run.sc.lane}${run.sc.empty!=null?'-empty'+run.sc.empty:''}${run.reduced?'-reduced':''}${run.abort?'-abort':''}`;
 const {context,page}=await open(browser,{width:run.w,height:run.h},{reduced:!!run.reduced,errors:H.errors,gpu:H.gpu,url:NATIVE?URL_NATIVE:URL_HYBRID,initPath:[TRACE,MEASURE]});let commands=0;const cdp=PROFILE&&run.move?.resize?await context.newCDPSession(page):null;if(cdp){await cdp.send('Profiler.enable');await cdp.send('Profiler.startPreciseCoverage',{callCount:true,detailed:false});}
 // Diagnostic trace is read before every context.close(), whatever path the run takes.
 const closeRun=async()=>{try{const rec=report.runs.at(-1);if(rec?.id===id)rec.trace=await page.evaluate(()=>window.__vtrace);}catch(e){report.runs.at(-1).traceError=String(e);}await context.close();};context.on('request',r=>{if(r.method()==='POST'&&r.url().includes('/api/rooms/'))commands++;});
 await paint(page,{...s.pre[run.seat],serverNow:Date.now()},600);
 if(run.w<=900){await page.evaluate(()=>document.getElementById('lanes').scrollIntoView({block:'center'}));await page.waitForTimeout(300);}
 // Start the real combat now; the page receives the progressive server views.
 const step=s.begin();s.step=step;const rec={id,target:TARGET,source:sourceOverride.label,expected:s.expected,veronica:s.veronica,stepStart:step?.start,timeline:s.room.combat.timeline.map(x=>({kind:x.kind,duration:x.duration,op:x.ability?.op})),begunAt:await pageNow(page)};report.runs.push(rec);
 check(`${id}: engine beneficiaries = Verônica + occupied adjacent allies`,!!step&&step.ability.sourceId===s.veronica&&JSON.stringify(step.ability.healthUpdates.map(u=>u.uid).sort())===JSON.stringify(s.expected),{step:step&&{source:step.ability.sourceId,hu:step.ability.healthUpdates.map(u=>u.uid)},expected:s.expected});
 const feed=poll(page,()=>view(s.room,s[run.seat]));await frames(page,2);
 const before=await page.evaluate(()=>__vmeasure());rec.beforeRevelation={marks:before.marks.length,scene:before.scene};
 await page.evaluate(`(${armMarks.toString()})(${s.expected.length})`);
 check(`${id}: no Verônica mark or manifestation before the Revelation`,before.marks.length===0&&!before.scene,rec.beforeRevelation);
 if(run.reduced){
  await page.waitForTimeout(s.step.start+200);const m=await page.evaluate(()=>__vmeasure());check(`${id}: reduced motion draws no protocol rail`,m.rails.length===0,{rails:m.rails.length});
 }else{
  // state 'attached': the first rail is the Verônica's own (zero length, never "visible").
  const ok=await page.waitForFunction(()=>document.querySelector('.platinum-protocol-scene .protocol-link')!==null,null,{polling:'raf',timeout:s.step.start+4000}).then(()=>true,()=>false);check(`${id}: manifestation rails appear at the Revelation`,ok);if(!ok){await feed.stop();await closeRun();continue;}
  // Initial measure and the move sampler in one round trip (no extra latency before the move).
  const m1=await page.evaluate(run.abort?()=>__vmeasure():`(${armMove.toString()})()`),r1=railsMatch(m1,s.veronica,s.expected);rec.initial={...r1,t:m1.t};
  check(`${id}: rails start on the current Verônica node and end on each engine beneficiary (≤ ${TOL} px)`,r1.ok,r1);
  if(NATIVE)rec.faceCheck='not applicable: native route has no projected faces';else check(`${id}: rail start/ends lie on the projected hybrid faces of the source and each beneficiary (≤ 2 px, measured directly)`,r1.railFaceErr<=2,{railFaceErr:r1.railFaceErr,nodeToFace:r1.faceErr});
  if(run.abort){
   // The client leaves the combat presentation (e.g. a newer state without combat).
   await feed.stop();const end=JSON.parse(JSON.stringify(view(s.room,s[run.seat])));end.phase='prep';end.combat=null;await page.evaluate(v=>{state=v;render();},end);await page.waitForTimeout(400);
   const m=await page.evaluate(()=>__vmeasure());rec.abort=m.leftovers;check(`${id}: leaving combat mid-manifestation removes rails, plates, masks and marks`,!m.scene&&!m.leftovers.scenes&&!m.leftovers.masked&&!m.leftovers.flights&&m.marks.length===0,{leftovers:m.leftovers,marks:m.marks.length});
   const ended=await sceneEnd(page);rec.sceneEnd=ended;check(`${id}: the interrupted manifestation was closed by its validity check (combat no longer current)`,ended?.length===1&&ended[0].reason==='invalid',ended);
   await page.waitForTimeout(1200);const later=await page.evaluate(()=>__vmeasure());check(`${id}: no deferred mark reappears after the abort`,later.marks.length===0&&!later.scene,{marks:later.marks.length});
   check(`${id}: presentation sends no gameplay command`,commands===0,commands);await closeRun();continue;}
  // Diagnostic only (HYBRID_QA_STALL=<ms>, default off): block the main thread once, as a
  // long rebuild frame does, while poll() keeps stamping serverNow in Node. The queued push
  // then lands with a stale serverNow (serverClockOffset grows by ~ms).
  if(STALL){rec.stall=STALL;await page.evaluate(ms=>{const e=performance.now()+ms;while(performance.now()<e);},STALL);}
  // Move the cards under a live manifestation: resize (desktop) or scroll (mobile).
  const src0=m1.cards[s.veronica];
  if(cdp){await cdp.send('Profiler.takePreciseCoverage');await cdp.send('Profiler.setSamplingInterval',{interval:250});await cdp.send('Profiler.start');}
  // Diagnostic only: exercise the same resize with already-visible marks.
  if(report.moveOnMark)await page.evaluate(()=>__vmarks.samples.length?true:new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(Error('No frame with live marks before resize')),4000);
   __vmarks.visible=()=>{clearTimeout(timer);delete __vmarks.visible;resolve();};
  }));
  if(run.move.resize)await page.setViewportSize({width:run.move.resize[0],height:run.move.resize[1]});else await page.evaluate(dy=>scrollBy(0,dy),run.move.scroll);
  await page.waitForFunction(()=>window.__vmove?.done,null,{timeout:15000}).catch(()=>{});
  if(cdp){const {profile}=await cdp.send('Profiler.stop'),coverage=await cdp.send('Profiler.takePreciseCoverage');await cdp.send('Profiler.stopPreciseCoverage');rec.profile=profileSummary(profile,coverage);}
  const mv=await page.evaluate(()=>window.__vmove),alive=(mv.samples||[]).filter(x=>x.scene),last=alive.at(-1),movedOf=x=>src0&&x?.cards[s.veronica]?Math.hypot(x.cards[s.veronica].x-src0.x,x.cards[s.veronica].y-src0.y):0;
  const uids=[s.veronica,...s.expected],perFrame=alive.map((x,i)=>{const r=railsMatch(x,s.veronica,s.expected);return {t:x.t,ok:r.ok,still:i>0&&stillFrom(alive[i-1],x,uids),moved:+movedOf(x).toFixed(2),startErr:+r.startErr.toFixed(3),railFaceErr:+r.railFaceErr.toFixed(3)};}),r2=last?railsMatch(last,s.veronica,s.expected):{ok:false,why:'no frame with the manifestation after the move'},moved=movedOf(last);
  const stillBad=perFrame.filter(x=>x.still&&!x.ok),lagFrames=perFrame.filter(x=>!x.still&&!x.ok).length,stillMoved=perFrame.filter(x=>x.still&&x.moved>5).length;
  rec.timing={armedAt:mv.armedAt,movedAt:mv.movedAt,event:mv.event,sceneAtMove:mv.sceneAtMove,framesAlive:alive.length,lastAliveAt:last?.t??null,sampled:(mv.samples||[]).length,complete:!!mv.complete};
  rec.afterMove={...r2,moved,scrollY:last?.scrollY,vw:last?.vw,scene:!!last,t:last?.t,banner:last?.banner,lagFrames,stillMoved,perFrame};
  check(`${id}: the ${run.move.resize?'resize':'scroll'} happened during the manifestation and really moved the Verônica (> 5 px)`,!!mv.sceneAtMove&&!!mv.complete&&!!last&&moved>5,{moved,timing:rec.timing});
  // Every presented frame in which the cards did not move since the previous one must match
  // (≥ 1 such frame after the move); a mismatch is tolerated only in a frame that moved the
  // layout (lagFrames, recorded), and the last frame of the manifestation must match.
  check(`${id}: after ${run.move.resize?'resize':'scroll'} the rails follow the current source and beneficiaries in every settled presented frame and in the last one (≤ ${TOL} px)`,!!mv.complete&&r2.ok&&stillMoved>0&&stillBad.length===0,{...r2,perFrame:undefined,frames:perFrame.length,stillMoved,stillBad:stillBad.slice(0,5),lagFrames});
  if(!NATIVE)check(`${id}: after ${run.move.resize?'resize':'scroll'} rail start/ends lie on the projected faces in the last manifestation frame (≤ 2 px)`,r2.railFaceErr<=2,{railFaceErr:r2.railFaceErr,nodeToFace:r2.faceErr});
 }
 // Marks after the Revelation (applied 650 ms after it starts), sampled by frame.
 const marked=await page.waitForFunction(()=>window.__vmarks?.done,null,{timeout:15000}).then(()=>true,()=>false);
 const mk=await page.evaluate(()=>window.__vmarks),ev=evaluateMarks(mk.samples||[],s.expected);
 rec.marks={firstAt:mk.firstAt,complete:!!mk.complete,samples:(mk.samples||[]).length,...ev,ok:marked&&!!mk.complete&&ev.ok};
 check(`${id}: after the Revelation exactly one mark per beneficiary, on the right card (hidden only while that card is hidden), in every positioned frame of the Revelation step`,rec.marks.ok,{...rec.marks,first:undefined});
 const gone=await page.waitForFunction(()=>!document.querySelector('.platinum-protocol-scene'),null,{timeout:3000}).then(()=>true,()=>false);
 check(`${id}: manifestation layer removed when it ends`,gone);
 // The real lifecycle: the manifestation ended because its animations finished, never
 // cancelled by the resize/scroll or by the rebuilds (reduced motion: same, shorter).
 const ended=await sceneEnd(page);rec.sceneEnd=ended;
 check(`${id}: the manifestation ended by completing its animations (not cancelled by ${run.move?.resize?'resize':run.move?'scroll':'rendering'})`,ended?.length===1&&ended[0].reason==='animations-finished'&&ended[0].outcomes?.cancelled===0,ended);
 // End of combat (the engine's own timer): marks expire, nothing remains.
 const ends=Date.now()+s.room.combat.duration+4000;while(s.room.phase==='resolving'&&Date.now()<ends)await new Promise(r=>setTimeout(r,100));await page.waitForTimeout(800);await feed.stop();
 const m4=await page.evaluate(()=>__vmeasure());rec.cleanup={phase:s.room.phase,pushes:feed.pushes,marks:m4.marks.length,...m4.leftovers};
 check(`${id}: the engine finished the combat and the page received it`,s.room.phase!=='resolving'&&feed.pushes>10,{phase:s.room.phase,pushes:feed.pushes});
 // Codex review: re-count manifestations at the end of combat, and follow the persistent
 // marks over the whole combat (trace): only engine beneficiaries are ever requested; drops
 // and returns (e.g. a striker hidden under its flight copy) are recorded.
 const tr=await page.evaluate(()=>({scenes:window.__vtrace.scenes.length,items:window.__vtrace.events.filter(e=>e.type==='mark-items').map(e=>({t:e.t,uids:e.uids}))}));
 const foreign=tr.items.filter(e=>e.uids.some(u=>!s.expected.includes(u)));rec.markTimeline=tr.items;
 check(`${id}: exactly one manifestation for the Revelation, recounted after the combat`,tr.scenes===1,{scenes:tr.scenes});
 check(`${id}: during the whole combat marks are requested only for engine beneficiaries`,foreign.length===0&&tr.items.some(e=>e.uids.length===s.expected.length),{foreign:foreign.slice(0,3),changes:tr.items.length});
 check(`${id}: marks expire and no manifestation remains after combat`,m4.marks.length===0&&!m4.leftovers.scenes&&!m4.leftovers.masked&&!m4.leftovers.flights,rec.cleanup);
 check(`${id}: presentation sends no gameplay command`,commands===0,commands);
 await closeRun();}
 check('no runtime errors',H.errors.length===0,H.errors);check('no WebGL errors',H.gpu.length===0,H.gpu);
}finally{writeJSON(`${out}/veronica-detail.json`,report);finish(out,'veronica',H);await browser.close();}
