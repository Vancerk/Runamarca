# Runamarca · abertura da partida, mão inicial, menus e botões (09–10/11/2026)

Pedido do dono com três vídeos de referência (hover de botão, entrada de menu e abertura de partida). Trabalho local, sem commit, push, merge, deploy ou mudança no Render.

- **Base:** versão ativa V26.0.1, `main` em `b8ed379` (igual a `93a9778`). A árvore `runamarca-simplificacao-etapa2` está atrás dessa versão e não foi usada.
- **Árvore de trabalho:** `runamarca-abertura-20261109`, branch local `claude/abertura-mao-inicial-20261109`, criada a partir de `origin/main`.
- **Prévia isolada:** `http://127.0.0.1:3121/runamarca/` (esta árvore). A V26.0.1 sem mudanças serviu de “antes” em `http://127.0.0.1:3122/runamarca/`. A porta 3086 não foi usada.
- **Pacote de evidências:** `prototype-qa/abertura-20261109/` (pasta nova).

## Como era (V26.0.1), confirmado no código e em execução

- **Mão inicial:** cada jogador recebe 5 cartas (`startMatch` em `game.mjs`).
- **Moeda:** sorteada pelo servidor quando os dois escolhem o deck; o vencedor joga primeiro na rodada 1 e a ordem se inverte a cada rodada.
- **Troca:** uma troca por jogador, de 1 a 5 cartas, e uma confirmação separada (dois botões: “Trocar N cartas” e “Manter e confirmar mão”). Esgotada a troca, a interface confirmava sozinha.
- **Apresentação:** moeda sozinha (2,4 s) → aviso “ordem definida” (1,25 s) → cartas, uma a uma. A mão ficava interativa ≈6,8 s depois do fim da apresentação dos patronos.
- **Vantagens do segundo jogador:** nenhuma além da ordem invertida na rodada seguinte. Ele não recebe carta nem mana extra (teste `test-mulligan-limit.mjs`, último caso). Nada disso foi alterado.

## O que mudou

| # | Pedido | Resultado |
|---|---|---|
| 1 | Hover dos botões | A face do botão de madeira acende e oscila em perspectiva por 200 ms (pico aos ≈55 ms); aro, chanfro e filete de prata não se movem. Vale para todo botão de madeira com texto simples, inclusive dentro dos pop-ups. `button-hover.js` + `button-hover.css`. |
| 2 | Entrada dos menus | Todo `<dialog>` (menu da sala, confirmação de saída, regras, detalhe de carta, cemitério, escolhas, forja) nasce pequeno junto ao topo central, passa 5% do tamanho e assenta em 300 ms. Sem desfoque novo. Fechamento, foco e Esc são os do diálogo nativo. Fica de fora o criador de cartas (tela inteira em iframe). `popup-entrance.css`. |
| 3 | Abertura | Depois dos patronos, a moeda é lançada em primeiro plano sobre um desfoque suave enquanto as cinco cartas chegam em sequência pela direita, inclinadas e em curva. Com o resultado (“Você joga primeiro/em segundo · Troque até N cartas”), a moeda se dissipa e o desfoque sai junto; o pergaminho e o botão aparecem e a mão fica interativa. `opening-toss.js`, `hybrid/flights.js` (`openingDeal`), `app.js`. |
| 4 | Troca inicial | Etapa única. Quem começa troca até 3 cartas; quem joga em segundo, até 4; menos (ou nenhuma) é permitido. O limite está no motor (`mulliganLimit` em `game.mjs`), que recusa acima dele sem alterar mão, deck, eventos ou a troca disponível. A interface mostra o limite, a contagem e recusa a carta excedente com aviso. O bot respeita o limite. |
| 5 | Interface da mão inicial | Pergaminho preso a duas hastes de nogueira com o título “Mão inicial” e a instrução “Selecione até N cartas para trocar.”, contagem (“Você joga primeiro · 2 de 3 marcadas”), cartas e um único botão de madeira “Confirmar mão”. `opening-deal.css`, `assets/ui/scroll-body.svg`, `assets/ui/scroll-cap.svg`. |

### Detalhes que importam

