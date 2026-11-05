# Mesa 3D — estado atual da arquitetura

Desde a simplificação de 05/11/2026, a entrada canônica é `mesa-nova/index.html`. `/runamarca/` e os aliases antigos servem essa mesma entrada 3D. O diretório `hybrid` contém adaptadores ativos de apresentação; não oferece uma segunda versão pública do jogo.

O cliente declara a ordem de atualização, a geometria e os pontos de animação. Os módulos registram adaptadores em `RunaPresentation`, usam `RunaGeometry` e compartilham o controle de chegadas por partida/UID. Eles não substituem as funções globais do cliente. Se WebGL falhar, a interface oferece recuperação ou recarregamento, sem expor uma mesa 2D.

Documentação atual: [plano e estado das etapas](../../docs/PLANO-SIMPLIFICACAO-MESA-3D.md), [coordenadas](../../docs/APRESENTACAO-ETAPA-3-GEOMETRIA.md), [atualizações](../../docs/APRESENTACAO-ETAPA-4-ATUALIZACOES.md) e [entrada e recuperação](../../docs/APRESENTACAO-ETAPA-5-ENTRADA-RECUPERACAO.md).

## Arquivo histórico das revisões visuais

O conteúdo abaixo registra versões anteriores. Seus ângulos, rotas, resultados, referências a fallback e afirmações de publicação descrevem a época de cada revisão, não o contrato atual.

---

# RunaMarca híbrido — revisão de UI do dono (31/10–01/11/2026)

Abrir **http://127.0.0.1:3086/runamarca/hybrid/index.html** com **Ctrl+F5** (`hybrid-12-ui-owner`). Pacote de revisão completo (requisito → implementação → teste → evidência, medidas por viewport, expectativas de QA alteradas, resultados, falhas herdadas, referências Hearthstone e pendências): **`prototype-qa/ui-owner/REVIEW-PACKAGE.md`**. Nada foi commitado além dos commits locais de segurança anteriores (`88ad7b5`, `d7a29cd`); nada foi enviado nem publicado. A revisão cabe ao Codex.

**Rota nativa afetada.** As alterações são de apresentação, mas dois arquivos são compartilhados com `/runamarca/`: `combat-return.js` (retorno pós-combate com escala uniforme, proporção própria de cada face e quadro final de aterrissagem; opção `measure`) e `entry-modes.js` (textos das escolhas de entrada com o efeito real). `/runamarca/index.html` não foi alterado e ainda os referencia com `?v=` antigo; os bytes servidos são os novos (`prototype-qa/ui-owner/effects-audit-final.json`). Motor, catálogo, custos, servidor, bot e APIs não foram alterados.

**Parâmetros** (`hybrid/config.js`, `HYBRID.owner`): `composition 1.10` (composição geral, Patronos incluídos), `hand 1.15` (mão própria), `opening 1.25` (mão inicial/mulligan), `rivalMinStrip 17` (faixa visível de **cada** dorso rival, incluindo o mais externo do leque de nove, quando o excesso vai para o topo). Os percentuais são finais, relativos ao checkout do início da rodada; `visualScale 1.15` e o ×1,25 histórico da mão não são reaplicados. A composição é limitada por `layout.js` quando a faixa do Patrono rival/dorsos não caberia no topo, quando haveria rolagem horizontal, quando os blocos de éter sairiam da tela ou quando os rótulos do Nartvanyr transbordariam a coluna (celular). Efetivo (`RunaHybridLayout.stats.composition`): **1,100** em 1920×1080, **1,006** em 1920×900 e 1440×900, **1,009** em 1536×740, **1,005** em 1280×720, **1,094** em 390×800 e **1,023** em 320 px. **O +10% só é atingido em 1920×1080**; nas telas de até 900 px de altura o crescimento da composição fica em +0,5–0,9%. A mão (+15%) não depende desse limite; o mulligan chega a +25% exceto em 1280×720 (+21,9%) e 390×800 (+22,8%). **Essas exceções responsivas foram autorizadas pelo dono em 01/11/2026.** A autorização vale para adaptar as escalas sem cortes e não cobre cortes do detalhe da carta.

**Validação final (01–02/11).** Detalhe da carta no celular: o mesmo verificador deu 53/65 antes da regra `@media(max-width:750px)` do `#card-detail` em `bridge.css` (12 cortes em 320 e 390 px) e 65/65 depois. Sonda híbrida: 304/304. Retorno nativo: 45/45. Poderes: 8/16 → 40/40. Suíte `ui-owner-after-final4`: 38/41. A comparação com `ui-owner-before` deu 40 comandos idênticos e 0 falhas novas; as 3 falhas são herdadas. O agregado de navegador `hybrid12-qa-all` sobre o código atual foi concluído em `prototype-qa/ui-owner-after-final5/` (02/11): 25/26 scripts com saída 0, saída 1 do runner. A única falha é a herdada `hybrid12-combat-duplicates` 68/72 (4× `bobo-taunt`, mesmo padrão da rota nativa). As tentativas `final3/` e `final4/` foram interrompidas com o fim da sessão e ficam preservadas como incompletas. Detalhes nas seções 6.1 e 10 do pacote. **V26 (26.0.0-dev):** `version.json`, `version-badge.js`, o endpoint e `test/version.test.mjs` foram feitos pelo assistente do orquestrador, com autorização do dono. Não fazem parte desta revisão de UI (seção 6.2).

**Continuação (01/11) — correções sobre a rodada 1:** dorsos rivais externos voltaram a ≥ 17 px (eram 11,8–13,7 px); folga coração rival → rótulo "Reserva rival" de 0,65–0,84 px para ≈ 5,5–6,5 px (`margin-top` 11 → 15 px); prateleiras compactas 70 → 74 px (> 820 px de altura) e padding 13/0, porque as cartas da reserva saíam 3,5 px da prateleira e cortavam o rótulo; fundo vazio da prateleira rival sem hit-test (cobria a ponta direita do Registro em 1280×720); bloco de éter dentro da tela em 320 px e rótulos do Nartvanyr dentro das colunas em 390 px; Emanação no celular sem a variante "sem ilustração" (usa a leitura pela carta completa); `outerInsetFraction` .07 → .085 (com .07 a sombra lateral das cartas de combate externas ficava abaixo do avaliador de câmera); título das escolhas no celular fora de baixo de "Fechar ×". Expectativas de QA alteradas, com a evidência de cada uma: seção 4 do pacote de revisão.

---

# RunaMarca híbrido — revisão 12: câmera a 5° da vertical, profundidade por relevo e luz

Abrir **http://127.0.0.1:3086/runamarca/hybrid/index.html** com **Ctrl+F5** (`hybrid-12`). Servidor local: `node --experimental-vm-modules scripts/board-prototype-server.mjs` (ou `ABRIR-PROTOTIPO.cmd`), restrito a 127.0.0.1, porta `PROTOTYPE_PORT` (3086). Na revisão 12, `/runamarca/` não foi alterado; motor, catálogo, regras, servidor e bot também não. (A revisão de UI do dono, acima, altera dois arquivos compartilhados com `/runamarca/`.)

**Câmera — um parâmetro.** `CAMERA_TILT_DEGREES = 5` em `hybrid/config.js` é o ângulo entre o eixo da câmera e a **vertical** (0° = olhar reto para baixo). Convenção usada por `bridge.js camera()`: mesa no plano XZ, Y para cima, alvo `[0,0,0]`, olho `[0, cos θ·D, sin θ·D]` com D = hypot(22,16) e FOV vertical de 43° (mantidos). A mesma `vp` alimenta o shader, `unproject()`, `surface()`, `footprint()` e o posicionamento dos controles DOM; não há segunda inclinação em CSS. A cadeia de reduções ×0,85 das revisões antigas saiu do código; `CAMERA_HISTORY` só documenta os valores anteriores (rev. 11 = 15,9855369664°). `window.__HYBRID_TILT_DEGREES` é um gancho exclusivo de QA, lido uma vez antes do carregamento e aceito só no intervalo (0°, 45°]. 0° é rejeitado e volta a 5°: nesse ângulo a direção da câmera fica paralela ao vetor "para cima" de `lookAt()`, `right`/`up` se anulam e tudo se projeta no centro; apontado na 2ª rodada do Codex; quando usado, `RunaHybridConfig.snapshot().camera.qaOverride` o mostra (normalmente `null`). Atribuições depois do carregamento são ignoradas (`hybrid12-regressions`).

**Relevo e luz** (`HYBRID.relief`): lâmpada a 27° de elevação e 16 unidades de distância horizontal, na mesma direção de tela das revisões anteriores (alto à direita), de modo que o comprimento da sombra por unidade de altura (1/tan 27° ≈ 1,96) não depende da câmera; mapa de sombra 2048 com frustum ajustado à área visível (texel ≈ 0,02 unidade), bias proporcional à inclinação da face e PCF 3×3; `shadowKeep = 0,3` (luz mantida na sombra); `edgeShade = 0,34` (escurecimento das faces verticais); corpo WebGL de 0,1 sob cada carta de mesa (`cardThickness`, topo em y = 0,2); camadas da pilha do deck escalonadas 0,014 da profundidade da reserva em direção ao lado da sombra (`deck.stagger`). `RunaHybrid.slabs` lista os UIDs com corpo; `RunaHybridLifecycle.stats.motionUids`, as cópias de movimento em tela.

**Correção desta revisão — corpo sem face.** Quando o nativo ocultava uma carta com `visibility:hidden` (voo de combate, morte, arrasto), o corpo WebGL só saía no rebuild agendado (2 quadros), aparecendo 1–2 quadros como um "pedestal" sob a cópia que partia. Agora, se a visibilidade de uma carta com corpo muda, o observador já existente reconstrói no mesmo microtask (`CardPlanes(invalidate, flush)` com `flush = syncNow`); demais mutações continuam agendadas. Verificado em `hybrid12-regressions` (o corpo some antes do quadro seguinte e volta ao reexibir) e em `hybrid12-combat-duplicates`.

## Medição da câmera (`scripts/hybrid12-camera.mjs`)

1. **GPU:** um init script intercepta a matriz `camera` enviada ao programa que também tem o uniform `lamp` (passe de materiais). Dela saem o olho (núcleo das linhas x, y, w), o eixo, o FOV e a distância: **5,0000°**, alvo na origem (erro < 0,01°), FOV 43°, distância hypot(22,16), sem rolagem, em todos os tamanhos e DPRs; controle com a sobreposição de QA: **15,9855°**.
2. **Pixels (independente da matriz e do valor declarado):** as bordas laterais do feltro são localizadas na captura em pixels do bitmap (DPR-consciente) e convertidas para CSS. Cada linha usa uma busca grosseira de fora para dentro e depois o cruzamento subpixel, **pelo lado interno do feltro**, do nível a 70% entre o feltro (g − r) e o aro externo. Linhas cuja sonda interna não é feltro uniforme (carta, rótulo, painel) são rejeitadas; cada borda é ajustada por mínimos quadrados entre 12% e 88% da altura, com descarte de resíduos > 1,5 px e dois reajustes. O ângulo vem do **ponto de fuga** das duas retas: tan θ = H·Δk / (t·(H·Δk + 2·W₀)), com Δk = diferença das inclinações dx/dy, W₀ = distância entre as retas em y = 0, t = tan(FOV/2) da matriz e H a altura CSS. Retas paralelas à profundidade convergem no mesmo ponto em qualquer altura e extensão em z, então a medida não depende da altura real do plano nem de onde estão os aros longe/perto. A incerteza é a propagação de primeira ordem dos erros-padrão do ajuste. Exige ≥ 40 linhas mantidas por borda e σ < 0,75 px; amostras, rejeições, descartes, resíduos e resultado ficam em `camera-detail.json`.
   - **Por que mudou:** o primeiro estimador da revisão (razão de larguras longe/perto, que usa o z do mundo) mediu 7,57° em 1280×720 e 13,64° no controle de 1920×900. Duas causas: (a) o aro de bronze escovado (`sin(P.z·40)`) fazia o primeiro pixel azul-petróleo oscilar ±3 px com período de ~60 px e enviesava a reta; (b) o limiar a 50% alternava entre duas fronteiras paralelas — a borda do feltro e o friso interno de tinta, ~0,05 unidade para dentro (σ ≈ 1 px). A razão de larguras continua registrada só para comparação; no controle ela dá 14,48° e 15,54°.
   - **Resultado no código atual** (`prototype-qa/hybrid-12/continuacao-final/camera-detail.json`, campo `precision`): ver a tabela em "Verificação". (`after/camera-detail.json`, citado em versões anteriores deste guia, nunca foi gerado.)
3. **Âncoras e hit-test:** projetar as âncoras do mundo com a matriz capturada cai nos centros DOM (< 1 px); painéis e decks coincidem com o centro da superfície (< 0,5 px); os centros projetados das seis casas fazem hit-test na casa certa; nenhum contêiner tem `transform` 3D, `rotate` ou `perspective`.

## Scripts novos ou corrigidos nesta revisão

- `hybrid12-regressions.mjs` (novo): semântica da sobreposição de QA; um corpo por carta visível, remoção/retorno síncronos ao ocultar e no arrasto; lâmpada a 27°/16 medida da posição real; re-render do mesmo estado sem mover âncoras (≤ 0,1 px) nem a face dentro da carta (≤ 0,35 px); ausência de rebuild ocioso; sombra lateral moderada sob carta de combate e deck (pixels); legibilidade dos recortes com texto em relação ao *before* (≥ 85% de luminância e contraste); fallback WebGL sem reiniciar a partida, com hit-test das seis casas; nenhum comando enviado.
- `hybrid12-veronica.mjs` (novo; sincronizado com quadros na continuação de 31/10, ver "Verificação"): combate real do motor nas duas perspectivas, em 1920×900, 1280×720 e 390×800. Verifica beneficiários do motor (a própria Verônica + aliados adjacentes ocupados, sem fantasma em casa vazia), trilhos `.protocol-link` saindo do nó atual da Verônica e chegando a cada beneficiário (≤ 1,5 px; face projetada ≤ 2 px) e trilhos que acompanham resize (desktop) ou scroll (mobile) durante a manifestação (a carta se move 90–137 px). Também verifica: nenhuma marca antes da Revelação e exatamente uma por beneficiário depois; marcas expiram no fim do combate; movimento reduzido sem trilhos; interrupção no meio com limpeza total.
- `hybrid12-combat-duplicates.mjs` (corrigido): a `view()` do servidor libera a timeline de combate progressivamente, mas o script enviava um único estado, que só tinha a revelação das formações. Os 32/32 anteriores (`dev/combat-repro/`) não exercitaram golpes nem Provocar. O runner agora usa `poll()` (`hybrid12-lib.mjs`), que reenvia a `view` a cada 150 ms como o polling da sala, e exige que a página receba a timeline inteira. Uma cópia passa a ser o nó **mais externo** com aquele `data-uid` no `#visual-layer`: o voo nativo carrega a face `.flight-face` com o mesmo UID dentro de si. Os mesmos cenários rodam antes na rota nativa como referência, com duas checagens: (1) nenhuma duplicação introduzida pela híbrida (face de movimento, corpo WebGL ou padrão ausente na rota nativa) e (2) a checagem absoluta, mantida.
- `hybrid12-camera.mjs` (estimador corrigido, acima) e `hybrid12-suite-compare.mjs` (novo: compara `suite-before.json` e `suite-after.json` por comando, status, contagens e mensagens).
- Expectativas antigas alteradas apenas pelo requisito de câmera, com comentário: `hybrid9-geometry`, `hybrid9-hands` e `hybrid11-regressions` (de 18,8065° × 0,85 para 5° da vertical).

