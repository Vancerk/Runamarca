# Forja: protocolos e controle de posições

Versão local. Sem publicação no site ou GitHub.

- Verônica: custo 8, base 4/5, Platina, uma cópia. Escolha obrigatória a cada formação; pode ser refeita antes de confirmar. Assalto: +2 de ataque próprio, +1 nos aliados das casas adjacentes. Escolta: +2 de vida própria, +1 nos aliados adjacentes. Bônus apenas naquele combate. Sem crescimento por eliminações. Escolta não cura feridas anteriores.
- Golias: custo 8, 5/10, Ouro, duas cópias. Pode provocar as duas casas adjacentes quando estiver no centro; nas pontas, apenas a vizinha. Ataca uma única vez. Permite escolher nenhuma ou uma casa adicional.
- Geada Implacável: custo 5. Demais efeitos e duas cópias preservados.
- De Volta a Estaca 1: custo inicial de teste 4, Ouro, duas cópias. Magia direta; reduz permanentemente a vida máxima e atual de qualquer criatura inimiga a 1. Mantém ataque. Retorno à mão continua restaurando os atributos originais.
- Miragem Provocadora: custo inicial de teste 2, Prata, duas cópias. Armadilha em uma posição inimiga. Com a posição aliada à frente livre e espaço na reserva, cria uma ficha 0/1 e concede Transpassar ao atacante inimigo apenas naquele combate. Caso não consiga criar a ficha, é ativada e descartada sem ambos os efeitos. A ficha não tem prazo próprio de expiração.
- Elfo Estudioso e Reparo de Emergência continuam fora do deck. Total: 30 cartas, 19 criaturas e 11 magias.
- Patrono: nova imagem enviada pelo usuário; nome e vida preservados.

As imagens das duas magias são provisórias, reutilizando artes existentes de Toque Gélido e Geada Implacável.

Verificações: test-forja-protocolos, test-oficina, test-fluxo, test-ui e test-presentation. Cobrem seleção de modo, fim dos bônus sem cura antiga, três ataques redirecionados com apenas um revide, restrições de adjacência, HP permanente, Miragem com posição ocupada/reserva cheia, Transpassar e identidade compartilhada entre prévia de combate e resolução. São testes de funcionamento; não constituem avaliação de balanceamento.

Prévia atualizada na porta 3050. O servidor 3049 não foi reiniciado para preservar a partida existente.
