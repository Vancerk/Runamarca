# RunaMarca — revisão de Fluxo, Forja e confrontos

6 de outubro de 2026. Catálogo analisado: Oficina de Lyrik e Ecos de Virelion, 30 cartas cada. A cópia dos dados está em `decks-analisados-2026-10-06.json`.

## 1. Escopo e grau de certeza

Foram examinados catálogo, quantidades, curva, alvos, custos e modos de magia, combate simultâneo, Iniciativa, Provocar, auras, duração de controle, crescimento, reserva, retorno e fadiga. Não foram alterados custos, atributos, quantidades ou efeitos das cartas. As mudanças desta revisão são Provocar opcional e apresentação do ataque.

Este é um diagnóstico de desenho e implementação, sem uma nova bateria de partidas. “Forte” e “fraco” abaixo significam risco ou eficiência aparente no contexto atual; não são taxas de vitória medidas. Uma carta situacional pode ser adequada mesmo tendo poucos usos.

A bateria de 4/10 com Sono e Evasão terminou Fluxo 12/20 e Forja 8/20. Ela usava outro Forja: ainda não tinha João Bobão, Engenheiro Tímido e Reparo; tinha mais Taverneiros, Mecânicos e Estudiosos; o Escudeiro era 1/3 e o Anão Estudioso concedia ataque. O Fluxo conserva os mesmos custos, atributos, quantidades e efeitos daquele catálogo, mas o motor recebeu correções posteriores. Portanto aquele placar não descreve a versão atual. Também não há Ruptura ativo para medir o terceiro confronto.

## 2. Estrutura dos decks

| Indicador | Forja | Fluxo |
|---|---:|---:|
| Cartas | 30 | 30 |
| Criaturas | 20 | 19 |
| Magias | 10 | 11 |
| Cópias de criaturas com Emanação | 4: dois Engenheiros, um Anão Estudioso, um Elfo | 3 Auramoras |
| Custo médio ponderado pelas cópias | 3,87 | 2,30 |
| Cartas de custo até 3 | 17 | 25 |
| Cartas de custo 8 ou mais | 4 | 0 |
| Fontes de compra adicional | 2 Taverneiros + 1 Anão Estudioso | 2 Uma a mais |
| Cura do Patrono | Elfo + 3 Reparos | Nenhuma |

Os corpos com Emanação também podem permanecer na reserva, mas só há duas vagas de Emanação.

A mana cresce até 10, o Patrono começa com 16 de vida, há no máximo três atacantes por combate, mão de nove e reserva de oito fora da Emanação. Uma rodada pode terminar sem combate; portanto custo 8 não garante oito combates prévios. Cada nova compra com deck vazio causa fadiga 1, 2, 4, 8…

### Forja: identidade real

É um deck de resistência, redução de ataque e ameaças caras. O plano desejado está presente: sobreviver, preparar a primeira posição e alcançar Golias/Veronica. Entretanto, há um intervalo entre seus suportes frágeis e os finalizadores caros. Três Rompe-problema são o principal ataque intermediário, mas morrem para dois de dano. O deck também usa controle permanente em quantidade, aproximando-se do papel que se esperava para Fluxo.

### Fluxo: identidade real

É predominantemente um deck de tempo: baixa curva, corpos baratos, retorno e sono para diminuir a eficiência da resposta inimiga. Não é atualmente um deck de muitas compras ou de ampla variedade de feitiços: tem apenas duas compras adicionais e nenhum feitiço de dano ou remoção definitiva. Pode pressionar cedo e finalizar com Diretor/Banquete, mas sofre para atravessar defensores resistentes quando seu controle acaba.

O contraste entre 20 e 19 criaturas é pequeno. A distinção aparece no uso dessas criaturas e nas respostas, não na quantidade total de magias. Forja e Fluxo possuem 16 cópias de criaturas sem Emanação cada. Logo, os dois ainda têm a mesma densidade de corpos destinados à disputa de posições. Isso explica parte da reserva cheia no fim: comprar substitutos aumenta a redundância, sem ampliar os três ataques disponíveis.

