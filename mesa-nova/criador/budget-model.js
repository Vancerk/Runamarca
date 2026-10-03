// Shared design hypothesis, used by creation UI and the deck audit.
(function(root) {
 const n=(v,max=100)=>Math.max(0,Math.min(max,Math.trunc(Number(v)||0)));
 const labels={damage:'Dano',heal:'Cura',attack:'Bônus de ataque',weaken:'Redução de ataque',health:'Bônus de vida',draw:'Comprar cartas',summon:'Convocar fichas',discount:'Desconto de mana',custom:'Personalizado'};
 const targets={self:'A própria criatura',ally:'Aliado à escolha',enemy:'Inimigo à escolha',lane:'Inimigo na mesma posição',trigger:'Criatura que ativou a armadilha',fixedAlly:'Aliado em posição fixa',patron:'Seu Patrono',enemyPatron:'Patrono inimigo',area:'Várias criaturas',owner:'O jogador'};
 // Creation choices follow the role of each effect, rather than one universal menu.
 function choices(kind,e,{hasDamage=false}={}) {
  const creature=kind==='creature',custom=e.effect==='custom';
  let timings=creature?['enter','reveal','emanation','turn']:['direct','trap'];
  if(e.effect==='discount')timings=creature?['enter','emanation','turn']:['direct'];
  if(custom)timings=[creature?'enter':'direct'];
  const timing=timings.includes(e.timing)?e.timing:timings[0],trap=timing==='trap',position=['reveal','emanation'].includes(timing);
  let validTargets=[];
  if(['summon','draw','discount','custom'].includes(e.effect))validTargets=['owner'];
  else if(e.effect==='damage'||e.effect==='weaken')validTargets=trap?['trigger','area',...(e.effect==='damage'?['enemyPatron']:[])]:['enemy',...(timing==='reveal'?['lane']:[]),'area',...(e.effect==='damage'?['enemyPatron']:[])];
  else if(['attack','health','heal'].includes(e.effect))validTargets=trap?['trigger','fixedAlly','area',...(e.effect==='heal'?['patron']:[])]:[...(creature&&(timing!=='emanation'||e.effect!=='attack')?['self']:[]),'ally',...(position?['fixedAlly']:[]),'area',...(e.effect==='heal'?['patron']:[])];
  const target=validTargets.includes(e.target)?e.target:validTargets[0];
  const durations=['attack','health','weaken'].includes(e.effect)?['round','permanent']:['instant'];
  const conditions=['none'];
  if(!custom){
   if(creature&&timing!=='enter')conditions.push('wounded');
   conditions.push('spell');
   if(['damage','weaken'].includes(e.effect)&&['enemy','lane','trigger'].includes(target))conditions.push('threshold');
   if(hasDamage&&e.effect!=='damage')conditions.push('kill');
  }
  return {timings,targets:validTargets,durations,conditions,maxTargets:timing==='reveal'||trap?3:8,timing,target};
 }
 function normalize(kind,e,context) {
  const options=choices(kind,e,context);
  return {...e,timing:options.timing,target:options.target,
   duration:options.durations.includes(e.duration)?e.duration:options.durations[0],
   condition:options.conditions.includes(e.condition)?e.condition:'none',
   activationCost:['emanation','turn'].includes(options.timing)?n(e.activationCost,30):0,
   count:options.target==='area'?Math.max(2,Math.min(options.maxTargets,n(e.count||2,8))):1};
 }
 function price(e) {
  const amount=n(e.amount,30),count=Math.max(1,n(e.count||1,8)),repeated=['emanation','turn'].includes(e.timing);
  let base=0;
  if(e.effect==='damage')base=2*amount;
  if(['heal','attack','weaken','health'].includes(e.effect))base=amount;
  if(e.effect==='draw'||e.effect==='discount')base=3*amount;
  if(e.effect==='summon')base=(n(e.tokenAttack,30)+n(e.tokenHealth,30))*amount;
  if(e.effect==='custom')base=n(e.customPoints);
  let reach=e.target==='area'?base*(count-1)/2:0;
  if(e.target==='patron'&&e.effect==='heal')reach+=1;
  if(e.target==='enemyPatron')reach+=2;
  const permanence=['attack','health','weaken'].includes(e.effect)&&e.duration==='permanent'?base:0;
  let repeat=repeated?base:0;
  if(e.timing==='reveal'&&['damage','draw','heal','summon','discount'].includes(e.effect))repeat=e.effect==='damage'?1:base;
  if(e.effect==='discount'&&e.timing==='emanation')repeat=0;
  const raw=Math.ceil(base+reach+permanence+repeat);
  let gate=0;
  if(e.timing==='trap'||e.target==='lane'||e.target==='fixedAlly')gate++;
  if(e.condition&&e.condition!=='none')gate++;
  if(repeated&&n(e.activationCost)>0)gate+=Math.min(2,n(e.activationCost));
  const reduction=Math.min(gate,Math.floor(raw/2)),points=Math.max(0,raw-reduction),warnings=[];
  if(e.effect==='custom')warnings.push('Preço manual: justificar e testar.');
  if(repeated&&!n(e.activationCost)&&['draw','summon','damage'].includes(e.effect))warnings.push('Recorrência gratuita: risco alto; limitar ativações.');
  if(e.target==='area')warnings.push('Use o máximo de alvos: formação 3, reserva até 8.');
  if(e.effect==='summon'&&n(e.tokenHealth)<1)warnings.push('Ficha precisa de pelo menos 1 vida.');
  if(!amount&&e.effect!=='custom')warnings.push('Defina uma quantidade maior que zero.');
  if(e.effect==='custom'&&!points)warnings.push('Efeito ainda sem preço.');
  return {base,reach,permanence,repeat,reduction,points,warnings};
 }
 function calculate(card) {
  const mana=n(card.generic??card.cost,20),creature=card.kind==='creature'||card.type==='creature';
  const lines=(Array.isArray(card.budgetEffects)?card.budgetEffects:[]).map(e=>({effect:e,...price(e)}));
  const summed=lines.filter(e=>e.effect.group!=='choice').reduce((s,e)=>s+e.points,0),choice=lines.filter(e=>e.effect.group==='choice');
  const flexibility=choice.length>1?1:0,abilityPoints=summed+(choice.length?Math.max(...choice.map(e=>e.points)):0)+flexibility;
  const attack=creature?n(card.power??card.attack,30):0,health=creature?n(card.health,30):0,available=2*mana+(creature?1:0),spent=attack+health+abilityPoints;
  return {mana,creature,attack,health,available,spent,remaining:available-spent,abilityPoints,flexibility,lines,supported:mana>=1&&mana<=10,suggestedMana:Math.max(1,Math.ceil((spent-(creature?1:0))/2))};
 }
 root.RunaBudget={version:2,price,calculate,labels,targets,choices,normalize};
})(globalThis);
