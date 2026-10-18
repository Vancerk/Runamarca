import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {scenario} from './cenario-balanceamento-rodada2.mjs';
import {applyForja} from './cenario-balanceamento-rodada5.mjs';
import '../mesa-nova/criador/budget-model.js';
const dir='design/testes-2026-10-03-pontos';await fs.mkdir(dir,{recursive:true});
const originalSource=await fs.readFile(dir+'/antes-da-aplicacao/game.mjs','utf8');
const originalCatalog=JSON.parse(await fs.readFile(dir+'/antes-da-aplicacao/cartas.json','utf8'));
const prior=JSON.parse(await fs.readFile('design/testes-2026-10-03-rodada5/catalogo-testado.json','utf8'));
prior.decks.find(d=>d.affinity==='forja').cards.find(c=>c.id==='F08').cost=9;
// Apply the same experimental engine used by the preceding batteries.
let {source,catalog}=scenario(originalSource,originalCatalog,true,true);
for(const d of catalog.decks)for(const c of d.cards){const old=prior.decks.flatMap(x=>x.cards).find(x=>x.id===c.id);Object.assign(c,structuredClone(old));}
const applied=applyForja(source,catalog,{axiomCost:9});source=applied.source;
const base=structuredClone(catalog);
const timings={on_enter:'enter',revelation:'reveal',while_emanating:'emanation',end_owner_preparation_while_emanating:'emanation',prepared_trigger:'trap',on_play:'direct'};
const targets={self:'self',owner:'owner',chosen_allied_creature:'ally',chosen_enemy_creature:'enemy',opposing_creature_same_lane:'lane',triggering_creature:'trigger',allied_creature_lane_1:'fixedAlly',own_patron:'patron',owners_first_direct_spell_of_preparation:'owner'};
const ops={damage:'damage',heal:'heal',attack_modifier:'attack',draw:'draw',summon:'summon',cost_discount:'discount'};
export function descriptors(card){
 const out=[];
 for(const ef of card.effects||[]){
  const common={name:card.name,timing:timings[ef.timing]||'direct',target:targets[ef.target]||'self',duration:ef.duration==='round_end'?'round':'instant',condition:ef.condition==='self_wounded'?'wounded':ef.condition==='owner_played_direct_spell_this_round'?'spell':'none',activationCost:ef.mana_cost||0,group:'sum',reason:'Derivado dos efeitos executáveis do catálogo.'};
  if(ef.op==='area_damage'){
   out.push({...common,effect:'damage',amount:ef.direct_amount,count:8,target:'area',timing:'direct',group:'choice'});
   out.push({...common,effect:'damage',amount:ef.amount,count:3,target:'area',timing:'trap',group:'choice'});continue;
  }
  if(ef.op==='choose_one'){for(const option of ef.options)out.push({...common,effect:'heal',target:targets[option.target],amount:option.amount,group:'choice'});continue;}
  if(ef.op==='conditional_damage'){out.push({...common,effect:'damage',amount:Math.max(ef.amount_if_true,ef.amount_if_false),condition:'threshold'});continue;}
  out.push({...common,effect:ef.op==='attack_modifier'&&ef.amount<0?'weaken':ops[ef.op],amount:Math.abs(ef.amount),tokenAttack:ef.attack,tokenHealth:ef.health});
  assert.ok(out.at(-1).effect,'Efeito sem preço: '+ef.op);
  if(ef.draw_on_kill)out.push({...common,effect:'draw',amount:ef.draw_on_kill,condition:'kill',target:'owner'});
 }
 return out;
}
const changes={
 R02:{attack:2,health:1,reason:'Ficha 1/1 ocupa 2 pontos. Corpo reduzido mantém pressão e reposição.'},
 R04:{attack:2,health:1,reason:'Revelação de dano consome 2 pontos; reduzir resistência preserva o ataque agressivo.'},
 R06:{attack:4,health:1,reason:'Duas fichas custam 4 pontos. Corpo 4/1 fica vulnerável em troca de quantidade.'},
 R08:{attack:6,health:2,reason:'Ficha 2/1 custa 3 pontos. Mantém finalizador de alto ataque, sem resistência gratuita.'},
 R10:{cost:3,reason:'Dano 2 custa 4 pontos, compra condicional 2. A magia passa a orçamento de 6.'},
 R12:{cost:3,reason:'Dano alto contra ameaças grandes precisa de custo maior, mesmo condicionado e preparado.'},
 M04:{attack:1,health:3,reason:'Desconto recorrente ocupa 3 pontos. Menos ataque torna o apoio um investimento.'},
 M05:{attack:3,health:3,reason:'Compra de entrada ocupa 3 pontos; reduzir vida mantém corpo e reposição no custo 4.'},
 M06:{attack:4,health:5,reason:'Revelação de 2 dano custa 4 pontos. Vida 5 deixa total 13 no custo 6.'},
 M11:{cost:3,reason:'3 dano preparado custa 5 pontos. Custo 2 oferecia apenas 4.'},
 F01:{attack:1,health:1,reason:'Ataque efetivo 2 na Revelação precisa entrar na conta. Reduzir vida abre respostas cedo.'},
 F02:{attack:1,health:2,reason:'Revelação condicionada ocupa 2 pontos pela regra de desconto máximo. Defesa continua barata, porém frágil.'},
 F04:{attack:2,health:4,reason:'Compra não é gratuita em um bloqueador. Corpo 2/4 + compra = 9 pontos.'},
 F07:{attack:6,health:5,reason:'Bônus de ataque 2 ocupa 2 pontos. Reduzir vida mantém ameaça forte com janela de remoção.'}
};
for(const deck of catalog.decks){deck.patron.health=20;for(const card of deck.cards){
 const update=changes[card.id];if(update)for(const key of ['cost','attack','health'])if(key in update)card[key]=update[key];
 card.budgetEffects=descriptors(card);card.budgetVersion=2;card.budgetReason=update?.reason||'Mantida: atributos e efeitos cabem na referência. Não é prova de equilíbrio.';
 const budget=RunaBudget.calculate(card);assert.ok(budget.remaining>=0,card.id+' excede: '+JSON.stringify(budget));
 card.budgetAudit={available:budget.available,spent:budget.spent,remaining:budget.remaining,abilityPoints:budget.abilityPoints};
}assert.equal(deck.cards.reduce((s,c)=>s+c.quantity,0),24);}
catalog.version='0.3-pontos';catalog.date='2026-10-03';catalog.status='Decks reconstruídos pela referência de pontos v2; teste automatizado não substitui teste humano.';
await fs.writeFile(dir+'/catalogo-anterior.json',JSON.stringify(base,null,2));
await fs.writeFile(dir+'/catalogo-testado.json',JSON.stringify(catalog,null,2));
await fs.writeFile(dir+'/motor-testado.mjs',source);
await fs.writeFile(dir+'/alteracoes.json',JSON.stringify(changes,null,2));
const audit=catalog.decks.flatMap(d=>d.cards.map(c=>({deck:d.affinity,id:c.id,name:c.name,cost:c.cost,attack:c.attack,health:c.health,...c.budgetAudit,reason:c.budgetReason})));
await fs.writeFile(dir+'/auditoria-pontos.json',JSON.stringify(audit,null,2));
console.log(audit.map(c=>`${c.id} custo${c.cost} ${c.attack??'-'}/${c.health??'-'} pontos ${c.spent}/${c.available}`).join('\n'));
