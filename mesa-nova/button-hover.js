/* Hover dos botões de madeira (09/11/2026), a partir do vídeo de referência do dono: ao passar o ponteiro, a FACE do
   botão acende e faz uma oscilação curta em perspectiva; a estrutura externa (aro, chanfro e filete de prata) não se
   move. Só apresentação: nenhum clique, foco, texto ou tamanho do botão muda.

   Como: os botões são uma peça única (border-image com control-wood*.svg). Durante o hover, um filho decorativo
   (aria-hidden, sem eventos, sem texto próprio) cobre só a face: um fundo escuro (o rebaixo que aparece quando a face
   inclina) e, por cima, uma cópia da face recortada por dentro do aro, com a mesma arte, a mesma letra na mesma
   posição (medida do texto real) e uma luz quente. É essa cópia que oscila. O texto dela vem de attr(data-label), de
   modo que button.textContent continua igual.

   Detalhes de comportamento:
   - vale para todo botão/link cuja arte computada é control-wood*.svg e cujo conteúdo é só texto; os demais ficam como estão;
   - quando a mesa é redesenhada com o ponteiro parado, o botão novo no mesmo lugar e com o mesmo rótulo é adotado em
     silêncio: a luz continua e a oscilação não se repete (se o redesenho cair no meio da oscilação, ela segue do
     mesmo ponto no botão novo, sem recomeçar nem ser cortada);
   - toque não tem hover; teclado: o foco visível acende a face e oscila uma vez;
   - prefers-reduced-motion: a face só acende, sem oscilar. */
