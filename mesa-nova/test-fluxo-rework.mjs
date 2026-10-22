import './test-apprentice-mark.mjs';
import assert from 'node:assert/strict';import fs from 'node:fs';import {randomUUID} from 'node:crypto';import {act,join,makeRoom,resolveCombat,view} from './game.mjs';import {keywordPresentation} from './forja-variant.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('./cartas.json',import.meta.url))),deck=catalog.decks.find(d=>d.id==='fluxo-virelion'),models=[...deck.cards,...catalog.additionalCards];
const card=(id,p,extra={})=>({...structuredClone(models.find(c=>c.id===id)),uid:randomUUID(),modelId:id,owner:p.id,damage:0,attackMod:0,...extra});
const vanilla=(p,attack=2,health=20)=>card('FV01',p,{name:'Alvo de teste',attack,health,effects:[],baseStats:{attack,health,cost:2}});
function setup(){const room=makeRoom('FLUXO1','A'),a=room.players[0],b=join(room,'B');for(const p of [a,b])Object.assign(p,{deckData:deck,patron:{hp:100,maxHp:100},mana:10,manaMax:10,deck:Array.from({length:30},()=>vanilla(p))});Object.assign(room,{first:a.id,turn:a.id,phase:'prep',collectPreview:true});return {room,a,b};}
const place=(p,c,lane)=>{if(!p.reserve.includes(c))p.reserve.push(c);p.formation[lane]=c.uid;return c;};
const combat=room=>{room.phase='resolving';resolveCombat(room);};
{
 const {room,a}=setup(),ally=vanilla(a,2,3),banquet=card('FV05',a);assert.equal(banquet.cost,8);a.reserve.push(ally);a.discard.push(card('FV08',a),card('FV02',a));a.hand.push(banquet);a.mana=7;assert.throws(()=>act(room,a,{type:'play',cardId:banquet.uid},catalog));assert.equal(a.mana,7);assert.ok(a.hand.includes(banquet));assert.equal(ally.attack,2);a.mana=8;act(room,a,{type:'play',cardId:banquet.uid},catalog);assert.equal(a.mana,0);assert.equal(ally.attack,3);assert.equal(ally.health,4);
}
{
 assert.equal(deck.cards.reduce((n,c)=>n+c.quantity,0),30);assert.equal(deck.cards.filter(c=>c.type==='creature').reduce((n,c)=>n+c.quantity,0),13);
 assert.equal(deck.cards.some(c=>c.id==='FV10'),false);assert.equal(deck.cards.some(c=>c.id==='FV04'),false);assert.equal(models.find(c=>c.id==='FV10').name,'Vaelgor Dareth, O Diretor');assert.equal(models.find(c=>c.id==='FV10').effects[0].op,'adjacent_attack_buff');assert.equal(deck.cards.find(c=>c.id==='FV16').name,'Drenar Essência');
 assert.deepEqual(catalog,JSON.parse(fs.readFileSync(new URL('./criador/prototipo.json',import.meta.url))));
}
{
 const {room,a,b}=setup(),ally=vanilla(a,2,3),aura=card('FV04',a);a.reserve.push(ally,aura);a.emanation=[aura.uid];a.discard.push(card('FV02',a),card('FV08',a),vanilla(a),{type:'equipment'});b.discard.push(card('FV08',b));const banquet=card('FV05',a);a.hand.push(banquet);act(room,a,{type:'play',cardId:banquet.uid},catalog);assert.equal(ally.attack,3);assert.equal(ally.health,4);assert.equal(aura.attack,1);assert.equal(aura.health,1,'Emanação não recebe o bônus do Banquete');
 assert.equal(a.discard.at(-1),banquet,'Banquete does not count itself');
}
{
 const {room,a,b}=setup(),witch=place(a,card('FV06',a),0),enemy=place(b,vanilla(b,3,20),0);combat(room);assert.equal(witch.damage,3);assert.equal(enemy.attack,2);assert.equal(enemy.corruption,true);assert.ok(keywordPresentation(enemy).highlightKeywords.includes('Corrupção'));
 a.reserve=a.reserve.filter(c=>c!==witch);a.discard.push(witch);a.formation=[null,null,null];b.formation[1]=enemy.uid;combat(room);assert.equal(enemy.attack,1,'Corruption persists after the witch is gone, even against a Patron');
 b.formation[1]=enemy.uid;combat(room);assert.equal(enemy.attack,0);b.formation[1]=enemy.uid;combat(room);assert.equal(enemy.attack,0);
}
{
 const {room,a,b}=setup(),witch=place(a,card('FV06',a,{health:30}),0),enemy=place(b,vanilla(b,2),0);combat(room);const second=place(b,vanilla(b,3),0);a.formation[0]=witch.uid;combat(room);assert.equal(second.corruption,undefined,'Only the first attacker is cursed');assert.equal(second.attack,3);
 room.phase='prep';room.turn=b.id;const magic=card('FV16',b,{type:'direct_spell',positionOnly:false,effects:[{op:'damage',amount:1,target:'any'}]});b.hand.push(magic);act(room,b,{type:'play',cardId:magic.uid,targetId:witch.uid},catalog);assert.equal(second.corruption,undefined,'Spell damage never applies corruption');
}
{
 const {room,a,b}=setup(),target=place(a,vanilla(a,0,30),0),enemy=place(b,vanilla(b,3,30),0);a.prepared.push({card:card('FV11',a),lane:0,targetSide:a.id});b.prepared.push({card:card('FV16',b,{effects:[{op:'damage',amount:4}]}),lane:0,targetSide:a.id});combat(room);assert.equal(target.damage,6,'Four spell damage plus ceil(3/2) attack damage');assert.equal(a.prepared[0].remaining,1);a.formation[0]=target.uid;b.formation[0]=enemy.uid;combat(room);assert.equal(target.damage,8);assert.equal(a.prepared.length,0);assert.equal(target.attackBarrier,undefined);
}
{
 const {room,a,b}=setup();place(a,vanilla(a,0),0);const neighbor=place(a,vanilla(a,0),1);place(b,vanilla(b,4,30),0).effects=[{op:'adjacent_damage',amount:3}];a.prepared.push({card:card('FV11',a),lane:1,targetSide:a.id});combat(room);assert.equal(neighbor.damage,3,'Kinetic splash is not an incoming creature attack');
}
{
 const {room,a}=setup(),aura=card('FV04',a),target=place(a,vanilla(a,0,8),2),other=place(a,vanilla(a,0,8),0);target.damage=3;a.reserve.push(aura);a.emanation=[aura.uid];act(room,a,{type:'pressureLane',cardId:aura.uid,lane:2},catalog);combat(room);assert.equal(room.preClash[2].cards[0].health,6);assert.equal(room.preClash[0].cards[0].health,8);assert.equal(target.damage,3);assert.equal(other.health,8);
}
{
 const {room,a,b}=setup(),eye=place(a,card('FV07',a,{health:20}),1),enemy=place(b,vanilla(b,3,20),1);combat(room);assert.equal(eye.damage,0);assert.equal(enemy.damage,0);assert.equal(a.formation[1],eye.uid);assert.equal(b.formation[1],enemy.uid);room.phase='formation';assert.throws(()=>act(room,b,{type:'assign',cardId:enemy.uid,lane:0},catalog),/ancorada/);combat(room);assert.equal(eye.damage,3);assert.equal(enemy.damage,2);assert.equal(eye.anchor,undefined);assert.equal(enemy.anchor,undefined);assert.equal(room.revelationsApplied.some(x=>x.op==='duel_stasis'),false);
}
{
 const {room,a,b}=setup(),ithalion=place(a,card('FV15',a,{attack:0,health:30}),2),ally=place(a,vanilla(a,0),0),giant=place(b,vanilla(b,6),1);room.phase='formation';assert.throws(()=>act(room,a,{type:'ready'},catalog),/selos/);act(room,a,{type:'sealLanes',cardId:ithalion.uid,allyLane:0,enemyLane:1},catalog);assert.equal(view(room,b).players[0].reserve.find(c=>c.uid===ithalion.uid).sealChoices,undefined,'Unrevealed choices stay private');combat(room);assert.equal(room.seals.length,1);assert.equal(b.patron.hp,94,'Giant attacks its original Patron after arriving on the other side');assert.equal(room.teleports[0].movements.length,2);assert.equal(giant.owner,b.id);assert.ok(b.reserve.includes(giant));assert.ok(a.reserve.includes(ally),'Ownership returns after combat');
 a.formation=[ally.uid,null,null];b.formation=[null,giant.uid,null];combat(room);assert.equal(b.patron.hp,88,'Seals persist even while Ithalion stays in reserve');assert.equal(room.seals.length,1);
 ithalion.damage=ithalion.health;a.formation=[null,null,ithalion.uid];b.formation=[null,giant.uid,null];combat(room);assert.equal(room.seals.length,0);assert.equal(room.teleports.length,0,'No teleport when the source dies before Revelation');
}
{
 const {room,a,b}=setup(),ithalion=place(a,card('FV15',a,{attack:0,health:30,sealChoices:{allyLane:0,enemyLane:0}}),2),ally=place(a,vanilla(a,9,20),0),victim=place(b,vanilla(b,0,1),0);place(b,vanilla(b,5,20),1);combat(room);assert.ok(b.discard.includes(victim),'A teleported casualty goes to its original owner');assert.ok(a.reserve.includes(ally));assert.equal(room.players.flatMap(p=>[...p.reserve,...p.discard]).filter(c=>c.uid===victim.uid).length,1);
}
console.log('Fluxo reformulado: estoque, 30 cartas, Aprendiz em Emanação com escolha por gatilho, Banquete, Corrupção, Barreira, Auramora, Olho e selos persistentes/trocas/retorno aprovados.');
{
 const {room,a,b}=setup(),source=place(a,card('FV15',a,{attack:0,health:30,sealChoices:{allyLane:0,enemyLane:1}}),2),ally=place(a,vanilla(a,0,8),0),enemy=place(b,vanilla(b,0,8),1),aura=card('FV04',a,{auraLane:0});a.reserve.push(aura);a.emanation=[aura.uid];combat(room);assert.equal(room.preClash[0].cards[0].uid,enemy.uid);assert.equal(room.preClash[0].cards[0].health,9,'The arriving enemy receives the positional health aura');assert.equal(room.preClash[1].cards[1].uid,ally.uid);assert.equal(room.preClash[1].cards[1].health,8,'The departing ally loses the positional aura');assert.equal(enemy.health,8);
}

// Metade conta apenas as magias anteriores do dono, incluindo fichas já usadas.
for(const count of [0,1,2,3,5,6]){
 const {room,a,b}=setup(),ally=vanilla(a,2,3),banquet=card('FV05',a);
 a.reserve.push(ally);a.discard.push(...Array.from({length:count},()=>card('FV08',a)),vanilla(a),{type:'equipment'});b.discard.push(card('FV08',b));
 if(count===5)a.discard[0]={type:'spell',modelId:'FV03-token',uid:randomUUID()};
 a.hand.push(banquet);act(room,a,{type:'play',cardId:banquet.uid},catalog);
 assert.equal(ally.attack,2+Math.floor(count/2));assert.equal(ally.health,3+Math.floor(count/2));assert.equal(a.mana,2);
}
