# Mesa híbrida — revisão de UI do dono (31/10–01/11/2026)

Abrir http://127.0.0.1:3086/runamarca/hybrid/index.html e usar Ctrl+F5 (`hybrid-12-ui-owner`). Servidor: `node --experimental-vm-modules scripts/board-prototype-server.mjs` (só 127.0.0.1:3086). Pedido do dono: mão +15%, Patrono/composição +10%, mulligan +25%, botões de combate na placa, carta comprada acima do contador, retorno pós-combate sem deformação, sombras coerentes, verde só para jogáveis, sem cursor de espera, escolhas no estilo Hearthstone, Emanação sem rolagem interna, Registro sem flicker e conferência das animações Platina.

Estado: rodada 1 interrompida e salva no commit local de segurança `d7a29cd` (base indicada pelo dono: `88ad7b5`; início efetivo da rodada em `prototype-qa/ui-owner/initial-snapshot/`). A continuação de 01/11 **não foi commitada**; nada foi enviado nem publicado; revisão do Codex pendente. **A rota nativa `/runamarca/` é afetada** pelas mudanças compartilhadas em `mesa-nova/combat-return.js` e `mesa-nova/entry-modes.js` (o restante fica em `mesa-nova/hybrid/`). O +10% de composição só é atingido em 1920×1080; em telas de até 900 px de altura fica limitado a 1,005–1,009 (dorsos e Patrono rival visíveis, cartas dentro das prateleiras, sem rolagem); valores por viewport, testes, falhas herdadas e pendências em `prototype-qa/ui-owner/REVIEW-PACKAGE.md` e no topo de `mesa-nova/hybrid/README.md`.

---

# Mesa híbrida — revisão 12

Abrir http://127.0.0.1:3086/runamarca/hybrid/index.html e usar Ctrl+F5 (`hybrid-12`). Se o servidor não responder, executar `ABRIR-PROTOTIPO.cmd` ou `node --experimental-vm-modules scripts/board-prototype-server.mjs` (Node ≥ 24, só 127.0.0.1:3086). A câmera fica a **5° da vertical**, definidos por um único parâmetro: `CAMERA_TILT_DEGREES` em `mesa-nova/hybrid/config.js`. A profundidade vem de relevo, espessura, luz lateral e sombras (`HYBRID.relief`). Medições, comandos de QA, resultados e limitações estão em `mesa-nova/hybrid/README.md`. O pacote de revisão (estado do Git, diagnóstico da Verônica, resultados e riscos) está em `prototype-qa/hybrid-12/REVIEW-PACKAGE.md`.

Estado atual (31/10/2026): o trabalho das revisões 10–12 está salvo nos commits locais de segurança `49e747e` e `88ad7b5`; a continuação de 31/10 ainda não foi commitada. Nada foi enviado nem publicado. O diff da revisão 12 é calculado contra a árvore Git verificada da revisão 11, `87f9208df3408f1d033e9a8321b60744eea7b0fa`: `git diff 87f9208df3408f1d033e9a8321b60744eea7b0fa -- . ":(exclude)prototype-qa"`. As instruções antigas de separação (`split/split.cjs`, `commit-tree`, `update-ref`) não se aplicam mais. Evidências atuais: `prototype-qa/hybrid-12/continuacao-*`, com a QA agregada em `continuacao-final/` e `continuacao-final-pos-codex/` e a suíte em `suite-continuacao-final.json`. `after/`, `resumed/` e `dev/` ficam como histórico.

---

# Mesa híbrida — revisão 11

Abrir http://127.0.0.1:3086/runamarca/hybrid/index.html e usar Ctrl+F5. Se necessário, executar ABRIR-PROTOTIPO.cmd. Os parâmetros ficam em mesa-nova/hybrid/config.js. Guia, medidas e limitações estão em mesa-nova/hybrid/README.md, e as evidências em prototype-qa/hybrid-11/. Sem commit nem publicação.

---

# Mesa híbrida — revisão 9

