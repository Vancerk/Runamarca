/* Uses the live match-introduction renderer and the same dialogue manifest. */
(async()=>{
 const response=await fetch('patron-dialogues.json',{cache:'no-store'});if(!response.ok)throw Error('Não foi possível carregar as falas.');
 const manifest=await response.json(),section=document.createElement('section');section.id='patron-voices';
 const title=document.createElement('h2');title.textContent='Falas de introdução dos Patronos';
 const note=document.createElement('p');const recorded=Object.keys(manifest.characters).filter(id=>manifest.matchups.flatMap(m=>m.lines).filter(l=>l.speaker===id).every(l=>l.audio));const pendingCharacters=Object.keys(manifest.characters).filter(id=>!recorded.includes(id));note.textContent='Escolha o confronto para conferir a ordem das falas. Áudios recebidos: '+recorded.map(id=>manifest.characters[id].name).join(', ')+'.'+(pendingCharacters.length?' Aguardando: '+pendingCharacters.map(id=>manifest.characters[id].name).join(', ')+'.':' Todos os diálogos estão completos.');
 if(manifest.voicePack?.name)note.textContent+=' Versão ativa: '+manifest.voicePack.name+'.';
 const select=document.createElement('select');select.setAttribute('aria-label','Diálogo dos Patronos');
 const list=document.createElement('ol');list.className='patron-voice-list';
 for(const matchup of manifest.matchups){const option=document.createElement('option');option.value=matchup.id;option.textContent=matchup.label||manifest.characters[matchup.first].name+' → '+manifest.characters[matchup.second].name;select.append(option);}
 function stopOthers(current){section.querySelectorAll('audio').forEach(audio=>{if(audio!==current){audio.pause();audio.currentTime=0;}});}
 function render(){stopOthers(null);list.replaceChildren();const matchup=manifest.matchups.find(m=>m.id===select.value);for(const [i,line] of matchup.lines.entries()){
  const item=document.createElement('li'),name=document.createElement('strong'),text=document.createElement('p');name.textContent=(i+1)+'. '+manifest.characters[line.speaker].name+(line.role?' · Lyrik '+(line.role==='first'?'1':'2'):'')+(line.recordingCode?' · '+line.recordingCode:'');text.textContent='“'+line.text+'”';item.append(name,text);
  if(line.audio){const audio=document.createElement('audio');audio.controls=true;audio.preload='metadata';audio.src=line.audio;audio.setAttribute('aria-label','Ouvir '+manifest.characters[line.speaker].name+': '+line.text);audio.addEventListener('play',()=>stopOthers(audio));audio.addEventListener('error',()=>{const warning=document.createElement('p');warning.textContent='Áudio indisponível. Tente recarregar a página.';item.append(warning);},{once:true});item.append(audio);}
  else{const pending=document.createElement('span');pending.className='voice-pending';pending.textContent='Áudio aguardando envio';item.append(pending);}list.append(item);
 }}
 const buttons=document.createElement('div');buttons.className='controls';
 for(const [label,arrivalOnly] of [['Ver introdução completa',false],['Ver somente as chegadas',true]]){const button=document.createElement('button');button.type='button';button.textContent=label;button.onclick=async()=>{
  stopOthers(null);const matchup=manifest.matchups.find(m=>m.id===select.value),first=manifest.characters[matchup.first],second=manifest.characters[matchup.second];
  const players=[{id:'self',patron:{...first}},{id:'opponent',patron:{...second}}];
  for(const p of players){const head=document.getElementById(p.id==='self'?'self-head':'opponent-head').querySelector('.patron-card');head.style.backgroundImage='url("'+p.patron.image+'")';head.title=p.patron.name;}
  button.disabled=true;select.disabled=true;const previousScroll=window.scrollY;
  try{await run(()=>{document.querySelector('.stage').scrollIntoView({block:'center',behavior:'instant'});return RunaPatronIntro.play({players,dialogueId:matchup.id,firstId:'self',selfId:'self',base:new URL('./',location.href).pathname,getAudioContext:()=>audioContext,arrivalOnly,getHome:id=>document.getElementById(id==='self'?'self-head':'opponent-head').querySelector('.patron-card')});},label);}
  finally{button.disabled=false;select.disabled=false;window.scrollTo({top:previousScroll,behavior:'instant'});}
 };buttons.append(button);}
 select.addEventListener('change',()=>{RunaPatronIntro.cancel();render();});section.append(title,note,select,buttons,list);document.querySelector('main').append(section);render();
 const cueTitle=document.createElement('h3');cueTitle.textContent='Lyrik · Poderes, vitórias e derrota';section.append(cueTitle);
 const cues=document.createElement('ol');cues.className='patron-voice-list';section.append(cues);
 const bank=manifest.cues?.lyrik;
 const entries=bank?[...Object.values(bank.powers).map(line=>[line.label,line]),['Vitória · Geral',bank.victory.neutral],['Vitória · Marika',bank.victory.marika],['Vitória · Outro Lyrik',bank.victory.lyrik],['Derrota',bank.defeat]]:[];
 for(const [label,line] of entries){if(!line)continue;const item=document.createElement('li'),heading=document.createElement('strong'),text=document.createElement('p'),audio=document.createElement('audio');heading.textContent=label+' · '+line.recordingCode;text.textContent=line.text;audio.controls=true;audio.preload='metadata';audio.src=line.audio;audio.setAttribute('aria-label','Ouvir '+label);audio.addEventListener('play',()=>stopOthers(audio));item.append(heading,text,audio);cues.append(item);}

})().catch(error=>{const note=document.createElement('p');note.textContent=error.message;document.querySelector('main')?.append(note);});