- **Uma etapa para o jogador, duas mensagens por baixo.** Com cartas marcadas, “Confirmar mão” envia a troca (`mulligan`); a mão nova é apresentada e a confirmação (`confirmMulligan`) segue sozinha, como já acontecia. Sem marcas, envia só a confirmação. Se a conexão cair entre as duas, a reconexão conclui a confirmação pendente e o relógio de 45 s mantém a mão.
- **Cliques repetidos:** três cliques seguidos enviam uma única troca. `mulligan`/`confirmMulligan` não entram na fila de ações; antes, um clique durante outro comando era descartado em silêncio — agora ele espera o comando em andamento.
- **Teclado:** as cartas são botões (`aria-pressed`); Espaço/Enter marcam; o foco é restaurado na mesma carta quando o painel é refeito; ao terminar a abertura o foco vai para “Confirmar mão”. Carta fora do limite fica com `aria-disabled` e o aviso é anunciado (`role="status"`).
- **Movimento reduzido:** sem lançamento animado, sem voo em curva, sem oscilação de botão e sem entrada animada de menu; a moeda aparece já na face final, o resultado fica 1,3 s e o painel abre.
- **Fluidez.** A primeira pintura da mão inicial (cinco cartas grandes sobre a mesa desfocada) custa ao navegador duas pausas de ≈0,3 s; isso já existia na V26.0.1 e caía em cima da moeda no ar. Agora o véu entra primeiro, moeda e painel são desenhados parados (1% de opacidade) e o lançamento só começa quando as faces estão prontas e os quadros voltaram ao ritmo normal. As cartas em voo são cópias das casas já pintadas (nenhuma carta é repintada durante o voo). Resultado medido abaixo.
- **Segundo salto removido só na abertura:** a carta pousa uma vez; a animação `.arrived` das compras comuns não se repete sobre ela.
- **Sem lampejo:** entre o fim dos patronos e o início da moeda o painel não aparece (classe `opening-await`).

## Arquivos

Novos: `mesa-nova/opening-toss.js`, `opening-deal.css`, `popup-entrance.css`, `button-hover.js`, `button-hover.css`, `assets/ui/scroll-body.svg`, `assets/ui/scroll-cap.svg`, `mesa-nova/test-mulligan-limit.mjs`, `scripts/abertura-*.mjs` (linha do tempo, interação, quadros de UI, quadros de vídeo, folhas de comparação).

Alterados: `mesa-nova/game.mjs` (limite, visão, bot), `bot/runner/source/mesa-nova/game.mjs` e `bot/runner/source/manifest.json` (cópia sincronizada do motor), `mesa-nova/app.js`, `mesa-nova/index.html`, `mesa-nova/hybrid/flights.js`, `mesa-nova/hybrid/config.js` (`HYBRID.draw.deal`), `mesa-nova/LEIA-ME.md` (regra 4), `package.json` (teste novo no `npm test`), `mesa-nova/test-s3-mulligan-profile.mjs` e `test/review-regression.test.mjs` (adaptados à regra e à distribuição novas; mesmas verificações).

Parâmetros: `HYBRID.draw.deal` (`stagger` 150 ms, `flight` 640 ms, `tilt` 24°), `RunaOpeningToss.TIMING`, `RunaButtonHover.TIMING`, `MULLIGAN_LIMIT` (`first` 3, `second` 4).

## Verificação

Linha de base antes de qualquer mudança (V26.0.1 nesta árvore): `npm test` 0, `test:polish` 57/57, bot 28/28, troca/abertura/revanche 20/20.

Depois das mudanças, todos com código de saída 0 (logs em `prototype-qa/abertura-20261109/`):

| Verificação | Resultado |
|---|---|
| `npm test` (inclui `test-mulligan-limit.mjs`, 9 casos novos) | 0 |
| `npm run test:polish` | 57/57 |
| `node --experimental-vm-modules --test bot/*.test.mjs` | 28/28 |
| troca, abertura, revanche e limite (`test-s3-mulligan-profile`, `test-opening-return`, `test-death-rematch`, `test-mulligan-limit`) | 29/29 |
| Provocar (`test-taunt-bonus`) | 10 casos |
| Bateria integrada (`claude-verify final`, Edge, servidor próprio na 3123) | geometria 41/41, recuperação gráfica 25/25, transferências 35/35, chegadas 26/26, incremental 9/9, cache de cena 9/9, entrada em formação 49/49, Platina 97/97, Verônica 118/118, duplicatas de combate 72/72; sem erros de página nem de GPU |
| `abertura-mao.mjs` (interação da troca no navegador) | 32/32 |
| `abertura-ui.mjs` (botão e menu, quadros pausados) | 15/15; com movimento reduzido, 15/15 |
| `abertura-timeline.mjs` (primeiro, segundo, completa com patronos, reduzido) | 0 em todas; sem sobras (palco, voos, cartas pendentes, `inert`) |

