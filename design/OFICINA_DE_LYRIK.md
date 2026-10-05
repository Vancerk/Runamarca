# Oficina de Lyrik — novo deck de Forja

O deck anterior **Juramento de Aço** permanece disponível. Este novo deck tem **30 cartas, 15 modelos**, com as ilustrações, os enquadramentos, as falas e os textos narrativos enviados. Como não foi enviado outro Patrono, utiliza **A Bigorna Desperta**, com 16 de vida.

## Composição

| Carta | Raridade | Cópias | Mana | Ataque / Vida |
|---|---|---:|---:|---|
| Mecânico Proativo | Bronze | 2 | 3 | 2 / 2 |
| Anão escudeiro | Bronze | 3 | 2 | 1 / 3 |
| Anão Taverneiro | Bronze | 4 | 2 | 1 / 1 |
| Sintético Próspero | Ouro | 2 | 2 | 0 / 1 |
| Rompe-problema | Prata | 3 | 5 | 5 / 2 |
| Anão estudioso | Prata | 2 | 4 | 1 / 2 |
| Elfo estudioso | Prata | 2 | 4 | 1 / 2 |
| Monge Rúnico | Prata | 1 | 5 | 3 / 4 |
| G.0.L.1.A.5, o Terror Náutico | Ouro | 2 | 8 | 5 / 12 |
| Reforço Divino | Ouro | 1 | 5 | Magia: +2 / +2 |
| v.3.r.0.n.1.c.a | Platina | 1 | 8 | 5 / 7 |
| c.4.t.4.c.l.1.s.m.4 | Platina | 1 | 10 | 6 / 10 |

| Toque Gélido | Prata | 2 | 2 | Magia: -1 ataque permanente na posição |
| Geada Implacável | Ouro | 2 | 4 | Magia: -1 ataque permanente em área |
| Disparo de Forja | Bronze | 2 | 3 | Magia: 2 de dano |

## Regras implementadas e aprovadas

- **Transpassar:** transmite ao Patrono o dano de combate acima da vida restante do defensor. Não transmite dano de Revelação ou de magias.
- **Provocar:** durante a formação, a criatura escolhe uma posição adicional adjacente à própria. O atacante dessa posição ataca a criatura provocadora. Ela continua atacando uma única vez, na própria posição. Clicar nela permite mudar a escolha antes de confirmar. Duas criaturas não podem disputar a mesma posição adicional. A escolha fica oculta até a revelação.
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
- **Orçamento mínimo:** Mecânico 2/2 por 3 mana gasta 4/7 pontos antes de Iniciativa; Rompe-problema 5/2 por 5 gasta 7/11 antes de Transpassar; Golias 5/12 por 8 gasta 17/17 antes de Provocar. Precisam de revisão do custo da habilidade ou de exceção de design justificada.
- **Taverneiro:** 1/1 por 2 mana com compra de 1 soma 5 pontos na referência atual, diante de 5 disponíveis. É um motor de compra eficiente, especialmente com quatro cópias.
- **Sintético:** duas cópias de custo 2, corpo 0/1, com crescimento permanente podem gerar pressão cumulativa. O crescimento depende de entrar em combate e sobreviver, oferecendo ao rival oportunidade de eliminá-lo antes de crescer.
- **Duração do Reforço Divino:** foi interpretado como permanente por não haver duração no texto. Caso devesse terminar no combate, precisa de alteração explícita.
- **Economia do deck:** tem 23 criaturas e sete magias. Isso concentra respostas e compra em criaturas; 4 Taverneiros + 2 Estudiosos representam até seis compras de entrada.
- **Custo 10:** Cataclisma só pode entrar com a mana máxima. Pode aparecer cedo e ocupar espaço na mão; não foi concedido desconto especial.

## Verificação

Testes automatizados específicos cobrem composição, conservação do Forja anterior, arquivos de arte, falas, enquadramento, Iniciativa e empate entre iniciativas, Transpassar, Provocar e sigilo, crescimento, dano adjacente, redução temporária, bônus permanente e cura paga. A bateria de regressão anterior também passou. A interface foi conferida no navegador: seleção do novo deck, carregamento no criador, escolha de Provocar e bordas verdes.

Esses testes verificam regras e integração. **Não constituem uma bateria de partidas nem demonstram equilíbrio competitivo do novo deck.**

## Revisão de 4 de outubro

Sintético Próspero agora é Ouro, com duas cópias. Anão Taverneiro tem quatro cópias e Elfo Estudioso três, completando 30 cartas. A narrativa do Taverneiro diz balcão. Provocar só pode escolher uma casa adjacente à posição do provocador.

## Segunda revisão de 4 de outubro — após a bateria

Custos e atributos alterados por autorização do autor. Composição atual: Mecânico 2, Escudeiro 3, Taverneiro 4, Sintético 2, Rompe-problema 3, Estudioso anão 2, Estudioso elfo 2, Monge 1, Golias 2, Reforço 1, Veronica 1, Cataclisma 1, Toque 2, Geada 2 e Disparo 2. Total: 30.

Toque Gélido custa 2 e reduz permanentemente 1 de ataque da criatura que ativar sua posição inimiga. Geada Implacável custa 4: diretamente atinge a reserva inimiga fora da Emanação; como armadilha, apenas as três posições. Não causa dano e portanto não segue a redução pela metade do dano em área. A redução não deixa ataque negativo. Disparo de Forja custa 2 e causa 2 de dano a uma criatura inimiga, incluindo Emanação no uso direto. Não atinge Patronos. Usa provisoriamente a arte de Selo de Estacas, enquanto as duas magias de gelo usam as imagens enviadas.

Raciocínio de custo: Toque recebe custo 2 pela redução permanente, com dependência de ativação da posição; Geada recebe custo 4 pela abrangência e permanência; Disparo usa a referência de 2 pontos por dano (4 pontos para 2 mana). Esses são custos iniciais de teste, não uma certificação de balanceamento. O relatório de 20 partidas permanece histórico, anterior a estas mudanças. Não foi executada nova bateria de partidas nesta revisão.

## Terceira revisão de 4 de outubro — nova bateria de 20 partidas

Disparo passa de 2 para 3 mana; Reforço de 4 para 5 mana; Rompe-problema de 6/2 para 5/2; Golias de 7/10 para 5/12; Veronica de 6/8 para 5/7; Sintético de custo 3 e 0/2 para custo 2 e 0/1. Quantidades e habilidades preservadas.

A bateria anterior à revisão terminou 13–7 para Forja; esta terminou 14–6, com média de 8,85 rodadas contra 8,20. As mesmas 20 sementes e a mesma política foram usadas. Essa diferença de uma vitória não demonstra aumento real de força. O relatório detalhado está em `testes-2026-10-04-novos-revisao2/RELATORIO.md`; resultados anteriores permanecem históricos.
