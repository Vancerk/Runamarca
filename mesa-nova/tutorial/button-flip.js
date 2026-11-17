// Claude review round 3 (owner): turn actions flip like a Hearthstone end-turn button. On press, a presentation copy laid
// over the button rotates its face away and shows the back with what comes next. The click itself is untouched and goes
// to the server immediately; the copy has no pointer events. Reduced motion: no flip.
// 11/11/2026 (dono): frente e verso são UMA peça. Antes, a cópia girava por cima do botão real, que já mostrava o estado
// seguinte por baixo — pareciam dois botões empilhados. Agora, enquanto gira, os botões reais da placa ficam ocultos; o
// verso é preenchido com o botão que o jogo de fato desenhou depois do clique (texto e estilo), e no fim a peça é trocada
// pelo botão real no mesmo lugar, sem esmaecer. Se a resposta demorar, o verso fica com o rótulo previsto até ela chegar.
(function(){
 const FLIP=520,HOLD_MAX=1600;
 const backLabel=(button)=>{const phase=typeof state!=='undefined'?state?.phase:null,primary=button.classList.contains('primary'),t=(button.textContent||'').trim().toLowerCase();
  if(phase==='vote')return primary||/come[cç]ar|combater$/.test(t)&&!/n[aã]o/.test(t)?'Combate':'Sem combate';
  if(phase==='formation')return 'Aguardando o rival';
  if(phase==='prep')return 'Vez do oponente';return null;};
 const panel=()=>document.getElementById('phase-actions');
 let active=null;
 function styleFace(face,button,k){const cs=getComputedStyle(button),px=v=>(parseFloat(v)||0)*k+'px';
  // The computed font shorthand can serialise as empty; copy the longhands so both faces keep the button type size.
  // The table is CSS-zoomed (.board zoom), so computed sizes are unzoomed: scale them by the on-screen/offset ratio.
  Object.assign(face.style,{fontFamily:cs.fontFamily,fontSize:px(cs.fontSize),fontWeight:cs.fontWeight,fontStyle:cs.fontStyle,letterSpacing:cs.letterSpacing==='normal'?'normal':px(cs.letterSpacing),lineHeight:cs.lineHeight==='normal'?'normal':px(cs.lineHeight),textTransform:cs.textTransform,fontVariantCaps:cs.fontVariantCaps,borderRadius:px(cs.borderTopLeftRadius)});
  face.classList.toggle('is-primary',button.classList.contains('primary')&&!button.disabled);face.classList.toggle('is-disabled',button.disabled);}
 function finish(record){if(active!==record)return;active=null;record.observer.disconnect();clearTimeout(record.timer);record.stage.remove();document.body.classList.remove('turn-flipping');}
 document.addEventListener('click',e=>{
  const button=e.target.closest?.('#phase-actions button');if(!button||button.disabled||button.getAttribute('aria-disabled')==='true'||active)return;
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;const back=backLabel(button);if(!back)return;
  const r=button.getBoundingClientRect();if(!r.width||!r.height)return;const k=button.offsetWidth?r.width/button.offsetWidth:1;
  const stage=document.createElement('div');stage.className='turn-flip';stage.setAttribute('aria-hidden','true');
  Object.assign(stage.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});
  const card=document.createElement('div');card.className='turn-flip-card';
  const front=document.createElement('div');front.className='turn-flip-face turn-flip-front';front.textContent=(button.textContent||'').trim();styleFace(front,button,k);
  const rear=document.createElement('div');rear.className='turn-flip-face turn-flip-back is-disabled';rear.textContent=back;styleFace(rear,button,k);rear.classList.add('is-disabled');rear.classList.remove('is-primary');
  card.append(front,rear);stage.append(card);document.body.append(stage);document.body.classList.add('turn-flipping');
  const record={stage,rear,real:null,flipped:false,observer:null,timer:0};active=record;
  // o verso passa a ser o botão que o jogo desenhou de fato (o primeiro da placa nova, no mesmo lugar)
  const adopt=()=>{const next=[...(panel()?.querySelectorAll('button')||[])].find(b=>b!==button&&b.isConnected&&b.getBoundingClientRect().width);if(!next)return false;
   const nr=next.getBoundingClientRect(),nk=next.offsetWidth?nr.width/next.offsetWidth:1;rear.textContent=(next.textContent||'').trim();styleFace(rear,next,nk);record.real=next;
   if(Math.abs(nr.left-r.left)>1||Math.abs(nr.top-r.top)>1||Math.abs(nr.width-r.width)>1||Math.abs(nr.height-r.height)>1)stage.animate([{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'},{left:nr.left+'px',top:nr.top+'px',width:nr.width+'px',height:nr.height+'px'}],{duration:record.flipped?160:Math.max(160,FLIP*.5),easing:'ease-out',fill:'forwards'});
   if(record.flipped)finish(record);return true;};
  record.observer=new MutationObserver(()=>{if(!button.isConnected||!panel()?.contains(button))adopt();});record.observer.observe(panel()||document.body,{childList:true,subtree:true});
  card.animate([{transform:'rotateX(0deg)'},{transform:'rotateX(100deg)',offset:.5},{transform:'rotateX(180deg)'}],{duration:FLIP,easing:'cubic-bezier(.3,.1,.25,1)',fill:'forwards'}).finished.then(()=>{record.flipped=true;
   if(record.real||!button.isConnected&&adopt())finish(record);else record.timer=setTimeout(()=>finish(record),HOLD_MAX);},()=>finish(record));
 },true);
 // mudança de partida, aba oculta: nada fica preso
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&active)finish(active);});
 window.RunaButtonFlip={get active(){return !!active;}};
})();
