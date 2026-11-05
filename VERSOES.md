# Versões do Runamarca

A versão preparada para publicação autorizada pelo dono em 05/11/2026 é **V26** (`26.0.0`, canal `release`). A fonte é `mesa-nova/version.json`, exibida na entrada da mesa 3D e em `/api/runamarca/version`. O identificador Git diferencia o código; “+ alterações locais” indica que o commit sozinho ainda não representa todos os arquivos em teste.

Não foi encontrada uma sequência de tags de lançamento. `package.json` ainda usa `0.1.0` para o pacote do portal; isso não é a numeração histórica do jogo. O nome V25 aparece explicitamente em `d1420a6`. Os números de porta 3086 e as revisões 1–12 da mesa híbrida não são versões publicadas do jogo.

## Marcos comprovados no histórico disponível

| Data | Commit | Marco |
|---|---|---|
| 26/09/2026 | e92e628 | Primeiro commit disponível; não prova que seja o primeiro protótipo criado fora do Git. |
| 26/09/2026 | f88c268 | Arquivos completos do Runamarca. |
| 29/09/2026 | 4fe43b4 | Nova mesa com acesso protegido e correções de combate. |
| 30/09/2026 | 756a805 | Contas Discord, perfis PostgreSQL e inventário. |
| 18/10/2026 | cf81402 | Polimento visual, trilhas, vozes e entradas. |
| 21/10/2026 | f848110 | Merge de publicação registrado no Git; não comprova o deploy que está no ar hoje. |
| 28/10/2026 | d1420a6 | Base identificada como V25. |
| 30/10/2026 | f32be61 | Mesa híbrida até revisão 9. |
| 30–31/10/2026 | 49e747e / 88ad7b5 | Revisões 10–12 e validações. |
| 31/10/2026 | d7a29cd | Commit de segurança da revisão de UI, com continuação local posterior. |
| 01/11/2026 | alterações locais | V26 em desenvolvimento: mesa híbrida e revisão do dono; não publicada por este trabalho. |

`mesa-nova/version-history.json` preserva os commits encontrados e os marcos de versão. Não foram inventados números V1–V24 nem uma versão para o site atual.

## Publicação V26

A entrada `/runamarca/` e seus aliases servem a mesa 3D. Os módulos compartilhados foram preservados. A candidata inclui as revisões visuais, retorno da Evasão, recuperação do bot, Registro e questionário pós-partida. Desktop prioritário; tarefas longas de reconstrução continuam documentadas. O deploy e seu commit devem ser confirmados em `/api/runamarca/version`.

## Próximas versões

Ao preparar uma candidata, registrar o commit exato, testes e aprovação do dono. Depois da validação, atualizar o manifesto para `26.0.0` e canal `release`, incluir essa alteração no commit testado e publicar somente essa candidata. Correções posteriores podem usar `26.0.1`; novos conjuntos de funcionalidades, `26.1.0`. A próxima mudança de geração pode usar V27. Nenhum desses números avança automaticamente a cada tentativa do Claude.

No Render, `RENDER_GIT_COMMIT` identifica o commit executado; o manifesto identifica a versão do jogo. Para saber a versão antiga hoje no ar, é necessário conferir o deploy ativo no painel. Os exemplos 1.25 e 1.31 não foram tratados como fatos.
