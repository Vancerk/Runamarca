import assert from 'node:assert/strict';
import fs from 'node:fs';
import {act,join,makeRoom,resolveCombat,view} from './game.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('./cartas.json',import.meta.url))),deck=catalog.decks.find(d=>d.id==='forja-oficina-lyrik');
const card=(id,p,extra={})=>({...structuredClone(deck.cards.find(c=>c.id===id)),uid:crypto.randomUUID(),modelId:id,owner:p.id,damage:0,attackMod:0,...extra});
const setup=()=>{const room=makeRoom('PROTO','A'),a=room.players[0],b=join(room,'B');for(const p of [a,b])Object.assign(p,{patron:{hp:100,maxHp:100},mana:10,manaMax:10,deckData:deck,deck:[],taunts:{}});Object.assign(room,{first:a.id,turn:a.id,phase:'formation',collectPreview:true});return {room,a,b};};
const place=(p,c,l)=>{p.reserve.push(c);p.formation[l]=c.uid;return c;};
assert.equal(deck.cards.reduce((n,c)=>n+c.quantity,0),30);assert.equal(deck.cards.find(c=>c.id==='FL14').cost,5);
assert.ok(!deck.cards.some(c=>c.effects.some(e=>['heal','heal_patron'].includes(e.op))));
assert.ok(fs.existsSync(new URL(deck.patron.image,import.meta.url)));
{
 const {room,a,b}=setup(),v=place(a,card('FL11',a),1),left=place(a,card('FL02',a),0),right=place(a,card('FL02',a),2);
 assert.throws(()=>act(room,a,{type:'ready'},catalog),/protocolo/);
 act(room,a,{type:'protocol',cardId:v.uid,mode:'assault'},catalog);
 assert.throws(()=>act(room,b,{type:'protocol',cardId:v.uid,mode:'escort'},catalog),/válido/);
 room.phase='resolving';resolveCombat(room);
 assert.deepEqual(room.preClash.map(x=>x.cards[0].attack),[1,6,1]);assert.equal(v.attack,4);assert.equal(v.attackMod,0);assert.equal(left.attack,0);assert.equal(right.attack,0);assert.equal(v.protocolMode,undefined);
}
{
 const {room,a,b}=setup(),v=place(a,card('FL11',a,{damage:2}),1),left=place(a,card('FL02',a,{damage:1}),0);
 act(room,a,{type:'protocol',cardId:v.uid,mode:'escort'},catalog);place(b,card('FL03',b,{attack:1}),1);
 room.phase='resolving';resolveCombat(room);
 assert.equal(room.preClash[1].cards[0].health,5);assert.equal(room.preClash[0].cards[0].health,4);
 assert.equal(v.health,5);assert.equal(v.damage,2,'Escolta absorve dano novo, sem curar dano anterior');assert.equal(left.health,4);assert.equal(left.damage,1);
}
{
 const {room,a,b}=setup(),g=place(a,card('FL09',a),1);act(room,a,{type:'taunt',cardId:g.uid,lanes:[0,2]},catalog);
 assert.deepEqual(view(room,a).players[0].taunts[g.uid],[0,2]);assert.equal(view(room,b).players[0].taunts[g.uid],undefined);
 for(let l=0;l<3;l++)place(b,card('FL03',b,{attack:2}),l);
 room.phase='resolving';resolveCombat(room);assert.equal(g.damage,6);assert.equal(a.patron.hp,100);assert.equal(room.directedSteps.flatMap(s=>s.pair?[s,s.pair]:[s]).filter(s=>s.sourceId===g.uid).length,1);
}
{
 const {room,a,b}=setup(),g=place(a,card('FL09',a),0),j=place(a,card('FL16',a),2);
 assert.throws(()=>act(room,a,{type:'taunt',cardId:g.uid,lanes:[1,2]},catalog),/adjacente/);
 assert.throws(()=>act(room,a,{type:'taunt',cardId:j.uid,lanes:[0,1]},catalog),/adjacente/);
}
{
 const {room,a,b}=setup();room.phase='prep';const target=card('FL09',b,{damage:5,health:12,attack:7,baseStats:{attack:5,health:10,cost:8}});b.reserve.push(target);const spell=card('FL19',a);a.hand.push(spell);act(room,a,{type:'play',cardId:spell.uid,targetId:target.uid},catalog);
 assert.equal(target.health,1);assert.equal(target.damage,0);assert.equal(target.attack,7);assert.equal(target.baseStats.health,10);assert.equal(a.mana,6);assert.equal(room.events.find(e=>e.type==='spell').healthUpdates[0].hp,1);
}
for(const occupied of [false,true]){
 const {room,a,b}=setup();room.phase='prep';const attacker=place(b,card('FL03',b,{attack:4,health:5}),0);if(occupied)place(a,card('FL02',a,{attack:0,health:8}),0);const spell=card('FL20',a);a.hand.push(spell);
 assert.throws(()=>act(room,a,{type:'play',cardId:spell.uid,mode:'direct',targetId:attacker.uid},catalog),/posição/);
 act(room,a,{type:'play',cardId:spell.uid,mode:'lane',lane:0,targetSide:b.id},catalog);room.phase='resolving';resolveCombat(room);
 assert.equal(a.prepared.length,0);assert.ok(a.discard.some(c=>c.uid===spell.uid));assert.equal(a.patron.hp,occupied?100:97);
 assert.equal(room.spawnedMirages.length,occupied?0:1);assert.equal(attacker.temporaryTrample,undefined);
 if(!occupied){const token=room.spawnedMirages[0].card;assert.equal(token.attack,0);assert.equal(token.health,1);assert.ok(a.discard.some(c=>c.uid===token.uid));assert.equal(room.directedSteps.flatMap(s=>s.pair?[s,s.pair]:[s]).find(s=>s.sourceId===attacker.uid).targetId,token.uid);}
}
{
 const {room,a,b}=setup();const attacker=place(b,card('FL03',b,{attack:4,health:5}),0),spell=card('FL20',a);a.prepared=[{card:spell,targetSide:b.id,lane:0}];
 const originalTimer=globalThis.setTimeout;let finish;
 try{globalThis.setTimeout=fn=>{finish=fn;return 0;};act(room,a,{type:'ready'},catalog);act(room,b,{type:'ready'},catalog);}finally{globalThis.setTimeout=originalTimer;}
 assert.equal(room.phase,'resolving');const spawned=room.combat.spawnedMirages[0];assert.equal(spawned.owner,a.id);assert.equal(spawned.lane,0);assert.equal(spawned.spellId,spell.uid);
 const strikes=room.combat.timeline.filter(s=>s.kind==='strike').flatMap(s=>s.strike.pair?[s.strike,s.strike.pair]:[s.strike]);assert.equal(strikes.find(s=>s.sourceId===attacker.uid).targetId,spawned.card.uid);
 finish();assert.ok(a.discard.some(c=>c.uid===spawned.card.uid),'Prévia e resolução usam a mesma identidade da ficha');
}
{
 const {room,a,b}=setup();place(b,card('FL03',b,{attack:4,health:5}),0);for(let i=0;i<8;i++)a.reserve.push(card('FL02',a));a.prepared=[{card:card('FL20',a),targetSide:b.id,lane:0}];room.phase='resolving';resolveCombat(room);assert.equal(room.spawnedMirages.length,0);assert.equal(a.prepared.length,0);assert.equal(a.patron.hp,96);
}
console.log('Forja: protocolos temporários sem cura, Golias em três casas, Estaca permanente e Miragem com colisão/Transpassar aprovados.');
