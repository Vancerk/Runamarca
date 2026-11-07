# Runamarca — materiais e contraste após a rejeição da paleta verde

Estado: estudo e amostra isolada; direção nova ainda não aprovada. Data: 05/11/2026.

Continuidade posterior: o pedido “Certo, continue” levou à aplicação local desta paleta e ao acabamento de bordas, painéis, livro e vela. Consulte [ACABAMENTO-MESA-20261105.md](ACABAMENTO-MESA-20261105.md). Este documento preserva o estado histórico da primeira amostra.

## Pedido e correção de rumo

O dono rejeitou a entrega verde e apagada, pediu contraste vivo, profundidade, textura e material, tomando Hearthstone como referência. Também relatou que o comparador virava uma imagem pequena dentro do Codex.

O pacote anterior não estava incompleto: o plano mestre propunha aproveitar o campo verde-azulado existente e reduzir contraste de elementos ociosos. Essa era uma **proposta**, não uma obrigação de paleta. A execução levou a atenuação longe demais: reduziu relevo, variação de textura, brilho de molduras e contraste em várias superfícies. A preferência atual do dono prevalece sobre essa proposta histórica.

## Comparador

- `scripts/art-review-package.mjs`: imagem inicial com endereço e dimensões definidos no HTML; a imagem dá altura ao palco sem depender apenas de posicionamento absoluto/aspect-ratio; estados antes/depois mantêm o tamanho. Funciona sem JavaScript para a cena inicial.
- `scripts/art-review-server.mjs`: servidor somente leitura em `127.0.0.1:3090`, com tipos de conteúdo corretos, caminhos permitidos e suporte a vídeo com Range. Não serve o armazenamento do jogo.
- Histórico: `http://127.0.0.1:3090/`. Estudo: `http://127.0.0.1:3090/estudo/`.
- O comparador histórico foi aberto e operado no **navegador interno do Codex**, com imagem preenchendo a largura do painel. Isso não significa que o visualizador genérico de arquivos locais do aplicativo executará o HTML da mesma forma; a entrega usa a aba de navegador e também oferece comparações estáticas.
- QA HTTP: 10 verificações em larguras 640, 1024 e 1600; 40 imagens, estados, divisória, abertura sem JavaScript, nenhuma falha de página e recusa ao caminho de armazenamento.
- A nova página de estudo passou em 9/9 verificações: 22 imagens, tamanho do palco nas três larguras, troca entre versões, divisória, links e imagem inicial sem JavaScript. Também foi aberta no navegador interno do Codex, com a comparação dividida preenchendo a largura do painel; a aba foi mantida aberta para revisão.

## Evidência de Hearthstone

Foi inspecionado o vídeo fornecido pelo dono: `YTDown.com_YouTube_Media_osK7rxtAGWQ_Hearthstone-Wild-Ranked-Experience-No-Commentary_001_720p.mp4`. Quadros em 00:05, 00:20, 00:33, 01:10, 04:00 e 05:00, com tempos efetivos em `referencia/marcos.json`. É um tabuleiro específico, não uma regra sobre todas as expansões.

Observação visual: centro claro, áreas amplas com pouco detalhe fino; cores fortes e formas volumosas nas bordas; couro/pergaminho, madeira e metal reconhecíveis por luz, desgaste e separação de camadas. O verde mais luminoso identifica ações/cartas disponíveis, sem preencher a superfície central.

