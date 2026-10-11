// Silence changes the creature in play; the original rules are retained only
// for a later return to hand. External auras can apply again after cleanup.
export function silenceCreature(room,target,helpers){
 const owner=room.players.find(p=>p.id===target.owner);
 const model=room.players.flatMap(p=>p.deckData?.cards||[]).find(c=>c.id===target.modelId);
 const base=target.baseStats||model||target;
 const attack=base.attack,health=base.health;
 target.silenceOriginalRules??={effects:structuredClone(target.effects||[]),text:target.text||''};
 helpers.releaseEquipment(room,room.players.find(p=>p.id===target.teleportHome?.owner)||owner,target,helpers);
 helpers.releaseForced(room,target.uid,false);
 Object.assign(target,{attack,health,attackMod:0,effects:[],text:'',silenced:true});
 for(const key of ['extraLife','anchor','sleep','sleepUntilCombat','spellBuff','temporaryHealth','temporaryDamageBefore','protocolMode','monkMode','protocolHealth','protocolDamageBefore','temporaryTrample','grantedTrample','cursedTargets','curseArmed','tribalHealth','forcedBy','forcedLane','revealPaid','revealPaymentRound','blockedSummonUsed','grantedKeywords','auraKeywords','auraLane','volatileProject','firstDamageTaken','corruption','corruptionTarget','eyeSkipCombat','eyeCooldown','sealChoices','apprenticePreparation','apprenticeSpellUsed','apprenticeTargetId','attackBarrier','runeCoating','permanentGains'])delete target[key];
 delete owner.taunts?.[target.uid];
 room.seals=(room.seals||[]).filter(s=>s.sourceId!==target.uid);
 helpers.syncTribalHealth(room);helpers.syncKeywordAuras(room);helpers.pruneSeals(room);
 return target;
}
