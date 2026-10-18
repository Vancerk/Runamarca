# RunaMarca — guia para criar a primeira coleção

Data: 03/10/2026. Proposta de trabalho para Van, Vitor e Hector. As quantidades de criação e os limites de efeitos abaixo são metas do primeiro teste, não regras já implementadas nem garantia de equilíbrio.

## 1. Base confirmada e inventário atual

- Deck de 24 cartas. Patrono separado, disponível desde o começo, com 20 HP.
- Mão inicial de 5; uma compra por preparação própria; mão limitada a 9.
- Crescimento de mana na preparação própria, até 10; três posições de combate; duas vagas de emanação.
- Lacaio: até 3 cópias do mesmo modelo. Padrão: até 2. Elite: até 1.
- Esses limites se aplicam a cada modelo, inclusive magias. Não significam apenas três lacaios ou uma elite no deck inteiro.

Inventário consultado: `mesa-nova/cartas.json`. O catálogo ainda declara 24 HP em seus metadados; a partida executada por `mesa-nova/game.mjs` começa com 20. Este guia usa a regra atual de 20.

| Grupo atual | Modelos distintos | Lacaio: modelos / cópias | Padrão: modelos / cópias | Elite: modelos / cópias | Criaturas / magias no deck |
|---|---:|---:|---:|---:|---:|
| Ruptura | 12 | 3 / 9 | 6 / 12 | 3 / 3 | 17 / 7 |
| Fluxo | 12 | 3 / 9 | 6 / 12 | 3 / 3 | 14 / 10 |
| Forja | 12 | 3 / 9 | 6 / 12 | 3 / 3 | 17 / 7 |
| Neutras | 0 | 0 | 0 | 0 | — |

São 36 modelos jogáveis e três Patronos, formando três decks de 24 cartas. As neutras ainda precisam ser criadas e ganhar suporte no editor e na mesa.

## 2. Tamanho da coleção proposta

Criar 60 modelos distintos: 16 de cada energia e 12 neutros. Os 36 modelos existentes podem ser revisados para ocupar esses espaços. Se todos forem reaproveitados, seriam 24 modelos novos. Além disso, conservar três Patronos e criar os modelos auxiliares das criaturas convocadas, quando necessários.

| Grupo | Lacaios | Padrões | Elites | Total de modelos | Criaturas | Magias |
|---|---:|---:|---:|---:|---:|---:|
| Ruptura | 6 | 7 | 3 | 16 | 12 | 4 |
| Fluxo | 6 | 7 | 3 | 16 | 7 | 9 |
| Forja | 6 | 7 | 3 | 16 | 11 | 5 |
| Neutras | 6 | 5 | 1 | 12 | 9 | 3 |
| **Total** | **24** | **26** | **10** | **60** | **39** | **21** |

Distribuição por tipo dentro das raridades:

| Grupo | Lacaios: criaturas / magias | Padrões: criaturas / magias | Elites: criaturas / magias |
|---|---:|---:|---:|
| Ruptura | 6 / 0 | 4 / 3 | 2 / 1 |
| Fluxo | 3 / 3 | 3 / 4 | 1 / 2 |
| Forja | 5 / 1 | 4 / 3 | 2 / 1 |
| Neutras | 5 / 1 | 3 / 2 | 1 / 0 |

Uma carta convocada não ocupa as 24 vagas do deck, mas seu poder entra no orçamento da carta que a convoca.

## 3. Três decks de referência

Montar primeiro um deck de referência para cada energia. Eles servem como comparação para as futuras alterações.

| Deck | Cópias de lacaios | Cópias de padrões | Cópias de elites | Total | Criaturas / magias |
|---|---:|---:|---:|---:|---:|
| Ruptura | 9 | 12 | 3 | 24 | 17 / 7 |
| Fluxo | 9 | 12 | 3 | 24 | 13 / 11 |
| Forja | 9 | 12 | 3 | 24 | 17 / 7 |

Na configuração acima, são três modelos de lacaio com três cópias, seis modelos padrão com duas e três elites diferentes: 12 modelos distintos por deck. Essa composição é uma referência de teste, não uma obrigação permanente de montagem.

Começar com quatro cópias neutras incluídas nas 24, substituindo cartas da energia. Faixa inicial recomendada: três a seis neutras por deck. Não há mínimo nem máximo obrigatório de neutras proposto como regra.

### Curva de mana de referência — contando cópias

| Custo | Ruptura | Fluxo | Forja |
|---|---:|---:|---:|
| 1 | 6 | 3 | 3 |
| 2 | 8 | 5 | 5 |
| 3 | 5 | 6 | 4 |
| 4 | 3 | 4 | 4 |
| 5 | 2 | 3 | 3 |
| 6 | 0 | 2 | 3 |
| 7 ou mais | 0 | 1 | 2 |
| **Total** | **24** | **24** | **24** |

