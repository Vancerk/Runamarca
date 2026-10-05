# Forja × Fluxo — revisão de 4 de outubro de 2026

## Resultado das 20 partidas

| Indicador | Bateria anterior | Bateria atual |
|---|---:|---:|
| Forja — vitórias | 20/20 (100%) | 13/20 (65%) |
| Fluxo — vitórias | 0/20 (0%) | 7/20 (35%) |
| Empates | 0 | 0 |
| Rodadas por partida | 7,25 | 8,20 |
| Combates por partida | 6,40 | 7,95 |
| Intervalo de duração | 5–11 rodadas | 5–13 rodadas |
| Forja vence começando na rodada 1 | 10/10 | 7/10 |
| Fluxo vence começando na rodada 1 | 0/10 | 4/10 |

**A revisão reduziu bastante a vantagem observada de Forja. Ela continua favorecida nesta amostra, mas Fluxo passou a ter caminhos reais de vitória.** A distribuição de vitórias não demonstra equilíbrio definitivo: o intervalo de Wilson de 95% para 13/20 é aproximadamente 43%–82%, mesmo supondo observações independentes. A amostra é pequena e as políticas compartilham a mesma estrutura.

Forja ganhou suas partidas em média na rodada **9,15**, contra **6,43** nas vitórias de Fluxo. Esse resultado se aproxima melhor das identidades pretendidas: Fluxo consegue vencer antes de os finalizadores de Forja entrarem; Forja converte melhor partidas que se estendem. Não significa que esses tempos sejam uma regra de todas as partidas humanas.

## Método e comparação

- Apenas **Oficina de Lyrik** e **Ecos de Virelion**, ambos com 30 cartas.
- Motor real do jogo; vida inicial dos Patronos 16; uma troca inicial para cada jogador; moeda na rodada 1 e alternância nas rodadas seguintes.
- Dez partidas começando com cada deck. As **20 sementes são as mesmas da bateria anterior**.
- O catálogo de Fluxo foi verificado contra a revisão anterior e está **inalterado**. As mudanças de catálogo são as autorizadas em Forja: custos, vida, quantidades e três novas magias.
- Mantidos os perfis pressão, campo e recursos, a troca inicial de cartas de custo 4 ou maior e a avaliação de formações contra três hipóteses do adversário.
- O agente recebe apenas a visão pública permitida ao jogador: não consulta mão, ordem do baralho, armadilhas ocultas ou formação secreta do rival.
- A política recebeu suporte para **Geada, Disparo e Toque permanente**, usando redução de ataque, remoção e sobrevivência como critérios. Também exclui formações impossíveis de dois provocadores disputando uma mesma casa. Nenhuma regra ou carta do jogo foi alterada nesta bateria.
- Emanação não conta para o limite da reserva. Geada exclui Emanação; Disparo pode atingir uma criatura em Emanação. Reduções permanentes são limitadas a ataque mínimo zero; Iniciativa e danos normais usam a resolução oficial do motor.
- Animações são avançadas por temporizadores virtuais; não se mede desempenho visual nem sincronização de som.

Não é uma comparação causal isolada de cada nerf: vários custos, atributos, quantidades e novas cartas mudaram juntos. A mesma semente também não garante que a mesma carta seja comprada, porque a composição mudou. O suporte do agente às novas magias era necessário para que elas fossem usadas; logo, esta não é uma política byte a byte idêntica à anterior.

## Forte / merece acompanhamento

| Carta | Evidência atual | Comparação e interpretação |
|---|---|---|
| **Disparo de Forja** | 21 usos; 37 HP efetivamente removidos; 20 eliminações diretas | Foi a resposta imediata mais eficiente de Forja contra este Fluxo, cheio de criaturas com 1–2 de vida. Os alvos foram Luz em 14 usos, Olho em 3, Auramora em Emanação em 3 e Bruxa em 1. Forte neste confronto; isso não prova custo injusto contra decks de criaturas resistentes. |
| **Rompe-problema** | 27 entradas; 153 de dano ao Patrono; 21 mortes em combate | Antes: 26 entradas e 192 de dano ao Patrono. Continua sendo o principal encerrador de Forja; aumentar custo e reduzir vida tornou-o mais trocável. Transpassar com 6 de ataque ainda pune bloqueadores pequenos. |
| **Geada Implacável** | 14 usos diretos; 49 pontos de ataque retirados permanentemente | Média de 3,5 pontos removidos por uso. Pode neutralizar corpos de ataque 1 e enfraquecer vários combates futuros. O valor cresce quanto mais tempo as vítimas sobrevivem. Não afeta Emanação. |
| **Golias** | 10 entradas, 21 participações em combate, 49 de dano ao Patrono; 3 mortes | Antes: 4 entradas, 7 participações e 15 de dano ao Patrono. O jogo mais longo permite que ele exerça a função de finalizador resistente. Seu destaque justifica acompanhamento; a bateria não prova que precise de nerf. |

