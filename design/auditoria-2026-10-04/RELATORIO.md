# Revisão técnica do RunaMarca

Concluída em 5 de outubro de 2026. Revisão iniciada em 4 de outubro.

## Resumo

Encontrei problemas reais de conexão, validação de jogadas, consistência dos resultados e apresentação. O criador também ficou parcialmente desatualizado em relação às cartas jogáveis. Isso torna pouco confiável usar seu contador de pontos como referência completa dos decks atuais.

Esta revisão reúne **19 achados**, com **18 cenários reproduzidos em isolamento**. Dois achados agrupam mais de uma reprodução; outros foram confirmados por inspeção e execução dos testes existentes. Não alterei código, regras, cartas ou salas em andamento. Não fiz commit nem publicação.

## Como verifiquei

- Examinei o motor atual em `mesa-nova`, combate dirigido, efeitos de Fluxo, interface, animações, renderização das cartas, criador, cálculo de pontos, catálogos, servidor, integração com contas/histórico, testes e scripts recentes de simulação.
- Executei `npm test`: passaram os 22 testes da etapa `node --test` e todos os scripts adicionais incluídos no comando.
- Executei separadamente `mesa-nova/test-ui.mjs`: falhou; ele não faz parte de `npm test`.
- Criei salas e cartas de teste apenas em memória. Algumas reproduções usam cartas com efeitos montados especificamente para testar situações limite; isso é indicado abaixo.
- Comparei os catálogos da mesa e do criador: são iguais. As artes referenciadas pelo catálogo existem.
- Comparei os arquivos principais examinados com o checkout publicado, commit `ac1786b`: não há diferenças. Os problemas descritos atingem essa versão do código; não fiz testes no serviço de produção.

Os testes de interface isolam funções com objetos simulados. Não equivalem a duas pessoas jogando no navegador, nem comprovam qualidade visual ou sincronização de áudio em dispositivos reais. Não testei falhas do Neon real, carga em produção ou desempenho em celulares. Nenhuma revisão elimina a possibilidade de outros erros.

## Prioridade alta

### 01. Um jogador consegue reiniciar uma partida em andamento

**Reprodução A01:** uma ação `reset` durante a formação devolveu a sala ao lobby, sem autorização do outro jogador. O servidor exige dois jogadores, mas não exige que a partida esteja encerrada. O botão aparecer somente ao final não protege a API.

**Impacto:** é possível interromper a partida e apagar seu andamento. O fluxo de histórico registra partidas terminadas; esse reinício não produz um resultado normal de vitória/derrota.

**Proposta:** restringir o reinício ao estado encerrado e tratar abandono separadamente.

Fonte: [game.mjs](/C:/Users/vanxf/OneDrive/Documentos/ChatGPT/RUNAMARCA/mesa-nova/game.mjs:190).

### 02. Uma falha temporária de conexão apaga a vaga do jogador

**Reprodução A09:** uma falha de rede na consulta de estado apagou `runamarca-nova-seat` e zerou o estado da interface. O mesmo tratamento vale para qualquer erro capturado nessa consulta.

**Impacto:** o jogador perde o token necessário para recuperar sua vaga, enquanto o servidor ainda o considera participante. Entrar novamente como jogador durante a partida é recusado.

**Proposta:** preservar a sessão em falhas transitórias, tentar reconectar e distinguir sala inexistente, autenticação inválida e indisponibilidade de rede.

Fonte: [app.js](/C:/Users/vanxf/OneDrive/Documentos/ChatGPT/RUNAMARCA/mesa-nova/app.js:45).

### 03. Perder eventos pode deixar uma carta comprada escondida

**Reprodução A10:** simulei uma atualização em que a carta já estava na mão, mas seu evento de compra havia saído do histórico enviado. A interface marcou a carta como aguardando chegada, sem receber o evento responsável por revelá-la.

O servidor conserva 30 eventos e envia somente os últimos 20. O cliente não recupera lacunas entre os identificadores. A classe `pending-arrival` depende da conclusão da animação de compra ou de uma limpeza específica.

**Impacto:** em uma atualização com eventos perdidos, uma carta pode permanecer invisível. Também podem faltar falas e efeitos. Isso fornece uma causa possível para falhas visuais relatadas, mas não prova que todos os casos anteriores tiveram essa origem.

