import assert from 'node:assert/strict';import fs from 'node:fs';import {randomUUID} from 'node:crypto';import {act,join,makeRoom,resolveCombat} from './game.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('./cartas.json',import.meta.url))),models=[...catalog.decks.flatMap(d=>d.cards),...catalog.additionalCards];
const card=(id,p,extra={})=>({...structuredClone(models.find(c=>c.id===id)),uid:randomUUID(),modelId:id,owner:p.id,damage:0,attackMod:0,...extra});
function setup(){const room=makeRoom('RUNIC','A'),a=room.players[0],b=join(room,'B');for(const p of [a,b])Object.assign(p,{patron:{hp:100,maxHp:100},mana:10,manaMax:10,deck:Array.from({length:20},()=>card('FL16',p)),deckData:catalog.decks[0]});Object.assign(room,{phase:'prep',turn:a.id,first:a.id,collectPreview:true});return {room,a,b};}
const cast=(room,p,id,targetId)=>{const c=card(id,p);p.hand.push(c);act(room,p,{type:'play',cardId:c.uid,mode:'direct',targetId},catalog);};
const place=(p,c,l)=>{p.reserve.push(c);p.formation[l]=c.uid;return c;};
assert.deepEqual(catalog,JSON.parse(fs.readFileSync(new URL('./criador/prototipo.json',import.meta.url))));for(const d of catalog.decks.filter(d=>d.affinity==='forja')){assert.equal(d.cards.some(c=>c.id==='FL03'),false);assert.ok(d.cards.some(c=>c.id==='FL21'));assert.equal(d.cards.reduce((n,c)=>n+c.quantity,0),30);}
{
 const {room,a}=setup(),r=card('FL21',a);a.hand.push(r);act(room,a,{type:'play',cardId:r.uid},catalog);assert.equal(a.hand.length,1);assert.equal(a.mana,8);cast(room,a,'FL10',r.uid);assert.equal(r.attack,3);assert.equal(r.health,3);r.health=5;cast(room,a,'FEX04',r.uid);assert.equal(r.attack,5);assert.equal(r.health,3,'Inversion swaps values without granting bonuses');
}
{
 const {room,a,b}=setup(),r=place(a,card('FL21',a),0),v=place(a,card('FL11',a,{protocolMode:'escort'}),1),eng=card('FL17',a);a.reserve.push(eng);a.emanation=[eng.uid];room.phase='resolving';resolveCombat(room);assert.equal(room.preClash[0].cards[0].health,5,'1 base +2 aura +2 escort');assert.equal(r.health,1,'Temporary bonuses expire without accumulating');assert.equal(v.health,5);a.formation[0]=r.uid;a.formation[1]=v.uid;v.protocolMode='assault';room.phase='resolving';resolveCombat(room);assert.equal(room.preClash[0].cards[0].attack,3,'Adjacent +1 becomes +2');
}
{
 const {room,a,b}=setup(),r=place(b,card('FL21',b,{attack:3,health:3}),0);a.prepared.push({card:card('FL13',a),lane:0,targetSide:b.id});room.phase='resolving';resolveCombat(room);assert.equal(r.attack,2);assert.equal(r.health,2,'Negative changes are not doubled');
}
{
 const {room,a,b}=setup(),r=card('FL21',b);b.reserve.push(r);cast(room,a,'FL14');assert.ok(b.discard.includes(r),'Direct Geada kills a one-health creature');assert.equal(r.damage,0,'Lost health is not damage');
}
{
 const {room,a,b}=setup(),x=place(b,card('FL21',b),0),y=place(b,card('FL21',b),1);a.prepared.push({card:card('FL14',a),lane:0,targetSide:b.id});room.phase='resolving';resolveCombat(room);assert.ok(b.discard.includes(x));assert.ok(b.discard.includes(y),'Prepared Geada affects every enemy combat lane');assert.equal(b.reserve.length,0);
}
{
 const {room,a,b}=setup(),enemy=place(b,card('FL05',b,{effects:[]}),0),spell=card('FL20',a);a.hand.push(spell);act(room,a,{type:'play',cardId:spell.uid,mode:'lane',lane:0,targetSide:b.id},catalog);assert.equal(a.mana,9);room.phase='resolving';resolveCombat(room);assert.equal(a.patron.hp,100,'Miragem bloqueia o ataque sem Transpassar');assert.ok(a.discard.some(c=>c.modelId==='mirage-token'),'Miragem 0/1 é eliminada no bloqueio');
}
{
 const {room,a,b}=setup(),r=place(b,card('FEX03',b,{health:9,extraLife:2}),0);a.prepared.push({card:card('FL13',a),lane:0,targetSide:b.id});room.phase='resolving';resolveCombat(room);assert.equal(r.health,8);assert.equal(r.extraLife,2,'Redução de vida não consome Vida Extra');assert.equal(r.firstDamageTaken,undefined,'Redução não gasta o primeiro dano dobrado');
}
{
 const {room,a,b}=setup(),r=place(a,card('FL21',a),0),inc=place(b,card('RG02',b),0);room.phase='resolving';resolveCombat(room);assert.ok(a.discard.includes(r),'Rúnico sem bônus morre na Revelação da Incursora');assert.equal(r.attack,1);
}
{
 const {room,a,b}=setup(),r=place(a,card('FL21',a),0),inc=place(b,card('RG02',b),0);cast(room,a,'FL10',r.uid);room.phase='resolving';resolveCombat(room);assert.ok(a.reserve.includes(r),'Atualização dobrada preserva o Rúnico contra Revelação + ataque');assert.ok(b.discard.includes(inc));assert.equal(r.damage,2);assert.equal(r.health,3);
}
console.log('Rúnico: compra, bônus permanentes/temporários, expiração, reduções sem duplicação, inversão e Geada letal aprovados.');

