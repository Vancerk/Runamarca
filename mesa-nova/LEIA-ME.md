# RunaMarca — mesa nova de teste

Esta mesa usa as regras e os três decks de `cartas.json`. No servidor principal, ela abre em `/runamarca/`; o Seis Ossos continua em `/dados`. Também pode rodar sozinha para desenvolvimento.

## Abrir localmente

No terminal, execute `node mesa-nova/server.mjs` a partir da raiz do projeto e abra http://127.0.0.1:3042. Nesta instalação do Codex, se o Node encontrar um erro `EPERM` ao resolver caminhos no OneDrive, execute `node --preserve-symlinks --preserve-symlinks-main mesa-nova/server.mjs`.

Informe o código de acesso da mesa e crie uma sala. O botão **Copiar convite** gera um link próprio da sala: quem recebe esse link informa somente o nome e entra como jogador, ou como espectador se as duas vagas estiverem ocupadas. O link concede acesso à mesa; compartilhe-o apenas com quem deve entrar. Também é possível entrar manualmente com o código de seis caracteres da sala. Cada aba guarda sua vaga na sessão do navegador. As salas existem apenas enquanto o processo estiver ligado.

Para jogar pela internet, publique a pasta `mesa-nova` como um serviço Node independente, com `npm start` ou seu Dockerfile. O servidor usa a variável `PORT` e expõe `/health`. O endereço local `127.0.0.1` funciona apenas no computador que executa o servidor.

## Fluxo da partida

1. Cada pessoa escolhe um dos três decks. Quem vence a moeda escolhe quem prepara primeiro.
2. Cada pessoa recebe cinco cartas. Cada deck tem 24 cartas: lacaios podem ter três cópias, padrões duas e elites uma. No começo de cada preparação, aumenta seu máximo de mana em um (até dez), recupera toda a mana e compra uma carta. A mão comporta nove; compras excedentes vão ao cemitério.
3. Jogue criaturas na reserva e, quando possível, coloque uma criatura elegível em uma das **duas vagas de Emanação**. Da mão diretamente para Emanação, pague somente o custo impresso. Mover uma criatura que já está em campo entre reserva e Emanação custa **1 mana por movimento**. Selecione uma magia para usá-la imediatamente ou prepará-la em uma das três posições.
4. Após as duas preparações, cada pessoa decide se quer combate. O primeiro “sim” inicia imediatamente a formação secreta, sem esperar outra resposta. A rodada só passa sem combate se ambas disserem “não”. Arraste até três criaturas da reserva para as posições e confirme.
5. O servidor resolve apenas as etapas que ocorreram: magias posicionadas, habilidades de Revelação e ataques de posições correspondentes. Ataques a posições vazias reduzem a vida do Patrono. Dano em criaturas persiste.

Magias ofensivas podem ser usadas imediatamente contra uma criatura inimiga na reserva ou colocadas ocultas em uma posição rival. Magias de cura e melhoria podem ser usadas imediatamente na reserva aliada ou colocadas abertas junto a uma posição aliada. Uma magia de compra pode resolver imediatamente ou ficar aberta na sua posição e disparar quando uma criatura aliada for revelada ali. Na posição, o custo é pago no momento de colocação e o efeito só dispara quando uma criatura entra naquela posição em combate. Cada pessoa pode preparar no máximo uma magia sua por posição de cada lado; a magia persiste se a posição correspondente ficar vazia.

O projeto editável do [criador](../criador-isolado/LEIA-ME.md) pode ser importado na escolha de deck. A mesa associa as ilustrações pelos nomes dos modelos iniciais. Você também pode importar PNGs completos das cartas: o nome do arquivo precisa corresponder ao nome da carta, como `rastreadora-das-fronteiras.png`. PNGs completos aparecem por inteiro na mesa; o JSON editável contém somente a ilustração, que aparece com nome e atributos montados na interface. Os efeitos e valores continuam vindo do protótipo oficial; editar regras no criador não altera o motor da mesa.

Passe o mouse sobre uma carta para ampliar sua imagem e seu texto ao lado. Clique duas vezes para abrir o detalhe. Durante a formação, arraste criaturas da reserva para o centro da posição; o destaque indica a área de encaixe. Em telas pequenas, os três botões de posição continuam disponíveis. Cada lado do tabuleiro mostra as duas vagas de Emanação e o cemitério público. Os retratos iniciais dos três Patronos são arte conceitual gerada para esta mesa e podem ser substituídos pela imagem de Patrono importada no início da partida.

Os [prompts e arquivos dos retratos](patrons/PROMPTS.md) registram o conceito visual usado como referência: caçador de fronteira, mago de Virelion e guardiã anã da forja. A arte foi gerada com a ferramenta integrada `image_gen`; estes personagens ainda são visuais provisórios do protótipo.

## Limites atuais

O objetivo é facilitar testes com dois jogadores e espectadores. Salas não persistem após reiniciar o servidor e o serviço deve ter uma única instância. O combate é automático; sua duração varia conforme os efeitos que realmente disparam. O registro e “Último confronto” conservam o resumo. Cada lado tem um cemitério público para criaturas derrotadas e magias consumidas. A duração de 15 a 25 minutos e o equilíbrio dos decks ainda precisam ser medidos em partidas humanas. A vitória por estrelas de procurado continua reservada para outra versão. Veja [BALANCEAMENTO-V02.md](BALANCEAMENTO-V02.md) para hipóteses de teste e a proposta de Provocar.

Teste técnico: `node --preserve-symlinks --preserve-symlinks-main mesa-nova/test.mjs` nesta instalação, ou `npm test` em um ambiente Node convencional.
