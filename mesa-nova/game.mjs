import {randomBytes, randomUUID} from 'node:crypto';
import {beginMatch} from '../accounts.mjs';
import {resolveDirectedCombat} from './combat-effects.mjs';
import {spellBuff,retainAnchors,curseFromDamage,finishFields} from './fluxo-effects.mjs';

export const code = () => randomBytes(3).toString('hex').toUpperCase();
export const token = () => randomBytes(24).toString('hex');
const shuffle = array => { for(let i=array.length-1;i>0;i--){const j=randomBytes(4).readUInt32BE(0)%(i+1);[array[i],array[j]]=[array[j],array[i]];}return array; };
const other = (room,id) => room.players.find(p=>p.id!==id);
const own = (room,id) => room.players.find(p=>p.id===id);
const effects = card => Array.isArray(card?.effects)?card.effects:card?.effects?[card.effects]:[];
const effect = card => effects(card)[0] || null;
const pushLog = (room,message,actor=room.turn) => {room.log.push({message,round:room.round,turn:room.turn,actor,phase:room.phase});if(room.log.length>10)room.log.shift();};
const emit = (room,type,details={}) => {room.events??=[];room.events.push({id:++room.eventId,type,at:Date.now(),...details});if(room.events.length>30)room.events.shift();};
const alive = card => card && card.damage < card.health;
const reserveSize = p => p.reserve.filter(c=>alive(c)&&!p.emanation.includes(c.uid)).length;
const attack = (card,room,lane) => {
  if(!card)return 0;
  let value=card.attack+(card.attackMod||0)+(room.laneBonuses?.[card.owner]?.[lane]||0);
  if(card.damage>0)value+=effects(card).filter(e=>e.op==='wounded_attack').reduce((sum,e)=>sum+e.amount,0);
  const p=own(room,card.owner);
  if(p&&lane===0)value+=p.emanation.filter(uid=>p.reserve.find(c=>c.uid===uid)?.modelId==='R05').length;
  if(p)value+=p.emanation.flatMap(uid=>effects(p.reserve.find(c=>c.uid===uid))).filter(e=>e.op==='lane_attack_aura'&&e.lane===lane).reduce((sum,e)=>sum+e.amount,0);
  return Math.max(0,value);
};
const laneCard = (room,ownerId,lane) => own(room,ownerId).formation[lane] ? own(room,ownerId).reserve.find(c=>c.uid===own(room,ownerId).formation[lane]) : null;
const findCreature = (p,uid) => p.reserve.find(c=>c.uid===uid && alive(c));

