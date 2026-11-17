/* Sound hierarchy: keep existing recordings, timbres, gains and exact cue times.
   Bound repeated tails; a turn/contact must not lose its slot to decorative sound. */
(function(root){
 const critical=new Set(['turn','timeout','capture','impactLow','impactMedium','impactHeavy','metalImpactLow','metalImpactMedium','metalImpactHeavy','fulgor_impact','ember_impact','axe_impact','shard_impact','forge_impact','wind_impact','cone_impact','heavy_impact','kinetic_impact','brutal_impact']);
 const information=new Set(['draw','place','grave','burn','heal','coin','armor','death_runic','death_synthetic','death_machine','entry_lock','entry_anchor','chain_land']);
 // Persistent visual states do not require a five-second sound on every application.
 // Durations below are buffer seconds; an explicit shorter caller limit still wins.
 const tails={ice:1.65,frost:1.65,stasis:1.9,silence:1.5,taunt:1.15,barrier:1.4,aura:1.6,curse:1.8,yin:1.8,fault:1.8,coating:1.5,geometry:1.5};
 function policy(key,cue={}){return {priority:critical.has(key)?3:information.has(key)?2:1,maxConcurrent:key==='fuse'?1:critical.has(key)?4:2,maxSeconds:tails[key]??Infinity,fadeOut:tails[key]?Math.min(cue.fadeOut??.35,.3):cue.fadeOut};}
 root.RunaSoundDirection={policy};
})(globalThis);