## Verificação (estado atual — continuação de 2026-10-31)

Pacote completo, diagnóstico e evidências: `prototype-qa/hybrid-12/REVIEW-PACKAGE.md`. Diff da revisão 12 contra a árvore verificada da revisão 11: `git diff 87f9208df3408f1d033e9a8321b60744eea7b0fa -- . ":(exclude)prototype-qa"` (cópia em `prototype-qa/hybrid-12/continuacao-review/`).

**Como executar** (servidor no ar em 127.0.0.1:3086; Chrome e Playwright locais conforme `scripts/hybrid12-lib.mjs`):
```powershell
node scripts/hybrid12-qa-all.mjs prototype-qa/hybrid-12/<pasta-nova>      # 26 execuções de navegador
node scripts/hybrid12-run-suite.mjs <rótulo>                                # 41 comandos, sem parar na 1ª falha
node scripts/hybrid12-suite-compare.mjs before <rótulo>
node scripts/hybrid10-qa.mjs prototype-qa/hybrid-12/<pasta-nova> scripts/hybrid12-veronica.mjs
```
Diagnóstico da Verônica: `HYBRID_QA_SOURCE=rev11` serve os arquivos do baseline da revisão 11 por interceptação local (nada no checkout é trocado), `HYBRID_QA_TARGET=native` usa `/runamarca/`; `prototype-qa/hybrid-12/continuacao-tools/compare-veronica.cjs` intercala as três rotas em pastas novas.

**Câmera (`continuacao-final/camera-detail.json`, `precision`):** matriz GPU 5,0000° em todos os tamanhos; estimador por pixels 5,005° (1920×900), 5,004° (1920×1080), 5,044° (1440×900), 5,053° (1280×720), 5,010° e 4,998° (DPR 2), erro-padrão 0,008–0,032°; controle de 15,9855°: 16,005° e 16,001°. `hybrid12-camera` 234/234.

**Verônica — intermitência resolvida no teste, não no produto.** A QA retomada tinha 87/90 e as repetições 2, 6 e 9 falhas em 90. Com o trace (`scripts/hybrid12-veronica-trace.js`), em todas as execuções a manifestação terminou porque suas animações de 950 ms terminaram (nenhum cancelamento por resize/renderização, nenhuma perda de fonte nem troca de geração). O harness media 0,7–1,3 s depois da criação, já após o fim normal, e media as marcas depois do fim do passo de Revelação, quando o golpe seguinte oculta a carta atacante e sua marca. O baseline real da revisão 11 falha do mesmo modo e na mesma proporção (88, 87 e 88/90 contra 88, 87 e 90/90 na atual). A rota nativa passa, porque sem rebuild WebGL mede em 330–580 ms. O teste passou a medir na página o estado **apresentado** de cada quadro, a partir do próprio evento de resize/scroll e da aplicação das marcas. Também verifica: o último quadro da manifestação e todos os quadros sem movimento de layout (no máximo 1 quadro de atraso, no quadro em que o layout muda); trilho → face projetada ≤ 2 px medido diretamente; marcas exatas em todo quadro posicionado do passo (oculta só se a própria carta estiver oculta); fim por animações concluídas; uma única manifestação, reconferida após o combate; e marcas só para beneficiários do motor durante todo o combate. Tolerâncias, sleeps e asserts anteriores foram mantidos.

**Correção de produto desta continuação:** `card-plane.js` grava `record.slab` antes de pular cartas de tamanho zero. Antes, uma carta oculta e colapsada no mesmo lote disparava um rebuild síncrono completo (`flush`) a cada mutação (6/6 na sonda `continuacao-tools/slab-zero-probe.mjs`); agora são 1 ao ocultar, 0 depois e 1 ao reexibir. Não era a causa da intermitência.

**Resultados atuais** (tabela completa em "Verificação final" do pacote de revisão):
- QA agregada do código final (`continuacao-final-pos-codex/`): 24/26 scripts com saída 0. Falharam:
  - `hybrid12-combat-duplicates`, 68/72: as 4 falhas herdadas de `bobo-taunt`.
  - `hybrid9-probe`: exceção de encerramento do próprio probe (ack de screencast depois de fechar o navegador), depois do resultado completo. Isolado, passou 3/3; na rodada `continuacao-final`, também passou, e essa rodada ficou em 25/26.
- Verônica: 118/118 na atual, 3/3 execuções; 118/118 no baseline rev11; 105/105 na rota nativa.
- Câmera: 234/234.
- Regressões da revisão 12: 68/68.
- Suíte: 38/41 comandos, com os 41 resultados idênticos ao *before*. Falhas herdadas: `test.mjs`, `test-mesa-layout.mjs` e `test:polish`.

Revisão técnica do Codex, duas rodadas, com todos os apontamentos aplicados. Na 2ª rodada:
- o avaliador de marcas passou a limitar a tolerância inicial a 2 quadros e a exigir posicionamento durante a Revelação, sem fallback (`continuacao-tools/marks-evaluator-check.cjs`, 9/9);
- o override de QA passou a rejeitar 0° (intervalo (0°, 45°]).

Depois disso: regressões 70/70, câmera 234/234, Verônica 118/118 (atual ×3 e rev11 ×2) e suíte 38/41, com os 41 resultados idênticos. As correções da 2ª rodada ainda não foram revistas pelo Codex.

**Histórico:** os números de `after/`, `qa-after.log`, `dev/` e `resumed/` são de antes desta continuação. Estão preservados e não descrevem necessariamente o código atual.

## Limitações e pendências reais

- **Duplicação herdada da rota nativa (`bobo-taunt`):** quando uma criatura morre por um golpe redirecionado por Provocar, o resto `visual-dead` fica na casa enquanto o retorno nativo cria uma `card-flight` do mesmo UID no mesmo retângulo, por ~1,1 s. A rota nativa mostra o mesmo padrão em mais quadros (233/335 contra 153–172 na híbrida). O defeito está na apresentação nativa compartilhada (`app.js`/`combat-return.js`), que esta revisão não altera; a checagem absoluta de `hybrid12-combat-duplicates` continua **falhando** nesses 4 casos de propósito.
- **Balanço ocioso nativo × corpo WebGL:** a animação `card-idle` balança o nó da carta de combate (±1,75 px, ±0,6°); a face acompanha porque é filha do nó, mas o corpo WebGL é amostrado na fase corrente a cada rebuild e fica parado. A face pode ficar até ~2 px fora do corpo. É anterior a esta revisão, só a espessura mudou (0,08 → 0,1).
- **`Escape` durante o arrasto** cancela o arrasto e também abre o menu da sala (comportamento nativo; `hybrid12-regressions` registra `menuOpened` e fecha o menu para continuar).
- **Suíte nativa:** as 3 falhas de comando (`test.mjs`, `test-mesa-layout.mjs` e dois casos de `test:polish`) já falham no commit `a54d16f` exportado sem nenhuma mudança das revisões 10–12 (`prototype-qa/hybrid-12/suite-head-a54d16f.json`).
- A QA de navegador *before* (`qa-before.log`, `before-combat/`) foi interrompida pelo reinício do PC e está preservada como estava; `before-combat/combat-duplicates.json` tem zero verificações e não comprova nada.
- Toda a QA usa Chrome headless com viewport, DPR, toque e movimento reduzido **emulados**; nenhum aparelho físico foi usado.
- **Custo dos rebuilds (anterior à revisão 12):** cada `render()` chama `syncNow()`. Após um resize, há quadros de 160–310 ms e `bridgeMs` de até ~240 ms em 1280×720, com o mesmo perfil na revisão 11. Os trilhos podem ficar 1 quadro atrás do layout no quadro em que ele muda, e a remoção da manifestação pode atrasar ~300 ms.
- **Marca da Verônica durante golpes:** fica oculta enquanto o original da carta atacante está oculto sob a cópia de voo nativa e volta depois (comportamento compartilhado com `/runamarca/`).
- **Manifestação repetida só no baseline:** 2 de 48 execuções da revisão 11 chamaram `empower()` duas vezes no mesmo combate. Não houve ocorrência na atual nem na nativa. A causa não foi demonstrada (ver o pacote de revisão); o teste agora detecta a repetição.

---

# RunaMarca híbrido — revisão 11: hover baixo, escala +15%, decks nas reservas

Abrir **http://127.0.0.1:3086/runamarca/hybrid/index.html** com **Ctrl+F5** (`hybrid-11`). `/runamarca/` e o laboratório não foram alterados. O único arquivo compartilhado tocado é `app.js`: o evento `opening` agora passa `{presentation:'opening'}` ao `animateDraw`, e o `animateDraw` nativo ignora esse argumento. Não houve commit nem publicação. O baseline do trabalho preexistente (diff e cópias) está em `prototype-qa/hybrid-11/baseline-source/`. O diff exclusivo desta revisão está em `prototype-qa/hybrid-11/revision11-*.diff`.

**Parâmetros centrais:** `hybrid/config.js` (`window.RunaHybridConfig.snapshot()`).

| Item | Antes | Depois |
| --- | --- | --- |
| Câmera | atan2(16,22)·0,85⁴ = 18,8065140781° | ×0,85 = **15,9855369664°** |
| Fator visual | — | **1,15** aplicado uma vez sobre o ajuste responsivo (zoom = fit × 1,15; o fit não mudou: 1,139 em 1920×900) |
| Hover (largura ÷ carta da mão) | 2,47× (1920×900), até 3,25× | **1,55×**, no máximo 46% da altura, borda inferior a 6 px do fim da janela |
| Distância mão ↔ Patrono (1920×900) | 51 px | **3–5 px** (folga paramétrica de 10 px; em 1920×1080: 138 → 59 px) |
| Corte lateral do campo | 2,83% por lado | recuo externo dos painéis = 11,5% da largura; corte igual dos dois lados (≈11,4–12%) |
| Emanação: vagas / faixa central | 0,46 d / 0,04 d | 0,40 d / 0,15 d (rótulo projetado de 0,08 d) |
| Deck | na faixa da mão | suporte à direita de cada reserva: profundidade 0,8 da reserva (0,56 em telas estreitas), proporção 1,4, folga 0,2 |
| Abertura (5 cartas) | 9,9 s | **2,5 s** (×0,25 em cada etapa programada); a compra normal segue em 2,0 s |

**Tremulação — causa comprovada:** a cada `render()`, o MutationObserver de `camp-layout.js` (`fitReserve`) regravava `--camp-overlap` com outra fórmula (gap fixo de 12 px e larguras com e sem zoom misturadas). A ponte só restaurava o valor correto dois quadros depois. A sonda quadro a quadro (`scripts/hybrid11-flicker-probe.mjs`) mostrou o efeito: antes, um render com estado idêntico deslocava as reservas em até 5,75 px por 2 quadros; depois, 0 px. Correção: a cena passou a usar somente `--hybrid-camp-overlap`, escrita apenas pela ponte, e o observador de estilo ignora a gravação nativa. No fallback 2D, o valor nativo volta a valer.

**Emanação:** face vertical, com a ilustração em cima e o texto em área própria embaixo. O texto rola quando necessário e não inicia arrasto. A vida é o coração nativo da própria carta: o canvas `.health-liquid` (desenhado por `updateLiquidHeart`/`drawLiquidHeart`) e o SVG `.health-value`, apenas recortados com `clip-path` e reposicionados, sem nenhum redesenho próprio. Dano, cura, buff e a animação do líquido continuam nativos. O rótulo "Emanação" é projetado no plano da mesa, entre as vagas.

**Escala e recortes:** em desktop com até 900 px de altura, o fluxo ampliado não cabe; o excesso vai para o topo. Com isso, a mão rival mostra uma faixa menor acima da banda rival. Recorte adicional: 63 px em 1920×900 e 1440×900, 54 px em 1536×740, 53 px em 1280×720; nenhum em 1920×1080 nem no mobile. O inventário do relatório (`newCrops`) não acusa outros elementos fora da janela ou do documento. A sonda de texto (`dev-qa/narrow-text-probe.mjs`) também não encontra elementos fora da janela de 320 px após a correção dos painéis descrita abaixo. As casas de combate ficaram 15% mais fundas, mas mais estreitas nos viewports em que o recuo dos painéis domina (largura das trilhas 0,97× em 1280–1536 px; 1,15× em 1920 px).

**Correções após a primeira revisão do Codex:**

- `flights.js`: o indicador do perfil de abertura chama-se `openingDeal` e não sombreia mais `opening`, a Promise da transferência da mão confirmada. Uma compra pedida durante essa transferência espera o fim dela (`if(openingBusy) await opening`).
- `fan-layout.js`: os tetos estreitos (`previousWidth`, `w` e `responsiveCap`) também recebem `HYBRID.visualScale`. As medidas a seguir são do código final, em Chrome headless emulado:

| Mão no mobile (9 cartas) | Antes da revisão 11 | Final | Crescimento |
| --- | --- | --- | --- |
| Carta própria, 390 px (800/1000 de altura; DPR 1 e 2) | 129,3 px | **148,7 px** | **1,15×** |
| Carta própria, 320 px | 104,3 px | **119,9 px** | **1,15×** |
| Verso rival, 390 px / 320 px | 77,6 / 66,4 px | 89,3 / 76,3 px | 1,15× / 1,15× |
| Faixa visível da mão própria, 390 px | 118,5 px | 136,3 px | 1,15× |
| Recorte inferior intencional da mão própria, 390 px / 320 px | 97,7 / 83,4 px | 108,7 / 92,3 px | — |

