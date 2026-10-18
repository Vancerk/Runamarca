import fs from 'node:fs/promises';
const dir='design/testes-2026-10-04-alternancia';
const old=JSON.parse(await fs.readFile('design/testes-2026-10-03-patrono16/resultados.json','utf8'));
const run=JSON.parse(await fs.readFile(dir+'/resultados.json','utf8'));
const a=old.summary,b=run.summary,pct=(x,n)=>(100*x/n).toFixed(1)+'%';
run.method.checks=[...new Set([...run.method.checks,'Uma troca inicial para ambos, verificada nas 54 aberturas.','Ordem alternada verificada em cada preparação de cada rodada.'])];
run.method.policy+='; ordem de votação acompanha o primeiro da rodada; estatística de primeiro refere-se sempre à moeda inicial';
await fs.writeFile(dir+'/resultados.json',JSON.stringify(run,null,2));
const switches=run.games.filter((g,i)=>g.winner!==old.games[i].winner).length;
const text=`# RunaMarca — alternância e uma troca inicial

Data: 04/10/2026.

## Método

54 partidas, 18 por confronto e 36 participações por deck. Mesmos decks, sementes e nove combinações dos perfis pressão, campo e recursos da bateria anterior. Moeda define a ordem inicial; nas rodadas pares a ordem de preparação é invertida, nas ímpares retorna à inicial. Ambos podem trocar cartas da mão inicial uma vez. Patronos continuam com 16 de vida.

O motor é uma cópia isolada da bateria anterior com apenas essas duas alterações de regras. A rotina de votação acompanha a ordem de preparação da rodada. A medida “primeiro” identifica quem venceu a moeda inicial, mesmo que comece em segundo em rodadas posteriores. Motor e catálogo do site permanecem intactos.

## Ordem inicial

| Resultado | Antes | Alternância + uma troca |
|---|---:|---:|
| Vencedor da moeda inicial | ${a.firstWins}/${a.games} (${pct(a.firstWins,a.games)}) | ${b.firstWins}/${b.games} (${pct(b.firstWins,b.games)}) |
| Segundo da primeira rodada | ${a.games-a.firstWins-a.draws}/${a.games} (${pct(a.games-a.firstWins-a.draws,a.games)}) | ${b.games-b.firstWins-b.draws}/${b.games} (${pct(b.games-b.firstWins-b.draws,b.games)}) |
| Empates | ${a.draws} | ${b.draws} |

## Decks

| Deck | Antes | Agora |
|---|---:|---:|
${b.decks.map(d=>{const p=a.decks.find(x=>x.deck===d.deck);return `| ${d.deck} | ${p.wins}/${p.games} (${pct(p.wins,p.games)}) | ${d.wins}/${d.games} (${pct(d.wins,d.games)}) |`;}).join('\n')}

## Confrontos

Placar na ordem dos nomes da primeira coluna.

| Confronto | Antes | Agora | Rodadas, agora | Vitórias de quem ganhou a moeda |
|---|---:|---:|---:|---:|
${b.matchups.map(d=>{const p=a.matchups.find(x=>x.left===d.left&&x.right===d.right);return `| ${d.left} × ${d.right} | ${p.leftWins}–${p.rightWins} | ${d.leftWins}–${d.rightWins} | ${d.meanRounds.toFixed(2)} | ${d.firstWins}/18 |`;}).join('\n')}

## Ritmo e recursos

Média: ${a.rounds.mean.toFixed(2)} → ${b.rounds.mean.toFixed(2)} rodadas. Mediana: ${b.rounds.median}; intervalo: ${b.rounds.min}–${b.rounds.max}. ${switches}/54 partidas tiveram outro vencedor comparadas às sementes da bateria anterior.

| Deck | Compras extras/partida | Fichas/partida | Preparações encerradas sem cartas | Mana não usada | Eventos de fadiga |
|---|---:|---:|---:|---:|---:|
${b.decks.map(d=>`| ${d.deck} | ${d.meanExtraDraws.toFixed(2)} | ${d.meanTokens.toFixed(2)} | ${d.emptyHandPct.toFixed(1)}% | ${d.unusedManaPct.toFixed(1)}% | ${d.fatigue} |`).join('\n')}

## Interpretação

A vitória de quem perdeu a moeda inicial passou de ${pct(a.games-a.firstWins-a.draws,a.games)} para ${pct(b.games-b.firstWins-b.draws,b.games)}. O pacote reduziu a associação entre a ordem inicial e o vencedor nesta bateria. Não garante equilíbrio em partidas humanas nem identifica separadamente quanto veio da alternância ou da igualdade de trocas.

O principal desequilíbrio restante é Fluxo × Forja: Forja venceu 16/18, enquanto venceu 7/18 contra Ruptura (houve um empate). Isso sugere investigar esse confronto específico antes de enfraquecer todo o deck de Forja. Ruptura venceu 7/18 contra Fluxo. Os totais por deck devem ser lidos junto dos confrontos.

## Validações e limites

${run.method.checks.map(c=>'- '+c).join('\n')}

As duas regras foram alteradas juntas: este teste mede o pacote, sem separar a contribuição de cada uma. As partidas usam políticas automáticas de busca limitada, não jogadores humanos. São 18 partidas por confronto; diferenças pequenas não comprovam superioridade. As sementes são iguais, mas mudanças de decisões e trocas podem alterar compras posteriores. Rodadas simuladas não medem duração em minutos.

Resultados e rastros: resultados.json. Cenário reproduzível: motor-testado.mjs e catalogo-testado.json. Nenhuma alteração foi publicada no jogo ou no GitHub nesta bateria.
`;
await fs.writeFile(dir+'/RELATORIO.md',text);
console.log(JSON.stringify({firstWins:b.firstWins,games:b.games,rounds:b.rounds,decks:b.decks.map(d=>({deck:d.deck,wins:d.wins,games:d.games})),matchups:b.matchups,switches,checks:run.method.checks.length},null,2));
