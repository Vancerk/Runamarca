/* Mechanical death visuals; audio comes exclusively from the Epidemic catalog. */
(function(root){
 'use strict';
 const seen=new Set(),active=new Set();
 const normalized=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 function profile(card){
  if(card?.type!=='creature')return null;
  const type=normalized([card.subtype,card.name,...(card.tags||[])].join(' '));
  if(/\brunicos?\b/.test(type))return 'runic';
  if(/\bsinteticos?\b/.test(type))return 'synthetic';
  return /\b(?:mecanoides?|mecanicos?|axioms?|axions?|actions?|engrenautas?|grenautas?)\b/.test(type)?'machine':null;
 }
 function play({card,target,context,key=card?.uid}={}){
  const kind=profile(card);if(!kind||seen.has(key)||!target?.getBoundingClientRect)return false;
  seen.add(key);if(seen.size>300)seen.delete(seen.values().next().value);
  root.RunaTableAudio?.effect(context,'death_'+kind,{to:target,level:.65});
  const r=target.getBoundingClientRect(),layer=document.createElement('div');layer.className='mechanical-death-particles';layer.setAttribute('aria-hidden','true');layer.dataset.profile=kind;
  const reduced=root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const colors=kind==='runic'?['#e9f6ff','#b4b0ea','#92d9ef']:kind==='synthetic'?['#d2ffff','#7dd9dc','#c9c4f5']:['#e8ddd0','#9faaa9','#e5ae77'];
  Object.assign(layer.style,{position:'fixed',inset:'0',pointerEvents:'none',zIndex:'4350'});document.body.append(layer);
  let finished=false;const animations=[];
  const done=()=>{if(finished)return;finished=true;for(const animation of animations)animation.cancel();layer.remove();active.delete(done);};active.add(done);
  for(let i=0;i<(reduced?3:14);i++){
   const chip=document.createElement('i'),angle=i*2.399963,spread=18+(i%5)*10;
   Object.assign(chip.style,{position:'absolute',left:(r.left+r.width/2)+'px',top:(r.top+r.height*.48)+'px',width:(kind==='machine'?3+i%4:2)+'px',height:(2+i%3)+'px',background:colors[i%3],borderRadius:kind==='machine'?'1px':'50%',boxShadow:'0 0 4px '+colors[i%3]});layer.append(chip);
   const animation=chip.animate([{transform:'translate(0,0) rotate(0deg)',opacity:0},{opacity:.9,offset:.09},{transform:`translate(${Math.cos(angle)*spread}px,${Math.sin(angle)*spread+27}px) rotate(${i*37}deg)`,opacity:0}],{duration:reduced?230:620+i%4*90,easing:'cubic-bezier(.1,.5,.5,1)',fill:'forwards'});animations.push(animation);
  }
  Promise.all(animations.map(a=>a.finished.catch(()=>{}))).then(done);return true;
 }
 function clear(){for(const done of [...active])done();seen.clear();}
 root.RunaCreatureDeath={profile,play,clear};root.addEventListener?.('pagehide',clear);
})(globalThis);
