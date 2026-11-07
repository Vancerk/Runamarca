# Amostra de direção de arte — 05/11/2026

Continuidade: a aplicação às famílias de interface/material e a revisão técnica de áudio estão registradas em `DIRECAO-AUDIOVISUAL-INTEGRAL-20261105.md`. Este documento preserva o alcance e os resultados da amostra anterior.

Estado: implementação local para avaliação artística. Sem commit, push ou publicação desta amostra. Base da comparação: `073429de71be9412442abcd690fe017227434408`, após a simplificação da apresentação. Branch de trabalho: `codex/amostra-arte-patronos`.

**Esclarecimento de escopo após a revisão do dono:** o repasse audiovisual completo não foi executado. O diagnóstico foi parcial, e a amostra concentrou os complementos concretos do dono. Ainda faltam uma comparação representativa da direção visual ampla (hierarquia, materiais, cor, molduras e tipografia), sua consolidação em regras reutilizáveis, aplicação por famílias e revisão audiovisual integrada. Os testes abaixo comprovam apenas os caminhos alterados; não aprovam nem encerram o plano mestre.

## Origem e decisões

O pedido atual usa `REPASSE-ORQUESTRADOR.txt` e a nota “Runamarca - plano mestre audiovisual”. O repasse pede uma amostra de preparação, formação, impacto e resultado antes de ampliar a direção artística. As adições do dono pedem espessura da moeda, espaço entre mãos e Patronos, queima mais evidente e duas vezes mais lenta, custos com a cor da afinidade, Provocar espacial e encerramento com a mesa escura e os dois Patronos iluminados. O adendo seguinte pede escurecimento temporário durante emissões luminosas.

O plano mestre diz: **“Emissão mágica é temporária e local.”** Também exige luz de preenchimento para leitura e a sequência origem → preparação → deslocamento → contato → consequência → repouso. Não há regra que impeça o pedido. A amostra usa um escurecimento temporário do ambiente, preservando a origem, o alvo e o efeito. A autorização atual do dono prevalece sobre direções históricas.

Preservados: câmera vertical de 0°, transição de foco de 400 ms, regras do motor, destinos e momento de dano, sigilo, ritmo de combate, consultas deliberadas, formulário após o encerramento. Desktop é o escopo: Full HD principal e 1366×768 como compatibilidade. Não houve novo trabalho de port para celular.

## Mudanças e aceite

| ID | Problema e evidência | Amostra aplicada e motivo | Prioridade | Critério de aceite / estado |
|---|---|---|---|---|
| A01 | Mão toca o retrato: folga de −3,3 px no próprio lado e 3,5 px no rival em Full HD. | Folga de 24,7 px nos dois lados; mantém o desenho do leque. | Alta | Separação ≥20 px e controles íntegros passam. **Troca aceita pelo dono nesta revisão:** cartas do campo encolhem 5,7% em Full HD e 3,2% em 1366. |
| A02 | A moeda já tinha volume de 22 px, mas a pose quase frontal o escondia. | Volume de 30 px, pose final mais inclinada de lado e geometria sem animação de opacidade que a achate. Mantidos textura, sombra e 96 faces na borda. | Média | Borda visível de lado e no pouso. Aceite visual do dono pendente. |
| A03 | Compra queimada desaparece rápido. Percurso nominal 1.550 ms. | 3.100 ms, carta maior, legenda explícita e chama mais evidente; segue ao Nartvanyr. | Alta | Tempo medido 1.602 → 3.149 ms; ausência de resíduo visual. Versão reduzida também dobra os tempos próprios. |
| A04 | Todos os selos de custo usam azul. | Interior azul/Fluxo, dourado/Forja, vermelho/Ruptura; borda e número preservados. | Média | Cores ligadas à afinidade do dono; Fluxo e Forja conferidos nas cenas, Ruptura definida no CSS. |
| A05 | Opções de Provocar estavam listadas sem representar a posição da criatura. | Colunas seguem Sol/Lua/Estrela, “Somente à frente” na coluna da origem; dupla abaixo. | Alta | As três posições nos dois assentos enviam comandos corretos ao motor. Nomes reais das casas mantidos. |
| A06 | Resultado já ocupa o centro antes de dar destaque aos dois Patronos na mesa. | Escurece a mesa; preserva ambos os retratos, estrelas no derrotado e tiro; depois apresenta o resultado. | Alta | Vitória, derrota, espectador, empate, saída e evento único de término passam. Questionário aguarda o término. |
| A07 | Efeitos luminosos competem com a iluminação ambiente. | Uma máscara de exposição com aberturas suaves na origem/alvo e VFX acima dela. Fulgor mais forte, demais emissões menores. | Alta | Dano real coincide, alvo legível, máscara não captura cliques, limpa no fim/saída/resize, sem acúmulo de escuridão. Sem pulso em movimento reduzido. |

