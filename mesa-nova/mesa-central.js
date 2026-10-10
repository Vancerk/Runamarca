// Composição local; preserva todos os comandos e controles da sala.
const tools=document.getElementById('table-tools');
for(const id of ['open-creator','rules-toggle','copy-link'])tools.append(document.getElementById(id));
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
// Poderes e disponibilidade são compartilhados com o estado da partida.
let patronPowerZoom=null;const powerUsagePresentation=new Map();
function hidePatronPowerZoom(){patronPowerZoom?.remove();patronPowerZoom=null;}
function showPatronPowerZoom(spec,index,anchor,used){
 hideHover();hidePatronPowerZoom();
 const panel=document.createElement('div');panel.className='patron-power-zoom';panel.setAttribute('role','tooltip');panel.id='patron-power-tooltip';anchor.setAttribute('aria-describedby',panel.id);
 const icon=document.createElement('span');icon.className='power-cost';
 if(spec?.image){icon.classList.add('illustrated-power');const image=document.createElement('img');image.src=spec.image;image.alt='';icon.append(image);const cost=document.createElement('b');cost.textContent=spec.cost;icon.append(cost);}else icon.textContent=spec?.cost??'—';
 const body=document.createElement('div'),name=document.createElement('strong'),detail=document.createElement('p'),limit=document.createElement('small');name.textContent=spec?.name||('Habilidade '+(index+1));detail.textContent=spec?.text||'Custo e efeito a definir';limit.textContent=spec?(spec.limit==='match'?'Uma vez por partida':'Uma vez por rodada')+(used?' · Já utilizado':''):'';body.append(name,detail,limit);panel.append(icon,body);document.body.append(panel);patronPowerZoom=panel;
 const r=anchor.getBoundingClientRect(),width=panel.offsetWidth,height=panel.offsetHeight;panel.style.left=Math.max(8,Math.min(innerWidth-width-8,r.right+12))+'px';panel.style.top=Math.max(8,Math.min(innerHeight-height-8,r.top+r.height/2-height/2))+'px';
}
function makePatronEther(player){
 player={...player,mana:player.mana??0,manaMax:player.manaMax??0};
 const panel=document.createElement('div');panel.className='patron-ether energy-'+manaAffinity(player.patron?.affinity);panel.setAttribute('aria-label',player.mana+' de '+player.manaMax+' Éter');
 const heading=document.createElement('div'),label=document.createElement('span'),count=document.createElement('strong');label.textContent='Éter';count.className='ether-count';count.textContent=player.mana+'/'+player.manaMax;heading.append(label,count);
 const points=document.createElement('div');points.className='ether-points';points.setAttribute('aria-hidden','true');
 for(let index=0;index<Math.min(10,player.manaMax);index++){const point=document.createElement('span');point.className='ether-point'+(index<player.mana?' available':' spent');const image=document.createElement('img');image.src='energy-icons/'+manaAffinity(player.patron?.affinity)+'.png';image.alt='';point.append(image);points.append(point);}
 panel.append(heading,points);if(player.forge){const progress=document.createElement('small');progress.className='forge-progress';progress.textContent='Forjando · '+(player.forge.stage==='durability'?'1':'2')+'/3';panel.append(progress);}return panel;
}
function decorateLocalPatron(player,side){
 hidePatronPowerZoom();
 const head=document.getElementById(side+'-head'),band=head?.closest('.player-band');if(!band||head.querySelector('.patron-avatar'))return;
 const left=band.querySelector('.band-left');let identity=left.querySelector('.band-identity');if(!identity){identity=document.createElement('div');identity.className='band-identity';left.prepend(identity);}identity.replaceChildren();
 const info=head.querySelector('.patron-info');if(info){info.querySelector('small')?.remove();info.querySelector('.muted:last-child')?.remove();identity.append(info);}
 const powers=document.createElement('div');powers.className='patron-powers';powers.setAttribute('aria-label','Habilidades do Patrono');
 for(let index=0;index<2;index++){
  const spec=player.patron?.powers?.[index],power=document.createElement('button');power.type='button';power.className='patron-power';
  const used=spec&&(spec.limit==='match'?player.patron.usedPowers?.[spec.id]!==undefined:player.patron.usedPowers?.[spec.id]===state.round);
  power.disabled=!spec||side!=='self'||Boolean(state?.spectator)||state.phase!=='prep'||state.turn!==player.id||player.mana<spec.cost||Boolean(used)||(!['forjar-arma','forjar-armadura'].includes(spec?.id)&&!player.reserve?.some(c=>c.damage<c.health))||Boolean(player.pendingDiscard);
  const cost=document.createElement('span');cost.className='power-cost';
  if(spec){cost.classList.add('illustrated-power');const image=document.createElement('img');image.src=spec.image;image.alt='';cost.append(image);const value=document.createElement('b');value.textContent=spec.cost;cost.append(value);cost.setAttribute('aria-label',spec.cost+' de energia');}else{cost.textContent='—';cost.setAttribute('aria-label','Custo ainda não definido');}
  if(spec){const back=document.createElement('span');back.className='power-back';back.setAttribute('aria-hidden','true');cost.append(back);if(used)power.className+=' used-power';const key=[state.code,state.matchId,player.id,spec.id].join(':');const previous=powerUsagePresentation.get(key),now=Date.now(),started=used&&previous?.used===false?now:previous?.started;if(used&&started!==undefined&&now-started<650){const progress=Math.max(0,(now-started)/650);cost.animate?.([{transform:'rotateX('+progress*180+'deg)'},{transform:'rotateX(180deg)'}],{duration:650*(1-progress),easing:'linear'});}powerUsagePresentation.set(key,{used:Boolean(used),started:used?started:undefined});if(powerUsagePresentation.size>100)powerUsagePresentation.delete(powerUsagePresentation.keys().next().value);}power.append(cost);
  if(spec){power.setAttribute('aria-label',spec.name+' · '+spec.cost+' de energia'+(used?' · Já utilizado':''));power.onclick=()=>choosePatronPower(spec);}
  const wrap=document.createElement('div');wrap.className='patron-power-wrap';wrap.tabIndex=power.disabled?0:-1;
  const zoom=()=>showPatronPowerZoom(spec,index,wrap,used);wrap.onmouseenter=zoom;wrap.onmouseleave=hidePatronPowerZoom;wrap.onfocus=power.onfocus=zoom;wrap.onblur=power.onblur=hidePatronPowerZoom;wrap.append(power);powers.append(wrap);
 }
 const equipment=document.createElement('div');equipment.className='patron-equipment';equipment.append(powers,makePatronEther(player));head.append(equipment);decorateLocalPatronBadges(player,side);if(typeof updatePatronExtraLife==='function')updatePatronExtraLife(player.id,displayedPatronExtraLife.get(player.id)??player.patron?.extraLife??0);
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
function layoutCombatEmanations(){
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
}
function positionCombatEmanations(){cancelAnimationFrame(emanationFrame);emanationFrame=requestAnimationFrame(layoutCombatEmanations);}
const emanationResize=new ResizeObserver(positionCombatEmanations);emanationResize.observe(document.getElementById('lanes'));
for(const {holder} of emanationZones)new MutationObserver(positionCombatEmanations).observe(holder,{childList:true});
window.addEventListener('resize',positionCombatEmanations);positionCombatEmanations();

function decorateLocalPatronBadges(player,side){
 const head=document.getElementById(side+'-head'),portrait=head.querySelector('.patron-card');if(!portrait||!player.patron)return;
 head.querySelector('.patron-stats')?.remove();const avatar=document.createElement('div');avatar.className='patron-avatar';portrait.before(avatar);avatar.append(portrait);
 const heart=document.createElement('span');heart.className='patron-heart hp';heart.innerHTML='<svg viewBox="-64 -60 128 120" aria-hidden="true"><defs><linearGradient id="patron-heart-'+side+'" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4fbd86"/><stop offset=".4" stop-color="#247049"/><stop offset="1" stop-color="#0b3225"/></linearGradient></defs><path d="M0 47 C-19 29 -52 7 -52 -16 C-52 -49 -17 -55 0 -31 C17 -55 52 -49 52 -16 C52 7 19 29 0 47 Z" fill="url(#patron-heart-'+side+')" stroke="#d7ad65" stroke-width="6"/><text x="0" y="-3" text-anchor="middle" dominant-baseline="central" class="patron-hp-value"></text></svg>';avatar.append(heart);updateLocalPatronHealth(head,displayedPatronHealth.get(player.id)??player.patron.hp,player.patron.maxHp);

}
function updateLocalPatronHealth(head,hp,maxHp){const heart=head.querySelector('.patron-heart');if(!heart)return;heart.querySelector('.patron-hp-value').textContent=String(hp);heart.title=hp+' de '+maxHp+' de vida';heart.setAttribute('aria-label',heart.title);}
