import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {act,makeRoom,join} from './game.mjs';
const catalog=JSON.parse(await readFile(new URL('./cartas.json',import.meta.url),'utf8'));
const first=catalog.decks[0];
function choose(cards){const room=makeRoom('TEST','Teste');act(room,room.players[0],{type:'deck',deckId:first.id},{decks:[{...first,cards}]});return room;}
const thirty=Array.from({length:30},(_,i)=>({...first.cards[0],id:`test-${i}`,quantity:1,rarity:'lacaio'}));
assert.equal(choose(thirty).players[0].deckData.cards.length,30);
assert.throws(()=>choose([...thirty,{...thirty[0],id:'extra'}]),/até 30/);
for(const [rarity,max] of Object.entries({lacaio:4,padrao:3,elite:2,soberano:1})){
 const card={...first.cards[0],rarity,quantity:max};assert.equal(choose([card]).players[0].deckData.cards[0].quantity,max);
 assert.throws(()=>choose([{...card,quantity:max+1}]),/cópia/);
}
assert.throws(()=>choose([{...first.cards[0],rarity:'desconhecida',quantity:1}]),/Deck inválido/);
const room=makeRoom('FATIGA','A'),a=room.players[0],b=join(room,'B');
act(room,a,{type:'deck',deckId:catalog.decks[0].id},catalog);act(room,b,{type:'deck',deckId:catalog.decks[1].id},catalog);
act(room,a,{type:'confirmMulligan'},catalog);act(room,b,{type:'confirmMulligan'},catalog);
const player=room.players.find(p=>p.id===room.turn);player.deck=[];player.patron.hp=player.patron.maxHp=100;
function buy(amount){const spell={uid:'buy-'+Math.random(),id:'draw-test',name:'Compra de teste',cost:0,type:'direct_spell',effects:[{op:'draw',amount}],owner:player.id};player.hand=[spell];act(room,player,{type:'play',cardId:spell.uid,mode:'direct'},catalog);}
buy(4);assert.deepEqual(room.events.filter(e=>e.type==='fatigue').map(e=>e.amount),[1,2,4,8]);assert.equal(player.patron.hp,85);
buy(1);assert.equal(player.patron.hp,69);assert.equal(player.fatigue,16);
player.patron.hp=10;buy(3);assert.equal(room.phase,'finished');assert.equal(room.winner,room.players.find(p=>p!==player).id);
assert.equal(player.fatigue,32,'A compra para quando a fadiga encerra a partida');
console.log('OK: máximo de 30 cartas, quatro raridades, fadiga exponencial e derrota por fadiga.');
