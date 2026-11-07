# Revisão Claude — rodada 3 (06/11/2026)

Pedidos do dono, repassados pela sessão “Revisão final S3 Runamarca”, sobre a prévia 3086. Árvore `runamarca-simplificacao-etapa2`. Revisão local: sem commit, push, merge ou deploy, e nada mudou no Render. O motor não mudou nesta rodada. A 3086 (PID 13544, iniciada às 18:10, depois da última mudança de motor, à 01:39) serve do disco os 17 arquivos novos com hash idêntico (`hashes-3086.txt`). Por isso não precisou ser reiniciada.

Pacote: `prototype-qa/claude-rodada3-20261106/`. Contém a baseline exata em `source-before/` (277 arquivos, `source-before.sha256`), as capturas `before/` e `depois/`, os probes de cada item e a comparação em `comparacao/` (http://127.0.0.1:3117/, 21 pares, 42/42 imagens carregadas).

| # | Pedido | Estado |
|---|---|---|
| 1 | Sem seleção de texto | Implementado e testado. `user-select: none` e arrasto nativo de texto/imagem bloqueados no jogo inteiro; campos de texto continuam funcionando (`no-select.js` + `composition.css`). Probe com 10 gestos (5 arrastos rápidos de cartas da mão, cliques triplos e varreduras sobre textos do painel e do Patrono, Ctrl+A). Antes: 3 seleções (clique triplo no título e no Patrono, Ctrl+A com 93 caracteres). Depois: 0. |
| 2 | Chão da reserva | Implementado. O chão virou uma prateleira mais grossa, com tampo iluminado e frente escura, e as cartas repousam nela. Há uma folga entre a base da reserva e o topo do Patrono. Conferido nas capturas de 1920 e 1366. |
| 3 | Painel descentralizado | Corrigido e medido na tela. O probe `claude-panel-axis.mjs` encontra a moldura de bronze pelos pixels da captura e compara o centro de cada elemento com o eixo dela, em 5 resoluções (1920, 1366, 1600, 2560, 1280) × 4 estados (sua vez, vez do rival, formação, combate). Antes, em 1920, as luzes R/V ficavam a −72 px e o combate a +67 px (em 1366: −48/+45; em 2560: −84/+78). Depois, o par R/V, o combate, o título, a legenda e os botões ficam a no máximo ±0,6 px do eixo em todas as 20 medições; R e V ficam simétricos (−67,3/+67,4 em 1920). |
| 4 | Lentidão na revelação | **Parcial.** Feito: (a) uma baforada de fumaça. A carta some da reserva rival e reaparece na raia com a névoa, com 2 baforadas por carta revelada, verificado em quadros. (b) Uma redesenho WebGL idêntico é pulado. (c) Reuso de instantâneos de dano. (d) O redutor Lanczos das faces roda num Web Worker, com redução por metades e leitura de pixels via `ImageBitmap`/`OffscreenCanvas`. O resultado é idêntico pixel a pixel (diferença máxima 0) e o custo na thread principal cai de ~75 ms para ~0,1 ms por face. Medido no modo fiel ao cliente, que só renderiza quando a revisão muda: as travadas de ~110–170 ms continuam no instante em que cada criatura aparece; o total de tarefas longas foi de 776 ms para 726 ms, dentro do ruído. A causa restante são duas reconstruções completas da cena 3D por revelação (~80 ms cada), mais layout forçado e a sincronização de GPU. A solução real é reconstruir de forma incremental (só campo e cartas), uma mudança estrutural que **não** foi feita. |
| 5 | Zoom do combate ×2 | Implementado e medido. O foco da formação dobrou: em 1920, de 4,55% para 9,1%; em 1366, de 11,9% para 24,7%. Em 1366, a própria pilha desce até 26 px para caber. |
| 6 | Janela de magia | Implementado. Sem título nem descrição duplicados: só a carta e o botão “Usar”. As magias com escolha mantêm as duas opções, como o Monge Rúnico (esse caminho não foi alterado). |
| 7 | Contador de Estudos Avançados | 30% menor (`zoom: .7`), conferido em captura. |
| 8 | Janelas sem caixa | Implementado. Diálogos, mão inicial, menu, detalhe de carta e seletor de alvo perderam o quadro colorido; o fundo fica desfocado (`blur(7px)`). Conferido em captura: mão inicial, menu, detalhe de carta e janela de magia. |
| 9 | Serrilhado das cartas giradas | Corrigido na mão. Os degraus vinham dos fios finos da moldura, amostrados em 2× e minificados com rotação. Agora a amostragem é 1×. Ampliação 4× em DPR 1 confere a melhora; DPR 2 não muda. As cópias em voo não foram alteradas. |
| 10 | Botões em madeira | Implementado. Madeira maciça (SVG com veio procedural), filete de prata polida e letras entalhadas. Clara com letra escura para o principal; nogueira escura com letra clara para os demais. O menu da sala, que ainda usava pergaminho, e o “Entrar com Discord” agora também são de madeira. |
| 11 | Virada dos botões | Implementado e verificado em quadros. “Encerrar” mostra “Vez do oponente”, “Começar combate” mostra “Combate”, “Não combater” mostra “Sem combate” e o pronto da formação mostra “Aguardando o rival”. A virada dura 520 ms, segura 650 ms e some. O clique segue imediatamente para o servidor. Corrigido nesta rodada: o verso herdava o tamanho de fonte sem o zoom da mesa e ficava minúsculo. |
| 12 | Arrasto rápido | Testado (ver item 1): 5 arrastos rápidos pela mesa sem selecionar nada nem disparar arrasto nativo. |

## Testes (códigos de saída reais)

- `npm test`: 0 (105 aprovados, 0 falhas)
- `npm run test:polish`: 0 (57/0)
- `node mesa-nova/test-taunt-bonus.mjs`: 0 (10 casos)
- `node --experimental-vm-modules --test bot/*.test.mjs`: 0 (28/0)
- `claude-verify.mjs rodada3`: 0 — geometria 41/41, recuperação 25/25, transferências 35/35, chegadas 26/26, incremental 9/9, duplicatas de combate 72/72, sem erros de página nem de GPU
- `claude-drag-select.mjs`: 0

## Não testado

- Item 4 em máquina mais lenta e em partida real contra pessoa.
- Item 11 em toque (mobile).
- Item 9 nas cópias em voo.
