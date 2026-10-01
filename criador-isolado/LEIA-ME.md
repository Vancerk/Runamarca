# Criador isolado do novo RunaMarca

Execute `node --preserve-symlinks-main criador-isolado/server.mjs` na pasta do projeto e abra http://127.0.0.1:3041.

Escolha um deck e clique em **Adicionar cartas deste deck**. Selecione uma carta na lista, carregue sua ilustração, ajuste o enquadramento e clique em **Guardar no projeto**. **Baixar PNG** exporta a carta atual em 900 × 1260 pixels. Também é possível trabalhar com o espaço reservado da ilustração.

As cartas guardadas ficam no armazenamento deste navegador, separado do criador antigo. Exporte o **projeto editável** como cópia de segurança e para transportar as cartas para outro navegador. O JSON deste criador não é um deck executável pela mesa antiga.

O protótipo contém três decks de 24 cartas (12 modelos com duas cópias), mais um Patrono para cada deck. Os valores são pontos de partida para teste, não balanceamento validado. As habilidades são texto livre; este editor não executa combates.

Afinidade, custo, modo da magia, ataque, vida e texto podem ser editados. Para magias, mantenha a classificação visível coerente com o modo escolhido. O Patrono tem vida e afinidade, sem as três habilidades do modelo anterior.

Os arquivos do editor original e do Seis Ossos não foram modificados. A aparência base foi preservada. As fontes Google precisam de conexão na primeira carga; há fontes alternativas caso estejam indisponíveis.
