import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const out='design/testes-2026-10-07-32-fluxo-sem-poderes',controlDir='design/testes-2026-10-07-32-controle-sem-poderes';
const now=JSON.parse(fs.readFileSync(out+'/resultados.json')),control=JSON.parse(fs.readFileSync(controlDir+'/resultados.json')),historical=JSON.parse(fs.readFileSync('design/testes-2026-10-07-48-patrono20/resultados.json'));
const catalog=JSON.parse(fs.readFileSync(out+'/catalogo-testado.json')),before=JSON.parse(fs.readFileSync(controlDir+'/catalogo-testado.json'));
const hash=s=>createHash('sha256').update(s).digest('hex'),f=n=>n.toFixed(2).replace('.',','),mean=gs=>gs.reduce((s,g)=>s+g.rounds,0)/gs.length;
for(const data of [now,control]){assert.equal(data.games.length,32);assert.ok(data.games.every(g=>!g.trace.some(t=>t.type==='patronPower')));assert.ok(Object.values(data.summary.powerStats).every(x=>x.uses===0));for(const [file,h] of Object.entries(data.hashes))assert.equal(h,hash(fs.readFileSync('mesa-nova/'+file,'utf8')));for(const pair of ['forja x fluxo','fluxo x ruptura']){const games=data.games.filter(g=>g.pair===pair);assert.equal(games.length,16);for(const d of pair.split(' x '))assert.equal(games.filter(g=>g.first===d).length,8);for(const modes of ['imediato/imediato','planejado/planejado','imediato/planejado','planejado/imediato'])assert.equal(games.filter(g=>g.modes.join('/')===modes).length,4);}}
assert.equal(now.pilotHash,control.pilotHash,'Piloto idêntico');assert.equal(now.pilotHash,hash(fs.readFileSync('design/simular-32-fluxo-sem-poderes-20261007.mjs','utf8')));
assert.equal(now.catalogHash,hash(JSON.stringify(catalog)));assert.equal(control.catalogHash,hash(JSON.stringify(before)));
const changedCards=[];for(const d of catalog.decks)for(const c of d.cards){const old=before.decks.find(x=>x.id===d.id).cards.find(x=>x.id===c.id);if(JSON.stringify(c)!==JSON.stringify(old))changedCards.push(c.id);}assert.deepEqual(changedCards.sort(),['FL10','FL13','FL20']);
const normalized=structuredClone(catalog);for(const d of normalized.decks)for(let i=0;i<d.cards.length;i++)if(changedCards.includes(d.cards[i].id))d.cards[i]=before.decks.find(x=>x.id===d.id).cards.find(x=>x.id===d.cards[i].id);assert.deepEqual(normalized,before,'Somente três cartas e seus metadados alterados');
for(let i=0;i<32;i++)assert.deepEqual([now.games[i].seed,now.games[i].pair,now.games[i].first,now.games[i].modes],[control.games[i].seed,control.games[i].pair,control.games[i].first,control.games[i].modes]);
assert.deepEqual(now.games.filter(g=>g.pair==='fluxo x ruptura'),control.games.filter(g=>g.pair==='fluxo x ruptura'),'Fluxo/Ruptura sem mudança alguma nas decisões');
const flips=now.games.filter((g,i)=>g.winner!==control.games[i].winner).map(g=>({n:g.n,pair:g.pair,before:control.games[g.n-1].winner,after:g.winner}));
const pairs=['fluxo x forja','fluxo x ruptura'];const matchup=label=>label==='fluxo x forja'?'forja x fluxo':label;
const score=(data,label)=>{const m=data.summary.matchups.find(m=>m.pair===matchup(label));return label.split(' x ').map(d=>m.wins[d]).join('–');};
const comparison={games:32,controlGames:32,patronHealth:20,patronPowers:false,changedCards,pilotHash:now.pilotHash,changedWinners:flips,matchups:pairs.map(label=>({label,historicalWithPowers:score(historical,label),controlWithoutPowers:score(control,label),currentWithoutPowers:score(now,label),meanRounds:mean(now.games.filter(g=>g.pair===matchup(label)))}))};fs.writeFileSync(out+'/comparacao.json',JSON.stringify(comparison,null,2));
const quote=x=>'"'+String(x??'').replaceAll('"','""')+'"',cols=['played','combats','faceDamage','spellDamage','triggers','returns','healed','attackRemoved','redirects','buffsAttack','buffsHealth','unplayed','mirageCreated','mirageNoEffect','mirageIntercepted'];
fs.writeFileSync(out+'/cartas-comparadas.csv','id;nome;deck;custo_anterior;custo_atual;'+cols.flatMap(k=>[k+'_controle',k+'_atual']).join(';')+'\n'+Object.entries(now.summary.metrics).map(([id,m])=>[id,m.name,m.deck,control.summary.metrics[id].cost,m.cost,...cols.flatMap(k=>[control.summary.metrics[id][k]||0,m[k]||0])].map(quote).join(';')).join('\n'));
const m=now.summary.metrics,b=control.summary.metrics,mirage=m.FL20;
const gs=now.games.filter(g=>g.pair==='fluxo x ruptura'),winnerHp=gs.reduce((s,g)=>s+g.players.find(p=>p.deck==='ruptura').hp,0)/gs.length;
const uses=(id,pair)=>now.games.filter(g=>g.pair===pair).flatMap(g=>g.trace).filter(t=>t.type==='play'&&t.card===id).length;
const styleRows=['imediato/imediato','planejado/planejado','imediato/planejado','planejado/imediato'].map(style=>{const games=now.games.filter(g=>g.pair==='forja x fluxo'&&g.modes.join('/')===style);return '| '+style.replace('/',' / ')+' | '+games.filter(g=>g.winner==='fluxo').length+' | '+games.filter(g=>g.winner==='forja').length+' |';}).join('\n');
const text=`# RunaMarca — Fluxo contra Forja e Ruptura, sem poderes de Patrono

Data: 07/10/2026. Patronos com 20 de vida. Bateria final: 32 partidas com cartas atuais e 32 de controle. São 16 por confronto em cada bateria; o Fluxo participa de todas, Forja e Ruptura de 16 cada. Não houve confronto Forja × Ruptura nesta etapa.

## Ajustes aplicados

| Carta | Anterior | Atual |
|---|---|---|
| Miragem Provocadora | Ficha 0/1 e Transpassar concedido ao atacante | Apenas ficha 0/1; mantém a exigência de espaço livre e descarte sem efeito se não houver espaço |
| Toque Gélido | Custo 2 | Custo 1; redução permanente de 1 de ataque mantida |
| Reforço Divino | Custo 5, +2/+2 | Custo 3, +1/+1 permanente |

Nenhum outro ajuste de balanceamento. Os poderes continuam disponíveis no jogo, mas estão excluídos desta bateria e deverão permanecer excluídos das próximas até nova orientação.

## Método e validação

- Motor real do jogo; API de ações e resolução efetiva, sem inventar vencedores por fórmulas de orçamento.
- Mesmas 16 sementes pareadas entre catálogo anterior e atual. Em cada confronto, 8 partidas com cada deck começando. A ordem alterna entre rodadas; uma troca inicial para ambos.
- Quatro combinações de pilotos: imediato/imediato, planejado/planejado, imediato/planejado e planejado/imediato; 4 jogos por combinação e confronto.
- Imediato avalia eficiência da ação presente. Planejado compara duas ações, preservação de recursos e valor futuro; ambos examinam formações contra seis hipóteses públicas do adversário. Nenhum lê a mão, o deck ordenado ou a formação secreta rival. São heurísticas, não jogo perfeito.
- A Miragem sem Transpassar recebeu avaliação de bloqueio defensivo. O piloto final considera formações com sua posição livre. Corrigida uma referência compartilhada que permitia uma ficha hipotética contaminar a formação escolhida. O mesmo piloto final foi utilizado no controle.
- Zero ações de poderes: validado no histórico de todas as 64 partidas. Hashes de motor, piloto e catálogos conferidos. Só FL10, FL13 e FL20 mudaram. Fluxo × Ruptura permaneceu idêntico entre controle e atual, inclusive nas decisões.
- Repetições das mesmas sementes durante a auditoria do piloto não aumentam o tamanho da amostra.

## Resultados

Os placares abaixo estão sempre na ordem **Fluxo–adversário**.

| Confronto | Histórico: poderes habilitados | Controle: cartas anteriores sem poderes | Atual: cartas novas sem poderes | Rodadas médias atuais |
|---|---:|---:|---:|---:|
${comparison.matchups.map(x=>`| ${x.label} | ${x.historicalWithPowers} | ${x.controlWithoutPowers} | ${x.currentWithoutPowers} | ${f(x.meanRounds)} |`).join('\n')}

A comparação que isola as cartas é controle → atual. O histórico com poderes é apenas referência. A retirada dos poderes muda as escolhas de gasto e os caminhos da partida; seu efeito nesta política não deve ser tratado como uma vantagem fixa de alguns pontos percentuais. ${flips.length} partidas mudaram de vencedor no confronto Forja/Fluxo: ${flips.filter(x=>x.after==='fluxo').length} a favor de Fluxo e ${flips.filter(x=>x.after==='forja').length} a favor de Forja.

### Sensibilidade à estratégia — Forja × Fluxo

| Piloto Forja / piloto Fluxo | Vitórias Fluxo | Vitórias Forja |
|---|---:|---:|
${styleRows}

Cada linha tem somente quatro jogos. Diferenças entre políticas mostram que timing e conversão de vantagem importam, e que o piloto planejado não é automaticamente superior. Não são taxas populacionais de jogadores humanos.

## Fluxo × Ruptura: principal problema

Fluxo venceu ${gs.filter(g=>g.winner==='fluxo').length}/16. Ruptura terminou com média de ${f(winnerHp)} de vida; isso sugere uma deficiência de resposta e fechamento neste conjunto de pilotos, além de simples derrotas apertadas.

- **Respostas individuais contra reposição de criaturas:** Evasão foi usada ${uses('FV13','fluxo x ruptura')} vezes e Sono ${uses('FV14','fluxo x ruptura')}. As ferramentas funcionam mecanicamente, mas não impediram a reposição via Chamado (${m.RG06.played} usos, ${m.RG06.tokens} fichas) e os bloqueios do Geômetro (${m.RG01.tokens} fichas observadas após combate). A contagem do Geômetro não inclui fichas mortas no mesmo combate.
- **Incursora e fragilidade inicial:** ${m.RG02.played} usos e ${m.RG02.triggers} Revelações; ${m.RG02.spellDamage} de dano registrado a criaturas antes do choque. Criaturas de 1 de vida podem morrer antes de atacar. Isso dificulta conservar um tabuleiro para os buffs do Fluxo.
- **Rastreadora e Gnoll:** a aura beneficia múltiplos Tribais enquanto sua fonte permanece; Gnoll ativou ${m.RG08.triggers} vezes em ${m.RG08.combats} participações. A condição está acontecendo com frequência. Rastreadora foi mantida como solicitado; sua contribuição de aura não está inteiramente atribuída nas métricas individuais.
- **Pressão também no meio do jogo:** Debulhador acumulou ${m.RG12.faceDamage} de dano de combate ao Patrono nesta amostra. O foco não deve ficar restrito às cartas de custo 1.
- **Fechamento do Fluxo:** Banquete entrou ${uses('FV05','fluxo x ruptura')} vezes neste confronto. Medir se o tempo comprado se converte em ataque ao Patrono é mais útil do que apenas contar devoluções e efeitos de sono.

Prioridade: sobrevivência até o primeiro combate produtivo, resposta à reposição de vários corpos e abertura de uma janela ofensiva após controlar o oponente. Nenhuma dessas sugestões foi aplicada ao balanceamento nesta etapa.

## Fluxo × Forja: desempenho e identidade

Fluxo busca aproveitar a janela anterior às criaturas grandes. Forja tenta estabilizar e transformar sobrevivência em domínio posterior. Nas partidas atuais, a duração vai de ${Math.min(...now.games.filter(g=>g.pair==='forja x fluxo').map(g=>g.rounds))} a ${Math.max(...now.games.filter(g=>g.pair==='forja x fluxo').map(g=>g.rounds))} rodadas. O placar tem menos assimetria que Fluxo/Ruptura, mas 16 partidas não confirmam equilíbrio definitivo.

### Cartas ajustadas

| Carta | Evidência controle → atual | Leitura |
|---|---|---|
| Miragem | ${b.FL20.played} → ${mirage.played} usos; ${mirage.mirageCreated||0} fichas, ${mirage.mirageNoEffect||0} ativações sem efeito; ${mirage.mirageIntercepted||0} pontos de ataque interceptados | Passou a ter função defensiva. A posição precisa ficar livre; interceptação não é uma estimativa de vitórias produzidas pela carta |
| Toque Gélido | ${b.FL13.played} → ${m.FL13.played} usos; ${b.FL13.attackRemoved} → ${m.FL13.attackRemoved} pontos de ataque reduzidos registrados | Mais fácil encaixar na curva. Continua sendo resposta pequena e localizada |
| Reforço Divino | ${b.FL10.played} → ${m.FL10.played} usos; bônus agregados ${b.FL10.buffsAttack}/${b.FL10.buffsHealth} → ${m.FL10.buffsAttack}/${m.FL10.buffsHealth} | Mais acessível, com impacto menor. Preço menor não garante mais usos: concorre com outras ações |

### Destaques e pontos fracos

| Grupo | Carta/recurso | Evidência e avaliação |
|---|---|---|
| Forte, cumpre a identidade | Golias | ${m.FL09.played} usos, ${m.FL09.combats} participações, ${m.FL09.redirects} redirecionamentos registrados. Estabiliza e permite Forja dominar depois; monitorar repetição do bloqueio de várias posições |
| Forte, exige monitoramento | Geada Implacável | ${m.FL14.played} usos e ${m.FL14.attackRemoved} pontos de ataque reduzidos. Redução permanente e coletiva acumula valor; não altera Emanação |
| Eficiente quando há fonte | Disparo de Forja | ${m.FL15.played} usos, ${m.FL15.kills} eliminações diretas. Boa sinergia com ataque alto; o piloto prioriza alvos elimináveis, portanto isso não prova que toda utilização humana seria letal |
| Forte, condicional | Sintético Próspero | ${m.FL04.played} usos e ${m.FL04.growth} pontos de crescimento registrados. Ainda entra 0/1: a força vem de sobreviver repetidamente, não de ser seguro sem proteção |
| Cumpre a função | Monge e Engenheiro | Monge registrou ${m.FL08.attackRemoved} de ataque reduzido; Engenheiro permaneceu ${m.FL17.emanationCombats} combates na Emanação. Suporte relevante, cuja aura não está toda somada ao dano individual |
| Finalizadores ativos | Verônica / Cataclisma | ${m.FL11.played}/${m.FL12.played} usos; ${m.FL11.combats}/${m.FL12.combats} participações. Chegam e têm impacto, sem justificar aumentar seus corpos por raridade |
| Forte no Fluxo | Banquete | ${m.FV05.played} usos nos dois confrontos; +${m.FV05.buffsAttack} de ataque e +${m.FV05.buffsHealth} de vida agregados. Grande recompensa por manter criaturas vivas; sua disponibilidade varia por confronto |
| Funciona, sem garantir vitória | Evasão / Sono | ${m.FV13.returns} devoluções e ${m.FV14.triggers} ativações nos dois confrontos. Compram tempo; falta avaliar sua conversão em pressão vencedora contra Ruptura |
| Pouca expressão da habilidade | Aprendiz | ${m.FV03.triggers} ativações em ${m.FV03.combats} participações. A condição de aliado beneficiado por magia está rara; prioridade para revisar sinergia e timing |
| Uso baixo nesta política | Âncora / Estaca | ${m.FV02.played}/${m.FL19.played} usos. Âncora restringe reposicionamento, não ataque; Estaca exige continuidade ofensiva. Há limites na avaliação do piloto desses efeitos; não classificá-las como inúteis apenas pela baixa frequência |

As métricas de Forja/Ruptura vêm de 16 partidas por deck; as de Fluxo agregam 32. “drawn” inclui aparições na mão e retornos com nova identidade, não apenas compras do deck. Dano de combate agregado representa ataques registrados, nem sempre perda efetiva de vida. A coluna “kills” da Evasão pode incluir carta devolvida e queimada por mão cheia: não é execução.

## Pontos de foco para os próximos testes humanos

1. **Fluxo/Ruptura:** o Fluxo consegue conservar duas criaturas até usar sua primeira ferramenta ofensiva? Quantas Evasões precisam ser gastas para desfazer uma única rodada de reposição?
2. **Controle → ataque:** após Sono/Evasão, medir dano ao Patrono nas duas rodadas seguintes e gasto de energia que ficou sem uso.
3. **Miragem:** formação deixa sua casa livre? Quantas ativações sem efeito vêm de ocupação e quantas de reserva cheia? O atacante já tinha Transpassar?
4. **Forja no final:** sobrevivência até custo 8; Golias segura várias posições por tempo excessivo? Geada faz criaturas adversárias perderem relevância de modo irreversível?
5. **Condições e sinergia:** Aprendiz realmente melhora quando Barreira/Banquete entram? Evasão remove os bônus de uma criatura grande no momento correto?
6. **Política de decisão:** comparar partidas humanas e os dois pilotos; investigação do Fluxo planejado tem prioridade, já que planejamento de horizonte curto não cobre suas sequências mais complexas.

## Apresentação e verificação de sistemas

Magias diretas aparecem como carta completa em destaque e depois voam para o Nartvanyr do dono. Armadilhas são mostradas na ativação, preservando sigilo durante preparação; efeitos persistentes mantêm a duração mecânica existente. A face usa canvas de alta resolução. A entrada tem crescimento suave, a saída tem destino relativo ao dono e o destaque é limpo quando muda a sessão. Avisos textuais centrais redundantes deixam de cobrir a carta.

Suíte npm test aprovada. Regressões adicionais verificam Miragem sem conceder Transpassar, atacante com Transpassar próprio, campos livres/ocupados, catálogo do criador, visão pública para ambos os jogadores e espectadores, destino e limpeza do destaque. A conferência visual no navegador ficou indisponível porque o kernel da ferramenta não iniciou; não há validação por screenshot nesta etapa. Prévia local: http://127.0.0.1:3057/runamarca/.

## Arquivos e reprodução

- resultados.json: placares, sementes, ações, métricas e hashes.
- comparacao.json e cartas-comparadas.csv: comparação com o controle sem poderes.
- partidas.csv e catalogo-testado.json: partidas e catálogo efetivamente usado.
- Controle preservado em ../testes-2026-10-07-32-controle-sem-poderes/.
- Script: design/simular-32-fluxo-sem-poderes-20261007.mjs; argumento --controle usa o catálogo anterior.
- Requer NODE_OPTIONS=--preserve-symlinks --preserve-symlinks-main e Node --experimental-vm-modules.
`;
fs.writeFileSync(out+'/RELATORIO.md',text);
fs.appendFileSync('ANDAMENTO.md',`\n## 2026-10-07 — Forja ajustada e Fluxo sem poderes de Patrono\n- Miragem não concede Transpassar; mantém ficha 0/1, espaço livre e descarte sem efeito. Toque Gélido 2→1. Reforço Divino custo 5→3, +2/+2→+1/+1. Catálogos do jogo/criador idênticos.\n- Bateria final 32 partidas + 32 de controle, mesmo piloto/sementes e zero poderes de Patrono. A partir desta etapa, próximos testes também não devem usar poderes até nova orientação.\n- Placares Fluxo–Forja ${score(control,'fluxo x forja')}→${score(now,'fluxo x forja')}; Fluxo–Ruptura ${score(now,'fluxo x ruptura')}.\n- Piloto corrigido: snapshots não compartilham formação escolhida e Miragem considera casa livre. Migração de piloto não é mudança de regra do jogo.\n- Destaque público de magia com canvas de alta resolução, entrada e voo ao Nartvanyr; sem avisos centrais sobre a carta. Limpeza em mudança de sessão e reentrada de fila. Regressão de público/destino aprovada, npm test aprovado.\n- Dados e relatório em ${out}. Prévia 3057 preserva salas anteriores. Navegador automatizado indisponível; sem screenshot ou publicação nesta etapa.\n`);
console.log(JSON.stringify({...comparison,mirage:{used:mirage.played,created:mirage.mirageCreated,noEffect:mirage.mirageNoEffect,intercepted:mirage.mirageIntercepted}},null,2));
