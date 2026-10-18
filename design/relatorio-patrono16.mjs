import fs from 'node:fs/promises';
const dir='design/testes-2026-10-03-patrono16';
const previous=JSON.parse(await fs.readFile('design/testes-2026-10-03-pontos/resultados.json','utf8'));
const current=JSON.parse(await fs.readFile(dir+'/resultados.json','utf8'));
const a=previous.summary,b=current.summary;
const pct=(w,n)=>(100*w/n).toFixed(1)+'%';
const rows=b.decks.map(d=>{const old=a.decks.find(x=>x.deck===d.deck);return `| ${d.deck} | ${old.wins}/${old.games} (${pct(old.wins,old.games)}) | ${d.wins}/${d.games} (${pct(d.wins,d.games)}) |`;});
const pairs=b.matchups.map(d=>`| ${d.left} × ${d.right} | ${d.leftWins}–${d.rightWins} | ${d.draws} | ${d.meanRounds.toFixed(2)} |`);
const improvement=100*(a.rounds.mean-b.rounds.mean)/a.rounds.mean;
const text=`# RunaMarca — Patronos com 16 de vida

## Método

54 partidas automatizadas: 18 por confronto e 36 participações por deck. Mesmas sementes, planejador e nove combinações de perfis (pressão, campo e recursos), com ambos os jogadores começando. Comparação com a bateria de decks por pontos de 20 de vida. Apenas a vida inicial/máxima dos Patronos mudou; cartas, custos, habilidades e regras de área permanecem iguais. Todas as aberturas verificaram 16/16 de vida.

## Vitórias

| Deck | 20 de vida | 16 de vida |
|---|---:|---:|
${rows.join('\n')}

## Confrontos com 16 de vida

O placar segue a ordem dos decks na primeira coluna.

| Confronto | Placar | Empates | Média de rodadas |
|---|---:|---:|---:|
${pairs.join('\n')}

## Ritmo e ordem de jogo

- Média de rodadas: ${a.rounds.mean.toFixed(2)} → ${b.rounds.mean.toFixed(2)} (${improvement.toFixed(1)}% de redução).
- Mediana: ${a.rounds.median} → ${b.rounds.median}; intervalo atual: ${b.rounds.min}–${b.rounds.max} rodadas.
- Vitórias de quem começa: ${a.firstWins}/${a.games} → ${b.firstWins}/${b.games}.
- Empates: ${b.draws}.

## Leitura

A redução de vida aproximou os resultados gerais: Forja caiu de 23 para 20 vitórias, Fluxo subiu de 16 para 18 e Ruptura de 15 para 16. Isso favorece testar 16 de vida com jogadores, mas não comprova equilíbrio entre todos os confrontos. Consulte os placares individuais: um total próximo pode esconder vantagens específicas.

## Recursos por deck

| Deck | Compras extras por partida | Fichas por partida | Preparações terminadas sem cartas | Mana disponível não usada | Eventos de fadiga |
|---|---:|---:|---:|---:|---:|
${b.decks.map(d=>`| ${d.deck} | ${d.meanExtraDraws.toFixed(2)} | ${d.meanTokens.toFixed(2)} | ${d.emptyHandPct.toFixed(1)}% | ${d.unusedManaPct.toFixed(1)}% | ${d.fatigue} |`).join('\n')}

## Validações e limites

${current.method.checks.length} verificações de regras da simulação, além da conferência de vida inicial/máxima em todas as partidas. O cenário de resistência ao gatilho do Escudeiro usa uma ficha de teste com 3 de vida; o catálogo das partidas mantém os atributos reais. A suíte de funcionamento também passou (22 testes e os dois roteiros de RunaMarca).

As políticas automáticas têm busca limitada e não representam a habilidade humana. São 18 partidas por confronto; os resultados ainda são sensíveis às decisões e compras. Rodadas simuladas não permitem confirmar duração de 15–25 minutos. Mesmas sementes permitem comparação controlada, mas decisões diferentes podem mudar as compras posteriores.

Resultados completos e rastros: resultados.json. Catálogo e motor usados: catalogo-testado.json e motor-testado.mjs. Mudança aplicada localmente, sem publicação no GitHub/Render.
`;
await fs.writeFile(dir+'/RELATORIO.md',text);
console.log(JSON.stringify({rounds:b.rounds,firstWins:b.firstWins,matchups:b.matchups,checks:current.method.checks.length,improvement},null,2));
