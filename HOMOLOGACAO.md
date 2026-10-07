# Homologação Elysium — preparo em 7/10/2026

Estado: cópia local dos jogos preparada. Nenhum serviço Render, projeto Neon ou publicação foi criado nesta etapa. As otimizações existem no código local e na cópia em jogos/. O ambiente online ainda depende do acesso aos painéis e do repositório conectado ao Render.

## Separação dos dados

1. Criar um projeto NOVO e vazio no Neon, chamado elysium-homologacao. Não criar uma ramificação com dados copiados da produção. Usar uma região equivalente à do banco real e as mesmas configurações de compute para comparação.
2. Criar outro Web Service Free no Render, chamado elysium-homologacao. Usar uma cópia/repositório/branch separado e impedir publicação automática no serviço de produção.
3. Publicar o conteúdo de jogos/ usando Docker; health check /health. O Dockerfile inclui accounts.mjs e read-cache.mjs, necessários para as otimizações.
4. Configurar DATABASE_URL exclusivamente com a conexão do novo projeto Neon, pelo painel Environment. Não incluir essa conexão no Git nem enviá-la pelo chat.
5. Preparar contas, inventários e resultados fictícios no banco novo. Login Discord real, se necessário para teste humano, precisa de uma URL de retorno válida para o endereço de homologação. O teste automatizado precisa de uma preparação restrita de sessões fictícias; a criação desse mecanismo e a adaptação do gerador ocorrerão depois de configurar o ambiente.
6. Verificar que uma gravação de teste aparece somente no banco novo. Só depois iniciar a carga.

## Teste online proposto

- Patamares: 40, 60, 80, 100 e 140 usuários, em ações mistas dos jogos.
- Aquecimento de 2 minutos; 5 minutos por patamar; teste contínuo de pelo menos 30 minutos; entradas simultâneas e reconexões.
- Medir: tempo de resposta, erros, memória e CPU do Render, consultas e filas do Neon, fidelidade do estado das partidas e resultados gravados.
- Critérios propostos antes de rodar: zero acesso indevido, duplicações ou perda de resultados; até 1 segundo para 95% das consultas imediatas; sem reinicialização por falta de memória. Pedidos que aguardam mudanças são avaliados pelo atraso da notificação, não pelo tempo total de conexão.
- Interromper a carga se aparecer corrupção de dados, reinicializações repetidas ou aumento contínuo dos tempos de resposta. Os limites numéricos são critérios do projeto, não garantias fornecidas pelos provedores.
- Ao terminar, suspender o serviço de homologação para reduzir consumo compartilhado.

## Custos e limites gratuitos

Render: as 750 horas gratuitas são por workspace e compartilhadas entre os serviços. A homologação também usa essa franquia e a de tráfego; não manter a cópia ativa o mês inteiro.
Referência: https://render.com/docs/free

Neon: projeto separado tem seus próprios limites do plano. Confirmar no painel que foi criado no Free, sem selecionar upgrade.
Referência: https://neon.com/blog/neon-free-plan-1-gb-per-project

## Escopo da cópia

A pasta jogos/ contém Runa Marca e Seis Ossos, ativos estáticos e arquivos de execução; não contém .env real, node_modules, conexão de banco, tokens de Discord nem registros reais de usuários. O arquivo .env.example contém apenas nomes/configuração de exemplo.

A Torre de Comando ainda é outro servidor local: tem restrição de Host/Origin para localhost e arquivos JSON. Ela não está integrada neste pacote de publicação nem migrada para Neon. Para testar os três sistemas juntos no mesmo Render, é preciso primeiro definir essa integração e o armazenamento de relatórios/anexos. Não publicar diretamente o servidor local da Torre.