(function(root){
 // FACE_INSET: na arte (control-wood*.svg, fatias de 12) o aro e o filete de prata ocupam os 5 primeiros px; a face começa no 6º.
 // 10/11/2026 (dono): a oscilação estava rápida demais para ser lida; passou de 200 para 420 ms, com mais um balanço.
 const TIMING=Object.freeze({wobble:420,light:140,leave:160}),FACE_INSET=6/12,stats={wobbles:0,lit:0,adopted:0,ended:0};
 let session=null,point=null;
 const reduce=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 const wood=node=>{const b=node?.closest?.('button,a');if(!b||b.disabled||b.getAttribute('aria-disabled')==='true'||b.childElementCount>(b.querySelector(':scope>.wood-hover')?1:0))return null;
  const art=getComputedStyle(b).borderImageSource;return /control-wood/.test(art)&&(b.textContent||'').trim()?b:null;};
 const label=b=>(b.textContent||'').trim();
 function build(b){
  const cs=getComputedStyle(b),r=b.getBoundingClientRect(),k=b.offsetWidth?r.width/b.offsetWidth:1,w=r.width/k,h=r.height/k;if(!w||!h)return null;
  // posição do texto real, em px do próprio botão (a mesa pode estar com zoom de CSS)
  const node=[...b.childNodes].find(n=>n.nodeType===3&&n.nodeValue.trim());if(!node)return null;
  const range=document.createRange();range.selectNodeContents(node);const t=range.getBoundingClientRect();if(!t.width||!t.height)return null;
  const holder=document.createElement('i'),well=document.createElement('i'),halo=document.createElement('i'),face=document.createElement('i'),light=document.createElement('i'),text=document.createElement('i');
  holder.className='wood-hover';holder.setAttribute('aria-hidden','true');well.className='wood-hover-well';halo.className='wood-hover-halo';face.className='wood-hover-face';light.className='wood-hover-light';text.className='wood-hover-text';text.dataset.label=label(b);
  const inset=(parseFloat(cs.borderImageWidth)||12)*FACE_INSET,bl=parseFloat(cs.borderLeftWidth)||0,bt=parseFloat(cs.borderTopWidth)||0;
  Object.assign(holder.style,{left:-bl+'px',top:-bt+'px',width:w+'px',height:h+'px'});holder.style.setProperty('--wood-inset',inset+'px');holder.style.setProperty('--wood-radius',Math.max(2,(parseFloat(cs.borderTopLeftRadius)||6)-inset*.5)+'px');
  Object.assign(face.style,{borderImageSource:cs.borderImageSource,borderImageSlice:cs.borderImageSlice,borderImageWidth:cs.borderImageWidth,borderImageRepeat:cs.borderImageRepeat});
  Object.assign(text.style,{left:(t.left-r.left)/k+'px',top:(t.top-r.top)/k+'px',width:t.width/k+'px',height:t.height/k+'px',lineHeight:t.height/k+'px'});
  face.append(light,text);holder.append(well,halo,face);
  return {holder,face,light,halo,dark:/control-wood-dark/.test(cs.borderImageSource)};
 }
 // Tempo linear, com saída suave em cada trecho: inclina (pico aos ~95 ms), volta passando do ponto (~210 ms), um
 // balanço menor (~310 ms) e assenta aos 420 ms.
 const WOBBLE=[
  {transform:'perspective(420px) rotateX(0deg) rotateY(0deg) scale(1)',easing:'ease-out'},
  {transform:'perspective(420px) rotateX(-18deg) rotateY(11deg) scale(.97)',offset:.22,easing:'ease-in-out'},
  {transform:'perspective(420px) rotateX(10deg) rotateY(-6deg) scale(1.01)',offset:.5,easing:'ease-in-out'},
  {transform:'perspective(420px) rotateX(-5deg) rotateY(3deg) scale(1)',offset:.74,easing:'ease-in-out'},
  {transform:'perspective(420px) rotateX(2deg) rotateY(-1deg) scale(1)',offset:.9,easing:'ease-out'},
  {transform:'perspective(420px) rotateX(0deg) rotateY(0deg) scale(1)'}];
 const sway=(face,from=0)=>{const a=face.animate(WOBBLE,{duration:TIMING.wobble,easing:'linear'});a.id='wood-wobble';if(from)a.currentTime=from;return a;};
 function attach(b,{wobble,resume=null}){
  const parts=build(b);if(!parts)return null;
  if(getComputedStyle(b).position==='static'){b.dataset.woodHoverStatic='1';b.style.position='relative';}
  parts.holder.classList.toggle('is-dark',parts.dark);b.append(parts.holder);
  const quiet=reduce();
  if(wobble){stats.lit++;for(const n of [parts.light,parts.halo])n.animate([{opacity:0},{opacity:1}],{duration:quiet?1:TIMING.light,easing:'ease-out',fill:'backwards'});
   if(!quiet){stats.wobbles++;parts.wobble=sway(parts.face);}}
  else if(resume!=null&&resume<TIMING.wobble&&!quiet)parts.wobble=sway(parts.face,resume);
  return parts;
 }
 function release(b,holder,fade){
  const done=()=>{holder.remove();if(b.dataset.woodHoverStatic&&!b.querySelector(':scope>.wood-hover')){b.style.position='';delete b.dataset.woodHoverStatic;}};
  if(!fade||!holder.isConnected||reduce())return done();
  holder.animate([{opacity:1},{opacity:0}],{duration:TIMING.leave,easing:'ease-in',fill:'forwards'}).finished.then(done,done);
 }
 function end(fade=true){if(!session)return;const s=session;session=null;cancelAnimationFrame(s.raf);stats.ended++;release(s.target,s.parts.holder,fade);}
 const same=(a,b)=>Math.abs(a.left-b.left)<3&&Math.abs(a.top-b.top)<3&&Math.abs(a.width-b.width)<3&&Math.abs(a.height-b.height)<3;
 function begin(b,origin){
  if(session?.target===b)return;
  // a mesa foi redesenhada sob o ponteiro: mesmo lugar e mesmo rótulo → continua aceso, sem nova oscilação
  const rect=b.getBoundingClientRect(),adopt=!!session&&!session.target.isConnected&&session.label===label(b)&&same(session.rect,rect);
  const running=w=>w&&w.playState!=='finished'&&w.playState!=='idle'?Number(w.currentTime)||0:null,resume=adopt?running(session.parts.wobble):null;
  if(session){const old=session;session=null;cancelAnimationFrame(old.raf);release(old.target,old.parts.holder,!adopt&&old.target.isConnected);}
  const parts=attach(b,{wobble:!adopt,resume});if(!parts)return;if(adopt)stats.adopted++;
  const s=session={target:b,parts,label:label(b),rect,origin,raf:0};
  const watch=()=>{if(session!==s)return;
   if(!s.target.isConnected){const next=origin==='pointer'&&point?wood(document.elementFromPoint(point.x,point.y)):null;if(next)begin(next,origin);else end(false);return;}
   if(s.target.disabled||s.target.getAttribute('aria-disabled')==='true'){end(false);return;}
   // o conteúdo do mesmo nó foi trocado (textContent/replaceChildren): refaz a cópia em silêncio
   if(!s.parts.holder.isConnected||label(s.target)!==s.label){const again=attach(s.target,{wobble:false,resume:running(s.parts.wobble)});if(s.parts.holder.isConnected)s.parts.holder.remove();if(!again){end(false);return;}s.parts=again;s.label=label(s.target);stats.adopted++;}
   s.rect=s.target.getBoundingClientRect();s.raf=requestAnimationFrame(watch);};
  s.raf=requestAnimationFrame(watch);
 }
 document.addEventListener('pointerover',e=>{if(e.pointerType==='touch')return;point={x:e.clientX,y:e.clientY};const b=wood(e.target);if(b)begin(b,'pointer');},true);
 document.addEventListener('pointermove',e=>{if(e.pointerType!=='touch')point={x:e.clientX,y:e.clientY};},{capture:true,passive:true});
 document.addEventListener('pointerout',e=>{if(!session||session.origin!=='pointer')return;const to=e.relatedTarget;if(to&&session.target.contains(to))return;if(e.target===session.target||session.target.contains(e.target))end();},true);
 document.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')end(false);},true);
 document.addEventListener('focusin',e=>{const b=wood(e.target);if(b&&b.matches(':focus-visible')&&session?.target!==b)begin(b,'focus');});
 document.addEventListener('focusout',e=>{if(session?.origin==='focus'&&session.target===e.target)end();});
 addEventListener('blur',()=>end(false));document.addEventListener('visibilitychange',()=>{if(document.hidden)end(false);});
 root.RunaButtonHover={TIMING,get stats(){return {...stats,active:!!session};},end};
})(globalThis);
