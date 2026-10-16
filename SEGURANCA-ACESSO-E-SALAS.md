# Acesso, autoria e salas

Regras aplicadas em 15/10/2026.

## Hierarquia

- Visitante: consulta o mapa/relatórios publicados e pode assistir às salas, respeitando a entrada do RunaMarca. Não cria salas ou relatórios, não vincula cartas nem ocupa vaga de jogador em produção.
- Jogador autenticado: cria salas dentro da cota e envia relatórios usando sua própria carta.
- Mestre: além do acesso de jogador, usa Escudo/NPCs e decide somente as missões atribuídas a ele. A condição de mestre vem das listas existentes, não de um campo declarado pelo navegador.
- Administrador: controles administrativos. Administradores adicionais da Torre continuam restritos ao escopo da Torre; somente `DISCORD_ADMIN_ID` revoga bloqueios de criação de salas.

## Salas

- Cota conjunta entre RunaMarca, Seis Ossos e as rotas antigas: 3 admissões de criação por conta em uma janela de 10 minutos. A quarta tentativa inicia pausa de 15 minutos.
- A cota conta admissões de criação; um pedido inválido após a admissão também pode consumir uma tentativa.
- Cinco novas tentativas durante a pausa geram bloqueio persistente de **criação de salas**. Esse bloqueio não retira o direito de consultar relatórios/perfil.
- Estado de pausa/bloqueio fica no Neon. Descartar cookies ou reiniciar o servidor não limpa o bloqueio da conta.
- Desbloqueio: entrar como administrador em `/perfil`, seção Administração → Limites de criação de salas → Desbloquear criação. O desbloqueio limpa a cota/pausa e registra o ato no banco.
- Limite global de 300 salas e de 50 espectadores por sala. A fila de POSTs da Torre tem limite de admissão de 64 pedidos.
- Limpeza a cada minuto: remove da memória salas sem presença/atividade por 15 minutos. Consultas de estado válidas e ações renovam a presença; conexão de eventos aberta preserva a sala. A verificação não usa apenas entradas e saídas de jogadores, pois uma partida ativa pode durar horas sem novas entradas.
- Sair explicitamente continua removendo a sala quando ela fica vazia. A limpeza não remove históricos de partidas concluídas no banco. Salas expiradas não são recuperadas por código antigo.
- O controle de salas é feito para a implantação atual com um processo que mantém as partidas em memória. Não habilitar múltiplas réplicas sem adaptar o armazenamento/coordenação das partidas e das cotas.

## Autor e revisão

- A sessão Discord determina a identidade. Um ID digitado ou o ID de uma carta recebido no JSON não é prova de identidade.
- A interface seleciona automaticamente uma carta vinculada à conta. Havendo mais de uma, o seletor mostra somente as cartas dessa conta.
- Cartas sem vínculo precisam de conferência/vinculação administrativa. O cadastro de fichas de companheiros continua disponível para usuários autenticados, mas não concede propriedade sobre essas cartas.
- A primeira vinculação manual e a geração de códigos de vinculação ficam reservadas à administração da Torre. Atualizar uma ficha já vinculada exige seu dono ou administrador. Prévia de importação fica vinculada à conta que a iniciou.
- Visitantes recebem uma versão reduzida do cadastro. Mestres mantêm os campos necessários para as ferramentas do Escudo; isso não concede permissão administrativa.
- Quem possui um link reservado válido pode consultar aquela versão. Para editar, o servidor exige também a sessão Discord do autor e um pedido de correção aberto. Ter apenas o link não permite editar.
- Reenvio bloqueia a versão até nova decisão. Links antigos continuam inválidos depois do reenvio. O administrador conserva a ferramenta própria de edição auditada.
- A leitura por link não torna todos os relatórios pendentes públicos: sem um link/recibo válido, o acesso continua sujeito às permissões existentes.

## Verificação

Testes locais cobrem cota compartilhada, concorrência, pausa que expira, bloqueio que sobrevive a nova instância, desbloqueio restrito ao administrador e registrado, limite global de salas, expiração com relógio simulado, visitante como espectador, autoria canônica e leitura sem edição por terceiros. Testes de interface usam Chrome local com identidades fictícias; não geram DMs. A suíte completa de jogos também foi executada.

Segredos do Render, Neon e bot permanecem em variáveis privadas. A visibilidade pública do repositório permite leitura/cópia do código; não concede escrita ou publicação no repositório original.

A inicialização conecta o bot, mas não dispara novamente campanhas antigas de teste. Testes manuais de relatório permanecem destinados a van_renascido; os resultados históricos continuam disponíveis nos endpoints existentes.

## Complemento da auditoria adversarial — 15/10/2026

O exame da versão pública `43f1ccb` reproduziu 11 ocorrências em 38 verificações locais. O PR `4745749` bloqueou oito; três pontos remanescentes foram corrigidos no trabalho local seguinte:

- Respostas públicas de relatórios aprovados usam uma lista explícita de campos das cartas. Mantêm nome, jogador, nível, divisão, classe, virtude, retrato e identificador, mas retiram o ID Discord, vínculo, origem da ficha e metadados futuros. As informações internas permanecem disponíveis nas operações reservadas existentes.
- O resumo de apostas cria propriedades próprias para nomes de itens, incluindo nomes reservados do JavaScript. Isso impede modificar objetos herdados ao acumular contagens.
- DOCX passa por validação de diretório ZIP, limites de entradas e tamanho descompactado, CRC, membros necessários, tipo principal e rejeição de macros/ActiveX e caminhos inadequados. A validação não extrai arquivos para disco, não é antivírus e não garante segurança de todo conteúdo aberto pelo usuário. PDF e imagens continuam sujeitos aos limites e verificações anteriores.

Os 26 testes dos componentes alterados passaram. A repetição da bateria adversarial passou pelas 38 verificações, sem reproduzir as 11 ocorrências anteriores. Isso não constitui certificação de ausência de outras falhas. Em 16/10/2026, foi retomado o teste no Chrome local que antes estava bloqueado pela revisão automática: os quatro cenários de renderização passaram na versão pública e na corrigida, sem execução do conteúdo fictício ou navegação externa. A suíte completa dos jogos também passou. Não houve alteração de produção durante a auditoria.

Regressões adicionais: `npm run test:security-adversarial`. O relatório completo, resultados e reproduções locais ficam fora do repositório público, na pasta de homologação.
