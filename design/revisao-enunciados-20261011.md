# Revisão dos enunciados de cartas — 11/10/2026

Escopo: texto de regras impresso, explicações de mecânicas da mesa e coerência com o motor atual. Não inclui narrativa nem balões de fala. Padronização aprovada e aplicada em 11/10/2026 aos dois catálogos. As tabelas registram o diagnóstico anterior e a solução aplicada; o apêndice contém os textos finais.

Atualização após o balanceamento: Evasão Dimensional passou a exigir 4 ou mais de ataque e comprar 2 cartas. Essa é uma mudança de regra aplicada, separada das propostas editoriais deste documento. O retorno continua restaurando os atributos impressos e removendo dano/modificadores, salvo exceções explícitas como Engrenauta Persistente. Revestimento impede a devolução, mas não impede a compra descrita na segunda frase. Esses detalhes devem constar nas regras gerais de retorno à mão.

Foram conferidos os 53 modelos únicos dos quatro decks e estoque adicional. Os enunciados de `mesa-nova/cartas.json` e `mesa-nova/criador/prototipo.json` coincidem. As diferenças encontradas estão principalmente entre enunciado, explicação ao passar o mouse e comportamento do motor. Catálogos históricos de testes são registros congelados, não fontes atuais.

Também foi conferido o gerador compartilhado das 27 armas. Ele já omite a repetição de “Equipamento” e do desgaste implícito. Os textos de Iniciativa, Transpassar, bônus enquanto ferido e dano da Lâmina Brutal são coerentes com o motor; não há proposta de reescrita para essas receitas.

## 1. Corrigir primeiro: regras que podem induzir uma decisão errada

| Carta ou local | Problema atual | Proposta ou ação necessária |
|---|---|---|
| **Barreira espectral — explicação ao passar o mouse** | A carta reduz dano de ataques pela metade. A explicação ainda promete **+2 de vida temporária**, regra antiga. | “Por 2 combates, reduz à metade o dano dos ataques inimigos ao ocupante da posição, arredondando para cima.” Manter o enunciado da carta; corrigir a explicação. |
| **Crias Incandescentes** | “Cause 1 de dano ao Patrono alvo” sugere uma seleção. O motor sempre atinge o Patrono inimigo. | **“Último Suspiro — cause 1 de dano ao Patrono inimigo.”** |
| **Aprendiz de Virelion** | O texto não explica que é possível escolher outro alvo caso o primeiro saia de campo antes do disparo. Também precisa ficar claro que jogar uma magia preparada consome o efeito na preparação, sem esperar sua ativação. | **“Entrada — marque uma criatura inimiga. Ao jogar sua próxima magia, cause 1 de dano à criatura marcada. Se ela sair de campo antes do disparo, escolha outra. Uma vez enquanto esta Aprendiz estiver em campo.”** Colocar a regra de magia preparada no glossário de “jogar”. |
| **Fogo Fátuo / Silêncio** | A definição impressa omite a restauração dos atributos originais, a preservação do dano recebido e a devolução de arma à reserva. Pode parecer que Silêncio só remove habilidades. | Carta curta: **“Entrada — silencie uma criatura à sua escolha.”** Definição completa no glossário: remove regras, habilidades, modificadores e encantamentos atuais; restaura atributos impressos sem curar dano; arma volta à reserva. Por solicitação do usuário, a apresentação omite a frase sobre efeitos novos. |
| **Bruxo da Retaliaçãozinha** | Foi encontrada uma divergência: a condição usava o dano depois de Barreira, permitindo acúmulo de uma criatura com ataque 4. O motor foi corrigido durante esta revisão para usar o ataque antes da redução, conforme a regra da carta. | Texto atual está correto mecanicamente após a correção. Apenas compactar: **“Emanação — sempre que uma criatura aliada com 2 ou menos de ataque atacar, acumule 1 Retaliação. A cada 4 acúmulos, consuma-os e cause 1 de dano ao Patrono inimigo.”** |
| **Fulgor Final** | “Não pode ser anulada” está no texto e nos metadados, mas não há atualmente uma mecânica de anulação de dano que utilize essa propriedade. É uma promessa sem diferença prática demonstrável. | Confirmada a intenção de futuros counters. Aplicado: **“Cause 6 de dano a qualquer alvo. Não pode ser anulada.”** Metadados de imunidade preservados. |
| **Provocar — explicação ao passar o mouse** | Não explica que a morte do provocador libera o atacante para seu alvo original. A explicação genérica menciona uma casa adjacente, enquanto Golias permite duas. | Definição: “Pode redirecionar ataques de posições adjacentes para esta criatura. Se ela morrer antes do ataque, o atacante usa o alvo originalmente definido.” Cada carta informa seu limite; João usa o limite padrão de uma casa. |

