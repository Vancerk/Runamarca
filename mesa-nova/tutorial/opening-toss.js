/* Abertura da partida (09/11/2026). A moeda é lançada em primeiro plano enquanto as cartas iniciais chegam por trás de
   um desfoque suave. Com o resultado, a moeda se dissipa e o desfoque sai ao mesmo tempo, deixando a mão inicial nítida
   e interativa. Só apresentação: a ordem já veio decidida pelo servidor (evento 'coin'); nada aqui muda o estado.
   Um palco por vez; ele se desfaz sozinho se a partida mudar (alive() falso) e respeita prefers-reduced-motion.

   Fluidez: o primeiro desenho da mão inicial (cinco cartas grandes sobre a mesa desfocada) custa ao navegador duas
   pausas de ~0,3 s. Antes isso caía em cima da moeda já no ar. Agora o véu entra primeiro e a moeda só é lançada —
   junto com as cartas, que esperam `begun` — depois que as faces estão prontas e os quadros voltaram ao ritmo normal.
   A moeda (96 faces de borda e duas texturas de 768 px) também é montada nessa espera, parada e a 1% de opacidade,
   para o navegador a desenhar antes do lançamento; o painel da mão inicial usa o mesmo recurso (opening-deal.css). */
(function(root){
 const TIMING=Object.freeze({enter:220,land:1920,toss:2400,hold:520,leave:460,reducedHold:1300,cap:6500,readyCap:1400,settleCap:1200});
 let active=null,serial=0;
 const stats={started:0,finished:0,cancelled:0,last:null};
 const reduce=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 const el=(tag,klass,text)=>{const n=document.createElement(tag);if(klass)n.className=klass;if(text!==undefined)n.textContent=text;return n;};
 const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 // Resolve depois de `calm` quadros seguidos dentro do ritmo (ou no teto): o navegador terminou o desenho pesado.
 function settle(calm=4,limit=34,cap=TIMING.settleCap){return new Promise(resolve=>{const from=performance.now();let last=from,ok=0;const tick=now=>{ok=now-last<limit?ok+1:0;last=now;if(ok>=calm||now-from>cap)resolve(Math.round(now-from));else requestAnimationFrame(tick);};requestAnimationFrame(tick);});}
 function motes(stage){
  const box=el('div','opening-toss-motes');stage.append(box);
  for(let i=0;i<14;i++){const m=el('i'),angle=i*2.39996+.4,radius=90+(i%5)*26;box.append(m);
   m.animate([{transform:'translate(-50%,-50%) scale(1)',opacity:.95},{transform:'translate(calc(-50% + '+Math.cos(angle)*radius+'px),calc(-50% + '+(Math.sin(angle)*radius*.7-34)+'px)) scale(.2)',opacity:0}],{duration:TIMING.leave+(i%4)*60,delay:(i%3)*25,easing:'cubic-bezier(.15,.6,.35,1)',fill:'both'});}
 }
 function cancel(){if(!active)return;const record=active;active=null;record.cancelled=true;stats.cancelled++;record.cleanup();record.release();}
 /* start({back,title,detail,ready,alive,sound}) → {begun,done,waitFor(promise),cancel}
    back: face que cai para cima (verso quando o rival começa); title/detail: resultado mostrado ao pousar;
    ready: promessa opcional (faces das cartas pintadas) aguardada antes do lançamento;
    alive: () => boolean, falso quando a apresentação desta partida foi invalidada.
    begun resolve quando a moeda parte (as cartas partem junto); done, quando o palco saiu. */
 function start({back=false,title='',detail='',ready=null,alive=()=>true,sound=()=>{}}={}){
  cancel();
  const overlay=document.getElementById('mulligan-overlay'),quiet=reduce(),id=++serial,holds=[];
  const stage=el('div','opening-toss-stage'+(quiet?' is-reduced':''));stage.dataset.face=back?'back':'front';
  const veil=el('div','opening-toss-veil'),caption=el('p','opening-toss-caption'),lead=el('span','opening-toss-lead','A moeda decide quem começa'),result=el('strong','',title),extra=el('small','',detail);
  caption.setAttribute('role','status');caption.setAttribute('aria-live','polite');caption.append(lead);
  const coin=root.RunaCoinVolume.create({back});stage.classList.add('is-priming');stage.append(veil,coin);document.body.append(stage);overlay?.classList.add('opening-toss');
  let finish,begin;const done=new Promise(r=>finish=r),begun=new Promise(r=>begin=r),created=performance.now();
  const record={id,cancelled:false,release(){begin(false);finish();},cleanup(){clearInterval(watch);stage.getAnimations({subtree:true}).forEach(a=>a.cancel());stage.remove();overlay?.classList.remove('opening-toss');}};
  active=record;stats.started++;stats.last={id,back,quiet,primedMs:null,landedAt:null,leaveAt:null,endedAt:null};const mine=stats.last;
  const watch=setInterval(()=>{if(active===record&&!alive())cancel();},100);
  const running=()=>active===record&&!record.cancelled;
  (async()=>{
   if(!quiet)veil.animate([{opacity:0},{opacity:1}],{duration:TIMING.enter,easing:'ease-out',fill:'both'});
   await Promise.race([Promise.resolve(ready).catch(()=>{}),wait(TIMING.readyCap)]);if(!running())return;
   await settle();if(!running())return;
   mine.primedMs=Math.round(performance.now()-created);
   const t0=performance.now();stage.classList.remove('is-priming');stage.append(caption);sound();begin(true);
   await wait(quiet?0:TIMING.land);if(!running())return;
   mine.landedAt=Math.round(performance.now()-t0);stage.classList.add('has-landed');caption.replaceChildren(result,...(detail?[extra]:[]));
   await wait(quiet?TIMING.reducedHold:TIMING.toss-TIMING.land+TIMING.hold);if(!running())return;
   // As cartas pousam antes de o desfoque sair; o teto evita uma abertura presa por uma promessa que nunca termina.
   await Promise.race([Promise.allSettled(holds),wait(Math.max(0,TIMING.cap-(performance.now()-t0)))]);if(!running())return;
   mine.leaveAt=Math.round(performance.now()-t0);overlay?.classList.remove('opening-toss');
   if(!quiet){motes(stage);
    coin.animate([{opacity:1,transform:'scale(1)'},{opacity:0,transform:'scale(1.24)'}],{duration:TIMING.leave,easing:'cubic-bezier(.3,0,.6,1)',fill:'both'});
    caption.animate([{opacity:1},{opacity:0}],{duration:TIMING.leave*.7,fill:'both'});
    veil.animate([{opacity:1},{opacity:0}],{duration:TIMING.leave,easing:'ease-in-out',fill:'both'});
    await wait(TIMING.leave+120);}
   if(!running())return;
   mine.endedAt=Math.round(performance.now()-t0);active=null;stats.finished++;record.cleanup();finish();
  })();
  return {begun,done,waitFor(promise){if(promise&&typeof promise.then==='function')holds.push(promise);},cancel(){if(active===record)cancel();}};
 }
 root.RunaOpeningToss={start,cancel,settle,TIMING,get active(){return !!active;},get stats(){return {...stats,last:stats.last?{...stats.last}:null};}};
})(globalThis);
