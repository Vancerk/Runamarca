# RunaMarca — correções e segunda revisão

Data: 5 de outubro de 2026.

## Resultado

Os 19 achados confirmados da auditoria anterior receberam correções no código, nos dados de orçamento, nos testes ou na documentação. Os 18 cenários isolados que demonstravam as falhas agora verificam o comportamento corrigido e passam. A suíte principal também passa: 30 testes `node:test` no checkout de publicação, mais os scripts de regras, apresentação, interface e regressões do RunaMarca.

Esse resultado cobre os cenários executados; não certifica ausência de qualquer erro. A conferência visual em duas abas não foi concluída: o navegador está na tela de código de acesso. Foi solicitada a entrada do usuário. A habilidade de controle de navegador exige que essa entrada seja feita pelo usuário nesta verificação.

## Correções na ordem da auditoria

| Achado | Correção | Verificação |
|---|---|---|
| 01 — Reinício durante a partida | O servidor aceita `reset` apenas após encerramento; limpa formação, mana, fadiga e dados da partida anterior. | A01; reinício fora de fase rejeitado. |
| 02 — Perda de vaga em falha de rede | Erros temporários preservam token e estado; consultas têm prazo de 10 segundos. Sala inexistente e token inválido usam códigos próprios. Reautenticação Discord mantém a vaga e apresenta a mensagem específica. | A09; teste adicional dos códigos permanentes e temporários. |
| 03 — Carta invisível por evento perdido | Retenção ampliada de 30 para 128 eventos, com envio de todo o intervalo retido e metadados de sequência. Cartas novas só aguardam animação se existe seu evento de compra. Lacunas cancelam a fila antiga e recuperam a visibilidade. | A10; testes de compra sem evento e de lacuna. |
| 04 — Lado incorreto de magia preparada | Preparação e reposicionamento compartilham a validação. Proteções e melhorias exigem aliados; ofensivas exigem inimigos. Os controles oferecem os mesmos lados permitidos. Âncora mantém a escolha dos dois lados. | A02 e A03; rejeição sem gastar mana nem tirar a carta da mão. |
| 05 — Vencedor contraditório por fadiga | Compras do grupo de magias preparadas são resolvidas antes de avaliar a vitória. Ambos derrotados resultam em empate; efeitos diretos param após encerramento. | A18; ambos com vida zero e vencedor nulo. |
| 06 — Orçamento desatualizado | `budgetEffects` é derivado das habilidades executáveis nos dois catálogos. Anão Estudioso cobra vida; Bruxa descreve a maldição atual; Olho não cobra cura inexistente. Habilidades antes ausentes têm entradas. | A11; comparação de todos os modelos e cobertura dos efeitos. |
| 07 — Previsões incorretas de atributos | Aplicação e previsão compartilham a transformação de atributos. O ataque previsto usa o cálculo de combate, incluindo ferimento e auras; derrota usa a vida máxima projetada. | A07 e A15. |
| 08 — Bônus permanente sem destaque | O destaque compara o ataque atual com `baseStats.attack`, preservado desde a criação da instância. | A16; atualização numérica e classe verde. |
| 09 — Vida temporária no descarte | Vida temporária é removida antes de enviar os derrotados ao Nartvanyr, preservando sua condição de derrotados. Também são limpos ataque temporário, sono, âncora e estado de provocação dos mortos. | A06; testes de Barreira e descarte existentes. |
| 10 — Apenas uma Revelação | Todas as Revelações válidas são executadas. A sequência visual é construída a partir das habilidades que realmente resolveram, identificando cada efeito separadamente. | A05; dois bônus somados e dois eventos de previsão. |
| 11 — Ficha de ataque zero | Valores padrão usam ausência de valor, sem transformar zero em um. | A04; ficha 0/2 continua 0/2. |
| 12 — Bot curando Patrono cheio | O bot considera cura no Patrono somente abaixo da vida máxima; com Patrono cheio pode selecionar criatura ferida. | A08. |
| 13 — Falsa confirmação de armazenamento | Salvar/importar sem IndexedDB informa que os modelos estão apenas na memória e precisam ser exportados. Falhas de transação têm tratamento de cancelamento. | A14; revisão das rotas de importação e gravação. |
| 14 — Essência rejeitada na reimportação | Importação e validação aceitam os mesmos tipos. Projetos históricos com Essência podem ser reabertos; esse tipo não vira uma regra da mesa atual. | A12; opção histórica compatível no seletor. |
| 15 — Histórico pendente após sucesso | Tentativas posteriores atualizam `recording` e a revisão da sala. Resultados atrasados verificam o identificador da partida antes de atualizar seu estado. | A13; teste adicional de gravação atrasada atravessando uma nova partida. |
| 16 — Área aliada subestimada | Bônus em campo aliado consideram até 10 criaturas; dano/redução inimigos mantêm 8 fora da Emanação; preparação/Revelação mantêm 3. | A17; cálculo e limite dos campos de área. |
| 17 — Testes de interface quebrados | Foram atualizados os ambientes simulados de geometria, SVG, animações e coração. `test-ui.mjs`, regressões da auditoria e novos testes de revisão entraram em `npm test`. | Suíte completa com saída sem falhas. |
| 18 — Promessa de automações antigas | A seção de habilidades da mesa anterior foi retirada da interface atual. Os campos antigos são preservados para compatibilidade. O criador explica que a importação na mesa aplica apresentação; regras e composição vêm do catálogo. | Revisão de HTML, formulário, importação e documentação. |
| 19 — Documentação antiga | README e LEIA-ME descrevem a mesa atual, cinco decks, 16 de vida, alternância, troca única, raridades, fadiga, sigilo e final de partida. O README antigo foi preservado como documento histórico. | Conferência dos nomes e regras contra o catálogo e o motor. |

