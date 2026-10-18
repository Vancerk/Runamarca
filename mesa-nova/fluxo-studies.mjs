import {randomUUID} from 'node:crypto';
export const STUDY_STAGES=[
 {threshold:10,cost:3,name:'Otimização Etérea',text:'Até o fim da partida, suas magias custam 1 Éter a menos.'},
 {threshold:20,cost:6,name:'Conhecimento Compartilhado',text:'Até o fim da partida, suas magias em casas de combate também afetam uma casa adjacente à sua escolha. Não inclui Emanação ou habilidades.'},
 {threshold:30,cost:9,name:'Grimório Completo',text:'Veja seu deck original. Crie cópias de até 5 cartas e jogue até 2 dessas cópias de custo até 4 sem pagar Éter.'}
];
export function initStudies(p){
 delete p.study;delete p.studyBook;delete p.studyPreview;
 if(p.patron?.affinity!=='fluxo')return;
 p.study={seenIds:[],total:p.deck.length,activated:[],discount:false,sharing:false,centerNeighbor:2,positionEffects:[]};
 p.originalDeck=p.deck.map(c=>({...structuredClone(c),studyOriginalId:c.uid}));
 for(const c of p.deck)c.studyOriginalId=c.uid;
}
export function seeStudyCard(p,c){if(p.study&&c.studyOriginalId&&!p.study.seenIds.includes(c.studyOriginalId))p.study.seenIds.push(c.studyOriginalId);}
// The starting hand contributes five; replacing it never adds extra progress.
export function settleStudyOpening(p){if(p.study)p.study.seenIds=p.hand.filter(c=>c.studyOriginalId).map(c=>c.studyOriginalId);}
export function studyStage(p){return p.study?STUDY_STAGES.find(s=>!p.study.activated.includes(s.threshold)):null;}
export function adjacentLane(lane,choice){if(lane===0)return 1;if(lane===2)return 1;if(lane===1&&[0,2].includes(choice))return choice;throw Error('Escolha uma casa adjacente.');}
export function studyCardCost(p,card){
 if(p.studyBook?.instantIds.includes(card.uid))return 0;
 return Math.max(0,card.cost-(p.study?.discount&&!['creature','equipment'].includes(card.type)?1:0));
}
export function studyPrepared(p){return p.prepared.flatMap(prep=>{
 if(!p.study?.sharing||!(prep.card.effects||[]).some(e=>localOps.has(e.op)||['push_right','mirage'].includes(e.op)))return [prep];
 const lane=adjacentLane(prep.lane,prep.sharedLane??p.study.centerNeighbor);
 return [prep,{...prep,lane,echo:true,sourcePrep:prep,card:{...prep.card,uid:prep.card.uid+'-eco'}}];
});}
const localOps=new Set(['damage','conditional_damage','heal','attack_modifier','stat_buff','sleep','anchor','barrier','return_to_hand','silence','grant_keyword','invert_stats','volatile_project','rune_coating','defeat']);
const persistentOps=new Set(['attack_modifier','stat_buff','sleep','anchor','barrier','grant_keyword','rune_coating']);
export function localSpell(card){return {...card,effects:(card.effects||[]).filter(e=>localOps.has(e.op))};}
export function rememberPositionSpell(room,p,spell,target,side,lane){
 if(!p.study||lane<0||!target)return;
 const effects=(spell.effects||[]).filter(e=>persistentOps.has(e.op));if(!effects.length)return;
 p.study.positionEffects.push({targetId:target.uid,sideId:side.id,lane,round:room.round,spell:{...structuredClone(spell),effects}});
 if(p.study.positionEffects.length>80)p.study.positionEffects.shift();
}
export function existingPositionSpells(room,p){
 return (p.study?.positionEffects||[]).flatMap(entry=>{
 const side=room.players.find(s=>s.id===entry.sideId),target=side?.reserve.find(c=>c.uid===entry.targetId&&c.damage<c.health);
 if(!target||!side.formation.includes(target.uid))return [];
 const effects=entry.spell.effects.filter(e=>e.op==='sleep'?Boolean(target.sleep):e.op==='anchor'?Boolean(target.anchor):e.op==='barrier'?Boolean(target.attackBarrier):e.op==='rune_coating'?Boolean(target.runeCoating):e.op==='grant_keyword'?target.grantedKeywords?.includes(e.keyword):e.op==='stat_buff'?true:e.op==='attack_modifier'?e.permanent||entry.round===room.round:false);
 return effects.length?[{...entry,lane:side.formation.indexOf(target.uid),spell:{...entry.spell,effects}}]:[];
 });
}
export function activateStudies(room,p,data,{emit,pushLog,applyExisting}){
 const stage=studyStage(p);if(!stage)throw Error('Todos os estudos já foram concluídos.');
 if(p.study.seenIds.length<stage.threshold)throw Error('Ainda faltam cartas estudadas para este avanço.');
 if(p.mana<stage.cost)throw Error('Éter insuficiente para este avanço.');
 let copies=[],instantIds=[];
 if(stage.threshold===20&&![0,2].includes(data.centerNeighbor))throw Error('Escolha uma casa adjacente para as magias da casa central.');
 if(stage.threshold===30){
  if(!Array.isArray(data.originalIds)||data.originalIds.length>5||new Set(data.originalIds).size!==data.originalIds.length)throw Error('Escolha até 5 cartas do deck original.');
  const originals=data.originalIds.map(id=>p.originalDeck.find(c=>c.studyOriginalId===id));if(originals.some(c=>!c))throw Error('Carta fora do deck original.');
  const instant=data.instantIndices||[];if(!Array.isArray(instant)||instant.length>2||new Set(instant).size!==instant.length||instant.some(i=>!Number.isInteger(i)||!originals[i]||originals[i].cost>4))throw Error('Escolha até 2 das cópias, com custo impresso até 4, para usar agora.');
  copies=originals.map(c=>{const copy={...structuredClone(c),uid:randomUUID(),owner:p.id,damage:0,attackMod:0};delete copy.studyOriginalId;delete copy.quantity;return copy;});instantIds=data.chooseInstant===true?copies.filter(c=>c.cost<=4).map(c=>c.uid):instant.map(i=>copies[i].uid);
 }
 p.mana-=stage.cost;p.study.activated.push(stage.threshold);
 if(stage.threshold===10)p.study.discount=true;
 if(stage.threshold===20){p.study.sharing=true;p.study.centerNeighbor=data.centerNeighbor;applyExisting?.();}
 if(stage.threshold===30){delete p.studyPreview;p.studyBook={cards:copies,instantIds,remaining:data.chooseInstant===true?2:instantIds.length,round:room.round,preparation:p.preparationSerial};if(!instantIds.length)finishStudyBook(room,p,{emit,pushLog});}
 emit(room,'patron_power',{playerId:p.id,powerId:'estudos-avancados',name:stage.name,op:'study',threshold:stage.threshold});pushLog(room,p.name+' concluiu '+stage.name+'.',p.id);
}
export function consumeStudyCopy(room,p,card,{emit,pushLog}){
 if(!p.studyBook?.instantIds.includes(card.uid))return;
 p.studyBook.cards=p.studyBook.cards.filter(c=>c.uid!==card.uid);p.studyBook.instantIds=p.studyBook.instantIds.filter(id=>id!==card.uid);
 p.studyBook.remaining=Math.max(0,(p.studyBook.remaining??2)-1);
 if(!p.studyBook.instantIds.length||!p.studyBook.remaining)finishStudyBook(room,p,{emit,pushLog});
}
export function finishStudyBook(room,p,{emit,pushLog}){
 delete p.studyPreview;
 if(!p.studyBook)return;
 for(const c of p.studyBook.cards){if(p.hand.length<9){p.hand.push(c);emit(room,'generated',{playerId:p.id,cardId:c.uid});}else{p.discard.push(c);emit(room,'burn',{playerId:p.id,name:c.name});pushLog(room,c.name+' foi ao Nartvanyr: mão cheia.',p.id);}}
 delete p.studyBook;
}
export function previewStudyBook(p,data){
 if(data.close){delete p.studyPreview;return;}
 if(studyStage(p)?.threshold!==30||p.study.seenIds.length<30||p.mana<9)throw Error('O Grimório ainda não está disponível.');
 const ids=data.originalIds;if(!Array.isArray(ids)||ids.length>5||new Set(ids).size!==ids.length)throw Error('Escolha até 5 cartas.');
 const cards=ids.map(id=>p.originalDeck.find(c=>c.studyOriginalId===id));if(cards.some(c=>!c))throw Error('Carta fora do deck original.');
 p.studyPreview={cards:structuredClone(cards)};
}
export function studyView(p,self){if(!p.study)return null;const stage=studyStage(p);return {seen:p.study.seenIds.length,total:p.study.total,activated:p.study.activated,discount:p.study.discount,sharing:p.study.sharing,centerNeighbor:p.study.centerNeighbor,stage,originalCards:self&&stage?.threshold===30?p.originalDeck:undefined,book:self?p.studyBook:undefined,grimoire:p.studyBook?{phase:'casting',cards:p.studyBook.cards,remaining:p.studyBook.remaining}:p.studyPreview?{phase:'selecting',cards:p.studyPreview.cards}:null};}
