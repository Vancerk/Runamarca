import {randomBytes} from 'node:crypto';

const roll=()=>randomBytes(4).readUInt32BE(0)/0x1_0000_0000;
const kind=c=>c.type==='creature'?'creature':c.type==='equipment'?'equipment':'spell';
const cost=c=>Number(c.cost)||0;
const cardKey=c=>c.modelId||c.id||c.studyOriginalId||c.uid;
const effects=c=>c.effects||[];

// Variety is part of the rule, not an AI's access to hidden opponent cards.
// Prefer two affordable options, two creatures and two spells when available.
export function selectStudyOriginals(player,{random=roll}={}){
 const pool=[...new Map((player.originalDeck||[]).map(c=>[cardKey(c),c])).values()];
 const selected=[];
 const pick=candidates=>{
  if(!candidates.length)return;
  const limited=candidates.filter(c=>cost(c)<5||selected.filter(s=>cost(s)>=5).length<2);
  const choices=limited.length?limited:candidates;
  const weights=choices.map(c=>{
   let weight=1;
   if(cost(c)<=4)weight*=1.35;
   if(kind(c)==='creature')weight*=1.1;
   const draw=effects(c).some(e=>e.op==='draw'||e.op==='armor_draw');
   if(draw&&selected.some(s=>effects(s).some(e=>e.op==='draw'||e.op==='armor_draw')))weight*=.15;
   if(effects(c).some(e=>e.target==='chosen_allied_creature')&&!player.reserve?.some(c=>c.type==='creature')&&!selected.some(c=>kind(c)==='creature'))weight*=.65;
   return weight;
  });
  let value=random()*weights.reduce((a,b)=>a+b,0),index=choices.length-1;
  for(let i=0;i<weights.length;i++){value-=weights[i];if(value<0){index=i;break;}}
  const chosen=choices[index];selected.push(chosen);pool.splice(pool.indexOf(chosen),1);
 };
 const cheap=()=>pool.filter(c=>cost(c)<=4);
 pick(cheap());
 const alternative=cheap().filter(c=>kind(c)!==kind(selected[0]||{}));
 pick(alternative.length?alternative:cheap());
 for(const type of ['creature','spell']){
  while(selected.length<5&&selected.filter(c=>kind(c)===type).length<2){
   const candidates=pool.filter(c=>kind(c)===type);if(!candidates.length)break;pick(candidates);
  }
 }
 while(selected.length<5&&pool.length)pick(pool);
 // Degenerate custom decks may contain fewer than five different models.
 while(selected.length<5&&(player.originalDeck||[]).length){
  const originals=player.originalDeck;selected.push(originals[Math.floor(random()*originals.length)]);
 }
 return selected;
}

export function shuffleStudyDeck(deck,{random=roll}={}){
 for(let i=deck.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
 return deck;
}
