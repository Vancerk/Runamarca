const budgetPresets=[
 ['Revelação: +1 ataque', {effect:'attack',amount:1,timing:'reveal',target:'self'}],
 ['Revelação: 1 dano na mesma posição', {effect:'damage',amount:1,timing:'reveal',target:'lane'}],
 ['Entrada: comprar 1', {effect:'draw',amount:1,timing:'enter',target:'owner'}],
 ['Entrada: convocar ficha 1/1', {effect:'summon',amount:1,tokenAttack:1,tokenHealth:1,timing:'enter',target:'owner'}],
 ['Emanação: +1 ataque em posição fixa', {effect:'attack',amount:1,timing:'emanation',target:'fixedAlly'}],
 ['Emanação: pagar 1 para curar 1', {effect:'heal',amount:1,timing:'emanation',target:'ally',activationCost:1}],
 ['Magia: dano direto', {effect:'damage',amount:1,timing:'direct',target:'enemy'}],
 ['Magia: cura de Patrono', {effect:'heal',amount:1,timing:'direct',target:'patron'}],
 ['Magia: área direta', {effect:'damage',amount:1,timing:'direct',target:'area',count:8}],
 ['Magia: área preparada', {effect:'damage',amount:2,timing:'trap',target:'area',count:3}],
 ['Personalizada: informar preço e motivo', {effect:'custom',amount:1,timing:'enter',target:'self',customPoints:0}]
];
const budgetInt=(value,max=100)=>Math.max(0,Math.min(max,Math.trunc(Number(value)||0)));
function budgetRowValue(row){const out={};for(const input of row.querySelectorAll('[data-budget]'))out[input.dataset.budget]=input.type==='number'?budgetInt(input.value):input.value;return out;}
function budgetOptions(input,ids,labels,value){
 if([...input.options].map(o=>o.value).join('|')!==ids.join('|'))input.replaceChildren(...ids.map(id=>{const option=document.createElement('option');option.value=id;option.textContent=labels[id];return option;}));
 input.value=value;
}
function syncBudgetRow(row,kind,rawEffects){
 const raw=budgetRowValue(row),timing=RunaBudget.choices(kind,raw).timing;
 const hasDamage=raw.group==='sum'&&rawEffects.some(other=>other.row!==row&&other.value.effect==='damage'&&other.value.amount>0&&other.value.group==='sum'&&RunaBudget.choices(kind,other.value).timing===timing);
 const options=RunaBudget.choices(kind,raw,{hasDamage}),e=RunaBudget.normalize(kind,raw,{hasDamage});
 const field=key=>row.querySelector(`[data-budget=${key}]`),label=key=>field(key).closest('label');
 budgetOptions(field('timing'),options.timings,budgetTimingLabels,e.timing);
 budgetOptions(field('target'),options.targets,RunaBudget.targets,e.target);
 budgetOptions(field('duration'),options.durations,budgetDurationLabels,e.duration);
 budgetOptions(field('condition'),options.conditions,budgetConditionLabels,e.condition);
 field('count').value=e.count;field('count').min=2;field('count').max=options.maxTargets;field('activationCost').value=e.activationCost;
 label('count').firstChild.nodeValue=`Máximo de alvos em área (até ${options.maxTargets})`;
 label('target').hidden=options.targets.length===1;label('timing').hidden=options.timings.length===1;
 label('duration').hidden=options.durations.length===1;label('condition').hidden=options.conditions.length===1;
 const fixed=row.querySelector('.budget-fixed-target');fixed.hidden=e.effect==='custom'||options.targets.length!==1;
 fixed.textContent=e.effect==='summon'?'As fichas entram na sua reserva.':e.effect==='draw'?'Você compra para a sua mão.':e.effect==='discount'?'O desconto se aplica às suas jogadas.':'';
 label('amount').firstChild.nodeValue=({summon:'Quantidade de fichas',draw:'Quantidade de cartas',damage:'Dano',heal:'Vida recuperada',attack:'Bônus de ataque',health:'Bônus de vida',weaken:'Redução de ataque',discount:'Mana descontada'}[e.effect]||'Valor');
 label('amount').hidden=e.effect==='custom';
 label('customPoints').hidden=e.effect!=='custom';label('reason').hidden=e.effect!=='custom'&&e.condition==='none';
 for(const key of ['tokenAttack','tokenHealth'])label(key).hidden=e.effect!=='summon';
 label('count').hidden=e.target!=='area';label('activationCost').hidden=!['turn','emanation'].includes(e.timing);
 label('group').hidden=rawEffects.length<2;
 const steps=[...row.querySelectorAll('.budget-effect-step')];
 steps[2].querySelector('strong').textContent=options.targets.length===1?'C. Destino':options.durations.length>1?'C. Alvo e duração':'C. Alvo e alcance';
 steps[4].querySelector('strong').textContent=e.effect==='custom'?'E. Efeito personalizado':'E. Justificar a condição';
 for(const step of row.querySelectorAll('.budget-effect-step'))step.hidden=![...step.querySelectorAll('label,.budget-fixed-target')].some(node=>!node.hidden);
 return budgetRowValue(row);
}
function readBudgetEffects() {
 const rows=[...document.querySelectorAll('.budget-effect')],kind=document.getElementById('card-kind').value;
 const raw=rows.map(row=>({row,value:budgetRowValue(row)}));
 return rows.map(row=>syncBudgetRow(row,kind,raw));
}
const budgetTimingLabels={enter:'Ao entrar (uma vez)',reveal:'Revelação (cada combate)',emanation:'Emanação (uma vez por preparação)',turn:'Início do turno (uma vez por turno)',direct:'Magia direta (uma vez)',trap:'Armadilha (ao ativar)'};
const budgetDurationLabels={instant:'Instantâneo',round:'Até o fim da rodada',permanent:'Permanente'};
const budgetConditionLabels={none:'Sem condição',wounded:'Esta criatura precisa estar ferida',kill:'Somente se o dano da carta eliminar o alvo',spell:'Ter usado outra magia direta nesta preparação',threshold:'Alvo com atributo mínimo'};
function budgetField(row,key,title,value,options=null,max=30){
 const label=document.createElement('label');label.textContent=title;
 const input=document.createElement(options?'select':'input');input.dataset.budget=key;
 if(options){for(const [id,text] of Object.entries(options)){const option=document.createElement('option');option.value=id;option.textContent=text;input.append(option);}}
 else if(['name','reason'].includes(key)){input.type='text';input.maxLength=160;}
 else{input.type='number';input.min='0';input.max=String(max);input.step='1';}
 input.value=value;label.append(input);row.append(label);return input;
}
function addBudgetEffect(effect={}) {
 const e={name:'',effect:'damage',amount:1,count:1,timing:'direct',target:'enemy',duration:'instant',condition:'none',activationCost:0,group:'sum',tokenAttack:1,tokenHealth:1,customPoints:0,reason:'',...effect};
 const row=document.createElement('fieldset');row.className='budget-effect';
 const legend=document.createElement('legend');legend.textContent='Efeito';row.append(legend);
 budgetField(row,'name','Nome ou descrição curta',e.name);
 const step=(title)=>{const group=document.createElement('div');group.className='budget-effect-step';const h=document.createElement('strong');h.textContent=title;group.append(h);row.append(group);return group;};
 let group=step('A. O que faz e quanto');
 budgetField(group,'effect','Efeito',e.effect,RunaBudget.labels);budgetField(group,'amount','Valor / quantidade de fichas',e.amount);
 budgetField(group,'tokenAttack','Ataque de cada ficha',e.tokenAttack);budgetField(group,'tokenHealth','Vida de cada ficha',e.tokenHealth);
 group=step('B. Quando acontece');
 budgetField(group,'timing','Momento',e.timing,budgetTimingLabels);
 group=step('C. Quem recebe e por quanto tempo');
 budgetField(group,'target','Alvo / alcance',e.target,RunaBudget.targets);budgetField(group,'count','Máximo de alvos em área',e.count,null,10);
 budgetField(group,'duration','Duração de modificadores',e.duration,budgetDurationLabels);
 const fixed=document.createElement('p');fixed.className='budget-fixed-target field-hint';group.append(fixed);
 group=step('D. Restrições e alternativas');
 budgetField(group,'condition','Condição real',e.condition,budgetConditionLabels);
 budgetField(group,'activationCost','Mana por ativação recorrente',e.activationCost);
 budgetField(group,'group','Relação com os outros efeitos',e.group,{sum:'Acontecem juntos: somar',choice:'Escolha um: mesmo grupo de alternativas'});
 group=step('E. Exceção manual');
 budgetField(group,'customPoints','Preço do efeito personalizado',e.customPoints,null,100);budgetField(group,'reason','Motivo do preço / condição / exceção',e.reason);
 const hint=document.createElement('p');hint.className='budget-effect-hint field-hint';row.append(hint);
 const detail=document.createElement('p');detail.className='budget-price-line';row.append(detail);
 const remove=document.createElement('button');remove.type='button';remove.className='secondary';remove.textContent='Remover efeito';remove.addEventListener('click',()=>{row.remove();renderPreview();});row.append(remove);
 document.getElementById('budget-abilities').append(row);
}
function populateBudget(card){
 document.getElementById('budget-abilities').replaceChildren();
 if(Array.isArray(card.budgetEffects))for(const effect of card.budgetEffects)addBudgetEffect(effect);
 else for(const old of (Array.isArray(card.budgetAbilities)?card.budgetAbilities:[]))addBudgetEffect({name:old.name,effect:'custom',customPoints:budgetInt(old.points)*Math.max(1,budgetInt(old.quantity)),reason:'Preço preservado do contador anterior. Revise os detalhes.'});
}
function updateBudget(card){
 const panel=document.getElementById('creature-budget'),creature=card.kind==='creature';
 panel.hidden=!['creature','spell'].includes(card.kind);if(panel.hidden)return;
 const presetIds=budgetPresets.map(([,e],i)=>({e,i})).filter(({e})=>e.effect==='custom'||(creature?!['direct','trap'].includes(e.timing):['direct','trap'].includes(e.timing))).map(({i})=>String(i));
 budgetOptions(budgetSelector,presetIds,Object.fromEntries(budgetPresets.map(([name],i)=>[i,name])),presetIds.includes(budgetSelector.value)?budgetSelector.value:presetIds[0]);
 const b=RunaBudget.calculate(card);
 document.getElementById('budget-heading').textContent=creature?'Etapas da criatura':'Etapas da magia';
 document.getElementById('budget-body-step').hidden=!creature;
 document.getElementById('budget-spell-step').hidden=creature;
 document.getElementById('budget-rule').textContent=creature?'Pontos = 2 × mana + 1. Atributos e habilidades gastam o mesmo saldo.':'Pontos = 2 × mana. Sem corpo: distribua o saldo entre efeitos, alcance, duração e condições.';
 document.getElementById('budget-total').textContent=b.supported?b.available:'—';
 document.getElementById('budget-spent').textContent=b.spent;document.getElementById('budget-remaining').textContent=b.supported&&b.complete?b.remaining:'—';
 document.getElementById('budget-breakdown').textContent=creature?`${b.attack} ataque + ${b.health} vida + ${b.abilityPoints} efeitos = ${b.spent} pontos.`:`${b.abilityPoints} pontos em efeitos, incluindo ${b.flexibility} por alternativas.`;
 panel.dataset.over=String(b.supported&&b.complete&&b.remaining<0);
 const rows=[...document.querySelectorAll('.budget-effect')];
 b.lines.forEach((line,i)=>{
  const row=rows[i],e=line.effect;
  row.querySelector('.budget-price-line').textContent=`Base ${line.base} + alcance ${line.reach} + permanência ${line.permanence} + recorrência ${line.repeat} − restrições ${line.reduction} = ${line.points} pontos. ${line.warnings.join(' ')}`;
  const hints={damage:'Cada 1 de dano gasta 2 pontos: ele remove vida sem expor um corpo ao combate.',heal:'Cada 1 de cura gasta 1 ponto. Cura perdida por falta de ferimento não é reembolsada no orçamento.',attack:'Cada +1 de ataque temporário gasta 1 ponto. Permanente ou repetido pode acrescentar custo.',weaken:'Cada −1 de ataque temporário gasta 1 ponto. Confira se o alvo ainda pode responder.',health:'Cada +1 de vida temporária gasta 1 ponto. Vida permanente também cobra permanência.',draw:'Cada carta comprada gasta 3 pontos. Avalie mão cheia e combos; compra não é gratuita.',summon:'Cada ficha custa ataque + vida. Multiplique pelo número convocado e considere o espaço ocupado.',discount:'Cada 1 de desconto custa 3 pontos. Em emanação, este preço já inclui repetição uma vez por preparação.',custom:'Informe um preço fundamentado: este efeito não tem fórmula automática.'};
  row.querySelector('.budget-effect-hint').textContent=hints[e.effect]||'';
 });
 const messages=[];
 if(!b.supported)messages.push('Custo fora da referência de 1 a 10 mana.');
 else if(!b.complete)messages.push('Avaliação incompleta: faltam efeitos ou preços fundamentados. A soma exibida é parcial; não determina um custo balanceado.');
 else messages.push(b.remaining<0?`Faltam ${-b.remaining} pontos. Pela soma, custo sugerido: ${b.suggestedMana}.`:b.remaining?`Restam ${b.remaining} pontos para distribuir.`:'Todos os pontos foram distribuídos.');
 if(creature&&b.health<1)messages.push('Adicione pelo menos 1 de vida.');
 if(card.rules.trim()&&!b.lines.length)messages.push('Registre os efeitos do texto para completar a avaliação.');
 if(!creature&&!b.lines.length)messages.push('Adicione o primeiro efeito da magia.');
 if(b.lines.some(l=>l.effect.effect==='custom'&&!l.effect.reason.trim()))messages.push('Justifique o preço personalizado.');
 document.getElementById('budget-status').textContent=messages.join(' ');
}
const budgetSelector=document.getElementById('budget-preset');
budgetPresets.forEach(([name],index)=>{const option=document.createElement('option');option.value=index;option.textContent=name;budgetSelector.append(option);});
document.getElementById('budget-add').addEventListener('click',()=>{const [name,effect]=budgetPresets[Number(budgetSelector.value)];addBudgetEffect({name,duration:effect.effect==='attack'?'round':'instant',...effect});renderPreview();});
