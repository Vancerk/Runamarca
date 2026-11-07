# Revisão Claude — nitidez, composição, Emanação, painel, sombras e Provocar (05–06/11/2026)

Pedido: `docs/REPASSE-CLAUDE-NITIDEZ-COMPOSICAO-PROVOCAR-20261105.txt`. Árvore `runamarca-simplificacao-etapa2`, branch `codex/amostra-arte-patronos`, HEAD `073429de`, com as mudanças locais preservadas. Revisão local: sem commit, push, merge, deploy ou Render. A porta 3086 do dono não foi usada pelos testes. Todas as execuções usaram instâncias isoladas (3095–3101) com armazenamento próprio.

Pacote: `prototype-qa/claude-nitidez-provocar-20261105/` — baseline exata em `source-before/` (274 arquivos com hashes), capturas `antes/` e `depois/`, diagnósticos e a página `comparacao/`.

## Estado de cada pedido

| Pedido | Estado |
|---|---|
| 5. Nitidez mão → reserva → combate | Corrigido e verificado (duas causas comprovadas, abaixo) |
| 6. Serrilhado e inventário de ativos | Corrigido na cena WebGL (resolução interna 2×, com fallback) e nas faces; inventário feito; 5 artes dependem de fonte nova só para DPR 2 |
| 7. Sombras e profundidade | Corrigido; ver avaliação visual |
| 8. Largura das casas de combate | Aplicada proposta 0,85 (variantes 0,85/0,80/0,75 medidas); percentual não aprovado pelo dono |
| 9. Emanação com carta completa e encaixe | Corrigido; quatro cantos medidos contra o encaixe visível |
| 10. Painel direito | Corrigido: altura e eixo constantes em todos os estados |
| 11. Provocar com ataque base zero + bônus | Reproduzido; **não é erro de cálculo**: é a regra documentada. Motor não alterado; decisão de regra pendente com o dono |

## 5. Nitidez — causas comprovadas

1. **Face composta fora da grade de pixels.** O navegador arredonda a origem fracionária da carta. A matriz `matrix3d` da face era calculada a partir da origem não arredondada. Ajustando modelos aos pixels da tela, a imagem coincide com a amostra deslocada ¼ px na horizontal e ½ px na vertical (erro 1,27 contra 9,25 sem deslocamento). Nas cartas de combate, 27% da energia de borda se perdia entre a amostra pintada e a tela. Correção em `hybrid/card-plane.js`: em repouso (câmera vertical, foco parado, DPR inteiro), a face é dimensionada no tamanho exato em pixels do dispositivo (a matriz vira translação) e medida a partir da origem arredondada. Medido: amostra e tela idênticas (diferença média 0,0) em DPR 1, em 1920 e em 1366. Durante transições continua o caminho anterior.
2. **Redução do mestre de 900 px.** Todas as reduções do navegador (`drawImage`, `createImageBitmap` em qualquer qualidade, redução progressiva) produzem o mesmo resultado, cerca de 15% mais macio que uma redução Lanczos do mesmo mestre. Novo `hybrid/resample.js`: Lanczos-3 separável em alfa pré-multiplicado, no tamanho de destino, com cache por desenho e tamanho e fila que cede o thread a cada ~8 ms. Erro até a referência: de 3,4–4,3 para 0,4–0,6.

Resultado contra a referência ideal (Lanczos do mestre no tamanho de destino; 1,00 = mesma energia de borda):

| Cena | Combate antes → depois | Reserva rival antes → depois |
|---|---|---|
| 1920×1080, DPR 1 | 0,64 → 0,98 | 0,67 → 0,97 |
| 1366×768, DPR 1 | 0,67 → 0,97 | 0,72 → 0,99 |
| 1920×1080, DPR 2 | 0,73 → 0,86 | 0,68 → 0,73 |

