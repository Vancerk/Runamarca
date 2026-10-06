# Compra e mão inicial — Runamarca

Análise de 5 de outubro de 2026. A regra de embaralhamento não foi alterada nesta atualização.

## Implementação atual

1. Cada cópia física da carta ganha um identificador próprio.
2. O servidor monta o baralho e usa Fisher–Yates, com números de `node:crypto.randomBytes`.
3. A mão inicial tem cinco cartas. A primeira preparação compra mais uma.
4. As compras retiram cartas da ordem já embaralhada, sem reposição. Não há ajuste de custo, tipo, raridade, condição de vitória ou jogador.
5. Cada jogador pode trocar cartas uma vez. As cartas devolvidas entram no baralho ANTES do novo embaralhamento e das compras substitutas. A mesma instância pode voltar.
6. Cada partida sorteia uma nova ordem. Jogar contra o bot não usa um embaralhamento diferente.

### Detalhe técnico

A conversão do número aleatório para um índice usa resto de divisão. Quando o número de posições não divide exatamente 2^32, há um viés matemático muito pequeno entre índices. Para 30 cartas, sua escala é insuficiente para explicar uma sensação evidente de mãos repetidas. Uma melhoria técnica possível é usar `crypto.randomInt`, que evita esse viés. Isso não foi aplicado, pois o pedido desta etapa foi explicar a regra de compra.

## Probabilidades antes da troca

Num deck de 30 cartas e uma mão de cinco, a chance de aparecer ao menos uma carta de determinado nome é:

| Cópias no deck | Chance na mão inicial |
|---|---:|
| 1 | 16,67% |
| 3 | 43,35% |
| 4 | 53,84% |

Repetições não significam sorteio com reposição: são cópias distintas do mesmo nome. Após devolver só uma carta da mão inicial, sem outras alterações, o baralho tem 26 cartas; a chance de voltar exatamente a mesma instância é 1/26, ou 3,85%. Outras cópias do mesmo nome aumentam a chance de voltar uma carta visualmente igual.

## Verificação local

Foi executado o algoritmo real de embaralhamento em 20.000 baralhos com 30 instâncias diferentes. A primeira carta comprada apareceu de 600 a 712 vezes por instância, contra uma expectativa de 666,67. Qui-quadrado: 26,674 com 29 graus de liberdade. A amostra não apresentou sinal evidente de concentração nessa posição.

Esse ensaio verifica apenas a distribuição da primeira posição. Não demonstra a uniformidade de todas as permutações, nem substitui a investigação de um histórico de compras específico ou dos efeitos visuais. Dados: `aleatoriedade-2026-10-05.json`.

## Comparação

### Hearthstone

O guia oficial descreve três cartas iniciais para quem começa, quatro para quem joga em segundo e troca individual de cartas. A quantidade inicial e as decisões de troca já mudam a distribuição das mãos que chegam ao primeiro turno. O artigo não publica o algoritmo interno de embaralhamento; portanto, não é possível afirmar que a implementação técnica seja idêntica à do Runamarca.

Fonte: [Blizzard — Opening Moves: Mulligans](https://hearthstone.blizzard.com/en-us/news/21363040/opening-moves-mulligans).

### Magic de mesa

Na regra London Mulligan, a mão inteira retorna ao baralho, o jogador compra normalmente sete cartas e coloca no fundo uma quantidade igual ao número de mulligans realizados, com exceções de formato. Essa seleção é diferente da troca individual gratuita do Runamarca.

Fonte: [Wizards — The London Mulligan](https://magic.wizards.com/en/news/announcements/london-mulligan-2019-06-03).

### Magic Arena

Há suavização da mão inicial em partidas melhor de uma. O desenvolvedor WotC_Jay esclareceu que ela considera terrenos versus não terrenos, ignorando custos e cores. Isso não é uma garantia de mão perfeita e não corresponde a uma garantia de curva de mana no Runamarca, que não possui terrenos.

Fonte primária: [WotC_Jay — explicação sobre hand smoothing](https://old.reddit.com/r/MagicArena/comments/1d45vm8/how_did_we_end_up_with_hand_smoothing_in_bo1/l6dir05/?context=3).

## Avaliação

A sensação relatada pode vir da quantidade de cópias, da composição por custos e tipos, da troca permitir o retorno imediato da mesma instância ou da apresentação visual. A amostra isolada não aponta uma anomalia evidente no sorteio. Não foi introduzida garantia de carta barata, proibição de duplicatas ou favorecimento de um jogador. Caso seja desejada uma mão inicial mais consistente, isso precisa ser tratado como uma nova regra de design, com impactos sobre o equilíbrio dos decks.
