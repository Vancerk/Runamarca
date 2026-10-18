# Ruptura recebido — 7 de outubro de 2026

**Atualização:** esclarecimentos recebidos e integração concluída. Este documento registra a triagem inicial; veja `ruptura-integrado-2026-10-07.md` para as regras vigentes.

Arquivo do autor: `runamarca-prototipo-editavel (4).json`.

Recebidos 13 modelos, 30 cópias e 13 ilustrações. Todas as quantidades respeitam os limites por raridade. Custos, atributos, textos, falas, narrativas e ajustes de arte estão preservados em `ruptura-importacao-pendente.json`; as ilustrações foram extraídas para `mesa-nova/art/ruptura-grupo/`.

O deck ainda não aparece na seleção de partidas. O texto livre inclui habilidades novas que precisam de implementação no motor e algumas decisões do autor. Não é suficiente importar os atributos e deixar essas habilidades sem efeito.

## Pontos enviados para esclarecimento

- Geometro Dedicado: significado de “bloqueada” e momento de criação da ficha.
- Comandante Gnoll: texto chama a própria carta de “Campeão Gnoll”; duração do bônus no ciclo de preparação/combate.
- Aríete Protegido: pagamento opcional de 1 Éter e duração do bônus.
- Bruxo da Retaliaçãozinha: consumo de quatro acúmulos ao causar o dano.
- Vultobreve: elegibilidade de reserva/Emanação e comportamento de uma posição já ocupada.
- Rastreadora: possibilidade de repetir o sacrifício enquanto houver Tribais.

## Outros cuidados de implementação

- Fulgor Final e Estilhaço Elétrico precisam de seleção de criatura ou Patrono; o motor atual não oferece esse alcance genérico para dano.
- Chamado da Tradição precisa contar as cópias no Nartvanyr do dono e respeitar a capacidade da reserva.
- Rastreadora tem uma aura para outros Tribais e uma habilidade ativada; não deve beneficiar a si própria nem acumular atributos a cada renderização.
- Crias Incandescentes precisa disparar Último Suspiro mesmo na morte simultânea.
- Cólera Trifecta deve aplicar o bônus somente às criaturas nas posições de combate.
- O Debulhador exige verificar vida estritamente abaixo da metade, sem tornar o bônus permanente.

## Alterações independentes concluídas na prévia local

- Novo retrato do Patrono do Fluxo, no catálogo de jogo, criador e motor.
- Duas vagas de Emanação sobre as duas divisórias de combate, espelhadas entre os participantes, com atualização por redimensionamento e renderização.
- Prévia em `http://127.0.0.1:3051/runamarca/?room=339570`.
- Testes existentes de interface e Fluxo aprovados; console da prévia sem erros capturados.
