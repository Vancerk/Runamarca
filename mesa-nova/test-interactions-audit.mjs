import assert from 'node:assert/strict';
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import {act,makeRoom,join,resolveCombat,view} from './game.mjs';
import {syncTribalHealth,tribalBonus} from './ruptura-effects.mjs';
import {receiveDamage} from './forja-variant.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('./cartas.json',import.meta.url)));
const models=catalog.decks.flatMap(d=>d.cards);
const c=(id,p,extra={})=>({...structuredClone(models.find(c=>c.id===id)),uid:randomUUID(),modelId:id,owner:p.id,attackMod:0,damage:0,baseStats:{...models.find(c=>c.id===id)},...extra});
function setup(){const room=makeRoom('AUDIT','A'),a=room.players[0],b=join(room,'B');for(const p of [a,b])Object.assign(p,{patron:{hp:100,maxHp:100},mana:10,manaMax:10,deck:Array.from({length:20},()=>({uid:randomUUID()}))});Object.assign(room,{first:a.id,turn:a.id,phase:'prep',collectPreview:true});return {room,a,b};}
function combat(room,a,b,aa,bb=[]){a.formation=[...aa.map(c=>c.uid),null,null,null].slice(0,3);b.formation=[...bb.map(c=>c.uid),null,null,null].slice(0,3);room.phase='resolving';resolveCombat(room);}
function cast(room,p,id,targetId){const spell=c(id,p);p.hand=[spell];room.phase='prep';room.turn=p.id;act(room,p,{type:'play',cardId:spell.uid,targetId},catalog);}
// Revelação elimina um defensor de 1 de vida antes da troca de ataques.
for(const id of ['FL16','FL17']){const {room,a,b}=setup(),inc=c('RG02',a),def=c(id,b);a.reserve=[inc];b.reserve=[def];combat(room,a,b,[inc],[def]);assert.ok(b.discard.includes(def));assert.ok(a.reserve.includes(inc));assert.equal(b.patron.hp,99);}
// Sintético com 2 de vida sobrevive à Revelação; o ataque seguinte completa 2 de dano.
{const {room,a,b}=setup(),inc=c('RG02',a),syn=c('FL04',b);a.reserve=[inc];b.reserve=[syn];combat(room,a,b,[inc],[syn]);assert.ok(b.discard.includes(syn),'Revelação + ataque somam 2, eliminando o Sintético sem apoio');assert.equal(b.patron.hp,100,'não fica livre antes do ataque');}
// Aura torna a Incursora 2/2 e permite vencer o Taverneiro 1/2.
{const {room,a,b}=setup(),inc=c('RG02',a),track=c('RG05',a),def=c('FL03',b);a.reserve=[inc,track];b.reserve=[def];syncTribalHealth(room);combat(room,a,b,[inc],[def]);assert.ok(b.discard.includes(def));assert.ok(a.reserve.includes(inc));assert.equal(inc.health,2);assert.equal(inc.damage,1);assert.equal(b.patron.hp,100);}
// Duas fontes acumulam uma vez cada; remover ambas remove bônus e vítimas dependentes.
{const {room,a,b}=setup(),tracks=[c('RG05',a),c('RG05',a)],token=c('RG02',a);a.reserve=[...tracks,token];for(let i=0;i<3;i++)syncTribalHealth(room);assert.equal(token.health,3);assert.equal(tribalBonus(a,token),2);assert.ok(tracks.every(c=>c.health===5));token.damage=2;tracks.forEach(c=>c.damage=5);combat(room,a,b,[]);assert.equal(a.reserve.length,0);assert.equal(a.discard.length,3);}
// Geômetro não é Tribal, e não herda indevidamente a aura.
{const {room,a}=setup(),geo=c('RG01',a),track=c('RG05',a);a.reserve=[geo,track];syncTribalHealth(room);assert.equal(geo.health,1);assert.equal(tribalBonus(a,geo),0);}
// Gnoll recebe um único +1, independentemente de haver dois aliados pequenos.
{const {room,a,b}=setup(),units=[c('RG08',a),c('RG01',a),c('RG01',a)];a.reserve=units;combat(room,a,b,units);assert.equal(room.preClash[0].cards[0].attack,3);assert.equal(units[0].attackMod,0);combat(room,a,b,units);assert.equal(room.preClash[0].cards[0].attack,3);}
// Cólera não vira crescimento permanente e aliados já fortalecidos não habilitam Gnoll.
{const {room,a,b}=setup(),units=[c('RG08',a),c('RG01',a),c('RG01',a)];a.reserve=units;cast(room,a,'RG09');combat(room,a,b,units);assert.equal(room.preClash[0].cards[0].attack,4);assert.equal(b.patron.hp,90);combat(room,a,b,units);assert.equal(room.preClash[0].cards[0].attack,3);}
// Chamado sempre produz duas fichas; duas Rastreadoras fazem fichas 3/3.
{const {room,a}=setup(),tracks=[c('RG05',a),c('RG05',a)];a.reserve=tracks;cast(room,a,'RG06');const tokens=a.reserve.filter(c=>c.token);assert.equal(tokens.length,2);assert.ok(tokens.every(c=>c.attack===1&&c.health===3&&tribalBonus(a,c)===2));}
// Bruxo: 6 ataques pequenos em dois combates geram 1 dano e deixam 2 acúmulos.
{const {room,a,b}=setup(),brux=c('RG13',a),units=[c('RG01',a),c('RG02',a),c('RG11',a)];a.reserve=[brux,...units];a.emanation=[brux.uid];combat(room,a,b,units);assert.equal(b.patron.retaliation,3);assert.equal(b.patron.hp,98);combat(room,a,b,units);assert.equal(b.patron.retaliation,2);assert.equal(b.patron.hp,95);}
// Engrenauta + Bomba usa ataque atual; Inversor não reativa primeiro dano.
{const {room,a,b}=setup(),eng=c('FEX03',a,{attack:1}),target=c('RG12',b);a.reserve=[eng];b.reserve=[target];Object.assign(eng,receiveDamage(eng,1));cast(room,a,'FEX04',eng.uid);assert.equal(eng.attack,7);assert.equal(eng.health,1);assert.equal(eng.firstDamageTaken,true);a.mana=10;room.phase='prep';room.turn=a.id;const bomba=c('FL15',a);a.hand=[bomba];act(room,a,{type:'play',cardId:bomba.uid,sourceId:eng.uid,targetId:target.uid},catalog);assert.equal(target.damage,7);assert.ok(b.discard.includes(target));a.deckData=catalog.decks.find(d=>d.id==='forja-oficina-experimental');cast(room,b,'FV13',eng.uid);assert.equal(eng.firstDamageTaken,undefined);assert.equal(eng.attack,0);assert.equal(eng.health,9);assert.equal(receiveDamage(eng,1).damage,2,'retorno reinicia efeito nativo');}

console.log('Auditoria de interações: Incursora, Rastreadoras, Gnoll, Cólera, Chamado, Geômetro, Bruxo e Engrenauta/Inversor/Bomba/retorno aprovados.');

