// Revisão 12 (continuação): instrumentação de QA da Verônica, injetada pelo harness com
// page.addInitScript({path}). Não altera o produto: só observa. Registra em window.__vtrace
//  - scenes: cada chamada a RunaPlatinumEntry.empower (criação/remoção da camada
//    .platinum-protocol-scene, duração e estado das animações, primeiro valid()===false,
//    primeira perda da fonte, motivo do encerramento);
//  - events: resize, scroll, mudanças de visualGeneration/fase/combate, clear(), marcas
//    persistentes da Verônica (UIDs pedidos ao RunaCardEffects.sync e nós criados/removidos);
//  - frames: [t, dt, builds, bridgeMs] por requestAnimationFrame (custo das reconstruções).
(()=>{
 const T=window.__vtrace={events:[],frames:[],scenes:[]},now=()=>+performance.now().toFixed(1),log=(type,d={})=>T.events.push({t:now(),type,...d});
 const ctx=()=>({gen:typeof visualGeneration!=='undefined'?visualGeneration:null,phase:typeof state!=='undefined'?state?.phase??null:null,combat:typeof state!=='undefined'?state?.combat?.id??null:null});
 // Combat step the client presents (app.js lastBattleStep = combat:index:revealStage) and
 // the clock offset it used; logged on change, to detect a step index going backwards.
 let prevStep='';const stepLog=()=>{const k=typeof lastBattleStep!=='undefined'?lastBattleStep:'';if(k!==prevStep){prevStep=k;log('step',{key:k.split(':').slice(1).join(':'),offset:typeof serverClockOffset!=='undefined'?serverClockOffset:null});}};
 addEventListener('resize',()=>log('resize',{w:innerWidth,h:innerHeight,scene:!!document.querySelector('.platinum-protocol-scene')}));
 addEventListener('scroll',()=>log('scroll',{y:scrollY,scene:!!document.querySelector('.platinum-protocol-scene')}),{passive:true});
 let last=0,prev='';const loop=t=>{const s=window.RunaHybrid?.stats;T.frames.push([+t.toFixed(1),+(t-last).toFixed(1),s?.builds??null,s?.bridgeMs!=null?+s.bridgeMs.toFixed(1):null]);if(T.frames.length>6000)T.frames.shift();last=t;
  const c=ctx(),key=JSON.stringify(c);if(key!==prev){prev=key;log('context',c);}stepLog();requestAnimationFrame(loop);};requestAnimationFrame(loop);
 // Persistent Verônica marks: nodes added/removed under <body>.
 new MutationObserver(list=>{for(const m of list){for(const n of m.addedNodes)if(n.classList?.contains('card-effect-veronica')&&n.classList.contains('ce-persistent'))log('mark+');for(const n of m.removedNodes){if(n.classList?.contains?.('card-effect-veronica')&&n.classList.contains('ce-persistent'))log('mark-');else{const k=n.querySelectorAll?.('.card-effect-veronica.ce-persistent').length;if(k)log('mark-',{withLayer:k});}}}}).observe(document,{childList:true,subtree:true});
 const hook=(name,wrap)=>{let value;Object.defineProperty(window,name,{configurable:true,enumerable:true,get(){return value;},set(v){if(v&&!v.__vtraced){wrap(v);v.__vtraced=true;}value=v;}});};
 hook('RunaCardEffects',api=>{const sync=api.sync,clear=api.clear;let lastUids='';
  api.sync=function(arg={}){const uids=(arg.items||[]).filter(i=>i.kind==='veronica').map(i=>i.uid).sort().join(',');if(uids!==lastUids){lastUids=uids;log('mark-items',{uids:uids?uids.split(','):[]});}return sync.apply(this,arguments);};
  api.clear=function(){log('effects-clear',ctx());lastUids='';return clear.apply(this,arguments);};});
 hook('RunaPlatinumEntry',api=>{const empower=api.empower,clear=api.clear;
  api.clear=function(){log('platinum-clear',{...ctx(),scenes:document.querySelectorAll('.platinum-protocol-scene').length});return clear.apply(this,arguments);};
  api.empower=function(opts={}){
   stepLog();const rec={id:T.scenes.length,called:now(),mode:opts.mode,targets:(opts.targets||[]).length,ctx:ctx(),step:prevStep,offset:typeof serverClockOffset!=='undefined'?serverClockOffset:null};T.scenes.push(rec);
   const valid=opts.valid||(()=>true),source=opts.source;
   const wrapped={...opts,valid:()=>{const ok=valid();if(!ok&&rec.invalidAt==null){rec.invalidAt=now();rec.invalidCtx=ctx();}return ok;},
    source:typeof source==='function'?()=>{const n=source();if((!n||!n.isConnected)&&rec.sourceLostAt==null){rec.sourceLostAt=now();rec.sourceLostCtx=ctx();}return n;}:source};
   const before=new Set(document.querySelectorAll('.platinum-protocol-scene')),result=empower.call(this,wrapped),layer=[...document.querySelectorAll('.platinum-protocol-scene')].find(n=>!before.has(n));
   rec.layer=!!layer;
   if(layer){rec.created=now();const anims=layer.getAnimations({subtree:true});rec.animations=anims.length;rec.durations=[...new Set(anims.map(a=>a.effect.getTiming().duration))];rec.rails=layer.querySelectorAll('.protocol-link').length;rec.outcomes={finished:0,cancelled:0};
    for(const a of anims)a.finished.then(()=>rec.outcomes.finished++,()=>rec.outcomes.cancelled++);
    const sample=()=>{if(!layer.isConnected)return;const a=layer.getAnimations({subtree:true});rec.last={t:now(),n:a.length,states:[...new Set(a.map(x=>x.playState))],currentTime:a.length?Math.max(...a.map(x=>+x.currentTime||0)):null};requestAnimationFrame(sample);};sample();
    new MutationObserver((m,o)=>{if(!layer.isConnected){rec.removed=now();rec.removedCtx=ctx();o.disconnect();}}).observe(document.body,{childList:true});}
   Promise.resolve(result).then(r=>{rec.resolved=now();rec.result=r;
    // empower() resolves true in every path; the reason is inferred from what was observed.
    setTimeout(()=>{rec.reason=rec.invalidAt!=null&&rec.invalidAt<=rec.resolved?'invalid':rec.sourceLostAt!=null&&rec.sourceLostAt<=rec.resolved?'source-lost':rec.outcomes&&rec.outcomes.cancelled===0&&rec.outcomes.finished===rec.animations?'animations-finished':'cleared-or-other';rec.lifetime=rec.removed!=null&&rec.created!=null?+(rec.removed-rec.created).toFixed(1):null;},0);});
   return result;};});
})();
