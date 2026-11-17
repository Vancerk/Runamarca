// Claude review round 3 (owner): when the formation fog leaves and a rival creature is revealed in a combat lane, it no
// longer pops in. It vanishes from the rival reserve in a puff of smoke and comes out of another puff in its lane, like
// the other entrances (spell, hammer, grab). Presentation only: it reacts to cards the client already received; it reads
// no hidden data (the reserve position is the public one last shown). Reduced motion: a short fade only.
(function(){
 const reserveRects=new Map(),seen=new Set();let combatId=null,raf=0;
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 function snapshotReserve(){for(const n of document.querySelectorAll('.reserve-camp.opponent-camp .card[data-uid]')){const r=n.getBoundingClientRect();if(r.width)reserveRects.set(n.dataset.uid,{x:r.x,y:r.y,w:r.width,h:r.height});}}
 function puff(rect,delay=0,scale=1.25){const s=document.createElement('div');s.className='reveal-smoke';s.setAttribute('aria-hidden','true');const size=Math.max(rect.w,rect.h)*scale;Object.assign(s.style,{left:rect.x+rect.w/2-size/2+'px',top:rect.y+rect.h/2-size/2+'px',width:size+'px',height:size+'px'});
  for(let i=0;i<4;i++){const p=document.createElement('i');p.style.backgroundImage=`url('fog-puffs/42-${i}.png')`;p.style.setProperty('--r',(i*83)+'deg');p.style.setProperty('--dx',[-.18,.2,-.08,.12][i]*size+'px');p.style.setProperty('--dy',[.1,-.12,-.2,.16][i]*size+'px');s.append(p);}
  document.body.append(s);const a=s.animate([{opacity:0,transform:'scale(.55)'},{opacity:1,transform:'scale(1)',offset:.35},{opacity:0,transform:'scale(1.35)'}],{duration:reduced()?240:900,delay,easing:'cubic-bezier(.2,.7,.3,1)',fill:'both'});a.finished.finally(()=>s.remove());}
 function reveal(node){const uid=node.dataset.uid,r=node.getBoundingClientRect();if(!r.width)return;const rect={x:r.x,y:r.y,w:r.width,h:r.height},from=reserveRects.get(uid);
  if(from&&!reduced())puff(from,0,1.15);puff(rect,from&&!reduced()?160:0,1.3);
  node.animate([{opacity:0},{opacity:0,offset:.25},{opacity:1}],{duration:reduced()?200:620,delay:0,easing:'ease-out'});}
 // Cards already in the lanes before the combat (own formation, earlier rounds) are never animated; only cards that
 // appear in a lane while the combat is being revealed are.
 function check(){raf=0;const st=typeof state!=='undefined'?state:null;if(!st)return;if(st.phase!=='resolving'){combatId=null;seen.clear();snapshotReserve();for(const n of document.querySelectorAll('.lane-side .card[data-uid]'))seen.add(n.dataset.uid);return;}
  const id=st.combat?.id||null;if(id!==combatId)combatId=id;
  for(const n of document.querySelectorAll('.lane-side .card[data-uid]')){const uid=n.dataset.uid;if(seen.has(uid))continue;seen.add(uid);const side=n.closest('.lane-side');if(side&&side.dataset.owner&&side.dataset.owner!==st.you)reveal(n);}}
 const game=document.getElementById('game');if(game)new MutationObserver(()=>{if(!raf)raf=requestAnimationFrame(check);}).observe(game,{childList:true,subtree:true});
 window.RunaRevealSmoke={get seen(){return [...seen];}};
})();
