# Elysium Jogos

Portal com RunaMarca e Seis Ossos. O RunaMarca atual está em **/runamarca/** e seu criador em **/runamarca/criador/**. As regras da mesa estão em [mesa-nova/LEIA-ME.md](mesa-nova/LEIA-ME.md).

## Executar

Requer Node.js 20 ou superior. Instale as dependências com `npm ci` e execute `npm start`. Abra http://127.0.0.1:3000. A variável `PORT` altera a porta.

Nesta instalação no OneDrive, se ocorrer EPERM:

```powershell
$env:NODE_OPTIONS='--preserve-symlinks --preserve-symlinks-main'
$env:PORT='3048'
npm start
```

Use uma única instância: as salas de jogo ficam em memória e não sobrevivem à reinicialização. Perfis e resultados dependem das configurações de Discord e PostgreSQL descritas em [CONTAS_DISCORD.md](CONTAS_DISCORD.md). Veja [HOSPEDAGEM.md](HOSPEDAGEM.md) para hospedagem.

## Criador

Produz PNG e JSON editável e oferece uma referência de pontos para criaturas e magias. Efeitos personalizados sem preço fundamentado deixam a avaliação **incompleta**. Os pontos são uma hipótese de projeto, não uma garantia de balanceamento.

A importação na mesa atual associa arte, enquadramento, fala e narrativa aos modelos do catálogo. Custos, atributos, habilidades e composição da partida vêm de `mesa-nova/cartas.json`; editar esses campos no criador não altera automaticamente o motor. Campos de Essência e habilidades da mesa anterior são preservados somente para compatibilidade com projetos históricos.

## Testes e revisão

Execute `npm test`: inclui servidor, contas, orçamento, regras do RunaMarca, apresentação, interface e as regressões da auditoria. A execução dos testes cria salas isoladas, sem jogar nas salas dos usuários.

- [Auditoria anterior](design/auditoria-2026-10-04/RELATORIO.md)
- [Correções e nova revisão](design/auditoria-2026-10-05/RELATORIO.md)
- [Mesa anterior: instruções históricas](README-LEGADO.md)

As rotas e o material antigo permanecem para compatibilidade; seus sistemas de Runas e compra manual não são as regras atuais de /runamarca/.