## 3. Cartas do Forja

Atributos: ataque/vida; — significa magia. Sugestões são alternativas para avaliação, não alterações aplicadas.

| Carta | Cópias | Mana | A/V | Leitura e ação sugerida |
|---|---:|---:|---:|---|
| Mecânico Proativo | 1 | 3 | 2/2 | Situacional. Iniciativa elimina criaturas de vida 2 antes do revide, mas é cara fora desse alvo. Manter antes de medir suas eliminações; não fortalecer simultaneamente custo e corpo. |
| Anão escudeiro | 2 | 2 | 0/4 | Defensor honesto, fraco para remover ameaças. Ferido chega a 1 de ataque. O ataque zero faz com que possa bloquear sem resolver a mesa. Não nerfar; avaliar se duas cópias realmente melhoram o plano defensivo. |
| Anão Taverneiro | 2 | 2 | 1/1 | Na média como reposição. Entrada substitui a carta gasta; corpo pequeno ocupa reserva, mas pode ser consumido como bloqueador. Manter. |
| Sintético Próspero | 2 | 2 | 0/1 | Muito polarizado. Morre contra qualquer 1 de dano sem proteção; cresce bastante contra alvos sem ataque e casas vazias. Raridade Ouro não garante eficiência. Se raramente crescer, testar 0/2 mantendo o custo, sem alterar o ritmo de crescimento. |
| Rompe-problema | 3 | 5 | 5/2 | Forte contra bloqueadores de pouca vida, frágil a dano e Iniciativa. Transpassar pune João/Auramora: bloquear não elimina o dano excedente. Três cópias concentram o plano de vitória. Não nerfar agora; sua vida baixa já é contrapartida. |
| Anão estudioso | 1 | 4 | 1/2 | Corpo caro, mas compra e aura contínua compensam parcialmente. A aura de vida absorve dano por combate, não é +1 permanente. Engenheiro custa menos para função semelhante. Considerar custo 3 se o suporte estiver consistentemente atrasado. |
| Elfo estudioso | 1 | 4 | 1/2 | Fraco em ritmo: investimento de 4, vaga de Emanação e pagamento recorrente para curar só 1. Curar Patrono é sua diferença em relação à Auramora. Primeiro teste sugerido: custo 3, mantendo cura/pagamento. |
| Monge Rúnico | 1 | 5 | 3/4 | Na média/situacional. -2 no combate ajuda a vencer trocas, mas exige acertar o posicionamento secreto. É uma boa defesa com risco; manter. |
| Golias | 2 | 8 | 5/12 | Forte quando entra, com custo alto e alvo ideal para Evasão. Pode absorver ataques de duas casas com Provocar adicional, mas recebe ambos e só ataca uma vez. Não há motivo para nerfar só pela vida 12; medir a possibilidade de chegar à mesa. |
| Reforço Divino | 1 | 5 | — | Fraco relativamente: +2/+2 num alvo por 5 contra Banquete em todos por 6. Uma criatura comum buffada pode continuar menos eficiente que jogar outra. Teste sugerido: custo 4; não dar imunidade ao retorno para compensar. |
| Veronica | 1 | 8 | 5/7 | Finalizador condicional, aparentemente razoável. Cresce após contribuir para eliminação e sobreviver; não cresce só por atacar. Pode ser devolvida e perder investimento. Manter. |
| Cataclisma | 1 | 10 | 6/10 | Lento e estreito: dano lateral de 1 importa contra criaturas pequenas, mas tende a chegar depois da janela delas. Não transmite esse dano a Patronos por casas vazias. Considerar dano lateral 2 OU custo 9, após confirmar frequência de entrada; nunca os dois de início. |
| Toque Gélido | 2 | 2 | — | Na média como resposta precisa, mas perde valor ao lado de Geada, que custa o dobro e atinge vários. Depende da ativação na casa. Manter até decidir o alcance da Geada. |
| Geada Implacável | 2 | 4 | — | Maior risco de excesso no Forja. Afeta toda a reserva fora da Emanação diretamente; preparada afeta até três ocupantes. Duas cópias podem neutralizar criaturas de ataque 1–2 sem eliminá-las. Sugestão prioritária: alcance direto limitado a até três criaturas, mantendo -1 permanente e mana 4. |
| Disparo de Forja | 2 | 3 | — | Na média: mata vários corpos pequenos, mas é caro contra ameaças grandes. A possibilidade de acertar Emanação com dano direto dá função importante. Manter. |
| João Bobão | 1 | 1 | 0/1 | Forte como defesa especializada de uma rodada. Pode interceptar duas casas, mas morre facilmente e Transpassar contorna parte da proteção. Quantidade de uma cópia está coerente; manter. |
| Engenheiro Tímido | 2 | 3 | 1/1 | Bom suporte; dois juntos dão +2 de vida na primeira casa e +2 de ataque se Axiom. Sintético/Veronica aproveitam, mas o adversário pode explorar previsibilidade ou eliminar a fonte com dano direto. Não nerfar; esclarecer que o bônus é aura. |
| Reparo de Emergência | 3 | 3 | — | Fraco como remoção, útil para estabilizar. Só elimina alvos com vida restante 1 e cura Patrono em 1. Três cópias podem criar mãos com pouca capacidade de responder. Alternativa inicial: testar custo 2 mantendo os dois efeitos de 1, se a carta ficar frequentemente sem uso. |

