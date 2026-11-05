# Mesa 3D — etapa 2, compras e retornos à mão

Concluído localmente em 05/11/2026. Base: etapa 1, commit `b290d19d4b1c1f68adfc8944dab8f6093c35a078` (PR #14). Branch isolada: `codex/simplificar-cartas-etapa2`. A candidata de publicação do PR #13 e a árvore original foram preservadas.

## Mudança

Uma chegada era acompanhada por `pendingArrival` no cliente e pelos conjuntos `pending`, `inserted` e `tokens` na camada 3D. Liberar só parte desses controles podia deixar a carta invisível ou a mão bloqueada. Um `finally` antigo também podia apagar a indicação de espera de outra chegada com o mesmo UID.

`card-arrivals.js` passa a ser o responsável compartilhado por essas informações. Cada carta tem uma reserva de chegada e, durante o voo, um identificador exclusivo associado à geração da apresentação e à partida. Ao trocar de partida, recuperar uma lacuna de eventos, encerrar ou cancelar, os identificadores anteriores deixam de ser válidos. Uma conclusão atrasada não pode inserir, revelar ou liberar a chegada nova.

- `reserve` registra a chegada; o cliente e o leque consultam a mesma informação.
- `begin` adquire um identificador; o mesmo UID não pode ter dois voos de chegada ativos.
- `insert` permite reservar o espaço final no leque, mantendo a carta real escondida até o pouso.
- `finish` libera somente o voo que adquiriu o identificador.
- `reset` invalida também as esperas assíncronas ainda pendentes.

Saíram a fila `pendingArrival`, os três conjuntos duplicados e as substituições de `command` e `revealArrival` feitas por `flights.js`. O cliente consulta explicitamente a trava antes de jogar uma carta da mão. A marcação DOM e o bloqueio de interação são consumidores do mesmo estado. A galeria de entradas e os instrumentos de QA foram atualizados para essa interface; não guardam outra fila.

`flights.js` ainda guarda os elementos e animações que precisa remover. Isso é controle de recursos, não uma segunda decisão sobre a disponibilidade da carta. O cliente compartilhado sem adaptador 3D também usa o responsável novo. Retornos do rival não liberam chegadas locais. A conclusão de um retorno antigo não remove uma cópia nova que reutilize o UID.

## Alcance deste bloco

Migrados: compras normais, compras de abertura que usam a mesma rotina e Evasão/retorno à mão. As travas gerais de abertura e troca de mulligan usam o novo responsável para eliminar `tokens`, mantendo sua coreografia.

A migração completa da abertura, das transferências, das baixas e da redistribuição continua sendo o próximo bloco da etapa 2. `movingCards`, os remanescentes de dano e as substituições das rotinas de animação ainda têm consumidores. Não foram apagados nem apresentados como concluídos. Layout, câmera, renderer, regras, bot e rede não foram alterados. Não houve novo trabalho de adaptação para celular.

## Validação

**66/66 verificações Node**: contrato novo, sequência da etapa 1, invalidação, abertura/mulligan, transferências da galeria, fantasmas, relógios, efeitos, Evasão e interface. Os testes antigos em VM passaram a carregar o responsável real, preservando as verificações de resultado. O teste do retorno sem destino mantém a limpeza e agora exige que um retorno rival não revele uma chegada local. Há também uma corrida do retorno nativo contra uma nova partida com o mesmo UID.

**215/215 verificações de navegador**, Edge local, sem erros de página:

| Instrumento | Resultado | Cobertura |
|---|---:|---|
| `presentation-stage2-arrivals` | 26/26 | Evasão real, pintura atrasada, resize, movimento reduzido, partida nova durante pintura, saída e sigilo da compra rival |
| `hybrid9-motion` | 12/12 | Compras em fila, reserva/leque, interrupção por resize e blur, abertura cancelada |
| `hybrid10-interaction` | 145/145 | Consultas, disponibilidade, ritmo da compra, magias e impactos |
| `presentation-stage2-compare` | 32/32 | Antes/depois, posições, foco, confirmação, saída, nova partida, compra normal e cliente compartilhado |

A Evasão usa o motor real e cartas do catálogo. O dono recebe a criatura durante a mesma preparação. Depois da troca legal de vez e da compra normal desse turno, a página envia a jogada pela API de QA e o motor aceita a criatura de volta na reserva, ainda na rodada 4. A API é interceptada pelo harness e encaminhada ao motor em memória: não é uma partida de produção nem um teste novo de autenticação.

A pintura da face de destino foi atrasada em 700 ms enquanto chegavam redesenhos. A cópia de origem permaneceu pintada durante a espera; nas amostras do voo houve uma cópia visível e nenhuma carta real duplicada na mão. O teste também mantém a compra antiga aguardando pintura, troca a partida e reutiliza o UID; a conclusão antiga não libera a chegada nova. Os testes não simulam perda permanente de recursos de arte.

Os casos são de desktop: 1920×1080, 1366×768 e resoluções já cobertas pela suíte de interação. Não há declaração nova de compatibilidade móvel.

## Comparação local com a etapa 1

Mesma árvore de dados, navegador e resolução; os arquivos anteriores foram servidos por interceptação, a partir do commit base. As 24 caixas medidas em preparação e formação mantiveram as mesmas posições e dimensões, com diferença máxima de 0 px. Uma atualização continua fazendo uma reconstrução síncrona e duas no total.

| Medida | Etapa 1 | Este bloco |
|---|---:|---:|
| `render`, mediana / p95, 1920×1080 | 85,0 / 92,7 ms | 74,2 / 78,5 ms |
| `render`, mediana / p95, 1366×768 | 86,5 / 91,6 ms | 85,7 / 92,4 ms |
| Compra normal, incluindo atualização inicial, Full HD (2 execuções) | 2,262 / 2,282 s | 2,231 / 2,230 s |
| Compra normal, incluindo atualização inicial, 1366 (2 execuções) | 2,268 / 2,269 s | 2,242 / 2,236 s |
| Pior intervalo entre quadros nas compras, Full HD | 172,6 ms | 133,5 ms |
| Pior intervalo entre quadros nas compras, 1366 | 172,5 ms | 144,6 ms |

São medições de uma sessão, com 20 atualizações por condição e duas compras por condição. Não demonstram um ganho geral de desempenho: as tarefas longas continuam presentes. A pausa de leitura permaneceu aproximadamente em 1,05 s, e nenhum valor de duração foi editado. O p95 entre quadros das compras permaneceu entre 5,7 e 5,8 ms nessa máquina.

## Comandos e evidências

```powershell
node scripts/presentation-stage2-qa.mjs arrivals prototype-qa/simplificacao-etapa2-20261105/final
node scripts/presentation-stage2-qa.mjs motion prototype-qa/simplificacao-etapa2-20261105/final
node scripts/presentation-stage2-qa.mjs interaction prototype-qa/simplificacao-etapa2-20261105/final
node scripts/presentation-stage2-qa.mjs comparison prototype-qa/simplificacao-etapa2-20261105/final
```

O runner cria um servidor temporário em `127.0.0.1:3095`, acompanha o teste e encerra o servidor. Deve ser executado em sequência. Os scripts e o contrato ficam versionados; capturas, JSONs e logs estão no checkout local, em `prototype-qa/simplificacao-etapa2-20261105/`.

A primeira execução focal teve 20/26: duas verificações contavam a compra independente do rival como resíduo do retorno, e quatro tentavam jogar durante a compra normal do início do turno. O roteiro foi corrigido para distinguir os eventos e esperar essa compra. A execução foi preservada em `execucao-1/`; `execucao-2/` e `final/` passaram 26/26. A tentativa inicial do runner sem permissão de rede local não alcançou o `/health`; o servidor foi encerrado, e as validações seguintes usaram loopback autorizado.

Arquivos preservados byte a byte:

- `game.mjs`: `0ac0d8ca5cc1bdd42d4b997631b301f130cb571c5a75d95812c0e7ac8eaa0644`.
- `hybrid/renderer.js`: `0cf671f3b64f41d00d220e48d341d5d46c7805bd821c94243a0bf7766e7e6c20`.
- `hybrid/config.js`: `044e54bb5033c887457be1c90bd98f17283e421c7ed32d68996db3a7b422e396`.

## Integração

PR dependente da etapa 1, para revisão separada. Não altera os PRs #13 e #14 nem publica esta refatoração. Manter a aprovação por outra conta antes da integração na branch protegida. Reversão: retirar somente o commit deste bloco, sem mudar dados, sessões ou feedback.
