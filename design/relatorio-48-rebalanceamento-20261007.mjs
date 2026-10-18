import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

const dir='design/testes-2026-10-07-48-rebalanceamento';
const old=JSON.parse(fs.readFileSync('design/testes-2026-10-07-48/resultados.json'));
const now=JSON.parse(fs.readFileSync(dir+'/resultados.json'));
const cat=JSON.parse(fs.readFileSync(dir+'/catalogo-testado.json'));
const hash=s=>createHash('sha256').update(s).digest('hex');
const pilot=fs.readFileSync('design/simular-48-20261007-rebalanceamento.mjs','utf8');
assert.equal(pilot.replace("const out='design/testes-2026-10-07-48-rebalanceamento'","const out='design/testes-2026-10-07-48'"),fs.readFileSync('design/simular-48-20261007.mjs','utf8'),'pilotos idênticos, exceto pasta de saída');
assert.equal(now.games.length,48);
assert.equal(Object.values(now.summary.wins).reduce((a,b)=>a+b),48);
for(const [file,sha] of Object.entries(now.hashes))assert.equal(hash(fs.readFileSync('mesa-nova/'+file,'utf8')),sha);
assert.equal(hash(JSON.stringify(cat)),now.catalogHash);
for(const matchup of now.summary.matchups){
 const games=now.games.filter(g=>g.pair===matchup.pair);assert.equal(games.length,16);
 for(const deck of matchup.pair.split(' x '))assert.equal(games.filter(g=>g.first===deck).length,8);
}
for(let i=0;i<48;i++)assert.deepEqual([now.games[i].seed,now.games[i].first,now.games[i].pair,now.games[i].modes],[old.games[i].seed,old.games[i].first,old.games[i].pair,old.games[i].modes]);
assert.deepEqual(now.games.slice(0,16),old.games.slice(0,16),'confronto sem Ruptura permanece idêntico');
const changed=now.games.filter((g,i)=>g.winner!==old.games[i].winner).map(g=>({match:g.n,pair:g.pair,before:old.games[g.n-1].winner,after:g.winner,oldRounds:old.games[g.n-1].rounds,newRounds:g.rounds}));
const avg=gs=>gs.reduce((n,g)=>n+g.rounds,0)/gs.length;
const f=n=>n.toFixed(2).replace('.',',');
const metrics=now.summary.metrics,previous=old.summary.metrics;
const csvCell=s=>'"'+String(s??'').replaceAll('"','""')+'"';
const cols=['drawn','played','combats','faceDamage','spellDamage','tokens','triggers','returns','healed','attackRemoved','redirects','unplayed'];
fs.writeFileSync(dir+'/cartas-comparadas.csv','id;nome;deck;custo;'+cols.flatMap(k=>[k+'_antes',k+'_depois']).join(';')+'\n'+Object.entries(metrics).map(([id,m])=>[id,m.name,m.deck,m.cost,...cols.flatMap(k=>[previous[id][k],m[k]])].map(csvCell).join(';')).join('\n'));
const matchups=now.summary.matchups.map(x=>{
 const before=old.summary.matchups.find(y=>y.pair===x.pair),a=old.games.filter(g=>g.pair===x.pair),b=now.games.filter(g=>g.pair===x.pair);
 return {pair:x.pair,before:before.wins,after:x.wins,meanBefore:avg(a),meanAfter:avg(b),beforeRound8:a.filter(g=>g.rounds<8).length,afterRound8:b.filter(g=>g.rounds<8).length};
});
const comparison={completed:48,pairedSeeds:24,pilotUnchanged:true,unchangedMatchupIdentical:true,changedWinners:changed,durationChanged:now.games.filter((g,i)=>g.rounds!==old.games[i].rounds).length,matchups,overallBefore:old.summary.wins,overallAfter:now.summary.wins,meanBefore:old.summary.meanRounds,meanAfter:now.summary.meanRounds,firstWins:now.summary.firstWins};
fs.writeFileSync(dir+'/comparacao.json',JSON.stringify(comparison,null,2));
now.pilotHash=hash(pilot);now.validation={completedMatches:48,initialOrderBalanced:true,sameSeedsAndPolicies:true,unchangedMatchupIdentical:true,engineAndCatalogHashesVerified:true};
fs.writeFileSync(dir+'/resultados.json',JSON.stringify(now,null,2));
const matches=matchups.map(m=>{const decks=m.pair.split(' x ');return `| ${m.pair} | ${decks.map(d=>m.before[d]).join(' × ')} | ${decks.map(d=>m.after[d]).join(' × ')} | ${f(m.meanBefore)} → ${f(m.meanAfter)} |`;}).join('\n');
const decks=['forja','fluxo','ruptura'].map(d=>`| ${d} | ${old.summary.wins[d]}/32 (${f(old.summary.wins[d]/32*100)}%) | ${now.summary.wins[d]}/32 (${f(now.summary.wins[d]/32*100)}%) |`).join('\n');
const md=`# RunaMarca — repetição controlada de 48 partidas após os nerfs

Data: 07/10/2026. Comparação com a bateria anterior de 48 partidas do mesmo dia. Foram alterados somente Geômetro, Chamado da Tradição, Comandante Gnoll e Estilhaço Elétrico. Rastreadora e os decks Forja/Fluxo permanecem iguais.

## Resultados

Placares seguem a ordem dos nomes do confronto; cada confronto teve 16 partidas.

| Confronto | Antes | Depois | Rodadas médias, antes → depois |
|---|---:|---:|---:|
${matches}

| Deck | Antes | Depois |
|---|---:|---:|
${decks}

**Os nerfs funcionaram mecanicamente, mas não resolveram o domínio da Ruptura nesta amostra.** Apenas a partida 20 mudou de vencedor: Ruptura na rodada 7 passou a Forja na rodada 8. Na versão nova, a Forja terminou com 1 de vida. Os quatro ajustes foram aplicados juntos: não é possível atribuir essa virada exclusivamente a uma carta.

A duração mudou em ${comparison.durationChanged} partidas. A média geral passou de ${f(old.summary.meanRounds)} para ${f(now.summary.meanRounds)} rodadas. O primeiro jogador da rodada inicial venceu ${now.summary.firstWins}/48 (${f(now.summary.firstWins/48*100)}%); a iniciativa segue alternando nas rodadas seguintes.

## O efeito de cada ajuste

| Carta | Antes | Depois | Leitura |
|---|---|---|---|
| Estilhaço Elétrico | 37 usos; 62 de dano ao Patrono; 6 eliminações diretas | 34 usos; 26 de dano ao Patrono; 8 eliminações diretas | O alcance agregado no Patrono caiu 58,1%. Ainda remove criaturas com 1 de vida; as oito eliminações são oito usos selecionados, não uma carta mais forte por causar menos dano. |
| Comandante Gnoll | 39 ativações em 51 participações; 56 de dano atribuído ao Patrono | 31 ativações em 46 participações; 28 de dano atribuído ao Patrono | A frequência caiu de 76,5% para 67,4%, e cada ativação dá +1 em vez de +2. Continua funcional, com recompensa menor. |
| Chamado da Tradição | 29 usos; 64 fichas | 28 usos; 56 fichas | Exatamente duas fichas por uso nesta bateria. Removeu o crescimento das cópias posteriores; a geração horizontal continua útil. |
| Geômetro Dedicado | 40 usos; 39 fichas observadas após combate | 41 usos; 34 fichas observadas após combate | Queda de 12,8% nas fichas observadas. O primeiro bloqueio continua bom; o limite pesa menos quando o corpo morre cedo ou é devolvido e jogado novamente. Fichas criadas e removidas no mesmo combate podem não entrar neste contador. |

Não some essas reduções como se fossem redução equivalente na vida final do Patrono: escolhas, duração e fontes de dano mudaram. A comparação mede o pacote completo com pilotos reagindo ao novo estado.

## Por que a Ruptura continua vencendo

Esta é uma interpretação dos dados e das regras, não uma medição isolada da contribuição de cada carta:

- A curva barata ainda fornece ocupantes e reposição suficientes para três posições. Diminuir dano de fechamento não remove o campo já estabelecido.
- Incursora continua atacando defensores frágeis antes do choque: 34 usos, 74 participações e 37 pontos de dano de Revelação registrados, contra 32 antes.
- Rastreadora foi preservada como solicitado. Teve 30 usos, contra 25, e 103 de dano atribuído ao Patrono, contra 99. Sua aura continua melhorando Tribais; fichas Geometro têm outro subtipo e **não** recebem essa aura. Mais uso não prova, sozinho, que a carta precise de nerf.
- Fulgor Final foi usado sete vezes, contra seis, causando 42 de dano no Patrono no agregado. Uma ativação de 6 ainda representa 37,5% da vida inicial. Cólera mantém o pico de ataque em campo: 15 usos em ambas as baterias.
- Forja × Ruptura ainda terminou antes da rodada 8 em 13/16 partidas, contra 14/16. As ameaças caras da Forja continuam chegando tarde em boa parte dos jogos.
- Fluxo continua ganhando tempo com respostas individuais: Evasão foi usada 46 vezes, contra 44; Sono ativou 25 vezes, contra 26. Essa capacidade não virou vitória contra o conjunto de corpos baratos, reposição e alcance no Patrono nesta simulação.

## O que segue forte, funcional ou pouco aproveitado

### Forte / monitorar

- **Pacote ofensivo da Ruptura:** continuou em 30/32. Incursora, melhorias de conjunto e finalizadores merecem investigação conjunta. Não há base para afirmar que todas as cartas estejam fortes demais.
- **Fulgor Final e Cólera:** preservam fechamento e explosão mesmo com Estilhaço menor. Prioridades para um próximo experimento isolado, se aprovado.
- **Banquete dos Heróis:** 11 usos e +64 de ataque/+64 de vida distribuídos no agregado. Mantém um pico relevante para Fluxo; depende de campo e não resolveu Ruptura.

### Cumpre bem a função nesta bateria

- **Estilhaço:** mantém remoção pontual barata, com fechamento reduzido.
- **Gnoll e Chamado:** continuam usados, sem os antigos bônus e crescimento de fichas.
- **Disparo de Forja:** 16 usos e 16 eliminações diretas selecionadas, removendo 38 de vida. O efeito baseado no aliado continua eficiente quando existe um atacante vivo.
- **Evasão e Sono:** respostas de tempo úteis; o problema é converter esse tempo em vitória contra Ruptura.
- **João Bobão:** 14 usos e sete redirecionamentos adicionais; defesa descartável, sem pretensão de carregar sozinho o confronto.

### Fraco ou com pouca exposição

- **Miragem Provocadora:** zero usos em 33 aparições, novamente. A regra que concede Transpassar ao inimigo torna a proteção muito pequena contra ataque alto. O piloto não a escolheu; isso não demonstra que todo uso humano seja inútil.
- **Toque Gélido:** quatro usos em 32 aparições; quatro pontos de ataque retirados. Continua pouco prioritário pelo custo/alcance.
- **Reforço Divino:** três usos em dez aparições; concorrência com corpos e poderes permanece.
- **Verônica e Cataclisma:** três usos de cada; o jogo frequentemente acaba antes de sua janela. Poucos dados para avaliar os corpos ou o teto dos efeitos.
- **Vultobreve e Bruxo:** três e um usos, respectivamente. Exposição insuficiente para conclusão definitiva. Aríete subiu de um para seis usos: antes de reclassificar sua força, vale verificar partidas humanas com sua opção de pagamento.

## Método e limites

- Motor real do jogo, 48 partidas completas; 16 por confronto e 32 participações por deck. Sem truncamento por limite de rodadas.
- Mesmas 24 sementes da bateria anterior, cada uma com iniciativa inicial invertida. O código dos pilotos é idêntico, exceto pelo destino dos arquivos; Forja × Fluxo foi reproduzido integralmente com ações e resultados idênticos.
- Quatro partidas por combinação de pilotos em cada confronto: imediato/imediato, planejado/planejado, imediato/planejado e planejado/imediato. Imediato venceu 27 vezes e planejado 21, igual ao anterior. Estes totais não isolam a vantagem de um estilo, porque os blocos usam sementes diferentes.
- Preparação considera ações e, no piloto planejado, sequência curta e valor futuro. Formação compara hipóteses de colocação rival usando o resolvedor. Decisões usam a visão pública, sem acesso à mão, ordem de compra ou formação secreta do oponente.
- Vida 16, iniciativa alternada, uma troca de mão inicial para ambos, reserva oito excluindo Emanação, fadiga e regras atuais. Os poderes da Forja permanecem incluídos; Fluxo e Ruptura não possuem equivalentes implementados.
- Busca limitada não significa jogo perfeito nem eficiência de 100%. As 48 partidas não são 48 amostras independentes; são 24 pares. Reusar sementes ajuda na comparação, mas não mede a taxa esperada de vitória de jogadores humanos.
- “Aparições” inclui oferta inicial e reentrada por devolução. Participação não garante que a criatura tenha atacado. Dano de ataque agregado é nominal; algumas fichas/efeitos indiretos não são integralmente atribuídos. Os contadores não são um ranking causal de poder.
- Apenas uma virada de vencedor é mudança pequena para esta amostra. O sinal de domínio permanece; não há evidência de que esta versão tenha alcançado equilíbrio.

## Próxima avaliação sugerida, sem aplicar mudanças

Antes de reduzir mais cartas, testar separadamente o alcance de Fulgor e o pico de Cólera, e a capacidade de Forja/Fluxo responderem a várias ameaças baratas. A Rastreadora foi mantida e não foi alterada durante a execução. Nenhuma mudança extra no jogo ou publicação foi feita para esta bateria.

Arquivos: partidas.csv, cartas-comparadas.csv, comparacao.json, resultados.json e catalogo-testado.json nesta pasta. Os arquivos da bateria anterior foram preservados.
`;
fs.writeFileSync(dir+'/RELATORIO.md',md);
console.log(JSON.stringify(comparison,null,2));
