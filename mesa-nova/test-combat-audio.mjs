import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const scope=vm.createContext({});vm.runInContext(readFileSync(new URL('./damage-fx.js',import.meta.url),'utf8'),scope);
vm.runInContext(readFileSync(new URL('./damage-presentation.js',import.meta.url),'utf8'),scope);
test('combat waves follow effective attack bands and zero damage has no impact',()=>{
 for(const [attack,tier] of [[0,0],[1,1],[3,1],[4,2],[6,2],[7,3],[20,3]])assert.equal(scope.RunaDamageFX.impactTier(attack),tier);
});
test('only Engrenautas use metal, never all Forja, Axiom or Runico creatures',()=>{
 assert.equal(scope.combatImpactKey({name:'Engenheiro Cauteloso',subtype:'Anão'},7),'impactHeavy');
 assert.equal(scope.combatImpactKey({name:'Rúnico Persistente',subtype:'Axiom'},4),'impactMedium');
 assert.equal(scope.combatImpactKey({name:'Engrenauta Defeituoso',subtype:'Axiom'},2),'metalImpactLow');
 assert.equal(scope.combatImpactKey({name:'Golias',subtype:'Engrenauta'},9),'metalImpactHeavy');
});