Ruptura tenta converter presença cedo em dano. Fluxo compra opções e controla posições, mas precisa de uma forma concreta de encerrar a partida. Forja deve ter defesa jogável cedo, estabilização no meio e ameaças decisivas no fim. Essas vantagens são tendências desejadas; não devem tornar nenhum confronto perdido automaticamente após certa rodada.

## 4. Papel das raridades

- **Lacaio:** base consistente do deck; efeito simples e fácil de reconhecer. Pode ter habilidade relevante.
- **Padrão:** ferramenta especializada, sinergia ou escolha mais interessante.
- **Elite:** efeito marcante ou finalizador; impacto e condição/custo compatíveis.

Elite não significa mais eficiência em todos os atributos pelo mesmo custo. A raridade limita a consistência, mas não corrige sozinha uma carta exagerada. Antes das trocas iniciais, uma carta com uma cópia tem 20,8% de chance de aparecer entre as cinco iniciais; duas cópias, 38,0%; três, 52,1%. Os valores são hipergeométricos para um deck de 24, sem considerar mulligan.

## 5. Ancestralidades, funções e sinergias

Manter campos separados no desenho da carta:

1. Energia: Ruptura, Fluxo, Forja ou neutra.
2. Tipo: criatura ou magia.
3. Raridade: lacaio, padrão ou elite.
4. Ancestralidade/tipo narrativo: Axiom, Humano, Drakonir etc.
5. Função: Caçador, Clérigo, Engrenauta etc.

Um Axiom pode ser Engrenauta; um efeito que verifica Axiom não deve incluir outras criaturas apenas por terem a função Engrenauta. Usar nomes consistentes em todas as cartas.

### Metas de concentração — contando cópias de criaturas no deck

- Um grupo narrativo principal: 6–9 cópias.
- Um segundo grupo: 3–6 cópias.
- Restante: variedade de criaturas e neutras.
- Na primeira versão, evitar mais de 12 criaturas do mesmo grupo; é uma orientação de teste, não um limite legal de deck.
- Convocados contam na análise da sinergia, mesmo estando fora do deck.

Para a primeira sinergia de um grupo, criar dois modelos de recompensa. No máximo um modelo terá bônus coletivo, incluído em até duas cópias. O outro pode agir sobre um aliado ou exigir uma condição.

Preferir “Revelação: dê +1 de ataque a outro Axiom neste combate” a “Todos os Axioms ganham +1/+1 permanentemente” como ponto de partida. A segunda versão beneficia várias criaturas, aumenta sobrevivência e pode acumular valor entre combates; exige outro custo e outro teste.

## 6. Limites iniciais de efeitos — metas por deck de 24

As fontes incluem criaturas, emanações e magias, inclusive neutras. Não são tetos a somar separadamente para cada categoria. Uma carta multifunção entra em todas as categorias relevantes.

| Função | Ruptura | Fluxo | Forja |
|---|---:|---:|---:|
| Cópias com bônus de ataque | até 6 | até 4 | até 4 |
| Cópias com convocação | até 6 | até 2 | até 2 |
| Cópias com compra adicional | até 2 | até 6 | até 2 |
| Cópias com remoção de um alvo | até 3 | até 4 | até 3 |
| Cópias com dano/remoção em área | 0 inicialmente | até 2 | até 1 |
| Cópias com cura do Patrono | 0 inicialmente | até 2 | até 2 |

Esses valores são tetos de partida para o teste, não quantidades que todo deck precisa preencher. Remoção e cura também competem com criaturas pelas 24 vagas.

### Bônus de ataque

- Criar até dois modelos por energia dedicados a dar +1 de ataque, e um neutro com bônus condicional.
- No deck, aplicar os limites totais da tabela, incluindo as fontes neutras.
- Começar com bônus de +1 temporário; testar até +2 acumulado por criatura no mesmo combate.
- Um efeito coletivo deve começar com apenas +1 de ataque, sem aumento de vida junto, durando um combate.
- Até duas cópias totais de efeitos coletivos de ataque por deck no primeiro teste.
- Emanação recorrente precisa indicar alvo, duração, frequência e possibilidade de acumular. Evitar aumento permanente ilimitado por preparação.

### Convocação

- Ruptura: dois modelos principais, com até seis cópias somadas.
- Começar convocando uma criatura 1/1; uma criatura 2/1 é mais valiosa para pressão e exige custo/condição maior.
- Somar os atributos e habilidades da criatura original e da convocada ao avaliar o custo.
- Não criar convocado que convoca outra criatura nesta primeira coleção.
- Evitar emanação que produz criatura automaticamente em toda rodada sem custo ou condição.

