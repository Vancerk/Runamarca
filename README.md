# RunaMarca — mesa de cartas

**Foco atual:** o [criador de cartas](public/editor.html) inclui agora um modelo independente para Patronos, inspirado nas cartas de referência do Canva. O estado e os próximos pontos estão em [ANDAMENTO.md](ANDAMENTO.md).

Abra `http://localhost:3000/editor.html` para criar cartas com uma moldura nova de RunaMarca. Insira a ilustração, configure título, tipo, texto, atributos e custos, e veja a prévia em tempo real. Ao selecionar **Patrono**, o editor muda para uma carta própria: arte em toda a superfície, moldura colorida, ornamentos, tipografia e três habilidades numeradas configuráveis. **Baixar PNG desta carta** gera a imagem final; **Guardar no projeto** mantém o modelo editável neste navegador; **Exportar deck para a mesa** produz um JSON para a importação na abertura de uma partida. Use **Baixar projeto editável** para transferir os modelos para outro computador. Em **Habilidades automáticas da mesa**, já é possível configurar compra de cartas, Ágil, energia gerada ao girar criatura e desconto por criatura Ágil. Escreva também a habilidade no texto visível da carta. A mesa conserva os valores de Ruptura, Forja e Fluxo no JSON, mas atualmente paga custos pela soma total. As três habilidades próprias do Patrono são campos de criação e apresentação; sua execução automática ainda não está implementada.

