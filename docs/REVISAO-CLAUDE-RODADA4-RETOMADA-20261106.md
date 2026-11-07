# Runamarca — fechamento da rodada 4 do Claude

Concluído localmente pelo Codex em 07/11/2026, na árvore `runamarca-simplificacao-etapa2`, branch `codex/amostra-arte-patronos`. O usuário pediu continuar a etapa interrompida do Claude e investigar consoles que abriam e fechavam. O trabalho foi realizado diretamente no chat, sem ativar o orquestrador ou outros agentes. Não houve commit, push, merge ou publicação.

## Resultado

A otimização de reconstrução da mesa recebida do Claude foi preservada e validada. Na janela medida da revelação, o tempo acumulado em tarefas longas caiu de 752 para 182 ms na mediana de três execuções por condição. A cena estabilizada manteve o visual. Ainda ocorreu um intervalo de 105,7 ms entre quadros; não se considera toda a fluidez resolvida.

A retomada encontrou e corrigiu uma falha real no cache: na transição para formação, o painel de confirmação podia ficar aproximadamente 18,9 px fora da posição da reconstrução completa. A montagem usa os limites dos baralhos calculados na passagem anterior. O cache agora guarda esses limites de entrada e exige outra passagem completa quando eles mudam, antes de voltar a reutilizar a cena. As comparações de geometria e estilos continuam exatas.

## Código e preservação

As seis mudanças de produto da rodada 4 recebida são `hybrid/bridge.js`, `hybrid/fan-layout.js`, `hybrid/flights.js`, `hybrid/lifecycle.js`, `card-arrivals.js` e `mulligan.css`. Elas reduzem reconstruções e medições repetidas e agrupam atualizações na mesma tarefa.

Dos 237 arquivos conferidos contra o estado recebido, esta retomada alterou apenas `mesa-nova/hybrid/bridge.js`. Seu SHA-256 final é `3106b9acde750bd2432dfefb06b624fb48a29abf70c2c495ba456a2a83ade9ae`.

Foram preservados, sem alterações nesta retomada:

- `game.mjs`: `0ac0d8ca5cc1bdd42d4b997631b301f130cb571c5a75d95812c0e7ac8eaa0644`.
- `combat-effects.mjs`: `1156889f703c4d205fd29caac7ea5d7dca3453ebd1acc6956b2944e4adde5242`, incluindo o ajuste anterior de Provocar.
- `hybrid/renderer.js`: `507a5d771a1e4f198fbbfca56f6aadcfa15f2574712ecf23ff7f27c91f6e08ba`.

O runner `scripts/claude-verify.mjs` ganhou lançamento oculto no Windows, espera pela inicialização do próprio servidor, porta configurável, rejeição de seleção vazia e propagação correta de falhas. A chamada a Git em `scripts/hybrid12-lib.mjs` também usa lançamento oculto. Dois testes novos de cache foram integrados ao runner. Os demais scripts novos produzem a comparação e verificam a abertura nos navegadores.

## Verificação

| Caminho | Resultado final |
| --- | --- |
| Geometria | 41/41 |
| Recuperação gráfica | 25/25 |
| Transferências | 35/35 |
| Compras e retornos | 26/26 |
| Atualizações incrementais | 9/9 |
| Duplicatas de combate | 72/72 |
| Cache durante animações | 9/9 |
| Entrada em formação | 49/49 em 16 cenários |

As suítes finais terminaram com saída 0 e sem erros de página/WebGL. Uma primeira bateria teve 72/72 verificações de comportamento, mas um erro de comparação incremental; foi corretamente reprovada e preservada. A reprodução anterior à correção falha no primeiro cenário; a final não apresenta a divergência. O teste negativo do runner, com navegador inexistente, termina com saída 1.

Dez pares de capturas estáticas, em Full HD e 1366×768, preservam a apresentação: sete pares exatos; nos demais, 11 pixels no total diferem em no máximo 1/255 por canal. As comparações controlam resolução, acaso e camadas animadas. A inspeção de 14 quadros de voo em cada condição preserva a face, mas não comprova melhora da nitidez em movimento: o serrilhado residual continua pendente.

Antes do ajuste focal gráfico, passaram também os testes de Node, polimento, Provocar e bot. Eles foram reaproveitados; não houve nova execução da suíte geral completa ou de partida inteira com bot após esse ajuste.

## Consoles e Edge

Foram corrigidos dois caminhos de QA capazes de criar consoles visíveis. A observação de 25 segundos não encontrou janela visível, mas não identifica com certeza a origem dos flashes relatados pelo usuário. Processos da AMD e das ferramentas do Codex não foram encerrados ou modificados.

O teste curto headless abriu a base anterior e a versão atual no Edge 157.0.4341.42 e no Chrome 156.0.8078.48, sem queda ou erro. A instabilidade relatada pelo Claude não se reproduziu agora. Como os recursos externos foram bloqueados e o ensaio é curto, não se conclui estabilidade geral do Edge nem se atribui a causa a uma versão específica. A bateria extensa usou Chrome.

## Revisão e continuidade

A mesa foi reaberta em <http://127.0.0.1:3086/runamarca/> e o comparador em <http://127.0.0.1:3124/>, servidos desta árvore. Os sete assets públicos foram conferidos por SHA-256. O comparador carregou suas 22 imagens e funcionou em painel largo e estreito. Os servidores locais precisarão ser reiniciados após desligamento.

A evidência detalhada está em `prototype-qa/codex-retomada-rodada4-20261106/README.md`, com hashes, execuções, falhas históricas, imagens e limitações. O próximo passo é a revisão local do usuário; uma rodada adicional de desempenho deve partir das pausas residuais medidas. A nitidez das bordas durante voos permanece uma questão separada, sem nova técnica aplicada aqui. Nenhuma decisão de publicação está implícita nesta entrega.
