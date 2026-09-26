# RunaMarca — andamento

## Foco atual: criador de cartas

O editor independente está em `/editor.html`. Ele tem uma identidade visual nova para RunaMarca, campos para ilustração, título, tipo, classificação, texto, ataque/vida e energias neutra, Ruptura, Forja e Fluxo. A carta é montada do zero em canvas, com prévia ao vivo. A arte agora ocupa toda a área interna; título e regras ficam em painéis sobrepostos, com moldura simplificada. Os símbolos são recortados em círculos e a antiga assinatura “Crônicas dos Mercenários” foi retirada. Em Terreno · Runa, os valores de energia aparecem em destaque na área de texto e indicam quanto a Runa produz ao girar; os custos de outras cartas continuam na faixa superior. **Patrono é um modelo separado**, inspirado nas cartas do Canva: arte integral, moldura e ornamentos ajustáveis, título com três opções de letra, painel de transparência variável e três habilidades numeradas com título, custo e efeito. É possível baixar o PNG, guardar modelos neste navegador, baixar um projeto editável e exportar um deck JSON para a mesa. Os primeiros campos de habilidades automáticas cobrem compra de cartas, Ágil, geração de energia ao girar criatura e desconto ligado a criaturas Ágeis. As três habilidades do Patrono ainda não acionam regras automáticas.

## Mesa de jogo: abertura e partida

A sala agora abre com escolha central dos decks Ruptura, Forja e Fluxo para cada jogador, seguida de confirmação individual. Quando ambos confirmam, uma moeda sorteia quem decide jogar primeiro ou em segundo. O servidor bloqueia a troca de decks durante a partida; os decks voltam a ser escolhidos após reinício ou Patrono com vida zero. A mesa continua com zonas, turnos, sigilo da mão, grupos de runas, compra limitada, atributos ajustáveis e os efeitos já implementados. As cartas antigas dos três decks continuam usando PNGs herdados; o custo visual nelas ainda é uma correção de apresentação.

## Integração atual

O JSON do editor pode ser carregado na **escolha de deck**. O servidor conserva nome, tipo, classificação, texto, imagem, ataque/vida, custos por energia e os dados de estilo/habilidades dos Patronos. A mesa ainda gasta apenas a soma total das energias; conferir Ruptura, Forja e Fluxo separadamente fica para a futura revisão de regras. Textos livres aparecem na carta; apenas os efeitos escolhidos nos campos estruturados já implementados acionam regras automáticas no servidor.

## Próximas decisões com o criador

- Validar com artes reais a distribuição do título e das três habilidades no Patrono.
- Ampliar os campos estruturados de habilidades conforme as regras forem definidas.
- Substituir os decks antigos gradualmente por cartas criadas neste editor, de preferência com as ilustrações originais.