### Risco de conjunto no Forja

A cadeia Geada + Toque + Monge reduz demais a utilidade de criaturas pequenas. Além de defender, ela mantém corpos inimigos vivos, com pouco ataque, ocupando reserva e obrigando o rival a comprar alternativas. É eficiente, mas pode produzir partidas travadas. Eu priorizaria ajustar o alcance da Geada antes de enfraquecer Golias ou todas as criaturas.

Dois Engenheiros focam o mesmo primeiro slot. Isso é uma identidade de montagem mecânica válida; o custo é previsibilidade. Também significa que Sintético pode passar de peça quase inútil a ameaça crescente dependendo de apoio, sem justificar concluir que está simplesmente quebrado ou simplesmente fraco.

## 4. Cartas do Fluxo

| Carta | Cópias | Mana | A/V | Leitura e ação sugerida |
|---|---:|---:|---:|---|
| A luz enganosa | 4 | 2 | 3/2 | Forte no começo. É estritamente superior em ataque ao Olho por igual custo, vida e ausência de habilidades. Não nerfar primeiro: dá ao Fluxo uma condição de pressão que funciona com seu controle. |
| Âncora Etérea | 1 | 2 | — | Situacional. Prende a posição, mas não reduz ataque nem impede ataque. Ajuda a montar armadilha ou evitar troca do alvo. Não fortalecer só por ter pouca utilização; ensinar a diferença para Sono. |
| Aprendiz vireliana | 4 | 1 | 1/1 | Base razoável, sinergia pouco consistente. Precisa de outra criatura beneficiada por magia; Barreira/Banquete habilitam. Usar Evasão, Sono ou comprar não basta. Manter o corpo; mais variedade de buffs baratos pode melhorar identidade futuramente. |
| Auramora | 3 | 1 | 1/1 | Entrada barata, valor recorrente moderado. Curar 1 custa 1 e exige alvo ferido; não salva criaturas que morreram no combate. Três cópias disputam duas vagas. Considerar substituir a terceira por uma ferramenta diferente, não aumentar a cura de todas. |
| Banquete dos Heróis | 1 | 6 | — | Potencial de excesso ao atingir muitas criaturas, mas exige mesa. Em três corpos concede seis pontos de ataque e seis de vida; em oito, dezesseis de cada, fora os possíveis dois em Emanação. Considerar limitar a três criaturas ou às posições se gerar viradas sem resposta. Manter como finalizador enquanto se mede a exposição ao controle. |
| Bruxa da Floresta Negra | 3 | 4 | 1/4 | Boa resistência contra ataques pequenos; perde ritmo ofensivo. Cada Bruxa pode reduzir a mesma criatura uma vez; várias Bruxas acumulam reduções. Não é imunidade global a novas Bruxas. Observar conjunto com Geada antes de nerfar isoladamente. |
| Olho Flutuante | 4 | 2 | 2/2 | Redundância fraca no catálogo: sem habilidade, perde para Luz 3/2 no mesmo custo. Pode cumprir a curva por limites de cópias, mas não oferece decisão diferente. Prioridade de redesenho: diferenciar função, por exemplo um corpo 2/3 de defesa, sem adicionar compra grátis. |
| Uma a mais | 2 | 1 | — | Cicladora, não vantagem líquida de cartas: gasta uma carta para comprar uma. Ajuda a achar controle/finisher, mas acelera fadiga. Manter custo; uma compra de duas cartas exigiria nova avaliação. |
| Vaelgor Dareth, O Diretor | 1 | 6 | 4/3 | Forte e tático. No centro pode distribuir +6 de ataque total aos dois aliados, mas é frágil e a posição é previsível. Manter antes de medir repetição de explosões; dá condição de vitória real ao Fluxo. |
| Barreira espectral | 2 | 3 | — | Boa em disputas pequenas e em conservar aliados. São +2 de vida temporária por combate, não +4 permanentes. Duração acaba após dois combates, mesmo com casa vazia. Manter; posicionamento deve ter custo de erro. |
| Evasão Dimensional | 3 | 2 | — | Maior risco de excesso no Fluxo. Por 2, retira Golias de 8, zera crescimento/buffs e exige novo pagamento. É tempo e desfaz investimento; não é remoção definitiva, salvo mão cheia causando queima. Se dominar, testar custo 3 antes de mexer em reset, quantidade e custo juntos. |
| Sono Profundo | 2 | 3 | — | Controle forte, com risco de casa. Neutraliza ataque por dois combates, mas o corpo permanece bloqueando o Patrono e recebendo dano. Fraco contra defensor 0 de ataque, forte contra Rompe/Veronica. Manter inicialmente; não confundir com abrir uma casa vazia. |

