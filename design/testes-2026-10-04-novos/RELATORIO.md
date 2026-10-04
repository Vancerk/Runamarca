# Bateria dos novos decks — 4 de outubro de 2026

## Resultado

| Deck | Vitórias | Derrotas | Aproveitamento |
|---|---:|---:|---:|
| Oficina de Lyrik — Forja | 20 | 0 | 100% |
| Ecos de Virelion — Fluxo | 0 | 20 | 0% |

Média de **7,25 rodadas** e **6,4 combates** por partida; duração entre **5 e 11 rodadas**. Forja ganhou tanto as dez partidas em que começou quanto as dez em que Fluxo começou. Não houve empate, queima de cartas ou dano por fadiga. A alternância não resolveu a diferença de força deste confronto.

## Como foi feito

- Exclusivamente os dois novos decks de 30 cartas, incluindo Sintético Ouro com duas cópias, quatro Taverneiros e três Elfos.
- Motor real do jogo, com as regras atuais; Patronos com 16 de vida, uma troca inicial para ambos, início por moeda e ordem invertida a cada rodada.
- Dez partidas com cada deck começando. Embaralhamento e moeda reproduzíveis por semente registrada no JSON.
- Três perfis heurísticos: pressão, campo e recursos. Avaliam eficiência de mana, força imediata, sobrevivência, compra, cura e crescimento. Formação compara posições possíveis contra três hipóteses construídas a partir das criaturas públicas do rival. Pode recusar combate desfavorável; a partir da rodada 12 procura encerramento.
- Decisões recebem apenas a visão daquele jogador. Não consultam a mão, a ordem do baralho, as armadilhas ocultas ou a formação secreta adversária. O motor completo fica reservado para executar ações e calcular efeitos.
- Âncora e Barreira obedecem às durações aprovadas; Bruxa reduz cada alvo uma vez; Auramora cura criaturas mediante pagamento. Provocar exige adjacência. Iniciativa precede dano normal; ataques normais são simultâneos.
- Os temporizadores de animação são avançados artificialmente. São partidas completas do motor, não testes de tempo de tela ou de áudio.

**Limite:** são 20 partidas de políticas automatizadas, não 20 partidas humanas. Os estilos variam pesos de uma mesma família de decisões; não cobrem todos os planos possíveis. Especialmente Âncora, magias de posição e economia de compra podem ser melhor exploradas por humanos. O placar é um alerta forte para revisão, não uma taxa humana comprovada de 100%. Mesmo 20/20 deixa um intervalo de Wilson de aproximadamente 84%–100% sob as condições amostradas. Não se deve extrapolá-lo a todos os confrontos.

## Muito forte neste confronto

| Carta / conjunto | Evidência observada | Leitura |
|---|---|---|
| Mecânico Proativo | 42 entradas, 146 participações em combate, apenas 3 mortes em combate; 99 de dano ao Patrono | 2/3 por 2 com Iniciativa elimina Luz 3/2 e Olho 2/2 antes da resposta. A vida 3 sustenta sobrevivência contra as pequenas criaturas restantes. Produz vantagem cedo, antes dos finalizadores. |
| Rompe-problema | 26 entradas e 192 de dano ao Patrono, somando ataques sem defensor e Transpassar | 6 de ataque por 4 contra corpos de pouca vida é um encerrador muito eficiente. Bloquear com uma criatura pequena nem sempre protege o Patrono. O número não isola o dano de Transpassar. |
| Sintético Próspero | 20 entradas, 41 participações, 27 pontos de aumento permanente de ataque | A redução para duas cópias limita consistência, mas custo 1 ainda oferece crescimento barato quando consegue sobreviver. Não é necessário torná-lo inútil; o problema maior observado foi a combinação com pressão e Iniciativa. |
| Forja inicial + compra em criaturas | 238 compras registradas durante o andamento, contra 221 de Fluxo | Taverneiro e Estudioso colocam corpo e recompõem recurso. Forja consegue disputar campo enquanto compra. Esses totais incluem as compras de troca inicial emitidas pelo motor e não medem apenas compra extra. |

A explicação principal está no início e no meio do jogo: **Forja não precisou esperar Golias, Veronica ou Cataclisma para dominar**. Ela assumiu aqui um papel mais agressivo do que sua identidade pretendida.

## Muito fraco ou com retorno baixo

| Carta / conjunto | Evidência observada | Leitura |
|---|---|---|
| Aprendiz vireliana | 48 entradas, 47 mortes em combate; 3 de dano ao Patrono | Corpo 1/1 depende de bônus em outro aliado. A condição exige montagem; o adversário já pressiona antes disso. |
| Olho Flutuante | 41 entradas, 39 mortes em combate; 8 de dano ao Patrono | 2/2 por 2 sem habilidade troca mal com o Mecânico de mesmo custo. |
| Benção Estelar | 8 usos; 9 cópias na mão ao fim e 7 descartes forçados | 5 mana por +2 de ataque, sem aumentar vida, concorre com a necessidade de reconstruir campo. Preparar o bônus também exige um ocupante que permaneça útil. |
| Banquete dos Heróis | Apenas 1 uso; 3 cópias na mão ao fim, 2 descartes | Precisa de vários corpos sobreviventes para recuperar seu custo 6. O campo frequentemente é perdido antes desse ponto. A política exige ao menos duas criaturas ativas, portanto esta baixa utilização também reflete essa escolha. |
| Vaelgor | 4 entradas, 4 mortes em combate | O apoio de ataque adjacente precisa de aliados; 4/3 por 6 é vulnerável. Amostra pequena, embora o risco estrutural seja claro. |
| Âncora Etérea | 6 preparações | Restringir movimento não remove a ameaça nem reduz seu ataque. Pode melhorar uma estratégia específica, mas o agente não demonstrou conseguir converter esse controle em vitória. Não há evidência suficiente para classificá-la como inútil. |

