import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import '../mesa-nova/criador/budget-model.js';
const {calculate,price}=globalThis.RunaBudget;
const {choices,normalize}=globalThis.RunaBudget;
test('Fichas e compra têm destino fixo; cartas e magias têm momentos próprios',()=>{
 assert.deepEqual(choices('creature',{effect:'summon',timing:'enter'}).targets,['owner']);
 assert.deepEqual(choices('spell',{effect:'draw',timing:'direct'}).targets,['owner']);
 assert.deepEqual(choices('spell',{effect:'damage'}).timings,['direct','trap']);
 assert.ok(!choices('creature',{effect:'damage',timing:'emanation'}).targets.includes('lane'));
 assert.ok(!choices('creature',{effect:'weaken',timing:'reveal'}).targets.includes('enemyPatron'));
 assert.ok(!choices('spell',{effect:'attack',timing:'direct'}).targets.includes('enemy'));
});
test('Campos incompatíveis são normalizados antes de gastar os pontos',()=>{
 const e=normalize('creature',{effect:'summon',timing:'enter',target:'area',count:8,duration:'permanent',activationCost:3,condition:'wounded'});
 assert.equal(e.target,'owner');assert.equal(e.count,1);assert.equal(e.duration,'instant');assert.equal(e.activationCost,0);assert.equal(e.condition,'none');
 const area=normalize('spell',{effect:'damage',timing:'trap',target:'area',count:8});assert.equal(area.count,3);
 const buff=normalize('spell',{effect:'attack',timing:'direct',target:'ally',duration:'instant'});assert.equal(buff.duration,'round');
 assert.ok(!choices('spell',{effect:'draw',timing:'direct'}).conditions.includes('kill'));
 assert.ok(choices('spell',{effect:'draw',timing:'direct'},{hasDamage:true}).conditions.includes('kill'));
});
test('Corpo e dano na Revelação compartilham o saldo; magia não compra atributos',()=>{
 const e={effect:'damage',amount:1,timing:'reveal',target:'lane'};
 assert.equal(calculate({kind:'creature',generic:3,power:2,health:3,budgetEffects:[e]}).remaining,0);
 assert.equal(calculate({kind:'creature',generic:3,power:2,health:4,budgetEffects:[e]}).remaining,-1);
 assert.equal(calculate({kind:'spell',generic:3,power:20,health:20,budgetEffects:[{effect:'damage',amount:3,timing:'direct',target:'enemy'}]}).remaining,0);
});
test('Área conta alcance e cobra somente o modo escolhido, mais flexibilidade',()=>{
 const direct={effect:'damage',amount:1,timing:'direct',target:'area',count:8,group:'choice'};
 const trap={effect:'damage',amount:2,timing:'trap',target:'area',count:3,group:'choice'};
 assert.equal(price(direct).points,9);assert.equal(price(trap).points,7);
 assert.equal(calculate({kind:'spell',generic:5,budgetEffects:[direct,trap]}).spent,10);
 assert.equal(calculate({kind:'spell',generic:5,budgetEffects:[{...direct,group:'sum'},{...trap,group:'sum'}]}).spent,16);
});
test('Restrições não zeram recorrência nem dão desconto ilimitado',()=>{
 const e={effect:'heal',amount:1,timing:'emanation',target:'ally',activationCost:9,condition:'wounded'};
 assert.equal(price(e).points,1);assert.equal(price({...e,activationCost:0,condition:'none'}).points,2);
 assert.equal(price({effect:'attack',amount:2,timing:'enter',target:'self',duration:'permanent'}).points,4);
 assert.ok(price({effect:'draw',amount:1,timing:'turn',target:'owner'}).warnings.some(x=>x.includes('Recorrência')));
});
test('Preço manual pede justificativa; fichas sem vida são sinalizadas',()=>{
 assert.ok(price({effect:'custom',customPoints:0}).warnings.length);
 assert.ok(price({effect:'summon',amount:2,tokenAttack:1,tokenHealth:0}).warnings.some(x=>x.includes('vida')));
 assert.equal(price({effect:'summon',amount:2,tokenAttack:1,tokenHealth:1,timing:'enter'}).points,4);
});
test('Os 36 modelos testados respeitam saldo e limites de cópias',async()=>{
 const catalog=JSON.parse(await readFile(new URL('../design/testes-2026-10-03-pontos/catalogo-testado.json',import.meta.url),'utf8'));
 let models=0;
 for(const deck of catalog.decks){
  assert.equal(deck.cards.reduce((n,c)=>n+c.quantity,0),24);
  for(const card of deck.cards){models++;const b=calculate(card);
   assert.ok(b.remaining>=0,card.id);assert.equal(b.spent,card.budgetAudit.spent);
   assert.ok(card.quantity<=({lacaio:3,padrao:2,elite:1}[card.rarity]));
   const normalized=card.budgetEffects.map(e=>normalize(card.type==='creature'?'creature':'spell',e,{hasDamage:card.budgetEffects.some(other=>other!==e&&other.effect==='damage'&&other.amount>0&&other.timing===e.timing&&other.group==='sum')}));
   assert.equal(calculate({...card,budgetEffects:normalized}).spent,b.spent,card.id+' mantém orçamento após filtrar combinações');
   if(card.effects?.length)assert.ok(card.budgetEffects.length>0,card.id);
   assert.deepEqual(calculate(JSON.parse(JSON.stringify(card))),b,'JSON mantém a avaliação');
  }
 }assert.equal(models,36);
});
