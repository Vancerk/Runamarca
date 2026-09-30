const $=id=>document.getElementById(id);
const gameBase=location.pathname.startsWith('/runamarca')?'/runamarca/':'/';
let state=null,models=null,selected=null,importedArt={},lastRevision=-1,toastTimer=null,hoverUid=null,serverClockOffset=0,pendingSnap=null,refreshing=false;
let visualBooted=false,lastVisualId=0,lastPhase=null,lastBattleStep='';let visualQueue=Promise.resolve();
const isInvitation=()=>new URLSearchParams(location.search).has('invite');
const avatar=(seat)=>seat?.patron?.affinity==='ruptura'?'◆':seat?.patron?.affinity==='fluxo'?'◇':'✦';
const seat=()=>state?.players.find(p=>p.id===state.you)||(state?.spectator?state?.players[0]:null);
const rival=()=>state?.players.find(p=>p.id!==seat()?.id);
const err=error=>{const message=error?.message||String(error);$('welcome-error').textContent=message;const t=$('toast');t.textContent=message;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),3500);};
async function api(route,data,method='POST'){
  const headers={'Content-Type':'application/json'};const saved=sessionStorage.getItem('runamarca-nova-seat');if(saved)headers['x-player-token']=JSON.parse(saved).token;
  const response=await fetch(gameBase+route.replace(/^\//,''),{method,headers,...(data?{body:JSON.stringify(data)}:{})});if(response.status===204)return null;if(response.status===403){location.assign(gameBase+'access');throw Error('Acesso necessário.');}const result=await response.json();if(!response.ok)throw Error(result.error||'Ação não concluída.');return result;
}
async function command(data){try{const next=await api(`/api/rooms/${state.code}/act`,data);if(next.left){sessionStorage.removeItem('runamarca-nova-seat');state=null;selected=null;visualBooted=false;lastRevision=-1;history.replaceState(null,'',gameBase);render();return;}serverClockOffset=Date.now()-next.serverNow;state=next;render();}catch(e){err(e);}}
async function refresh(){const saved=sessionStorage.getItem('runamarca-nova-seat');if(!saved||refreshing)return;refreshing=true;try{const info=JSON.parse(saved);const next=await api(`/api/rooms/${info.code}/state?revision=${lastRevision}`,null,'GET');if(!next)return;serverClockOffset=Date.now()-next.serverNow;if(next.revision>lastRevision||!state){state=next;render();}}catch(e){sessionStorage.removeItem('runamarca-nova-seat');state=null;render();err(e);}finally{refreshing=false;}}
function button(label,handler,klass='',disabled=false){const b=document.createElement('button');b.type='button';b.textContent=label;b.className=klass;b.disabled=disabled;b.onclick=handler;return b;}
function text(parent,tag,value,klass){const el=document.createElement(tag);el.textContent=value;if(klass)el.className=klass;parent.append(el);return el;}
function cardEl(card,{mini=false,back=false,active=false}={}){
  const el=document.createElement('button');el.type='button';el.className=`card${mini?' mini':''}${back?' back':''}${active?' selected':''}${card?.imageKind==='card'?' has-art':''}`;el.dataset.uid=card?.uid||'';el.setAttribute('aria-label',back?'Magia oculta':`${card.name} · custo ${card.cost} · ${card.text||''}`);
  if(!back){if(card.image){const image=document.createElement('img');image.src=card.image;image.alt='';el.append(image);}else text(el,'div',card.type==='creature'?'✦':'◈','fallback');text(el,'div',card.name,'card-title');text(el,'span',String(card.cost??0),'mana-gem');if(card.type==='creature')text(el,'span',`${card.attack+(card.attackMod||0)} / ${Math.max(0,card.health-card.damage)}`,'numbers');if(card.rarity)text(el,'span',card.rarity,'rarity');if(card.damage)text(el,'span',`−${card.damage}`,'damage');}
  el.onclick=()=>{if(back)return;selected=card.uid;render();};el.ondblclick=()=>showCard(card);
  if(!back){el.onmouseenter=event=>showHover(card,event);el.onmousemove=moveHover;el.onmouseleave=hideHover;}
  return el;
}
function showHover(card,event){const holder=$('hover-preview');if(hoverUid!==card.uid){hoverUid=card.uid;holder.replaceChildren();const picture=cardEl(card);picture.classList.add('big');picture.onclick=picture.ondblclick=picture.onmouseenter=picture.onmousemove=picture.onmouseleave=null;holder.append(picture);text(holder,'div',card.text||card.name,'hover-rule');}holder.hidden=false;moveHover(event);}
function moveHover(event){const holder=$('hover-preview');if(holder.hidden)return;const w=holder.offsetWidth||245,h=holder.offsetHeight||380;holder.style.left=`${Math.max(10,Math.min(innerWidth-w-10,event.clientX+(event.clientX>innerWidth*.68?-w-26:22)))}px`;holder.style.top=`${Math.max(70,Math.min(innerHeight-h-10,event.clientY-h*.38))}px`;}
function hideHover(){const holder=$('hover-preview');holder.hidden=true;hoverUid=null;}
function showCard(card){hideHover();const d=$('card-detail');const area=$('detail-content');area.replaceChildren();const picture=cardEl(card);picture.classList.add('big');picture.onclick=picture.ondblclick=picture.onmouseenter=picture.onmousemove=picture.onmouseleave=null;area.append(picture);const body=document.createElement('div');text(body,'h2',card.name);text(body,'p',card.type==='creature'?`Criatura · ${card.attack}/${card.health} · custo ${card.cost}`:`Magia · custo ${card.cost}`);text(body,'p',card.text||'Sem texto.');area.append(body);d.showModal();}
function selectedCard(){if(!state)return null;return [...(seat().hand||[]),...(seat().reserve||[]),...(rival()?.reserve||[])].find(c=>c.uid===selected);}
function role(card){const ef=Array.isArray(card.effects)?card.effects[0]:card.effects;if(ef?.op==='draw')return 'self';if(ef?.op==='area_damage')return 'enemy-board';if(ef?.op==='choose_one')return 'friendly-or-patron';if(['heal','attack_modifier'].includes(ef?.op)&&ef?.target==='chosen_allied_creature')return 'friendly';return 'enemy';}
function matchSeat(player,position){if(!player)return;const self=position==='self';const node=$(`${position}-head`);node.replaceChildren();const portrait=document.createElement('div');portrait.className='patron-card';if(player.patron?.image){const image=document.createElement('img');image.src=player.patron.image;image.alt=`Retrato de ${player.patron.name}`;portrait.append(image);}else text(portrait,'span',avatar(player));portrait.title=player.patron?.name||'Patrono';portrait.onclick=()=>{if(player.patron)showPatron(player.patron);};node.append(portrait);const info=document.createElement('div');info.className='patron-info';text(info,'small',state.spectator?'PATRONO':self?'SEU PATRONO':'PATRONO RIVAL');text(info,'strong',player.patron?.name||'Patrono');text(info,'span',player.name,'muted');text(info,'span',`${player.deckCount} no deck · ${player.handCount} na mão`,'muted');node.append(info);const stats=document.createElement('div');stats.className='patron-stats';text(stats,'span',`${player.mana}/${player.manaMax} mana`,'resource');text(stats,'span',`${player.patron?.hp??24}/24 ♥`,'hp');node.append(stats);}
function showPatron(patron){const d=$('card-detail'),area=$('detail-content');area.replaceChildren();const card=document.createElement('div');card.className='patron-large';if(patron.image){const image=document.createElement('img');image.src=patron.image;image.alt='';card.append(image);}text(card,'strong',patron.name);area.append(card);const body=document.createElement('div');text(body,'h2',patron.name);text(body,'p',`${patron.affinity.toUpperCase()} · ${patron.hp}/${patron.maxHp} de vida`);text(body,'p','Patrono do baralho. Começa em jogo e fica fora das 24 cartas.');area.append(body);d.showModal();}
function renderGate(){
  $('welcome').hidden=Boolean(state);$('lobby').hidden=!state||state.phase!=='lobby';$('game').hidden=!state||state.phase==='lobby';
  $('room-name').textContent=state?`SALA ${state.code}`:'';$('copy-link').hidden=!state;$('leave-room').hidden=!state;$('change-role').hidden=!state;$('change-role').textContent=state?.spectator?'Ocupar vaga':'Ir à arquibancada';$('change-role').disabled=Boolean(state?.spectator&&(state.phase!=='lobby'||state.players.length>=2));
  $('phase-label').textContent=state?`${state.phase.toUpperCase()} · RODADA ${state.round}`:'';
  if(!state){$('entry-title').textContent=isInvitation()?'Entre na sala convidada':'Abra a mesa';$('entry-note').textContent=isInvitation()?'Informe seu nome. Se as duas vagas estiverem ocupadas, você entra na arquibancada.':'Jogue em duas abas ou convide outra pessoa para entrar na sala.';$('create').hidden=isInvitation();$('join').textContent=isInvitation()?'Entrar na sala':'Entrar com código';$('join-code-label').hidden=isInvitation();$('role-label').hidden=isInvitation();}
  if(!state)return;
  const crowd=`Arquibancada · ${state.spectators?.length||0}: ${state.spectators?.map(p=>p.name+(p.id===state.you?' (você)':'')).join(', ')||'ninguém'}`;$('spectators').textContent=crowd;$('spectators-game').textContent=crowd;
  if(state.phase==='lobby'){
    $('lobby-players').textContent=state.players.map(p=>`${p.name}${p.deckId?' ✓':''}`).join('  ·  ');
    $('lobby-note').textContent=state.spectator?'Você está assistindo. Ocupe uma vaga para escolher um deck.':state.players.length<2?'Aguardando o segundo jogador. Compartilhe o convite.':state.players.every(p=>p.deckId)?'Os decks estão prontos.':'Cada jogador escolhe um deck.';
    const holder=$('deck-options');holder.replaceChildren();if(!state.spectator)for(const deck of models?.decks||[]){const box=document.createElement('article');box.className='deck-option';text(box,'span',`${deck.affinity} · ${deck.archetype}`,'affinity');text(box,'h2',deck.name);text(box,'p',deck.plan);text(box,'p',`Patrono: ${deck.patron.name} · 24 de vida · ${deck.cards.reduce((n,c)=>n+c.quantity,0)} cartas`);box.append(button(seat()?.deckId===deck.id?'Deck escolhido':'Escolher deck',()=>command({type:'deck',deckId:deck.id,art:importedArt[deck.id]||{}}),'primary',Boolean(seat()?.deckId)));holder.append(box);}
  }
}
function renderBoard(){const self=seat(),opp=rival();matchSeat(self,'self');matchSeat(opp,'opponent');
  for(const [id,p] of [['self',self],['opponent',opp]]){
    const holder=$(`${id}-reserve`);holder.replaceChildren();const cards=(p?.reserve||[]).filter(c=>!p.emanation?.includes(c.uid));$(`${id}-reserve-count`).textContent=`${cards.length} criatura(s)`;
    for(const c of cards){const node=cardEl(c,{mini:true,active:selected===c.uid});if(!state.spectator&&p.id===self.id)makeDraggable(node,c);holder.append(node);}
    const eman=$(`${id}-emana`);eman.replaceChildren();for(let slot=0;slot<2;slot++){const em=p?.reserve?.find(c=>c.uid===p.emanation?.[slot]);if(em)eman.append(cardEl(em,{mini:true,active:selected===em.uid}));else text(eman,'span',`Vaga ${slot+1}`,'emana-empty');}
    const grave=$(`${id}-grave`);grave.replaceChildren();const top=p?.discard?.at(-1);if(top&&top.image){const art=document.createElement('img');art.src=top.image;art.alt='';grave.append(art);}else text(grave,'span','✝');text(grave,'b',`${p?.discardCount||0} carta(s)`);grave.onclick=()=>showCemetery(p);
  }
  const hand=$('hand');hand.replaceChildren();for(const c of self.hand||[])hand.append(cardEl(c,{active:selected===c.uid}));$('hand-count').textContent=`${self.handCount} cartas`;
  const lanes=$('lanes');lanes.replaceChildren();for(let i=0;i<3;i++){
    const lane=document.createElement('div');lane.className='lane';lane.dataset.lane=i;
    for(const player of [opp,self]){
      const side=document.createElement('div');side.className='lane-side';side.dataset.owner=player?.id||'';side.dataset.lane=i;
      const placed=player?.reserve?.find(c=>c.uid===player.formation?.[i]);
      if(placed){const node=cardEl(placed,{mini:true,active:selected===placed.uid});if(!state.spectator&&player.id===self.id)makeDraggable(node,placed);if(player.id===self.id&&pendingSnap?.lane===i&&pendingSnap.until>Date.now())node.classList.add('snapping');side.append(node);}else text(side,'span',state.phase==='formation'&&player?.id!==state.you?'?':state.phase==='formation'&&player?.id===state.you?'Solte aqui':'Vazia','drop-label');
      for(const prep of player?.prepared?.filter(item=>item.lane===i)||[]){const symbol=document.createElement('span');symbol.className=`spell-mark${prep.hidden?' hidden-spell':''}`;symbol.textContent=prep.hidden?'':'✧';symbol.title=prep.hidden?'Magia inimiga oculta':prep.card?.name||'Magia';symbol.onclick=()=>{if(prep.card)showCard(prep.card);};side.append(symbol);}
      if(!state.spectator&&player?.id===self.id){side.classList.add('own-drop');side.ondragover=event=>{if(state.phase==='formation'&&!self.ready){event.preventDefault();event.dataTransfer.dropEffect='move';side.classList.add('drop-ready');}};side.ondragleave=event=>{if(!side.contains(event.relatedTarget))side.classList.remove('drop-ready');};side.ondrop=event=>{event.preventDefault();side.classList.remove('drop-ready');const uid=event.dataTransfer.getData('text/plain');if(uid){pendingSnap={lane:i,until:Date.now()+900};command({type:'assign',lane:i,cardId:uid});}};}
      lane.append(side);if(player===opp)text(lane,'div',`POSIÇÃO ${i+1}`,'lane-mid');
    }
    lanes.append(lane);
  }
  const log=$('log');log.replaceChildren();for(const message of state.log.slice().reverse())text(log,'p',message);
  const summary=$('combat-summary');summary.replaceChildren();summary.hidden=!state.lastCombat;
  if(state.lastCombat){text(summary,'h3',`Último confronto · rodada ${state.lastCombat.round}`);text(summary,'p',state.lastCombat.names.join(' × '));for(const [index,lane] of state.lastCombat.lanes.entries())text(summary,'p',`${index+1}: ${lane.left} × ${lane.right}`);for(const spell of state.lastCombat.spells)text(summary,'p',`✧ ${spell}`);for(const hit of state.lastCombat.patronHits)text(summary,'p',`♥ ${hit}`);}
}
function makeDraggable(node,card){if(state.phase!=='formation'||seat().ready||seat().emanation.includes(card.uid))return;node.draggable=true;node.classList.add('draggable');node.ondragstart=event=>{hideHover();event.dataTransfer.setData('text/plain',card.uid);event.dataTransfer.effectAllowed='move';node.classList.add('dragging');};node.ondragend=()=>{node.classList.remove('dragging');document.querySelectorAll('.drop-ready').forEach(el=>el.classList.remove('drop-ready'));};}
function showCemetery(player){hideHover();const dialog=$('cemetery-detail'),area=$('cemetery-content');area.replaceChildren();text(area,'h2',`Cemitério de ${player.name}`);text(area,'p',`${player.discardCount} carta(s) descartada(s) ou derrotada(s).`);const row=document.createElement('div');row.className='cemetery-cards';for(const card of [...(player.discard||[])].reverse())row.append(cardEl(card,{mini:true}));area.append(row);dialog.showModal();}
function makeSelect(options){const select=document.createElement('select');for(const [value,label] of options){const option=document.createElement('option');option.value=value;option.textContent=label;select.append(option);}return select;}
function renderSelection(){const panel=$('selection-panel');panel.replaceChildren();const card=selectedCard();if(!card){text(panel,'h3','Carta selecionada');text(panel,'p','Selecione uma carta da mão ou da reserva. Clique duas vezes para ampliar.');return;}
  text(panel,'h3',card.name);text(panel,'p',card.text||'Sem efeito.');const actions=document.createElement('div');actions.className='buttons';actions.append(button('Ampliar',()=>showCard(card)));
  if(state.spectator){panel.append(actions);return;}
  const self=seat(),inHand=self.hand?.some(c=>c.uid===card.uid),inReserve=self.reserve?.some(c=>c.uid===card.uid);
  if(state.phase==='prep'&&state.turn===self.id){
    if(inHand&&card.type==='creature'){
      actions.append(button(`Jogar criatura · ${card.cost} mana`,()=>{command({type:'play',cardId:card.uid});selected=null;},'primary',self.mana<card.cost));
      if(card.effects&&JSON.stringify(card.effects).includes('emanat'))actions.append(button(`Jogar direto em Emanação · ${card.cost} mana`,()=>{command({type:'play',cardId:card.uid,mode:'emanate'});selected=null;},'',self.mana<card.cost||self.emanation.length>=2));
    }
    if(inHand&&card.type!=='creature'){
      const kind=role(card);const targetOptions=kind==='self'||kind==='enemy-board'?[]:kind==='enemy'?(rival()?.reserve||[]).map(c=>[c.uid,`${c.name} (${c.health-c.damage} vida)`]):[['patron','Seu Patrono'],...(self.reserve||[]).map(c=>[c.uid,`${c.name} (${c.health-c.damage} vida)`])];
      const target=makeSelect(targetOptions);if(kind!=='self'&&kind!=='enemy-board'){text(actions,'span','Alvo direto','muted');actions.append(target);}
      actions.append(button(`Usar agora · ${card.cost} mana`,()=>{command({type:'play',cardId:card.uid,mode:'direct',targetId:target.value});selected=null;},'primary',self.mana<card.cost||((kind==='enemy'||kind==='friendly')&&!targetOptions.length)));
      text(actions,'span',kind==='enemy'||kind==='enemy-board'?'Ou preparar oculta na posição inimiga:':'Ou preparar aberta ao lado da posição aliada:','muted');const places=document.createElement('div');places.className='entry-buttons';for(let lane=0;lane<3;lane++)places.append(button(String(lane+1),()=>{command({type:'play',cardId:card.uid,mode:'lane',lane});selected=null;},'',self.mana<card.cost));actions.append(places);
    }
    if(inReserve&&(self.emanation.includes(card.uid)||card.effects&&JSON.stringify(card.effects).includes('emanat'))){
      const leaving=self.emanation.includes(card.uid);
      actions.append(button(leaving?'Voltar à reserva · 1 mana':'Entrar em Emanação · 1 mana',()=>command({type:'emanate',cardId:card.uid}),'',self.mana<1||(!leaving&&self.emanation.length>=2)));
    }
  }
  if(state.phase==='formation'&&!self.ready&&inReserve&&!self.emanation.includes(card.uid)){text(actions,'span','Arraste esta carta da reserva até uma das três posições.','muted');const spots=document.createElement('div');spots.className='entry-buttons formation-fallback';for(let lane=0;lane<3;lane++)spots.append(button(String(lane+1),()=>command({type:'assign',lane,cardId:card.uid})));actions.append(spots);}
  panel.append(actions);
}
function renderActions(){const box=$('phase-actions');box.replaceChildren();const self=seat();if(!self)return;const message=$('match-status');
  const label=state.phase==='coin'?'Moeda lançada':state.phase==='prep'?state.turn===self.id?'Sua preparação':'Preparação rival':state.phase==='vote'?'Decisão de combate':state.phase==='formation'?'Formação secreta':state.phase==='resolving'?'Confronto em curso':state.phase==='finished'?'Partida encerrada':'Aguardando';
  message.textContent=label+` · rodada ${state.round}`;
  if(state.spectator){text(box,'h3','Arquibancada');text(box,'p','Você acompanha a partida sem ver as mãos nem as formações secretas.');return;}
  if(state.phase==='coin'){
    text(box,'h3',state.coinWinner===self.id?'Você venceu a moeda':'Aguardando a escolha de quem venceu a moeda');
    if(state.coinWinner===self.id)for(const p of state.players)box.append(button(`${p.name} começa`,()=>command({type:'first',playerId:p.id}),'primary'));
  }else if(state.phase==='prep'){
    text(box,'h3',state.turn===self.id?'Faça suas jogadas':'Aguarde a preparação rival');
    if(state.turn===self.id){text(box,'p','Jogue criaturas na reserva. Magias podem resolver agora ou ficar junto de uma posição.');const clerics=self.reserve.filter(c=>self.emanation.includes(c.uid)&&c.modelId==='F03');const choices=clerics.map((_,index)=>{const select=makeSelect([['','Sem cura'],...self.reserve.filter(c=>c.damage>0).map(c=>[c.uid,c.name])]);text(box,'span',`Cura da Clériga ${index+1}:`,'muted');box.append(select);return select;});
      box.append(button('Encerrar preparação',()=>command({type:'endPrep',healTargetIds:choices.map(select=>select.value)}),'primary'));}
  }else if(state.phase==='vote'){
    text(box,'h3','Quer entrar em combate?');text(box,'p','Um “sim” inicia o combate imediatamente. A rodada só passa sem combate se ambos disserem “não”.');if(self.voted)text(box,'p','Você recusou. Aguardando a decisão rival.','status-pill');else{box.append(button('Sim, combater',()=>command({type:'vote',fight:true}),'primary'));box.append(button('Não combater',()=>command({type:'vote',fight:false})));}
  }else if(state.phase==='formation'){
    text(box,'h3','Distribua suas criaturas');text(box,'p','Arraste criaturas da reserva para as posições. Elas se encaixam ao soltar. A outra pessoa só vê a distribuição após ambas confirmarem.');
    if(self.ready)text(box,'p','Formação confirmada. Aguardando o rival.','status-pill');else{for(let lane=0;lane<3;lane++)box.append(button(`Limpar posição ${lane+1}`,()=>command({type:'assign',lane,cardId:null})));box.append(button('Confirmar formação',()=>command({type:'ready'}),'primary'));}
  }else if(state.phase==='resolving'){
    text(box,'h3','Confronto em andamento');text(box,'p','Acompanhe as magias, a Revelação e os choques nas três posições. O resultado será aplicado ao fim da animação.');
  }else if(state.phase==='finished'){
    text(box,'h3',state.winner?state.winner===self.id?'Você venceu!':`${rival().name} venceu!`:'Empate!');box.append(button('Nova partida',()=>{selected=null;command({type:'reset'});},'primary'));
  }
}
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function visualMessage(title,caption='',duration=1050){const layer=$('visual-layer');const box=document.createElement('div');box.className='visual-message';text(box,'strong',title);if(caption)text(box,'span',caption);layer.append(box);setTimeout(()=>box.remove(),duration);}
function center(node){const rect=node?.getBoundingClientRect();return rect?{x:rect.left+rect.width/2,y:rect.top+rect.height/2}:{x:innerWidth/2,y:innerHeight/2};}
function fly(symbol,from,to,kind='spell'){const start=center(from),end=center(to);const node=document.createElement('div');node.className=`flying-effect ${kind}`;node.textContent=symbol;node.style.left=`${start.x}px`;node.style.top=`${start.y}px`;$('visual-layer').append(node);const animation=node.animate([{transform:'translate(-50%,-50%) scale(.7)',opacity:0},{transform:'translate(-50%,-50%) scale(1.2)',opacity:1,offset:.18},{transform:`translate(calc(${end.x-start.x}px - 50%),calc(${end.y-start.y}px - 50%)) scale(.9)`,opacity:1,offset:.84},{transform:`translate(calc(${end.x-start.x}px - 50%),calc(${end.y-start.y}px - 50%)) scale(1.8)`,opacity:0}],{duration:900,easing:'ease-in-out'});animation.finished.finally(()=>{node.remove();to?.classList.add('visual-hit');setTimeout(()=>to?.classList.remove('visual-hit'),650);});}
async function animateEvent(event){const player=state?.players.find(p=>p.id===event.playerId);const mine=player?.id===seat()?.id;const from=$(mine?'self-head':'opponent-head');const target=event.targetId?document.querySelector(`.card[data-uid="${event.targetId}"]`):null;
  if(event.type==='turn'){visualMessage('INÍCIO DE TURNO',`${player?.name||'Jogador'} · rodada ${event.round}`,1150);await pause(1050);}
  else if(event.type==='draw'){visualMessage('COMPRA DE CARTA',player?.name||'',1100);fly('▰',from,$(mine?'hand':'opponent-head'),'draw');await pause(1000);}
  else if(event.type==='burn'){visualMessage('MÃO CHEIA',`${player?.name||'Jogador'} perdeu a compra excedente`,1100);fly('▰',from,$(mine?'self-grave':'opponent-grave'),'burn');await pause(1000);}
  else if(event.type==='spell'){visualMessage(event.name,event.op==='area_damage'?'Dano em área':event.op==='heal'?'Cura':event.op==='attack_modifier'?'Aprimoramento':'Magia resolvida',1100);fly(event.op==='heal'?'✦':event.op==='draw'?'▰':event.op==='area_damage'?'✷':'➶',from,target||$('lanes'),event.op==='heal'?'positive':'spell');await pause(1050);}
  else if(event.type==='summon'){visualMessage('CONVOCAÇÃO',event.name,950);fly('✦',from,$(mine?'self-reserve':'opponent-reserve'),'positive');await pause(900);}
}
function queueEvents(){const events=state?.events||[];const newest=events.at(-1)?.id||0;if(!visualBooted){lastVisualId=newest;visualBooted=true;return;}for(const event of events.filter(x=>x.id>lastVisualId))visualQueue=visualQueue.then(()=>animateEvent(event)).catch(()=>{});lastVisualId=newest;}
function tickCombat(){
  const overlay=$('battle-overlay');if(!state?.combat||state.phase!=='resolving'){overlay.hidden=true;lastBattleStep='';return;}
  const battle=state.combat,elapsed=Math.max(0,Date.now()-serverClockOffset-battle.startedAt);let remaining=elapsed,index=0;for(;index<battle.timeline.length-1&&remaining>=battle.timeline[index].duration;index++)remaining-=battle.timeline[index].duration;
  const key=`${battle.id}:${index}`;if(key===lastBattleStep)return;lastBattleStep=key;overlay.hidden=false;
  const step=battle.timeline[index],lanes=[...document.querySelectorAll('.lane')];for(const lane of lanes){lane.classList.remove('battle-reveal','battle-magic','battle-revelation','battle-clash','battle-aftermath');for(const side of lane.querySelectorAll('.lane-side')){side.classList.remove('effect-positive','effect-negative');delete side.dataset.effect;}}
  const classes={reveal:'battle-reveal',magic:'battle-magic',revelation:'battle-revelation',clash:'battle-clash',result:'battle-aftermath'};
  let caption={reveal:'As formações deixam de ser segredo.',revelation:'Habilidades de Revelação entram em ação.',clash:'Criaturas se chocam; posições vazias expõem o Patrono.',result:'O resultado está sendo aplicado.'}[step.kind]||'';
  if(step.kind==='magic'){const spell=step.spell;caption=`${spell.name} · posição ${spell.lane+1} · ${spell.positive?'efeito aliado':'efeito hostil'}`;const side=lanes[spell.lane]?.querySelector(`.lane-side[data-owner="${spell.targetSide}"]`);if(side){side.classList.add(spell.positive?'effect-positive':'effect-negative');side.dataset.effect=`${spell.positive?'+':'−'}${spell.amount||'efeito'}`;fly(spell.op==='area_damage'?'✷':spell.positive?'✦':'➶',$(spell.casterId===seat()?.id?'self-head':'opponent-head'),side,spell.positive?'positive':'spell');}}
  lanes.forEach(lane=>lane.classList.add(classes[step.kind]));$('battle-banner').textContent={reveal:'FORMAÇÕES REVELADAS',magic:'MAGIA EM AÇÃO',revelation:'REVELAÇÃO',clash:'CONFRONTO',result:'RESULTADO'}[step.kind];$('battle-caption').textContent=caption;
}
function render(){hideHover();renderGate();lastRevision=state?.revision??-1;if(!state){lastPhase=null;return;}if(lastPhase==='resolving'&&state.phase!=='resolving')visualMessage('CONFRONTO ENCERRADO',state.phase==='finished'?'Partida concluída':'A próxima rodada começa',1250);lastPhase=state.phase;if(state.phase==='lobby'){queueEvents();return;}renderBoard();renderSelection();renderActions();lastBattleStep='';tickCombat();queueEvents();}
async function enter(mode){try{const name=$('player-name').value.trim();if(!name)throw Error('Informe seu nome.');const id=$('join-code').value.trim().toUpperCase();const role=isInvitation()?'auto':$('entry-role').value;const result=mode==='create'?await api('/api/create',{name,role}):await api(`/api/rooms/${id}/join`,{name,role});sessionStorage.setItem('runamarca-nova-seat',JSON.stringify({code:result.code,token:result.token}));history.replaceState(null,'',`${gameBase}?room=${result.code}`);state=result.state;serverClockOffset=Date.now()-state.serverNow;render();}catch(e){err(e);}}
$('create').onclick=()=>enter('create');$('join').onclick=()=>enter('join');$('copy-link').onclick=async()=>{const link=`${location.origin}${gameBase}?room=${state.code}&invite=${state.inviteToken}`;try{await navigator.clipboard.writeText(link);err('Convite copiado. Quem receber o link entra sem código de acesso.');}catch{err(link);}};
$('leave-room').onclick=()=>command({type:'leave'});$('change-role').onclick=()=>command({type:state.spectator?'takeSeat':'spectate'});
$('close-detail').onclick=()=>$('card-detail').close();$('rules-toggle').onclick=()=>$('rules-summary').hidden=!$('rules-summary').hidden;
$('close-cemetery').onclick=()=>$('cemetery-detail').close();
$('art-import').onchange=async event=>{try{const data=JSON.parse(await event.target.files[0].text());if(data.format!=='runamarca-prototipo-editor'||!Array.isArray(data.cards))throw Error('Exporte o projeto editável no novo criador de cartas.');let count=0;for(const card of data.cards){if(!card.art||!card.starterDeck)continue;const deck=models.decks.find(d=>d.id===card.starterDeck);const model=[...deck?.cards||[],deck?.patron].find(c=>c?.name===card.name);if(model){(importedArt[deck.id]??={})[model.id]={image:card.art,kind:'illustration'};count++;}}$('art-message').textContent=`${count} ilustração(ões) pronta(s). Escolha o deck depois de importar.`;}catch(e){err(e);}event.target.value='';};
const slug=name=>String(name).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
async function compactImage(file){const bitmap=await createImageBitmap(file);const scale=Math.min(1,900/bitmap.width,1260/bitmap.height);const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();return canvas.toDataURL('image/jpeg',.74);}
$('art-files').onchange=async event=>{let count=0;try{for(const file of event.target.files){if(!['image/png','image/jpeg','image/webp'].includes(file.type))continue;const stem=slug(file.name.replace(/\.[^.]+$/,''));for(const deck of models.decks){const model=[...deck.cards,deck.patron].find(card=>slug(card.name)===stem);if(model){(importedArt[deck.id]??={})[model.id]={image:await compactImage(file),kind:'card'};count++;break;}}}$('art-message').textContent=`${count} imagem(ns) associada(s). Escolha o deck depois de importar. Os arquivos devem ter o nome da carta.`;}catch(e){err(e);}event.target.value='';};
async function init(){try{models=await (await fetch('cartas.json')).json();const room=new URLSearchParams(location.search).get('room');if(room)$('join-code').value=room.toUpperCase();const saved=sessionStorage.getItem('runamarca-nova-seat');if(room&&saved&&JSON.parse(saved).code!==room.toUpperCase())sessionStorage.removeItem('runamarca-nova-seat');await refresh();render();setInterval(refresh,500);setInterval(tickCombat,90);}catch(e){err(e);}}
init();
