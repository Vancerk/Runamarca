import assert from 'node:assert/strict';import fs from 'node:fs';import {act,join,makeRoom,resolveCombat,view} from './game.mjs';import './combat-motion.js';
const catalog=JSON.parse(fs.readFileSync(new URL('./cartas.json',import.meta.url))),deck=catalog.decks.find(d=>d.id==='fluxo-virelion');assert.equal(deck.cards.reduce((n,c)=>n+c.quantity,0),30);assert.equal(deck.cards.length,12);assert.equal(deck.cards.find(c=>c.id==='FV07').effects.length,0);assert.equal(deck.cards.find(c=>c.id==='FV06').effects.length,1);
const card=(id,p,extra={})=>({...structuredClone(deck.cards.find(c=>c.id===id)),uid:crypto.randomUUID(),modelId:id,owner:p.id,damage:0,attackMod:0,...extra});
function setup(){const room=makeRoom('ABC123','A'),a=room.players[0],b=join(room,'B');for(const p of [a,b])Object.assign(p,{deckData:deck,patron:{hp:100,maxHp:100},mana:10,manaMax:10,deck:Array.from({length:20},()=>({uid:crypto.randomUUID(),name:'Compra',cost:1}))});Object.assign(room,{first:a.id,turn:a.id,phase:'resolving',collectPreview:true});return {room,a,b};}
const place=(p,c,lane)=>{p.reserve.push(c);p.formation[lane]=c.uid;return c;};
{
 const a={left:0,top:0,width:100,height:140},b={left:0,top:400,width:100,height:140};const m=RunaMotion.contact(a,b);assert.equal(m.dy,129);assert.equal(400-m.dy-(140+m.dy),2,'As bordas não se atravessam');assert.equal(RunaMotion.contact(a,b,false).dy,258);
}
{
 const {room,a,b}=setup();const x=place(a,card('FV06',a,{health:10}),0),y=place(b,card('FV07',b,{health:10}),0);resolveCombat(room);assert.equal(y.attack,1);assert.equal(x.damage,2,'O dano simultâneo usa ataque anterior à maldição');assert.equal(y.damage,1);assert.ok(room.directedSteps[0].pair);assert.equal(room.directedSteps[0].healthUpdates.length,2);a.formation[0]=x.uid;b.formation[0]=y.uid;room.phase='resolving';resolveCombat(room);assert.equal(y.attack,1,'Mesmo alvo não é reduzido novamente');const z=card('FV07',b,{health:10});b.reserve.push(z);a.formation[0]=x.uid;b.formation[0]=z.uid;room.phase='resolving';resolveCombat(room);assert.equal(z.attack,1,'Outro alvo recebe a redução');
}
{
 const {room,a,b}=setup(),c=place(a,card('FV07',a,{health:10}),1);a.prepared.push({card:card('FV02',b),lane:1,targetSide:a.id});b.prepared=a.prepared.splice(0);resolveCombat(room);assert.equal(c.anchor.remaining,1);assert.equal(a.formation[1],c.uid);room.phase='formation';assert.throws(()=>act(room,a,{type:'assign',cardId:c.uid,lane:0},catalog),/ancorada/);assert.throws(()=>act(room,a,{type:'assign',cardId:null,lane:1},catalog),/ancorada/);room.phase='resolving';resolveCombat(room);assert.equal(c.anchor,undefined);assert.equal(a.formation[1],null);
}
{
 const {room,a,b}=setup(),c=place(a,card('FV07',a,{health:10}),0);place(b,card('FV07',b),0);a.prepared.push({card:card('FV11',a),lane:0,targetSide:a.id});resolveCombat(room);assert.equal(c.health,10);assert.equal(c.damage,0,'Vida temporária absorve primeiro o dano');assert.equal(a.prepared[0].remaining,1);a.formation[0]=c.uid;room.phase='resolving';resolveCombat(room);assert.equal(a.prepared.length,0);assert.ok(a.discard.some(c=>c.id==='FV11'));
}
{
 const {room,a}=setup(),c=place(a,card('FV07',a),0);a.prepared.push({card:card('FV14',a,{effects:[{op:'stat_buff',attack:2,health:0}]}),lane:0,targetSide:a.id});resolveCombat(room);assert.equal(c.attack,4,'Benção é permanente');
}
{
 const {room,a}=setup();const x=place(a,card('FV10',a),1),y=place(a,card('FV07',a),0),z=place(a,card('FV07',a),2);resolveCombat(room);assert.equal(room.preClash[0].cards[0].attack,5);assert.equal(room.preClash[2].cards[0].attack,5);assert.equal(y.attack,2);assert.equal(z.attack,2);
}
{
 const {room,a}=setup();room.phase='prep';a.hand.push(card('FV08',a,{cost:2,effects:[{op:'draw',amount:2},{op:'discard',amount:1}]}));act(room,a,{type:'play',cardId:a.hand[0].uid},catalog);assert.equal(a.hand.length,2);assert.equal(a.pendingDiscard,1);assert.throws(()=>act(room,a,{type:'endPrep'},catalog),/descartar/);act(room,a,{type:'discard',cardId:a.hand[0].uid},catalog);assert.equal(a.pendingDiscard,0);assert.equal(a.hand.length,1);
}
{
 const {room,a}=setup();room.phase='prep';for(let i=0;i<8;i++)a.reserve.push(card('FV07',a));const heal=card('FV04',a);a.hand.push(heal);act(room,a,{type:'play',cardId:heal.uid,mode:'emanate'},catalog);assert.equal(a.reserve.length,9);assert.throws(()=>act(room,a,{type:'emanate',cardId:heal.uid},catalog),/Reserva cheia/);const c=card('FV07',a);a.hand.push(c);assert.throws(()=>act(room,a,{type:'play',cardId:c.uid},catalog),/Reserva cheia/);
}
{
 const {room,a}=setup();room.phase='prep';const ally=card('FV07',a);a.reserve.push(ally);const spell=card('FV05',a);a.hand.push(spell);act(room,a,{type:'play',cardId:spell.uid},catalog);assert.equal(ally.attack,4);assert.equal(ally.health,4);const apprentice=place(a,card('FV03',a),0);room.phase='resolving';resolveCombat(room);assert.equal(room.preClash[0].cards[0].attack,2);assert.equal(apprentice.attack,1);
}
console.log('Fluxo: 30 cartas, maldição por alvo, simultaneidade, contato, âncora, barreira, buffs, descarte e reserva aprovados.');
{
 const {room,a,b}=setup();room.phase='prep';for(let i=1;i<=6;i++){assert.equal(room.round,i);assert.equal(room.first,i%2?a.id:b.id);assert.equal(room.turn,room.first);const first=room.players.find(p=>p.id===room.turn),second=room.players.find(p=>p!==first);act(room,first,{type:'endPrep'},catalog);act(room,second,{type:'endPrep'},catalog);act(room,a,{type:'vote',fight:false},catalog);act(room,b,{type:'vote',fight:false},catalog);}
}
{
 const {room,a,b}=setup();room.phase='prep';const healer=card('FV04',a),target=card('FV07',a,{damage:1});a.reserve.push(healer,target);a.emanation.push(healer.uid);a.mana=0;assert.throws(()=>act(room,a,{type:'endPrep',healTargetIds:[target.uid]},catalog),/Mana insuficiente/);assert.equal(target.damage,1);assert.equal(room.turn,a.id);a.mana=1;act(room,a,{type:'endPrep',healTargetIds:[target.uid]},catalog);assert.equal(target.damage,0);assert.equal(a.mana,0);const healing=view(room,b).events.find(e=>e.type==='cleric_heal');assert.equal(healing.healthUpdates[0].hp,target.health);
}
{
 const {room,a,b}=setup();room.phase='prep';const c=card('FV03',a,{speech:'O éter é a minha arma'});a.hand.push(c);act(room,a,{type:'play',cardId:c.uid},catalog);const e=view(room,b).events.find(e=>e.type==='creature');assert.equal(e.speech,c.speech);assert.equal(e.cardId,c.uid);
}
{
 for(const x of [0,200,400]){const from={left:50,top:600,width:70,height:100},to={left:x,top:250,width:100,height:90},line=RunaMotion.link(from,to);assert.ok(line.end.x>=x&&line.end.x<=x+100);assert.ok(line.end.y>=250&&line.end.y<=340);assert.ok(Object.values(line).every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));}const frames=RunaMotion.strikeFrames(150,-200);assert.equal(frames.at(-1).transform,'translate(0px,0px)');assert.equal(frames[2].transform,frames[3].transform);
}
console.log('Correções: alternância em seis rodadas, Auramora, fala compartilhada e geometria da seta aprovadas.');

