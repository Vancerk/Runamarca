import {HYBRID} from './config.js';
// Formation addendum, block B: focus of the formation. Presentation only; nothing here reads hidden data or sends
// commands. The focus starts when the engine enters 'formation' (fog, secret positions) and stays through
// 'resolving' until the last casualty flight / card return of that combat is gone (bounded by holdMaxMs); vote and
// the normal preparation keep the normal framing, and leaving the match (lobby, finished, hidden table) drops it.
// `value` goes 0 → 1 in HYBRID.focus.ms (ease-out) and the bridge reads it on every build: field expansion
// (desktop), side panels pushed out, confirmation at the field's lower right corner, veil over the decoration.
// Reduced motion: direct change of contrast and state (value jumps). Phones: no expansion (no room); the hand is
// lowered to a strip and the page is scrolled once per formation so the own reserve, the own sockets and the
// confirmation are on screen together.
export function installFocus({sync,lifecycle}){
 const F=HYBRID.focus,game=document.getElementById('game'),body=document.body,history=[];
 let value=0,target=0,from=0,t0=0,raf=0,lastPhase='',holdUntil=0,recheck=0,scrolledFor='',transitions=0,subscribed=false;
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 const flying=()=>(globalThis.RunaDeathArc?.active||0)>0||Boolean(document.querySelector('#visual-layer .card-flight,#visual-layer .visual-dead'));
 function wanted(){
  if(!state?.players?.length||game.hidden)return 0;
  const p=state.phase;if(p==='formation'||p==='resolving')return 1;
  if(p==='prep'&&performance.now()<holdUntil&&flying())return 1;
  return 0;}
 function animate(){
  cancelAnimationFrame(raf);from=value;t0=performance.now();transitions++;history.push({target,at:Math.round(t0),phase:state?.phase||''});if(history.length>30)history.shift();
  if(reduced()||F.ms<=0){value=target;sync();return;}
  // The transition clock begins on its first painted frame, after the phase DOM
  // has settled. Work done by render() must not consume the first half of the move.
  let firstFrame=true;
  /* Round 2: the first painted frame only starts the clock; render() has just built the scene with the same focus value, so a second full build here only lengthened the hitch when the formation fog appears. */const step=now=>{if(firstFrame){firstFrame=false;t0=performance.now();raf=requestAnimationFrame(step);return;}const k=Math.max(0,Math.min(1,(now-t0)/F.ms)),e=1-Math.pow(1-k,3);value=from+(target-from)*e;sync();if(k<1)raf=requestAnimationFrame(step);else raf=0;};
  raf=requestAnimationFrame(step);}
 function mobileScroll(){
  if(innerWidth>900||state?.phase!=='formation'||seat()?.ready)return;const key=[state.code,state.matchId,state.round].join(':');if(scrolledFor===key)return;scrolledFor=key;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{const reserve=document.querySelector('.reserve-camp.self-camp');if(!reserve)return;const r=reserve.getBoundingClientRect(),bottom=innerHeight-F.mobileHandStripPx-6,delta=r.bottom-bottom;if(Math.abs(delta)>2)scrollBy({top:delta,behavior:reduced()?'auto':'smooth'});}));}
 function update(){
  if(!subscribed&&globalThis.RunaDeathArc){subscribed=true;RunaDeathArc.onChange(()=>update());}
  const phase=state?.phase||'';if(lastPhase==='resolving'&&phase!=='resolving')holdUntil=performance.now()+F.holdMaxMs;lastPhase=phase;
  const want=wanted();body.classList.toggle('hybrid-focus',want===1);body.classList.toggle('hybrid-focus-formation',want===1&&phase==='formation');
  // Leaving the table is immediate. The 400-ms return belongs only to a match
  // that remains visible after combat; it must not outlive a hidden/lobby view.
  const leaving=game.hidden||!state?.players?.length||phase==='lobby'||phase==='finished';
  if(leaving){const changed=value!==0||target!==0;cancelAnimationFrame(raf);raf=0;value=target=from=0;holdUntil=0;if(changed)sync();}
  else if(want!==target){target=want;animate();}
  clearTimeout(recheck);if(target===1&&phase==='prep')recheck=setTimeout(update,150);
  if(want===1)mobileScroll();}
 lifecycle.addHook({after:update});new MutationObserver(()=>update()).observe(game,{attributes:true,attributeFilter:['hidden']});addEventListener('pagehide',()=>{cancelAnimationFrame(raf);clearTimeout(recheck);});
 const api={get value(){return value;},get target(){return target;},update,get stats(){return {value,target,transitions,holdUntil,flying:flying(),history:history.slice()};}};
 window.RunaHybridFocus=api;return api;
}