O diretor de arte Ben Thompson descreve a fisicalidade como princípio do conjunto: cartas, tabuleiro e interface pertencem ao mesmo mundo, com peso e presença. Isso apoia tratar controles como objetos e não apenas caixas coloridas. Fonte primária: [entrevista com Ben Thompson](https://www.invenglobal.com/articles/1554/how-hearthstones-art-director-ben-thompson-breathed-life-into-hearthstone).

A equipe de efeitos da Blizzard explica a identidade por cor, material e forma; feedback persistente deve ser legível sem ficar pesado, enquanto a intensidade do efeito considera sua importância e frequência. Fonte primária: [Developer Insights: The Art Behind the Science](https://hearthstone.blizzard.com/en-us/news/22552047/developer-insights-the-art-behind-the-science).

Essas fontes orientam decisões de apresentação. Elas não provam os ângulos de câmera, algoritmos de shader ou valores de iluminação internos do Hearthstone. Nenhuma imagem da Blizzard foi incorporada ao produto.

## Tradução para a amostra de Runamarca

| Problema atual | Mudança experimentada | O que observar |
|---|---|---|
| Muitas superfícies escuras com pouca separação | Campo de couro ocre claro, madeira quente e painéis azuis | Peças e controles distinguíveis sem aumentar tudo |
| Molduras com aparência de filete plano | Aro em dois degraus, borda iluminada, contato escuro | Sensação de peça apoiada, sem halo em toda a interface |
| Textura apagada e uniforme | Veio mais visível na madeira, variação ampla e discreta no couro | Material reconhecível sem ruído em cima do texto |
| Entrada parecendo formulário genérico | Reutilização do mural ilustrado já existente, formulário com profundidade | Ligação com o mundo do jogo e leitura das ações |
| Tudo com a mesma intensidade | Cores de afinidade e efeitos preservados | O evento continua tendo mais força que a decoração |

Implementação isolada: `scripts/art-material-variant.mjs` gera quatro overrides em `prototype-qa/direcao-material-20261105/variant/mesa-nova/`. São uma cópia do CSS de arte, tokens de materiais, ponte e renderer, com alterações delimitadas. O navegador do teste serve essas cópias; os arquivos de produção não foram alterados nesta rodada. A imagem de mural é um recurso que já existia no projeto. Câmera vertical, mão, cartas, Patronos, regras, tempos e áudio continuam iguais.

Comparações: preparação, formação, impacto, foco final, resultado, entrada e menu. Impacto e resultado em Full HD; demais estados também em 1366×768. As cenas são montadas por fixtures. O Fulgor é aplicado pelo motor; o resultado final usa estado preparado. Não são uma partida completa gravada.

## Verificação e limites

- Base atual: 14/14 verificações. Amostra final: 17/17, sem erro de página ou de WebGL.
- Geometria da carta, retrato e leque comparada com a base: diferença abaixo de 0,5 px nas duas resoluções. Câmera 0° preservada; controles de formação dentro da tela.
- Quatro overrides efetivamente servidos e registrados por SHA-256. Motor: `0ac0d8ca5cc1bdd42d4b997631b301f130cb571c5a75d95812c0e7ac8eaa0644`.
- A primeira tentativa de shader da **amostra** teve uma substituição textual incompleta; a recuperação 3D foi exibida e a captura foi descartada. Corrigido o gerador e acrescentada exigência explícita de cena 3D pronta. O histórico do erro está em `sample/shader-error.json`; ele não é aprovação visual.
- Após a reinicialização do computador, um relatório e a captura de formação em 1366 px estavam corrompidos. Os arquivos de origem e os hashes do produto permaneciam íntegros. Preservei os arquivos inválidos como `sample/restart-corrupt-*.bin` e repeti a amostra completa, novamente com 17/17. As imagens finais são da execução recuperada.
- Não foi medida fluidez em partida completa nem reexecutada a suíte integral. Os testes desta rodada validam a comparação e a amostra, não aprovam a arte automaticamente.

O resultado ainda não tem a modelagem e a pintura de acabamento dos objetos de referência. Livro e vela continuam simples; os painéis ainda usam formas retangulares e textura procedural. O próximo passe deve construir um painel e uma borda representativos, com metal, relevo e desgaste próprios de Runamarca, antes de replicar o acabamento.

Nada desta rodada foi commitado, enviado ou publicado. O histórico da entrega verde permanece identificado como rejeitado, e a nova proposta fica comparável sem substituir decisões do dono.

## Reproduzir

```powershell
node scripts/art-material-variant.mjs
node scripts/art-material-qa.mjs baseline
node scripts/art-material-qa.mjs sample
node scripts/art-material-review.mjs
node scripts/art-review-server.mjs
```

Com o servidor de revisão ativo, `node scripts/art-review-browser-check.mjs` confere o comparador histórico e `node scripts/art-material-review-check.mjs` confere o estudo novo.

O QA usa Edge e servidor temporário na porta 3091, encerrado ao final. A revisão usa 3090 e precisa permanecer em execução para o endereço local responder. As folhas JPG podem ser abertas sem servidor.
