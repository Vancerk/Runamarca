# Hospedar RunaMarca na web

## O que já existe

`server.js` é um backend multiplayer Node.js real. Ele cria salas para dois jogadores, dá um token privado a cada um, mantém mão e baralho ocultos do adversário, valida as ações e transmite alterações em tempo real por Server-Sent Events (SSE). O editor e a mesa são servidos pelo mesmo processo. Não é necessário contratar outro backend para um teste online.

**Limite importante:** salas, partidas e tokens ficam somente na memória. Uma reinicialização perde as salas; duas instâncias independentes não compartilham partidas. Para testes com amigos, configure **uma única instância sempre ligada**. Persistência em banco de dados e recuperação de partidas são etapas futuras.

## Publicar com Render

1. Extraia o ZIP e coloque todos os arquivos em um repositório Git privado ou público. `server.js`, `package.json`, `Dockerfile` e a pasta `public/` precisam ficar na raiz do repositório.
2. No Render, crie um **Web Service** conectado a esse repositório.
3. Escolha o runtime **Docker**; o `Dockerfile` já inicia o servidor. Configure **uma instância**. Se o painel pedir uma porta, use `3000`; o Render também fornece `PORT` automaticamente e o servidor a lê.
4. Configure o health check para `/health`, se a opção estiver disponível.
5. Aguarde o endereço HTTPS fornecido pelo Render, abra a página e crie uma sala. Envie o link de convite ao amigo. Ambos devem entrar pelo **mesmo endereço público**.

O plano gratuito do Render pode suspender o serviço por inatividade e a partida em memória se perde após uma reinicialização. Para partidas longas, use uma instância paga sempre ligada. O sistema ainda não possui banco de dados; um plano pago evita suspensão automática, mas não transforma as partidas em persistentes.

## Testar localmente antes de publicar

Requer Node.js 20 ou mais recente. Na pasta extraída:

```powershell
node --test
node server.js
```

Abra `http://localhost:3000` e `http://localhost:3000/health`. O segundo endereço deve responder `{"ok":true}`. O editor fica em `http://localhost:3000/editor.html`.

Como alternativa, se houver Docker:

```powershell
docker build -t runamarca .
docker run --rm -p 3000:3000 runamarca
```

## Próxima etapa para partidas persistentes

Guardar salas em um banco compartilhado, restaurar partidas após reinício, limitar o crescimento de salas abandonadas e adicionar autenticação de conta, se o jogo passar de protótipo para serviço público.
