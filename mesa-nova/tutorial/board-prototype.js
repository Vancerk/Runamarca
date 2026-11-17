// Reuse the existing menu and its handlers; keep it clear of the patron name.
(()=>{
 const table=document.querySelector('#game>.table'),dock=document.querySelector('.camp-utilities');
 if(table&&dock)table.append(dock);
 const log=document.getElementById('camp-log'),board=document.querySelector('#game .board');
 if(log&&board)board.append(log);
})();

function renderPrototypeHistory(){
 const log=document.getElementById('log');if(!log||!state)return;
 // Match only names already present in the server-approved text and public zones.
 const cards=state.players.flatMap(p=>[...(p.reserve||[]),...(p.discard||[]),...(p.prepared||[]).map(x=>x.card).filter(Boolean)]);
 for(const line of log.querySelectorAll('p')){
  const message=line.textContent,card=cards.find(c=>c.name&&message.includes(c.name));
  const icon=document.createElement('span');icon.className='history-card';
  if(card?.image){const image=document.createElement('img');image.src=card.image;image.alt=card.name;icon.append(image);}else icon.textContent='◆';
  const label=document.createElement('span');label.textContent=message;line.replaceChildren(icon,label);line.classList.add('history-action');
 }
}

// Ten resource sockets describe the existing cap; locked sockets never grant mana.
// Keep the original renderer, availability, refill animation and accessible count.
const prototypeMakePatronEther=makePatronEther;
makePatronEther=function(player){
 const panel=prototypeMakePatronEther(player),points=panel.querySelector('.ether-points');
 points.style.setProperty('--ether-columns',5);
 while(points.children.length<10){const point=document.createElement('span');point.className='ether-point locked';points.append(point);}
 return panel;
};
