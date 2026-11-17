/* Start the personal deadline only after the local presentation and card deals. */
(function(root){
 let pending=false;
 async function tick(){
  const s=typeof state==='undefined'?null:state,p=typeof seat==='function'?seat():null,node=document.getElementById('mulligan-timer');
  const choosing=s?.phase==='mulligan'&&!s.spectator&&!p?.mulliganReady;
  const presenting=typeof patronIntroActive!=='undefined'&&patronIntroActive;
  if(node){
   node.hidden=!choosing||presenting||p?.mulliganStartedAt==null;
   if(!node.hidden&&s.turnClock){
    const paused=s.tutorial?.clock?.paused,now=paused?s.tutorial.clock.now:Date.now()-serverClockOffset;
    const seconds=Math.max(0,Math.ceil((s.turnClock.endsAt-now)/1000));
    node.textContent=paused?'Tutorial pausado':`${seconds}s para escolher · Ao terminar, sua mão será mantida.`;
    node.classList.toggle('urgent',!paused&&seconds<=10);
   }
  }
  if(!choosing||presenting||s.tutorial?.clock?.paused||pending||p.mulliganStartedAt!=null||commandBusy)return;
  pending=true;const key=s.matchId,generation=visualGeneration;
  try{
   await visualQueue;
   if(generation===visualGeneration&&state?.matchId===key&&state.phase==='mulligan'&&!state.tutorial?.clock?.paused&&!patronIntroActive&&!seat()?.mulliganReady&&seat()?.mulliganStartedAt==null&&!commandBusy)await command({type:'openingReady'});
  }finally{pending=false;}
 }
 setInterval(tick,250);
})(globalThis);