Abrir http://127.0.0.1:3086/runamarca/hybrid/index.html e usar Ctrl+F5. Reiniciar, se necessário, executando `ABRIR-PROTOTIPO.cmd` e mantendo o terminal aberto. Guia, medidas, testes e limitações em `mesa-nova/hybrid/README.md`. Sem commit/publicação. Histórico anterior abaixo.

---

# Mesa híbrida — revisão 8

Abrir http://127.0.0.1:3086/runamarca/hybrid/index.html e usar Ctrl+F5. Se necessário, executar `ABRIR-PROTOTIPO.cmd` e manter o terminal aberto. Guia completo e resultados em `mesa-nova/hybrid/README.md`. Revisão 6 preservada abaixo. Sem commit/publicação.

---

# Revisão 6 — conceito aprovado no tabuleiro jogável

Abrir http://127.0.0.1:3086/runamarca/ e recarregar a página. Os recursos usam versão prototype-6. Para iniciar novamente, executar ABRIR-PROTOTIPO.cmd nesta pasta. O servidor é local, exclusivamente 127.0.0.1; salas são temporárias e foram encerradas no reinício após a atualização do aplicativo.

Base: d1420a66e4bb431c8ceb374cc527b41a3c76506d. Branch isolada: prototype/board-perspective-20261028. Checkout: C:/Users/vanxf/Documents/Codex/2026-10-28/task-2/runamarca-board-prototype. Sem commit, push, PR, merge ou publicação.

Implementação desta revisão:
- Cenário raster local de madeira quente, livros/folhas, vela com luz lateral e sombras de contato; centro livre. Feltro azul-petróleo, prateleiras de madeira e encaixes com sombras discretas. Deck rival afastado da vela; decoração em background não captura input.
- Três setores de combate e duas emanações intercaladas por lado. Ambos os lados têm símbolo de emanação. Preservadas reservas sem trilhos duplicados, corda central e registro acima do Nartvanyr.
- Patronos centrais em arco com base reta, identidade/éter à esquerda e dois poderes funcionais à direita. Dez encaixes visuais de éter: disponíveis, gastos e bloqueados representam o estado real; nenhum recurso é concedido pela apresentação. Fase, rodada, temporizador e Encerrar continuam funcionais.
- Plano de combate levemente inclinado em CSS, com casas e cartas transformadas juntas; HUD em pé. O achatamento dos descendentes e a camada das casas preservam o hit-testing do navegador. Arrasto real foi retestado após uma regressão inicial.
- Mão com nove cartas, alturas fixas durante compras e hover; modo compacto para 720px. Mobile preserva rolagem vertical e usa detalhe/zoom para leitura completa. Reserva legal: oito criaturas fora da Emanação, incluindo as de combate; prateleira mostra oito com campo vazio e cinco com três casas ocupadas. A posição rival continua oculta antes da revelação.

Arquivos alterados nesta revisão, em relação ao snapshot da revisão 5: mesa-nova/board-prototype.css, mesa-nova/board-prototype.js, mesa-nova/index.html e scripts/board-prototype-qa-full.cjs (diagnóstico do alvo real do arrasto). Adicionados mesa-nova/prototype-environment-v6.png e scripts/board-prototype-approved-concept.mjs, além das evidências/documentação. Nenhum módulo de mecânica mudou nesta revisão; correções anteriores da Aprendiz e revelação progressiva foram preservadas.

