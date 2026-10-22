import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeRoom,join,act,resolveCombat,view} from './game.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('./cartas.json',import.meta.url)));
assert.deepEqual(catalog,JSON.parse(fs.readFileSync(new URL('./criador/prototipo.json',import.meta.url))));
for(const d of catalog.decks)assert.equal(d.cards.reduce((n,c)=>n+c.quantity,0),30,d.id);
function setup(){const r=makeRoom('REVISION','A'),a=r.players[0],b=join(r,'B');Object.assign(r,{phase:'prep',turn:a.id,first:a.id,round:3,collectPreview:true});for(const p of [a,b])Object.assign(p,{mana:10,manaMax:10,patron:{hp:16,maxHp:16,affinity:'fluxo',powers:[],usedPowers:{}},deck:[]});return {r,a,b};}
{
 const {r,a,b}=setup();const model=catalog.additionalCards.find(c=>c.id==='FV17');a.hand=[{...structuredClone(model),uid:'truce',owner:a.id}];b.reserve=[0,1,2].map(i=>({uid:'enemy'+i,owner:b.id,type:'creature',attack:3,health:5,damage:0,attackMod:0,effects:[]}));
 act(r,a,{type:'play',cardId:'truce',mode:'direct'},catalog);assert.equal(a.mana,7);for(const c of b.reserve){assert.equal(c.attack,3);assert.equal(c.attackMod,-2);}
 act(r,a,{type:'endPrep'},catalog);act(r,b,{type:'endPrep'},catalog);act(r,a,{type:'vote',fight:false},catalog);act(r,b,{type:'vote',fight:false},catalog);for(const c of b.reserve){assert.equal(c.attack,3);assert.equal(c.attackMod,0);}
}
{
 const {r,a}=setup();a.patron.extraLife=2;a.hand=[{uid:'draw',name:'Comprar',type:'spell',cost:0,effects:[{op:'draw',amount:3}],directOnly:true}];act(r,a,{type:'play',cardId:'draw',mode:'direct'},catalog);const events=r.events.filter(e=>e.type==='fatigue');assert.deepEqual(events.map(e=>e.amount),[1,2,3]);assert.deepEqual(events.map(e=>e.healthUpdates[0].hp),[16,15,12]);assert.equal(a.patron.extraLife,0);assert.equal(view(r,a).players[0].deckCount,0);
}
{
 const {r,a}=setup();a.patron.hp=1;a.hand=[{uid:'draw',name:'Comprar',type:'spell',cost:0,effects:[{op:'draw',amount:2}],directOnly:true}];act(r,a,{type:'play',cardId:'draw',mode:'direct'},catalog);assert.equal(r.phase,'finished');assert.equal(r.events.filter(e=>e.type==='fatigue').length,1);assert.equal(r.events.find(e=>e.type==='fatigue').healthUpdates[0].hp,0);
}
console.log('Revisão: catálogos, 30 cartas, debuff temporário, fadiga com armadura e fadiga letal aprovados.');
