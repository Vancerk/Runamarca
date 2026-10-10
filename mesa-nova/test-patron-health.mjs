import fs from 'node:fs';
import assert from 'node:assert/strict';
import {makeRoom,join,act,view,PATRON_STARTING_HEALTH} from './game.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('./cartas.json',import.meta.url)));
const creator=JSON.parse(fs.readFileSync(new URL('./criador/prototipo.json',import.meta.url)));
assert.equal(PATRON_STARTING_HEALTH,20);
assert.equal(catalog.rules.patron_health,20);
assert.deepEqual(creator,catalog);
for(const deck of catalog.decks){
 const room=makeRoom('HP20','A'),a=room.players[0],b=join(room,'B');
 const select=()=>{act(room,a,{type:'deck',deckId:deck.id},catalog);act(room,b,{type:'deck',deckId:deck.id},catalog);};select();
 for(const p of room.players){assert.equal(p.patron.hp,20);assert.equal(p.patron.maxHp,20);const visible=view(room,p).players.find(x=>x.id===p.id);assert.equal(visible.patron.hp,20);assert.equal(visible.patron.maxHp,20);}
 for(const key of ['hp','health','maxHp'])if(key in deck.patron)assert.equal(deck.patron[key],20);
 a.patron.hp=0;b.patron.hp=3;room.phase='finished';room.winner=b.id;
 act(room,a,{type:'reset'},catalog);assert.equal(room.phase,'lobby');select();
 assert.ok(room.players.every(p=>p.patron.hp===20&&p.patron.maxHp===20),'nova partida restaura os 20 pontos');
}
console.log('Patronos 20: três decks, visão pública, reinício e criador aprovados.');