Um teste falhou no meio do caminho e foi corrigido: `test/review-regression.test.mjs` (“Reiniciar durante a abertura…”) extraía a distribuição pelo caminho antigo; agora exercita `animateOpeningDeal` com a mesma verificação (uma partida reiniciada interrompe as cartas restantes).

O que `abertura-mao.mjs` cobre: limite exibido (3 e 4), marcar menos que o limite, recusa da carta excedente sem enviar nada, teclado e foco, três cliques seguidos em “Confirmar mão” (uma única troca), confirmação automática única, reconexão no meio da escolha e logo depois da troca, pedido adulterado (4 cartas por quem começa, carta repetida, carta inexistente: o motor recusa e a mão não muda), movimento reduzido, 1366×768 e 390×800.

### Tempo e fluidez (três execuções de cada, mesma máquina, sem apresentação dos patronos)

| | Antes (V26.0.1) | Depois |
|---|---|---|
| Mão interativa depois do fim dos patronos | 6,63 – 7,08 s | 4,02 – 4,17 s |
| Pausas de desenho acima de 100 ms | 2 por abertura (≈320–510 ms), com a moeda já no ar | 2 por abertura (≈305–410 ms), antes do lançamento (355–450 ms antes da primeira carta) |
| Maior intervalo entre quadros durante o voo das cartas | não medido (as cartas vinham depois) | 22 – 49 ms |
| Pausa na revelação (moeda sai, painel entra) | — | 74 – 77 ms |

Com a apresentação completa dos patronos, a mão ficou interativa 3,5 s depois do início do palco (lançamento 0,5 s depois do fim dos patronos); maior intervalo no voo: 49,5 ms. Com movimento reduzido: 2,5 s.

### Comparação com os vídeos

Folhas em `prototype-qa/abertura-20261109/comparacao/` (referência × antes × depois, com o instante de cada quadro):

- `01-botao-hover.png` — referência: a face inclina por ≈50 ms e assenta em ≈130–170 ms; aqui: inclinação visível de ≈17 a 85 ms, assentada aos 200 ms, aro parado.
- `02-menu-entrada.png` — referência: painel pequeno no topo central, cresce, passa do tamanho e assenta em ≈250–300 ms; aqui: 300 ms, 5% acima do tamanho final.
- `03-abertura.png` — referência: cartas em sequência pela direita, inclinadas, em curva, e a moeda; aqui a moeda e as cartas correm juntas sob o desfoque (adaptação pedida, não cópia).
- `04-mao-inicial.png` — referência, antes e depois do painel.

Os quadros de referência (`referencia/`) foram extraídos dos três vídeos do dono; os vídeos em si não foram copiados para o repositório.

## Limitações e o que não foi testado

- **Navegador real e GPU do dono:** tudo foi medido em Chrome/Edge sem janela nesta máquina. As pausas de desenho dependem da placa de vídeo; a espera antes do lançamento se adapta (teto de 2,6 s), mas não foi vista no seu navegador.
- **Toque e celular:** o painel cabe em 390×800 e o hover não se aplica a toque; a abertura em aparelho real não foi testada.
- **Partida entre duas pessoas pela rede e arquibancada:** a página foi dirigida com o motor real em processo (um assento); o espectador vê a moeda e o resultado pelo mesmo código, mas não houve teste dedicado.
- **Rota sem a mesa 3D (falha de WebGL):** a distribuição cai para as compras uma a uma; coberto só pelo teste de unidade.
- **Cartas de reposição depois da troca:** continuam chegando pelo baralho, no perfil rápido que já existia; não ganharam a chegada pela direita.
- **Botões com conteúdo além de texto** (opções de escolha com várias linhas) não recebem a oscilação.
- **Consulta de carta sob o ponteiro** continua cobrindo parte do painel enquanto o ponteiro está sobre uma carta (comportamento anterior).
- `scripts/s3-mulligan-blur.mjs` (sonda antiga, fixa na porta 3086) mede a distribuição pelo caminho antigo e não foi adaptada.
- Versão (`version.json`) não foi alterada: nada foi publicado.

