# RunaMarca — mesa atual

A mesa abre em **/runamarca/** no portal Elysium Jogos; o criador abre em **/runamarca/criador/**. O catálogo executável é `cartas.json`.

## Abrir localmente

Na raiz: `npm ci`, depois `npm start`. Porta padrão 3000, configurável por `PORT`. Para rodar apenas o RunaMarca: `node mesa-nova/server.mjs`, porta padrão 3042. No OneDrive, use `NODE_OPTIONS=--preserve-symlinks --preserve-symlinks-main` se ocorrer EPERM.

Entre com o código de acesso. Crie uma sala e use Copiar convite para convidar outro jogador; com duas vagas ocupadas, o convidado entra na arquibancada. Cada aba guarda sua vaga durante a sessão. Falhas temporárias de rede preservam a vaga e o estado; sala inexistente ou token inválido exigem entrar novamente. Reiniciar o servidor remove as salas em memória.

## Regras atuais

1. Há cinco decks prontos: Caçada de Fronteira (Ruptura), Selos de Virelion (Fluxo), Juramento de Aço (Forja), Oficina de Lyrik (Forja) e Ecos de Virelion (Fluxo). Os três primeiros têm 24 cartas; os dois novos, 30. O limite geral é 30, sem contar o Patrono.
2. Bronze/Lacaio: até 4 cópias por modelo; Prata/Padrão: 3; Ouro/Elite: 2; Platina/Soberano: 1. São limites por carta, não por número de modelos da raridade.
3. Patronos começam com 16 de vida. A moeda define o primeiro jogador na rodada 1; a ordem se inverte a cada nova rodada.
4. Cada jogador recebe 5 cartas e pode realizar **uma** troca inicial. Cartas devolvidas são embaralhadas antes da reposição e podem voltar. Ao esgotar a troca, a interface apresenta a mão nova e confirma automaticamente. Mão máxima: 9 cartas; excedentes vão ao Nartvanyr.
5. No início de cada preparação, o máximo de mana sobe 1 até 10, a mana se recupera e o jogador compra 1 carta. Sem cartas no deck, cada compra causa fadiga: 1, 2, 4, 8… Compras de um mesmo grupo de magias preparadas resolvem antes da decisão de vitória; se ambos caírem nesse grupo, ocorre empate. Usos diretos encerram ao atingir a condição de vitória.
6. Criaturas entram na reserva. Ela comporta 8 criaturas **fora** da Emanação, que comporta outras 2. Da mão à Emanação paga-se apenas o custo da carta; mover entre as duas zonas custa 1 mana.
7. Ao terminar as duas preparações, ambos decidem sobre combate. Um voto a favor inicia a formação secreta; dois votos contra avançam a rodada. Cada jogador distribui até três criaturas e confirma. Não é possível reiniciar uma partida em andamento.
8. Magias de posição, Revelações e ataques resolvem nessa ordem. Ataques comuns trocam dano simultaneamente, mesmo com animações em sequência. Iniciativa causa dano antes de um rival sem Iniciativa; um derrotado não revida. Posição sem defensor recebe dano no Patrono.

## Magias e habilidades

- Magias ofensivas exigem inimigos; cura e melhoria exigem aliados. As mesmas restrições valem para preparar e reposicionar. Âncora permite qualquer lado.
- Retirar uma magia durante a mesma preparação devolve a carta e reembolsa somente o valor pago, limitado à mana máxima. Não há reembolso entre rodadas.
- Dano em área direta usa o valor reduzido da carta e atinge inimigos fora da Emanação; preparado atinge até três posições. Armadilhas de dano em área expiram ao fim da rodada mesmo sem ativar. Outros efeitos seguem sua duração específica.
- Barreira dá vida temporária ao ocupante de uma posição aliada durante dois combates. Bônus em todo o campo aliado, como Banquete dos Heróis, podem incluir Emanação e atingir 10 criaturas.
- Adormecer prende a criatura na posição, sem atacar ou ser reposicionada, até o fim do próximo combate após a ativação. Ainda recebe dano. Provocar continua sendo uma habilidade passiva enquanto adormecida.
- Retornar à mão restaura atributos originais e remove dano e bônus. Ao jogar novamente, o custo original é pago. Com mão cheia, a carta vai ao Nartvanyr.
- Provocar redireciona o atacante de uma posição adjacente escolhida, sem conceder ataque extra. Transpassar causa ao Patrono o excedente do dano de combate.

## Interface e criação

Arraste criaturas e magias para as zonas permitidas. Clique em magia para selecionar o alvo. Curadores em Emanação usam um seletor visual e uma linha de alvo. Passe o mouse para ver a carta completa, explicações à direita e narrativa à esquerda após uma breve espera. Cartas em combate usam a mesma ilustração, sem gerar conteúdo adicional. Mãos e armadilhas rivais permanecem ocultas.

O criador salva modelos editáveis no armazenamento do navegador. Se estiver indisponível, informa que a carta está apenas na memória: exporte o JSON antes de sair. O JSON pode ser importado em outro navegador. A referência de pontos usa dados das habilidades atuais; mecânicas sem preço calibrado deixam o saldo incompleto.

Na seleção de deck, importar um projeto aplica **arte, enquadramento, fala e narrativa** aos modelos existentes. Não substitui regras, atributos nem composição do catálogo. Campos históricos não representam automações do motor atual.

O final mostra a captura do Patrono derrotado e o vencedor em destaque, com a opção de nova partida. O histórico usa PostgreSQL quando configurado; a gravação pode ser tentada novamente após uma falha temporária.

## Limites e testes

Salas ficam em memória: use uma instância. Sair ou ir à arquibancada durante uma partida ainda cancela a mesa e retorna à escolha de decks; não é registrado como derrota automática. Fechar a aba não equivale a sair.

Execute `npm test` na raiz. Testes isolados verificam regras e apresentação; não garantem equilíbrio de decks nem qualidade subjetiva do áudio. Resultados de baterias antigas correspondem ao código e catálogo registrados em seus respectivos arquivos.
