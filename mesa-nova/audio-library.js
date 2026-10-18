(async function(){
 const host=document.getElementById('audio-items'),search=document.getElementById('audio-search'),status=document.getElementById('audio-status');
 const names={opening:'Introdução',table:'Fundo da mesa',tension:'Tensão',climax:'Clímax',reserve:'Reserva musical',effects:'Efeito sonoro'};
 let selected='all',items=[];
 const text=(tag,value)=>{const node=document.createElement(tag);node.textContent=value;return node;};
 function render(){
  const term=search.value.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();
  const filtered=items.filter(item=>(selected==='all'||item.kind===selected||item.role===selected)&&[item.label,item.title,item.artist,names[item.role],...(item.cues||[])].join(' ').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().includes(term));
  host.querySelectorAll('audio').forEach(audio=>audio.pause());host.replaceChildren();
  for(const item of filtered){
   const card=document.createElement('article');card.className='audio-card';card.dataset.role=item.role;
   card.append(text('small',names[item.role]||item.role),text('h2',item.label||item.title));
   const artist=text('p',item.artist||item.title);artist.className='audio-credit';card.append(artist);
   const audio=document.createElement('audio');audio.controls=true;audio.preload='none';audio.src=item.url;audio.volume=item.previewVolume;audio.setAttribute('aria-label','Ouvir '+(item.label||item.title));
   audio.addEventListener('play',()=>{host.querySelectorAll('audio').forEach(other=>{if(other!==audio)other.pause();});status.textContent='Ouvindo: '+(item.label||item.title);});
   audio.addEventListener('pause',()=>{if(![...host.querySelectorAll('audio')].some(other=>!other.paused))status.textContent='Reprodução pausada.';});
   audio.addEventListener('ended',()=>{status.textContent='Amostra concluída.';});
   audio.addEventListener('error',()=>{status.textContent='Não foi possível carregar '+(item.label||item.title);});card.append(audio);
   const footer=document.createElement('footer'),source=document.createElement('a');source.href=item.sourceUrl;source.target='_blank';source.rel='noopener';source.textContent='Fonte no Epidemic';footer.append(text('span',item.durationSeconds<10?item.durationSeconds.toFixed(1).replace('.',',')+' s':Math.round(item.durationSeconds)+' s'),source);card.append(footer);host.append(card);
  }
  document.getElementById('visible-count').textContent=filtered.length+' amostras';
 }
 try{const response=await fetch('audio-library.json?v=20261017');if(!response.ok)throw Error();const data=await response.json();items=data.items;document.getElementById('library-totals').textContent=items.filter(x=>x.kind==='music').length+' músicas · '+items.filter(x=>x.kind==='sfx').length+' efeitos · '+data.activeCues+' eventos ligados à nova biblioteca';render();status.textContent='Escolha uma amostra para ouvir.';}catch{status.textContent='Não foi possível abrir a biblioteca.';}
 search.addEventListener('input',render);
 for(const button of document.querySelectorAll('[data-filter]'))button.addEventListener('click',()=>{selected=button.dataset.filter;document.querySelectorAll('[data-filter]').forEach(other=>other.setAttribute('aria-pressed',String(other===button)));render();});
})();
