import fs from 'node:fs';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';import {makeRoom,join,act,resolveCombat,view} from '../mesa-nova/game.mjs';import {weaponRecipe,weaponOptions} from '../mesa-nova/equipment.mjs';
const catalog=JSON.parse(fs.readFileSync('mesa-nova/cartas.json')),deck=catalog.decks.find(d=>d.affinity==='forja'),all=catalog.decks.flatMap(d=>d.cards),rune=all.find(c=>c.effects.some(e=>e.op==='double_stat_gains')),defective=all.find(c=>c.effects.some(e=>e.op==='first_damage_double')),rows=[],interactions=[];
for(const cost of [1,3,6])for(const chassis of weaponOptions('durability',cost))for(const blade of weaponOptions('attack',cost)){
 const recipe=weaponRecipe(cost,chassis.id,blade.id);rows.push({cost,chassis:chassis.name,blade:blade.name,attack:recipe.attack,durability:recipe.durability,woundedBonus:recipe.woundedBonus,recoil:recipe.recoil,keyword:recipe.effects[0]?.op||'',id:recipe.id});
 for(const [kind,model] of [['Comum',{name:'Portador comum',attack:2,health:20,effects:[]}],['Rúnico Eficiente',rune],['Engrenauta Defeituoso',defective]]){
 const room=makeRoom('WEPQA1','A'),a=room.players[0],b=join(room,'B');Object.assign(room,{phase:'prep',turn:a.id,first:a.id,round:4,collectPreview:true});for(const p of [a,b])Object.assign(p,{deckData:deck,patron:{hp:100,maxHp:100,affinity:'forja'},mana:10,manaMax:10,deck:[{uid:randomUUID(),name:'Compra',type:'creature',cost:9}],weapons:[]});
 const card={...structuredClone(model),uid:randomUUID(),owner:a.id,modelId:model.id||'test',type:'creature',damage:0,attackMod:0,baseStats:{attack:model.attack,health:model.health,cost:model.cost||0}},w={...structuredClone(recipe),uid:randomUUID(),owner:a.id};a.reserve=[card];a.weapons=[w];act(room,a,{type:'equip',cardId:w.uid,targetId:card.uid},catalog);a.formation[0]=card.uid;
 const before=view(room,a).players[0].reserve[0].effectiveAttack,expected=model.attack+recipe.attack*(kind==='Rúnico Eficiente'?2:1);assert.equal(before,expected);
 room.phase='resolving';resolveCombat(room);assert.equal(100-b.patron.hp,expected);assert.equal(w.durability,recipe.durability-(expected>0?1:0));assert.equal(card.damage,expected>0?recipe.recoil*(kind==='Engrenauta Defeituoso'?2:1):0);
 interactions.push({weapon:recipe.id,carrier:kind,attack:before,patronDamage:100-b.patron.hp,recoilDamage:card.damage,durabilityAfter:w.durability});
 }
}
assert.equal(rows.length,27);assert.equal(interactions.length,81);assert.equal(weaponRecipe(5,'resistente','precisa').cost,3);assert.equal(weaponRecipe(10,'resistente','precisa').cost,6);
const out='outputs/armas-pacotes-20261011';fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/armas-27.json',JSON.stringify({weapons:rows,combatScenarios:interactions},null,2));fs.writeFileSync(out+'/armas-27.csv','custo;estrutura;lamina;ataque;durabilidade;bonus_ferido;recuo;palavra_chave\n'+rows.map(r=>[r.cost,r.chassis,r.blade,r.attack,r.durability,r.woundedBonus,r.recoil,r.keyword].join(';')).join('\n'));
fs.writeFileSync(out+'/armas.md',`# Armas da Forja — 11/10/2026

Forja Eterna custa 3 Éter, uma vez por partida. A produção continua em três preparações. Jogar a arma custa 1, 3 ou 6 Éter; equipar custa mais 1.

| Custo da arma | Ataque base | Durabilidade Resistente / Perfurante / Veloz |
|---|---|---|
| 1 | +1 | 3 / 2 / 1 |
| 3 | +2 | 4 / 3 / 2 |
| 6 | +4 | 5 / 4 / 3 |

Precisa mantém o ataque base e a durabilidade. Dentada reduz o ataque base em 1, concede +2 enquanto o portador estiver ferido e reduz a durabilidade inicial em 1. Brutal aumenta o ataque base em 1, causa 1 de dano ao portador após atacar e reduz a durabilidade inicial em 1. A durabilidade mínima é 1. Perfurante concede Transpassar; Veloz concede Iniciativa.

O nível máximo foi reduzido em ataque e durabilidade para acompanhar o novo custo. A escolha troca sustentação por velocidade, dano imediato ou sinergia com ferimentos. Uma Brutal Resistente de nível 6 concede +5 por quatro ataques; o antigo nível 10 chegava a +6 por sete ataques.

Verificadas 27 receitas e 81 cenários reais de resolução de combate, usando portador comum, Rúnico Eficiente e Engrenauta Defeituoso. O Rúnico dobra o bônus de ataque da arma. O Engrenauta dobra o primeiro dano de recuo da Brutal. Armas Dentadas de custo 1 não fazem uma criatura 0 de ataque atacar se ela não estiver ferida. Desgaste e recuo só acontecem após ataque positivo.

Esses são testes de interação; não estimam taxa de vitória. Equipamentos já concluídos em partidas antigas preservam seus atributos. Forjas antigas ainda em andamento aceitam os níveis equivalentes 5→3 e 10→6.
`);console.log('27 receitas e 81 combates com portador comum, Rúnico e Defeituoso aprovados; relatório gerado.');
