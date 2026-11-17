import {createGuideLedger,chooseGuide,observeGuideCombat,guideBefore,guideAfterAction,consumeGuide,TUTORIAL_OPPONENT_HP} from './tutorial-guidance.mjs';
import {roles,laterDuelCatalog,arrangement} from './tutorial-curriculum.mjs';
import {makeRoom,join,act,restoreTutorialTimers} from './game.mjs';
import {createTutorialSession} from './tutorial-session.mjs';
import {createBotScheduler} from './bot-scheduler.mjs';
import {roomIsPaused,roomNow} from './room-timeline.mjs';

const deny=(code,message)=>{throw Object.assign(Error(message),{code});};
const lessonOrder=['welcome','resources','reserve','vote','formation','outcome','patron-damage','repeat'];
const alive=c=>c&&c.damage<c.health;
const humanCards=[
 ['Batedor de treino',1,2,4],['Vigia de treino',2,3,5],['Guarda de treino',3,4,6],['Veterano de treino',4,5,6],
 ['Aprendiz do pátio',1,1,3],['Dupla de treino',2,2,4],['Reforço do pátio',3,3,5],['Instrutor de treino',4,4,7],
];
export function firstDuelCatalog(base){
 const art=base.decks.flatMap(d=>d.cards).filter(c=>c.type==='creature');
 const makeDeck=(side,npc)=>({id:'tutorial-'+side,name:npc?'Treino do adversário':'Sua primeira caçada',affinity:'forja',
  patron:{...structuredClone(base.decks.find(d=>d.affinity==='forja').patron),name:npc?'Combatente fanfarrão':'Seu Patrono',powers:[],text:'Patrono do primeiro treino. Começa com 16 de vida.'},
  cards:humanCards.map(([name,cost,attack,health],i)=>({id:`TUT-${side}-${i+1}`,name:npc?`Recruta de treino ${i+1}`:name,
   type:'creature',affinity:'forja',rarity:'lacaio',subtype:'Treino',quantity:i===7?2:4,cost:npc?1:cost,attack:npc?1:attack,health:npc?2:health,
   effects:[],text:'Criatura de treino. Ataque à esquerda; vida à direita.',speech:'Pronto para o treino.',
   narrative:'Carta preparada para aprender o ciclo básico do RunaMarca.',image:art[i%art.length]?.image||null,imageKind:'illustration'}))});
 return {...base,decks:[makeDeck('H',false),makeDeck('N',true)]};
}

function arrange(player,opening,upcoming){
 const pool=[...player.hand,...player.deck].sort((a,b)=>a.modelId.localeCompare(b.modelId));
 const take=id=>{const index=pool.findIndex(c=>c.modelId===id);if(index<0)throw Error('Carta de treino ausente: '+id);return pool.splice(index,1)[0];};
 player.hand=opening.map(take);player.deck=[...upcoming.map(take),...pool].reverse();
}

