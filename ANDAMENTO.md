# RunaMarca — andamento

## Foco atual: criador de cartas

O editor independente está em `/editor.html`. Ele tem uma identidade visual nova para RunaMarca, campos para ilustração, título, tipo, classificação, texto, ataque/vida e energias neutra, Ruptura, Forja e Fluxo. A carta é montada do zero em canvas, com prévia ao vivo. A arte agora ocupa toda a área interna; título e regras ficam em painéis sobrepostos, com moldura simplificada. Os símbolos são recortados em círculos e a antiga assinatura “Crônicas dos Mercenários” foi retirada. Em Terreno · Runa, os valores de energia aparecem em destaque na área de texto e indicam quanto a Runa produz ao girar; os custos de outras cartas continuam na faixa superior. **Patrono é um modelo separado**, inspirado nas cartas do Canva: arte integral, moldura e ornamentos ajustáveis, título com três opções de letra, painel de transparência variável e três habilidades numeradas com título, custo e efeito. É possível baixar o PNG, guardar modelos neste navegador, baixar um projeto editável e exportar um deck JSON para a mesa. Os primeiros campos de habilidades automáticas cobrem compra de cartas, Ágil, geração de energia ao girar criatura e desconto ligado a criaturas Ágeis. As três habilidades do Patrono ainda não acionam regras automáticas.

## Mesa de jogo: abertura e partida

A sala agora abre com escolha central dos decks Ruptura, Forja e Fluxo para cada jogador, seguida de confirmação individual. Quando ambos confirmam, uma moeda sorteia quem decide jogar primeiro ou em segundo. O servidor bloqueia a troca de decks durante a partida; os decks voltam a ser escolhidos após reinício ou Patrono com vida zero. A mesa continua com zonas, turnos, sigilo da mão, grupos de runas, compra limitada, atributos ajustáveis e os efeitos já implementados. As cartas antigas dos três decks continuam usando PNGs herdados; o custo visual nelas ainda é uma correção de apresentação.

## Integração atual

O JSON do editor pode ser carregado na **escolha de deck**. O servidor conserva nome, tipo, classificação, texto, imagem, ataque/vida, custos por energia e os dados de estilo/habilidades dos Patronos. A mesa ainda gasta apenas a soma total das energias; conferir Ruptura, Forja e Fluxo separadamente fica para a futura revisão de regras. Textos livres aparecem na carta; apenas os efeitos escolhidos nos campos estruturados já implementados acionam regras automáticas no servidor.

## Próximas decisões com o criador

- Validar com artes reais a distribuição do título e das três habilidades no Patrono.
- Ampliar os campos estruturados de habilidades conforme as regras forem definidas.
- Substituir os decks antigos gradualmente por cartas criadas neste editor, de preferência com as ilustrações originais.

## 2026-10-07 — Feedback da mesa e poderes da Forja (prévia local)
- Comandante Gnoll: Revelação, bônus único de +2 condicionado a outra criatura aliada com ataque até 1. Aríete Protegido: custo 3.
- Balões públicos independentes da fila de áudio, acompanhando a carta pelo UID, sem repetição. Deck rival invertido e quantidade restante no hover.
- Magias usadas aparecem integralmente para todos e seguem para o cemitério após o efeito. Marcadores preparados centralizados longe das divisórias de Emanação.
- Retaliação: quatro pontos visuais e projétil ao completar quatro. Vultobreve: prioridade de cinco segundos na formação, com contador e bloqueio de movimentação concorrente.
- Patronos: Marika Venn (Fluxo) e Lyrik Koltar (Forja).
- Forja: Potencializar custa 2, uma vez por rodada, +1 ataque OU +1 vida a um aliado; Ultimato custa 4, uma vez por partida, +2/+2 e Transpassar. Efeitos permanentes em campo; retorno à mão limpa os bônus. Duas artes próprias com recorte circular via CSS.
- Suite npm test aprovada: 39 testes Node, testes de regras/apresentação e 18 regressões de auditoria. Seleção de alvo, gasto de energia e bloqueio de Potencializar conferidos na UI.
- Prévia 3053. Relatório: outputs/forja-atual-20261007.md. GitHub ainda no commit da publicação anterior.

## 2026-10-07 — Disparo e bateria de 48 partidas
- Disparo de Forja (custo 3): selecionar aliado e inimigo; aliado causa dano igual ao ataque efetivo, sem revide nem Transpassar de combate. Integração no catálogo da mesa e criador, seleção dupla e projétil a partir do aliado.
- Bateria no motor real: 16 por confronto, pilotos imediato/planejado, 24 sementes com ordem inicial invertida. Forja × Fluxo 7–9; Forja × Ruptura 1–15; Fluxo × Ruptura 0–16. Total Forja 8/32, Fluxo 9/32, Ruptura 31/32.
- Relatório, CSVs, catálogo e resultados em design/testes-2026-10-07-48. Nenhum nerf adicional aplicado. Poderes da Forja incluídos; outros Patronos sem equivalentes.
- npm test aprovado e texto/custo conferidos no criador; prévia atual em http://127.0.0.1:3054/runamarca/ (3053 preservada para a sala existente).