Validação concluída após recuperar a conexão:
- node scripts/board-prototype-qa-full.cjs: 40 passaram, 0 falharam, 0 erros JavaScript. Compras reais, menu repetido, arrasto interrompido/repetido, recarga, sigilo rival, combate e retorno jogável. Log revision6-gameplay.log, resultado result.json; drag-hit-0/1.json confirmam destino dentro da casa.
- node scripts/board-prototype-approved-concept.mjs: 75 verificações passaram, 0 erros. Éter 0–10, reservas com oito cartas contidas, nove dorsos, dois poderes, C–E–C–E–C, patronos em arco, controles e hover. Viewports 1280x720, 1440x900, 1920x1080, 1920x900, 390x1000 e 320x1000. Desktop sem rolagem vertical; nenhum overflow horizontal. Resultado revision6-concept.json e log revision6-concept.log.
- node scripts/board-prototype-viewport.cjs: 8 medições aprovadas; seis rodadas de compras reais em 1920x900, mais 1920x960/1000, escala 1. Nove cartas nas duas mãos; campo estável no hover/compra e sem rolagem vertical. viewport-result.json e revision6-viewport.log.
- node scripts/board-prototype-reveal-frames.mjs: 17 verificações passaram, 0 erros. Duas perspectivas nos quadros de revelação, reservas até oito, corda central e registro sem nome de magia oculta. reveal-frames.json e revision6-reveal.log.
- node scripts/board-prototype-apprentice-browser.mjs: 16 verificações passaram, 0 erros. Confirmação privada, cancelamento por botão/direito/fechar/Esc, mira, resolução, recarga e duas perspectivas. apprentice-browser.json e revision6-apprentice.log.
- node --experimental-vm-modules --test mesa-nova/test-progressive-reveal.mjs mesa-nova/test-apprentice-cancel.mjs mesa-nova/test-public-visibility.mjs mesa-nova/test-targeting-polish.mjs bot/integration.test.mjs: 30 passaram, 0 falharam (revision6-regression.log).
- git diff --check passou; apenas aviso de normalização LF/CRLF em app.js. Não há scripts separados de build/lint/typecheck. A suíte principal completa não foi repetida nesta revisão visual.

Capturas internas em prototype-qa/: revision6-filled-1280x720.png, revision6-filled-1920x900.png, revision6-filled-1920x1080.png, revision6-hover-1280x720.png, revision6-hover-1440x900.png, revision6-filled-390x1000.png, revision6-private-a/b.png, revision6-revealed.png, reveal-stage-0/1/2/3.png, center-rope.png e apprentice-arrow.png. Capturas representativas foram inspecionadas neste executor; não foram enviadas à Library. Os testes de layout usam fixtures reais act/view, e o QA de gameplay usa o servidor HTTP local. Nenhum endpoint de injeção foi acrescentado ao servidor.

Proveniência: a referência original local foi inspecionada em pixels. A imagem aprovada libfile_9dfe361d42c08191bbaa2f6fadbcf08b retornou somente asset_pointer e descrição, sem pixels neste executor. Sua organização foi seguida pelo briefing visual fiel do parent, com correções dos erros reconhecidos. Não se alega reprodução perfeita. O cenário foi gerado com a ferramenta de imagem integrada, por descrição, e incorporado localmente; prompt e hash em prototype-qa/revision6-image-provenance.md. Nenhuma nova consulta ao Claude nesta revisão, nenhum modelo em máximo/ultra solicitado.

Limites: não houve acesso à janela normal bloqueada do Chrome, medição de suas barras reais, aparelho móvel físico ou benchmark em outro hardware. 1920x900 a escala 1 reserva 180px de Full HD para barras/sistema, mas não equivale a medir a janela pessoal do usuário. Comparação pixel a pixel com a imagem aprovada não foi possível. Sem contornar bloqueios.

Reversão: snapshot completo dos 30 arquivos da revisão 5 e seus hashes em ../revisions/prototype-5-before-approved-concept/, com cópia das evidências antigas. Para retornar apenas o visual anterior, restaurar desse snapshot mesa-nova/board-prototype.css, mesa-nova/board-prototype.js e mesa-nova/index.html, então recarregar. O novo PNG fica sem referência e não interfere. Não executar reset/clean sobre esta worktree, pois ela contém trabalho anterior não commitado.

---

As seções seguintes são histórico das revisões anteriores.
# RunaMarca — tabuleiro local

Abra http://127.0.0.1:3086/runamarca/ enquanto o servidor desta tarefa estiver rodando. Crie uma sala, escolha o deck e use “Jogar contra bot de treino”, ou abra outra aba e entre com o código da sala.

Para iniciar novamente, execute ABRIR-PROTOTIPO.cmd nesta pasta. O terminal deve permanecer aberto; Ctrl+C encerra o servidor. Se a porta 3086 já estiver ocupada pelo protótipo, use o servidor que já está aberto. As salas são temporárias e acabam ao reiniciar o processo.

