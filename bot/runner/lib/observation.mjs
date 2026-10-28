// Information derived only from the canonical player view, never the full room.
export function formationKnowledge(view,player){
 const revealed=player.id===view.you||['resolving','finished'].includes(view.phase);
 return (player.formation||[null,null,null]).map(uid=>uid?'occupied':revealed?'empty':'unknown');
}

export function restoreKnownDecisionState(view,player){
 if(player.firstSpellUsedThisRound)player.firstSpellRound=view.round;
 else delete player.firstSpellRound;
 // Queue payload is private to its owner, but legitimately present in own view.
 player.apprenticeQueue=[];
 if(player.id!==view.you)return;
 const sources=player.pendingApprenticeSources||[];
 if(sources.length){
  if(sources.some((s,i)=>s.uid!==player.pendingApprenticeTargets?.[i]))throw Error('CONTRACT: fila pública da Aprendiz sem correspondência de origem.');
  player.apprenticeQueue=sources.map(source=>{
   const amount=source.effects?.find(e=>e.op==='first_spell_damage')?.amount;
   if(!Number.isFinite(amount))throw Error('CONTRACT: snapshot da Aprendiz sem amount explícito.');
   return {source:structuredClone(source),amount};
  });
 }
}
