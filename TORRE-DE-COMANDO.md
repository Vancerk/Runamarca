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

## Teste de entrega ao administrador

Na área administrativa, o botão Enviar relatório de teste envia somente para o ID 1080332488070672484 (van_renascido). O relatório fictício contém o texto anexado, não possui botões de aprovação e não cria missão no mapa. O servidor precisa de DISCORD_BOT_TOKEN configurado no Render; o token inserido no PowerShell da prévia local não é transferido ao serviço online. A interface distingue bot não configurado, conectando e conectado. A mesma chave de teste não repete um envio cuja confirmação ficou incerta.

## Campanha de fluxo autorizada em 2026-10-07

Execução única solicitada pelo administrador: dez relatórios fictícios espaçados em seis segundos e, após um minuto, vinte chegadas espaçadas em meio segundo. Destinatário único: van_renascido. A campanha inicia no próximo deploy de main no serviço original do Render, após conferir origem e administrador. Uma reivindicação persistida no Neon impede repetição após reinícios; uma execução interrompida exige investigação antes de qualquer nova campanha.

O teste usa validação, fila serial, persistência no Neon e envio Discord do servidor real, com registros separados em flow-relatorios.json. Não publica missões, não oferece aprovação, não testa login, navegador, ingresso HTTP nem usuários simultâneos. Relata horários de chegada, espera na fila, duração até confirmação e IDs de mensagens. Confirmação significa aceitação pelo Discord, não leitura do destinatário.

O transporte observa os cabeçalhos de limites do Discord e aguarda reset ou retry_after. Só repete rejeições explícitas HTTP 429; entregas incertas não são reenviadas automaticamente. O resultado privado fica na tabela elysium_torre_flow_runs e na rota administrativa /torre/api/admin/bot/flow-result. A rota de acompanhamento /api/torre-flow-result exige um recibo aleatório privado e permite apenas leitura; seu hash não inicia campanhas nem autoriza envio de mensagens.