Em DPR 2, até um canvas fixo desenhado diretamente no destino aparece 0,5% reescalado na captura headless. A versão nova atinge exatamente esse teto (0,856 / 0,738), então o resíduo é da captura, não do pipeline. Zoom fracionário real do navegador não foi testado; ele usa o caminho de qualidade 2× já existente.

Pouso (mesmo UID, Golias, mão → reserva, quadros a cada ~30 ms): a carta fica oculta durante o voo e a amostra já está pronta antes de aparecer. Não há quadro vazio nem troca para o mestre. Antes, o repouso caía para 12,0 de energia de borda depois de uma chegada nítida. Depois, o repouso fica em 18,5, sem a queda ao pousar.

Hipóteses descartadas: amostra velha reaproveitada (o ticket/chave já invalidava); filtros CSS, máscaras ou sobreposições sobre a carta (inspecionados, nenhum); `image-rendering`; transformação 2D versus 3D (mesma perda).

## 6. Serrilhado e ativos

- Cena WebGL: MSAA 4× ativo (AMD/ANGLE D3D11), mas diagonais finas (glifos das casas, estrela da Emanação) mostravam degraus em DPR 1. Em DPR 2 o teto antigo de 1,5 fazia o navegador ampliar a cena 1,33×. Nova resolução interna 2× (`HYBRID.render`). Custo medido em A/B/B/A com 20 reconstruções: desenho de 5,2 para 7,2 ms em DPR 1 e de 6,1 para 7,3 ms em DPR 2; ponte de +2,2 ms. Se uma GPU levar mais de 14 ms em três desenhos seguidos, o renderer volta sozinho ao teto anterior. Não é promessa de 60 FPS.
- Molduras das cartas: resolvidas pela correção da face (amostra Lanczos 1:1, sem reamostragem no compositor).
- Inventário (`inventario-ativos.json`): retratos dos Patronos (735–1023 px), poderes (≥300 px), ícones de custo (366 px) e escudo/verso têm resolução suficiente em DPR 1 e 2. Cinco ilustrações ficam abaixo do necessário **apenas** para a consulta ampliada em DPR 2 (~588 px): `art/forja-personalizada/toque-gelido-v2.jpg` 500×500, `engenheiro-cauteloso.jpg` 551×412, `miragem-provocadora.jpg` 564×564, `art/virelion/FV01.jpg` 508×640, `FV07.jpg` 536×928. Não há original maior no projeto. Dependem de nova fonte; nada foi ampliado artificialmente.

## 7. Sombras

Medido antes: a carta de combate tinha só um escurecimento de cerca de 20% em 4 px, azul-acinzentado (`filter: drop-shadow(... #00171999)`), sem contato com a mesa. A sombra WebGL do corpo fica quase toda sob a carta. O “bloco claro” sob a carta da reserva é o trilho da prateleira, não uma camada da carta. Agora a própria face desenha uma sombra em camadas (pixel-alinhada, viaja com a carta): linha de contato junto à borda, oclusão curta e projeção suave para baixo à esquerda, oposta à vela, em tom quente-escuro. O filtro cinza foi retirado. Luz global, mapa de sombra e vela não foram alterados.

## 8–10. Composição (`hybrid/config.js` `HYBRID.compose`, `hybrid/bridge.js`, `hybrid/composition.css`)

