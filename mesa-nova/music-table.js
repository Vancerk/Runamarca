/* Adapter for the existing table. The server owns the cue; this tab owns volume. */
(function(){
 const host=document.createElement('details');host.className='table-music-controls';
 const summary=document.createElement('summary');summary.textContent='Áudio da mesa';host.append(summary);
 const panel=document.createElement('div');panel.className='table-music-panel';host.append(panel);
 const status=document.createElement('small');status.setAttribute('role','status');
 const audioMount=document.createElement('div');audioMount.hidden=true;host.append(audioMount);
 function range(name,value){
  const label=document.createElement('label'),caption=document.createElement('span'),input=document.createElement('input'),output=document.createElement('output');
  caption.textContent=name;input.type='range';input.min='0';input.max='100';input.step='1';input.value=String(value);
  input.setAttribute('aria-label','Volume de '+name.toLowerCase());
  output.textContent=value+'%';label.append(caption,input,output);panel.append(label);
  input.addEventListener('input',()=>{output.textContent=input.value+'%';save();});return input;
 }
 let saved={};try{saved=JSON.parse(localStorage.getItem('runamarca-music-v1')||'{}')||{};}catch{}
 const percent=(value,fallback)=>Number.isFinite(value)?Math.min(100,Math.max(0,Math.round(value*100))):fallback;
 const music=range('Música',percent(saved.music,17)),ambience=range('Ambiente',percent(saved.ambience,7));
 const mix=globalThis.RunaAudioMix,initialMix=mix?.snapshot()||{};
 const effects=range('Efeitos',percent(initialMix.effects,100)),voice=range('Vozes',percent(initialMix.voice,100));
 const muteLabel=document.createElement('label'),mute=document.createElement('input');mute.type='checkbox';mute.checked=Boolean(saved.muted);
 muteLabel.className='table-music-mute';muteLabel.append(mute,document.createTextNode('Silenciar trilha e ambiente'));panel.append(muteLabel);
 const masterLabel=document.createElement('label'),master=document.createElement('input');master.type='checkbox';master.checked=initialMix.muted===true;
 masterLabel.className='table-music-mute';masterLabel.append(master,document.createTextNode('Silenciar todo o áudio'));panel.append(masterLabel);
 const note=document.createElement('small');note.className='audio-caption-note';note.textContent='As legendas das falas continuam visíveis com o som desligado.';panel.append(note);
 const start=document.createElement('button');start.type='button';start.textContent='Ativar áudio';start.hidden=true;
 panel.append(start,status);
 (document.querySelector('.room-sidebar')||document.getElementById('table-tools')).append(host);
 let player=null,catalog=null,timer=null,destroyed=false,gesture=false,loading=false;
 const labels={idle:'A trilha começa com a partida.',loading:'Carregando trilha…',playing:'Trilha compartilhada da partida.',blocked:'Clique em Ativar áudio.',error:'Não foi possível carregar o áudio.', 'waiting-gesture':'Clique na mesa para ativar o áudio.'};
 function show(value){const resting=host.dataset.stage!=='none'&&!host.dataset.track&&value==='playing';status.textContent=resting?'Pausa musical · ambiente da mesa.':labels[value]||value;host.dataset.playback=value;start.hidden=!['blocked','error','waiting-gesture'].includes(value);}
 function save(){
  const prefs={music:Number(music.value)/100,ambience:Number(ambience.value)/100,muted:mute.checked};
  mix?.preferences({effects:Number(effects.value)/100,voice:Number(voice.value)/100,muted:master.checked});
  player?.preferences({...prefs,muted:prefs.muted||master.checked});try{localStorage.setItem('runamarca-music-v1',JSON.stringify(prefs));}catch{}
 }
 mute.addEventListener('change',save);master.addEventListener('change',save);
 const unsubscribe=mix?.subscribe(prefs=>{master.checked=prefs.muted;player?.preferences({music:Number(music.value)/100,ambience:Number(ambience.value)/100,muted:mute.checked||prefs.muted});});
 const unlock=()=>{gesture=true;player?.unlock();};
 start.addEventListener('click',()=>{gesture=true;if(player)player.retry();else loadCatalog();});
 document.addEventListener('pointerdown',unlock,{passive:true});document.addEventListener('keydown',unlock);
 function sync(){
  const next=typeof state==='undefined'?null:state;
  host.dataset.stage=next?.music?.stage||'none';
  host.dataset.track=next?.music?.trackId||'';
  host.dataset.since=String(next?.music?.since||'');
  player?.update(next?.music||null);
  show(host.dataset.playback||'idle');
 }
 RunaPresentation.register('music',{after:sync});
 show('idle');
 function loadCatalog(){
 if(loading||destroyed)return;loading=true;
 fetch(gameBase+'music-catalog.json?v=20261017-epidemic').then(response=>{
  if(!response.ok)throw Error('Catálogo indisponível');return response.json();
 }).then(value=>{
  if(destroyed)return;catalog=value;
  player=RunaMusicPlayer.create({catalog,base:gameBase,
   createAudio:()=>{const node=document.createElement('audio');node.hidden=true;node.setAttribute('aria-hidden','true');audioMount.append(node);return node;},
   now:()=>Date.now()-(typeof serverClockOffset==='number'?serverClockOffset:0),
   // The card's own musical bed is mixed separately. Only the table ambience recedes here.
   duck:()=>document.body.classList.contains('creature-entrance-active') ? .45 : (document.body.classList.contains('patron-intro-active')||document.body.classList.contains('patron-voice-active')) ? .28 : 1,
   onStatus:show,
  });
  save();sync();if(gesture)player.unlock();timer=setInterval(()=>player.tick(),50);
 }).catch(()=>{if(!destroyed)show('error');}).finally(()=>{loading=false;});
 }
 loadCatalog();
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)player?.tick();});
 window.addEventListener('pagehide',event=>{if(!event.persisted){destroyed=true;clearInterval(timer);player?.dispose();unsubscribe?.();}});
 globalThis.RunaMusic={sync};
})();
