# Oficina de Lyrik — novo deck de Forja

O deck anterior **Juramento de Aço** permanece disponível. Este novo deck tem **30 cartas, 12 modelos**, com as ilustrações, os enquadramentos, as falas e os textos narrativos enviados. Como não foi enviado outro Patrono, utiliza **A Bigorna Desperta**, com 16 de vida.

## Composição

| Carta | Raridade | Cópias | Mana | Ataque / Vida |
|---|---|---:|---:|---|
| Mecânico Proativo | Bronze | 4 | 2 | 2 / 3 |
| Anão escudeiro | Bronze | 4 | 2 | 1 / 3 |
| Anão Taverneiro | Bronze | 3 | 1 | 1 / 1 |
| Sintético Próspero | Bronze | 4 | 1 | 0 / 2 |
| Rompe-problema | Prata | 3 | 4 | 6 / 3 |
| Anão estudioso | Prata | 3 | 4 | 1 / 2 |
| Elfo estudioso | Prata | 2 | 3 | 1 / 2 |
| Monge Rúnico | Prata | 2 | 5 | 3 / 4 |
| G.0.L.1.A.5, o Terror Náutico | Ouro | 2 | 8 | 7 / 10 |
| Reforço Divino | Ouro | 1 | 4 | Magia: +2 / +2 |
| v.3.r.0.n.1.c.a | Platina | 1 | 8 | 6 / 8 |
| c.4.t.4.c.l.1.s.m.4 | Platina | 1 | 10 | 6 / 10 |

## Regras implementadas e aprovadas

- **Transpassar:** transmite ao Patrono o dano de combate acima da vida restante do defensor. Não transmite dano de Revelação ou de magias.
- **Provocar:** durante a formação, a criatura escolhe uma posição adicional diferente da própria. O atacante dessa posição ataca a criatura provocadora. Ela continua atacando uma única vez, na própria posição. Clicar nela permite mudar a escolha antes de confirmar. Duas criaturas não podem disputar a mesma posição adicional. A escolha fica oculta até a revelação.
- **Iniciativa:** todos os ataques de criaturas com Iniciativa resolvem juntos, antes dos ataques normais. Criaturas mortas nessa etapa não atacam. Duas criaturas com Iniciativa podem se destruir mutuamente. Um defensor morto pela Iniciativa não abre um segundo ataque gratuito ao Patrono no mesmo confronto.
- **Monge:** a redução de 2 de ataque vale somente para o combate atual, sem ataque negativo.
- **Veronica:** ganha +1/+1 permanentemente por criatura cuja eliminação contou com seu dano, desde que sobreviva ao combate. Os acréscimos de vida aumentam a vida máxima e a vida restante em 1; não restauram toda a vida.
- **Sintético:** ganha +1/+1 permanente ao sobreviver **participando da formação**. Não cresce por ficar na reserva ou em Emanação.
- **Cataclisma:** após seu ataque causar dano em uma criatura, causa 1 nas criaturas das posições adjacentes à posição atingida. Não atinge Emanação, reserva ou Patrono em posição vazia. Com Provocar, a referência é a posição do defensor atingido.
- **Escudeiro:** recebe o ataque adicional enquanto tiver dano acumulado. A cura que remove todo o dano remove esse bônus.
- **Elfo:** cura um aliado selecionado ao encerrar a preparação, pagando 1 mana por ativação. Pode curar a si mesmo; não cura Patrono, conforme o texto enviado.
- **Anão estudioso:** compra 1 ao entrar. Em Emanação, cada cópia acrescenta 1 de ataque à primeira posição; os bônus se acumulam.
- **Reforço Divino:** +2/+2 permanente. Pode ser usado diretamente em um aliado ou preparado em uma posição aliada. A vida acrescentada não apaga danos já recebidos.
- **Posição beneficiada:** borda verde pulsante para magia de bônus preparada ou aura de ataque de Emanação.

## Divergências corrigidas

1. A lista original somava 31 cartas. Por autorização do usuário, Anão Taverneiro passou de 4 para 3 cópias.
2. Sintético Próspero veio como Elite no JSON; foi usado como Bronze, seguindo a composição solicitada.
3. Anão estudioso tinha compra de 2 nos dados de orçamento e compra de 1 no texto; foi utilizada compra de 1.
4. Diversos arquivos reutilizavam o mesmo identificador. Cada modelo recebeu ID único FL01–FL12, evitando misturar artes e efeitos.
5. Veronica recebeu a fala **“Protocolo: Exterminar!”** e a narrativa solicitada.

## Pontos para supervisão

- **Nome:** arquivo e campo do nome dizem `v.3.r.0.n.1.c.a`; a mensagem menciona `v.3.r.0.n.1.c.4`. Foi preservado o nome do arquivo; confirmar se a última letra deve virar algarismo.
- **Patrono:** confirmar futuramente se o deck deve ter outro Patrono; por enquanto usa a Bigorna existente.
- **Preço das novas habilidades:** o contador não possui fórmula calibrada para Iniciativa, Transpassar, Provocar, crescimento recorrente ou dano adjacente. Elas aparecem como efeitos personalizados **ainda sem preço**, com aviso explícito; zero provisório não significa habilidade gratuita. Nenhum custo ou atributo foi rebalanceado automaticamente.
- **Orçamento mínimo:** Mecânico 2/3 por 2 mana gasta 5/5 pontos antes de Iniciativa; Rompe-problema 6/3 por 4 gasta 9/9 antes de Transpassar; Golias 7/10 por 8 gasta 17/17 antes de Provocar. Precisam de revisão do custo da habilidade ou de exceção de design justificada.
- **Taverneiro:** 1/1 por 1 mana com compra de 1 soma 5 pontos na referência atual, diante de 3 disponíveis. É um motor de compra eficiente, especialmente com três cópias.
- **Sintético:** quatro cópias de custo 1 com crescimento permanente podem gerar pressão cumulativa. O crescimento depende de entrar em combate e sobreviver, oferecendo ao rival oportunidade de eliminá-lo antes de crescer.
- **Duração do Reforço Divino:** foi interpretado como permanente por não haver duração no texto. Caso devesse terminar no combate, precisa de alteração explícita.
- **Economia do deck:** tem 29 criaturas e uma única magia. Isso concentra respostas e compra em criaturas; apenas 3 Taverneiros + 3 Estudiosos já representam até seis compras de entrada.
- **Custo 10:** Cataclisma só pode entrar com a mana máxima. Pode aparecer cedo e ocupar espaço na mão; não foi concedido desconto especial.

## Verificação

Testes automatizados específicos cobrem composição, conservação do Forja anterior, arquivos de arte, falas, enquadramento, Iniciativa e empate entre iniciativas, Transpassar, Provocar e sigilo, crescimento, dano adjacente, redução temporária, bônus permanente e cura paga. A bateria de regressão anterior também passou. A interface foi conferida no navegador: seleção do novo deck, carregamento no criador, escolha de Provocar e bordas verdes.

Esses testes verificam regras e integração. **Não constituem uma bateria de partidas nem demonstram equilíbrio competitivo do novo deck.**