**Proposta:** detectar lacunas, reconciliar a mão com o estado autoritativo e não deixar a visibilidade depender exclusivamente do histórico de animações.

Fontes: [game.mjs](/C:/Users/vanxf/OneDrive/Documentos/ChatGPT/RUNAMARCA/mesa-nova/game.mjs:311), [app.js](/C:/Users/vanxf/OneDrive/Documentos/ChatGPT/RUNAMARCA/mesa-nova/app.js:41), [fila de eventos](/C:/Users/vanxf/OneDrive/Documentos/ChatGPT/RUNAMARCA/mesa-nova/app.js:373).

### 04. As restrições de lado das magias não são validadas uniformemente

**Reprodução A02:** coloquei Barreira em uma posição aliada e a reposicionei em uma posição inimiga. Foi aceita e concedeu vida ao inimigo, apesar do texto exigir posição aliada.

**Reprodução A03:** preparei Reforço Divino no lado inimigo; concedeu +2/+2 ao rival, apesar de exigir uma criatura aliada.

**Impacto:** pedidos aceitos pela API contradizem os textos das cartas. A colocação inicial de Barreira tem uma proteção específica que não existe no reposicionamento. Nem todas essas rotas precisam estar acessíveis pelos controles normais para serem um erro de validação do servidor.

**Proposta:** usar a mesma definição de alvos permitidos em uso direto, preparação e reposicionamento.

Fontes: [reposicionamento](/C:/Users/vanxf/OneDrive/Documentos/ChatGPT/RUNAMARCA/mesa-nova/game.mjs:214), [preparação](/C:/Users/vanxf/OneDrive/Documentos/ChatGPT/RUNAMARCA/mesa-nova/game.mjs:255).

### 05. Duas compras por fadiga podem produzir um vencedor com Patrono derrotado

**Reprodução A18:** os dois jogadores tinham Patrono com 1 de vida, deck vazio e uma magia de compra preparada. As duas ativaram. Ambos terminaram com 0 de vida, mas o segundo jogador continuou marcado como vencedor.

O primeiro dano encerra a partida; a próxima compra continua causando dano. Depois disso, `checkWin` não reavalia uma partida já encerrada.

**Impacto:** estado final contraditório e possível resultado incorreto no histórico. O resultado depende da ordem interna de processamento.

**Proposta:** definir um único limite de resolução: ou parar os efeitos ao encerrar a partida, ou concluir o grupo simultâneo antes de determinar o vencedor. A escolha entre resolução sequencial e empate nesse caso precisa ser explicitada como regra.

Fontes: [checkWin](/C:/Users/vanxf/OneDrive/Documentos/ChatGPT/RUNAMARCA/mesa-nova/game.mjs:55), [compras preparadas](/C:/Users/vanxf/OneDrive/Documentos/ChatGPT/RUNAMARCA/mesa-nova/game.mjs:144).

### 06. O orçamento de criação não representa as habilidades atuais de várias cartas

**Reprodução A11:** comparei `effects`, usados no jogo, com `budgetEffects`, usados no contador.

| Carta | Incongruência |
|---|---|
| Anão Estudioso | O orçamento ainda chama a Emanação de bônus de ataque; o jogo concede vida. |
| Bruxa da Floresta Negra | O orçamento ainda inclui “Dreno Etéreo”, de 2 de dano; o jogo usa a maldição permanente por alvo. |
| Olho Flutuante | O orçamento ainda inclui cura de Emanação; no jogo está sem habilidades. |
| Monge Rúnico | A redução de ataque não tem entrada no orçamento. |
| João Bobão | Provocar não tem entrada no orçamento. |
| Banquete dos Heróis | O bônus global +2/+2 não tem entrada no orçamento. |
| Evasão Dimensional | Devolver à mão não tem entrada no orçamento. |
| Sono Profundo | Adormecer não tem entrada no orçamento. |

Outras habilidades importadas estão registradas como personalizadas com preço zero. O sistema já mostra avisos para efeitos sem preço e para efeitos ausentes; portanto não se trata de uma validação completa apresentada como garantida. Mesmo assim, os números exibidos não cobrem todos os efeitos, e as descrições antigas induzem a decisões erradas.

