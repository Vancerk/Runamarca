# Laboratório 3D local — versão 1

Abrir http://127.0.0.1:3086/runamarca/lab-3d/index.html . Usa o mesmo servidor isolado da revisão 6; se necessário, executar ABRIR-PROTOTIPO.cmd na raiz da worktree. O tabuleiro jogável permanece em http://127.0.0.1:3086/runamarca/ . Não há publicação.

## O que funciona

Cena independente em WebGL 1, escrita localmente a partir da abordagem do martelo 3D existente. Não havia Three.js/Babylon.js instalado no projeto; nenhuma biblioteca, software ou asset foi baixado/instalado. Nenhum terceiro ou Claude foi usado nesta etapa.

Mesa com espessura, feltro rebaixado, bordas, prateleiras com fundo e remates, cartas com espessura, patronos em arco, gemas, encaixes, livros e vela são malhas reais. A câmera usa matrizes de perspectiva/lookAt; há buffer de profundidade, iluminação em coordenadas do mundo e shadow map de 1024x1024 com quatro amostras. Materiais de madeira e tecido são procedurais. Artes de cartas e retratos usam arquivos locais já existentes; não é um screenshot de fundo nem uma transformação CSS.

Cada lado conserva três casas de combate e duas emanações intercaladas, prateleira até oito, dez gemas e dois poderes representados. A representação dos poderes e painéis nesta cena é simplificada; os comandos completos continuam na revisão 6.

Controles:
- Arrastar o fundo gira a câmera; roda do mouse aproxima. “Câmera e cena” abre controles de inclinação, giro e zoom, com restauração.
- Clique numa carta própria da reserva e arraste para Sol/Lua/Estrela. Seleção e arrasto usam raycasting na mesma câmera que desenha a malha. Esc ou interrupção do gesto cancelam. Botões abaixo da seleção permitem posicionar/retornar sem arrasto.
- Quantidades demonstrativas: 0–8 criaturas e 0–9 cartas na mão. Revelação demonstrativa progressiva, reinício e seleção de objetos públicos.
- Em mobile, enquadramento apresenta a mesa inteira; cartas ficam pequenas na visão geral. Zoom, controles e inspector ajudam a explorar. Ainda não é uma composição final de gameplay mobile.

## Visão de uma sala, sem enviar ações

“Ler minha sala · somente leitura” usa a sessão existente nesta aba e faz GET na rota de estado já existente. Primeiro abrir uma partida no tabuleiro normal e depois navegar ao laboratório na mesma aba. Sem sessão, aparece uma mensagem; não são solicitadas credenciais.

A projeção aceita exclusivamente o estado que o servidor já autorizou para aquela visão: mão própria, dorso da mão rival, reservas públicas, formação própria e somente posições rivais já reveladas. Nenhuma identidade é deduzida de uma posição oculta. A cena não recebe nem inventa o conteúdo secreto ausente da resposta. O QA cobre duas perspectivas e os quatro estágios de revelação. A leitura é atualizada a cada dois segundos; o reinício da demonstração encerra a leitura.

Esse modo desabilita os botões de movimento e o arrasto não emite comandos. Poderes não são ativados, cartas não são pagas e turnos não são encerrados pelo laboratório. A demonstração tem dados e movimentos locais, sem aplicação de regras do motor. Isso não é ainda uma migração do jogo online para 3D.

## QA e desempenho

Comando: Node local do runtime executando `scripts/board-3d-lab-qa.mjs` a partir da raiz da worktree.

Resultado: **62 verificações aprovadas, zero erros JavaScript, zero erros WebGL/console**. Inclui câmera, arrasto por raycasting, cancelamento por Esc, retorno acessível, quantidades 0–8/0–9, viewport sem overflow, mãos enquadradas, importação explícita somente por GET, duas perspectivas em modo somente leitura, formação oculta e revelação 0/1/2/3. A perda de contexto WebGL foi simulada e mostrou orientação de recarga sem alterar o jogo.

Viewports Chrome headless, escala 1: 1280x720, 1440x900, 1920x1080 e 390x844. Capturas reais em `prototype-qa/lab-3d/`, inspecionadas neste executor: `table-1920x1080.png`, `table-1280x720.png`, `table-390x844.png`, `camera-oblique.png`, `private-a/b.png` e `reveal-0/1/2/3.png`. Resultado estruturado `result.json`; log `prototype-qa/lab-3d-run.log`. Não enviados à Library.

Cena demonstrativa medida: 2.416 triângulos, 34 texturas, 67 chamadas de desenho num frame sem recalcular sombras. Shadow map é reutilizado quando só a câmera muda; cena parada não mantém loop contínuo. DPR limitado a 1,5. Buffers antigos são liberados e cache de texturas sem uso é limitado a 160 itens. O ensaio de órbita processou 90 frames em aproximadamente 496 ms; a instrumentação de CPU média indicou 1,15 ms. São medidas de submissão/throughput do ambiente headless, não uma promessa de FPS/GPU nem benchmark de hardware físico.

Verificações sintáticas dos módulos e `git diff --check` passaram. Nenhum arquivo dos 32 preservados da revisão 6 mudou, confirmado por SHA256 contra o snapshot. A suíte completa do jogo não foi repetida, pois esta entrega acrescenta apenas o laboratório e seu QA. Não foi usada a janela bloqueada do Chrome nem aparelho móvel físico.

## Limites e próxima integração

Modelagem intencionalmente simples, com materiais procedurais e modelos de baixa contagem de polígonos; não se alega equivalência à imagem conceitual aprovada. Textos e artes são pequenos no enquadramento geral, sobretudo em mobile; ainda falta um HUD de leitura/detalhe adequado à cena final.

Faltam vincular comandos reais ao raycasting, mapear todos os alvos e magias preparadas, equipamentos, poderes, mão/zoom completo, animações de combate e retorno, som/fumaça/fogo existentes, acessibilidade completa e validação de latência de duas partidas reais. Integração deverá usar o mesmo contrato `act/view`, mantendo validação no servidor e sem construir estado secreto no cliente. Nenhum desses comandos foi ligado neste laboratório, para preservar o jogo atual durante a exploração da câmera e dos modelos.

## Base e reversão

Worktree: `C:/Users/vanxf/Documents/Codex/2026-10-28/task-2/runamarca-board-prototype`, branch `prototype/board-perspective-20261028`, base `d1420a66e4bb431c8ceb374cc527b41a3c76506d`. Revisão 6 preservada em `../revisions/prototype-6-before-3d-lab/`, 32 arquivos e hashes em `snapshot-sha256.json`. Laboratório adicionado em quatro arquivos nesta pasta e um script de QA; nenhuma alteração no index, motor, servidor ou renderer do martelo existente. Para abandonar o laboratório basta voltar ao link do tabuleiro revisão 6. Sem commit, push, PR, merge ou deploy.