- Casas de combate × 0,85 (proposta). Campo em 1920: 1230 → 905 px. As cartas mantêm o tamanho. Variantes medidas com duas armadilhas na mesma casa: 0,85/0,80/0,75 → sobreposição de 10,7/17,3/24,0 px com as fichas antigas. Fichas menores e empilhadas na vertical: 0 px de sobreposição, folga de 3,3 px.
- Emanação: carta normal completa (mestre 900×1260, moldura, título, texto, estatísticas nativas), casa retrato com 0,435 da profundidade do campo. O recorte compacto da revisão 11 não é mais usado. Margens contra o encaixe 3D visível (topo da casa projetado): 5,1–6,5 px em 1920 e 3,2–4,3 px em 1366, diferença máxima de 0,9 px entre lados opostos, nas quatro Emanações, nos dois assentos, antes e durante o foco. Letreiro “EMANAÇÃO” mantido em 15 px na tela.
- Colunas laterais simétricas (132/132 px CSS), o que centra o campo. Registro + Nartvanyr ficam dentro da faixa do campo (o Registro, acima, passaria a invadir a prateleira rival). O painel direito ocupa a mesma faixa com altura constante (326 px em 1920, 207 em 1366): título e circuito fixos, ação na base, legenda em uma linha com a seta pendurada fora do eixo das palavras. Desvio dos elementos em relação ao eixo: 0 a 1,3 px. Sem salto entre sua vez, vez do rival, votação, formação, aguardando e combate. Contador numérico, “Vazia”, “Solte aqui” e legendas removidas não voltaram.

## 11. Provocar — reprodução

`mesa-nova/test-taunt-bonus.mjs` usa cartas reais (João Bobão FL16, Adquirir Atualização FL10, Golias FL09, Aprendiz FV03), o fluxo real formação → prontos → linha do tempo → resolução e um provocador igual no outro assento. Rastro em `provocar/trace-before.json`.

- João 0/3 sem bônus: o inimigo provocado o atinge; João não golpeia.
- João com +1/+1 real: ataque efetivo 1 (o motor usa o efetivo, não o impresso). João golpeia **uma vez, na própria posição** (vazia → Patrono −1). O inimigo provocado não recebe dano.
- Com inimigo à frente: João atinge o da frente, não o provocado.
- Controle Golias 5/10: mesmo comportamento.

Isso segue a regra escrita em `design/OFICINA_DE_LYRIK.md`: “O atacante dessa posição ataca a criatura provocadora. Ela continua atacando uma única vez, na própria posição.” O servidor e a apresentação concordam: dois golpes independentes, sem confronto pareado. Pelo critério do pedido (“nenhuma regra específica válida impede”), a regra documentada impede. Por isso o motor **não foi alterado** (hash mantido). Mudar exige decidir a regra (ver pendências).

## Pendências que dependem do dono

1. **Regra de Provocar**: o provocador deve golpear o inimigo provocado? Se sim, em vez do alvo da própria posição (sempre, ou só quando ela estiver vazia), ou em confronto pareado com o provocado? A regra atual o mantém atacando a própria posição.
2. Aprovar ou ajustar a largura 0,85 das casas e o tamanho resultante da carta completa na Emanação (91×127 px em 1920; 57×81 em 1366, onde o texto da carta só é legível na consulta).
3. Novas fontes para as cinco ilustrações abaixo de DPR 2.

## Validação executada (códigos de saída reais)

`prototype-qa/claude-nitidez-provocar-20261105/verificacao/integracao-1/results.json`, servidor isolado 3101:

| Comando | Saída | Resultado |
|---|---|---|
| `npm test` (suíte ampla) | 0 | passou |
| `npm run test:polish` | 0 | passou |
| `mesa-nova/test-taunt-bonus.mjs` (novo) | 0 | 4 casos |
| `presentation-geometry-qa` | 0 | 41/41 |
| `presentation-recovery-qa` (perda/recuperação WebGL) | 0 | 25/25 |
| `presentation-stage2-transfers` (compras/retornos) | 0 | 35/35 |
| `presentation-stage2-arrivals` | 0 | 26/26 |
| `presentation-incremental-qa` | 0 | 9/9 |
| `hybrid12-combat-duplicates` | 0 | 72/72 |

Capturas finais `antes/` (servindo a baseline exata) e `depois/`: 9/9 cada, zero erro de página, câmera vertical e WebGL sem erro. Testes de geometria e interação continuam passando com o novo contrato (Emanação com carta completa): nenhuma asserção foi afrouxada.

