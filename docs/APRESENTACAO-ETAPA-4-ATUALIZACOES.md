# Etapa 4 — atualizações e fila visual

05/11/2026. Comparação local contra `bdd35c7` (etapa 3). A partida continua recebendo revisões sem esperar a fila de efeitos.

## Mudança

`RunaPresentation.createQueue()` centraliza a ordem, deduplicação por evento e cancelamento por geração. Reiniciar a partida cancela esperas e callbacks da fila antiga; a fila nova pode começar imediatamente. A abertura, avisos e encerramento usam esse contrato, mantendo os tempos existentes.

A mão reaproveita os nós por partida e UID. Mudanças nos dados da carta renovam a face e seus controles; mudanças de Éter atualizam a disponibilidade. Foco e consulta por teclado sobrevivem a atualizações da vida rival. Reservas, Emanações, verso da mão rival e Nartvanyr são reconstruídos quando seus dados visuais mudam. O campo durante a resolução continua sendo atualizado em cada passo, pois posições de combate também dependem do relógio.

## Comparação medida

Edge, DPR 1, mesma cena e 20 atualizações por condição. Evidência: `prototype-qa/simplificacao-atualizacoes-20261105/regioes/comparison/comparison.json`.

| Tela | Render antes: mediana / p95 / máximo | Depois | Reconstruções por revisão |
|---|---|---|---|
| 1920×1080 | 73,5 / 81,7 / 84,4 ms | 49,0 / 56,6 / 57,7 ms | 2 → 1 |
| 1366×768 | 83,1 / 87,6 / 89,3 ms | 47,1 / 49,7 / 52,1 ms | 2 → 1 |

O intervalo do ciclo de atualização, incluindo dois quadros de estabilização, caiu de 119,7/136,2 ms (mediana/p95) para 61,2/69,7 ms em Full HD; em 1366, de 122,6/128,6 para 59,6/61,2 ms. Isso não é a taxa de quadros de uma partida inteira. Durante a compra, o intervalo típico ficou em aproximadamente 5,6 ms nas duas condições; o maior intervalo isolado caiu de 133,4 para 83,4 ms em Full HD e para 77,7 ms em 1366. Ainda existem reconstruções e tarefas longas: não há promessa de 60 FPS contínuos.

Nas duas compras medidas por condição, a API de tarefas longas registrou 2 entradas antes e 2 depois em Full HD, com maior duração de 91 → 52 ms. Em 1366, foram 3 → 2 entradas, com máximo de 96 → 52 ms. A amostra é pequena; os valores brutos ficam no JSON, incluindo uma entrada de 49 ms arredondada pelo navegador.

## Validação

- Comparação geométrica e continuidade: 32/32.
- Abertura e transferências com dois clientes: 35/35.
- Combate focal (assentos, baixas, Registro, resize, movimento reduzido, saída): 52/52.
- Atualização incremental: 9/9, incluindo 20 revisões com foco preservado e nenhuma nova animação de entrada do hover.
- Interação, compras, golpes e efeitos de dano: 145/145 no código final.
- Contratos de apresentação, geometria, fila, mulligan e limpeza: 30/30.
- Suíte ampla: primeira execução 38/41 comandos. Os três comandos restantes tinham fixtures que ainda usavam a fila Promise ou os antigos conjuntos de chegadas. Foram migrados para os módulos reais, sem retirar as verificações: revisão/abertura 20/20 e auditoria 18 casos. A execução ampla final fica no fechamento da etapa 5.

Motor, ritmo de animação, câmera e sincronização GPU não mudaram. A entrega é um PR dependente da etapa 3; nenhuma publicação foi feita por este bloco.