## 2026-10-07 — Rebalanceamento aprovado da Ruptura
- Comandante Gnoll: mantém custo 3 e corpo 2/3; Revelação concede +1 de ataque naquele combate se outra criatura aliada numa posição de combate tiver ataque efetivo até 1. Não acumula por quantidade de aliados.
- Chamado da Tradição: custo 3, duas fichas Tribais 1/1 na reserva, sem crescimento por cópias no cemitério.
- Geômetro: custo 1, corpo 1/1, gera uma ficha Geometro 1/1 somente na primeira vez em que for bloqueado por entrada em campo. Reposicionar não renova; devolver à mão e jogar novamente renova.
- Estilhaço Elétrico: custo 1, causa exatamente 1 de dano a qualquer alvo, incluindo criaturas e Patronos de ambos os lados.
- Rastreadora da Mata preservada integralmente. Catálogos da mesa e do criador sincronizados; Ruptura continua com 30 cartas.
- npm test aprovado, incluindo regressões de condição/limite do Gnoll, primeiro bloqueio e retorno do Geômetro, prévia de combate e quatro categorias de alvo do Estilhaço. Bateria histórica de 48 partidas preservada; não representa este novo balanceamento.
- Prévia local atualizada: http://127.0.0.1:3055/runamarca/. Servidores e salas anteriores preservados. Nenhuma publicação no GitHub nesta etapa.

## 2026-10-07 — 48 partidas após o rebalanceamento da Ruptura
- Repetição controlada: mesmas 24 sementes, iniciativas invertidas e pilotos imediato/planejado da bateria anterior; somente as quatro cartas aprovadas alteradas.
- Forja × Fluxo: 7–9, idêntico inclusive nas ações. Forja × Ruptura: 2–14 (antes 1–15). Fluxo × Ruptura: 0–16 (igual).
- Ruptura: 30/32 vitórias, contra 31/32. Uma partida mudou de vencedor e 14 mudaram de duração. Média geral 7,69 rodadas, contra 7,48.
- Estilhaço: dano agregado ao Patrono 62→26; Gnoll 56→28. Fichas de Chamado 64→56 e Geômetro observadas após combate 39→34. O domínio da Ruptura permanece nos pilotos testados.
- Relatório, partidas, métricas comparadas, catálogo e validação em design/testes-2026-10-07-48-rebalanceamento. Resultados anteriores preservados. Sem mudanças adicionais de balanceamento ou publicação.

## 2026-10-07 — Patronos 20 e nova bateria de 48 partidas
- Vida inicial e máxima 20 no motor, catálogos, regras e padrões do criador. Partidas novas aplicam a mudança; salas existentes não foram interrompidas.
- Mesmas sementes e pilotos da bateria após os quatro nerfs. Forja × Fluxo 9–7 (antes 7–9), Forja × Ruptura 5–11 (antes 2–14), Fluxo × Ruptura 0–16 (igual).
- Total Forja 14/32, Fluxo 7/32, Ruptura 27/32. Cinco vencedores mudaram, todos a favor da Forja. Média 8,90 rodadas, contra 7,69.
- Golias 12→25 usos, Verônica 3→6, Cataclisma 3→5. Contra Ruptura, Forja chegou à rodada 8 em 8/16, contra 3/16.
- npm test aprovado; regressão nova cobre as três energias, visão pública, reinício e catálogos com somente vida alterada. Teste de UI normalizado para CRLF sem mudar comportamento do jogo.
- Relatório e dados: design/testes-2026-10-07-48-patrono20. Prévia: http://127.0.0.1:3056/runamarca/. Browser automatizado indisponível por falha de inicialização do ambiente; regra validada pelo motor e suíte. Sem publicação no GitHub nesta etapa.

## 2026-10-07 — Forja ajustada e Fluxo sem poderes de Patrono
- Miragem não concede Transpassar; mantém ficha 0/1, espaço livre e descarte sem efeito. Toque Gélido 2→1. Reforço Divino custo 5→3, +2/+2→+1/+1. Catálogos do jogo/criador idênticos.
- Bateria final 32 partidas + 32 de controle, mesmo piloto/sementes e zero poderes de Patrono. A partir desta etapa, próximos testes também não devem usar poderes até nova orientação.
- Placares Fluxo–Forja 5–11→7–9; Fluxo–Ruptura 0–16.
- Piloto corrigido: snapshots não compartilham formação escolhida e Miragem considera casa livre. Migração de piloto não é mudança de regra do jogo.
- Destaque público de magia com canvas de alta resolução, entrada e voo ao Nartvanyr; sem avisos centrais sobre a carta. Limpeza em mudança de sessão e reentrada de fila. Regressão de público/destino aprovada, npm test aprovado.
- Dados e relatório em design/testes-2026-10-07-32-fluxo-sem-poderes. Prévia 3057 preserva salas anteriores. Navegador automatizado indisponível; sem screenshot ou publicação nesta etapa.

