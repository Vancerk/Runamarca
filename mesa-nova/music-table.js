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
 const muteLabel=document.createElement('label'),mute=document.createElement('input');mute.type='checkbox';mute.checked=Boolean(saved.muted);
 muteLabel.className='table-music-mute';muteLabel.append(mute,document.createTextNode('Silenciar trilha e ambiente'));panel.append(muteLabel);
 const start=document.createElement('button');start.type='button';start.textContent='Ativar áudio';start.hidden=true;
 panel.append(start,status);
 (document.querySelector('.room-sidebar')||document.getElementById('table-tools')).append(host);
 let player=null,catalog=null,timer=null,destroyed=false,gesture=false,loading=false;
 const labels={idle:'A trilha começa com a partida.',loading:'Carregando trilha…',playing:'Trilha compartilhada da partida.',blocked:'Clique em Ativar áudio.',error:'Não foi possível carregar o áudio.', 'waiting-gesture':'Clique na mesa para ativar o áudio.'};
 function show(value){status.textContent=labels[value]||value;host.dataset.playback=value;start.hidden=!['blocked','error','waiting-gesture'].includes(value);}
 function save(){
  const prefs={music:Number(music.value)/100,ambience:Number(ambience.value)/100,muted:mute.checked};
  player?.preferences(prefs);try{localStorage.setItem('runamarca-music-v1',JSON.stringify(prefs));}catch{}
 }
 mute.addEventListener('change',save);
 const unlock=()=>{gesture=true;player?.unlock();};
 start.addEventListener('click',()=>{gesture=true;if(player)player.retry();else loadCatalog();});
 document.addEventListener('pointerdown',unlock,{passive:true});document.addEventListener('keydown',unlock);
 function sync(){
  const next=typeof state==='undefined'?null:state;
  host.dataset.stage=next?.music?.stage||'none';
  host.dataset.track=next?.music?.trackId||'';
  host.dataset.since=String(next?.music?.since||'');
  player?.update(next?.music||null);
 }
 const previousRender=render;render=function(){try{return previousRender.apply(this,arguments);}finally{sync();}};
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
 window.addEventListener('pagehide',event=>{if(!event.persisted){destroyed=true;clearInterval(timer);player?.dispose();}});
 globalThis.RunaMusic={sync};
})();
