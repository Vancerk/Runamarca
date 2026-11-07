# Runamarca — aplicação da direção audiovisual, 05/11/2026

**Fechamento integrado:** [FECHAMENTO-AUDIOVISUAL-20261105.md](FECHAMENTO-AUDIOVISUAL-20261105.md) registra as correções de conexão/legenda, a repetição da partida real e o roteiro de falas de Marika e Dom. As lacunas e resultados abaixo descrevem esta entrega histórica; consulte o fechamento para o estado posterior.

**Continuidade da interface:** oficina, escolhas, questionário e recuperação foram concluídos na direção quente/azul em [INTERFACE-MATERIAIS-20261105.md](INTERFACE-MATERIAIS-20261105.md). Os resultados desta página permanecem como histórico da primeira aplicação.

**Continuidade visual:** a paleta verde desta entrega foi rejeitada pelo dono. O estudo subsequente e a implementação local mais recente estão em [ESTUDO-MATERIAIS-CONTRASTE-20261105.md](ESTUDO-MATERIAIS-CONTRASTE-20261105.md) e [ACABAMENTO-MESA-20261105.md](ACABAMENTO-MESA-20261105.md). Os resultados abaixo preservam o histórico desta rodada e não representam aprovação artística.

Estado: implementação local das etapas de diagnóstico, sistema visual, aplicação às telas existentes, revisão técnica do áudio e validação integrada. Não houve commit, push, merge ou deploy desta rodada. Aprovação estética e contratação/licença de novos ativos não são resultados de testes automáticos.

Revisão visual: `prototype-qa/direcao-integral-20261105/REVISAR.html`. Abre como arquivo local, com divisória antes/depois, 12 cenas, duas resoluções quando aplicável, vídeo e matriz sonora pesquisável.

## Candidata, fonte e autorização

- Worktree: `C:/Users/vanxf/Documents/Codex/2026-10-28/task-2/runamarca-simplificacao-etapa2`.
- Branch: `codex/amostra-arte-patronos`; HEAD `073429de71be9412442abcd690fe017227434408`, mais as alterações locais inventariadas. A árvore histórica `runamarca-board-prototype` não foi usada para editar.
- Fontes: `C:/Users/vanxf/Downloads/REPASSE-ORQUESTRADOR.txt`; notas “Runamarca - plano mestre audiovisual”, “Runamarca - direcao de arte e interface”, “Runamarca - direcao sonora e auditoria” e “Runamarca - curadoria Epidemic Sound”, no segundo cérebro; matriz original `decisoes-por-efeito.csv`.
- Pedido atual: seguir todas as etapas sem interromper a cada bloco. Isso autoriza continuar a implementação local, superando a pausa intermediária do TXT. Não transforma hipóteses do estudo nem propostas antigas em decisões estéticas já aprovadas.
- A entrega anterior foi parcial, como registrado em `DIRECAO-ARTE-AMOSTRA-20261105.md`. Esta rodada acrescenta o sistema de arte comum e sua aplicação; não renomeia aquela amostra como se ela já tivesse feito tudo.

## Base da comparação

O “antes” é o estado exato congelado no começo desta rodada (`source-before/` e `before-hashes.json`), com a amostra anterior já aplicada. Inclui moeda espessa, folgas das mãos, queima longa, Provocar espacial, custos por afinidade e foco nos Patronos. O harness entrega esses arquivos com MIME correto sem reverter a árvore de trabalho. `before-complete/report.json` registra hashes efetivamente servidos. As capturas finais estão em `after-final-2/`; preparação, formação, impacto e resultado também estão em `scenes-before/` e `scenes-after/`.

As capturas usam Edge, DPR 1, 1920×1080 e 1366×768, com rede externa bloqueada nos dois lados. Na oficina antiga, o pedido de Google Fonts podia cair no fallback; agora o CSS usa fontes locais. Portanto essa comparação inclui a correção de disponibilidade da fonte, além das cores e dos controles. A comparação não é com o site publicado.

Preservados: câmera vertical de 0°, foco de 400 ms, leque da mão, destinos e momento do dano, sigilo, ritmo de combate, mira, luz ortográfica padrão e sincronização `readPixels` com suas métricas. Não há novo trabalho de adaptação a celular. A folga de aproximadamente 24,7 px entre mão e Patrono, nos dois lados em Full HD, permanece. A redução anterior das cartas do campo, aceita pelo dono, não foi reaplicada.