A informação anterior de crescimento de 1,00× na mão própria mobile era anterior a essa correção e foi substituída. Com nove cartas, o leque fica entre 14,0 e 376,0 px em 390 px e entre 14,0 e 306,0 px em 320 px. Não há rolagem horizontal, e as cartas 0, 4 e 8 continuam alcançáveis por hit-test. `hybrid9-hands` (693 verificações) continua passando em 390×1000, 320×800 e 390×800 com DPR 2. `hybrid9-touch` (21 verificações, toque emulado) também passa em 320×800 e 390×800.

**Painéis em telas de até 360 px (segunda revisão do Codex):** com a escala ×1,15 sobre o fit mobile (zoom 1,3225), as fichas de éter dos Patronos passavam até 11,5 px da borda esquerda em 320 px. Os rótulos "0 carta(s)" de RIVAL/VOCÊ no painel NARTVANYR se sobrepunham em 18,8 × 29,6 px, e o nome longo do Patrono próprio invadia o retrato (`dev-qa/narrow-probe-before-fix.log`; o `after-narrow-probe.log` atual é posterior à correção). A correção não mexe no zoom: o bloco `@media(max-width:360px)` de `bridge.css` só ajusta tamanhos.

- Bloco de éter com 74 px, fichas de 12 px e afastamento de 4 px.
- Título NARTVANYR em coluna vertical de 16 px, o que libera duas colunas para RIVAL e VOCÊ. A contagem tem 8 px de CSS (10,6 px na tela) e pode quebrar linha.
- Nome do Patrono com 9,5 px de CSS (12,6 px na tela), `min-width:0` e `overflow-wrap:break-word`.

Resultado em 320 px: o éter ocupa de 3,1 a 100,9 px da tela, o nome termina 8,0 px antes do retrato e não há sobreposição no painel. Em 340 e 360 px o resultado também está correto. A partir de 390 px e no desktop, a regra não se aplica e as medidas não mudaram. A seção 10 de `hybrid11-regressions.mjs` cobre isso em 320, 340, 360, 390 (DPR 1 e 2), 1280×720 e 1920×900. Teste de mutação: com o bloco desativado, a seção falha em 320 px, com o éter em −11,5 px (`prototype-qa/hybrid-11/dev-qa/mutation-narrow/`). Capturas: `after/narrow-panels-*.png` e `after/narrow-band-*.png`.

**Limitações medidas no código final:**

- **Hover no mobile:** a largura é de 1,55× a carta da mão, como no desktop, mas a borda inferior fica a 233,5 px do fim da janela em 390×800 e a 274,5 px em 320×800. Antes, eram 315,5 e 320,6 px. Os 6 px valem para o desktop.
- **Mão rival no desktop:** o recorte adicional de 53–63 px nas alturas ≤ 900 px está descrito acima.

## Verificação (código final, 30/10/2026)

- `node scripts/hybrid11-qa-all.mjs prototype-qa/hybrid-11/after`: 22/22 scripts terminaram com saída 0 (`after-qa.log`, `after/qa-summary.json`, `after/logs/`). Isso inclui `hybrid11-regressions.mjs` com **234 verificações**: 174 anteriores, 18 nas seções 8 e 9 e 42 na seção 10. Sem erros JavaScript ou WebGL.
  - **Seção 8:** compra normal e compra com perfil de abertura pedidas durante `animateOpeningToHand`. A compra fica no estágio `start` até a transferência terminar (≈1,47 s) e só depois executa uma vez até `land`. Ao final, não restam lock, `inert`, `aria-busy`, clones nem cartas pendentes; a transição nativa dos vizinhos termina em ≤ 450 ms. Teste de mutação: com `await opening` trocado por `await false`, equivalente ao booleano sombreado, a seção falha porque a compra começa em 19 ms (`prototype-qa/hybrid-11/dev-qa/mutation-shadow/`). O arquivo foi restaurado byte a byte.
  - **Seção 9:** confirma os tetos mobile × 1,15, o ganho acima do teto anterior e as nove cartas dentro da janela, com os extremos alcançáveis em 390×800, 390×1000, 320×800 e 390×800 com DPR 2 (`after/mobile-hand-*.png`).
- `node scripts/hybrid11-run-suite.mjs after`: **37/40 comandos** passaram. As três falhas de comando são idênticas ao `suite-before.json` em comando, status, contagens e mensagens; só os tempos diferem.
  - `node mesa-nova/test.mjs`: `cartas são reveladas na animação`.
  - `node mesa-nova/test-mesa-layout.mjs`: `globalThis.RunaTargeting?.active is not a function`.
  - O comando de `test:polish` tem 42 casos aprovados e **dois** com falha: `combat schedules hand bonus after lethal clash…` e `…after lethal strike…`.

  A suíte nativa não está toda verde; essas falhas já existiam e não foram tratadas aqui.
- `node scripts/hybrid11-measure.mjs prototype-qa/hybrid-11/after` (completo, sem `quick`) e depois `node scripts/hybrid11-report.mjs`. Esses comandos regeneraram `prototype-qa/hybrid-11/report.json`, `after-measure.log` e `report.log`.
  - Abertura: 2,51 s em 1920×900 e em 1280×720, contra 9,90 e 9,79 s antes (razão de 0,254–0,257). A compra normal seguinte leva 2,00 s. Com movimento reduzido, a abertura leva 1,49 s e a compra, 0,79 s.
  - Reservas: 0 px de deslocamento parado e em 10 renders, em 1920×900, 1280×720 e 390×800.
  - Desempenho com DPR 1 e 2: `hybrid9-performance` passou nos dois.
  - Fallback WebGL: a seção 7 das regressões restaura a apresentação nativa.
- `scripts/hybrid11-flicker-probe.mjs` foi reexecutado em 1920×900 e 1280×720 (`after-probe.log`). Renders sem mudança de quantidade deslocam 0 px. Só a entrada ou saída de uma carta na reserva rival reorganiza a fila, como esperado.
- `node --check` passou em todos os módulos híbridos alterados, em `app.js` e no script de regressões. `git diff --check` também passou sem apontamentos (só avisos de LF/CRLF). Os arquivos novos não rastreados foram conferidos à parte e não têm espaços no fim de linha.
- `prototype-qa/hybrid-11/revision11-{hybrid.diff,hybrid.stat,app.diff}` foram regenerados contra `baseline-source/` por `prototype-qa/hybrid-11/dev-qa/make-revision-diffs.mjs`.
- As expectativas antigas alteradas por pedido estão comentadas nos scripts `hybrid9-{geometry,flights,hands,review,emana,emana-interaction}`.
- Todos os testes rodaram em Chrome headless com viewport e DPR emulados. Nenhum aparelho físico ou toque real foi usado.

---

# RunaMarca híbrido — revisão 9: campo compacto e emanações

Abrir **http://127.0.0.1:3086/runamarca/hybrid/index.html** e usar **Ctrl+F5** (`hybrid-9`). Se necessário, executar `ABRIR-PROTOTIPO.cmd` na raiz e manter o terminal aberto. O servidor foi recuperado após o reinício do PC, restrito a **127.0.0.1:3086**. A revisão 6 continua em `/runamarca/`.

Worktree `C:/Users/vanxf/Documents/Codex/2026-10-28/task-2/runamarca-board-prototype`, branch `prototype/board-perspective-20261028`, base `d1420a66e4bb431c8ceb374cc527b41a3c76506d`. Checkout principal confirmado limpo, mesma base. Sem commit, push ou publicação. Rollback da revisão 8 preservado em **`../revisions/before-hybrid-slice-9/`**, 148 arquivos com SHA256. Histórico anterior abaixo.

## Alterações concluídas

**Teste de diálogo corrigido.** A falha de `test-ui.mjs` vinha do objeto simulado: o código real usa `addEventListener`, `removeEventListener` e evento `close`, mas o stub não implementava esse contrato. O simulador agora mantém listeners, entrega o fechamento e os remove. Asserções verificam seleção, cancelamento pelo menu de contexto, fechamento repetido sem cancelar duas vezes e ausência de listeners órfãos. O teste passou; a bateria nativa selecionada passou com **21 testes, zero falhas**. Nenhuma mudança de regra ou do diálogo de produção foi necessária.

**Câmera:** 22,1253106801° × 0,85 = **18,8065140781°**, proporcional ao ângulo em relação à vista reta. Mantida a câmera suave e a ponte entre superfície 3D e controles nativos.

**Campo e painéis:** cortadas as duas faixas externas do plano de combate, cada uma com 2,8333% da largura calculada (5,6667% no total, no plano 3D). Registro/Nartvanyr e Preparação acompanham a borda menor. No comparativo em 1920×900, os centros moveram-se **37.8 px** e **29.9 px** para a direita, e Preparação **37.3 px** para a esquerda. O print foi descrito pelo parent após inspeção visual autorizada; não alegamos inspeção local desse anexo.

A distribuição agora é **C–E–C–E–C** em cada lado, com as três casas de combate de dimensões iguais no mundo 3D, emanações mais largas e espaçamento simétrico. A largura de cada combate é `(campo − 2 × emanação − 4 × intervalo) / 3`. As bordas correspondentes das três casas de uma mesma fileira têm a mesma medida projetada; caixas retangulares que englobam trapézios podem ter larguras diferentes por causa da perspectiva. Não foram igualadas artificialmente essas bounding boxes.

**Mãos:** fator nominal de **1,25** nas duas dimensões e na porção visível, mantendo o leque aprovado e o recorte intencional. Limites de largura mobile: `(viewport útil − 28) / 2,8` para a aliada e `/ 4,4` para a rival, com nove cartas acessíveis. O ajuste geral de altura/HUD continua responsivo; não se afirma ganho integral de 25% em todo tamanho de janela. A abertura inicial recebe um único ajuste após os observers de layout; não depende de redimensionar manualmente. Em DPR 1/2, abertura direta e após resize diferiram apenas 0,001 na escala. A primeira exibição aguarda esse ajuste; compras/hover não reexecutam a escolha da escala por quantidade de cartas.

Medidas das larguras das cartas e comparação com as capturas da revisão 8, nos mesmos percursos de viewport:

| Viewport CSS | DPR | Aliada / rival | Aumento medido vs. R8 | Documento |
| --- | --- | --- | --- | --- |
| 1920×1080 | 1 | 155.2 / 92.0 px | 25.0% / 25.0% | 1080 px |
| 1920×900 | 1 | 153.9 / 91.2 px | 25.0% / 25.0% | 900 px |
| 1536×740 | 1 | 121.8 / 76.5 px | 23.2% / 23.2% | 740 px |
| 1440×900 | 1 | 153.9 / 91.2 px | 24.6% / 24.6% | 900 px |
| 1280×720 | 1 | 117.0 / 73.4 px | 20.2% / 20.2% | 720 px |
| 390×1000 | 1 | 129.3 / 77.6 px | 17.9% / 25.0% | 1370 px |
| 320×800 | 1 | 104.3 / 66.4 px | 17.9% / 18.2% | 1367 px |
| 1920×900 | 2 | 153.8 / 91.1 px | 42.4% / 42.4% | 900 px |
| 390×800 | 2 | 129.3 / 77.6 px | 17.9% / 25.0% | 1367 px |

O aumento de cerca de 42% no caso DPR 2 inclui a correção da abertura anterior, que havia ficado presa em escala 1,00: a revisão atual estabiliza em cerca de 1,14, além do fator 1,25 da mão. Em 1280×720 o ganho efetivo fica próximo de 20%; mobile reduz o ganho da mão aliada para cerca de 17,9%. Em 1920×900/1080 DPR 1, as duas mãos atingiram 25%. São medidas lineares, não de área. Desktop foi medido sem rolagem vertical; mobile mantém a rolagem intencional.

**Apresentação experimental exclusiva da emanação:** somente ilustração derivada do canvas público original, descrição e vida. Nome, custo e ataque não aparecem no slot. Os dados/controles nativos continuam presentes; a descrição acessível mantém identidade e texto completo e agora anuncia a vida atual. A vida usa 1,5× o tamanho nominal anterior, com piso de 10,5 px para leitura; o aumento observado variou de 1.64× a 5.17× em slots estreitos devido a esse piso.

O texto ocupa área própria sobre a ilustração, com contraste escuro e fonte ajustada para resultar em cerca de 11 px no desktop e 10 px no mobile após a projeção. **Descrições longas não cabem inteiras simultaneamente:** há rolagem dentro do slot, verificada por wheel/toque emulado e posição da última linha. A carta completa original continua disponível no foco/hover, com nome, custo, ataque, moldura e texto intactos. A mão, reserva e zoom não adotam essa face compacta. O experimento exige avaliar a preferência visual; não foi apresentado como solução definitiva para textos longos.

Vida dinâmica, buff, alvo real, menu por clique/teclado e transições nos dois sentidos entre reserva e emanação foram verificados. O arrasto nativo permanece nas suas origens já existentes; a área do texto permite leitura/rolagem sem iniciar arrasto. Em perda de WebGL, faces compactas e clones são removidos e a carta nativa é restaurada. A nova apresentação não consulta estado privado; compõe apenas cartas já aprovadas pelo renderer nativo. Regras, catálogo, `app.js`, motor, bot e módulos de revelação/sigilo permaneceram idênticos ao snapshot da revisão 8.

**Único detalhe decorativo novo:** uma pequena gota de cera junto ao selo existente, apenas acima de 1100 px. Demais objetos foram preservados. A decoração WebGL não captura input.

## QA e evidências

**1182 checagens de navegador aprovadas**, mais oito medições de viewport/estabilidade e duas verificações de abertura direta DPR 1/2. Sem erros JS/WebGL nas baterias finais. O conjunto nativo selecionado teve **21 aprovados, zero falhas**.

