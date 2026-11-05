// S3:3 directed test (Verônica mark vs late projection), 1280x720-a-escort-lane0.
// Reference: 03-live-resize rep 3 — the mark was written at 5714 ms, the table then
// projected the card nodes in the same frame, and the presented frame at 5716 ms showed
// the mark off its anchor. This test drives the real table flow (engine views by polling,
// real resize during the REVELAÇÃO) and records, per presented frame, the ordered writes
// (mark style, card-node style/projection, html zoom) with the anchor rect at each write.
// Trigger = in one frame, the marked card's node is re-projected (> TOL) AFTER the last
// mark write that preceded it. The run fails explicitly when no trigger frame is seen.
// Verdict per trigger frame: the presented mark stays on its anchor (≤ 1 px, same
// tolerance as marksMatch in hybrid12-veronica.mjs).
// S3_TRIGGER_FIX=removed serves card-effects.js and hybrid/bridge.js without the S3 mark
// fix, by interception in the test page only (no project file is touched).
import fs from 'node:fs';import {createHash} from 'node:crypto';
import {harness,launch,open,paint,poll,setup,card,view,writeJSON,finish,URL_HYBRID,sourceOverride} from './hybrid12-lib.mjs';import {act,catalog} from '../mesa-nova/r1-fixtures.mjs';
// S3_TRIGGER_VERIFY=<veronica-trigger-detail.json>: re-judges a saved run (frameLog, owners)
// with the same verdict, without a browser and without writing files.
const VERIFY=process.env.S3_TRIGGER_VERIFY||'';
const out=VERIFY?VERIFY.replace(/[\\/][^\\/]*$/,''):process.env.HYBRID_QA_OUT||'prototype-qa/s3-continuity/veronica-trigger',H=harness(out),{check}=H,TOL=1,REPEAT=Math.max(1,Number(process.env.HYBRID_QA_REPEAT)||1);
const FIX=process.env.S3_TRIGGER_FIX==='removed'?'removed':'current',ROOT=new URL('../',import.meta.url);
const sha=b=>createHash('sha256').update(b).digest('hex');
// The two fix points: the html-style observer in card-effects.js and the reposition call
// at the end of the hybrid build in bridge.js. Each must occur exactly once.
const FIXES=[['card-effects.js',"new MutationObserver(()=>{if(live.size)placeLive();}).observe(document.documentElement,{attributes:true,attributeFilter:['style']});"],['hybrid/bridge.js','window.RunaCardEffects?.reposition?.();']];
const served={};for(const [rel,needle] of FIXES){const disk=fs.readFileSync(new URL('mesa-nova/'+rel,ROOT));const text=disk.toString('utf8');if(text.split(needle).length!==2)throw Error('fix point not unique in '+rel);
 const body=FIX==='removed'?Buffer.from(text.replace(needle,'')):disk;served['/runamarca/'+rel]={disk:sha(disk),served:sha(body),fixPresent:FIX==='current'};
 if(FIX==='removed'){sourceOverride.files['/runamarca/'+rel]={path:'mesa-nova/'+rel+' (S3 mark fix removed)',body,sha1:createHash('sha1').update(body).digest('hex')};}}