## 2026-10-07 — Emanação, poderes compactos e Éter (prévia local)
- Magias usadas permanecem em destaque pelo triplo do tempo visível anterior: preparação 0,79→2,37 s; magia direta com efeito de 1,5 s, 2,29→6,87 s. Voo ao Nartvanyr preservado; etapa de magia do combate ajustada para 2,83 s.
- Marcadores preparados nas laterais das casas, próximos às divisórias de Emanação, com folga; posição espelhada para ambos os lados.
- Vagas de Emanação 53×74→75×105 px: aproximadamente o dobro da área, mantendo proporção. Cartas com Emanação, da mão ou reserva, diminuem continuamente a até 90 px das vagas e recuperam o tamanho ao afastar. Aproximação não joga a carta; soltura mantém validações e custos existentes.
- Poderes mostram apenas ícone/custo. Hover ou foco abre explicação ampliada, incluindo frequência e uso; poderes desabilitados também permitem consultar, sem ativação.
- Éter retirado do canto do Patrono: painel ao lado dos poderes com pontos individuais disponíveis/gastos e quantidade atual/máxima da rodada. Vida permanece no coração.
- npm test aprovado; testes finais direcionados de apresentação, protocolos, interface e arraste aprovados após o ajuste exato de duração. Prévia responde HTTP 200 em http://127.0.0.1:3058/runamarca/. Salas anteriores preservadas.
- Validação visual no navegador indisponível por falha de inicialização da ferramenta. Sem nova simulação de balanceamento ou publicação no GitHub nesta etapa.

## 2026-10-07 — Poderes da Forja, equipamentos e martelo (prévia local)
- Ultimato substituído por Forjar Arma: custo 4, uma vez por partida. Escolhas de custo 1/5/10 na ativação; estrutura antes da própria preparação seguinte; lâmina antes da posterior. Etapas obrigatórias anteriores à compra/recarga normal, sem cobrança adicional. Arma entregue na mão.
- Potencializar substituído por Forjar Armadura: custo 1, uma vez por rodada, +1 de Vida Extra apenas ao Patrono, cumulativa e absorvida antes da vida normal. Não cura nem aumenta a vida máxima. Todas as fontes de dano do motor respeitam a proteção, incluindo fadiga.
- 27 equipamentos (3×3×3). Estruturas: durável, Transpassar ou Iniciativa. Lâminas: bônus estável, bônus condicionado a estar ferido, ou maior bônus com 1 de dano ao portador após atacar. Todas gastam exatamente 1 de durabilidade por ataque.
- Jogar arma custa 1/5/10; equipar em criatura custa 1, uma arma por criatura. Equipamento quebrado vai ao Nartvanyr; morte/retorno à mão do portador solta a arma na reserva com desgaste preservado. Não ocupa vaga de criatura nem recebe desconto de magia.
- Cartas mostram equipamento acoplado, durabilidade e zoom próprio; produção pública com escolhas privadas; armas na mão permanecem secretas. Indicador de Vida Extra separado do coração.
- Martelo detalhado desce ao clicar, com choque, recuo, faíscas, ondas e tremor; áudio grave e metálico no impacto. Uso confirmado também aparece ao rival e espectadores, evitando repetir o próprio clique. Proteção contra clique duplo e mudança de turno durante animação.
- npm test aprovado; testes novos de motor/interface abrangem produção em três turnos, cobranças, sigilo, desgaste, morte, Iniciativa, Transpassar, retorno, dano próprio, bônus condicional, armadura e áudio sincronizado. Verificação visual por navegador indisponível.
- Prévia http://127.0.0.1:3059/runamarca/; servidores anteriores preservados. Relatório outputs/forja-armas-e-armadura-20261007.md; 27 receitas em JSON/CSV. Valores de design preliminares, sem nova bateria de balanceamento e sem publicação no GitHub.
- Ajuste final: texto original da criatura preservado; regras da arma ficam no seu zoom próprio. Prévia final 3060, preservando também a prévia 3059. Regressão de texto/equipamento aprovada.

