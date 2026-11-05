# Mesa 3D — etapa 1 da simplificação

Concluída localmente em 05/11/2026. Base: candidata V26 `324d2d7dd52a271224a43ddaa0cb7649773866be`, do PR #13. Branch independente: `codex/simplificar-apresentacao-etapa1`.

O PR de publicação ainda aguarda a aprovação de outra conta. A autorização posterior do dono permitiu iniciar esta etapa em um checkout separado da candidata congelada. A comparação abaixo é local; não representa a versão atualmente publicada.

## Mudança

Antes, três módulos substituíam `render()` em tempo de execução, e a ponte 3D substituía também `attackSource()` e `attackTarget()`. A ordem dessas substituições determinava quando a mesa era posicionada e quando os efeitos podiam medir as cartas.

Agora `render()` chama uma interface pequena, `RunaPresentation`, com a sequência síncrona:

1. Capturar as posições anteriores necessárias às transições.
2. Atualizar o conteúdo da interface.
3. Projetar a mesa e posicionar os elementos novos.
4. Iniciar os efeitos usando a geometria atualizada.
5. Atualizar os consumidores finais, incluindo música, disponibilidade e foco.

`attackSource()` e `attackTarget()` solicitam explicitamente a geometria atual. Isso também cobre golpes iniciados pelo relógio visual entre revisões do servidor. A ponte só reconstrói nessa solicitação quando há alteração pendente ou mudança da assinatura geométrica. Uma conferência final cobre alterações feitas pelos próprios efeitos.

A sequência não aguarda o término das animações. Uma revisão nova continua podendo ser processada enquanto um efeito anterior está em andamento. Cada atualização mantém os próprios dados de captura, inclusive quando há uma atualização aninhada.

Arquivos principais:

- `mesa-nova/presentation-lifecycle.js`: registro de consumidores, ordem das etapas e solicitação de geometria.
- `mesa-nova/app.js`: separação entre conteúdo e efeitos; consulta explícita de geometria nos golpes.
- `mesa-nova/hybrid/lifecycle.js` e `bridge.js`: consumidor da cena, sem substituir as funções globais acima.
- `mesa-nova/hybrid/flights.js`: usa o momento posterior ao conteúdo para acompanhar chegadas.
- `mesa-nova/hybrid/availability.js` e `music-table.js`: consumidores registrados.
- As duas entradas HTML carregam a interface antes do cliente compartilhado.

O motor, renderer, câmera, tempos de animação, protocolo de rede e política do bot não foram alterados. Permanecem os outros pontos de integração que pertencem às próximas etapas, como compras, retornos e desenho da mão. Não houve novo trabalho de adaptação para celular.

## Verificação

| Verificação | Resultado |
|---|---:|
| Node: novo contrato e caminhos de apresentação afetados, 12 arquivos | 44/44 |
| Comparação da candidata com a etapa 1, Full HD e 1366×768 | 28/28 |
| Duelo, ataque ao Patrono e redirecionamento por Provocar | 21/21 |
| Combate nos dois assentos, Registro aberto, resize, movimento reduzido e saída | 52/52 |
| Mão, hover, compras, cancelamentos, impactos e sigilo | 145/145 |
| Redistribuição da reserva, compras em fila e abertura interrompida | 12/12 |
| Registro recebendo apenas revisões novas do motor | 3/3 |

Total: **44 verificações de Node e 261 de navegador**, sem erros de página nas execuções finais. A suíte inteira do projeto não foi repetida.

Na comparação, os 24 elementos medidos em cada cena mantiveram exatamente as mesmas caixas projetadas, tanto na preparação quanto na formação e nas duas resoluções. As capturas foram inspecionadas. A formação, a espera de confirmação, a saída e a entrada em uma nova partida continuaram funcionando.

Nos golpes, cada cópia saiu da própria face projetada, atingiu o alvo escolhido pelo motor e aplicou o dano no contato, sem alterar a criatura idêntica ao lado. No teste do Registro, a primeira entrada apareceu aos **2889 ms**, depois do confronto que terminou aos **2875 ms**; as entradas futuras ficaram ocultas e não duplicaram na rodada seguinte.