Prévia: `http://127.0.0.1:3086/runamarca/` serve os mesmos bytes testados (`servidos-3086.txt`, 9/9 idênticos); recarregue a aba (Ctrl+F5). O processo do dono não foi reiniciado. Comparação: `http://127.0.0.1:3104/` (servidor somente leitura `scripts/claude-review-server.mjs`; também abre como arquivo em `comparacao/index.html`). Modo 100%, 52/52 imagens conferidas no navegador.

Limites: zoom fracionário real do navegador não testado; celular não testado nem bloqueado; custo medido só nesta GPU (AMD RX 9060 XT); vídeo de pouso substituído por sequência de quadros (`pouso/`). Não foi feito commit, push, deploy ou mudança no Render.

## Atualização 06/11/2026 — regra de Provocar alterada (decisão do dono)

Decisão: o provocador, quando atacado por um inimigo provocado, **troca dano com esse inimigo** em vez de golpear a própria posição. Continua sendo um único golpe, com o ataque efetivo. Com vários provocados, golpeia o primeiro a atacá-lo: Iniciativa primeiro, depois a posição mais à esquerda; só contam inimigos que de fato atacam. Se esse inimigo morrer antes de atacar, vale o seguinte; sem nenhum, a própria posição.

Mudança no motor (focal, identificável): `mesa-nova/combat-effects.mjs`, `resolveDirectedCombat` — escolha do alvo do provocador e queda para o próximo provocado vivo. `game.mjs` não mudou (hash `0ac0d8ca…`). A linha do tempo da animação usa a mesma resolução, então servidor e apresentação mudaram juntos. Cópia anterior: `prototype-qa/claude-nitidez-provocar-20261105/provocar/combat-effects.antes.mjs`.

Cópia do motor usada pelo bot: `bot/runner/source/mesa-nova/combat-effects.mjs` foi sincronizada e o hash dessa entrada foi atualizado em `bot/runner/source/manifest.json` (uma linha), conforme `bot/INTEGRATION.md` (“regenerar intencionalmente se as regras mudarem; nunca desativar a validação”). A política do bot não foi alterada.

Textos: glossário em `mesa-nova/rules-glossary.js` e regra em `design/OFICINA_DE_LYRIK.md`.

Testes:
- `mesa-nova/test-taunt-bonus.mjs`, reescrito para a nova regra, com 10 casos: zero sem bônus, bônus real de Adquirir Atualização, frente ocupada, controle Golias, dois provocados por posição e por Iniciativa, provocado sem ataque, troca letal, provocado morto antes de atacar e gêmeo idêntico no outro assento. Falhou no motor antigo (`provocar/teste-nova-regra-antes.log`) e passa no novo.
- `mesa-nova/test-oficina.mjs:29` codificava a regra antiga, contando só os passos de primeiro nível. Foi substituído pelo novo contrato: ainda exige exatamente um golpe do provocador, agora contando pares, e com alvo no atacante redirecionado. A cópia anterior está em `provocar/`.
- Regressões, todas com saída 0: `npm test`, `test:polish`, geometria 41/41, duplicatas de combate 72/72 e bot 28/28 (`node --experimental-vm-modules --test bot/*.test.mjs`).
- Navegador, nos dois assentos (`provocar/navegador-nova-regra/`): golpe pareado João ↔ provocado na diagonal, João 4 → 2 e provocado 6 → 5 no mesmo instante, Patrono intacto.

Servidor da prévia reiniciado em 06/11/2026, com autorização do dono: mesmo comando (`node --experimental-vm-modules scripts/board-prototype-server.mjs`), mesma pasta (`runamarca-simplificacao-etapa2`), porta 3086 e armazenamento padrão `.runamarca-feedback` preservado. Novo PID 19488. O processo carrega o motor com a nova regra de Provocar e serve os mesmos arquivos testados (9/9 idênticos). As salas em memória da execução anterior foram encerradas. Logs em `task-2/prototype-server-3086-claude.*.log`.
