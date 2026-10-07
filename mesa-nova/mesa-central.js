// Composição local; preserva todos os comandos e controles da sala.
const tools=document.getElementById('table-tools');
for(const id of ['rules-toggle','copy-link'])tools.append(document.getElementById(id));
const audience=document.createElement('div');audience.className='audience-tools';
audience.append(document.getElementById('change-role'),document.getElementById('spectators-game'));tools.append(audience);
const account=document.querySelector('.account-bar');
if(account)account.append(document.getElementById('leave-room'));
else tools.append(document.getElementById('leave-room'));
// Faixas simétricas: Emanação / rodada / Patrono / reserva / deck.
for(const [side,zoneName] of [['opponent','upper-zone'],['self','lower-zone']]){
 const zone=document.querySelector('.'+zoneName);zone.classList.add('player-band');
 const left=document.createElement('div');left.className='band-left';left.append(zone.querySelector('.eman-zone'));
 if(side==='self')left.append(document.getElementById('center-actions'));

 const patron=document.getElementById(side+'-head').parentElement;
 const right=document.createElement('div');right.className='band-right';right.append(zone.querySelector('.reserve-area'),document.getElementById(side+'-deck-mount'));
 zone.append(left,patron,right);
}
// Os poderes são espaços de apresentação; regras e custos serão definidos depois.
function decorateLocalPatron(player,side){
 const head=document.getElementById(side+'-head'),band=head?.closest('.player-band');if(!band||head.querySelector('.patron-avatar'))return;
 const left=band.querySelector('.band-left');let identity=left.querySelector('.band-identity');if(!identity){identity=document.createElement('div');identity.className='band-identity';left.prepend(identity);}identity.replaceChildren();
 const info=head.querySelector('.patron-info');if(info){info.querySelector('small')?.remove();info.querySelector('.muted:last-child')?.remove();identity.append(info);}
 const powers=document.createElement('div');powers.className='patron-powers';powers.setAttribute('aria-label','Habilidades do Patrono');
 for(let index=0;index<2;index++){const power=document.createElement('button');power.type='button';power.className='patron-power';power.disabled=side!=='self'||Boolean(state?.spectator);const cost=document.createElement('span');cost.className='power-cost';cost.textContent='—';cost.setAttribute('aria-label','Custo ainda não definido');const description=document.createElement('span');description.className='power-description';const name=document.createElement('strong');name.textContent=`Habilidade ${index+1}`;const detail=document.createElement('small');detail.textContent='Custo e efeito a definir';description.append(name,detail);power.append(cost,description);power.onclick=()=>{const area=document.getElementById('detail-content');area.replaceChildren();const body=document.createElement('div');const title=document.createElement('h2');title.textContent=`${player.patron?.name||'Patrono'} · Habilidade ${index+1}`;const note=document.createElement('p');note.textContent='Prévia do espaço da habilidade. O custo de energia e o efeito serão definidos antes de ela poder ser usada na partida.';body.append(title,note);area.append(body);document.getElementById('card-detail').showModal();};powers.append(power);}
 head.append(powers);decorateLocalPatronBadges(player,side);
}
for(const side of ['self','opponent']){const p=side==='self'?seat():rival();if(p)decorateLocalPatron(p,side);}

// Un seul contrôle de phase, près du bord droit du champ.
document.querySelector('.board').append(document.getElementById('center-actions'));

// Cada vaga acompanha uma divisória real, mesmo quando o campo muda de largura.
const emanationBoard=document.querySelector('.board');
const emanationZones=['opponent','self'].map(side=>{
 const holder=document.getElementById(side+'-emana'),zone=holder.parentElement;
 zone.id=side+'-emana-zone';zone.classList.add('combat-emanation');
 zone.setAttribute('aria-label','Emanação '+(side==='self'?'aliada':'rival'));
 for(const node of [...zone.childNodes])if(node.nodeType===Node.TEXT_NODE)node.remove();
 emanationBoard.append(zone);return {side,holder,zone};
});
let emanationFrame=0;
function positionCombatEmanations(){
 cancelAnimationFrame(emanationFrame);emanationFrame=requestAnimationFrame(()=>{
  const lanes=[...document.querySelectorAll('#lanes>.lane')];if(lanes.length!==3)return;
  const boardRect=emanationBoard.getBoundingClientRect();
  for(const {side,holder} of emanationZones)for(const [slot,child] of [...holder.children].entries()){
   if(slot>1)continue;
   const before=lanes[slot].getBoundingClientRect(),after=lanes[slot+1].getBoundingClientRect();
   const center=(before.right+after.left)/2-boardRect.left-emanationBoard.clientLeft;
   child.style.left=center+'px';
   child.style.top=(side==='self'?before.bottom-boardRect.top-emanationBoard.clientTop-8:before.top-boardRect.top-emanationBoard.clientTop+8)+'px';
   child.dataset.emanationSlot=String(slot+1);
  }
  if(typeof renderTargetLinks==='function'&&state)renderTargetLinks();
 });
}
const emanationResize=new ResizeObserver(positionCombatEmanations);emanationResize.observe(document.getElementById('lanes'));
for(const {holder} of emanationZones)new MutationObserver(positionCombatEmanations).observe(holder,{childList:true});
window.addEventListener('resize',positionCombatEmanations);positionCombatEmanations();

function decorateLocalPatronBadges(player,side){
 const head=document.getElementById(side+'-head'),portrait=head.querySelector('.patron-card');if(!portrait||!player.patron)return;
 head.querySelector('.patron-stats')?.remove();const avatar=document.createElement('div');avatar.className='patron-avatar';portrait.before(avatar);avatar.append(portrait);
 const heart=document.createElement('span');heart.className='patron-heart hp';heart.innerHTML='<svg viewBox="-64 -60 128 120" aria-hidden="true"><defs><linearGradient id="patron-heart-'+side+'" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4fbd86"/><stop offset=".4" stop-color="#247049"/><stop offset="1" stop-color="#0b3225"/></linearGradient></defs><path d="M0 47 C-19 29 -52 7 -52 -16 C-52 -49 -17 -55 0 -31 C17 -55 52 -49 52 -16 C52 7 19 29 0 47 Z" fill="url(#patron-heart-'+side+')" stroke="#d7ad65" stroke-width="6"/><text x="0" y="-3" text-anchor="middle" dominant-baseline="central" class="patron-hp-value"></text></svg>';avatar.append(heart);updateLocalPatronHealth(head,displayedPatronHealth.get(player.id)??player.patron.hp,player.patron.maxHp);
 const mana=document.createElement('span');mana.className='patron-mana energy-'+manaAffinity(player.patron.affinity);mana.title=player.mana+' de '+player.manaMax+' de energia · '+manaAffinity(player.patron.affinity);mana.setAttribute('aria-label',mana.title);mana.textContent=String(player.mana);avatar.append(mana);
}
function updateLocalPatronHealth(head,hp,maxHp){const heart=head.querySelector('.patron-heart');if(!heart)return;heart.querySelector('.patron-hp-value').textContent=String(hp);heart.title=hp+' de '+maxHp+' de vida';heart.setAttribute('aria-label',heart.title);}
