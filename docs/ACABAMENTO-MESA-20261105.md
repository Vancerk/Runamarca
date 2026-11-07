# Runamarca — acabamento de materiais e objetos

Estado em 05/11/2026: implementação local após o pedido “Certo, continue”, dando sequência ao estudo de contraste. A paleta da primeira amostra foi aplicada ao cliente, seguida do acabamento de bordas, painéis, reservas, livro e vela. Não houve commit, push ou deploy. Os testes não representam aprovação estética do dono.

## Mudança entregue

- Campo de couro claro, madeira quente, bronze e azul profundo, conforme a amostra anterior.
- Bordas com chanfros e ferragens, painéis com centro recuado e reservas com trilhos de madeira.
- Livros com capa, páginas, lombada, fecho, cantoneiras e selo em losango próprio de Runamarca.
- Vela com cera irregular, gotas, pavio e chama volumétrica; castiçal com base, haste e prato. A chama não lança uma sombra sólida.
- Material procedural discreto para couro, papel, cera e esmalte. Peças estáticas reaproveitadas entre reconstruções; cache de junções limitado a 24 tamanhos.

`mesa-nova/hybrid/table-craft.js` é o módulo novo. A integração está em `bridge.js`, os materiais em `art-direction.js`/`renderer.js` e as cores da interface em `art-direction.css`. Câmera, posições das cartas/mãos/Patronos, interação, luz principal, ritmo e regras não foram alterados neste passe.

## Evidência e revisão

- Comparador: `http://127.0.0.1:3090/acabamento/` quando o servidor local estiver ativo.
- Jogo: `http://127.0.0.1:3086/runamarca/`. Os cinco arquivos foram comparados por SHA-256 com a candidata verificada: 5/5.
- [Método e resultados completos](../prototype-qa/acabamento-material-20261105/README.md).
- [Comparação geral](../prototype-qa/acabamento-material-20261105/comparacao-mesa.jpg) e [detalhes em tamanho real](../prototype-qa/acabamento-material-20261105/comparacao-detalhes.jpg).

O antes já tem a paleta da primeira amostra: a comparação separa mudança de cor da mudança na forma. As capturas são do cliente real em cenas repetíveis, não de uma partida inteira. Full HD e 1366×768; efeitos de Fulgor e encerramento em Full HD. O comparador foi verificado no Edge em larguras de painel de 640, 1024 e 1600 px, 11/11. O pedido de abertura no painel do Codex retornou `queued`; não se afirma nesta rodada ter observado a janela interna aberta.

## Verificação

Comparação 17/17, geometria 41/41, decorações 95/95, recuperação WebGL 25/25, contrato S2 7/7 e interação 145/145. Motor permanece `0ac0d8ca5cc1bdd42d4b997631b301f130cb571c5a75d95812c0e7ac8eaa0644`.

A primeira execução de decorações falhou na expectativa antiga de remover os nós de cartas após perda de WebGL. O comportamento aprovado da etapa 5 oculta a superfície durante a recuperação. A reprodução antes/depois apresentou 14 nós mantidos e 0 faces visíveis em ambos. Atualizado o teste para exigir faces invisíveis, alvos decorativos removidos, animação parada e aviso de recuperação. O produto não foi modificado para contornar essa asserção. Histórico preservado.

Uma falha visual introduzida no primeiro ensaio — diagonais de brilho na madeira das reservas — foi corrigida com UVs contínuas no topo das peças. O ensaio e as capturas finais estão separados.

## Custo e limites

16 reconstruções por resolução, DPR 1, uma execução por condição. A mediana total da ponte foi de 11,65→13,15 ms em Full HD e 10,90→12,60 ms em 1366×768; p95 de 13,20→17,20 e 12,40→18,30 ms. O desenho inclui a sincronização com a GPU já existente. Acrescentados 8.125 triângulos e uma chamada de desenho por reconstrução. Não há limite de aprovação de desempenho definido, e essa amostra não garante 60 FPS em partida nem em outro hardware.

Os materiais continuam procedurais; não foi criada uma nova camada de textura pintada. A revisão sonora, outros efeitos especiais e a validação em produção não foram repetidos. Este passe não é uma declaração de conclusão artística de todo o plano mestre. Próximo passo: avaliar o conjunto em tamanho real e usar as diferenças observadas para refinar a linguagem visual, sem reabrir câmera, regras ou disposição já aprovadas sem necessidade.