Disparo destruiu três Auramoras em Emanação, de forma válida pelas regras. Forja agora possui resposta ao suporte de Fluxo, além de redução em área; Fluxo ainda não possui remoção de dano ou destruição nesta lista. Isso é uma assimetria relevante quando Forja chega ao seu final de jogo.

## Fraco / pouco retorno nas condições testadas

| Carta | Evidência atual | Comparação e interpretação |
|---|---|---|
| **Sintético Próspero** | 6 entradas, 15 participações, 11 pontos de crescimento de ataque; 14 cópias na mão ao fim | Antes: 20 entradas e 27 pontos de crescimento. Agora custa 3 para entrar como 0/2. A demora para gerar pressão torna sua implantação pouco atraente para o agente. Possível excesso no aumento de custo; não alterado. |
| **Elfo Estudioso** | 3 entradas; 4 de cura paga; 20 cópias na mão ao fim | Antes: 13 entradas e 20 de cura. Custo 4 para 1/2, mais pagamento por cura, concorre com cartas que recuperam o campo imediatamente. Amostra pequena de usos, mas rejeição frequente pelo agente. |
| **Aprendiz vireliana** | 45 entradas, 40 mortes em combate; 5 de dano ao Patrono | Antes: 48 entradas, 47 mortes e 3 de dano ao Patrono. Melhorou pouco. O corpo 1/1 e a dependência de outro aliado buffado continuam frágeis contra redução permanente de ataque e remoção. |
| **Benção Estelar** | 11 preparações, 9 ativações; 9 cópias na mão ao fim e 8 descartadas | Antes: 8 usos e 7 descartes. Custa 5 por +2 de ataque sem proteção de vida; o alvo pode morrer antes de aproveitar plenamente o benefício permanente. |
| **Toque Gélido** | 6 preparações, 6 ativações; 5 pontos de ataque retirados; 15 cópias na mão ao fim | Mais limitado que Geada: uma casa, um alvo, ativação futura. Uma ativação não retirou ataque por já estar no mínimo zero. O agente valoriza menos essa demora. Resultado insuficiente para declarar a carta intrinsecamente fraca. |

## Na média / função útil

| Carta | Evidência | Interpretação |
|---|---|---|
| **Mecânico Proativo** | 24 entradas, 91 participações, 10 mortes; 22 de dano ao Patrono | Antes: 42 entradas, 146 participações, 3 mortes e 99 de dano ao Patrono. Custo 3 e vida 2 retiraram boa parte da pressão precoce. Iniciativa continua útil; deixou de parecer o motor dominante desta amostra. A redução de cópias também influencia os totais. |
| **Luz enganosa** | 54 entradas; 63 de dano ao Patrono, contra 42 antes | Um caminho de pressão de Fluxo que voltou a funcionar com a desaceleração de Forja. |
| **Olho Flutuante** | 43 entradas; 46 de dano ao Patrono, contra 8 antes | Melhorou muito sem alteração da própria carta. O nerf do rival tornou o corpo 2/2 mais relevante, embora ainda tenha 33 mortes em combate. |
| **Auramora** | 32 de cura paga, contra 24 antes | Apoio funcional, agora com maior janela para trabalhar. Vulnerável a Disparo; cura somente criaturas. |
| **Bruxa** | 23 entradas, 47 participações, 18 mortes | Sustenta desgaste, mas não é uma ameaça de pressão imediata. O total de redução por maldição não foi instrumentado separadamente, portanto não se atribui uma quantidade não medida. |
| **Barreira espectral** | 17 preparações e 30 ativações, pois pode durar dois combates | Ajuda criaturas frágeis a permanecerem relevantes. Não remove ameaças e não concede ataque. |
| **Anão Taverneiro** | 45 entradas; 37 mortes | Compra continua útil ao custo 2, mesmo com corpo descartável. Não é um combatente resistente. |
| **Anão Escudeiro** | 27 entradas; 17 mortes e 3 de dano ao Patrono | Papel defensivo de baixo custo. Não foi a fonte de pressão responsável pelas vitórias. |
| **Monge Rúnico** | 6 entradas, 11 participações, 1 morte | Redução temporária ajuda trocas; houve menos aparições também pela redução a uma cópia. Não há evidência suficiente de excesso. |
| **Reforço Divino** | 6 usos, contra 7 antes | Sinergia funcional para sustentar uma ameaça. O benefício causal não foi isolado. |
| **Uma a mais / uma a menos** | 16 e 19 usos | Compra funcionou; a segunda manteve descarte obrigatório. Sem fadiga, não foram um custo decisivo. |