## 2. Textos longos ou com vocabulário inconsistente

| Carta | O que ajustar | Sugestão de enunciado |
|---|---|---|
| **Drenar Essência** | Repete três vezes as consequências de colisão e exige esclarecer que direita segue a numeração, não a perspectiva do jogador. | **“Prepare em uma posição inimiga. Ao ativar, empurre a criatura revelada uma posição à direita e cause 1 de dano a ela. Se o destino estiver ocupado, ela não se move; cause também 1 de dano ao ocupante. Na última posição, ela não se move.”** Glossário: direita = posição seguinte na numeração. |
| **Geada Implacável** | Uma frase longa mistura os dois modos. “Vida” pode ser confundida com dano. | **“Escolha um — reduza permanentemente em 1 o ataque e a vida de até 3 criaturas aleatórias da reserva inimiga; ou prepare em uma posição inimiga para aplicar essa redução a todas as criaturas inimigas em combate.”** Glossário: reduzir vida reduz o máximo e a vida atual, sem ser dano; Emanação é excluída de área. |
| **Monge Rúnico** | “Ambos os efeitos” pode dar a impressão de que ambos acontecem; a carta permite escolher apenas um. | **“Revelação — escolha um: reduza em 2 o ataque do inimigo à frente; ou conceda +1/+1 ao aliado imediatamente à direita. Apenas neste combate.”** A escolha é feita durante a formação; a Revelação executa o modo escolhido. |
| **v.3.r.0.n.1.c.a** | O tempo de escolha está claro, mas as duas frases grandes tornam difícil comparar os modos. | **“Na formação, escolha um modo para este combate: Assalto — +2 de ataque para esta criatura e +1 para aliados adjacentes; Escolta — +2 de vida para esta criatura e +1 para aliados adjacentes.”** Não omitir a duração. |
| **Ithalion, Mestre dos Selos** | “Revelação — Crie”, com maiúscula após o travessão, difere do padrão; descreve a troca como se sempre houvesse criatura no outro selo. | **“Revelação — escolha uma posição de cada lado e vincule-as com selos enquanto Ithalion estiver vivo. A criatura inimiga revelada no selo troca de lado com o ocupante do outro selo, se houver. As criaturas agem pelo lado de chegada neste combate e depois retornam aos donos.”** Manter os detalhes de propriedade no glossário dos selos. |
| **Olho Flutuante** | “Este Olho”, “posição oposta” e “trava” diferem dos termos das demais cartas; texto extenso para suspensão de ataques e posição. | **“Revelação — esta criatura e o inimigo à frente não atacam neste combate e permanecem nessas posições até o combate seguinte. Nesse combate, atacam normalmente e este efeito não se repete.”** Não abreviar para Ancoragem: também suspende ataques. |
| **Banquete dos Heróis** | “Para cada 2 magias” já expressa a divisão com arredondamento para baixo. O parêntese repete a conta e aumenta o texto. | **“Conceda +1/+1 permanentemente a todas as criaturas aliadas em campo para cada 2 magias no seu Nartvanyr.”** Glossário: inclui Emanação; a magia em resolução não conta para o próprio bônus. |
| **Bruxa da Floresta Negra** | Repete a duração de Corrupção dentro de uma frase longa; usa “inimigo” onde as demais falam “criatura inimiga”. | **“A primeira criatura inimiga que atacar esta criatura recebe Corrupção após o ataque.”** Glossário: perde 1 de ataque permanentemente após esse ataque e cada ataque futuro, mesmo contra outros alvos e após a Bruxa sair de campo. |
| **Bomba Cinética** | “Criatura alvo que você controla” / “criatura alvo do oponente” contrasta com “criatura aliada/inimiga à sua escolha”. | **“Escolha uma criatura aliada e uma inimiga. A aliada causa dano igual ao seu ataque à inimiga.”** Não chamar esse efeito de ataque: não recebe revide nem Transpassar. |
| **Comandante Gnoll** | “Este efeito acontece uma única vez por combate” repete a frequência de Revelação; nome da própria carta ocupa espaço. | **“Revelação — se outra criatura aliada em combate tiver 1 ou menos de ataque, receba +1 de ataque neste combate.”** |
| **Debulhador da Linha de Frente** | “Recebe +1 em Ataque” usa capitalização e forma diferentes; a frase pode parecer um ganho permanente disparado uma vez. O motor usa condição contínua. | **“Enquanto seu Patrono tiver menos da metade da vida máxima, esta criatura tem +1 de ataque.”** |
| **Engrenauta Persistente** | “Uma vez por partida” não deixa tão evidente que o limite pertence a cada criatura, inclusive após retornar à mão. | **“Na primeira vez nesta partida que uma magia inimiga devolver esta criatura à sua mão, conserve seus bônus permanentes de ataque e vida.”** A inversão de atributos não conta como bônus concedido. |
| **Inversor** | “Vida atual” e “vida máxima” são necessários mecanicamente, mas a redação pode ficar mais direta. | **“Troque permanentemente o ataque e a vida atuais de uma criatura à sua escolha. Sua vida máxima se torna o novo valor de vida.”** Regra geral: criatura com 0 de vida morre; não repetir isso em cada carta. |
| **Esteira de Testes** | “Criatura aliada alvo” difere de “aliado à sua escolha” do Mecânico Proativo, embora o efeito seja o mesmo. | **“Conceda Iniciativa a uma criatura aliada à sua escolha.”** |
| **Auramora — estoque** | Maiúscula após “Emanação —” e “recebe” dão aparência de aumento acumulativo, enquanto é uma aura. | **“Emanação — escolha uma posição de combate aliada. A criatura nessa posição tem +1 de vida enquanto esta Emanação estiver ativa.”** |
| **Revestimento Rúnico** | Explicação completa ocupa espaço; “tem esse efeito impedido” pode ser compactado, preservando que a proteção impede o efeito de controle, não necessariamente todos os efeitos da magia. | **“Conceda +1 de vida permanentemente a uma criatura aliada. Impeça o próximo efeito de uma magia inimiga que tentaria adormecê-la, ancorá-la ou devolvê-la à mão.”** Proteção consumida não remove o +1 de vida. |

