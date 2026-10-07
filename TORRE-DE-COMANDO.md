# Torre de Comando integrada

O portal mostra o atalho da Torre apenas à conta Discord definida em DISCORD_ADMIN_ID. O servidor verifica a mesma sessão em todas as rotas /torre/, APIs e arquivos. Esta fase é um teste administrativo no site principal; jogadores comuns ainda não têm acesso à Torre, inclusive aos links de correção.

## Publicação

A imagem Docker inclui a Torre e Python 3 (o extrator usa somente a biblioteca padrão). Node 24 é obrigatório. Os dois jogos permanecem nas mesmas rotas.

A Torre reaproveita DATABASE_URL e o pool existente, sem outro servidor ou banco. Cria somente a tabela elysium_torre_files. Não apaga contas, inventários ou resultados. Registros, fichas, retratos e anexos são recuperados do Neon para uma pasta temporária privada. O sucesso das mutações só é confirmado depois de salvar no banco. A configuração pressupõe uma única instância do serviço.

Configure DISCORD_BOT_TOKEN nas variáveis privadas do Render para habilitar envio e aprovação. Não inclua o token no Git, no chat ou na interface. O bot conecta automaticamente ao abrir a Torre. Evite executar a cópia local simultaneamente com o mesmo token. LEGION_ARCHIVE_CHANNEL_ID habilita opcionalmente a publicação de aprovados no canal.

LEGION_ENABLED=false desativa somente a Torre. Sem token, o mapa funciona, mas o envio fica indisponível.

As fichas e relatórios pessoais da prévia local não foram copiados ao repositório nem enviados ao banco. A biblioteca online começa vazia e permite importar fichas por link.

## Armazenamento e validação

Orçamento inicial: 64 MiB para o conteúdo persistido da Torre, incluindo retratos, documentos e registros. Isso não representa a cota livre real do Neon: os jogos compartilham a cota. Prefira links do Drive para documentos maiores. Os mapas estáticos ficam no código, fora do Neon.

Os testes usam PostgreSQL simulado, arquivos temporários e identidades fictícias. Verificam autorização, origem, recuperação após recriar a Torre, preservação binária, limite e os fluxos de aprovação e correção. Não comprovam capacidade para 140 pessoas no Render. Testes de carga no site principal exigem monitoramento e sessões fictícias e não devem enviar mensagens reais em massa.

Execute npm test e npm run test:torre antes da publicação. Acesso: /torre/ após entrar com Discord como administrador.
