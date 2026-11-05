// UI-owner revision, item 8: choice stage. Presentation only.
// The existing #target-picker <dialog> stays the accessible mechanism (modal, focus
// trap, Escape, focus return, inert background). When its content is a short list of
// option buttons (Verônica, Monge Rúnico, João Bobão/Provocar, entry placement, paid
// Revelation, Fluxo/Potencializar powers…), the dialog becomes a "choice stage": dimmed
// table, large framed option tiles with a title and a readable description, side by
// side. Buttons, their handlers, commands, disabled states and cancel paths are the
// originals; nothing is sent when an option is only hovered or focused.
const dialog=document.getElementById('target-picker'),content=document.getElementById('target-picker-content');
// Content that is not a list of plain options keeps its own presentation.
const FOREIGN='.target-options,.study-grimoire-grid,.grimoire-scene,.cemetery-cards,select,input,.target-card';
const CANCEL=/^(cancelar|fechar)/i;
// Descriptions for options whose label is only a symbol or a short verb. They paraphrase
// the rules glossary (Provocar) and never add a rule.
const LANE_NAMES={'☀':'Sol','☾':'Lua','✦':'Estrela','☽':'Lua','★':'Estrela'};
function describe(label,heading){
 if(/provocar/i.test(heading)){if(LANE_NAMES[label])return {title:'Posição '+label,desc:'Redireciona para esta criatura os ataques da posição '+LANE_NAMES[label]+'.'};if(/duas adjacentes/i.test(label))return {title:label,desc:'Redireciona para esta criatura os ataques das duas posições vizinhas.'};if(/somente à frente/i.test(label))return {title:label,desc:'Não redireciona ataques: enfrenta só o inimigo à frente.'};}
 const parts=label.split(' · ');return parts.length>1?{title:parts[0],desc:parts.slice(1).join(' · ')}:{title:label,desc:''};
}
const GLYPHS=[[/assalto|ataque|enfraquecer|pagar/i,'⚔'],[/escolta|vida|fortalecer|cura/i,'✚'],[/emana/i,'✧'],[/reserva/i,'▣'],[/^posição|adjacentes/i,'⇄'],[/somente à frente|não pagar|sem alvo/i,'↑']];
function glyph(title){if(LANE_NAMES[title.slice(-1)])return title.slice(-1);for(const [re,g] of GLYPHS)if(re.test(title))return g;return '◈';}
function optionButtons(){
 if(content.querySelector(FOREIGN)||content.querySelector('canvas:not(.choice-card-art canvas)'))return null;
 const row=content.querySelector('.taunt-options');let buttons=row?[...row.querySelectorAll(':scope>button')]:[...content.querySelectorAll(':scope>button')].filter(b=>!b.classList.contains('choice-card-art')&&!CANCEL.test(b.textContent.trim()));
 return buttons.length>=1&&buttons.length<=4?{row,buttons}:null;
}
function enhance(){
 const found=dialog.open?optionButtons():null;dialog.classList.toggle('choice-stage',!!found);if(!found)return;
 let {row,buttons}=found;if(!row){row=document.createElement('div');row.className='taunt-options choice-row';buttons[0].before(row);row.append(...buttons);}
 row.classList.add('choice-row');row.setAttribute('role','group');row.setAttribute('aria-label',content.querySelector('h2')?.textContent||'Escolha');
 const heading=content.querySelector('h2')?.textContent||'';
 for(const b of buttons){if(b.dataset.choiceReady)continue;const label=b.textContent.trim(),{title,desc}=describe(label,heading);b.dataset.choiceReady='1';b.classList.add('choice-option');b.dataset.glyph=glyph(title);
  // textContent stays exactly the original label (title + ' · ' + description) for
  // assistive technology and existing selectors; the separator is only visually hidden.
  const t=document.createElement('span');t.className='choice-title';t.textContent=title;const parts=[t];
  if(desc&&label===title+' · '+desc){const sep=document.createElement('span');sep.className='choice-sep';sep.textContent=' · ';const d=document.createElement('span');d.className='choice-desc';d.textContent=desc;parts.push(sep,d);}
  else if(desc){const d=document.createElement('span');d.className='choice-desc';d.setAttribute('aria-hidden','true');d.textContent=desc;parts.push(d);b.setAttribute('aria-description',desc);if(title!==label){t.setAttribute('aria-hidden','true');b.setAttribute('aria-label',label);}}
  b.replaceChildren(...parts);if(buttons.length>1&&b.classList.contains('primary'))b.setAttribute('aria-current','true');}
 // Hearthstone-like stage: the first enabled (or current) option takes the focus, not
 // the small close button, so Enter/Space confirm deliberately chosen tiles only.
 const active=document.activeElement;if(!row.contains(active)&&(!active||active===document.body||active.id==='close-target-picker'||!dialog.contains(active))){(buttons.find(b=>b.classList.contains('primary')&&!b.disabled)||buttons.find(b=>!b.disabled))?.focus({focusVisible:true});}
}
new MutationObserver(enhance).observe(content,{childList:true,subtree:false});
new MutationObserver(enhance).observe(dialog,{attributes:true,attributeFilter:['open']});
dialog.addEventListener('close',()=>dialog.classList.remove('choice-stage'));
// Roving arrows between tiles; Enter/Space keep the native button activation.
dialog.addEventListener('keydown',e=>{if(!dialog.classList.contains('choice-stage')||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key))return;const options=[...dialog.querySelectorAll('.choice-option:not(:disabled)')];if(!options.length)return;const i=options.indexOf(document.activeElement),step=['ArrowLeft','ArrowUp'].includes(e.key)?-1:1,next=e.key==='Home'?0:e.key==='End'?options.length-1:i<0?0:(i+step+options.length)%options.length;e.preventDefault();options[next].focus({focusVisible:true});});
window.RunaHybridChoices={get active(){return dialog.classList.contains('choice-stage');},enhance};
