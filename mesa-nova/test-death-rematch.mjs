import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {makeRoom,join,act} from './game.mjs';
const read=name=>fs.readFileSync(new URL(name,import.meta.url),'utf8');
const app=read('app.js'),catalog=JSON.parse(read('cartas.json'));
const part=(text,from,to)=>text.slice(text.indexOf(from),text.indexOf(to,text.indexOf(from)));

test('an animation clone receives art that finishes painting after the clone is made',async()=>{
 let ready,originalPixels=0,clonePixels=-1;
 const canvas={getContext:()=>({drawImage:()=>{clonePixels=originalPixels;}})},source={visualReady:new Promise(r=>ready=r),querySelectorAll:()=>[{}],cloneNode:()=>({querySelectorAll:()=>[canvas]})};
 const scope={};vm.createContext(scope);vm.runInContext(part(app,'function cloneVisual(','const $='),scope);
 const copy=scope.cloneVisual(source);assert.equal(clonePixels,0);originalPixels=42;ready();await copy.visualReady;assert.equal(clonePixels,42);
});

test('a future casualty remains visible after an earlier harmless flight',()=>{
 const card={dataset:{uid:'later'},style:{visibility:'hidden'},classList:{remove(){}}};
 const scope={state:{phase:'resolving',combat:{casualties:[{uid:'later'}]}},visuallyDefeated:new Set(),movingCards:new Set(['later']),pendingArrival:[],document:{querySelectorAll:()=>[card]}};
 vm.createContext(scope);vm.runInContext(part(app,'function finishVisual(','async function safeFlight('),scope);
 scope.finishVisual('later');assert.equal(card.style.visibility,'','server preview of a later death must not hide the card early');
 scope.visuallyDefeated.add('later');scope.finishVisual('later');assert.equal(card.style.visibility,'hidden','a casualty already presented stays hidden behind its corpse copy');
});

test('lethal damage in combat pins a single red corpse, without early graveyard flight',()=>{
 const classes=new Set(),node={dataset:{uid:'victim'},classList:{add:c=>classes.add(c)},getBoundingClientRect:()=>({left:10,top:10,width:80,height:120})};
 let clones=0,sounds=0,flights=0;
 const scope={state:{matchId:'one',phase:'resolving',combat:{id:'battle'},players:[{id:'a',reserve:[{uid:'victim',owner:'a',type:'creature',subtype:'axiom'}],discard:[]}]},document:{querySelectorAll:()=>[]},deadVisuals:new Map(),damageRemnants:new Map(),visuallyDefeated:new Set(),tableCard:()=>node,visualCard:()=>{clones++;return node;},RunaCreatureDeath:{play:()=>sounds++},safeFlight:()=>{flights++;return Promise.resolve();},seat:()=>({id:'a'})};
 vm.createContext(scope);vm.runInContext(part(read('damage-presentation.js'),'function finishDamageVictim(','function applyDamageHit('),scope);
 scope.finishDamageVictim({uid:'victim',hp:0});scope.finishDamageVictim({uid:'victim',hp:-1});
 assert.equal(clones,1);assert.equal(sounds,1);assert.equal(flights,0);assert.equal(scope.deadVisuals.get('victim').copy,node);assert.ok(classes.has('visual-dead'));
});

test('mechanical families get death cues; humans and spells do not',()=>{
 const scope={};vm.createContext(scope);vm.runInContext(read('creature-death.js'),scope);
 const profile=scope.RunaCreatureDeath.profile;
 for(const subtype of ['Mecanoide','axiom','Axiom Sintético','Engrenauta','Rúnico','Sintético','grenautas','actions'])assert.ok(profile({type:'creature',subtype}),subtype);
 assert.equal(profile({type:'creature',subtype:'Humano',name:'Guerreiro'}),null);
 assert.equal(profile({type:'spell',name:'Rúnico'}),null);
 const machines=catalog.decks.flatMap(d=>d.cards).filter(c=>c.type==='creature'&&/axiom|engrenauta|rúnico|sintético|mecanoide/i.test([c.subtype,c.name].join(' ')));
 assert.ok(machines.length>10);for(const card of machines)assert.ok(profile(card),card.name);
});

test('Platinum manifestation follows the actual mechanic, not only the energy',()=>{
 const scope={};vm.createContext(scope);vm.runInContext(read('platinum-entry.js'),scope);
 const profile=scope.RunaPlatinumEntry.profile;
 for(const [id,expected]of [['FL11','protocol'],['FL12','artillery'],['FV15','seals'],['RG10','hunt']]){
  const card=catalog.decks.flatMap(d=>d.cards).find(c=>c.id===id);assert.equal(profile(card),expected);
 }
 assert.equal(profile({type:'patron',affinity:'forja'}),'forge');
});

test('three consecutive games reset decks, opening hands, clocks and powers',()=>{
 const room=makeRoom('REPLAY','A'),a=room.players[0],b=join(room,'B'),matches=new Set();let lastEvent=0;
 for(let i=0;i<3;i++){
  for(const [p,deck]of [[a,catalog.decks[0]],[b,catalog.decks[1]]])act(room,p,{type:'deck',deckId:deck.id},catalog);
  assert.equal(room.phase,'mulligan');assert.ok(!matches.has(room.matchId));matches.add(room.matchId);
  assert.equal(a.hand.length,5);assert.equal(b.hand.length,5);assert.equal(a.patron.hp,16);assert.equal(a.mulliganReady,false);assert.ok(room.eventId>lastEvent);
  for(const p of [a,b]){act(room,p,{type:'openingReady'},catalog);act(room,p,{type:'confirmMulligan'},catalog);}
  assert.equal(room.phase,'prep');assert.equal(room.turnClock.phase,'prep');
  room.phase='finished';room.winner=a.id;lastEvent=room.eventId;act(room,a,{type:'reset'},catalog);
  assert.equal(room.phase,'lobby');assert.equal(room.turnClock,null);assert.equal(a.deckId,null);assert.equal(b.deckId,null);assert.equal(a.patron,null);assert.equal(a.hand.length,0);assert.equal(room.combat,null);
 }
});