### Compra, remoção e cura

- Compra extra deve pagar mana, atributos ou condição. Se vier como emanação recorrente, pode representar várias cartas ao longo da partida; não tratá-la como uma compra isolada.
- Fluxo: começar com um modelo padrão de dano em área, até duas cópias; testar 2 de dano em dois locais ou 1 nos três. Escolher um alcance antes do teste, sem dar ambas as opções automaticamente.
- Destruir qualquer criatura independentemente de HP não deve ser remoção barata e comum.
- Cura do Patrono: iniciar com até 6 HP somando uma utilização de cada cópia no deck. Evitar cura recorrente do Patrono nesta primeira versão.
- Cura de criatura deve contar também a preservação de seu ataque e de suas habilidades.

## 7. Neutras

Sem energia própria para restringir o Patrono; pagam custo numérico com a mana disponível. Isso é uma regra proposta que ainda requer implementação.

Distribuir as 12 neutras por função:

- Quatro criaturas de presença/defesa, custos 1–3.
- Duas criaturas que ajudam agressão/convocação sob condição.
- Duas criaturas utilitárias para compra ou interação com magias sob condição.
- Uma criatura elite como ameaça alternativa de fim de jogo.
- Uma magia de bônus condicional.
- Uma magia de interação limitada com um alvo.
- Uma magia de utilidade ligada a uma posição.

Uma neutra precisa oferecer uma combinação ou função acessível a diferentes energias. Não precisa ser igualmente boa nas três. Evitar a melhor remoção, a melhor compra ou a melhor cura universal pelo mesmo custo; isso apagaria as escolhas das energias.

## 8. Orçamento e ficha de criação

Como régua provisória, uma criatura simples de custo 2 pode ser 3/2 ou 2/3; custo 3, 3/4 ou 4/3; custo 4, 4/5 ou 5/4. São pontos de comparação para este protótipo, não uma fórmula que comprova equilíbrio. Ataque, vida, emanação protegida e convocação não têm valor linear.

Ao acrescentar uma habilidade relevante, reduzir atributos, aumentar custo ou exigir condição. Avaliar a criatura com a emanação também: são usos alternativos da mesma carta, e a versatilidade tem valor.

Antes de desenhar o PNG, preencher:

| Campo | Pergunta |
|---|---|
| Identidade | Qual energia, raridade, ancestralidade e função? |
| Papel | Pressionar, defender, comprar, remover, apoiar ou finalizar? |
| Custo e atributos | Com qual criatura simples ela deve ser comparada? |
| Gatilho | Ao entrar, na Revelação, durante o combate ou em outro momento? |
| Alvo | Quem pode ser escolhido? Inclui Patrono, emanação ou convocado? |
| Duração | Um combate, uma rodada ou permanente? |
| Frequência | Uma vez, uma vez por rodada ou a cada evento? |
| Acúmulo | Duas cópias podem somar o efeito? |
| Limite | O que acontece quando não há alvo ou espaço? |
| Resposta | Como o rival pode responder à carta? |

## 9. Divisão de trabalho e teste

- Cada pessoa: 16 modelos de uma energia + quatro modelos neutros.
- Coordenar as 12 neutras em uma lista compartilhada para evitar quatro versões da mesma utilidade.
- Desenhar primeiro os 12 modelos necessários a cada deck de referência. Depois preencher as quatro alternativas de cada energia.
- Registrar nome, custo, atributos e efeito em texto antes de produzir a arte final.
- Testar os três confrontos, alternando quem começa e quem pilota cada deck.
- Registrar duração de cada partida, HP restante, rodada final, cartas que ficaram sem uso, bloqueios repetidos e vantagem de quem começou.
- Primeira triagem: seis partidas por confronto, 18 ao todo, três começando de cada lado. Esse número revela problemas grosseiros; não comprova taxa equilibrada de vitória.
- Rever poucas cartas por vez. Priorizar conflitos de regra, vantagem inevitável, concentração de compra/convocação e partidas fora da faixa de 15–25 minutos.

## 10. Capacidade atual do site

O criador exporta o JSON editável com os dados da carta. Porém, em `mesa-nova/app.js`, a importação atual associa ilustrações aos modelos dos decks existentes; o servidor em `mesa-nova/game.mjs` seleciona os decks do catálogo. Ela ainda não carrega decks arbitrários com novas regras.

Assim, é possível começar a concepção, a arte e a documentação manual desta coleção. Para jogar a coleção nova no site, será necessário implementar importação dos modelos/decks, a afinidade neutra e os efeitos estruturados escolhidos. Texto livre, sozinho, não programa uma habilidade. Este relatório não altera código, site, GitHub ou regras já executadas.
