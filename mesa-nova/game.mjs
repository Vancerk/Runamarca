import {syncMusic,musicView} from './music-director.mjs';
import {handBuffView,combatHandBuffView,insertHandBuffSteps} from './hand-buff-presentation.mjs';
import {silenceCreature} from './silence-effects.mjs';
import {syncTurnClock,mulliganClock} from './turn-clock.mjs';
import {grantPermanentStats,recordPermanentGains,preventControl,statGain,grantedEffects,receiveDamage,grantKeyword,syncKeywordAuras,keywordPresentation} from './forja-variant.mjs';
import {awaitForge,chooseForge,equipWeapon,releaseEquipment,absorbPatronDamage} from './equipment.mjs';
import {initStudies,seeStudyCard,settleStudyOpening,studyCardCost,studyPrepared,localSpell,rememberPositionSpell,existingPositionSpells,activateStudies,consumeStudyCopy,finishStudyBook,studyView,adjacentLane,previewStudyBook} from './fluxo-studies.mjs';
import {activatePatronPower} from './patron-powers.mjs';
import {tribalBonus,syncTribalHealth,enteredCreature,summonRuptura,blockedSummons,retaliation,releaseForced,ruptureFormationAction} from './ruptura-effects.mjs';
import {randomBytes, randomUUID} from 'node:crypto';
import {beginMatch} from '../accounts.mjs';
import {resolveDirectedCombat} from './combat-effects.mjs';
import {spellBuff,retainAnchors,curseFromDamage,finishFields,healthAuras,revealSeals,pruneSeals} from './fluxo-effects.mjs';
import {tauntLanes,applyProtocol,clearProtocolHealth,activateMirage} from './forja-effects.mjs';

export const PATRON_STARTING_HEALTH = 20;
export const code = () => randomBytes(3).toString('hex').toUpperCase();
export const token = () => randomBytes(24).toString('hex');
const shuffle = array => { for(let i=array.length-1;i>0;i--){const j=randomBytes(4).readUInt32BE(0)%(i+1);[array[i],array[j]]=[array[j],array[i]];}return array; };
const other = (room,id) => room.players.find(p=>p.id!==id);
const own = (room,id) => room.players.find(p=>p.id===id);
const effects = card => [...(Array.isArray(card?.effects)?card.effects:card?.effects?[card.effects]:[]),...(card?.equipment?.effects||[]),...grantedEffects(card)];
const effect = card => effects(card)[0] || null;
const pushLog = (room,message,actor=room.turn) => {room.log.push({message,round:room.round,turn:room.turn,actor,phase:room.phase});if(room.log.length>10)room.log.shift();};
const emit = (room,type,details={}) => {room.events??=[];room.events.push({id:++room.eventId,type,at:Date.now(),...details});if(room.events.length>128)room.events.shift();};
const alive = card => card && card.damage < card.health;
const reserveSize = p => p.reserve.filter(c=>alive(c)&&!p.emanation.includes(c.uid)).length;
const auraApplies=(e,card,lane)=>e.lane===lane&&(!e.subtypeIncludes||String(card?.subtype||'').toLowerCase().includes(e.subtypeIncludes.toLowerCase()));
const attack = (card,room,lane) => {
  if(!card||card.sleep)return 0;
  let value=card.attack+statGain(card,card.equipment?.attack||0)+(card.attackMod||0)+statGain(card,room.laneBonuses?.[card.owner]?.[lane]||0);
  if(card.damage>0)value+=card.equipment?.woundedBonus||0;
  if(card.damage>0)value+=effects(card).filter(e=>e.op==='wounded_attack').reduce((sum,e)=>sum+e.amount,0);
  const p=own(room,card.owner);
  if(p&&lane===0)value+=p.emanation.filter(uid=>{const c=p.reserve.find(c=>c.uid===uid);return c?.modelId==='R05'&&!c.silenced;}).length;
  if(p)value+=statGain(card,p.emanation.flatMap(uid=>effects(p.reserve.find(c=>c.uid===uid))).filter(e=>e.op==='lane_attack_aura'&&auraApplies(e,card,lane)).reduce((sum,e)=>sum+e.amount,0));
  value+=p?tribalBonus(p,card):0;
  if(p&&p.patron.hp<p.patron.maxHp/2)value+=effects(card).filter(e=>e.op==='low_patron_attack').reduce((n,e)=>n+e.amount,0);
  return Math.max(0,value);
};
const laneCard = (room,ownerId,lane) => own(room,ownerId).formation[lane] ? own(room,ownerId).reserve.find(c=>c.uid===own(room,ownerId).formation[lane]) : null;
const findCreature = (p,uid) => p.reserve.find(c=>c.uid===uid && alive(c));
const pIsCombat=(room,c)=>own(room,c.owner).formation.includes(c.uid);
function putToSleep(room,target,prepared=false){
  const p=own(room,target.owner),lane=p.formation.indexOf(target.uid);
  if(lane<0)throw Error('Adormecer exige uma criatura em uma posição de combate.');
  target.sleep={lane,remaining:2,setAt:room.combatCount||0};
}
function returnToHand(room,target,casterId){
  const p=own(room,target.owner),oldUid=target.uid,model=p.deckData?.cards.find(c=>c.id===target.modelId),base=target.baseStats||model;
  if(!base)throw Error('Atributos originais da criatura não encontrados.');
  const retain=casterId!==target.owner&&Boolean(casterId)&&!target.persistentReturnUsed&&effects(target).some(e=>e.op==='retain_buffs_on_return');
  const gains=retain?{...(target.permanentGains||{attack:0,health:0})}:{attack:0,health:0};
  if(retain)target.persistentReturnUsed=true;
  releaseEquipment(room,p,target,{emit,pushLog});delete target.extraLife;
  p.reserve=p.reserve.filter(c=>c!==target);p.emanation=p.emanation.filter(uid=>uid!==oldUid);p.formation=p.formation.map(uid=>uid===oldUid?null:uid);delete p.taunts[oldUid];
  if(p.hand.length>=9){clearTemporaryHealth(target);p.discard.push(target);emit(room,'burn',{playerId:p.id,name:target.name});pushLog(room,`${target.name} foi para o Nartvanyr: mão cheia.`,p.id);return;}
  Object.assign(target,{uid:randomUUID(),attack:base.attack+gains.attack,health:base.health+gains.health,cost:base.cost,damage:0,attackMod:0});
  for(const key of ['anchor','sleep','sleepUntilCombat','spellBuff','temporaryHealth','temporaryDamageBefore','protocolMode','monkMode','protocolHealth','protocolDamageBefore','temporaryTrample','grantedTrample','cursedTargets','curseArmed','tribalHealth','forcedBy','forcedLane','revealPaid','revealPaymentRound','blockedSummonUsed','grantedKeywords','auraKeywords','auraLane','volatileProject','firstDamageTaken','corruption','corruptionTarget','eyeSkipCombat','eyeCooldown','sealChoices','apprenticePreparation','apprenticeSpellUsed','apprenticeTargetId','attackBarrier','runeCoating','permanentGains'])delete target[key];
  if(target.silenceOriginalRules){target.effects=structuredClone(target.silenceOriginalRules.effects);target.text=target.silenceOriginalRules.text;delete target.silenceOriginalRules;delete target.silenced;}
  if(retain)target.permanentGains=gains;
  p.hand.push(target);emit(room,'return',{playerId:p.id,cardId:oldUid,returnedId:target.uid,name:target.name});pushLog(room,`${target.name} voltou à mão de ${p.name}.`,p.id);
}