| Comando | Resultado |
| --- | --- |
| `node scripts/hybrid9-geometry.mjs` | 91 passaram |
| `node scripts/hybrid9-limits.mjs` | 60 passaram |
| `node scripts/hybrid9-review.mjs` | 35 passaram |
| `node scripts/hybrid9-reveal.mjs` | 17 passaram |
| `node scripts/hybrid9-apprentice.mjs` | 16 passaram |
| `node scripts/hybrid9-hands.mjs` | 693 passaram |
| `node scripts/hybrid9-touch.mjs` | 21 passaram |
| `node scripts/hybrid9-gameplay.cjs` | 40 passaram |
| `node scripts/hybrid9-flights.mjs` | 37 passaram |
| `node scripts/hybrid9-motion.mjs` | 12 passaram |
| `node scripts/hybrid9-sequence.mjs` | 7 passaram |
| `node scripts/hybrid9-emana.mjs` | 129 passaram |
| `node scripts/hybrid9-emana-interaction.mjs` | 24 passaram |
| `node scripts/hybrid9-viewport.cjs` | 8 medições sem deslocamento geral na compra/hover e sem scroll desktop |
| `node scripts/hybrid9-startup.mjs` | abertura direta estabilizada em DPR 1/2 |
| `node scripts/hybrid9-probe.mjs` | 49 quadros sem DOM intermediário não projetado; 25 capturas do compositor |
| `node scripts/hybrid9-performance.mjs 1` e `2` | 20 reconstruções + 20 reamostragens por DPR |
| `node scripts/hybrid9-fog-performance.mjs` | 60 amostras |

Comando nativo: `node --test mesa-nova/test-opening-return.mjs mesa-nova/test-match-effect-cleanup.mjs mesa-nova/test-public-visibility.mjs mesa-nova/test-ui.mjs mesa-nova/test-interactions-audit.mjs mesa-nova/test-visual-ghosts.mjs mesa-nova/test-apprentice-cancel.mjs mesa-nova/test-progressive-reveal.mjs`. Também executado diretamente `node mesa-nova/test-ui.mjs`. Sintaxe dos módulos alterados validada com `node --check`. `npm test` completo não foi executado; o package não define build/lint/typecheck.

CPU de reconstrução/submissão WebGL em Chrome headless, sem cronômetro GPU: DPR 1 mediana **5.4 ms**, p95 **8.3 ms**; DPR 2 mediana **6.7 ms**, p95 **9.8 ms**. Primeira construção observada 252.5/273.6 ms; não é benchmark frio controlado. Fumaça: mediana **1.2 ms**, p95 **1.9 ms**. Testes físicos de Chrome com barras, toque em aparelho real e FPS/GPU não foram executados. 1920×900 é uma área útil CSS representativa de navegador normal em Full HD, a 100%, além de 1920×1080, 1440×900, 1280×720, 390 e 320 emulados.

Resultados/capturas internas: **`prototype-qa/hybrid-9/`**. Logs: **`prototype-qa/hybrid9-*.log`**. Antes preservado das capturas finais verificadas da revisão 8 (`before-*.png`); depois `after-*.png`. Capturas de emanação em duas visões, zoom, hover, revelação e interação foram inspecionadas localmente; nada foi enviado à Library ou a outro serviço. O reinício do PC interrompeu execuções com `ERR_CONNECTION_REFUSED`; o servidor foi recuperado e essas baterias foram reexecutadas. Não há bloqueio de acesso pendente.

## Como testar

Abrir o endereço e Ctrl+F5. Criar sala em duas abas, escolher decks e jogar normalmente. Comparar a câmera e os painéis mais próximos, encher a mão, testar cada hover e o arrasto de formação. Colocar uma criatura em Emanação: observar arte/descrição/vida, rolar o texto, usar foco/hover para a carta integral e clicar para abrir o menu nativo. Usar uma magia de buff em uma criatura na emanação e conferir a vida nas duas visões. A posição oculta do rival continua protegida até sua etapa de revelação.

Arquivos alterados nesta etapa: `mesa-nova/test-ui.mjs`, `mesa-nova/hybrid/bridge.js`, `bridge.css`, `card-plane.js`, `fan-layout.js`, `layout.js`, `index.html`; novo `hybrid/emanation.js`. Guias atualizados e scripts `hybrid9-*` adicionados. Diffstat exato, hashes preservados e estado Git em `prototype-qa/hybrid-9/change-report.json`.

---

# RunaMarca híbrido — revisão 8: sequência e estabilidade

Abrir **http://127.0.0.1:3086/runamarca/hybrid/index.html** e usar **Ctrl+F5** (`hybrid-8`). Reiniciar, se necessário: executar `ABRIR-PROTOTIPO.cmd` na raiz e manter o terminal aberto. O servidor foi confirmado em **127.0.0.1:3086**, PID 2348, HTTP 200. A revisão 6 continua em `/runamarca/`.

Worktree: `C:/Users/vanxf/Documents/Codex/2026-10-28/task-2/runamarca-board-prototype`, branch `prototype/board-perspective-20261028`, base `d1420a66e4bb431c8ceb374cc527b41a3c76506d`. Sem commit, push, publicação ou alteração do checkout principal, confirmado limpo. Rollback desta etapa: **`../revisions/before-hybrid-slice-8/`**, 127 arquivos e manifesto SHA256. O histórico da revisão 7 segue abaixo.

## Implementação e diagnóstico

* **Adquirir Atualização (FL10):** regra real “Conceda +1/+1 a uma criatura aliada.” Não há requisito de rodada na reserva. A busca do alvo escolhia primeiro uma cópia antiga de mulligan invisível (caixa 0×0). A saída do mulligan agora limpa essas cópias, e a busca prefere o nó vivo do jogo. Outro conflito foi reproduzido com clique real: o pointerdown do arrasto cancelava a mira antes do click confirmá-la. Durante uma mira ativa, esse início de arrasto deixa o clique para o seletor de alvos. Nenhuma regra de buff ou elegibilidade foi alterada.
* **Descontinuidade reproduzida:** cinco quadros de DOM sem projeção em 49 amostras de reconstruções repetidas; o screencast mostra encaixes e rótulos transitórios em posições nativas. A reconstrução híbrida agora é atômica com o render nativo. Na amostra final, zero quadros sem projeção em 49 e 28 capturas do compositor. Não apareceu tela de entrada/mulligan nessa reprodução; não há alegação de corrigir toda origem possível de flicker.
* **Compra:** verso parte do deck atual, sobe em 260 ms, vira em 220 ms, mostra a carta completa por 1050 ms e segue à mão em 360 ms. A mão fica inert e bloqueada para comandos de cartas durante a fila; volta ao terminar ou ao interromper. Movimento reduzido mantém leitura de 600 ms e encurta deslocamentos. O rival recebe apenas um verso. Cancelamento, perda de foco, redimensionamento e interrupção antes/durante a transferência inicial foram testados.
* **Mulligan/colocação:** destinos são medidos após o layout e a projeção atuais, sem fallback em coordenadas zero. Devolução usa o deck observado; confirmação envia as cinco cartas à mão. Transferências interpolam as quatro esquinas da geometria antiga/nova. Vizinhos da mão/reserva movem-se suavemente por 240–300 ms, conservando os controles nativos. A sequência real com duas sessões locais passou.
* **Perspectiva:** 26,0297772707° × 0,85 = **22,1253106801°**. Magias colocadas e seus versos ocultos agora usam a mesma projeção da superfície; emanações, cartas, decks, painéis e fumaça recalculam a câmera comum. Não houve substituição de identidade, arte, título, moldura, custo ou regras das cartas.
* **Espaços:** conforme esclarecimento do usuário, não foi adicionado zoom. Os intervalos configuráveis positivos foram multiplicados por 0,85: margem superior da reserva 18→15,3 px, margem da arena 1→0,85 px, padding vertical 4/6→3,4/5,1 px e afastamentos laterais/registro 4/1→3,4/0,85 antes da escala. Distâncias visuais finais também dependem da perspectiva, escala responsiva e hitboxes; não se afirma redução exata de 15% de todo vão na tela. Intervalos já nulos permanecem nulos.
* **Recorte da mão:** recuperados 25% da altura nominal antes oculta, `visível = visível_anterior + 0,25 × (altura − visível_anterior)`, nos dois lados. O centro sem giro segue essa proporção; nas pontas giradas, a porção visível varia com ângulo e curvatura. Nove cartas permanecem alcançáveis e o hover conserva a carta integral.
* **Única decoração nova:** pequena **arruela de bronze junto ao parafuso**, apenas quando há espaço (>1100 px), sem capturar input. Selo, folha, parafuso, marcador, livros e vela anteriores foram mantidos.

## Viewport e desempenho medidos

Viewport CSS, zoom 100%, DPR 1; 1920×900 representa área útil de navegador normal num monitor Full HD. Headless não mede a altura real das barras instaladas no navegador do usuário. Também houve testes DPR 2 e mobile. O ajuste ignora a altura transitória do DOM de combate antes da projeção e valida o fluxo/HUD; o documento final foi medido sem rolagem desktop. Mobile mantém rolagem vertical intencional.

| Viewport | Escala herdada efetiva | Documento final |
| --- | --- | --- |
| 1920×1080 | 1.150 | 1080 px |
| 1920×900 | 1.140 | 900 px |
| 1536×740 | 1.150 | 740 px |
| 1440×900 | 1.144 | 900 px |
| 1280×720 | 1.131 | 720 px |
| 390×1000 | 1.150 | 1367 px |

Não houve novo aumento de 15%: a escala herdada máxima continua 1,15 e se adapta ao envelope da mão/HUD. A geometria do campo mantém dimensões próprias, sem crescimento uniforme de todos os objetos.

CPU de reconstrução/submissão WebGL em Chrome headless: DPR 1 mediana **6.5 ms**, p95 **12.8 ms**; DPR 2 mediana **7.1 ms**, p95 **11.3 ms**. Primeiras construções observadas: 559.6/43.4 ms. Essa amostra inclui aquecimento e não é benchmark frio controlado. Fumaça: mediana 1.7 ms, p95 2.5 ms. Não foram medidos FPS/GPU em janela física.

## Verificações e evidências

**1029 checagens de navegador aprovadas**, mais oito medições de estabilidade/viewport. Sem erro JS/WebGL nas baterias finais. Logs `prototype-qa/hybrid8-*.log`, resultados/capturas internas `prototype-qa/hybrid-8/`.

| Comando | Resultado |
| --- | --- |
| `node scripts/hybrid8-geometry.mjs` | 91 passaram |
| `node scripts/hybrid8-limits.mjs` | 60 passaram |
| `node scripts/hybrid8-review.mjs` | 35 passaram |
| `node scripts/hybrid8-reveal.mjs` | 17 passaram |
| `node scripts/hybrid8-apprentice.mjs` | 16 passaram |
| `node scripts/hybrid8-hands.mjs` | 693 passaram |
| `node scripts/hybrid8-touch.mjs` | 21 passaram |
| `node scripts/hybrid8-gameplay.cjs` | 40 passaram |
| `node scripts/hybrid8-flights.mjs` | 37 passaram |
| `node scripts/hybrid8-motion.mjs` | 12 passaram |
| `node scripts/hybrid8-sequence.mjs` | 7 passaram |
| `node scripts/hybrid8-viewport.cjs` | 8 medições: sem scroll desktop e sem deslocamento do campo no hover/compra |
| `node scripts/hybrid8-probe.mjs` | alvo antigo/novo válidos; zero quadro sem projeção na amostra final |
| `node scripts/hybrid8-performance.mjs 1` e `2` | 20 reconstruções + 20 reamostragens por DPR |
| `node scripts/hybrid8-fog-performance.mjs` | 60 amostras |

Regressão nativa: `node --test mesa-nova/test-opening-return.mjs mesa-nova/test-match-effect-cleanup.mjs mesa-nova/test-public-visibility.mjs mesa-nova/test-ui.mjs mesa-nova/test-interactions-audit.mjs mesa-nova/test-visual-ghosts.mjs`: **13 passaram, 1 falhou**. Falha em `test-ui.mjs`: `TypeError: dialog.addEventListener is not a function`, no stub do diálogo. A mesma falha foi confirmada executando o teste contra o `app.js` do snapshot anterior (log `hybrid8-native-ui-baseline.log`). Não foi mascarada nem alterada. Os cliques de mira/transferências equivalentes passaram no navegador. `node --test mesa-nova/test-apprentice-cancel.mjs mesa-nova/test-progressive-reveal.mjs`: **7 passaram, 0 falharam**. Sintaxe dos módulos JS da fatia validada com `node --check`. Não foi executado `npm test` completo; não há scripts de build/lint/typecheck nesse package.

Capturas inspecionadas: `final-1920x900.png`, `final-1920x1080.png`, `fan-hover-1280x720-dpr1-4.png`, `draw-read-1920x900.png`, `draw-read-390x800.png`, `spell-perspective-a.png`, `reveal-stage-1.png`, `sequence-after-confirm.png`, `baseline-frame-01.png` e `atomic/baseline-frame-01.png`. As capturas permanecem locais; nada foi salvo na Library. Comparativo com a revisão anterior em `prototype-qa/hybrid-7/hands-after-*.png`; diagnóstico antes/depois da falha nesta pasta.

O vídeo foi analisado pelo parent em ambiente autorizado e transmitido por descrição temporal: compra com verso, virada, leitura ampliada e chegada à mão; hover conserva o restante do leque. O trecho de arrasto termina antes da soltura; não foi usado como prova da animação final de colocação. Não se copiou asset nem se atribuiu implementação interna ao Hearthstone.

## Como testar

1. Abrir o endereço e Ctrl+F5. Criar sala local e entrar na segunda aba pelo código.
2. Escolher decks, trocar duas cartas e confirmar: observar ida ao deck, leitura e chegada na grade/mão. O relógio continua sendo o do jogo.
3. Comprar nas rodadas seguintes: a mão fica brevemente bloqueada, depois volta a responder. Testar sair/voltar da aba durante a animação.
4. Com Adquirir Atualização na mão, selecionar criatura antiga da reserva pela seta. A magia deve conceder +1/+1; Esc cancela a mira antes do comando.
5. Testar nove cartas/hover, colocar criatura na reserva e arrastar na formação. Conferir a segunda visão sem acesso à mão ou às posições futuras do rival.

## Arquivos desta etapa

Código existente alterado: `mesa-nova/app.js`, `mesa-nova/hybrid/bridge.js`, `bridge.css`, `card-plane.js`, `fan-layout.js`, `layout.js`, `index.html`. Novos: `hybrid/lifecycle.js`, `hybrid/flights.js`, `hybrid/visuals.js`. Documentação atualizada: este guia e `PROTOTIPO-LOCAL.md`. Scripts `scripts/hybrid8-*` e evidências locais adicionados. Diffstat exato relativo à revisão 7 em `prototype-qa/hybrid-8/change-report.json`.

