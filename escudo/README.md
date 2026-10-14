# Escudo do Mestre

Também inclui as **Fichas de NPC** em **/escudo/npcs/**: criação de NPCs com selos de ameaça, habilidades, usos por descanso e combos. No portal, os dois têm atalhos na **Área do Mestre**, visível só para mestres.

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
3. opcional: `ESCUDO_MESTRES` no Render, IDs Discord separados por vírgula, para quem mestra mas não recebe relatórios.

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

## Fichas de NPC

A página é a ficha de NPC Elysium (selos Sem selo, Elite, Chefe e Soberano; atributos, vitais, perícias, resistências, traços, habilidades e combos), com o código em `public/npcs/`.

- **No site:** as fichas ficam na conta do mestre, no servidor (`/escudo/api/npcs`). Gravam sozinhas cerca de 1,5 s depois de cada alteração. Se outra aba ou outro computador gravou antes, a página mostra a versão salva em vez de sobrescrever.
- **Exportar:** gera JSON (para importar de novo) ou um HTML completo e independente. Esse HTML guarda as alterações no navegador de quem o abrir, como a versão original da ficha.
- **Importar:** aceita os JSON exportados, inclusive os da versão anterior da ficha, que salvava só no navegador.

## Portal

`public/mestre-atalhos.js` (carregado pelo `hub.html`) consulta `GET /escudo/api/me`. Só quando a resposta é 200 aparece a seção **Área do Mestre**, com os atalhos para o Escudo e para as Fichas de NPC. Para jogadores e visitantes nada muda.

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

- `GET /escudo/api/npcs` → `{ version, data, updatedAt }`, com `data = { npcs, current }`. Antes da primeira gravação, `data` é `null`.
- `PUT /escudo/api/npcs` com `{ version, data }` → `{ version, updatedAt }`, sem reenviar o documento. Versão desatualizada recebe **409** com a versão salva. Limites:
  - até 300 fichas;
  - até 3 MB por gravação;
  - `id` de cada ficha com até 64 caracteres (letras, números, `_` ou `-`), sem repetir.

  O formato interno de cada ficha é o da página: ela normaliza ao carregar.

## Tabela

```sql
CREATE TABLE IF NOT EXISTS elysium_escudo_mesas(
  master_id TEXT PRIMARY KEY,          -- ID Discord como string
  fichas JSONB NOT NULL,
  version INTEGER NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Uma linha por mestre. As fichas de NPC usam `elysium_escudo_npcs(master_id, data JSONB, version, updated_at)`, também uma linha por mestre. Não há migração destrutiva: remover o módulo deixa as tabelas intactas.

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
  public/npcs/            Fichas de NPC (index.html, npcs.css, npcs.js)
  public/assets/*.webp    mapas (antes embutidos em base64 no HTML)
  dev/demo.mjs            demonstração local (fora do site)
  dev/Abrir-Escudo-Demo.bat  atalho da demonstração no Windows
```

Só os arquivos listados em `STATIC` (e `assets/*.webp`) são servidos; nenhum caminho é montado a partir da URL.

## O que funciona sozinho e o que depende do projeto

- **Sozinho:** os testes (`pg-mem` e contas fictícias declaradas no arquivo) e todo o conteúdo de consulta.
- **Depende do projeto:** login Discord e `DATABASE_URL` configurados (sem eles, `/escudo/` responde 503); a Torre ativa para a lista de personagens e os retratos. Sem a Torre, a Mesa continua aceitando fichas por link e avisa que a biblioteca está indisponível.

## Fora deste módulo (decisões em aberto)

- **NPC na Mesa:** os NPCs ainda não entram como cartas na Mesa Atual.
- **Permissão por campanha:** hoje é por lista de mestres. Cada mestre tem a própria Mesa.
- **Atalhos no portal:** só aparecem para mestres (ver "Portal").
