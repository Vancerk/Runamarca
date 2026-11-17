// Server-owned teaching opportunities. Presentation and retries never consume one.
export const GUIDE_LIMIT=3;
export const TUTORIAL_OPPONENT_HP=Object.freeze({1:8,2:12,3:16});
const alive=c=>c&&c.damage<c.health;
export function mergeGuideCounts(...sources){
 const counts={};for(const source of sources)for(const [key,value] of Object.entries(source||{})){
  if(/^[a-z-]+$/.test(key)&&Number.isInteger(value)&&value>=0)counts[key]=Math.max(counts[key]||0,Math.min(GUIDE_LIMIT,value));
 }return counts;
}
export function createGuideLedger(saved,shared){
 return {counts:mergeGuideCounts(saved?.counts,shared),used:[...(saved?.used||[])],seen:[...(saved?.seen||[])],lastPlay:saved?.lastPlay||null,lastCombat:saved?.lastCombat||0,hp:saved?.hp||null,damage:saved?.damage||null};
}
const opportunity=(room,concept,suffix='')=>`${room.code}:${room.round}:${room.phase}:${concept}:${suffix}`;
const available=(g,room,concept,suffix='')=>(g.counts[concept]||0)<GUIDE_LIMIT&&!g.used.includes(opportunity(room,concept,suffix));
function lesson(g,room,{concept,also=[],kind='action',title,text,focus,cardId,targetId,lanes,action,details,maxScale}){
 const concepts=[concept,...also.filter(c=>available(g,room,c))];
 return {id:concept,key:opportunity(room,concept),concepts,opportunities:Object.fromEntries(concepts.map(c=>[c,opportunity(room,c)])),kind,title,text,focus,cardId,targetId,lanes,action,details,maxScale};
}
export function observeGuideCombat(g,room,player,npc){
 const hp={self:player.patron?.hp,rival:npc.patron?.hp};
 if((room.combatCount||0)>g.lastCombat){
  if(g.hp&&(hp.self<g.hp.self||hp.rival<g.hp.rival))g.damage={combat:room.combatCount,side:hp.rival<g.hp.rival?'rival':'self',hp};
  g.lastCombat=room.combatCount;g.hp=hp;
 }else if(!g.hp)g.hp=hp;
}
export function chooseGuide({g,room,player,npc,duel,completed}){
 if(room.phase==='finished')return null;
 const offer=(concept,rest)=>available(g,room,concept)?lesson(g,room,{concept,...rest}):null;
 const has=id=>completed.some(c=>c.id===id&&c.complete),mine=room.phase==='prep'&&room.turn===player.id;
 const reserve=player.reserve.filter(alive),ordinary=reserve.filter(c=>!player.emanation.includes(c.uid)),space=ordinary.length<8;
 const afford=id=>player.hand.find(c=>c.modelId===id&&c.cost<=player.mana&&(c.type!=='creature'||space));
 if(duel===1&&!g.seen.includes('welcome')&&available(g,room,'objective'))return lesson(g,room,{concept:'objective',kind:'explain',title:'Sua primeira caçada',text:'Reduza a vida do Patrono rival a zero para vencer.',focus:'rival-heart',maxScale:2.1});
 if(g.damage&&(g.counts['patron-damage']||0)<GUIDE_LIMIT){
  const side=g.damage.side,hp=side==='rival'?npc.patron.hp:player.patron.hp;
  return lesson(g,room,{concept:'patron-damage',kind:'explain',title:'Veja a vida do Patrono',text:`Este coração agora marca ${Math.max(0,hp)}. Um ataque sem defensor alcança o Patrono.`,focus:side==='rival'?'rival-heart':'self-heart',maxScale:2.1,details:{combat:g.damage.combat}});
 }
 if(room.phase==='mulligan'&&!player.mulliganReady)return offer('opening',{title:'Escolha sua mão',text:`Troque até ${room.first===player.id?3:4} cartas, se quiser. Depois confirme sua mão.`,focus:'opening',action:'confirmMulligan'});
 if(mine){
  // The reserve explanation follows the real placement. It is also a reminder
  // of the next optional action, rather than a second modal confirmation.
  if(g.lastPlay?.round===room.round&&g.lastPlay?.phase==='prep'&&available(g,room,'end-preparation')){
   const card=reserve.find(c=>c.uid===g.lastPlay.cardId);
   const mana=available(g,room,'mana')?` Você tem ${player.mana} de mana disponível.`:'';
   const explain=card&&available(g,room,'reserve')?`${card.name} aguarda aqui até o combate.`:'Sua jogada foi aplicada.';
   return offer('end-preparation',{also:[...(card?['reserve']:[]),'mana'],title:card?'Sua criatura está na reserva':'Escolha a próxima jogada',text:explain+mana+' Jogue mais cartas ou encerre sua preparação.',focus:'end-preparation',cardId:card?.uid,action:'endPrep'});
  }
  let card;
  if((card=afford('T3-SUPPORT'))&&available(g,room,'emanation'))return offer('emanation',{title:'Investir em apoio',text:'Arraste o Engenheiro para uma vaga de Emanação. Ele apoia a segunda casa. Você também pode optar por colocá-lo na reserva.',focus:'emanation-action',cardId:card.uid,action:'emanation'});
  if(duel===3&&has('emanation')&&player.mana>=2&&player.patron.usedPowers?.['forjar-armadura']!==room.round&&available(g,room,'patron-power'))return offer('patron-power',{title:'Um poder do Patrono',text:'Hora da Bigorna custa 2 e dá 1 de Vida Extra. Use o poder se quiser investir em proteção.',focus:'powers',action:'patronPower'});
  if((card=afford(duel===2?'T2-BUFF':'T3-BUFF'))&&ordinary.length){
   if(available(g,room,'direct-spell')&&(!has('direct-spell')||!available(g,room,'prepare-spell')))return offer('direct-spell',{title:'Um efeito imediato',text:'Escolha a magia e um aliado para receber +1/+1 agora. Confira o custo antes de jogar.',focus:'direct-action',cardId:card.uid,targetId:ordinary[0].uid,action:'direct-spell'});
   if(available(g,room,'prepare-spell'))return offer('prepare-spell',{title:'Prepare uma casa',text:'Arraste a magia para uma casa aliada. O efeito espera um aliado nessa posição no combate; todas as casas indicadas são válidas.',focus:'prepare-action',cardId:card.uid,lanes:[0,1,2],action:'prepare-spell'});
  }
  if((card=afford(duel===2?'T2-ENTRY':'T3-ENTRY'))&&available(g,room,'entry'))return offer('entry',{also:['play-creature'],title:'Entrada: ao jogar',text:'Arraste o Anão para a reserva. A Entrada compra uma carta imediatamente, antes do combate.',focus:'play-action',cardId:card.uid,action:'entry'});
  const creature=space&&player.hand.filter(c=>c.type==='creature'&&c.cost<=player.mana).sort((a,b)=>a.cost-b.cost)[0];
  if(creature&&available(g,room,'play-creature'))return offer('play-creature',{also:['mana'],title:'Jogue uma criatura',text:`${available(g,room,'mana')?`Você tem ${player.mana} de mana. `:''}Esta carta custa ${creature.cost}; arraste-a para a reserva. Outra criatura que você possa pagar também vale.`,focus:'play-action',cardId:creature.uid,action:'play-creature'});
  if(available(g,room,'end-preparation')||available(g,room,'mana')){
   const concept=available(g,room,'end-preparation')?'end-preparation':'mana';
   return offer(concept,{also:['mana'],title:'Sua preparação',text:`${available(g,room,'mana')?`Você tem ${player.mana} de mana. `:''}${creature?'Pode jogar outra carta ou encerrar.':'Encerre quando estiver pronto.'}`,focus:'end-preparation',action:'endPrep'});
  }
 }
 if(room.phase==='vote'&&player.vote===null)return offer('vote',{title:'Hora de decidir',text:'Escolha se quer começar o combate. Se ambos recusarem, a preparação continua.',focus:'vote-action',action:'vote'});
 if(room.phase==='formation'&&!player.ready){
  const slots=[0,1,2].filter(i=>!player.formation[i]);
  const units=ordinary.filter(c=>!player.formation.includes(c.uid));
  const prepared=player.prepared.find(p=>p.targetSide===player.id&&slots.includes(p.lane));
  if(prepared&&units.length&&available(g,room,'prepared-target'))return offer('prepared-target',{title:'Um alvo para a magia',text:'Esta casa tem uma magia esperando um aliado. Leve uma criatura até ela se quiser ativar o efeito no combate. Outras posições continuam permitidas.',focus:'formation-action',cardId:units[0].uid,lanes:[prepared.lane],action:'prepared-target',details:{lane:prepared.lane}});
  const gnoll=ordinary.find(c=>c.modelId==='T2-REVEAL'),companion=ordinary.find(c=>c.uid!==gnoll?.uid&&(c.attack+(c.attackMod||0))<=2);
  if(gnoll&&companion&&available(g,room,'revelation')){
   const card=!player.formation.includes(gnoll.uid)?gnoll:!player.formation.includes(companion.uid)?companion:null;
   if(!card||slots.length){const note=offer('revelation',{title:card?'Prepare a Revelação':'Revele sua formação',text:'O Gnoll ganha ataque ao combater com outro aliado de até 2 de ataque. Posicione os dois e encerre, ou escolha outra formação.',focus:card?'formation-action':'confirm-formation',cardId:card?.uid,lanes:slots,action:'revelation',details:{gnoll:gnoll.uid,companion:companion.uid}});note.key+=':'+(card?.uid||'ready');return note;}
  }
  if(slots.length&&units.length&&available(g,room,'formation'))return offer('formation',{title:'Escolha sua posição',text:'Arraste uma criatura da reserva para qualquer casa destacada. A seta mostra uma opção; as outras continuam válidas.',focus:'formation-action',cardId:units[0].uid,lanes:slots,action:'assign'});
  const canConfirm=player.formation.some(Boolean)||!ordinary.length||has('confirm-formation')||duel!==1;
  if(canConfirm)return offer('confirm-formation',{title:'Sua formação está pronta?',text:'Você pode ajustar as posições. Encerre para revelar as formações e começar o confronto.',focus:'confirm-formation',action:'ready'});
 }
 return null;
}
export function guideBefore(room,player){
 return {phase:room.phase,turn:room.turn,round:room.round,eventId:room.eventId,hand:player.hand.map(c=>({uid:c.uid,type:c.type})),formation:[...player.formation],mulliganReady:player.mulliganReady,vote:player.vote,ready:player.ready,mana:player.mana};
}
export function consumeGuide(g,note){
 if(!note)return;
 for(const concept of new Set(note.concepts)){
  const key=note.opportunities[concept];if(!g.used.includes(key)&&(g.counts[concept]||0)<GUIDE_LIMIT){g.counts[concept]=(g.counts[concept]||0)+1;g.used.push(key);}
 }
 if(note.id==='objective'&&!g.seen.includes('welcome'))g.seen.push('welcome');
 if(note.id==='patron-damage')g.damage=null;
}
export function guideAfterAction(g,note,before,room,player,action){
 const played=before.hand.find(c=>c.uid===action.cardId),inReserve=player.reserve.some(c=>c.uid===action.cardId);
 if(action.type==='play'&&played&&(inReserve||player.discard.some(c=>c.uid===action.cardId)||player.prepared.some(p=>p.card.uid===action.cardId)))g.lastPlay={round:before.round,phase:before.phase,cardId:action.cardId};
 if(!note||note.kind!=='action')return false;
 let matched=false;
 switch(note.action){
  case 'play-creature':matched=action.type==='play'&&played?.type==='creature'&&inReserve&&!player.emanation.includes(action.cardId);break;
  case 'entry':matched=action.type==='play'&&inReserve&&room.events.some(e=>e.id>before.eventId&&e.type==='draw'&&e.playerId===player.id);break;
  case 'endPrep':matched=action.type==='endPrep'&&before.phase==='prep'&&before.turn===player.id&&(room.turn!==player.id||room.phase!==before.phase);break;
  case 'assign':matched=action.type==='assign'&&before.phase==='formation'&&before.formation[action.lane]!==action.cardId&&player.formation[action.lane]===action.cardId;break;
  case 'prepared-target':matched=action.type==='assign'&&action.lane===note.details.lane&&before.formation[action.lane]!==action.cardId&&player.formation[action.lane]===action.cardId;break;
  case 'revelation':matched=action.type==='ready'&&!before.ready&&before.formation.includes(note.details.gnoll)&&before.formation.includes(note.details.companion)&&(player.ready||room.phase==='resolving'||room.phase==='finished');break;
  case 'ready':matched=action.type==='ready'&&!before.ready&&(player.ready||room.phase==='resolving'||room.phase==='finished');break;
  case 'vote':matched=action.type==='vote'&&before.vote===null&&(player.vote!==null||room.phase!=='vote');break;
  case 'confirmMulligan':matched=action.type==='confirmMulligan'&&!before.mulliganReady&&player.mulliganReady;break;
  case 'direct-spell':matched=action.type==='play'&&played&&action.mode!=='lane'&&player.discard.some(c=>c.uid===action.cardId)&&room.events.some(e=>e.id>before.eventId&&e.type==='spell'&&e.playerId===player.id);break;
  case 'prepare-spell':matched=action.type==='play'&&action.mode==='lane'&&player.prepared.some(p=>p.card.uid===action.cardId);break;
  case 'emanation':matched=(action.type==='emanate'||action.type==='play'&&action.mode==='emanate')&&player.emanation.includes(action.cardId);break;
  case 'patronPower':matched=action.type==='patronPower'&&player.mana<before.mana;break;
 }
 if(matched)consumeGuide(g,note);return matched;
}
