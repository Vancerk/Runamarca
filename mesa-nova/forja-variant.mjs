const names={initiative:'Iniciativa',trample:'Transpassar',taunt:'Provocar'};
export function grantedEffects(card){return (card?.grantedKeywords||[]).map(op=>({op})).concat((card?.auraKeywords||[]).map(op=>({op})));}
export function receiveDamage(card,amount){
 if(!card||amount<=0)return card;
 const next={...card},volatile=Boolean(next.volatileProject);
 if(!next.firstDamageTaken&&(next.effects||[]).some(e=>e.op==='first_damage_double')){amount*=2;next.firstDamageTaken=true;}
 if(volatile){amount*=2;delete next.volatileProject;}
 const absorbed=Math.min(next.extraLife||0,amount);
 next.extraLife=Math.max(0,(next.extraLife||0)-absorbed);next.damage+=amount-absorbed;
 if(volatile&&next.damage<next.health){next.attack++;next.health++;}
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
 const keywords=[...added].filter(op=>names[op]&&!original.some(e=>e.op===op)).map(op=>names[op]);
 return {text:(card.text||'')+(keywords.length?'\n'+keywords.join('. ')+'.':''),highlightKeywords:keywords};
}