function freshPlayer(name){return {id:randomUUID(),token:token(),name:cleanName(name),bot:false,deckId:null,art:{},patron:null,deck:[],hand:[],reserve:[],discard:[],manaMax:0,mana:0,fatigue:0,formation:[null,null,null],taunts:{},emanation:[],directPlayed:false,discountUsed:false,prepared:[],vote:null,ready:false,mulligansLeft:0,mulliganReady:false};}
export function makeRoom(roomCode,name,role='player'){
  const player=freshPlayer(name);
  return {code:roomCode,inviteToken:token(),players:role==='spectator'?[]:[player],spectators:role==='spectator'?[player]:[],phase:'lobby',round:1,turn:null,first:null,coinWinner:null,winner:null,log:[],events:[],eventId:0,revision:0};
}
export function cleanName(value){return String(value||'').trim().slice(0,30)||'Caçador';}
export function join(room,name,role='player'){if(!['player','spectator'].includes(role))throw Error('Papel inválido.');if(role==='player'&&(room.players.length>=2||room.phase!=='lobby'))throw Error('As vagas de jogador estão ocupadas. Entre na arquibancada.');const p=freshPlayer(name);(role==='spectator'?room.spectators:room.players).push(p);pushLog(room,`${p.name} entrou ${role==='spectator'?'na arquibancada':'na sala'}.`,p.id);room.revision++;return p;}
export function findPlayer(room,secret){return [...room.players,...room.spectators].find(p=>p.token===secret);}
function draw(room,p,n=1,silent=false){for(let i=0;i<n;i++){if(p.deck.length){const card=p.deck.pop();if(p.hand.length>=9){p.discard.push(card);pushLog(room,`${p.name} queimou ${card.name}: mão cheia (9).`,p.id);if(!silent)emit(room,'burn',{playerId:p.id,name:card.name});}else{p.hand.push(card);if(!silent)emit(room,'draw',{playerId:p.id,cardId:card.uid});}}else{p.fatigue=p.fatigue?Math.min(Number.MAX_SAFE_INTEGER,p.fatigue*2):1;p.patron.hp-=p.fatigue;pushLog(room,`${p.name} sofreu ${p.fatigue} de fadiga.`,p.id);emit(room,'fatigue',{playerId:p.id,amount:p.fatigue});checkWin(room);if(room.phase==='finished')break;}}}
function startPrep(room,p){room.phase='prep';room.turn=p.id;p.manaMax=Math.min(10,p.manaMax+1);p.mana=p.manaMax;p.directPlayed=false;p.discountUsed=false;p.vote=null;p.ready=false;retainAnchors(p);p.taunts={};emit(room,'turn',{playerId:p.id,round:room.round});draw(room,p);pushLog(room,`Preparação de ${p.name}: ${p.mana}/${p.manaMax} mana e uma compra.`,p.id);}
const patronPortrait={ruptura:'patrons/garra-vigilante.png',fluxo:'patrons/olho-dos-pactos.png',forja:'patrons/bigorna-desperta.png'};
function startMatch(room,first){beginMatch(room);room.first=first;room.phase='mulligan';room.round=1;room.preparationsDone=0;room.combatCount=0;room.laneBonuses={};room.lastCombat=null;room.combat=null;emit(room,'first',{playerId:first});for(const p of room.players){const deck=p.deckData;const art=id=>typeof p.art[id]==='string'?{image:p.art[id],kind:'illustration'}:p.art[id]||{image:null,kind:null};p.patron={name:deck.patron.name,hp:16,maxHp:16,affinity:deck.affinity,image:art(deck.patron.id).image||patronPortrait[deck.affinity]};p.deck=shuffle(deck.cards.flatMap(model=>Array.from({length:model.quantity},()=>({...structuredClone(model),uid:randomUUID(),modelId:model.id,owner:p.id,damage:0,attackMod:0,speech:art(model.id).speech??model.speech,narrative:art(model.id).narrative??model.narrative,image:art(model.id).image||model.image||null,imageKind:art(model.id).kind||'illustration',artZoom:art(model.id).artZoom??model.artZoom??100,artX:art(model.id).artX??model.artX??50,artY:art(model.id).artY??model.artY??0}))));p.pendingDiscard=0;p.hand=[];p.reserve=[];p.discard=[];p.mana=p.manaMax=p.fatigue=0;p.prepared=[];p.emanation=[];p.formation=[null,null,null];p.vote=null;p.ready=false;p.mulligansLeft=1;p.mulliganReady=false;draw(room,p,5,true);emit(room,'opening',{playerId:p.id,count:5});}}
function checkWin(room){if(room.phase==='finished')return;const down=room.players.filter(p=>p.patron?.hp<=0);if(!down.length)return;room.phase='finished';room.turn=null;room.winner=down.length===2?null:other(room,down[0].id).id;pushLog(room,down.length===2?'Empate: ambos os Patronos caíram.':`${other(room,down[0].id).name} venceu.`);}
function resetToLobby(room){for(const seat of room.players){seat.deckId=null;seat.deckData=null;seat.art={};seat.patron=null;seat.hand=[];seat.deck=[];seat.reserve=[];seat.discard=[];seat.prepared=[];seat.pendingDiscard=0;seat.emanation=[];seat.mulligansLeft=0;seat.mulliganReady=false;}room.phase='lobby';room.winner=room.coinWinner=room.first=room.turn=null;room.lastCombat=room.combat=null;room.round=1;room.preparationsDone=0;}
function removeDead(room){for(const p of room.players){const dead=p.reserve.filter(c=>!alive(c));for(const c of dead){p.discard.push(c);p.formation=p.formation.map(uid=>uid===c.uid?null:uid);p.emanation=p.emanation.filter(uid=>uid!==c.uid);pushLog(room,`${c.name} foi derrotada.`,p.id);}p.reserve=p.reserve.filter(alive);}}
function applyDamage(room,card,amount){if(card && amount>0)card.damage+=amount;}
function applyEffect(room,caster,spell,target,phase){
  for(const ef of effects(spell)){
    if(ef.op==='draw'){draw(room,caster,ef.amount);continue;}
    if(ef.op==='discard'){caster.pendingDiscard=Math.min(caster.hand.length,(caster.pendingDiscard||0)+ef.amount);continue;}
    if(ef.op==='area_stat_buff'){for(const c of caster.reserve.filter(alive)){c.attack+=ef.attack;c.health+=ef.health;spellBuff(c,room.round,true);}continue;}
    if(ef.op==='summon'){for(let i=0;i<ef.amount&&reserveSize(caster)<8;i++){const creature={uid:randomUUID(),modelId:`${spell.id}-token`,owner:caster.id,name:ef.name||'Aliado Convocado',type:'creature',rarity:'lacaio',affinity:caster.patron.affinity,cost:0,attack:ef.attack||1,health:ef.health||1,damage:0,attackMod:0,text:'Criatura convocada.',effects:[],token:true};caster.reserve.push(creature);emit(room,'summon',{playerId:caster.id,cardId:creature.uid,name:creature.name,zone:'reserve',speech:'Estou a postos!'});}continue;}
    if(ef.op==='area_damage'){for(const creature of other(room,caster.id).reserve)if(alive(creature)&&!other(room,caster.id).emanation.includes(creature.uid))applyDamage(room,creature,ef.direct_amount??ef.amount);continue;}
    if(ef.op==='choose_one'){const option=ef.options?.find(o=>target?.patron?o.target==='own_patron':o.target==='chosen_allied_creature');if(option){const amount=option.amount;if(target?.patron)caster.patron.hp=Math.min(caster.patron.maxHp,caster.patron.hp+amount);else if(target)target.damage=Math.max(0,target.damage-amount);}continue;}
    if(!target)continue;
    if(ef.op==='heal'){target.damage=Math.max(0,target.damage-ef.amount);continue;}
    if(ef.op==='damage'){const previouslyAlive=alive(target);applyDamage(room,target,ef.amount);if(ef.draw_on_kill&&previouslyAlive&&!alive(target))draw(room,caster,ef.draw_on_kill);continue;}
    if(ef.op==='defeat'){target.damage=target.health;continue;}
    if(ef.op==='attack_modifier'){target.attackMod=(target.attackMod||0)+ef.amount;if(ef.amount>0)spellBuff(target,room.round);continue;}
    if(ef.op==='stat_buff'){target.attack+=ef.attack;target.health+=ef.health;spellBuff(target,room.round,true);continue;}
    if(ef.op==='conditional_damage'){const value=attack(target,room,phase?.lane||0)>=ef.condition.gte?ef.amount_if_true:ef.amount_if_false;applyDamage(room,target,value);}
  }
}
function targetKind(spell){const ef=effect(spell);if(['draw','area_stat_buff'].includes(ef?.op))return 'self';if(ef?.op==='area_damage')return 'enemy-board';if(ef?.op==='choose_one')return 'friendly-or-patron';if(['heal','attack_modifier','stat_buff'].includes(ef?.op)&&ef?.target==='chosen_allied_creature')return 'friendly';return 'enemy';}
function validTarget(room,p,spell,targetId){const kind=targetKind(spell);if(kind==='self'||kind==='enemy-board')return {kind,target:null};if(kind==='friendly-or-patron'&&targetId==='patron')return {kind,target:{patron:true}};const side=kind==='enemy'?other(room,p.id):p;const target=findCreature(side,targetId);if(!target)throw Error('Escolha uma criatura viva do lado correto.');return {kind,target};}
function paidCost(p,card,mode='direct'){let cost=card.cost;const sources=p.emanation.filter(uid=>p.reserve.find(c=>c.uid===uid)?.modelId==='M04').length;const discount=mode==='direct'&&card.type!=='creature'&&sources>0&&!p.discountUsed&&!p.directPlayed;if(discount)cost=Math.max(1,cost-sources);if(p.mana<cost)throw Error(`Mana insuficiente: precisa de ${cost}.`);p.mana-=cost;if(discount)p.discountUsed=true;return cost;}
function finishRound(room){for(const p of room.players){for(const prep of p.prepared.filter(item=>effects(item.card).some(ef=>ef.op==='area_damage'))){p.discard.push(prep.card);emit(room,'expire',{playerId:p.id,cardId:prep.card.uid,name:prep.card.name});pushLog(room,`${prep.card.name} se desfez ao fim da rodada.`,p.id);}p.prepared=p.prepared.filter(item=>!effects(item.card).some(ef=>ef.op==='area_damage'));}room.preparationsDone=0;for(const p of room.players){retainAnchors(p);p.vote=null;p.ready=false;p.directPlayed=false;p.discountUsed=false;for(const c of p.reserve)c.attackMod=0;}room.laneBonuses={};room.round++;room.first=other(room,room.first).id;startPrep(room,own(room,room.first));}
export const COMBAT_MS=9000;
function beginCombat(room){
  const id=randomUUID();
  room.phase='resolving';
  const spells=room.players.flatMap(p=>p.prepared.filter(item=>laneCard(room,item.targetSide,item.lane)).map(item=>({cardId:item.card.uid,name:item.card.name,casterId:p.id,lane:item.lane,targetSide:item.targetSide,positive:item.targetSide===p.id,amount:effects(item.card).map(ef=>ef.amount||ef.attack||ef.amount_if_true||0).join('/'),op:effect(item.card)?.op})));
  const revelations=room.players.flatMap(p=>p.formation.flatMap((uid,lane)=>{const card=p.reserve.find(c=>c.uid===uid),ef=card&&effects(card).find(ef=>ef.timing==='revelation'&&(ef.condition!=='allied_spell_buff'||p.reserve.some(c=>c.uid!==uid&&(c.spellBuff==='permanent'||c.spellBuff===room.round))||p.prepared.some(x=>x.targetSide===p.id&&effects(x.card).some(e=>['stat_buff','area_stat_buff','barrier'].includes(e.op))))&&(ef.condition!=='owner_played_direct_spell_this_round'||p.directPlayed)&&(ef.condition!=='self_wounded'||card.damage>0));return ef?[{sourceId:uid,casterId:p.id,targetSide:ef.target==='self'||['damage_curse','adjacent_attack_buff'].includes(ef.op)?p.id:other(room,p.id).id,lane,name:card.name,op:ef.op,amount:ef.amount}]:[];}));
  const timeline=[{kind:'reveal',duration:1200},...spells.map(spell=>({kind:'magic',duration:1250,spell})),...revelations.map(ability=>({kind:'revelation',duration:1200,ability})),...Array.from({length:3},(_,lane)=>({kind:'clash',lane,duration:2200})),{kind:'result',duration:1200}];
    const duration=timeline.reduce((sum,step)=>sum+step.duration,0);
  room.combat={id,round:room.round,startedAt:Date.now(),duration,timeline,lanes:Array.from({length:3},(_,lane)=>({cards:room.players.map(p=>{const c=laneCard(room,p.id,lane);return c?{uid:c.uid,name:c.name,owner:p.id}:null;})})),spells};
  // Simulate on a detached snapshot so the animation knows which cards actually
  // reach the clash after prepared spells and Revelation have resolved.
  const preview=structuredClone({...room,onChange:null,botTimer:null,combat:null,collectPreview:true});
  resolveCombat(preview);
  room.combat.visual=preview.preClash||[];if(preview.directedSteps){const index=timeline.findIndex(step=>step.kind==='clash');timeline.splice(index,3,...preview.directedSteps.map(strike=>({kind:'strike',lane:strike.lane,strike,duration:strike.blocked?300:strike.pair?1900:1400})));}if(preview.growthUpdates?.length)timeline.splice(timeline.length-1,0,{kind:'growth',duration:1400,updates:preview.growthUpdates});for(const step of timeline){if(step.kind==='magic')step.spell.healthUpdates=preview.spellHealthUpdates?.find(entry=>entry.cardId===step.spell.cardId)?.targets||[];if(step.kind==='revelation')step.ability.healthUpdates=preview.revelationHealthUpdates?.filter(entry=>entry.sourceId===step.ability.sourceId).map(entry=>entry.target)||[];}
  room.combat.casualties=preview.players.flatMap(p=>p.discard.filter(c=>c.type==='creature'&&!own(room,p.id).discard.some(old=>old.uid===c.uid)).map(c=>({uid:c.uid,owner:p.id})));
  for(const step of timeline)if(step.kind==='clash'){
    const cards=room.combat.visual.find(entry=>entry.lane===step.lane)?.cards.filter(Boolean)||[];
    const weight=Math.min(1,Math.max(0,...cards.map(c=>(c.attack+c.health-6)/14)));
    step.duration=cards.length?(cards.length===1?2050:1550)+Math.round(weight*350):300;
  }
  room.combat.duration=timeline.reduce((sum,step)=>sum+step.duration,0);
  pushLog(room,`Combate da rodada ${room.round}: formações reveladas.`);
  setTimeout(()=>{if(room.phase!=='resolving'||room.combat?.id!==id)return;resolveCombat(room);room.combat=null;room.revision++;room.onChange?.();},room.combat.duration);
}
export function resolveCombat(room){
  room.directedSteps=null;room.combatCount=(room.combatCount||0)+1;room.laneBonuses={};
  room.growthUpdates=[];
  if(room.collectPreview){room.spellHealthUpdates=[];room.revelationHealthUpdates=[];}
  const [left,right]=room.players;
  room.lastCombat={round:room.round,names:[left.name,right.name],lanes:Array.from({length:3},(_,lane)=>({left:laneCard(room,left.id,lane)?.name||'Vazia',right:laneCard(room,right.id,lane)?.name||'Vazia'})),spells:[],patronHits:[]};
  const triggered=[];
  for(const p of room.players)for(const prep of p.prepared){const targetSide=own(room,prep.targetSide);const target=laneCard(room,targetSide.id,prep.lane);if(target)triggered.push({prep,caster:p,target,targetSide});}
  const spellChanges=new Map();const spellDraws=[];const killDraws=[];
  const changeFor=card=>{if(!spellChanges.has(card))spellChanges.set(card,{damage:0,heal:0,attack:0,statAttack:0,statHealth:0,defeat:false});return spellChanges.get(card);};
  for(const {prep,caster,target,targetSide} of triggered){
    for(const ef of effects(prep.card)){
      if(ef.op==='draw'){spellDraws.push([caster,ef.amount]);continue;}
      if(ef.op==='discard'){caster.pendingDiscardAfterCombat=(caster.pendingDiscardAfterCombat||0)+ef.amount;continue;}
      if(ef.op==='anchor'){target.anchor={lane:prep.lane,remaining:2,setAt:room.combatCount};continue;}
      if(ef.op==='barrier'){changeFor(target).statHealth+=ef.health;target.temporaryHealth=(target.temporaryHealth||0)+ef.health;spellBuff(target,room.round);continue;}
      if(ef.op==='area_stat_buff'){for(const c of caster.reserve.filter(alive)){changeFor(c).statAttack+=ef.attack;changeFor(c).statHealth+=ef.health;spellBuff(c,room.round,true);}continue;}
      const change=changeFor(target);
        if(ef.op==='area_damage'){for(let lane=0;lane<3;lane++){const enemy=laneCard(room,other(room,caster.id).id,lane);if(alive(enemy))changeFor(enemy).damage+=ef.amount;}continue;}
        if(ef.op==='damage'){change.damage+=ef.amount;if(ef.draw_on_kill)killDraws.push([caster,target,ef.draw_on_kill]);}
      if(ef.op==='conditional_damage')change.damage+=attack(target,room,prep.lane)>=ef.condition.gte?ef.amount_if_true:ef.amount_if_false;
      if(ef.op==='heal')change.heal+=ef.amount;
      if(ef.op==='choose_one')change.heal+=ef.options.find(x=>x.target==='chosen_allied_creature')?.amount||0;
      if(ef.op==='defeat')change.defeat=true;
      if(ef.op==='attack_modifier'){change.attack+=ef.amount;if(ef.amount>0)spellBuff(target,room.round);}
      if(ef.op==='stat_buff'){change.statAttack+=ef.attack;change.statHealth+=ef.health;spellBuff(target,room.round,true);}
    }
    if(room.collectPreview)room.spellHealthUpdates.push({cardId:prep.card.uid,targets:[...spellChanges].map(([card,change])=>({uid:card.uid,hp:Math.max(0,card.health+change.statHealth-(change.defeat?card.health:Math.max(0,card.damage+change.damage-change.heal))),maxHp:card.health+change.statHealth,attack:card.attack+change.statAttack}))});
    if(effects(prep.card).some(e=>e.op==='barrier')){prep.remaining??=2;prep.lastCombat=room.combatCount;}else{caster.discard.push(prep.card);caster.prepared=caster.prepared.filter(item=>item!==prep);}
    room.lastCombat.spells.push(`${prep.card.name} · posição ${prep.lane+1} de ${targetSide.name}`);
    pushLog(room,`${prep.card.name} foi ativada na posição ${prep.lane+1} de ${targetSide.name}.`,caster.id);
  }
  for(const [target,change] of spellChanges){target.attack+=change.statAttack;target.health+=change.statHealth;target.attackMod=(target.attackMod||0)+change.attack;target.damage=change.defeat?target.health:Math.max(0,target.damage+change.damage-change.heal);}
  for(const [caster,target,count] of killDraws)if(!alive(target))draw(room,caster,count);for(const [caster,count] of spellDraws)draw(room,caster,count);
  removeDead(room);checkWin(room);if(room.phase==='finished')return;
  for(const p of room.players)for(const prep of p.prepared)if(effects(prep.card).some(e=>e.op==='barrier')){prep.remaining??=2;prep.lastCombat=room.combatCount;}
  for(const p of room.players){if(p.pendingDiscardAfterCombat){p.pendingDiscard=Math.min(p.hand.length,(p.pendingDiscard||0)+p.pendingDiscardAfterCombat);delete p.pendingDiscardAfterCombat;}for(const c of p.reserve)if(effects(c).some(e=>e.op==='damage_curse')&&p.formation.includes(c.uid))c.curseArmed=true;}
  const reveals=[];
  for(const p of room.players)for(let lane=0;lane<3;lane++){
    const card=laneCard(room,p.id,lane);if(!card)continue;
    const ef=effects(card).find(x=>x.timing==='revelation');if(!ef)continue;
    if(ef.condition==='allied_spell_buff'&&!p.reserve.some(c=>c.uid!==card.uid&&alive(c)&&(c.spellBuff==='permanent'||c.spellBuff===room.round)))continue;
    if(ef.condition==='owner_played_direct_spell_this_round'&&!p.directPlayed)continue;if(ef.condition==='self_wounded'&&card.damage<=0)continue;
    reveals.push({p,lane,card,ef,target:ef.target==='self'?card:laneCard(room,other(room,p.id).id,lane)});
  }
  const hits=[];
  for(const item of reveals){if(item.ef.op==='adjacent_attack_buff'){room.laneBonuses[item.p.id]??=[0,0,0];for(const lane of [item.lane-1,item.lane+1])if(lane>=0&&lane<3){room.laneBonuses[item.p.id][lane]+=item.ef.amount;const c=laneCard(room,item.p.id,lane);if(c&&room.collectPreview)room.revelationHealthUpdates.push({sourceId:item.card.uid,target:{uid:c.uid,hp:c.health-c.damage,maxHp:c.health,attack:attack(c,room,lane)}});}}else if(item.ef.op==='damage'&&item.target)hits.push([item.target,item.ef.amount,item.card.uid]);else if(item.ef.op==='attack_modifier'&&item.target){item.target.attackMod+=item.ef.amount;if(room.collectPreview)room.revelationHealthUpdates.push({sourceId:item.card.uid,target:{uid:item.target.uid,hp:Math.max(0,item.target.health-item.target.damage),maxHp:item.target.health,attack:attack(item.target,room,item.lane)}});}pushLog(room,`${item.card.name} ativou Revelação na posição ${item.lane+1}.`,item.p.id);}
  for(const [target,amount,sourceId] of hits){applyDamage(room,target,amount);curseFromDamage(target,room.players.flatMap(p=>p.reserve).find(c=>c.uid===sourceId),effects);if(room.collectPreview)room.revelationHealthUpdates.push({sourceId,target:{uid:target.uid,hp:Math.max(0,target.health-target.damage),maxHp:target.health}});}
  removeDead(room);checkWin(room);if(room.phase==='finished')return;
  const damage=[];const patronHits=[];
  const [a,b]=room.players;
  if(room.collectPreview)room.preClash=Array.from({length:3},(_,lane)=>({lane,cards:[a,b].map(p=>{const c=laneCard(room,p.id,lane);return c?{uid:c.uid,owner:p.id,attack:attack(c,room,lane),health:c.health-c.damage}:null;})}));
  if(room.players.some(p=>p.reserve.some(c=>effects(c).some(e=>['initiative','trample','taunt','kill_growth','survive_growth','adjacent_damage','damage_curse'].includes(e.op))))){
    resolveDirectedCombat(room,{effects,attack,laneCard,alive,applyDamage,pushLog,curseFromDamage});
    removeDead(room);checkWin(room);finishFields(room);if(room.phase!=='finished')finishRound(room);return;
  }
  for(let lane=0;lane<3;lane++){
    const ac=laneCard(room,a.id,lane),bc=laneCard(room,b.id,lane);
    if(ac&&bc){damage.push([ac,attack(bc,room,lane)],[bc,attack(ac,room,lane)]);pushLog(room,`Posição ${lane+1}: ${ac.name} enfrenta ${bc.name}.`);}
    else if(ac)patronHits.push([b,attack(ac,room,lane),ac.name,lane,a.id]);
    else if(bc)patronHits.push([a,attack(bc,room,lane),bc.name,lane,b.id]);
  }
  for(const [target,amount] of damage)applyDamage(room,target,amount);
  for(const [target,amount,name,lane,actor] of patronHits){target.patron.hp-=amount;room.lastCombat.patronHits.push(`${name}: ${amount} em ${target.name} pela posição ${lane+1}`);pushLog(room,`${name} causou ${amount} ao Patrono de ${target.name} pela posição ${lane+1}.`,actor);}
  removeDead(room);checkWin(room);finishFields(room);if(room.phase!=='finished')finishRound(room);
}
export function act(room,p,data,catalog){
  if(!data||typeof data.type!=='string')throw Error('Ação inválida.');
  if(data.type==='leave'||data.type==='spectate'){
    const playing=room.players.includes(p);if(playing){room.players.splice(room.players.indexOf(p),1);if(room.phase!=='lobby')resetToLobby(room);if(data.type==='spectate')room.spectators.push(p);}
    else if(data.type==='leave'){room.spectators.splice(room.spectators.indexOf(p),1);}
    pushLog(room,`${p.name} ${data.type==='spectate'?'foi para a arquibancada':'saiu da sala'}.`,p.id);room.revision++;return;
  }
  if(data.type==='takeSeat'){
    if(!room.spectators.includes(p)||room.phase!=='lobby'||room.players.length>=2)throw Error('Não há vaga de jogador disponível agora.');
    room.spectators.splice(room.spectators.indexOf(p),1);room.players.push(p);pushLog(room,`${p.name} ocupou uma vaga de jogador.`,p.id);room.revision++;return;
  }
  if(!room.players.includes(p))throw Error('A arquibancada pode assistir, mas não jogar.');
  if(room.phase==='finished'&&data.type!=='reset')throw Error('A partida terminou.');
  if(data.type==='reset'){if(room.players.length!==2)throw Error('Aguarde dois jogadores.');resetToLobby(room);room.log=[];room.revision++;return;}
  if(data.type==='addBot'){
    if(room.phase!=='lobby'||room.players.length!==1||p.bot)throw Error('O bot fácil só pode entrar numa sala com um jogador humano.');
    const deck=catalog.decks.find(d=>d.id===data.deckId);if(!deck)throw Error('Deck do bot desconhecido.');
    const bot=join(room,'Autômato de Treino');bot.bot=true;bot.botDeckId=deck.id;
    act(room,bot,{type:'deck',deckId:deck.id},catalog);pushLog(room,'Autômato de Treino entrou como adversário fácil.');room.revision++;return;
  }
  if(data.type==='deck'){
    if(room.phase!=='lobby')throw Error('A escolha de decks terminou.');const deck=catalog.decks.find(d=>d.id===data.deckId);if(!deck)throw Error('Deck desconhecido.');
    const limits={lacaio:4,padrao:3,elite:2,soberano:1},total=deck.cards.reduce((sum,c)=>sum+c.quantity,0);if(total<1||total>30||deck.cards.some(c=>!Number.isInteger(c.quantity)||c.quantity<1||!Object.hasOwn(limits,c.rarity)||c.quantity>limits[c.rarity]))throw Error('Deck inválido: até 30 cartas; Bronze 4, Prata 3, Ouro 2 e Platina 1 cópia por carta.');
    const art={};for(const [id,entry] of Object.entries(data.art||{})){if(!deck.cards.some(c=>c.id===id)&&id!==deck.patron.id)continue;const image=typeof entry==='string'?entry:entry?.image;const kind=typeof entry==='string'?'illustration':entry?.kind;if(image!=null&&(typeof image!=='string'||image.length>2_000_000||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/i.test(image)||!['card','illustration'].includes(kind)))throw Error('Imagem inválida.');art[id]={image,kind};for(const field of ['artZoom','artX','artY'])if(Number.isFinite(entry?.[field]))art[id][field]=Math.max(field==='artZoom'?100:0,Math.min(field==='artZoom'?230:100,entry[field]));for(const [field,max] of [['speech',160],['narrative',1200]])if(typeof entry?.[field]==='string')art[id][field]=entry[field].trim().slice(0,max);}
    p.deckId=deck.id;p.deckData=deck;p.art=art;pushLog(room,`${p.name} escolheu ${deck.name}.`,p.id);if(room.players.length===2&&room.players.every(x=>x.deckId)){room.phase='coin';room.coinWinner=room.players[randomBytes(1)[0]%2].id;emit(room,'coin',{playerId:room.coinWinner});pushLog(room,`${own(room,room.coinWinner).name} venceu a moeda e joga primeiro.`);startMatch(room,room.coinWinner);}room.revision++;return;
  }
  if(data.type==='first')throw Error('A ordem da moeda é automática e não pode ser alterada.');
  if(room.phase==='mulligan'){
    if(p.mulliganReady)throw Error('Sua mão inicial já foi confirmada.');
    if(data.type==='mulligan'){
      if(p.mulligansLeft<=0)throw Error('Você não tem mais trocas disponíveis.');
      const ids=data.cardIds;if(!Array.isArray(ids)||ids.length<1||ids.length>5||new Set(ids).size!==ids.length||ids.some(id=>!p.hand.some(c=>c.uid===id)))throw Error('Selecione de uma a cinco cartas da sua mão.');
      const returning=p.hand.filter(c=>ids.includes(c.uid));p.hand=p.hand.filter(c=>!ids.includes(c.uid));p.deck=shuffle([...p.deck,...returning]);p.mulligansLeft--;emit(room,'mulligan',{playerId:p.id,count:returning.length});draw(room,p,returning.length);pushLog(room,`${p.name} trocou ${returning.length} carta(s) da mão inicial.`,p.id);
    }else if(data.type==='confirmMulligan'){
      p.mulliganReady=true;pushLog(room,`${p.name} confirmou a mão inicial.`,p.id);if(room.players.every(x=>x.mulliganReady))startPrep(room,own(room,room.first));
    }else throw Error('Ação indisponível na troca inicial.');room.revision++;return;
  }
  if(['unprepare','movePrepared'].includes(data.type)){
    if(!((room.phase==='prep'&&room.turn===p.id)||(room.phase==='formation'&&!p.ready)))throw Error('Não é possível modificar magias após confirmar ou fora da sua preparação.');
    const prep=p.prepared.find(item=>item.card.uid===data.cardId);if(!prep)throw Error('Escolha uma magia preparada por você.');
    if(data.type==='unprepare'){
      if(p.hand.length>=9)throw Error('Sua mão está cheia. Reposicione a magia em vez de retirar.');
      p.prepared=p.prepared.filter(item=>item!==prep);p.hand.push(prep.card);const refund=prep.paidRound===room.round&&room.phase==='prep'&&room.turn===p.id?prep.paid:0;const returned=Math.min(refund||0,Math.max(0,p.manaMax-p.mana));p.mana+=returned;
      pushLog(room,`${p.name} retirou uma magia preparada${returned?` e recuperou ${returned} mana`:''}.`,p.id);
    }else{
      const lane=Number(data.lane),side=own(room,data.targetSide);
      if(!side||!Number.isInteger(lane)||lane<0||lane>2)throw Error('Posição inválida.');
      if(p.prepared.some(item=>item!==prep&&item.targetSide===side.id&&item.lane===lane))throw Error('Você já colocou uma magia nessa posição.');
      prep.lane=lane;prep.targetSide=side.id;prep.hidden=side.id!==p.id;
      pushLog(room,`${p.name} reposicionou uma magia preparada.`,p.id);
    }
    room.revision++;return;
  }
  if(p.pendingDiscard){if(data.type!=='discard')throw Error('Escolha uma carta para descartar antes de continuar.');if(!['prep','vote','formation'].includes(room.phase))throw Error('Aguarde o fim do combate.');const card=p.hand.find(c=>c.uid===data.cardId);if(!card)throw Error('Escolha uma carta da mão.');p.hand=p.hand.filter(c=>c!==card);p.discard.push(card);p.pendingDiscard--;pushLog(room,`${p.name} descartou ${card.name}.`,p.id);emit(room,'discard',{playerId:p.id,cardId:card.uid});room.revision++;return;}
  if(room.phase==='prep'){
    if(p.id!==room.turn)throw Error('Aguarde sua preparação.');
    if(data.type==='play'){
      const card=p.hand.find(c=>c.uid===data.cardId);if(!card)throw Error('Carta não está na mão.');
      if(card.type==='creature'){
        const toEmanation=data.mode==='emanate';
        if(!toEmanation&&reserveSize(p)>=8)throw Error('Reserva cheia: até 8 criaturas fora de Emanação.');
        if(toEmanation&&(!effects(card).some(ef=>String(ef.timing).includes('emanat'))||p.emanation.length>=2))throw Error('Esta carta não pode entrar em Emanação ou as duas vagas estão ocupadas.');
        paidCost(p,card);p.hand=p.hand.filter(c=>c!==card);p.reserve.push(card);if(toEmanation)p.emanation.push(card.uid);
        pushLog(room,`${p.name} jogou ${card.name} ${toEmanation?'diretamente em Emanação':'na reserva'}.`,p.id);emit(room,'creature',{playerId:p.id,cardId:card.uid,name:card.name,zone:toEmanation?'emana':'reserve',speech:card.speech||'A caçada começa.'});for(const ef of effects(card).filter(x=>x.timing==='on_enter'))applyEffect(room,p,{effects:[ef],id:card.id},card);
      }
      else{
        const mode=data.mode||'direct';const kind=targetKind(card);
        if(mode==='direct'){
          if(card.positionOnly)throw Error('Esta magia deve ser colocada em uma posição.');
          const {target}=validTarget(room,p,card,data.targetId);
          paidCost(p,card,'direct');p.hand=p.hand.filter(c=>c!==card);p.discard.push(card);applyEffect(room,p,card,target);p.directPlayed=true;removeDead(room);checkWin(room);pushLog(room,`${p.name} usou ${card.name} diretamente.`,p.id);emit(room,'spell',{playerId:p.id,targetId:target?.uid||null,targetPatronId:target?.patron?p.id:null,name:card.name,op:effect(card)?.op,amount:effect(card)?.amount||effect(card)?.attack||0,healthUpdates:effect(card)?.op==='area_stat_buff'?p.reserve.map(c=>({uid:c.uid,hp:Math.max(0,c.health-c.damage),maxHp:c.health,attack:attack(c,room,p.formation.indexOf(c.uid))})):effect(card)?.op==='area_damage'?other(room,p.id).reserve.concat(other(room,p.id).discard.filter(c=>c.type==='creature')).map(c=>({uid:c.uid,hp:Math.max(0,c.health-c.damage),maxHp:c.health})):target?.patron?[{patronId:p.id,hp:p.patron.hp,maxHp:p.patron.maxHp}]:target?[{uid:target.uid,hp:Math.max(0,target.health-target.damage),maxHp:target.health}]:[],attackAfter:['attack_modifier','stat_buff'].includes(effect(card)?.op)&&target?attack(target,room,p.formation.indexOf(target.uid)):undefined});
        }else if(mode==='lane'){
          const lane=Number(data.lane);if(!Number.isInteger(lane)||lane<0||lane>2)throw Error('Escolha uma posição de 1 a 3.');
          const requestedSide=room.players.find(seat=>seat.id===data.targetSide);
          const targetSide=requestedSide||((kind==='enemy'||kind==='enemy-board')?other(room,p.id):p);
          if(p.prepared.some(item=>item.targetSide===targetSide.id&&item.lane===lane))throw Error('Você já colocou uma magia nessa posição desse lado.');
          if(effect(card)?.op==='barrier'&&targetSide!==p)throw Error('Barreira deve ocupar uma posição aliada.');const paid=paidCost(p,card,'lane');p.hand=p.hand.filter(c=>c!==card);p.prepared.push({card,paidRound:room.round,paid,targetSide:targetSide.id,lane,hidden:targetSide.id!==p.id});
          pushLog(room,`${p.name} colocou uma magia ${targetSide.id===p.id?'aberta em sua':'oculta na'} posição ${lane+1}.`,p.id);
        }else throw Error('Modo de magia inválido.');
      }
    }else if(data.type==='emanate'){
      const card=findCreature(p,data.cardId);if(!card)throw Error('Escolha uma criatura sua em campo.');
      const leaving=p.emanation.includes(card.uid);
      if(card.anchor)throw Error('A criatura está ancorada até o próximo combate.');
      if(leaving&&reserveSize(p)>=8)throw Error('Reserva cheia: retire uma criatura antes de voltar da Emanação.');
      if(!leaving&&(!effects(card).some(ef=>String(ef.timing).includes('emanat'))||p.emanation.length>=2))throw Error('Esta criatura não pode ocupar Emanação ou as duas vagas estão ocupadas.');
      if(p.mana<1)throw Error('Mover entre reserva e Emanação custa 1 mana.');p.mana--;
      p.emanation=leaving?p.emanation.filter(uid=>uid!==card.uid):[...p.emanation,card.uid];
      pushLog(room,`${card.name} ${leaving?'voltou à reserva':'entrou em Emanação'} por 1 mana.`,p.id);
      emit(room,'creature',{playerId:p.id,cardId:card.uid,name:card.name,zone:leaving?'reserve':'emana',speech:card.speech||'Estou a postos.'});
    }else if(data.type==='endPrep'){
      const clerics=p.emanation.filter(uid=>effects(p.reserve.find(c=>c.uid===uid)).some(e=>e.op==='heal'&&String(e.timing).includes('emanat')));
      const healingCost=clerics.reduce((sum,uid,index)=>{const c=findCreature(p,uid),ef=effects(c).find(e=>e.op==='heal'&&String(e.timing).includes('emanat')),t=findCreature(p,data.healTargetIds?.[index]||data.healTargetId);return sum+(t?.damage>0&&(!ef.exclude_self||t.uid!==uid)?ef.mana_cost||0:0);},0);if(p.mana<healingCost)throw Error('Mana insuficiente para as curas escolhidas. Cancele uma cura ou preserve a mana.');
      clerics.forEach((uid,index)=>{
        const cleric=findCreature(p,uid),ef=effects(cleric).find(ef=>ef.op==='heal'&&String(ef.timing).includes('emanat')),target=findCreature(p,data.healTargetIds?.[index]||data.healTargetId),cost=ef?.mana_cost||0;
        if(!target||target.damage<=0||(ef?.exclude_self&&target.uid===uid)||p.mana<cost)return;
        p.mana-=cost;target.damage=Math.max(0,target.damage-(ef.amount||1));
        emit(room,'cleric_heal',{playerId:p.id,sourceId:uid,targetId:target.uid,amount:ef.amount||1,mana:cost,healthUpdates:[{uid:target.uid,hp:target.health-target.damage,maxHp:target.health}]});
      });
      room.preparationsDone=(room.preparationsDone||0)+1;
      if(room.preparationsDone===1){startPrep(room,other(room,p.id));}
      else if(room.preparationsDone===2){room.phase='vote';room.turn=null;pushLog(room,`Preparações concluídas. Cada jogador decide se haverá combate.`);}
      else throw Error('As preparações desta rodada já terminaram.');
    }else throw Error('Ação indisponível na preparação.');
    room.revision++;return;
  }
  if(room.phase==='vote'&&data.type==='vote'){
    if(p.vote!==null)throw Error('Voto já confirmado.');p.vote=Boolean(data.fight);
    if(p.vote){room.phase='formation';pushLog(room,`${p.name} iniciou o combate. Distribuam as criaturas em segredo.`,p.id);}
    else if(room.players.every(x=>x.vote===false)){pushLog(room,'Ambos recusaram combate.');finishRound(room);}
    room.revision++;return;
  }
  if(room.phase==='formation'){
    if(p.ready)throw Error('Formação já confirmada.');
    if(data.type==='assign'){
      const lane=Number(data.lane);if(!Number.isInteger(lane)||lane<0||lane>2)throw Error('Posição inválida.');
      const occupant=findCreature(p,p.formation[lane]);const requested=findCreature(p,data.cardId);if((occupant?.anchor&&occupant.uid!==data.cardId)||(requested?.anchor&&requested.anchor.lane!==lane))throw Error('A criatura está ancorada nesta posição até o próximo combate.');
      if(data.cardId!==null){const card=findCreature(p,data.cardId);if(!card||p.emanation.includes(card.uid))throw Error('Escolha uma criatura válida da reserva.');p.formation=p.formation.map(uid=>uid===card.uid?null:uid);p.formation[lane]=card.uid;if(Number.isInteger(p.taunts?.[card.uid])&&Math.abs(p.taunts[card.uid]-lane)!==1)delete p.taunts[card.uid];}else{const uid=p.formation[lane];p.formation[lane]=null;if(p.taunts)delete p.taunts[uid];}
    }else if(data.type==='taunt'){
      const card=findCreature(p,data.cardId),lane=Number(data.lane),ownLane=p.formation.indexOf(data.cardId);
      if(!card||!effects(card).some(e=>e.op==='taunt')||ownLane<0||!Number.isInteger(lane)||lane<0||lane>2||Math.abs(lane-ownLane)!==1)throw Error('Provocar exige uma posição adjacente à sua posição.');
      if(Object.entries(p.taunts||{}).some(([uid,value])=>uid!==card.uid&&value===lane&&p.formation.includes(uid)))throw Error('Outra criatura já provoca essa posição.');
      (p.taunts??={})[card.uid]=lane;
    }else if(data.type==='ready'){
      if(room.players.some(x=>x.pendingDiscard))throw Error('Aguarde a escolha de descarte.');if(p.formation.some(uid=>uid&&effects(findCreature(p,uid)).some(e=>e.op==='taunt')&&(!Number.isInteger(p.taunts?.[uid])||Math.abs(p.taunts[uid]-p.formation.indexOf(uid))!==1)))throw Error('Escolha a posição adicional de cada criatura com Provocar.');p.ready=true;pushLog(room,`${p.name} confirmou a formação.`,p.id);if(room.players.every(x=>x.ready))beginCombat(room);}
    else throw Error('Ação indisponível na formação.');room.revision++;return;
  }
  throw Error('Ação fora de fase.');
}