## 3. Padronização editorial localizada

- **Incursora Furiosa:** espaço duplicado em “Revelação  —” e “Causa” em vez de imperativo. Proposta: **“Revelação — cause 1 de dano à criatura inimiga à frente.”**
- **Engrenauta Defeituoso:** “essa” e futuro passivo contrastam com “esta” e presente das outras cartas. Proposta: **“O primeiro dano recebido por esta criatura é dobrado.”**
- **Atualização:** ordenar duração e destinatário como nas demais: **“Conceda +1/+1 permanentemente a uma criatura aliada.”**
- **Rastreadora:** aura contínua: **“Os outros Tribais aliados têm +1/+1.”** “Recebem” pode ser confundido com aumento permanente.
- **Crias / Corrupção:** Último Suspiro depende de asteriscos manuais para itálico; Corrupção não está na lista automática de mecânicas destacadas. Usar a mesma formatação automática das demais palavras-chave.
- Padronizar **Entrada —**, **Revelação —**, **Emanação —**, com verbo em minúscula após o travessão. Preservar maiúsculas de termos de jogo: Iniciativa, Transpassar, Provocar, Silêncio, Corrupção, Nartvanyr, Patrono.
- **Tem** para aura/condição contínua; **conceda/receba** para ganho aplicado. Usar **neste combate** para duração temporária e **permanentemente** para modificadores que permanecem em campo.

## 4. Explicações que devem existir em um único glossário

- **Silêncio:** definição completa acima, incluindo equipamentos e dano; sem a frase sobre efeitos futuros, conforme solicitado.
- **Corrupção:** perda de ataque após cada ataque realizado, não após dano de magia; origem não precisa sobreviver.
- **Jogar uma magia:** inclui preparar uma magia; não é a mesma coisa que ativá-la durante o combate.
- **Direita / frente / adjacente:** numeração explícita para ambos os jogadores. “Direita” não deve depender de espelhamento de tela.
- **Vida / dano:** redução de vida não é dano; modificadores de vida podem eliminar uma criatura sem consumir efeitos de “primeiro dano”.
- **Reserva / campo / Emanação:** “em campo” inclui Emanação; magias em área e ataques comuns a excluem; alvo individual pode incluí-la.
- **+1/+1:** ataque e vida, nessa ordem. Evita alternar entre descrição extensa e notação abreviada para o mesmo efeito.
- **Ancoragem:** explicar que restringe posição, não suspende ataques; o Olho suspende ataques por regra própria.

## Ordem da aplicação

1. Barreira no glossário, Crias e definição de Silêncio: maior risco de leitura errada.
2. Aprendiz: explicitar o disparo único e a troca de alvo antes do disparo. Retaliação já teve a divergência mecânica corrigida; sua compactação textual foi aplicada.
3. Drenar, Geada, Monge, Ithalion e Olho: reduzir repetição mantendo as exceções necessárias.
4. Ajustes de estilo e formatação restantes.

Não há motivo para reescrever todos os modelos: textos claros como Sintético Próspero, Anão Escudeiro, João Bobão, Toque Gélido, Chamado da Tradição e Projeto Volátil podem permanecer. Os detalhes de retornos à mão, reserva cheia e efeitos simultâneos pertencem às regras gerais, salvo quando uma carta cria uma exceção.