O iniciador usa a sessão de testes existente apenas neste processo local, escuta exclusivamente 127.0.0.1 e remove configurações de conta/banco herdadas. Não conecta o protótipo a contas ou partidas reais. O servidor normal e suas regras de acesso não foram alterados.

## Escopo

Base d1420a66e4bb431c8ceb374cc527b41a3c76506d, branch prototype/board-perspective-20261028. Checkout isolado em C:/Users/vanxf/Documents/Codex/2026-10-28/task-2/runamarca-board-prototype. Mudanças locais, sem publicação.

Reservas centrais simétricas, sem o trilho antigo contínuo; mão rival com nove dorsos e espaço responsivo; superfície azul trapezoidal com frente curva; patronos centrais e poderes existentes. No celular, descarte e controles ficam abaixo do campo. A posição do relógio acompanha o botão e não empurra o painel sobre o campo.

Mantidos motor, cartas, bot, regras de ocultação, efeitos e controles. Perspectiva aplicada à superfície e aos contornos, preservando a geometria de interação das cartas/HUD. Madeira e tecido desenhados em CSS; ornamentos ilustrados da imagem conceitual não foram reproduzidos. As cartas e os dorsos usam as artes locais atuais.

Referência principal inspecionada em pixels neste executor, com identidade/hash em ../references/PROVENANCE.md. Segunda anotação recebida por descrição fiel da inspeção do parent; sua transferência foi bloqueada e não foi repetida.

## Validação

37 comandos da suíte principal concluídos com sucesso; o primeiro bloco foi repetido com acesso loopback após falha EACCES do sandbox. 44 testes adicionais de polimento passaram. Verificação sintática dos scripts alterados e git diff --check. Não existem scripts separados de build/lint/typecheck neste projeto JavaScript servido diretamente.

QA Chrome headless com rede externa bloqueada. Partida pelo servidor real, nove cartas obtidas por compras normais, resoluções e descartes reais. Capturas e resultados internos em prototype-qa/. Não foram enviados à Library.

Resultado final: 40/40 verificações, zero erros JavaScript. Viewports 1440/900/390/320; nove dorsos dentro da tela; seis espaços de combate e quatro emanações; reservas únicas/simétricas; controles abaixo do campo no celular; menu repetido; arraste cancelado e repetido; sigilo rival; recarga preservando vaga; combate e retorno à preparação. Capturas finais revisadas visualmente. Não foi usado aparelho físico.

Telas pequenas preservam rolagem vertical e leitura ampliada das cartas; nove cartas não cabem com todo o texto legível simultaneamente em 320px. Use o detalhe/zoom existente para ler a carta completa.

## Revisão 2 — feedback de gameplay

Madeira mais escura com veios, reservas como nichos de estante, patronos desktop reduzidos de 720×98 para 560×78, mesa limitada a 1420px com perspectiva mais pronunciada, mãos sobrepostas e altura fixa inclusive no hover. Nuvens com volumes arredondados; função de fogo da revelação preservada. Atualize a página para carregar os arquivos com versão prototype-2.

O teste `scripts/board-prototype-viewport.cjs` usa compras reais durante seis rodadas e Chrome headless com escala 1. Em 1920×900, 1920×960 e 1920×1000, scrollHeight corresponde à altura da viewport. A mesa permanece exatamente no mesmo retângulo durante compras e hover; mãos chegam a nove cartas. Os 900px reservam 180px de um monitor Full HD para barras/sistema. Esta é uma medição da página em viewport controlada, não uma medição da janela pessoal do usuário. Evidências: prototype-qa/viewport-result.json e fullhd-1920x900.png.

Aprendiz: o cliente agora evita reiniciar uma seta já ativa a cada render. O motor não foi alterado. Seis verificações em scripts/board-prototype-apprentice.mjs confirmam a pendência obrigatória, privacidade das duas visões, devolução de magia preparada mantendo o gatilho, resolução normal e estabilidade da seta entre renders. Também passaram os testes existentes test-apprentice-mark.mjs, test-public-visibility.mjs, test-mechanic-entry.mjs e test-turn-clock.mjs.

O diagnóstico inicial encontrou disparo obrigatório e nenhuma ação de desistência. A revisão 3 abaixo implementa a mudança posteriormente autorizada pelo usuário.