if(FIX==='removed')sourceOverride.label='s3-mark-fix-removed';
function scenario(){
 const {room,a,b}=setup();for(const p of [a,b]){p.hand=[card('FV03',p)];p.patron.hp=60;}
 const veronica=card('FL11',a);veronica.protocolMode='escort';const row=[card('FL16',a),card('FV03',a),card('FL16',a)];row[0]=veronica;a.reserve=row;a.formation=row.map(c=>c.uid);
 b.reserve=[card('FV03',b),card('FL16',b),card('FV03',b)];b.formation=b.reserve.map(c=>c.uid);
 room.phase='formation';for(const p of [a,b]){p.ready=false;p.mana=0;}
 const pre=JSON.parse(JSON.stringify(view(room,a))),expected=[0,1].map(i=>a.formation[i]).sort();
 const begin=()=>{act(room,a,{type:'ready'},catalog);act(room,b,{type:'ready'},catalog);if(!room.combat)throw Error('combat did not start');let start=0;for(const s of room.combat.timeline){if(s.ability?.op==='combat_protocol')return {...s,start};start+=s.duration;}return null;};
 return {room,a,pre,veronica:veronica.uid,expected,begin};
}
// Page side: ordered write log + one sample per presented frame (ResizeObserver after the
// frame's rAF callbacks and layout, as in hybrid12-veronica.mjs).
function pageProbe(){
 const T=window.__trig={log:[],frames:[],uids:null,armed:false,done:false};
 const nodeRect=n=>{const r=n.getBoundingClientRect();return {x:+(r.left+r.width/2).toFixed(3),bottom:+r.bottom.toFixed(3)};};
 const markOf=n=>{const w=parseFloat(n.style.width);return {x:+(parseFloat(n.style.left)+w/2).toFixed(3),anchor:+(parseFloat(n.style.top)+w*.72).toFixed(3)};};
 const cardNode=uid=>[...document.querySelectorAll('#lanes .lane-side .card:not(.back)')].find(n=>n.dataset.uid===uid)||null;
 let serial=0;const ids=new WeakMap(),idOf=n=>{if(!ids.has(n))ids.set(n,++serial);return ids.get(n);};
 const anchors=()=>Object.fromEntries((T.uids||[]).map(u=>{const n=cardNode(u);return [u,n?{node:idOf(n),...nodeRect(n)}:null];}));
 // Every style write is kept, in order, even when several land in one task: the value a
 // record wrote is the next record's oldValue for the same node (or the current style).
 // Anchors are read once per batch, i.e. after the writing task (node already projected).
 const styleMark=css=>{const v=k=>parseFloat((css.match(new RegExp('(?:^|;)\\s*'+k+':\\s*([-\\d.e]+)px'))||[])[1]);const w=v('width');return {x:+(v('left')+w/2).toFixed(3),anchor:+(v('top')+w*.72).toFixed(3)};};
 addEventListener('DOMContentLoaded',()=>new MutationObserver(rs=>{if(!T.armed)return;const t=+performance.now().toFixed(1),post=anchors(),marks=[...document.querySelectorAll('.card-effect-veronica.ce-persistent')];
  rs.forEach((r,i)=>{const n=r.target;
   if(n===document.documentElement)T.log.push({t,seq:i,what:'html-style',zoom:n.style.getPropertyValue('--hybrid-play-scale')});
   else if(n.classList?.contains('card-effect-veronica')&&n.classList.contains('ce-persistent')){const next=rs.slice(i+1).find(x=>x.target===n),css=next?next.oldValue||'':n.getAttribute('style')||'';
    T.log.push({t,seq:i,what:'mark-style',mark:marks.indexOf(n),...styleMark(css),anchors:post});}
   // Projection targets of the hybrid table (as in the 03 trace): the .lane-side panel that
   // holds the card (its transform moves the card node) and the card's .hybrid-card-face;
   // the .card node itself is kept too. Each write is tied to the marked UIDs it carries.
   else if(n.closest?.('#lanes')){const uids=T.uids||[],holder=n.classList.contains('hybrid-card-face')?n.parentElement:n;
    const target=n.classList.contains('lane-side')?'lane-side':n.classList.contains('hybrid-card-face')?'card-face':n.classList.contains('card')?'card':null;if(!target)return;
    const carried=target==='lane-side'?uids.filter(u=>n.querySelector(`.card[data-uid="${u}"]`)):uids.includes(holder?.dataset?.uid)?[holder.dataset.uid]:[];
    if(carried.length)T.log.push({t,seq:i,what:'projection',target,uids:carried,node:target==='lane-side'?null:idOf(holder),style:(n.style.transform||'').slice(0,60)});}
  });}).observe(document.documentElement,{attributes:true,attributeFilter:['style'],attributeOldValue:true,subtree:true}));
 addEventListener('resize',()=>{if(T.armed)T.log.push({t:+performance.now().toFixed(1),what:'resize-event',vw:innerWidth});});
 let probe,width=1,toggled=false;
 const sample=()=>{const marks=[...document.querySelectorAll('.card-effect-veronica.ce-persistent')].map(n=>({...markOf(n),hidden:n.style.visibility==='hidden'}));
  T.frames.push({t:+performance.now().toFixed(1),banner:document.getElementById('battle-banner')?.textContent||'',vw:innerWidth,marks,anchors:anchors(),log:T.log.splice(0)});};
 T.start=uids=>{T.uids=uids;T.armed=true;T.log.length=0;
  probe=document.createElement('i');probe.style.cssText='position:fixed;top:0;left:0;width:1px;height:1px;visibility:hidden;contain:strict;pointer-events:none';document.body.append(probe);
  new ResizeObserver(()=>{if(!toggled||probe.offsetWidth!==width)return;toggled=false;sample();if(T.frames.length>=T.cap||T.stop){T.done=true;return;}requestAnimationFrame(tick);}).observe(probe);
  const tick=()=>{toggled=true;width=3-width;probe.style.width=width+'px';};requestAnimationFrame(tick);};
 T.cap=240;
}
// Frame verdict. Trigger (03-live-resize rep 3 order), proven only by an ordered sequence
// inside one presented frame: (1) a mark write > TOL off its owner's anchor (anchor read
// after the writing task), (2) a LATER projection write (.lane-side / .hybrid-card-face /
// .card) carrying that same owner UID, (3) the frame sample after layout. A displaced
// write without (2) is kept as "gatilho não comprovado" and is not used as a trigger.
// Owners are fixed from the first frame. Verdict: in (3) the mark is on its anchor (≤ TOL).
function analyse(frames,owners){
 const out=[];frames.forEach(f=>{f.log.forEach((e,k)=>{if(e.what!=='mark-style')return;
  // One placement writes left, top, width and height in turn (one record each); only the
  // last record of that run is the complete mark position, the earlier ones are partial.
  const nx=f.log[k+1];if(nx&&nx.what==='mark-style'&&nx.mark===e.mark&&nx.t===e.t&&nx.seq===e.seq+1)return;
  const uid=owners[e.mark],at=e.anchors?.[uid];if(!uid||!at)return;
  const off={dx:+(e.x-at.x).toFixed(3),dy:+(e.anchor-at.bottom).toFixed(3)};if(Math.abs(off.dx)<=TOL&&Math.abs(off.dy)<=TOL)return;
  const m=f.marks[e.mark],a=f.anchors[uid],err=m&&a?{dx:+(m.x-a.x).toFixed(3),dy:+(m.anchor-a.bottom).toFixed(3)}:null;
  const later=f.log.slice(k+1),projections=later.filter(x=>x.what==='projection'&&x.uids.includes(uid));
  out.push({proven:projections.length>0,status:projections.length?'gatilho comprovado':'gatilho não comprovado',presentedAt:f.t,banner:f.banner,uid,mark:e.mark,node:at.node,markWrittenAt:e.t,markWrittenSeq:e.seq,markWritten:{x:e.x,anchor:e.anchor},anchorAfterWrite:at,writeOffAnchor:off,
   projectionsAfterWrite:projections.map(x=>({t:x.t,seq:x.seq,target:x.target,node:x.node})),markRewrittenBeforePresent:later.some(x=>x.what==='mark-style'&&x.mark===e.mark),
   presented:{mark:m,anchor:a,err,onAnchor:!!err&&Math.abs(err.dx)<=TOL&&Math.abs(err.dy)<=TOL},order:f.log.map(x=>({t:x.t,seq:x.seq,what:x.what,target:x.target,uid:x.uid,uids:x.uids,mark:x.mark,node:x.node,x:x.x,y:x.anchor,zoom:x.zoom}))});});});
 return out;}
