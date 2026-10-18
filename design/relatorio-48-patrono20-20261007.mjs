import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const dir='design/testes-2026-10-07-48-patrono20',priorDir='design/testes-2026-10-07-48-rebalanceamento';
const old=JSON.parse(fs.readFileSync(priorDir+'/resultados.json')),now=JSON.parse(fs.readFileSync(dir+'/resultados.json'));
const catalog=JSON.parse(fs.readFileSync(dir+'/catalogo-testado.json')),priorCatalog=JSON.parse(fs.readFileSync(priorDir+'/catalogo-testado.json'));
const hash=s=>createHash('sha256').update(s).digest('hex'),f=n=>n.toFixed(2).replace('.',','),avg=a=>a.reduce((n,g)=>n+g.rounds,0)/a.length;
const script=fs.readFileSync('design/simular-48-20261007-patrono20.mjs','utf8');
assert.equal(script.replace("const out='design/testes-2026-10-07-48-patrono20'","const out='design/testes-2026-10-07-48-rebalanceamento'"),fs.readFileSync('design/simular-48-20261007-rebalanceamento.mjs','utf8'));
assert.equal(now.games.length,48);assert.equal(Object.values(now.summary.wins).reduce((a,b)=>a+b),48);
for(const [file,h] of Object.entries(now.hashes))assert.equal(hash(fs.readFileSync('mesa-nova/'+file,'utf8')),h);
assert.equal(hash(JSON.stringify(catalog)),now.catalogHash);
const normalized=structuredClone(catalog);normalized.rules.patron_health=priorCatalog.rules.patron_health;
for(const d of normalized.decks)d.patron=priorCatalog.decks.find(x=>x.id===d.id).patron;
assert.deepEqual(normalized,priorCatalog,'Cartas e quantidades idênticas ao teste de vida 16');
for(let i=0;i<48;i++)assert.deepEqual([now.games[i].seed,now.games[i].pair,now.games[i].first,now.games[i].modes],[old.games[i].seed,old.games[i].pair,old.games[i].first,old.games[i].modes]);
const changed=now.games.filter((g,i)=>g.winner!==old.games[i].winner).map(g=>({match:g.n,pair:g.pair,before:old.games[g.n-1].winner,after:g.winner,roundsBefore:old.games[g.n-1].rounds,roundsAfter:g.rounds}));
const matchups=now.summary.matchups.map(m=>{const a=old.games.filter(g=>g.pair===m.pair),b=now.games.filter(g=>g.pair===m.pair);assert.equal(b.length,16);for(const d of m.pair.split(' x '))assert.equal(b.filter(g=>g.first===d).length,8);return {pair:m.pair,before:old.summary.matchups.find(x=>x.pair===m.pair).wins,after:m.wins,meanBefore:avg(a),meanAfter:avg(b),reached8Before:a.filter(g=>g.rounds>=8).length,reached8After:b.filter(g=>g.rounds>=8).length};});
const comparison={completed:48,pairedSeeds:24,startingLifeBefore:16,startingLifeAfter:20,pilotUnchanged:true,cardsUnchanged:true,changedWinners:changed,matchups,winsBefore:old.summary.wins,winsAfter:now.summary.wins,meanBefore:old.summary.meanRounds,meanAfter:now.summary.meanRounds,firstWins:now.summary.firstWins};
fs.writeFileSync(dir+'/comparacao.json',JSON.stringify(comparison,null,2));
now.pilotHash=hash(script);now.validation={completedMatches:48,sameSeedsAndPolicies:true,initialOrderBalanced:true,onlyPatronLifeChanged:true,engineAndCatalogHashesVerified:true};fs.writeFileSync(dir+'/resultados.json',JSON.stringify(now,null,2));
const metrics=now.summary.metrics,prev=old.summary.metrics,cols=['drawn','played','combats','faceDamage','spellDamage','tokens','triggers','returns','healed','attackRemoved','redirects','unplayed'];
const quote=s=>'"'+String(s??'').replaceAll('"','""')+'"';
fs.writeFileSync(dir+'/cartas-comparadas.csv','id;nome;deck;custo;'+cols.flatMap(k=>[k+'_vida16',k+'_vida20']).join(';')+'\n'+Object.entries(metrics).map(([id,m])=>[id,m.name,m.deck,m.cost,...cols.flatMap(k=>[prev[id][k],m[k]])].map(quote).join(';')).join('\n'));
const matchRows=matchups.map(m=>{const ds=m.pair.split(' x ');return `| ${m.pair} | ${ds.map(d=>m.before[d]).join('–')} | ${ds.map(d=>m.after[d]).join('–')} | ${f(m.meanBefore)} → ${f(m.meanAfter)} |`;}).join('\n');
const deckRows=['forja','fluxo','ruptura'].map(d=>`| ${d} | ${old.summary.wins[d]}/32 (${f(old.summary.wins[d]/32*100)}%) | ${now.summary.wins[d]}/32 (${f(now.summary.wins[d]/32*100)}%) |`).join('\n');
const md=`# RunaMarca — 48 partidas com Patronos de vida 20

Data: 07/10/2026. Referência: bateria anterior com vida 16 e os quatro nerfs já aprovados da Ruptura. Apenas a vida inicial/máxima mudou para 20; cartas, quantidades, poderes e pilotos permanecem iguais. Rastreadora preservada.

## Placar

Cada confronto teve 16 partidas. Os placares seguem a ordem dos nomes.

| Confronto | Vida 16 | Vida 20 | Rodadas médias |
|---|---:|---:|---:|
${matchRows}

| Deck | Vida 16 | Vida 20 |
|---|---:|---:|
${deckRows}

**A mudança ajudou principalmente a Forja. Ruptura ficou menos dominante, mas continua vencendo todas as partidas contra Fluxo nesta amostra.** Cinco partidas mudaram de vencedor, todas a favor da Forja: duas contra Fluxo e três contra Ruptura. A redução do aproveitamento do Fluxo veio das partidas contra Forja, não de novas derrotas contra Ruptura, pois esse confronto já estava 0–16.

A média geral passou de ${f(old.summary.meanRounds)} para ${f(now.summary.meanRounds)} rodadas: +${f(now.summary.meanRounds-old.summary.meanRounds)} rodada, cerca de ${f((now.summary.meanRounds/old.summary.meanRounds-1)*100)}%. Isso é uma contagem de rodadas, não duração real em minutos. Quem começou a primeira rodada venceu ${now.summary.firstWins}/48 (${f(now.summary.firstWins/48*100)}%). Como a ordem alterna a cada rodada e a amostra é pequena/pareada, esse resultado não justifica criar nova compensação de iniciativa.

## Por que Forja melhorou

Os quatro pontos adicionais deram mais oportunidade para alcançar sua curva alta. Contra Ruptura, oito partidas chegaram à rodada 8 ou depois, contra três com vida 16. A média desse confronto passou de 6,19 para 8,06 rodadas.

| Carta/recurso da Forja | Vida 16 | Vida 20 | Leitura |
|---|---:|---:|---|
| Golias — usos | 12 | 25 | Mais exposição ao defensor caro. |
| Verônica — usos | 3 | 6 | Mais oportunidades para escolher protocolo e apoiar os adjacentes. |
| Cataclisma — usos | 3 | 5 | Continua tardio, mas entrou mais vezes. |
| Monge — usos | 10 | 15 | Mais tempo para sustentação intermediária. |
| Disparo — usos/eliminações diretas | 16/16 | 20/20 | Continua removendo alvos selecionados pelo piloto quando há atacante aliado. |
| Potencializar — usos | 32 | 49 | Mais rodadas também permitem mais usos do poder recorrente. |
| Ultimato — usos | 23 | 26 | Mais partidas alcançam a janela do poder único. |

São totais das 32 participações da Forja. Mais usos de uma carta não prova sozinho que ela esteja forte demais; oportunidades, compras e decisões mudaram. A melhora beneficia o pacote completo, incluindo poderes — não só os corpos caros.

## Por que Fluxo não acompanhou

Fluxo × Ruptura passou de 8,13 para 8,75 rodadas, mas permaneceu 0–16. Evasão teve 49 usos, contra 46; Sono teve 30 ativações, contra 25. Auramora restaurou 59 de vida em criaturas no agregado, contra 41. O controle e a cura estão atuando, mas o tempo ganho ainda não virou vitória nesse confronto.

A leitura de design é que as respostas individuais atrasam ameaças, enquanto Ruptura repõe corpos e mantém pressão no Patrono. Essa é uma hipótese sustentada pela função das cartas e pelos resultados, não uma medição isolada de cada sinergia. Não demonstra que o Fluxo seja inviável para jogadores humanos ou que todas as suas cartas precisem de buff.

Contra Forja, dar mais tempo favoreceu o adversário: Fluxo foi de 9–7 para 7–9. É uma mudança de duas partidas, não evidência de um novo domínio da Forja nesse confronto.

## Ruptura preservou pressão

- Estilhaço permanece com 1 de dano por custo 1. Foram 41 usos, com 26 de dano agregado ao Patrono (igual à bateria de vida 16) e 15 eliminações diretas de criaturas, contra oito antes. Mais usos vieram em remoções pontuais.
- Chamado gerou 74 fichas em 37 usos, exatamente duas por uso; antes foram 56 em 28 usos. O crescimento é de oportunidades durante partidas mais longas, não retorno da antiga escalada por cemitério.
- Geômetro teve 48 usos e 42 fichas observadas depois do combate, contra 41 usos/34 fichas. A restrição de primeiro bloqueio por entrada continua implementada. Esse contador pode deixar de contar fichas criadas e removidas no mesmo combate.
- Gnoll ativou 39 vezes em 54 participações, mantendo +1 por combate. A condição de aliado no combate continua ativa; os nerfs não foram revertidos.
- Fulgor foi usado dez vezes: oito usos no Patrono (48 de dano agregado) e dois em criaturas. Um acerto de 6 equivale agora a 30% da vida inicial, contra 37,5% com vida 16.
- Incursora, Rastreadora e Cólera permanecem fortes no plano de pressão. Não foram alteradas nesta execução.

Ruptura × Forja caiu de 14–2 para 11–5; contra Fluxo permanece 16–0. O agregado de 84,38% segue alto nesta simulação, embora a redução seja maior que a observada somente com os quatro nerfs.

## Avaliação prática

**Boa consequência:** Forja chega ao seu final com mais regularidade, preservando a identidade de criaturas grandes sem adicionar cura ou aceleração de mana.

**Custo da mudança:** partidas ficam mais longas e a Forja passa a ter mais oportunidades de usar os poderes; o benefício não é distribuído igualmente entre as três energias.

**Problema ainda aberto:** a interação Fluxo × Ruptura. Antes de fazer outro ajuste global de vida ou nerfar cartas indiscriminadamente, faz sentido investigar se Fluxo consegue converter controle em pressão e responder à reposição de várias ameaças. A configuração 20 é uma melhoria para o acesso da Forja ao fim do jogo, não um balanceamento concluído.

Miragem continua sendo uma carta cujo piloto raramente ou nunca prioriza; a viabilidade da mecânica deve ser conferida por função e por cenários específicos. Cartas caras agora têm mais exposição, mas seis usos de Verônica e cinco de Cataclisma ainda são poucos para concluir o equilíbrio individual.

## Método e limites

- 48 partidas completas no motor real: 16 por confronto, 32 participações por deck.
- Mesmas 24 sementes pareadas com iniciativa inicial invertida; mesmos pilotos imediato e planejado, sem alterações no algoritmo. O planejado usa busca curta e valor futuro; não é um agente perfeito.
- Quatro partidas por combinação de estilos em cada confronto. Total imediato 28 vitórias, planejado 20; como os blocos têm sementes diferentes, isso não isola superioridade de um estilo.
- Visão pública: sem acessar a mão, a ordem do baralho ou a formação oculta real do rival. Formação usa hipóteses e o resolvedor real.
- Mantidos os quatro nerfs aprovados, iniciativa alternada, mulligan igual, limite de reserva excluindo Emanação, fadiga e poderes atuais da Forja. Fluxo e Ruptura ainda não têm poderes equivalentes implementados.
- Validação: hashes do motor/catalogo, identidade dos pilotos, sementes/ordens, 16 partidas por confronto e catálogos com diferenças apenas na vida. A suíte npm test passou, incluindo teste dos três Patronos e reinício com 20 de vida.
- Aparições incluem mão inicial e reentrada por devolução; participações podem incluir criaturas que morrem antes de atacar. Dano de combate agregado é nominal, e a atribuição de efeitos indiretos/fichas é incompleta. Contadores não medem contribuição causal nem substituem partidas humanas.
- As partidas são 24 pares, não 48 amostras independentes. A comparação melhora a leitura da intervenção; os percentuais não são uma previsão exata de taxa de vitória do público.

## Arquivos

partidas.csv, cartas-comparadas.csv, comparacao.json, resultados.json e catalogo-testado.json nesta pasta. Resultados de vida 16 preservados. Prévia local com a nova regra: http://127.0.0.1:3056/runamarca/.
`;
fs.writeFileSync(dir+'/RELATORIO.md',md);
console.log(JSON.stringify(comparison,null,2));