### 07/10/2026 — imagens e atributos das armas
- Artes por custo: 10 espada, 5 martelo, 1 adaga, com proporções preservadas. Ataque bônus no canto inferior esquerdo e durabilidade no escudo de Vida Extra à direita, inclusive no zoom.
- Valores base retirados do texto de regras; mantidos os efeitos e custos de equipar. Destaque das magias reduzido em 50%, com sincronização da linha de tempo do combate.
- Testes direcionados de equipamentos, escolhas da forja, apresentação, protocolos, interface e layout aprovados. Prévia local 3061; sem nova bateria de balanceamento.
## 2026-10-08 — Efeitos de dano, martelo e alinhamento da armadura
- Escudo de Vida Extra do Patrono centralizado no mesmo eixo do coração, acima dele. O coração mede 47 px e avança 19 px além do retrato; o centro de ambos fica 4,5 px para dentro da borda direita.
- Magias de dano saem do Patrono: Estilhaço com cristal vermelho/eletricidade; Fulgor com carga violeta/branca e brasas da própria arte; Disparo da Forja recolhe energia da criatura aliada antes de conduzi-la ao alvo inimigo.
- Incursora lança machado; Crias deixam bolas de fogo após a morte; Cataclisma reverbera impacto para vizinhos; Transpassar forma cone; Lâmina Brutal causa rasgo/recuo no portador. Ataques de poder 4+ têm poeira/ondas e áudio mais pesado. Regras e simultaneidade do motor preservadas.
- Canvas compartilhado por efeitos concorrentes, resolução ajustada ao visor, sons procedurais diferentes por efeito, cancelamento por sessão e atualização de vida no impacto. Vida e armadura do Patrono não antecipam o impacto durante atualizações da sala.
- Retorno à mão move a própria carta e revela a nova instância ao chegar; armas ficam com escudo rachado ao atingir metade da durabilidade e se dividem ao quebrar.
- Martelo dourado com golpe de pivô junto ao poder, clarão/faíscas/recuo conforme vídeo enviado. Poder vira para baixo ao ser usado: Armadura restaura na rodada seguinte; Arma permanece usada até o fim da partida. Continuidade durante reconstruções da mesa.
- Destaque da magia deslocado para esquerda do dono/direita do rival; leitura reduzida em 33% e saída após o efeito. Duração das etapas de combate revista para comportar as animações.
- npm test completo aprovado (39 testes do runner inicial e todas as suítes complementares). Casos adicionais: 10 efeitos com coordenadas finitas; dano no impacto apenas uma vez; cancelamento; origem do Patrono em ambos os lados; condução; atualização de HP/armadura durante a fila; poderes usados por rodada/partida.
- Prévia local http://127.0.0.1:3062/runamarca/ e galeria http://127.0.0.1:3062/runamarca/efeitos.html; recursos conferidos com HTTP 200. Galeria usa renderizadores/efeitos reais e os pontos/disparo do Bruxo da mesa, com estados 0/4 a 4/4.
- Verificação visual pelo navegador indisponível: falha de inicialização do ambiente de controle. Sem screenshot de partida nem nova bateria de balanceamento. Servidores anteriores preservados; sem publicação no GitHub nesta etapa.
### 08/10/2026 — verso dos poderes, fim do martelo e feixe do Fulgor
- Poder gira pelo eixo horizontal (rotateX), mostrando o fundo real das cartas em vez de apenas inverter a imagem. Removido isolamento no disco que achatava as duas faces; faces em planos distintos, com ocultação de verso. Mesma apresentação na mesa e na galeria.
- Martelo e partículas mantêm o último frame invisível (fill forwards e opacidade base zero). Martelo removido antes da pausa final das partículas, corrigindo o retorno da aparência original após terminar o golpe.
- Fulgor Final tem sete emissores ao redor do Patrono: convergem a um coletor à frente dele, que dispara um único feixe ao alvo. Raios alimentam o feixe durante o disparo e apagam gradualmente depois do impacto. Paleta violeta/branca e brasas preservadas; som de energia sustentada adicionado. Dano/duração mecânica inalterados.
- Testes direcionados de efeitos, Forja, layout/poderes e apresentação aprovados. Conferida geometria de convergência nos dois sentidos da mesa e final invisível do martelo. Recursos versionados para evitar cache antigo.
- Prévia existente 3062 atualizada, sem reiniciar salas. Controle de navegador voltou a falhar na inicialização, impedindo conferir a aparência pelo navegador nesta etapa.

### 08/10/2026 — carta visual presa no slot
- Reproduzida uma causa da carta fantasma: atualizações de magia em área incluem criaturas antigas do descarte com zero HP; a apresentação recriava suas imagens nos locais antigos, inclusive em magias sem dano como Geada.
- Cópias de dano letal agora exigem um efeito de dano e uma imagem anteriormente viva; mortes já apresentadas não geram novas cópias. Retorno à mão sem destino visível também remove sua cópia.
- Cópias de combate identificam o combate de origem, são limpas ao encerrar a fase e não podem ser registradas novamente por um ataque atrasado. Impactos e efeitos atrasados respeitam o combate de origem. Morte durante um ataque reutiliza a cópia existente; a etapa de baixas remove essa cópia mesmo quando já marcada como derrotada.
- npm test completo aprovado, incluindo nova regressão de cartas fantasma, dano em área com descarte antigo, retorno sem destino, morte durante ataque e conclusão atrasada do combate. HTTP 200 e conteúdo corrigido conferidos na prévia 3062; cache versionado. Servidor e salas preservados.
- Verificação em partida pelo navegador indisponível devido à falha do ambiente de controle já registrada. Sem nova bateria de balanceamento nem publicação no GitHub nesta etapa.


### 10/10/2026 — Aard, Provocar, Forja variante e Platina
- Catálogos da mesa/criador sincronizados. Forja padrão com João 2, Golias 1, Geada 1, Atualização 3 e Monge custo4. Variante: João2, Persistente2 (3,2/3), Revestimento1 custo3, S.E.P2/2; Projeto Volátil fica no estoque. Ambos com30.
- Drenar Essência preparada: empurra para a posição seguinte e causa colisão; alvo original revelado, sem cadeia por deslocamento. Voo de pressão sai do Patrono, desloca o visual antes de aplicar HP, limpa cópias e cancela atualizações de combates anteriores.
- Revestimento dá vida permanente e impede uma magia inimiga de sono/ancoragem/retorno; não empilha cargas e não bloqueia habilidades de criaturas. Persistente guarda bônus permanentes na primeira devolução inimiga, sem guardar dano, aura, equipamento ou Inversor. Artes das duas novas cartas são provisórias.
- Provocar libera o alvo original se o provocador morreu antes da fase do ataque; simultaneidade e bloqueio por defensor original morto na Iniciativa preservados.
- Prévia de pacotes: Platina tem carga, revelação prolongada, ampliação, anéis/símbolos, partículas e som próprio; outras cartas ficam discretas. Reset cancela timers/efeitos e há versão com movimento reduzido.
- npm test completo aprovado; verificações dedicadas de regras e apresentação aprovadas; prévia Platina conferida no Chrome automatizado, sem erros de página. Evidência em outputs/platina-20261010.
- Bateria120:20 por confronto,60 participações/deck,sem poderes,20HP. Padrão40/60,Fluxo25/60,Ruptura42/60,Variante12/60,1empate. Comparação pareada48 preservada. Relatórios em design/testes-2026-10-10-120-aard-protecao.
- Local: http://127.0.0.1:3077/runamarca/ e pacotes.html. Sem publicação nesta etapa.