## Diagnóstico e mudanças

Os fatos observados são as diferenças de arquivos, as capturas e os resultados dos testes citados. “Mais calmo”, “mais legível” e “menos competição” descrevem a intenção artística para avaliação do dono, não métricas universais de qualidade.

| ID / prioridade | Problema e evidência | Aplicação e motivo | Aceite técnico e comparação |
|---|---|---|---|
| D01 · P1 | Madeira de alta frequência, ouro e filetes fortes em quase toda a mesa competiam com cartas; comparar `1920-mesa`. | Tokens de materiais em `hybrid/art-direction.js`; menos contraste do veio/feltro, metal fosco, painéis escuros e bordas menores. Estrutura recebe menos destaque que peças e interação. | Geometria, recuperação WebGL e movimento passam. Mesma cena antes/depois em duas telas; aparência sujeita à revisão visual. |
| D02 · P1 | Cantos e contornos pesados diminuíam o respiro entre tabuleiro e painéis. | Um filete discreto em vez do contorno duplo; lábio do campo 0,25 → 0,16 e altura 0,12 → 0,085 em unidades do mundo. Folgas dos painéis 2,4/0,85 → 6/5. | Mão, peças e controles continuam alcançáveis; nenhuma nova redução das cartas para obter esse espaço. |
| D03 · P1 | Entrada, decks, diálogos e oficina tinham superfícies e tipografia inconsistentes. | `art-direction.css`: paleta única, DM Sans para controles, Cinzel para títulos/inscrições, regras de foco, botões e erro. Mantém artes, afinidades e a composição própria dos baralhos. | Entrada válida/inválida, lobby, inspeção, menu e oficina capturados em 1920 e 1366; telas 20/20. |
| D04 · P1 | Oficina dependia de fontes externas e tinha texto pequeno e botões desativados com contraste fraco. | Fontes locais, controles de 14 px, instruções de 13 px, superfícies e estados coerentes. | Fontes realmente carregadas; prévia e controles íntegros nas duas telas. Não reescreve o formato de deck nem inventa cartas. |
| D05 · P1 | Menu oferecia silêncio de música/ambiente, mas não controle explícito de efeitos e voz. | Quatro volumes e silêncio geral que preserva níveis; efeitos e vozes persistidos separadamente. Legendas permanecem com voz muda. | Preferências, silenciar/restaurar e recarregar passam no navegador; 49 testes de áudio/voz/música passam. |
| D06 · P1 | O limite de 16 sons não garantia espaço a turno/contato; cues diferentes compartilhavam a mesma gravação. | Prioridade de informação e limite por URL; um sinal prioritário pode substituir uma cauda decorativa com fade de 25 ms. Mantém no máximo 16 sons ativos e quatro caudas curtas de troca. | Testes de saturação, prioridade, compartilhamento e áudio frio. Nenhum som atrasado substitui o contato perdido por carregamento. |
| D07 · P1 | Estados transitórios reutilizavam caudas de vários segundos. | Doze limites de cauda por família, com fade; estado persistente continua representado visualmente. Gravação, ganho, velocidade e início permanecem. | 109 cues reconciliadas com 38 arquivos decodificados. Antes/depois de duração na matriz. Timbre e fadiga exigem escuta. |
| D08 · P1 | A consulta ampliada podia aparecer antes de ocultar sua origem; duas execuções de interação pararam nesse intervalo. | `hybrid/hand.js` posiciona a consulta e esconde a origem na mesma chamada, sem aguardar outro quadro. | Sonda antes/depois: ao sair de `showHover`, a base estava visível com `concealed:null`; candidata já tem o UID ocultado. Interação final 145/145, sem afrouxar espera/asserção. |

Os complementos anteriores A01–A07 foram preservados e revalidados: moeda de 30 px de espessura e 96 segmentos, queima nominal de 3.100 ms, cores do custo por afinidade, opções espaciais de Provocar, estrelas/tiro/resultado e foco de emissão luminosa. Continuam documentados separadamente para não atribuir à rodada atual trabalho já entregue.

## Regras reutilizáveis

