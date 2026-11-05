// S5: structured confrontation entries in the Registro, from public combat data only.
// · History is bound to room + match (code:matchId); a new match starts with an empty record.
// · While the engine is resolving, the last public timeline (it grows as steps are released),
//   the visual entry of each lane, names and casualties are kept per combat id.
// · A step becomes an entry once its time has passed, also after the state has already left
//   'resolving' (prep / finished): then every step of the last public timeline is concluded.
//   Entries are keyed by combat id + step index, so repeated updates never duplicate them.
// · Deaths: combat.casualties when published; if the last resolving view did not carry it,
//   the first state after the combat is used once (participants found in a public discard).
//   The skull goes only on the entry that left the UID at hp ≤ 0.
// · Recipients: a creature (uid) or a Patron (patronId / empty side / strike without target).
//   Only what the data shows is stated: nominal attack, applied amount (strike.amount),
//   resulting life / armour (healthUpdates). A plain clash publishes attacks only.
(function(root){
 const store=new Map(),MAX=3;let matchKey=null;
 const hpOf=u=>u?.hp??null;
 function rec(b){let r=store.get(b.id);if(!r){r={id:b.id,round:b.round??state.round,timeline:[],visual:new Map(),names:new Map(),casualties:null,source:null,live:true,offset:0,startedAt:b.startedAt,entries:new Map()};store.set(b.id,r);if(store.size>MAX)store.delete(store.keys().next().value);}return r;}
 function sync(){
  const key=state?`${state.code}:${state.matchId??''}`:null;if(key!==matchKey){store.clear();matchKey=key;}if(!state)return;
  const b=state.combat,live=b&&state.phase==='resolving'?b:null;
  if(live){const r=rec(live);r.live=true;r.startedAt=live.startedAt;r.offset=typeof combatClock!=='undefined'&&combatClock?.id===live.id?combatClock.offset:(typeof serverClockOffset==='number'?serverClockOffset:0);
   if((live.timeline?.length||0)>=r.timeline.length)r.timeline=live.timeline.slice();
   for(const v of live.visual||[])r.visual.set(v.lane,v);
   for(const lane of live.lanes||[])for(const c of lane?.cards||[])if(c?.uid&&c.name)r.names.set(c.uid,{name:c.name,owner:c.owner});
   if(Array.isArray(live.casualties)){r.casualties=live.casualties.map(c=>({uid:c.uid,owner:c.owner}));r.source='motor';}}
  for(const p of state.players||[])for(const c of [...(p.reserve||[]),...(p.discard||[])])for(const r of store.values())if(c?.uid&&c.name&&!r.names.has(c.uid))r.names.set(c.uid,{name:c.name,owner:p.id});
  for(const r of store.values()){const ended=!live||live.id!==r.id;
   if(ended&&r.live){r.live=false;if(!r.source){const discard=new Set((state.players||[]).flatMap(p=>(p.discard||[]).map(c=>c.uid)));r.casualties=[...participants(r)].filter(u=>discard.has(u)).map(uid=>({uid,owner:r.names.get(uid)?.owner}));r.source='descarte';}}
   const elapsed=ended?Infinity:Date.now()-r.offset-r.startedAt;let start=0;
   r.timeline.forEach((step,i)=>{const end=start+(step.duration||0);start=end;if(elapsed<end||r.entries.has(i))return;const e=entryFor(step,r);if(e)r.entries.set(i,e);});}
 }
 function participants(r){const s=new Set();for(const v of r.visual.values())for(const c of v.cards||[])if(c?.uid)s.add(c.uid);for(const st of r.timeline){for(const x of [st.strike,st.strike?.pair])if(x){if(x.sourceId)s.add(x.sourceId);if(x.targetId)s.add(x.targetId);}for(const u of [...(st.spell?.healthUpdates||[]),...(st.burst?.healthUpdates||[])])if(u.uid)s.add(u.uid);}return s;}
 const upd=u=>u.patronId?{patron:u.patronId,after:hpOf(u),armour:u.extraLife??null}:{uid:u.uid,after:hpOf(u)};
 function entryFor(step,r){
  if(step.kind==='clash'){const v=r.visual.get(step.lane);const [l,rt]=v?.cards||[];if(!l&&!rt)return null;
   if(l&&rt)return {kind:'clash',lane:step.lane,parts:[l,rt].map((me,i)=>{const foe=i?l:rt;return {uid:me.uid,owner:me.owner,attack:me.attack,taken:foe.attack,after:me.health-foe.attack};})};
   const c=l||rt;return {kind:'clash',lane:step.lane,parts:[{uid:c.uid,owner:c.owner,attack:c.attack}],patronAttack:{from:c.uid,owner:c.owner,attack:c.attack}};}
  if(step.kind==='strike'&&step.strike)return {kind:'strike',hits:[step.strike,step.strike.pair].filter(Boolean).map(s=>({source:s.sourceId,owner:s.owner,target:s.targetId||null,targetOwner:s.targetOwner,lane:s.lane,targetLane:s.targetLane,redirected:s.targetLane!=null&&s.targetLane!==s.lane,amount:s.amount,requested:s.requestedAmount,blocked:!!s.blocked,barrier:!!s.barrierPrevented,updates:(s.healthUpdates||[]).map(upd)}))};
  if(step.kind==='magic'&&step.spell?.healthUpdates?.length)return {kind:'effect',label:step.spell.card?.name||step.spell.name||'Magia',updates:step.spell.healthUpdates.map(upd)};
  if(step.kind==='death_burst'&&step.burst)return {kind:'burst',source:step.burst.sourceId,amount:step.burst.amount,targetPatron:step.burst.targetPatronId||null,updates:(step.burst.healthUpdates||[]).map(upd)};
  return null;}
 // What the reader sees: entries per combat and whether/which deaths are known.
 const signature=()=>[...store.values()].map(r=>r.id+':'+[...r.entries.keys()].sort((a,b)=>a-b).join(',')+':'+(r.source||'')+':'+(r.casualties||[]).map(c=>c.uid).join(',')+':'+r.live).join('|');
 let painted=null;
 // Visual clock (tickCombat, every 90 ms): rebuild only the confrontation section, only when
 // an entry or an outcome changed; the drawer and the log scroll position are left as they are.
 function tick(){if(!state)return;sync();const sig=signature();if(sig===painted&&document.querySelector('#log .combat-record')?.isConnected!==false)return;const log=document.getElementById('log');if(!log)return;const top=log.scrollTop;paint(log);log.scrollTop=top;}
 // Server revision: the app has just rebuilt #log, so the section is added again.
 function render(){sync();const log=document.getElementById('log');if(log&&state)paint(log);}
 function paint(log){
  painted=signature();log.querySelector('.combat-record')?.remove();
  const recs=[...store.values()].filter(r=>r.entries.size).slice(-2);if(!recs.length)return;
  const me=state.you,box=document.createElement('section');box.className='combat-record';box.setAttribute('aria-label','Confrontos');
  for(const r of recs.reverse()){const dead=new Set((r.casualties||[]).map(c=>c.uid)),known=Boolean(r.source);
   const who=uid=>{const n=r.names.get(uid);return (n?.name||'Criatura')+(n?' ('+(n.owner===me?'você':'rival')+')':'');},patron=id=>id===me?'seu Patrono':'Patrono rival';
   const lethal=new Map();for(const [i,e] of r.entries){const marks=e.kind==='clash'?e.parts.filter(q=>q.after!=null).map(q=>[q.uid,q.after]):e.kind==='strike'?e.hits.flatMap(h=>h.updates.filter(u=>u.uid).map(u=>[u.uid,u.after])):e.updates.filter(u=>u.uid).map(u=>[u.uid,u.after]);for(const [uid,after] of marks)if(after!=null&&after<=0&&(lethal.get(uid)??-1)<i)lethal.set(uid,i);}
   let cur=-1;const death=uid=>lethal.get(uid)!==cur?'':!known?` · desfecho de ${who(uid)} pendente`:dead.has(uid)?` ☠ ${who(uid)} → Nartvanyr`:` · ${who(uid)} sobreviveu`;
   const life=u=>u.patron?`${patron(u.patron)} fica com vida ${u.after}${u.armour?` e armadura ${u.armour}`:''}`:`${who(u.uid)} fica com vida ${u.after}`+death(u.uid);
   const head=document.createElement('h4');head.className='log-divider';head.textContent=`Rodada ${r.round} · Confrontos`;box.append(head);
   for(const [i,e] of [...r.entries].sort((x,y)=>x[0]-y[0])){cur=i;const p=document.createElement('p');p.className='cr-entry cr-'+e.kind;p.dataset.step=i;p.dataset.combat=r.id;let t;
    if(e.kind==='clash'&&!e.patronAttack){const [x,y]=e.parts;t=`Posição ${e.lane+1} · ${who(x.uid)} ⚔ ${who(y.uid)} · dano de confronto: ${who(x.uid)} sofre ${x.taken}, ${who(y.uid)} sofre ${y.taken} · ataques ${x.attack} / ${y.attack}`+(death(x.uid)+death(y.uid)||' · sem mortes');}
    else if(e.kind==='clash'){const a=e.patronAttack,target=a.owner===me?'Patrono rival':'seu Patrono';t=`Posição ${e.lane+1} · ${who(a.from)} ⚔ ${target} · ataque ${a.attack} ao ${target} (o confronto não publica perda de vida nem absorção)`;}
    else if(e.kind==='strike')t=e.hits.map(h=>{const target=h.target?who(h.target):h.targetOwner===me?'seu Patrono':'Patrono rival',pu=h.updates.find(u=>u.patron);
     return `Posição ${h.lane+1}${h.redirected?` → ${h.targetLane+1} (redirecionado)`:''} · ${who(h.source)} ⚔ ${target} · `+(h.blocked?'bloqueado':h.target?`dano aplicado ${h.amount}${h.requested!=null&&h.requested!==h.amount?` (ataque ${h.requested})`:''}`+(death(h.target)||' · sem mortes'):`ataque ${h.requested??h.amount}`+(pu?` · ${life(pu)}`:' (sem atualização de vida publicada)'))+(h.barrier?' · Barreira':'');}).join(' | ');
    else if(e.kind==='burst')t=`✦ Último Suspiro de ${who(e.source)} · explosão de ${e.amount} ao ${e.targetPatron?patron(e.targetPatron):'Patrono'} · dano de outro efeito`+(e.updates.length?' · '+e.updates.map(life).join(' · '):'');
    else t=`✦ ${e.label} · dano de outro efeito · `+e.updates.map(life).join(' · ')+' (o motor publica a vida resultante, não o valor do dano)';
    p.textContent=t;box.append(p);}
   if(!known&&r.live){const n=document.createElement('p');n.className='cr-pending';n.textContent='Desfecho das baixas: aguardando o fim da revelação.';box.append(n);}}
  log.prepend(box);}
 root.renderCombatRecord=render;root.RunaCombatRecord={store,sync,tick,get matchKey(){return matchKey;}};
})(globalThis);