**Impacto:** criar ou modificar cartas com base nesses saldos pode cobrar uma habilidade que não existe ou deixar de cobrar uma habilidade importante. Isso não demonstra, por si só, qual custo seria balanceado.

**Proposta:** sincronizar a descrição das habilidades, distinguir orçamento completo de avaliação incompleta e calibrar as habilidades sem preço antes de tratá-las como referência.

Fontes: [catálogo](/C:/Users/vanxf/OneDrive/Documentos/ChatGPT/RUNAMARCA/mesa-nova/cartas.json), [carregamento no criador](/C:/Users/vanxf/OneDrive/Documentos/ChatGPT/RUNAMARCA/mesa-nova/criador/editor.js:547), [cálculo](/C:/Users/vanxf/OneDrive/Documentos/ChatGPT/RUNAMARCA/mesa-nova/criador/budget-model.js:65).

## Prioridade média

### 07. Os atributos enviados para a animação podem divergir do motor

**A07:** após Toque Gélido em um Anão Escudeiro ferido, a previsão da magia enviou ataque 0, mas seu ataque de combate era 1. A fórmula da previsão não inclui o bônus por ferimento.

**A15:** em uma combinação de magias preparadas “derrotar” e +2/+2, a previsão enviou 2 de vida restante para uma criatura que o motor derrotou. Esse segundo cenário usa efeitos montados para o teste.

**Impacto:** números podem mudar para valores incorretos durante a animação e ser corrigidos somente na atualização posterior. A resolução real desses casos e a apresentação são diferentes.

**Proposta:** obter as previsões dos mesmos cálculos de atributos e derrota usados na resolução.

Fonte: [game.mjs](/C:/Users/vanxf/OneDrive/Documentos/ChatGPT/RUNAMARCA/mesa-nova/game.mjs:138).

### 08. Bônus permanentes de ataque podem perder o destaque verde

**A16:** uma carta originalmente com ataque 5, aumentada permanentemente para 7, não recebeu destaque ao exibir 7. A interface usa o ataque já alterado como referência, em vez do atributo original ou da informação do bônus.

**Proposta:** separar valor original, valor atual e modificadores ativos na apresentação.

Fontes: [referência visual](/C:/Users/vanxf/OneDrive/Documentos/ChatGPT/RUNAMARCA/mesa-nova/app.js:64), [atualização](/C:/Users/vanxf/OneDrive/Documentos/ChatGPT/RUNAMARCA/mesa-nova/app.js:19).

### 09. Vida temporária fica presa em cartas derrotadas no Nartvanyr

**A06:** João Bobão, originalmente com 2 de vida, morreu sob Barreira e foi ao descarte com vida máxima 4 e `temporaryHealth: 2`.

As criaturas mortas saem da reserva antes da limpeza de atributos temporários; a limpeza percorre somente a reserva.

**Impacto:** atributos residuais no cemitério. Esse teste não demonstrou um bônus indevido em criatura viva.

Fontes: [remoção dos mortos](/C:/Users/vanxf/OneDrive/Documentos/ChatGPT/RUNAMARCA/mesa-nova/game.mjs:57), [limpeza](/C:/Users/vanxf/OneDrive/Documentos/ChatGPT/RUNAMARCA/mesa-nova/fluxo-effects.mjs:9).

### 10. Uma criatura com duas Revelações executa somente a primeira

**A05:** uma criatura de ataque 1 recebeu duas Revelações, +1 e +2. Entrou no confronto com ataque 2, não 4.

O código busca um efeito com `find`, embora o modelo aceite uma lista. A reprodução usa uma carta montada para o teste; não identifiquei essa combinação nas criaturas atuais.

**Proposta:** executar todos os efeitos válidos ou impedir explicitamente esse modelo de carta no criador.

Fonte: [game.mjs](/C:/Users/vanxf/OneDrive/Documentos/ChatGPT/RUNAMARCA/mesa-nova/game.mjs:151).

### 11. Uma ficha de ataque zero é criada com ataque 1

**A04:** uma Entrada que convocava ficha 0/2 criou uma ficha 1/2. O uso de `attack || 1` trata zero como ausência de valor.

