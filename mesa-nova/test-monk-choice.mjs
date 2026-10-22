import assert from 'node:assert/strict';
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import {act,makeRoom,join,view,resolveCombat,easyBotAction} from './game.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('./cartas.json',import.meta.url))),models=[...catalog.decks.flatMap(d=>d.cards),...(catalog.additionalCards||[])];
const card=(id,p,extra={})=>({...structuredClone(models.find(c=>c.id===id)),uid:randomUUID(),modelId:id,owner:p.id,damage:0,attackMod:0,...extra});
function setup(){const room=makeRoom('MONK','A'),a=room.players[0],b=join(room,'B');for(const p of [a,b])Object.assign(p,{patron:{hp:100,maxHp:100},mana:10,manaMax:10,deckData:catalog.decks[0],deck:[],taunts:{}});Object.assign(room,{phase:'formation',turn:a.id,first:a.id,collectPreview:true});return {room,a,b};}
const place=(p,c,l)=>{p.reserve.push(c);p.formation[l]=c.uid;return c;};
{
 const {room,a,b}=setup(),monk=place(a,card('FL08',a),0),enemy=place(b,card('FL09',b),0);
 assert.throws(()=>act(room,a,{type:'ready'},catalog),/efeito do Monge/);
 for(const mode of ['missing',null])assert.throws(()=>act(room,a,{type:'monkChoice',cardId:monk.uid,mode},catalog),/válido/);
 assert.throws(()=>act(room,b,{type:'monkChoice',cardId:monk.uid,mode:'weaken'},catalog),/válido/);
 act(room,a,{type:'monkChoice',cardId:monk.uid,mode:'weaken'},catalog);assert.equal(view(room,b).players[0].reserve[0].monkMode,undefined,'Escolha secreta até a Revelação');
 room.phase='resolving';resolveCombat(room);assert.equal(room.preClash[0].cards[1].attack,3);assert.equal(enemy.attackMod,0);assert.equal(monk.monkMode,'weaken');
}
{
 const {room,a,b}=setup(),monk=place(a,card('FL08',a),0),ally=place(a,card('FL02',a,{damage:1}),1),enemy=place(b,card('FL09',b),0);
 act(room,a,{type:'monkChoice',cardId:monk.uid,mode:'buff'},catalog);room.phase='resolving';resolveCombat(room);
 assert.equal(room.preClash[1].cards[0].health,4,'Vida atual 3 + 1 temporário');assert.equal(room.preClash[1].cards[0].attack,2,'Ataque base 0, ferido +1, bônus +1');
 assert.equal(room.preClash[0].cards[1].attack,5,'Escolher bônus não enfraquece inimigo');assert.equal(ally.health,4);assert.equal(ally.damage,1,'Bônus não cura dano anterior');assert.equal(ally.attackMod,0);assert.equal(enemy.attackMod,0);
 const update=room.revelationHealthUpdates.find(u=>u.sourceId===monk.uid);assert.equal(update.target.uid,ally.uid);assert.equal(room.revelationsApplied[0].targetSide,a.id);assert.equal(room.revelationsApplied[0].lane,1);
}
{
 const {room,a,b}=setup(),monk=place(a,card('FL08',a),1),rune=place(a,card('FL21',a),2);
 act(room,a,{type:'monkChoice',cardId:monk.uid,mode:'buff'},catalog);room.phase='resolving';resolveCombat(room);assert.equal(room.preClash[2].cards[0].health,3);assert.equal(room.preClash[2].cards[0].attack,3,'Rúnico dobra +1/+1');assert.equal(rune.health,1);assert.equal(rune.attackMod,0);
}
for(const lane of [0,2]){
 const {room,a}=setup(),monk=place(a,card('FL08',a),lane);act(room,a,{type:'monkChoice',cardId:monk.uid,mode:'buff'},catalog);room.phase='resolving';resolveCombat(room);assert.equal(monk.health,4,'Casa vazia ou fora do tabuleiro não fortalece o próprio Monge');assert.equal(room.revelationHealthUpdates.length,0);
}
{
 const {room,a}=setup(),monk=place(a,card('FL08',a,{sleep:{lane:0,remaining:2,setAt:0}}),0);assert.throws(()=>act(room,a,{type:'monkChoice',cardId:monk.uid,mode:'buff'},catalog),/válido/);room.phase='resolving';resolveCombat(room);assert.equal(room.revelationsApplied.length,0,'Monge adormecido não revela seu efeito');
}
{
 const {room,a}=setup();a.bot=true;const monk=place(a,card('FL08',a),0);a.botStage=2;const action=easyBotAction(room);assert.equal(action.type,'monkChoice');assert.equal(action.cardId,monk.uid);
}
console.log('Monge: escolha exclusiva, sigilo, validação, alvo à direita, bônus temporário sem cura, duplicação do Rúnico, casa vazia, sono e bot aprovados.');
