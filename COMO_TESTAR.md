# Como testar RunaMarca em outro computador

1. Extraia todo o ZIP em uma pasta.
2. Instale Node.js 20 ou mais recente, se ainda não estiver instalado.
3. No Windows, dê dois cliques em `INICIAR_WINDOWS.bat`. Em macOS/Linux, abra um terminal nessa pasta e execute `node server.js`.
4. Abra `http://localhost:3000` no computador que está executando o servidor.

Para jogar com outra pessoa **na mesma rede**, mantenha o servidor aberto em um computador. O outro jogador acessa `http://IP_DO_SERVIDOR:3000` e usa o código da sala. Cada computador deve acessar **o mesmo servidor**; se cada um executar sua própria cópia, as salas serão separadas.

Para jogar **pela internet**, hospede esta pasta como aplicação Node.js em um serviço com HTTPS e compartilhe o endereço da hospedagem. O endereço `localhost` funciona apenas no próprio computador. As salas ficam na memória e são encerradas quando o servidor reinicia. Veja as etapas em [HOSPEDAGEM.md](HOSPEDAGEM.md).

Cada jogador escolhe e confirma um dos três decks na abertura da sala. Quando os dois terminam, a moeda sorteia quem escolhe a ordem dos turnos. Depois que um Patrono chega a zero de vida ou a partida é reiniciada, os decks podem ser escolhidos novamente.

O [README.md](README.md) traz as regras de uso e os limites atuais do protótipo.