A compra do Fluxo funcionou, mas **mais opções não bastaram para recuperar o campo**. As magias de compra gastam mana sem colocar corpo; a reposição oferece muitas criaturas que continuam perdendo o confronto de atributos/habilidades. Houve 96 de mana não utilizada no encerramento das preparações de Fluxo, contra 84 de Forja: o problema não é apenas falta de compra ou mana.

## Na média / úteis, com ressalvas

| Carta | Evidência | Leitura |
|---|---|---|
| Luz enganosa | 42 entradas; 42 de dano ao Patrono | 3/2 por 2 cria pressão real quando encontra casa vazia. O problema específico é perder antes de responder à Iniciativa. |
| Auramora | 24 pontos de cura pagos | A cura funcionou. É apoio econômico, não uma remoção; curar 1 não compensa sozinho grandes diferenças de combate. |
| Bruxa | 22 entradas, 45 participações, 18 mortes | Redução permanente por alvo ajuda a longo prazo, mas 1 de ataque oferece pouca contestação imediata. Precisa de campo que suporte sua estratégia. |
| Barreira espectral | 13 preparações | Vida temporária pode permitir sobreviver ao primeiro impacto. Não fornece ataque nem ameaça própria. Utilidade razoável, sem demonstração de que esteja excessiva. |
| Uma a mais / uma a menos | 22 / 15 usos | Compra oferece opções; a segunda também exigiu descarte conforme a regra. Não houve queima ou fadiga, então essas penalidades não decidiram os jogos. |
| Anão Escudeiro | 34 entradas, 29 participações, 5 de dano ao Patrono | Apoio defensivo; não foi o principal responsável pela pressão. |
| Taverneiro | 40 entradas, 32 mortes | Corpo descartável que entrega compra ao entrar. Muito bom como motor de recursos, mas não mostrou domínio pelo corpo em si. |
| Elfo Estudioso | 13 entradas, 20 pontos de cura pagos | Apoio funcional, utilizado principalmente em Emanação. |
| Anão Estudioso | 11 entradas; apenas uma participação como combatente | Papel de compra e aura, não de atacante. A utilização não permite isolar o valor da aura. |
| Monge Rúnico | 10 entradas, 30 participações, nenhuma morte em combate | Ajuda a preservar campo com redução de ataque. Pode merecer atenção, mas é menos claro que Mecânico e Rompe-problema: entra depois e enfrenta um Fluxo já enfraquecido. |
| Reforço Divino | 7 usos | +2/+2 reforça uma criatura já útil. É parte da sinergia; a bateria não isolou seu efeito causal. |

## Sem amostra suficiente

- **Golias:** quatro entradas. Resistência e Provocar são relevantes, mas o custo 8 impediu participação frequente.
- **Veronica:** duas entradas. Não houve crescimento por eliminação registrado nessas aparições.
- **Cataclisma:** nenhuma entrada. Sete cópias ficaram na mão ao fim. Isso indica que custo 10 ficou fora do ritmo desta bateria, não que a habilidade seja fraca quando usada.

## Próxima revisão sugerida — não aplicada

1. Examinar **Mecânico Proativo** primeiro: custo, resistência ou condição para Iniciativa. O confronto de 2 mana é muito desigual.
2. Examinar **Rompe-problema**: os 6 de ataque com Transpassar punem justamente os bloqueadores frágeis de Fluxo.
3. Dar a Fluxo uma resposta acessível ao campo inicial ou reduzir o custo de montagem de suas sinergias. Atualmente não há remoção direta/de área entre as cartas desse novo deck.
4. Rever Benção e a condição da Aprendiz: custo e dependência estão altos para o retorno observado.
5. Preservar a função dos finalizadores de Forja. O placar não justifica nerfar indiscriminadamente cartas de custo 8–10 que quase não entraram.

Não foram alterados custos, atributos ou habilidades em função deste placar. As únicas alterações de composição são as autorizadas pelo usuário.

## Reprodução e dados

Execute na raiz: `node --experimental-vm-modules design/simular-novos-20261004.mjs`.

`resultados.json` contém sementes, resultado de cada partida, estilos, contagens por carta, histórico de ações e hashes do motor/catálogo usados. O dano por carta é dano de ataque registrado (pode incluir excesso); não representa exclusivamente HP removido nem mede causalmente o valor da habilidade.