assert.ok(!deck.cards.some(c=>['FV09','FV12'].includes(c.id)));
assert.equal(deck.cards.find(c=>c.id==='FV13').quantity,3);assert.equal(deck.cards.find(c=>c.id==='FV14').quantity,2);
{
 const {room,a,b}=setup();room.phase='prep';const x=place(b,card('FV07',b,{attack:7,health:8,damage:3,attackMod:2,anchor:{lane:0,remaining:1},spellBuff:'permanent',cursedTargets:['old'],sleep:{lane:0,remaining:1}}),0);const oldUid=x.uid;b.taunts[oldUid]=1;a.hand.push(card('FV13',a));act(room,a,{type:'play',cardId:a.hand[0].uid,mode:'direct',targetId:x.uid},catalog);assert.equal(b.reserve.length,0);assert.equal(b.hand.length,1);assert.equal(b.formation[0],null);assert.equal(x.attack,2);assert.equal(x.health,2);assert.equal(x.damage,0);assert.equal(x.attackMod,0);assert.equal(x.cost,2);assert.notEqual(x.uid,oldUid);for(const key of ['anchor','sleep','spellBuff','cursedTargets'])assert.equal(x[key],undefined);assert.equal(view(room,a).players[1].hand,undefined);assert.ok(view(room,b).events.some(e=>e.type==='return'));room.turn=b.id;act(room,b,{type:'play',cardId:x.uid},catalog);assert.equal(b.mana,8,'Retorno exige novo pagamento do custo original');
}
{
 const {room,a,b}=setup();room.phase='prep';const x=card('FV07',b);b.reserve.push(x);b.hand=Array.from({length:9},()=>card('FV07',b));a.hand.push(card('FV13',a));act(room,a,{type:'play',cardId:a.hand[0].uid,mode:'direct',targetId:x.uid},catalog);assert.equal(b.hand.length,9);assert.ok(b.discard.includes(x),'Mão cheia envia o retorno ao Nartvanyr');assert.equal(b.reserve.length,0);
}
{
 const {room,a,b}=setup();room.phase='prep';const x=card('FV04',b);b.reserve.push(x);b.emanation=[x.uid];a.hand.push(card('FV13',a));assert.throws(()=>act(room,a,{type:'play',cardId:a.hand[0].uid,mode:'direct',targetId:x.uid},catalog),/Emanação/);assert.equal(a.mana,10);assert.throws(()=>act(room,a,{type:'play',cardId:a.hand[0].uid,mode:'lane',lane:0,targetSide:b.id},catalog),/diretamente/);assert.equal(a.mana,10);
}
{
 const {room,a,b}=setup();room.phase='prep';const x=place(b,card('FV10',b,{health:20}),0),y=place(a,card('FV07',a,{health:20}),0);a.hand.push(card('FV14',a));assert.throws(()=>act(room,a,{type:'play',cardId:a.hand[0].uid,mode:'direct',targetId:x.uid},catalog),/posição/);act(room,a,{type:'play',cardId:a.hand[0].uid,mode:'lane',lane:0,targetSide:b.id},catalog);assert.equal(view(room,b).players[1].prepared[0].card,null,'Sono é oculto ao rival');room.phase='resolving';resolveCombat(room);assert.equal(x.sleep.remaining,1);assert.equal(b.formation[0],x.uid);assert.equal(y.damage,0,'Adormecido não ataca');assert.equal(x.damage,2,'Adormecido recebe dano normalmente');room.phase='formation';assert.throws(()=>act(room,b,{type:'assign',cardId:null,lane:0},catalog),/adormecida/);assert.throws(()=>act(room,b,{type:'assign',cardId:x.uid,lane:1},catalog),/adormecida/);room.phase='prep';room.turn=b.id;assert.throws(()=>act(room,b,{type:'emanate',cardId:x.uid},catalog),/presa/);room.phase='resolving';resolveCombat(room);assert.equal(x.sleep,undefined,'Acorda ao fim do combate seguinte à ativação');assert.equal(y.damage,0);assert.equal(b.formation[0],null);a.formation[0]=y.uid;b.formation[0]=x.uid;room.phase='resolving';resolveCombat(room);assert.equal(y.damage,4,'Volta a atacar após acordar');
}
{
 const {room,a,b}=setup();room.phase='prep';const x=place(b,card('FV07',b),0);x.sleep={lane:0,remaining:1,setAt:0};act(room,a,{type:'endPrep'},catalog);act(room,b,{type:'endPrep'},catalog);act(room,a,{type:'vote',fight:false},catalog);act(room,b,{type:'vote',fight:false},catalog);assert.equal(x.sleep.remaining,1,'Rodada sem combate não encerra o sono');assert.equal(b.formation[0],x.uid);
}
console.log('Fluxo atualizado: Evasão com reset/custo/sigilo/mão cheia e Sono com posição fixa, ataque suspenso, duração e despertar aprovados.');
{
 const {room,a,b}=setup();room.phase='prep';const x={uid:crypto.randomUUID(),modelId:'ficha',owner:b.id,name:'Ficha',type:'creature',attack:7,health:8,cost:0,damage:2,baseStats:{attack:2,health:3,cost:0}};b.reserve.push(x);a.hand.push(card('FV13',a));act(room,a,{type:'play',cardId:a.hand[0].uid,mode:'direct',targetId:x.uid},catalog);assert.equal(b.hand[0].attack,2);assert.equal(b.hand[0].health,3);assert.equal(b.hand[0].damage,0);
}