**Impacto:** futuras fichas defensivas teriam atributos diferentes dos configurados. A reprodução não altera as fichas dos decks atuais.

Fonte: [game.mjs](/C:/Users/vanxf/OneDrive/Documentos/ChatGPT/RUNAMARCA/mesa-nova/game.mjs:64).

### 12. O bot pode gastar cura no Patrono com vida cheia

**A08:** com Patrono 16/16 e uma criatura ferida, o bot escolheu curar o Patrono. A condição é `hp <= 16`, o que inclui vida cheia.

**Impacto:** desperdício de recursos no adversário de treino. O bot fácil e os planejadores das baterias são implementações diferentes; esse erro não deve ser atribuído automaticamente aos placares anteriores.

Fonte: [game.mjs](/C:/Users/vanxf/OneDrive/Documentos/ChatGPT/RUNAMARCA/mesa-nova/game.mjs:339).

### 13. O criador informa que guardou uma carta mesmo sem armazenamento

**A14:** com o banco local indisponível, guardar uma carta exibiu “guardada neste navegador”, embora ela só estivesse na memória da página. A inicialização mostra um aviso correto, mas essa confirmação posterior o substitui.

**Impacto:** falsa expectativa de que o trabalho sobreviverá a uma recarga.

Fonte: [editor.js](/C:/Users/vanxf/OneDrive/Documentos/ChatGPT/RUNAMARCA/mesa-nova/criador/editor.js:498).

### 14. O criador aceita Essência, mas rejeita sua própria reimportação

**A12:** uma carta `rune` passou pela validação de criação. Ao reimportar seu JSON, recebeu “Tipo de carta inválido”. A lista de tipos aceitos é diferente nas duas rotas.

**Proposta:** alinhar os formatos aceitos ou retirar esse tipo da interface atual. Sua existência também precisa ser conciliada com o motor atual de mana.

Fontes: [validação](/C:/Users/vanxf/OneDrive/Documentos/ChatGPT/RUNAMARCA/mesa-nova/criador/editor.js:28), [importação](/C:/Users/vanxf/OneDrive/Documentos/ChatGPT/RUNAMARCA/mesa-nova/criador/editor.js:523).

### 15. O histórico pode continuar “pendente” depois de ser salvo

**A13:** simulei uma falha na primeira gravação e sucesso na tentativa automática seguinte. O registro foi enviado novamente com sucesso, mas a sala continuou com `recording: pending`.

**Impacto:** status desatualizado; a reprodução não mostrou perda ou duplicação do registro. A tentativa automática não atualiza o estado da sala nem sua revisão.

Fonte: [accounts.mjs](/C:/Users/vanxf/OneDrive/Documentos/ChatGPT/RUNAMARCA/accounts.mjs:57).

### 16. O máximo de alvos do orçamento não cobre bônus em todo o campo

**A17:** o criador limita área direta a 8 alvos. O campo pode conter 8 criaturas na reserva mais 2 em Emanação. Banquete inclui as duas zonas e pode atingir 10.

**Impacto:** alcance máximo subestimado para efeitos aliados que incluem Emanação. O limite 8 continua apropriado para dano em área que exclui Emanação.

Fontes: [opções de orçamento](/C:/Users/vanxf/OneDrive/Documentos/ChatGPT/RUNAMARCA/mesa-nova/criador/budget-model.js:7), [bônus em área](/C:/Users/vanxf/OneDrive/Documentos/ChatGPT/RUNAMARCA/mesa-nova/game.mjs:63).

### 17. Parte dos testes de interface está quebrada e fora da suíte principal

Executei `test-ui.mjs`: falhou em `ReferenceError: RunaMotion is not defined`. O ambiente simulado não carrega uma dependência que a implementação atual usa. Há também expectativas antigas sobre coordenadas da transição, enquanto a implementação usa transformações.

Esse arquivo não está no comando `npm test`. Os testes de apresentação incluídos são úteis, mas não substituem toda essa cobertura.

**Impacto:** a suíte principal passa sem executar esses testes de seta, transferência e atualização de atributos. A falha do teste não significa que `RunaMotion` esteja ausente do navegador: ele é carregado pelo HTML atual.

