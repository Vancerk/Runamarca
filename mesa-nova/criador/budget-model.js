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
  return {timings,targets:validTargets,durations,conditions,maxTargets:timing==='reveal'||trap?3:['health','attack','heal'].includes(e.effect)?10:8,timing,target};
 }
 function normalize(kind,e,context) {
  const options=choices(kind,e,context);
  return {...e,timing:options.timing,target:options.target,
   duration:options.durations.includes(e.duration)?e.duration:options.durations[0],
   condition:options.conditions.includes(e.condition)?e.condition:'none',
   activationCost:['emanation','turn'].includes(options.timing)?n(e.activationCost,30):0,
   count:options.target==='area'?Math.max(2,Math.min(options.maxTargets,n(e.count||2,10))):1};
 }
 function price(e) {
  const amount=n(e.amount,30),count=Math.max(1,n(e.count||1,10)),repeated=['emanation','turn'].includes(e.timing);
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
  if(e.target==='area')warnings.push('Máximo: formação 3; área inimiga sem Emanação 8; campo aliado incluindo Emanação 10.');
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
  const text=String(card.rules??card.text??'').trim(),missing=Boolean(text&&!/^Sem habilidades\.?$/i.test(text)&&!lines.length)||Array.isArray(card.effects)&&card.effects.some((_,index)=>!lines.some(line=>line.effect.sourceIndex===index));
  const complete=!missing&&!lines.some(line=>line.effect.effect==='custom'&&(!line.points||!String(line.effect.reason||'').trim()));
  return {mana,creature,attack,health,available,spent,remaining:available-spent,abilityPoints,flexibility,lines,complete,supported:mana>=1&&mana<=10,suggestedMana:complete?Math.max(1,Math.ceil((spent-(creature?1:0))/2)):null};
 }
 // Catalog descriptions are derived from executable effects; unpriced mechanics stay explicit.
 function fromEffects(card){
  const rows=[],creature=card.type==='creature';
  for(const [sourceIndex,e] of (card.effects||[]).entries()){
   const timing=creature?e.timing==='on_enter'?'enter':e.timing==='revelation'?'reveal':String(e.timing).includes('emanat')?'emanation':'turn':card.type==='prepared_spell'?'trap':'direct';
   const target=e.target==='self'?'self':['same_lane_enemy','enemy_same_lane','opposing_creature_same_lane','enemy_same_lane_creature'].includes(e.target)?'lane':e.target==='allied_creature_lane_1'?'fixedAlly':e.target==='chosen_allied_creature'?'ally':e.target==='own_patron'?'patron':timing==='trap'?'trigger':'enemy';
   const base={sourceIndex,name:e.name||e.op,timing,target,duration:e.permanent?'permanent':'round',condition:e.condition==='self_wounded'?'wounded':e.condition==='owner_played_direct_spell_this_round'?'spell':'none',amount:Math.abs(e.amount||0),count:1,activationCost:e.mana_cost||e.cost||0,group:'sum',reason:''};
   const add=(effect,extra={})=>rows.push({...base,effect,...extra});
   const unknown=()=>add('custom',{customPoints:0,reason:'Mecânica sem preço calibrado: '+JSON.stringify(e)});
   if(e.target==='any'||e.uncounterable){unknown();continue;}
   if(e.condition&& !['self_wounded','owner_played_direct_spell_this_round'].includes(e.condition)){unknown();continue;}
   if(e.op==='heal_patron'){add('heal',{target:'patron',duration:'instant'});continue;}
   if(e.subtypeIncludes){unknown();continue;}
   if(e.op==='draw'){add('draw',{target:'owner',duration:'instant'});continue;}
   if(e.op==='summon'){add('summon',{target:'owner',duration:'instant',tokenAttack:e.attack??1,tokenHealth:e.health??1});continue;}
   if(['damage','heal'].includes(e.op)){
    if(e.draw_on_kill){unknown();continue;}add(e.op,{duration:'instant'});
    if(e.allow_patron){rows.at(-1).group='choice';add('heal',{target:'patron',duration:'instant',group:'choice'});}continue;
   }
   if(e.op==='attack_modifier'){add(e.amount<0?'weaken':'attack');continue;}
   if(['stat_buff','area_stat_buff'].includes(e.op)){const area=e.op==='area_stat_buff'?{target:'area',count:10}:{};add('attack',{amount:e.attack,duration:'permanent',...area});add('health',{amount:e.health,duration:'permanent',...area});continue;}
   if(['lane_attack_aura','lane_health_aura'].includes(e.op)){add(e.op==='lane_health_aura'?'health':'attack',{timing:'emanation',target:'fixedAlly',duration:'round',name:'Emanação: +'+e.amount+' de '+(e.op==='lane_health_aura'?'vida':'ataque')+' na posição '+(e.lane+1)});continue;}
   if(e.op==='area_damage'){
    if(!card.positionOnly&& !card.directOnly){add('damage',{timing:'direct',target:'area',count:8,amount:e.direct_amount??e.amount,duration:'instant',group:'choice'});add('damage',{timing:'trap',target:'area',count:3,duration:'instant',group:'choice'});}
    else add('damage',{target:'area',count:timing==='trap'?3:8,amount:timing==='trap'?e.amount:e.direct_amount??e.amount,duration:'instant'});continue;
   }
   if(e.op==='area_attack_modifier'){if(!card.positionOnly&&!card.directOnly){add('weaken',{timing:'direct',target:'area',count:e.random_count||e.count||8,duration:'permanent',group:'choice'});add('weaken',{timing:'trap',target:'area',count:3,duration:'permanent',group:'choice'});}else add('weaken',{target:'area',count:timing==='trap'?3:8,duration:'permanent'});continue;}
   if(e.op==='choose_one'){for(const option of e.options||[])add(option.op||'heal',{target:option.target==='own_patron'?'patron':'ally',amount:option.amount,duration:'instant',group:'choice'});continue;}
   unknown();
  }
  return rows;
 }
 root.RunaBudget={version:3,price,calculate,labels,targets,choices,normalize,fromEffects};
})(globalThis);