export function view(room,p){
  const reveal=room.phase==='finished'||room.phase==='resolving';
  return {laneBonuses:reveal?room.laneBonuses||{}:{},code:room.code,inviteToken:room.inviteToken,phase:room.phase,round:room.round,turn:room.turn,first:room.first,coinWinner:room.coinWinner,winner:room.winner,you:p.id,spectator:room.spectators.includes(p),spectators:room.spectators.map(x=>({id:x.id,name:x.name})),revision:room.revision,serverNow:Date.now(),recording:room.recording||null,events:room.events.slice(-20),log:room.log,lastCombat:room.lastCombat||null,combat:room.phase==='resolving'?room.combat:null,players:room.players.map(seat=>({
     id:seat.id,name:seat.name,bot:seat.bot,deckId:seat.deckId,patron:seat.patron,deckCount:seat.deck?.length||0,handCount:seat.hand?.length||0,discardCount:seat.discard?.length||0,discard:seat.discard||[],mana:seat.mana,manaMax:seat.manaMax,fatigue:seat.fatigue,pendingDiscard:seat.id===p.id?seat.pendingDiscard||0:0,mulligansLeft:seat.id===p.id?seat.mulligansLeft:undefined,mulliganReady:seat.mulliganReady,hand:seat.id===p.id?seat.hand:undefined,
    reserve:seat.reserve?.map(c=>({...c,effectiveAttack:attack(c,room,seat.id===p.id||reveal?seat.formation.indexOf(c.uid):-1),owner:seat.id})),emanation:seat.emanation||[],
    taunts:seat.id===p.id||reveal?seat.taunts||{}:{},formation:seat.id===p.id||reveal?seat.formation:[null,null,null],ready:seat.ready,voted:seat.vote!==null,
    prepared:room.players.flatMap(caster=>caster.prepared.filter(item=>item.targetSide===seat.id).map(item=>({lane:item.lane,caster:caster.id,refund:caster.id===p.id&&item.paidRound===room.round&&room.phase==='prep'&&room.turn===p.id?Math.min(item.paid||0,Math.max(0,caster.manaMax-caster.mana)):0,card:reveal||caster.id===p.id||!item.hidden?item.card:null,hidden:!reveal&&caster.id!==p.id&&item.hidden})))
  }))};
}