export const createFirstTutorial=options=>createGuidedTutorial({...options,duel:1});
export function tutorialCatalog(base,duel){return duel===1?firstDuelCatalog(base):laterDuelCatalog(base,duel,firstDuelCatalog(base));}
export function createGuidedTutorial({code,name,catalog:base,duel=1,first=true,restore=null,clock,delay=850,guidanceCounts={},opponentHealth=null,onChange=()=>{}}){
 if(![1,2,3].includes(duel)||restore&&restore.duel!==duel)deny('TUTORIAL_DUEL','Duelo inválido.');
 const catalog=tutorialCatalog(base,duel),room=restore?structuredClone(restore.room):makeRoom(code,name),player=room.players[0],npc=restore?room.players[1]:join(room,roles[duel]);npc.bot=true;
 let controller,schedule,directing=false,instruction=restore?.instruction||null,lastCombat=0,closed=false,busy=1;
 const shown=new Set(restore?.shown),acknowledged=new Set(restore?.acknowledged),receipts=new Map(restore?.receipts),coach=restore?.coach||{lastCombat:0,npcSpellRound:0};
 const guidance=createGuideLedger(restore?.guidance,guidanceCounts);
 const initialHp=16,opponentHp=opponentHealth??TUTORIAL_OPPONENT_HP[duel];
 if(!Number.isInteger(opponentHp)||opponentHp<1||opponentHp>100)deny('TUTORIAL_HEALTH','Vida de treino inválida.');

 function chooseInstruction(){return chooseGuide({g:guidance,room,player,npc,duel,completed:controller.view().tutorial.goals});}
 function direct(){
  if(!controller||directing||closed||busy)return;
  directing=true;
  try{
   observeGuideCombat(guidance,room,player,npc);
   // An older saved duel can hold an explanation already practised three
   // times elsewhere in this campaign. Do not resurrect it when returning.
   if(instruction?.kind==='explain'&&instruction.concepts.every(c=>(guidance.counts[c]||0)>=3))instruction=null;
   if(room.phase==='finished'){instruction=null;}
   else if(!instruction||instruction.kind!=='explain'){const next=chooseInstruction();instruction=next;if(next){shown.add(next.id);if(next.kind==='explain')controller.setPaused(true);}}
   lastCombat=room.combatCount||lastCombat;
  }finally{directing=false;}
  if(!busy)onChange();if(instruction?.kind!=='explain'&&!roomIsPaused(room)&&room.phase!=='finished')schedule?.(room);
 }
 room.onChange=direct;
 controller=createTutorialSession({room,player,catalog,duel,clock,turnsTimed:false,restore:restore?.control});
 if(!restore){
 // Private setup, before the first state is exposed. The live catalogue is untouched.
 act(room,player,{type:'deck',deckId:catalog.decks[0].id},catalog);
 act(room,npc,{type:'deck',deckId:catalog.decks[1].id},catalog);
 room.first=room.coinWinner=first?player.id:npc.id;room.controlledDraws=true;
 for(const [p,side] of [[player,'H'],[npc,'N']]){const a=arrangement(duel,side);arrange(p,a.opening,a.next);}
 room.events=room.events.filter(e=>e.type!=='coin');
 for(const event of room.events){if(event.type==='first')event.playerId=room.first;if(event.type==='opening'){const p=room.players.find(p=>p.id===event.playerId);event.count=p.hand.length;event.cardIds=p.hand.map(c=>c.uid);}}
 room.log=[{message:first?'Treino guiado: você faz a primeira preparação.':'Treino guiado: você faz a segunda preparação.',round:1,phase:'mulligan',turn:null}];
 act(room,npc,{type:'confirmMulligan'},catalog);if(duel===1)act(room,player,{type:'confirmMulligan'},catalog);
 player.patron.hp=player.patron.maxHp=initialHp;npc.patron.hp=npc.patron.maxHp=opponentHp;
 player.patron.text=`Seu Patrono começa com ${initialHp} de vida.`;npc.patron.text=`O rival começa com ${opponentHp} de vida.`;
 }else{room.botTimer=null;room.botThinking=false;room.botReschedule=false;room.revision++;restoreTutorialTimers(room);}

 function npcDecision(){
  if(closed||roomIsPaused(room)||room.phase==='finished')return null;
  if(room.phase==='prep'&&room.turn===npc.id){
   const card=npc.hand.find(c=>c.type==='creature'&&c.cost<=npc.mana);
   if(npc.reserve.filter(alive).length<(duel===3?2:1)&&card)return {type:'play',cardId:card.uid};
   const spell=npc.hand.find(c=>c.type==='direct_spell'&&c.cost<=npc.mana),target=npc.reserve.find(alive);
   if(duel===3&&spell&&target&&coach.npcSpellRound!==room.round)return room.round%2?{type:'play',cardId:spell.uid,mode:'lane',lane:(room.round-1)%3,targetSide:npc.id}:{type:'play',cardId:spell.uid,mode:'direct',targetId:target.uid};
   return {type:'endPrep'};
  }
  if(room.phase==='vote')return player.vote!==null&&npc.vote===null?{type:'vote',fight:true}:null;
  if(room.phase==='formation'&&!npc.ready){
   // Let the learner choose without background formation revisions. The NPC's
   // lane depends only on the round, never on the learner's secret positions.
   if(!player.ready)return null;
   const units=npc.reserve.filter(alive).slice(0,duel===3?2:1),card=units.find(c=>!npc.formation.includes(c.uid));
   const lane=[0,1,2].map(i=>(room.round-1+i)%3).find(i=>!npc.formation[i]);
   if(card&&lane!==undefined)return {type:'assign',cardId:card.uid,lane};
   return {type:'ready'};
  }
  return null;
 }
 schedule=createBotScheduler({bridge:{nextAction:async()=>npcDecision(),clear:()=>{}},isActive:()=>!closed&&room.phase!=='finished',
  act:(_room,_npc,action)=>{busy++;try{const spell=npc.hand.find(c=>c.uid===action.cardId)?.type?.includes('spell');controller.npcAction(action);if(spell)coach.npcSpellRound=room.round;}finally{busy--;if(!busy)direct();}},delay});

 function publicState(){
  const result=controller.view();
  result.inviteToken=null;
  result.tutorial={...result.tutorial,preview:true,instruction:instruction&&{...instruction},
   lessons:(duel===1?lessonOrder:[...shown]).map(id=>({id,complete:acknowledged.has(id)})),
   guided:(guidance.counts.formation||0)<3,trainingCards:true,progressVersion:3,guidance:{version:1,counts:{...guidance.counts}},
   introductionSkipped:true,checkpoint:controller.checkpoint().completed};
  return result;
 }
 const validate=request=>{
  if(!request||typeof request.id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(request.id)||!request.action||typeof request.action.type!=='string')deny('TUTORIAL_REQUEST','Comando inválido.');
  if(!Number.isInteger(request.version)||request.version<0)deny('TUTORIAL_REQUEST','Versão inválida.');
  if(request.version!==controller.view().tutorial.version&&!['tutorialPause','tutorialExit','leave'].includes(request.action.type))deny('TUTORIAL_STALE','O treino foi atualizado. Aguarde a mesa e tente novamente.');
 };
 function execute(actor,request){
  if(actor!==player)deny('TUTORIAL_OWNER','Esta sessão de treino pertence a outro participante.');
  const fingerprint=JSON.stringify(request),old=receipts.get(request?.id);
  if(old){if(old!==fingerprint)deny('TUTORIAL_CONFLICT','Identificador já utilizado.');return publicState();}
  validate(request);
  const action=request.action;
  // Pause and exit never spend a resource or acknowledge a lesson. Honour the
  // explicit intent on the current state even if an NPC event just advanced it.
  if(action.type==='tutorialPause'){
   if(instruction?.kind!=='explain')controller.command(player,{...request,version:controller.view().tutorial.version});
  }else if(action.type==='tutorialContinue'){
   if(!instruction||instruction.kind!=='explain'||action.sceneId!==instruction.id)deny('TUTORIAL_SCENE','Essa explicação já mudou. Atualize a mesa.');
   const previous=instruction;instruction=null;acknowledged.add(previous.id);
   try{controller.command(player,{...request,action:{type:'tutorialResume'}});}catch(error){instruction=previous;acknowledged.delete(previous.id);throw error;}
   consumeGuide(guidance,previous);
  }else if(action.type==='tutorialExit'||action.type==='leave'){
   controller.command(player,{...request,version:controller.view().tutorial.version,action:{type:'tutorialExit'}});closed=true;instruction=null;
  }else{
   if(instruction?.kind==='explain')deny('TUTORIAL_INSTRUCTION','Leia a explicação e escolha Continuar.');
   if(['reset','spectatorHands','takeSeat','spectate','deck','addBot','removeBot',...(duel===1?['mulligan','confirmMulligan','openingReady']:[])].includes(action.type))deny('TUTORIAL_ACTION','Este treino usa uma abertura preparada.');
   if(duel===1&&action.type==='endPrep'&&!controller.view().tutorial.goals.some(g=>g.id==='play-creature'&&g.complete)&&player.reserve.filter(c=>alive(c)&&!player.emanation.includes(c.uid)).length<8&&player.hand.some(c=>c.type==='creature'&&c.cost<=player.mana))deny('TUTORIAL_FIRST_PLAY','Antes de encerrar esta primeira preparação, coloque uma criatura na reserva.');
   const before=guideBefore(room,player),previous=instruction;
   controller.command(player,request);
   if(guideAfterAction(guidance,previous,before,room,player,action)){for(const concept of previous.concepts)acknowledged.add(concept);instruction=null;}
  }
  receipts.set(request.id,fingerprint);if(receipts.size>128)receipts.delete(receipts.keys().next().value);
  return publicState();
 }
 function command(actor,request){busy++;try{execute(actor,request);}finally{busy--;if(!busy)direct();}return publicState();}
 busy=0;direct();
 return Object.freeze({room,player,catalog,view:publicState,command,npcDecision,
  dispose(){if(!closed){closed=true;instruction=null;controller.dispose();}},
  snapshot(){const raw={...room,onChange:null,botTimer:null,botThinking:false,botReschedule:false,inviteToken:null,players:room.players.map(p=>({...p,token:null}))};return {schema:2,duel,room:JSON.parse(JSON.stringify(raw)),control:controller.snapshot(),instruction,shown:[...shown],acknowledged:[...acknowledged],receipts:[...receipts],coach,guidance:structuredClone(guidance)};},
  halt(){if(controller.view().tutorial.status==='active')controller.setPaused(true);},
  checkpoint(){return {...controller.checkpoint(),lessons:[...acknowledged],guidanceCounts:{...guidance.counts},at:roomNow(room)};}});
}
