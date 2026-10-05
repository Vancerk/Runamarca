# Fluxo com Evasão Dimensional e Sono Profundo

20 partidas completas contra a Oficina de Lyrik, em 4 de outubro de 2026. O Forja foi preservado. No Fluxo, saíram duas Uma a menos e três Benção Estelar; entraram três Evasão Dimensional (2 mana) e dois Sono Profundo (3 mana). Total: 30 cartas, 19 criaturas e 11 magias.

## Regras aplicadas

- Evasão devolve uma criatura da reserva inimiga à mão do dono, sem dano, bônus ou estados, com atributos e custo originais. Exclui Emanação. Para jogar novamente, paga-se o custo original. Mão cheia segue a regra de queima existente.
- Sono é preparado numa casa inimiga e ativa sobre a criatura revelada nela. A criatura fica presa nessa casa, não ataca nem pode ser retirada ou reposicionada, mas recebe dano normalmente. A duração abrange o combate de ativação e o seguinte. Rodadas sem combate não gastam duração.
- O arquivo enviado descrevia Sono como magia direta; a implementação segue a confirmação posterior de ativação e permanência no quadrado.

## Comparação

| Indicador | Bateria anterior | Atual |
|---|---:|---:|
| Forja | 14/20 (70%) | 8/20 (40%) |
| Fluxo | 6/20 (30%) | 12/20 (60%) |
| Empates | 0 | 0 |
| Vitórias de quem iniciou | 12/20 | 10/20 |
| Média de rodadas | 8,85 | 8,30 |
| Média de combates | 8,60 | 8,15 |

Forja venceu quatro dos dez jogos em que iniciou; Fluxo venceu seis dos dez em que iniciou. A ordem alternou em todas as rodadas. As vitórias de Fluxo ocorreram entre as rodadas 5 e 8 (média 6,42); as de Forja, entre 10 e 13 (média 11,13).

## O que se destacou

**Muito forte nesta amostra:** o pacote de controle barato. Evasão foi usada 19 vezes e devolveu 19 criaturas; Sono foi preparado 17 vezes e ativou 15. Ambos ficaram apenas duas vezes na mão ao final. Retorno remove investimento e exige novo pagamento; sono impede ataque e mantém uma criatura vulnerável numa casa. Em conjunto, abriram oportunidades para o Fluxo vencer cedo. Não é possível atribuir as seis vitórias adicionais a uma carta isolada.

**Forja perdeu pressão, mas conserva seu final de jogo:** Rompe-problema causou 77 de dano ao Patrono, antes 117; Veronica, 18, antes 53. Golias manteve 57, antes 56, e não morreu nos confrontos registrados, mas seis cópias terminaram sem uso, antes três. É um corpo resistente quando entra, com custo que dificulta responder a derrotas precoces.

**Fortes, sem evidência suficiente de excesso:** Geada Implacável teve 19 usos e retirou 69 pontos de ataque, antes 14 e 54. Disparo teve 20 usos e 20 eliminações, igual ao teste anterior. Estes números mostram utilidade, sem provar que custo ou efeito devam mudar: oportunidades e alvos também mudaram.

**Contribuição intermediária:** Luz enganosa e Olho Flutuante continuaram oferecendo pressão: 67 e 44 de dano ao Patrono, respectivamente, contra 63 e 45 antes. A sobrevivência melhorou (20 mortes para cada modelo, antes 31 e 34), compatível com o novo suporte de controle.

**Fracos ou situacionais para estes agentes:** Banquete teve quatro usos e quatro cópias sem uso ao final. Auramora curou 21, antes 32; esta queda também pode resultar de menos necessidade de cura em jogos rápidos. Não demonstra que a cura esteja quebrada ou que seja necessário fortalecê-la. Fluxo deixou 260 de mana sem gastar, antes 248: vencer com cartas baratas e partidas curtas não significa eficiência perfeita de toda a curva.

## Método e limites

Motor real do jogo, mesmas 20 sementes da bateria anterior, dez inícios por deck, Patronos com 16 de vida, uma troca inicial por jogador e ordem alternada. Três perfis heurísticos consideram pressão, controle do campo e recursos, usando apenas a visão pública. O agente foi adaptado para valorar retorno e sono e respeitar casas bloqueadas; portanto a comparação inclui cartas novas e suporte estratégico para seus efeitos.

Os testes de regras verificaram sigilo, pagamento, atributos originais, mão cheia, imunidade da Emanação ao retorno, permanência do sono, recebimento de dano, impossibilidade de atacar ou mover e despertar. A suíte geral também passou. Não foram feitos novos ajustes de balanceamento após o placar.

20 jogos automatizados são uma amostra exploratória, não uma taxa de vitória humana. Para 12/20, o intervalo de Wilson de 95%, supondo independência, é aproximadamente 39%–78%; os agentes compartilham lógica e essa hipótese é limitada. O resultado indica um confronto mais disputado nesta bateria, não equilíbrio competitivo demonstrado. Os arquivos resultados.json e decks-usados.json preservam ações, sementes, métricas e versões usadas.