// Two separate verdicts per repetition.
// (a) Trigger: the ordered sequence above occurred during the REVELAÇÃO.
// (b) Presentation: in EVERY sampled REVELAÇÃO frame (after the frame's rAFs and layout),
//     every visible mark is on its owner's anchor (≤ TOL in x and y) — same tolerance as
//     marksMatch; a visible mark without a measurable anchor also fails.
function presentedFrames(frames,owners){
 return frames.filter(f=>f.banner==='REVELAÇÃO').map(f=>{const marks=owners.map((u,i)=>{const m=f.marks[i],a=f.anchors?.[u];if(!m)return {uid:u,missing:true,ok:false};if(m.hidden)return {uid:u,hidden:true,ok:true};
  if(!a)return {uid:u,anchor:null,ok:false};const dx=+(m.x-a.x).toFixed(3),dy=+(m.anchor-a.bottom).toFixed(3);return {uid:u,mark:{x:m.x,y:m.anchor},anchor:{x:a.x,y:a.bottom,node:a.node},dx,dy,ok:Math.abs(dx)<=TOL&&Math.abs(dy)<=TOL};});
  return {t:f.t,vw:f.vw,ok:f.marks.length===owners.length&&marks.every(m=>m.ok),count:f.marks.length,marks,events:f.log.reduce((o,e)=>{const k=e.what+(e.target?':'+e.target:'');o[k]=(o[k]||0)+1;return o;},{})};});}
