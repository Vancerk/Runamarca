# Ruptura integrado na prévia local

30 cartas, 13 modelos: 21 criaturas e 9 magias. Artes, quantidades, atributos, custos, falas e narrativas do arquivo do autor foram preservados. O deck foi adicionado ao jogo e ao catálogo do criador, mantendo Fluxo e Forja.

## Regras confirmadas

- Geometro gera uma ficha 1/1 ao combater uma criatura; a ficha entra na reserva e não ataca no mesmo combate.
- Comandante Gnoll recebe +2 de ataque por outra criatura com ataque efetivo até 1 entrar; o bônus termina com a rodada/combate.
- Aríete permite pagar 1 Éter durante a formação. O ataque adicional só entra na Revelação e dura aquele combate. O pagamento é anunciado no registro e no aviso dos dois participantes; a carta exibe “Revelação +1”. Não pagar ou fechar a escolha permite jogar sem o bônus.
- Vultobreve puxa somente uma criatura livre na reserva inimiga, fora da Emanação e das posições de combate. A casa em frente precisa estar vazia. A criatura puxada permanece naquela casa até o combate; se a formação inimiga estava confirmada, precisa ser confirmada novamente. Reposicionar/retirar Vultobreve desfaz sua escolha antes do combate.
- Rastreadora mantém somente a aura +1/+1 para outros Tribais. Sacrifício removido. A aura desaparece ao perder a fonte.
- Retaliação acumula por ataques de criaturas com ataque efetivo até 2; consome 4 acúmulos para cada dano ao Patrono inimigo.
- Crias aplica Último Suspiro mesmo em mortes simultâneas.
- Fulgor e Estilhaço escolhem criaturas ou Patronos de qualquer lado. O motor atual não possui uma ação de anular magia; Fulgor preserva a indicação de não poder ser anulado.
- Chamado cria duas fichas mais uma por cópia anterior no Nartvanyr do dono, respeitando o limite de oito criaturas fora da Emanação. A própria cópia sendo resolvida não aumenta sua contagem.
- Cólera, usada na preparação, prepara +2 de ataque para as criaturas que participarem nas posições de combate daquela rodada; não fortalece a reserva nem a Emanação.
- Debulhador só recebe +1 de ataque enquanto seu Patrono estiver estritamente abaixo da metade da vida máxima.

## Verificação

`test-ruptura.mjs`: importação/artes, dano a qualquer alvo, fichas e limite da reserva, entradas/Gnoll, mortes simultâneas, aviso compartilhado e pagamento opcional do Aríete, animação de buff na própria carta, Vultobreve e casa ocupada/Emanação, aura e remoção, Retaliação, Cólera e duração dos bônus.

Regressões aprovadas: interface, apresentação, Oficina/Forja, protocolos e Fluxo. Isso verifica as regras; não é uma bateria estatística de balanceamento.

Servidor de prévia: porta 3052. A sala da porta 3051 foi preservada. Nenhuma publicação no site ou no GitHub nesta etapa.