### 10/10/2026 — Cólera, Banquete e Chamado; nova bateria de 120
- Cólera Trifecta mantém custo 3 e duas cópias, agora +1 de ataque no combate da rodada.
- Banquete custo 8, bônus permanente igual à metade das magias anteriores do próprio Nartvanyr, arredondada para baixo; exclui a própria utilização e inclui fichas de magia descartadas.
- Chamado mantém custo 3 e três cópias; cria 1 ficha Tribal 1/1 mais uma por cópia anterior no próprio Nartvanyr, sem contar a atual, respeitando a reserva. Primeiros três usos: 1, 2, 3 fichas. Aprendiz e Geômetro preservados após esclarecimento do usuário.
- Mesa e criador sincronizados; quatro decks com 30. Suíte completa npm test aprovada, incluindo sequências, arredondamento e controle de escopo. Primeira tentativa no sandbox teve falhas de fetch local; execução com acesso local aprovado passou integralmente.
- Bateria completa: mesmas 120 combinações de semente/estilo/primeiro jogador; mesma política do piloto; 20 HP e zero poderes. Forja padrão 44/60, Fluxo 26/60, Ruptura 36/60, variante 13/60, um empate. Controle padrão x variante manteve resultados e rodadas idênticos.
- Fluxo x Ruptura 5–15 → 9–10 + empate; Banquete usado em 14/20, antes 7/20. Fluxo x variante 13–7 → 10–10; padrão x Ruptura 9–11 → 12–8. Ciclo completo ainda não confirmado.
- Evidências, catálogo congelado e motor verificado em design/testes-2026-10-10-120-trifecta-banquete-chamado. Piloto heurístico não é ótimo; Evasão não foi ajustada nesta comparação e as três mudanças não foram isoladas individualmente.
- Prévia local atualizada em http://127.0.0.1:3078/runamarca/ (health/access HTTP 200); sessões nas portas anteriores preservadas. Sem publicação nesta etapa.

### 11/10/2026 — Aprendiz marcada e composição dos quatro decks
- Aplicadas as quantidades solicitadas nas duas Forjas e Ruptura; Esteira de Testes custo 1. Quatro decks com 30 cartas; mesa e criador sincronizados.
- Aprendiz de Virelion escolhe apenas criatura inimiga na Entrada; dispara 1 de dano por magia jogada, incluindo preparada ao posicionar. Cada cópia guarda uma marca própria; após saída do alvo, exige nova escolha na preparação do dono. Sem inimigos, aguarda; devolução reinicia a marca. Interface inclui seleção, vínculo visual, indicador e efeito de dano preservando vítima até o impacto.
- npm test completo aprovado, incluindo testes dedicados de morte do alvo, disparos repetidos, múltiplas Aprendizes, preparada sem disparo duplicado, dano dobrado, Último Suspiro e bot. Dados de orçamento da Aprendiz recalculados no criador.
- 120 partidas concluídas sem truncamento, seis pares com 20 partidas cada, 20 HP e sem poderes. Mesmas sementes/estilos da bateria anterior; piloto adaptado para escolher as marcas. Forja padrão 48/60, Fluxo 34/60, Ruptura 28/60, variante 9/60; um empate.
- Fluxo x Ruptura: 13–6 + empate; padrão x Fluxo 14–6; padrão x Ruptura 15–5. Ciclo pretendido ainda não confirmado. Aprendiz: 301 disparos, 307 de dano efetivo, 151 eliminações; dano aumentado pelo primeiro dano dobrado do Engrenauta.
- Relatório, auditoria, partidas CSV, catálogo congelado e motor conferido em design/testes-2026-10-11-120-aprendiz-marcada. Monge/compras sustentam a padrão; suportes de pouca vida da variante sofrem com Aprendiz. Mudanças simultâneas não isolam causas; piloto heurístico mantém limitações de Evasão/Miragem.
- Prévia nova em http://127.0.0.1:3079/runamarca/; acesso HTTP 200 conferido na tela protegida. Partidas anteriores preservadas; sem publicação nesta etapa.