### Risco de conjunto no Fluxo

Sua maior vantagem é agir barato e atrasar peças caras. Sua fraqueza é o dano permanente acumulado e a dificuldade de limpar uma reserva ampla: Evasão alcança um alvo, Sono exige previsão, não há dano em área nem remoção final. Contra um futuro Ruptura de muitas criaturas baratas, devolver uma de custo 1–2 produz pouco atraso e perde eficiência quando já existe substituto na reserva. Isso sustenta a direção de confronto que você propôs.

A maior incoerência interna é quatro Olhos junto de quatro Luzes com função igual, sendo um modelo inferior. Outra é esperar que Aprendiz tenha muitas oportunidades de magia benéfica: só há três cartas habilitadoras no deck (duas Barreiras e um Banquete). Isso pede diversidade funcional antes de simplesmente aumentar atributos.

## 5. O ciclo Ruptura → Fluxo → Forja → Ruptura

Faz sentido como objetivo de design, com vantagens suaves e motivos visíveis:

| Confronto desejado | Motivo para a vantagem | Caminho de reação do desfavorecido |
|---|---|---|
| Ruptura favorecido contra Fluxo | Muitos corpos baratos diluem retorno/sono de alvo único; pressão explora a falta de cura do Patrono e de limpeza em área. | Fluxo troca bem com Bruxa/Barreira, acerta Sono em ameaça-chave e organiza Diretor para uma virada. |
| Fluxo favorecido contra Forja | Retorno e Sono atrapalham investimento caro, crescimento e montagem da primeira casa. | Forja diversifica ameaças, guarda recurso para reposição, usa Geada contra corpos baratos e força combate após estabilizar. |
| Forja favorecido contra Ruptura | Vida alta, redução de ataque, Provocar e cura sobrevivem à pressão inicial e tornam o jogo tardio favorável. | Ruptura administra o ritmo, remove Emanação com dano direto, usa Transpassar/alcance ou pressão antes da curva 8. |