O dono aceitou expressamente a folga entre mãos e Patronos e a redução atual do campo. Também sugeriu reduzir mais os cantos/bordas para dar respiro aos elementos; isso é uma direção a estudar, sem percentual adicional definido. Essa aceitação não equivale à aprovação de toda a amostra. O comparador preserva as capturas e o aviso da entrega inicial.

## Regra de luz testada

`light-focus.js` fornece um único efeito de exposição. Entrada de 180 ms e saída de 300 ms; teto de 0,48 de opacidade. Emissões simultâneas usam a maior intensidade, nunca a soma. Origem e alvo seguem suas posições na tela. Isso é um recurso de apresentação, não simulação de luz física nem mudança na lâmpada ou no renderer.

Cobertura desta amostra: famílias de dano `fulgor`, `ember`, `forge`, `shard`, `cone`, `wind`; efeitos transitórios `volatile`, `ice`, `frost`, `upgrade`, `fundamental`, `barrier`, `rally`, `tribal`, `mirror`; queima de compra excedente. Halos persistentes não mantêm a mesa escura. Não declarar que cada animação especial do catálogo foi individualmente revalidada. A aplicação a outras famílias depende da escolha desta direção e da sua revisão em cena.

## Referência de Hearthstone

O vídeo local `osK7rxtAGWQ`, trecho 849–858 s, foi inspecionado quadro a quadro: destruição do herói, escurecimento, painel de derrota e recompensa. O foco nos dois Patronos, estrelas e tiro é a adaptação pedida para Runamarca; não se afirma que a referência tenha essa mesma sequência. As capturas estão em `prototype-qa/arte-20261105/referencia/hearthstone-fim.jpg`.

O vídeo da amostra tem cerca de 32 s, com o áudio existente do jogo. Não houve nova mixagem, substituição de voz/música nem uso de candidatos Epidemic. Audição artística e licença para novos ativos continuam etapas separadas. Os valores dos tempos foram preservados na transcodificação; a captura não é uma medição de 60 FPS.

## Verificação

- Focal da amostra: **43/43**, sem erros de página (`final-2/report.json`).
- Geometria: **41/41**, ambos os assentos, Full HD e 1366×768.
- Interação: **145/145** na repetição sem mudar código nem asserções. A primeira execução parou na espera fixa de 220 ms do hover; a sonda confirmou o estado correto depois, tanto na base como na candidata. Evidência falha preservada; causa exata dessa variação não provada.
- Combate: **52/52**, com Registro aberto, redimensionamento, movimento reduzido e saída.
- Sete scripts Node afetados: exit 0 (`test-damage-fx`, `test-ui`, `test-mesa-layout`, `test-forge-ui`, `test-spell-modes-presentation`, `test-patron-reveal-ui`, `test-creature-entrances`).
- Janela de Fulgor, base/amostra: intervalo p50 5,6/5,6 ms; p95 5,8/5,7 ms; máximo 83,5/83,2 ms; tarefa longa 63/64 ms. Uma execução por condição, incluindo atualização e captura: comparação indicativa, sem garantia de desempenho.

O motor continua SHA-256 `0ac0d8ca5cc1bdd42d4b997631b301f130cb571c5a75d95812c0e7ac8eaa0644`. Não há modificação em `renderer.js`.

## Como revisar e reproduzir

Abra `prototype-qa/arte-20261105/REVISAR.html`. Não requer servidor. O comparador alterna antes/depois e resolução, tem os detalhes e o vídeo com busca temporal. O “antes” serve os arquivos exatos do commit-base pelo harness, com MIME correto e hashes registrados; não reverte a árvore de trabalho.

```powershell
node scripts/art-direction-qa.mjs baseline
node scripts/art-direction-qa.mjs final-2
node scripts/art-sample-video.mjs
node scripts/presentation-stage2-qa.mjs geometry prototype-qa/arte-20261105/regressoes
node scripts/presentation-stage2-qa.mjs interaction prototype-qa/arte-20261105/regressoes-retry
node scripts/presentation-stage1-qa.mjs combat prototype-qa/arte-20261105/regressoes
```

Cada runner usa servidor isolado e o encerra. As cenas têm estado preparado para repetibilidade. Provocar e o dano de Fulgor passam pelo motor real; moeda e queima são acionadas pelo módulo de apresentação; o encerramento parte de um estado final preparado. Isso não substitui uma partida completa em produção.

Próximo passo: completar o diagnóstico e a amostra da direção visual ampla, incluindo respiro, hierarquia e materiais, com os ajustes já feitos preservados. Avaliar essa direção antes da consolidação e expansão por famílias prevista no repasse. A folga/redução atual já foi aceita e não precisa de nova confirmação. Para reverter a amostra, remover somente o diff desta branch contra `073429de`; não reverter a simplificação integrada nem a árvore histórica.
