import {formationKnowledge} from './observation.mjs';
import {fx,hp,atk,alive,healing} from './policy-base.mjs';

export function forcedPullPlan(view,now){
 const own=view.players.find(p=>p.id===view.you),enemy=view.players.find(p=>p.id!==view.you);
 const knowledge=formationKnowledge(view,enemy);
 if(view.phase!=='formation'||!view.forceWindow?.owners?.includes(own.id)||now>=view.forceWindow.until)return {actions:[],reason:'outside-force-window',knowledge};
 const lanes=knowledge.map((state,lane)=>({state,lane})).filter(x=>x.state==='empty'&&!own.formation[x.lane]);
 if(!lanes.length)return {actions:[],reason:knowledge.includes('unknown')?'masked-destination':'no-public-empty-destination',knowledge};
 for(const hunter of own.reserve.filter(c=>alive(c)&&!c.anchor&&!c.sleep&&!c.forcedBy&&!own.emanation.includes(c.uid)&&fx(c).some(e=>e.op==='force_opponent'))){
  const prey=enemy.reserve.filter(c=>alive(c)&&!c.anchor&&!c.sleep&&!c.forcedBy&&!enemy.emanation.includes(c.uid)&&!enemy.formation.includes(c.uid)&&hp(c)<=atk(hunter)&&atk(c)<hp(hunter)).sort((a,b)=>atk(b)-atk(a))[0];
  if(prey)return {actions:[{type:'assign',cardId:hunter.uid,lane:lanes[0].lane},{type:'forceOpponent',cardId:hunter.uid,targetId:prey.uid}],reason:'publicly-legal-plan',knowledge};
 }
 return {actions:[],reason:'no-public-free-candidate',knowledge};
}

export function preparationAction(view,choice){
 const own=view.players.find(p=>p.id===view.you),enemy=view.players.find(p=>p.id!==view.you);
 if(own.pendingDiscard)throw Error('RUNNER: descarte obrigatório deve ser resolvido antes da decisão de preparação.');
 if(own.pendingApprenticeTargets?.length){
  if(choice?.type!=='apprenticeTarget'||choice.cardId!==own.pendingApprenticeTargets[0]||!enemy.reserve.some(c=>c.uid===choice.targetId&&alive(c)))throw Error('RUNNER: decisão pendente da Aprendiz não foi resolvida; preparação não foi encerrada.');
  return choice;
 }
 if(own.study?.book){if(choice&&(choice.type==='apprenticeTarget'||own.study.book.instantIds.includes(choice.cardId)))return choice;return {type:'grimoireFinish'};}
 if(choice)return choice;
 return {type:'endPrep',healTargetIds:healing(own)};
}