O novo print libfile_d67abd3d18e881919a31a581ac607c3a retornou apenas descrição/OCR pela ferramenta Library, sem pixels; não foi encontrado nos Downloads. O ajuste de espaçamento foi validado no próprio protótipo, sem alegar inspeção desse print. Não houve nova tentativa do download anteriormente bloqueado.

QA final da revisão 2: 40/40 verificações em scripts/board-prototype-qa-full.cjs, zero erros JavaScript. Um ensaio anterior falhou no segundo arrasto; o teste foi sincronizado com uma espera de 1200ms após soltar, em vez de 600ms, e passou na repetição. Isso não prova ausência de toda intermitência de animação. Capturas finais formation-desktop.png, formation-mobile.png e fullhd-1920x900.png inspecionadas. Celular físico e janela pessoal do navegador não foram usados. Servidor confirmado HTTP 200 entregando prototype-2; integração principal continua limpa em d1420a6. Nada foi publicado.

## Revisão 3 — cancelamento autorizado da Aprendiz

Quando a primeira magia for acionar a Aprendiz, o cliente oferece uma confirmação privada. Cancelar jogada, fechar ou usar botão direito nessa confirmação mantém a carta e não envia requisição ao servidor. Só confirmar envia o comando normal, com todas as validações existentes. Se o estado mudar enquanto a confirmação estiver aberta, ela não confirma uma jogada antiga.

Depois de confirmar a magia, a mira usa seta. Botão direito, Esc, Cancelar ou fechar a alternativa por lista envia apprenticeSkip, com fonte e rodada. O servidor valida dono/turno/fase/primeiro disparo pendente/rodada, consome somente esse disparo e não aplica dano. A magia permanece resolvida (uso direto) ou preparada (uso em posição), com seu custo e visibilidade normais. A primeira magia da rodada não é renovada. Com duas Aprendizes, cada disparo é uma escolha independente. Requisições repetidas/antigas não consomem outra fonte.

Atualização, perda de foco e limpeza visual não enviam desistência. A seta só começa depois de commandBusy terminar, evitando a lista involuntária. Cancelar uma jogada inteira com sigilo ocorre ANTES da confirmação; uma magia aberta já confirmada não é desfeita nem apagada da memória do rival. A retirada posterior de magia preparada mantém a regra anterior de devolução/reembolso e não renova o gatilho.

Validação: 27 testes de motor/mira/Entrada/sigilo, 16 verificações Chrome headless com duas perspectivas e motor real em transporte de teste, 11 testes da integração do bot. Resultados em prototype-qa/apprentice-tests.log, apprentice-browser.json e bot-integration-tests.log; captura apprentice-arrow.png inspecionada. O transporte de teste utiliza as mesmas funções act/view, sem criar endpoints de injeção no servidor.

A proteção de igualdade host/bot detectou a mudança de regras no primeiro reinício. Conforme bot/INTEGRATION.md, foram sincronizados exclusivamente game.mjs e combat-triggers.mjs no snapshot local do bot e regenerados os dois hashes; validação e política do bot permanecem ativas. Nenhum arquivo do checkout principal foi alterado. Recarregue a página para obter prototype-3.

QA final após reiniciar o servidor com a revisão 3: 40/40 verificações HTTP/gameplay, zero erros JavaScript. Endereço confirmado HTTP 200: http://127.0.0.1:3086/runamarca/ .

## Revisão 4 — arena, fumaça, registro e revelação progressiva

Corda alinhada ao centro vertical de #lanes, sem mover o painel de ações. Reservas desktop ampliadas para 700×98, com oito cartas medidas integralmente dentro da borda. Patronos desktop 480×64; mão rival afastada para não cobrir o nome. Símbolos Sol/Lua/Estrela no centro de cada zona inteira; retirados os retângulos destacados das meias-zonas. O fundo anterior foi mantido provisoriamente: as novas referências não puderam ser inspecionadas em pixels.

Registro acima do Nartvanyr no desktop e celular. Cada ação tem miniatura apenas se seu nome já consta do texto público e a carta está numa zona pública da resposta do servidor. Ações ocultas recebem ícone genérico. Nenhuma busca por carta escondida ou nome inferido da mão rival.

