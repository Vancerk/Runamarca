# Acesso administrativo da Torre

A Torre mantém o administrador principal em `DISCORD_ADMIN_ID`.
Para autorizar contas Discord adicionais, configure `TORRE_ADMIN_IDS` no Render
com IDs separados por vírgula. Exemplo: `1058895552080777247`.

A conta precisa entrar pelo login Discord do site. A lista adicional libera
os controles administrativos existentes, incluindo consultar relatórios privados,
editar e arquivar relatórios, vincular contas de personagens e executar o teste
de envio do bot. Não concede acesso ao Render, GitHub ou às credenciais do servidor.

`ESCUDO_MESTRES` e a lista de mestres responsáveis por relatórios não concedem
acesso administrativo à Torre. Para revogar o acesso adicional, remova o ID
de `TORRE_ADMIN_IDS` e aplique a configuração no Render. O acesso é verificado
em cada pedido ao servidor.

Teste: `node --test torre/backend/acesso.test.mjs`.