Fontes: [teste](/C:/Users/vanxf/OneDrive/Documentos/ChatGPT/RUNAMARCA/mesa-nova/test-ui.mjs:14), [comando principal](/C:/Users/vanxf/OneDrive/Documentos/ChatGPT/RUNAMARCA/package.json:8).

### 18. O criador mantém opções de outra versão do jogo

A seção “Habilidades automáticas da mesa” ainda oferece Ágil, geração de energia ao girar, anexos e outros campos do sistema antigo, dizendo que são efeitos suportados. O motor atual não consome esses campos como regras de cartas.

A importação da mesa atual aplica arte, enquadramento, fala e narrativa a modelos existentes. Não aplica alterações de custo, atributos, quantidade ou habilidades. Essa limitação aparece em parte da interface, mas conflita com a promessa da seção de habilidades automáticas.

**Impacto:** é possível configurar algo acreditando que será executado no RunaMarca atual. A infraestrutura antiga também permanece em `server.js`, com suas próprias rotas de jogo; coexistência não é, por si só, um defeito, mas exige separar os contratos e a documentação.

**Proposta:** tornar explícito o que é apresentação, cálculo de projeto e regra executável; depois decidir o escopo de importação de cartas completas.

Fontes: [criador](/C:/Users/vanxf/OneDrive/Documentos/ChatGPT/RUNAMARCA/mesa-nova/criador/index.html:62), [importação de artes](/C:/Users/vanxf/OneDrive/Documentos/ChatGPT/RUNAMARCA/mesa-nova/app.js:418), [rotas antigas](/C:/Users/vanxf/OneDrive/Documentos/ChatGPT/RUNAMARCA/server.js:665).

## Prioridade baixa

### 19. Os documentos de entrada descrevem regras antigas

`mesa-nova/LEIA-ME.md` ainda diz que o vencedor da moeda escolhe a ordem, descreve cópias 3/2/1, apresenta apenas três decks, orienta duplo clique e informa que a vitória por estrelas está reservada para outra versão. O motor e a interface já foram alterados nesses pontos. O README principal ainda descreve o jogo manual com Runas e mão inicial de sete compras.

Os decks antigos realmente continuam com 24 cartas; isso não é erro de composição. O erro é apresentar essas descrições como orientação geral para a versão atual.

**Proposta:** atualizar as instruções principais e identificar claramente documentos históricos.

Fontes: [LEIA-ME](/C:/Users/vanxf/OneDrive/Documentos/ChatGPT/RUNAMARCA/mesa-nova/LEIA-ME.md:15), [README](/C:/Users/vanxf/OneDrive/Documentos/ChatGPT/RUNAMARCA/README.md:19).

## Pontos que exigem decisão de regra ou investigação adicional

- **Abandono:** sair ou ir à arquibancada durante a partida reinicia a sala. É necessário decidir se isso deve ser desistência registrada, cancelamento ou permitir uma janela de reconexão. Não presumi derrota automática.
- **Fadiga durante efeitos preparados:** o achado 05 exige decidir se as compras desse grupo encerram sequencialmente ou são concluídas antes da avaliação final.
- **Sono e Provocar:** o código impede ataques da criatura adormecida, mas ela ainda pode redirecionar ataques com Provocar. É necessário confirmar se a habilidade passiva continua válida enquanto dorme.
- **Mão inicial:** as cartas devolvidas entram no embaralhamento antes da reposição, portanto a troca pode devolver as mesmas cartas. Essa conduta está documentada; não é automaticamente erro, mas difere de uma troca que garante cartas diferentes.
- **Ciclo de salas:** as salas estão em memória e não têm expiração por inatividade. Fechar a aba não equivale a sair. Isso permite acumular salas e vagas abandonadas; não executei teste de carga para medir o impacto.
- **Animações:** existem esperas de imagens/animações sem o mesmo prazo de segurança usado em `safeFlight`; a fila de efeitos também não tem um identificador de partida para cancelar eventos antigos ao trocar de sala. São caminhos a investigar antes de atribuir a eles os travamentos relatados.
- **Texto narrativo:** toda renderização fecha o zoom e cancela seu temporizador. Uma ação do rival pode interromper a leitura. Convém verificar esse comportamento em uma sessão com dois navegadores.
- **Áudio e geometria:** os testes isolados não substituem observar os dois lados da mesa com rede real, zoom do navegador, resoluções distintas e carregamento frio dos arquivos de áudio.

