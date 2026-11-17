// Only the already-public burned card is supplied by queueEvents. Never reads the opponent's hand.
(function(root){
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 async function play({card,from,to,alive=()=>true}){
  const layer=document.getElementById('visual-layer'),node=document.createElement('div');node.className='burned-draw';node.dataset.uid=card.dataset.uid;node.setAttribute('aria-label','Carta queimada: '+card.getAttribute('aria-label'));card.inert=true;card.classList.add('burned-draw-face');node.append(card);const caption=document.createElement('strong');caption.className='burned-draw-caption';caption.textContent='Mão cheia · carta queimada';node.append(caption);layer.append(node);
  const w=Math.min(300,innerWidth*.58,innerHeight*.33),h=w*1.4,cx=innerWidth/2,cy=innerHeight*.46;
  Object.assign(node.style,{left:(cx-w/2)+'px',top:(cy-h/2)+'px',width:w+'px',height:h+'px'});
  const finished=a=>a.finished.catch(()=>{}),wait=ms=>new Promise(r=>setTimeout(r,ms));let focus;
  try{
   await Promise.race([card.visualReady,wait(180)]);if(!alive())return;
   if(!reduced()){const r=from?.getBoundingClientRect();await finished(node.animate([{transform:`translate(${(r?r.left+r.width/2:cx)-cx}px,${(r?r.top+r.height/2:cy)-cy}px) scale(.25) rotate(-12deg)`,opacity:.4},{transform:'none',opacity:1}],{duration:360,easing:'cubic-bezier(.2,.8,.3,1)',fill:'both'}));}
   await wait(reduced()?1400:1300);if(!alive())return;
   node.classList.add('burning');focus=root.RunaLightFocus?.acquire({nodes:[node,to],duration:1440,strength:.28,valid:alive});
   if(!reduced())await finished(card.animate([{filter:'none',clipPath:'inset(0)'},{filter:'sepia(1) saturate(3) brightness(1.5)',clipPath:'inset(0 0 15% 0)'},{filter:'sepia(1) saturate(2) brightness(.3)',clipPath:'inset(0 0 68% 0)'}],{duration:720,fill:'forwards'}));
   if(!alive())return;const r=to?.getBoundingClientRect();
   if(r){await finished(node.animate([{transform:'none',opacity:1},{transform:`translate(${r.left+r.width/2-cx}px,${r.top+r.height/2-cy}px) scale(.12) rotate(18deg)`,opacity:0}],{duration:reduced()?240:720,easing:'cubic-bezier(.4,0,.8,.5)',fill:'forwards'}));to.classList.add('burn-arrived');setTimeout(()=>to.classList.remove('burn-arrived'),420);}
  }finally{focus?.release(!alive());node.remove();}
 }
 root.RunaDrawBurn={play};
})(globalThis);
