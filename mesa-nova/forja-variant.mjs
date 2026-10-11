export const statGain=(card,amount)=>amount>0&&(card?.effects||[]).some(e=>e.op==='double_stat_gains')?amount*2:amount;
// Track granted permanent bonuses separately from Inversor, auras and damage.
export function recordPermanentGains(card,attack=0,health=0){
 if(!(card?.effects||[]).some(e=>e.op==='retain_buffs_on_return'))return;
 const old=card.permanentGains||{attack:0,health:0};
 card.permanentGains={attack:old.attack+Math.max(0,attack||0),health:old.health+Math.max(0,health||0)};
}
export function grantPermanentStats(card,attack=0,health=0){
 const a=statGain(card,attack||0),h=statGain(card,health||0);
 card.attack+=a;card.health+=h;recordPermanentGains(card,a,h);
}
export function preventControl(card,casterId,op){
 if(!card?.runeCoating||card.owner===casterId||!['sleep','anchor','return_to_hand'].includes(op))return false;
 delete card.runeCoating;return true;
}
const names={initiative:'Iniciativa',trample:'Transpassar',taunt:'Provocar',corruption:'Corrupção',runeCoating:'Revestimento Rúnico'};
export function grantedEffects(card){return (card?.grantedKeywords||[]).map(op=>({op})).concat((card?.auraKeywords||[]).map(op=>({op})));}
export function receiveDamage(card,amount){
 if(!card||amount<=0)return card;
 const next={...card},volatile=Boolean(next.volatileProject);
 if(!next.firstDamageTaken&&(next.effects||[]).some(e=>e.op==='first_damage_double')){amount*=2;next.firstDamageTaken=true;}
 if(volatile){amount*=2;delete next.volatileProject;}
 const absorbed=Math.min(next.extraLife||0,amount);
 next.extraLife=Math.max(0,(next.extraLife||0)-absorbed);next.damage+=amount-absorbed;
 if(volatile&&next.damage<next.health)grantPermanentStats(next,1,1);
 return next;
}
export function grantKeyword(card,keyword){
 const original=(Array.isArray(card.effects)?card.effects:[]).some(e=>e.op===keyword);
 if(!original&&!card.grantedKeywords?.includes(keyword))(card.grantedKeywords??=[]).push(keyword);
}
export function syncKeywordAuras(room){
 for(const p of room.players){
  for(const c of p.reserve)delete c.auraKeywords;
  for(const uid of p.emanation){const source=p.reserve.find(c=>c.uid===uid&&c.damage<c.health);
   if(!source||!Number.isInteger(source.auraLane))continue;
   const target=p.reserve.find(c=>c.uid===p.formation[source.auraLane]);if(!target)continue;
   for(const e of source.effects||[])if(e.op==='lane_keyword_aura'){
    target.auraKeywords??=[];if(!target.auraKeywords.includes(e.keyword))target.auraKeywords.push(e.keyword);
   }
  }
 }
}
export function keywordPresentation(card,showAura=true){
 const original=Array.isArray(card.effects)?card.effects:[],added=new Set([...(card.grantedKeywords||[]),...(showAura?card.auraKeywords||[]:[]),...(card.grantedTrample?['trample']:[]),...(showAura&&card.temporaryTrample?['trample']:[]),...(card.equipment?.effects||[]).map(e=>e.op)]);
 if(card.corruption)added.add('corruption');
 if(card.runeCoating)added.add('runeCoating');
 const keywords=[...added].filter(op=>names[op]&&!original.some(e=>e.op===op)).map(op=>names[op]);
 return {text:(card.text||'')+(keywords.length?'\n'+keywords.join('. ')+'.':''),highlightKeywords:keywords};
}