Não existe uma regra universal de card games que imponha esse triângulo. Aggro, controle, tempo, combo e midrange se relacionam por ferramentas, curva e condições de vitória; nomes de classe como Hunter ou Mage não determinam o confronto. A Blizzard descreve tempo como disputa de mesa com remoção e controle como estabilização para alcançar recursos de maior valor. A Wizards documenta formatos saudáveis com múltiplos arquétipos competitivos, incluindo agressivos, controle, combo e tempo.

Recomendação: tratar 55–60% no confronto favorável como uma referência inicial de design, não uma meta comprovada ou um placar que o simulador deva fabricar. Um desfavorável precisa ter decisões que façam diferença e capacidade real de vencer. O agregado depende de quais adversários são mais jogados. Mesmo 60% exige amostra e observação humana; vinte partidas não sustentam uma taxa precisa.

O ciclo será rompido se Forja receber defesa cedo, controle barato irrestrito, compra ampla e os melhores finalizadores juntos; ou se Fluxo ganhar muitas respostas em área sem perder eficiência contra ameaças únicas. Ruptura precisa de reposição após trocas e algum caminho contra defesa, mas não deve também ter a melhor cura/controle tardio.

O limite de três casas muda a lógica de “enxame”: sete criaturas na reserva ainda dão no máximo três ataques num combate. Sua vantagem deve ser reposição, escolha de formação e capacidade de manter pressão após perdas, não dano multiplicado por toda a reserva. Evocar cópias demais pode saturar o limite de oito e transformar compra de criaturas em recurso morto.

Trocar decks entre partidas é compatível com essa proposta. A escolha secreta/simultânea evita que o último a escolher tenha uma vantagem de resposta garantida; regras de revanche e torneio podem ser decididas depois. Não é necessário implementar seleção competitiva agora.

## 6. Recomendações em ordem de prioridade

1. **Diferenciar Olho Flutuante.** É a comparação interna mais clara: 2/2 sem habilidade versus 3/2 sem habilidade por igual mana. Não é necessário uma nova rodada de simulação para reconhecer essa redundância.
2. **Observar Evasão e Geada.** São as cartas com maior poder de anular investimento. Em teste controlado, variar uma por vez: Evasão 3 mana OU limite de três alvos da Geada. Preservar formas de o Fluxo superar Forja e de Forja se defender de Ruptura.
3. **Reavaliar suportes caros do Forja.** Elfo, Anão Estudioso e Reforço têm custo elevado frente aos benefícios. Melhorar suporte não deve também aumentar defesa universal ou permitir dano direto ao Patrono.
4. **Revisar quantidade e função, não só números.** Terceira Auramora, quatro Olhos e três Reparos podem virar slots para respostas diferentes. Não substituir todos por criaturas genéricas nem dar remoção total aos dois decks.
5. **Manter finalizadores com contrapartidas.** Golias custa 8 e pode sofrer retorno; Veronica precisa sobreviver a eliminações; Diretor tem vida 3; Banquete exige campo. Avaliar Cataclisma e Sintético em suas condições de uso antes de nerfs gerais.
6. **Criar Ruptura para testar o triângulo.** Seus custos, reposição e alcance ainda não existem no catálogo ativo. Não é possível afirmar que o ciclo funciona apenas com Fluxo × Forja.

Para uma futura bateria útil: mesmas sementes e decisões sem mão secreta, alternar início, comparar uma mudança por vez e registrar tempo de chegada de finalizadores, cartas sem uso, dano bloqueado, investimento desfeito por Evasão, reduções de Geada, reserva saturada e conclusões por estilo de piloto. Não repetir baterias sem hipótese específica.

## 7. Pontos que precisam de supervisão

