# Ecos de Virelion — importação e revisão

Novo deck independente de Fluxo: 30 cartas, 12 modelos. Selos de Virelion e os outros decks foram preservados.

## Regras confirmadas pelo autor

- O texto visível prevalece sobre dados de orçamento conflitantes.
- Auramora cura apenas criaturas aliadas; não cura o Patrono.
- Bruxa: -1 de ataque permanente, uma vez por criatura diferente para aquela instância da Bruxa. Guarda os identificadores dos alvos, não seus nomes; duas cópias diferentes podem ser afetadas. Cada Bruxa possui seu próprio histórico.
- Evasão Dimensional devolve uma criatura da reserva inimiga à mão, restaurando atributos e custo originais e removendo dano, bônus e estados. Não alcança Emanação. Se a mão já tiver nove cartas, a criatura vai ao Nartvanyr.
- Âncora mantém a criatura na posição durante o combate de ativação e o próximo combate. Rodadas em que ambos recusam combate não encerram a âncora.
- Barreira permanece por dois combates, inclusive se a posição estiver vazia. Ao expirar, vai ao Nartvanyr.

## Composição

| Carta | Custo | Corpo | Raridade | Cópias |
|---|---:|---|---|---:|
| A luz enganosa | 2 | 3/2 | Bronze | 4 |
| Âncora Etérea | 2 | Magia | Ouro | 1 |
| Aprendiz vireliana | 1 | 1/1 | Bronze | 4 |
| Auramora | 1 | 1/1 | Prata | 3 |
| Banquete dos Heróis | 6 | Magia | Platina | 1 |
| Bruxa da Floresta Negra | 4 | 1/4 | Bronze | 3 |
| Olho Flutuante | 2 | 2/2 | Bronze | 4 |
| Uma a mais... | 1 | Magia | Prata | 2 |
| Evasão Dimensional | 2 | Magia | Prata | 3 |
| Vaelgor Dareth, O Diretor | 6 | 4/3 | Platina | 1 |
| Barreira espectral | 3 | Magia | Ouro | 2 |
| Sono Profundo | 3 | Magia | Prata | 2 |

## Pontos para supervisão

1. Olho Flutuante tinha cura de Emanação no orçamento, mas não no texto. A cura não foi implementada. Bruxa tinha Dreno Etéreo nos dados, também ausente do texto; ele não foi implementado.
2. A luz enganosa tem apenas uma frase narrativa no campo de efeito. Portanto não recebeu habilidade. Frases, imagens, enquadramentos e custos originais foram preservados.
3. Algumas magias trazem ataque/vida residuais do editor. Esses atributos foram ignorados: são magias, não criaturas.
4. Âncora, Barreira e Sono Profundo dependem de uma casa. Neste protótipo, são colocadas em posições; clicar nelas oferece os símbolos das casas. Âncora pode prender um ocupante aliado ou rival. Barreira é aliada. Sono é preparado em uma casa inimiga: ao ativar, prende o ocupante nessa casa, impede seu ataque e sua retirada ou reposicionamento durante o combate de ativação e o seguinte. Ele continua recebendo dano. Rodadas sem combate não encerram o sono.
5. Vaelgor fortalece as casas aliadas adjacentes. Na posição central, alcança duas; nas pontas, apenas uma. O bônus acaba no fim do combate.
6. Banquete afeta todas as suas criaturas em campo, incluindo Emanação. A imunidade de Emanação a dano em área continua preservada; este efeito é um benefício, não dano.
7. A vida temporária da Barreira absorve dano primeiro. No fim do combate, removem-se o bônus e o dano que ele absorveu; a expiração sozinha não mata a criatura.
8. Aprendiz exige outra criatura aliada com benefício ativo de magia. Buff permanente conta enquanto a criatura estiver em campo; magia de compra não conta.
9. Uma a menos e Benção Estelar foram retiradas na revisão de 04/10. Os efeitos antigos continuam disponíveis no motor e nos testes de regressão. A mão de nove continua valendo: compras excedentes queimam.
10. Os dados de orçamento originais foram preservados como referência. Novas habilidades ainda precisam de precificação no assistente de criação; este trabalho não demonstra equilíbrio competitivo.

## Confrontos e interface

Dano normal é calculado simultaneamente. Iniciativa resolve antes; criatura morta por Iniciativa não ataca. Confrontos recíprocos são animados juntos e atualizam ambos os HPs no impacto. As cartas param nas bordas, recuam e retornam. Provocar aponta visualmente origem e casa desviada, preservando o segredo antes da revelação.

Reserva: oito criaturas fora de Emanação, mais duas vagas separadas. A mão inicial permite ampliação. A narrativa usa fundo mais escuro, e os indicadores de vida ficam contidos na camada visual de cada carta.

## Verificação

Testes automatizados: composição, permanência da maldição, alvos diferentes, dano simultâneo, colisão sem sobreposição, âncora, barreira, buffs, descarte e capacidade da reserva. Regressões da Oficina, servidor, contas, orçamento, mão e fadiga. Verificação visual da importação, das cinco cartas iniciais e da ampliação sem corte nas bordas.