## O que a segunda revisão encontrou e corrigiu

- Cancelamento de fila por partida precisava conservar os eventos de abertura da partida nova. A moeda e a mão inicial continuam sendo reproduzidas; os eventos da partida anterior são descartados.
- Esperas de imagem e de animação de transferência/confronto receberam prazo de recuperação; uma animação que não finaliza não mantém a carta presa indefinidamente nesses caminhos.
- Uma gravação de histórico iniciada antes de um reinício poderia marcar a partida seguinte como salva. A atualização agora confere o identificador capturado antes da operação assíncrona.
- O status de gravação precisava incrementar a revisão também na gravação inicial assíncrona, para chegar a clientes que consultam por revisão.
- O carregamento inicial do IndexedDB podia substituir cartas criadas durante a espera. Agora mescla os modelos criados na memória e os persiste.
- A limpeza de vida temporária também ocorre quando a fadiga ou Revelação encerra o combate antecipadamente. Retorno à mão cheia limpa vida temporária antes do descarte.
- Renderizações por ações do rival não fecham automaticamente o zoom nem reiniciam o temporizador narrativo quando a carta ainda existe.
- A classificação de Barreira foi incluída na definição compartilhada de alvo aliado, evitando uma nova rejeição da própria proteção válida.

- A conferência final também identificou continuações de abertura, Banquete e confronto que podiam sobreviver ao reinício. Elas agora verificam a sessão visual após esperas, sem aplicar números nem guardar cartas da partida anterior. Duas regressões adicionais verificam abertura interrompida e Banquete pendente.

- Na conferência do checkout de publicação, faltava um catálogo histórico utilizado por um teste já existente. O arquivo de teste foi incluído para que a suíte funcione também em um checkout novo.

Os testes adicionais cobrem recuperação de sessão, compra sem evento, lacunas de eventos, abertura de partida nova, animação sem finalização, histórico atrasado e sincronização dos catálogos. Nenhum dos antigos erros foi reproduzido novamente nos cenários corrigidos.

## Referência de pontos: limite que continua explícito

Iniciativa, Provocar, Transpassar, crescimento, maldição, Adormecer, retorno à mão, Âncora, Barreira e condições especiais ainda precisam de preços calibrados por projeto e testes de balanceamento. Elas agora aparecem com sua descrição atual como efeitos personalizados sem preço, em vez de serem omitidas ou substituídas por habilidades antigas.

Nesses casos a interface mostra **avaliação incompleta**, soma parcial e saldo sem indicação numérica. Não oferece custo sugerido com base em uma soma incompleta. Não foram inventados novos preços para fazer os decks caberem no orçamento.

Uma comparação com o catálogo publicado confirmou que custos, atributos, habilidades executáveis, textos e quantidades das cartas foram preservados; somente seus metadados de orçamento foram sincronizados. As correções no motor podem mudar resultados de situações antes incorretas. Não foi executada uma nova bateria de balanceamento nesta etapa.

## Pontos que continuam exigindo decisão ou observação

- Sair/ir à arquibancada ainda cancela a mesa e retorna à escolha de decks, sem registrar derrota automática. A regra de desistência precisa ser decidida antes de mudar esse comportamento.
- Provocar permanece passivo durante Sono. A troca inicial ainda pode devolver uma carta recém-embaralhada. Essas regras atuais estão documentadas; não foram tratadas como defeitos sem confirmação.
- Salas continuam em memória, sem política de expiração por inatividade. Reiniciar o servidor remove as partidas. Uma política de retenção é trabalho separado.
- Áudio percebido, movimento em diferentes resoluções e leitura narrativa com dois jogadores reais precisam da conferência visual pendente. Testes simulados não substituem essa observação.

## Executar novamente

Na raiz:

```powershell
$env:NODE_OPTIONS='--preserve-symlinks --preserve-symlinks-main'
npm test
```

As reproduções antigas em `design/auditoria-2026-10-04/reproduzir.mjs` documentam o comportamento defeituoso e não devem ser usadas como teste de sucesso da versão corrigida. As regressões atuais estão em `test/audit-regression.mjs` e `test/review-regression.test.mjs`.

A saída e os hashes dos arquivos revisados estão nesta pasta. O servidor local de conferência está em http://127.0.0.1:3049/runamarca/; foi usado outro processo para preservar o serviço que já ocupava 3048.
