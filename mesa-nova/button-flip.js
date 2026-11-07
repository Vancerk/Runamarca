// Claude review round 3 (owner): turn actions flip like a Hearthstone end-turn button. On press, a presentation copy laid
// over the button rotates its face away and shows the back with what comes next. The click itself is untouched and goes
// to the server immediately; the copy has no pointer events and disappears by itself. Reduced motion: no flip.
(function(){
 const backLabel=(button)=>{const phase=typeof state!=='undefined'?state?.phase:null,primary=button.classList.contains('primary'),t=(button.textContent||'').trim().toLowerCase();
  if(phase==='vote')return primary||/come[cç]ar|combater$/.test(t)&&!/n[aã]o/.test(t)?'Combate':'Sem combate';
  if(phase==='formation')return 'Aguardando o rival';
  if(phase==='prep')return 'Vez do oponente';return null;};
 document.addEventListener('click',e=>{
  const button=e.target.closest?.('#phase-actions button');if(!button||button.disabled||button.getAttribute('aria-disabled')==='true')return;
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;const back=backLabel(button);if(!back)return;
  const r=button.getBoundingClientRect();if(!r.width||!r.height)return;const cs=getComputedStyle(button);
  const stage=document.createElement('div');stage.className='turn-flip';stage.setAttribute('aria-hidden','true');
  Object.assign(stage.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});
  const card=document.createElement('div');card.className='turn-flip-card';
  const front=document.createElement('div');front.className='turn-flip-face turn-flip-front'+(button.classList.contains('primary')?' is-primary':'');front.textContent=(button.textContent||'').trim();
  const rear=document.createElement('div');rear.className='turn-flip-face turn-flip-back';rear.textContent=back;
  // The computed font shorthand can serialise as empty; copy the longhands so both faces keep the button type size.
  // The table is CSS-zoomed (.board zoom), so computed sizes are unzoomed: scale them by the on-screen/offset ratio.
  const k=button.offsetWidth?r.width/button.offsetWidth:1,px=v=>(parseFloat(v)||0)*k+'px';
  for(const face of [front,rear])Object.assign(face.style,{fontFamily:cs.fontFamily,fontSize:px(cs.fontSize),fontWeight:cs.fontWeight,fontStyle:cs.fontStyle,letterSpacing:cs.letterSpacing==='normal'?'normal':px(cs.letterSpacing),lineHeight:cs.lineHeight==='normal'?'normal':px(cs.lineHeight),textTransform:cs.textTransform,fontVariantCaps:cs.fontVariantCaps,borderRadius:px(cs.borderTopLeftRadius)});
  card.append(front,rear);stage.append(card);document.body.append(stage);
  const a=card.animate([{transform:'rotateX(0deg)'},{transform:'rotateX(100deg)',offset:.5},{transform:'rotateX(180deg)'}],{duration:520,easing:'cubic-bezier(.3,.1,.25,1)',fill:'forwards'});
  a.finished.then(()=>new Promise(res=>setTimeout(res,650))).then(()=>stage.animate([{opacity:1},{opacity:0}],{duration:220,fill:'forwards'}).finished).finally(()=>stage.remove());
 },true);
})();
