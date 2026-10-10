import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeRoom,join,act,resolveCombat,view,easyBotAction} from './game.mjs';
import {weaponOptions,weaponRecipe,absorbPatronDamage} from './equipment.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('./cartas.json',import.meta.url))),deck=catalog.decks.find(d=>d.affinity==='forja');
const creature=(p,props={})=>({uid:crypto.randomUUID(),owner:p.id,modelId:'test',name:'Teste',type:'creature',cost:0,attack:2,health:10,damage:0,attackMod:0,effects:[],text:'',baseStats:{attack:2,health:10,cost:0},...props});
function setup(){const room=makeRoom('FORGE','A'),a=room.players[0],b=join(room,'B');Object.assign(room,{phase:'prep',round:4,turn:a.id,first:a.id,preparationsDone:0,collectPreview:true});for(const p of [a,b])Object.assign(p,{deckData:deck,patron:{name:'Lyrik',hp:20,maxHp:20,affinity:'forja',powers:structuredClone(deck.patron.powers),usedPowers:{}},deck:Array.from({length:20},()=>({uid:crypto.randomUUID(),type:'creature',name:'Compra',cost:10,attack:0,health:1})),mana:10,manaMax:10,weapons:[]});return {room,a,b};}
function weapon(p,cost=5,chassis='resistente',blade='precisa'){const w={...weaponRecipe(cost,chassis,blade),uid:crypto.randomUUID(),owner:p.id};p.weapons.push(w);return w;}
function equip(room,p,c,w){p.reserve.push(c);act(room,p,{type:'equip',cardId:w.uid,targetId:c.uid},catalog);}
{
 const ids=new Set();for(const cost of [1,5,10])for(const chassis of weaponOptions('durability',cost))for(const blade of weaponOptions('attack',cost)){const r=weaponRecipe(cost,chassis.id,blade.id);ids.add(r.id);assert.equal(r.image,'weapons/weapon-'+cost+'.png');assert.ok(fs.existsSync(new URL(r.image,import.meta.url)));assert.ok(!/^Equipamento — \+\d+ de ataque\./.test(r.text)&&!/\d+ de durabilidade\./.test(r.text));assert.ok(r.durability>=1);assert.ok(r.attack>=0);}assert.equal(ids.size,27);assert.throws(()=>weaponRecipe(2,'resistente','precisa'));
}
{
 const {room,a,b}=setup();for(const invalid of [0,2,'abc'])assert.throws(()=>act(room,a,{type:'patronPower',powerId:'forjar-arma',weaponCost:invalid},catalog));assert.equal(a.mana,10);assert.equal(a.forge,undefined);
 act(room,a,{type:'patronPower',powerId:'forjar-arma',weaponCost:5},catalog);assert.equal(a.mana,6);assert.equal(a.forge.dueRound,5);assert.throws(()=>act(room,a,{type:'patronPower',powerId:'forjar-arma',weaponCost:1},catalog),/utilizado/);
 act(room,a,{type:'endPrep'},catalog);act(room,b,{type:'endPrep'},catalog);act(room,a,{type:'vote',fight:false},catalog);act(room,b,{type:'vote',fight:false},catalog);assert.equal(room.round,5);assert.equal(room.first,b.id);act(room,b,{type:'endPrep'},catalog);
 assert.equal(room.phase,'forging');assert.equal(room.turn,a.id);const handBefore=a.hand.length;assert.equal(a.mana,6,'no refill before mandatory choice');assert.throws(()=>act(room,a,{type:'endPrep'},catalog),/forja/);assert.throws(()=>act(room,b,{type:'forgeChoice',optionId:'resistente'},catalog),/forja/);assert.throws(()=>act(room,a,{type:'forgeChoice',optionId:'precisa'},catalog),/válida/);
 act(room,a,{type:'forgeChoice',optionId:'perfurante'},catalog);assert.equal(room.phase,'prep');assert.equal(a.hand.length,handBefore+1);assert.equal(a.forge.dueRound,6);assert.equal(view(room,b).players.find(p=>p.id===a.id).forge.chassis,undefined,'opponent does not see private recipe');
 act(room,a,{type:'endPrep'},catalog);act(room,a,{type:'vote',fight:false},catalog);act(room,b,{type:'vote',fight:false},catalog);assert.equal(room.phase,'forging');assert.equal(room.turn,a.id);act(room,a,{type:'forgeChoice',optionId:'brutal'},catalog);assert.equal(room.phase,'prep');assert.equal(a.forge,undefined);
 const w=a.hand.find(c=>c.type==='equipment');assert.equal(w.cost,5);assert.equal(w.attack,4);assert.equal(w.durability,3);assert.equal(view(room,b).players.find(p=>p.id===a.id).hand,undefined);
 act(room,a,{type:'play',cardId:w.uid},catalog);assert.equal(a.mana,5);assert.equal(a.weapons[0],w);assert.equal(a.directPlayed,false,'equipment is not a spell');const c=creature(a);a.reserve.push(c);act(room,a,{type:'equip',cardId:w.uid,targetId:c.uid},catalog);assert.equal(a.mana,4);assert.equal(view(room,a).players[0].reserve[0].effectiveAttack,6);assert.equal(a.weapons.length,0);assert.ok(view(room,a).players[0].reserve[0].text.includes('Transpassar'),'equipment keyword is inserted in creature text');assert.deepEqual(view(room,a).players[0].reserve[0].highlightKeywords,['Transpassar']);
}
{
 const {room,a,b}=setup();const c=creature(a),w=weapon(a,1);equip(room,a,c,w);assert.throws(()=>act(room,a,{type:'equip',cardId:w.uid,targetId:c.uid},catalog));a.formation[0]=c.uid;b.patron.extraLife=3;room.phase='resolving';resolveCombat(room);assert.equal(b.patron.hp,20);assert.equal(b.patron.extraLife,0);assert.equal(w.durability,2);assert.equal(room.directedSteps[0].equipmentUpdates[0].durability,2);
 a.formation[0]=c.uid;room.phase='resolving';resolveCombat(room);assert.equal(w.durability,1);a.formation[0]=c.uid;room.phase='resolving';resolveCombat(room);assert.equal(c.equipment,undefined);assert.equal(a.discard.filter(x=>x.uid===w.uid).length,1);assert.equal(c.attack,2);assert.equal(view(room,a).players[0].reserve[0].effectiveAttack,2);
}
{
 const {room,a,b}=setup();const c=creature(a,{health:1}),w=weapon(a,5);equip(room,a,c,w);const enemy=creature(b,{attack:3,health:20});b.reserve.push(enemy);a.formation[0]=c.uid;b.formation[0]=enemy.uid;room.phase='resolving';resolveCombat(room);assert.equal(a.weapons[0],w);assert.equal(w.durability,4);assert.ok(a.discard.includes(c));assert.equal(enemy.damage,5,'simultaneous attack uses weapon before death');
 room.phase='prep';room.turn=a.id;a.mana=1;const next=creature(a);a.reserve.push(next);act(room,a,{type:'equip',cardId:w.uid,targetId:next.uid},catalog);assert.equal(a.mana,0);assert.equal(next.equipment.durability,4);
}
{
 const {room,a,b}=setup();const c=creature(a,{health:1}),w=weapon(a,1);equip(room,a,c,w);const enemy=creature(b,{attack:3,health:20,effects:[{op:'initiative'}]});b.reserve.push(enemy);a.formation[0]=c.uid;b.formation[0]=enemy.uid;room.phase='resolving';resolveCombat(room);assert.equal(w.durability,3,'killed before attacking: no wear');assert.equal(enemy.damage,0);
}
{
 const {room,a,b}=setup();const c=creature(a),w=weapon(a,1,'veloz','precisa');equip(room,a,c,w);const enemy=creature(b,{attack:30,health:1});b.reserve.push(enemy);a.formation[0]=c.uid;b.formation[0]=enemy.uid;room.phase='resolving';resolveCombat(room);assert.equal(c.damage,0);assert.equal(w.durability,0);assert.ok(a.discard.includes(w));
}
{
 const {room,a,b}=setup();const c=creature(a),w=weapon(a,5,'perfurante');equip(room,a,c,w);const enemy=creature(b,{attack:0,health:2});b.reserve.push(enemy);a.formation[1]=c.uid;b.formation[1]=enemy.uid;room.phase='resolving';resolveCombat(room);assert.equal(b.patron.hp,17,'trample overflow is 5-2');
}
{
 const {room,a,b}=setup();const c=creature(a),w=weapon(a);equip(room,a,c,w);room.turn=b.id;const spell={uid:'bounce',id:'bounce',type:'spell',cost:0,effects:[{op:'return_to_hand',target:'chosen_enemy_creature'}]};b.hand=[spell];act(room,b,{type:'play',cardId:spell.uid,targetId:c.uid},catalog);assert.equal(a.weapons[0],w);assert.equal(a.hand.find(x=>x.modelId==='test').equipment,undefined);
}
{
 const {room,a,b}=setup();act(room,a,{type:'patronPower',powerId:'forjar-armadura'},catalog);assert.equal(a.mana,9);assert.equal(a.patron.extraLife,1);assert.equal(a.patron.hp,20);assert.equal(a.patron.maxHp,20);assert.equal(a.reserve.length,0);assert.throws(()=>act(room,a,{type:'patronPower',powerId:'forjar-armadura'},catalog),/utilizado/);room.round++;act(room,a,{type:'patronPower',powerId:'forjar-armadura'},catalog);assert.equal(a.patron.extraLife,2);
 room.turn=b.id;const spell={uid:'damage',id:'damage',type:'spell',cost:0,effects:[{op:'damage',amount:3,target:'any'}]};b.hand=[spell];act(room,b,{type:'play',cardId:spell.uid,targetId:'patron:'+a.id},catalog);assert.equal(a.patron.extraLife,0);assert.equal(a.patron.hp,19);assert.equal(view(room,b).events.at(-1).healthUpdates[0].extraLife,0);
}
{
 const {room,a,b}=setup();a.patron.extraLife=3;b.deck=[];b.patron.extraLife=1;act(room,a,{type:'endPrep'},catalog);assert.equal(b.patron.extraLife,0);assert.equal(b.patron.hp,20,'fatigue first consumes armor');assert.equal(b.fatigue,1);
}
{
 const {room,a,b}=setup();const c=creature(a),w=weapon(a,1,'resistente','brutal');equip(room,a,c,w);a.formation[0]=c.uid;room.phase='resolving';resolveCombat(room);assert.equal(w.durability,2);assert.equal(c.damage,1);a.formation[0]=c.uid;room.phase='resolving';resolveCombat(room);assert.equal(w.durability,1);assert.equal(c.damage,2);
}
{const {room,a}=setup(),c=creature(a,{damage:1}),w=weapon(a,1,'resistente','dentada');equip(room,a,c,w);assert.equal(view(room,a).players[0].reserve[0].effectiveAttack,4);}
console.log('Forja: 27 receitas; três turnos com escolhas obrigatórias/sigilo; custos, desgaste, quebra, morte, retorno à mão, Iniciativa, Transpassar e Vida Extra apenas no Patrono aprovados.');