## O que não apresentou regressão nos testes executados

- Alternância de quem começa ao longo das rodadas e uma troca inicial para cada jogador.
- Patronos com 16 de vida; fadiga exponencial em compras comuns.
- Limites de mão, composição dos decks novos com 30 cartas e cópias por raridade.
- Emanação excluída do limite de reserva e de dano em área inimigo.
- Dano simultâneo dos ataques comuns; Iniciativa resolve antes dos ataques normais no motor dirigido. A exibição de animações em sequência não torna os ataques comuns sequenciais no cálculo.
- Evasão devolvendo com atributos originais, novo pagamento e tratamento de mão cheia.
- Sono mantendo a criatura na posição e expirando conforme os combates previstos.
- Reembolso de magia limitado à preparação e à mana máxima, e expiração das magias de dano em área.
- Proteção da mão rival e das magias ocultas nas respostas de estado examinadas.
- O catálogo da mesa e o do criador estão sincronizados; o problema do achado 06 está dentro dos dados de orçamento, não em duas cópias diferentes do catálogo.

Esses resultados não anulam os casos limite reproduzidos nesta revisão.

## Sobre os resultados de balanceamento anteriores

A última bateria registrada em `testes-2026-10-04-fluxo-controle` terminou com Fluxo 12 e Forja 8. Comparei os hashes: seu catálogo e `game.mjs` são diferentes dos atuais. Os dois módulos auxiliares de combate permanecem iguais.

Esse placar descreve uma versão histórica, não certifica os decks depois das últimas mudanças. Também observei que o planejador recente escolhe cura de Emanação somente entre criaturas feridas, não considera o Patrono para o Elfo, e sua avaliação de Emanação contempla aura de ataque, mas não a nova aura de vida do Anão. Isso precisa entrar na próxima bateria antes de tirar conclusões sobre essas mudanças.

Não rodei outra bateria de balanceamento nesta revisão: primeiro é necessário corrigir as inconsistências aprovadas e atualizar a política de simulação. Alterar custos agora, com base apenas nesses achados, misturaria erros de implementação com decisões de balanceamento.

## Ordem sugerida de correção

1. Preservar a sessão, impedir reinício fora de fase e reconciliar eventos perdidos.
2. Unificar validação de alvos e tornar consistente o encerramento por fadiga.
3. Sincronizar habilidades do orçamento e retirar promessas de automação incompatíveis.
4. Corrigir previsões de atributos, cor dos bônus e limpeza de estados temporários.
5. Corrigir persistência/importação do criador e status do histórico.
6. Recuperar os testes de interface, acrescentar regressões para os casos confirmados e atualizar a documentação.
7. Verificar as correções em dois navegadores e só então repetir o balanceamento com os dados atuais.

## Evidências reproduzíveis

- [Script dos 18 cenários](/C:/Users/vanxf/OneDrive/Documentos/ChatGPT/RUNAMARCA/design/auditoria-2026-10-04/reproduzir.mjs)
- [Resultados estruturados](/C:/Users/vanxf/OneDrive/Documentos/ChatGPT/RUNAMARCA/design/auditoria-2026-10-04/resultados.json)
- [Saída das reproduções](/C:/Users/vanxf/OneDrive/Documentos/ChatGPT/RUNAMARCA/design/auditoria-2026-10-04/reproducoes.txt)
- [Suíte principal](/C:/Users/vanxf/OneDrive/Documentos/ChatGPT/RUNAMARCA/design/auditoria-2026-10-04/testes-principais.txt)
- [Falha do teste de interface](/C:/Users/vanxf/OneDrive/Documentos/ChatGPT/RUNAMARCA/design/auditoria-2026-10-04/teste-ui.txt)

Para repetir as reproduções a partir da raiz do projeto:

```powershell
$env:NODE_OPTIONS='--preserve-symlinks --preserve-symlinks-main'
node design/auditoria-2026-10-04/reproduzir.mjs
```

O script escreve somente seus resultados de auditoria e não se conecta ao servidor ou a salas existentes.
