# Runamarca — roteiro de gravação de Marika e Dom

Pedido do dono: preparar os textos, preservando as vozes atuais. Este documento entrega as falas e a direção de interpretação; não substitui áudio nem ativa falas no jogo. As três frases de abertura de Marika abaixo já pertencem ao manifesto. As demais são propostas novas, separadas do texto existente.

Fontes conferidas: `mesa-nova/patron-dialogues.json`, `cartas.json`, `fluxo-studies.mjs` e `dom-powers.mjs`. O roteiro cobre os poderes efetivamente usados pelos baralhos atuais, os três avanços de Marika e resultado contra cada Patrono. Não acrescenta acontecimentos à história nem promete efeitos diferentes dos descritos nas cartas.

## Continuidade das vozes

- **Marika:** usar a mesma voz e pronúncia das gravações `M04.mp3`, `M05.mp3` e `M06.mp3`, em `mesa-nova/audio/intro/voz-propria-20261017/`. A escrita segue a postura de professora firme: compreensão sem condescendência, convicção sem gritar. Na gravação, comparar timbre, distância do microfone e intenção com os arquivos existentes. Esta rodada não fez uma nova avaliação auditiva dessas gravações.
- **Dom:** preservar a voz de `D01.mp3` a `D06.mp3`, na mesma pasta. Frases diretas, desafio e força; evitar transformar cada ação em um grito. A referência de continuidade é a atuação existente, sem inventar sotaque ou imitar outro personagem.
- Gravar cada ID separadamente, com uma tomada principal e uma alternativa de intenção. Entregar voz limpa, sem música, reverberação ou efeitos incorporados; conservar o arquivo original para edição. Os intervalos abaixo são metas de interpretação, não durações medidas nem novos tempos de animação.

## Aberturas existentes: completar as gravações

Preservar as palavras exatamente como estão no manifesto. O tempo já cadastrado serve de referência; na integração, medir a gravação real e alinhar as legendas à fala, sem acelerar a voz para caber artificialmente.

| ID de entrega | Cena e posição | Texto existente | Referência atual | Intenção |
|---|---|---|---:|---|
| M-P01 | `lyrik-marika`, resposta à pergunta de Lyrik sobre o Éter | Enquanto não o usarmos apenas para melhorar a vida, estaremos sempre caminhando à regressão. | 6,5 s | Convicção serena. Uma pausa breve depois de “vida”. |
| M-P02 | `marika-lyrik`, abertura | Você tem arrependimento ou orgulho do que criou? | 3,8 s | Pergunta sincera, com peso em “arrependimento” e “orgulho”. |
| M-P03 | `marika-lyrik`, após “Nada… além de medo.” | E o que fará a respeito? | 2,8 s | Firme, oferecendo um caminho; sem provocação triunfante. |

## Falas novas propostas: Marika

| ID | Gatilho de integração | Texto proposto | Alvo de leitura | Intenção |
|---|---|---|---:|---|
| M-P04 | `sumario-ecoante` | Há mais uma resposta aqui. | 1,5–2,2 s | Descoberta pequena, natural; é um poder recorrente. |
| M-P05 | `estudos-avancados`, limiar 10 — Otimização Etérea | Menos esforço. Mais precisão. | 1,7–2,3 s | Segurança contida, duas ideias bem separadas. |
| M-P06 | `estudos-avancados`, limiar 20 — Conhecimento Compartilhado | Conhecimento se compartilha. | 1,5–2,2 s | Aberta e afirmativa. |
| M-P07 | `estudos-avancados`, limiar 30 — Grimório Completo | Agora, o quadro está completo. | 1,8–2,5 s | Conclusão, com mais presença que os avanços anteriores. |
| M-P08 | Vitória neutra | Ainda há o que aprender. | 1,6–2,2 s | Satisfação sem humilhar. |
| M-P09 | Vitória contra Lyrik | Sua obra pode servir à vida, Lyrik. | 2,3–3,1 s | Convicção e respeito pelo interlocutor. |
| M-P10 | Vitória contra Dom | Força sem direção também se esgota. | 2,1–2,9 s | Firme, sem ironia exagerada. |
| M-P11 | Vitória contra Marika | Conhecer a resposta não basta. | 1,8–2,5 s | Reflexiva; não explica a existência da outra Marika. |
| M-P12 | Derrota | A lição continua. | 1,2–1,8 s | Cansaço breve, dignidade preservada. |

## Falas novas propostas: Dom

| ID | Gatilho de integração | Texto proposto | Alvo de leitura | Intenção |
|---|---|---|---:|---|
| D-P01 | `golpe-do-maioral` | Presta atenção. | 0,9–1,4 s | Curta, seca; pode repetir sem virar um bordão longo. |
| D-P02 | `represalia-de-eter` | Usa magia. Paga o preço. | 1,6–2,3 s | Ameaça segura, com pausa curta no meio. |
| D-P03 | Vitória neutra | É assim que se resolve. | 1,4–2,0 s | Satisfação franca, sem gargalhada obrigatória. |
| D-P04 | Vitória contra Lyrik | Tua forja vai ter trabalho, anão. | 2,0–2,8 s | Provocação dirigida a Lyrik. |
| D-P05 | Vitória contra Marika | Acabou a aula, professora. | 1,6–2,2 s | Ironia curta, coerente com o diálogo atual. |
| D-P06 | Vitória contra Dom | Só tem lugar para um Maioral. | 1,8–2,5 s | Desafio pessoal, sem criar explicação para o espelho. |
| D-P07 | Derrota | Isso não termina aqui. | 1,4–2,1 s | Irritação contida; oferecer uma tomada com expiração inicial curta. |

## Integração após a gravação

Há **19 falas prontas para gravação: três textos existentes e 16 propostas novas**. Não incluir `convocar-carrasco`: esse poder permanece no motor como alternativa, mas o baralho atual de Dom usa Golpe do Maioral. Novos diálogos de espelho e variantes aleatórias ficam fora deste lote, para não transformar lacunas de gravação em expansão de narrativa.

1. Conferir a atuação contra os arquivos atuais, escolher as tomadas e medir a duração de cada áudio. Preservar todas as gravações existentes.
2. Preencher os três `audio:null` de Marika e incluir as novas cues somente após a escolha dos textos e das tomadas. O manifesto de produção está intacto nesta entrega.
3. Ligar as falas novas aos eventos reais de poder de Marika e Dom, que hoje apresentam os efeitos sem chamar a voz. Para Estudos Avançados, encaminhar também o `threshold` do evento (10/20/30). O seletor atual identifica apenas `powerId`; não ligar as três frases ao mesmo gatilho sem essa distinção. Manter a deduplicação por partida/evento, como nas falas de Lyrik.
4. Legendar o texto efetivamente gravado, sincronizado com o relógio do áudio. Em falha ou bloqueio de áudio, manter a legenda; não iniciar a gravação atrasada no meio de outra ação.
5. Conferir no jogo os dois assentos, voz silenciada, troca de partida e vitória/derrota. A voz acompanha a apresentação e não atrasa regra, dano ou passagem de turno.

Nenhum arquivo de voz foi criado, apagado, recortado ou trocado. O próximo insumo externo é a gravação das tomadas com as vozes atuais.
