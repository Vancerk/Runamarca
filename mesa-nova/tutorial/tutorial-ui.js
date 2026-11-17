/* Uses normal table controls; all progress and snapshots come from the server. */
(()=>{
 const key='runamarca-tutorial-campaign-v2',get=id=>document.getElementById(id);
 const titles=['O primeiro confronto','Magias e seus momentos','Escolhas do estrategista'];
 const descriptions=['Aprenda a jogar suas cartas e combater.','Experimente os efeitos das cartas.','Combine apoio e poderes do Patrono.'];
 let busy=false,lastKey='',help=false,previousFocus=null,marked=[],campaign=null,menuKey='';
 const saved=()=>{try{return JSON.parse(localStorage.getItem(key));}catch{return null;}};
 const remember=reply=>{try{localStorage.setItem(key,JSON.stringify({token:reply.token,code:reply.code}));}catch{}};
 const menu=document.createElement('div');menu.id='tutorial-menu';
 for(let duel=1;duel<=3;duel++){
  const card=document.createElement('section');card.className='tutorial-choice';
  card.innerHTML=`<h3>${titles[duel-1]}</h3><p>${descriptions[duel-1]}</p><span id="tutorial-status-${duel}">Ainda não iniciado</span><div class="tutorial-choice-buttons"><button id="${duel===1?'tutorial-start':'tutorial-start-'+duel}" class="primary">Começar</button><button id="tutorial-resume-${duel}" hidden>Retomar</button></div>`;
  card.querySelector('.primary').onclick=()=>start(duel,false);card.querySelector('[id^="tutorial-resume-"]').onclick=()=>start(duel,true);menu.append(card);
 }
 const menuError=document.createElement('p');menuError.id='tutorial-menu-error';menuError.setAttribute('role','alert');menu.append(menuError);
 get('create').before(menu);const back=document.createElement('a');back.href='/runamarca/';back.textContent='Voltar à mesa';back.className='tutorial-back';back.title='Seu progresso no tutorial é salvo automaticamente.';get('entry-note').replaceChildren(back);document.body.classList.add('tutorial-preview');
 for(const element of document.querySelectorAll('.creator-entry'))element.hidden=true;
 get('welcome').querySelector('.hero p').textContent='RUNAMARCA';get('welcome').querySelector('.hero h1').textContent='Aprenda jogando.';get('welcome').querySelector('.hero span').textContent='';
 const panel=document.createElement('aside');panel.id='tutorial-panel';panel.hidden=true;panel.setAttribute('aria-label','Guia do treino');
 panel.innerHTML='<h2 id="tutorial-title"></h2><p id="tutorial-text"></p><div class="tutorial-buttons"><button id="tutorial-continue" class="primary">Entendi</button></div><p id="tutorial-error" role="alert"></p>';
 const tools=document.createElement('nav');tools.id='tutorial-tools';tools.hidden=true;tools.setAttribute('aria-label','Ajuda da partida');tools.innerHTML='<button id="tutorial-pause">Pausar</button><button id="tutorial-help">Ajuda</button>';
 const shield=document.createElement('div');shield.id='tutorial-shield';shield.hidden=true;shield.setAttribute('aria-hidden','true');document.body.append(shield,panel,tools);
 const focusGuide=globalThis.RunaTutorialFocus.create(panel,shield);
 async function start(duel=state?.tutorial?.duel||1,resume=false){
  if(busy)return;busy=true;menuError.textContent='';get('tutorial-error').textContent='';
  try{
   const token=saved()?.token;
   const result=await fetch(gameBase+'api/tutorial',{method:'POST',headers:{'Content-Type':'application/json',...(token?{'x-player-token':token}:{})},body:JSON.stringify({duel,resume,name:get('player-name').value||'Aprendiz'})});
   const reply=await result.json();if(!result.ok)throw Error(reply.error);
   remember(reply);sessionStorage.setItem('runamarca-tutorial-seat',JSON.stringify({code:reply.code,token:reply.token}));
   history.replaceState({},'',gameBase+'?room='+reply.code);state=reply.state;lastRevision=-1;serverClockOffset=Date.now()-state.serverNow;help=false;lastKey='';render();sync();
  }catch(error){menuError.textContent=error.message;get('tutorial-error').textContent=error.message;}finally{busy=false;}
 }
 async function send(action,{home=false}={}){
  if(busy||!state)return;busy=true;get('tutorial-error').textContent='';sync();
  try{const reply=home&&['won','retry'].includes(state.tutorial.status)?state:await api(`/api/rooms/${state.code}/act`,action);state=reply;serverClockOffset=Date.now()-reply.serverNow;campaign=reply.tutorial.campaign;
   if(home){get('room-menu')?.close();sessionStorage.removeItem('runamarca-tutorial-seat');state=null;selected=null;lastRevision=-1;history.replaceState({},'',gameBase);}
   render();lastKey='';sync();
  }catch(error){get('tutorial-error').textContent=error.message;void refresh();}finally{busy=false;}
 }
 get('tutorial-continue').onclick=()=>{
  const t=state?.tutorial;if(!t||busy)return;
  if(t.instruction?.kind==='explain')void send({type:'tutorialContinue',sceneId:t.instruction.id});
  else if(t.status==='retry')void start();
  else if(t.status==='won'){if(t.duel<3)void start(t.duel+1,false);else void send({type:'tutorialPause'},{home:true});}
  else if(t.clock.paused)void send({type:'tutorialResume'});
  else{help=false;lastKey='';sync();}
 };
 get('tutorial-pause').onclick=()=>send({type:'tutorialPause'});
 get('leave-room').onclick=()=>send({type:'tutorialPause'},{home:true});
 get('tutorial-help').onclick=()=>{help=!help;lastKey='';sync();};
 function hint(){const s=state,p=s.players.find(p=>p.id===s.you);
  if(s.phase==='mulligan')return ['Sua mão inicial','Marque as cartas que deseja trocar ou mantenha todas. Depois confirme sua mão.','opening'];
  if(s.phase==='prep')return s.turn===s.you?['Sua preparação','Arraste uma carta para a reserva. Confira o custo e sua mana. Clique em Encerrar quando estiver pronto.','hand']:['O rival está preparando','Acompanhe as cartas que ele coloca na mesa.',null];
  if(s.phase==='vote')return ['Hora de decidir','Escolha Começar combate para montar sua formação.','actions'];
  if(s.phase==='formation')return p.ready?['Formação confirmada','O rival vai confirmar a dele.',null]:['Monte sua formação','Arraste suas criaturas para as casas escolhidas. Confira as condições das magias preparadas. Depois clique em Encerrar.','lanes'];
  if(s.phase==='resolving')return ['Observe o confronto','Veja as ativações e acompanhe a vida das criaturas e dos Patronos.',null];
  return ['Sua vez','Escolha sua próxima jogada.',null];
 }
 function clearMarks(){for(const node of marked)node.classList.remove('tutorial-focus');marked=[];}
 function focusTargets(focus,note={}){
  const card=(zone,id)=>[...document.querySelectorAll(zone+' .card')].find(n=>n.dataset.uid===id);
  const actions=[...document.querySelectorAll('#phase-actions button')].filter(n=>!n.disabled&&n.getClientRects().length);
  const end=actions.find(n=>/Encerrar/.test(n.textContent));
  const laneNodes=[...document.querySelectorAll('#lanes .lane-side')].filter(n=>n.dataset.owner===state?.you&&(!note.lanes||note.lanes.includes(Number(n.dataset.lane))));
  const hand=card('#hand',note.cardId),reserve=card('#self-reserve',note.cardId),mana=get('self-head')?.querySelector('.patron-ether');
  const point={targets:[],source:null,destinations:[],frame:[],curved:false};
  const assign=(targets,source,destinations,frame=[],curved=false)=>Object.assign(point,{targets:targets.filter(Boolean),source,destinations:destinations.filter(Boolean),frame:frame.filter(Boolean),curved});
  // The fan container is wider and shorter than its cards. Frame the actual
  // cards, including their lower edges, so the teaching camera cannot cut them.
  const playableFrame=[...document.querySelectorAll('#hand .card'),get('self-reserve'),get('phase-actions'),mana];
  if(focus==='play-action')return assign([hand,get('self-reserve'),mana],hand,[get('self-reserve')],playableFrame);
  if(focus==='direct-action')return assign([hand,card('#self-reserve',note.targetId),mana],hand,[card('#self-reserve',note.targetId)],playableFrame);
  if(focus==='formation-action')return assign([reserve,...laneNodes],reserve,laneNodes,[get('self-reserve'),...laneNodes,get('phase-actions')]);
  if(focus==='prepare-action')return assign([hand,...laneNodes,mana],hand,laneNodes,[...playableFrame,...laneNodes]);
  if(focus==='emanation-action'){const slots=[...document.querySelectorAll('#self-emana>*')];return assign([hand,...slots,mana],hand,slots,[...playableFrame,...slots]);}
  if(focus==='end-preparation')return assign([reserve,end,...(note.concepts?.includes('mana')?[mana]:[])],null,[end],playableFrame,true);
  if(focus==='confirm-formation')return assign([end],null,[end],[get('self-reserve'),...laneNodes,get('phase-actions')],true);
  if(focus==='vote-action')return assign(actions,null,[actions.find(n=>/Começar/.test(n.textContent))||actions[0]],[get('phase-actions')],true);
  if(focus==='opening'){const cards=[...document.querySelectorAll('#mulligan-cards .card')],confirm=get('mulligan-confirm');return assign(cards,null,[confirm],[...cards,get('mulligan-controls')],true);}
  if(focus==='powers'){const power=get('self-head')?.querySelector('[data-power="forjar-armadura"]');return assign([power,mana],null,[power],playableFrame,true);}
  const selectors={'rival-heart':'#opponent-head .patron-heart','self-heart':'#self-head .patron-heart','enemy-patron':'#opponent-head .patron-heart','mana':'#self-head .patron-ether','reserve':'#self-reserve','hand':'#hand .card','actions':'#phase-actions','lanes':'#lanes .lane-side','emanation':'#self-emana>*'};
  return assign([...document.querySelectorAll(selectors[focus]||'#tutorial-no-target')].filter(n=>focus!=='lanes'||n.dataset.owner===state?.you),null,[]);
 }
 function menuSync(){
  get('entry-title').textContent='Escolha por onde começar';if(!get('entry-note').contains(back))get('entry-note').replaceChildren(back);
  const signature=JSON.stringify(campaign);if(signature===menuKey)return;menuKey=signature;
  for(let duel=1;duel<=3;duel++){const p=campaign?.duels.find(d=>d.duel===duel);get('tutorial-status-'+duel).textContent=p?.won?'Concluído':p?.saved?'Em andamento':'';get('tutorial-resume-'+duel).hidden=!p?.saved;get(duel===1?'tutorial-start':'tutorial-start-'+duel).textContent=p?.saved?'Recomeçar':'Começar';}
 }
 function sync(){
  const t=state?.tutorial;shield.hidden=!t?.clock.paused;document.body.classList.toggle('tutorial-active',Boolean(t));panel.hidden=!t;tools.hidden=!t;
  if(!t){clearMarks();focusGuide.clear();get('game').inert=false;get('mulligan-overlay').inert=false;lastKey='';previousFocus=null;menuSync();return;}
  campaign=t.campaign||campaign;const frozen=t.clock.paused;get('game').inert=frozen;get('mulligan-overlay').inert=frozen;
  const finished=['won','retry'].includes(t.status),raw=t.instruction,note=frozen&&raw?.kind==='action'?null:raw,actionable=note?.kind==='action',h=hint(),signature=JSON.stringify([state.revision,t.version,note?.key,help,busy,t.status,t.persistence,t.campaign,frozen]);
  panel.classList.toggle('tutorial-action-guide',Boolean(actionable));get('tutorial-continue').hidden=Boolean(actionable&&!frozen&&!finished);
  panel.hidden=!note&&!help&&!frozen&&!finished;tools.hidden=frozen||finished;
  if(signature!==lastKey){
   lastKey=signature;
   get('tutorial-title').textContent=finished?(t.status==='won'?'Você venceu!':'Vamos tentar de novo'):note?.title||(frozen?'Partida pausada':h[0]);
   const outcome=t.status==='won'?(t.duel<3?'Vamos experimentar novas jogadas.':'Você já conhece o caminho. Experimente outras escolhas quando quiser.'):'Proteja seu Patrono e tente outra estratégia.';
   get('tutorial-text').textContent=finished?outcome:note?.text||(frozen?'Retome quando estiver pronto.':h[1]);
   get('tutorial-continue').textContent=finished?(t.status==='retry'?'Tentar novamente':t.duel<3?'Continuar':'Concluir'):frozen&&!note?'Retomar':'Entendi';
   if(t.persistence?.error)get('tutorial-error').textContent=t.persistence.error;
   for(const b of [...panel.querySelectorAll('button'),...tools.querySelectorAll('button')])b.disabled=busy||t.persistence?.saved===false;
  }
  const guide=note||help?focusTargets(note?.focus||h[2],note||{}):{targets:[],frame:[],destinations:[]};
  const nextMarks=guide.targets.filter(n=>n&&n.getClientRects().length);
  // Periodic status refreshes must not remove/re-add the same highlight. That
  // restarts CSS state and invalidates the 3D scene even with an unchanged cue.
  for(const node of marked)if(!nextMarks.includes(node))node.classList.remove('tutorial-focus');
  for(const node of nextMarks)if(!marked.includes(node))node.classList.add('tutorial-focus');marked=nextMarks;
  focusGuide.update({key:JSON.stringify([state.code,note?.key,help,frozen,finished,state.phase,t.persistence?.saved]),targets:marked,frameTargets:guide.frame,source:guide.source,destinations:guide.destinations,curved:guide.curved,actionable,paused:frozen,contextual:Boolean(note||help),maxScale:note?.maxScale,quiet:!note&&!help&&!frozen&&!finished,showProgress:false});
  const focusKey=panel.hidden||actionable?null:note?.key||(finished?t.status:frozen?'paused':help?'help':null);if(focusKey&&previousFocus!==focusKey&&!get('tutorial-continue').disabled){previousFocus=focusKey;get('tutorial-continue').focus({preventScroll:true});}else if(!focusKey)previousFocus=null;
 }
 panel.addEventListener('keydown',event=>{if(!state?.tutorial?.clock.paused||event.key!=='Tab')return;const buttons=[...panel.querySelectorAll('button,input')].filter(b=>!b.hidden&&!b.disabled&&b.getClientRects().length),index=buttons.indexOf(document.activeElement);if(event.shiftKey&&index<=0){event.preventDefault();buttons.at(-1)?.focus();}else if(!event.shiftKey&&index===buttons.length-1){event.preventDefault();buttons[0]?.focus();}});
 async function loadProgress(){const token=saved()?.token;if(!token)return;try{const result=await fetch(gameBase+'api/tutorial/progress',{headers:{'x-player-token':token}}),data=await result.json();if(!result.ok)throw Error(data.error);campaign=data.campaign;menuSync();}catch(error){menuError.textContent=error.message;}}
 // Request a safe pause when leaving. The server also pauses abandoned sessions
 // after a missed heartbeat; rehydration after a server restart is always paused.
 addEventListener('pagehide',()=>{if(!state?.tutorial||state.tutorial.status!=='active')return;const token=saved()?.token;if(!token)return;void fetch(gameBase+`api/rooms/${state.code}/act`,{method:'POST',keepalive:true,headers:{'Content-Type':'application/json','x-player-token':token},body:JSON.stringify({id:crypto.randomUUID(),version:state.tutorial.version,action:{type:'tutorialPause'}})}).catch(()=>{});});
 globalThis.RunaTutorial={start,sync,renderMenu:menuSync,beforeRender:()=>focusGuide.beforeRender(),afterRender:sync,get transitioning(){return busy;}};void loadProgress();setInterval(sync,180);sync();
})();
