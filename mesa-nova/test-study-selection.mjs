import assert from 'node:assert/strict';
import fs from 'node:fs';
import {selectStudyOriginals,shuffleStudyDeck} from './study-selection.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('cartas.json',import.meta.url)));
const deck=catalog.decks.find(d=>d.affinity==='fluxo');
const originalDeck=deck.cards.flatMap(c=>Array.from({length:c.quantity},(_,i)=>({...c,modelId:c.id,studyOriginalId:c.id+'-'+i})));
const seen=new Set();
for(let seed=1;seed<=100;seed++){
 let state=seed;const random=()=>((state=Math.imul(state,1664525)+1013904223)>>>0)/4294967296;
 const cards=selectStudyOriginals({originalDeck,reserve:[]},{random});
 assert.equal(cards.length,5);assert.equal(new Set(cards.map(c=>c.modelId)).size,5);
 assert.ok(cards.filter(c=>c.cost<=4).length>=2);
 assert.ok(cards.filter(c=>c.type==='creature').length>=2);
 assert.ok(cards.filter(c=>!['creature','equipment'].includes(c.type)).length>=2);
 assert.ok(cards.filter(c=>c.cost>=5).length<=2);
 seen.add(cards.map(c=>c.id).sort().join(','));
}
assert.ok(seen.size>15,'selection must remain random rather than always returning one fixed set');
const only=[{id:'one',cost:8,type:'creature'}];assert.equal(selectStudyOriginals({originalDeck:only},{random:()=>.5}).length,5);
assert.deepEqual(selectStudyOriginals({originalDeck:[]}),[]);
const shuffled=shuffleStudyDeck([1,2,3,4,5],{random:()=>0});assert.deepEqual([...shuffled].sort(),[1,2,3,4,5]);
console.log('Grimório: variedade, duas opções baratas, criaturas/magias, unicidade, aleatoriedade e fallback aprovados.');
