# Publicação V26.1.0 — 17/11/2026

Inclui as alterações da mesa já presentes no checkout (abertura/troca inicial, código da sala, arquibancada, composição e ajustes de fluidez) e o tutorial de três duelos da prévia de 17/11. A cópia de ritmo suspensa não foi incorporada.

O Tutorial aparece na entrada, próximo de Criar sala/Entrar com código, e junto de Regras durante a partida. O diálogo avisa que sair da tela não pausa a partida normal e que ela não tem salvamento permanente. A credencial da sala normal fica separada da credencial do tutorial. O menu do tutorial oferece início, retomada e revisita, com sequência por Continuar depois de cada vitória.

## Operação

- Aplicação completa: `server.js`, Docker Node 24, mesmo serviço Render e mesma instância.
- Tutorial: `/runamarca/tutorial/`; rotas, catálogo, relógio, cartas de ensino e sessões separados das salas normais. Vidas rivais 8/12/16.
- Acesso passa pela proteção já existente do Runamarca; o tutorial não concede permissões adicionais.
- No site, `DATABASE_URL` já configurada usa o pool existente de `accounts.mjs`. A tabela adicional `runamarca_tutorial_saves` é criada de forma não destrutiva no primeiro uso. Não há alteração das tabelas de perfis, inventário ou resultados.
- Chaves de acesso são armazenadas somente como hashes no banco; checkpoints nunca são servidos como arquivos públicos. Escritas aguardam confirmação e usam revisão condicional para impedir sobrescrita por processo antigo. Falha de gravação pausa a sessão. Checkpoint de versão incompatível é preservado e rejeitado, não apagado.
- Sem banco no Render, o tutorial falha explicitamente; não usa o disco efêmero como promessa de persistência. Em desenvolvimento local, há armazenamento em `runtime/tutorial` ou `RUNAMARCA_TUTORIAL_DIR`.
- Não há novo provedor, API paga, GPU de processamento, serviço de hospedagem ou mudança de plano.

## Validação e limites

A bateria CPU completa do pacote passou: 39 grupos, incluindo a suíte do portal, 56 testes do tutorial e 5 testes de integração. Estes cobrem três vitórias legítimas, retomada, recibos repetidos, separação de tokens, proteção de origem/acesso, arquivos/ranges de áudio, falha de gravação e PostgreSQL simulado. A proteção de revisão concorrente e checkpoint incompatível foi adicionada e validada separadamente depois da bateria. Os dados de conta/Discord são simulados, sem credenciais reais.

O pg-mem não simula fielmente uma segunda execução de CREATE TABLE IF NOT EXISTS; o teste preserva o primeiro DDL real e simula somente o segundo no-op. Não representa teste contra PostgreSQL real.

Nenhum navegador nem GPU foi iniciado nesta publicação. A prévia 60174 possui validação visual anterior em cinco tamanhos; os novos acessos e o site publicado não receberam nova conferência visual. A leitura de geometria no teste CPU não substitui essa conferência. Docker não está disponível neste ambiente; o build real deve ser confirmado no Render.

## Retorno

Versão anterior observada no site: `b8ed379277de87f23e23213bb1fbc1d2f6bd53ca` (V26.0.1). Retornar a esse deploy pelo Render ou reverter este PR pelo fluxo protegido. Não excluir a tabela de tutorial: a versão anterior simplesmente não a utiliza. Não usar force push, não alterar variáveis de ambiente, credenciais ou dados existentes. As prévias locais e o checkout original permanecem preservados.

Salas normais continuam em memória e podem ser interrompidas por deploy/reinício. A persistência do tutorial não muda essa característica do multiplayer.

Verificação final do pacote portável: **61/61 testes do tutorial e integração passaram**, incluindo rejeição de escrita concorrente e de checkpoint incompatível. Arquivos antigos de prévia usam caminhos relativos apenas para testes locais; a produção usa exclusivamente `production-server.mjs`.
