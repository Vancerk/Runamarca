# Escudo do Mestre

Painel de consulta do mestre (regras, condições, perícias, biomas, preços, mapas, gerador de NPC) e **Mesa Atual** com as fichas dos jogadores ao vivo. Servido em **/escudo/** pelo mesmo `server.js`, com o login Discord e o PostgreSQL já existentes.

## Executar e testar

Nada a instalar além do projeto. Com o servidor rodando (`npm start`), abra `/escudo/`.

```bash
npm run test:escudo   # node --test escudo/backend/escudo.test.mjs (PostgreSQL simulado com pg-mem)
```

## Demonstração local (sem login e sem banco)

Serve para testar no próprio computador antes de publicar. Requer Node.js 24 e nenhuma instalação extra.

```bash
node escudo/dev/demo.mjs      # no Windows, também dá para usar escudo\dev\Abrir-Escudo-Demo.bat
```

Abra http://127.0.0.1:3080/escudo/. A demonstração usa o mesmo código do site, com três diferenças:

- sem login Discord: escuta só em 127.0.0.1;
- a Mesa fica em `escudo/dev/.dados/mesa-demo.json`, ignorado pelo Git;
- personagens e retratos da Torre vêm do site publicado. Para usar outro endereço, defina `ELYSIUM_ORIGIN`.

O `server.js` não importa nada de `escudo/dev/`.

## Quem acessa

Só mestres autenticados. A lista é montada no servidor e relida a cada minuto:

1. `DISCORD_ADMIN_ID` (administrador do site);
2. os mestres de `torre/backend/mestres.json` (os mesmos que recebem relatórios na Torre);
3. a lista própria do Escudo, `escudo/mestres.json` (mesmo formato `{ "id", "name" }`), para quem usa o Escudo mas não recebe relatórios;
4. opcional: `ESCUDO_MESTRES` no Render, IDs Discord separados por vírgula.

Sem login, a página manda para `/auth/discord?return=/escudo/`. Uma conta que não é mestre recebe 403 na página, nos arquivos e na API. Todo o conteúdo do Escudo (inclusive CSS, JS e mapas) fica atrás dessa checagem.

## Como se liga ao resto

| Peça | De onde vem | Observação |
| --- | --- | --- |
| Sessão | `identify(req)` de `accounts.mjs` | Cookie `elysium_session`; nenhum login novo. |
| Banco | `accountDatabase().query` | Tabela própria `elysium_escudo_mesas`, criada na primeira chamada. |
| Origem | `publicOrigin()` | `PUT` exige `Origin` igual ao site, além do `validMutationOrigin` do `server.js`. |
| Personagens | `GET /torre/api/characters` (já público) | O Escudo não copia fichas: guarda só o `characterId` da Torre. |
| Retrato | `/torre/<portrait>` | Retrato extraído pela Torre ao cadastrar a ficha (`extrair-ficha.py`). |
| Valores ao vivo | Google Sheets (gviz/JSONP), no navegador | Vida, Éter, Estamina, PA, armas, arquétipo e Q&D, como antes. |

Mudanças fora desta pasta: `server.js` (1 import + 1 linha de rota, logo após a Torre), `Dockerfile` (`COPY escudo ./escudo`) e `package.json` (script `test:escudo`).

## API

Todas exigem sessão de mestre. Respostas JSON, `Cache-Control: no-store`.

- `GET /escudo/api/me` → `{ id, name }`
- `GET /escudo/api/mesa` → `{ version, fichas, updatedAt }`. Mesa vazia: `{ version: 0, fichas: [], updatedAt: null }`.
- `PUT /escudo/api/mesa` com `{ version, fichas }` → grava se `version` for a atual e devolve a nova (`version + 1`). Se outra aba gravou antes: **409** com a versão salva no corpo, sem sobrescrever.

Cada entrada de `fichas` (máximo 12):

```json
{ "id": "uuid-da-entrada", "characterId": "id-do-personagem-na-torre", "imagem": "https://… (opcional)" }
{ "id": "uuid-da-entrada", "link": "https://docs.google.com/spreadsheets/d/<id>/edit", "imagem": "https://… (opcional)" }
```

Exatamente um entre `characterId` e `link`. O link é normalizado no servidor. `imagem` só aceita https. Campos desconhecidos são descartados.

## Tabela

```sql
CREATE TABLE IF NOT EXISTS elysium_escudo_mesas(
  master_id TEXT PRIMARY KEY,          -- ID Discord como string
  fichas JSONB NOT NULL,
  version INTEGER NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Uma linha por mestre. Não há migração destrutiva; remover o módulo deixa a tabela intacta.

## Arquivos

```text
escudo/
  integracao.mjs          liga o handler a accounts.mjs (identify, banco, origem)
  backend/handler.mjs     rotas, permissões, validação e persistência
  backend/escudo.test.mjs testes de autorização, origem, validação, conflito e persistência
  public/index.html       páginas do escudo (servido com CSP)
  public/escudo.css       estilos (página própria; não afeta os jogos)
  public/abas.js, recolher.js, mapas.js, npc.js   comportamento das abas, mapas e gerador
  public/fichas.js        cartas dos jogadores e Mesa (API + biblioteca da Torre)
  public/assets/*.webp    mapas (antes embutidos em base64 no HTML)
  dev/demo.mjs            demonstração local (fora do site)
  dev/Abrir-Escudo-Demo.bat  atalho da demonstração no Windows
```

Só os arquivos listados em `STATIC` (e `assets/*.webp`) são servidos; nenhum caminho é montado a partir da URL.

## O que funciona sozinho e o que depende do projeto

- **Sozinho:** os testes (`pg-mem` e contas fictícias declaradas no arquivo) e todo o conteúdo de consulta.
- **Depende do projeto:** login Discord e `DATABASE_URL` configurados (sem eles, `/escudo/` responde 503); a Torre ativa para a lista de personagens e os retratos. Sem a Torre, a Mesa continua aceitando fichas por link e avisa que a biblioteca está indisponível.

## Fora deste módulo (decisões em aberto)

- **Ficha de NPC:** ainda não definida.
- **Permissão por campanha:** hoje é por lista de mestres. Cada mestre tem a própria Mesa.
- **Atalho no portal (`hub.html`):** não adicionado, porque o portal é público e o Escudo é só para mestres.