Mesa online para duas pessoas testarem o card game de Runamarca. Os decks **Ruptura, Forja e Fluxo** usam as artes originais de Igni, Ventus e Glacies, extraídas do [documento do jogo](https://docs.google.com/document/d/14iMXPFjpCdr4V5py6gRgrCfW34SvnKZfaizGklNtqd0/edit?usp=sharing). Cada deck pronto contém 60 cartas: 25 Runas e 35 contratos.

## Executar

Requer Node.js 20 ou mais recente. Não há dependências para instalar.

```powershell
node server.js
```

Abra `http://localhost:3000`. Um jogador cria a sala e envia o link ou código ao outro. Para jogar de computadores diferentes pela internet, hospede o servidor Node com HTTPS; `localhost` só funciona no computador em que ele roda. A variável `PORT` altera a porta. Há um `Dockerfile` para hospedagens que recebem contêineres. Veja o passo a passo em [HOSPEDAGEM.md](HOSPEDAGEM.md). Use uma instância do servidor, pois as salas ficam na memória.

## Jogar

- Ao entrar na sala, cada jogador escolhe Ruptura, Forja ou Fluxo na tela central e confirma. Também é possível importar um deck próprio nessa etapa. Quando os dois confirmam, uma moeda animada sorteia quem decide começar em primeiro ou jogar em segundo. A escolha dos decks só reaparece depois do fim da partida ou de **Reiniciar partida e escolher decks**. Cada jogador então clica sete vezes em **Comprar carta** para formar a mão inicial. A mão e o baralho são privados; o rival vê somente suas quantidades. A partida só pode avançar quando ambos concluírem essas compras.
- Selecione uma Runa na mão. A área de **Terrenos** se ilumina e mostra um `+` clicável; o botão **Colocar em Terrenos** também permanece na lateral. É possível jogar uma Runa por turno. Runas iguais se agrupam em montes de até três; as preparadas e as viradas aparecem em montes separados. Selecione um monte para **virar uma Runa** ou **virar todo o monte**. Cada Runa virada gera uma energia, e os montes se reorganizam automaticamente. A energia é gasta ao jogar cartas e a reserva zera no início do seu próximo turno.
- Criaturas, Magias e Patrono têm áreas próprias. As fileiras de criaturas ficam frente a frente, com Terrenos e Magias atrás de cada lado. Para a primeira criatura, clique em **Invocar criatura** ou no `+` da área. Depois, selecione uma criatura na mão e clique no `+` à esquerda ou à direita de uma criatura já em campo. O servidor valida custo e posição.
- Selecione uma magia, inclusive **Mágica Instantânea** como **Bote Planejado**. Com energia suficiente, a área **Magias** se ilumina e oferece um `+`; o botão **Colocar em Magias** na lateral faz o mesmo. Ela fica visível na mesa para ambos até o dono escolher **Descartar**. Sem energia, o painel mostra quanto falta.
- É possível jogar uma carta virada para baixo. Os dois jogadores veem o verso na mesa; o dono pode consultar a arte no painel de seleção. O rival não recebe nome nem atributos até a revelação. Uma carta de magia pode ser colocada também no turno adversário.
- Cada criatura revelada mostra ataque/vida em um visor acima da arte, com modificadores positivos e negativos destacados. Selecione sua criatura para ajustar cada atributo em passos de 1. O servidor transmite o valor atualizado aos dois jogadores; os ajustes persistem enquanto a carta está em campo e somem quando ela volta à mão.
- **Encerrar turno** passa a vez e prepara as Runas do próximo jogador. Ele recebe direito a uma compra manual naquele turno; compras não usadas expiram. Os controles de vida do Patrono são manuais. Quando a vida de um Patrono chega a zero, o servidor encerra a partida e mostra a opção de iniciar outra com novos decks.
- Passe o mouse sobre uma carta por um instante para ampliá-la sem interromper a partida. Em telas de toque, selecione a carta e use **Ampliar carta**. Cartas ocultas do rival e o indicador do baralho usam o verso oficial de RunaMarca.
- Efeitos de compra das cartas prontas geram créditos extras no botão: **Vidente Vaelita Cinéreo** (+1 ao entrar), **Passo Célere** (+2 ao conjurar), **Todas Minhas!** (+7 ao conjurar), **Sobrecarga Evolutiva** (+1 no início do seu turno se houver uma criatura com ataque atual 4 ou mais) e **Esfinge Sussurrante das Constelações** (+1 quando uma criatura Ágil declara ataque). Para declarar ataque, selecione a criatura em campo. Uma carta jogada oculta ativa seu efeito de entrada quando é revelada pela primeira vez.
- **Rúnico Solidário** pode ser girado para gerar 1 energia de Forja. **Rúnico Transbordante** gera 1 energia à escolha, ou 2 se você controlar uma criatura revelada com poder atual 4 ou maior. O servidor calcula o bônus e impede que a criatura ataque depois de gerar energia ou gere energia depois de atacar. A reserva ainda é um total único de energia; a escolha de cor aparece no texto da habilidade, enquanto a separação da reserva por tipos permanece para uma etapa futura.
- Atalhos: `1` compra uma carta; `Espaço` encerra o turno; `F` vira a carta selecionada; `R` a devolve à mão; `D` a descarta.

Na mesa em computador, tabuleiro, mão e controles cabem na altura da janela. **Atalhos** fica recolhido na lateral e pode ser aberto quando necessário. O histórico e o painel de ações podem rolar internamente quando acumulam conteúdo.

Os três decks prontos usam as artes das cartas. A mesa recorta visualmente o rodapé com a marca do editor e, nas criaturas, o número impresso que não pode mudar; os PNGs originais permanecem preservados em `public/decks/`. O ataque e a vida iniciais das 33 criaturas foram registrados no catálogo `public/decks/catalog.json` a partir do documento de origem. A arte é a referência para títulos e custos quando o texto do documento diverge.

As runas dos decks mostram **Ruptura** (antigo Igni/vermelho), **Forja** (antigo Ventus/verde) e **Fluxo** (antigo Glacies/azul). A mesa mostra o ícone correspondente e o nome da energia na reserva. Nos custos das demais cartas prontas, cada energia característica aparece como um símbolo separado; a energia neutra mantém um círculo numérico. Assim, **Torreta de Vigia** mostra 2 neutras + 2 de Forja. A faixa visual substitui os símbolos antigos na interface e preserva os arquivos de arte originais. As seis energias fornecidas estão em `public/energies.json`, com a imagem de referência em `public/energies.png`; **Eco**, **Véu** e **Vazio** aguardam decks e regras próprias.

## Importar um deck próprio

**Imagens:** selecione arquivos PNG, JPG, WebP ou GIF. Cada arquivo vira uma carta, com o nome extraído do arquivo. Sem tipo e custo definidos, ela pode ser colocada em qualquer área gratuitamente.

**JSON:** forneça uma lista de cartas, ou um objeto com a propriedade `cards`. Cada carta aceita `name`, `kind`, `cost` e `image` (data URL). `kind` pode ser `rune`, `creature`, `spell` ou `patron`. O custo tem `colored` e `generic`. Para criaturas, defina `power` (ataque) e `health` (vida); sem esses valores, o visor começa em 0/0. Também é possível definir `agile`, `drawEffect` (`trigger`: `enter`, `reveal`, `turnStart` ou `agileAttack`; `count`: 1–7) e `costDiscount` para testes:

```json
{
  "cards": [
    { "name": "Runa de Forja", "kind": "rune" },
    { "name": "Lobo das Cinzas", "kind": "creature", "cost": { "colored": 1, "generic": 2 }, "power": 2, "health": 2 }
  ]
}
```

Limites: 120 cartas e 25 MB por importação; imagens individuais de até 2 MB após conversão no navegador. Para trocar de deck durante a partida, use **Reiniciar partida e escolher decks**; isso reinicia a sala para os dois jogadores.

## Escopo atual

A mesa controla zonas, custo total de energia, uma Runa por turno, grupos de Runas, ordem das criaturas, turnos, sigilo, ajustes manuais de ataque/vida, a vitória por Patrono com vida zero e os efeitos de compra e geração de energia listados acima. Os textos antigos continuam dentro dos PNGs originais; a descrição atualizada da habilidade de energia aparece no painel da carta selecionada. Os demais efeitos, o combate, a duração de bônus temporários, energias distintas nos custos e regras específicas de patronos ainda são resolvidos entre os jogadores. Os decks fornecidos são monocor. As salas não são salvas: reiniciar o servidor encerra as partidas.

## Testar

```powershell
node --test
```
