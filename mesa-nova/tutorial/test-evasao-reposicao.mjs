import fs from 'node:fs';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {makeRoom,join,act,easyBotAction} from './game.mjs';
const catalog=JSON.parse(fs.readFileSync(process.argv[2]||new URL('./cartas.json',import.meta.url)));
const models=[...catalog.decks.flatMap(d=>d.cards),...catalog.additionalCards];
const evasion=models.find(c=>c.id==='FV13'),drawCount=evasion.effects.find(e=>e.op==='draw').amount;
const card=(id,p,extra={})=>{const base=models.find(c=>c.id===id);return {...structuredClone(base),uid:randomUUID(),modelId:id,owner:p.id,damage:0,attackMod:0,baseStats:{attack:base.attack,health:base.health,cost:base.cost},...extra};};
function setup(){const room=makeRoom('EVASAO','A'),a=room.players[0],b=join(room,'B');for(const p of [a,b])Object.assign(p,{deckData:catalog.decks.find(d=>d.id==='fluxo-virelion'),mana:10,manaMax:10,patron:{hp:20,maxHp:20},deck:[card('FV03',p),card('FV03',p)]});Object.assign(room,{phase:'prep',first:a.id,turn:a.id});const target=card('FL21',b,{attack:6,health:6,damage:2,permanentGains:{attack:5,health:5}});b.reserve.push(target);const spell=card('FV13',a);a.hand.push(spell);return {room,a,b,target,spell};}
const play=({room,a,target,spell})=>act(room,a,{type:'play',cardId:spell.uid,targetId:target.uid},catalog);
{
 const x=setup();play(x);assert.ok(x.b.hand.includes(x.target));assert.equal(x.target.attack,1);assert.equal(x.target.health,1);assert.equal(x.target.damage,0);assert.equal(x.a.mana,10-evasion.cost);assert.equal(x.a.hand.length,drawCount);assert.equal(x.a.deck.length,2-drawCount);assert.equal(x.room.events.filter(e=>e.type==='draw'&&e.playerId===x.a.id).length,drawCount);
}
{
 const x=setup();x.target.runeCoating=true;play(x);assert.ok(x.b.reserve.includes(x.target));assert.equal(x.target.runeCoating,true,'Antimagia permanece após bloquear a magia');assert.equal(x.target.attack,6);assert.equal(x.a.hand.length,drawCount,'A proteção impede devolução, não compra');assert.equal(x.a.deck.length,2-drawCount);
}
{
 const x=setup();assert.throws(()=>act(x.room,x.a,{type:'play',cardId:x.spell.uid,targetId:'inexistente'},catalog));assert.equal(x.a.mana,10);assert.equal(x.a.deck.length,2);assert.ok(x.a.hand.includes(x.spell));assert.ok(x.b.reserve.includes(x.target));
}
{
 const x=setup();x.b.hand=Array.from({length:9},()=>card('FV03',x.b));play(x);assert.ok(x.b.discard.includes(x.target),'Devolução para mão cheia envia ao Nartvanyr');assert.equal(x.b.hand.length,9);assert.equal(x.a.hand.length,drawCount);
}
{
 const x=setup();x.a.deck=[];x.a.patron.hp=1;play(x);assert.equal(x.a.fatigue,1);assert.equal(x.a.patron.hp,0);assert.equal(x.room.phase,'finished');assert.equal(x.room.winner,x.b.id);
}
if(Number.isFinite(evasion.effects[0].min_attack)){
 const minimum=evasion.effects[0].min_attack;
 const x=setup();x.target.attack=minimum-1;assert.throws(()=>play(x),new RegExp(minimum+' ou mais de ataque'));assert.equal(x.a.mana,10);assert.equal(x.a.deck.length,2);assert.ok(x.b.reserve.includes(x.target));x.target.attackMod=1;play(x);assert.ok(x.b.hand.includes(x.target),'Conta o ataque efetivo, não apenas o impresso');
 const y=setup();y.a.bot=true;y.target.attack=minimum-1;const large=card('RG05',y.b,{attack:minimum});y.b.reserve.push(large);assert.equal(easyBotAction(y.room).targetId,large.uid,'Bot ignora alvo pequeno inelegível');
 const z=setup();z.target.attack=minimum-1;z.b.formation[0]=z.target.uid;const aura=card('FL17',z.b);z.b.reserve.push(aura);z.b.emanation.push(aura.uid);assert.throws(()=>play(z),new RegExp(minimum+' ou mais de ataque'),'Aura de formação oculta não altera a elegibilidade na reserva');assert.equal(z.a.mana,10);
}
console.log('Evasão com reposição: devolução/reset, cobrança, compra, proteção, alvo inválido, mão cheia, fadiga e restrição de ataque aprovados.');
