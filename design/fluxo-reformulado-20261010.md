# Fluxo reformulado — 10/10/2026

Deck padrão: **Ecos de Virelion**, Patrono **Marika Venn**, 20 de vida. **30 cartas: 16 criaturas e 14 magias.**

Vaelgor mantém ID FV10, atributos 4/3, custo 6, arte e Revelação originais. Está em “Fluxo — estoque adicional” no criador, ao lado de Auramora. Ithalion tem ID FV15; Drenar Essência, FV16.

## Cartas

| Carta | Cópias | Éter | Corpo/tipo | Regra |
|---|---:|---:|---|---|
| Fogo Fátuo | 4 | 2 | 3/2 | Sem habilidades. |
| Âncora Etérea | 1 | 1 | Magia | Prepare em uma posição. Ancoragem — prenda a criatura revelada nessa posição durante este combate e o seguinte. |
| Aprendiz vireliana | 4 | 1 | 1/1 | Uma vez enquanto estiver em campo, ao jogar uma magia, crie na sua mão uma Faísca Vireliana: magia de custo 1 que causa 1 de dano a qualquer alvo. |
| Drenar Essência | 3 | 2 | Magia | Cause 1 de dano a qualquer alvo. |
| Banquete dos Heróis | 1 | 10 | Magia | Conceda permanentemente +1/+1 a todas as criaturas aliadas em campo para cada magia que já estiver no seu Nartvanyr. |
| Bruxa da Floresta Negra | 3 | 4 | 0/6 | O primeiro inimigo que atacar esta criatura recebe Corrupção: após esse ataque e cada ataque futuro, perde 1 de ataque permanentemente, mesmo após a Bruxa sair de campo. |
| Olho Flutuante | 4 | 2 | 2/2 | Revelação — Este Olho e o inimigo na posição oposta não atacam neste combate e ficam presos nessas posições até o combate seguinte, quando atacam normalmente. A trava não se repete nesse segundo combate. |
| "Uma a mais..." | 2 | 1 | Magia | Compre 2 cartas. |
| Ithalion, Mestre dos Selos | 1 | 6 | 4/2 | Revelação — Crie um selo em uma posição aliada e outro em uma posição inimiga, à sua escolha. Enquanto Ithalion viver, criaturas inimigas reveladas no selo trocam de lado com a criatura no outro selo e executam suas ações pelo lado de chegada. Após o combate, voltam ao dono. |
| Barreira espectral | 2 | 3 | Magia | Prepare em uma posição aliada. Por 2 combates, reduza à metade o dano dos ataques inimigos à criatura nessa posição, arredondando para cima. |
| Evasão Dimensional | 3 | 3 | Magia | Devolva uma criatura da reserva inimiga à mão de seu dono. Ela perde dano e bônus e volta com os atributos originais. |
| Sono Profundo | 2 | 2 | Magia | Prepare em uma posição inimiga. Adormecer — a criatura revelada nela fica presa nesta posição e não ataca até o fim do próximo combate após a ativação. |

## Detalhes de resolução

- Os selos são escolhidos antes de confirmar a formação; a escolha inimiga permanece oculta até a Revelação. São fixos e duram enquanto Ithalion estiver em campo vivo, mesmo se ficar na reserva. Retorno à mão remove seus selos.
- Uma criatura inimiga no selo troca de lado com a criatura no selo aliado; se a outra casa estiver vazia, apenas ela atravessa. Cada par troca uma vez por combate. Criaturas executam os efeitos/ataques pelo lado de chegada, mantêm equipamentos e modificações e retornam ao dono após o combate. Mortes e equipamentos quebrados vão ao Nartvanyr do dono original.
- Olho suspende os dois ataques do primeiro combate e conserva as posições até o segundo, no qual não reaplica sua Revelação e ambos atacam normalmente. Não expira em rodadas sem combate.
- Corrupção reage somente a ataques, aplica uma redução depois de cada ataque e nunca reduz abaixo de zero. A Bruxa só corrompe o primeiro atacante. Dano de magia e dano adjacente não aplicam Corrupção. Retorno à mão limpa a Corrupção.
- Barreira divide o dano de cada ataque por dois e arredonda para cima, antes de armadura/primeiro dano dobrado. Não divide dano de magias, Revelação ou dano adjacente. Expira após dois combates, mesmo com casa vazia.
- Cada Aprendiz cria uma única ficha na primeira magia jogada enquanto ela estiver em campo; preparações seguintes não renovam o uso. Voltar à mão e ser jogada novamente reinicia o uso, como no Geômetro. Jogar uma magia preparada conta; ativá-la no combate não. Criar uma ficha não dispara o efeito novamente. Limite da mão: nove; excesso vai ao Nartvanyr e ainda consome o uso único.
- Banquete conta apenas magias que já estavam no Nartvanyr, sem contar a própria carta, criaturas, equipamentos ou cartas inimigas. O bônus é permanente e inclui criaturas em Emanação.
- Auramora concede vida temporária à casa escolhida e não cura feridas anteriores. Auras de posição são recalculadas depois da troca dos selos.
- Drenar Essência ainda utiliza arte provisória reaproveitada; Ithalion utiliza a imagem enviada pelo usuário.

## Verificação

A suíte npm test passou após a atualização das expectativas antigas. Inclui test-fluxo-rework.mjs, com os casos acima. Verificação por navegador: escolha dos dois selos, troca visual sem duplicação, marcadores no tabuleiro, Vaelgor/Auramora no criador. Verificação HTTP real: seleção do deck aceita pelo servidor.

Versão local: http://127.0.0.1:3073/runamarca/


