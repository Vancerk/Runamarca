# Menus e controles: revisão após a rejeição do excesso de azul

O usuário rejeitou o acabamento azul e o destaque uniforme dos controles. Pediu uma leitura mais física dos menus e botões, com referência no Hearthstone, preservando vela, diário, reservas profundas e legibilidade já alcançada.

Esta revisão local usa couro escuro, molduras chanfradas de bronze, placas claras e uma ação principal em couro avermelhado. No menu, os utilitários ficam em placas claras; voltar ao jogo e sair têm hierarquias diferentes. Na votação, somente começar combate recebe o destaque principal. As escolhas usam títulos sobre couro e descrições sobre pergaminho. Afinidades, cartas e sinais de jogo conservam suas cores.

A referência foi a construção visível em uma [captura arquivada do menu de Hearthstone](https://interfaceingame.com/screenshots/hearthstone-heroes-of-warcraft-main-menu/) e a integração entre interface e mundo descrita na [entrevista de Ben Thompson de 2017](https://www.invenglobal.com/articles/1554/how-hearthstones-art-director-ben-thompson-breathed-life-into-hearthstone). Os SVGs são originais; nenhum asset da Blizzard foi incluído no jogo.

Arquivos de produto: `art-direction.css`, `hybrid/art-direction.js`, `hybrid/table-craft.js` e os três SVGs `assets/ui/{bronze-frame,leather-grain,parchment-grain}.svg`, todos em `mesa-nova/`. Motor, renderer, ponte, câmera, animações, tipografia das cartas e desenho das decorações não foram alterados nesta rodada.

Validação local: controles e geometria 32/32; interface 34/34; entrada/áudio/layout 20/20; movimento reduzido 18/18; comparador e arquivos servidos 13/13. Os cenários usam desktop Full HD e 1366×768. O teste de contraste passou a ler também o fundo da própria descrição, mantendo o limite de 4,5:1. Não houve benchmark completo nem validação de persistência em produção nesta rodada.

Capturas, baseline exata, hashes, método e limites: [pacote da revisão](../prototype-qa/controles-materiais-20261105/README.md). [Comparador local](http://127.0.0.1:3090/controles/), dependente do servidor de revisão. O jogo local continua na porta 3086.

A revisão está implementada e verificada tecnicamente, aguardando avaliação visual do usuário. Não houve commit, push nem publicação desta etapa. Os trabalhos anteriores já presentes na árvore foram preservados.
