# Etapa 5 — entrada única e recuperação 3D

05/11/2026. Base local: `0df6696` (etapa 4). Integração final das cinco etapas de simplificação autorizadas pelo dono.

## Mudança

`mesa-nova/index.html` é a única entrada da mesa. O HTML duplicado em `hybrid/index.html` foi removido; as URLs `/runamarca/`, `/runamarca/index.html`, `/runamarca/hybrid/` e `/runamarca/hybrid/index.html` continuam aceitas pelo servidor, com as mesmas sessões, autenticação e convites. Elas servem os mesmos bytes.

Os módulos deixam de substituir funções globais de hover, mira, criação de cartas, disponibilidade e impacto. O cliente declara eventos e pontos de extensão em `RunaPresentation`; os adaptadores recebem esses pontos sem trocar as funções originais. A comparação verifica a identidade de 17 funções depois da inicialização. A suavização de imagens fica nas próprias funções de desenho, preservando o resultado anterior.

O fallback público 2D e sua barra de seleção foram retirados. Uma falha de WebGL oculta a superfície indisponível e mostra uma mensagem com foco no botão de nova tentativa. Há uma tentativa automática por interrupção, seguida das opções de tentar novamente ou recarregar. Restaurar o contexto recria recursos gráficos e reposiciona a mesa sem criar nova sessão. A partida e seus relógios continuam no servidor durante a interrupção.

A limpeza diferencia os recursos de um contexto válido dos identificadores invalidados pelo navegador. Tentar apagar identificadores antigos depois de restaurar o contexto causava `INVALID_OPERATION`; a recuperação final já não produz esse erro.

## Validação concluída

- Perda e restauração de WebGL: 25/25 em 1920×1080 e 1366×768. Inclui repetição, perda durante compra, mesma sessão e geometria, saída e reentrada, falha na criação inicial e recuperação manual. Nenhum erro de página ou WebGL. Capturas da interrupção e da mesa restaurada inspecionadas.
- Comparação com a etapa 4: 36/36 em Full HD e 1366×768, sem erros de página ou WebGL. Geometria preservada dentro de 1 px, 17 funções originais sem substituição e entrada canônica equivalente. Capturas antes/depois inspecionadas. A primeira execução (32 verificações) tinha um erro de MIME no comparador de CSS; suas capturas não valem como prova visual. A execução válida está em `comparacao-css-corrigida/`, com checagem explícita de todas as folhas locais.
- Interação: 145/145, incluindo compra, magias, golpes, dano letal e movimento reduzido.
- Atualizações incrementais: 9/9; a mão mantém nós e foco quando uma revisão altera outra região.
- Contrato S2 de erros WebGL: 7/7; `draw()` continua sem consumir o erro pendente, que permanece disponível até limpeza explícita.
- Suíte ampla: 41/41 comandos, incluindo HTTP de contas e entrada da mesa. Os seis testes de fila e geometria passaram separadamente e foram incluídos no comando padrão de testes.
- Contratos Node de apresentação, chegadas, mira, dano e layout: 44/44. Recuperação do worker do bot: 5/5 com o parâmetro `--experimental-vm-modules` exigido pelo projeto. A primeira execução desse último teste sem o parâmetro foi um erro do comando de QA, preservado como histórico.

Integração final concluída na mesma árvore:

| Caminho | Resultado |
|---|---|
| Abertura, mulligan e transferências | 35/35 |
| Compras e retornos, incluindo Evasão Dimensional | 26/26 |
| Redistribuição da reserva | 12/12 |
| Geometria compartilhada | 41/41 |
| Combate, baixas, Registro e cancelamento | 52/52 |
| Duplicatas no combate, incluindo Provocar | 72/72 |
| Autenticação pela entrada de produção local | 18/18 |
| Partida completa com bot automático e feedback | 13/13 |

A instância isolada de produção usou `server.js`, sem `NODE_ENV=test`, com código temporário aleatório e armazenamento local. O humano fez 15 ações legais, todas aceitas; o bot agiu pelo servidor e venceu na rodada 5, em 61 segundos. O questionário abriu após o encerramento, gravou uma resposta e não reapareceu na reconexão. A instância foi encerrada ao final. O teste de autenticação identifica o 503 de conta Discord desconfigurada e a fonte externa bloqueada pelo próprio QA como exceções esperadas.

Comandos reproduzíveis: `node scripts/presentation-stage2-qa.mjs <modo> <pasta-nova>`, com os modos `recovery`, `comparison`, `incremental`, `interaction`, `webgl`, `transfers`, `arrivals`, `motion`, `geometry` e `duplicates`; `node scripts/presentation-stage1-qa.mjs combat <pasta-nova>` para o combate; `node scripts/presentation-prod-qa.mjs <pasta-nova>` para autenticação e bot reais. Na comparação desta etapa, usar `QA_COMPARE_REVISION=0df6696`. Os wrappers iniciam e encerram servidores locais isolados.

Evidências locais: `prototype-qa/simplificacao-recuperacao-20261105/` e `prototype-qa/hybrid-12/suite-simplificacao-final.json`. As tentativas de recuperação anteriores à correção ficam separadas em pastas históricas. Credenciais temporárias do teste de autenticação existem apenas em memória e no ambiente dos processos de QA.

## Alcance e limites

HTML continua responsável por controles acessíveis e texto; canvas pelas faces das cartas; WebGL por materiais e volume. O diretório `hybrid` continua contendo componentes ativos. Não foi renomeado nem apagado apenas por seu nome, e não há promessa de eliminar essas tecnologias.

Os tempos de animação, a câmera de 0° e o foco de 400 ms foram preservados. `game.mjs` mantém o SHA-256 `0ac0d8ca5cc1bdd42d4b997631b301f130cb571c5a75d95812c0e7ac8eaa0644`. O ganho de reconstrução foi medido na etapa 4; ainda há tarefas longas e não se promete 60 FPS contínuos.

A antiga verificação de fallback em `hybrid12-regressions.mjs` foi atualizada para a recuperação 3D; a validação executada desta mudança é o teste focal de recuperação acima. A suíte histórica inteira, que depende de capturas externas, não foi declarada reexecutada.

Esta entrega é local e em PR dependente. Não faz merge, publicação ou alteração no Render; testes locais de feedback não comprovam gravação no banco do site.