### 11/10/2026 — Monge com escolha e Aprendiz de uso único
- Monge Rúnico mantém custo 4, 3/4 e duas cópias. Revelação com escolha na formação: −2 ataque do inimigo à frente OU +1/+1 no aliado imediatamente à direita. Usuário confirmou duração apenas naquele combate. Casa vazia/fora do tabuleiro não tem alvo; sono impede a habilidade. Escolha oculta ao rival até a Revelação; pode ser revista antes de confirmar.
- Bônus temporário usa a mesma remoção sem cura dos protocolos, respeita duplicação do Rúnico e não registra aumento permanente. UI permite escolher após posicionar ou ao clicar no Monge.
- Pedido anterior da Aprendiz aplicado: apenas um disparo por permanência em campo. Não exige novo alvo após consumir o efeito. Alvo perdido antes do disparo pode ser escolhido novamente; devolução seguida de nova Entrada reinicia o efeito. Indicador mostra efeito utilizado e remove vínculo ativo.
- Catálogos sincronizados, custos/composições preservados. npm test completo aprovado, com casos dedicados de Monge, sigilo, duração, duplicação e alvo à direita, e Aprendiz de uso único.
- Prévia 3079 atualizada na mesma porta, HTTP 200. Nenhuma publicação e nenhuma nova bateria de 120 nesta etapa; resultados anteriores usam Monge apenas defensivo e Aprendiz repetida.
- Próximo runner preparado em design/simular-120-monge-escolha-20261011.mjs; piloto histórico e resultados congelados preservados. Discussão do ciclo aguarda confirmação: pedido mais recente quer Ruptura acima de Forja, diferente da descrição anterior de Forja vencendo Ruptura por atrito.
- Esclarecimento posterior: usuário reafirmou a descrição de estilos (Fluxo pune investimento concentrado; Forja supera atrito; Ruptura pune preparação lenta). Recomendações devem preservar essas funções e criar janela de pressão antes da estabilização, sem interpretar cada frase como garantia rígida de vitória por energia.

### 11/10/2026 — Silêncio, custos de Monge/Fulgor e bateria de 120
- Fogo Fátuo: Entrada com seleção de qualquer criatura, incluindo aliada e si mesmo. Silêncio remove texto de jogo, habilidades, bônus, penalidades e encantamentos atuais; restaura atributos impressos sem curar dano. Novos efeitos podem ser aplicados. Armas voltam à reserva preservando durabilidade, conforme resposta do usuário. Devolução à mão restaura as regras originais.
- Remoção explícita de selos de Ithalion, auras, Provocar, Corrupção e proteções; perda de vida concedida pode matar sem disparar Último Suspiro removido. Mesa/criador sincronizados; Monge custo 5 e Fulgor Final custo 5.
- npm test completo aprovado, incluindo testes dedicados de Silêncio, equipamento, dano preservado, morte, Emanação, selos, entrada e bot. UI possui seleção de alvo e indicador de Silenciado.
- 120 partidas concluídas, sem truncamento, 20 por confronto e 60 participações por deck, 20 HP e sem poderes dos Patronos. Mesmas sementes e estilos da referência, piloto adaptado a Silêncio e escolha do Monge. Inclui Aprendiz de disparo único e escolha do Monge, pedidos intermediários ainda não testados na referência.
- Placar padrão x Fluxo 8–12; padrão x Ruptura 12–8; padrão x variante 20–0; Fluxo x Ruptura 12–8; Fluxo x variante 13–7; Ruptura x variante 17–3. Totais: padrão 40/60, Fluxo 37/60, Ruptura 33/60, variante 10/60. Zero empates; média 10,75 rodadas.
- Silêncio: 152 ativações em 58 partidas, oito mortes imediatas pela perda de vida concedida (sete contra variante). Aprendiz: 91 disparos e 66 eliminações; Fulgor 25 usos, 21 contra Patrono. Resultados não isolam causalmente cada alteração.
- Relatório, auditoria, partidas, catálogo e motor congelados em design/testes-2026-10-11-120-silencio. Variante continua crítica; observar atributos básicos/reposição antes de ampliar buffs concentrados. Estilos parcialmente observados, sem confirmar ciclo rígido.
- Prévia local atualizada na mesma porta 3079, acesso HTTP conferido. Sem publicação nesta etapa.

### 11/10/2026 — Áudios de introdução de Lyrik e Marika
- Importados os seis MP3 de cada Patrono, sem modificar os arquivos, com nomes estáveis em mesa-nova/audio/intro e hashes/origens registrados em outputs/intro-voices-20261011. Associação pelo trecho do nome do arquivo e roteiro; não houve transcrição automática do conteúdo.
- Manifesto patron-dialogues.json contém os seis confrontos ordenados e três falas por confronto. Lyrik/Marika completos; seis falas de Dom pendentes. Durações obtidas por decodificação no navegador, para futura sincronização da introdução.
- Galeria efeitos.html ganhou seção de falas com seleção de confronto, controles individuais e indicação de gravações pendentes. Interrompe o áudio ao trocar o confronto e impede sobreposição. Servidor reconhece audio/mpeg.
- Verificados os doze MP3, posições, reprodução, troca de confronto e painel móvel, sem erros de JavaScript. Evidências em outputs/intro-voices-20261011/verificacao.json e galeria-lyrik.png.
- Prévia local em http://127.0.0.1:3080/runamarca/efeitos.html#patron-voices, preservando a instância 3079. Esta etapa cadastra as falas e a prévia; a animação de introdução nas partidas ainda aguarda implementação. Sem publicação.

