import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {act,join,makeRoom,view} from './game.mjs';

const catalog=JSON.parse(await readFile(path.join(path.dirname(fileURLToPath(import.meta.url)),'cartas.json'),'utf8'));
const limit={lacaio:3,padrao:2,elite:1};
for(const deck of catalog.decks){
  assert.equal(deck.cards.reduce((total,card)=>total+card.quantity,0),24);
  for(const card of deck.cards)assert.ok(card.quantity<=limit[card.rarity],`${card.id}: raridade inválida`);
}
assert.ok(catalog.decks.find(d=>d.affinity==='forja').cards.filter(c=>c.type==='creature').every(c=>c.effects.length),'Forja precisa de habilidades nas criaturas');

const room=makeRoom('FED123','Van');
const a=room.players[0],b=join(room,'Vitu');
const watcher=join(room,'Observador','spectator');
assert.equal(view(room,watcher).spectator,true);
assert.throws(()=>act(room,watcher,{type:'deck',deckId:'ruptura-cacada'},catalog),/arquibancada/);
act(room,a,{type:'deck',deckId:'ruptura-cacada'},catalog);
act(room,b,{type:'deck',deckId:'fluxo-selos'},catalog);
act(room,room.players.find(p=>p.id===room.coinWinner),{type:'first',playerId:a.id},catalog);
assert.equal(a.deck.length+a.hand.length,24);
assert.equal(b.deck.length+b.hand.length,24);
assert.equal(view(room,watcher).players.every(p=>p.hand===undefined),true,'espectador não vê mãos');

const model=id=>catalog.decks.flatMap(d=>d.cards).find(c=>c.id===id);
const instance=(id,p)=>({...structuredClone(model(id)),uid:`${id}-${Math.random()}`,modelId:id,owner:p.id,damage:0,attackMod:0});
const scout=instance('R02',a);a.hand.push(scout);a.mana=10;
act(room,a,{type:'play',cardId:scout.uid},catalog);
assert.equal(a.reserve.some(c=>c.token&&c.name==='Batedor Faelen'),true,'Ruptura convoca criatura');

act(room,a,{type:'endPrep'},catalog);
const enemy1=instance('R01',a),enemy2=instance('R03',a);a.reserve.push(enemy1,enemy2);
const area=instance('M10',b);b.hand.push(area);b.mana=10;
act(room,b,{type:'play',cardId:area.uid,mode:'direct'},catalog);
assert.equal(enemy1.damage,2);
assert.equal(enemy2.damage,2);

b.hand=Array.from({length:9},(_,i)=>instance('M01',b));
const drawn=instance('M08',b);b.hand.push(drawn);b.mana=10;
const before=b.discard.length;
act(room,b,{type:'play',cardId:drawn.uid,mode:'direct'},catalog);
assert.equal(b.hand.length,9,'a mão não passa de nove cartas');
assert.equal(b.discard.length,before+3,'magia e duas compras excedentes vão ao cemitério');

act(room,a,{type:'leave'},catalog);
assert.equal(room.phase,'lobby','sair durante a partida libera a sala');
assert.equal(room.players.length,1);
act(room,watcher,{type:'takeSeat'},catalog);
assert.equal(room.players.includes(watcher),true);
console.log('OK: raridades, 24 cartas, espectadores, convocações, dano em área, limite de mão e saída.');