export function easyBotAction(room){
  const bot=room.players.find(p=>p.bot);if(!bot)return null;
  if(room.phase==='lobby')return bot.deckId?null:{type:'deck',deckId:bot.botDeckId};
  if(room.phase==='coin')return null;
  if(room.phase==='mulligan'){
    if(bot.mulliganReady)return null;
    const expensive=bot.hand.filter(card=>card.cost>=5).slice(0,2);
    return bot.mulligansLeft&&expensive.length?{type:'mulligan',cardIds:expensive.map(card=>card.uid)}:{type:'confirmMulligan'};
  }
  if(bot.pendingDiscard&&bot.hand.length)return {type:'discard',cardId:[...bot.hand].sort((a,b)=>b.cost-a.cost)[0].uid};
  if(room.phase==='prep'){
    if(room.turn!==bot.id)return null;
    const creatures=bot.hand.filter(card=>card.type==='creature'&&card.cost<=bot.mana&&reserveSize(bot)<8).sort((a,b)=>a.cost-b.cost);
    if(creatures.length)return {type:'play',cardId:creatures[0].uid};
    const enemy=other(room,bot.id);
    for(const spell of bot.hand.filter(card=>card.type!=='creature'&&card.cost<=bot.mana).sort((a,b)=>a.cost-b.cost)){
      const kind=targetKind(spell),op=effect(spell)?.op;if(spell.positionOnly){const side=op==='anchor'?enemy:bot;const lane=[0,1,2].find(l=>!bot.prepared.some(x=>x.targetSide===side.id&&x.lane===l));if(lane!==undefined)return {type:'play',cardId:spell.uid,mode:'lane',lane,targetSide:side.id};continue;}
      if(kind==='self')return {type:'play',cardId:spell.uid,mode:'direct'};
      if(kind==='enemy-board'&&enemy.reserve.some(alive))return {type:'play',cardId:spell.uid,mode:'direct'};
      if(kind==='enemy'&&enemy.reserve.some(alive)){const target=[...enemy.reserve].filter(alive).sort((a,b)=>(a.health-a.damage)-(b.health-b.damage))[0];return {type:'play',cardId:spell.uid,mode:'direct',targetId:target.uid};}
      if(kind==='friendly-or-patron'&&(bot.patron.hp<=16||bot.reserve.some(c=>alive(c)&&c.damage>0)))return {type:'play',cardId:spell.uid,mode:'direct',targetId:bot.patron.hp<=16?'patron':bot.reserve.find(c=>alive(c)&&c.damage>0).uid};
      if(kind==='friendly'){const target=op==='heal'?bot.reserve.find(c=>alive(c)&&c.damage>0):bot.reserve.find(alive);if(target)return {type:'play',cardId:spell.uid,mode:'direct',targetId:target.uid};}
    }
    return {type:'endPrep'};
  }
  if(room.phase==='vote')return bot.vote===null?{type:'vote',fight:bot.reserve.some(c=>alive(c)&&!bot.emanation.includes(c.uid))}:null;
  if(room.phase==='formation'){
    if(bot.ready)return null;
    const unused=bot.reserve.filter(c=>alive(c)&&!bot.emanation.includes(c.uid)&&!bot.formation.includes(c.uid)).sort((a,b)=>b.attack-a.attack);
    const open=bot.formation.findIndex(uid=>!uid);
    const taunter=bot.formation.map(uid=>findCreature(bot,uid)).find(c=>c&&effects(c).some(e=>e.op==='taunt')&&!Number.isInteger(bot.taunts?.[c.uid]));if(taunter){const lane=[0,1,2].find(l=>Math.abs(l-bot.formation.indexOf(taunter.uid))===1&&!Object.values(bot.taunts||{}).includes(l));if(lane!==undefined)return {type:'taunt',cardId:taunter.uid,lane};}
    return open>=0&&unused.length?{type:'assign',lane:open,cardId:unused[0].uid}:{type:'ready'};
  }
  return null;
}