Fumaça adaptada de uma única consulta autorizada ao Claude Code, apenas com descrição técnica genérica, sem enviar arquivos/imagens do jogo. Resultado em ../smoke-consultation/response.txt. Texturas de ruído com volumes internos são calculadas uma vez e animadas em duas camadas num buffer de meia resolução. Função torch do fogo permaneceu idêntica ao HEAD, verificada por comparação.

Revelação: progressive-reveal.mjs libera posições quando a frente cruza aproximadamente o centro de cada coluna (1/6, 1/2 e 5/6 da abertura). Até lá, o rival e espectadores recebem formation=null nessas posições, sem previsão de magias, golpes, teletransportes ou baixas no payload combat. A própria formação e criaturas já públicas por âncora/sono continuam visíveis. Atualizações de revisão avisam os clientes em cada etapa. Simulação, dano e ordem do combate não mudaram. Snapshot e hashes do bot sincronizados com a nova apresentação de estado, sem desligar validação.

Validação final: 30 testes (revelação, cancelamento Aprendiz, sigilo, mira e integração do bot), 40 verificações HTTP/gameplay e 17 verificações de quadros/layout/registro; zero erros JavaScript. Artefatos internos: revision4-tests.log, result.json, reveal-frames.json, viewport-result.json, reveal-stage-0/1/2/3.png, center-rope.png, history.png, fullhd-1920x900.png e formation-mobile.png. Capturas principais inspecionadas. Headless em 1920×900/960/1000, escala 1, sem rolagem vertical; compras e hover estáveis com nove cartas. Não há benchmark em aparelho físico.

Bloqueios de acesso, sem contorno:
- Library read das referências libfile_7554a76ce2bc81919763ed6fd507b2e5 (image(20261028-235320).png) e libfile_0267d4b498048191ba497a4048b3d96d (image(20261028-235321).png) retornou asset_pointer/OCR, sem imagem renderizada ao executor. Arquivos não estavam nos Downloads.
- Uma navegação nativa ao link oficial de download da primeira referência terminou em net::ERR_BLOCKED_BY_CLIENT. Não repetida; não foi usado HTTP manual ou extração de sessão.
- A tentativa de selecionar a janela Chrome 263248, RunaMarca, terminou em Computer Use app approval timed out. Nenhuma validação da janela normal do usuário foi concluída. Os testes de viewport controlada não são apresentados como substituto dessa verificação.

Pendências: inspeção real das duas novas referências e avaliação final de câmera, iluminação, textura e sombras contra elas; QA em navegador normal após liberar o acesso da ferramenta. Revisão 4 disponível localmente com HTTP 200. Integração principal permanece limpa em d1420a6. Sem commit, push, PR ou publicação.

## Revisão 5 - ambiente conforme descrição visual do parent

O parent inspecionou as duas novas referências em ambiente autorizado e transmitiu sua descrição visual. Essa descrição substituiu o pré-requisito de inspeção local; este executor não viu os pixels dessas duas imagens. Nenhuma nova tentativa de Chrome ou download foi feita. O último acesso ao Chrome foi encerrado pela ferramenta porque ela não conseguiu determinar a URL atual com confiança suficiente para aplicar a política; a janela normal continua sem QA.

Ambiente final desta revisão: madeira quente com veios e juntas, luz lateral, tecido verde-azulado profundo, sombras e borda com relevo, reservas em nichos de madeira e ornamentos discretos nas bordas (livros, velas, pergaminho e objeto de bronze). Assets SVG locais em mesa-nova/prototype-table-ambience.svg e prototype-wood.svg, com composição em board-prototype.css. É uma interpretação estilizada da descrição, não reprodução verificada dos pixels. Em telas menores que 1200px os ornamentos são omitidos para preservar o espaço de interação. Patronos centrais, mãos, reservas, corda, registro e correções de sigilo permanecem. Nenhuma mecânica foi alterada nesta revisão.