### 11/10/2026 — Introdução completa dos Patronos e perspectiva do martelo
- As 18 gravações estão cadastradas nos seis confrontos ordenados. Dom, O Maioral é o Patrono da Ruptura, com o retrato enviado; Marika continua no Fluxo e Lyrik nas duas Forjas. Arquivos originais preservados e durações reais decodificadas no navegador.
- Introdução compartilhada pela mesa e galeria: retratos lado a lado, três falas em sequência, destaque de quem fala e chegada antes da mão inicial. A ordem segue o primeiro jogador da partida em ambas as perspectivas. Pular e Escape interrompem áudio e efeitos; recarregar não repete a introdução daquele jogo. Espelho da mesma energia tem chegada sem diálogos não fornecidos.
- Lyrik recebe uma martelada e chega com fagulhas, fumaça quente, reverberação e som metálico. Marika se dissolve em partículas amostradas do retrato, percorre trilhas suaves de éter e se recompõe. Dom lança uma corrente de elos metálicos, prende o gancho no destino e se puxa para o espaço do Patrono.
- Martelo da habilidade redesenhado com cabeça em perspectiva e cabo vindo em direção à câmera. Impacto aciona o comando; o botão vira para o verso enquanto o martelo recua e desaparece. Confirmado para ambos os jogadores, sem repetição pelo evento público e sem frames residuais. Tooltip é fechado no clique.
- npm test completo aprovado. Verificação de navegador cobre as três chegadas, ordem das falas sem sobreposição, interrupção, movimento reduzido, celular e partida com dois jogadores até a preparação. Evidências em outputs/intro-voices-20261011/intro-verificacao.json, intro-partida-verificacao.json e martelo-partida-verificacao.json.
- Prévia: http://127.0.0.1:3080/runamarca/efeitos.html#patron-voices. Trabalho local; nenhuma publicação. Balanceamento retomado somente depois da integração e verificação da introdução; experiências anteriores não foram aplicadas ao catálogo.

### 11/10/2026 — Pressão da chegada de Lyrik e auditoria dos enunciados
- Reforçada a martelada de chegada: compressão do retrato, deslocamento rápido, reverberação, quatorze jatos laterais de fumaça sob pressão, fagulhas e encaixe incandescente que esfria gradualmente. Som reúne pressão, grave de impacto e metal. Marika e Dom mantêm suas chegadas próprias.
- Sons procedurais agora são acompanhados pelo ciclo da introdução: Pular/Escape interrompem também pressão, metal e corrente. Reset da mesa limpa apresentações pendentes do martelo e do verso dos poderes. Regressão em navegador confirma ausência de som e resíduos após pular durante o calor.
- Suíte completa npm test aprovada após essas alterações e a correção de Retaliação. Conferidas partidas com dois jogadores, chegada antes da mão inicial, falas sequenciais, redução de movimento e visão móvel.
- Durante a auditoria foi corrigido o acúmulo de Retaliação contra Barreira: a condição passa a considerar o ataque antes da redução de dano. Ataque 2 acumula; ataques 3 e 4 não passam a acumular por causarem apenas 2 de dano. Testes de interação cobrem esses casos.
- Revisados 53 modelos dos decks/estoque e o gerador das 27 armas. Documento design/revisao-enunciados-20261011.md contém os problemas, sugestões e textos atuais, sem narrativa ou balões. Nenhuma reescrita dos enunciados foi aplicada; catálogos da mesa e criador continuam concordando.
- Experiências numéricas de balanceamento permanecem isoladas em design/balanceamento-ciclo-20261011. Comparações com outras sementes mostram oscilação relevante; uma bateria favorável isolada não comprova o ciclo. Resultados anteriores à correção de Retaliação ficam identificados como históricos.

### 11/10/2026 — Calibração local do ciclo e fechamento da revisão
- Selecionada e aplicada a experiência 26: Chamado da Tradição e Cólera Trifecta custam 2; Olho Flutuante custa 3; Fluxo tem duas Âncoras e três Aprendizes; Evasão Dimensional mantém custo 3, exige criatura da reserva com ataque público 4+ e compra duas cartas. Forjas mantêm os valores e composições anteriores. Todos os decks têm 30 cartas, com mesa/criador sincronizados e descrições de orçamento recalculadas.
- Evasão valida o alvo antes de cobrar éter, respeita exclusão de Emanação e não usa aura de formação oculta para habilitar alvo. Revestimento impede apenas a devolução e a compra ainda acontece. Regressões cobrem reset, mão cheia, fadiga, proteção, bot e seleção visual. Testes de retorno genérico usam uma ficha própria para conferir os ciclos de Entrada/persistência independentemente do limiar específico de Evasão.
- Suíte npm test completa aprovada após aplicação. Prévia 3080 reiniciada com o catálogo aplicado; Chrome confirma custo, quantidade de cópias, limiar e exclusão de alvos. Introduções e martelo permanecem disponíveis na galeria.
- 240 partidas consolidadas: bateria completa de 120 entre quatro decks, mais dois diagnósticos de 60 dos três confrontos principais, com o mesmo motor e regras/composições aplicadas. Fluxo sobre padrão 30/60 (50%); Ruptura sobre Fluxo 30/60 (50%); padrão sobre Ruptura 31/60 (51,7%). As repetições usam sementes já exploradas e não são validações cegas.
- A bateria separada de 120 teve padrão x Fluxo 11–8 + empate; padrão x Ruptura 10–10; padrão x variante 17–3; Fluxo x Ruptura 12–7 + empate; Fluxo x variante 14–6; Ruptura x variante 15–5. Variante 14/60 (23,3%). O consolidado fica no limite inferior solicitado, mas a oscilação entre execuções não demonstra uma vantagem estável nem explica a baixa taxa da variante apenas pela dificuldade do piloto.
- Relatório e agregação em design/balanceamento-ciclo-20261011/relatorio-final.md e resultado-consolidado.json; alterações exatas em alteracoes-aplicadas.json. Experiências descartadas continuam identificadas no comparativo. Dados são de bots heurísticos, 20 HP e sem habilidades dos Patronos.
- Revisão dos enunciados finalizada em design/revisao-enunciados-20261011.md: 26 cartas com textos atuais e sugestões, explicações incorretas e regras gerais a centralizar. Propostas editoriais continuam sem aplicação; Evasão foi alterada como regra de balanceamento, não como reescrita editorial. Trabalho disponível na prévia local.

