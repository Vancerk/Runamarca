# Encaixe e acabamento das superfícies — 05/11/2026

Revisão local do pedido para preservar as cores quentes, corrigir o encaixe do botão “Voltar ao jogo” e substituir a aparência uniforme por detalhes de material. Árvore: `runamarca-simplificacao-etapa2`. Não é publicação nem aprovação artística do dono.

## Estudo visual e aplicação

Foram examinadas as imagens do [menu de opções](https://interfaceingame.com/screenshots/hearthstone-heroes-of-warcraft-options/), do [menu principal](https://interfaceingame.com/screenshots/hearthstone-heroes-of-warcraft-main-menu/) e do [campo com consulta de carta](https://interfaceingame.com/screenshots/hearthstone-heroes-of-warcraft-card-hover/) do Hearthstone, além da biblioteca de componentes publicada pela [artista de UI Kat Korwes](https://katkorwes.com/portfolio/hearthstone/). São referências visuais arquivadas e trabalho publicado pela artista; não estabelecem como o renderer atual do jogo é implementado.

| Observação na referência | Problema no Runamarca | Aplicação nesta rodada |
|---|---|---|
| A borda acompanha o mesmo contorno da face, inclusive nos cantos | Moldura vazada com diversas faixas e um retângulo CSS independente no centro | Botão preenchido em uma única imagem vetorial: face, bisel, contato e espessura juntos |
| O relevo tem uma face iluminada e outra em sombra, sem várias linhas igualmente fortes | Anéis claros e pretos competiam com o texto | Uma borda superior iluminada e uma sombra inferior curta; molduras dos painéis mais estreitas |
| O material varia em escalas diferentes | Gradiente uniforme ou ruído fino distribuído igualmente | Variação ampla de tingimento, pequenas marcas localizadas nas extremidades e grão de baixa intensidade |
| O centro do campo é calmo, mas não homogêneo | Superfície castanha quase lisa | Manchas tonais suaves, marcas de uso e pequenas dobras perto do perímetro; grão fino reduzido |
| O detalhe decorativo tem hierarquia | O foco das escolhas herdava vários anéis e halo amplo | Foco de teclado explícito com contorno simples; selo e papel encaixados no suporte |

Não foram incorporadas imagens do Hearthstone ao produto. Os SVGs são originais, sem texto rasterizado. A paleta de couro, bronze e papel permanece; a face principal foi escurecida dentro da mesma família de cor para preservar o contraste. Textos continuam no DOM com as fontes locais aprovadas.

## Mudanças reais

- `mesa-nova/art-direction.css`: consolidação da seção de materiais, controles com preenchimento e borda unidos, hover sem clareamento da superfície sob a legenda, painéis com menos faixas, papel em rebaixo e correção de precedência dos estados de escolha. Mantidas as áreas de clique.
- `mesa-nova/assets/ui/control-leather.svg`, `control-parchment.svg`, `control-quiet.svg`: três superfícies inteiras que compartilham construção, com papéis distintos para ação principal, opção auxiliar e ação discreta.
- `bronze-frame.svg`: moldura de painéis simplificada; deixa de servir como moldura vazada dos botões.
- `leather-grain.svg`: variação ampla e discreta de tingimento com poros de baixa intensidade.
- `mesa-nova/hybrid/renderer.js`: somente o trecho de material do campo. Marcas em coordenadas do mundo, fixas durante foco e redimensionamento; não há animação nova da textura.

Vela, diário, reservas, disposição das cartas, tipografia das cartas, câmera, regras, tempos e chamadas de sincronização WebGL não foram alterados. O hash do motor continua `0ac0d8ca5cc1bdd42d4b997631b301f130cb571c5a75d95812c0e7ac8eaa0644`.

## Evidências e limites

Pacote: `prototype-qa/encaixe-superficies-20261105/`. Baseline de arquivos exata em `source-before/`; capturas antes em `before/`. O relatório do pacote identifica as capturas finais e as tentativas descartadas.

Os testes usam o cliente real com cenas de QA e comandos aplicados pelo motor local. O questionário usa transporte interceptado para verificar a interface e recuperação de erro; não constitui nova verificação do banco de produção.

A medição A/B do shader usou a mesma árvore, cena e GPU, alternando antes/depois/depois/antes, com 20 reconstruções após aquecimento por condição. Em Full HD, Edge, AMD Radeon RX 9060 XT / ANGLE D3D11:

| Métrica | Antes, duas rodadas | Depois, duas rodadas |
|---|---|---|
| `drawMs`, mediana | 5,5 / 5,4 ms | 5,8 / 5,4 ms |
| `drawMs`, p95 | 6,9 / 5,7 ms | 6,7 / 5,6 ms |
| Construção da ponte, mediana | 13,5 / 13,5 ms | 14,3 / 13,0 ms |

Valores incluem a espera de `readPixels`; não equivalem à taxa de quadros de uma partida completa. A diferença observada é pequena nesta amostra, sem base para prometer desempenho em outras máquinas.

Revisão visual: observar primeiro o botão de retorno em tamanho real, depois menu, votação, escolhas e as áreas livres junto às bordas do campo. O critério artístico é o encaixe e a presença de material sem ruído adicional atrás dos textos.