- **Três planos:** ambiente sustenta; peças identificam; interação destaca. Não usar brilho dourado igualmente em toda a estrutura.
- **UI em sRGB:** fundo `#151A17`, painel `#202720`, texto `#EFE6D3`, secundário `#B7B7A6`, metal `#D3B477`, foco `#A2E3DF`. As cores WebGL em `art-direction.js` são valores lineares; não copiar números entre CSS e shader como se fossem o mesmo espaço.
- **Texto:** fonte simples em instrução, custo e controle; Cinzel em inscrições curtas; arte e tipografia das faces aprovadas preservadas. Fontes locais na mesa e na oficina. Nenhum bitmap de carta foi reduzido para ganhar desempenho nesta rodada.
- **Materiais:** madeira e tecido com detalhe menos contrastado sob a informação; metal discreto na estrutura. As peças continuam com sua própria arte.
- **Luz:** mantém a luz padrão aprovada. Emissão mágica é temporária, sem somar escurecimentos. A máscara da amostra limita opacidade a 0,48, mantém origem/alvo legíveis, não captura cliques e se desfaz na saída. Movimento reduzido remove o pulso.
- **Movimento:** preserva preparação, viagem, contato, consequência e repouso. A mudança desta rodada no hover remove um quadro inconsistente; não acelera todo o combate.
- **Som:** alerta/contato tem prioridade sobre decoração; persistência não exige cauda sonora permanente; voz e música retêm suas gravações e regras existentes. Silenciar não remove o equivalente visual.

## Cobertura das 18 áreas do plano

“Aplicado” significa que há mudança de apresentação nesta rodada ou na amostra preservada. “Preservado/verificado” não significa redesenho. Lacunas de conteúdo e auditoria perceptiva aparecem explicitamente.

| Área | Estado e evidência | Limite real |
|---|---|---|
| Site público / primeira impressão | Entrada de Runamarca e chamada principal receberam o sistema visual. | Portal geral Elysium, compartilhado com outros jogos, não foi redesenhado. Não se declara uma nova landing page pública ou campanha. |
| Conta, entrada e conexão | Erro do formulário, menu/estado de conta e recuperação visual; autenticação real isolada 18/18. | OAuth real do Discord e dados do perfil de produção não foram usados. O teste automatizado de contas usa seu ambiente simulado. |
| Lobby e escolha | Fundo, hierarquia, legenda, ações e estados recebem tokens; baralhos/artes preservados. | Sem nova ilustração de Patrono ou capa. |
| Coleção, oficina e recompensas | Oficina com fontes locais, superfícies e controles; resultado de recompensa preservado. | Não cria economia, coleção online nova ou integração de regras que o editor não possuía. |
| Abertura e mulligan | Moeda com espessura, composição e instruções; abertura exercitada nas transferências e partida real. | Falas e velocidade de distribuição preservadas. |
| Mão, reserva, campo, Emanação | Folgas, materiais e bordas; geometria, hover e chegadas verificados. | Mantém o encaixe e a rasterização aprovados; não promete leitura de todo texto na miniatura. |
| Recursos e condições | Custos por afinidade e números existentes preservados; superfícies comuns. | Sem redesenhar cada ícone ou cada marca de condição. |
| Fases e tempo | Foco 400 ms, circuito e espera mantidos; controle alcançável nas duas telas. | Não reintroduz contagem visual ou rótulos que o dono mandou remover. |
| Combate | Foco de emissão, hierarquia e som prioritário; 52 verificações de combate. | Dano, alvos, trajetória e duração do motor preservados. |
| Baixas e retorno | Queima longa e arcos/chegadas preservados; transferências 35/35 e chegadas 26/26. | Não substitui cada manifestação de baixa por uma animação nova. |
| Poderes, magias, entidades | Regra comum de luz e escolhas; famílias da amostra mantidas. | Não se afirma que cada poder do catálogo tenha sido capturado individualmente. |
| Inspeção e Registro | Superfícies e texto comuns; corrida do hover corrigida; interação 145/145. | Não reescreve a ordem dos eventos do Registro. |
| Voz e narrativa | Canal/volume próprio, mudo geral e legendas; testes de voz passam. | Lacunas de falas de Marika e cobertura de poderes/resultado de Dom continuam editoriais. Nenhuma dublagem foi inventada. |
| Música e ambiente | Volumes independentes, mudo/restauração e regras do diretor mantidas. Lista esgotada fica explicitamente em pausa musical com ambiente. | Não altera a regra de não repetir música na mesma partida; nenhuma faixa candidata foi adotada sem audição. |
| Vitória, derrota, empate, espectador | Quatro papéis verificados; foco nos dois Patronos e questionário após o fim. Partida real com resposta persistida. | “Aceito tecnicamente” não significa aprovação estética do dono. |
| Configurações e acessibilidade | Quatro canais, silêncio geral, legendas mantidas, foco visível, movimento reduzido. | Não equivale a certificação completa de acessibilidade por leitor de tela. |
| Dispositivos e uso prolongado | Desktop 1920 e 1366; DPR 2 e movimento reduzido nas suítes existentes. | Sem novo port mobile, teste em aparelho físico ou sessão humana prolongada com fones/caixas. |
| Falhas / ausência de recursos | Recuperação WebGL 25/25, retorno e áudio ainda não carregado cobertos; fontes locais. | Queda de rede prolongada e infraestrutura do Render não foram revalidadas nesta revisão de arte. |