### 11/10/2026 — Padronização dos enunciados aprovada e aplicada
- Atualizados 25 modelos em todos os decks/estoque nos catálogos da mesa e do criador. Barreira conserva o enunciado correto; sua explicação antiga de vida temporária foi corrigida. Comparação estrutural confirma que só os campos de texto mudaram: efeitos, custos, atributos, cópias, artes, narrativas e falas foram preservados.
- Exceções solicitadas: Silêncio omite a frase sobre efeitos novos na apresentação; Fulgor mantém “Não pode ser anulada” e seus metadados para futuros counters; Revestimento usa “Impeça o próximo efeito…” sem repetir a remoção da proteção.
- Glossário compartilhado entre Regras da mesa, explicações ao passar o mouse e criador. Inclui Silêncio, Corrupção, Último Suspiro, jogar/preparar magia, posições, vida/dano, Nartvanyr, retorno e proteção. Provocar explica a liberação do alvo quando o provocador morre. Corrupção e Último Suspiro recebem a formatação automática de mecânicas.
- Suíte npm test completa aprovada. Chrome confirmou os dois catálogos, as três exceções, reconhecimento das mecânicas, ajuste dos enunciados na caixa e ausência de erros JavaScript. Evidências em outputs/enunciados-20261011; alterações antes/depois em design/enunciados-aplicados-20261011.json; auditoria atualizada com textos finais.
- Prévia 3080 reiniciada com os textos atuais. Revisão editorial local, sem nova simulação de balanceamento ou publicação.

### 11/10/2026 — Martelo e chegada revistos pelos vídeos de Magni
- Inspecionados os dois vídeos enviados, incluindo sequência de deslocamento incandescente e golpe do poder heroico. Folhas de referência em outputs/martelo-magni-20261011.
- Martelo redesenhado em perspectiva de três quartos: cabeça facetada com faces superior/lateral, cabo diagonal, metal, encaixe dourado e gravação da Forja. Movimento não usa mais rotateX para simular a cabeça vindo de cima. Ponto da cabeça alinhado ao centro do botão; verificação em navegador encontrou erro inferior a 1 pixel.
- Golpe encurtado para 760 ms, com contato em 395 ms e dissolução completa em 532 ms. Som, fagulhas e comando compartilham o contato; a cabeça aquece brevemente e desaparece em cerca de 137 ms. Não há retorno visível após esse ponto. Verso do botão continua com giro real; evento público não repete o golpe local. Tooltip não reaparece durante a apresentação.
- Chegada de Lyrik refeita com um único relógio para martelo, compressão, deslocamento e chegada: aceleração rápida, retrato incandescente, rastro quente e fagulhas, pancada no encaixe, jatos laterais de fumaça e resfriamento. Falas, Marika e Dom preservados.
- Suíte npm test completa aprovada. Chrome verificou contato, ausência de reaparecimento, cancelamento, movimento reduzido, duas perspectivas de partida, sequência de falas sem sobreposição e Pular interrompendo sons/efeitos. Evidências específicas em outputs/martelo-magni-20261011/verificacao-martelo.json; integração na galeria/partida em outputs/intro-voices-20261011.
- Prévia local atualizada: http://127.0.0.1:3080/runamarca/efeitos.html. Sem publicação nesta etapa.

### 11/10/2026 — Importação de Toque Gélido e Voltando para o fundamental
- Aplicados os dois arquivos enviados: ilustrações, enquadramentos e enunciados na mesa e no criador. Toque com zoom 150; Fundamental com a nova arte da sala de aula. Custos, efeitos e quantidades específicas de cada deck preservados; quatro decks de 30 cartas.
- Suíte completa npm test aprovada. Navegador confirmou artes HTTP 200, textos sincronizados e ausência de erros; evidências em outputs/importacao-cartas-20261011.
- Preparada publicação das atualizações acumuladas de RunaMarca: balanceamento, enunciados/glossário, falas e introduções dos Patronos, martelo e pacotes. O clone foi conferido contra origin/main; arquivos de Torre mantêm a versão atual do GitHub. Exportações de usuário, runtime e resultados experimentais volumosos permanecem locais.