function judge(id,rep,rec,frames,owners,triggers){
 const proven=triggers.filter(t=>t.proven&&t.banner==='REVELAÇÃO');rec.status=proven.length?'gatilho comprovado':'gatilho não comprovado';
 const last=frames.at(-1);rec.finalErr=last?owners.map((u,i)=>{const m=last.marks[i],a=last.anchors[u];return {uid:u,at:last.t,banner:last.banner,dx:m&&a?+(m.x-a.x).toFixed(3):null,dy:m&&a?+(m.anchor-a.bottom).toFixed(3):null};}):null;
 console.log(`${id} #${rep+1}: ${rec.status} (${proven.length} sequência(s) na REVELAÇÃO; ${triggers.length-triggers.filter(t=>t.proven).length} escrita(s) deslocada(s) sem projeção posterior)`);
 check(`${id} #${rep+1}: ordered sequence during the REVELAÇÃO — displaced mark write (> ${TOL} px) → later projection of the same UID → mark measured after layout`,proven.length>0,{status:rec.status,proven:proven.length,displacedWithoutProjection:triggers.filter(t=>!t.proven).length,frames:frames.length,banners:[...new Set(frames.map(f=>f.banner))]});
 for(const t of triggers.filter(t=>t.proven))check(`${id} #${rep+1}: write ${t.markWrittenAt} ms → presented frame ${t.presentedAt} ms (${t.banner}): mark of ${t.uid} on its anchor (≤ ${TOL} px)`,t.presented.onAnchor,{written:t.markWritten,anchorAfterWrite:t.anchorAfterWrite,writeOffAnchor:t.writeOffAnchor,presented:t.presented});
 const pf=presentedFrames(frames,owners),bad=pf.filter(f=>!f.ok);rec.revelationFrames=pf.length;rec.offAnchorFrames=bad;
 check(`${id} #${rep+1}: every sampled REVELAÇÃO frame — each visible mark on its anchor (≤ ${TOL} px)`,pf.length>0&&!bad.length,{frames:pf.length,offAnchor:bad.map(f=>({t:f.t,vw:f.vw,marks:f.marks.filter(m=>!m.ok),events:f.events}))});}
if(VERIFY){const saved=JSON.parse(fs.readFileSync(VERIFY,'utf8'));console.log('verify',VERIFY,'fix',saved.fix);
 for(const run of saved.runs){const rec={};if('servedMatches' in run)check(`${run.id} #${run.rep+1}: test page received the intended files (fix ${saved.fix})`,run.servedMatches,run.httpServed);
  judge(run.id,run.rep,rec,run.frameLog||[],run.owners||[],analyse(run.frameLog||[],run.owners||[]));}
 const failed=H.checks.filter(c=>!c.pass);console.log(`${H.checks.length-failed.length}/${H.checks.length} checks (re-judged from saved frameLog)`);process.exit(failed.length?1:0);}