O cliente compartilhado também foi verificado sem o adaptador 3D por uma interceptação exclusiva do teste. Isso não cria uma nova rota pública 2D.

## Custo medido

Mesma cena, Edge headless, DPR 1, 20 atualizações por condição. O teste serviu os arquivos da candidata por interceptação local no “antes” e os arquivos desta etapa no “depois”. Os hashes servidos e as amostras estão no relatório bruto.

| Tela | Mediana de `render()`, antes → depois | p95, antes → depois | Máximo, antes → depois |
|---|---:|---:|---:|
| 1920×1080 | 156,3 → 156,7 ms | 175,6 → 178,3 ms | 193,1 → 219,6 ms |
| 1366×768 | 180,7 → 181,7 ms | 208,3 → 194,8 ms | 211,0 → 202,8 ms |

Em todas as 20 amostras de cada condição houve **uma reconstrução síncrona e duas no total**, contando os dois quadros seguintes. A refatoração não acrescentou uma reconstrução nesse cenário. Não houve ganho mensurável de desempenho; os máximos variaram e continuam existindo tarefas longas. Este ensaio não mede FPS contínuo nem certifica fluidez da partida inteira. Os números não devem ser comparados diretamente com cenas e execuções anteriores diferentes.

## Reproduzir

`scripts/presentation-stage1-qa.mjs` inicia um servidor de QA em `127.0.0.1:3094`, executa o caso e encerra o servidor. Usa Edge por padrão; `QA_BROWSER` permite informar outro executável. O argumento final escolhe uma pasta nova para evitar sobrescrever evidências.

```powershell
node --test mesa-nova/test-presentation-lifecycle.mjs
node scripts/presentation-stage1-qa.mjs comparison prototype-qa/minha-etapa1
node scripts/presentation-stage1-qa.mjs strikes prototype-qa/minha-etapa1
node scripts/presentation-stage1-qa.mjs combat prototype-qa/minha-etapa1
node scripts/presentation-stage1-qa.mjs interaction prototype-qa/minha-etapa1
node scripts/presentation-stage1-qa.mjs motion prototype-qa/minha-etapa1
node scripts/presentation-stage1-qa.mjs record prototype-qa/minha-etapa1
```

Os scripts antigos de interação e movimento passaram a respeitar `QA_BROWSER` e `QA_BASE`; suas asserções e tolerâncias permaneceram iguais. O novo teste de contrato integra `npm test`.

## Ambiente e continuidade

O checkout Windows aplicou CRLF a `progressive-reveal.mjs`, enquanto o snapshot do bot usa LF. A comparação de identidade do bot recusou iniciar. O arquivo foi restaurado byte a byte a partir da candidata e ganhou uma regra `eol=lf` em `.gitattributes`, como os demais módulos do motor. Não há alteração de conteúdo nesse arquivo nem no motor. O SHA-256 de `game.mjs` continua `0ac0d8ca5cc1bdd42d4b997631b301f130cb571c5a75d95812c0e7ac8eaa0644`.

Um reinício do computador interrompeu a primeira execução do combate, antes de registrar resultados. Ela foi preservada como interrompida e repetida até 52/52. As execuções concluídas não foram repetidas após o segundo reinício.

Evidências locais: `prototype-qa/simplificacao-etapa1-20261104/` — nome preservado desde o início do trabalho, concluído no dia 5. Inclui logs, JSON, capturas e hashes; dados temporários de QA não entram na publicação.

**Próximo bloco:** etapa 2, unificar o estado visual de cada carta por partida e UID, começando por compra e Evasão/retorno à mão. Depois vêm coordenadas compartilhadas, coordenação das animações e retirada do legado sem consumidores. Essas etapas ainda não estão implementadas. A versão pública depende do fluxo separado de revisão, merge e publicação.
