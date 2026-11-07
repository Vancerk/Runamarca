# Revisão Claude — rodada 2 (06/11/2026)

Pedidos do dono, repassados pela sessão “Revisão final S3 Runamarca”, sobre a prévia 3086. Árvore `runamarca-simplificacao-etapa2`. Revisão local: sem commit, push, merge ou deploy. A porta 3086 não precisou ser reiniciada, porque só mudaram arquivos do cliente, que ela serve direto do disco.

Pacote: `prototype-qa/claude-rodada2-20261106/` — baseline exata em `source-before/` (279 arquivos com hashes), capturas `antes/` e `depois/`, probes por item e a comparação em `comparacao/` (http://127.0.0.1:3113/).

| # | Pedido | Estado |
|---|---|---|
| 1 | Fila de ações | Implementado e verificado. Antes, ações durante uma ação em curso eram **descartadas em silêncio** (de 3 jogadas seguidas, só 1 chegava). Agora entram numa fila FIFO no cliente e são enviadas uma a uma; o servidor valida cada uma na ordem. O probe com latência de 600 ms passou 6/6: ordem, sem perda, sem duplicata, envio sequencial, estado final. Limite: cartas que pedem escolha de entrada (posição/alvo) ainda exigem a ação anterior concluída. |
| 2 | Placa “EMANAÇÃO” | Corrigido e parametrizado (`HYBRID.compose.label`: largura mínima, profundidade, deslocamentos X/Y, proporção da letra). Depois de posicionada, a placa é medida e recentrada no eixo da casa, qualquer que seja o zoom efetivo. |
| 3 | Emanação no jogo × comparação | Não reproduzido. Em 8 tamanhos de janela, DPR 1,25 e partida real contra o bot (instância isolada), placa e carta ficam centradas (desvio ≤ 0,8 px). A captura do usuário mostra placa e carta 6,5–8,5 px à direita das casas. A correção autocorretiva do item 2 cobre a placa em qualquer ambiente; para a carta, preciso do navegador, da resolução e do zoom usados, ou de uma captura da tela inteira. |
| 4 | Ampliação do foco ×3 | Medido: o foco aplicava só 1,5% (1920×1080) / 4,5% (1366×768), embora o parâmetro pedisse 12%, limitado pelo espaço vertical. Agora o ganho (`gain: 3`) usa também a folga acima da sua reserva e mais 8 px de subida da faixa rival: 1,5% → 4,55% (3,0×) em 1920; 4,5% → 11,9% (2,6×) em 1366, limitado pelo espaço. |
| 5 | Banquete dos Heróis | Corrigido. Como armadilha, o Banquete caía no caminho genérico (uma seta para uma casa), porque `presentPreparedMagic` só reconhecia `area_stat_buff`. Antes: 0 halos nos dois assentos; depois: 2 e 2. Modo direto conferido: 2 e 2. |
| 6 | Sombras | Reserva com a mesma sombra do combate. Durante choques e ataques, quem se move é uma cópia fora de `#game`, onde a sombra da face não se aplicava; agora ela leva a mesma sombra, que acompanha o movimento e a escala. O estado de carta morta (`.visual-dead`) foi preservado. |
| 7 | Retorno à mão | Corrigido. O portador do voo nascia no tamanho da reserva com `will-change: transform` e era ampliado até a mão, rasterizado na escala inicial. Agora nasce no tamanho final, escalado para baixo, sem `will-change`. Energia de borda no mesmo quadro do voo: 5,16 → 8,04. |
| 8 | Fumaça da formação | Diagnosticado, mitigação parcial. Na entrada da formação há uma tarefa de 75–95 ms (`render()`: conteúdo 27 ms + construção 43 ms, com espera de GPU) e quadros de 22–45 ms nos 400 ms do foco, quando a cena inteira é reconstruída a cada quadro. Medido que **não** são a névoa (ocultá-la não muda os tempos) nem a resolução 2× (escala 1 igual). Removida uma reconstrução redundante no primeiro quadro do foco. Uma limitação adaptativa e o salto da sincronização GPU nos quadros intermediários foram testados sem ganho mensurável e revertidos. A solução real é reconstruir de forma incremental durante o foco (só campo e cartas), uma mudança estrutural que fica pendente. |
| 9 | Feedback e nova partida | Corrigido. O “Nova partida” e o questionário usam os controles atuais: opções em pergaminho (couro quando marcadas), botões discretos em couro escuro, barra de etapas em bronze e painel de reenvio com moldura. Nenhum envio feito no teste. |
| 10 | Moeda | Corrigido. Gira em torno do eixo horizontal e pousa plana numa face, com um quique curto. Antes terminava inclinada (`m33` 0,72, cerca de 44°); agora `m33` = 1 (frente) ou −1 (verso). Mostra “RUNAMARCA” quando você começa e “ELYSIUM” quando o rival começa. |
| 11 | Painel direito | Corrigido. Espaço distribuído por igual (`space-evenly`) entre o bloco de rodada/circuito/legenda e a ação, mantendo a placa com altura constante. |

Arquivos alterados nesta rodada: `mesa-nova/app.js` (fila e moeda), `mesa-nova/hybrid/bridge.js` (placa e foco), `hybrid/config.js` (`compose.label`, `focus.gain/ownGapPx/rivalTopGainPx/max`), `hybrid/focus.js`, `hybrid/flights.js`, `hybrid/composition.css`, `damage-presentation.js`, `coin-volume.js` e `physical-effects.css`. O motor do jogo não foi alterado nesta rodada.

## Validação (códigos de saída reais)

- `npm test`: saída 0. A primeira execução saiu com 1 por uma regressão minha: o guarda de arrasto referenciava `actionQueue`, ausente quando `test-mesa-layout.mjs` avalia trechos do `app.js`. Corrigido para `globalThis.RunaActionQueue`; o layout e a suíte passaram em seguida (`npm-test-2.log`).
- `test:polish` 0; `test-taunt-bonus` 0 (10 casos); bot 28/28 (`--experimental-vm-modules`).
- Navegador, servidor isolado: geometria 41/41, recuperação WebGL 25/25, transferências 35/35, chegadas 26/26, incremental 9/9, duplicatas de combate 72/72. Depois da correção do guarda, repetidos geometria, transferências e chegadas, todos com saída 0.
- Probes da rodada: fila 6/6 (antes 4/6); Banquete armadilha 2/2 halos por assento (antes 0/0); moeda plana; retorno 5,16 → 8,04; foco 3,0× (1920) / 2,6× (1366); capturas antes/depois 9/9 cada.
- A 3086 serve os arquivos do disco (14/14 idênticos) sem reinício; o motor carregado é o do último reinício (regra nova de Provocar).

Limites: item 3 não reproduzido (preciso do ambiente do usuário); item 8 só parcialmente mitigado (falta reconstrução incremental durante o foco); 1366 com foco 2,6× por falta de espaço vertical; zoom real do navegador e celular não testados.

Decisão do dono (06/11/2026): seguir sem a captura do ambiente. O item 3 fica registrado como pendente (não reproduzido); a placa já se recentra sozinha em qualquer ambiente.