const browser=await launch(),report={fix:FIX,served,source:sourceOverride.label,runs:[]};
try{for(let rep=0;rep<REPEAT;rep++){
 const id='1280x720-a-escort-lane0',s=scenario();
 const {context,page}=await open(browser,{width:1280,height:720},{errors:H.errors,gpu:H.gpu,url:URL_HYBRID,initPath:{content:`(${pageProbe.toString()})();`}});
  await paint(page,{...s.pre,serverNow:Date.now()},600);
 const step=s.begin(),feed=poll(page,()=>view(s.room,s.a)),rec={rep,id,veronica:s.veronica,expected:s.expected,stepStart:step?.start};report.runs.push(rec);
 // REVELAÇÃO with both marks positioned on their owners (same 1 px rule).
 const ready=await page.waitForFunction(n=>{const ms=[...document.querySelectorAll('.card-effect-veronica.ce-persistent')];return document.getElementById('battle-banner')?.textContent==='REVELAÇÃO'&&ms.length===n&&ms.every(m=>Number.isFinite(parseFloat(m.style.left)));},s.expected.length,{polling:'raf',timeout:(step?.start||0)+8000}).then(()=>true,()=>false);
 check(`${id} #${rep+1}: REVELAÇÃO reached with one positioned mark per beneficiary`,ready);
 if(!ready){await feed.stop();await context.close();continue;}
 const owners=await page.waitForFunction(uids=>{const ms=[...document.querySelectorAll('.card-effect-veronica.ce-persistent')].map(n=>{const w=parseFloat(n.style.width);return {x:parseFloat(n.style.left)+w/2,anchor:parseFloat(n.style.top)+w*.72};});
  const o=ms.map(m=>uids.find(u=>{const n=[...document.querySelectorAll('#lanes .lane-side .card:not(.back)')].find(x=>x.dataset.uid===u);if(!n)return false;const r=n.getBoundingClientRect();return Math.abs(r.left+r.width/2-m.x)<=1&&Math.abs(r.bottom-m.anchor)<=1;})||null);return o.length===uids.length&&o.every(Boolean)&&o;},s.expected,{polling:'raf',timeout:1500}).then(h=>h.jsonValue(),()=>[null,null]);
 rec.owners=owners;check(`${id} #${rep+1}: marks owned by the engine beneficiaries before the trigger`,JSON.stringify([...owners].sort())===JSON.stringify(s.expected),owners);
 await page.evaluate(uids=>window.__trig.start(uids),s.expected);
 // Real table flow: the window is resized during the REVELAÇÃO (same move as the
 // 1280x720 run of hybrid12-veronica.mjs); sampling continues to the end of the step.
 await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 // Let one polled render reach the table at the current size first (≤ 600 ms, the step's
 // own timing is untouched); the resize then follows inside the same REVELAÇÃO.
 await page.waitForFunction(()=>[...window.__trig.frames.flatMap(f=>f.log),...window.__trig.log].some(x=>x.what==='projection'),null,{polling:50,timeout:600}).catch(()=>{});
 await page.setViewportSize({width:1440,height:900});
 await page.waitForFunction(()=>{const T=window.__trig;if(T.frames.length&&T.frames.at(-1).banner!=='REVELAÇÃO')T.stop=true;return T.done;},null,{polling:200,timeout:12000}).catch(()=>{});
 const frames=await page.evaluate(()=>window.__trig.frames);await feed.stop();
 const triggers=analyse(frames,owners);rec.frames=frames.length;rec.frameLog=frames;rec.triggers=triggers;
 // Bytes the test page actually receives for the two files (through the same route).
 const httpServed=await page.evaluate(async paths=>{const o={};for(const p of paths){const b=await (await fetch(p)).arrayBuffer();o[p]=[...new Uint8Array(await crypto.subtle.digest('SHA-256',b))].map(x=>x.toString(16).padStart(2,'0')).join('');}return o;},Object.keys(served));rec.httpServed=httpServed;
 rec.servedMatches=Object.entries(served).every(([p,v])=>httpServed[p]===v.served);
 check(`${id} #${rep+1}: test page received the intended files (fix ${FIX})`,rec.servedMatches,{httpServed,expected:Object.fromEntries(Object.entries(served).map(([p,v])=>[p,v.served]))});
 judge(id,rep,rec,frames,owners,triggers);
 await context.close();
}}finally{await browser.close();}
writeJSON(`${out}/veronica-trigger-detail.json`,report);
finish(out,'veronica-trigger',H,{fix:FIX,served,runs:report.runs.map(r=>({rep:r.rep,owners:r.owners,status:r.status,finalErr:r.finalErr,offAnchorFrames:r.offAnchorFrames,frames:r.frames,triggers:(r.triggers||[]).map(({order,...t})=>t)}))});
