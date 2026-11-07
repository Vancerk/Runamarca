# Cartas em movimento e pausas — 07/11/2026

Pedido: continuar corrigindo o serrilhado durante os voos e as pausas restantes nas animações. Trabalho direto no chat, na árvore `runamarca-simplificacao-etapa2`, sem acionar o orquestrador. Alterações locais, sem commit, push ou publicação.

## Resultado e limites

As bordas das cartas em movimento ficaram mais contínuas. O novo amostrador cobre compras, transferências entre zonas, retornos à mão e redistribuição dos vizinhos da reserva. As imagens finais e o teste em velocidade normal passaram. A fluidez continua parcialmente aberta: houve redução de trabalho repetido, mas permanecem quadros acima de 100 ms na preparação/revelação da mesa. Não há base para declarar todas as pausas eliminadas ou prometer 60 FPS.

## Código final

- `hybrid/motion-sampling.js`, novo: conserva a face mestre e escolhe níveis filtrados próximos do tamanho projetado, considerando o DPR. Usa as transformações e o progresso da animação já existente, sem ler layout a cada quadro. Nunca amplia uma imagem menor. Só substitui a face quando a nova imagem está pintada; libera observador e laço ao concluir, cancelar ou remover a cópia.
- `hybrid/flights.js` e `hybrid/lifecycle.js`: conectam o amostrador aos voos e à redistribuição da reserva, preservando trajetórias e durações.
- `platinum-entry.js`: resolve a origem uma vez por quadro, lê as ligações antes de mover seus elementos, usa bitmap da face pronta e, depois que a montagem está completa, desenha a carta uma vez em vez de repetir os recortes já unidos.
- `hybrid/card-plane.js`: agrupa alterações de visibilidade antes da pintura e lê as medidas comuns antes de escrever as transformações. Evita reconstruções repetidas na mesma atualização, mantendo a ocultação do corpo 3D durante os voos.

O motor, a câmera, os alvos, as regras, `combat-effects.js`, `bridge.js` e `renderer.js` foram preservados. O filtro das cartas paradas (`resample.js`) foi restaurado byte a byte à base desta rodada. Os cinco arquivos finais e os invariantes têm hashes nas evidências.

## Escolha da filtragem

Foi experimentado um refinamento adicional em worker durante o voo. Ele melhorou detalhes de algumas imagens, mas elevou o custo entre quadros. Em dois pares no Edge, o p95 durante o movimento foi 20,9/20,0 ms com refinamento, contra 11,5/16,7 ms com filtragem rápida. Reutilizar o canvas não trouxe ganho consistente: 17,0/21,9 ms.

A versão final mantém somente os níveis rápidos durante o voo. O tratamento mais preciso das cartas paradas continua funcionando. `motion-lanczos/`, `velocidade-real/` e `filtro-ab-edge/` documentam a alternativa intermediária; não representam a versão final.

## Nitidez final

Base exata: 237 arquivos copiados no início da rodada em `source-before/`, com hashes. Não foi reconstruída uma aproximação do código anterior.

O teste usa uma jogada aplicada pelo motor e compara as duas faces em quatro instantes do mesmo voo. Para as imagens, pausa apenas a captura. A referência é a mesma cena em DPR 4 reduzida ao tamanho final. Nas oito comparações, a diferença média para essa referência caiu entre 18% e 52%. Isso mede distância de imagem, não um percentual absoluto de serrilhado.

A inspeção confirma molduras e diagonais mais contínuas, com alguma suavização da ilustração. A imagem ainda não é idêntica à referência. Textos pequenos não passam a ser legíveis apenas por filtragem.

Evidência final: `final-images-fresh/`, com 9/9 verificações, imagens, métricas e `bordas-2x.png`. A ampliação 2× por vizinho mais próximo serve para inspecionar os pixels da captura; não é uma nova resolução do jogo.

## Fluidez final

`final-runtime-edge/`: execução normal, sem pausar animações ou relógios, no Edge 157. Os 28 checks funcionais passaram, incluindo DPR 2, worker indisponível, movimento reduzido, chegada visível e limpeza das cópias. As medidas de velocidade abaixo são observações, sem limite de aprovação de desempenho.

| Intervalos inteiramente dentro do voo | Base 1 / 2 | Final 1 / 2 |
| --- | --- | --- |
| p95 | 16,5 / 18,0 ms | 12,3 / 17,2 ms |
| Máximo | 34,7 / 45,7 ms | 59,0 / 42,1 ms |
| Maior intervalo incluindo o início | 96,2 / 113,3 ms | 125,7 / 113,1 ms |

O amostrador levou até 0,9 ms por atualização nas duas execuções normais e até 1,3 ms em DPR 2. Isso não mede todo o custo de composição/GPU. A transferência programada em 650 ms terminou em 733–742 ms na candidata, contra 717–738 ms na base. O p95 melhorou nesses dois pares, mas um pico e a preparação inicial pioraram no primeiro par: não há ganho uniforme.

Na revelação, a série final `perf-final-edge/` salvou quatro das seis execuções planejadas e terminou com código 1, sem diagnóstico final. Os dois pares completos mediram máximos 171,0 → 128,9 ms e 123,3 → 153,7 ms; p95 11,3 → 12,1 ms e 9,8 → 19,7 ms. Esses resultados são inconsistentes e a série está incompleta. As tentativas de iniciar a repetição encerraram o processo sem gerar nova série; uma retornou `0xC0000005`.

A série anterior `perf-processos/`, no Chrome e com o refinamento intermediário, tinha pico mediano 184,3 → 164,1 ms, sem melhora consistente no p95 ou soma das tarefas longas. Ela fica como histórico, não como medição da versão final. Os perfis apontam trabalho remanescente em `render`, reconstrução/projeção da mesa e primeira pintura dos efeitos.

## Validação funcional

Antes de retirar o refinamento extra, passaram geometria 41/41, recuperação 25/25, transferências 35/35, compras/retornos 26/26, incremental 9/9, cache 9/9, cache com entrada 49/49, Platina 97/97 e Verônica 118/118. Os sete testes Node de manifestação e origem também passaram. A simplificação final do amostrador foi revalidada pelos 9 checks de imagem e 28 de execução normal; os demais módulos não mudaram depois dessas suítes.

A bateria longa de duplicatas foi interrompida por queda do Edge após nove cenários e 12 checks concluídos. O cenário interrompido, Golias provocando visto pelo assento B, foi repetido isoladamente: 5/5 na base exata e 5/5 na candidata intermediária, com controle nativo e híbrido. Isso não equivale a 72/72 da bateria completa.

Chrome também caiu com fontes anteriores. O capturador bloqueou ao reutilizar o processo; a captura final concluiu abrindo um navegador novo por condição. Os runners podem isolar contextos por `QA_ISOLATE_CONTEXTS=1`; isso é opção de QA, não mudança no navegador do jogador. A causa interna das quedas não foi determinada. Só árvores de processos de QA identificadas foram encerradas.

## Como conferir e continuar

A prévia `http://127.0.0.1:3086/runamarca/hybrid/index.html` serve os cinco arquivos finais com hashes iguais aos locais. Recarregar com Ctrl+F5. Comparar principalmente a borda dourada na compra, na saída da mão e no retorno à mão.

Pendente: reduzir as pausas de preparação/revelação a partir dos perfis, sem remover a sincronização WebGL aceita anteriormente. Baixas ao Nartvanyr, retornos pós-combate à reserva e algumas cópias de ataques usam caminhos próprios e não foram migrados ao amostrador nesta rodada. A próxima medição precisa de uma execução de navegador estável; resultados parciais não devem ser promovidos a aprovação.