Motor, regras, catálogo e módulos de sigilo/revelação não mudaram nesta revisão. A reprodução é local com servidor de teste; jogo hospedado, latência de internet, Chrome visível, GPU/FPS e vídeo completo não foram verificados nesta etapa. Não há bloqueio de acesso pendente.

---

# RunaMarca híbrido — revisão 7: mãos nas bordas e câmera mais reta

Abrir **http://127.0.0.1:3086/runamarca/hybrid/index.html** e usar **Ctrl+F5** (`hybrid-7`). Se o servidor estiver parado, executar `ABRIR-PROTOTIPO.cmd` na raiz e manter o terminal aberto. Servidor exclusivamente local, porta 3086 em 127.0.0.1. Sem commit ou publicação. Branch `prototype/board-perspective-20261028`, base `d1420a66e4bb431c8ceb374cc527b41a3c76506d`.

Rollback preservado em `../revisions/before-hybrid-slice-7/` (revisão 6, 113 arquivos) e `../revisions/before-hybrid-7-hands/` (etapa somente câmera, 121 arquivos), ambos com SHA256. O checkout principal permaneceu limpo.

## Resultado visual e interação

Mão aliada em leque, com o centro mais alto, laterais girando para fora e apenas a parte superior das cartas entrando na arena pela borda inferior. Mão rival com o arco invertido: centro mais baixo, extremidades mais altas e versos saindo da borda superior. O recorte é deliberado e externo à mão. As nove cartas conservam partes acessíveis; não houve recorte dos arquivos de arte ou redesenho da carta.

As mãos usam os próprios botões, UIDs e handlers nativos. A ordem continua controlada pelo jogo, inclusive na reorganização por arrasto. O leque não reposiciona o tabuleiro ao comprar ou fazer hover. O hover mantém a origem reconhecível e estável, amplia a carta completa acima da mão e aplica contorno verde. No mobile, a carta ampliada e os textos de apoio são organizados verticalmente e o conjunto é dimensionado para caber; não há corte de título, custo ou regras da carta. O toque continua abrindo o menu nativo de colocação, com cancelamento sem comando de jogo. Não foi criada uma mecânica nova de toque.

Os versos rivais continuam sem faces, nomes ou canvas de cartas. O módulo de leque lê somente a apresentação já existente no DOM e não acessa estado privado ou API. A própria imagem original completa continua em 900×1260 na mão; o combate/reserva e o renderizador nativo permanecem preservados.

A câmera suave foi reduzida proporcionalmente em 15%: **30,6232673773° × 0,85 = 26,0297772707°**, em relação à vista perpendicular. Mesa, cartas, decks, placas, fumaça e coordenadas de interação são recalculados pelo sistema comum de projeção.

O único novo elemento decorativo é **um pequeno selo de cera junto à vela**, em viewports acima de 1100 px. Livro, vela, marcador, parafuso e folha da revisão anterior foram conservados. O selo é geometria sem captura de input. Também foi corrigida uma faixa transparente do menu que interceptava o deck superior, preservando os controles do menu.

## Recorte intencional e limites responsivos

As guardas agora verificam HUD, controles e altura real do documento, aceitando as partes da mão que ficam fora da viewport. O recorte deixa de reduzir artificialmente todo o conteúdo para 4,6%. A escala máxima continua em 15%; uma margem para a prateleira evita rolagem involuntária. Escalas efetivas registradas no ensaio das mãos:

| Viewport CSS | DPR | Escala linear do conteúdo | Altura do documento |
| --- | --- | --- | --- |
| 1920×1080 | 1 | 15.0% | 1080 px |
| 1920×900 | 1 | 13.8% | 900 px |
| 1536×740 | 1 | 15.0% | 740 px |
| 1440×900 | 1 | 14.2% | 900 px |
| 1280×720 | 1 | 12.8% | 720 px |
| 390×1000 | 1 | 15.0% | 1363 px |
| 320×800 | 1 | 15.0% | 1360 px |
| 1920×900 | 2 | 15.0% | 900 px |
| 390×800 | 2 | 15.0% | 1360 px |

Essas são medidas da execução, não promessa de escala idêntica em toda sequência de redimensionamento. A altura efetiva e o ajuste da prateleira participam do cálculo; compra e hover mantêm a geometria estável. Em 1920×900 houve 13,8% no percurso de redimensionamento DPR 1 e 15% na abertura DPR 2. As caixas projetadas não crescem uniformemente, e a largura mobile continua limitada à tela. No mobile, o campo usa rolagem vertical, a mão aliada permanece junto à borda inferior e a rival acompanha a saída do topo ao rolar. O patrono e os controles inferiores podem ser trazidos acima do leque pela rolagem.

As cinco referências desta etapa foram inspecionadas em pixels pelo parent em outro ambiente autorizado e transmitidas por briefing visual fiel, posteriormente autorizado como base da implementação. A leitura local da Library forneceu ponteiros/OCR; a materialização falhou no Windows antes da instalação do primeiro arquivo por `os.setxattr` indisponível. Não alegamos inspeção local desses cinco arquivos nem contornamos a falha. As capturas do próprio protótipo foram geradas e inspecionadas localmente.

## Validação final

**981 verificações/medições, zero falhas finais e nenhum erro JS/WebGL registrado.** Evidências em `prototype-qa/hybrid-7/`, logs em `prototype-qa/hybrid7-*.log`.

| Comando | Resultado |
| --- | --- |
| `node scripts/hybrid7-hands.mjs` | 693: mãos 0/1/2/5/9, nove hovers individuais, identidade integral, teclado, arrasto da origem recortada/cancelamento, mobile e DPR 2 |
| `node scripts/hybrid7-touch.mjs` | 21: toque em emulação mobile 320/390, menus e cancelamento sem comandos |
| `node scripts/hybrid7-geometry.mjs` | 91: câmera, projeção, hitboxes, DPR 2, clones e fallback WebGL |
| `node scripts/hybrid7-limits.mjs` | 60: dez posições ocupadas, ausência de colisões e nove alvos |
| `node scripts/hybrid7-review.mjs` | 35: reservas, decks/menu, placas, fumaça e decoração |
| `node scripts/hybrid7-reveal.mjs` | 17: quadros de revelação progressiva e segredo nas duas perspectivas |
| `node scripts/hybrid7-gameplay.cjs` | 40: HTTP real, compra, menu, arrasto interrompido/repetido e retorno |
| `node scripts/hybrid7-apprentice.mjs` | 16: mira, cancelamento, confirmação, recarga e duas visões |
| `node scripts/hybrid7-viewport.cjs` | 8 medições: compra e hover sem reorganização geral ou rolagem desktop |
| `node scripts/hybrid7-performance.mjs 1` e `2` | 20 reconstruções e 20 reamostragens por DPR |
| `node scripts/hybrid7-fog-performance.mjs` | 60 amostras isoladas |

Na preparação inicial de uma execução HTTP não havia criatura adequada na mão aleatória. O teste passou a usar a troca inicial legal quando necessário; a repetição final passou. O registro anterior está preservado em `gameplay-setup-failed.json`. A QA também encontrou e corrigiu a interceptação transparente do deck e o pixel extra de rolagem em um cenário 720p. Os resultados finais substituem os ensaios intermediários que falharam.

CPU quente do bridge: medianas **6.2/5.7 ms**, p95 **8.4/8.3 ms** em DPR 1/2. Reamostragem da mão: medianas **1.4/1.2 ms**. Fumaça isolada: mediana **1.0 ms**, p95 **1.5 ms**. A primeira amostra observada chegou a **542.9 ms** em DPR 2; não é um ensaio controlado de partida fria e não foi descartada. Não se mede FPS físico ou tempo GPU por esses números.

Capturas úteis: `hands-before-1920x900.png` / `hands-after-1920x900.png`, `fan-nine-1920x900-dpr1.png`, `fan-hover-1920x900-dpr1-4.png`, `fan-hover-320x800-dpr1-8.png`, `fan-mobile-scrolled-390x800-dpr1.png`, `touch-390.png`, capturas privadas A/B e `reveal-*`. A geometria cobre também 1280×720, 1440×900, 1536×740, 1920×1080 e 320 px; o teste das mãos inclui DPR 2 e emulação de toque.

Limites: QA headless em CSS pixels, sem medir barras físicas de uma janela nativa, aparelho móvel real ou FPS de hardware. Textos muito extensos podem reduzir o conjunto de hover para caber. As faces continuam DOM sobre geometria WebGL. Não foi executado o pacote npm completo, nem rede pública; o pacote não possui scripts de build/lint/typecheck. Não houve alteração de regras, instalação de dependências ou envio de dados a terceiros. Nenhuma captura foi salva na Library.

---

## Histórico — revisão 6

# RunaMarca híbrido — revisão 6, apresentação das cartas e escala responsiva

Abrir **http://127.0.0.1:3086/runamarca/hybrid/index.html** e atualizar com **Ctrl+F5**. O HTML identifica `hybrid-6`. Servidor local na porta 3086, vinculado somente a 127.0.0.1. Se ele estiver parado, executar `ABRIR-PROTOTIPO.cmd` na raiz e manter esse terminal aberto. Não executar outro servidor na mesma porta.

Trabalho em `prototype/board-perspective-20261028`, base `d1420a66e4bb431c8ceb374cc527b41a3c76506d`. Nenhum commit ou publicação. A revisão 5 foi preservada em `../revisions/before-hybrid-slice-6/`: 99 arquivos e manifesto SHA256. O checkout principal permaneceu limpo na conferência final, sem edição.

## Cartas preservadas e projeção corrigida

As cartas conservam integralmente arte, moldura, títulos, regras, custo, ícones de estado, SVG de atributos e coração líquido nativos. Nenhum asset ou renderizador original foi substituído. As fontes continuam 900×1260 na mão/emanação e 900×820 no combate/reserva; a ilustração FV03 continua em 736×575. Não há recuperação artificial de detalhe nem novos rótulos. Textos extensos em miniaturas continuam pequenos e podem ser lidos pelo hover original.

Além da filtragem da mão existente na revisão 5, as faces da mesa agora usam uma amostra integral com suavização alta e densidade 2×DPR calculada pelo tamanho projetado. O bitmap de cada amostra é comparado à redução integral do canvas nativo. Isso confirma fidelidade do conteúdo; não é uma medição de ganho subjetivo de nitidez. O enquadramento visual usa a proporção do canvas e unidades CSS nativas, mantendo o tamanho dos ícones adicionais. Arte, atributos e ícones seguem a mesma transformação.

O hover genérico de `.card`, que deslocava a carta de mesa em 4 px independentemente de seu corpo 3D, foi neutralizado apenas nas faces da mesa híbrida. As animações nativas continuam. Cópias que passam à camada de efeitos compensam o zoom do grupo e preservam a geometria projetada. O hover da mão mantém a origem reconhecível no mesmo retângulo e exibe o zoom separado. Os nove alvos foram exercitados individualmente.

Reserva e combate conservam proporções físicas comuns entre os lados no desktop; a distância reduz naturalmente o lado rival. Emanações mantêm a face completa original, com sua proporção de retrato. Em telas móveis, a largura do combate é limitada pelo intervalo disponível entre emanações: a ampliação de 15% não é aplicada a essas faces quando causaria sobreposição. Os botões nativos e seus eventos permanecem.

## Ampliação realmente medida em relação à revisão 5

A meta de 15% incide no conteúdo de jogo, não na decoração. O ajuste escolhe uma escala estável por viewport e reserva margem para nove cartas nas duas mãos. Comprar ou fazer hover não recalcula essa escala. O espaço interno vazio da arena foi reduzido em 20 px; a altura física do campo central foi mantida para caber no navegador. Por isso não se trata de aumentar cada dimensão de todo o layout em 15%.

| Viewport CSS, zoom 100% | Escala de conteúdo (mão/patronos/cartas e fontes dos controles) | Área projetada do feltro |
| --- | --- | --- |
| 1920×1080 | +15,00% | +15,00% |
| 1920×900 | +4,60% | +15,00% |
| 1536×740 | +7,90% | +3,99% |
| 1440×900 | +5,00% | +0,00% |
| 1280×720 | +3,80% | +0,00% |
| 390×1000 | +15,00% | +12,74% |

Em 1920×1080 o conteúdo recebe os 15%. Em uma viewport de **1920×900**, que deixa altura para barras de um navegador normal em monitor Full HD, o conteúdo fica em **+4,6%** e o campo em **+15% de área**. Aumentar integralmente os grupos em 15% cortaria cartas; a limitação é explícita. Em 1440×900 e 1280×720, a largura do campo já está restrita pela tela. Pequenas diferenças da tabela são arredondamento da projeção.

As medidas acima descrevem conteúdo e campo, não todos os retângulos externos. A largura da reserva e dos patronos acompanha a escala em desktop; as prateleiras foram compactadas verticalmente. Nartvanyr, registro e preparação têm largura responsiva. Seus textos recebem a escala, mas os limites das placas seguem a perspectiva e o espaço disponível: não se alega +15% uniforme dessas caixas. As razões exatas de cada retângulo estão em `slice.json`, inclusive os limites mobile. No mobile, patronos/reservas permanecem limitados à largura; a mão cresce 15%, o campo cresce cerca de 12,74% em área e a página usa rolagem vertical.

A câmera suave permanece em **30,623267°** em relação à normal da mesa. Livros, vela, marcador e parafuso conservam posição e dimensões da revisão 5. O único elemento novo é **uma folha seca discreta ao lado dos livros**, somente onde há espaço, acima de 1100 px; não recebe input nem cria mecânica.

## Testes e evidências desta revisão

Capturas, JSON e logs em `prototype-qa/hybrid-6/` e `prototype-qa/hybrid6-*.log`. Chrome headless local, recursos externos bloqueados nas execuções visuais, sem usar a janela bloqueada ou mouse do usuário.

