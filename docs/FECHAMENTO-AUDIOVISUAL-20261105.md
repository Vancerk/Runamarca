# Runamarca — fechamento da revisão audiovisual local

Continuação da direção de materiais da mesa e da interface. Este passe corrige duas falhas de apresentação, entrega o roteiro de vozes solicitado e verifica a candidata integrada. Mantém madeira quente, couro claro, bronze e azul profundo; câmera vertical, foco de 400 ms, mão, regras e ritmo ficam como estavam.

## Mudanças deste passe

**Conexão:** o aviso antigo desaparecia em 3,5 segundos, embora a conexão continuasse indisponível. O novo aviso permanece, explica que a mesa mostra o último estado recebido e oferece “Tentar agora”. Usa a consulta existente; não reenvia jogadas. Na recuperação, confirma a sincronização, devolve o foco ao Menu e sai após 2,2 segundos. Sair ou trocar de sala limpa o aviso. Uma resposta de falha atrasada da sala anterior também deixa de marcar a sala nova como desconectada. Não há duplicação entre o aviso persistente e a notificação antiga.

**Legendas:** uma fala de poder selecionada com texto conhecido continua legível se o contexto de áudio estiver suspenso, a gravação estiver ausente ou o arquivo falhar. O fallback usa a duração textual cadastrada, não toca áudio atrasado nem abaixa a música sem haver voz. A saída da partida cancela a legenda. Quando a gravação está disponível, a legenda continua seguindo o relógio do áudio. Cues ausentes ou desativadas não ganham texto inventado. A mudança não cria legendas de resultado onde o chamador não fornecia uma apresentação de legenda.

**Roteiro:** [19 falas de Marika e Dom](ROTEIRO-VOZES-PENDENTES-20261105.md), separando três textos existentes de Marika das 16 propostas novas. Inclui contexto, intenção, metas de duração e mapeamento dos poderes/resultados. Segue o pedido de preservar as vozes atuais. Nenhum áudio nem o manifesto de falas foi substituído.

Arquivos do produto: `app.js`, `index.html`, `art-direction.css`, `patron-voice.js` e o novo `connection-status.js`. O teste de fallback entrou em `test:polish`. `s8-bot-finish.mjs` passou a esperar a decisão do bot na votação para não mandar um voto baseado num estado que o bot acabou de encerrar; a exigência de nenhuma ação humana recusada permanece.

## Validação

| Verificação | Resultado | Evidência |
|---|---:|---|
| Suíte ampla após a implementação | 41/41 comandos | `prototype-qa/hybrid-12/suite-fechamento-audiovisual-final-20261105.json` |
| Vozes: fallback novo e contratos existentes | 13/13 | `voice-after.log` |
| Cliente real: falha de conexão, recuperação, troca de sala e legendas sem áudio | 20/20 | `final-r2/resilience.json` |
| Complementos visuais, foco luminoso, resultados, movimento reduzido | 43/43 | `visual-final/report.json` |
| Login pelo formulário de produção local | 18/18 | `prod-final/auth/s8-prod-auth.json` |
| Partida completa com bot automático e feedback | 13/13 | `prod-final/bot/s8-bot-finish.json` |
| Comparador e arquivos da prévia | 12/12 | `prototype-qa/interface-material-20261105/fechamento-final-r2/checks.json` |

As evidências sem prefixo ficam em `prototype-qa/fechamento-audiovisual-20261105/`. Após a última alteração, que evita a notificação duplicada de conexão, repetiram-se o teste focal de navegador e os testes de layout, UI e fallback (`focal-final.log`). A suíte ampla não foi executada novamente por essa alteração localizada.

A partida real terminou na rodada 5 em 51 segundos, com o bot vencedor, humano em −1 e bot em 16 de vida. Todas as ações humanas foram aceitas. O bot foi agendado pelo servidor normal; o runner não usou seu token nem forçou vida, dano ou fim de partida. Encerramento, questionário, envio 201, único registro humano e reconexão sem reabertura passaram. O armazenamento foi local e isolado; não é uma prova do PostgreSQL ou do Render.