function freshPlayer(name){return {id:randomUUID(),token:token(),name:cleanName(name),bot:false,deckId:null,art:{},patron:null,deck:[],hand:[],reserve:[],discard:[],manaMax:0,mana:0,fatigue:0,formation:[null,null,null],taunts:{},emanation:[],directPlayed:false,discountUsed:false,prepared:[],vote:null,ready:false,mulligansLeft:0,mulliganReady:false};}
export function makeRoom(roomCode,name,role='player'){
  const player=freshPlayer(name);
  return {code:roomCode,inviteToken:token(),players:role==='spectator'?[]:[player],spectators:role==='spectator'?[player]:[],phase:'lobby',round:1,turn:null,first:null,coinWinner:null,winner:null,log:[],events:[],eventId:0,revision:0};
}
export function cleanName(value){return String(value||'').trim().slice(0,30)||'Caçador';}
export function join(room,name,role='player'){if(!['player','spectator'].includes(role))throw Error('Papel inválido.');if(role==='player'&&(room.players.length>=2||room.phase!=='lobby'))throw Error('As vagas de jogador estão ocupadas. Entre na arquibancada.');const p=freshPlayer(name);(role==='spectator'?room.spectators:room.players).push(p);pushLog(room,`${p.name} entrou ${role==='spectator'?'na arquibancada':'na sala'}.`,p.id);room.revision++;return p;}
export function findPlayer(room,secret){return [...room.players,...room.spectators].find(p=>p.token===secret);}
function draw(room,p,n=1,silent=false,deferWin=false){for(let i=0;i<n;i++){if(room.phase==='finished'||p.patron.hp<=0)break;if(p.deck.length){const card=p.deck.pop();if(room.phase!=='mulligan'||silent)seeStudyCard(p,card);if(p.hand.length>=9){p.discard.push(card);pushLog(room,`${p.name} queimou ${card.name}: mão cheia (9).`,p.id);if(!silent)emit(room,'burn',{playerId:p.id,name:card.name});}else{p.hand.push(card);if(!silent)emit(room,'draw',{playerId:p.id,cardId:card.uid});}}else{p.fatigue=p.fatigue?Math.min(Number.MAX_SAFE_INTEGER,p.fatigue*2):1;absorbPatronDamage(p,p.fatigue);pushLog(room,`${p.name} sofreu ${p.fatigue} de fadiga.`,p.id);emit(room,'fatigue',{playerId:p.id,amount:p.fatigue});if(!deferWin)checkWin(room);}}}
function startPrep(room,p){if(awaitForge(room,p,{emit,pushLog}))return;room.phase='prep';room.turn=p.id;p.manaMax=Math.min(10,p.manaMax+1);p.mana=p.manaMax;p.directPlayed=false;p.discountUsed=false;p.preparationSerial=(p.preparationSerial||0)+1;p.vote=null;p.ready=false;retainAnchors(p);p.taunts={};emit(room,'turn',{playerId:p.id,round:room.round});draw(room,p);pushLog(room,`Preparação de ${p.name}: ${p.mana}/${p.manaMax} mana e uma compra.`,p.id);syncTurnClock(room,expireTurn);}
const patronPortrait={ruptura:'patrons/dom-maioral.png',fluxo:'patrons/olho-dos-pactos-novo.png',forja:'patrons/bigorna-desperta-nova.png'};
function startMatch(room,first){room.forceWindow=null;beginMatch(room);room.first=first;room.phase='mulligan';room.mulliganPresentationEndsAt=Date.now()+90_000;room.round=1;room.preparationsDone=0;room.combatCount=0;room.laneBonuses={};room.lastCombat=null;room.combat=null;room.seals=[];emit(room,'first',{playerId:first});for(const p of room.players){const deck=p.deckData;const art=id=>typeof p.art[id]==='string'?{image:p.art[id],kind:'illustration'}:p.art[id]||{image:null,kind:null};p.patron={returnStyle:deck.patron.returnStyle||null,powers:structuredClone(deck.patron.powers||[]),usedPowers:{},name:deck.patron.name,hp:PATRON_STARTING_HEALTH,maxHp:PATRON_STARTING_HEALTH,affinity:deck.affinity,image:art(deck.patron.id).image||patronPortrait[deck.affinity]};p.deck=shuffle(deck.cards.flatMap(model=>Array.from({length:model.quantity},()=>({...structuredClone(model),uid:randomUUID(),modelId:model.id,baseStats:{attack:model.attack,health:model.health,cost:model.cost},owner:p.id,damage:0,attackMod:0,speech:art(model.id).speech??model.speech,narrative:art(model.id).narrative??model.narrative,image:art(model.id).image||model.image||null,imageKind:art(model.id).kind||'illustration',artZoom:art(model.id).artZoom??model.artZoom??100,artX:art(model.id).artX??model.artX??50,artY:art(model.id).artY??model.artY??0}))));initStudies(p);p.pendingDiscard=0;delete p.pendingCombatAttack;p.hand=[];p.reserve=[];p.weapons=[];delete p.forge;p.discard=[];p.mana=p.manaMax=p.fatigue=0;p.prepared=[];p.emanation=[];p.formation=[null,null,null];p.vote=null;p.ready=false;p.mulligansLeft=1;p.mulliganReady=false;p.mulliganStartedAt=null;draw(room,p,5,true);emit(room,'opening',{playerId:p.id,count:5,cardIds:p.hand.map(c=>c.uid)});}}
function checkWin(room){if(room.phase==='finished')return;const down=room.players.filter(p=>p.patron?.hp<=0);if(!down.length)return;room.phase='finished';room.turn=null;room.winner=down.length===2?null:other(room,down[0].id).id;pushLog(room,down.length===2?'Empate: ambos os Patronos caíram.':`${other(room,down[0].id).name} venceu.`);}
function resetToLobby(room){room.forceWindow=null;for(const seat of room.players){delete seat.study;delete seat.studyBook;delete seat.studyPreview;delete seat.originalDeck;seat.deckId=null;seat.deckData=null;seat.art={};seat.patron=null;seat.hand=[];seat.deck=[];seat.reserve=[];seat.weapons=[];delete seat.forge;seat.discard=[];seat.prepared=[];seat.pendingDiscard=0;delete seat.pendingCombatAttack;seat.emanation=[];seat.mulligansLeft=0;seat.mulliganReady=false;}room.phase='lobby';room.winner=room.coinWinner=room.first=room.turn=null;room.lastCombat=room.combat=null;room.round=1;room.preparationsDone=room.combatCount=0;room.laneBonuses={};room.seals=[];room.events=[];delete room.matchId;delete room.matchPlayers;delete room.matchWager;delete room.recording;for(const seat of room.players){seat.formation=[null,null,null];seat.taunts={};seat.mana=seat.manaMax=seat.fatigue=0;seat.vote=null;seat.ready=seat.directPlayed=seat.discountUsed=false;delete seat.pendingDiscardAfterCombat;}}
function clearTemporaryHealth(card,dead=false){if(card.temporaryHealth){card.health-=card.temporaryHealth;card.damage=Math.max(dead?card.health:0,card.damage-Math.min(card.temporaryHealth,Math.max(0,card.damage-(card.temporaryDamageBefore||0))));delete card.temporaryHealth;delete card.temporaryDamageBefore;}}
function buffHandOnDeath(room,p,source){
 for(const e of effects(source).filter(e=>e.op==='death_hand_stat_buff')){
  const targets=p.hand.filter(c=>c.type==='creature');
  const changes=targets.map(card=>{const attackBefore=card.attack,healthBefore=card.health;grantPermanentStats(card,e.attack,e.health);return {uid:card.uid,attack:card.attack-attackBefore,health:card.health-healthBefore};});
  const buff={type:'hand_buff',buffId:[room.matchId||room.code,(room.handBuffSerial=(room.handBuffSerial||0)+1)].join(':'),sourceId:source.uid,playerId:p.id,sourceName:source.name,count:targets.length,attack:e.attack,health:e.health,targets:changes};
  if(room.collectPreview)(room.handBuffs??=[]).push(buff);else emit(room,'hand_buff',buff);
  emit(room,'ability_notice',{playerId:p.id,sourceId:source.uid,message:source.name+': Último Suspiro fortaleceu '+targets.length+' criatura(s) na mão.'});
  pushLog(room,source.name+' fortaleceu as criaturas na mão de '+p.name+'.',p.id);
 }
}
function removeDead(room){syncTribalHealth(room);for(const p of room.players){const dead=p.reserve.filter(c=>!alive(c));for(const c of dead){buffHandOnDeath(room,p,c);releaseEquipment(room,own(room,c.teleportHome?.owner)||p,c,{emit,pushLog});for(const e of effects(c).filter(e=>e.op==='death_patron_damage')){const enemy=other(room,p.id);absorbPatronDamage(enemy,e.amount);const burst={sourceId:c.uid,card:structuredClone(c),playerId:p.id,targetPatronId:enemy.id,amount:e.amount,healthUpdates:[{patronId:enemy.id,hp:enemy.patron.hp,maxHp:enemy.patron.maxHp,extraLife:enemy.patron.extraLife||0}]};(room.deathBursts??=[]).push(burst);if(!room.collectPreview)emit(room,'death_burst',burst);emit(room,'ability_notice',{playerId:p.id,sourceId:c.uid,message:`${c.name}: Último Suspiro causou ${e.amount} ao Patrono inimigo.`});}releaseForced(room,c.uid,false);clearProtocolHealth(c);clearTemporaryHealth(c,true);c.health-=c.tribalHealth||0;delete c.tribalHealth;delete c.temporaryTrample;c.attackMod=0;for(const key of ['anchor','sleep','sleepUntilCombat','curseArmed'])delete c[key];if(c.spellBuff!=='permanent')delete c.spellBuff;delete p.taunts?.[c.uid];p.discard.push(c);p.formation=p.formation.map(uid=>uid===c.uid?null:uid);p.emanation=p.emanation.filter(uid=>uid!==c.uid);pushLog(room,`${c.name} foi derrotada.`,p.id);}p.reserve=p.reserve.filter(alive);}syncTribalHealth(room);if(room.players.some(p=>p.reserve.some(c=>!alive(c))))removeDead(room);syncKeywordAuras(room);pruneSeals(room);}
function applyDamage(room,card,amount){if(card&&amount>0){const next=receiveDamage(card,amount);if(!next.volatileProject)delete card.volatileProject;Object.assign(card,next);}}
function applyEffect(room,caster,spell,target,phase){
  for(const ef of effects(spell)){
    if(room.phase==='finished')break;
    if(ef.op==='heal_patron'){caster.patron.hp=Math.min(caster.patron.maxHp,caster.patron.hp+ef.amount);continue;}
    if(ef.op==='draw'){draw(room,caster,ef.amount);continue;}
    if(ef.op==='tradition_summon'){const count=ef.amount+(ef.scaling==='none'?0:caster.discard.filter(c=>(c.modelId||c.id)===(spell.modelId||spell.id)&&c.uid!==spell.uid).length);for(let i=0;i<count;i++)summonRuptura(room,caster,{...ef,modelId:spell.id+'-token',image:spell.image},{emit,pushLog,attack});continue;}
    if(ef.op==='combat_area_attack'){caster.pendingCombatAttack=(caster.pendingCombatAttack||0)+ef.amount;continue;}
    if(ef.op==='discard'){caster.pendingDiscard=Math.min(caster.hand.length,(caster.pendingDiscard||0)+ef.amount);continue;}
    if(ef.op==='graveyard_stat_buff'){const spells=caster.discard.filter(c=>c.uid!==spell.uid&&['spell','direct_spell','prepared_spell','rune'].includes(c.type)).length,count=Math.floor(spells/(ef.divisor||1));for(const c of caster.reserve.filter(alive)){grantPermanentStats(c,ef.attack*count,ef.health*count);if(count)spellBuff(c,room.round,true);}continue;}
    if(ef.op==='area_stat_buff'){for(const c of caster.reserve.filter(alive)){grantPermanentStats(c,ef.attack,ef.health);spellBuff(c,room.round,true);}continue;}
    if(ef.op==='summon'){for(let i=0;i<ef.amount&&reserveSize(caster)<8;i++){const creature={uid:randomUUID(),modelId:`${spell.id}-token`,owner:caster.id,name:ef.name||'Aliado Convocado',type:'creature',rarity:'lacaio',affinity:caster.patron.affinity,cost:0,attack:ef.attack??1,health:ef.health??1,damage:0,attackMod:0,text:'Criatura convocada.',effects:[],token:true,baseStats:{attack:ef.attack??1,health:ef.health??1,cost:0}};caster.reserve.push(creature);enteredCreature(room,caster,creature,{attack,emit,pushLog});emit(room,'summon',{playerId:caster.id,cardId:creature.uid,name:creature.name,zone:'reserve',speech:'Estou a postos!'});}continue;}
    if(ef.op==='area_attack_modifier'){const enemy=other(room,caster.id);let candidates=enemy.reserve.filter(c=>alive(c)&&!enemy.emanation.includes(c.uid)&&(!ef.reserve_only||!enemy.formation.includes(c.uid)));if(ef.random_count)candidates=shuffle([...candidates]).slice(0,ef.random_count);for(const c of candidates){c.attack=Math.max(0,c.attack+statGain(c,ef.amount));c.health+=ef.healthAmount||0;}continue;}
    if(ef.op==='area_damage'){for(const creature of other(room,caster.id).reserve)if(alive(creature)&&!other(room,caster.id).emanation.includes(creature.uid))applyDamage(room,creature,ef.direct_amount??ef.amount);continue;}
    if(ef.op==='choose_one'){const option=ef.options?.find(o=>target?.patron?o.target==='own_patron':o.target==='chosen_allied_creature');if(option){const amount=option.amount;if(target?.patron)caster.patron.hp=Math.min(caster.patron.maxHp,caster.patron.hp+amount);else if(target)target.damage=Math.max(0,target.damage-amount);}continue;}
    if(!target)continue;
    if(preventControl(target,caster.id,ef.op)){emit(room,'ability_notice',{playerId:target.owner,targetId:target.uid,message:target.name+': Revestimento Rúnico impediu o controle inimigo.'});continue;}
    if(ef.op==='silence'){for(const player of room.players)if(player.study)player.study.positionEffects=player.study.positionEffects.filter(entry=>entry.targetId!==target.uid);silenceCreature(room,target,{releaseEquipment,releaseForced,syncTribalHealth,syncKeywordAuras,pruneSeals,emit,pushLog});emit(room,'silence',{playerId:caster.id,targetId:target.uid,name:target.name,op:'defeat',healthUpdates:[{uid:target.uid,hp:Math.max(0,target.health-target.damage),maxHp:target.health,attack:attack(target,room,own(room,target.owner).formation.indexOf(target.uid))}]});pushLog(room,target.name+' foi silenciada.',caster.id);removeDead(room);checkWin(room);continue;}
    if(ef.op==='rune_coating'){grantPermanentStats(target,0,ef.health);target.runeCoating=true;spellBuff(target,room.round,true);continue;}
    if(ef.op==='volatile_project'){target.volatileProject=true;continue;}
    if(ef.op==='grant_keyword'){grantKeyword(target,ef.keyword);continue;}
    if(ef.op==='invert_stats'){const currentAttack=attack(target,room,own(room,target.owner).formation.indexOf(target.uid)),currentHealth=Math.max(0,target.health-target.damage);clearTemporaryHealth(target);clearProtocolHealth(target);target.health=currentAttack;target.damage=0;target.attack=currentHealth-attack({...target,attack:0},room,own(room,target.owner).formation.indexOf(target.uid));continue;}
    if(ef.op==='set_health'){clearTemporaryHealth(target);clearProtocolHealth(target);target.health=ef.amount;target.damage=0;continue;}
    if(ef.op==='return_to_hand'){returnToHand(room,target,caster.id);continue;}
    if(ef.op==='sleep'){putToSleep(room,target);continue;}
    if(ef.op==='heal'){target.damage=Math.max(0,target.damage-ef.amount);continue;}
    if(ef.op==='damage'&&target.patron){const side=own(room,target.owner)||caster;absorbPatronDamage(side,ef.amount);continue;}
    if(ef.op==='damage'){const previouslyAlive=alive(target);applyDamage(room,target,ef.amount);if(ef.draw_on_kill&&previouslyAlive&&!alive(target))draw(room,caster,ef.draw_on_kill);continue;}
    if(ef.op==='defeat'){target.damage=target.health;continue;}
    if(ef.op==='attack_modifier'){if(ef.permanent){const gain=statGain(target,ef.amount);target.attack=Math.max(0,target.attack+gain);recordPermanentGains(target,gain,ef.healthAmount);}else target.attackMod=(target.attackMod||0)+statGain(target,ef.amount);target.health+=ef.healthAmount||0;if(ef.amount>0)spellBuff(target,room.round);continue;}
    if(ef.op==='stat_buff'){grantPermanentStats(target,ef.attack,ef.health);spellBuff(target,room.round,true);if(ef.draw_attack_divisor){const lane=own(room,target.owner).formation.indexOf(target.uid);draw(room,caster,Math.floor(attack(target,room,lane)/ef.draw_attack_divisor));}continue;}
    if(ef.op==='conditional_damage'){const value=attack(target,room,phase?.lane||0)>=ef.condition.gte?ef.amount_if_true:ef.amount_if_false;applyDamage(room,target,value);}
  }
}
function projectSpellChange(card,change){if(change.damage>0){const next=receiveDamage(card,change.damage);return {...next,attack:Math.max(0,next.attack+change.statAttack),health:next.health+change.statHealth,attackMod:(next.attackMod||0)+change.attack,damage:change.defeat?next.health+change.statHealth:Math.max(0,next.damage-change.heal)};}const absorbed=Math.min(card.extraLife||0,Math.max(0,change.damage));return {...card,extraLife:Math.max(0,(card.extraLife||0)-absorbed),attack:Math.max(0,card.attack+change.statAttack),health:card.health+change.statHealth,attackMod:(card.attackMod||0)+change.attack,damage:change.defeat?card.health+change.statHealth:Math.max(0,card.damage+change.damage-absorbed-change.heal)};}
function targetKind(spell){const ef=effect(spell);if(ef?.target==='any_creature')return 'any-creature';if(ef?.target==='chosen_allied_creature')return 'friendly';if(ef?.target==='any')return 'any';if(['draw','area_stat_buff','graveyard_stat_buff','tradition_summon','combat_area_attack'].includes(ef?.op))return 'self';if(['area_damage','area_attack_modifier'].includes(ef?.op))return 'enemy-board';if(ef?.op==='choose_one')return 'friendly-or-patron';if(['heal','attack_modifier','stat_buff','barrier'].includes(ef?.op)&&ef?.target==='chosen_allied_creature')return 'friendly';return 'enemy';}
function validatePreparedSide(room,p,card,side){
  if(!side)throw Error('Lado da posição inválido.');
  const kind=targetKind(card),neutral=effect(card)?.op==='anchor';
  if(card.enemyOnly||!neutral&&['enemy','enemy-board'].includes(kind)){if(side.id===p.id)throw Error('Esta magia exige uma posição inimiga.');}
  else if(!neutral&&side.id!==p.id)throw Error('Esta magia exige uma posição aliada.');
}
function validTarget(room,p,spell,targetId){const kind=targetKind(spell);if(kind==='any-creature'){const target=room.players.flatMap(s=>s.reserve).find(c=>c.uid===targetId&&alive(c));if(!target)throw Error('Escolha uma criatura viva.');return {kind,target};}if(kind==='any'){const side=room.players.find(s=>targetId==='patron:'+s.id);if(side)return {kind,target:{patron:true,owner:side.id}};const target=room.players.flatMap(s=>s.reserve).find(c=>c.uid===targetId&&alive(c));if(!target)throw Error('Escolha uma criatura ou um Patrono como alvo.');return {kind,target};}if(kind==='self'||kind==='enemy-board')return {kind,target:null};if(kind==='friendly-or-patron'&&targetId==='patron')return {kind,target:{patron:true}};const side=kind==='enemy'?other(room,p.id):p;const target=findCreature(side,targetId);if(!target||spell.reserveOnly&&side.emanation.includes(target.uid))throw Error('Escolha uma criatura viva do lado correto, fora da Emanação.');const minimum=effect(spell)?.min_attack;if(Number.isFinite(minimum)&&attack(target,room,-1)<minimum)throw Error('Escolha uma criatura com '+minimum+' ou mais de ataque.');return {kind,target};}
function pendingApprentices(room,p){
  const enemy=other(room,p.id);if(!enemy?.reserve.some(alive))return [];
  return p.reserve.filter(c=>alive(c)&&effects(c).some(e=>e.op==='bound_spell_damage')&&!c.apprenticeSpellUsed&&!findCreature(enemy,c.apprenticeTargetId));
}
function apprenticeSpell(room,p){
  if(room.phase==='finished')return;
  const enemy=other(room,p.id);
  // Each apprentice fires at its existing mark; a kill never redirects another
  // shot automatically. New marks are chosen by the owner before the next action.
  for(const source of p.reserve.filter(c=>alive(c)&&effects(c).some(e=>e.op==='bound_spell_damage')&&!c.apprenticeSpellUsed)){
    const target=findCreature(enemy,source.apprenticeTargetId);if(!target)continue;
    const amount=effects(source).find(e=>e.op==='bound_spell_damage').amount||1;
    const beforeHealth=Math.max(0,target.health-target.damage);if(effects(source).some(e=>e.op==='bound_spell_damage'&&e.once_per_field))source.apprenticeSpellUsed=true;applyDamage(room,target,amount);
    emit(room,'apprentice_damage',{playerId:p.id,sourceId:source.uid,targetId:target.uid,targetModel:target.modelId,name:source.name,amount,damageDealt:Math.max(0,beforeHealth-Math.max(0,target.health-target.damage)),killed:!alive(target),op:'damage',healthUpdates:[{uid:target.uid,hp:Math.max(0,target.health-target.damage),maxHp:target.health,extraLife:target.extraLife||0,attack:attack(target,room,enemy.formation.indexOf(target.uid))}]});
    pushLog(room,`${source.name} causou ${amount} de dano ao alvo ${target.name}.`,p.id);
  }
  removeDead(room);checkWin(room);
}
function paidCost(p,card,mode='direct'){let cost=studyCardCost(p,card);if(p.studyBook?.instantIds.includes(card.uid))return 0;const sources=p.emanation.filter(uid=>p.reserve.find(c=>c.uid===uid)?.modelId==='M04').length;const discount=mode==='direct'&&card.type!=='creature'&&card.type!=='equipment'&&sources>0&&!p.discountUsed&&!p.directPlayed;if(discount)cost=Math.max(Math.min(1,cost),cost-sources);if(p.mana<cost)throw Error(`Mana insuficiente: precisa de ${cost}.`);p.mana-=cost;if(discount)p.discountUsed=true;return cost;}
function startForceWindow(room){const owners=room.players.filter(p=>p.reserve.some(c=>alive(c)&&!c.sleep&&!p.emanation.includes(c.uid)&&effects(c).some(e=>e.op==='force_opponent'))).map(p=>p.id);room.forceWindow=owners.length?{until:Date.now()+5000,owners}:null;if(room.forceWindow){const window=room.forceWindow;setTimeout(()=>{if(room.forceWindow===window&&room.phase==='formation'){room.revision++;room.onChange?.();}},5005);}}
function forceWindowActive(room){return room.forceWindow&&Date.now()<room.forceWindow.until;}
function finishRound(room){room.forceWindow=null;for(const p of room.players){for(const prep of p.prepared.filter(item=>effects(item.card).some(ef=>ef.op==='area_damage'))){p.discard.push(prep.card);emit(room,'expire',{playerId:p.id,cardId:prep.card.uid,name:prep.card.name});pushLog(room,`${prep.card.name} se desfez ao fim da rodada.`,p.id);}p.prepared=p.prepared.filter(item=>!effects(item.card).some(ef=>ef.op==='area_damage'));}room.preparationsDone=0;for(const p of room.players){retainAnchors(p);delete p.pendingCombatAttack;p.vote=null;p.ready=false;p.directPlayed=false;p.discountUsed=false;for(const c of p.reserve){c.attackMod=0;delete c.auraKeywords;delete c.revealPaid;delete c.revealPaymentRound;delete c.forcedBy;delete c.forcedLane;}}room.laneBonuses={};room.round++;room.first=other(room,room.first).id;startPrep(room,own(room,room.first));}
function finishCombatDecay(room){for(const p of room.players)for(const c of p.reserve)if(alive(c))for(const e of effects(c))if(e.op==='combat_decay'){applyDamage(room,c,e.amount);pushLog(room,`${c.name} recebeu ${e.amount} de dano por desgaste.`,p.id);}removeDead(room);checkWin(room);}
export const COMBAT_MS=9000;
function beginCombat(room){
  const id=randomUUID();
  room.phase='resolving';syncTurnClock(room,expireTurn);
  const spells=room.players.flatMap(p=>studyPrepared(p).filter(item=>laneCard(room,item.targetSide,item.lane)).map(item=>({cardId:item.card.uid,card:structuredClone(item.card),name:item.card.name,casterId:p.id,lane:item.lane,targetSide:item.targetSide,positive:item.targetSide===p.id,amount:effects(item.card).map(ef=>ef.amount||ef.attack||ef.amount_if_true||0).join('/'),op:effect(item.card)?.op})));
  const timeline=[{kind:'reveal',duration:1200},...spells.map(spell=>({kind:'magic',duration:spell.card.id==='RG04'?3350:spell.card.id==='FL15'?3100:spell.card.id==='RG07'?2600:spell.op==='area_stat_buff'?3500:2500,spell})),...Array.from({length:3},(_,lane)=>({kind:'clash',lane,duration:2200})),{kind:'result',duration:1200}];
    const duration=timeline.reduce((sum,step)=>sum+step.duration,0);
  room.combat={id,round:room.round,startedAt:Date.now(),duration,timeline,lanes:Array.from({length:3},(_,lane)=>({cards:room.players.map(p=>{const c=laneCard(room,p.id,lane);return c?{uid:c.uid,name:c.name,owner:p.id}:null;})})),spells};
  room.combat.auraHealthUpdates=room.players.flatMap(p=>p.formation.flatMap((uid,lane)=>{const c=findCreature(p,uid),bonus=healthAuras(p,effects).filter(e=>e.op==='lane_health_aura'&&auraApplies(e,c,lane)).reduce((n,e)=>n+statGain(c,e.amount),0);return c&&bonus?[{uid:c.uid,hp:c.health-c.damage+bonus,maxHp:c.health+bonus}]:[];}));
  // Simulate on a detached snapshot so the animation knows which cards actually
  // reach the clash after prepared spells and Revelation have resolved.
  const preview=structuredClone({...room,onChange:null,botTimer:null,combat:null,collectPreview:true});
  resolveCombat(preview);
  room.combat.spawnedMirages=preview.spawnedMirages||[];room.combat.seals=preview.seals||[];
  timeline.splice(timeline.findIndex(step=>step.kind==='clash'),0,...(preview.revelationsApplied||[]).map(ability=>({kind:'revelation',duration:1200,ability})));const portalIndex=timeline.findIndex(step=>step.kind==='revelation'&&step.ability.op!=='paired_seals');timeline.splice(portalIndex<0?timeline.findIndex(step=>step.kind==='clash'):portalIndex,0,...(preview.teleports||[]).map(teleport=>({kind:'teleport',duration:1400,teleport})));room.combat.visual=preview.preClash||[];if(preview.directedSteps){const index=timeline.findIndex(step=>step.kind==='clash');timeline.splice(index,3,...preview.directedSteps.map(strike=>({kind:'strike',lane:strike.lane,strike,duration:strike.blocked?300:strike.pair?2150:1950})));}if(preview.deathBursts?.length)timeline.splice(timeline.length-1,0,...preview.deathBursts.map(burst=>({kind:'death_burst',duration:1150,burst})));if(preview.growthUpdates?.length)timeline.splice(timeline.length-1,0,{kind:'growth',duration:1400,updates:preview.growthUpdates});for(const step of timeline){if(step.kind==='magic'){step.spell.healthUpdates=preview.spellHealthUpdates?.find(entry=>entry.cardId===step.spell.cardId)?.targets||[];step.spell.push=preview.pushes?.find(entry=>entry.cardId===step.spell.cardId)||null;}if(step.kind==='revelation')step.ability.healthUpdates=preview.revelationHealthUpdates?.filter(entry=>entry.sourceId===step.ability.sourceId&&entry.effectIndex===step.ability.effectIndex).map(entry=>entry.target)||[];}
  room.combat.casualties=preview.players.flatMap(p=>p.discard.filter(c=>c.type==='creature'&&!own(room,p.id).discard.some(old=>old.uid===c.uid)).map(c=>({uid:c.uid,owner:p.id})));
  for(const step of timeline)if(step.kind==='clash'){
    const cards=room.combat.visual.find(entry=>entry.lane===step.lane)?.cards.filter(Boolean)||[];
    const weight=Math.min(1,Math.max(0,...cards.map(c=>c.attack>=4?1:(c.attack+c.health-6)/14)));
    step.duration=cards.length?(cards.length===1?2050:1550)+Math.round(weight*350):300;
  }
  timeline.splice(0,timeline.length,...insertHandBuffSteps(timeline,preview.handBuffs,room.combat.visual));
  room.combat.duration=timeline.reduce((sum,step)=>sum+step.duration,0);
  pushLog(room,`Combate da rodada ${room.round}: formações reveladas.`);
  setTimeout(()=>{if(room.phase!=='resolving'||room.combat?.id!==id)return;resolveCombat(room);room.combat=null;syncMusic(room);room.revision++;room.onChange?.();},room.combat.duration);
}
export function resolveCombat(room){
  syncKeywordAuras(room);room.directedSteps=null;room.combatCount=(room.combatCount||0)+1;room.laneBonuses={};
  room.growthUpdates=[];room.spawnedMirages=[];room.deathBursts=[];room.handBuffs=[];room.pushes=[];
  if(room.collectPreview){room.spellHealthUpdates=[];room.revelationHealthUpdates=[];room.revelationsApplied=[];}
  const [left,right]=room.players;
  room.lastCombat={round:room.round,names:[left.name,right.name],lanes:Array.from({length:3},(_,lane)=>({left:laneCard(room,left.id,lane)?.name||'Vazia',right:laneCard(room,right.id,lane)?.name||'Vazia'})),spells:[],patronHits:[]};
  for(const p of room.players)for(let lane=0;lane<3;lane++){const c=laneCard(room,p.id,lane);if(!c)continue;const bonus=healthAuras(p,effects).filter(e=>e.op==='lane_health_aura'&&auraApplies(e,c,lane)).reduce((n,e)=>n+statGain(c,e.amount),0);if(bonus){c.temporaryDamageBefore??=c.damage;c.health+=bonus;c.temporaryHealth=(c.temporaryHealth||0)+bonus;}}
  for(const p of room.players)if(p.pendingCombatAttack)for(const uid of p.formation){const c=findCreature(p,uid);if(c){c.attackMod=(c.attackMod||0)+statGain(c,p.pendingCombatAttack);spellBuff(c,room.round);}}
  const triggered=[];
  for(const p of room.players)for(const prep of studyPrepared(p)){const targetSide=own(room,prep.targetSide);const target=laneCard(room,targetSide.id,prep.lane);if(target)triggered.push({prep,caster:p,target,targetSide});}
  const spellChanges=new Map();const spellDraws=[];const killDraws=[];
  const changeFor=card=>{if(!spellChanges.has(card))spellChanges.set(card,{damage:0,heal:0,attack:0,statAttack:0,statHealth:0,gainsAttack:0,gainsHealth:0,defeat:false});return spellChanges.get(card);};
  for(const {prep,caster,target,targetSide} of triggered){
    for(const ef of effects(prep.card)){
      if(preventControl(target,caster.id,ef.op)){emit(room,'ability_notice',{playerId:target.owner,targetId:target.uid,message:target.name+': Revestimento Rúnico impediu o controle inimigo.'});continue;}
      if(ef.op==='push_right'){
        const destination=prep.lane+1,neighbor=destination<3?laneCard(room,targetSide.id,destination):null;
        changeFor(target).damage+=ef.amount;if(neighbor)changeFor(neighbor).damage+=ef.amount;
        room.pushes.push({cardId:prep.card.uid,targetId:target.uid,owner:targetSide.id,fromLane:prep.lane,lane:Math.min(2,destination),collisionId:neighbor?.uid||null,blocked:Boolean(neighbor)||destination>=3,movements:[]});
        continue;
      }
      if(ef.op==='mirage'){activateMirage(room,caster,target,prep);continue;}
      if(ef.op==='heal_patron'){caster.patron.hp=Math.min(caster.patron.maxHp,caster.patron.hp+ef.amount);continue;}
      if(ef.op==='draw'){spellDraws.push([caster,ef.amount]);continue;}
      if(ef.op==='discard'){caster.pendingDiscardAfterCombat=(caster.pendingDiscardAfterCombat||0)+ef.amount;continue;}
      if(ef.op==='anchor'){target.anchor={lane:prep.lane,remaining:2,setAt:room.combatCount};continue;}
      if(ef.op==='sleep'){putToSleep(room,target,true);continue;}
      if(ef.op==='barrier'){target.attackBarrier=true;spellBuff(target,room.round);continue;}
      if(ef.op==='area_attack_modifier'){for(let lane=0;lane<3;lane++){const c=laneCard(room,other(room,caster.id).id,lane);if(alive(c)){changeFor(c).statAttack+=statGain(c,ef.amount);changeFor(c).statHealth+=ef.healthAmount||0;}}continue;}
      if(ef.op==='area_stat_buff'){for(const c of caster.reserve.filter(alive)){changeFor(c).statAttack+=statGain(c,ef.attack);changeFor(c).statHealth+=statGain(c,ef.health);changeFor(c).gainsAttack+=Math.max(0,statGain(c,ef.attack));changeFor(c).gainsHealth+=Math.max(0,statGain(c,ef.health));spellBuff(c,room.round,true);}continue;}
      const change=changeFor(target);
        if(ef.op==='area_damage'){for(let lane=0;lane<3;lane++){const enemy=laneCard(room,other(room,caster.id).id,lane);if(alive(enemy))changeFor(enemy).damage+=ef.amount;}continue;}
        if(ef.op==='damage'){change.damage+=ef.amount;if(ef.draw_on_kill)killDraws.push([caster,target,ef.draw_on_kill]);}
      if(ef.op==='conditional_damage')change.damage+=attack(target,room,prep.lane)>=ef.condition.gte?ef.amount_if_true:ef.amount_if_false;
      if(ef.op==='heal')change.heal+=ef.amount;
      if(ef.op==='choose_one')change.heal+=ef.options.find(x=>x.target==='chosen_allied_creature')?.amount||0;
      if(ef.op==='defeat')change.defeat=true;
      if(ef.op==='attack_modifier'){if(ef.permanent)change.statAttack+=statGain(target,ef.amount);else change.attack+=statGain(target,ef.amount);change.statHealth+=ef.healthAmount||0;if(ef.amount>0)spellBuff(target,room.round);}
      if(ef.op==='stat_buff'){change.statAttack+=statGain(target,ef.attack);change.statHealth+=statGain(target,ef.health);change.gainsAttack+=Math.max(0,statGain(target,ef.attack));change.gainsHealth+=Math.max(0,statGain(target,ef.health));spellBuff(target,room.round,true);}
    }
    if(room.collectPreview)room.spellHealthUpdates.push({cardId:prep.card.uid,targets:(effects(prep.card).some(e=>e.op==='heal_patron')?[{patronId:caster.id,hp:caster.patron.hp,maxHp:caster.patron.maxHp}]:[]).concat([...spellChanges].map(([card,change])=>{const projected=projectSpellChange(card,change);return {uid:card.uid,hp:Math.max(0,projected.health-projected.damage),maxHp:projected.health,extraLife:projected.extraLife||0,attack:attack(projected,room,own(room,card.owner).formation.indexOf(card.uid))};}))});
    if(!prep.echo){rememberPositionSpell(room,caster,prep.card,target,targetSide,prep.lane);if(effects(prep.card).some(e=>e.op==='barrier')){prep.remaining??=2;prep.lastCombat=room.combatCount;}else{caster.discard.push(prep.card);caster.prepared=caster.prepared.filter(item=>item!==prep);}}
    room.lastCombat.spells.push(`${prep.card.name} · posição ${prep.lane+1} de ${targetSide.name}`);
    pushLog(room,`${prep.card.name} foi ativada na posição ${prep.lane+1} de ${targetSide.name}.`,caster.id);
  }
  for(const [target,change] of spellChanges){const next=projectSpellChange(target,change);recordPermanentGains(next,change.gainsAttack,change.gainsHealth);if(!next.volatileProject)delete target.volatileProject;Object.assign(target,next);}
  for(const [caster,target,count] of killDraws)if(!alive(target))draw(room,caster,count,false,true);for(const [caster,count] of spellDraws)draw(room,caster,count,false,true);
  // Prepared spells target the creatures revealed in the original formation.
  // Apply the displacement once, after their simultaneous damage is resolved.
  for(const push of room.pushes){const p=own(room,push.owner),c=findCreature(p,push.targetId);if(!push.blocked&&c&&p.formation[push.fromLane]===c.uid&&!p.formation[push.lane]){p.formation[push.fromLane]=null;p.formation[push.lane]=c.uid;for(const key of ['anchor','sleep'])if(c[key])c[key].lane=push.lane;if(c.forcedBy)c.forcedLane=push.lane;push.movements.push({uid:c.uid,owner:p.id,lane:push.lane});}}
  if(room.pushes.some(x=>x.movements.length)){
    for(const p of room.players)for(const c of p.reserve)if(alive(c))clearTemporaryHealth(c);
    for(const p of room.players)for(let lane=0;lane<3;lane++){const c=laneCard(room,p.id,lane);if(!c||!alive(c))continue;const bonus=healthAuras(p,effects).filter(e=>e.op==='lane_health_aura'&&auraApplies(e,c,lane)).reduce((n,e)=>n+statGain(c,e.amount),0);if(bonus){c.temporaryDamageBefore=c.damage;c.health+=bonus;c.temporaryHealth=bonus;}}
  }
  removeDead(room);checkWin(room);
  if(room.collectPreview)for(const push of room.pushes){push.movements=push.movements.filter(m=>findCreature(own(room,m.owner),m.uid));const entry=room.spellHealthUpdates.find(x=>x.cardId===push.cardId);if(entry)entry.targets=room.players.flatMap(p=>[...p.reserve,...p.discard]).filter(c=>c.uid===push.targetId||c.uid===push.collisionId||push.movements.length&&pIsCombat(room,c)).map(c=>({uid:c.uid,hp:Math.max(0,c.health-c.damage),maxHp:c.health,extraLife:c.extraLife||0,attack:attack(c,room,own(room,c.owner).formation.indexOf(c.uid))}));}
  if(room.phase==='finished'){finishFields(room);return;}
  for(const p of room.players)for(const prep of p.prepared)if(effects(prep.card).some(e=>e.op==='barrier')){prep.remaining??=2;prep.lastCombat=room.combatCount;}
  for(const p of room.players){if(p.pendingDiscardAfterCombat){p.pendingDiscard=Math.min(p.hand.length,(p.pendingDiscard||0)+p.pendingDiscardAfterCombat);delete p.pendingDiscardAfterCombat;}for(const c of p.reserve)if(effects(c).some(e=>e.op==='damage_curse')&&p.formation.includes(c.uid))c.curseArmed=true;}
  revealSeals(room,{effects,laneCard,pushLog});
  if(room.teleports.length){
    // Health belongs to the selected position, so refresh it after an exchange.
    for(const p of room.players)for(const c of p.reserve)clearTemporaryHealth(c);
    for(const p of room.players)for(let lane=0;lane<3;lane++){const c=laneCard(room,p.id,lane);if(!c)continue;const bonus=healthAuras(p,effects).filter(e=>e.op==='lane_health_aura'&&auraApplies(e,c,lane)).reduce((n,e)=>n+statGain(c,e.amount),0);if(bonus){c.temporaryDamageBefore=c.damage;c.health+=bonus;c.temporaryHealth=bonus;}}
    room.teleports.at(-1).healthUpdates=room.players.flatMap(p=>p.formation.flatMap((uid,lane)=>{const c=laneCard(room,p.id,lane);return c?[{uid:c.uid,hp:Math.max(0,c.health-c.damage),maxHp:c.health,attack:attack(c,room,lane)}]:[];}));
  }
  syncKeywordAuras(room);
  const reveals=[];
  for(const p of room.players)for(let lane=0;lane<3;lane++){
    const card=laneCard(room,p.id,lane);if(!card)continue;
    for(const [effectIndex,baseEf] of effects(card).entries()){if(baseEf.op==='monk_choice'&&card.sleep)continue;const ef=baseEf.op==='monk_choice'?{...baseEf,...baseEf.options.find(o=>o.id===(card.monkMode||'weaken'))}:baseEf;if(ef.timing!=='revelation'||ef.op==='paired_seals'||ef.op==='duel_stasis'&&(card.eyeCooldown||0)>=room.combatCount)continue;if(ef.op==='small_ally_reveal'&&!p.reserve.some(c=>c!==card&&alive(c)&&(ef.scope!=='combat'||p.formation.includes(c.uid))&&attack(c,room,p.formation.indexOf(c.uid))<=1))continue;if(ef.op==='optional_reveal_attack'&&!card.revealPaid)continue;if(card.sleep&&ef.op==='combat_protocol')continue;
    if(ef.condition==='allied_spell_buff'&&!p.reserve.some(c=>c.uid!==card.uid&&alive(c)&&(c.spellBuff==='permanent'||c.spellBuff===room.round)))continue;
    if(ef.condition==='owner_played_direct_spell_this_round'&&!p.directPlayed)continue;if(ef.condition==='self_wounded'&&card.damage<=0)continue;
    reveals.push({p,lane,card,ef,effectIndex,target:ef.target==='self'?card:ef.target==='ally_right'?laneCard(room,p.id,lane+1):laneCard(room,other(room,p.id).id,lane)});
    if(room.collectPreview)room.revelationsApplied.push({sourceId:card.uid,effectIndex,casterId:p.id,targetSide:ef.target==='self'||ef.target==='ally_right'||['damage_curse','adjacent_attack_buff'].includes(ef.op)?p.id:other(room,p.id).id,lane:ef.target==='ally_right'?lane+1:lane,name:card.name,op:['optional_reveal_attack','small_ally_reveal'].includes(ef.op)?'attack_modifier':ef.op,mode:card.protocolMode||'assault',amount:ef.amount});
    }
  }
  const hits=[];
  for(const item of reveals){if(item.ef.op==='duel_stasis'&&item.target&&!item.card.sleep){for(const c of [item.card,item.target]){const owner=own(room,c.owner),lane=owner.formation.indexOf(c.uid);c.anchor={lane,remaining:2,setAt:room.combatCount};c.eyeSkipCombat=room.combatCount;c.eyeCooldown=room.combatCount+1;}}else if(['optional_reveal_attack','small_ally_reveal'].includes(item.ef.op)){item.card.attackMod=(item.card.attackMod||0)+item.ef.amount;if(room.collectPreview)room.revelationHealthUpdates.push({sourceId:item.card.uid,effectIndex:item.effectIndex,target:{uid:item.card.uid,hp:item.card.health-item.card.damage,maxHp:item.card.health,attack:attack(item.card,room,item.lane)}});}else if(item.ef.op==='combat_protocol'){const updates=applyProtocol(room,item,{laneCard,attack});if(room.collectPreview)for(const target of updates)room.revelationHealthUpdates.push({sourceId:item.card.uid,effectIndex:item.effectIndex,target});}else if(item.ef.op==='adjacent_attack_buff'){room.laneBonuses[item.p.id]??=[0,0,0];for(const lane of [item.lane-1,item.lane+1])if(lane>=0&&lane<3){room.laneBonuses[item.p.id][lane]+=item.ef.amount;const c=laneCard(room,item.p.id,lane);if(c&&room.collectPreview)room.revelationHealthUpdates.push({sourceId:item.card.uid,effectIndex:item.effectIndex,target:{uid:c.uid,hp:c.health-c.damage,maxHp:c.health,attack:attack(c,room,lane)}});}}else if(item.ef.op==='stat_buff'&&item.target){const target=item.target,a=statGain(target,item.ef.attack||0),h=statGain(target,item.ef.health||0);target.attackMod=(target.attackMod||0)+a;target.protocolHealth=(target.protocolHealth||0)+h;target.protocolDamageBefore??=target.damage;target.health+=h;if(room.collectPreview)room.revelationHealthUpdates.push({sourceId:item.card.uid,effectIndex:item.effectIndex,target:{uid:target.uid,hp:Math.max(0,target.health-target.damage),maxHp:target.health,attack:attack(target,room,item.p.formation.indexOf(target.uid))}});}else if(item.ef.op==='damage'&&item.target)hits.push([item.target,item.ef.amount,item.card.uid,item.effectIndex]);else if(item.ef.op==='attack_modifier'&&item.target){item.target.attackMod+=statGain(item.target,item.ef.amount);if(room.collectPreview)room.revelationHealthUpdates.push({sourceId:item.card.uid,effectIndex:item.effectIndex,target:{uid:item.target.uid,hp:Math.max(0,item.target.health-item.target.damage),maxHp:item.target.health,attack:attack(item.target,room,item.lane)}});}pushLog(room,`${item.card.name} ativou Revelação na posição ${item.lane+1}.`,item.p.id);}
  for(const [target,amount,sourceId,effectIndex] of hits){applyDamage(room,target,amount);curseFromDamage(target,room.players.flatMap(p=>p.reserve).find(c=>c.uid===sourceId),effects);if(room.collectPreview)room.revelationHealthUpdates.push({sourceId,effectIndex,target:{uid:target.uid,hp:Math.max(0,target.health-target.damage),maxHp:target.health,extraLife:target.extraLife||0}});}
  removeDead(room);checkWin(room);if(room.phase==='finished'){finishFields(room);return;}
  const damage=[];const patronHits=[];
  const [a,b]=room.players;
  if(room.collectPreview)room.preClash=Array.from({length:3},(_,lane)=>({lane,cards:[a,b].map(p=>{const c=laneCard(room,p.id,lane);return c?{uid:c.uid,owner:p.id,attack:attack(c,room,lane),health:c.health-c.damage}:null;})}));
  if(room.players.some(p=>p.formation.some((uid,lane)=>{const c=laneCard(room,p.id,lane);return c&&attack(c,room,lane)<=0;})||p.reserve.some(c=>c.equipment||c.extraLife||c.sleep||c.attackBarrier||c.corruption||c.eyeSkipCombat===room.combatCount||c.temporaryTrample||c.grantedTrample||effects(c).some(e=>['initiative','trample','taunt','kill_growth','survive_growth','adjacent_damage','damage_curse','blocked_summon','retaliation'].includes(e.op))))){
    resolveDirectedCombat(room,{effects,attack,laneCard,alive,applyDamage,pushLog,curseFromDamage,emit,blockedSummons,retaliation});
    removeDead(room);checkWin(room);finishCombatDecay(room);finishFields(room);if(room.phase!=='finished')finishRound(room);return;
  }
  for(let lane=0;lane<3;lane++){
    const ac=laneCard(room,a.id,lane),bc=laneCard(room,b.id,lane);
    if(ac&&bc){damage.push([ac,attack(bc,room,lane)],[bc,attack(ac,room,lane)]);pushLog(room,`Posição ${lane+1}: ${ac.name} enfrenta ${bc.name}.`);}
    else if(ac)patronHits.push([b,attack(ac,room,lane),ac.name,lane,a.id]);
    else if(bc)patronHits.push([a,attack(bc,room,lane),bc.name,lane,b.id]);
  }
  for(const [target,amount] of damage)applyDamage(room,target,amount);
  for(const [target,amount,name,lane,actor] of patronHits){absorbPatronDamage(target,amount);room.lastCombat.patronHits.push(`${name}: ${amount} em ${target.name} pela posição ${lane+1}`);pushLog(room,`${name} causou ${amount} ao Patrono de ${target.name} pela posição ${lane+1}.`,actor);}
  removeDead(room);checkWin(room);finishCombatDecay(room);finishFields(room);if(room.phase!=='finished')finishRound(room);
}
// Timing is authoritative even when both clients are disconnected.
export function expireTurn(room,now=Date.now()){
  const clock=room.turnClock;if(!clock||now<clock.endsAt||room.phase!==clock.phase)return false;
  if(clock.phase==='mulligan'){
    const expired=room.players.filter(p=>{const c=mulliganClock(room,p);return c&&c.endsAt<=now;});
    if(!expired.length)return false;
    for(const p of expired){settleStudyOpening(p);p.mulliganReady=true;pushLog(room,`${p.name}: tempo da mão inicial esgotado. Cartas atuais mantidas.`,p.id);}
    room.revision++;if(room.players.every(p=>p.mulliganReady))startPrep(room,own(room,room.first));
    syncTurnClock(room,expireTurn);syncMusic(room);room.onChange?.();return true;
  }
  const players=clock.phase==='prep'?room.players.filter(p=>p.id===clock.playerId):room.players.filter(p=>!p.ready);
  emit(room,'turn_timeout',{clockKey:clock.key,phase:clock.phase,playerIds:players.map(p=>p.id)});
  for(const p of room.players){
    while(p.pendingDiscard&&p.hand.length)actInternal(room,p,{type:'discard',cardId:[...p.hand].sort((a,b)=>b.cost-a.cost)[0].uid});
    if(!p.hand.length)p.pendingDiscard=0;
  }
  if(clock.phase==='prep'){
    const p=players[0];
    for(const source of pendingApprentices(room,p)){
      const target=other(room,p.id).reserve.find(alive);
      if(target)actInternal(room,p,{type:'apprenticeTarget',cardId:source.uid,targetId:target.uid});
    }
    actInternal(room,p,{type:'endPrep'});
  }else{
    room.forceWindow=null;
    for(const p of players){
      for(const uid of p.emanation){const c=findCreature(p,uid);if(c&&effects(c).some(e=>e.op==='lane_keyword_aura'||e.op==='lane_health_aura'&&e.choose_lane)&&!Number.isInteger(c.auraLane))c.auraLane=0;}
      p.formation.forEach((uid,lane)=>{
        const c=findCreature(p,uid);if(!c)return;
        if(effects(c).some(e=>e.op==='paired_seals')&&!c.sealChoices)c.sealChoices={allyLane:lane,enemyLane:lane};
        if(effects(c).some(e=>e.op==='combat_protocol')&&!c.protocolMode)c.protocolMode='assault';
        if(effects(c).some(e=>e.op==='monk_choice')&&!c.monkMode)c.monkMode='weaken';
        if(tauntLanes(p.taunts?.[uid]).some(n=>Math.abs(n-lane)!==1))delete p.taunts[uid];
      });
      actInternal(room,p,{type:'ready'});
    }
  }
  pushLog(room,`Tempo esgotado: ${clock.phase==='prep'?'preparação encerrada':'formações confirmadas'} automaticamente.`);
  syncTurnClock(room,expireTurn);syncMusic(room);room.onChange?.();return true;
}
export function act(room,p,data,catalog){
  // Reject a late request rather than letting it apply to the following turn.
  syncTurnClock(room,expireTurn);
  if(expireTurn(room)&&!['leave','spectate'].includes(data?.type))throw Error('O tempo desta fase terminou.');
  try{return actInternal(room,p,data,catalog);}finally{syncTurnClock(room,expireTurn);syncMusic(room);}
}
function actInternal(room,p,data,catalog){
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
  if(data.type==='reset'){if(room.phase!=='finished')throw Error('Só é possível iniciar uma nova partida após o encerramento.');resetToLobby(room);room.log=[];room.revision++;return;}
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
    if(data.type==='openingReady'){
      if(!p.mulliganReady&&p.mulliganStartedAt==null){p.mulliganStartedAt=Math.min(Date.now(),room.mulliganPresentationEndsAt);room.revision++;}
      return;
    }
    if(p.mulliganReady)throw Error('Sua mão inicial já foi confirmada.');
    if(data.type==='mulligan'){
      if(p.mulligansLeft<=0)throw Error('Você não tem mais trocas disponíveis.');
      const ids=data.cardIds;if(!Array.isArray(ids)||ids.length<1||ids.length>5||new Set(ids).size!==ids.length||ids.some(id=>!p.hand.some(c=>c.uid===id)))throw Error('Selecione de uma a cinco cartas da sua mão.');
      const returning=p.hand.filter(c=>ids.includes(c.uid));p.hand=p.hand.filter(c=>!ids.includes(c.uid));p.deck=shuffle([...p.deck,...returning]);p.mulligansLeft--;emit(room,'mulligan',{playerId:p.id,count:returning.length,cardIds:returning.map(c=>c.uid)});draw(room,p,returning.length);pushLog(room,`${p.name} trocou ${returning.length} carta(s) da mão inicial.`,p.id);
    }else if(data.type==='confirmMulligan'){
      settleStudyOpening(p);p.mulliganReady=true;pushLog(room,`${p.name} confirmou a mão inicial.`,p.id);if(room.players.every(x=>x.mulliganReady))startPrep(room,own(room,room.first));
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
      validatePreparedSide(room,p,prep.card,side);
      if(p.prepared.some(item=>item!==prep&&item.targetSide===side.id&&item.lane===lane))throw Error('Você já colocou uma magia nessa posição.');
      prep.sharedLane=p.study?.sharing?adjacentLane(lane,data.sharedLane??p.study.centerNeighbor):undefined;prep.lane=lane;prep.targetSide=side.id;prep.hidden=side.id!==p.id;
      pushLog(room,`${p.name} reposicionou uma magia preparada.`,p.id);
    }
    room.revision++;return;
  }
  if(room.phase==='forging'){if(room.turn!==p.id||data.type!=='forgeChoice')throw Error('Aguarde ou conclua a etapa de forja antes da preparação.');chooseForge(room,p,data,{emit,pushLog});startPrep(room,p);room.revision++;return;}
  if(p.pendingDiscard){if(data.type!=='discard')throw Error('Escolha uma carta para descartar antes de continuar.');if(!['prep','vote','formation'].includes(room.phase))throw Error('Aguarde o fim do combate.');const card=p.hand.find(c=>c.uid===data.cardId);if(!card)throw Error('Escolha uma carta da mão.');p.hand=p.hand.filter(c=>c!==card);p.discard.push(card);p.pendingDiscard--;pushLog(room,`${p.name} descartou ${card.name}.`,p.id);emit(room,'discard',{playerId:p.id,cardId:card.uid});room.revision++;return;}
  if(room.phase==='prep'){
    if(p.id!==room.turn)throw Error('Aguarde sua preparação.');
    if(data.type==='apprenticeTarget'){
      const source=findCreature(p,data.cardId),enemy=other(room,p.id),target=findCreature(enemy,data.targetId);
      if(!source||!effects(source).some(e=>e.op==='bound_spell_damage'))throw Error('Escolha uma Aprendiz sua em campo.');
      if(source.apprenticeSpellUsed)throw Error('Esta Aprendiz já utilizou seu efeito.');if(findCreature(enemy,source.apprenticeTargetId))throw Error('O alvo da Aprendiz ainda está vivo.');
      if(!target)throw Error('Escolha uma criatura inimiga viva para a Aprendiz.');
      source.apprenticeTargetId=target.uid;pushLog(room,`${source.name} marcou ${target.name}.`,p.id);
      emit(room,'apprentice_target',{playerId:p.id,sourceId:source.uid,targetId:target.uid,name:source.name});
      room.revision++;return;
    }
    if(pendingApprentices(room,p).length)throw Error('Escolha o novo alvo da Aprendiz antes de continuar.');
    if(data.type==='patronPower'){if(data.powerId==='estudos-avancados')activateStudies(room,p,data,{emit,pushLog,applyExisting:()=>{for(const item of existingPositionSpells(room,p)){const side=own(room,item.sideId),lane=adjacentLane(item.lane,p.study.centerNeighbor),target=findCreature(side,side.formation[lane]);if(target){applyEffect(room,p,item.spell,target);emit(room,'spell',{playerId:p.id,cardId:item.spell.uid,name:item.spell.name,targetId:target.uid,op:item.spell.effects[0]?.op,echo:true,healthUpdates:[{uid:target.uid,hp:Math.max(0,target.health-target.damage),maxHp:target.health,attack:attack(target,room,lane)}]});}}removeDead(room);checkWin(room);}});else activatePatronPower(room,p,data,{findCreature,attack,spellBuff,draw,emit,pushLog});}
    else if(data.type==='grimoirePreview'){previewStudyBook(p,data);}
    else if(data.type==='grimoireFinish'){finishStudyBook(room,p,{emit,pushLog});}
    else if(data.type==='pressureLane'){const source=findCreature(p,data.cardId),lane=Number(data.lane);if(!source||!p.emanation.includes(source.uid)||!effects(source).some(e=>e.op==='lane_keyword_aura'||e.op==='lane_health_aura'&&e.choose_lane)||!Number.isInteger(lane)||lane<0||lane>2)throw Error('Escolha uma posição aliada para a Emanação.');source.auraLane=lane;syncKeywordAuras(room);}
    else if(data.type==='equip'){equipWeapon(room,p,data,{emit,pushLog,attack});}
    else if(data.type==='play'){
      const card=p.hand.find(c=>c.uid===data.cardId)||p.studyBook?.cards.find(c=>c.uid===data.cardId&&p.studyBook.instantIds.includes(c.uid));if(!card)throw Error('Carta não está na mão.');const fromGrimoire=Boolean(p.studyBook?.instantIds.includes(card.uid)),playEventStart=room.events.at(-1)?.id||0;let spellPlace=null;
      if(card.type==='equipment'){const cost=studyCardCost(p,card);if(p.mana<cost)throw Error('Éter insuficiente para jogar o equipamento.');p.mana-=cost;p.hand=p.hand.filter(c=>c!==card);(p.weapons??=[]).push(card);emit(room,'equipment_played',{playerId:p.id,card:structuredClone(card)});pushLog(room,p.name+' colocou '+card.name+' na reserva.',p.id);}
      else if(card.type==='creature'){
        const toEmanation=data.mode==='emanate';
        const chosenEntry=effects(card).filter(ef=>ef.timing==='on_enter'&&ef.target==='chosen_allied_creature');
        const entryTarget=chosenEntry.length?(data.targetId===card.uid?card:findCreature(p,data.targetId)):null;
        if(chosenEntry.length&&!entryTarget)throw Error('Escolha uma criatura aliada viva para o efeito de Entrada.');
        const anyEntry=effects(card).some(ef=>ef.timing==='on_enter'&&ef.target==='any_creature'),anyTarget=anyEntry?(data.targetId===card.uid?card:room.players.flatMap(s=>s.reserve).find(c=>c.uid===data.targetId&&alive(c))):null;if(anyEntry&&!anyTarget)throw Error('Escolha uma criatura viva para Silêncio.');
        const boundEntry=effects(card).some(ef=>ef.op==='bound_spell_damage'),enemy=other(room,p.id);
        const boundTarget=boundEntry?findCreature(enemy,data.targetId):null;
        if(boundEntry&&(data.targetId||enemy.reserve.some(alive))&&!boundTarget)throw Error('Escolha uma criatura inimiga viva para a Aprendiz.');
        if(!toEmanation&&reserveSize(p)>=8)throw Error('Reserva cheia: até 8 criaturas fora de Emanação.');
        if(toEmanation&&(!effects(card).some(ef=>String(ef.timing).includes('emanat'))||p.emanation.length>=2))throw Error('Esta carta não pode entrar em Emanação ou as duas vagas estão ocupadas.');
        paidCost(p,card);p.hand=p.hand.filter(c=>c!==card);p.reserve.push(card);if(toEmanation)p.emanation.push(card.uid);
        if(boundEntry)card.apprenticeTargetId=boundTarget?.uid||null;
        pushLog(room,`${p.name} jogou ${card.name} ${toEmanation?'diretamente em Emanação':'na reserva'}.`,p.id);emit(room,'creature',{playerId:p.id,cardId:card.uid,name:card.name,zone:toEmanation?'emana':'reserve',speech:card.speech||'A caçada começa.'});for(const ef of effects(card).filter(x=>x.timing==='on_enter')){const target=ef.target==='chosen_allied_creature'?entryTarget:ef.target==='any_creature'?anyTarget:card;applyEffect(room,p,{effects:[ef],id:card.id},target);if(ef.op==='grant_keyword')emit(room,'ability_notice',{playerId:p.id,sourceId:card.uid,targetId:target.uid,message:card.name+' concedeu Iniciativa a '+target.name+'.'});}enteredCreature(room,p,card,{attack,emit,pushLog});
      }
      else{
        const mode=data.mode||'direct';const kind=targetKind(card);
        if(mode==='direct'){
          if(card.positionOnly)throw Error('Esta magia deve ser colocada em uma posição.');
          const {target}=validTarget(room,p,card,data.targetId);const shareSide=target?.owner?own(room,target.owner):null,shareLane=shareSide?.formation.indexOf(target.uid)??-1,shareCard=localSpell(card),share=Boolean(p.study?.sharing&&shareLane>=0&&shareCard.effects.length);const echoLane=share?adjacentLane(shareLane,data.sharedLane??p.study.centerNeighbor):-1,echoTarget=share?findCreature(shareSide,shareSide.formation[echoLane]):null;
          const damageSource=effect(card)?.op==='ally_attack_damage'?findCreature(p,data.sourceId):null;
          if(effect(card)?.op==='ally_attack_damage'&&!damageSource)throw Error('Escolha uma criatura viva que você controla para causar o dano.');
          const spellAmount=damageSource?attack(damageSource,room,p.formation.indexOf(damageSource.uid)):null;
          paidCost(p,card,'direct');p.hand=p.hand.filter(c=>c!==card);p.discard.push(card);emit(room,'spell_cast',{playerId:p.id,targetSide:shareSide?.id,lane:shareLane,sharedLane:share?echoLane:undefined,optimized:Boolean(p.study?.discount),shared:share});if(damageSource){applyDamage(room,target,spellAmount);if(spellAmount>0)curseFromDamage(target,damageSource,effects);}else applyEffect(room,p,card,target);spellPlace={targetSide:shareSide?.id,lane:shareLane,sharedLane:share?echoLane:undefined};if(echoTarget&&room.phase!=='finished'){applyEffect(room,p,shareCard,echoTarget);emit(room,'spell',{card:structuredClone(shareCard),playerId:p.id,echo:true,targetSide:shareSide.id,lane:echoLane,targetId:echoTarget.uid,name:card.name+' · Eco',op:effect(shareCard)?.op,healthUpdates:[{uid:echoTarget.uid,hp:Math.max(0,echoTarget.health-echoTarget.damage),maxHp:echoTarget.health,attack:attack(echoTarget,room,echoLane)}]});}rememberPositionSpell(room,p,card,target,shareSide,shareLane);p.directPlayed=true;removeDead(room);checkWin(room);pushLog(room,`${p.name} usou ${card.name} diretamente.`,p.id);emit(room,'spell',{card:structuredClone(card),patronHealing:effects(card).some(e=>e.op==='heal_patron')?{patronId:p.id,hp:p.patron.hp,maxHp:p.patron.maxHp}:null,playerId:p.id,sourceId:damageSource?.uid||null,targetId:target?.uid||null,targetPatronId:target?.patron?(target.owner||p.id):null,name:card.name,op:effect(card)?.op,amount:spellAmount??(effect(card)?.amount||effect(card)?.attack||0),sourceHealthUpdate:damageSource?{uid:damageSource.uid,hp:damageSource.health-damageSource.damage,maxHp:damageSource.health,attack:attack(damageSource,room,p.formation.indexOf(damageSource.uid))}:null,healthUpdates:['area_stat_buff','graveyard_stat_buff','combat_area_attack'].includes(effect(card)?.op)?p.reserve.map(c=>({uid:c.uid,hp:Math.max(0,c.health-c.damage),maxHp:c.health,extraLife:c.extraLife||0,attack:attack(c,room,p.formation.indexOf(c.uid))})):['area_damage','area_attack_modifier'].includes(effect(card)?.op)?other(room,p.id).reserve.concat(other(room,p.id).discard.filter(c=>c.type==='creature')).map(c=>({uid:c.uid,hp:Math.max(0,c.health-c.damage),maxHp:c.health,extraLife:c.extraLife||0,attack:attack(c,room,other(room,p.id).formation.indexOf(c.uid))})):target?.patron?[{patronId:target.owner||p.id,hp:own(room,target.owner||p.id).patron.hp,extraLife:own(room,target.owner||p.id).patron.extraLife||0,maxHp:own(room,target.owner||p.id).patron.maxHp}]:target?[{uid:target.uid,hp:Math.max(0,target.health-target.damage),maxHp:target.health,extraLife:target.extraLife||0,attack:attack(target,room,(kind==='enemy'?other(room,p.id):p).formation.indexOf(target.uid))}]:[],attackAfter:['attack_modifier','stat_buff'].includes(effect(card)?.op)&&target?attack(target,room,p.formation.indexOf(target.uid)):undefined});
        }else if(mode==='lane'){
          if(card.directOnly)throw Error('Esta magia só pode ser usada diretamente.');
          const lane=Number(data.lane);if(!Number.isInteger(lane)||lane<0||lane>2)throw Error('Escolha uma posição de 1 a 3.');
          const requestedSide=room.players.find(seat=>seat.id===data.targetSide);
          if(data.targetSide&&!requestedSide)throw Error('Lado da posição inválido.');
          const targetSide=requestedSide||((kind==='enemy'||kind==='enemy-board')?other(room,p.id):p);
          if(p.prepared.some(item=>item.targetSide===targetSide.id&&item.lane===lane))throw Error('Você já colocou uma magia nessa posição desse lado.');
          validatePreparedSide(room,p,card,targetSide);const sharedLane=p.study?.sharing?adjacentLane(lane,data.sharedLane??p.study.centerNeighbor):undefined;const paid=paidCost(p,card,'lane');p.hand=p.hand.filter(c=>c!==card);p.prepared.push({card,sharedLane,paidRound:room.round,paid,targetSide:targetSide.id,lane,hidden:targetSide.id!==p.id});spellPlace={targetSide:targetSide.id,lane,sharedLane};
          pushLog(room,`${p.name} colocou uma magia ${targetSide.id===p.id?'aberta em sua':'oculta na'} posição ${lane+1}.`,p.id);
        }else throw Error('Modo de magia inválido.');
        if(mode==='lane')emit(room,'spell_cast',{playerId:p.id,...spellPlace,optimized:Boolean(p.study?.discount),shared:Boolean(p.study?.sharing&&studyPrepared(p).some(x=>x.echo&&x.card.uid===card.uid+'-eco'))});apprenticeSpell(room,p);
      }
      if(fromGrimoire){for(const e of room.events)if(e.id>playEventStart&&['creature','spell','equipment_played'].includes(e.type)&&e.playerId===p.id)e.fromGrimoire=true;}
      consumeStudyCopy(room,p,card,{emit,pushLog});
    }else if(data.type==='emanate'){
      const card=findCreature(p,data.cardId);if(!card)throw Error('Escolha uma criatura sua em campo.');
      const leaving=p.emanation.includes(card.uid);
      if(card.anchor||card.sleep)throw Error('A criatura está presa nesta posição até o próximo combate.');
      if(leaving&&reserveSize(p)>=8)throw Error('Reserva cheia: retire uma criatura antes de voltar da Emanação.');
      if(!leaving&&(!effects(card).some(ef=>String(ef.timing).includes('emanat'))||p.emanation.length>=2))throw Error('Esta criatura não pode ocupar Emanação ou as duas vagas estão ocupadas.');
      if(p.mana<1)throw Error('Mover entre reserva e Emanação custa 1 mana.');p.mana--;
      p.emanation=leaving?p.emanation.filter(uid=>uid!==card.uid):[...p.emanation,card.uid];delete card.auraLane;syncKeywordAuras(room);
      pushLog(room,`${card.name} ${leaving?'voltou à reserva':'entrou em Emanação'} por 1 mana.`,p.id);
      emit(room,'creature',{playerId:p.id,cardId:card.uid,name:card.name,zone:leaving?'reserve':'emana',speech:card.speech||'Estou a postos.'});
    }else if(data.type==='endPrep'){
      const clerics=p.emanation.filter(uid=>effects(p.reserve.find(c=>c.uid===uid)).some(e=>e.op==='heal'&&String(e.timing).includes('emanat')));
      const healingCost=clerics.reduce((sum,uid,index)=>{const c=findCreature(p,uid),ef=effects(c).find(e=>e.op==='heal'&&String(e.timing).includes('emanat')),targetId=data.healTargetIds?.[index]||data.healTargetId,t=targetId==='patron'&&ef.allow_patron?{damage:p.patron.maxHp-p.patron.hp}:findCreature(p,targetId);return sum+(t?.damage>0&&(!ef.exclude_self||t.uid!==uid)?ef.mana_cost||0:0);},0);if(p.mana<healingCost)throw Error('Mana insuficiente para as curas escolhidas. Cancele uma cura ou preserve a mana.');
      finishStudyBook(room,p,{emit,pushLog});
      clerics.forEach((uid,index)=>{
        const cleric=findCreature(p,uid),ef=effects(cleric).find(ef=>ef.op==='heal'&&String(ef.timing).includes('emanat')),targetId=data.healTargetIds?.[index]||data.healTargetId,target=targetId==='patron'&&ef?.allow_patron?{patron:true,damage:p.patron.maxHp-p.patron.hp}:findCreature(p,targetId),cost=ef?.mana_cost||0;
        if(!target||target.damage<=0||(ef?.exclude_self&&target.uid===uid)||p.mana<cost)return;
        p.mana-=cost;if(target.patron){p.patron.hp=Math.min(p.patron.maxHp,p.patron.hp+(ef.amount||1));emit(room,'cleric_heal',{playerId:p.id,sourceId:uid,targetPatronId:p.id,amount:ef.amount||1,mana:cost,healthUpdates:[{patronId:p.id,hp:p.patron.hp,maxHp:p.patron.maxHp}]});return;}target.damage=Math.max(0,target.damage-(ef.amount||1));
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
    if(p.vote){room.phase='formation';startForceWindow(room);pushLog(room,`${p.name} iniciou o combate. Distribuam as criaturas em segredo.`,p.id);}
    else if(room.players.every(x=>x.vote===false)){pushLog(room,'Ambos recusaram combate.');finishRound(room);}
    room.revision++;return;
  }
  if(room.phase==='formation'){
    if(data.type==='sealLanes'){if(p.ready)throw Error('A formação já foi confirmada.');const c=findCreature(p,data.cardId);if(!c||!p.formation.includes(c.uid)||!effects(c).some(e=>e.op==='paired_seals')||c.sleep)throw Error('Escolha Ithalion na formação.');if((room.seals||[]).some(s=>s.sourceId===c.uid))throw Error('Os selos já estão ativos.');if(![data.allyLane,data.enemyLane].every(n=>Number.isInteger(n)&&n>=0&&n<3))throw Error('Escolha uma posição de cada lado.');c.sealChoices={allyLane:data.allyLane,enemyLane:data.enemyLane};room.revision++;return;}

    if(p.ready)throw Error('Formação já confirmada.');
    if(forceWindowActive(room)&&data.type==='ready')throw Error('Aguarde os cinco segundos de escolha de Vultobreve.');
    if(forceWindowActive(room)&&data.type==='assign'&&(!room.forceWindow.owners.includes(p.id)||!effects(findCreature(p,data.cardId)).some(e=>e.op==='force_opponent')))throw Error('Vultobreve tem prioridade por cinco segundos antes das outras criaturas.');
    if(data.type==='pressureLane'){const c=findCreature(p,data.cardId);if(!c||!p.emanation.includes(c.uid)||!effects(c).some(e=>e.op==='lane_keyword_aura'||e.op==='lane_health_aura'&&e.choose_lane)||!Number.isInteger(data.lane)||data.lane<0||data.lane>2)throw Error('Escolha uma posição aliada para a Emanação.');c.auraLane=data.lane;syncKeywordAuras(room);}
    else if(['revealPayment','forceOpponent'].includes(data.type)){ruptureFormationAction(room,p,data,{findCreature,effects,emit,pushLog});}
    else if(data.type==='assign'){
      const lane=Number(data.lane);if(!Number.isInteger(lane)||lane<0||lane>2)throw Error('Posição inválida.');
      const occupant=findCreature(p,p.formation[lane]);const requested=findCreature(p,data.cardId);if((occupant?.forcedBy&&occupant.uid!==data.cardId)||(requested?.forcedBy&&requested.forcedLane!==lane))throw Error('Vultobreve mantém esta criatura na posição escolhida até o combate.');const previous=p.formation[lane];if((occupant?.anchor&&occupant.uid!==data.cardId)||(requested?.anchor&&requested.anchor.lane!==lane))throw Error('A criatura está ancorada nesta posição até o próximo combate.');if((occupant?.sleep&&occupant.uid!==data.cardId)||(requested?.sleep&&requested.sleep.lane!==lane))throw Error('A criatura está adormecida e presa nesta posição.');
      if(data.cardId!==null){const card=findCreature(p,data.cardId);if(!card||p.emanation.includes(card.uid))throw Error('Escolha uma criatura válida da reserva.');if(previous&&previous!==card.uid)releaseForced(room,previous);if(p.formation.indexOf(card.uid)!==lane)releaseForced(room,card.uid);p.formation=p.formation.map(uid=>uid===card.uid?null:uid);p.formation[lane]=card.uid;if(tauntLanes(p.taunts?.[card.uid]).some(targetLane=>Math.abs(targetLane-lane)!==1))delete p.taunts[card.uid];}else{const uid=p.formation[lane];releaseForced(room,uid);p.formation[lane]=null;if(p.taunts)delete p.taunts[uid];}
    }else if(data.type==='pressureLane'){const source=findCreature(p,data.cardId),lane=Number(data.lane);if(!source||!p.emanation.includes(source.uid)||!effects(source).some(e=>e.op==='lane_keyword_aura'||e.op==='lane_health_aura'&&e.choose_lane)||!Number.isInteger(lane)||lane<0||lane>2)throw Error('Escolha uma posição aliada para a Emanação.');source.auraLane=lane;
    }else if(data.type==='monkChoice'){const card=findCreature(p,data.cardId);if(!card||!p.formation.includes(card.uid)||card.sleep||!effects(card).some(e=>e.op==='monk_choice')||!['weaken','buff'].includes(data.mode))throw Error('Escolha um efeito válido do Monge na formação.');card.monkMode=data.mode;
    }else if(data.type==='protocol'){
      const card=findCreature(p,data.cardId);if(!card||!p.formation.includes(card.uid)||card.sleep||!effects(card).some(e=>e.op==='combat_protocol')||!['assault','escort'].includes(data.mode))throw Error('Escolha um protocolo válido para Verônica na formação.');
      card.protocolMode=data.mode;
    }else if(data.type==='taunt'){
      const card=findCreature(p,data.cardId),lanes=data.lanes??(data.lane===null?[]:[Number(data.lane)]),ownLane=p.formation.indexOf(data.cardId);
      if(!card||!effects(card).some(e=>e.op==='taunt')||ownLane<0)throw Error('Escolha uma criatura com Provocar na formação.');
      const max=effects(card).find(e=>e.op==='taunt')?.maxAdditional||1;
      if(!Array.isArray(lanes)||lanes.length>max||new Set(lanes).size!==lanes.length||lanes.some(lane=>!Number.isInteger(lane)||lane<0||lane>2||Math.abs(lane-ownLane)!==1))throw Error('Provocar exige uma posição adjacente à sua posição.');
      if(lanes.some(lane=>Object.entries(p.taunts||{}).some(([uid,value])=>uid!==card.uid&&tauntLanes(value).includes(lane)&&p.formation.includes(uid))))throw Error('Outra criatura já provoca essa posição.');
      if(!lanes.length)delete p.taunts?.[card.uid];else(p.taunts??={})[card.uid]=lanes.length===1?lanes[0]:lanes;
    }else if(data.type==='ready'){
      if(p.emanation.some(uid=>{const c=findCreature(p,uid);return effects(c).some(e=>e.op==='lane_keyword_aura'||e.op==='lane_health_aura'&&e.choose_lane)&&!Number.isInteger(c.auraLane);}))throw Error('Escolha a posição da Emanação.');
      if(p.formation.some(uid=>{const c=findCreature(p,uid);return c&&!c.sleep&&effects(c).some(e=>e.op==='paired_seals')&&!c.sealChoices;}))throw Error('Escolha as duas posições dos selos de Ithalion.');
      if(p.formation.some(uid=>{const c=findCreature(p,uid);return c&&!c.sleep&&effects(c).some(e=>e.op==='combat_protocol')&&!c.protocolMode;}))throw Error('Escolha o protocolo de Verônica antes de confirmar.');
      if(p.formation.some(uid=>{const c=findCreature(p,uid);return c&&!c.sleep&&effects(c).some(e=>e.op==='monk_choice')&&!c.monkMode;}))throw Error('Escolha o efeito do Monge antes de confirmar.');
      if(room.players.some(x=>x.pendingDiscard))throw Error('Aguarde a escolha de descarte.');if(p.formation.some(uid=>uid&&p.taunts?.[uid]!==undefined&&tauntLanes(p.taunts[uid]).some(lane=>Math.abs(lane-p.formation.indexOf(uid))!==1)))throw Error('Escolha uma posição adicional adjacente ou remova a escolha.');p.ready=true;pushLog(room,`${p.name} confirmou a formação.`,p.id);if(room.players.every(x=>x.ready))beginCombat(room);}
    else throw Error('Ação indisponível na formação.');syncKeywordAuras(room);room.revision++;return;
  }
  throw Error('Ação fora de fase.');
}

export function view(room,p){
  const reveal=room.phase==='finished'||room.phase==='resolving';
  return {music:musicView(room),turnClock:room.phase==='mulligan'?(room.players.includes(p)?mulliganClock(room,p):null):room.turnClock||null,seals:room.seals||[],forceWindow:room.phase==='formation'?room.forceWindow:null,laneBonuses:reveal?room.laneBonuses||{}:{},code:room.code,inviteToken:room.inviteToken,phase:room.phase,round:room.round,turn:room.turn,first:room.first,coinWinner:room.coinWinner,winner:room.winner,you:p.id,spectator:room.spectators.includes(p),spectators:room.spectators.map(x=>({id:x.id,name:x.name})),revision:room.revision,serverNow:Date.now(),recording:room.recording||null,matchId:room.matchId||null,eventId:room.eventId,eventsFrom:room.events[0]?.id??room.eventId+1,events:room.events.map(event=>handBuffView(event,p.id)),log:room.log,lastCombat:room.lastCombat||null,combat:room.phase==='resolving'?combatHandBuffView(room.combat,p.id):null,players:room.players.map(seat=>({
     id:seat.id,name:seat.name,bot:seat.bot,deckId:seat.deckId,study:studyView(seat,seat.id===p.id),patron:seat.patron,deckCount:seat.deck?.length||0,handCount:seat.hand?.length||0,discardCount:seat.discard?.length||0,discard:seat.discard||[],weapons:seat.weapons||[],forge:seat.forge?(seat.id===p.id?structuredClone(seat.forge):{stage:seat.forge.stage,cost:seat.forge.cost,dueRound:seat.forge.dueRound}):null,mana:seat.mana,manaMax:seat.manaMax,fatigue:seat.fatigue,pendingApprenticeTargets:seat.id===p.id?pendingApprentices(room,seat).map(c=>c.uid):[],pendingDiscard:seat.id===p.id?seat.pendingDiscard||0:0,mulligansLeft:seat.id===p.id?seat.mulligansLeft:undefined,mulliganReady:seat.mulliganReady,mulliganStartedAt:seat.id===p.id?seat.mulliganStartedAt:undefined,hand:seat.id===p.id?seat.hand:undefined,
    reserve:seat.reserve?.map(c=>({...c,...keywordPresentation(c,seat.id===p.id||reveal),monkMode:seat.id===p.id||reveal?c.monkMode:undefined,sealChoices:seat.id===p.id||reveal?c.sealChoices:undefined,auraLane:seat.id===p.id||reveal?c.auraLane:undefined,auraKeywords:seat.id===p.id||reveal?c.auraKeywords:undefined,effects:seat.id===p.id||reveal?effects(c):effects({...c,auraKeywords:[]}),effectiveAttack:attack(c,room,seat.id===p.id||reveal?seat.formation.indexOf(c.uid):-1),owner:seat.id})),emanation:seat.emanation||[],
    taunts:seat.id===p.id||reveal?seat.taunts||{}:{},formation:seat.id===p.id||reveal?seat.formation:seat.formation.map(uid=>seat.reserve.some(c=>c.uid===uid&&(c.anchor||c.sleep))?uid:null),ready:seat.ready,voted:seat.vote!==null,
    prepared:room.players.flatMap(caster=>studyPrepared(caster).filter(item=>item.targetSide===seat.id).map(item=>({lane:item.lane,echo:Boolean(item.echo),caster:caster.id,refund:!item.echo&&caster.id===p.id&&item.paidRound===room.round&&room.phase==='prep'&&room.turn===p.id?Math.min(item.paid||0,Math.max(0,caster.manaMax-caster.mana)):0,card:reveal||caster.id===p.id||!item.hidden?item.card:null,hidden:!reveal&&caster.id!==p.id&&item.hidden})))
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
  if(room.phase==='forging')return room.turn===bot.id?{type:'forgeChoice',optionId:bot.forge.stage==='durability'?'resistente':'precisa'}:null;
  if(bot.pendingDiscard&&bot.hand.length)return {type:'discard',cardId:[...bot.hand].sort((a,b)=>b.cost-a.cost)[0].uid};
  if(room.phase==='prep'){
    if(room.turn!==bot.id)return null;
    const pending=pendingApprentices(room,bot)[0];if(pending){const target=other(room,bot.id).reserve.filter(alive).sort((a,b)=>(a.health-a.damage)-(b.health-b.damage))[0];return {type:'apprenticeTarget',cardId:pending.uid,targetId:target.uid};}
    const weapon=(bot.weapons||[]).find(w=>w.durability>0),equipTarget=bot.reserve.find(c=>alive(c)&&!c.equipment);if(weapon&&equipTarget&&bot.mana>=1)return {type:'equip',cardId:weapon.uid,targetId:equipTarget.uid};
    const handWeapon=bot.hand.find(c=>c.type==='equipment'&&c.cost<=bot.mana);if(handWeapon)return {type:'play',cardId:handWeapon.uid};
    const creatures=bot.hand.filter(card=>card.type==='creature'&&card.cost<=bot.mana&&reserveSize(bot)<8).sort((a,b)=>a.cost-b.cost);
    if(creatures.length){const card=creatures[0];if(effects(card).some(e=>e.timing==='on_enter'&&e.target==='any_creature')){const target=other(room,bot.id).reserve.filter(alive).sort((a,b)=>effects(b).length-effects(a).length||b.attack-a.attack)[0]||card;return {type:'play',cardId:card.uid,targetId:target.uid};}if(effects(card).some(e=>e.op==='bound_spell_damage')){const target=other(room,bot.id).reserve.filter(alive).sort((a,b)=>(a.health-a.damage)-(b.health-b.damage))[0];return {type:'play',cardId:card.uid,...(target?{targetId:target.uid}:{})};}const entry=effects(card).find(e=>e.timing==='on_enter'&&e.target==='chosen_allied_creature'),target=entry?[...bot.reserve.filter(c=>alive(c)&&!effects(c).some(e=>e.op===entry.keyword)),card].sort((a,b)=>b.attack-a.attack)[0]:null;return {type:'play',cardId:card.uid,...(target?{targetId:target.uid}:{})};}
    const enemy=other(room,bot.id);
    for(const spell of bot.hand.filter(card=>card.type!=='creature'&&card.type!=='equipment'&&card.cost<=bot.mana).sort((a,b)=>a.cost-b.cost)){
      const kind=targetKind(spell),op=effect(spell)?.op;if(spell.positionOnly){const side=spell.enemyOnly||op==='anchor'?enemy:bot;const lane=[0,1,2].find(l=>!bot.prepared.some(x=>x.targetSide===side.id&&x.lane===l));if(lane!==undefined)return {type:'play',cardId:spell.uid,mode:'lane',lane,targetSide:side.id};continue;}
      if(op==='ally_attack_damage'){const source=bot.reserve.filter(alive).sort((a,b)=>attack(b,room,bot.formation.indexOf(b.uid))-attack(a,room,bot.formation.indexOf(a.uid)))[0],target=enemy.reserve.filter(alive).sort((a,b)=>(a.health-a.damage)-(b.health-b.damage))[0];if(source&&target&&attack(source,room,bot.formation.indexOf(source.uid))>0)return {type:'play',cardId:spell.uid,mode:'direct',sourceId:source.uid,targetId:target.uid};continue;}
      if(kind==='any-creature'){const target=bot.reserve.filter(alive).find(c=>c.attack>0&&c.attack<c.health);if(target)return {type:'play',cardId:spell.uid,mode:'direct',targetId:target.uid};continue;}
      if(kind==='any')return {type:'play',cardId:spell.uid,mode:'direct',targetId:'patron:'+enemy.id};
      if(kind==='self')return {type:'play',cardId:spell.uid,mode:'direct'};
      if(kind==='enemy-board'&&enemy.reserve.some(alive))return {type:'play',cardId:spell.uid,mode:'direct'};
      if(kind==='enemy'){const candidates=enemy.reserve.filter(c=>alive(c)&&(!spell.reserveOnly||!enemy.emanation.includes(c.uid))&&(!Number.isFinite(effect(spell)?.min_attack)||attack(c,room,-1)>=effect(spell).min_attack));if(candidates.length){const target=candidates.sort((a,b)=>(a.health-a.damage)-(b.health-b.damage))[0];return {type:'play',cardId:spell.uid,mode:'direct',targetId:target.uid};}}
      if(kind==='friendly-or-patron'&&(bot.patron.hp<bot.patron.maxHp||bot.reserve.some(c=>alive(c)&&c.damage>0)))return {type:'play',cardId:spell.uid,mode:'direct',targetId:bot.patron.hp<bot.patron.maxHp?'patron':bot.reserve.find(c=>alive(c)&&c.damage>0).uid};
      if(kind==='friendly'){const target=op==='heal'?bot.reserve.find(c=>alive(c)&&c.damage>0):bot.reserve.find(alive);if(target)return {type:'play',cardId:spell.uid,mode:'direct',targetId:target.uid};}
    }
    return {type:'endPrep'};
  }
  if(room.phase==='vote')return bot.vote===null?{type:'vote',fight:bot.reserve.some(c=>alive(c)&&!bot.emanation.includes(c.uid))}:null;
  if(room.phase==='formation'){
    if(forceWindowActive(room)){
      const enemy=other(room,bot.id),v=bot.reserve.find(c=>alive(c)&&!c.sleep&&!bot.emanation.includes(c.uid)&&effects(c).some(e=>e.op==='force_opponent'));
      if(!v||!room.forceWindow.owners.includes(bot.id))return null;
      const lane=bot.formation.indexOf(v.uid),prey=enemy.reserve.find(c=>alive(c)&&!c.sleep&&!c.anchor&&!enemy.emanation.includes(c.uid)&&!enemy.formation.includes(c.uid));
      if(lane<0){const open=bot.formation.findIndex((uid,l)=>!uid&&!enemy.formation[l]);return open>=0?{type:'assign',lane:open,cardId:v.uid}:null;}
      return prey&&!enemy.formation[lane]?{type:'forceOpponent',cardId:v.uid,targetId:prey.uid}:null;
    }
    if(bot.ready)return null;
    const unused=bot.reserve.filter(c=>alive(c)&&!c.sleep&&!bot.emanation.includes(c.uid)&&!bot.formation.includes(c.uid)).sort((a,b)=>b.attack-a.attack);
    const open=bot.formation.findIndex(uid=>!uid);
    const ariete=bot.formation.map(uid=>findCreature(bot,uid)).find(c=>c&&!c.sleep&&effects(c).some(e=>e.op==='optional_reveal_attack')&&c.revealPaymentRound!==room.round);if(ariete)return {type:'revealPayment',cardId:ariete.uid,pay:bot.mana>=effects(ariete).find(e=>e.op==='optional_reveal_attack').cost};
    const hunter=bot.formation.map(uid=>findCreature(bot,uid)).find(c=>c&&!c.sleep&&effects(c).some(e=>e.op==='force_opponent')&&!other(room,bot.id).formation[bot.formation.indexOf(c.uid)]),prey=other(room,bot.id).reserve.find(c=>alive(c)&&!c.sleep&&!c.anchor&&!other(room,bot.id).emanation.includes(c.uid)&&!other(room,bot.id).formation.includes(c.uid));if(hunter&&prey&&forceWindowActive(room))return {type:'forceOpponent',cardId:hunter.uid,targetId:prey.uid};
    const pressure=bot.emanation.map(uid=>findCreature(bot,uid)).find(c=>effects(c).some(e=>e.op==='lane_keyword_aura'||e.op==='lane_health_aura'&&e.choose_lane)&&!Number.isInteger(c.auraLane));if(pressure)return {type:'pressureLane',cardId:pressure.uid,lane:0};
    const sealer=bot.formation.map(uid=>findCreature(bot,uid)).find(c=>c&&!c.sleep&&effects(c).some(e=>e.op==='paired_seals')&&!c.sealChoices);if(sealer)return {type:'sealLanes',cardId:sealer.uid,allyLane:0,enemyLane:0};
    const monk=bot.formation.map(uid=>findCreature(bot,uid)).find(c=>c&&!c.sleep&&effects(c).some(e=>e.op==='monk_choice')&&!c.monkMode);if(monk)return {type:'monkChoice',cardId:monk.uid,mode:'weaken'};
    const protocol=bot.formation.map(uid=>findCreature(bot,uid)).find(c=>c&&!c.sleep&&effects(c).some(e=>e.op==='combat_protocol')&&!c.protocolMode);if(protocol)return {type:'protocol',cardId:protocol.uid,mode:'assault'};
    const taunter=bot.formation.map(uid=>findCreature(bot,uid)).find(c=>c&&effects(c).some(e=>e.op==='taunt')&&bot.taunts?.[c.uid]===undefined);if(taunter){const max=effects(taunter).find(e=>e.op==='taunt')?.maxAdditional||1,lanes=[0,1,2].filter(l=>Math.abs(l-bot.formation.indexOf(taunter.uid))===1&&!Object.values(bot.taunts||{}).some(value=>tauntLanes(value).includes(l))).slice(0,max);if(lanes.length)return {type:'taunt',cardId:taunter.uid,lanes};}
    return open>=0&&unused.length?{type:'assign',lane:open,cardId:unused[0].uid}:{type:'ready'};
  }
  return null;
}
