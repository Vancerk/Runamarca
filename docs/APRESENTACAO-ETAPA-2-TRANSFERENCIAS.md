# Mesa 3D — etapa 2, abertura e transferências

Bloco de 05/11/2026, sobre `953e18b3ce6819a9d4912f28808d1b0a98ac1dff` (PR #15). Branch `codex/simplificar-abertura-transferencias`, no checkout isolado `runamarca-simplificacao-etapa2`. A árvore histórica e os commits dos três PRs anteriores foram preservados.

## Resultado

A confirmação da mão inicial e os voos entre mão, reserva, Emanação, armadilhas e formação passaram a usar o mesmo responsável por partida e UID já adotado nas compras e na Evasão. O cliente adquire o identificador do voo; a camada 3D desenha sua animação; somente quem adquiriu aquele identificador pode liberar a carta.

- `card-arrivals.js` controla transferências por UID e a espera pelo lote de abertura. A limpeza da fila de compras não cancela uma transferência no campo.
- `command()` protege o voo durante a resposta do servidor e libera seus recursos em sucesso, recusa ou cancelamento. Uma resposta atrasada de outra geração visual não restaura a partida antiga.
- `animateOpeningToHand()` coordena as cinco transferências e a trava da mão. A compra do primeiro turno espera esse lote terminar ou ser cancelado.
- `presentation-lifecycle.js` recebe o registro explícito das animações. `flights.js` deixa de substituir `animateTransfer` e `animateOpeningToHand` em tempo de execução; mantém a geometria e a coreografia anteriores.
- O arrasto e a colocação provisória deixam a conclusão do voo a cargo desse responsável. Os vizinhos consultam o mesmo estado antes de tentar mover ou revelar a carta.
- Reset, saída, blur e resize retiram as cópias e invalidam os identificadores. Uma conclusão antiga não pode revelar outra transferência que reutilize o UID.
- A galeria de entradas carrega o mesmo contrato e invalida seus voos ao limpar a cena.

As transferências migradas não escrevem mais no conjunto `movingCards`. Esse conjunto continua existindo para combate, baixas e outros caminhos ainda não migrados. `flights.js` mantém referências aos nós e animações para removê-los; elas não decidem separadamente se o UID está disponível.

## Alcance e preservações

Este é o segundo bloco da etapa 2, não o encerramento dela. As rotinas 3D de compra, Evasão e devolução das cartas trocadas no mulligan ainda substituem funções do cliente, embora suas travas já usem o responsável compartilhado. Baixas e redistribuição dos vizinhos continuam pendentes.

Nenhum tempo de animação, regra, câmera, material ou disposição da mesa foi alterado. A abertura conserva 1.150 ms por transferência e escalonamento de 110 ms; a camada 3D mantém o ajuste existente para movimento reduzido. Não houve nova adaptação para celular. O servidor, o bot, o banco e o feedback não foram modificados.

Arquivos preservados byte a byte:

- `game.mjs`: `0ac0d8ca5cc1bdd42d4b997631b301f130cb571c5a75d95812c0e7ac8eaa0644`.
- `hybrid/renderer.js`: `0cf671f3b64f41d00d220e48d341d5d46c7805bd821c94243a0bf7766e7e6c20`.
- `hybrid/config.js`: `044e54bb5033c887457be1c90bd98f17283e421c7ed32d68996db3a7b422e396`.

## Verificação

Os cenários novos usam cartas do catálogo e o motor real em memória. A página envia os comandos HTTP; o harness encaminha-os ao motor e devolve a visão do jogador. Isso não é uma nova validação de autenticação ou uma partida de produção.

Cobertura: duas substituições do mulligan com o perfil rápido; confirmação das cinco cartas e compra do turno; arrasto para a reserva; entrada/saída de Emanação; preparo, mudança de casa e retirada de armadilha (resposta atrasada em 500 ms); colocar, mover e retirar da formação; recusa do servidor; cancelamento e confirmação de escolha de entrada; pintura atrasada; resize; blur; saída; movimento reduzido; nova partida reutilizando UID e resposta HTTP antiga.

O teste da abertura e da reserva antigo passou a chamar a operação que já adquire seus identificadores, sem preparar `movingCards` por fora. Uma cópia de DOM no teste de UI ganhou o método `remove` que um nó real possui. As asserções de resultado foram mantidas. A comparação pode receber `QA_COMPARE_REVISION` e serve todos os arquivos diferentes diretamente do commit anterior, registrando os hashes servidos.

| Verificação final | Resultado | Evidência local |
|---|---:|---|
| Contratos e regressões de Node (16 arquivos) | 70/70 | `node.log` |
| Abertura, transferências e cancelamentos | 35/35 | `final-r3/transfers/` |
| Movimento da reserva e abertura | 12/12 | `regressao/motion/` |
| Compras, retornos e Evasão | 26/26 | `regressao/arrivals/` |
| Interação da mão e da mesa | 145/145 | `regressao/interaction/` |
| Comparação com o commit anterior | 32/32 | `comparacao-r2/comparison/` |

São 250 verificações de navegador nos resultados finais, sem erros de página. Após acrescentar a limpeza da galeria, os testes de entradas e UI foram conferidos novamente (8/8); não são somados outra vez ao total de Node. A bateria completa do projeto não foi repetida.

As tentativas anteriores continuam guardadas. `execucao-1` usava o modo incorreto para preparar uma magia e tentava confirmar durante a apresentação do Patrono. `execucao-2` passou 32/32 antes do acréscimo do arrasto e da escolha provisória. `final` e `final-r2` foram interrompidas por seletores do roteiro de escolha; não contam como aprovação completa. O caso isolado corrigido passou 4/4 em `entrada-focal`, seguido do teste completo em `final-r3`.

## Comparação e desempenho

Em 1920×1080 e 1366×768, as 24 caixas medidas em preparação e formação mantiveram posições e dimensões: diferença máxima de 0 px. As capturas em tamanho real também foram conferidas. Uma atualização continua fazendo uma reconstrução síncrona e duas no total. Este bloco não declara ganho geral de fluidez.

As evidências locais ficam em `prototype-qa/simplificacao-transferencias-20261105/`. A primeira comparação registrou uma compra de 6,687 s, com intervalo de 1.569 ms e tarefas longas. A repetição sequencial em navegador novo não reproduziu essa pausa; a causa do evento isolado não foi determinada. Ambos os resultados estão preservados. Isso não demonstra que pausas longas foram eliminadas.

Medições da repetição (DPR 1, mesmo estado e navegador, 20 atualizações e duas compras por condição):

| Tela | Medida | Antes | Depois |
|---|---|---:|---:|
| 1920×1080 | `render()` mediana / p95 | 135,6 / 144,8 ms | 123,9 / 139,3 ms |
| 1920×1080 | Duas compras completas | 2.491 / 2.440 ms | 2.437 / 2.416 ms |
| 1920×1080 | Maior intervalo entre quadros nas compras | 225,1 ms | 224,2 ms |
| 1366×768 | `render()` mediana / p95 | 142,2 / 153,7 ms | 134,2 / 142,0 ms |
| 1366×768 | Duas compras completas | 2.463 / 2.403 ms | 2.454 / 2.397 ms |
| 1366×768 | Maior intervalo entre quadros nas compras | 250,5 ms | 224,7 ms |

São medições, sem limite de aprovação de desempenho. A amostra é curta, ainda contém tarefas longas e mantém a mesma quantidade de reconstruções. Os números não sustentam uma promessa de FPS nem uma otimização geral.

## Execução e integração

```powershell
node scripts/presentation-stage2-qa.mjs transfers prototype-qa/simplificacao-transferencias-20261105/final-r3
node scripts/presentation-stage2-qa.mjs motion prototype-qa/simplificacao-transferencias-20261105/regressao
node scripts/presentation-stage2-qa.mjs arrivals prototype-qa/simplificacao-transferencias-20261105/regressao
node scripts/presentation-stage2-qa.mjs interaction prototype-qa/simplificacao-transferencias-20261105/regressao
$env:QA_COMPARE_REVISION='953e18b3ce6819a9d4912f28808d1b0a98ac1dff'
node scripts/presentation-stage2-qa.mjs comparison prototype-qa/simplificacao-transferencias-20261105/comparacao-r2
```

Executar os runners em sequência: cada um inicia e encerra a instância de QA em `127.0.0.1:3095`. Scripts e documentação ficam versionados; capturas, logs e JSONs permanecem locais.

O PR deste bloco depende do PR #15. O PR #13 já foi integrado em `main`, conforme consulta ao GitHub; o deploy no Render não foi conferido neste bloco. Não houve merge nem publicação desta refatoração. Reversão: retirar o commit deste bloco, sem alterar dados, sessões ou feedback.

Próximo bloco: migrar baixas e redistribuição dos vizinhos, mantendo os instantes de dano, Registro e morte e removendo os controles antigos apenas após trocar seus consumidores.