## Áudio: o que a matriz comprova

`audio/matriz-109.csv` e `.json`: 109 cues, 21 famílias, 38 arquivos; fonte/ID, parâmetros preservados, duração calculada antes/depois, prioridade, limite de sobreposição, licença e alcance da avaliação. `audio/verificacao.json` contém hashes e decodificação de todos os 38 arquivos. A comparação com Git confirma zero arquivo sonoro alterado.

As caudas limitadas são `ice`, `frost`, `stasis`, `barrier`, `aura`, `curse`, `yin`, `fault`, `silence`, `taunt`, `coating` e `geometry`. As durações efetivas incluem a velocidade do catálogo e respeitam um limite menor passado pelo chamador. A matriz descreve o teto, não a duração observada de todas as chamadas de uma partida.

O catálogo continua completo. Ausência de referência literal não foi usada para excluir áudio. As 21 sugestões externas (três músicas e 18 efeitos) continuam como curadoria; não foram baixadas, ativadas ou declaradas licenciadas. A proveniência de `crowded-tavern` continua registrada como YouTube `KecVJnJcSI4`; esta rodada não certifica os direitos dessa fonte para publicação.

As músicas e vozes atuais não foram substituídas. Timbre, intenção, fadiga, equilíbrio em fones/caixas e lacunas de texto/atuação ainda precisam de avaliação artística. Isso não impede usar localmente os controles e a prioridade implementados, mas impede dizer que a mixagem foi masterizada ou que toda a curadoria foi concluída.

## Validação final

Pasta principal: `prototype-qa/direcao-integral-20261105/`.

| Verificação | Resultado | Evidência |
|---|---:|---|
| Suíte ampla final | 41/41 comandos | `prototype-qa/hybrid-12/suite-direcao-integral-final-livre-20261105.json` |
| Áudio, vozes, música e integração de cues | 49/49 testes | `audio-tests.log`; novo `test-audio-direction` também incluído na suíte ampla |
| Telas, controles e oficina | 20/20 | `after-final-2/report.json` |
| Complementos visuais e resultados | 43/43 | `scenes-after/report.json` |
| Geometria desktop | 41/41 | `regressoes/geometry/geometry.json` |
| Contrato WebGL | 7/7 | `regressoes/webgl/webgl-error.json`; `readPixels` e métricas intactos |
| Interação final | 145/145 | `regressoes-final/interaction/interaction.json` |
| Recuperação gráfica | 25/25 | `regressoes-final/recovery/recovery.json` |
| Movimento / redistribuição | 12/12 | `regressoes-final/motion/motion.json` |
| Transferências / abertura | 35/35 | `regressoes-final/transfers/transfers.json` |
| Compras / retornos | 26/26 | `regressoes-final/arrivals/arrivals.json` |
| Combate | 52/52 | `regressoes-final/combat/b-combat-focal.json` |
| Autenticação de produção local | 18/18 | `prod/auth/s8-prod-auth.json`; repetição de captura em `prod-final/` |
| Bot real até o fim e feedback | 13/13 | `prod/bot/s8-bot-finish.json`; repetição de captura em `prod-final/` |
| Pacote de revisão | 9/9 | `review-check.json`: 40 imagens, 12 cenas, filtro de 109 cues, vídeo de 31,944 s com busca temporal |

Na primeira partida real, o bot venceu na rodada 5, em 60 s, com 16 ações humanas aceitas. O runner controla só o humano; bot, combate, relógios e encerramento seguem o servidor. Um registro de feedback foi persistido, a reconexão não reabriu o formulário e não houve erros de página. Código de acesso e segredo foram aleatórios apenas no ambiente dos processos; não foram gravados em evidências. Sem banco/Discord reais e sem `NODE_ENV=test` nessa instância. O servidor isolado foi encerrado.

