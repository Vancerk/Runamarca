import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

const folder=path.resolve('design/testes-2026-10-03-rodada4');
const data=JSON.parse(await fs.readFile(path.join(folder,'resultados.json'),'utf8'));
const old=JSON.parse(await fs.readFile('design/testes-2026-10-03-rodada3/resultados.json','utf8'));
const mean=xs=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:null;
const sum=(xs,key)=>xs.reduce((a,b)=>a+b[key],0);
function wilson(w,n){const z=1.96,p=w/n,d=1+z*z/n,c=(p+z*z/(2*n))/d,h=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/d;return [c-h,c+h].map(v=>+(v*100).toFixed(1));}
assert.equal(data.games.length,54);
assert.equal(new Set(data.games.map(g=>g.seed)).size,54);
assert.equal(data.method.scenarioCatalogHash,old.method.scenarioCatalogHash);
assert.equal(data.method.scenarioGameHash,old.method.scenarioGameHash);
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
const analysis={checks:'54 partidas; 18 combinacoes de perfil/inicio por confronto; 36 participacoes e 12 por perfil por deck; fontes e cenario inalterados',decks,planning,first:{wins:data.summary.firstWins,games:54,wilson95:wilson(data.summary.firstWins,54)},area:{direct:sum(data.summary.decks,'areaCasts'),prepared:sum(data.summary.decks,'areaPrepared'),triggered:sum(data.summary.decks,'areaTriggered'),expired:sum(data.summary.decks,'areaExpired'),remainingAtEnd:data.games.reduce((sum,g)=>sum+g.players.reduce((n,p)=>n+p.areaPrepared-p.areaTriggered-p.areaExpired,0),0)}};
await fs.writeFile(path.join(folder,'analise.json'),JSON.stringify(analysis,null,2));
const columns=['partida','semente','deck_a','perfil_a','deck_b','perfil_b','primeiro','vencedor','rodadas','combates','hp_final_a','hp_final_b'];
const csv=[columns.join(';'),...data.games.map((g,i)=>[i+1,g.seed,g.players[0].deck,g.players[0].profile,g.players[1].deck,g.players[1].profile,g.first,g.winner,g.rounds,g.combats,g.players[0].hp,g.players[1].hp].join(';'))].join('\n')+'\n';
await fs.writeFile(path.join(folder,'partidas.csv'),'\uFEFF'+csv);
console.log(JSON.stringify(analysis,null,2));