| Comando | Resultado |
| --- | --- |
| `node scripts/hybrid6-geometry.mjs` | 85 verificações: projeção, centros, hitboxes, clone, DPR 2 e fallback |
| `node scripts/hybrid6-concept.mjs` | 75: éter, 2 poderes, C–E–C–E–C, mãos 9 e reserva 8 |
| `node scripts/hybrid6-slice.mjs` | 113: escala, identidade integral, hover, sigilo e duas perspectivas |
| `node scripts/hybrid6-limits.mjs` | 60: 10 posições ocupadas sem colisão e hover individual nas nove cartas, desktop/720p/mobile |
| `node scripts/hybrid6-review.mjs` | 35: placas, decks, fumaça, espaçamento e decoração |
| `node scripts/hybrid6-reveal.mjs` | 17: revelação progressiva e ausência de faces futuras nas duas visões |
| `node scripts/hybrid6-gameplay.cjs` | 40: HTTP real, compra, clique, arrasto interrompido/repetido, retorno e sigilo |
| `node scripts/hybrid6-apprentice.mjs` | 16: mira, cancelamento, confirmação e recarga nas duas perspectivas |
| `node scripts/hybrid6-viewport.cjs` | 8 medições: compra/hover estáveis em seis rodadas e alturas 960/1000 |
| `node --test mesa-nova/test-public-visibility.mjs mesa-nova/test-progressive-reveal.mjs mesa-nova/test-apprentice-cancel.mjs` | 8 subtestes, 0 falhas |
| `node scripts/hybrid6-performance.mjs 1` e `2` | 20 reconstruções e 20 reamostragens por DPR |
| `node scripts/hybrid6-fog-performance.mjs` | 60 amostras isoladas de fumaça |

Foram corrigidos os problemas recuperáveis encontrados nos ensaios: badge CSS reduzido indevidamente durante o primeiro ajuste da face, coração tocando o título da reserva, corte da mão rival no topo e colisão combate/emanação no mobile. Os arquivos de resultado final substituem as rodadas intermediárias que falharam. Não houve alteração de regras nesta iteração.

Tempos CPU quentes do bridge: DPR 1 mediana **5,80 ms**, p95 **8,70 ms**; DPR 2 mediana **5,70 ms**, p95 **8,60 ms**. Reamostragem da mão: medianas **1,20/1,40 ms**. As amostras iniciais não são um benchmark de partida fria. FPS físico, tempo GPU e uso de memória de vídeo não foram medidos.

Comparativos: `before-1920x900.png` / `after-1920x900.png`, `after-1920x1080.png`, `native-hover-1920x900-dpr1.png`, `occupied-public-dpr2.png`, `limits-occupied-390.png`, capturas privadas A/B e quadros `reveal-*`. As telas de 1920×900/1080, 1536×740, 1440×900, 1280×720 e 390×1000 foram medidas; a geometria cobre também 320 px e DPR 2. As capturas selecionadas foram inspecionadas visualmente, não apenas geradas.

Limites: navegador headless em CSS pixels, não inspeção das barras reais de uma janela nativa nem aparelho móvel físico. As faces continuam DOM projetado sobre corpos WebGL: suas cores não recebem toda a iluminação do material 3D. Textos longos ainda exigem zoom para leitura confortável. Não foram executados o pacote npm completo nem ensaios de rede pública; não existem scripts de build/lint/typecheck neste pacote. Foram usados os testes de regressão e motor relevantes listados acima. Nenhum dado ou imagem foi enviado à Anthropic e nenhuma captura foi salva na Library.

---

## Histórico preservado — revisão 5

# RunaMarca híbrido — revisão 5, cartas integrais e área ampliada

Abrir **http://127.0.0.1:3086/runamarca/hybrid/index.html** e recarregar (`hybrid-5`). Revisão local, câmera suave de **30,623267°** preservada. Sem publicação. Antes da edição foram preservados **84 arquivos com SHA256** em `../revisions/before-hybrid-slice-5/`, além das evidências anteriores.

## Identidade das cartas restaurada

A composição simplificada da revisão 4 foi removida. Não há títulos alternativos, caixas de regras ou atributos substitutos. Voltaram a moldura, arte, título, custo, texto completo, SVG de atributos e coração líquido originais. O `cardEl` nativo não é mais interceptado. A verificação compara o bitmap de cada amostra com a reamostragem integral do canvas original, sem recorte, e confirma que os SVG/canvases vivos permanecem visíveis.

O canvas de origem continua em **900×1260** na mão e **900×820** no combate/reserva. Fontes visuais diagnosticadas: criatura 736×575 (`art/virelion/FV03.jpg`), magia 1199×898 e arma 1448×1086. Nenhuma imagem original foi substituída, redesenhada ou enviada a serviço externo. Há apenas o FV03.jpg correspondente no inventário Git; não foi inventada uma versão com mais detalhe.

Os desenhos nativos usam suavização alta onde passam pelos renderizadores de cartas, e a face completa da mão é pré-filtrada com `imageSmoothingQuality=high`, em **2×DPR, limitado a 4×**. É a mesma composição integral, sem nova miniatura editorial. A ampliação e o detalhe continuam usando a carta original; hover mantém a origem reconhecível e no mesmo retângulo, sem cobri-la com o zoom.

Comparação controlada em três cartas (criatura, magia e arma), 108×152 CSS px: referência nativa em DPR 2, reduzida por Lanczos; recorte interno idêntico para cálculo. MSE médio: renderização CSS nativa **574,55**; amostra 1× **85,64**; amostra 2× **47,33**; amostra 4× **221,17**. A opção 2× foi mantida por ter o menor erro nesse ensaio. Isso mede consistência da rasterização nessa configuração, não recuperação de detalhe nem garantia universal de nitidez. Regras extensas continuam fisicamente pequenas na mão e são lidas pelo zoom; seu texto não foi truncado nem reescrito.

Evidências: `quality-inputs.json`, `quality-metrics.json` e quinze imagens `quality-*`. O comparativo usa o mesmo bitmap/layout em todas as opções. O texto de uma carta nativa não foi aumentado artificialmente para produzir uma nova identidade.

## Área e intervalos medidos

Em **1920×900 e 1920×1080**, a área projetada do feltro cresceu **25,0434%**. A área CSS passou de 936×240 para aproximadamente 1170,4×240 px. O aumento foi concentrado na largura para manter mãos, reservas, patronos e controles dentro da viewport de 900 px de altura. Isso é aumento de área, não de 25% em cada dimensão.

Os ensaios de capacidade registram as alternativas. Aumentar cada dimensão em 25% exigiria cerca de 943 px de altura no cenário de 1920×900; a mão seria cortada. A alternativa com mais altura deixava a mão em aproximadamente 899,8 px, sem margem para o brilho. A variante entregue preservou margem inferior e não criou rolagem vertical. Em 1280×720, o ganho de área ficou limitado a **4,6374%**; no mobile a área anterior foi mantida. Não se alega atingir 25% em janelas sem espaço suficiente.

Nartvanyr e ações foram montados em coordenadas da superfície, ao lado da borda externa da mesa. Os intervalos laterais ficaram em **10%** dos anteriores. O intervalo entre registro e Nartvanyr ficou em aproximadamente **11,4–11,7%** em Full HD. Em 720p foi corrigida uma sobreposição anterior, com uma separação mínima positiva. Os botões internos do Nartvanyr também foram ajustados para caber na placa curta, conservando alvos de pelo menos 42 px projetados. O registro aberto mantém o comportamento anterior de leitura.

Medidas comparativas e capturas estão em `before-layout.json`, `after-layout.json`, `capacity-trials.json` e `before-*` / `after-*`. As dimensões do feltro projetado e os intervalos são calculados com a mesma câmera e verificados nas capturas reais.

## Profundidade, fumaça e objetos

Cartas equivalentes de combate e reserva, dos dois lados, passaram a compartilhar dimensões físicas por papel em desktop, em vez de compensar a distância com dimensões de mundo diferentes. A proporção física usa o próprio canvas (900/820 para as faces de mesa), sem compressão adicional arbitrária. A carta distante fica menor pela perspectiva. O tamanho de combate é limitado pela profundidade da casa para não cruzar emanações ou a linha central; não se alega crescimento linear de 25% das cartas. Faces, atributos e arte são projetados juntos; os botões/UIDs e handlers originais continuam.

Os corpos geométricos seguem a iluminação e as sombras do renderizador. As ilustrações continuam como DOM projetado, com cores nativas; não são materiais PBR recebendo toda a iluminação da cena. Em mobile, o ajuste privilegia os espaços e a legibilidade da composição empilhada, sem impor a mesma escala física a elementos separados pela rolagem.

A fumaça cresceu **10% em largura e profundidade físicas** (aproximadamente 21% em área), conservando bordas suaves e máscaras das emanações. Sua geometria não altera hitboxes de combate. Casas ainda não liberadas continuam sem faces no DOM, e a revelação permanece controlada pelos estágios públicos do jogo.

Livro, vela e parafuso foram aproximados **15% do centro da viewport**, medidos pelos pontos de apoio na mesa. A luz acompanha a vela. O parafuso aprovado e o marcador anterior foram preservados; nenhum novo objeto decorativo ou mecânica foi acrescentado nesta correção.

## Validação

Comandos a partir da raiz, usando o Node 24 e o Python já disponíveis. Evidências em `prototype-qa/hybrid-5/`:

| Comando | Resultado final |
| --- | --- |
| `node scripts/hybrid5-gameplay.cjs` | 40 passaram; 0 erros JS |
| `node scripts/hybrid5-concept.mjs` | 75 passaram; 0 erros JS |
| `node scripts/hybrid5-geometry.mjs` | 85 passaram; 0 erros JS/WebGL |
| `node scripts/hybrid5-slice.mjs` | 87 passaram; 0 erros JS |
| `node scripts/hybrid5-review.mjs` | 35 passaram; 0 erros JS |
| `node scripts/hybrid5-apprentice.mjs` | 16 passaram; 0 erros JS |
| `node scripts/hybrid5-reveal.mjs` | 17 passaram; 0 erros JS |
| `node scripts/hybrid5-viewport.cjs` | 8 medições aprovadas |
| `node scripts/hybrid5-quality.mjs` + `python scripts/hybrid5-quality-metrics.py` | 15 capturas e comparação de 4 amostragens |
| `node scripts/hybrid5-capacity.mjs` | 9 ensaios de encaixe; conflitos registrados |
| `node scripts/hybrid5-performance.mjs` | 20 reconstruções + 20 reamostragens medidas |
| `node scripts/hybrid5-fog-performance.mjs` | 60 amostras de fumaça em navegador isolado |

**363 verificações/medições funcionais aprovadas**, sem falhas finais. Os logs homônimos e JSON preservam os detalhes. O teste de fumaça compara seu progresso efetivamente observado no quadro, evitando confundir tempo decorrido durante pintura com o instante solicitado pela fixture. Falhas intermediárias de encaixe do Nartvanyr foram corrigidas e passaram a ter verificação explícita de contenção e tamanho de alvo.

Foram exercitados nove cards nas mãos, máximo de oito criaturas incluindo três em combate, duas perspectivas, cada estágio de revelação, hover com origem estável, clones e seus canvases, cantos clicáveis, arrasto interrompido/repetido, mira/cancelamento da Aprendiz, recarga, fallback WebGL, DPR 1/2 e viewport sem overflow horizontal. Viewports: 1280×720, 1440×900, 1920×900, 1920×1080, 390×1000 e 320×1000; desktop sem rolagem vertical. Mobile mantém rolagem. Capturas representativas foram inspecionadas em pixels.

CPU em Chrome headless isolado: reconstrução aquecida mediana **7,2 ms**, p95/máximo **9,4 ms**; reamostrar as nove faces completas mediana **1,5 ms**, p95/máximo **5,1 ms**. Fumaça aquecida: mediana **1,2 ms**, p95 **1,5 ms**, máximo **1,9 ms**. A primeira amostra de bridge foi coletada quando já havia duas montagens; os 15,5 ms registrados não são um cold start e não sustentam comparação de inicialização. Não houve medição de GPU física ou promessa de FPS. Amostras de fumaça sob testes concorrentes foram preservadas no review, mas o benchmark informado aqui é o ensaio isolado.

`node --check` nos módulos e `git diff --check` aprovados; só houve aviso anterior de LF/CRLF em `app.js`. Não existem comandos de build/lint/typecheck configurados. A suíte integral não foi repetida; motor, servidor, bot, dados e revisão 6 foram preservados.

## Claude local e limites