Validação desta revisão: scripts/board-prototype-qa-full.cjs terminou com 40/40 verificações e zero erros JavaScript; scripts/board-prototype-viewport.cjs passou com nove cartas, sem rolagem vertical em 1920x900/960/1000, escala 1, e sem deslocamento da arena em compras/hover. SVGs válidos como XML; git diff --check passou. Os 30 testes de motor/sigilo/bot e 17 verificações de revelação/layout da revisão 4 permanecem como evidência anterior, sem nova alteração de motor nesta revisão. Não há scripts separados de build/lint/typecheck.

Evidências atuais em prototype-qa/result.json, viewport-result.json, viewport-run.log, fullhd-1920x900.png, formation-desktop.png e formation-mobile.png. As três capturas foram inspecionadas neste executor; as de formação incluem o diálogo funcional de Provocar. Capturas são internas e não foram enviadas à Library. Headless não equivale a validação da janela normal do usuário nem de aparelho físico. Celular preserva rolagem vertical.

Servidor confirmado HTTP 200 em http://127.0.0.1:3086/runamarca/, entregando prototype-5. Recarregar a página aplica esta revisão. Para reiniciar, executar ABRIR-PROTOTIPO.cmd desta pasta. Integração principal confirmada limpa em d1420a66e4bb431c8ceb374cc527b41a3c76506d. Trabalho apenas na branch prototype/board-perspective-20261028, sem commit, push, PR ou publicação.

### Conferência de encerramento e relação com as referências

Estado conferido após retomar a execução: os arquivos da revisão 5 e seus resultados já existiam; não houve repetição de testes de gameplay. HTTP 200 e marcador prototype-5 reconfirmados. Checkout principal sem mudanças; branch do protótipo mantém alterações locais não commitadas.

Referência 1 (ambiente): implementados madeira quente, veios/juntas, luz lateral, tecido verde-azulado, sombras, livros, velas, pergaminho e objeto de bronze. Folhagem não foi desenhada. A perspectiva continua na superfície trapezoidal e borda frontal existentes; não há câmera/modelo 3D nem inclinação física de todos os cartões/HUD. Materiais e ornamentos são SVG/CSS estilizados. A fidelidade pixel a pixel à referência não foi verificada neste executor.

Referência 2 (distribuição): patronos centrais no topo/base, identidade e éter à esquerda e poderes à direita; prateleiras rival/aliada acima/abaixo do campo; três setores de combate e duas emanações por lado; mãos superior/inferior e painéis laterais. Correções preservadas: nove cartas, reservas sem trilho antigo duplicado, corda central, símbolos no centro do setor, registro acima do Nartvanyr, revelação progressiva e cancelamento da Aprendiz já autorizado. Esta revisão visual não alterou essas regras.

Comandos que produziram as evidências atuais (usando o Node local do runtime):
- node scripts/board-prototype-qa-full.cjs : 40 passaram, 0 falharam, 0 erros JavaScript (result.json).
- node scripts/board-prototype-viewport.cjs : 6 rodadas em 1920x900 e verificações adicionais em 1920x960/1000, todas sem rolagem vertical; hover/compra estáveis e ambas as mãos chegaram a nove (viewport-result.json, viewport-run.log).
- git diff --check : sucesso; aviso de normalização LF/CRLF em app.js.

Testes anteriores da revisão 4, sem nova execução nesta revisão somente visual: 30 passaram/0 falharam no comando node --experimental-vm-modules --test mesa-nova/test-progressive-reveal.mjs mesa-nova/test-apprentice-cancel.mjs mesa-nova/test-public-visibility.mjs mesa-nova/test-targeting-polish.mjs bot/integration.test.mjs (revision4-tests.log); 17 verificações/0 erros em scripts/board-prototype-reveal-frames.mjs (reveal-frames.json). QA da Aprendiz em duas perspectivas: 16 verificações/0 erros (apprentice-browser.json).

Não verificado: janela normal do Chrome com suas barras reais; aparelho móvel físico; comparação direta dos pixels das duas referências novas; benchmark de desempenho em hardware externo. A seleção da janela Chrome foi encerrada pela ferramenta por não conseguir determinar com segurança a URL para aplicação de política; não foi repetida nem contornada. Nenhum outro passo de implementação ficou pendente por esse bloqueio.