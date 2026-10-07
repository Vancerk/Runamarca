import fs from 'node:fs';
import assert from 'node:assert/strict';
import {makeRoom,join,act,resolveCombat,view} from './game.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('./cartas.json',import.meta.url))),deck=catalog.decks.find(d=>d.affinity==='forja');
function setup(){const room=makeRoom('POWER','A'),a=room.players[0],b=join(room,'B');Object.assign(room,{phase:'prep',round:1,turn:a.id,first:a.id,collectPreview:true});for(const p of [a,b])Object.assign(p,{deckData:deck,patron:{hp:16,maxHp:16,affinity:'forja',powers:structuredClone(deck.patron.powers),usedPowers:{}},deck:[{uid:crypto.randomUUID()}],mana:10,manaMax:10});const model=deck.cards.find(c=>c.id==='FL01'),c={...structuredClone(model),uid:'c',owner:a.id,modelId:model.id,baseStats:{attack:model.attack,health:model.health,cost:model.cost},attackMod:0,damage:1};a.reserve=[c];return {room,a,b,c};}
{
 const {room,a,b,c}=setup();act(room,a,{type:'patronPower',powerId:'potencializar',targetId:c.uid,attribute:'health'},catalog);assert.equal(a.mana,8);assert.equal(c.health,3);assert.equal(c.damage,1,'+vida não restaura o dano existente');assert.equal(c.attack,2);assert.throws(()=>act(room,a,{type:'patronPower',powerId:'potencializar',targetId:c.uid,attribute:'attack'},catalog),/utilizado/);assert.equal(a.mana,8);room.round=2;act(room,a,{type:'patronPower',powerId:'potencializar',targetId:c.uid,attribute:'attack'},catalog);assert.equal(c.attack,3);assert.ok(view(room,b).events.some(e=>e.type==='patron_power'&&e.targetId===c.uid));
}
{
 const {room,a,b,c}=setup();act(room,a,{type:'patronPower',powerId:'ultimato-forja',targetId:c.uid},catalog);assert.equal(a.mana,6);assert.equal(c.attack,4);assert.equal(c.health,4);assert.ok(c.grantedTrample);room.round=2;assert.throws(()=>act(room,a,{type:'patronPower',powerId:'ultimato-forja',targetId:c.uid},catalog),/utilizado/);const target={...structuredClone(c),uid:'enemy',owner:b.id,attack:0,health:1,damage:0,grantedTrample:false,effects:[]};b.reserve=[target];a.formation[0]=c.uid;b.formation[0]=target.uid;room.phase='resolving';resolveCombat(room);assert.equal(b.patron.hp,13,'Transpassar causa os três pontos excedentes');assert.ok(c.grantedTrample,'permanece após o combate');
}
{
 const {room,a,b,c}=setup();for(const data of [{targetId:'wrong',attribute:'attack'},{targetId:c.uid,attribute:'wrong'}])assert.throws(()=>act(room,a,{type:'patronPower',powerId:'potencializar',...data},catalog));assert.equal(a.mana,10);assert.deepEqual(a.patron.usedPowers,{});room.turn=b.id;assert.throws(()=>act(room,a,{type:'patronPower',powerId:'potencializar',targetId:c.uid,attribute:'attack'},catalog),/preparação/);
}
console.log('Poderes da Forja: custos, limites por rodada/partida, alvos, bônus permanentes sem cura e Transpassar aprovados.');