Foi encontrado `claude.exe`, **Claude Code 2.1.302**. Foram executados apenas `claude --version` e `claude --help`, sem prompt de modelo. O help não comprovou uma entrada nativa de vídeo. A [documentação oficial de visão](https://platform.claude.com/docs/en/build-with-claude/vision) descreve JPEG, PNG, GIF e WebP; animações usam somente o primeiro quadro. Instalar o CLI não equivale a ter um modelo visual offline. Não foi demonstrada análise direta de vídeo, nem enviado vídeo, frame, código ou arquivo à Anthropic. Eventual análise de frames enviados exigiria a autorização específica solicitada pelo usuário. Evidência em `claude-capability.json`.

O QA usa Chrome headless com zoom padrão 100% e viewport controlada de 1920×900 reservando 180 px de um monitor Full HD. Não mede as barras pessoais do navegador, escala real do Windows ou telefone físico. Não houve acesso à janela bloqueada, download/instalação adicional, nova imagem, max/ultra ou publicação.

## Abrir e reverter

Worktree `C:/Users/vanxf/Documents/Codex/2026-10-28/task-2/runamarca-board-prototype`, branch `prototype/board-perspective-20261028`, base `d1420a66e4bb431c8ceb374cc527b41a3c76506d`. Para iniciar o servidor local, executar `ABRIR-PROTOTIPO.cmd` ou, da raiz:

```powershell
& 'C:\Users\vanxf\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' ..\start-prototype-detached.py
```

O iniciador verifica a porta antes de criar outro processo; salas temporárias são perdidas ao reiniciar o PC. Para voltar à revisão 4 inteira, restaurar os arquivos híbridos do snapshot `before-hybrid-slice-5`; para consultar a identidade anterior à simplificação, há também o snapshot `before-hybrid-slice-4`. Não usar reset/clean sobre trabalho anterior não commitado.

Inventário desta alteração, hashes e diffstat ficam em `changed-files.json`, `final-files.json` e `diffstat.txt` na pasta de evidências. Sem commit, push, PR, merge, deploy ou mudança no checkout principal.

---

## Histórico preservado — revisão 4 (composição simplificada posteriormente rejeitada)

# RunaMarca híbrido — revisão 4, inclinação e leitura da mão

Abrir **http://127.0.0.1:3086/runamarca/hybrid/index.html** e recarregar. Recursos `hybrid-4`, câmera suave única. Sem publicação. A revisão 6 continua em `/runamarca/`; a híbrida 3 está preservada em `../revisions/before-hybrid-slice-4/` com **72 arquivos e hashes SHA256**.

## Câmera e composição

A inclinação é medida em relação à perpendicular da mesa: antes `atan2(16,22)` = **36,027373°**, agora **30,623267°** (`ângulo anterior × 0,85`). Redução de **15%**, equivalente a 5,404106°. A distância da câmera e o campo de visão de 43° foram mantidos. Não é redução de 15 graus nem multiplicação do pitch medido a partir do horizonte.

O grupo central passou de 1280 para 1200 px máximos. Em 1920×900, o centro visual de Nartvanyr foi de aproximadamente 376 para 414 px; ações foram de cerca de 1525 para 1489 px. O registro fechado compartilha o mesmo X e largura físicos de Nartvanyr, acompanhando a perspectiva em vez de apenas alinhar dois retângulos de tela. Registro aberto permanece legível e volta à mesa ao fechar. Os comandos, foco e hitboxes continuam sendo DOM nativo.

A escala da reserva rival foi arredondada a 0,001 para eliminar feedback de layout que produzia deslocamento de 1/64 de pixel entre compras. Oito cartas, compartimentos e símbolos aprovados foram preservados.

**Único elemento decorativo novo nesta iteração:** um pequeno parafuso de bronze, com fenda, junto aos livros superiores esquerdos (aproximadamente x112/y151 em desktop). O marcador de bronze da revisão 3 permanece. Nenhuma mecânica nova.

## Diagnóstico e correção das cartas

O inventário anterior à edição está em `prototype-qa/hybrid-4/before-inspection.json`, com capturas `before-1920x900.png` e `before-hover.png`. A carta de referência usa canvas nativo de **900×1260**, arte original **736×575** e largura normal **108 CSS px**. A qualidade de suavização do contexto nativo era `low`. Como exemplo, um nome de 43 unidades no desenho de 900 se reduz a cerca de 5,2 CSS px nessa largura. Aumentar apenas o bitmap não resolve esse limite de leitura.

`hybrid/hand.js` cria uma amostra visual menor com `imageSmoothingQuality=high`, dimensionada ao tamanho CSS e DPR até 2. O canvas original de 900×1260 permanece intacto para detalhe, clones e efeitos. Nome (10,5 CSS px), custo (14 px), atributos (12 px) e prévia da habilidade (10 px) recebem texto DOM nítido na mão. Valores acompanham os SVG nativos, incluindo ataque e durabilidade de armas. O zoom e o detalhe conservam a composição completa anterior.

Regras extensas mostram **até três linhas na mão**; o restante é lido na ampliação ou detalhe e permanece no rótulo acessível original. Não se alega que o texto completo de toda carta longa seja legível simultaneamente numa mão de nove cartas sobrepostas.

No hover, a carta original conserva exatamente o mesmo retângulo e ganha destaque de camada. A ampliação fica ancorada acima ou ao lado, sem cobrir a origem e sem seguir movimentos pequenos do mouse. Foco de teclado abre a leitura, blur fecha. Os controles continuam com seus handlers originais; hover não envia comando ao servidor. O código recebe somente a carta já autorizada pelo frontend, sem buscar a mão rival.

O brilho é externo ao conteúdo e não é cortado pelo overflow da carta. O arco da mão foi compactado, com ajuste adicional em alturas até 820 px para deixar margem inferior. Corrigiu-se também uma regra antiga `:has(:hover)` que trocava o padding da mão móvel e deslocava as cartas em 10 px. Compras e hover conservaram a geometria do campo nos ensaios finais.

## Fumaça e pesquisa

As nuvens mantêm projeção e máscaras de emanação, mas agora recebem uma máscara de lóbulos suaves, com pixels externos transparentes, para evitar a abertura retangular evidente. O fogo foi preservado. As casas futuras continuam sem faces no DOM; a suavização não antecipa revelações. A fumaça ainda usa sprites em planos, não um volume 3D.

**Evidência oficial consultada:** [Ben Thompson, Blizzard, 2014](https://hearthstone.blizzard.com/en-gb/news/13023802) descreve a prioridade de números, título e arte e os problemas do excesso de ornamentação. As [notas oficiais 32.4](https://hearthstone.blizzard.com/en-us/news/24205006) documentam correções de texto no hover e efeitos/cartas que apareciam indevidamente ao oponente. São observações de textos oficiais. A hierarquia escolhida aqui é uma aplicação ao RunaMarca; manter a origem e separar o zoom atende ao pedido explícito do usuário. Não se atribui essa implementação ao Hearthstone. O vídeo citado pelo parent não teve frames observados neste executor.

## Validação da revisão 4

Resultados em `prototype-qa/hybrid-4/`. Comandos a partir da raiz, com o Node 24 já disponível:

| Comando | Resultado | Evidência |
| --- | --- | --- |
| `node scripts/hybrid4-gameplay.cjs` | 40 passaram, 0 erros JS | `gameplay.log`, `result.json` |
| `node scripts/hybrid4-concept.mjs` | 75 passaram, 0 erros JS | `concept.log`, `revision6-concept.json` |
| `node scripts/hybrid4-geometry.mjs` | 85 passaram, 0 erros JS/WebGL | `geometry.log`, `geometry.json` |
| `node scripts/hybrid4-review.mjs` | 35 passaram, 0 erros JS | `review.log`, `review.json` |
| `node scripts/hybrid4-hand.mjs` | 69 passaram, 0 erros JS | `hand.log`, `hand.json` |
| `node scripts/hybrid4-apprentice.mjs` | 16 passaram, 0 erros JS | `apprentice.log`, `apprentice-browser.json` |
| `node scripts/hybrid4-reveal.mjs` | 17 passaram, 0 erros JS | `reveal.log`, `reveal-frames.json` |
| `node scripts/hybrid4-viewport.cjs` | 8 medições aprovadas | `viewport.log`, `viewport-result.json` |
| `node scripts/hybrid4-performance.mjs` | 20 reconstruções + 20 reamostragens medidas | `performance.log`, `performance.json` |

**345 verificações/medições aprovadas**, sem falhas finais. A auditoria nova cobre ângulo exato, alinhamento, nove cartas, amostragem DPR 1/2, tamanho real das fontes, margem do brilho, hover com origem visível e retângulo estável, entrada pelo trecho realmente visível da mão móvel, teclado, atualização de atributos, mão mista, bordas da fumaça, duas visões e ausência de comandos de hover. Falhas intermediárias de layout, arredondamento, teste de trecho coberto e identificação de fixture de arma foram diagnosticadas e corrigidas; a arma de QA usa `RunaWeapons.recipe` existente.

Viewport em escala 1: 1280×720, 1440×900, 1920×900, 1920×1080, 390×1000 e 320×1000; DPR 2 adicional. Desktop sem rolagem vertical; mobile conserva rolagem. Gameplay HTTP real, arrasto interrompido/repetido, nove cartas, reserva cheia, Aprendiz, sigilo, revelação por estágios, clones e fallback foram exercitados. Não há comandos de build/lint/typecheck definidos; sintaxe dos módulos e `git diff --check` verificados. A suíte integral do repositório não foi repetida porque motor, servidor, bot e dados permaneceram iguais ao snapshot.

Capturas comparativas reais: `before-1920x900.png` / `after-1920x900.png`, `before-hover.png` / `after-hover.png`, `hand-hover-1920-dpr1.png`, `hand-hover-1280-dpr1.png`, `hand-hover-390-dpr1.png`, `hand-hover-1920-dpr2.png`, `mixed-hand-dpr1.png` / `mixed-hand-dpr2.png`, `review-private-a.png` / `review-private-b.png` e quadros `review-reveal-*`. Capturas representativas foram inspecionadas em pixels; nada enviado à Library.

Medição isolada em 1920×900: montagem inicial **374,6 ms**; reconstrução aquecida mediana **5,7 ms**, p95/máximo **8,6 ms**. Reamostrar as nove cartas: mediana **1,9 ms**, p95/máximo **3,2 ms** por lote, sob demanda. Fumaça em 45 amostras: mediana **1,4 ms**, p95 **1,6 ms**, máximo **1,7 ms**. São tempos de CPU/submissão em Chrome headless, não GPU física nem garantia de FPS. A montagem inicial continua podendo causar engasgo; não se reivindica ganho percentual controlado sobre a revisão anterior.

## Abrir, preservar e reverter

Worktree `C:/Users/vanxf/Documents/Codex/2026-10-28/task-2/runamarca-board-prototype`, branch `prototype/board-perspective-20261028`, base `d1420a66e4bb431c8ceb374cc527b41a3c76506d`. A integração principal permanece separada. Arquivos desta iteração: `hybrid/bridge.js`, `bridge.css`, `atmosphere.js`, `index.html`, este guia e novo `hand.js`; onze scripts `hybrid4-*`. `card-plane.js`, `renderer.js`, revisão 6, laboratório, regras e servidor preservados. Inventário exato, hashes e diffstat na pasta de evidências.

Para reiniciar o servidor, executar `ABRIR-PROTOTIPO.cmd` ou, da raiz da worktree:

```powershell
& 'C:\Users\vanxf\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' ..\start-prototype-detached.py
```

O iniciador verifica a porta e mantém o processo local independente. Sem serviço/autostart. Reiniciar o PC encerra salas temporárias. Para retornar à híbrida 3, restaurar os arquivos híbridos do snapshot `before-hybrid-slice-4` e remover apenas o novo `hybrid/hand.js`, que deixa de ser importado pelo bridge restaurado. Não usar reset/clean sobre trabalho anterior não commitado.

Limites: Chrome headless com viewport controlada e zoom padrão 100%; não foram medidas barras pessoais do navegador nem telefone físico. Não houve gravação de gameplay de Hearthstone efetivamente assistida. Não há comparação pixel a pixel com imagens aprovadas indisponíveis localmente. Sem acesso à janela bloqueada, novas instalações, consulta ao Claude, max/ultra, commit, push ou publicação nesta iteração.

---

## Histórico preservado — revisão 3

# RunaMarca híbrido — revisão 3, superfícies e oclusão

Abrir **http://127.0.0.1:3086/runamarca/hybrid/index.html** e recarregar. A entrada usa `hybrid-3`. Mantém a câmera suave única, as salas e os comandos existentes. A revisão 6 continua em `/runamarca/`; não houve publicação.

Para reiniciar localmente, executar `ABRIR-PROTOTIPO.cmd` na raiz da worktree, ou, a partir dela:

```powershell
& 'C:\Users\vanxf\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' ..\start-prototype-detached.py
```

O iniciador verifica a porta antes de criar outro processo. O servidor escuta somente em `127.0.0.1:3086`; reiniciar o PC encerra as salas temporárias. Logs do servidor ficam em `../prototype-server.stdout.log` e `../prototype-server.stderr.log`.

## Alterações desta iteração

- Compartimentos e símbolos sol/lua/estrela preservados. As faces das cartas, atributos SVG e canvases usam uma única projeção; as sombras retangulares herdadas foram removidas. A matriz considera a escala CSS do ancestral da reserva rival.
- A largura da reserva rival agora deriva da distância da câmera. Oito cartas continuam contidas, inclusive no mobile; o cálculo local de sobreposição considera unidades sem zoom. A pequena separação superior evita que o coração do patrono cubra o rótulo da reserva.
- Baralhos existentes têm dorso DOM projetado sobre pilhas geométricas, preservando foco, contagem, tooltip e controle original. Os livros decorativos já existentes no canto esquerdo receberam capas acima do miolo, em vez de páginas expostas no topo.
- Nartvanyr, registro fechado e ações usam placas apoiadas na mesa com o texto acompanhando a projeção. Foram removidas as placas verticais que produziam sombras diagonais alongadas. Sombras físicas da vela, livros, bordas e cartas continuam. Encerrar conserva seu estado, comando e foco; a sombra CSS antiga foi removida. O registro aberto volta à leitura normal e retorna à superfície quando fechado.
- Painel desktop dos patronos passou de 480 para 390 px. Nome alinhado perto do retrato, acima do éter; vida, dez indicadores e dois poderes preservados, sem sobreposição nos testes.
- Emanações têm moldura elevada, encaixe escuro e símbolo embutido. A fumaça usa três canvases pequenos projetados por homografia, sem costuras de faixas, e máscaras dos encaixes de emanação. A opacidade de cada casa começa a diminuir somente após o limiar de revelação pública correspondente. O fogo original foi preservado em sua camada. Nenhuma face futura é criada pelo efeito.

**Exatamente um elemento decorativo novo:** pequeno marcador de bronze junto aos livros do canto superior esquerdo, fora das áreas de interação. A vela e os livros já existiam; correções de suas camadas não são novas peças. Nenhuma mecânica foi adicionada.

## Evidências e testes

Antes de editar: inventário de DOM, CSS, efeitos e geometria; capturas comparativas e snapshot de **60 arquivos com SHA256** em `../revisions/before-hybrid-slice-3/`. Evidências desta revisão em `prototype-qa/hybrid-3/`.

Comandos a partir da raiz, usando o Node 24 já disponível:

| Comando | Resultado final | Evidência |
| --- | --- | --- |
| `node scripts/hybrid3-gameplay.cjs` | 40 passaram, 0 erros JS | `gameplay.log`, `result.json` |
| `node scripts/hybrid3-concept.mjs` | 75 passaram, 0 erros JS | `concept.log`, `revision6-concept.json` |
| `node scripts/hybrid3-geometry.mjs` | 85 passaram, 0 erros JS/WebGL | `geometry.log`, `geometry.json` |
| `node scripts/hybrid3-review.mjs` | 35 passaram, 0 erros JS | `review.log`, `review.json` |
| `node scripts/hybrid3-apprentice.mjs` | 16 passaram, 0 erros JS | `apprentice.log`, `apprentice-browser.json` |
| `node scripts/hybrid3-reveal.mjs` | 17 passaram, 0 erros JS | `reveal.log`, `reveal-frames.json` |
| `node scripts/hybrid3-viewport.cjs` | 8 medições aprovadas | `viewport.log`, `viewport-result.json` |
| `node scripts/hybrid3-performance.mjs` | 20 reconstruções medidas | `performance.log`, `performance.json` |

Total: **276 verificações/medições aprovadas**, sem falhas finais. As primeiras passagens detectaram e corrigiram encaixe mobile sob zoom, regra CSS que bloqueava a inclinação de Encerrar e métricas de centro inadequadas para placas projetadas; as nuvens foram migradas para homografia contínua depois de inspecionar costuras na tentativa inicial.

Gameplay HTTP real: compras até nove cartas, hover, clique, arrasto interrompido/repetido, recarga, formação secreta, combate e retorno. Aprendiz: confirmação privada, cancelar jogada antes da confirmação, mira, pular somente o ataque e continuar, resolução e duas perspectivas. As mecânicas desses fluxos não foram alteradas nesta revisão.

Chrome headless em escala 1: 1280×720, 1440×900, 1920×900, 1920×1080, 390×1000 e 320×1000; DPR 2 adicional. Desktop sem rolagem vertical e sem overflow horizontal, nove cartas nas mãos e reserva até oito. Seis rodadas de compra/hover mantiveram o campo estável. Validaram-se cantos clicáveis, clones com os dois canvases, centros/limites projetados, inatividade sem reconstrução contínua e fallback WebGL. A nova auditoria cobre 0/1/5/8 cartas na reserva, proporção rival, abertura/fechamento do registro, oclusão da fumaça e sigilo em ambas as visões.

Capturas internas: `before-1920x900.png` / `after-1920x900.png`, `before-390.png` / `after-390.png`, `geometry-1280.png`, `geometry-1920.png`, `dpr-2.png`, `review-private-a.png` / `review-private-b.png`, `review-reveal-0.1.png`, `review-reveal-0.22.png`, `review-reveal-0.55.png`, `review-reveal-0.89.png`, `apprentice-arrow.png` e cenas de arrasto/hover. Comparações representativas foram inspecionadas em pixels. Nada foi salvo na Library.

Medição isolada em 1920×900: montagem inicial **283,6 ms**; reconstruções aquecidas, mediana **5,9 ms**, p95/máximo **10,2 ms**. Fumaça em 45 amostras: mediana **1,2 ms**, p95 **1,7 ms**, máximo **1,9 ms** de CPU. São medições de CPU/submissão em Chrome headless, não GPU física nem garantia de FPS. O custo inicial continua sendo uma limitação.

Sintaxe dos módulos híbridos e `git diff --check` aprovados; o Git só emitiu aviso anterior de normalização LF/CRLF em `app.js`. O projeto não define comandos de build/lint/typecheck. A suíte integral do repositório não foi repetida; motor, servidor, bot e dados permaneceram iguais ao snapshot. Os testes de motor anteriores estão preservados como histórico, sem contá-los como novos resultados.

## Limites, proveniência e reversão

A leitura oficial de `libfile_44b038c96b208191b4ebb588007f69fe` retornou `image_asset_pointer` e descrição/OCR, sem pixels visíveis neste executor. O ajuste dos vazios segue o relato explícito do usuário/parent, com medições e screenshots do jogo; não se alega ter visto o print. A referência principal já inspecionada e os briefings anteriores continuam guiando o cenário. Nenhuma janela bloqueada foi usada ou contornada.

Faces e textos ainda são DOM projetado sobre geometria. Fumaça é sprite Canvas 2D em planos com máscara explícita das emanações, não volume 3D nem teste de profundidade geral para qualquer objeto futuro. Fogo, impactos, setas e voos continuam no sistema anterior; os centros e fluxos testados foram preservados. Mobile mantém rolagem vertical e sobreposição de cartas quando necessário. Não houve teste em telefone físico, medição das barras da janela pessoal do usuário nem garantia de equivalência pixel a pixel com a referência. Nenhuma consulta externa ao Claude, instalação ou uso de max/ultra nesta iteração.

Arquivos de produto alterados nesta revisão: `hybrid/index.html`, `bridge.js`, `bridge.css`, `card-plane.js`, este guia e novo `hybrid/atmosphere.js`. Acrescentados onze scripts `scripts/hybrid3-*` de captura/QA. `hybrid/renderer.js`, revisão 6, laboratório, motor, servidor e bot preservados. Inventário exato e hashes em `changed-files.json` e `final-files.json` na pasta de evidências.

Worktree `C:/Users/vanxf/Documents/Codex/2026-10-28/task-2/runamarca-board-prototype`, branch `prototype/board-perspective-20261028`, base `d1420a66e4bb431c8ceb374cc527b41a3c76506d`. A integração principal foi conferida limpa nessa mesma base. Para voltar à revisão híbrida 2, restaurar os arquivos de `mesa-nova/hybrid/` do snapshot e remover somente `hybrid/atmosphere.js` novo; o `index.html` restaurado volta a carregar a atmosfera anterior. Scripts de QA podem ficar sem afetar o jogo. Não usar reset/clean sobre trabalho anterior não commitado.

---

## Histórico preservado — revisão 2

# RunaMarca híbrido - revisão 2, câmera suave única

Abrir **http://127.0.0.1:3086/runamarca/hybrid/index.html** e recarregar. A página entrega os assets `hybrid-2`. Criar/entrar numa sala ou usar o bot pelos controles existentes. Não há seletor de câmera: a câmera suave aprovada é a única. A revisão 6 continua em `/runamarca/` e o laboratório em `/runamarca/lab-3d/index.html`.

Depois do reinício do PC, o servidor local foi restaurado como processo independente, somente em 127.0.0.1:3086. Reinícios encerram salas temporárias; pode ser necessário criar uma nova. Para iniciar, executar `ABRIR-PROTOTIPO.cmd` na raiz da worktree ou o iniciador independente `../start-prototype-detached.py`. Não é serviço nem autostart.

## O que mudou nesta revisão

- Cartas da reserva, combate e Emanação receberam faces projetadas pela mesma câmera da superfície. Uma transformação projetiva mapeia os quatro cantos; a compressão vertical é deliberadamente sutil (8% na reserva, 6% no campo), com arte, texto e vida juntos. Mãos e detalhe/zoom permanecem em pé.
- O botão externo de cada carta, seus handlers, UID, retângulo e centro permanecem intactos. As faces ficam num elemento visual interno. Cantos visíveis continuam clicáveis pelo botão original; clones fora do jogo não interceptam destinos de arrasto.
- Nartvanyr, registro e preparação foram aproximados. Em 1920x900, os centros de Nartvanyr e ações moveram 73 px cada em direção ao centro. O grupo central passou de 1420 para 1280 px máximos, sem deslocamento durante compras/hover.
- Painéis laterais usam placas frontais legíveis na cena, eliminando a deformação lateral excessiva. Fase e rodada estão separadas, e Encerrar mantém o comando original, estado habilitado/desabilitado, foco visível e altura mínima de 42 px. O registro tem indicador aberto/fechado.
- A câmera inclinada e os botões de escolha foram removidos. Só aparece aviso se WebGL precisar retornar ao visual 2D. A vela e a materialidade existente foram preservadas.

É uma evolução da cópia jogável existente, sem recomeçar o projeto. Continuam três casas e duas emanações por lado, dez indicadores de éter, dois poderes por Patrono, reserva até oito fora da Emanação e nove cartas na mão. Nenhuma regra, carta, custo, comando ou API foi alterado nesta revisão.

## Inventário e ponte dos efeitos

Antes de editar, foram capturados `before-1920x900.png`, `before-390.png` e `before-geometry.json` em `prototype-qa/hybrid-2/`. A inspeção cobriu `cardEl`, `cloneVisual`, `tableCard`, `center`, arrasto, `RunaMotion`, stats SVG, canvas de arte/vida, vínculos de alvo e fluxo de fase. O rollback foi salvo antes de qualquer alteração.

`card-plane.js` cria um invólucro visual para os filhos já existentes do botão. Preserva os dois canvases nativos (arte e vida), SVG de atributos e badges. Não cria outra carta nem outro alvo. A ocultação dos elementos auxiliares foi adaptada para a nova profundidade do DOM.

Os efeitos existentes continuam usando o botão externo e o mesmo centro. Clones de animação copiam a face interna e seus canvases; a translação nativa continua no elemento externo. O teste exercitou `cloneVisual` e animação real, comparou arte/stats e confirmou que `tableCard` ainda encontra o original. A mira da Aprendiz, cancelamento, vínculos, fogo/fumaça e retorno ao jogo foram retestados.

A ponte continua sem fetch, sem envio de ações e sem leitura de nomes, imagens, mãos ou objetos privados do motor. Só usa elementos/retângulos autorizados já renderizados. Diagnósticos expõem geometria, não identidades. Raiz de clique/arrasto e validação permanecem no frontend/servidor existentes. As duas perspectivas não recebem faces para posições rivais ainda ocultas.

Perda de WebGL restaura o posicionador e a apresentação 2D, remove os invólucros originais e os de clones em voo, preservando os bitmaps dos dois canvases. Não reinicia o motor nem envia comandos. Reativar 3D exige recarregar, evitando inicialização duplicada.

## Validação

Resultados finais em `prototype-qa/hybrid-2/`:

| Comando a partir da raiz | Resultado | Evidência |
| --- | --- | --- |
| `node scripts/hybrid2-gameplay.cjs` | 40 aprovadas; zero erros JS | `gameplay.log`, `result.json` |
| `node scripts/hybrid2-concept.mjs` | 75 aprovadas; zero erros JS | `concept.log`, `revision6-concept.json` |
| `node scripts/hybrid2-geometry.mjs` | 85 aprovadas; zero erros JS/WebGL | `geometry.log`, `geometry.json` |
| `node scripts/hybrid2-apprentice.mjs` | 16 aprovadas; zero erros JS | `apprentice.log`, `apprentice-browser.json` |
| `node scripts/hybrid2-reveal.mjs` | 17 aprovadas; zero erros JS | `reveal.log`, `reveal-frames.json` |
| `node scripts/hybrid2-viewport.cjs` | 8 medições aprovadas | `viewport.log`, `viewport-result.json` |
| `node scripts/hybrid2-performance.mjs` | 20 atualizações medidas | `performance.log`, `performance.json` |

O resultado pendente do reinício foi verificado no arquivo, antes de repetir: já tinha 84 aprovações, incluindo DPR 2. A rodada adicional acrescentou recuperação com clone em voo. O teste foi corrigido para aguardar `visualReady` e comparar ambos os canvases; não presumir um único canvas por criatura.

O QA de gameplay usa sala/ações HTTP reais locais, com compras até nove cartas, clique/arrasto interrompido e repetido, menu, recarga, formação secreta, combate e retorno. Os testes de Aprendiz e visões usam `act/view` reais com transporte de teste; não há endpoint de injeção novo no servidor.

Viewports Chrome headless, escala 1: 1280x720, 1440x900, 1920x900, 1920x1080, 390x1000 e 320x1000. Medições adicionais em 1920x960/1000. Sem overflow horizontal; desktop sem rolagem vertical nos ensaios. Mobile conserva rolagem vertical. Ambas as mãos chegaram a nove; oito cartas cabem na prateleira, e três combatentes deixam cinco na reserva.

Foram verificados DPR 2, rolagem, correspondência entre cantos projetados e bounds do navegador, centros dentro da tolerância de 0,2 CSS px, clique nos cantos visíveis do combate, clique abrindo interação nativa, clones, duas perspectivas e fallback. O ensaio de inatividade ficou em 22 → 22 builds, sem reconstrução contínua.

Capturas comparativas no mesmo estado foram executadas antes/depois e inspecionadas: `before-1920x900.png`, `after-1920x900.png`, `before-390.png`, `after-390.png`. Também existem capturas de geometria, DPR 2, reserva cheia, nove cartas, hover, mira e estágios de revelação. São evidências internas locais, sem upload à Library. Os nomes `revision6-*` nesta pasta vêm dos testes reaproveitados; registram a página híbrida atual.

## Desempenho e limites reais

Na medição isolada após recuperar o PC, em 1920x900: primeira montagem **290,7 ms**; 20 reconstruções aquecidas tiveram mediana **4,2 ms** e p95/máximo **5,8 ms**. São tempos de montagem/submissão da ponte no Chrome headless, não tempo de GPU física nem garantia de FPS. O custo de inicialização ainda pode causar um engasgo. A medição da primeira fatia usava outra ação de reconstrução; não é uma comparação controlada de ganho percentual.

O renderizador e a câmera suave da fatia anterior foram preservados; DPR WebGL limitado a 1,5 e texto continua nativo. Os invólucros reutilizam os canvases existentes, sem duplicar cartas. Observadores dos elementos removidos são desconectados. Nenhum software ou dependência foi instalado.

As faces continuam sendo elementos DOM mapeados sobre a geometria, e não malhas texturizadas substituindo todo o frontend. Partículas, setas, colisão visual, impactos e movimento dos clones ainda usam o sistema 2D anterior; os centros foram validados, mas não houve migração de cada efeito para simulação 3D. Durante um voo, a face mantém a deformação da origem sob a animação externa. Materiais/modelos seguem provisórios e não se alega reprodução perfeita da imagem conceitual.

Não houve uso da janela bloqueada do Chrome, aparelho móvel físico ou medição das barras pessoais do navegador. 1920x900 a escala 1 reserva espaço num monitor Full HD, mas é viewport controlada. Zoom real acima de 100% e todos os possíveis cantos/gaps durante cada animação não foram auditados exaustivamente. A suíte completa do projeto não foi repetida porque motor/servidor/bot não mudaram; foram executados os testes locais aplicáveis à alteração e verificações sintáticas/`git diff --check`.

## Isolamento e reversão

Worktree: `C:/Users/vanxf/Documents/Codex/2026-10-28/task-2/runamarca-board-prototype`, branch `prototype/board-perspective-20261028`, base `d1420a66e4bb431c8ceb374cc527b41a3c76506d`.

Rollback: `../revisions/before-hybrid-slice-2/`, 50 arquivos com SHA256, incluindo a primeira fatia e seu guia. Nesta revisão foram alterados `hybrid/index.html`, `bridge.js`, `bridge.css` e este guia; acrescentados `card-plane.js` e nove scripts `hybrid2-*` de QA/captura. `hybrid/renderer.js`, revisão 6, laboratório, motor, servidor e bot permanecem iguais ao snapshot.

Para voltar à primeira fatia, restaurar os arquivos desta pasta a partir do snapshot e recarregar; para usar o visual anterior sem mexer em arquivos, abrir `/runamarca/`. Não usar reset/clean sobre a worktree, pois há trabalho anterior não commitado. Sem commit, push, PR, merge, deploy ou publicação.
