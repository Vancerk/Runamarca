/* Board targeting only presents public legal candidates; the server validates. */
(function(root){
 'use strict';
 let current=null;
 const NS='http://www.w3.org/2000/svg';
 const alive=c=>c?.type==='creature'&&c.damage<c.health;
 function creatureIds(state,actor,card,kind){
  const me=state?.players?.find(p=>p.id===actor),enemy=state?.players?.find(p=>p.id!==actor);if(!me||!enemy)return [];
  const sides=kind==='any'||kind==='any-creature'?[me,enemy]:[kind==='enemy'?enemy:me];
  const ids=sides.flatMap(p=>p.reserve.filter(c=>alive(c)&&(!card.reserveOnly||!p.emanation.includes(c.uid))&&(!Number.isFinite(card.effects?.[0]?.min_attack)||(c.effectiveAttack??c.attack)>=card.effects[0].min_attack)).map(c=>c.uid));
  if(kind==='any')ids.push(...[me,enemy].filter(p=>p.patron?.hp>0).map(p=>'patron:'+p.id));
  if(kind==='friendly-or-patron'&&me.patron?.hp>0)ids.unshift('patron');
  return ids;
 }
 function cancel(reason='cancel'){const previous=current;current=null;if(!previous)return;cancelAnimationFrame(previous.raf);previous.pickedNode?.classList.remove('aim-provider');previous.marked.forEach(n=>n.classList.remove('aim-legal','aim-hover'));previous.svg.remove();previous.tools.remove();document.removeEventListener('pointermove',previous.move,true);document.removeEventListener('click',previous.click,true);document.removeEventListener('keydown',previous.key,true);document.removeEventListener('contextmenu',previous.context,true);root.removeEventListener('blur',previous.blur);if(!['confirm','fallback'].includes(reason))previous.onCancel?.();}
 function start({source,targets,confirm,fallback,title='Escolha um alvo',valid=()=>true,point,picked,onCancel}={}){
  cancel();const svg=document.createElementNS(NS,'svg');svg.classList.add('target-aim');svg.setAttribute('aria-hidden','true');const path=document.createElementNS(NS,'path'),ring=document.createElementNS(NS,'circle');ring.setAttribute('r','14');svg.append(path,ring);
  const tools=document.createElement('div');tools.className='target-aim-tools';tools.setAttribute('role','status');const label=document.createElement('span');label.textContent=title;const list=document.createElement('button');list.textContent='Escolher por lista';const stop=document.createElement('button');stop.textContent='Cancelar · Esc';tools.append(label,list,stop);document.body.append(svg,tools);
  const s={source,targets,confirm,valid,svg,tools,path,ring,marked:new Set(),point,picked,onCancel,raf:0,started:performance.now()};current=s;
  const candidates=()=>{try{return s.targets().filter(t=>t.node?.isConnected&&t.node.getBoundingClientRect().width>0);}catch{return [];}};
  const hit=p=>{const el=document.elementFromPoint(p.x,p.y);return candidates().filter(t=>t.node===el||t.node.contains(el)).sort((a,b)=>{const x=a.node.getBoundingClientRect(),y=b.node.getBoundingClientRect();return x.width*x.height-y.width*y.height;})[0];};
  s.release=p=>{if(current!==s||!s.valid()){cancel();return false;}const target=hit(p);if(!target){cancel();return false;}const id=target.id;cancel('confirm');s.confirm(id);return true;};
  s.move=e=>{s.point={x:e.clientX,y:e.clientY};};
  s.click=e=>{if(tools.contains(e.target)||e.target?.closest?.('.camp-menu-trigger,.room-menu-dialog'))return;if(performance.now()-s.started<40)return;e.preventDefault();e.stopImmediatePropagation();s.release({x:e.clientX,y:e.clientY});};
  s.key=e=>{if(e.isComposing||e.repeat||e.ctrlKey||e.altKey||e.metaKey)return;if(document.querySelector?.('.room-menu-dialog[open]'))return;if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();cancel();return;}if((e.key==='Enter'||e.key===' ')&&!tools.contains(e.target)){const target=candidates().find(t=>t.node===e.target||t.node.contains(e.target));if(target){e.preventDefault();e.stopImmediatePropagation();const r=target.node.getBoundingClientRect();s.release({x:r.left+r.width/2,y:r.top+r.height/2});}}};
  s.context=e=>{e.preventDefault();e.stopImmediatePropagation();cancel();};s.blur=()=>cancel();
  list.onclick=()=>{cancel('fallback');fallback?.();};stop.onclick=()=>cancel();
  document.addEventListener('pointermove',s.move,true);document.addEventListener('click',s.click,true);document.addEventListener('keydown',s.key,true);document.addEventListener('contextmenu',s.context,true);root.addEventListener('blur',s.blur);
  function frame(){if(current!==s)return;if(!s.valid()){cancel();return;}const selected=typeof s.picked==='function'?s.picked():s.picked;if(s.pickedNode!==selected){s.pickedNode?.classList.remove('aim-provider');s.pickedNode=selected;selected?.classList.add('aim-provider');}const choices=candidates(),nodes=new Set(choices.map(t=>t.node));for(const n of s.marked)if(!nodes.has(n))n.classList.remove('aim-legal','aim-hover');for(const n of nodes)n.classList.add('aim-legal');s.marked=nodes;
   const anchor=typeof source==='function'?source():source,r=anchor?.getBoundingClientRect();if(!anchor?.isConnected||!r?.width||!r.height){cancel();return;}if(r.width){const a={x:r.left+r.width/2,y:r.top+r.height*.35},b=s.point||{x:a.x,y:a.y-95};s.point=b;const hovered=hit(b);for(const n of nodes)n.classList.toggle('aim-hover',n===hovered?.node);svg.classList.toggle('aim-valid',Boolean(hovered));path.setAttribute('d',`M ${a.x} ${a.y} Q ${(a.x+b.x)/2} ${Math.min(a.y,b.y)-45} ${b.x} ${b.y}`);ring.setAttribute('cx',b.x);ring.setAttribute('cy',b.y);}s.raf=requestAnimationFrame(frame);
  }s.raf=requestAnimationFrame(frame);return true;
 }
 root.RunaTargeting={start,cancel,active:()=>Boolean(current),release:event=>current?.release({x:event.clientX,y:event.clientY})||false,creatureIds};
 root.addEventListener?.('pagehide',cancel);
})(globalThis);
