// Avisos públicos independentes de áudio e da fila de animações.
const spokenEvents=new Set(),shownSpeechEvents=new Set();let speechSession='',forceClock=null,retaliationSession='';const retaliationCounts=new Map();
function queueSpeech(){
 const key=state?[state.code,state.matchId||'lobby'].join(':'):'';if(key!==speechSession){spokenEvents.clear();shownSpeechEvents.clear();speechSession=key;document.querySelectorAll('.live-speech').forEach(n=>n.remove());}
 for(const event of state?.events||[])if(['creature','summon'].includes(event.type)&&Date.now()-serverClockOffset-event.at<8000&&!spokenEvents.has(event.id)){
  spokenEvents.add(event.id);const generation=visualGeneration;setTimeout(()=>{if(generation===visualGeneration)speechBubble(event);},1050);
 }
}
function speechBubble(event){
 if(shownSpeechEvents.has(event.id))return;
 const anchor=()=>[...document.querySelectorAll('#game .card')].find(n=>n.dataset.uid===event.cardId&&n.getBoundingClientRect().width>0);
 if(!anchor())return;shownSpeechEvents.add(event.id);const box=document.createElement('div');box.className='speech-bubble live-speech';box.textContent=event.speech||'Estou a postos!';box.dataset.eventId=event.id;document.body.append(box);
 const start=performance.now();const follow=now=>{const card=anchor();if(!card||now-start>3600||!box.isConnected){box.remove();return;}const r=card.getBoundingClientRect();box.style.left=Math.max(box.offsetWidth/2+8,Math.min(innerWidth-box.offsetWidth/2-8,r.left+r.width/2))+'px';box.style.top=Math.max(box.offsetHeight+12,r.top-10)+'px';requestAnimationFrame(follow);};requestAnimationFrame(follow);
}
function renderForceWindow(){
 clearInterval(forceClock);document.getElementById('force-window-clock')?.remove();if(state?.phase!=='formation'||!state.forceWindow||Date.now()-serverClockOffset>=state.forceWindow.until)return;
 const notice=document.createElement('div');notice.id='force-window-clock';notice.className='force-window-clock';notice.setAttribute('role','status');const label=document.createElement('span'),track=document.createElement('div'),line=document.createElement('i');track.append(line);notice.append(label,track);$('lanes').append(notice);
 const tick=()=>{const ms=Math.max(0,state.forceWindow.until-(Date.now()-serverClockOffset));label.textContent=`Vultobreve · ${(ms/1000).toFixed(1)}s`;line.style.width=(ms/50)+'%';if(!ms||state.phase!=='formation'){notice.remove();clearInterval(forceClock);}};tick();forceClock=setInterval(tick,80);
}
function paintRetaliation(uid,count){const card=tableCard(uid);if(!card)return;let points=card.querySelector('.retaliation-points');if(!points){points=document.createElement('span');points.className='retaliation-points';for(let i=0;i<4;i++)points.append(document.createElement('i'));card.append(points);}points.setAttribute('aria-label',`${Math.min(4,count)} de 4 Retaliações`);points.title=`Retaliação: ${Math.min(4,count)}/4`;[...points.children].forEach((dot,i)=>dot.classList.toggle('active',i<count));}
function renderRetaliationPoints(){const key=state?.combat?.id||'outside';if(key!==retaliationSession){retaliationCounts.clear();retaliationSession=key;}for(const p of state?.players||[])for(const uid of p.emanation){const c=p.reserve.find(c=>c.uid===uid);if(c?.effects?.some(e=>e.op==='retaliation'))paintRetaliation(uid,retaliationCounts.get(uid)??state.players.find(s=>s.id!==p.id)?.patron?.retaliation??0);}}
function applyRetaliationUpdates(updates=[]){for(const u of updates){retaliationCounts.set(u.sourceId,u.count);paintRetaliation(u.sourceId,u.count);if(u.count>=u.threshold)deferVisual(()=>{const source=tableCard(u.sourceId),target=$(u.targetOwner===seat()?.id?'self-head':'opponent-head')?.querySelector('.patron-card');if(source&&target)fly('✷',source,target,'spell',()=>patronImpact(target));retaliationCounts.set(u.sourceId,0);paintRetaliation(u.sourceId,0);},450);}}
async function highlightUsedSpell(card,owner){
 const generation=visualGeneration,node=cardEl(card,{zoom:true});let closed=false;
 node.classList.add('used-spell');node.onmouseenter=node.onmousemove=node.onmouseleave=node.onclick=null;
 const current=()=>generation===visualGeneration&&node.isConnected;
 try{
  await node.visualReady;
  if(generation!==visualGeneration){node.remove();return async()=>{};}
  document.body.append(node);
  const arrival=node.animate([{transform:'translate(-50%,-50%) scale(.86)',opacity:0},{transform:'translate(-50%,-50%) scale(1)',opacity:1}],{duration:140,easing:'ease-out',fill:'forwards'});
  await settleAnimation(arrival,140);await pause(650);
 }catch(error){node.remove();throw error;}
 return async()=>{
  if(closed)return;closed=true;
  try{
   if(!current())return;
   const grave=$(owner===seat()?.id?'self-grave':'opponent-grave');if(!grave)return;
   const r=node.getBoundingClientRect(),end=center(grave),dx=end.x-(r.left+r.width/2),dy=end.y-(r.top+r.height/2);
   const flight=node.animate([{transform:'translate(-50%,-50%) scale(1)',opacity:1},{transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(.12)`,opacity:0}],{duration:400,easing:'ease-in',fill:'forwards'});
   await settleAnimation(flight,400);if(current())sound('grave');
  }finally{node.remove();}
 };
}
function choosePatronPower(power){
 const self=seat();if(!self||state.spectator||state.phase!=='prep'||state.turn!==self.id)return;
 showTargetPicker(power,self.reserve.filter(c=>c.damage<c.health).map(c=>c.uid),targetId=>{
  if(power.id!=='potencializar'){command({type:'patronPower',powerId:power.id,targetId});return;}
  const dialog=$('target-picker'),content=$('target-picker-content');content.replaceChildren();text(content,'h2','Potencializar');const row=document.createElement('div');row.className='taunt-options';
  for(const [attribute,label] of [['attack','+1 Ataque'],['health','+1 Vida']])row.append(button(label,()=>{dialog.close();command({type:'patronPower',powerId:power.id,targetId,attribute});}));content.append(row);dialog.showModal();
 });
}
