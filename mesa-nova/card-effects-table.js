/* Presentation bridge: only public DOM anchors and authoritative card states. */
const cardIdentitySeen=new Map(),cardIdentityFrost=new Set(),cardIdentityFaults=new Set(),cardIdentityApplied=new Map(),cardIdentityCoatingsSpent=new Set();let cardIdentitySession='',cardIdentityCombat='';const cardIdentityProtocol=new Set();
function identityCard(uid){return state?.players?.flatMap(p=>[...p.reserve||[],...p.hand||[],...p.discard||[]]).find(c=>c.uid===uid);}
function identityNode(uid){return [...document.querySelectorAll('#game .card')].find(n=>n.dataset.uid===uid&&!n.classList.contains('back')&&n.getBoundingClientRect().width>0&&getComputedStyle(n).visibility!=='hidden')||null;}
function identityGeneration(){return visualGeneration+':'+(state?.combat?.id||'outside');}
function resetCardIdentityPresentation(){cardIdentityProtocol.clear();RunaCardEffects.clear();cardIdentitySeen.clear();cardIdentityFrost.clear();cardIdentityFaults.clear();cardIdentityApplied.clear();cardIdentityCoatingsSpent.clear();}
function identityPlay(kind,from,to,onHit=()=>{},targets=null,duration=900){return RunaCardEffects.play({kind,from,to,targets,onHit,context:audioContext,getGeneration:identityGeneration,duration});}
function identitySpellSource(owner){return document.querySelector(owner===seat()?.id?'.own-used-spell':'.rival-used-spell')||patronDamageSource(owner);}
async function presentIdentitySpell(event,preparedTarget=null){
 if(event.echo||event.card?.uid?.endsWith('-eco'))globalThis.RunaMarikaEffects?.pages([preparedTarget||damageTarget(event.targetId)].filter(Boolean));
 let kind=RunaCardEffects.kind(event.card);if(!kind)return false;
 const owner=event.playerId||event.casterId,from=identitySpellSource(owner),updates=event.healthUpdates||[];
 const changed=updates.filter(u=>u.uid&&(displayedHealth.get(u.uid)!==u.hp||displayedAttack.get(u.uid)!==u.attack));
 let targets=updates.filter(u=>u.uid).map(u=>damageTarget(u.uid)).filter(Boolean),to=preparedTarget||damageTarget(event.targetId);
 if(!to&&event.targetSide!==undefined)to=document.querySelector('.lane-side[data-owner="'+event.targetSide+'"][data-lane="'+event.lane+'"]');
 if(kind==='frost'){targets=changed.map(u=>damageTarget(u.uid)).filter(Boolean);}
 if(kind==='rally')targets=[...document.querySelectorAll('.lane-side[data-owner="'+owner+'"]')];
 if(kind==='tribal')targets=[document.getElementById(owner===seat()?.id?'self-reserve':'opponent-reserve')];
 if(!targets.length&&to)targets=[to];if(!targets.length&&kind==='frost')targets=[...document.querySelectorAll('.lane-side')].filter(n=>n.dataset.owner!==owner);
 if(!targets.length)targets=[from];
 if(kind==='mirror'){to=document.querySelector('.lane-side[data-owner="'+owner+'"][data-lane="'+event.lane+'"]')||to;targets=[to].filter(Boolean);}
 const victim=identityCard(to?.dataset?.uid||to?.querySelector?.('.card')?.dataset.uid);
 const blocked=['anchor','sleep'].includes(kind)&&victim?.runeCoating&&victim.owner!==owner&&!cardIdentityCoatingsSpent.has(victim.uid);
 if(blocked){kind='coating';targets=[to];}
 await identityPlay(kind,from,to,()=>{
  applyDamageHit(updates);if(event.sourceHealthUpdate)applyHealthUpdates([event.sourceHealthUpdate]);
  if(blocked)cardIdentityCoatingsSpent.add(victim.uid);
  else if(preparedTarget&&['anchor','sleep','barrier'].includes(kind)&&victim){const active=cardIdentityApplied.get(victim.uid)||new Set();active.add(kind);cardIdentityApplied.set(victim.uid,active);}
  if(kind==='ice'||kind==='frost')for(const u of kind==='frost'?changed:updates)if(u.uid)cardIdentityFrost.add(u.uid);
  if(kind==='mirror'){const spawn=state.combat?.spawnedMirages?.find(x=>x.spellId===event.cardId);if(spawn&&to&&!to.querySelector('.card'))to.replaceChildren(cardEl(spawn.card,{mini:true,combat:true}));}
  // Attribute amplification has a second pair of runes, rather than a generic arrow.
  for(const u of updates)if(identityCard(u.uid)?.effects?.some(e=>e.op==='double_stat_gains')&&['upgrade','coating'].includes(kind))identityPlay('aura',damageTarget(u.uid),damageTarget(u.uid),()=>{},null,650);
  syncCardIdentities();
 },targets,kind==='sleep'?1100:1000);return true;
}
function syncCardIdentities(){
 if(typeof RunaCardEffects==='undefined')return;
 const key=state?[state.code,state.matchId,state.you].join(':'):'';
 if(key!==cardIdentitySession){cardIdentityProtocol.clear();cardIdentitySeen.clear();cardIdentityFrost.clear();cardIdentityFaults.clear();cardIdentityApplied.clear();cardIdentityCoatingsSpent.clear();cardIdentitySession=key;}
 if(!state||['lobby','finished'].includes(state.phase)){resetCardIdentityPresentation();return;}
 const combat=state.combat?.id||'';if(combat!==cardIdentityCombat){cardIdentityProtocol.clear();cardIdentityFrost.clear();cardIdentityApplied.clear();cardIdentityCoatingsSpent.clear();cardIdentityCombat=combat;}
 // Recover already applied protocols when reconnecting halfway through combat.
 if(state.phase==='resolving'&&state.combat){let start=0;const elapsed=Date.now()-(typeof serverClockOffset==='number'?serverClockOffset:0)-state.combat.startedAt;for(const step of state.combat.timeline){if(step.ability?.op==='combat_protocol'&&elapsed>=start+step.duration)for(const u of step.ability.healthUpdates||[])cardIdentityProtocol.add(u.uid);start+=step.duration;}}
 const items=[];for(const p of state.players)for(const c of p.reserve||[]){const n=identityNode(c.uid);if(!n)continue;const target=()=>identityNode(c.uid),effects=c.effects||[],has=op=>effects.some(e=>e.op===op),lane=n.closest('.lane-side');
  const add=kind=>items.push({uid:c.uid,kind,target});
  if(has('initiative')||(c.grantedKeywords||[]).includes('initiative')||(c.equipment?.effects||[]).some(e=>e.op==='initiative'))add('speed');
  const applied=cardIdentityApplied.get(c.uid);if(c.runeCoating&&!cardIdentityCoatingsSpent.has(c.uid))add('coating');if((c.anchor||applied?.has('anchor'))&&lane)add('anchor');if((c.sleep||applied?.has('sleep'))&&lane)add('sleep');if(c.corruption)add('curse');if(cardIdentityFrost.has(c.uid)&&lane)add('ice');
  if(cardIdentityProtocol.has(c.uid)&&lane)add('veronica');if(c.auraKeywords?.includes('trample'))add('pierce');
  // Keep only a quiet edge marking for active Emanação benefits.
  if(lane&&(lane.classList.contains('lane-buffed')))add('aura');
  const previous=cardIdentitySeen.get(c.uid);if(previous&&c.forcedBy&&!previous.forcedBy)identityPlay('pull',identityNode(c.forcedBy),n);
  if(!previous&&c.firstDamageTaken)cardIdentityFaults.add(c.uid);
  cardIdentitySeen.set(c.uid,{forcedBy:c.forcedBy,firstDamageTaken:c.firstDamageTaken});
 }
 RunaCardEffects.sync({session:key,items});
}
function presentIdentityAuras(){
 for(const p of state.players){for(const uid of p.emanation||[]){const c=p.reserve.find(c=>c.uid===uid);for(const e of c?.effects||[]){if(!['lane_health_aura','lane_attack_aura','lane_keyword_aura'].includes(e.op))continue;const lane=Number.isInteger(c.auraLane)?c.auraLane:e.lane,target=identityNode(p.formation[lane]);if(target)identityPlay(e.op==='lane_keyword_aura'?'pierce':'aura',identityNode(uid),target);}}
 for(const c of p.reserve||[])if(c.effects?.some(e=>e.op==='taunt')&&p.formation.includes(c.uid))identityPlay('taunt',identityNode(c.uid),identityNode(c.uid),()=>{},null,700);
 }
}
function presentIdentityRevelation(ability){
 const source=identityNode(ability.sourceId),side=document.querySelector('.lane-side[data-owner="'+ability.targetSide+'"][data-lane="'+ability.lane+'"]'),target=side?.querySelector('.card')||side;
 const targets=(ability.healthUpdates||[]).map(u=>damageTarget(u.uid)).filter(Boolean);
 let kind=null;if(ability.op==='stat_buff')kind='yang';else if(ability.op==='attack_modifier')kind=ability.amount<0?'yin':'rally';else if(ability.op==='damage_curse')kind='curse';else if(ability.op==='combat_protocol')kind='veronica';else if(ability.op==='adjacent_attack_buff')kind='aura';else if(ability.op==='duel_stasis')kind='stasis';
 if(!kind)return false;
 if(kind==='veronica'&&globalThis.RunaPlatinumEntry){
  const combatId=state.combat?.id,generation=visualGeneration;
  void RunaPlatinumEntry.empower({source,targets:targets.length?targets:[source],mode:ability.mode,context:audioContext,valid:()=>generation===visualGeneration&&combatPresentationCurrent(combatId)});
  deferVisual(()=>{if(!combatPresentationCurrent(combatId))return;applyHealthUpdates(ability.healthUpdates);for(const u of ability.healthUpdates||[])cardIdentityProtocol.add(u.uid);syncCardIdentities();},650);return true;
 }

 if(kind==='stasis'){for(const n of [source,target])n?.classList.add('duel-stasis');targets.push(source,target);}
 identityPlay(kind,source,target||source,()=>{applyHealthUpdates(ability.healthUpdates);if(ability.op==='combat_protocol')for(const u of ability.healthUpdates||[])cardIdentityProtocol.add(u.uid);syncCardIdentities();},targets.length?targets:[target||source]);return true;
}
function presentIdentityAftermath(strike){
 for(const hit of [strike,strike.pair].filter(Boolean)){
  const c=identityCard(hit.targetId),target=damageTarget(hit.targetId);if((c?.attackBarrier||cardIdentityApplied.get(hit.targetId)?.has('barrier'))&&hit.amount>0)identityPlay('barrier',target,target,()=>{},null,600);
  if(c?.effects?.some(e=>e.op==='first_damage_double')&&!c.firstDamageTaken&&!cardIdentityFaults.has(c.uid)&&hit.amount>0){cardIdentityFaults.add(c.uid);identityPlay('fault',target,target,()=>{},null,650);}
  if(c?.volatileProject&&hit.amount>0)identityPlay('volatile',target,target,()=>{},null,650);
  for(const u of hit.healthUpdates||[])if(u.corruption)identityPlay('curse',damageTarget(hit.targetId),damageTarget(u.uid),()=>{syncCardIdentities();},null,650);
 }
}
function presentIdentityNotice(event){
 if(/Iniciativa/.test(event.message||'')){identityPlay('speed',identityNode(event.sourceId),damageTarget(event.targetId));return true;}
 if(/Revestimento Rúnico impediu/.test(event.message||'')){identityPlay('coating',damageTarget(event.targetId),damageTarget(event.targetId));return true;}
 return false;
}
async function presentIdentitySummon(event){const c=identityCard(event.cardId),kind=/RG01/.test(c?.modelId||'')?'geometry':/RG06/.test(c?.modelId||'')?'tribal':null;if(!kind)return false;await identityPlay(kind,patronDamageSource(event.playerId),damageTarget(event.cardId)||document.getElementById(event.playerId===seat()?.id?'self-reserve':'opponent-reserve'));return true;}
function presentIdentityCreature(event){const c=identityCard(event.cardId);if(c?.effects?.some(e=>e.op==='tribal_aura')){const targets=state.players.find(p=>p.id===event.playerId)?.reserve.filter(t=>t.uid!==c.uid&&t.tribalHealth>0).map(t=>identityNode(t.uid)).filter(Boolean);if(targets?.length)identityPlay('tribal',identityNode(c.uid),null,()=>{},targets);}}
