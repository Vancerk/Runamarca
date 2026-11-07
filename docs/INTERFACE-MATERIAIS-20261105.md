# Materiais da interface — continuidade da direção audiovisual

Continuação: [fechamento integrado](FECHAMENTO-AUDIOVISUAL-20261105.md), com aviso persistente de conexão, legendas quando o áudio não toca, roteiro das falas e nova validação de login/partida/feedback. Os resultados abaixo continuam como histórico deste passe de materiais.

Após o acabamento físico da mesa, a direção quente/azul foi aplicada à oficina, aos campos do questionário, às escolhas por teclado e ao aviso real de recuperação. As regras da paleta anterior não estavam todas sendo substituídas: algumas tinham maior prioridade CSS; a recuperação também usava um seletor que não correspondia ao componente.

O produto mudou somente em `mesa-nova/art-direction.css`: tokens comuns de superfície, campo, controle e relevo; oficina quente com ferramentas em azul profundo; estados de seleção/foco/erro e controles desativados legíveis. Preservados câmera vertical, foco de 400 ms, material 3D, cartas, afinidades, ritmos e motor.

Verificação em Edge: 34/34 em Full HD e 1366×768, mais 18/18 com movimento reduzido. Testadas escolhas reais com o motor, oficina com gravação/exportação, questionário com falha e nova tentativa simuladas no transporte e aviso real de perda de contexto. Não houve nova prova de banco/servidor de produção nem teste completo de partida nesta rodada.

O comparador passou em 12/12: ocupa a largura do painel, carrega as 36 capturas e permite comparação e inspeção em 100%. A prévia 3086 serve os mesmos cinco arquivos da candidata conferidos por SHA-256.

- [Método, capturas e limites](../prototype-qa/interface-material-20261105/README.md).
- Comparador local: `http://127.0.0.1:3090/interface/`.
- Jogo local: `http://127.0.0.1:3086/runamarca/`.
- Oficina local: `http://127.0.0.1:3086/runamarca/criador/index.html`.

## Estado do plano

| Parte | Estado atual |
|---|---|
| Hierarquia, leitura, controles e exceções | Aplicação local e validação registradas; este passe fecha as diferenças de material encontradas na interface. |
| Mesa, materiais e objetos | Acabamento físico anterior preservado, com madeira quente, couro claro, bronze e azul profundo. |
| Movimento, foco luminoso e encerramento | Implementação da entrega integral preservada; não foi redesenhada nem revalidada integralmente nesta rodada. |
| Controles de som e prioridade de efeitos | Implementação e 49 testes anteriores preservados; nenhuma mudança de áudio agora. |
| Novas faixas, gravações e ilustrações | Curadoria/conteúdo, não entregues como se já existissem; audição e proveniência/licença de candidatos continuam pendentes. |
| Avaliação estética e publicação | Comparador disponível; testes não substituem a percepção do dono. Candidata local, sem commit/push/deploy desta etapa. |

As referências antigas com verde são históricas. Esta nota não altera retroativamente suas capturas ou inventários. O inventário próprio desta rodada registra o CSS em `5131e046…`; os quatro módulos de acabamento 3D e o motor continuam iguais ao marco anterior.