- **Prioridade alta: vida temporária também pode curar dano antigo.** Ao fim do combate, o motor retira a vida temporária e subtrai seu valor do dano total acumulado, sem distinguir dano novo de dano anterior. Um caso executado no motor: Escudeiro com 2 de dano, aura do Engenheiro (+1 de vida) e inimigo com ataque 0 terminou com apenas 1 de dano. Logo, a aura não apenas protege: também cura 1 mesmo sem receber ataque. Barreira usa a mesma retirada de vida temporária. Isso pode inflar a resistência dos dois decks e mascarar o valor de Auramora/Elfo. Não alterei silenciosamente essa regra; antes de balancear cartas, recomendo decidir se é proteção que absorve dano novo ou apenas bônus temporário de vida.
- **Magias não ficam limitadas a uma direta por preparação.** `directPlayed` registra uso e condições de desconto, mas não impede outras diretas enquanto houver mana. Combinações de Evasão, Geada e Reparo devem ser avaliadas com essa liberdade real.
- **Geada preparada não expira por falta de ativação.** A regra atual de expiração independente de ativação aplica-se a `area_damage`; Geada é `area_attack_modifier`. Se a intenção passou a incluir todo efeito em área, é uma nova decisão de regra. Não ampliei a expiração sem essa decisão.
- **Retorno com mão cheia queima a criatura.** Uma Evasão de custo 2 pode virar remoção definitiva nesse cenário. A regra é coerente com o limite de mão atual, mas deve entrar na avaliação de força e ter comunicação clara.
- **As três Bruxas podem reduzir o mesmo alvo.** O limite é por Bruxa e por criatura/UID. Retornar à mão cria nova instância sem dano/bônus e limpa estados; não há proteção permanente do modelo de carta contra outra Bruxa.
- **Fadiga pune compra compulsiva.** Comprar indefinidamente não é automaticamente uma condição boa para controle; depois de esgotar o deck, quatro compras vazias somam 15 de dano. Isso importa com Patrono de 16.
- **Bot simples não representa potencial estratégico máximo.** Seu código prioriza criaturas baratas, escolhe formação por ataque e não organiza automaticamente Emanação/cura como um humano. Partidas contra ele não são prova isolada de equilíbrio entre decks.

## 8. Alterações funcionais desta revisão

### Provocar

A escolha de casa adicional passa a ser opcional. Sem escolha, a criatura apenas enfrenta/bloqueia a casa à frente pelas regras normais. O seletor oferece “Somente à frente”, que também remove uma escolha anterior. Casas adicionais continuam restritas a adjacência e não podem ser reivindicadas simultaneamente por dois provocadores. A confirmação não exige um adicional quando não há casa disponível ou o jogador não quer escolher. Fechar o seletor sem escolher mantém a configuração atual.

### Ataque em estilingue

A carta recua 26–40 pixels na direção oposta ao alvo, acelera até o contato nas bordas, sofre um recuo de impacto e volta diretamente à origem. O preparo não depende mais de uma fração minúscula da distância entre as cartas. Ataques de pares, ataques ao Patrono, Iniciativa e alvos redirecionados usam a direção efetiva do alvo. Som e atualização de HP continuam associados ao instante do contato. O combate simultâneo e o dano mecânico não foram alterados.

São verificadas direção do preparo, contato sem atravessar bordas, retorno à origem, cancelamento de Provocar, confirmação sem adicional e conflito de casas. A sensação de impacto ainda é uma avaliação visual durante a partida; os testes de geometria não substituem esse julgamento.

## Referências oficiais

- Blizzard, [Opening Moves: Those First 5 Turns](https://news.blizzard.com/en-us/article/21363042/opening-moves-those-first-5-turns): papéis de aggro, tempo e controle; decisões iniciais e uso de recursos.
- Wizards, [March 11, 2024 Banned and Restricted Announcement](https://magic.wizards.com/en/news/announcements/march-11-2024-banned-and-restricted-announcement): diversidade de arquétipos e ajustes para preservar estratégias sem domínio excessivo. Exemplos históricos, não taxas atuais nem regra universal de confrontos.
## Verificação das alterações

A suíte completa `npm test` passou na cópia de publicação: 38 testes Node, testes de regras dos decks e interface, e 18 casos da auditoria. Os novos cenários incluem Provocar sem adicional, retirada do adicional, ausência de casa disponível e trajetória do estilingue em alvos verticais, diagonais e próximos. Não foi executada uma nova bateria de partidas nem uma validação visual em duas sessões humanas.
