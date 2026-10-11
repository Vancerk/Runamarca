# Balanceamento aplicado e verificação — 11/10/2026

## Alterações aplicadas

| Carta | Alteração | Motivo de design |
|---|---|---|
| Chamado da Tradição | Éter 3 → 2 | Reposição de criaturas mais cedo; escala de fichas permanece 1 + cópias anteriores no Nartvanyr. |
| Cólera Trifecta | Éter 3 → 2 | Pressão de combate com várias criaturas, preservando o bônus de apenas +1 de ataque. |
| Olho Flutuante | Éter 2 → 3 | A suspensão de dois ataques exige mais investimento de preparação. |
| Âncora Etérea | 1 → 2 cópias | Aumenta a presença do controle de posição na identidade do Fluxo. |
| Aprendiz de Virelion | 4 → 3 cópias | Substitui uma remoção pontual por controle; mantém um disparo por permanência em campo. |
| Evasão Dimensional | Custo 3; exige 4+ de ataque na reserva; compra 2 cartas | Responde a investimento concentrado e renova recursos, deixando criaturas pequenas continuarem pressionando. |

As quatro composições mantêm 30 cartas. Forja padrão e variante não receberam alterações numéricas nesta rodada. Artes, narrativas, falas e cartas do estoque foram preservadas. Mesa e criador usam o mesmo catálogo.

## Resultado consolidado — 240 partidas

Uma bateria completa de 120 partidas entre os quatro decks e dois diagnósticos de 60 partidas, restritos aos três confrontos principais. São 60 partidas por confronto principal e 20 por confronto da variante. Empates permanecem no denominador.

| Tendência pretendida | Vitórias / partidas | Derrotas | Empates | Taxa |
|---|---:|---:|---:|---:|
| Fluxo sobre Forja padrão | 30/60 | 29 | 1 | 50,0% |
| Ruptura sobre Fluxo | 30/60 | 29 | 1 | 50,0% |
| Forja padrão sobre Ruptura | 31/60 | 29 | 0 | 51,7% |

**O consolidado está no limite inferior da faixa pedida; não demonstra uma vantagem estável.** Nas três execuções, Fluxo sobre Forja variou de 35% a 75%; Ruptura sobre Fluxo, de 35% a 65%; Forja sobre Ruptura, de 45% a 60%. As sementes dos diagnósticos já foram usadas na exploração, portanto não são validações cegas. A bateria separada abaixo também não confirmou todas as relações.

## Bateria separada de 120 partidas

| Confronto | Vitórias na ordem da tabela | Empates |
|---|---:|---:|
| Forja padrão × Fluxo | 11–8 | 1 |
| Forja padrão × Ruptura | 10–10 | 0 |
| Forja padrão × Forja variante | 17–3 | 0 |
| Fluxo × Ruptura | 12–7 | 1 |
| Fluxo × Forja variante | 14–6 | 0 |
| Ruptura × Forja variante | 15–5 | 0 |

Média de 11.75 rodadas; primeiro jogador venceu 66/120 partidas. Forja variante venceu 14/60 participações (23,3%).

## Interações observadas e limites

- Evasão: 109 usos e 211 compras concedidas na bateria completa. O novo limiar oferece menos alvos no início; devoluções continuam removendo investimento permanente conforme as regras gerais e exceções.
- Chamado: 77 usos, 124 fichas contabilizadas. Cólera: 63 usos. A redução de custo abre combinações na preparação sem ampliar o bônus de ataque.
- Olho: 162 entradas e 265 duelos suspensos. Silêncio: 192 ativações. Esses controles ainda sustentam partidas longas do Fluxo.
- A Forja conserva seu plano de atrito. Nos confrontos com Fluxo, concentrar atributos pode oferecer um alvo elegível para Evasão; contra a Ruptura, sobreviver e repor criaturas continua relevante.
- A variante permanece vulnerável. Os resultados dos bots não comprovam que sua baixa taxa venha apenas da complexidade. É necessário observar pilotos humanos, sequência de preparação e capacidade de reconstruir o campo após controle.
- As mudanças foram testadas em conjunto; as diferenças de vitórias não isolam o efeito causal de cada carta. Uso frequente ou dano acumulado não provam que uma carta seja responsável pela vitória.
- Bots heurísticos de decisão imediata e planejada; 20 de vida; sem habilidades de Patronos. Dez partidas com cada deck começando em cada confronto. Pilotos sem acesso a mãos ou formações inimigas ocultas. Nenhum bônus condicionado à energia adversária.

## Verificação funcional

- Suíte completa npm test aprovada após aplicação.
- Evasão: validação antes de cobrar éter; alvo pelo ataque público da reserva; exclusão de Emanação; compra após proteção de Revestimento; reset de atributos/dano; mão cheia; fadiga; bot e seleção visual.
- Testes genéricos de retorno continuam conferindo reinício de Entrada, Silêncio e persistência independentemente da restrição particular de Evasão. A carta real tem uma regressão própria.
- Retaliação corrigida: ataque antes da redução de Barreira determina a elegibilidade. Ataques 3 e 4 não acumulam apenas porque a Barreira reduziu seu dano a 2.
- Prévia local: http://127.0.0.1:3080/runamarca/. Introduções: http://127.0.0.1:3080/runamarca/efeitos.html#patron-voices.

## Arquivos de evidência

- design/diagnostico-2026-10-11-ciclo26-publico-seedA: resultados.json, partidas.csv, catálogo e motor congelados.
- design/diagnostico-2026-10-11-ciclo26-publico-seedB: resultados.json, partidas.csv, catálogo e motor congelados.
- design/testes-2026-10-11-120-ciclo26-validacao-publica: resultados.json, partidas.csv, catálogo e motor congelados.
- resultado-consolidado.json: agregação e métricas.
- alteracoes-aplicadas.json: valores anteriores e atuais.
- comparativo.md: experiências anteriores, incluindo falhas; não substitui esta comparação com o catálogo aplicado.
- ../revisao-enunciados-20261011.md: auditoria textual com propostas ainda não aplicadas.