A repetição final, após corrigir somente o instante da captura do questionário, também passou 18/18 e 13/13: rodada 5, 68 s e 17 ações humanas aceitas. As imagens legíveis e o resultado final estão em `prod-final/`; a primeira execução permanece como histórico.

Históricos preservados: duas falhas da espera de hover, seguidas da correção e execução final verde; suíte ampla dentro do sandbox com `EACCES` ao conectar no HTTP local, seguida de 41/41 fora dessa restrição. Não se rotulou a falha de ambiente como defeito do produto. A primeira captura do questionário foi feita durante seu fade de 320 ms; o runner agora aguarda opacidade plena antes do print, mantendo as asserções de comportamento.

## Vídeo, desempenho e limites

`video/amostra.mp4`: aproximadamente 32 s, H.264/AAC com busca temporal; 680 quadros de vídeo e 532 blocos de áudio decodificados da captura. Tem preparação, moeda, formação, Provocar, Fulgor, queima e encerramento. Montagem de QA: moeda/queima são chamadas diretas de apresentação, Fulgor usa o motor, resultado parte de estado final preparado. Os sons são os efetivamente capturados da aba; o som de moeda/queima normalmente disparado pelo fluxo de abertura/compra não é acionado pelas chamadas isoladas deste vídeo.

As marcas reais estão em `video/marcos.json`. Não é benchmark de 60 FPS. O pico de amostra decodificado do Opus foi 1,039 (aproximadamente +0,34 dBFS); codec e soma podem alterar picos. Isso não mede true peak, não prova a origem de eventual saturação e não certifica masterização. Não foram normalizados todos os canais a partir desse único número.

Há tarefas longas de reconstrução já conhecidas. Não houve reescrita do renderer nem aumento do mapa de sombra; só constantes de material/textura foram alteradas nele. O ganho artístico esperado é hierarquia, não uma alegação de aumento medido de FPS.

## Revisar, reproduzir e reverter

O comparador abre localmente. Para jogar a candidata, usar `ABRIR-PROTOTIPO.cmd` **nesta worktree** e `http://127.0.0.1:3086/runamarca/`. O alias `/runamarca/hybrid/index.html` usa a mesma mesa 3D. Essa revisão não está publicada no Render.

Na entrega, a prévia 3086 foi iniciada desta worktree e respondeu HTTP 200, inclusive para `art-direction.css`. Armazenamento separado em `prototype-qa/direcao-integral-20261105/preview/store`; logs na mesma pasta. Se o processo encerrar com a sessão ou reinício do computador, o CMD acima o abre novamente.

Comandos principais, na worktree correta:

```powershell
node scripts/art-system-qa.mjs <rotulo-novo>
$env:ART_QA_OUT='prototype-qa/direcao-integral-20261105/<pasta-nova>'
node scripts/art-direction-qa.mjs <rotulo-novo>
node scripts/art-hover-diagnostic.mjs
node scripts/hybrid12-run-suite.mjs <rotulo-novo>
node scripts/presentation-prod-qa.mjs prototype-qa/direcao-integral-20261105/<prod-nova>
```

Os scripts de QA usam portas isoladas e encerram seus servidores. A reprodução exige as dependências locais de Playwright/Edge. `art-audio-audit.py` requer o CSV de origem no segundo cérebro; `art-sample-media.py` usa PyAV/Pillow no runtime local. `art-review-package.mjs` gera o comparador e o inventário a partir das evidências já presentes.

Reversão por bloco: retirar o link de `art-direction.css` e suas alterações de oficina para voltar à UI anterior; restaurar somente as constantes/hunks de `bridge`, `config` e `renderer` pelo snapshot para materiais; remover os canais/limites pelos hunks de áudio se necessário. A correção funcional do hover é independente. Não usar reset da árvore inteira: ela contém a amostra anterior e a simplificação já integrada. `inventario.json` relaciona todos os arquivos alterados, inclusive novos.

Motor confirmado sem mudança: SHA-256 `0ac0d8ca5cc1bdd42d4b997631b301f130cb571c5a75d95812c0e7ac8eaa0644`.

Esta rodada fecha a aplicação local do sistema e sua validação. Ficam explícitos, como trabalho artístico/conteúdo e não implementação silenciosamente omitida: audição comparativa dos candidatos, novas falas/ilustrações, licença de novos ativos e qualquer redesenho do portal geral. A publicação exige uma entrega própria da candidata revista.