**Sem amostra suficiente:** Vaelgor teve 4 entradas, Banquete 4, Veronica 4 e Cataclisma 2. Banquete apareceu mais que antes (1), mas ainda depende de campo preservado. Não é prudente usar duas aparições de Cataclisma para julgar sua força.

Âncora teve 9 preparações e 7 ativações. A política ainda trata seu controle de movimento de forma simples; não mede o benefício estratégico da casa fixada. Sua avaliação permanece inconclusiva.

## Recursos e ritmo

| Indicador acumulado nas 20 partidas | Forja anterior | Forja atual | Fluxo anterior | Fluxo atual |
|---|---:|---:|---:|---:|
| Eventos de compra durante o andamento | 238 | 272 | 221 | 242 |
| Cura paga de Emanação | 20 | 4 | 24 | 32 |
| Mana restante ao encerrar preparação | 84 | 76 | 96 | 165 |
| Cartas queimadas | 0 | 1 | 0 | 0 |
| Dano de fadiga | 0 | 0 | 0 | 0 |

Os eventos de compra incluem as compras emitidas na troca inicial; não são contagem exclusiva de compra extra nem de cartas únicas. O tempo maior também aumenta compras naturalmente. Mana não utilizada não é sempre erro: pode faltar alvo válido ou valer a pena preservar recursos. Porém, o aumento em Fluxo sugere dificuldade de converter mana em respostas úteis, especialmente após perder campo ou ataque para Geada.

## Leitura para a próxima decisão — nenhuma mudança aplicada

1. **Preservar por enquanto os nerfs do Mecânico e Rompe-problema.** Eles reduziram a pressão de Forja, enquanto as cartas continuam tendo função.
2. **Reexaminar Sintético e Elfo antes de nerfar mais Forja.** Há sinais de que ficaram caros para o retorno imediato; qualquer melhoria precisa ser testada para não devolver o domínio inicial.
3. **Acompanhar Geada e Disparo.** A primeira afeta repetidamente combates futuros; a segunda responde muito bem aos corpos específicos de Fluxo. Alterar ambos de imediato seria precipitado com esta amostra.
4. **Examinar as opções de interação de Fluxo e o custo da Benção.** Fluxo melhorou sem mudanças, mas ainda tem dificuldade de responder a um finalizador resistente. Comprar cartas não substitui uma resposta viável.
5. **Não perseguir 10–10 por ajuste automático.** O 13–7 é um avanço em relação ao 20–0; para confirmar a faixa, o próximo passo seria outra bateria com novas sementes e planos de jogo adicionais, mantendo este catálogo.

## Limites das contagens

Entradas são usos de cartas, não número de partidas em que apareceram. Participações e mortes em combate não incluem uma atribuição causal por habilidade; uma criatura que sofre remoção antes do combate não é contada como morte em combate. Dano ao Patrono usa o ataque registrado e pode ultrapassar a vida restante; não é necessariamente HP útil retirado. Crescimento de ataque é aumento líquido observado no combate, não contagem exclusiva de buffs originados pela própria carta.

As estratégias variam pesos de uma mesma família de heurísticas. Geada e Disparo foram usados apenas diretamente nesta execução: sua alternativa como armadilha é válida no motor, mas não foi explorada pela política. O agente não move livremente criaturas já implantadas entre reserva e Emanação e descarta a carta de maior custo quando obrigado a descartar. Esses limites podem prejudicar planos sofisticados de Fluxo ou alterar a avaliação das cartas de suporte. **65% não deve ser divulgado como taxa comprovada de partidas humanas.**

## Reprodução

Na raiz, execute:

```powershell
$env:NODE_OPTIONS='--preserve-symlinks --preserve-symlinks-main'
node --experimental-vm-modules design/simular-novos-20261004-revisao.mjs
```

O script lê o catálogo atual; reproduzir exatamente esta revisão exige o catálogo correspondente. `decks-usados.json` preserva os dois decks usados; `resultados.json` registra sementes, perfis, ações, contagens e hashes do motor e do catálogo. A bateria anterior permanece intacta em `design/testes-2026-10-04-novos/`.
