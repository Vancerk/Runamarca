# Contas Elysium

O hub, o RunaMarca e o Seis Ossos oferecem **Entrar com Discord** e **Meu perfil**. Convidados continuam podendo jogar, sem histórico permanente.

## Configuração no Render

No serviço Elysium Jogos, configure `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_ADMIN_ID`, `DISCORD_REDIRECT_URI` e `DATABASE_URL` em Environment Variables. A conexão PostgreSQL deve incluir a senha atual e os parâmetros TLS fornecidos pelo Neon. Não publique esses valores no GitHub.

O retorno cadastrado no Discord é `https://elysiumjogos.onrender.com/auth/discord/callback`. O servidor pede apenas a permissão `identify`; não acessa email, mensagens ou servidores. Não há bot a instalar.

Na primeira conexão, o servidor cria as tabelas PostgreSQL. O Dockerfile instala o driver PostgreSQL durante o build. Sessões persistem no banco por 30 dias; apenas o hash do identificador da sessão é armazenado. O segredo Discord e a senha do banco ficam no ambiente do servidor.

## Perfil e resultados

- O perfil tem estatísticas separadas por jogo, inventário, totais de apostas e últimas 50 partidas.
- Somente partidas concluídas entre duas contas Discord distintas são computadas. A identidade fica vinculada à vaga quando se cria ou entra na sala. Entrar com Discord no meio de uma partida anônima não a torna válida para histórico.
- Bots, convidados e partidas interrompidas não contam.
- Resultados são gravados em uma transação e identificados por um ID de partida único, inclusive nas revanches. Repetir a gravação não duplica o resultado.
- Em falha de conexão, o servidor tenta novamente a cada 15 segundos. Se ele reiniciar antes de salvar um resultado pendente, esse resultado pode ser perdido; a fila de tentativas está em memória. Salas em andamento também continuam em memória e não sobrevivem a reinícios.
- O histórico pode ser baixado como CSV, compatível com Excel. O CSV contém as últimas 50 partidas e não substitui um backup completo do banco.

## Administração e insígnias

Em Meu perfil, a conta cujo ID corresponde a `DISCORD_ADMIN_ID` vê o painel de administração. As permissões também são verificadas no servidor.

Busque pelo nome de usuário exato, nome de exibição exato ou ID do Discord. Se vários usuários tiverem o mesmo nome, escolha a conta correta na lista com seus IDs. O jogador precisa ter entrado com Discord ao menos uma vez para ser encontrado. A identificação permanente é o ID, mesmo que o nome mude.

Todos os perfis começam sem insígnias, inclusive o administrador. Conceder e remover atualiza o inventário e gera um registro de auditoria. O Seis Ossos permite escolher apenas as insígnias possuídas. Remoção não desfaz efeitos já aplicados numa partida; impede novas escolhas. Em instalações sem configuração de contas, o modo antigo de teste mantém as insígnias livres.

O painel lista as salas do processo atual e seus participantes sem revelar mãos, cartas secretas, senhas ou tokens.

## Apostas

O valor informado ao criar a sala é o valor acordado **por participante**. `2 Or + 35 Pr + 70 Br` vira 23.570 Bronze; 1 Pr vale 100 Br, 1 Or vale 10.000 Br e 1 Pl vale 1.000.000 Br. Valores são inteiros. Um texto sem formato monetário, como `uma chave`, é guardado como item separado.

Os totais são apostado, ganho e perdido. Não há carteira, cobrança, transferência de dinheiro real ou concessão automática de itens. A aposta permanece combinada no RPG.

## Verificação após publicar

1. Abrir o hub e clicar em Entrar com Discord.
2. Autorizar Elysium Jogos e conferir o retorno ao site.
3. Abrir Meu perfil; a conta administradora deve ver Administração.
4. Entrar com outra conta e conferir que não aparece Administração.
5. Jogar uma partida com ambas vinculadas e conferir os resultados nos perfis.
6. Conceder uma insígnia, verificar a escolha no Seis Ossos e depois removê-la.

Os testes automatizados usam PostgreSQL em memória e respostas simuladas do Discord. Eles não acessam credenciais reais. A validação real depende das configurações no Render e da autorização do usuário no Discord.
