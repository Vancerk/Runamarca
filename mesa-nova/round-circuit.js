// S5: round circuit in the Preparation panel. Indicator only (no commands): "Rodada N",
// the viewer's own light (blue) and the rival light (red) on the left, both paths converging on the combat light
// (red, ⚔) on the right. V3 (items 12 and 14): the own light is now at the BOTTOM and the rival light at the TOP.
// On the hybrid table the panel lies on the table plane, its top toward the rival's side: with the own light on top,
// "sua vez" lit the light nearer the rival and read as the rival's (the engine data and the lit light were right).
// Without relying on colour: the lights carry a letter (V = você, R = rival; initials for a spectator) and the
// preparation shows a caption with a direction (▼ toward the own seat, ▲ toward the rival).
// Preparation: only the active player's light and path are lit (from the viewer's seat).
// Combat (engine phase 'resolving'): both player lights off, energy runs along both paths,
// combat light on. Formation addendum B / V3 item 13 (owner decision): the combat signal is also red in
// 'formation' (fog, secret positions) and stays red through 'resolving'; the two are told apart by the symbol in
// the light (☁ formation, ⚔ combat), a visible caption and the accessible label. Vote never lights it.
(function(root){
 const NS='http://www.w3.org/2000/svg',PHASES=['prep','vote','formation','resolving'];
 function build(){
  const box=document.createElement('div');box.id='round-circuit';box.className='round-circuit';box.setAttribute('role','img');
  const label=document.createElement('strong');label.className='round-circuit-label';
  const svg=document.createElementNS(NS,'svg');svg.setAttribute('viewBox','0 0 132 60');svg.setAttribute('aria-hidden','true');
  svg.innerHTML='<path class="rc-path rc-path-rival" d="M19 12 C 58 12, 72 30, 106 30"/><path class="rc-path rc-path-ally" d="M19 48 C 58 48, 72 30, 106 30"/>'+
   '<circle class="rc-light rc-rival" cx="11" cy="12" r="9"/><circle class="rc-light rc-ally" cx="11" cy="48" r="9"/>'+
   '<text class="rc-light-tag rc-tag-rival" x="11" y="15.6" text-anchor="middle">R</text><text class="rc-light-tag rc-tag-ally" x="11" y="51.6" text-anchor="middle">V</text>'+
   '<circle class="rc-light rc-combat" cx="117" cy="30" r="11"/><text class="rc-combat-symbol" x="117" y="34.5" text-anchor="middle">⚔</text>';
  const caption=document.createElement('small');caption.className='round-circuit-state';
  box.append(label,svg,caption);return box;}
 function render(){
  const panel=document.getElementById('center-actions');if(!panel)return;
  let box=document.getElementById('round-circuit');
  if(!state||!PHASES.includes(state.phase)||!state.players?.length){box?.remove();return;}
  if(!box){box=build();panel.prepend(box);}else if(box.parentElement!==panel)panel.prepend(box);
  const me=state.players.find(p=>p.id===state.you)||state.players[0],rival=state.players.find(p=>p.id!==me.id);
  const resolving=state.phase==='resolving'&&Boolean(state.combat),formation=state.phase==='formation',combat=resolving||formation,prep=state.phase==='prep';
  const active=prep?(state.turn===me.id?'ally':state.turn===rival?.id?'rival':null):null;
  box.dataset.phase=state.phase;box.dataset.active=combat?'combat':active||'none';box.dataset.stage=formation?'formation':resolving?'combat':'';
  const symbol=box.querySelector('.rc-combat-symbol');if(symbol)symbol.textContent=formation?'☁':'⚔';
  let caption=box.querySelector('.round-circuit-state');if(!caption){caption=document.createElement('small');caption.className='round-circuit-state';box.append(caption);}const initial=p=>(p?.name||'?').trim().charAt(0).toUpperCase()||'?',tagAlly=box.querySelector('.rc-tag-ally'),tagRival=box.querySelector('.rc-tag-rival');if(tagAlly)tagAlly.textContent=state.spectator?initial(me):'V';if(tagRival)tagRival.textContent=state.spectator?initial(rival):'R';
  const turnCaption=active==='ally'?(state.spectator?'▼ Vez de '+me.name:'▼ Sua vez'):active==='rival'?(state.spectator?'▲ Vez de '+(rival?.name||'rival'):'▲ Vez do rival'):'';
  caption.textContent=turnCaption;caption.hidden=!turnCaption;caption.dataset.turn=combat?'':active||'';
  box.querySelector('.round-circuit-label').textContent=`Rodada ${state.round}`;
  const who=formation?'formação, posições secretas':resolving?'combate em andamento':active==='ally'?(state.spectator?`vez de ${me.name}`:'sua vez'):active==='rival'?`vez de ${rival?.name||'rival'}`:{vote:'votação',formation:'formação'}[state.phase]||'';
  box.setAttribute('aria-label',`Rodada ${state.round}${who?' · '+who:''}`);
 }
 root.renderRoundCircuit=render;
})(globalThis);