Desktop: 1920×1080 e 1366×768 nas cenas; o runner de partida real usa 1440×900. As medidas de desempenho incidentais da bateria visual não são um benchmark: parte da suíte Node estava rodando simultaneamente. Não há nova promessa de 60 FPS nem novo port de celular.

## Histórico de falhas preservado

- `before/resilience.json`: 6/16 antes da correção. O cliente mantinha a vaga, mas não o aviso, e aceitava uma falha tardia da sala anterior. `after/`: 16/16 após corrigir a rede. `final/`: 20/20 com as quatro verificações de legenda acrescentadas. `final-r2/`: 20/20 com aviso único e captura da legenda após a entrada.
- `voice-before.log`: 3/6 no teste novo. Áudio suspenso, gravação ausente e cancelamento do fallback expunham a falta de legenda. Depois: 6/6 no novo teste e 7/7 dos contratos existentes.
- `visual/`: o servidor iniciou, mas o probe não o alcançou no sandbox. A execução permitida fora do sandbox ficou em `visual-final/`, sem alterar o teste para aprovar a primeira tentativa.
- `prod/`: login 18/18 e partida 12/13. O bot terminou e o feedback persistiu, mas um voto humano chegou depois que o bot já tinha iniciado a formação. O runner foi ajustado à regra existente de que basta um voto positivo; a repetição válida está em `prod-final/`.
- `review.log`: a porta 3090 estava parada. Mesa 3086 e comparador 3090 foram reabertos; a conferência passou em `review-final.log`. As primeiras evidências não foram sobrescritas.

## Continuidade do plano

| Parte | Estado atual |
|---|---|
| Mesa, objetos, materiais e interface | Aplicação local concluída nos passes anteriores e preservada; revisão e comparadores disponíveis. |
| Abertura, moeda, queima, Provocar, luz, resultado e questionário | Implementados anteriormente; 43 verificações e partida real repetidas neste fechamento. |
| Conexão e ausência de áudio | Lacunas encontradas neste passe corrigidas e reproduzidas antes/depois. |
| Falas faltantes | Roteiro entregue. Gravações novas e sua integração dependem das tomadas com as vozes atuais. |
| Músicas/efeitos candidatos | Curadoria anterior preservada; nenhuma faixa externa foi adotada. Audição comparativa e confirmação de uso dos ativos continuam distintas de aprovação técnica. |
| Aprovação visual e sonora | Continua sendo avaliação do dono; contagem de testes não prova satisfação estética nem masterização da mixagem. |
| Publicação | Esta revisão permanece local. Nenhum commit, push, merge ou deploy foi feito neste passe. |

O roteiro resolve a preparação dos textos; não se registra a gravação como concluída. As novas ilustrações e novas faixas anteriormente listadas como sugestões também não foram produzidas silenciosamente. O portal geral de outros jogos, OAuth real do Discord, banco e dados de perfil de produção ficaram fora desta revisão local.

## Abrir a candidata

- Mesa: `http://127.0.0.1:3086/runamarca/` — recarregar a página para carregar os scripts novos.
- Mesa e objetos, antes/depois: `http://127.0.0.1:3090/acabamento/`.
- Interface, antes/depois: `http://127.0.0.1:3090/interface/`. Usa toda a largura do painel e tem modo 100% para inspecionar letras.
- Novas capturas: `final-r2/1920-desconectado.png`, `1366-desconectado.png` e `1920-legenda-sem-audio.png` na pasta deste fechamento.

`manifest.json` registra os hashes da entrega, a correspondência com os arquivos servidos na prévia e a preservação do motor, dos quatro módulos de acabamento 3D e do manifesto de falas. Os inventários antigos continuam históricos.
