# Etapa 2 — baixas, retornos à reserva e redistribuição

05/11/2026. Base: `f7a8d92`, PR #16. Etapa 2 encerrada; continuação autorizada até a etapa 5, sem parada entre blocos.

O Set `movingCards` foi retirado do cliente. Combate, cadáveres aguardando a etapa de baixas, portais, retorno à reserva e deslizamento dos vizinhos usam tickets por partida/UID em `RunaCardArrivals`. Cada ticket possui a limpeza de suas cópias e animações; uma conclusão antiga não libera um movimento novo. Resize cancela a mão, mas preserva o arco de baixa que acompanha o Nartvanyr em movimento.

Compra, Evasão, devolução do mulligan e retorno à reserva agora são adaptações declaradas em `RunaPresentation`, sem substituir funções globais desses fluxos. As cópias e os tempos atuais foram preservados.

A regressão encontrou uma disputa real: no movimento reduzido, a compra terminava enquanto um vizinho ainda deslizava, e sua jogada não era enviada. Uma ação pode agora assumir o UID ocupado apenas pela acomodação de vizinhos; não pode cancelar outra jogada ou compra. O teste voltou a jogar a carta na mesma rodada.

## Validação

- Node: 37 verificações dos contratos de apresentação, propriedade das cartas, fantasmas, morte/revanche, interface, galeria e retorno.
- Navegador: movimento 12/12; compras/Evasão 26/26; abertura e transferências 35/35; combate focal 52/52, nos dois assentos, com Registro aberto, resize, movimento reduzido e saída da sala.
- Evidência local: `prototype-qa/simplificacao-baixas-20261105/`. A primeira rodada registra o defeito da jogada durante a redistribuição e verificações que ainda liam o Set removido. Resultados finais em `final/arrivals`, `final2/transfers`, `final2/combat`; movimento em `regressao/motion`.
- Motor SHA-256 preservado: `0ac0d8ca5cc1bdd42d4b997631b301f130cb571c5a75d95812c0e7ac8eaa0644`. Renderer, câmera, ritmos e regras não foram editados. Sem novo trabalho de celular.

Não houve teste de produção, merge ou deploy neste bloco. A próxima etapa unifica a leitura das coordenadas projetadas; mapas de recursos de cada efeito continuam existindo, mas já não decidem separadamente quem controla o UID.
