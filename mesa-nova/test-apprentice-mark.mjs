import assert from 'node:assert/strict';
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import {act,makeRoom,join,view,easyBotAction,resolveCombat} from './game.mjs';
import {unrestrictedReturn} from './test-return-fixture.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('./cartas.json',import.meta.url)));
const models=[...catalog.decks.flatMap(d=>d.cards),...(catalog.additionalCards||[])];
const card=(id,p,extra={})=>({...structuredClone(models.find(c=>c.id===id)),uid:randomUUID(),modelId:id,owner:p.id,damage:0,attackMod:0,...extra});
function setup(){const room=makeRoom('MARK','A'),a=room.players[0],b=join(room,'B');for(const p of[a,b])Object.assign(p,{deckData:catalog.decks.find(d=>d.id==='fluxo-virelion'),patron:{hp:20,maxHp:20},mana:100,manaMax:10,deck:Array.from({length:20},()=>card('FV01',p))});Object.assign(room,{phase:'prep',turn:a.id,first:a.id,collectPreview:true});return{room,a,b};}
const target=(p,h=8)=>card('FV01',p,{health:h,attack:2,effects:[]});
function cast(r,p,id,targetId,extra={}){const c=card(id,p);if(id==='FV13')unrestrictedReturn(c);p.hand.push(c);act(r,p,{type:'play',cardId:c.uid,targetId,...extra},catalog);return c;}
function invoke(r,p,enemy){const c=card('FV03',p);p.hand.push(c);act(r,p,{type:'play',cardId:c.uid,...(enemy?{targetId:enemy.uid}:{})},catalog);return c;}
{
 const {room,a,b}=setup(),enemy=target(b);b.reserve=[enemy];const apprentice=card('FV03',a),ally=target(a);a.reserve=[ally];a.hand=[apprentice];
 for(const targetId of[undefined,ally.uid,'patron:'+b.id,'missing']){assert.throws(()=>act(room,a,{type:'play',cardId:apprentice.uid,targetId},catalog),/inimiga viva/);assert.equal(a.mana,100);assert.ok(a.hand.includes(apprentice));}
 act(room,a,{type:'play',cardId:apprentice.uid,targetId:enemy.uid},catalog);assert.equal(apprentice.apprenticeTargetId,enemy.uid);
 cast(room,a,'FV08');cast(room,a,'FV02',undefined,{mode:'lane',lane:0,targetSide:b.id});cast(room,a,'FV08');assert.equal(enemy.damage,1,'Apenas a primeira magia dispara enquanto esta cópia estiver em campo');assert.equal(a.hand.some(c=>c.modelId==='FV03-token'),false);
 assert.equal(room.events.filter(e=>e.type==='apprentice_damage').length,1);assert.equal(apprentice.apprenticeSpellUsed,true);
 const before=enemy.damage;room.phase='resolving';resolveCombat(room);assert.equal(enemy.damage,before,'Ativar a preparada não dispara novamente');
}
{
 const {room,a,b}=setup(),one=target(b,1),two=target(b,6);b.reserve=[one,two];const source=invoke(room,a,one);cast(room,a,'FV08');assert.ok(b.discard.includes(one));assert.deepEqual(view(room,a).players[0].pendingApprenticeTargets,[]);
 assert.throws(()=>act(room,a,{type:'apprenticeTarget',cardId:source.uid,targetId:two.uid},catalog),/já utilizou/);cast(room,a,'FV08');assert.equal(two.damage,0);act(room,a,{type:'endPrep'},catalog);
}
{
 const {room,a,b}=setup(),one=target(b,1),two=target(b,5);b.reserve=[one,two];const source=invoke(room,a,one);cast(room,a,'RG07',one.uid);assert.equal(two.damage,0,'Magia que mata o alvo não redireciona o disparo para outro');assert.equal(room.events.filter(e=>e.type==='apprentice_damage').length,0);assert.deepEqual(view(room,a).players[0].pendingApprenticeTargets,[source.uid]);
}
{
 const {room,a,b}=setup(),one=target(b,8),two=target(b,8);b.reserve=[one,two];invoke(room,a,one);invoke(room,a,two);cast(room,a,'FV08');assert.equal(one.damage,1);assert.equal(two.damage,1,'Cada cópia tem marca própria');
}
{
 const {room,a,b}=setup(),one=target(b,1),two=target(b,8);b.reserve=[one,two];const first=invoke(room,a,one),second=invoke(room,a,one);cast(room,a,'FV08');assert.equal(two.damage,0);assert.equal(room.events.filter(e=>e.type==='apprentice_damage').length,1,'Disparo seguinte não atinge uma criatura já morta');assert.deepEqual(view(room,a).players[0].pendingApprenticeTargets,[second.uid]);assert.equal(first.apprenticeSpellUsed,true);act(room,a,{type:'apprenticeTarget',cardId:second.uid,targetId:two.uid},catalog);cast(room,a,'FV08');assert.equal(two.damage,1);cast(room,a,'FV08');assert.equal(two.damage,1);
}
{
 const {room,a,b}=setup(),source=invoke(room,a);assert.equal(source.apprenticeTargetId,null,'Pode entrar sem inimigos disponíveis');cast(room,a,'FV08');assert.equal(room.events.filter(e=>e.type==='apprentice_damage').length,0);
 const enemy=target(b);b.reserve.push(enemy);assert.deepEqual(view(room,a).players[0].pendingApprenticeTargets,[source.uid]);act(room,a,{type:'apprenticeTarget',cardId:source.uid,targetId:enemy.uid},catalog);cast(room,a,'FV08');assert.equal(enemy.damage,1);
}
{
 const {room,a,b}=setup(),enemy=target(b);b.reserve=[enemy];const source=invoke(room,a,enemy);cast(room,a,'FV08');assert.equal(source.apprenticeSpellUsed,true);room.turn=b.id;cast(room,b,'FV13',source.uid);assert.equal(source.apprenticeTargetId,undefined,'Devolução reinicia a escolha de Entrada');room.turn=a.id;act(room,a,{type:'play',cardId:source.uid,targetId:enemy.uid},catalog);cast(room,a,'FV08');assert.equal(enemy.damage,2,'Reinvocar reinicia o uso único');
}
{
 const {room,a,b}=setup(),enemy=card('FEX03',b);b.reserve=[enemy];invoke(room,a,enemy);cast(room,a,'FV08');assert.equal(enemy.damage,2,'Dano da Aprendiz respeita o primeiro dano dobrado');cast(room,a,'FV08');assert.equal(enemy.damage,2,'Segunda magia não dispara novamente');
}
{
 const {room,a,b}=setup(),enemy=card('RG03',b,{health:1});b.reserve=[enemy];const source=invoke(room,a,enemy);cast(room,a,'FV08');assert.equal(a.patron.hp,19,'Último Suspiro continua disparando');assert.equal(view(room,a).players[0].pendingApprenticeTargets.length,0,'Sem alvos disponíveis não trava a preparação');act(room,a,{type:'endPrep'},catalog);
}
{
 const {room,a,b}=setup(),enemy=target(b);b.reserve=[enemy];a.bot=true;const c=card('FV03',a);a.hand=[c];let choice=easyBotAction(room);assert.equal(choice.targetId,enemy.uid);act(room,a,choice,catalog);delete c.apprenticeTargetId;choice=easyBotAction(room);assert.equal(choice.type,'apprenticeTarget');act(room,a,choice,catalog);assert.equal(c.apprenticeTargetId,enemy.uid);
}
{
 const {room,a,b}=setup(),enemy=target(b);b.reserve=[enemy];invoke(room,a,enemy);cast(room,a,'FV02',undefined,{mode:'lane',lane:0,targetSide:b.id});cast(room,a,'FV08');assert.equal(enemy.damage,1,'Preparar a primeira magia consome o disparo único');room.phase='resolving';resolveCombat(room);assert.equal(room.events.filter(e=>e.type==='apprentice_damage').length,1);
}
console.log('Aprendiz: uso único por permanência, alvo inimigo, preparada, marca antes do disparo, devolução, múltiplas cópias, dano dobrado e Último Suspiro aprovados.');