## Como ver

- Prévia desta árvore: `PROTOTYPE_PORT=3121 node --experimental-vm-modules scripts/board-prototype-server.mjs` e abrir http://127.0.0.1:3121/runamarca/ (servidor local; cai ao reiniciar o PC; as salas ficam em memória).
- `prototype-qa/` é ignorada pelo Git: o pacote de evidências existe só nesta máquina.

## Rodada de 10/11/2026 · botão mais lento, painel direito, campo e objetos da mesa

Segundo pedido do dono, na mesma árvore. A mensagem dele terminou cortada (“…ou a gente tem outra opção também que é a casa”); só o que estava claro foi feito.

| Pedido | Resultado |
|---|---|
| Oscilação do botão mais lenta | De 200 para 420 ms, com um balanço a mais (pico aos ≈95 ms, volta aos ≈210 ms, assenta aos 420 ms). `button-hover.js`. |
| Painel direito centralizado | Não reproduzido: título, luzes, legenda e botões ficaram a no máximo 1,5 px do eixo da moldura (achado pelos pixels) em 8 janelas × 4 estados, inclusive escala 125% e 110% do Windows. O desenho novo das luzes é simétrico em torno do eixo. Falta ver o navegador do dono. |
| Luzes | Rival em cima, jogador embaixo, cada uma na cor do deck (Forja âmbar, Fluxo azul, Ruptura vermelho); acendem na vez correspondente. A luz de combate fica no ponto de chegada. `round-circuit.js`, `round-circuit.css`. |
| Caminhos | Um caminho próprio por luz, em trechos retos com duas dobras, finos e apagados em repouso. |
| Animação | Já existia e foi mantida: na formação e no combate a energia corre pelos dois caminhos até a luz de combate. Nenhuma regra mudou. |
| Campo 25% menor | Em repouso o campo inteiro encolhe 25% em torno do centro (1920×1080: 906×309 → 680×232 px). `HYBRID.compose.restScale`. Só acima de 900 px de largura. |
| Foco 25% maior | Pedido: 25% sobre o foco anterior. Alcançado em 1920×1080: 987×337 → 1074×366 px (+8,8%); em 1366×768 ficou igual (736×247). O limite é o espaço entre as duas reservas, que o foco anterior já usava quase todo. `HYBRID.focus.boost`. |
| Campo cresce ao arrastar | Na preparação do próprio jogador, arrastar uma magia a menos de 150 px do campo o amplia até o tamanho antigo (680 → 906 px em 200 ms); afastar ou soltar devolve. As casas continuam sendo o alvo sob o ponteiro. `focus.js`. |
| Objetos maiores e mais próximos | Em telas com mais de 820 px de altura: vela/lanterna e livros ×1,4, esfera e bússola ×1,32, e os de cima mais perto do centro. Em telas baixas ficam como antes (não há madeira sobrando). `HYBRID.props`. |
| Lanterna | A vela ganhou uma lanterna de bronze em volta (base, hastes, tampa e alça) que balança ao toque e volta sozinha em 2,6 s. A chama não se move. |
| Diário | O toque nos livros abre uma página com a anotação de uma carta dos decks da partida (texto público do catálogo); “Virar a página” mostra outra; fecha com Esc ou “Fechar”. `table-props.css`. |

Verificação desta rodada (código de saída 0): bateria integrada `claude-verify rodada2` (mesmos números da primeira), bot 28/28, `abertura-painel` 65/65 e 39/39 nas escalas, `abertura-campo` 15/15, `abertura-ui` 15/15, `abertura-mao` 32/32. `abertura-ui` falhou uma vez porque a verificação ainda esperava 220 ms; o limite foi atualizado para os 420 ms pedidos.

Limitações: nenhuma casa ou objeto novo foi acrescentado além da lanterna; a câmera é quase vertical, então a lanterna aparece de cima (tampa e hastes); em 1366×768 a bússola e o toque da lanterna podem não caber; o diário não tem animação 3D de abrir, só a página; o foco não chegou aos 25% pedidos. Folha: `comparacao/05-painel-campo-objetos.png`.