## Apêndice — enunciados atuais conferidos

Abaixo estão somente os textos de regras atuais das cartas mencionadas. Narrativas e falas foram excluídas. Enunciados finais aplicados à mesa e ao criador, com as três exceções solicitadas pelo usuário.

### Barreira espectral

> Prepare em uma posição aliada. Por 2 combates, reduza à metade o dano dos ataques inimigos à criatura nessa posição, arredondando para cima.

### Crias Incandescentes

> Último Suspiro — cause 1 de dano ao Patrono inimigo.

### Aprendiz de Virelion

> Entrada — marque uma criatura inimiga. Ao jogar sua próxima magia, cause 1 de dano à criatura marcada. Se ela sair de campo antes do disparo, escolha outra. Uma vez enquanto esta Aprendiz estiver em campo.

### Fogo Fátuo

> Entrada — silencie uma criatura à sua escolha.

### Bruxo da Retaliaçãozinha

> Emanação — sempre que uma criatura aliada com 2 ou menos de ataque atacar, acumule 1 Retaliação. A cada 4 acúmulos, consuma-os e cause 1 de dano ao Patrono inimigo.

### Fulgor Final

> Cause 6 de dano a qualquer alvo. Não pode ser anulada.

### Drenar Essência

> Prepare em uma posição inimiga. Ao ativar, empurre a criatura revelada uma posição à direita e cause 1 de dano a ela. Se o destino estiver ocupado, ela não se move; cause também 1 de dano ao ocupante. Na última posição, ela não se move.

### Geada Implacável

> Escolha um — reduza permanentemente em 1 o ataque e a vida de até 3 criaturas aleatórias da reserva inimiga; ou prepare em uma posição inimiga para aplicar essa redução a todas as criaturas inimigas em combate.

### Monge Rúnico

> Revelação — escolha um: reduza em 2 o ataque do inimigo à frente; ou conceda +1/+1 ao aliado imediatamente à direita. Apenas neste combate.

### v.3.r.0.n.1.c.a

> Na formação, escolha um modo para este combate: Assalto — +2 de ataque para esta criatura e +1 para aliados adjacentes; Escolta — +2 de vida para esta criatura e +1 para aliados adjacentes.

### Ithalion, Mestre dos Selos

> Revelação — escolha uma posição de cada lado e vincule-as com selos enquanto Ithalion estiver vivo. A criatura inimiga revelada no selo troca de lado com o ocupante do outro selo, se houver. As criaturas agem pelo lado de chegada neste combate e depois retornam aos donos.

### Olho Flutuante

> Revelação — esta criatura e o inimigo à frente não atacam neste combate e permanecem nessas posições até o combate seguinte. Nesse combate, atacam normalmente e este efeito não se repete.

### Banquete dos Heróis

> Conceda +1/+1 permanentemente a todas as criaturas aliadas em campo para cada 2 magias no seu Nartvanyr.

### Bruxa da Floresta Negra

> A primeira criatura inimiga que atacar esta criatura recebe Corrupção após o ataque.

### Bomba Cinética

> Escolha uma criatura aliada e uma inimiga. A aliada causa dano igual ao seu ataque à inimiga.

### Comandante Gnoll

> Revelação — se outra criatura aliada em combate tiver 1 ou menos de ataque, receba +1 de ataque neste combate.

### Debulhador da Linha de Frente

> Enquanto seu Patrono tiver menos da metade da vida máxima, esta criatura tem +1 de ataque.

### Engrenauta Persistente

> Na primeira vez nesta partida que uma magia inimiga devolver esta criatura à sua mão, conserve seus bônus permanentes de ataque e vida.

### Inversor

> Troque permanentemente o ataque e a vida atuais de uma criatura à sua escolha. Sua vida máxima se torna o novo valor de vida.

### Esteira de Testes

> Conceda Iniciativa a uma criatura aliada à sua escolha.

### Auramora

> Emanação — escolha uma posição de combate aliada. A criatura nessa posição tem +1 de vida enquanto esta Emanação estiver ativa.

### Revestimento Rúnico

> Conceda +1 de vida permanentemente a uma criatura aliada. Impeça o próximo efeito de uma magia inimiga que tentaria adormecê-la, ancorá-la ou devolvê-la à mão.

### Incursora Furiosa

> Revelação — cause 1 de dano à criatura inimiga à frente.

### Engrenauta Defeituoso

> O primeiro dano recebido por esta criatura é dobrado.

### Atualização

> Conceda +1/+1 permanentemente a uma criatura aliada.

### Rastreadora da Mata Sussurrante

> Os outros Tribais aliados têm +1/+1.
