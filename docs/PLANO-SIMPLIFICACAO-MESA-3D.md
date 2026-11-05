# Runamarca — simplificação gradual da mesa 3D

Preparado em 05/11/2026. Fonte: pedido do dono para publicar a versão atual e depois planejar a simplificação; leitura do código da candidata `324d2d7dd52a271224a43ddaa0cb7649773866be`, no [PR #13](https://github.com/Vancerk/Runamarca/pull/13).

**Estado em 05/11/2026:** as cinco etapas estão implementadas e a integração final passou, incluindo a partida completa com bot e feedback. O PR #13 da versão V26 foi integrado em `main` (confirmado pela API do GitHub). As simplificações permanecem em PRs dependentes, sem merge ou publicação nesta rodada. O primeiro PR agora aponta para `main`, pois sua base de publicação já foi integrada. Este trabalho não verificou o deploy no Render. O dono autorizou executar todos os blocos em sequência, sem nova parada de aprovação entre eles.

## Resultado pretendido

Ter uma única experiência pública de mesa 3D, com responsabilidades claras para estado, layout, cartas e animações. Reduzir as funções substituídas em tempo de execução, as esperas duplicadas e as reconstruções desnecessárias. Preservar o jogo, a apresentação já aprovada e a nitidez.

Isso não exige desenhar todos os textos e botões em WebGL. HTML, canvas e WebGL podem continuar juntos: textos, controles acessíveis e interação no navegador; volume, materiais e sombras na cena. A simplificação será da ligação entre esses componentes. `pg`, usado pelo banco, não faz parte do problema visual e não será removido por esse motivo.

## O que existia na candidata de referência

Este inventário descreve `324d2d7`, antes da simplificação. Os itens migrados e a situação atual estão nos relatos de cada etapa; não são pendências repetidas.

| Dependência atual | Consequência e evidência |
|---|---|
| `hybrid/lifecycle.js` substitui `render()` e executa a projeção depois da reconstrução do DOM. `bridge.js` também intercepta `attackSource` e `attackTarget`. | A ordem de execução é necessária para o ataque medir a posição projetada. O V4 corrigiu golpes que eram medidos antes disso. |
| `hybrid/flights.js` substitui `command`, `revealArrival`, `presentReturn` e a chegada da abertura. Mantém `pending`, `inserted` e `tokens`, além de `pendingArrival` e `movingCards` no `app.js`. | Há mais de um responsável por esconder, liberar e bloquear a mesma carta. A Evasão Dimensional chegou à mão sem liberar a segunda espera; a correção atual deve ser preservada. |
| `hybrid/hand.js` substitui funções de hover e de desenho da mão; `card-plane.js` acompanha nós DOM e reutiliza amostras por UID. | A recriação dos nós pode perder foco ou reiniciar animações. O reuso da face pintada já eliminou quadros vazios e não pode ser descartado. |
| `bridge.js` lê caixas do DOM, calcula a cena, projeta elementos, reage a observadores e pode reconstruir novamente. | Alinhamento e custo estão ligados. Há trabalho repetido a separar, mas sua quantidade precisa ser medida por evento. |
| O HTML 3D carrega o cliente compartilhado e os módulos de apresentação. | Apagar a pasta antiga ou o `app.js` retiraria funcionalidades ainda usadas pela mesa 3D. |
| A candidata faz `/runamarca/` e os aliases abrirem a entrada 3D. `bridge.js` ainda restaura visual 2D se WebGL falhar. | Tornar 3D o padrão público está separado de retirar esse mecanismo de emergência. A retirada fica para a última etapa, com uma tela de recuperação adequada. |

## Ordem proposta

### 0. Fixar a versão de referência publicada

Concluir a aprovação do PR, merge e publicação. Registrar o SHA realmente retornado por `/api/runamarca/version`, o estado das rotas públicas e o procedimento de reversão. Identificar os resultados como locais ou de produção; o teste local de feedback não prova uma gravação no banco do site.

A árvore de origem tem mudanças anteriores sem commit. A candidata foi montada em `../runamarca-v26-release`; as próximas refatorações devem começar de uma branch nova baseada na versão publicada, sem reaplicar a exportação da árvore antiga.

**Saída:** versão reproduzível e comparação antes/depois usando o mesmo estado, navegador, resolução e escala. Se não for possível recuperar o SHA que estava no site antes da publicação, registrar essa lacuna; `main` anterior não é automaticamente o último deploy real.

### 1. Tornar explícita a sequência de atualização visual

Criar uma interface pequena de apresentação, inicialmente preservando os módulos atuais. O cliente passa a chamar etapas declaradas para atualizar conteúdo, posicionar a mesa e iniciar os efeitos. Migrar primeiro `render()` e a obtenção de origem/destino de golpes; retirar as substituições globais correspondentes quando não houver consumidores.

**Primeiro bloco recomendado:** `app.js`, `hybrid/lifecycle.js` e a integração de ataques no `bridge.js`. Não renomear pastas nem substituir o renderer nesse bloco.

**Aceitação:** os duelos, ataques ao Patrono e redirecionamentos saem da carta correta e atingem o UID correto; dano e Registro mantêm seus instantes; foco, formação, confirmação e nova partida continuam funcionando. Medir quantas projeções cada revisão executa. Não introduzir espera por animação no processamento do estado do servidor.

### 2. Dar um único responsável ao estado visual de cada carta

Centralizar por partida e UID quem está em voo, quem aguarda pintura, qual face está visível e quando a interação fica disponível. Migrar primeiro compra e Evasão/retorno à mão; depois abertura, transferências, baixas e redistribuição dos vizinhos. Cada migração remove as esperas antigas daquele caminho.

As travas de interação devem terminar na chegada ou no cancelamento, inclusive em resize, reconexão e saída da sala. Uma animação antiga não pode liberar ou esconder a carta de uma partida nova. Manter a última face pronta até a substituta estar pintada; conservar o mestre de alta resolução para as animações que ainda o usam.

**Aceitação:** uma face visível por UID, nenhum quadro vazio em pintura atrasada, carta utilizável após Evasão na mesma preparação, compras próprias/rivais com o sigilo correto e nenhuma trava remanescente após cancelar. Executar os testes de continuidade, voos, abertura, Evasão e duplicatas dos caminhos efetivamente migrados.

### 3. Unificar as coordenadas do layout

Dar ao campo, cartas, Emanações, Patronos, painel e Nartvanyr uma fonte compartilhada de posições projetadas. DOM, corpo WebGL, mira e efeitos passam a consultar essa geometria, em vez de redescobrir centros diferentes. Agrupar leituras de tamanho antes das escritas de estilo e reconstruir apenas quando os dados pertinentes mudarem.

Manter a câmera candidata atual e a transição de foco em 400 ms. Alinhamento deve continuar relativo ao que o jogador vê, incluindo DPR e zoom, não só a uma caixa antes da projeção.

**Aceitação:** quatro cartas de Emanação encontradas e medidas em todas as cenas, placas e poderes centrados, arrastos e cliques correspondentes ao visual, pavio alinhado e nenhum corte novo. Desktop 1920×1080 como referência e 1366×768 como compatibilidade. Comparação visual em tamanho real, além das medidas geométricas.

### 4. Coordenar as animações e atualizar só o necessário

Com os estados e destinos unificados, reunir o agendamento e o cancelamento de animações hoje espalhados. A revisão recebida do servidor atualiza o estado; uma fila visual reproduz somente os eventos novos, com relógio e identidade de partida explícitos. Preservar os tempos atuais de compra, impacto, vida, Registro, baixas e encerramento.

Separar componentes estáticos dos que mudaram: uma atualização da vida não deve recriar a mão inteira. Preservar foco de teclado e consultas deliberadas, sem reiniciar o hover a cada revisão. Manter a sincronização de GPU atual até que uma alternativa comprove o mesmo movimento e custo melhor.

**Aceitação:** abertura, escolha de deck, compra, formação, confronto, retorno e fim de partida sem eventos duplicados ou travas; cenário real com bot e dois clientes; perfis antes/depois com p50, p95, maior intervalo e tarefas longas. Não acelerar o motor nem mudar a política do bot como atalho para corrigir apresentação.

### 5. Remover o legado que ficou sem consumidores

Só depois das migrações, levantar imports, scripts HTML, funções, seletores CSS e testes que ainda dependem de cada caminho. Remover por pequenos grupos o desenho exclusivo da antiga entrada 2D, as substituições globais já eliminadas e os estilos redundantes. Consolidar a entrada 3D e a ordem de inicialização.

Antes de retirar o fallback 2D, oferecer tratamento para falha de WebGL: tentativa de recuperação, mensagem compreensível e opção de recarregar/reconectar. A partida continua decidida no servidor. Não deixar tela vazia nem apresentar a antiga mesa 2D como opção de jogo. Nomes como `hybrid` podem ser trocados por último, quando a mudança for apenas organizacional.

**Aceitação:** nenhuma referência ativa a código removido, rotas e convites antigos continuam chegando à mesa 3D, assets e autenticação passam, perda/restauração do contexto WebGL testada e regressão final dos fluxos completos. O que continuar compartilhado não é removido apenas por ter nome antigo.

## Como limitar custo e risco

- Um objetivo por PR, com comparação e reversão próprias. Começar por um fluxo e ampliar depois de validá-lo; não manter duas implementações completas durante toda a migração.
- Usar os testes existentes que exercitam o comportamento alterado. Acrescentar testes quando houver uma falha reproduzida ou contrato novo; evitar testes que dependam de um trecho textual idêntico do código.
- Executar a bateria ampla nos marcos de integração e no fechamento. Não repetir todas as resoluções e animações a cada ajuste local.
- Desktop permanece prioritário. Não iniciar novo trabalho de adaptação para celular nesta simplificação. Isso não equivale a bloquear acesso móvel sem decisão específica.
- Preservar motor, regras, sigilo, sessões, contas, armazenamento e bot. O bot tem testes próprios; uma regressão de agendamento deve ser tratada separadamente da renderização.
- A retirada de funções antigas só ocorre após a troca dos consumidores e a verificação do fluxo correspondente. Reversão é do PR específico; dados do jogo e feedback não são apagados.

## Desempenho: referência e critério

O ensaio local recente de 20 reconstruções, em Full HD/DPR 1, mediu `render()` em **67,9 ms de mediana e 72,2 ms de p95**, com **20 tarefas longas**. É uma cena montada, não uma certificação de fluidez em partida inteira. Fonte: `prototype-qa/revisao-mesa-20261104-r2/README.md` e `comparacao-reuso/medidas.json`.

Cada etapa deve comparar a mesma cena com e sem a mudança e registrar o custo por revisão, o intervalo entre quadros e a latência até a interação voltar. Uma redução de linhas, módulos ou tempo médio não basta se surgirem pausas maiores, texto borrado ou cartas invisíveis. Primeiro fixar a referência em partida real; só então definir metas de desempenho com números representativos.

## Entregas e integração

| Etapa | Entrega | PR |
|---|---|---|
| 1 | Ordem explícita da apresentação e geometria antes dos golpes | [#14](https://github.com/Vancerk/Runamarca/pull/14) |
| 2 | Compras/retornos, abertura/transferências, baixas/redistribuição por partida e UID | [#15](https://github.com/Vancerk/Runamarca/pull/15), [#16](https://github.com/Vancerk/Runamarca/pull/16), [#17](https://github.com/Vancerk/Runamarca/pull/17) |
| 3 | Coordenadas compartilhadas para interação, cartas e efeitos | [#18](https://github.com/Vancerk/Runamarca/pull/18) |
| 4 | Fila cancelável e atualização das regiões que mudaram | [#19](https://github.com/Vancerk/Runamarca/pull/19) |
| 5 | Entrada 3D única, retirada das substituições globais e recuperação de WebGL | [#20](https://github.com/Vancerk/Runamarca/pull/20) |

Relatos: [etapa 2 — baixas](APRESENTACAO-ETAPA-2-BAIXAS.md), [etapa 3](APRESENTACAO-ETAPA-3-GEOMETRIA.md), [etapa 4](APRESENTACAO-ETAPA-4-ATUALIZACOES.md) e [etapa 5](APRESENTACAO-ETAPA-5-ENTRADA-RECUPERACAO.md).

Na comparação da etapa 4, reconstruções por revisão caíram de duas para uma. A mediana de `render()` passou de 73,5 para 49,0 ms em 1920×1080 e de 83,1 para 47,1 ms em 1366×768. São medidas locais da mesma cena, não garantia de 60 FPS em partida inteira.

Os PRs devem ser integrados na ordem #14 → #15 → #16 → #17 → #18 → #19 → #20. Depois de cada merge, o próximo precisa ter `main` como base para seguir a cadeia; não integrar uma etapa posterior diretamente descartando as anteriores. Como cada PR depende do anterior, reverter uma base exige também retirar ou reverter seus dependentes. A base visual V26 continua disponível no commit `324d2d7`.

O próximo marco é revisar e integrar a cadeia, depois realizar uma publicação separada. A validação final teve 41/41 comandos da suíte ampla, 36/36 da comparação visual e geométrica, 25/25 da recuperação WebGL, 18/18 de autenticação e 13/13 da partida real com bot e feedback. A simplificação não remove o banco `pg`, os controles HTML nem as faces canvas que continuam tendo consumidores. Não iniciou novo trabalho de celular e não bloqueou usuários móveis.
