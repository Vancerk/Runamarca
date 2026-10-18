import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

const folder=path.resolve('design/testes-2026-10-03-rodada5');
const data=JSON.parse(await fs.readFile(path.join(folder,'resultados.json'),'utf8'));
const old=JSON.parse(await fs.readFile('design/testes-2026-10-03-rodada4/resultados.json','utf8'));
const mean=xs=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:null;
const sum=(xs,key)=>xs.reduce((a,b)=>a+b[key],0);
function wilson(w,n){const z=1.96,p=w/n,d=1+z*z/n,c=(p+z*z/(2*n))/d,h=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/d;return [c-h,c+h].map(v=>+(v*100).toFixed(1));}
assert.equal(data.games.length,54);
assert.equal(new Set(data.games.map(g=>g.seed)).size,54);
assert.notEqual(data.method.scenarioCatalogHash,old.method.scenarioCatalogHash);
assert.notEqual(data.method.scenarioGameHash,old.method.scenarioGameHash);
assert.deepEqual(data.method.profiles,old.method.profiles);
const paired=data.games.map((g,i)=>{
 const prior=old.games[i];assert.equal(g.seed,prior.seed);assert.equal(g.first,prior.first);
 assert.deepEqual(g.players.map(p=>[p.deck,p.profile]),prior.players.map(p=>[p.deck,p.profile]));
 if(!g.players.some(p=>p.deck==='forja')){
  assert.equal(g.winner,prior.winner);assert.equal(g.rounds,prior.rounds);assert.deepEqual(g.trace,prior.trace);
 }
 return {seed:g.seed,beforeWinner:prior.winner,afterWinner:g.winner,beforeRounds:prior.rounds,afterRounds:g.rounds,changedWinner:g.winner!==prior.winner};
});
for(const [file,hash] of [['mesa-nova/game.mjs',data.method.gameHash],['mesa-nova/cartas.json',data.method.catalogHash]]){
 assert.equal(createHash('sha256').update(await fs.readFile(file,'utf8')).digest('hex'),hash);
}
for(const m of data.summary.matchups){
 const games=data.games.filter(g=>g.players.some(p=>p.deck===m.left)&&g.players.some(p=>p.deck===m.right));
 assert.equal(games.length,18);
 const combinations=new Set(games.map(g=>g.players.map(p=>p.profile).join('/')+'/'+g.first));
 assert.equal(combinations.size,18);
 assert.equal(games.filter(g=>g.first===m.left).length,9);
}
const profiles=['pressao','campo','recursos'];
const decks=data.summary.decks.map(d=>{
 const games=data.games.filter(g=>g.players.some(p=>p.deck===d.deck)),rows=games.map(g=>g.players.find(p=>p.deck===d.deck));
 assert.equal(rows.length,36);
 assert.equal(rows.filter(p=>p.first).length,18);
 const byProfile=profiles.map(profile=>{const xs=rows.filter(p=>p.profile===profile);assert.equal(xs.length,12);return {profile,games:xs.length,wins:xs.filter(p=>p.won).length};});
 return {deck:d.deck,wins:d.wins,games:d.games,winPct:100*d.wins/d.games,wilson95:wilson(d.wins,d.games),byProfile,winRounds:mean(games.filter(g=>g.winner===d.deck).map(g=>g.rounds)),lossRounds:mean(games.filter(g=>g.winner!==d.deck).map(g=>g.rounds)),winningHp:mean(rows.filter(p=>p.won).map(p=>p.hp)),fatigueGames:rows.filter(p=>p.fatigue>0).length};
});
const planning=Object.fromEntries(Object.keys(data.games[0].planning).map(key=>[key,sum(data.games.map(g=>g.planning),key)]));
const axiom=data.games.flatMap(g=>g.trace.filter(t=>t.type==='play'&&t.card==='Axiom de Cerco').map(t=>t.round)),oldAxiom=old.games.flatMap(g=>g.trace.filter(t=>t.type==='play'&&t.card==='Axiom de Cerco').map(t=>t.round));
const analysis={checks:'54 partidas; calendario e sementes pareados com rodada4; todos os 18 jogos Ruptura x Fluxo com vencedor, rodadas e acoes identicos; arquivos do jogo inalterados',decks,planning,paired,changedWinners:paired.filter(p=>p.changedWinner).length,axiom:{beforePlays:oldAxiom.length,afterPlays:axiom.length,beforeMeanRound:mean(oldAxiom),afterMeanRound:mean(axiom),afterMinRound:Math.min(...axiom)},first:{wins:data.summary.firstWins,games:54,wilson95:wilson(data.summary.firstWins,54)},area:{direct:sum(data.summary.decks,'areaCasts'),prepared:sum(data.summary.decks,'areaPrepared'),triggered:sum(data.summary.decks,'areaTriggered'),expired:sum(data.summary.decks,'areaExpired'),remainingAtEnd:data.games.reduce((sum,g)=>sum+g.players.reduce((n,p)=>n+p.areaPrepared-p.areaTriggered-p.areaExpired,0),0)}};
await fs.writeFile(path.join(folder,'analise.json'),JSON.stringify(analysis,null,2));
const columns=['partida','semente','deck_a','perfil_a','deck_b','perfil_b','primeiro','vencedor_antes','vencedor_depois','rodadas_antes','rodadas_depois','combates','hp_final_a','hp_final_b'];
const csv=[columns.join(';'),...data.games.map((g,i)=>[i+1,g.seed,g.players[0].deck,g.players[0].profile,g.players[1].deck,g.players[1].profile,g.first,paired[i].beforeWinner,g.winner,paired[i].beforeRounds,g.rounds,g.combats,g.players[0].hp,g.players[1].hp].join(';'))].join('\n')+'\n';
await fs.writeFile(path.join(folder,'partidas.csv'),'\uFEFF'+csv);
const fmt=(v,d=1)=>v.toFixed(d).replace('.',','),label={ruptura:'Ruptura',fluxo:'Fluxo',forja:'Forja'};
const newForja=data.summary.decks.find(d=>d.deck==='forja'),oldForja=old.summary.decks.find(d=>d.deck==='forja');
const deckTable=data.summary.decks.map(d=>{const prior=old.summary.decks.find(p=>p.deck===d.deck);return `| ${label[d.deck]} | ${prior.wins}/${prior.games} (${fmt(100*prior.wins/prior.games)}%) | ${d.wins}/${d.games} (${fmt(100*d.wins/d.games)}%) |`;}).join('\n');
const matchupTable=data.summary.matchups.map(m=>{const prior=old.summary.matchups.find(p=>p.left===m.left&&p.right===m.right);return `| ${label[m.left]} × ${label[m.right]} | ${prior.leftWins}–${prior.rightWins} | ${m.leftWins}–${m.rightWins} | ${fmt(m.meanRounds,2)} |`;}).join('\n');
const metricsTable=['meanExtraDraws','meanTokens','meanHandEnd','emptyHandPct','unusedManaPct','healedCreatures','healedPatron','dead','fatigue','fatigueDamage','burned'].map(key=>{
 const names={meanExtraDraws:'Compras extras / partida',meanTokens:'Fichas / partida',meanHandEnd:'Cartas ao encerrar preparação, média',emptyHandPct:'Preparações encerradas sem cartas (%)',unusedManaPct:'Mana disponível sem gastar (%)',healedCreatures:'Cura de criaturas fora do combate, total HP',healedPatron:'Cura de Patrono, total HP',dead:'Criaturas destruídas, total',fatigue:'Eventos de fadiga',fatigueDamage:'Dano de fadiga, total',burned:'Cartas queimadas por mão cheia'};
 return `| ${names[key]} | ${data.summary.decks.map(d=>fmt(d[key],key.startsWith('healed')||['dead','fatigue','fatigueDamage','burned'].includes(key)?0:2)).join(' | ')} |`;
}).join('\n');
const profileTable=decks.map(d=>`| ${label[d.deck]} | ${d.byProfile.map(p=>p.wins+'/'+p.games).join(' | ')} |`).join('\n');
const durationTable=decks.map(d=>`| ${label[d.deck]} | ${fmt(d.winRounds,2)} | ${fmt(d.lossRounds,2)} |`).join('\n');
const conclusion=100*newForja.wins/newForja.games>70?'Forja continua com uma vantagem grande sob estas políticas. O pacote aproximou o confronto com Ruptura, mas não o de Fluxo; revisar a sustentação e as respostas continua sendo uma hipótese, sem novos nerfs escolhidos nesta execução.':'O pacote reduziu a dominância observada. É preciso olhar cada confronto e confirmar com jogadores humanos; o agregado sozinho não certifica equilíbrio.';
const report=`# RunaMarca — quinta bateria: cura paga, Escudeiro ferido e Axiom de custo oito

Data: 03/10/2026. Experimento em memória; 54 partidas concluídas. Referência: quarta bateria, com calendário, sementes, ordem inicial e perfis pareados.

## Alterações aplicadas nesta simulação

| Carta | Referência | Nova configuração |
|---|---|---|
| Clériga da Forja | Custo 2, 1/2; cura gratuita de 1 por preparação em emanação | Custo 2, 1/2; cura opcional de 1 por **1 mana**, em outra criatura aliada; uma ativação por Clériga por preparação |
| Escudeiro Sheldran | Custo 2, 1/3; Revelação causa 1 de dano sempre | Custo 2, 1/3; Revelação causa 1 de dano **se estiver ferido naquele momento** |
| Drakonir dos Túmulos | Custo 5, 3/7; Revelação causa 1 de dano | Custo 5, **3/5**; mesma Revelação |
| Axiom de Cerco | Custo 7, 8/8; compra uma ao entrar | **Custo 8**, 8/8; continua comprando uma ao entrar |

Os ajustes das baterias anteriores continuam presentes, incluindo Veterano 3/5 com +1 de ataque na Revelação. Ruptura e Fluxo têm os mesmos catálogos. As regras de área permanecem: um de dano direto na reserva fora da emanação; dois na formação quando preparada, após o gatilho; área sem ativação expira ao fim da rodada. Emanação só pode ser atingida por magia de alvo direto.

## Resultados

| Confronto | Antes | Agora | Rodadas médias agora |
|---|---:|---:|---:|
${matchupTable}

| Deck | Antes | Agora |
|---|---:|---:|
${deckTable}

${conclusion}

${analysis.changedWinners} partidas mudaram de vencedor em relação à referência. Todos os 18 confrontos Ruptura × Fluxo tiveram vencedor, rodadas e sequência de ações idênticos: são controles reproduzidos, não 18 novas observações independentes a somar à bateria anterior.

## Perfis e ritmo

| Deck | Pressão | Campo | Recursos |
|---|---:|---:|---:|
${profileTable}

São 12 participações por perfil por deck. Os perfis foram cruzados em todas as combinações, com ambos os inícios: 18 jogos por confronto e 36 participações por deck. Não houve ajuste dos pesos para perseguir uma taxa de vitória.

| Deck | Rodadas médias nas vitórias | Rodadas médias nas derrotas |
|---|---:|---:|
${durationTable}

Média geral: ${fmt(data.summary.rounds.mean,2)} rodadas; mediana ${data.summary.rounds.median}; intervalo ${data.summary.rounds.min}–${data.summary.rounds.max}. Primeiro jogador venceu ${data.summary.firstWins}/54. Empates: ${data.summary.draws}. Não são medidas de minutos humanos: a rotina acelera as esperas.

## Recursos

| Indicador | Ruptura | Fluxo | Forja |
|---|---:|---:|---:|
${metricsTable}

A cura total registrada de criaturas da Forja passou de ${oldForja.healedCreatures} para ${newForja.healedCreatures} HP. Isso inclui suas magias de cura, e não apenas emanação. A Clériga realizou **${newForja.clericHeals} ativações pagas, gastando ${newForja.clericMana} mana**, conferindo um pagamento por cura. O indicador de mana não gasta desconta esses pagamentos antes de registrar o fim da preparação. Cura é a recuperação líquida registrada fora da resolução do combate.

O Axiom foi jogado ${analysis.axiom.afterPlays} vezes, contra ${analysis.axiom.beforePlays} antes. A rodada média de entrada passou de ${fmt(analysis.axiom.beforeMeanRound,2)} para ${fmt(analysis.axiom.afterMeanRound,2)}; a entrada mais cedo nesta bateria foi na rodada ${analysis.axiom.afterMinRound}. A média depende de quando a carta é comprada, da duração e da decisão de jogá-la; a regra de custo oito foi verificada separadamente.

O Patrono de Forja terminou suas vitórias com média de ${fmt(decks.find(d=>d.deck==='forja').winningHp,2)} HP, contra 13,06 antes. Suas vitórias passaram de 10,36 para ${fmt(decks.find(d=>d.deck==='forja').winRounds,2)} rodadas em média. São sinais de maior desgaste e estabilização mais tardia, embora os subconjuntos de vitórias sejam diferentes.

Fluxo sofreu fadiga em ${decks.find(d=>d.deck==='fluxo').fatigueGames} partidas, contra duas antes. O placar contra Forja permaneceu 1–17, mas a vitória de Fluxo ocorreu em outra semente: duas partidas desse confronto trocaram de vencedor, cancelando-se no total. Sua média de compras extras aumentou, e os confrontos com Forja ficaram mais longos. A interpretação é que estender a partida e oferecer mais compras ainda não resolveu a conversão de recursos em vitória; isso não demonstra sozinho uma causa específica ou a necessidade de buffar Fluxo.

Magia em área: ${analysis.area.direct} usos diretos e ${analysis.area.prepared} preparados; ${analysis.area.triggered} ativações, ${analysis.area.expired} expirações e ${analysis.area.remainingAtEnd} ainda em campo no encerramento da partida, antes da expiração. As regras de imunidade e expiração foram verificadas em cenários específicos, não inferidas apenas dos totais.

## Método, verificações e limites

As ${data.method.checks.length} verificações passaram:

${data.method.checks.map(c=>'- '+c).join('\n')}

A rotina mantém os três perfis, busca de sequências de duas ações, largura quatro, até 24 ações candidatas, até 32 formações em previsão detalhada e projeção de dois confrontos. As previsões usam informação pública e uma instância separada do motor.

Foram necessárias adaptações para respeitar as novas regras: reconhecer a Revelação condicional do Escudeiro e comparar pagar a cura com passar sem curar. Para a escolha imediata, compara não curar e até dois alvos priorizados por Clériga, respeitando mana e ferimentos; a projeção posterior continua aproximada. Essas adaptações não constituem uma política humana perfeita.

O resultado mede o **pacote completo**. Não permite atribuir uma vitória à mudança da Clériga ou do Axiom isoladamente. A amostra é pequena por confronto e os jogadores são heurísticos. As sementes pareadas ajudam a comparação, mas as ações divergem após as mudanças, e as partidas não devem ser somadas às antigas como amostras independentes. Intervalos aproximados por deck constam em analise.json e não incorporam o viés da política.

Os hashes do motor e do catálogo originais foram conferidos. O site, o GitHub e o Seis Ossos não foram alterados. Arquivos nesta pasta: resultados.json, analise.json, partidas.csv e catalogo-testado.json. O catálogo exportado é uma cópia do cenário experimental, sem substituir o catálogo do jogo.

## Reprodução

Na raiz do projeto:

\`\`\`powershell
$env:NODE_OPTIONS='--preserve-symlinks --preserve-symlinks-main'
& 'C:/Program Files/nodejs/node.exe' --experimental-vm-modules design/simular-balanceamento-rodada5.mjs
& 'C:/Program Files/nodejs/node.exe' design/analisar-balanceamento-rodada5.mjs
\`\`\`

Repetir sobrescreve os artefatos desta mesma amostra.
`;
await fs.writeFile(path.join(folder,'relatorio.md'),report);
console.log(JSON.stringify(analysis,null,2));
