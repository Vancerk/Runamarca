(()=>{const pause=ms=>new Promise(r=>setTimeout(r,ms)),center=node=>{const r=node.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}};
async function fatigue(event,{source,victim,layer,onHit,valid=()=>true,sound=()=>{},impact=()=>{}}){
 if(!victim){onHit();return;}
 const a=center(source||victim),b=center(victim),label=document.createElement('div');label.className='fatigue-card';label.textContent='FADIGA';label.setAttribute('role','status');label.setAttribute('aria-label',`Fadiga: ${event.amount} de dano`);label.style.left=a.x+'px';label.style.top=a.y+'px';const amount=document.createElement('strong');amount.textContent='−'+event.amount;label.append(amount);layer.append(label);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const animation=label.animate([{transform:'translate(-50%,-50%) scale(.65)',opacity:0},{transform:'translate(-50%,-50%) scale(1)',opacity:1,offset:.2},{transform:`translate(calc(${b.x-a.x}px - 50%),calc(${b.y-a.y}px - 50%)) scale(1)`,opacity:1,offset:.7},{transform:`translate(calc(${b.x-a.x}px - 50%),calc(${b.y-a.y-20}px - 50%)) scale(1.2)`,opacity:0}],{duration:reduced?450:1100,easing:'ease-in-out'});
 try{await pause(reduced?250:770);if(!valid())return;onHit();impact(victim);sound('impact',Math.min(event.amount,6));await animation.finished.catch(()=>{});}finally{animation.cancel();label.remove();}
}
globalThis.RunaDeckFeedback={fatigue};})();
